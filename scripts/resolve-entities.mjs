// Entity resolver: turn the LLM tag strings on articles (companies[]/products[])
// into real catalogue rows and junction links, growing the catalogue with every
// new company/product the news mentions.
//
//   node scripts/resolve-entities.mjs              # resolve + create + link
//   node scripts/resolve-entities.mjs --dry        # full preview, NO writes
//   node scripts/resolve-entities.mjs --max 50     # cap articles this run
//   node scripts/resolve-entities.mjs --no-llm     # match/link only, never create
//
// Per article tag:
//   1. cache hit in tag_resolutions?          → reuse the previous decision
//   2. matches an existing company/product?   → link (exact/alias/normalized/fuzzy)
//   3. blocklisted (army/ministry/NATO/…)?    → reject, cache
//   4. otherwise → ONE batched LLM call vets all new names this run:
//        real company → INSERT companies (publication_status='live') + alias
//        real product → INSERT products (category from LLM, maker linked)
//        junk (agencies, fighter jets, generic phrases) → reject, cache
//   5. write article_companies / article_products; stamp entities_resolved_at.
//
// Cost guard: the only LLM usage is step 4, capped by LLM_GATE_MAX names per
// kind per run; every verdict is cached in tag_resolutions so no name is ever
// sent twice. Articles with undecided tags are left unstamped and retried.
//
// New companies get enrichment_status=NULL on purpose — the existing
// enrich-companies / enrich-wikidata pipelines pick them up from there.
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_KEY; ANTHROPIC_API_KEY (for creation).

import { loadDotenv } from "./lib/http.mjs";
import {
  fetchUnresolvedArticles, fetchAllRows, insertRows,
  deleteTagResolutions, stampEntitiesResolved,
} from "./lib/supabase.mjs";
import {
  buildCompanyIndex, buildProductIndex, matchCompany, matchProduct,
  isBlocklisted, llmGate, slugify,
} from "./lib/resolve.mjs";
import { hasApiKey } from "./lib/analyze.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const NO_LLM = args.includes("--no-llm");
const maxIx = args.indexOf("--max");
const MAX_ARTICLES = maxIx >= 0 ? Number(args[maxIx + 1]) : Number(process.env.RESOLVE_MAX || 150);
const LLM_GATE_MAX = Number(process.env.LLM_GATE_MAX || 40);   // new names per kind per run
const MAX_SOURCE_URLS = 3;

