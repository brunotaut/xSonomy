// Wikidata company enricher: resolve each catalogue company to its Wikidata
// entity and fill structured fields (founded year, HQ city, employees, revenue,
// valuation, ticker/exchange, website, logo, Wikipedia/LinkedIn/Twitter) — FREE,
// no LLM, no fabrication. NULL-only: never overwrites existing/curated values.
// Idempotent + safe to re-run (Wikidata is free; rows already complete just
// produce empty patches).
//
//   node scripts/enrich-wikidata.mjs              # whole catalogue
//   node scripts/enrich-wikidata.mjs --max 25     # cap this run
//   node scripts/enrich-wikidata.mjs --dry        # resolve + print, NO writes
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY.

import { loadDotenv } from "./lib/http.mjs";
import { fetchCompaniesPage, patchCompanyFields } from "./lib/supabase.mjs";
import { resolveAndExtract } from "./lib/wikidata.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const numArg = (f, d) => { const i = args.indexOf(f); return i >= 0 ? Number(args[i + 1]) : d; };
const MAX = numArg("--max", Infinity);
const PAGE = numArg("--page", 50);
const CONCURRENCY = numArg("--concurrency", 3);

// fields this enricher can supply (NULL-only fill against the live row)
const WD_FIELDS = ["founded_year", "hq_city", "employee_count", "employee_range",
  "revenue_amount", "revenue_currency", "revenue_year", "valuation", "valuation_currency",
  "is_public", "stock_ticker", "stock_exchange", "website", "logo_url",
  "wikipedia_url", "linkedin_url", "twitter_url"];

const isEmpty = (v) => v == null || v === "" || (Array.isArray(v) && v.length === 0) || v === false;

function buildPatch(row, fields) {
  const patch = {};
  for (const k of WD_FIELDS) {
    if (k in fields && isEmpty(row[k])) patch[k] = fields[k];
  }
  return patch;
}

async function pool(items, n, worker) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, items.length)) }, async () => {
    while (i < items.length) { const idx = i++; await worker(items[idx]); }
  }));
}

async function runOne(row, stats) {
  stats.processed++;
  let res;
  try { res = await resolveAndExtract(row.name, row.website); }
  catch (e) { stats.err++; return; }
  if (!res.ok) { stats.nomatch++; return; }
  stats.matched++;
  const patch = buildPatch(row, res.fields);
  const n = Object.keys(patch).length;
  if (!n) { stats.empty++; return; }
  stats.filled += n;
  if (DRY) { console.log(`  • ${row.name} → ${res.qid}  +${n}: ${Object.keys(patch).join(", ")}`); stats.ok++; return; }
  // record provenance
  patch.source_urls = [...new Set([...(row.source_urls || []), res.url])];
  try { await patchCompanyFields(row.id, patch); stats.ok++; }
  catch (e) { stats.writeErr++; if (stats.writeErr <= 3) console.error(`    write err (${row.name}): ${e.message}`); }
}

async function main() {
  await loadDotenv();
  const stats = { processed: 0, matched: 0, nomatch: 0, empty: 0, ok: 0, filled: 0, err: 0, writeErr: 0 };
  const t0 = Date.now();
  console.log(`Wikidata enrichment start. page=${PAGE} concurrency=${CONCURRENCY}${DRY ? "  [DRY]" : ""}${Number.isFinite(MAX) ? `  cap=${MAX}` : ""}`);

  let offset = 0;
  while (stats.processed < MAX) {
    const rows = await fetchCompaniesPage(PAGE, offset);
    if (!rows.length) break;
    const batch = Number.isFinite(MAX) ? rows.slice(0, MAX - stats.processed) : rows;
    await pool(batch, CONCURRENCY, (row) => runOne(row, stats));
    offset += rows.length;
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`  …${stats.processed} done | ${stats.matched} matched | ${stats.ok} written | ${stats.filled} fields | ${stats.nomatch} no-match | ${stats.empty} already-full | ${stats.writeErr} write err | ${secs}s`);
    if (rows.length < PAGE) break;
  }
  console.log(`\nDone. processed=${stats.processed} matched=${stats.matched} written=${stats.ok} fieldsFilled=${stats.filled} noMatch=${stats.nomatch} errors=${stats.err + stats.writeErr}.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
