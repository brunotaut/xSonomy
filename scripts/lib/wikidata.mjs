// Resolve a company to its Wikidata entity and extract catalogue fields from the
// structured claims. No LLM, no fabrication — only what Wikidata asserts.
//
// resolveAndExtract(name, website) -> { ok, qid, url, fields } | { ok:false }
//   fields keys map to public.companies columns (NULL-safe; caller decides writes).

const UA = "xSonomy-catalogue/1.0 (https://xsonomy.com; catalogue enrichment)";
const API = "https://www.wikidata.org/w/api.php";

// instance-of (P31) QIDs that indicate "this is a company/org"
const ORG_TYPES = new Set([
  "Q4830453","Q6881511","Q891723","Q783794","Q43229","Q161726","Q18388277",
  "Q31855","Q3918","Q327333","Q480528","Q43501","Q2026833","Q1416431","Q210167",
]);
// currency entity (P2139/P2226 unit) -> ISO code (confident set; unknown -> skip amount)
const CCY = {
  Q4917:"USD", Q4916:"EUR", Q25224:"GBP", Q25344:"CHF", Q1885698:"CAD",
  Q259502:"AUD", Q122922:"SEK", Q132643:"NOK", Q25417:"DKK", Q80524:"INR",
  Q39099:"CNY", Q41044:"RUB", Q8146:"JPY",
};
const KW = /compan|corporation|manufactur|defen[cs]e|aerospace|technolog|firm|enterprise|systems?|industr|institute|university|agency|electronics|robotics|defence|aviation|drone|uav/i;

const host = (u) => {
  try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; }
};

async function api(params) {
  const u = new URL(API);
  Object.entries({ format: "json", origin: "*", ...params }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!r.ok) throw new Error(`Wikidata ${r.status}`);
  return r.json();
}

const claims = (e, p) => (e.claims && e.claims[p]) || [];
const mainVal = (c) => c && c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value;
const firstVal = (e, p) => mainVal(claims(e, p)[0]);
const p31 = (e) => claims(e, "P31").map((c) => mainVal(c) && mainVal(c).id).filter(Boolean);

function bestByTime(arr) {
  let best = null, bestT = "";
  for (const c of arr) {
    const t = (c.qualifiers && c.qualifiers.P585 && c.qualifiers.P585[0]
      && c.qualifiers.P585[0].datavalue && c.qualifiers.P585[0].datavalue.value.time) || "";
    if (!best || t > bestT) { best = c; bestT = t; }
  }
  return best;
}
function quantity(c) {
  const v = mainVal(c); if (!v) return null;
  const amount = Number(String(v.amount).replace("+", ""));
  if (!isFinite(amount)) return null;
  const unitQ = v.unit && v.unit !== "1" ? v.unit.split("/").pop() : null;
  const year = (c.qualifiers && c.qualifiers.P585 && c.qualifiers.P585[0]
    && c.qualifiers.P585[0].datavalue && Number(c.qualifiers.P585[0].datavalue.value.time.slice(1, 5))) || null;
  return { amount, unitQ, year };
}
function yearOf(c) {
  const v = mainVal(c); if (!v || !v.time) return null;
  const y = Number(v.time.slice(1, 5)); return y >= 1700 && y <= new Date().getFullYear() ? y : null;
}
function empRange(n) {
  if (n <= 10) return "1-10"; if (n <= 50) return "11-50"; if (n <= 200) return "51-200";
  if (n <= 500) return "201-500"; if (n <= 1000) return "501-1000"; if (n <= 5000) return "1001-5000";
  if (n <= 10000) return "5001-10000"; return "10000+";
}

