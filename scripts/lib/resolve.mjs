// Entity resolution logic: match tag strings from articles.companies /
// articles.products against the catalogue, and vet never-seen-before names
// with one cheap LLM call so junk (agencies, fighter jets, generic phrases)
// never reaches the live catalogue.
//
// Pure functions where possible — resolve-entities.mjs does the I/O.

import { anthropicComplete, parseJsonObject, hasApiKey } from "./analyze.mjs";

// --- normalisation -----------------------------------------------------------

// Trailing corporate suffixes stripped (repeatedly) for company matching.
// "Anduril Industries" → "anduril"; "General Atomics Aeronautical Systems, Inc."
// → "general atomics aeronautical". Only used when exact/alias match fails.
const COMPANY_SUFFIXES = new Set([
  "inc", "incorporated", "ltd", "limited", "llc", "llp", "gmbh", "corp",
  "corporation", "co", "company", "plc", "sa", "ag", "as", "asa", "ab", "oy",
  "oyj", "bv", "nv", "srl", "spa", "pty", "kk", "sas", "industries", "holdings",
  "group", "technologies", "systems", "international", "solutions", "defense",
  "defence", "security",
]);

const clean = (s) => String(s || "").toLowerCase().normalize("NFKD")
  .replace(/[̀-ͯ]/g, "")            // strip diacritics
  .replace(/\./g, "")               // "S.p.A." → "spa", "Inc." → "inc"
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, " ")
  .trim().replace(/\s+/g, " ");

export function normCompany(name) {
  const tokens = clean(name).split(" ");
  while (tokens.length > 1 && COMPANY_SUFFIXES.has(tokens[tokens.length - 1])) tokens.pop();
  return tokens.join(" ");
}

// A suffix-stripped key that collapses a 3+-token name down to ONE token is
// too generic to trust ("Unmanned Systems Group" → "unmanned" must not match
// "Unmanned Technologies" → "unmanned"). Keys from 1-2-token names are fine
// ("Anduril Industries" → "anduril").
export function normKeyOk(name, key) {
  return key.includes(" ") || clean(name).split(" ").length <= 2;
}

// Products: model numbers make fuzzy matching dangerous (Type 91 vs Type 92),
// so we only unify case/punctuation: "MQ-9 Reaper" ≡ "mq9 reaper".
export const normProduct = (name) => clean(name).replace(/ /g, "");

export function slugify(name) {
  return clean(name).replace(/ /g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "x";
}

// Sørensen–Dice similarity on character bigrams (same idea as pg_trgm).
export function dice(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const grams = new Map();
  for (let i = 0; i < a.length - 1; i++) {
    const g = a.slice(i, i + 2);
    grams.set(g, (grams.get(g) || 0) + 1);
  }
  let hits = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const g = b.slice(i, i + 2);
    const n = grams.get(g) || 0;
    if (n > 0) { grams.set(g, n - 1); hits++; }
  }
  return (2 * hits) / (a.length - 1 + b.length - 1);
}

// --- blocklist ---------------------------------------------------------------

// Names that are clearly not companies — saves an LLM look. Kept minimal and
// safe; anything borderline (research institutes, VC funds) goes to the LLM.
const BLOCK_RE = new RegExp(
  "\\b(army|navy|air force|space force|marine corps|coast guard|national guard|" +
  "ministry|ministries|department|pentagon|nato|darpa|dod|mod|" +
  "government|parliament|congress|senate|commission|armed forces)\\b", "i");

export const isBlocklisted = (name) => BLOCK_RE.test(String(name));

// --- indexes + matching --------------------------------------------------------

