// Helpers for the historical backfill: sitemap discovery/parsing and
// OpenGraph metadata extraction from an article page.
import { fetchText } from "./http.mjs";
import { decodeEntities, stripHtml, parseDate, clip } from "./feed.mjs";

// --- sitemaps --------------------------------------------------------------

// Pull <loc> (and optional <lastmod>) pairs from a sitemap or sitemap index.
export function parseSitemap(xml) {
  const out = [];
  const re = /<(?:url|sitemap)>([\s\S]*?)<\/(?:url|sitemap)>/gi;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const loc = (block.match(/<loc>\s*([\s\S]*?)\s*<\/loc>/i) || [])[1];
    const lastmod = (block.match(/<lastmod>\s*([\s\S]*?)\s*<\/lastmod>/i) || [])[1];
    if (loc) out.push({ loc: decodeEntities(loc.trim()), lastmod: lastmod ? lastmod.trim() : null });
  }
  return out;
}
export const isSitemapIndex = (xml) => /<sitemapindex/i.test(xml);

// Find sitemap URLs for a site: robots.txt directives, then common locations.
export async function discoverSitemaps(website) {
  const origin = new URL(website).origin;
  const found = new Set();
  try {
    const robots = await fetchText(`${origin}/robots.txt`, { retries: 1, timeout: 12000 });
    for (const line of robots.split("\n")) {
      const m = line.match(/^\s*sitemap:\s*(\S+)/i);
      if (m) found.add(m[1].trim());
    }
  } catch { /* ignore */ }
  for (const p of ["/sitemap_index.xml", "/sitemap.xml", "/news-sitemap.xml", "/sitemap-index.xml"]) {
    found.add(origin + p);
  }
  return [...found];
}

// Crawl sitemaps (following one level of index) and return article-ish URLs
// whose lastmod falls within [sinceMs, now]. Bounded by maxSitemaps/maxUrls.
export async function collectUrls(website, { sinceMs, maxSitemaps = 12, maxUrls = 400 } = {}) {
  const seeds = await discoverSitemaps(website);
  const urls = [];
  let visited = 0;

  async function readMap(u) {
    if (visited >= maxSitemaps || urls.length >= maxUrls) return;
    visited++;
    let xml;
    try { xml = await fetchText(u, { retries: 1, timeout: 15000 }); } catch { return; }
    const entries = parseSitemap(xml);
    if (isSitemapIndex(xml)) {
      // Prefer child sitemaps that look recent / post-related.
      const ranked = entries
        .filter((e) => !e.lastmod || Date.parse(e.lastmod) >= sinceMs - 31 * 86400000)
        .sort((a, b) => Date.parse(b.lastmod || 0) - Date.parse(a.lastmod || 0));
      for (const e of ranked) {
        if (visited >= maxSitemaps || urls.length >= maxUrls) break;
        await readMap(e.loc);
      }
    } else {
      for (const e of entries) {
        const t = e.lastmod ? Date.parse(e.lastmod) : NaN;
        if (Number.isFinite(t) && t < sinceMs) continue;
        if (looksLikeArticle(e.loc, website)) urls.push(e);
        if (urls.length >= maxUrls) break;
      }
    }
  }

  for (const s of seeds) {
    if (urls.length >= maxUrls || visited >= maxSitemaps) break;
    await readMap(s);
  }
  // newest first, de-duped
  const seen = new Set();
  return urls
    .filter((e) => (seen.has(e.loc) ? false : seen.add(e.loc)))
    .sort((a, b) => Date.parse(b.lastmod || 0) - Date.parse(a.lastmod || 0));
}

// Heuristic: keep article pages, drop taxonomy/section/pagination URLs.
function looksLikeArticle(loc, website) {
  try {
    const u = new URL(loc);
    if (u.origin !== new URL(website).origin) return false;
    const p = u.pathname.toLowerCase();
    if (p === "/" || p.length < 6) return false;
    if (/\/(category|tag|tags|author|page|topics?|section|feed|wp-|search)\b/.test(p)) return false;
    if (/\.(jpg|jpeg|png|webp|gif|pdf|xml)$/.test(p)) return false;
    const segs = p.replace(/\/+$/, "").split("/").filter(Boolean);
    // article URLs usually have a slug-ish last segment
    return segs.length >= 1 && /[a-z]{4,}/.test(segs[segs.length - 1]);
  } catch { return false; }
}

// --- OpenGraph / meta extraction from an article HTML page -----------------

function meta(html, prop) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)\\s*=\\s*["']${prop}["'][^>]*content\\s*=\\s*["']([^"']*)["']` +
    `|<meta[^>]+content\\s*=\\s*["']([^"']*)["'][^>]*(?:property|name)\\s*=\\s*["']${prop}["']`,
    "i"
  );
  const m = html.match(re);
  return m ? decodeEntities((m[1] || m[2] || "").trim()) : "";
}

export function extractMeta(html) {
  const title = meta(html, "og:title") ||
                stripHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "");
  const summary = meta(html, "og:description") || meta(html, "description");
  const image = meta(html, "og:image") || meta(html, "og:image:url") ||
                meta(html, "twitter:image");
  const published = parseDate(
    meta(html, "article:published_time") ||
    meta(html, "og:updated_time") ||
    (html.match(/<time[^>]+datetime\s*=\s*["']([^"']+)["']/i) || [])[1] || ""
  );
  return {
    title: stripHtml(title),
    summary: clip(stripHtml(summary), 300),
    image_url: image || null,
    published_at: published,
  };
}