async function resolveQid(name, website) {
  const s = await api({ action: "wbsearchentities", search: name, language: "en", uselang: "en", type: "item", limit: "7" });
  const cands = (s.search || []);
  if (!cands.length) return null;
  const got = await api({ action: "wbgetentities", ids: cands.map((c) => c.id).join("|"), props: "claims|sitelinks|labels", languages: "en" });
  const wantHost = website ? host(website) : null;
  let best = null, bestScore = 0;
  for (const c of cands) {
    const e = got.entities && got.entities[c.id];
    if (!e || e.missing !== undefined) continue;
    let score = 0;
    const siteHost = host(firstVal(e, "P856") || "");
    if (wantHost && siteHost && (siteHost === wantHost || siteHost.endsWith("." + wantHost) || wantHost.endsWith("." + siteHost))) score += 100;
    if (p31(e).some((q) => ORG_TYPES.has(q))) score += 15;
    if (KW.test(c.description || "")) score += 4;
    if (score > bestScore) { bestScore = score; best = { id: c.id, entity: e }; }
  }
  // require an org signal or a domain match to avoid false positives
  return bestScore >= 15 ? best : null;
}

async function labelsFor(ids) {
  if (!ids.length) return {};
  const got = await api({ action: "wbgetentities", ids: [...new Set(ids)].join("|"), props: "labels", languages: "en" });
  const out = {};
  for (const id of Object.keys(got.entities || {})) {
    const l = got.entities[id].labels && got.entities[id].labels.en;
    if (l) out[id] = l.value;
  }
  return out;
}

export async function resolveAndExtract(name, website) {
  let r;
  try { r = await resolveQid(name, website); } catch (e) { return { ok: false, error: e.message }; }
  if (!r) return { ok: false, error: "no match" };
  const e = r.entity;
  const fields = {};

  const fy = yearOf(claims(e, "P571")[0]);
  if (fy) fields.founded_year = fy;

  const emp = quantity(bestByTime(claims(e, "P1128")));
  if (emp && emp.amount > 0) { fields.employee_count = Math.round(emp.amount); fields.employee_range = empRange(emp.amount); }

  const rev = quantity(bestByTime(claims(e, "P2139")));
  if (rev && CCY[rev.unitQ]) { fields.revenue_amount = rev.amount; fields.revenue_currency = CCY[rev.unitQ]; if (rev.year) fields.revenue_year = rev.year; }

  const mc = quantity(bestByTime(claims(e, "P2226")));
  if (mc && CCY[mc.unitQ]) { fields.valuation = mc.amount; fields.valuation_currency = CCY[mc.unitQ]; }

  const ticker = firstVal(e, "P249");
  if (typeof ticker === "string" && ticker.trim()) { fields.stock_ticker = ticker.trim().slice(0, 20); fields.is_public = true; }

  const web = firstVal(e, "P856");
  if (typeof web === "string" && /^https?:\/\//i.test(web)) fields.website = web.slice(0, 300);

  const logo = firstVal(e, "P154");
  if (typeof logo === "string" && logo) fields.logo_url = "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(logo.replace(/ /g, "_"));

  const li = firstVal(e, "P4264");
  if (typeof li === "string" && li) fields.linkedin_url = "https://www.linkedin.com/company/" + li;
  const tw = firstVal(e, "P2002");
  if (typeof tw === "string" && tw) fields.twitter_url = "https://twitter.com/" + tw;

  if (e.sitelinks && e.sitelinks.enwiki) fields.wikipedia_url = "https://en.wikipedia.org/wiki/" + encodeURIComponent(e.sitelinks.enwiki.title.replace(/ /g, "_"));

  // resolve referenced entity labels (HQ city, stock exchange) in one call
  const hqQ = (mainVal(claims(e, "P159")[0]) || {}).id;
  const exQ = (mainVal(claims(e, "P414")[0]) || {}).id;
  const labels = await labelsFor([hqQ, exQ].filter(Boolean));
  if (hqQ && labels[hqQ]) fields.hq_city = labels[hqQ];
  if (exQ && labels[exQ]) { fields.stock_exchange = labels[exQ]; fields.is_public = true; }

  return { ok: true, qid: r.id, url: "https://www.wikidata.org/wiki/" + r.id, fields };
}
