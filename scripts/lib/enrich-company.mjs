// LLM-only company enrichment: given a company's known seeds (name, website,
// hq_country, company_type), ask Claude to fill the catalogue profile fields
// FROM TRAINING KNOWLEDGE ONLY (no web). Hard rule: return null for anything
// uncertain — never fabricate financials, CAGE codes, or sanctions.
//
// Returns { fields, confidence, ok, error }. `fields` contains ONLY validated,
// non-null values, keyed by DB column. The caller decides what to write.
//
// Env: ANTHROPIC_API_KEY.

import { anthropicComplete, parseJsonObject, hasApiKey } from "./analyze.mjs";

export { hasApiKey };

const THIS_YEAR = new Date().getFullYear();

// column -> validation kind
// company_type, ownership and employee_range have DB CHECK constraints, so they
// use enum coercers (invalid values -> null, never a failed write).
const FIELD_SPEC = {
  description: "text", overview: "text", history: "text",
  company_type: "ctype", ownership: "ownership",
  founded_year: "year", defunct_year: "year",
  is_public: "bool", stock_ticker: "text", stock_exchange: "text",
  hq_region: "text", hq_city: "text", hq_address: "text",
  latitude: "lat", longitude: "lon",
  linkedin_url: "url", twitter_url: "url", wikipedia_url: "url", crunchbase_url: "url",
  employee_count: "int", employee_range: "emp",
  revenue_amount: "num", revenue_currency: "ccy", revenue_year: "year", revenue_is_estimate: "bool",
  total_funding: "num", funding_currency: "ccy",
  valuation: "num", valuation_currency: "ccy",
  nato_cage_code: "text", export_regime: "arr", combat_proven: "bool",
  is_sanctioned: "bool", sanctions_lists: "arr", risk_flags: "arr",
};

const TEXT_CAP = { description: 600, overview: 2500, history: 3000, default: 200 };

const SYSTEM = [
  "You are building a defense/UAV company catalogue. For one company, output a",
  "JSON object with the fields below, using ONLY your training knowledge.",
  "",
  "ABSOLUTE RULES:",
  "  - If you are not confident about a value, use null. Do NOT guess.",
  "  - NEVER fabricate financials (revenue, total_funding, valuation), employee",
  "    counts, nato_cage_code, coordinates, or sanctions. For these, null unless",
  "    you genuinely know them. It is correct and expected for most of these to be null.",
  "  - is_sanctioned: only true if the company is well-known to be under sanctions;",
  "    otherwise false. sanctions_lists: list names only if known, else [].",
  "  - Currencies: 3-letter ISO codes (USD, EUR, GBP). Years: integers (e.g. 1998).",
  "  - amounts: plain numbers in the stated currency's main unit (e.g. 1500000000,",
  "    not '1.5B'). employee_count: integer; employee_range: a band like '1001-5000'.",
  "  - export_regime / risk_flags: short string arrays, or [].",
  "  - company_type: EXACTLY one of prime, tier1, tier2, sme, startup, state_owned,",
  "    research_institute, university, jv, division, distributor, other (best classification; null if unsure).",
  "  - ownership: EXACTLY one of private, public, state_owned, subsidiary, joint_venture, academic, nonprofit (or null).",
  "  - employee_range: EXACTLY one of 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5001-10000, 10000+ (or null).",
  "  - Keep description <= 1 sentence, overview <= 2 short paragraphs, history <= 1 paragraph.",
  "",
  "Fields (all optional, null when unknown):",
  "  description, overview, history, company_type, ownership, founded_year,",
  "  defunct_year, is_public, stock_ticker, stock_exchange, hq_region, hq_city,",
  "  hq_address, latitude, longitude, linkedin_url, twitter_url, wikipedia_url,",
  "  crunchbase_url, employee_count, employee_range, revenue_amount, revenue_currency,",
  "  revenue_year, revenue_is_estimate, total_funding, funding_currency, valuation,",
  "  valuation_currency, nato_cage_code, export_regime, combat_proven, is_sanctioned,",
  "  sanctions_lists, risk_flags.",
  "Also include: confidence — one of 'low' | 'medium' | 'high' — your overall",
  "  confidence that you know this company well.",
  "",
  "Respond with a single JSON object and nothing else.",
].join("\n");

function buildUser(c) {
  const known = [];
  if (c.name) known.push(`name: ${c.name}`);
  if (c.website) known.push(`website: ${c.website}`);
  if (c.hq_country) known.push(`hq_country: ${c.hq_country}`);
  if (c.company_type) known.push(`company_type: ${c.company_type}`);
  return `Company (known facts — do not contradict):\n${known.join("\n")}\n\nFill the catalogue fields for this company as JSON.`;
}

