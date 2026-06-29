// xSonomy catalogue generator — SUPABASE edition (self-contained).
// Same output as generate.mjs (per-category JSON + SEO product pages + sitemap),
// but reads the `products` table from Supabase instead of Airtable. Has NO
// dependency on generate.mjs — the page renderer is inlined here so it builds
// regardless of the Airtable generator's state.
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "public");
const SITE = "https://xsonomy.com";

const CATEGORIES = {
  uav: { label: "UAVs", file: "uav.json" },
  sensors: { label: "Sensors", file: "sensors.json" },
};
const SECTION_TITLE = {
  uav: "UAVs — xSonomy Catalogue",
  sensors: "Sensors — xSonomy Counter-UAS Catalogue",
};
const BUCKET_KICKER = { uav: "UAV", sensors: "Sensor" };
const HIDDEN = new Set(["Name", "Company", "Summary", "Website", "Image", "Status", "Enrichment status", "Source URLs", "Category", "Confidence", "slug"]);

const PUBLISH_STATUS = null; // null = all rows; "live" = only publication_status='live'

// ---- utils (inlined from generate.mjs) ----
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const clip = (s, n = 155) => { const t = String(s || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t; };
const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const specLabel = (k) => k.replace(/^.*· /, "");
const analystNote = (note) => { const m = String(note || "").split(/Analyst note:\s*/i); return m.length > 1 ? m[1].trim() : null; };

const slugSeen = new Set();
const slugify = (name) => {
  let base = String(name || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "item";
  let s = base, i = 2;
  while (slugSeen.has(s)) s = `${base}-${i++}`;
  slugSeen.add(s);
  return s;
};

const PAGE_CSS = `
:root{--bg:#0a0d10;--panel:#0f1418;--panel2:#141a1f;--line:rgba(255,255,255,.1);--text:#e7ecef;--muted:#8b96a0;--ink3:#44505a;--accent:#66be69;--mono:ui-monospace,"JetBrains Mono",Menlo,monospace;--sans:"Inter Tight",system-ui,sans-serif;--display:"Oswald",sans-serif}
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

function productPage(bucket, row) {
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
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600&family=Inter+Tight:wght@400;500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${PAGE_CSS}</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head><body>
<header class="hd"><div class="w"><a class="brand" href="/">xSonomy</a><a class="back" href="/">← Catalogue</a></div></header>
<div class="wrap">
<div class="kicker">${esc(kicker)}</div>
<h1>${esc(name)}</h1>
<div class="sub">${esc([company, country].filter(Boolean).join(" · "))}</div>
${imgRel
  ? `<img class="hero" src="${imgRel}" alt="${esc(name)}" width="900">`
  : `<div class="art">${bucket === "uav" ? dSchematic(dFrameKind(row["UAV · Frame type"])) : dGlyph(dSensorKind(row))}</div>`}
${row.Summary ? `<p class="lead">${esc(row.Summary)}</p>` : ""}
${why ? `<div class="why"><b>Why it matters</b>${esc(why)}</div>` : ""}
<table><tbody>${specRows}</tbody></table>
${row.Website ? `<div class="cta"><a class="btn p" href="${esc(row.Website)}" target="_blank" rel="noopener nofollow">Visit manufacturer ↗</a></div>` : ""}
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
async function fetchProducts() {
  const { url, key } = sbConfig();
  const q = new URL(`${url}/rest/v1/products`);
  q.searchParams.set("select",
    "name,subcategory,country,summary,website,image_url,price,status,specs,confidence,source_urls,category,companies!products_company_id_fkey(name)");
  q.searchParams.set("category", "in.(UAV,Sensor)");
  if (PUBLISH_STATUS) q.searchParams.set("publication_status", `eq.${PUBLISH_STATUS}`);
  q.searchParams.set("limit", "5000");
  const res = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Supabase products ${res.status}: ${await res.text()}`);
  return res.json();
}
function reshape(p) {
  const row = {};
  if (p.name) row.Name = p.name;
  if (p.companies && p.companies.name) row.Company = p.companies.name;
  if (p.country) row.Country = p.country;
  if (p.subcategory) row.Subcategory = p.subcategory;
  if (p.summary) row.Summary = p.summary;
  if (p.website) row.Website = p.website;
  if (p.price) row.Price = p.price;
  if (p.confidence) row.Confidence = p.confidence;
  if (Array.isArray(p.source_urls) && p.source_urls.length) row["Source URLs"] = p.source_urls.join("\n");
  if (p.specs && typeof p.specs === "object") Object.assign(row, p.specs);
  row.__image_url = p.image_url || null;
  return row;
}
async function attachImage(row) {
  const url = row.__image_url; delete row.__image_url;
  if (!url) return;
  try {
    const res = await fetch(url);
    if (!res.ok) { console.error(`image ${row.slug}: HTTP ${res.status}`); return; }
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = (extname(new URL(url).pathname).slice(1) || "jpg").toLowerCase().replace("jpeg", "jpg");
    const rel = `images/${row.slug}.${ext}`;
    await mkdir(join(OUT, "images"), { recursive: true });
    await writeFile(join(OUT, rel), buf);
    row.Image = rel;
  } catch (e) { console.error(`image ${row.slug}: ${e.message}`); }
}

