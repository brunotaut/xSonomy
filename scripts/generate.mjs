// xSonomy catalogue generator.
// Fetches rows from Airtable and emits a static site into ./public:
//  - per-category JSON (radar/acoustic/uav) for the client-side grid
//  - a real, crawlable HTML page per product (SEO: title/description/OG/JSON-LD)
//  - sitemap.xml + robots.txt + a product index injected into the homepage
//  - product images downloaded locally (Airtable URLs expire; we don't rely on them)
// Runs in CI (GitHub Actions) or locally with Node >= 20. No external deps.

import { mkdir, rm, cp, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "public");

const BASE_ID = process.env.AIRTABLE_BASE_ID || "appwMCCtt57i8SNbR";
const SITE = "https://xsonomy.com";

const SENSORS_TID = "tblTGH1m1Txi3eibs"; // radar + acoustic sensors
const UAVS_TID = "tblUIEuwkxizjAb05"; // UAVs

/* ---- PUBLISH GATE -------------------------------------------------------
 * null  = publish every row (matches the current live site; review-stage).
 * "Live" = publish only rows whose Airtable Status = Live (the human gate).
 * Flip to "Live" once you're approving rows in Airtable.                       */
const PUBLISH_STATUS = null;
/* ------------------------------------------------------------------------ */

// Top-level tabs = taxonomy categories. Sensor modality (Radar/RF/Acoustic/EO-IR)
// is a Subcategory FILTER inside the Sensors tab, not a separate tab.
const CATEGORIES = {
  uav: { label: "UAVs", file: "uav.json" },
  sensors: { label: "Sensors", file: "sensors.json" },
};
const BUCKET_KICKER = { uav: "UAV", sensors: "Sensor" };

// Fields never shown in the public spec table (internal / rendered separately).
const HIDDEN = new Set(["Name", "Company", "Summary", "Website", "Image", "Status", "Enrichment status", "Source URLs", "Category", "Confidence", "slug"]);

