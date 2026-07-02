// Daily ingestion: poll every source's RSS, parse, filter for UAV/drone relevance,
// tag, de-duplicate, and upsert into Supabase. Run by GitHub Actions every 24h.
//
//   node scripts/ingest.mjs            # all sources (ingest + analyze)
//   node scripts/ingest.mjs --dry      # parse + filter, print summary, NO writes
//   node scripts/ingest.mjs --only 2,9 # only source ids 2 and 9
//   node scripts/ingest.mjs --no-analyze   # ingest only, skip LLM entity pass
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY (writes); ANTHROPIC_API_KEY (entity
// extraction — optional; if unset, ingest still runs and analysis is skipped).
// See .env.example.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchText, loadDotenv } from "./lib/http.mjs";
import { parseFeed, canonicalUrl, hashUrl } from "./lib/feed.mjs";
import { isRelevant, tagItem } from "./lib/enrich.mjs";
import { upsertArticles, fetchAnalyzedUrls, patchAnalysis } from "./lib/supabase.mjs";
import { analyzeBatch, hasApiKey } from "./lib/analyze.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const NO_ANALYZE = args.includes("--no-analyze");
const onlyIx = args.indexOf("--only");
const ONLY = onlyIx >= 0 ? new Set(args[onlyIx + 1].split(",").map((s) => Number(s.trim()))) : null;

// Drop items older than this on the daily run (backfill.mjs handles history).
const MAX_AGE_DAYS = Number(process.env.INGEST_MAX_AGE_DAYS || 14);

// Cap how many articles we run through the LLM per run (cost guard). The daily
// delta is usually well under this; raise it for a one-off catch-up run.
const ANALYZE_MAX = Number(process.env.ANALYZE_MAX || 80);
const ANALYZE_CONCURRENCY = Number(process.env.ANALYZE_CONCURRENCY || 4);

async function loadSources() {
  const { sources } = JSON.parse(await readFile(join(ROOT, "sources.json"), "utf8"));
  return sources.filter((s) => s.rss && (!ONLY || ONLY.has(s.id)));
}

function toRow(item, src) {
  const url = canonicalUrl(item.url);
  return {
    url,
    url_hash: hashUrl(url),
    title: item.title,
    summary: item.summary || null,
    image_url: item.image_url || null,
    source: src.name,
    source_id: src.id,
    source_url: src.website,
    country: src.country,
    lang: src.lang,
    tags: tagItem(item, src),
    published_at: item.published_at,
  };
}

async function main() {
  await loadDotenv();
  const sources = await loadSources();
  const cutoff = Date.now() - MAX_AGE_DAYS * 86400000;

  const rows = [];
  const seen = new Set();
  const report = [];

  for (const src of sources) {
    let kept = 0, total = 0, err = null;
    try {
      const xml = await fetchText(src.rss);
      const items = parseFeed(xml);
      total = items.length;
      for (const it of items) {
        if (!it.url || !it.title) continue;
        if (it.published_at && Date.parse(it.published_at) < cutoff) continue;
        if (!isRelevant(it, src)) continue;
        const url = canonicalUrl(it.url);
        if (seen.has(url)) continue;       // de-dup within this run
        seen.add(url);
        rows.push(toRow(it, src));
        kept++;
      }
    } catch (e) {
      err = e.message;
    }
    report.push({ id: src.id, name: src.name, total, kept, err });
    console.log(`${err ? "✗" : "✓"} [${String(src.id).padStart(2)}] ${src.name.padEnd(28)} ${kept}/${total} kept${err ? "  ERR: " + err : ""}`);
  }

  console.log(`\n${rows.length} relevant items from ${sources.length} sources (last ${MAX_AGE_DAYS} days).`);

  if (DRY) {
    console.log("\n--dry: no writes. Sample:");
    for (const r of rows.slice(0, 8)) console.log(`  • [${r.source}] ${r.title}  ${JSON.stringify(r.tags)}`);
    if (!NO_ANALYZE && rows.length) await analyzePreview(rows);
    return;
  }
  if (!rows.length) { console.log("Nothing to write."); return; }

  const written = await upsertArticles(rows);
  const failed = report.filter((r) => r.err);
  console.log(`Upserted ${written} rows.${failed.length ? `  ${failed.length} feed(s) failed: ${failed.map((f) => f.name).join(", ")}` : ""}`);

  if (!NO_ANALYZE) await analyzeNew(rows);
}

// LLM entity pass: fill companies/products for rows not yet analyzed.
// Runs AFTER the base upsert so every row exists; writes via PATCH so it never
// disturbs the columns the ingest already set.
async function analyzeNew(rows) {
  if (!hasApiKey()) {
    console.log("\nSkipping entity analysis: ANTHROPIC_API_KEY not set.");
    return;
  }
  const urls = rows.map((r) => r.url);
  let analyzed;
  try {
    analyzed = await fetchAnalyzedUrls(urls);
  } catch (e) {
    console.log(`\nEntity analysis skipped (lookup failed): ${e.message}`);
    return;
  }
  let pending = rows.filter((r) => !analyzed.has(r.url));
  if (!pending.length) { console.log("\nEntity analysis: nothing new to analyze."); return; }

  const capped = pending.length > ANALYZE_MAX;
  if (capped) pending = pending.slice(0, ANALYZE_MAX);
  console.log(`\nAnalyzing ${pending.length}${capped ? ` of ${rows.length - analyzed.size} pending (ANALYZE_MAX=${ANALYZE_MAX})` : ""} article(s) for companies/products…`);

  let ok = 0, bodies = 0, writeErr = 0, llmErr = 0;
  await analyzeBatch(
    pending.map((r) => ({ url: r.url, title: r.title, summary: r.summary })),
    {
      concurrency: ANALYZE_CONCURRENCY,
      onResult: async (item, res) => {
        if (!res.ok) { llmErr++; return; }   // leave analyzed_at null → retried next run
        if (res.usedBody) bodies++;
        try {
          await patchAnalysis(item.url, { companies: res.companies, products: res.products });
          ok++;
        } catch {
          writeErr++;
        }
      },
    }
  );
  console.log(`Entity analysis: ${ok} written (${bodies} from full body, ${ok - bodies} from summary), ${llmErr} LLM skip(s), ${writeErr} write error(s).`);
}

// Dry-run helper: analyze a few items and print, without writing anything.
async function analyzePreview(rows) {
  if (!hasApiKey()) { console.log("\n(analysis preview skipped: ANTHROPIC_API_KEY not set)"); return; }
  const sample = rows.slice(0, 3).map((r) => ({ url: r.url, title: r.title, summary: r.summary }));
  console.log("\n--dry: entity extraction preview (no writes):");
  const results = await analyzeBatch(sample, { concurrency: 2 });
  results.forEach((res, i) => {
    console.log(`  • ${sample[i].title}`);
    console.log(`      companies: ${JSON.stringify(res.companies)}`);
    console.log(`      products:  ${JSON.stringify(res.products)}  ${res.usedBody ? "[body]" : "[summary]"}${res.ok ? "" : "  ERR: " + res.error}`);
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