// --- validation/coercion ---------------------------------------------------
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
// map free-text ownership -> companies.ownership enum
const OWNERSHIP_MAP = {
  "private":"private","privately held":"private","private company":"private",
  "public":"public","publicly traded":"public","public company":"public","listed":"public",
  "state owned":"state_owned","state-owned":"state_owned","state_owned":"state_owned",
  "government":"state_owned","government owned":"state_owned","government-owned":"state_owned","state":"state_owned",
  "subsidiary":"subsidiary","division":"subsidiary","wholly owned subsidiary":"subsidiary",
  "joint venture":"joint_venture","joint-venture":"joint_venture","jv":"joint_venture",
  "academic":"academic","university":"academic","research institute":"academic","research":"academic",
  "nonprofit":"nonprofit","non-profit":"nonprofit","not-for-profit":"nonprofit","ngo":"nonprofit",
};
// companies.employee_range allowed bands
const EMP_RANGES = new Set(["1-10","11-50","51-200","201-500","501-1000","1001-5000","5001-10000","10000+"]);
// companies.company_type enum + synonym map
const CTYPE_SET = new Set(["prime","tier1","tier2","sme","startup","state_owned","research_institute","university","jv","division","distributor","other"]);
const CTYPE_MAP = {
  "prime contractor":"prime","defense prime":"prime","defence prime":"prime",
  "tier 1":"tier1","tier-1":"tier1","tier 2":"tier2","tier-2":"tier2",
  "oem":"tier1","integrator":"tier1","systems integrator":"tier1",
  "manufacturer":"tier2","component manufacturer":"tier2","supplier":"tier2",
  "small business":"sme","small enterprise":"sme","start-up":"startup",
  "government":"state_owned","government-owned":"state_owned","state owned enterprise":"state_owned",
  "subsidiary":"division","research institute":"research_institute","institute":"research_institute",
  "academic":"university","joint venture":"jv","reseller":"distributor",
};
function coerce(kind, v, key) {
  if (v == null) return null;
  switch (kind) {
    case "text": {
      if (typeof v !== "string") return null;
      const s = v.trim(); if (!s) return null;
      return s.slice(0, TEXT_CAP[key] || TEXT_CAP.default);
    }
    case "url": {
      if (typeof v !== "string") return null;
      const s = v.trim();
      return /^https?:\/\/\S+$/i.test(s) ? s.slice(0, 300) : null;
    }
    case "year": {
      const n = Math.trunc(Number(v));
      return Number.isInteger(n) && n >= 1800 && n <= THIS_YEAR ? n : null;
    }
    case "int": {
      const n = Math.trunc(Number(v));
      return Number.isInteger(n) && n > 0 && n < 5_000_000 ? n : null;
    }
    case "num": {
      const n = Number(v);
      return isNum(n) && n >= 0 ? n : null;
    }
    case "lat": { const n = Number(v); return isNum(n) && n >= -90 && n <= 90 ? n : null; }
    case "lon": { const n = Number(v); return isNum(n) && n >= -180 && n <= 180 ? n : null; }
    case "bool": return typeof v === "boolean" ? v : null;
    case "ctype": {
      if (typeof v !== "string") return null;
      const s = v.trim().toLowerCase();
      if (CTYPE_SET.has(s)) return s;
      const u = s.replace(/[\s-]+/g, "_");
      if (CTYPE_SET.has(u)) return u;
      return CTYPE_MAP[s] || null;
    }
    case "ownership": {
      if (typeof v !== "string") return null;
      return OWNERSHIP_MAP[v.trim().toLowerCase()] || null;
    }
    case "emp": {
      if (typeof v !== "string") return null;
      const s = v.replace(/[, ]/g, "");
      return EMP_RANGES.has(s) ? s : null;
    }
    case "ccy": {
      if (typeof v !== "string") return null;
      const s = v.trim().toUpperCase();
      return /^[A-Z]{3}$/.test(s) ? s : null;
    }
    case "arr": {
      if (!Array.isArray(v)) return null;
      const out = [...new Set(v.filter((x) => typeof x === "string").map((x) => x.trim()).filter(Boolean).map((x) => x.slice(0, 80)))];
      return out.length ? out.slice(0, 20) : null;
    }
    default: return null;
  }
}

export async function enrichCompany(company) {
  if (!hasApiKey()) return { fields: {}, confidence: null, ok: false, error: "no ANTHROPIC_API_KEY" };
  let reply;
  try {
    reply = await anthropicComplete({ system: SYSTEM, user: buildUser(company), maxTokens: 1500 });
  } catch (e) {
    return { fields: {}, confidence: null, ok: false, error: e.message };
  }
  const parsed = parseJsonObject(reply);
  if (!parsed || typeof parsed !== "object") {
    return { fields: {}, confidence: null, ok: false, error: "unparseable response" };
  }
  const fields = {};
  for (const [key, kind] of Object.entries(FIELD_SPEC)) {
    const val = coerce(kind, parsed[key], key);
    if (val !== null) fields[key] = val;
  }
  const conf = typeof parsed.confidence === "string" && ["low", "medium", "high"].includes(parsed.confidence.toLowerCase())
    ? parsed.confidence.toLowerCase() : null;
  return { fields, confidence: conf, ok: true };
}

export const ENRICH_FIELDS = Object.keys(FIELD_SPEC);