// ---- small utils ----
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clip = (s, n = 155) => { const t = String(s || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t; };
const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const specLabel = (k) => k.replace(/^.*· /, "");
const analystNote = (note) => { const m = String(note || "").split(/Analyst note:\s*/i); return m.length > 1 ? m[1].trim() : null; };

const slugSeen = new Set();
const slugify = (name) => {
  let base = String(name || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "item";
  let s = base, i = 2;
  while (slugSeen.has(s)) s = `${base}-${i++}`;
  slugSeen.add(s);
  return s;
};
const extFromType = (t) => ({ "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[t] || "jpg");

async function loadDotenv() {
  const p = join(ROOT, ".env");
  if (!existsSync(p)) return;
  const txt = await readFile(p, "utf8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function fetchRows(tableId) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) throw new Error("AIRTABLE_TOKEN is not set.");
  const records = [];
  let offset;
  do {
    const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${tableId}`);
    if (PUBLISH_STATUS) url.searchParams.set("filterByFormula", `{Status}='${PUBLISH_STATUS}'`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Airtable ${tableId} ${res.status}: ${await res.text()}`);
    const json = await res.json();
    records.push(...json.records);
    offset = json.offset;
  } while (offset);
  return records;
}

// Normalise fields: drop empties, attachments -> first url (overridden for Image), selects -> arrays of names.
function clean(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === null || v === undefined || v === "") continue;
    if (Array.isArray(v)) {
      if (v.length && typeof v[0] === "object" && v[0]?.url) out[k] = v[0].url;
      else out[k] = v;
    } else out[k] = v;
  }
  return out;
}

// Download the product image (large thumbnail) into public/images and rewrite the path.
async function attachImage(rawFields, row) {
  const arr = rawFields["Image"];
  delete row.Image; // remove the expiring Airtable URL clean() left
  if (!Array.isArray(arr) || !arr.length) return;
  const at = arr[0];
  const url = (at.thumbnails && at.thumbnails.large && at.thumbnails.large.url) || at.url;
  if (!url) return;
  try {
    const res = await fetch(url);
    if (!res.ok) { console.error(`image ${row.slug}: HTTP ${res.status}`); return; }
    const buf = Buffer.from(await res.arrayBuffer());
    const rel = `images/${row.slug}.${extFromType(at.type)}`;
    await mkdir(join(OUT, "images"), { recursive: true });
    await writeFile(join(OUT, rel), buf);
    row.Image = rel;
  } catch (e) { console.error(`image ${row.slug}: ${e.message}`); }
}

// ---- static product page (SEO) ----
const PAGE_CSS = `
:root{--bg:#0f1115;--panel:#171a21;--panel2:#1e222b;--line:#2a2f3a;--text:#e6e8ec;--muted:#9aa3b2;--accent:#5b9dff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.hd{border-bottom:1px solid var(--line);background:var(--panel)}
.hd .w{max-width:920px;margin:0 auto;padding:0 20px;height:58px;display:flex;align-items:center;justify-content:space-between}
.hd .brand{font-weight:700;letter-spacing:.5px;color:var(--text)}
.hd .back{color:var(--muted);font-size:14px}
.wrap{max-width:920px;margin:0 auto;padding:28px 20px 80px}
.kicker{font-size:12px;text-transform:uppercase;letter-spacing:.8px;color:var(--accent)}
h1{font-size:34px;line-height:1.15;margin:6px 0 4px}
.sub{color:var(--muted);font-size:14px;margin-bottom:22px}
.hero{width:100%;max-height:430px;object-fit:cover;border:1px solid var(--line);border-radius:10px;margin-bottom:24px;background:var(--panel2)}
.lead{font-size:16px;color:#c4cad4;margin:0 0 22px}
.why{border-left:3px solid #654;background:var(--panel2);padding:13px 16px;border-radius:4px;color:#c9b27a;font-size:14px;margin:0 0 24px}
.why b{display:block;color:var(--accent);font-size:11px;letter-spacing:.6px;text-transform:uppercase;margin-bottom:5px}
table{width:100%;border-collapse:collapse}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);font-size:14px;vertical-align:top}
th{color:var(--muted);font-weight:500;width:42%}
.cta{margin:26px 0}
.btn{display:inline-block;padding:9px 16px;border-radius:8px;font-weight:600}
.btn.p{background:var(--accent);color:#06101f}.btn.p:hover{text-decoration:none}
.note{margin-top:28px;border-top:1px solid var(--line);padding-top:16px;color:var(--muted);font-size:12px;line-height:1.7}
`;

function productPage(bucket, row) {
  const slug = row.slug;
  const name = row.Name || "Untitled";
  const company = row.Company || "";
  const country = asArray(row.Country).join(", ");
  const url = `${SITE}/${bucket}/${slug}/`;
  const desc = clip(row.Summary) || `${name}${company ? " by " + company : ""} — ${BUCKET_KICKER[bucket]} on the xSonomy catalogue.`;
  const imgRel = row.Image ? "/" + row.Image : null;
  const imgAbs = imgRel ? SITE + imgRel : null;
  const title = `${name}${company ? " — " + company : ""} · xSonomy`;
  const kicker = `${BUCKET_KICKER[bucket]}${row.Subtype ? " · " + row.Subtype : ""}`;
  const why = analystNote(row["Source URLs"]);

  const specPairs = Object.entries(row)
    .filter(([k, v]) => !HIDDEN.has(k) && v != null && v !== "")
    .map(([k, v]) => [specLabel(k), asArray(v).join(", ")]);
  if (row.Confidence) specPairs.push(["Confidence", row.Confidence]);
  const specRows = specPairs.map(([l, v]) => `<tr><th>${esc(l)}</th><td>${esc(v)}</td></tr>`).join("");

  const jsonld = {
    "@context": "https://schema.org", "@type": "Product", "name": name,
    ...(company ? { "brand": { "@type": "Organization", "name": company } } : {}),
    ...(imgAbs ? { "image": [imgAbs] } : {}),
    "description": desc, "category": BUCKET_KICKER[bucket], "url": url,
    "additionalProperty": specPairs.map(([l, v]) => ({ "@type": "PropertyValue", "name": l, "value": String(v) })),
  };

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="xSonomy">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}">${imgAbs ? `\n<meta property="og:image" content="${imgAbs}">` : ""}
<meta name="twitter:card" content="${imgAbs ? "summary_large_image" : "summary"}">
<style>${PAGE_CSS}</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head><body>
<header class="hd"><div class="w"><a class="brand" href="/">xSonomy</a><a class="back" href="/">← Catalogue</a></div></header>
<div class="wrap">
<div class="kicker">${esc(kicker)}</div>
<h1>${esc(name)}</h1>
<div class="sub">${esc([company, country].filter(Boolean).join(" · "))}</div>
${imgRel ? `<img class="hero" src="${imgRel}" alt="${esc(name)}" width="900">` : ""}
${row.Summary ? `<p class="lead">${esc(row.Summary)}</p>` : ""}
${why ? `<div class="why"><b>Why it matters</b>${esc(why)}</div>` : ""}
<table><tbody>${specRows}</tbody></table>
${row.Website ? `<div class="cta"><a class="btn p" href="${esc(row.Website)}" target="_blank" rel="noopener nofollow">Visit manufacturer ↗</a></div>` : ""}
<div class="note">Review-stage catalogue data — specs corroborated from manufacturer and secondary sources; not for procurement decisions.${row.Website ? ` Source: <a href="${esc(row.Website)}" target="_blank" rel="noopener nofollow">${esc(String(row.Website).replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>` : ""}</div>
</div></body></html>`;
}

async function main() {
  await loadDotenv();
  if (!process.env.AIRTABLE_TOKEN) {
    console.error("\nAIRTABLE_TOKEN missing. Set it in .env (local) or as a repo secret (CI).\n");
    process.exit(1);
  }

  console.log(`Fetching rows from Airtable (gate: ${PUBLISH_STATUS || "all"})…`);
  const [sensorRecs, uavs] = await Promise.all([fetchRows(SENSORS_TID), fetchRows(UAVS_TID)]);

  // Reset output dir and copy static assets first (so images/ + pages land alongside).
  await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, "data"), { recursive: true });
  await cp(SRC, OUT, { recursive: true });

  const buckets = { uav: [], sensors: [] };
  const process1 = async (raw, bucket) => {
    const row = clean(raw.fields);
    row.slug = slugify(row.Name || "item");
    await attachImage(raw.fields, row);
    buckets[bucket].push(row);
  };
  for (const r of uavs) await process1(r, "uav");
  for (const r of sensorRecs) await process1(r, "sensors"); // all rows in the Sensors table

  // Per-category JSON + meta for the client grid.
  const meta = { generatedAt: new Date().toISOString(), categories: {} };
  for (const [key, cfg] of Object.entries(CATEGORIES)) {
    await writeFile(join(OUT, "data", cfg.file), JSON.stringify(buckets[key]));
    meta.categories[key] = { label: cfg.label, file: `data/${cfg.file}`, count: buckets[key].length };
    console.log(`  ${cfg.label}: ${buckets[key].length} rows`);
  }
  await writeFile(join(OUT, "data", "meta.json"), JSON.stringify(meta, null, 2));

  // Static per-product pages (SEO).
  const urls = [];
  for (const [bucket, rows] of Object.entries(buckets)) {
    for (const row of rows) {
      const dir = join(OUT, bucket, row.slug);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, "index.html"), productPage(bucket, row));
      urls.push(`${SITE}/${bucket}/${row.slug}/`);
    }
  }

  // sitemap.xml + robots.txt
  const today = new Date().toISOString().slice(0, 10);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    [`${SITE}/`, ...urls].map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n") + `\n</urlset>\n`;
  await writeFile(join(OUT, "sitemap.xml"), sitemap);
  await writeFile(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
  await writeFile(join(OUT, "CNAME"), "xsonomy.com\n"); // keep the custom domain on every deploy

  // Crawlable product index injected into the homepage.
  const links = Object.entries(buckets)
    .flatMap(([bucket, rows]) => rows.map((r) => `<a href="/${bucket}/${r.slug}/">${esc(r.Name || "Untitled")}</a>`))
    .join("");
  const indexPath = join(OUT, "index.html");
  let html = await readFile(indexPath, "utf8");
  html = html.replace("<!--PRODUCT_INDEX-->", links);
  await writeFile(indexPath, html);

  console.log(`\nBuilt static site -> ${OUT} (${urls.length} product pages, sitemap, robots).`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main().catch((e) => { console.error(e); process.exit(1); });

export { productPage, slugify, clean };