// ---- Companies catalogue ----
async function fetchCompanies() {
  const { url, key } = sbConfig();
  const q = new URL(`${url}/rest/v1/companies`);
  q.searchParams.set("select",
    "name,slug,company_type,hq_country,website,linkedin_url,employee_range,revenue_amount,revenue_currency,revenue_year,total_funding,funding_currency,valuation,valuation_currency,is_sanctioned");
  if (PUBLISH_STATUS) q.searchParams.set("publication_status", `eq.${PUBLISH_STATUS}`);
  q.searchParams.set("order", "name.asc");
  q.searchParams.set("limit", "5000");
  const res = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Supabase companies ${res.status}: ${await res.text()}`);
  return res.json();
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
  const nameInner = c.website ? `<a href="${esc(c.website)}" target="_blank" rel="noopener">${nm}</a>` : nm;
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

function pager(page, totalPages) {
  const href = (p) => (p === 1 ? "/companies/" : `/companies/${p}/`);
  const out = [];
  out.push(page > 1 ? `<a href="${href(page - 1)}">← Prev</a>` : `<span class="dis">← Prev</span>`);
  for (let p = 1; p <= totalPages; p++) {
    out.push(p === page ? `<span class="cur">${p}</span>` : `<a href="${href(p)}">${p}</a>`);
  }
  out.push(page < totalPages ? `<a href="${href(page + 1)}">Next →</a>` : `<span class="dis">Next →</span>`);
  return `<div class="pager">${out.join("")}</div>`;
}

function companyRegistryPage(rows, page, totalPages, total) {
  const canonical = page === 1 ? `${SITE}/companies/` : `${SITE}/companies/${page}/`;
  const from = (page - 1) * 100 + 1, to = (page - 1) * 100 + rows.length;
  const title = `Companies${page > 1 ? ` — page ${page}` : ""} · xSonomy`;
  const nav = `<nav><a href="/uav/">UAVs</a><a href="/sensors/">Sensors</a><a class="on" href="/companies/">Companies</a><a href="https://news.xsonomy.com">News</a></nav>`;
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="Directory of UAV and counter-UAS companies — type, HQ country, headcount, revenue and funding. ${total} companies in the xSonomy registry.">
<link rel="canonical" href="${canonical}">
${page > 1 ? `<meta name="robots" content="noindex,follow">` : ""}
<meta property="og:type" content="website"><meta property="og:site_name" content="xSonomy">
<meta property="og:title" content="${esc(title)}"><meta property="og:url" content="${canonical}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Inter+Tight:wght@400;500&family=Share+Tech+Mono&display=swap" rel="stylesheet">
<style>${COMPANIES_CSS}</style>
</head><body>
<header class="hd"><div class="w"><a class="brand" href="/">x<b>Sonomy</b></a>${nav}</div></header>
<div class="wrap">
<div class="kicker">// Company Registry</div>
<h1>Companies</h1>
<div class="count">Showing ${from}–${to} of ${total} · page ${page} of ${totalPages}</div>
<div class="tablewrap"><table>
<thead><tr><th>Company</th><th>Type</th><th>Employees</th><th>Revenue</th><th>Valuation</th></tr></thead>
<tbody>${rows.map(companyRow).join("")}</tbody>
</table></div>
${pager(page, totalPages)}
</div></body></html>`;
}

async function main() {
  await loadDotenv();
  sbConfig();
  console.log(`Fetching products from Supabase (gate: ${PUBLISH_STATUS || "all"})…`);
  const products = await fetchProducts();

  await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, "data"), { recursive: true });
  await cp(SRC, OUT, { recursive: true });

  const buckets = { uav: [], sensors: [] };
  for (const p of products) {
    const bucket = p.category === "UAV" ? "uav" : "sensors";
    const row = reshape(p);
    row.slug = slugify(row.Name || "item");
    await attachImage(row);
    buckets[bucket].push(row);
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
      await writeFile(join(dir, "index.html"), productPage(bucket, row));
      urls.push(`${SITE}/${bucket}/${row.slug}/`);
    }
  }

  // Companies catalogue — paginated registry (100 per page)
  const companies = await fetchCompanies();
  MAXREV = Math.max(1, ...companies.map((c) => Number(c.revenue_amount) || 0));
  MAXVAL = Math.max(1, ...companies.map((c) => Number(c.valuation) || 0));
  const PER = 100;
  const totalPages = Math.max(1, Math.ceil(companies.length / PER));
  for (let pg = 1; pg <= totalPages; pg++) {
    const slice = companies.slice((pg - 1) * PER, pg * PER);
    const dir = pg === 1 ? join(OUT, "companies") : join(OUT, "companies", String(pg));
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), companyRegistryPage(slice, pg, totalPages, companies.length));
  }
  console.log(`  Companies: ${companies.length} rows -> ${totalPages} page(s)`);

  const sectionUrls = Object.keys(CATEGORIES).map((k) => `${SITE}/${k}/`);
  const today = new Date().toISOString().slice(0, 10);
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    [`${SITE}/`, ...sectionUrls, `${SITE}/companies/`, ...urls].map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join("\n") + `\n</urlset>\n`;
  await writeFile(join(OUT, "sitemap.xml"), sitemap);
  await writeFile(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
  await writeFile(join(OUT, "CNAME"), "xsonomy.com\n");

  const indexPath = join(OUT, "index.html");
  const shell = (await readFile(indexPath, "utf8")).replace("<!--PRODUCT_INDEX-->", "");
  await writeFile(indexPath, shell);
  for (const key of Object.keys(CATEGORIES)) {
    const url = `${SITE}/${key}/`;
    let page = shell
      .replace('href="https://xsonomy.com/"', `href="${url}"`)
      .replace('content="https://xsonomy.com/"', `content="${url}"`);
    if (SECTION_TITLE[key]) page = page.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(SECTION_TITLE[key])}</title>`);
    await mkdir(join(OUT, key), { recursive: true });
    await writeFile(join(OUT, key, "index.html"), page);
  }

  console.log(`\nBuilt static site -> ${OUT} (${urls.length} product pages) from Supabase.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
