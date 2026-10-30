// xSonomy catalogue generator.
// Reads Supabase and writes the whole static site: per-category JSON for the
// client-side grid, an SEO page per product, company pages, sitemap and robots.
//
// Build-time only: fetches server-side with the SERVICE key (bypasses RLS) and
// writes STATIC json/html — no Supabase key reaches the browser.
//
// Env (.env locally, repo secrets in CI):
//   SUPABASE_URL          https://uobidcahmrmfdmfbrtkt.supabase.co
//   SUPABASE_SERVICE_KEY  service_role key (secret, server-side only)
// Run:  npm run build:supabase

import { mkdir, rm, cp, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchLandscape, fetchLandscapeInvestors } from "./lib/landscape.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "public");
const SITE = "https://xsonomy.com";

// Every product category in the database gets published. `db` lists the
// `products.category` values that feed each section; anything unrecognised falls into
// "other" rather than silently disappearing, which is what used to happen to the 1,350
// Counter-UAS / Effector / Software / Other rows.
const CATEGORIES = {
  uav:      { label: "UAVs",        file: "uav.json",      db: ["UAV"] },
  cuas:     { label: "Counter-UAS", file: "cuas.json",     db: ["Counter-UAS", "Effector"] },
  sensors:  { label: "Sensors",     file: "sensors.json",  db: ["Sensor"] },
  software: { label: "Software",    file: "software.json", db: ["Software"] },
  other:    { label: "Other",       file: "other.json",    db: ["Other"] },
};
const BUCKET_OF = Object.fromEntries(
  Object.entries(CATEGORIES).flatMap(([key, c]) => c.db.map((d) => [d, key])));
const SECTION_TITLE = {
  uav: "UAVs — xSonomy Catalogue",
  cuas: "Counter-UAS systems & effectors — xSonomy Catalogue",
  sensors: "Sensors — xSonomy Counter-UAS Catalogue",
  software: "Software & autonomy — xSonomy Catalogue",
  other: "Components & other — xSonomy Catalogue",
};
const BUCKET_KICKER = { uav: "UAV", cuas: "Counter-UAS", sensors: "Sensor", software: "Software", other: "Component" };
const HIDDEN = new Set(["Name", "Company", "Summary", "Website", "Image", "Status", "Enrichment status", "Source URLs", "Category", "Confidence", "slug", "Mentions"]);

// "live" = only publication_status='live' reaches the site; null = everything, including drafts.
//
// This was null until 2026-10-22, which meant `draft` was a label with no effect: companies
// imported from external research as drafts would have appeared on xsonomy.com at the next
// build. Draft now genuinely means not published. Switching it back re-exposes every draft row,
// so it is a publishing decision, not a tuning knob.
const PUBLISH_STATUS = "live";

// Research & academia — the organisation class adopted 2026-10-30. Universities, national
// laboratories and research institutes do real work on uncrewed systems, so their pages,
// products and landscape membership are untouched; they simply are not suppliers, and
// counting them as companies inflated the registry's headline figure. Membership is the
// existing `company_type`, so the database needed no change: the split is here, where
// /companies/ and /research/ are built from the same fetch.
const RESEARCH_TYPES = new Set(["research_institute", "university"]);
const isResearchOrg = (c) => RESEARCH_TYPES.has(c.company_type);

