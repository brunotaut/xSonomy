// Find candidate photos for catalogue products that do not have one yet.
//
// WHY THIS DOES NOT PUBLISH ANYTHING
// Matching a product name to a Wikipedia article is only about half reliable, even when
// every word of the product name appears in the article title. Measured on 220 candidates
// that were reviewed by hand: 116 right, 104 wrong — "Hornet" matched an F/A-18 and a wasp,
// "Palianytsia" matched bread, "C20" matched a Sauber F1 car, "K1000" a Pentax camera.
// The best text-only rule tried (company name present in the article title) reached 90%
// precision, and several of its failures were articles that were correct while the image
// was a logo, an airshow shot, or the wrong variant — which no rule on text can catch.
//
// So this script only ever writes a CANDIDATES file plus a contact sheet. Nothing reaches
// the site until someone looks at the pictures and promotes them with accept-images.mjs.
//
// Run:  npm run images:find
// Env:  SUPABASE_URL, SUPABASE_SERVICE_KEY

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(ROOT, "data", "product-images.json");
const REJECTED = join(ROOT, "data", "image-rejected.json");
const SEARCHED = join(ROOT, "data", "image-searched.json");
const CANDIDATES = join(ROOT, "data", "image-candidates.json");
const SHEET = join(ROOT, "review", "image-candidates.html");
const UA = "xSonomy-catalogue/1.0 (https://xsonomy.com)";
const MAX_LOOKUPS = Number(process.env.IMAGE_MAX_LOOKUPS || 400);
// Most products simply have no article. Remembering that keeps the weekly run focused on
// genuinely new rows instead of re-searching 1,100 misses every Monday — but Wikipedia
// grows, so a miss is retried after this many days.
const RECHECK_DAYS = Number(process.env.IMAGE_RECHECK_DAYS || 180);

