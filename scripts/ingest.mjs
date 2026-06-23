// Daily ingestion: poll every source's RSS, parse, filter for UAV/drone relevance,
// tag, de-duplicate, and upsert into Supabase. Run by GitHub Actions every 24h.
//
//   node scripts/ingest.mjs            # all sources
//   node scripts/ingest.mjs --dry      # parse + filter, print summary, NO writes
//   node scripts/ingest.mjs --only 2,9 # only source ids 2 and 9
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY (writes). See .env.example.

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchText, loadDotenv } from "./lib/http.mjs";
import { parseFeed, canonicalUrl, hashUrl } from "./lib/feed.mjs";
import { isRelevant, tagItem } from "./lib/enrich.mjs";
import { upsertArticles } from "./lib/supabase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const onlyIx = args.indexOf("--only");
const ONLY = onlyIx >= 0 ? new Set(args[onlyIx + 1].split(",").map((s) => Number(s.trim()))) : null;

// Drop items older than this on the daily run (backfill.mjs handles history).
const MAX_AGE_DAYS = Number(process.env.INGEST_MAX_AGE_DAYS || 14);

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
    return;
  }
  if (!rows.length) { console.log("Nothing to write."); return; }

  const written = await upsertArticles(rows);
  const failed = report.filter((r) => r.err);
  console.log(`Upserted ${written} rows.${failed.length ? `  ${failed.length} feed(s) failed: ${failed.map((f) => f.name).join(", ")}` : ""}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
