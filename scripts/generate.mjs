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
:root{--bg:#0a0d10;--panel:#0f1418;--panel2:#141a1f;--line:rgba(255,255,255,.1);--text:#e7ecef;--muted:#8b96a0;--ink3:#44505a;--accent:#66be69;--mono:ui-monospace,"JetBrains Mono",Menlo,monospace;--sans:"Inter Tight",system-ui,sans-serif;--display:"Oswald",sans-serif}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:var(--sans);font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.hd{border-bottom:1px solid var(--line);background:linear-gradient(180deg,var(--panel),var(--bg))}
.hd .w{max-width:920px;margin:0 auto;padding:0 20px;height:60px;display:flex;align-items:center;justify-content:space-between}
.hd .brand{font-family:var(--display);font-size:19px;letter-spacing:.22em;color:var(--text)}
.hd .back{font-family:var(--mono);font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:var(--muted)}
.wrap{max-width:920px;margin:0 auto;padding:28px 20px 80px}
.kicker{font-family:var(--mono);font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:var(--accent)}
h1{font-family:var(--display);font-size:42px;line-height:1.02;letter-spacing:.03em;text-transform:uppercase;margin:8px 0 4px}
.sub{font-family:var(--mono);font-size:12px;letter-spacing:.12em;color:var(--muted);margin-bottom:24px}
.hero{width:100%;max-height:440px;object-fit:cover;border:1px solid var(--line);margin-bottom:24px;background:var(--panel2)}
.art{position:relative;border:1px solid var(--line);background:radial-gradient(ellipse at center,var(--panel2),var(--panel) 70%);aspect-ratio:16 / 7;margin-bottom:24px;color:var(--accent);display:grid;place-items:center;overflow:hidden}
.art .art-svg{position:absolute;inset:0}
.lead{font-size:16px;color:#c4cad4;margin:0 0 22px}
.why{border-left:3px solid var(--accent);background:var(--panel2);padding:14px 18px;color:var(--text);font-size:14px;margin:0 0 24px}
.why b{font-family:var(--mono);display:block;color:var(--accent);font-size:10px;letter-spacing:.25em;text-transform:uppercase;margin-bottom:6px}
table{width:100%;border-collapse:collapse;border:1px solid var(--line)}
th,td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--line);font-size:14px;vertical-align:top}
th{font-family:var(--mono);font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:400;width:40%}
.cta{margin:26px 0}
.btn{display:inline-block;font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;padding:11px 16px;border:1px solid var(--line);color:var(--text)}
.btn:hover{border-color:var(--accent);color:var(--accent);text-decoration:none}
.btn.p{background:var(--accent);color:#0a0d10;border-color:var(--accent)}.btn.p:hover{color:#0a0d10}
.note{font-family:var(--mono);font-size:11px;color:var(--ink3);letter-spacing:.04em;line-height:1.7;border-top:1px solid var(--line);padding-top:16px;margin-top:30px}
.note a{color:var(--muted)}
@media(max-width:620px){h1{font-size:32px}}
`;

// Schematic / glyph art (string SVG) for detail-page hero when there's no photo.
function dFrameKind(frame) {
  const f = String(frame || "").toLowerCase();
  if (f.includes("vtol") || f.includes("tiltrotor") || f.includes("tailsitter") || f.includes("hybrid")) return "vtol";
  if (f.includes("quad")) return "quad";
  if (f.includes("hexa") || f.includes("octo") || f.includes("multirotor") || f.includes("helicopter") || f.includes("rotor")) return "hex";
  return "fixed";
}
function dSchematic(kind) {
  const s = 'stroke="currentColor" stroke-width="1.5" fill="none"';
  const grid = `<g opacity=".5">${[1,2,3,4,5,6,7].map(i=>`<line x1="${i*50}" y1="0" x2="${i*50}" y2="280" stroke="rgba(255,255,255,.05)"/>`).join("")}</g>`;
  const cross = `<g stroke="rgba(255,255,255,.18)" fill="none"><circle cx="200" cy="140" r="108" stroke-dasharray="2 4"/><line x1="50" y1="140" x2="350" y2="140"/></g>`;
  let body;
  if (kind === "quad") body = `<g ${s}><line x1="130" y1="80" x2="270" y2="200"/><line x1="270" y1="80" x2="130" y2="200"/><rect x="182" y="122" width="36" height="36" rx="3"/>${[[130,80],[270,80],[130,200],[270,200]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="22"/>`).join("")}</g>`;
  else if (kind === "hex") { const p=Array.from({length:6},(_,i)=>{const a=(i*60-90)*Math.PI/180;return [200+Math.cos(a)*88,140+Math.sin(a)*88];}); body=`<g ${s}>${p.map(([x,y])=>`<line x1="200" y1="140" x2="${x}" y2="${y}"/><circle cx="${x}" cy="${y}" r="17"/>`).join("")}</g>`; }
  else if (kind === "vtol") body = `<g ${s}><ellipse cx="200" cy="145" rx="80" ry="13"/><path d="M170 133 L100 92 L82 94 L165 138 Z"/><path d="M230 133 L300 92 L318 94 L235 138 Z"/><path d="M170 157 L100 198 L82 196 L165 152 Z"/><path d="M230 157 L300 198 L318 196 L235 152 Z"/>${[[100,92],[300,92],[100,198],[300,198]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="15"/>`).join("")}</g>`;
  else body = `<g ${s}><path d="M90 140 L285 140 L312 145 L285 150 L90 150 Q72 145 90 140 Z"/><path d="M170 122 L232 62 L260 62 L220 126 Z"/><path d="M170 168 L232 228 L260 228 L220 164 Z"/><path d="M285 145 L322 116 L332 118 L298 148 Z"/><path d="M285 145 L322 174 L332 172 L298 142 Z"/></g>`;
  return `<svg class="art-svg" viewBox="0 0 400 280" width="100%" height="100%">${grid}${cross}${body}</svg>`;
}
function dSensorKind(row) {
  const sub = String(row.Subtype || "").toLowerCase(), cat = String(row.Subcategory || "").toLowerCase();
  if (cat.includes("acoustic") || sub.includes("acoustic")) return "acoustic";
  if (cat.includes("rf") || sub.includes("rf")) return "rf";
  if (sub.includes("passive")) return "passive";
  if (cat.includes("eo") || sub.includes("optical") || sub.includes("eo")) return "eo";
  return "radar";
}
function dGlyph(kind) {
  const c = "currentColor", w = 'width="120" height="120"';
  if (kind === "acoustic") return `<svg ${w} viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.2"><circle cx="7.5" cy="12" r="2.2" fill="${c}"/><path d="M12 8 Q15 12 12 16"/><path d="M15.5 6 Q20 12 15.5 18"/></svg>`;
  if (kind === "rf") return `<svg ${w} viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.2"><line x1="4" y1="18.5" x2="20" y2="18.5"/><rect x="5.5" y="12" width="2.4" height="6.5" fill="${c}" stroke="none"/><rect x="10" y="8" width="2.4" height="10.5" fill="${c}" stroke="none"/><rect x="14.5" y="10.5" width="2.4" height="8" fill="${c}" stroke="none"/></svg>`;
  if (kind === "passive") return `<svg ${w} viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.2"><line x1="12" y1="20" x2="12" y2="9"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/></svg>`;
  if (kind === "eo") return `<svg ${w} viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.2"><path d="M2 12 Q12 4 22 12 Q12 20 2 12 Z"/><circle cx="12" cy="12" r="3"/></svg>`;
  return `<svg ${w} viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="${c}"/><line x1="12" y1="12" x2="20" y2="6.5"/></svg>`;
}

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
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&family=Inter+Tight:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${PAGE_CSS}</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head><body>
<header class="hd"><div class="w"><a class="brand" href="/">xSonomy</a><a class="back" href="/">← Catalogue</a></div></header>
<div class="wrap">
<div class="kicker">${esc(kicker)}</div>
<h1>${esc(name)}</h1>
<div class="sub">${esc([company, country].filter(Boolean).join(" · "))}</div>
${imgRel
  ? `<img class="hero" src="${imgRel}" alt="${esc(name)}" width="900">`
  : `<div class="art">${bucket === "uav" ? dSchematic(dFrameKind(row["UAV · Frame type"])) : dGlyph(dSensorKind(row))}</div>`}
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
