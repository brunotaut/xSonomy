// One-off (re-runnable) migration: Airtable Sensors + UAVs -> Supabase `products`.
// Runs server-side (CI or local) so there are no result-size limits — full specs
// are folded into the `specs` JSONB. Idempotent: upserts on slug, so re-running
// syncs changes. Also refreshes product_companies (manufacturer) and company_sectors.
//
// Env (repo secrets in CI, or .env locally):
//   AIRTABLE_TOKEN          read access to base appwMCCtt57i8SNbR
//   SUPABASE_URL            https://uobidcahmrmfdmfbrtkt.supabase.co
//   SUPABASE_SERVICE_KEY    service_role key (bypasses RLS)
// Run:  node scripts/migrate-products-to-supabase.mjs

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE_ID = process.env.AIRTABLE_BASE_ID || "appwMCCtt57i8SNbR";
const TABLES = [
  { id: "tblUIEuwkxizjAb05", category: "UAV" },
  { id: "tblTGH1m1Txi3eibs", category: "Sensor" },
];

// Airtable field NAME -> products column. Everything else -> specs JSONB.
const COLUMN = {
  Name: "name", Company: "__company", Country: "country", Subcategory: "subcategory",
  "Use class": "use_class", Summary: "summary", Website: "website",
  Image: "__image", Status: "__status", Price: "price", Confidence: "confidence",
};
// Internal fields never stored in specs.
const SKIP_SPEC = new Set(["Enrichment status", "Source URLs", "slug", ...Object.keys(COLUMN)]);

