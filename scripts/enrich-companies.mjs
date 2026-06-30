// One-off (resumable) company enrichment: fill catalogue profile/financial
// fields for every company with enrichment_status IS NULL, using Claude's
// training knowledge only (no web). Never overwrites curated values; uncertain
// fields are left NULL. Rows stay publication_status='draft' for later review.
//
//   node scripts/enrich-companies.mjs                 # all remaining
//   node scripts/enrich-companies.mjs --max 25        # cap this run
//   node scripts/enrich-companies.mjs --batch 25      # rows fetched per page
//   node scripts/enrich-companies.mjs --concurrency 4 # parallel calls
//   node scripts/enrich-companies.mjs --dry           # call LLM, print, NO writes
//
// Resumable: each company is stamped enrichment_status when done. Designed for
// GitHub Actions where SUPABASE_SERVICE_KEY + ANTHROPIC_API_KEY are secrets.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY.

import { loadDotenv } from "./lib/http.mjs";
import { fetchUnenrichedCompanies, countUnenriched, patchCompany } from "./lib/supabase.mjs";
import { enrichCompany, hasApiKey, ENRICH_FIELDS } from "./lib/enrich-company.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const numArg = (flag, dflt) => { const i = args.indexOf(flag); return i >= 0 ? Number(args[i + 1]) : dflt; };
const MAX = numArg("--max", Infinity);
const BATCH = numArg("--batch", 25);
const CONCURRENCY = numArg("--concurrency", Number(process.env.ENRICH_CONCURRENCY || 4));

const isEmpty = (v) => v == null || v === "" || (Array.isArray(v) && v.length === 0);

// Build the patch: only fields that are currently empty in the DB row AND that
// the model returned a value for. Never clobbers curated data.
function buildPatch(row, fields) {
  const patch = {};
  for (const k of ENRICH_FIELDS) {
    if (k in fields && isEmpty(row[k])) patch[k] = fields[k];
  }
  return patch;
}

async function runOne(row, stats) {
  const res = await enrichCompany({
    name: row.name, website: row.website, hq_country: row.hq_country, company_type: row.company_type,
  });
  stats.processed++;
  if (!res.ok) { stats.llmErr++; return; }   // leave enrichment_status null → retried later
  const patch = buildPatch(row, res.fields);
  const nFilled = Object.keys(patch).length;
  stats.filled += nFilled;
  if (res.confidence === "high") stats.high++; else if (res.confidence === "medium") stats.med++; else stats.low++;
  if (DRY) {
    console.log(`  • ${row.name}  [${res.confidence || "?"}]  +${nFilled} fields: ${Object.keys(patch).join(", ") || "(none)"}`);
    stats.ok++;
    return;
  }
  try {
    await patchCompany(row.id, patch, { confidence: res.confidence, status: "llm" });
    stats.ok++;
  } catch (e) {
    stats.writeErr++;
    if (stats.writeErr <= 3) console.error(`    write err (${row.name}): ${e.message}`);
  }
}

async function pool(rows, n, worker) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, rows.length)) }, async () => {
    while (i < rows.length) { const idx = i++; await worker(rows[idx]); }
  }));
}

async function main() {
  await loadDotenv();
  if (!hasApiKey()) { console.error("ANTHROPIC_API_KEY is not set — nothing to do."); process.exit(1); }

  const remaining = await countUnenriched();
  console.log(`Company enrichment start: ${remaining ?? "?"} need enrichment.` +
    (Number.isFinite(MAX) ? `  Cap: ${MAX}.` : "") +
    `  batch=${BATCH} concurrency=${CONCURRENCY}${DRY ? "  [DRY]" : ""}`);

  const stats = { processed: 0, ok: 0, filled: 0, high: 0, med: 0, low: 0, llmErr: 0, writeErr: 0 };
  const t0 = Date.now();

  const seen = new Set();   // hard guard: never process the same company twice in a run
  while (stats.processed < MAX) {
    const want = Math.min(BATCH, MAX - stats.processed);
    const rows = await fetchUnenrichedCompanies(want);
    if (!rows.length) break;
    const fresh = rows.filter((r) => !seen.has(r.id));
    if (!fresh.length) {
      console.error("Stopping: re-fetched only already-processed rows — writes aren't clearing the queue. " +
        "Refusing to loop (this is the runaway-cost guard). Check the last write errors above.");
      break;
    }
    fresh.forEach((r) => seen.add(r.id));
    await pool(fresh, CONCURRENCY, (row) => runOne(row, stats));
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(`  …${stats.processed} done | ${stats.ok} written | ${stats.filled} fields filled | conf H/M/L ${stats.high}/${stats.med}/${stats.low} | ${stats.llmErr} llm err | ${stats.writeErr} write err | ${secs}s`);
    if (DRY) break;
  }

  const left = await countUnenriched().catch(() => null);
  console.log(`\nDone. processed=${stats.processed} written=${stats.ok} fieldsFilled=${stats.filled} remaining=${left ?? "?"}.`);
  if (left && left > 0 && !DRY) console.log("Re-run to continue (resumes automatically).");
}

main().catch((e) => { console.error(e); process.exit(1); });
