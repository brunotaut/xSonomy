// xSonomy catalogue generator — SUPABASE edition.
// Same output as generate.mjs (per-category JSON + SEO product pages + sitemap),
// but reads the `products` table from Supabase instead of Airtable. The SEO page
// renderer and slug logic are imported from generate.mjs so behaviour is identical.
//
// Build-time only: fetches server-side with the SERVICE key (bypasses RLS so
// draft rows publish too, matching the current review-stage site) and writes
// STATIC json/html — no Supabase key is ever shipped to the browser.
//
// Env (.env locally, repo secrets in CI):
//   SUPABASE_URL          https://uobidcahmrmfdmfbrtkt.supabase.co
//   SUPABASE_SERVICE_KEY  service_role key (secret; server-side only)
// Run:  npm run build:supabase

import { mkdir, rm, cp, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { productPage, slugify } from "./generate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "public");
const SITE = "https://xsonomy.com";

const CATEGORIES = {
  uav: { label: "UAVs", file: "uav.json" },
  sensors: { label: "Sensors", file: "sensors.json" },
};
const SECTION_TITLE = {
  uav: "UAVs — xSonomy Catalogue",
  sensors: "Sensors — xSonomy Counter-UAS Catalogue",
};
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* PUBLISH GATE: null = publish every row (current behaviour); "live" = only
   products whose publication_status = 'live'. Flip once you gate rows in the DB. */
const PUBLISH_STATUS = null;

async function loadDotenv() {
  const p = join(ROOT, ".env");
  if (!existsSync(p)) return;
  for (const line of (await readFile(p, "utf8")).split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function sbConfig() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (.env or CI secrets).");
  return { url, key };
}

// Pull UAV + Sensor products with their manufacturer name embedded.
async function fetchProducts() {
  const { url, key } = sbConfig();
  const q = new URL(`${url}/rest/v1/products`);
  q.searchParams.set("select",
    "name,subcategory,country,summary,website,image_url,price,status,specs,confidence,source_urls,category,companies(name)");
  q.searchParams.set("category", "in.(UAV,Sensor)");
  if (PUBLISH_STATUS) q.searchParams.set("publication_status", `eq.${PUBLISH_STATUS}`);
  q.searchParams.set("limit", "5000");
  const res = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Supabase products ${res.status}: ${await res.text()}`);
  return res.json();
}

// Map a Supabase product row back to the Airtable-style field shape the rest of
// the generator (and app.js) expects: spec columns spread to top level.
function reshape(p) {
  const row = {};
  if (p.name) row.Name = p.name;
  if (p.companies && p.companies.name) row.Company = p.companies.name;
  if (p.country) row.Country = p.country;
  if (p.subcategory) row.Subcategory = p.subcategory;
  if (p.summary) row.Summary = p.summary;
  if (p.website) row.Website = p.website;
  if (p.price) row.Price = p.price;
  if (p.confidence) row.Confidence = p.confidence;
  if (Array.isArray(p.source_urls) && p.source_urls.length) row["Source URLs"] = p.source_urls.join("\n");
  if (p.specs && typeof p.specs === "object") Object.assign(row, p.specs); // "UAV · MTOW (kg)", "Subtype", …
  row.__image_url = p.image_url || null;
  return row;
}

// Download product image into public/images and rewrite the path (URLs may expire).
async function attachImage(row) {
  const url = row.__image_url; delete row.__image_url;
  if (!url) return;
  try {
    const res = await fetch(url);
    if (!res.ok) { console.error(`image ${row.slug}: HTTP ${res.status}`); return; }
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = (extname(new URL(url).pathname).slice(1) || "jpg").toLowerCase().replace("jpeg", "jpg");
    const rel = `images/${row.slug}.${ext}`;
    await mkdir(join(OUT, "images"), { recursive: true });
    await writeFile(join(OUT, rel), buf);
    row.Image = rel;
  } catch (e) { console.error(`image ${row.slug}: ${e.message}`); }
}

async function main() {
  await loadDotenv();
  sbConfig(); // validate env early

  console.log(`Fetching products from Supabase (gate: ${PUBLISH_STATUS || "all"})…`);
  const products = await fetchProducts();

  await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, "data"), { recursive: true });
  await cp(SRC, OUT, { recursive: true });

  const buckets = { uav: [], sensors: [] };
  for (const p of products) {
    const bucket = p.category === "UAV" ? "uav" : "sensors";
    const row = reshape(p);
    row.slug = slugify(row.Name || "item");
    await attachImage(row);
    buckets[bucket].push(row);
  }

  const meta = { generatedAt: new Date().toISOString(), categories: {} };
  for (const [key, cfg] of Object.entries(CATEGORIES)) {
    await writeFile(join(OUT, "data", cfg.file), JSON.stringify(buckets[key]));
    meta.categories[key] = { label: cfg.label, file: `data/${cfg.file}`, count: buckets[key].length };
    console.log(`  ${cfg.label}: ${buckets[key].length} rows`);
  }
  await writeFile(join(OUT, "data", "meta.json"), JSON.stringify(meta, null, 2));

  const urls = [];
  for (const [bucket, rows] of Object.entries(buckets)) {
    for (const row of rows) {
      const dir = join(OUT, bucket, row.slug);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, "index.html"), productPage(bucket, row));
      urls.push(`${SITE}/${bucket}/${row.slug}/`);
    }
  }

  const sectionUrls = Object.keys(CATEGORIES).map((k) => `${SITE}/${k}/`);
  const today = new Date().toISOString().slice(0, 10);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    [`${SITE}/`, ...sectionUrls, ...urls].map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n") + `\n</urlset>\n`;
  await writeFile(join(OUT, "sitemap.xml"), sitemap);
  await writeFile(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
  await writeFile(join(OUT, "CNAME"), "xsonomy.com\n");

  const indexPath = join(OUT, "index.html");
  const shell = (await readFile(indexPath, "utf8")).replace("<!--PRODUCT_INDEX-->", "");
  await writeFile(indexPath, shell);
  for (const key of Object.keys(CATEGORIES)) {
    const url = `${SITE}/${key}/`;
    let page = shell
      .replace('href="https://xsonomy.com/"', `href="${url}"`)
      .replace('content="https://xsonomy.com/"', `content="${url}"`);
    if (SECTION_TITLE[key]) page = page.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(SECTION_TITLE[key])}</title>`);
    await mkdir(join(OUT, key), { recursive: true });
    await writeFile(join(OUT, key, "index.html"), page);
  }

  console.log(`\nBuilt static site -> ${OUT} (${urls.length} product pages) from Supabase.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
