// Build the static news site into ./public.
//  - server-renders the most recent items into index.html (SEO + no-JS fallback)
//  - injects the public Supabase config so the client can query the full archive
//  - emits feed.xml (xSonomy's own RSS), robots.txt, sitemap.xml
//  - copies src/ (frontend) into public/
// Run after ingest. Reads from Supabase with the anon or service key.

import { mkdir, rm, cp, writeFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDotenv } from "./lib/http.mjs";
import { fetchRecent, countArticles } from "./lib/supabase.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "public");

const SITE_URL = (process.env.SITE_URL || "https://news.xsonomy.com").replace(/\/+$/, "");
const HOME_URL = process.env.HOME_URL || "https://xsonomy.com/";
const RECENT_SSR = Number(process.env.RECENT_SSR || 120);
const PAGE_SIZE = Number(process.env.PAGE_SIZE || 24);

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmtDate = (s) => { if (!s) return ""; const d = new Date(s); return isNaN(d) ? "" : d.toISOString().slice(0, 10); };

function cardHtml(a) {
  const cos = (a.companies || []).slice(0, 4).map((c) => `<span class="company">${esc(c)}</span>`).join("");
  const tags = (a.tags || []).slice(0, 3).map((t) => `<span>${esc(t)}</span>`).join("");
  const thumb = a.image_url
    ? `<div class="thumb" style="background-image:url('${esc(a.image_url)}')"></div>`
    : `<div class="thumb empty" aria-hidden="true">◇</div>`;
  return `<a class="card" href="${esc(a.url)}" target="_blank" rel="noopener nofollow">${thumb}<div class="body">` +
    `<div class="meta"><span class="src">${esc(a.source)}</span><span>${fmtDate(a.published_at)}</span></div>` +
    `<h3>${esc(a.title)}</h3>${a.summary ? `<p>${esc(a.summary)}</p>` : ""}` +
    `<div class="tags">${cos}${tags}</div></div></a>`;
}

function rssXml(items) {
  const entries = items.slice(0, 50).map((a) => `    <item>
      <title>${esc(a.title)}</title>
      <link>${esc(a.url)}</link>
      <guid isPermaLink="true">${esc(a.url)}</guid>
      <source>${esc(a.source)}</source>
      ${a.published_at ? `<pubDate>${new Date(a.published_at).toUTCString()}</pubDate>` : ""}
      <description>${esc(a.summary || "")}</description>
    </item>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>xSonomy — UAV &amp; Counter-Drone News</title>
  <link>${SITE_URL}/</link>
  <description>Curated UAV / C-UAS headlines from proven media. Links point to original sources.</description>
${entries}
</channel></rss>`;
}

async function main() {
  await loadDotenv();
  const { sources } = JSON.parse(await readFile(join(ROOT, "sources.json"), "utf8"));
  const sourceCount = sources.length;

  let recent = [];
  let total = null;
  try {
    recent = await fetchRecent(RECENT_SSR);
    total = await countArticles();
  } catch (e) {
    console.error("WARN: could not read Supabase — building an empty shell.", e.message);
  }

  const anonKey = process.env.SUPABASE_ANON_KEY || "";
  const supaUrl = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  if (!anonKey || !supaUrl) {
    console.error("WARN: SUPABASE_URL / SUPABASE_ANON_KEY not set — client-side feed will be disabled.");
  }
  const config = `window.XSONOMY=${JSON.stringify({ supabaseUrl: supaUrl, anonKey, pageSize: PAGE_SIZE })};`;

  // fresh public/
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await cp(join(SRC, "assets"), join(OUT, "assets"), { recursive: true });

  // index.html
  let html = await readFile(join(SRC, "index.html"), "utf8");
  html = html
    .replaceAll("__SITEURL__", SITE_URL)
    .replaceAll("__HOMEURL__", HOME_URL)
    .replace("__CONFIG__", config)
    .replace("__CARDS__", recent.map(cardHtml).join("\n") || `<p class="muted">No items yet — run the ingest workflow.</p>`)
    .replace("__SOURCECOUNT__", String(sourceCount))
    .replace("__COUNT__", total != null ? total.toLocaleString("en-US") : String(recent.length))
    .replace("__BUILT__", new Date().toISOString().slice(0, 10));
  await writeFile(join(OUT, "index.html"), html);

  // data + feeds
  await mkdir(join(OUT, "data"), { recursive: true });
  await writeFile(join(OUT, "data", "recent.json"), JSON.stringify(recent));
  await writeFile(join(OUT, "feed.xml"), rssXml(recent));
  await writeFile(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  await writeFile(join(OUT, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${SITE_URL}/</loc><lastmod>${new Date().toISOString().slice(0,10)}</lastmod></url>\n</urlset>\n`);

  if (process.env.CNAME) await writeFile(join(OUT, "CNAME"), process.env.CNAME.trim() + "\n");

  console.log(`Built ./public — ${recent.length} cards rendered, ${total ?? "?"} total archived. Site: ${SITE_URL}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