async function loadDotenv() {
  const f = join(ROOT, ".env");
  if (!existsSync(f)) return;
  for (const line of (await readFile(f, "utf8")).split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const readJson = async (p, fallback) => (existsSync(p) ? JSON.parse(await readFile(p, "utf8")) : fallback);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (v) => (v || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function wiki(params) {
  const u = new URL("https://en.wikipedia.org/w/api.php");
  for (const [k, v] of Object.entries({ format: "json", formatversion: "2", ...params })) u.searchParams.set(k, v);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(u, { headers: { "User-Agent": UA } });
      if (r.ok) return r.json();
      if (r.status !== 429 && r.status < 500) return null;
    } catch { /* retry */ }
    await sleep(attempt * 1500);
  }
  return null;
}

// Strict match: every significant word of the product name must appear in the article
// title. Loose matching produced Mars rovers and Peugeots; this is the floor, not a
// guarantee — the contact sheet is still the thing that decides.
const NOISE = new Set(["the", "uav", "uas", "drone", "system", "series", "aerial", "vehicle"]);
const norm = (s) => (s || "").toLowerCase().replace(/\(.*?\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const words = (s) => norm(s).split(" ").filter((t) => t && !NOISE.has(t));

async function fetchProducts() {
  const base = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!base || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set");
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const q = new URL(`${base}/rest/v1/products`);
    q.searchParams.set("select", "name,category,companies!products_company_id_fkey(name)");
    q.searchParams.set("category", "eq.UAV");
    q.searchParams.set("order", "name.asc,id.asc");
    q.searchParams.set("limit", "1000");
    q.searchParams.set("offset", String(offset));
    const r = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
    const rows = await r.json();
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

async function main() {
  await loadDotenv();
  const manifest = await readJson(MANIFEST, {});
  const rejected = await readJson(REJECTED, {});
  const searched = await readJson(SEARCHED, {});
  const products = await fetchProducts();

  const today = new Date().toISOString().slice(0, 10);
  const stale = (iso) => (Date.now() - Date.parse(iso)) / 86400000 >= RECHECK_DAYS;
  const todo = products.filter((p) => p.name && !manifest[p.name] && !rejected[p.name]
                                      && (!searched[p.name] || stale(searched[p.name])));
  console.log(`${products.length} UAV products · ${Object.keys(manifest).length} already have a photo · ` +
              `${Object.keys(rejected).length} reviewed and rejected · ` +
              `${Object.keys(searched).length} searched before with no match`);
  console.log(`${todo.length} to look at${todo.length > MAX_LOOKUPS ? ` (capped at ${MAX_LOOKUPS} this run)` : ""}`);
  if (!todo.length) {
    console.log("nothing new — no candidates written");
    await writeFile(CANDIDATES, "[]");
    return;
  }

  const found = [];
  const looked = [];
  for (const p of todo.slice(0, MAX_LOOKUPS)) {
    looked.push(p.name);
    const company = p.companies?.name || "";
    const want = words(p.name);
    if (!want.length) continue;
    const q = await wiki({ action: "query", generator: "search", gsrsearch: [p.name, company].filter(Boolean).join(" "),
                           gsrlimit: 6, prop: "pageimages", piprop: "original" });
    const hit = (q?.query?.pages || []).find((pg) => {
      const t = norm(pg.title);
      return want.every((w) => t.includes(w)) && pg.original?.source;
    });
    if (hit) {
      // ask for a scaled rendition: originals run to 15 MB and the page has to load it
      const file = "File:" + decodeURIComponent(new URL(hit.original.source).pathname.split("/").pop()).replace(/_/g, " ");
      const info = await wiki({ action: "query", titles: file, prop: "imageinfo", iiprop: "extmetadata|url", iiurlwidth: 1200 });
      const ii = info?.query?.pages?.[0]?.imageinfo?.[0];
      const em = ii?.extmetadata;
      const thumb = await wiki({ action: "query", titles: file, prop: "imageinfo", iiprop: "url", iiurlwidth: 400 });
      found.push({
        name: p.name, company, article: hit.title,
        url: ii?.thumburl || hit.original.source,
        licence: strip(em?.LicenseShortName?.value) || null,
        author: strip(em?.Artist?.value).slice(0, 80) || null,
        source: ii?.descriptionurl || null,
        preview: thumb?.query?.pages?.[0]?.imageinfo?.[0]?.thumburl || null,
      });
    }
    await sleep(170);
  }

  const usable = found.filter((f) => f.licence && f.url);
  // Record what was looked at. Anything that produced a candidate is settled by
  // accept-images.mjs instead (into the manifest or the rejected list).
  const proposed = new Set(usable.map((c) => c.name));
  for (const name of looked) if (!proposed.has(name)) searched[name] = today;
  await writeFile(SEARCHED, JSON.stringify(searched, null, 2));
  await writeFile(CANDIDATES, JSON.stringify(usable, null, 2));
  await mkdir(dirname(SHEET), { recursive: true });
  const cells = usable.map((c, i) => `<figure><img src="${esc(c.preview || c.url)}" loading="lazy" alt="">
<figcaption><b>${i}. ${esc(c.name)}</b><br><span>${esc(c.article)}</span><br><em>${esc(c.licence)}</em></figcaption></figure>`).join("");
  await writeFile(SHEET, `<!doctype html><meta charset="utf-8"><title>Image candidates — review before publishing</title>
<style>body{background:#111;color:#eee;font:13px system-ui;margin:0;padding:14px}
h1{font-size:15px;font-weight:600}p{color:#9aa;max-width:60em}code{background:#222;padding:1px 5px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:9px}
figure{margin:0;background:#1a1a1a;padding:6px;border:1px solid #333}
img{width:100%;height:125px;object-fit:contain;background:#000}
figcaption{font-size:10.5px;line-height:1.35;margin-top:5px}figcaption span{color:#8ab}figcaption em{color:#7a7}</style>
<h1>${usable.length} candidate images — none of these are on the site yet</h1>
<p>Check that each picture really is the product named. About half of automatic matches are
something else with the same name. Promote the good ones with
<code>npm run images:accept -- 0 3 7</code> (the numbers shown below), then push.
Anything you do not promote is remembered as rejected and will not come back.</p>
<div class="g">${cells}</div>`);

  console.log(`\n${usable.length} candidates written to data/image-candidates.json`);
  console.log(`review sheet: review/image-candidates.html`);
  for (const [i, c] of usable.entries()) console.log(`  ${String(i).padStart(3)}  ${c.name.padEnd(28)} -> ${c.article}  [${c.licence}]`);
}

main().catch((e) => { console.error(e); process.exit(1); });