// ---- utils (inlined from generate.mjs) ----
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clip = (s, n = 155) => { const t = String(s || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t; };
const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const specLabel = (k) => k.replace(/^.*· /, "");
const analystNote = (note) => { const m = String(note || "").split(/Analyst note:\s*/i); return m.length > 1 ? m[1].trim() : null; };

const slugSeen = new Map();   // section -> set of slugs already used
const slugify = (name, section = "_") => {
  if (!slugSeen.has(section)) slugSeen.set(section, new Set());
  const seen = slugSeen.get(section);
  let base = String(name || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "item";
  let s = base, i = 2;
  while (seen.has(s)) s = `${base}-${i++}`;
  seen.add(s);
  return s;
};

// Google Analytics 4. Injected into every generated page; the catalogue shell in
// src/index.html carries its own copy, which also covers the section pages built
// from it. The measurement ID is a public identifier, not a secret.
const GA_TAG = `<!-- Google tag (gtag.js) with Consent Mode v2 -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  // Storage denied until the visitor opts in. This MUST run before gtag.js loads,
  // otherwise GA sets its cookies first and the consent state arrives too late.
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  });
  // Restore a previous "accept" before the first hit, so returning visitors are measured.
  try {
    if (localStorage.getItem('xs-consent') === 'granted') {
      gtag('consent', 'update', { analytics_storage: 'granted' });
    }
  } catch (e) {}
  gtag('js', new Date());
  gtag('config', 'G-8WL3V0JVBR');
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-8WL3V0JVBR"></script>
<script defer src="/assets/consent.js"></script>
`;

const PAGE_CSS = `
:root{--bg:#0a0d10;--panel:#0f1418;--panel2:#141a1f;--line:rgba(255,255,255,.1);--text:#e7ecef;--muted:#8b96a0;--ink3:#44505a;--accent:#5fd0e0;--mono:"Share Tech Mono",ui-monospace,Menlo,monospace;--sans:"Inter Tight",system-ui,sans-serif;--display:"Chakra Petch",sans-serif}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:var(--sans);font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.hd{border-bottom:1px solid var(--line);background:linear-gradient(180deg,var(--panel),var(--bg))}
.hd .w{max-width:920px;margin:0 auto;padding:0 20px;height:60px;display:flex;align-items:center;justify-content:space-between}
.hd .brand{font-family:var(--display);font-size:19px;letter-spacing:.22em;color:var(--text)}
.hd .back{font-family:var(--mono);font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:var(--muted)}
.wrap{max-width:920px;margin:0 auto;padding:28px 20px 80px}
.kicker{font-family:var(--mono);font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:var(--accent)}
h1{font-family:var(--display);font-size:42px;line-height:1.02;letter-spacing:.03em;text-transform:uppercase;margin:8px 0 4px}
.sub{font-family:var(--mono);font-size:12px;letter-spacing:.12em;color:var(--muted);margin-bottom:24px}
.hero{width:100%;max-height:440px;object-fit:cover;border:1px solid var(--line);margin-bottom:24px;background:var(--panel2)}
.art{position:relative;border:1px solid var(--line);background:radial-gradient(ellipse at center,var(--panel2),var(--panel) 70%);aspect-ratio:16 / 7;margin-bottom:24px;color:var(--accent);display:grid;place-items:center;overflow:hidden}
.art .art-svg{position:absolute;inset:0}
.lead{font-size:16px;color:#c4cad4;margin:0 0 22px}
.why{border-left:3px solid var(--accent);background:var(--panel2);padding:14px 18px;color:var(--text);font-size:14px;margin:0 0 24px}
.why b{font-family:var(--mono);display:block;color:var(--accent);font-size:10px;letter-spacing:.25em;text-transform:uppercase;margin-bottom:6px}
table{width:100%;border-collapse:collapse;border:1px solid var(--line)}
th,td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--line);font-size:14px;vertical-align:top}
th{font-family:var(--mono);font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:400;width:40%}
.cta{margin:26px 0}
.btn{display:inline-block;font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;padding:11px 16px;border:1px solid var(--line);color:var(--text)}
.btn:hover{border-color:var(--accent);color:var(--accent);text-decoration:none}
.btn.p{background:var(--accent);color:#0a0d10;border-color:var(--accent)}.btn.p:hover{color:#0a0d10}
.note{font-family:var(--mono);font-size:11px;color:var(--ink3);letter-spacing:.04em;line-height:1.7;border-top:1px solid var(--line);padding-top:16px;margin-top:30px}
.note a{color:var(--muted)}
@media(max-width:620px){h1{font-size:32px}}
.news-sec{margin:34px 0 10px;border-top:1px solid var(--line);padding-top:22px}
.sec-h{font-family:var(--display);font-size:13px;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);margin:0 0 14px;display:flex;align-items:center;gap:9px}
.sec-n{font-family:var(--mono);font-size:11px;color:var(--ink3);border:1px solid var(--line);padding:1px 6px}
.news-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
.news-card{display:flex;flex-direction:column;gap:6px;padding:12px;background:var(--panel);border:1px solid var(--line);color:var(--text)}
.news-card:hover{border-color:var(--accent);text-decoration:none}
.news-meta{font-family:var(--mono);font-size:9.5px;letter-spacing:.1em;color:var(--ink3);text-transform:uppercase}
.news-title{font-size:13.5px;line-height:1.45}
.news-card:hover .news-title{color:var(--accent)}
.news-more,.news-src{font-family:var(--mono);font-size:10px;letter-spacing:.06em;color:var(--ink3);margin-top:10px}

.hero-fig{margin:0 0 4px}
.img-credit{font-family:var(--mono);font-size:9.5px;letter-spacing:.06em;color:var(--ink3);margin-top:7px}
.img-credit a{color:var(--ink3);text-decoration:underline}

`;

function dFrameKind(frame) {
  const f = String(frame || "").toLowerCase();
  if (f.includes("vtol") || f.includes("tiltrotor") || f.includes("tailsitter") || f.includes("hybrid")) return "vtol";
  if (f.includes("quad")) return "quad";
  if (f.includes("hexa") || f.includes("octo") || f.includes("multirotor") || f.includes("helicopter") || f.includes("rotor")) return "hex";
  return "fixed";
}
function dSchematic(kind) {
  const s = 'stroke="currentColor" stroke-width="1.5" fill="none"';
  const grid = `<g opacity=".5">${[1,2,3,4,5,6,7].map(i=>`<line x1="${i*50}" y1="0" x2="${i*50}" y2="280" stroke="rgba(255,255,255,.05)"/>`).join("")}</g>`;
  const cross = `<g stroke="rgba(255,255,255,.18)" fill="none"><circle cx="200" cy="140" r="108" stroke-dasharray="2 4"/><line x1="50" y1="140" x2="350" y2="140"/></g>`;
  let body;
  if (kind === "quad") body = `<g ${s}><line x1="130" y1="80" x2="270" y2="200"/><line x1="270" y1="80" x2="130" y2="200"/><rect x="182" y="122" width="36" height="36" rx="3"/>${[[130,80],[270,80],[130,200],[270,200]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="22"/>`).join("")}</g>`;
  else if (kind === "hex") { const p=Array.from({length:6},(_,i)=>{const a=(i*60-90)*Math.PI/180;return [200+Math.cos(a)*88,140+Math.sin(a)*88];}); body=`<g ${s}>${p.map(([x,y])=>`<line x1="200" y1="140" x2="${x}" y2="${y}"/><circle cx="${x}" cy="${y}" r="17"/>`).join("")}</g>`; }
  else if (kind === "vtol") body = `<g ${s}><ellipse cx="200" cy="145" rx="80" ry="13"/><path d="M170 133 L100 92 L82 94 L165 138 Z"/><path d="M230 133 L300 92 L318 94 L235 138 Z"/><path d="M170 157 L100 198 L82 196 L165 152 Z"/><path d="M230 157 L300 198 L318 196 L235 152 Z"/>${[[100,92],[300,92],[100,198],[300,198]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="15"/>`).join("")}</g>`;
  else body = `<g ${s}><path d="M90 140 L285 140 L312 145 L285 150 L90 150 Q72 145 90 140 Z"/><path d="M170 122 L232 62 L260 62 L220 126 Z"/><path d="M170 168 L232 228 L260 228 L220 164 Z"/><path d="M285 145 L322 116 L332 118 L298 148 Z"/><path d="M285 145 L322 174 L332 172 L298 142 Z"/></g>`;
  return `<svg class="art-svg" viewBox="0 0 400 280" width="100%" height="100%">${grid}${cross}${body}</svg>`;
}
function dSensorKind(row) {
  const sub = String(row.Subtype || "").toLowerCase(), cat = String(row.Subcategory || "").toLowerCase();
  if (cat.includes("acoustic") || sub.includes("acoustic")) return "acoustic";
  if (cat.includes("rf") || sub.includes("rf")) return "rf";
  if (sub.includes("passive")) return "passive";
  if (cat.includes("eo") || sub.includes("optical") || sub.includes("eo")) return "eo";
  return "radar";
}
function dGlyph(kind) {
  const c = "currentColor", w = 'width="120" height="120"';
  if (kind === "acoustic") return `<svg ${w} viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.2"><circle cx="7.5" cy="12" r="2.2" fill="${c}"/><path d="M12 8 Q15 12 12 16"/><path d="M15.5 6 Q20 12 15.5 18"/></svg>`;
  if (kind === "rf") return `<svg ${w} viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.2"><line x1="4" y1="18.5" x2="20" y2="18.5"/><rect x="5.5" y="12" width="2.4" height="6.5" fill="${c}" stroke="none"/><rect x="10" y="8" width="2.4" height="10.5" fill="${c}" stroke="none"/><rect x="14.5" y="10.5" width="2.4" height="8" fill="${c}" stroke="none"/></svg>`;
  if (kind === "passive") return `<svg ${w} viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.2"><line x1="12" y1="20" x2="12" y2="9"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/></svg>`;
  if (kind === "eo") return `<svg ${w} viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.2"><path d="M2 12 Q12 4 22 12 Q12 20 2 12 Z"/><circle cx="12" cy="12" r="3"/></svg>`;
  return `<svg ${w} viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="${c}"/><line x1="12" y1="12" x2="20" y2="6.5"/></svg>`;
}

function productPage(bucket, row, news = [], credit = null) {
  const slug = row.slug;
  const name = row.Name || "Untitled";
  const company = row.Company || "";
  const country = asArray(row.Country).join(", ");
  const url = `${SITE}/${bucket}/${slug}/`;
  const desc = clip(row.Summary) || `${name}${company ? " by " + company : ""} — ${BUCKET_KICKER[bucket]} on the xSonomy catalogue.`;
  const imgRel = row.Image ? "/" + row.Image : null;
  const imgAbs = imgRel ? SITE + imgRel : null;
  const title = `${name}${company ? " — " + company : ""} · xSonomy`;
  const kicker = `${BUCKET_KICKER[bucket]}${row.Subtype ? " · " + row.Subtype : ""}`;
  const why = analystNote(row["Source URLs"]);

  const specPairs = Object.entries(row)
    .filter(([k, v]) => !HIDDEN.has(k) && v != null && v !== "")
    .map(([k, v]) => [specLabel(k), asArray(v).join(", ")]);
  if (row.Confidence) specPairs.push(["Confidence", row.Confidence]);
  const specRows = specPairs.map(([l, v]) => `<tr><th>${esc(l)}</th><td>${esc(v)}</td></tr>`).join("");

  const jsonld = {
    "@context": "https://schema.org", "@type": "Product", "name": name,
    ...(company ? { "brand": { "@type": "Organization", "name": company } } : {}),
    ...(imgAbs ? { "image": [imgAbs] } : {}),
    "description": desc, "category": BUCKET_KICKER[bucket], "url": url,
    "additionalProperty": specPairs.map(([l, v]) => ({ "@type": "PropertyValue", "name": l, "value": String(v) })),
  };

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="xSonomy">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}">${imgAbs ? `\n<meta property="og:image" content="${imgAbs}">` : ""}
<meta name="twitter:card" content="${imgAbs ? "summary_large_image" : "summary"}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Inter+Tight:wght@400;500&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>${PAGE_CSS}</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
${GA_TAG}</head><body>
<header class="hd"><div class="w"><a class="brand" href="/">xSonomy</a><a class="back" href="/">← Catalogue</a></div></header>
<div class="wrap">
<div class="kicker">${esc(kicker)}</div>
<h1>${esc(name)}</h1>
<div class="sub">${esc([company, country].filter(Boolean).join(" · "))}</div>
${row.Summary ? `<p class="lead">${esc(row.Summary)}</p>` : ""}
${why ? `<div class="why"><b>Why it matters</b>${esc(why)}</div>` : ""}
<table><tbody>${specRows}</tbody></table>
${row.Website ? `<div class="cta"><a class="btn p" href="${esc(row.Website)}" target="_blank" rel="noopener nofollow">Visit manufacturer ↗</a></div>` : ""}
${newsSection(news, row.Mentions || news.length)}
${imgRel
  ? `<figure class="hero-fig"><img class="hero" src="${imgRel}" alt="${esc(name)}" width="900">${imageCredit(credit)}</figure>`
  : `<div class="art">${bucket === "uav" ? dSchematic(dFrameKind(row["UAV · Frame type"])) : dGlyph(dSensorKind(row))}</div>`}
<div class="note">Review-stage catalogue data — specs corroborated from manufacturer and secondary sources; not for procurement decisions.${row.Website ? ` Source: <a href="${esc(row.Website)}" target="_blank" rel="noopener nofollow">${esc(String(row.Website).replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>` : ""}</div>
</div></body></html>`;
}

// ---- Supabase data layer ----
async function loadDotenv() {
  const p = join(ROOT, ".env");
  if (!existsSync(p)) return;
  for (const line of (await readFile(p, "utf8")).split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
function sbConfig() {
  const url = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (.env or CI secrets).");
  return { url, key };
}
// PostgREST enforces a server-side row ceiling (db-max-rows, 1000 on this
// project) that silently truncates any bigger request — a plain `limit=5000`
// comes back with 1000 rows and no error. Every read below therefore pages
// with offset until it gets a short page.
//
// `order` MUST end in a unique tiebreaker (id) or rows can repeat/vanish
// across page boundaries when the sort key has duplicates.
const PAGE = 1000;

async function sbFetchAll(path, params, label = path) {
  const { url, key } = sbConfig();
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  const out = [];
  for (let offset = 0; ; offset += PAGE) {
    const q = new URL(`${url}/rest/v1/${path}`);
    for (const [k, v] of Object.entries(params)) q.searchParams.set(k, v);
    q.searchParams.set("limit", String(PAGE));
    q.searchParams.set("offset", String(offset));
    const res = await fetch(q, { headers });
    if (!res.ok) throw new Error(`Supabase ${label} ${res.status}: ${await res.text()}`);
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

async function fetchProducts() {
  return sbFetchAll("products", {
    select: "id,name,subcategory,country,summary,website,image_url,price,status,status_detail,specs,confidence,source_urls,category,publication_status,companies!products_company_id_fkey(name)",
    order: "name.asc,id.asc",
    ...(PUBLISH_STATUS ? { publication_status: `eq.${PUBLISH_STATUS}` } : {}),
  }, "products");
}

// ---------- production status ----------
// `UAV · Production status` is free text — 155 distinct spellings across ~400 rows
// ("In production", "in service", "Discontinued/legacy", "Cancelled (2012)"…). Collapse
// it to six buckets for the filter. Longest/most specific prefixes are tried first, then
// a substring pass; anything unrecognised — and anything missing — becomes "N/A".
// "Cancelled" and the no-longer-current markers win wherever they appear, because a
// trailing qualifier negates the head of the phrase — "Consumer (legacy)" and
// "Produced (legacy)" are discontinued, not in production. Everything else is matched
// on the leading word first, so "Development/limited production" reads as Development
// while "In production / development" reads as In Production; a substring pass catches
// the rest.
const STATUS_OVERRIDE = [
  ["Cancelled",    ["cancel"]],
  ["Discontinued", ["discontinu", "out of production", "retired", "superseded", "predecessor model", "legacy"]],
];
const STATUS_BUCKETS = [
  ["In Production", ["in production", "in service", "production", "produced", "serial", "active", "operational",
                     "commercial", "consumer", "catalogue", "marketed", "available", "fielded", "in use",
                     "in operation", "mature", "export offering", "limited production"]],
  ["Prototype",     ["prototype", "demonstrator", "experimental", "research"]],
  ["Development",   ["development", "in development", "concept", "project", "testing", "test", "trials",
                     "flight", "announced", "export development", "limited", "tested"]],
];
// Matched only as a substring, never as a prefix, so "Developed / in use" stays In
// Production while a bare "Developed" lands in Development rather than N/A.
const STATUS_WEAK = [["Development", ["developed"]]];
// products.status now holds the normalised value, so prefer it and fall back to
// normalising the free text. Both paths are live until every row is migrated.
const PRODUCT_STATUS_LABEL = {
  in_production: "In Production", discontinued: "Discontinued", prototype: "Prototype",
  development: "Development", cancelled: "Cancelled", unknown: "N/A",
};
function normaliseStatus(raw) {
  const s = String(asArray(raw)[0] || "").trim().toLowerCase();
  if (!s) return "N/A";
  for (const [bucket, keys] of STATUS_OVERRIDE) for (const k of keys) if (s.includes(k)) return bucket;
  for (const [bucket, keys] of STATUS_BUCKETS) for (const k of keys) if (s.startsWith(k)) return bucket;
  for (const [bucket, keys] of STATUS_BUCKETS) for (const k of keys) if (s.includes(k)) return bucket;
  for (const [bucket, keys] of STATUS_WEAK) for (const k of keys) if (s.includes(k)) return bucket;
  return "N/A";
}

// ---------- taxonomy (product_taxonomy_view) ----------
// One row per (product, option). Keyed on product_id — NOT product_slug, because the
// slug written into the site is generated here from the product name (see slugify),
// not read from products.slug, so the two do not reliably match.
// Field names are built from the taxonomy's own facet names, so the sidebar labels and
// the product-page spec rows always match the source sheet without a mapping to keep in
// step. `weight_class` is deliberately NOT split: the NATO size classes and the civil
// regulatory marks (FAA / UK-EU) share one 11-option group, as they do in the sheet.
async function fetchTaxonomy() {
  const rows = await sbFetchAll("product_taxonomy_view", {
    select: "product_id,facet_name,option_name",
    order: "product_id.asc,facet_name.asc,option_name.asc",
  }, "taxonomy");
  const byProduct = new Map();
  for (const r of rows) {
    const field = r.facet_name ? `Taxonomy · ${r.facet_name}` : null;
    if (!field || !r.option_name) continue;
    let rec = byProduct.get(r.product_id);
    if (!rec) byProduct.set(r.product_id, (rec = {}));
    (rec[field] || (rec[field] = [])).push(r.option_name);
  }
  return byProduct;
}

// ---------- curated product images ----------
// `products.image_url` holds 8 expired Airtable signed URLs and nothing else, so images
// come from a manifest kept in this repo instead: Wikimedia Commons / Wikipedia pictures,
// each one matched on a strict name test and then checked by eye (the loose version put
// flowers on "Gerbera", a wasp on "Hornet" and ammunition on "Bullet"). Every entry is
// reusable and carries the attribution its licence requires. Curation lives here rather
// than in the database because this repo must not write to Supabase.
const IMAGE_MANIFEST = join(ROOT, "data", "product-images.json");
async function loadCuratedImages() {
  if (!existsSync(IMAGE_MANIFEST)) return {};
  try { return JSON.parse(await readFile(IMAGE_MANIFEST, "utf8")); }
  catch (e) { console.error(`product-images.json: ${e.message}`); return {}; }
}
function imageCredit(c) {
  if (!c) return "";
  const who = c.author ? esc(c.author) : "Unknown author";
  const lic = c.licence ? esc(c.licence) : "";
  const via = c.source
    ? `<a href="${esc(c.source)}" target="_blank" rel="noopener nofollow">Wikimedia Commons</a>`
    : "Wikimedia Commons";
  return `<figcaption class="img-credit">${who}${lic ? ` &middot; ${lic}` : ""} &middot; via ${via}</figcaption>`;
}

// ---------- news (articles <-> article_products) ----------
// The same articles that power the news site at uav360.xyz, which links straight out to
// the original publishers rather than hosting article pages of its own — so these cards
// do the same. Fetched as two paged reads and joined here instead of with a PostgREST
// embed, so it does not depend on the foreign key being exposed. `article_products` has
// no id column, but (article_id, product_id) is unique, which is the stable tiebreaker
// the paging needs.
const NEWS_ON_PAGE = 12;   // average product has 4.3 mentions; the busiest has ~200
async function fetchNews() {
  const [links, articles] = await Promise.all([
    sbFetchAll("article_products", { select: "product_id,article_id", order: "article_id.asc,product_id.asc" }, "article_products"),
    sbFetchAll("articles", { select: "id,title,url,source,published_at", order: "id.asc" }, "articles"),
  ]);
  const byId = new Map(articles.map((a) => [a.id, a]));
  const byProduct = new Map();
  for (const l of links) {
    const a = byId.get(l.article_id);
    if (!a || !a.url || !a.title) continue;
    let list = byProduct.get(l.product_id);
    if (!list) byProduct.set(l.product_id, (list = []));
    list.push(a);
  }
  // Newest first. 373 articles have no published_at; an empty string sorts last here,
  // so undated items settle at the bottom instead of jumping to the top.
  for (const list of byProduct.values()) {
    list.sort((x, y) => String(y.published_at || "").localeCompare(String(x.published_at || "")));
  }
  return byProduct;
}
function newsSection(items, total) {
  if (!items.length) return "";
  const cards = items.map((a) => {
    const when = a.published_at ? String(a.published_at).slice(0, 10) : "";
    const meta = [a.source, when].filter(Boolean).join(" · ");
    return `<a class="news-card" href="${esc(a.url)}" target="_blank" rel="noopener nofollow">`
      + `${meta ? `<span class="news-meta">${esc(meta)}</span>` : ""}`
      + `<span class="news-title">${esc(a.title)}</span></a>`;
  }).join("");
  const more = total > items.length
    ? `<div class="news-more">Showing the ${items.length} most recent of ${total} mentions.</div>` : "";
  return `<section class="news-sec">
<h2 class="sec-h">In the news <span class="sec-n">${total}</span></h2>
<div class="news-grid">${cards}</div>
${more}
<div class="news-src">From <a href="http://uav360.xyz/" target="_blank" rel="noopener">uav360.xyz</a>, the xSonomy news feed. Headlines link to the original publisher.</div>
</section>`;
}

function reshape(p) {
  const row = {};
  if (p.name) row.Name = p.name;
  if (p.companies && p.companies.name) row.Company = p.companies.name;
  if (p.country) row.Country = p.country;
  if (p.subcategory) row.Subcategory = p.subcategory;
  if (p.category) row.Category = p.category;   // filterable; HIDDEN keeps it off spec tables
  if (p.summary) row.Summary = p.summary;
  if (p.website) row.Website = p.website;
  if (p.price) row.Price = p.price;
  if (p.confidence) row.Confidence = p.confidence;
  if (Array.isArray(p.source_urls) && p.source_urls.length) row["Source URLs"] = p.source_urls.join("\n");
  if (p.specs && typeof p.specs === "object") Object.assign(row, p.specs);
  // Production status used to live in specs under this key and is being moved to
  // its own column. Feed it back under the same label so the spec table on the
  // detail pages reads the same either way.
  if (p.status_detail) row["UAV · Production status"] = p.status_detail;
  row.__image_url = p.image_url || null;
  return row;
}
async function attachImage(row) {
  const url = row.__image_url; delete row.__image_url;
  if (!url) return;
  try {
    // Wikimedia asks for an identifying User-Agent and refuses some anonymous clients;
    // without it the build would quietly fall back to schematics. It also throttles a
    // burst of 140 downloads, which silently cost ~6 images per build before the retry
    // and the pause between downloads were added.
    const headers = { "User-Agent": "xSonomy-catalogue/1.0 (https://xsonomy.com)" };
    let res = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        res = await fetch(url, { headers });
        if (res.ok) break;
        if (res.status !== 429 && res.status < 500) { console.error(`image ${row.slug}: HTTP ${res.status}`); return; }
      } catch (e) { if (attempt === 3) throw e; }
      await new Promise((r) => setTimeout(r, attempt * 1500));
      res = null;
    }
    if (!res || !res.ok) { console.error(`image ${row.slug}: gave up after 3 attempts`); return; }
    const buf = Buffer.from(await res.arrayBuffer());
    await new Promise((r) => setTimeout(r, 120));   // stay polite across 140 downloads
    const ext = (extname(new URL(url).pathname).slice(1) || "jpg").toLowerCase().replace("jpeg", "jpg");
    const rel = `images/${row.slug}.${ext}`;
    await mkdir(join(OUT, "images"), { recursive: true });
    await writeFile(join(OUT, rel), buf);
    row.Image = rel;
  } catch (e) { console.error(`image ${row.slug}: ${e.message}`); }
}

// ---- Companies catalogue ----
async function fetchCompanies() {
  return sbFetchAll("companies", {
    select:
      "id,name,slug,legal_name,description,overview,history,company_type,ownership,status,founded_year,defunct_year," +
      "hq_country,hq_city,website,linkedin_url,wikipedia_url,twitter_url,employee_range,employee_count," +
      "revenue_amount,revenue_currency,revenue_year,total_funding,funding_currency,valuation,valuation_currency," +
      "is_public,stock_ticker,stock_exchange,nato_cage_code,is_sanctioned,source_urls,publication_status",
    order: "name.asc,id.asc",
    ...(PUBLISH_STATUS ? { publication_status: `eq.${PUBLISH_STATUS}` } : {}),
  }, "companies");
}

// ---- C-UAS capability sectors ----
// A counter-UAS company is classified by the most specific capability it can
// evidence -- `cuas-det-radar`, not `cuas-detection`. The broader groupings above
// it are worked out here rather than read from the database, so a radar company
// shows both "Radar" and "Detection" without a second stored row saying so.
// Storing both is how a parent row came to be counted as a capability, which
// produced a published figure that was an order of magnitude wrong.
//
// Nesting comes from `parent_id`, never from the slug: the leaf `cuas-integrated`
// hangs directly off the root while `cuas-detection` is a parent, so no prefix
// rule gets both right.
const CUAS_ROOT = "counter-uas";
const CUAS_LABEL = {
  "cuas-integrated": "Integrated",
  "cuas-detection": "Detection",
  "cuas-mitigation": "Mitigation",
  "cuas-tracking": "Tracking",
  "cuas-c2": "Command & Control",
};

// -> Map(company_id -> ["Radar", "Detection", …]). The root domain is not a chip:
// it would read "Counter-UAS" on every row of the counter-UAS page.
async function fetchCuasCapabilities() {
  const all = await sbFetchAll("sectors", { select: "id,slug,name,parent_id", order: "slug.asc" }, "sectors");
  const root = all.find((s) => s.slug === CUAS_ROOT);
  if (!root) throw new Error(`No "${CUAS_ROOT}" sector found in Supabase.`);
  const byId = new Map(all.map((s) => [s.id, s]));

  const under = (s) => {
    const seen = new Set();
    for (let cur = s.parent_id; cur && !seen.has(cur); cur = byId.get(cur)?.parent_id) {
      if (cur === root.id) return true;
      seen.add(cur);
    }
    return false;
  };
  const inScope = all.filter(under);
  if (!inScope.length) throw new Error(`No sectors found under "${CUAS_ROOT}" in Supabase.`);

  // A sector's own label plus every label above it, stopping below the root.
  const labelsFor = (s) => {
    const out = [];
    const seen = new Set();
    for (let cur = s; cur && cur.id !== root.id && !seen.has(cur.id); cur = byId.get(cur.parent_id)) {
      seen.add(cur.id);
      out.push(CUAS_LABEL[cur.slug] || cur.name);
    }
    return out;
  };

  const byCompany = new Map();
  for (const s of inScope) {
    const links = await sbFetchAll("company_sectors", {
      select: "company_id",
      sector_id: `eq.${s.id}`,
      order: "company_id.asc",
    }, `company_sectors(${s.slug})`);
    for (const { company_id } of links) {
      const arr = byCompany.get(company_id) || [];
      for (const label of labelsFor(s)) if (!arr.includes(label)) arr.push(label);
      byCompany.set(company_id, arr);
    }
  }
  return byCompany;
}

// ALL products (every category) with maker id — used to list a company's
// products on its detail page. Light: three columns only.
async function fetchCompanyProducts() {
  return sbFetchAll("products", {
    select: "id,name,category,company_id",
    order: "name.asc,id.asc",
    ...(PUBLISH_STATUS ? { publication_status: `eq.${PUBLISH_STATUS}` } : {}),
  }, "products(light)");
}

const TYPE_LABEL = { prime: "Prime", tier1: "Tier 1", tier2: "Tier 2", sme: "SME",
  startup: "Startup", state_owned: "State-owned", research_institute: "Research institute",
  university: "University", jv: "Joint venture", division: "Division", distributor: "Distributor", other: "Other" };
const fmtType = (t) => t ? (TYPE_LABEL[t] || t) : "";
// type accent palette (from the registry template)
const TYPE_COLOR = { prime: "#5fd0e0", tier1: "#8fd94a", tier2: "#8fd94a", sme: "#5fd0e0",
  startup: "#c95fff", state_owned: "#ffc24d", research_institute: "#9aa6ad", university: "#9aa6ad",
  jv: "#ff7a4f", division: "#6b7780", distributor: "#ffc24d", other: "#6b7780" };

// --- registry row helpers ---
let MAXREV = 1, MAXVAL = 1; // set in main() to scale the bars
const initials = (name) => (String(name || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "—");
function moneyShort(amount, currency) {
  if (amount == null || amount === "") return "";
  const n = Number(amount); if (!isFinite(n)) return "";
  const sym = ({ USD: "$", EUR: "€", GBP: "£", JPY: "¥" }[currency]) || (currency ? currency + " " : "$");
  if (n >= 1e9) return sym + (n / 1e9).toFixed(n >= 1e10 ? 0 : 2).replace(/\.?0+$/, "") + "B";
  if (n >= 1e6) return sym + Math.round(n / 1e6) + "M";
  if (n >= 1e3) return sym + Math.round(n / 1e3) + "K";
  return sym + n;
}
const EMP_SHORT = { "1-10": "1–10", "11-50": "11–50", "51-200": "51–200", "201-500": "201–500",
  "501-1000": "501–1K", "1001-5000": "1K–5K", "5001-10000": "5K–10K", "10000+": "10K+" };
const empShort = (r) => (r ? (EMP_SHORT[r] || r) : "");
function countryMeta(name) {
  const M = {
    "United States":["US","NORTH AM"],"USA":["US","NORTH AM"],"Canada":["CA","NORTH AM"],
    "United Kingdom":["GB","EUROPE"],"France":["FR","EUROPE"],"Germany":["DE","EUROPE"],"Germany/USA":["DE","EUROPE"],
    "Italy":["IT","EUROPE"],"Spain":["ES","EUROPE"],"Netherlands":["NL","EUROPE"],"Sweden":["SE","EUROPE"],
    "Norway":["NO","EUROPE"],"Finland":["FI","EUROPE"],"Denmark":["DK","EUROPE"],"Poland":["PL","EUROPE"],
    "Czech Republic":["CZ","EUROPE"],"Czechia":["CZ","EUROPE"],"Estonia":["EE","EUROPE"],"Latvia":["LV","EUROPE"],
    "Lithuania":["LT","EUROPE"],"Bulgaria":["BG","EUROPE"],"Romania":["RO","EUROPE"],"Switzerland":["CH","EUROPE"],
    "Austria":["AT","EUROPE"],"Belgium":["BE","EUROPE"],"Slovenia":["SI","EUROPE"],"Ukraine":["UA","EUROPE"],"Turkey":["TR","EUROPE"],
    "Israel":["IL","MIDEAST"],"United Arab Emirates":["AE","MIDEAST"],"Iran":["IR","MIDEAST"],
    "China":["CN","APAC"],"Japan":["JP","APAC"],"South Korea":["KR","APAC"],"Singapore":["SG","APAC"],
    "India":["IN","APAC"],"Australia":["AU","APAC"],"Pakistan":["PK","APAC"],
    "Russia":["RU","EURASIA"],"Belarus":["BY","EURASIA"],"South Africa":["ZA","AFRICA"],
  };
  const e = M[name]; if (!e) return { flag: "", region: "" };
  const flag = String.fromCodePoint(...[...e[0]].map((ch) => 0x1F1E6 + ch.charCodeAt(0) - 65));
  return { flag, region: e[1] };
}
function bar(value, max, cls, color) {
  const v = Number(value); if (!value || !isFinite(v) || max <= 0) return "";
  const pct = Math.max(4, Math.min(100, Math.round((v / max) * 100)));
  const style = color ? `background:${color};width:${pct}%` : `width:${pct}%`;
  return `<div class="bartrack"><div class="bar ${cls}" style="${style}"></div></div>`;
}
function money(amount, currency, year) {
  if (amount == null || amount === "") return "";
  const n = Number(amount); if (!isFinite(n)) return "";
  const sym = ({ USD: "$", EUR: "€", GBP: "£", JPY: "¥" }[currency]) || (currency ? currency + " " : "$");
  let s;
  if (n >= 1e9) s = (n / 1e9).toFixed(n >= 1e10 ? 0 : 1) + "B";
  else if (n >= 1e6) s = (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + "M";
  else if (n >= 1e3) s = Math.round(n / 1e3) + "K";
  else s = String(n);
  return sym + s + (year ? ` <span class="yr">'${String(year).slice(-2)}</span>` : "");
}

const COMPANIES_CSS = `
:root{--bg:#0a0d10;--panel:#0f1418;--panel2:#141a1f;--panel3:#1a2128;--line:rgba(255,255,255,.09);--text:#e7ecef;--muted:#6b7780;--ink3:#56636d;--accent:#5fd0e0;--red:#ff6a5f;--display:"Chakra Petch",sans-serif;--sans:"Inter Tight",system-ui,sans-serif;--mono:"Share Tech Mono",ui-monospace,monospace}
*{box-sizing:border-box}html,body{margin:0;background:var(--bg)}
body{color:var(--text);font-family:var(--sans);font-size:15px;line-height:1.55;-webkit-font-smoothing:antialiased}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
::-webkit-scrollbar{width:10px;height:10px}::-webkit-scrollbar-track{background:#0a0d10}::-webkit-scrollbar-thumb{background:#1f2932;border:2px solid #0a0d10}::-webkit-scrollbar-thumb:hover{background:#2c3a45}
.hd{border-bottom:1px solid var(--line);background:linear-gradient(180deg,var(--panel),var(--bg))}
.hd .w{max-width:1180px;margin:0 auto;padding:0 22px;height:62px;display:flex;align-items:center;gap:22px}
.hd .brand{font-family:var(--display);font-weight:700;font-size:20px;letter-spacing:.18em;color:var(--text)}
.hd .brand b{color:var(--accent);font-weight:700}
.hd nav{display:flex;gap:20px;margin-left:auto}
.hd nav a{font-family:var(--mono);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
.hd nav a:hover{color:var(--text);text-decoration:none}
.hd nav a.on{color:var(--accent)}
.wrap{max-width:1180px;margin:0 auto;padding:26px 22px 84px}
.kicker{font-family:var(--mono);font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--ink3);margin-bottom:10px}
h1{font-family:var(--display);font-weight:600;font-size:30px;letter-spacing:.07em;text-transform:uppercase;margin:0 0 6px}
.count{font-family:var(--mono);font-size:11px;letter-spacing:.12em;color:var(--muted);margin-bottom:22px;text-transform:uppercase}
.tablewrap{border:1px solid var(--line);overflow-x:auto}
table{width:100%;border-collapse:collapse;min-width:880px}
thead th{font-family:var(--mono);font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);font-weight:400;text-align:left;padding:12px 14px;border-bottom:1px solid var(--line);background:var(--panel)}
tbody td{padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.06);font-size:14px;vertical-align:middle}
tbody tr:hover{background:var(--panel2)}
.co{font-family:var(--display);font-weight:500;font-size:15px;letter-spacing:.02em}
.co a{color:var(--text)}.co a:hover{color:var(--accent)}
.badge{display:inline-block;font-family:var(--mono);font-size:9px;letter-spacing:.12em;text-transform:uppercase;padding:2px 7px;border:1px solid currentColor;border-radius:2px}
.flag{display:inline-block;font-family:var(--mono);font-size:9px;letter-spacing:.1em;color:var(--red);border:1px solid var(--red);padding:1px 6px;margin-left:7px;border-radius:2px;text-transform:uppercase}
.num{font-family:var(--mono);font-variant-numeric:tabular-nums;white-space:nowrap;color:#cfd8de}
.yr{color:var(--ink3)}
.lnk{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-right:12px}
.lnk:hover{color:var(--accent);text-decoration:none}
.mut{color:var(--ink3)}
.pager{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:26px;font-family:var(--mono);font-size:12px}
.pager a,.pager span{padding:7px 12px;border:1px solid var(--line);color:var(--muted)}
.pager a:hover{border-color:var(--accent);color:var(--accent);text-decoration:none}
.pager .cur{background:var(--accent);color:#0a0d10;border-color:var(--accent)}
.pager .dis{opacity:.3}
.corow{display:flex;align-items:center;gap:14px}
.mono-sq{position:relative;display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;flex:0 0 auto;border:1px solid var(--c);color:var(--c);background:#0e141a;font-family:var(--display);font-weight:600;font-size:15px;letter-spacing:.06em}
.mono-sq .br{position:absolute;top:3px;left:3px;width:8px;height:8px;border-top:1px solid var(--c);border-left:1px solid var(--c)}
.cn{font-family:var(--display);font-weight:600;font-size:16px;letter-spacing:.04em;text-transform:uppercase;line-height:1.1}
.cn a{color:var(--text)}.cn a:hover{color:var(--accent)}
.cc{font-family:var(--mono);font-size:11px;letter-spacing:.06em;color:var(--muted);margin-top:4px}
.cc .fl{margin-right:6px}
.emp .v{font-family:var(--display);font-weight:500;font-size:17px}
.emp .l{font-family:var(--mono);font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink3);margin-top:3px}
.money .v{font-family:var(--display);font-weight:600;font-size:18px;letter-spacing:.02em}
.money .fy{font-family:var(--mono);font-size:9px;letter-spacing:.14em;color:var(--ink3);margin-left:7px}
.bartrack{height:3px;background:rgba(255,255,255,.07);width:170px;max-width:100%;margin-top:9px}
.bar{height:3px}
.bar.rev{background:repeating-linear-gradient(90deg,var(--accent) 0 6px,transparent 6px 9px)}
@media(max-width:620px){h1{font-size:24px}}
`;

function companyRow(c) {
  const dash = '<span class="mut">—</span>';
  const tcol = TYPE_COLOR[c.company_type] || "#9aa6ad";
  const nm = esc(c.name);
  // The name links to our own detail page; the manufacturer's site sits beside it as a
  // separate link. Pointing the name off-site left the detail pages with nothing linking
  // to them from these listings.
  const nameInner = (c.slug ? `<a href="/companies/${esc(c.slug)}/">${nm}</a>` : nm) +
    (c.website ? ` <a class="ext" href="${esc(c.website)}" target="_blank" rel="noopener" title="Company website" aria-label="${nm} website">&#8599;</a>` : "");
  const { flag, region } = countryMeta(c.hq_country);
  const countryLine = c.hq_country
    ? `<div class="cc">${flag ? `<span class="fl">${flag}</span>` : ""}${esc(c.hq_country)}${region ? ` · ${region}` : ""}</div>`
    : "";
  const typeCell = c.company_type
    ? `<span class="badge" style="color:${tcol}">${esc(fmtType(c.company_type))}</span>` : dash;
  const emp = empShort(c.employee_range);
  const rev = moneyShort(c.revenue_amount, c.revenue_currency);
  const val = moneyShort(c.valuation, c.valuation_currency);
  const fy = c.revenue_year ? `<span class="fy">FY${String(c.revenue_year).slice(-2)}</span>` : "";
  return `<tr>
    <td class="co"><div class="corow">
      <span class="mono-sq" style="--c:${tcol}"><i class="br"></i>${initials(c.name)}</span>
      <div><div class="cn">${nameInner}${c.is_sanctioned ? ' <span class="flag">Sanctioned</span>' : ""}</div>${countryLine}</div>
    </div></td>
    <td>${typeCell}</td>
    <td class="emp">${emp ? `<div class="v">${esc(emp)}</div><div class="l">Employees</div>` : dash}</td>
    <td class="money">${rev ? `<div class="v">${rev}${fy}</div>${bar(c.revenue_amount, MAXREV, "rev")}` : dash}</td>
    <td class="money">${val ? `<div class="v" style="color:${tcol}">${val}</div>${bar(c.valuation, MAXVAL, "val", tcol)}` : dash}</td>
  </tr>`;
}


function companyRegistryPage(rows, page, totalPages, total) {
  const canonical = page === 1 ? `${SITE}/companies/` : `${SITE}/companies/${page}/`;
  const from = (page - 1) * 100 + 1, to = (page - 1) * 100 + rows.length;
  const title = `Companies${page > 1 ? ` — page ${page} of ${totalPages}` : ""} · xSonomy`;
  const nav = siteNav("companies");
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="Directory of UAV and counter-UAS companies — type, HQ country, headcount, revenue and funding. ${total} companies in the xSonomy registry.">
<link rel="canonical" href="${canonical}">
${page > 1 ? `<link rel="prev" href="${page === 2 ? `${SITE}/companies/` : `${SITE}/companies/${page - 1}/`}">` : ""}
${page < totalPages ? `<link rel="next" href="${SITE}/companies/${page + 1}/">` : ""}
<meta property="og:type" content="website"><meta property="og:site_name" content="xSonomy">
<meta property="og:title" content="${esc(title)}"><meta property="og:url" content="${canonical}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Inter+Tight:wght@400;500&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>${COMPANIES_CSS}${LIST_CSS}</style>
${GA_TAG}</head><body>
<header class="hd"><div class="w"><a class="brand" href="/">x<b>Sonomy</b></a>${nav}</div></header>
<div class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span>/</span> ${page === 1 ? "Companies" : `<a href="/companies/">Companies</a> <span>/</span> page ${page}`}</nav>
<div class="kicker">// Company Registry</div>
<h1>Companies${page > 1 ? ` — page ${page}` : ""}</h1>
<div class="count">Showing ${num(from)}–${num(to)} of ${num(total)} · page ${page} of ${totalPages}</div>
<div class="tablewrap"><table>
<thead><tr><th>Company</th><th>Type</th><th>Employees</th><th>Revenue</th><th>Valuation</th></tr></thead>
<tbody>${rows.map(companyRow).join("")}</tbody>
</table></div>
${listPager("/companies/", page, totalPages)}
<p class="backlink"><a href="/companies/">Search and filter all ${num(total)} companies &rarr;</a></p>
</div></body></html>`;
}


// ---------- P0: static discovery ----------
// The section hubs are a JavaScript app, so until it boots their HTML carries no heading,
// no entries and two links. Crawlers can run JS, but discovery should not depend on it —
// so every hub now ships a heading, an honest intro, a first page of real anchors and
// links to further pages. The app replaces the entries on boot; the heading stays.
const LIST_PAGE_SIZE = 48;
const num = (n) => Number(n).toLocaleString("en");

// Per-section copy. Also fixes the six hubs previously sharing one meta description.
const SECTION_COPY = {
  uav: {
    h1: "UAV catalogue",
    lede: "Uncrewed aircraft indexed from manufacturer material and defence press, with specifications, classification and linked coverage.",
    desc: (n) => `${n} uncrewed aircraft with specifications, weight class, propulsion, range and linked news. Filter by airframe, mission, origin and more.`,
  },
  cuas: {
    h1: "Counter-UAS systems and effectors",
    lede: "Counter-drone systems and the effectors they use — detection and command-and-control alongside guns, lasers, interceptors and missiles.",
    desc: (n) => `${n} counter-UAS systems and effectors, from detection and C2 to interceptors, lasers and guns, with manufacturers and linked news.`,
  },
  sensors: {
    h1: "Sensors catalogue",
    lede: "Radar, RF, electro-optical, acoustic and other sensing products used for detection, surveillance and navigation.",
    desc: (n) => `${n} radar, RF, EO/IR, LiDAR and acoustic sensing products, with detection ranges, modality and manufacturers.`,
  },
  software: {
    h1: "Software and autonomy",
    lede: "Command-and-control, airspace management, autonomy stacks and analytics software for uncrewed systems.",
    desc: (n) => `${n} software products for uncrewed systems — command and control, airspace management, autonomy and analytics.`,
  },
  other: {
    h1: "Components and other equipment",
    lede: "Payloads, powertrains, datalinks, Remote ID hardware and other equipment that does not sit in the categories above.",
    desc: (n) => `${n} components and related equipment — payloads, powertrains, datalinks and Remote ID hardware.`,
  },
};

// The homepage used to serve exactly the UAV hub's markup under a second URL. It now
// introduces the catalogue and routes to each section, so the two pages are not
// competing copies of one list.
const HOME_DESC = "Catalogue of uncrewed aircraft, counter-UAS systems, sensors and software — specifications, manufacturers, classification and linked news coverage.";

function homeIntro() {
  return `<h1>UAV and counter-UAS catalogue</h1>
<p class="lede">An open reference for uncrewed systems and the equipment built to counter them: specifications,
manufacturers, classification and the news coverage behind each record. Pick a section below, or search and
filter from here.</p>`;
}

function homeIndex(buckets, companyCount, cuasVendorCount, researchCount) {
  const card = (href, label, count, unit, blurb) =>
    `<li><a href="${href}">${esc(label)}</a><span class="m">${num(count)} ${unit}</span><p>${esc(blurb)}</p></li>`;
  const sections = Object.keys(CATEGORIES)
    .map((k) => card(`/${k}/`, SECTION_COPY[k].h1, buckets[k].length, "records", SECTION_COPY[k].lede))
    .join("");
  const registries =
    card("/companies/", "Companies", companyCount, "companies",
      "Manufacturers and suppliers with type, HQ country, headcount, revenue and funding.") +
    card("/cuas-systems/", "C-UAS vendors", cuasVendorCount, "vendors",
      "The subset of companies supplying counter-UAS capability, grouped by what they actually supply.") +
    card("/research/", "Research & academia", researchCount, "organisations",
      "Universities, national laboratories and research institutes working on uncrewed systems — counted apart from the suppliers.");

  // "Most covered" is drawn from the linked news, so it is a real signal rather than a
  // hand-picked list — and it gives crawlers a route into the deepest records.
  const covered = Object.entries(buckets)
    .flatMap(([k, rows]) => rows.filter((r) => r.Mentions).map((r) => ({ k, r })))
    .sort((a, b) => b.r.Mentions - a.r.Mentions ||
      String(a.r.Name || "").localeCompare(String(b.r.Name || ""), "en"))
    .slice(0, 24);

  return `<div class="static-index home">
<h2>Browse by section</h2>
<ul>${sections}${registries}</ul>
${covered.length ? `<h2>Most covered in the news</h2>
<ul>${covered.map(({ k, r }) =>
  `<li><a href="/${k}/${esc(r.slug)}/">${esc(r.Name || "Untitled")}</a>` +
  `<span class="m">${esc(asArray(r.Company)[0] || CATEGORIES[k].label)} · ${r.Mentions} ${r.Mentions === 1 ? "article" : "articles"}</span></li>`).join("")}</ul>` : ""}
</div>`;
}

// Pagination links for any section. Page 1 is the hub itself, so it stays the canonical
// entry point and deeper pages are real URLs rather than a filter state.
function listPager(base, page, totalPages) {
  if (totalPages < 2) return "";
  const href = (p) => (p === 1 ? base : `${base}${p}/`);
  const out = [];
  out.push(page > 1 ? `<a href="${href(page - 1)}" rel="prev">&larr; Prev</a>` : `<span class="dis">&larr; Prev</span>`);
  const near = (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2;
  let gap = false;
  for (let p = 1; p <= totalPages; p++) {
    if (!near(p)) { if (!gap) { out.push(`<span class="dis">…</span>`); gap = true; } continue; }
    gap = false;
    out.push(p === page ? `<span class="cur">${p}</span>` : `<a href="${href(p)}">${p}</a>`);
  }
  out.push(page < totalPages ? `<a href="${href(page + 1)}" rel="next">Next &rarr;</a>` : `<span class="dis">Next &rarr;</span>`);
  return `<nav class="pager" aria-label="Pagination">${out.join("")}</nav>`;
}

// One entry: a real anchor to the canonical detail URL plus enough context to be worth
// reading on its own. Summary is included only when the record actually has one.
function listEntry(bucket, row) {
  const meta = [asArray(row.Company)[0], asArray(row.Country)[0]].filter(Boolean).join(" · ");
  const sum = clip(row.Summary, 150);
  return `<li><a href="/${bucket}/${esc(row.slug)}/">${esc(row.Name || "Untitled")}</a>` +
    `${meta ? `<span class="m">${esc(meta)}</span>` : ""}` +
    `${sum ? `<p>${esc(sum)}</p>` : ""}</li>`;
}

function listBlock(bucket, rows, page, totalPages, total) {
  const from = (page - 1) * LIST_PAGE_SIZE + 1, to = from + rows.length - 1;
  return `<div class="static-index">
<p class="count">Showing ${num(from)}&ndash;${num(to)} of ${num(total)}${totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}</p>
<ul>${rows.map((r) => listEntry(bucket, r)).join("")}</ul>
${listPager(`/${bucket}/`, page, totalPages)}
</div>`;
}

// Pages 2+ are plain static pages rather than the app: they exist so every record is
// reachable by following links, and a crawler gets distinct content per URL. Each one
// self-canonicals — deliberately NOT canonicalised to page 1, and not noindexed.
function listingPage(bucket, rows, page, totalPages, total) {
  const copy = SECTION_COPY[bucket];
  const canonical = `${SITE}/${bucket}/${page}/`;
  const label = CATEGORIES[bucket].label;
  const title = `${copy.h1} — page ${page} of ${totalPages} · xSonomy`;
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(copy.desc(num(total)))} Page ${page} of ${totalPages}.">
<link rel="canonical" href="${canonical}">
${page > 1 ? `<link rel="prev" href="${page === 2 ? `${SITE}/${bucket}/` : `${SITE}/${bucket}/${page - 1}/`}">` : ""}
${page < totalPages ? `<link rel="next" href="${SITE}/${bucket}/${page + 1}/">` : ""}
<meta property="og:type" content="website"><meta property="og:site_name" content="xSonomy">
<meta property="og:title" content="${esc(title)}"><meta property="og:url" content="${canonical}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Inter+Tight:wght@400;500&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>${COMPANIES_CSS}${LIST_CSS}</style>
${GA_TAG}</head><body>
<header class="hd"><div class="w"><a class="brand" href="/">x<b>Sonomy</b></a>${siteNav(bucket)}</div></header>
<div class="wrap">
<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span>/</span> <a href="/${bucket}/">${esc(label)}</a> <span>/</span> page ${page}</nav>
<h1>${esc(copy.h1)}</h1>
<p class="lede">${esc(copy.lede)}</p>
${listBlock(bucket, rows, page, totalPages, total)}
<p class="backlink"><a href="/${bucket}/">Search and filter all ${num(total)} records &rarr;</a></p>
</div></body></html>`;
}

// Shared header navigation. Previously each template hand-rolled its own and they drifted
// apart — the company registry still listed only UAVs and Sensors.
function siteNav(active) {
  const items = Object.entries(CATEGORIES).map(([k, c]) =>
    `<a${k === active ? ' class="on"' : ""} href="/${k}/">${esc(c.label)}</a>`).join("");
  return `<nav>${items}<a${active === "cuas-systems" ? ' class="on"' : ""} href="/cuas-systems/">C-UAS Vendors</a>` +
    `<a${active === "companies" ? ' class="on"' : ""} href="/companies/">Companies</a>` +
    `<a${active === "research" ? ' class="on"' : ""} href="/research/">Research</a>` +
    `<a href="http://uav360.xyz/" target="_blank" rel="noopener">News</a></nav>`;
}

const LIST_CSS = `
.crumbs{font-family:var(--mono,monospace);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:#6b7680;margin-bottom:14px}
.crumbs a{color:#8b96a0}.crumbs span{opacity:.5;margin:0 4px}
.lede{max-width:70ch;color:#9aa6b1;margin:0 0 18px}
.static-index ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.static-index li{border:1px solid rgba(255,255,255,.1);padding:12px;background:#0f1418}
.static-index li a{font-family:var(--display,sans-serif);font-size:14px;letter-spacing:.02em}
.static-index li .m{display:block;font-family:var(--mono,monospace);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#6b7680;margin-top:4px}
.static-index li p{margin:7px 0 0;font-size:12.5px;line-height:1.5;color:#9aa6b1}
.backlink{margin-top:22px;font-size:13px}
`;

// ---- Per-company detail page ----
const CO_PAGE_EXTRA_CSS = `
.co-head{display:flex;align-items:flex-start;gap:18px;margin:10px 0 6px}
.mono-sq{position:relative;display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;flex:0 0 auto;border:1px solid var(--c);color:var(--c);background:#0e141a;font-family:var(--display);font-weight:600;font-size:22px;letter-spacing:.06em}
.mono-sq .br{position:absolute;top:4px;left:4px;width:10px;height:10px;border-top:1px solid var(--c);border-left:1px solid var(--c)}
.badge{display:inline-block;font-family:var(--mono);font-size:9px;letter-spacing:.12em;text-transform:uppercase;padding:2px 7px;border:1px solid currentColor;border-radius:2px;vertical-align:middle}
.flagb{display:inline-block;font-family:var(--mono);font-size:10px;letter-spacing:.1em;color:#ff6a5f;border:1px solid #ff6a5f;padding:2px 8px;margin-left:10px;border-radius:2px;text-transform:uppercase;vertical-align:middle}
.statusb{display:inline-block;font-family:var(--mono);font-size:10px;letter-spacing:.1em;color:#ffc24d;border:1px solid #ffc24d;padding:2px 8px;margin-left:10px;border-radius:2px;text-transform:uppercase;vertical-align:middle}
.sect{font-family:var(--mono);font-size:10px;letter-spacing:.25em;text-transform:uppercase;color:var(--accent);margin:30px 0 12px}
.prose p{margin:0 0 14px;color:#c4cad4}
.prods{display:flex;flex-wrap:wrap;gap:8px}
.prods a,.prods span{font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;border:1px solid var(--line);padding:6px 10px;color:var(--text)}
.prods a:hover{border-color:var(--accent);color:var(--accent);text-decoration:none}
.prods .pc{color:var(--ink3);margin-left:6px;font-size:9px}
`;

const OWN_LABEL = { private:"Private", public:"Public", state_owned:"State-owned", subsidiary:"Subsidiary",
  joint_venture:"Joint venture", academic:"Academic", nonprofit:"Non-profit", unknown:"Unknown" };
const STATUS_LABEL = { acquired:"Acquired", defunct:"Defunct", dormant:"Dormant", unknown:"Status unknown" };
const paras = (s) => String(s || "").split(/\n{2,}|\r\n\r\n/).map((p) => p.trim()).filter(Boolean)
  .map((p) => `<p>${esc(p)}</p>`).join("");

function companyPage(c, prods) {
  const url = `${SITE}/companies/${c.slug}/`;
  const tcol = TYPE_COLOR[c.company_type] || "#9aa6ad";
  const { flag, region } = countryMeta(c.hq_country);
  const title = `${c.name} · xSonomy`;
  const metaDesc = clip(c.description) ||
    `${c.name} — company profile in the xSonomy defence-tech registry: type, HQ, financials and products.`;
  const hq = [c.hq_city, c.hq_country].filter(Boolean).join(", ");
  const emp = empShort(c.employee_range) || (c.employee_count ? String(c.employee_count) : "");
  const rev = moneyShort(c.revenue_amount, c.revenue_currency);
  const val = moneyShort(c.valuation, c.valuation_currency);
  const fund = moneyShort(c.total_funding, c.funding_currency);
  const founded = [c.founded_year, c.defunct_year ? `– ${c.defunct_year}` : ""].filter(Boolean).join(" ");
  const listed = c.stock_ticker ? `${esc(c.stock_ticker)}${c.stock_exchange ? " · " + esc(c.stock_exchange) : ""}` : "";
  const statusB = STATUS_LABEL[c.status] ? `<span class="statusb">${STATUS_LABEL[c.status]}</span>` : "";

  const facts = [
    ["Type", c.company_type ? `<span class="badge" style="color:${tcol}">${esc(TYPE_LABEL[c.company_type] || c.company_type)}</span>` : ""],
    ["Ownership", esc(OWN_LABEL[c.ownership] || "")],
    ["Legal name", c.legal_name && c.legal_name !== c.name ? esc(c.legal_name) : ""],
    ["Founded", esc(founded)],
    ["Headquarters", hq ? `${flag ? flag + " " : ""}${esc(hq)}` : ""],
    ["Region", esc(region || "")],
    ["Employees", esc(emp)],
    ["Revenue", rev ? `${rev}${c.revenue_year ? ` <span style="color:var(--ink3)">FY${String(c.revenue_year).slice(-2)}</span>` : ""}` : ""],
    ["Valuation", val],
    ["Total funding", fund],
    ["Listed", listed],
    ["NATO CAGE", esc(c.nato_cage_code || "")],
  ].filter(([, v]) => v);
  const factRows = facts.map(([l, v]) => `<tr><th>${esc(l)}</th><td>${v}</td></tr>`).join("");

  const prodChips = (prods || []).map((p) =>
    p.url
      ? `<a href="${p.url}">${esc(p.name)}<span class="pc">${esc(p.category)}</span></a>`
      : `<span>${esc(p.name)}<span class="pc">${esc(p.category)}</span></span>`).join("");

  const ctas = [
    c.website ? `<a class="btn p" href="${esc(c.website)}" target="_blank" rel="noopener nofollow">Website ↗</a>` : "",
    c.linkedin_url ? `<a class="btn" href="${esc(c.linkedin_url)}" target="_blank" rel="noopener nofollow">LinkedIn ↗</a>` : "",
    c.wikipedia_url ? `<a class="btn" href="${esc(c.wikipedia_url)}" target="_blank" rel="noopener nofollow">Wikipedia ↗</a>` : "",
    c.twitter_url ? `<a class="btn" href="${esc(c.twitter_url)}" target="_blank" rel="noopener nofollow">X / Twitter ↗</a>` : "",
  ].filter(Boolean).join(" ");

  const sources = asArray(c.source_urls).filter((u) => /^https?:\/\//.test(u)).slice(0, 5)
    .map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener nofollow">${esc(u.replace(/^https?:\/\/(www\.)?/, "").split("/")[0])}</a>`).join(" · ");

  const jsonld = {
    "@context": "https://schema.org", "@type": "Organization", "name": c.name, "url": url,
    ...(c.website ? { "sameAs": [c.website, c.linkedin_url, c.wikipedia_url].filter(Boolean) } : {}),
    ...(c.description ? { "description": clip(c.description, 300) } : {}),
    ...(c.founded_year ? { "foundingDate": String(c.founded_year) } : {}),
    ...(hq ? { "address": { "@type": "PostalAddress", ...(c.hq_city ? { "addressLocality": c.hq_city } : {}), ...(c.hq_country ? { "addressCountry": c.hq_country } : {}) } } : {}),
  };

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(metaDesc)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="xSonomy">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(metaDesc)}"><meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Inter+Tight:wght@400;500&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>${PAGE_CSS}${CO_PAGE_EXTRA_CSS}</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
${GA_TAG}</head><body>
<header class="hd"><div class="w"><a class="brand" href="/">xSonomy</a><a class="back" href="/companies/">← Companies</a></div></header>
<div class="wrap">
<div class="kicker">// Company${c.company_type ? " · " + esc(TYPE_LABEL[c.company_type] || c.company_type) : ""}</div>
<div class="co-head">
  <span class="mono-sq" style="--c:${tcol}"><i class="br"></i>${initials(c.name)}</span>
  <div>
    <h1 style="margin:0">${esc(c.name)}${c.is_sanctioned ? '<span class="flagb">Sanctioned</span>' : ""}${statusB}</h1>
    <div class="sub" style="margin-bottom:0">${esc([hq ? `${flag ? flag + " " : ""}${hq}` : "", region].filter(Boolean).join(" · "))}</div>
  </div>
</div>
${c.description ? `<p class="lead" style="margin-top:18px">${esc(c.description)}</p>` : ""}
<div class="sect">// Facts</div>
<table><tbody>${factRows}</tbody></table>
${prodChips ? `<div class="sect">// Products in the catalogue (${prods.length})</div><div class="prods">${prodChips}</div>` : ""}
${c.overview ? `<div class="sect">// Overview</div><div class="prose">${paras(c.overview)}</div>` : ""}
${c.history ? `<div class="sect">// History</div><div class="prose">${paras(c.history)}</div>` : ""}
${ctas ? `<div class="cta">${ctas}</div>` : ""}
<div class="note">Review-stage registry data — profile compiled from public sources; not for procurement or investment decisions.${sources ? ` Sources: ${sources}` : ""}</div>
</div></body></html>`;
}

// The two registry shells hand-rolled their own tab strip and never gained the three
// sections added later, so Counter-UAS, Software and Other were unreachable from them.
function shellTabs() {
  return `<nav class="tabs"><a href="/landscape/">Landscape</a>${Object.entries(CATEGORIES)
    .map(([k, c]) => `<a href="/${k}/">${esc(c.label)}</a>`).join("")}</nav>`;
}

// Static entry list for the company registries. Same shape as the product hubs: real
// anchors to the detail pages, so the registry does not depend on its JSON loading.
function companyEntries(rows, pagerHtml = "", countLine = "") {
  return `<div class="static-index">
${countLine ? `<p class="count">${countLine}</p>` : ""}
<ul>${rows.map((c) => {
    const meta = [c.company_type, c.hq_country].filter(Boolean).join(" · ");
    return `<li><a href="/companies/${esc(c.slug)}/">${esc(c.name)}</a>` +
      `${meta ? `<span class="m">${esc(meta)}</span>` : ""}</li>`;
  }).join("")}</ul>
${pagerHtml}
</div>`;
}

// Shared shell for every registry view — /companies/, /cuas-systems/ and /research/.
// The three differ only in their dataset, their copy and which tab is lit, so the markup
// lives here once instead of drifting between near-identical copies.
function registryShell({ path, label, kicker, h1, desc, ogDesc, lead = "", dataSrc = "", sanctioned = false, staticIndex = "" }) {
  const tab = (href, text) =>
    `<a class="news-link${href === path ? " active" : ""}" href="${href}">${text}</a>`;
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(label)} · xSonomy</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:type" content="website"><meta property="og:site_name" content="xSonomy">
<meta property="og:title" content="${esc(label)} · xSonomy"><meta property="og:url" content="${SITE}${path}">
${ogDesc ? `<meta property="og:description" content="${ogDesc}">\n` : ""}<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Inter+Tight:wght@400;500;600&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/styles.css">
<link rel="stylesheet" href="/assets/companies.css">
<style>${LIST_CSS}</style>
${GA_TAG}</head><body${dataSrc ? ` data-src="${dataSrc}"` : ""}>
<header class="site-header"><div class="wrap">
  <div class="brand">xSonomy</div>
  ${shellTabs()}
  ${tab("/cuas-systems/", "C-UAS Vendors")}
  ${tab("/companies/", "Companies")}
  ${tab("/research/", "Research")}
  <a class="news-link" href="http://uav360.xyz/" target="_blank" rel="noopener">News</a>
</div></header>
<main class="wrap layout">
  <aside class="filters" aria-label="Filters">
    <div class="search-box"><input id="cosearch" type="search" placeholder="Search company or country…" autocomplete="off"></div>
    <div id="cofacets"></div>
${sanctioned ? `    <label class="cotoggle"><input id="cosanc" type="checkbox"> Sanctioned companies</label>\n` : ""}    <button id="coreset" class="reset" type="button">Reset filters</button>
  </aside>
  <section class="results">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span>/</span> ${esc(label)}</nav>
    <div class="cokick">${kicker}</div>
    <h1 class="coh1">${esc(h1)}</h1>
${lead ? `    <p class="colead">${lead}</p>\n` : ""}    <div id="cocount" class="cocount"></div>
    <div id="cogrid">${staticIndex}</div>
    <div id="copager" class="copager"></div>
  </section>
</main>
<script type="module" src="/assets/companies.js"></script>
</body></html>`;
}

// The supplier registry. Research and academic organisations are counted and listed
// separately at /research/, so this total is suppliers only.
function companiesShell(total, researchTotal, staticIndex = "") {
  return registryShell({
    path: "/companies/", label: "Companies", kicker: "// Company Registry", h1: "Companies",
    desc: `Directory of ${total} UAV and counter-UAS companies — type, HQ country, headcount, revenue and valuation. Filter by type and region.`,
    lead: `Manufacturers, suppliers and integrators. ${num(researchTotal)} universities, national laboratories and research institutes are listed separately under <a href="/research/">Research</a>.`,
    sanctioned: true, staticIndex,
  });
}

// Integrated C-UAS registry page. Same shell, filters and table as /companies/,
// pointed at the cuas-integrated subset via <body data-src>.
function cuasShell(total, staticIndex = "") {
  return registryShell({
    path: "/cuas-systems/", label: "C-UAS Vendors", kicker: "// Counter-UAS", h1: "C-UAS Vendors",
    desc: `${total} counter-UAS companies — integrated systems, detection, mitigation and command &amp; control. Filter by capability, type, region and country.`,
    ogDesc: `${total} counter-UAS companies, filterable by capability: integrated systems, detection, mitigation, command &amp; control.`,
    lead: `Companies working in counter-unmanned aircraft systems, grouped by what they supply: <b>Integrated</b> end-to-end systems, <b>Detection</b> sensors, <b>Mitigation</b> effectors, and <b>Command &amp; Control</b> software. Filter by capability on the left.`,
    dataSrc: "/data/cuas-systems.json", staticIndex,
  });
}

// Research & academia. Universities, national laboratories and research institutes do
// real UAV work and keep their pages and products, but they are not suppliers, so they
// sit outside the company count rather than inflating it.
function researchShell(total, staticIndex = "") {
  return registryShell({
    path: "/research/", label: "Research & academia", kicker: "// Research &amp; Academia", h1: "Research & academia",
    desc: `${total} universities, national laboratories and research institutes working on uncrewed systems and counter-UAS — country, type and linked products.`,
    ogDesc: `${total} universities, national laboratories and research institutes working on uncrewed and counter-UAS systems.`,
    lead: `Universities, national laboratories and research institutes with work in uncrewed systems or counter-UAS. They are organisations, not suppliers, so they are counted here rather than in the <a href="/companies/">company registry</a>.`,
    dataSrc: "/data/research.json", staticIndex,
  });
}

// Merged-away slugs whose URLs are indexed. GitHub Pages cannot send a 301, so the
// build leaves a stub at the old path: a canonical link naming the new URL, which is
// what search engines act on, plus a meta refresh and a visible link for people.
//
// Deliberately no `noindex`. It contradicts the canonical — one says "index the other
// page instead", the other says "index nothing here" — and Google advises against the
// pair. The canonical on its own is what passes the old URL's value to the new one.
async function fetchRedirects() {
  return sbFetchAll("slug_redirects", { select: "from_slug,to_slug,kind", order: "from_slug.asc" }, "slug_redirects");
}

function redirectPage(from, to, kind) {
  const target = `/${kind === "product" ? "uav" : "companies"}/${to}/`;
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Moved &middot; xSonomy</title>
<link rel="canonical" href="${SITE}${target}">
<meta http-equiv="refresh" content="0; url=${target}">
<style>body{background:#101417;color:#e7ecef;font-family:system-ui,sans-serif;display:grid;
place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px}
a{color:#5fd0e0}p{max-width:46ch;line-height:1.6}</style>
${GA_TAG}</head><body>
<div><p>This entry was merged into another record.</p>
<p><a href="${target}">Continue to the current page</a></p></div>
<script>location.replace(${JSON.stringify(target)});</script>
</body></html>`;
}

async function main() {
  await loadDotenv();
  sbConfig();
  console.log(`Fetching products from Supabase (gate: ${PUBLISH_STATUS || "all"})…`);
  const products = await fetchProducts();
  console.log("Fetching taxonomy from Supabase…");
  const taxonomy = await fetchTaxonomy();
  console.log(`  taxonomy: ${taxonomy.size} products classified`);
  console.log("Fetching news from Supabase…");
  const news = await fetchNews();
  console.log(`  news: ${news.size} products with mentions`);
  const curated = await loadCuratedImages();
  console.log(`  curated images: ${Object.keys(curated).length} products`);

  await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, "data"), { recursive: true });
  await cp(SRC, OUT, { recursive: true });

  const buckets = Object.fromEntries(Object.keys(CATEGORIES).map((k) => [k, []]));
  const newsBySlug = new Map();
  const creditBySlug = new Map();
  // product id -> its built page URL, filled here because this is the only place the
  // database id and the generated slug are both in hand; `reshape` does not carry the
  // id into the row. Keyed on id, never on name: two live products may share a name
  // exactly (Komodo, HAWK), and keying on name made both owners' pages link to
  // whichever was written last.
  const pageUrlByProduct = new Map();
  for (const p of products) {
    const bucket = BUCKET_OF[p.category] || "other";
    const row = reshape(p);
    row.slug = slugify(row.Name || "item", bucket);
    pageUrlByProduct.set(p.id, `/${bucket}/${row.slug}/`);
    Object.assign(row, taxonomy.get(p.id) || {});
    // Normalised status is UAV-only and always present, so "N/A" is a real bucket
    // rather than a gap. Kept out of the detail-page spec table by HIDDEN — those
    // pages show the richer raw `UAV · Production status` instead.
    if (bucket === "uav") row.Status = PRODUCT_STATUS_LABEL[p.status] || normaliseStatus(row["UAV · Production status"]);
    // The count rides along in the JSON for the catalogue cards; the articles themselves
    // stay out of it (they would add megabytes) and are handed to productPage by slug.
    const items = news.get(p.id) || [];
    if (items.length) {
      row.Mentions = items.length;
      newsBySlug.set(row.slug, items.slice(0, NEWS_ON_PAGE));
    }
    const pic = bucket === "uav" ? curated[row.Name] : null;
    if (pic && pic.url) { row.__image_url = pic.url; creditBySlug.set(row.slug, pic); }
    await attachImage(row);
    buckets[bucket].push(row);
  }

  // Nothing unpublished may reach the site. Cheap, and it fails the build rather than
  // leaking quietly if the gate is ever loosened by accident.
  if (PUBLISH_STATUS) {
    const leaked = products.filter((p) => p.publication_status && p.publication_status !== PUBLISH_STATUS);
    if (leaked.length) {
      throw new Error(`${leaked.length} product(s) with publication_status != "${PUBLISH_STATUS}" ` +
        `reached the build, e.g. "${leaked[0].name}". Refusing to publish.`);
    }
  }

  const meta = { generatedAt: new Date().toISOString(), categories: {} };
  for (const [key, cfg] of Object.entries(CATEGORIES)) {
    await writeFile(join(OUT, "data", cfg.file), JSON.stringify(buckets[key]));
    meta.categories[key] = { label: cfg.label, file: `data/${cfg.file}`, count: buckets[key].length };
    console.log(`  ${cfg.label}: ${buckets[key].length} rows`);
  }
  await writeFile(join(OUT, "data", "meta.json"), JSON.stringify(meta, null, 2));

  const urls = [];
  for (const [bucket, rows] of Object.entries(buckets)) {
    for (const row of rows) {
      const dir = join(OUT, bucket, row.slug);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, "index.html"), productPage(bucket, row, newsBySlug.get(row.slug) || [], creditBySlug.get(row.slug) || null));
      urls.push(`${SITE}/${bucket}/${row.slug}/`);
    }
  }

  // Companies catalogue — client-filtered registry + per-company detail pages
  const companies = await fetchCompanies();
  const lightProducts = await fetchCompanyProducts();

  // pageUrlByProduct was filled while the pages were generated, above.
  const prodsByCompany = new Map();
  for (const p of lightProducts) {
    if (!p.company_id) continue;
    const arr = prodsByCompany.get(p.company_id) || [];
    arr.push({ name: p.name, category: p.category, url: pageUrlByProduct.get(p.id) || null });
    prodsByCompany.set(p.company_id, arr);
  }

  // The landscape is the reconciled public subset, not the general registry.
  // Fail closed if its source tables cannot be read; never substitute all companies.
  const landscape = await fetchLandscape(sbFetchAll, companies, prodsByCompany);

  // Approved investor research records ride the same pipeline but land in their own file,
  // so the map payload does not carry them; landscape.json points at it. Investors are a
  // different kind of organisation from the companies in the landscape and are never
  // mixed into its membership.
  const investors = await fetchLandscapeInvestors(sbFetchAll);
  await writeFile(join(OUT, "data", "landscape-investors.json"), JSON.stringify(investors));
  landscape.investors = {
    count: investors.investors.length,
    locations: investors.investors.reduce((n, i) => n + i.locations.length, 0),
    url: "/data/landscape-investors.json",
    membership: investors.membership,
  };
  console.log(`  Investors: ${investors.investors.length} approved, ` +
    `${landscape.investors.locations} locations -> /data/landscape-investors.json`);

  await writeFile(join(OUT, "data", "landscape.json"), JSON.stringify(landscape));
  const landscapePath = join(OUT, "landscape", "index.html");
  await writeFile(landscapePath, (await readFile(landscapePath, "utf8"))
    .replace("<!--LANDSCAPE_ANALYTICS-->", GA_TAG));
  console.log(`  Landscape: ${landscape.companies.length} included, published companies -> /landscape/`);
  urls.push(`${SITE}/landscape/`);

  // The registry is suppliers only. Research and academic organisations keep their
  // detail pages and their products, but they are listed and counted at /research/.
  const suppliers = companies.filter((c) => !isResearchOrg(c));
  const researchOrgs = companies.filter(isResearchOrg);

  // registry JSON stays lean: strip long-text/detail-only fields
  const lean = ({ id, description, overview, history, source_urls, legal_name, ...rest }) => rest;
  await writeFile(join(OUT, "data", "companies.json"), JSON.stringify(suppliers.map(lean)));
  await mkdir(join(OUT, "companies"), { recursive: true });

  // Bar widths in the static registry pages are relative, so the scale has to come from
  // the data. Left at 1 (the declared default) every bar renders full width. The scale
  // spans both registries so a figure means the same width on either page.
  const withSlug = suppliers.filter((c) => c.slug);
  const allWithSlug = companies.filter((c) => c.slug);
  MAXREV = Math.max(1, ...allWithSlug.map((c) => Number(c.revenue_amount) || 0));
  MAXVAL = Math.max(1, ...allWithSlug.map((c) => Number(c.valuation) || 0));

  const CO_PER_PAGE = 100;
  const coTotalPages = Math.max(1, Math.ceil(withSlug.length / CO_PER_PAGE));
  const coPageUrls = [];
  await writeFile(join(OUT, "companies", "index.html"), companiesShell(suppliers.length, researchOrgs.length,
    companyEntries(withSlug.slice(0, CO_PER_PAGE), listPager("/companies/", 1, coTotalPages),
      `Showing 1–${num(Math.min(CO_PER_PAGE, withSlug.length))} of ${num(withSlug.length)}` +
      (coTotalPages > 1 ? ` · page 1 of ${coTotalPages}` : ""))));

  // Pages 2+ are the static table view: every company past the first hundred is now
  // reachable by following links instead of only by filtering in the browser.
  for (let pn = 2; pn <= coTotalPages; pn++) {
    const slice = withSlug.slice((pn - 1) * CO_PER_PAGE, pn * CO_PER_PAGE);
    const dir = join(OUT, "companies", String(pn));
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), companyRegistryPage(slice, pn, coTotalPages, withSlug.length));
    coPageUrls.push(`${SITE}/companies/${pn}/`);
  }

  let coPages = 0;
  for (const c of companies) {
    if (!c.slug) continue;
    const dir = join(OUT, "companies", String(c.slug));
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), companyPage(c, prodsByCompany.get(c.id) || []));
    urls.push(`${SITE}/companies/${c.slug}/`);
    coPages++;
  }
  console.log(`  Companies: ${suppliers.length} suppliers -> /companies/ + ${coPages} detail pages ` +
    `(${researchOrgs.length} research & academic organisations counted separately)`);

  // C-UAS view — same registry UI over every company in a cuas-* sector, with
  // the capability carried through as `cuas` for the on-page filter and column.
  // Detail pages are shared with /companies/, so nothing extra is generated.
  const cuasCaps = await fetchCuasCapabilities();
  const cuasRegistry = companies.filter((c) => cuasCaps.has(c.id))
    .map(({ id, description, overview, history, source_urls, legal_name, ...rest }) =>
      ({ ...rest, cuas: cuasCaps.get(id) }));
  await writeFile(join(OUT, "data", "cuas-systems.json"), JSON.stringify(cuasRegistry));
  await mkdir(join(OUT, "cuas-systems"), { recursive: true });
  // Vendor detail pages live under /companies/, so the whole filtered list fits in one
  // static block — no pagination needed and nothing left reachable only via JavaScript.
  const cuasWithSlug = cuasRegistry.filter((c) => c.slug);
  await writeFile(join(OUT, "cuas-systems", "index.html"), cuasShell(cuasRegistry.length,
    companyEntries(cuasWithSlug, "", `${num(cuasWithSlug.length)} vendors`)));
  const byCap = {};
  for (const c of cuasRegistry) for (const k of c.cuas) byCap[k] = (byCap[k] || 0) + 1;
  console.log(`  C-UAS Vendors: ${cuasRegistry.length} rows -> /cuas-systems/ ` +
    `(${Object.entries(byCap).map(([k, n]) => `${k} ${n}`).join(", ")})`);
  // Tagged in Supabase but absent from the companies fetch = a truncated or
  // gated read. Loud, because it fails silently as a short list otherwise.
  if (cuasRegistry.length !== cuasCaps.size)
    console.warn(`  WARNING: ${cuasCaps.size} companies tagged cuas-* but only ${cuasRegistry.length} present in the companies fetch.`);

  // Research & academia — the same registry UI over the organisations the company count
  // excludes. Detail pages are shared with /companies/, so the list fits one static
  // block and nothing here is reachable only by running the JavaScript.
  await writeFile(join(OUT, "data", "research.json"), JSON.stringify(researchOrgs.map(lean)));
  await mkdir(join(OUT, "research"), { recursive: true });
  const researchWithSlug = researchOrgs.filter((c) => c.slug);
  await writeFile(join(OUT, "research", "index.html"), researchShell(researchOrgs.length,
    companyEntries(researchWithSlug, "", `${num(researchWithSlug.length)} organisations`)));
  urls.push(`${SITE}/research/`);
  console.log(`  Research & academia: ${researchOrgs.length} rows -> /research/`);

  // ---- Hubs: the app shell plus a static first page ----
  // Each hub keeps the filterable app, but now ships a heading, an intro, a record count
  // and a first page of real links in the HTML, with pages 2+ as their own static URLs.
  // Without this, every record is reachable only by running the JavaScript.
  const indexPath = join(OUT, "index.html");
  const rawShell = await readFile(indexPath, "utf8");
  const listUrls = [];

  for (const key of Object.keys(CATEGORIES)) {
    const copy = SECTION_COPY[key];
    const rows = [...buckets[key]].sort((a, b) =>
      String(a.Name || "").localeCompare(String(b.Name || ""), "en") || String(a.slug).localeCompare(String(b.slug)));
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / LIST_PAGE_SIZE));
    const url = `${SITE}/${key}/`;

    let page = rawShell
      .replace('href="https://xsonomy.com/"', `href="${url}"`)
      .replace('content="https://xsonomy.com/"', `content="${url}"`)
      .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(copy.desc(num(total)))}"`)
      .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${esc(copy.desc(num(total)))}"`)
      .replace("<!--SECTION_INTRO-->",
        `<nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> <span>/</span> ${esc(CATEGORIES[key].label)}</nav>` +
        `<h1>${esc(copy.h1)}</h1><p class="lede">${esc(copy.lede)}</p>`)
      .replace("<!--STATIC_INDEX-->", listBlock(key, rows.slice(0, LIST_PAGE_SIZE), 1, totalPages, total));
    if (SECTION_TITLE[key]) {
      const t = esc(SECTION_TITLE[key]);
      page = page.replace(/<title>[\s\S]*?<\/title>/, `<title>${t}</title>`)
                 .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${t}"`);
    }
    await mkdir(join(OUT, key), { recursive: true });
    await writeFile(join(OUT, key, "index.html"), page);

    for (let pn = 2; pn <= totalPages; pn++) {
      const slice = rows.slice((pn - 1) * LIST_PAGE_SIZE, pn * LIST_PAGE_SIZE);
      const dir = join(OUT, key, String(pn));
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, "index.html"), listingPage(key, slice, pn, totalPages, total));
      listUrls.push(`${SITE}/${key}/${pn}/`);
    }
    console.log(`  /${key}/: ${total} records over ${totalPages} page${totalPages === 1 ? "" : "s"}`);
  }

  await writeFile(indexPath, rawShell
    .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${esc(HOME_DESC)}"`)
    .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${esc(HOME_DESC)}"`)
    .replace("<!--SECTION_INTRO-->", homeIntro())
    .replace("<!--STATIC_INDEX-->", homeIndex(buckets, suppliers.length, cuasRegistry.length, researchOrgs.length)));

  // Stubs for merged-away URLs. Written after the real pages so a redirect can never
  // overwrite a live one, and kept out of the sitemap — they are not content.
  const redirects = await fetchRedirects();
  let stubs = 0;
  for (const r of redirects) {
    const dir = join(OUT, r.kind === "product" ? "uav" : "companies", r.from_slug);
    if (existsSync(join(dir, "index.html"))) {
      console.warn(`  WARNING: redirect ${r.from_slug} collides with a real page — skipped`);
      continue;
    }
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), redirectPage(r.from_slug, r.to_slug, r.kind));
    stubs++;
  }
  console.log(`  Redirects: ${stubs} stub page${stubs === 1 ? "" : "s"}`);

  const sectionUrls = Object.keys(CATEGORIES).map((k) => `${SITE}/${k}/`);
  const today = new Date().toISOString().slice(0, 10);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    [`${SITE}/`, ...sectionUrls, `${SITE}/cuas-systems/`, `${SITE}/companies/`, ...coPageUrls, ...listUrls, ...urls].map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n") + `\n</urlset>\n`;
  await writeFile(join(OUT, "sitemap.xml"), sitemap);
  await writeFile(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
  await writeFile(join(OUT, "CNAME"), "xsonomy.com\n");

  console.log(`\nBuilt static site -> ${OUT} (${urls.length} product pages) from Supabase.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
