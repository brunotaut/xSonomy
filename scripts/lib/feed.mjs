// Zero-dependency RSS 2.0 / Atom 1.0 parser + helpers.
// Built to tolerate the messy real-world feeds in sources.json (CDATA, namespaces,
// media:content / media:thumbnail / enclosure images, content:encoded, dc:date, etc.).
// No XML library — regex/string scanning is good enough for feed <item>/<entry> blocks.

import { createHash } from "node:crypto";

// ---- text helpers ---------------------------------------------------------

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  "#39": "'", "#34": '"', "#38": "&", "#60": "<", "#62": ">", mdash: "—",
  ndash: "–", hellip: "…", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”",
};
export function decodeEntities(s) {
  if (!s) return "";
  return String(s).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, code) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X"
        ? parseInt(code.slice(2), 16)
        : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code] != null ? ENTITIES[code] : m;
  });
}

export function stripHtml(s) {
  return decodeEntities(
    String(s || "")
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  ).replace(/\s+/g, " ").trim();
}

export function clip(s, n = 280) {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return t.slice(0, n - 1).replace(/\s+\S*$/, "").trimEnd() + "…";
}

const unwrapCdata = (s) =>
  String(s || "").replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/m, "$1").trim();

// Grab the inner text of the first <tag ...>...</tag> inside `xml`.
function tag(xml, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i");
  const m = xml.match(re);
  return m ? unwrapCdata(m[1]).trim() : "";
}
// Grab an attribute value from the first <tag .../> matching, e.g. enclosure url.
function tagAttr(xml, name, attr) {
  const re = new RegExp(`<${name}\\b[^>]*\\b${attr}\\s*=\\s*["']([^"']+)["'][^>]*>`, "i");
  const m = xml.match(re);
  return m ? decodeEntities(m[1]).trim() : "";
}
function allBlocks(xml, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "gi");
  const out = [];
  let m;
  while ((m = re.exec(xml))) out.push(m[1]);
  return out;
}

// ---- URL canonicalisation (dedup) -----------------------------------------

const TRACKING_PARAMS = /^(utm_|fbclid|gclid|mc_|ref|ref_src|igshid|spm)/i;
export function canonicalUrl(raw) {
  try {
    const u = new URL(String(raw).trim());
    u.hash = "";
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    if (u.pathname !== "/") u.pathname = u.pathname.replace(/\/+$/, "");
    if ((u.protocol === "http:" && u.port === "80") ||
        (u.protocol === "https:" && u.port === "443")) u.port = "";
    const keep = [];
    for (const [k, v] of u.searchParams) if (!TRACKING_PARAMS.test(k)) keep.push([k, v]);
    u.search = "";
    keep.sort((a, b) => a[0].localeCompare(b[0]));
    for (const [k, v] of keep) u.searchParams.append(k, v);
    let s = u.toString();
    if (s.endsWith("/") && u.pathname !== "/") s = s.slice(0, -1);
    return s;
  } catch {
    return String(raw || "").trim();
  }
}
export const hashUrl = (url) => createHash("sha256").update(url).digest("hex");

// ---- date parsing ---------------------------------------------------------

export function parseDate(s) {
  if (!s) return null;
  const t = Date.parse(s.trim());
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

// ---- image extraction ------------------------------------------------------

function extractImage(block) {
  // media:content / media:thumbnail (with url attr)
  for (const t of ["media:content", "media:thumbnail"]) {
    const u = tagAttr(block, t, "url");
    if (u) return u;
  }
  // enclosure type="image/*"
  const encRe = /<enclosure\b[^>]*>/gi;
  let m;
  while ((m = encRe.exec(block))) {
    const tagStr = m[0];
    if (/type\s*=\s*["']image\//i.test(tagStr) || !/type\s*=/i.test(tagStr)) {
      const um = tagStr.match(/url\s*=\s*["']([^"']+)["']/i);
      if (um) return decodeEntities(um[1]);
    }
  }
  // first <img src> inside content:encoded / description
  const html = tag(block, "content:encoded") || tag(block, "description") ||
               tag(block, "content") || tag(block, "summary");
  const im = String(html).match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
  if (im) return decodeEntities(im[1]);
  return null;
}

// ---- main parser -----------------------------------------------------------

// Returns an array of normalised items:
// { url, title, summary, image_url, published_at, tags:[from <category>] }
export function parseFeed(xml) {
  if (!xml || typeof xml !== "string") return [];
  const items = [];
  const isAtom = /<entry\b/i.test(xml) && !/<item\b/i.test(xml);
  const blocks = isAtom ? allBlocks(xml, "entry") : allBlocks(xml, "item");

  for (const block of blocks) {
    let link = "";
    if (isAtom) {
      // prefer rel="alternate"; fall back to first <link href>
      const alt = block.match(/<link\b[^>]*rel\s*=\s*["']alternate["'][^>]*href\s*=\s*["']([^"']+)["']/i)
              || block.match(/<link\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*rel\s*=\s*["']alternate["']/i);
      link = alt ? alt[1] : (tagAttr(block, "link", "href") || tag(block, "link"));
    } else {
      link = tag(block, "link");
      if (!link) link = tagAttr(block, "link", "href"); // some RSS use atom:link
    }
    link = decodeEntities(link).trim();
    if (!link) continue;

    const title = stripHtml(tag(block, "title"));
    if (!title) continue;

    const rawSummary =
      tag(block, "description") ||
      tag(block, "summary") ||
      tag(block, "content:encoded") ||
      tag(block, "content");

    const dateStr =
      tag(block, "pubDate") ||
      tag(block, "published") ||
      tag(block, "updated") ||
      tag(block, "dc:date") ||
      tag(block, "date");

    // <category> can repeat; capture term/text
    const cats = [];
    const catRe = /<category\b([^>]*)>([\s\S]*?)<\/category>|<category\b([^>]*)\/>/gi;
    let cm;
    while ((cm = catRe.exec(block))) {
      const attrs = cm[1] || cm[3] || "";
      const inner = cm[2] || "";
      const term = attrs.match(/term\s*=\s*["']([^"']+)["']/i);
      const val = stripHtml(term ? term[1] : inner);
      if (val) cats.push(val);
    }

    items.push({
      url: link,
      title,
      summary: clip(stripHtml(rawSummary), 300),
      image_url: extractImage(block),
      published_at: parseDate(dateStr),
      categories: cats,
    });
  }
  return items;
}