// companies: [{id,name}], aliases: [{company_id,alias}]
export function buildCompanyIndex(companies, aliases) {
  const exact = new Map();       // lower(name|alias) → id
  const normed = new Map();      // normCompany(name|alias) → [{id, name}]
  const add = (map, key, val, srcName) => {
    if (!key) return;
    if (map === exact) { if (!exact.has(key)) exact.set(key, val); return; }
    if (srcName && !normKeyOk(srcName, key)) return;   // too generic to trust
    const arr = normed.get(key) || [];
    arr.push(val);
    normed.set(key, arr);
  };
  for (const c of companies) {
    add(exact, c.name.toLowerCase(), c.id);
    add(normed, normCompany(c.name), { id: c.id, name: c.name }, c.name);
  }
  for (const a of aliases) {
    add(exact, String(a.alias).toLowerCase(), a.company_id);
    add(normed, normCompany(a.alias), { id: a.company_id, name: String(a.alias) }, String(a.alias));
  }
  // Catalogue names often carry parenthetical notes — "Raytheon (RTX)",
  // "BlueHalo (AeroVironment)", "Wing (Alphabet Inc.)". Index the part before
  // the parens, and the inside as a weak alias when it isn't already a company
  // of its own (so "Insitu (Boeing)" never captures the tag "Boeing").
  for (const c of companies) {
    const m = c.name.match(/^([^(]{2,}?)\s*\(([^)]+)\)/);
    if (!m) continue;
    add(normed, normCompany(m[1]), { id: c.id, name: m[1].trim() }, m[1]);
    const innerLo = m[2].trim().toLowerCase();
    if (!exact.has(innerLo)) add(normed, normCompany(m[2]), { id: c.id, name: m[2].trim() }, m[2]);
  }
  return { exact, normed, companies };
}

export function buildProductIndex(products) {
  const exact = new Map();       // lower(name) → id
  const compact = new Map();     // normProduct(name) → id
  for (const p of products) {
    const lo = p.name.toLowerCase();
    if (!exact.has(lo)) exact.set(lo, p.id);
    const key = normProduct(p.name);
    if (!compact.has(key)) compact.set(key, p.id);
  }
  return { exact, compact };
}

// Try to match one company tag. Returns { id, reason } or null.
export function matchCompany(tag, index) {
  const lo = tag.toLowerCase();
  const hit = index.exact.get(lo);
  if (hit) return { id: hit, reason: "exact" };

  const norm = normCompany(tag);
  const cands = normKeyOk(tag, norm) ? index.normed.get(norm) : null;
  if (cands?.length) {
    // On collision (e.g. parent + subsidiary normalising alike) pick the
    // candidate whose raw name is closest to the raw tag.
    const best = cands.length === 1 ? cands[0]
      : cands.reduce((a, b) => (dice(lo, a.name.toLowerCase()) >= dice(lo, b.name.toLowerCase()) ? a : b));
    return { id: best.id, reason: "normalized" };
  }

  // Token-prefix: "General Atomics Aeronautical Systems" ⊃ "General Atomics".
  // The shorter side must have ≥2 tokens so "Wing" can't swallow "Wingtra".
  const tagTok = norm.split(" ");
  let prefix = null;
  for (const [key, arr] of index.normed) {
    const keyTok = key.split(" ");
    const [shorter, longer] = keyTok.length <= tagTok.length ? [keyTok, tagTok] : [tagTok, keyTok];
    if (shorter.length < 2) continue;
    if (shorter.every((t, i) => longer[i] === t)) {
      if (!prefix || key.length > prefix.key.length) prefix = { key, id: arr[0].id };
    }
  }
  if (prefix) return { id: prefix.id, reason: "prefix" };

  // Conservative fuzzy: very high bigram similarity AND same first token
  // (catches spelling variants, not different companies).
  let best = null;
  for (const [key, arr] of index.normed) {
    if (key.split(" ")[0] !== tagTok[0]) continue;
    const s = dice(norm, key);
    if (s >= 0.9 && (!best || s > best.s)) best = { s, id: arr[0].id };
  }
  if (best) return { id: best.id, reason: `fuzzy:${best.s.toFixed(2)}` };
  return null;
}

export function matchProduct(tag, index) {
  const hit = index.exact.get(tag.toLowerCase());
  if (hit) return { id: hit, reason: "exact" };
  const c = index.compact.get(normProduct(tag));
  if (c) return { id: c, reason: "normalized" };
  return null;
}

// --- LLM gate ------------------------------------------------------------------

const COMPANY_TYPES = ["prime", "tier1", "tier2", "sme", "startup", "state_owned",
  "research_institute", "university", "jv", "division", "distributor", "other"];
const PRODUCT_CATEGORIES = ["UAV", "Sensor", "Counter-UAS", "Effector", "Software", "Other"];

