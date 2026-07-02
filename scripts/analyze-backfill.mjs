// One-off (resumable) backfill: run the LLM entity pass over EVERY article that
// hasn't been analyzed yet (analyzed_at IS NULL), filling companies/products.
//
//   node scripts/analyze-backfill.mjs                 # process everything
//   node scripts/analyze-backfill.mjs --max 500       # stop after 500 articles
//   node scripts/analyze-backfill.mjs --batch 50      # rows fetched per page
//   node scripts/analyze-backfill.mjs --concurrency 6 # parallel analyses
//   node scripts/analyze-backfill.mjs --dry           # fetch+extract+LLM, NO writes
//
// Resumable: each analyzed row is stamped analyzed_at, so re-running continues
// where it left off. Safe to stop/restart. Designed to run in GitHub Actions
// where SUPABASE_SERVICE_KEY + ANTHROPIC_API_KEY already exist as secrets.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY. See .env.example.

import { loadDotenv } from "./lib/http.mjs";
import { fetchUnanalyzedBatch, countUnanalyzed, patchAnalysis } from "./lib/supabase.mjs";
import { analyzeBatch, hasApiKey } from "./lib/analyze.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const numArg = (flag, dflt) => {
  const i = args.indexOf(flag);
  return i >= 0 ? Number(args[i + 1]) : dflt;
};
const MAX = numArg("--max", Infinity);            // overall cap on articles this run
const BATCH = numArg("--batch", 50);              // rows pulled from Supabase per page
const CONCURRENCY = numArg("--concurrency", Number(process.env.ANALYZE_CONCURRENCY || 5));

async function main() {
  await loadDotenv();
  if (!hasApiKey()) {
    console.error("ANTHROPIC_API_KEY is not set — nothing to do.");
    process.exit(1);
  }

  const remaining = await countUnanalyzed();
  console.log(`Backfill start: ${remaining ?? "?"} article(s) need analysis.` +
    (Number.isFinite(MAX) ? `  Cap this run: ${MAX}.` : "") +
    `  batch=${BATCH} concurrency=${CONCURRENCY}${DRY ? "  [DRY]" : ""}`);

  let processed = 0, ok = 0, bodies = 0, llmErr = 0, writeErr = 0;
  const t0 = Date.now();

  while (processed < MAX) {
    const want = Math.min(BATCH, MAX - processed);
    const rows = await fetchUnanalyzedBatch(want);
    if (!rows.length) break;

    await analyzeBatch(
      rows.map((r) => ({ url: r.url, title: r.title, summary: r.summary })),
      {
        concurrency: CONCURRENCY,
        onResult: async (item, res) => {
          processed++;
          if (!res.ok) { llmErr++; return; }  // leave analyzed_at null → retried later
          if (res.usedBody) bodies++;
          if (DRY) { ok++; return; }
          try {
            await patchAnalysis(item.url, { companies: res.companies, products: res.products });
            ok++;
          } catch { writeErr++; }
        },
      }
    );

    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    const rate = processed > 0 ? (processed / ((Date.now() - t0) / 60000)).toFixed(0) : "0";
    console.log(`  …${processed} processed (${ok} written, ${bodies} from body, ${llmErr} LLM skip, ${writeErr} write err)  ${secs}s  ~${rate}/min`);

    // In --dry we only want a taste, not the whole table.
    if (DRY) {
      console.log("\n--dry sample of last batch:");
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        console.log(`  • ${rows[i].title}`);
      }
      break;
    }
  }

  const left = await countUnanalyzed().catch(() => null);
  console.log(`\nDone. processed=${processed} written=${ok} llmSkip=${llmErr} writeErr=${writeErr}. Remaining unanalyzed: ${left ?? "?"}.`);
  if (left && left > 0 && !DRY) console.log("Re-run to continue (it resumes automatically).");
}

main().catch((e) => { console.error(e); process.exit(1); });