async function loadDotenv() {
  const p = join(ROOT, ".env");
  if (!existsSync(p)) return;
  for (const line of (await readFile(p, "utf8")).split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const SB = () => {
  const url = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY required.");
  return { url, key };
};
const sbHeaders = () => {
  const { key } = SB();
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
};

async function airtableRows(tableId) {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) throw new Error("AIRTABLE_TOKEN required.");
  const out = []; let offset;
  do {
    const u = new URL(`https://api.airtable.com/v0/${BASE_ID}/${tableId}`);
    u.searchParams.set("pageSize", "100");
    if (offset) u.searchParams.set("offset", offset);
    const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Airtable ${tableId} ${r.status}: ${await r.text()}`);
    const j = await r.json(); out.push(...j.records); offset = j.offset;
  } while (offset);
  return out;
}

const scalar = (v) => {
  if (Array.isArray(v)) {
    if (v.length && typeof v[0] === "object") return v[0].url || v.map((x) => x.name).filter(Boolean).join(", ");
    return v.join(", ");
  }
  if (v && typeof v === "object") return v.name || v.url || null;
  return v;
};

async function sbGet(path) {
  const { url } = SB();
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: sbHeaders() });
  if (!r.ok) throw new Error(`Supabase GET ${path} ${r.status}: ${await r.text()}`);
  return r.json();
}

async function sbUpsert(path, rows, onConflict, returnRep = false) {
  if (!rows.length) return [];
  const { url } = SB();
  const out = [];
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const r = await fetch(`${url}/rest/v1/${path}?on_conflict=${onConflict}`, {
      method: "POST",
      headers: { ...sbHeaders(), Prefer: `resolution=merge-duplicates,return=${returnRep ? "representation" : "minimal"}` },
      body: JSON.stringify(batch),
    });
    if (!r.ok) throw new Error(`Supabase upsert ${path} ${r.status}: ${await r.text()}`);
    if (returnRep) out.push(...(await r.json()));
  }
  return out;
}

function slugify(name, seen) {
  let base = String(name || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "item";
  let s = base, i = 2;
  while (seen.has(s)) s = `${base}-${i++}`;
  seen.add(s);
  return s;
}

async function main() {
  await loadDotenv();
  SB();

  // lookup maps
  const companies = await sbGet("companies?select=id,name&limit=2000");
  const aliases = await sbGet("company_aliases?select=company_id,alias&limit=5000");
  const sectors = await sbGet("sectors?select=id,slug");
  const coByName = new Map();
  for (const c of companies) coByName.set(c.name.toLowerCase(), c.id);
  for (const a of aliases) if (!coByName.has(a.alias.toLowerCase())) coByName.set(a.alias.toLowerCase(), a.company_id);
  const sectorBySlug = new Map(sectors.map((s) => [s.slug, s.id]));
  const catToSlug = { UAV: "uav", Sensor: "sensors" };

  const seen = new Set();
  const productRows = [];
  const unresolved = new Map();

  for (const { id, category } of TABLES) {
    const recs = await airtableRows(id);
    console.log(`${category}: ${recs.length} Airtable rows`);
    for (const rec of recs) {
      const f = rec.fields || {};
      const name = f.Name;
      if (!name) continue;
      const specs = {};
      const row = { category, specs };
      for (const [k, v] of Object.entries(f)) {
        if (v == null || v === "") continue;
        const col = COLUMN[k];
        if (col === "__company") {
          row.__company = scalar(v);
        } else if (col === "__image") {
          row.image_url = scalar(v);
        } else if (col === "__status") {
          row.publication_status = String(scalar(v)).toLowerCase() === "live" ? "live" : "draft";
        } else if (col === "use_class") {
          const uc = scalar(v);
          row.use_class = ["Civil", "Dual-use", "C-UAS"].includes(uc) ? uc : null;
        } else if (col) {
          row[col] = scalar(v);
        } else if (!SKIP_SPEC.has(k)) {
          specs[k] = Array.isArray(v) ? v.map(scalar) : scalar(v);
        }
      }
      row.slug = slugify(name, seen);
      row.description = row.summary || null;
      const cid = row.__company ? coByName.get(String(row.__company).toLowerCase()) : null;
      if (row.__company && !cid) unresolved.set(row.__company, (unresolved.get(row.__company) || 0) + 1);
      row.company_id = cid || null;
      delete row.__company;
      row.publication_status = row.publication_status || "draft";
      productRows.push(row);
    }
  }

  console.log(`Upserting ${productRows.length} products…`);
  // PostgREST bulk insert requires every object to have the SAME keys -> normalize.
  const COLS = ["slug", "company_id", "name", "category", "subcategory", "use_class",
    "country", "summary", "description", "website", "image_url", "price", "specs",
    "publication_status"];
  const normalized = productRows.map((r) =>
    Object.fromEntries(COLS.map((c) => [c, c === "specs" ? (r.specs || {}) : (r[c] ?? null)])));
  const inserted = await sbUpsert("products", normalized, "slug", true);

  // manufacturer links + sector tags
  const pc = inserted.filter((p) => p.company_id).map((p) => ({ product_id: p.id, company_id: p.company_id, role: "manufacturer" }));
  await sbUpsert("product_companies", pc, "product_id,company_id,role");

  const cs = [];
  const seenCS = new Set();
  for (const p of inserted) {
    const sid = sectorBySlug.get(catToSlug[p.category]);
    if (p.company_id && sid) {
      const k = `${p.company_id}:${sid}`;
      if (!seenCS.has(k)) { seenCS.add(k); cs.push({ company_id: p.company_id, sector_id: sid, is_primary: false }); }
    }
  }
  await sbUpsert("company_sectors", cs, "company_id,sector_id");

  const byCat = {};
  for (const p of inserted) byCat[p.category] = (byCat[p.category] || 0) + 1;
  console.log("\nDone.");
  console.log("  products upserted:", inserted.length, byCat);
  console.log("  linked to a company:", inserted.filter((p) => p.company_id).length);
  console.log("  unresolved company names:", unresolved.size);
  [...unresolved.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
    .forEach(([n, c]) => console.log(`    ${n} (${c})`));
}

main().catch((e) => { console.error(e); process.exit(1); });