async function main() {
  await loadDotenv();

  const articles = await fetchUnresolvedArticles(MAX_ARTICLES);
  if (!articles.length) { console.log("Nothing to resolve."); return; }
  console.log(`Resolving entities for ${articles.length} article(s)…`);

  // --- load catalogue + cache into memory (a few thousand small rows) --------
  const [companies, aliases, products, cache] = await Promise.all([
    fetchAllRows("companies", "id,name,slug"),
    fetchAllRows("company_aliases", "company_id,alias"),
    fetchAllRows("products", "id,name,slug,company_id"),
    fetchAllRows("tag_resolutions", "id,kind,tag,decision,entity_id"),
  ]);
  const companyIndex = buildCompanyIndex(companies, aliases);
  const productIndex = buildProductIndex(products);
  const slugsTaken = new Set([...companies.map((c) => c.slug), ...products.map((p) => p.slug)]);
  const companyIds = new Set(companies.map((c) => c.id));
  const productIds = new Set(products.map((p) => p.id));

  // Cache lookup; heal entries pointing at rows that were deleted since.
  const cached = { company: new Map(), product: new Map() };
  const staleCache = [];
  for (const r of cache) {
    const alive = r.decision === "rejected" ||
      (r.kind === "company" ? companyIds.has(r.entity_id) : productIds.has(r.entity_id));
    if (alive) cached[r.kind].set(String(r.tag).toLowerCase(), r);
    else staleCache.push(r.id);
  }
  if (staleCache.length) {
    console.log(`Healing ${staleCache.length} stale cache entrie(s) (entity deleted).`);
    if (!DRY) await deleteTagResolutions(staleCache);
  }

  // --- pass 1: decide every distinct tag -------------------------------------
  // decisions: lowerTag → { entityId } | { rejected } | undefined (unknown yet)
  const decisions = { company: new Map(), product: new Map() };
  const newCacheRows = [];
  const unknown = { company: new Map(), product: new Map() };  // lowerTag → {name, seen_in[], urls[]}

  const stats = { cache: 0, matched: 0, blocked: 0, created: 0, llmRejected: 0, undecided: 0 };

  for (const kind of ["company", "product"]) {
    for (const art of articles) {
      for (const raw of (kind === "company" ? art.companies : art.products) || []) {
        const tag = String(raw).trim();
        if (!tag) continue;
        const lo = tag.toLowerCase();
        if (decisions[kind].has(lo)) continue;

        const hit = cached[kind].get(lo);
        if (hit) {
          decisions[kind].set(lo, hit.decision === "rejected" ? { rejected: true } : { entityId: hit.entity_id });
          stats.cache++;
          continue;
        }
        const m = kind === "company" ? matchCompany(tag, companyIndex) : matchProduct(tag, productIndex);
        if (m) {
          decisions[kind].set(lo, { entityId: m.id });
          newCacheRows.push({ kind, tag, decision: "matched", entity_id: m.id, reason: m.reason });
          stats.matched++;
          continue;
        }
        if (kind === "company" && isBlocklisted(tag)) {
          decisions[kind].set(lo, { rejected: true });
          newCacheRows.push({ kind, tag, decision: "rejected", entity_id: null, reason: "blocklist" });
          stats.blocked++;
          continue;
        }
        // Never seen: queue for the LLM gate with a bit of context.
        const u = unknown[kind].get(lo) || { name: tag, seen_in: [], urls: [] };
        if (u.seen_in.length < 2 && art.title) u.seen_in.push(art.title);
        if (u.urls.length < MAX_SOURCE_URLS && art.url) u.urls.push(art.url);
        unknown[kind].set(lo, u);
      }
    }
  }

  // --- pass 2: LLM gate for brand-new names ----------------------------------
  const gateInput = {
    companies: [...unknown.company.values()].slice(0, LLM_GATE_MAX).map(({ name, seen_in }) => ({ name, seen_in })),
    products: [...unknown.product.values()].slice(0, LLM_GATE_MAX).map(({ name, seen_in }) => ({ name, seen_in })),
  };
  const nNew = gateInput.companies.length + gateInput.products.length;
  let verdicts = { companies: new Map(), products: new Map() };
  if (nNew && !NO_LLM && hasApiKey()) {
    console.log(`LLM gate: vetting ${gateInput.companies.length} company / ${gateInput.products.length} product name(s)…`);
    try {
      verdicts = await llmGate(gateInput);
    } catch (e) {
      console.log(`LLM gate failed (will retry next run): ${e.message}`);
    }
  } else if (nNew) {
    console.log(`Skipping LLM gate for ${nNew} new name(s): ${NO_LLM ? "--no-llm" : "ANTHROPIC_API_KEY not set"}.`);
  }

  // --- pass 3: build creation payloads ---------------------------------------
  const uniqueSlug = (name) => {
    const base = slugify(name);
    let slug = base, i = 2;
    while (slugsTaken.has(slug)) slug = `${base}-${i++}`;
    slugsTaken.add(slug);
    return slug;
  };

  // Companies first, so product maker links can resolve against them.
  const companyInserts = [];        // rows for POST /companies
  const companyInsertMeta = [];     // parallel: { tags:[lowerTag…], aliases:[names…] }
  const canonSeen = new Map();      // lower(canonical) → index into companyInserts
  const sideRows = { investors: new Map(), institutions: new Map() };  // slug → row
  for (const [lo, u] of unknown.company) {
    const v = verdicts.companies.get(lo);
    if (!v) { stats.undecided++; continue; }                    // no verdict → retry next run
    if (!v.ok) {
      decisions.company.set(lo, { rejected: true });
      newCacheRows.push({ kind: "company", tag: u.name, decision: "rejected", entity_id: null, reason: "llm:not_company" });
      stats.llmRejected++;
      continue;
    }
    // Investors and government/quasi-government bodies live in their own
    // side tables, not the companies registry. Cached as 'rejected' so the
    // tag never creates a companies row; the side insert is best-effort.
    if (v.kind !== "company") {
      const table = v.kind === "investor" ? "investors" : "institutions";
      const slug = slugify(v.canonical);
      if (!sideRows[table].has(slug)) {
        sideRows[table].set(slug, {
          name: v.canonical, slug, hq_country: v.country, website: v.website,
          source_urls: u.urls.slice(0, MAX_SOURCE_URLS),
        });
      }
      decisions.company.set(lo, { rejected: true });
      newCacheRows.push({ kind: "company", tag: u.name, decision: "rejected", entity_id: null, reason: `llm:${v.kind}` });
      stats[table] = (stats[table] || 0) + 1;
      continue;
    }
    // The canonical form may already exist ("RTX Collins Aerospace" → "Collins Aerospace").
    const existing = matchCompany(v.canonical, companyIndex);
    if (existing) {
      decisions.company.set(lo, { entityId: existing.id });
      newCacheRows.push({ kind: "company", tag: u.name, decision: "matched", entity_id: existing.id, reason: `llm-canonical:${existing.reason}` });
      stats.matched++;
      continue;
    }
    const canonLo = v.canonical.toLowerCase();
    let ix = canonSeen.get(canonLo);
    if (ix === undefined) {
      ix = companyInserts.length;
      canonSeen.set(canonLo, ix);
      companyInserts.push({
        name: v.canonical,
        slug: uniqueSlug(v.canonical),
        hq_country: v.country,
        website: v.website,
        company_type: v.type,
        publication_status: "live",
        confidence: "low",
        source_urls: u.urls.slice(0, MAX_SOURCE_URLS),
        // enrichment_status left NULL → picked up by the enrichment pipelines
      });
      companyInsertMeta.push({ tags: [], aliases: [] });
    }
    companyInsertMeta[ix].tags.push(lo);
    if (canonLo !== lo) companyInsertMeta[ix].aliases.push(u.name);
  }

  const productPlans = [];          // { row (sans company_id), makerName, tags: [{lo, tag}] }
  const prodCanonSeen = new Map();  // lower(canonical) → plan (dedupe within the run)
  for (const [lo, u] of unknown.product) {
    const v = verdicts.products.get(lo);
    if (!v) { stats.undecided++; continue; }
    if (!v.ok) {
      decisions.product.set(lo, { rejected: true });
      newCacheRows.push({ kind: "product", tag: u.name, decision: "rejected", entity_id: null, reason: "llm:not_catalogue_product" });
      stats.llmRejected++;
      continue;
    }
    const existing = matchProduct(v.canonical, productIndex);
    if (existing) {
      decisions.product.set(lo, { entityId: existing.id });
      newCacheRows.push({ kind: "product", tag: u.name, decision: "matched", entity_id: existing.id, reason: "llm-canonical" });
      stats.matched++;
      continue;
    }
    // Two tags can canonicalise to the same product ("CROWS" + "Common
    // Remotely Operated Weapon Station") — create once, cache both tags.
    const canonLo = v.canonical.toLowerCase();
    const dup = prodCanonSeen.get(canonLo);
    if (dup) { dup.tags.push({ lo, tag: u.name }); continue; }
    const plan = {
      tags: [{ lo, tag: u.name }], makerName: v.maker,
      row: {
        name: v.canonical,
        slug: uniqueSlug(v.canonical),
        category: v.category,
        country: v.country,
        publication_status: "live",
        confidence: "low",
        source_urls: u.urls.slice(0, MAX_SOURCE_URLS),
      },
    };
    prodCanonSeen.set(canonLo, plan);
    productPlans.push(plan);
  }

  // --- report / dry-run -------------------------------------------------------
  if (companyInserts.length) {
    console.log(`\nNew companies (${companyInserts.length}):`);
    for (const c of companyInserts) console.log(`  + ${c.name}  [${c.company_type || "?"}, ${c.hq_country || "?"}]  /${c.slug}`);
  }
  if (productPlans.length) {
    console.log(`\nNew products (${productPlans.length}):`);
    for (const p of productPlans) console.log(`  + ${p.row.name}  [${p.row.category}]  maker: ${p.makerName || "—"}`);
  }
  for (const table of ["investors", "institutions"]) {
    if (!sideRows[table].size) continue;
    console.log(`\nNew ${table} (${sideRows[table].size}):`);
    for (const r of sideRows[table].values()) console.log(`  + ${r.name}  [${r.hq_country || "?"}]`);
  }
  if (DRY) {
    const rej = newCacheRows.filter((r) => r.decision === "rejected");
    if (rej.length) {
      console.log(`\nRejected (${rej.length}):`);
      for (const r of rej) console.log(`  - [${r.kind}] ${r.tag}  (${r.reason})`);
    }
    console.log(`\n--dry: no writes. ${JSON.stringify(stats)}`);
    return;
  }

  // --- pass 4: write ----------------------------------------------------------
  // Ordering matters for crash-safety: entity creations first (we need the
  // ids), then the decision cache (so a later failure never causes the LLM to
  // re-vet — and possibly contradict — a decision), then best-effort links.

  // 4a. create companies (need ids back).
  const aliasRows = [];
  if (companyInserts.length) {
    const created = await insertRows("companies", companyInserts, { returning: true });
    created.forEach((row, ix) => {
      const meta = companyInsertMeta[ix];
      for (const lo of meta.tags) decisions.company.set(lo, { entityId: row.id });
      for (const lo of meta.tags) {
        const u = unknown.company.get(lo);
        newCacheRows.push({ kind: "company", tag: u.name, decision: "created", entity_id: row.id, reason: "llm" });
      }
      for (const alias of meta.aliases) aliasRows.push({ company_id: row.id, alias, type: "aka" });
      // Extend the in-memory index so product maker links can hit new companies.
      companyIndex.exact.set(row.name.toLowerCase(), row.id);
    });
    stats.created += created.length;
    console.log(`Created ${created.length} company row(s).`);
  }

  // 4b. create products with maker links.
  const pcRows = [];
  if (productPlans.length) {
    const rows = productPlans.map((p) => {
      const maker = p.makerName ? matchCompany(p.makerName, companyIndex) : null;
      return { ...p.row, company_id: maker ? maker.id : null };
    });
    const created = await insertRows("products", rows, { returning: true });
    created.forEach((row, ix) => {
      const plan = productPlans[ix];
      for (const { lo, tag } of plan.tags) {
        decisions.product.set(lo, { entityId: row.id });
        newCacheRows.push({ kind: "product", tag, decision: "created", entity_id: row.id, reason: "llm" });
      }
      if (row.company_id) pcRows.push({ product_id: row.id, company_id: row.company_id, role: "manufacturer" });
    });
    stats.created += created.length;
    console.log(`Created ${created.length} product row(s) (${pcRows.length} maker link(s)).`);
  }

  // 4c. persist the decision cache FIRST (ignore races on unique (kind, tag)).
  if (newCacheRows.length) {
    await insertRows("tag_resolutions", newCacheRows, { onConflict: "kind,tag", ignoreDuplicates: true });
  }

  // 4d. best-effort link tables — a failure here must not abort the run.
  const warn = (what) => (e) => console.log(`WARN: ${what} failed: ${e.message}`);
  await insertRows("company_aliases", aliasRows, { onConflict: "company_id,alias", ignoreDuplicates: true })
    .catch(warn("company_aliases insert"));
  await insertRows("product_companies", pcRows, { onConflict: "product_id,company_id,role", ignoreDuplicates: true })
    .catch(warn("product_companies insert"));
  for (const table of ["investors", "institutions"]) {
    await insertRows(table, [...sideRows[table].values()], { onConflict: "slug", ignoreDuplicates: true })
      .catch(warn(`${table} insert`));
  }

  // 4e. junctions + stamp. An article is stamped only when EVERY tag got a
  // decision AND its junction writes succeeded; otherwise it's retried.
  const acRows = [], apRows = [], doneIds = [];
  for (const art of articles) {
    let complete = true;
    for (const raw of art.companies || []) {
      const d = decisions.company.get(String(raw).trim().toLowerCase());
      if (!d) { complete = false; continue; }
      if (d.entityId) acRows.push({ article_id: art.id, company_id: d.entityId });
    }
    for (const raw of art.products || []) {
      const d = decisions.product.get(String(raw).trim().toLowerCase());
      if (!d) { complete = false; continue; }
      if (d.entityId) apRows.push({ article_id: art.id, product_id: d.entityId });
    }
    if (complete) doneIds.push(art.id);
  }
  try {
    await insertRows("article_companies", acRows, { onConflict: "article_id,company_id", ignoreDuplicates: true });
    await insertRows("article_products", apRows, { onConflict: "article_id,product_id", ignoreDuplicates: true });
    await stampEntitiesResolved(doneIds);
  } catch (e) {
    console.log(`WARN: junction/stamp failed (articles stay queued for retry): ${e.message}`);
    doneIds.length = 0;
  }

  console.log(`\nDone. ${doneIds.length}/${articles.length} article(s) resolved; ` +
    `${acRows.length} company link(s), ${apRows.length} product link(s). ` +
    JSON.stringify(stats));
}

main().catch((e) => { console.error(e); process.exit(1); });
