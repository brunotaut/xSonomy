// One-time historical backfill (~last N days). RSS only carries the latest ~20-100
// items, so history comes from each outlet's sitemaps: crawl sitemaps for article
// URLs within the window, fetch each page, extract OpenGraph meta, filter for
// UAV/drone relevance, tag, and upsert into Supabase.
//
//   node scripts/backfill.mjs --days 300                 # all sources
//   node scripts/backfill.mjs --days 300 --only 2,9
//   node scripts/backfill.mjs --days 300 --max-per-source 250
//   node scripts/backfill.mjs --days 300 --dry           # discover only, no writes
//
// This is slow and network-heavy by design. Run it from the Actions tab
// (workflow_dispatch) or locally with .env set. Re-running is safe (dedup on url).

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchText, loadDotenv } from "./lib/http.mjs";
import { canonicalUrl, hashUrl } from "./lib/feed.mjs";
import { collectUrls, extractMeta } from "./lib/scrape.mjs";
import { isRelevant, tagItem } from "./lib/enrich.mjs";
import { upsertArticles } from "./lib/supabase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const getArg = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DRY = args.includes("--dry");
const DAYS = Number(getArg("--days", 300));
const MAX_PER = Number(getArg("--max-per-source", 300));
const CONCURRENCY = Number(getArg("--concurrency", 5));
const onlyArg = getArg("--only", null);
const ONLY = onlyArg ? new Set(onlyArg.split(",").map((s) => Number(s.trim()))) : null;

const sinceMs = Date.now() - DAYS * 86400000;

// minimal concurrency pool
async function pool(items, n, worker) {
  const results = [];
  let i = 0;
  const runners = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx).catch((e) => ({ __err: e.message }));
    }
  });
  await Promise.all(runners);
  return results;
}

async function loadSources() {
  const { sources } = JSON.parse(await readFile(join(ROOT, "sources.json"), "utf8"));
  return sources.filter((s) => s.website && (!ONLY || ONLY.has(s.id)));
}

async function backfillSource(src) {
  let candidates = [];
  try {
    candidates = await collectUrls(src.website, { sinceMs, maxUrls: MAX_PER * 3 });
  } catch (e) {
    console.log(`✗ [${String(src.id).padStart(2)}] ${src.name}: sitemap error ${e.message}`);
    return [];
  }
  candidates = candidates.slice(0, MAX_PER);
  console.log(`  [${String(src.id).padStart(2)}] ${src.name.padEnd(28)} ${candidates.length} candidate URLs`);
  if (DRY || !candidates.length) return [];

  const rows = [];
  await pool(candidates, CONCURRENCY, async (c) => {
    let html;
    try { html = await fetchText(c.loc, { retries: 1, timeout: 18000 }); } catch { return; }
    const meta = extractMeta(html);
    if (!meta.title) return;
    let published_at = meta.published_at;
    if (!published_at && c.lastmod && Number.isFinite(Date.parse(c.lastmod))) {
      published_at = new Date(Date.parse(c.lastmod)).toISOString();
    }
    const item = { url: c.loc, title: meta.title, summary: meta.summary,
                   image_url: meta.image_url, published_at, categories: [] };
    if (item.published_at && Date.parse(item.published_at) < sinceMs) return;
    if (!isRelevant(item, src)) return;
    const url = canonicalUrl(item.url);
    rows.push({
      url, url_hash: hashUrl(url),
      title: item.title, summary: item.summary || null, image_url: item.image_url || null,
      source: src.name, source_id: src.id, source_url: src.website,
      country: src.country, lang: src.lang,
      tags: tagItem(item, src), published_at: item.published_at,
    });
  });
  return rows;
}

async function main() {
  await loadDotenv();
  const sources = await loadSources();
  console.log(`Backfill: ${sources.length} sources, last ${DAYS} days, max ${MAX_PER}/source.\n`);

  const seen = new Set();
  let totalWritten = 0;
  for (const src of sources) {
    const rows = (await backfillSource(src)).filter((r) => (seen.has(r.url) ? false : seen.add(r.url)));
    if (DRY) { console.log(`    (dry) ${rows.length} would be kept`); continue; }
    if (rows.length) {
      const w = await upsertArticles(rows);
      totalWritten += w;
      console.log(`    upserted ${w} (running total ${totalWritten})`);
    }
  }
  console.log(`\nDone. ${DRY ? "Dry run — no writes." : `Upserted ~${totalWritten} historical items.`}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