const GATE_SYSTEM = [
  "You vet entity names extracted from defence/UAV news for a catalogue of",
  "defence-technology companies and products (UAVs, counter-UAS, sensors,",
  "effectors, defence software). For each name decide if it belongs.",
  "",
  "COMPANIES — ok=true for real organisations, with a kind:",
  "  kind='company': manufacturers, defence firms, startups, integrators,",
  "    suppliers, distributors, operators, research institutes, universities.",
  "  kind='investor': VC/PE/investment funds and similar investors.",
  "  kind='institution': civilian government agencies and labs, regulators,",
  "    air-navigation service providers, intergovernmental bodies, test",
  "    centres, industry associations, think tanks, foundations.",
  "ok=false for: militaries and armed services, defence ministries, media",
  "outlets, event/exercise names, people, places, and generic phrases.",
  "When ok=true give:",
  "  canonical: the official short name (e.g. 'Anduril Industries' → 'Anduril');",
  "  country: HQ country full English name (e.g. 'United States') or null;",
  "  website: official https:// URL only if you are certain, else null;",
  `  type (kind='company' only): one of ${COMPANY_TYPES.join("|")} or null.`,
  "",
  "PRODUCTS — ok=true only for a DISTINCT named model of: an uncrewed aircraft",
  "or loitering munition (category 'UAV'); a sensor/radar/EO system ('Sensor');",
  "a counter-drone system ('Counter-UAS'); a missile/munition/gun ('Effector');",
  "defence software ('Software'); or another uncrewed/defence-tech system",
  "('Other'). ok=false for: crewed aircraft, ships, ground vehicles, generic",
  "categories ('FPV drones', 'counter-drone systems'), programmes, and names",
  "you cannot identify. When ok=true give:",
  `  canonical, category (one of ${PRODUCT_CATEGORIES.join("|")}),`,
  "  maker: manufacturer company name or null; country: full English name or null.",
  "",
  "Judge from the name and the article titles it appeared in. Respond with one",
  "JSON object and nothing else:",
  '{"companies":[{"name","ok","kind","canonical","country","website","type"}],',
  ' "products":[{"name","ok","canonical","category","maker","country"}]}',
].join("\n");

const coerce = (v, allowed) => (allowed.includes(v) ? v : null);
const str = (v, max = 120) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const url = (v) => {
  const s = str(v, 200);
  return s && /^https?:\/\/[^\s]+\.[a-z]{2,}/i.test(s) ? s : null;
};

// names: { companies: [{name, seen_in:[]}], products: [{name, seen_in:[]}] }
// Returns { companies: Map(lowerName → verdict|null), products: Map(...) }.
// A null verdict (LLM missing/failed/omitted the name) means "undecided" —
// the caller must NOT cache it, so it is retried next run.
export async function llmGate(names) {
  const empty = { companies: new Map(), products: new Map() };
  if (!names.companies.length && !names.products.length) return empty;
  if (!hasApiKey()) return empty;

  const reply = await anthropicComplete({
    system: GATE_SYSTEM,
    user: JSON.stringify(names),
    maxTokens: 8000,
  });
  const parsed = parseJsonObject(reply);
  if (!parsed) throw new Error("LLM gate: unparseable response");

  const out = { companies: new Map(), products: new Map() };
  for (const c of Array.isArray(parsed.companies) ? parsed.companies : []) {
    const key = str(c?.name)?.toLowerCase();
    if (!key) continue;
    out.companies.set(key, c.ok === true ? {
      ok: true,
      kind: coerce(c.kind, ["company", "investor", "institution"]) || "company",
      canonical: str(c.canonical) || str(c.name),
      country: str(c.country, 60),
      website: url(c.website),
      type: coerce(c.type, COMPANY_TYPES),
    } : { ok: false });
  }
  for (const p of Array.isArray(parsed.products) ? parsed.products : []) {
    const key = str(p?.name)?.toLowerCase();
    if (!key) continue;
    const category = coerce(p?.category, PRODUCT_CATEGORIES);
    out.products.set(key, p.ok === true && category ? {
      ok: true,
      canonical: str(p.canonical) || str(p.name),
      category,
      maker: str(p.maker),
      country: str(p.country, 60),
    } : { ok: false });
  }
  return out;
}
