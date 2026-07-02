// Tiny Supabase REST helpers (no SDK — just fetch against PostgREST).
// Writes use the SERVICE ROLE key (bypasses RLS); reads can use anon or service.

function env(name, required = true) {
  const v = process.env[name];
  if (!v && required) throw new Error(`${name} is not set.`);
  return v;
}

export function sbConfig() {
  return {
    url: env("SUPABASE_URL").replace(/\/+$/, ""),
    serviceKey: env("SUPABASE_SERVICE_KEY", false),
    anonKey: env("SUPABASE_ANON_KEY", false),
  };
}

// Upsert rows on conflict(url). Chunks to keep request bodies reasonable.
export async function upsertArticles(rows, { chunk = 200 } = {}) {
  const { url, serviceKey } = sbConfig();
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_KEY is required for writes.");
  let written = 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const batch = rows.slice(i, i + chunk);
    const res = await fetch(`${url}/rest/v1/articles?on_conflict=url`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      throw new Error(`Supabase upsert ${res.status}: ${await res.text()}`);
    }
    written += batch.length;
  }
  return written;
}

// Given a list of URLs, return the Set of those already analyzed
// (analyzed_at IS NOT NULL). Used by ingest to skip work it's already done.
// Chunks the IN() list to keep URLs out of overlong query strings.
export async function fetchAnalyzedUrls(urls, { chunk = 100 } = {}) {
  const { url, serviceKey, anonKey } = sbConfig();
  const key = serviceKey || anonKey;
  if (!key) throw new Error("Need SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY to read.");
  const done = new Set();
  for (let i = 0; i < urls.length; i += chunk) {
    const batch = urls.slice(i, i + chunk);
    const inList = batch.map((u) => `"${u.replace(/"/g, '""')}"`).join(",");
    const q = new URL(`${url}/rest/v1/articles`);
    q.searchParams.set("select", "url");
    q.searchParams.set("analyzed_at", "not.is.null");
    q.searchParams.set("url", `in.(${inList})`);
    const res = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!res.ok) throw new Error(`Supabase read ${res.status}: ${await res.text()}`);
    for (const row of await res.json()) done.add(row.url);
  }
  return done;
}

// Fetch a page of not-yet-analyzed rows (analyzed_at IS NULL), newest first.
// Because the backfill stamps analyzed_at as it goes, calling this repeatedly
// with offset 0 walks the whole table without needing pagination bookkeeping.
export async function fetchUnanalyzedBatch(limit = 50) {
  const { url, serviceKey, anonKey } = sbConfig();
  const key = serviceKey || anonKey;
  if (!key) throw new Error("Need SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY to read.");
  const q = new URL(`${url}/rest/v1/articles`);
  q.searchParams.set("select", "url,title,summary");
  q.searchParams.set("analyzed_at", "is.null");
  q.searchParams.set("order", "published_at.desc.nullslast");
  q.searchParams.set("limit", String(limit));
  const res = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Supabase read ${res.status}: ${await res.text()}`);
  return res.json();
}

// Count rows still needing analysis (analyzed_at IS NULL).
export async function countUnanalyzed() {
  const { url, serviceKey, anonKey } = sbConfig();
  const key = serviceKey || anonKey;
  const res = await fetch(`${url}/rest/v1/articles?select=id&analyzed_at=is.null`, {
    method: "HEAD",
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" },
  });
  const cr = res.headers.get("content-range") || "";
  const m = cr.match(/\/(\d+)$/);
  return m ? Number(m[1]) : null;
}

// Patch a single article's analysis result by URL. Uses HTTP PATCH (= UPDATE),
// not upsert, so NOT NULL columns we don't touch are never disturbed. Always
// stamps analyzed_at so the row won't be re-analyzed on the next run.
export async function patchAnalysis(articleUrl, { companies = [], products = [] } = {}) {
  const { url, serviceKey } = sbConfig();
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_KEY is required for writes.");
  const q = new URL(`${url}/rest/v1/articles`);
  q.searchParams.set("url", `eq.${articleUrl}`);
  const res = await fetch(q, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ companies, products, analyzed_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`Supabase patch ${res.status}: ${await res.text()}`);
  return true;
}

// ---------------------------------------------------------------------------
// Company catalogue enrichment (public.companies)
// ---------------------------------------------------------------------------

// Fetch a page of companies not yet enriched (enrichment_status IS NULL), with
// all columns so the caller can avoid overwriting curated values. Resumable:
// rows drop out once enrichment_status is stamped, so re-call with no offset.
export async function fetchUnenrichedCompanies(limit = 25) {
  const { url, serviceKey, anonKey } = sbConfig();
  const key = serviceKey || anonKey;
  if (!key) throw new Error("Need SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY to read.");
  const q = new URL(`${url}/rest/v1/companies`);
  q.searchParams.set("select", "*");
  q.searchParams.set("enrichment_status", "is.null");
  q.searchParams.set("order", "name.asc");
  q.searchParams.set("limit", String(limit));
  const res = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Supabase read ${res.status}: ${await res.text()}`);
  return res.json();
}

// Count companies still needing enrichment.
export async function countUnenriched() {
  const { url, serviceKey, anonKey } = sbConfig();
  const key = serviceKey || anonKey;
  const res = await fetch(`${url}/rest/v1/companies?select=id&enrichment_status=is.null`, {
    method: "HEAD",
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" },
  });
  const cr = res.headers.get("content-range") || "";
  const m = cr.match(/\/(\d+)$/);
  return m ? Number(m[1]) : null;
}

// Patch one company by id. `fields` is the (already emptiness-filtered) payload;
// always stamps enrichment_status + confidence + updated_at so it won't re-run.
export async function patchCompany(id, fields = {}, { confidence = null, status = "llm" } = {}) {
  const { url, serviceKey } = sbConfig();
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_KEY is required for writes.");
  const q = new URL(`${url}/rest/v1/companies`);
  q.searchParams.set("id", `eq.${id}`);
  const body = { ...fields, enrichment_status: status, updated_at: new Date().toISOString() };
  if (confidence) body.confidence = confidence;
  const res = await fetch(q, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase patch ${res.status}: ${await res.text()}`);
  return true;
}

// Fetch a page of companies (all columns), name-ordered — for full-catalogue
// passes such as the Wikidata enricher. Paginate with offset.
export async function fetchCompaniesPage(limit = 50, offset = 0) {
  const { url, serviceKey, anonKey } = sbConfig();
  const key = serviceKey || anonKey;
  if (!key) throw new Error("Need SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY to read.");
  const q = new URL(`${url}/rest/v1/companies`);
  q.searchParams.set("select", "*");
  q.searchParams.set("order", "name.asc");
  q.searchParams.set("limit", String(limit));
  q.searchParams.set("offset", String(offset));
  const res = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Supabase read ${res.status}: ${await res.text()}`);
  return res.json();
}

// Patch arbitrary company fields by id WITHOUT touching enrichment_status/confidence.
// Used by source-specific enrichers (e.g. Wikidata). Stamps updated_at only.
export async function patchCompanyFields(id, fields = {}) {
  if (!Object.keys(fields).length) return false;
  const { url, serviceKey } = sbConfig();
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_KEY is required for writes.");
  const q = new URL(`${url}/rest/v1/companies`);
  q.searchParams.set("id", `eq.${id}`);
  const res = await fetch(q, {
    method: "PATCH",
    headers: {
      apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json", Prefer: "return=minimal",
    },
    body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`Supabase patch ${res.status}: ${await res.text()}`);
  return true;
}

// Read newsletter subscribers (needs the SERVICE key — RLS hides them from anon).
// Used by the digest to merge website sign-ups into the recipient list.
export async function fetchSubscribers() {
  const { url, serviceKey, anonKey } = sbConfig();
  const key = serviceKey || anonKey;
  if (!key) throw new Error("Need SUPABASE_SERVICE_KEY to read subscribers.");
  const q = new URL(`${url}/rest/v1/subscribers`);
  q.searchParams.set("select", "email,name,confirmed");
  q.searchParams.set("order", "created_at.asc");
  q.searchParams.set("limit", "10000");
  const res = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Supabase subscribers ${res.status}: ${await res.text()}`);
  return res.json();
}

// Read the most recent N rows (used by the build step).
export async function fetchRecent(limit = 500) {
  const { url, serviceKey, anonKey } = sbConfig();
  const key = serviceKey || anonKey;
  if (!key) throw new Error("Need SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY to read.");
  const q = new URL(`${url}/rest/v1/articles`);
  q.searchParams.set("select",
    "url,title,summary,image_url,source,source_url,country,lang,tags,companies,products,published_at");
  q.searchParams.set("order", "published_at.desc.nullslast");
  q.searchParams.set("limit", String(limit));
  const res = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Supabase read ${res.status}: ${await res.text()}`);
  return res.json();
}

// Read rows added since an ISO timestamp (by scraped_at = when WE ingested them).
// Used by the email digest to find "new" items.
export async function fetchSince(sinceISO, limit = 500) {
  const { url, serviceKey, anonKey } = sbConfig();
  const key = serviceKey || anonKey;
  if (!key) throw new Error("Need SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY to read.");
  const q = new URL(`${url}/rest/v1/articles`);
  q.searchParams.set("select",
    "url,title,summary,image_url,source,source_url,country,lang,tags,published_at,scraped_at");
  q.searchParams.set("scraped_at", `gte.${sinceISO}`);
  q.searchParams.set("order", "published_at.desc.nullslast");
  q.searchParams.set("limit", String(limit));
  const res = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Supabase read ${res.status}: ${await res.text()}`);
  return res.json();
}

// ---------------------------------------------------------------------------
// Entity resolution (resolve-entities.mjs)
// ---------------------------------------------------------------------------

function writeHeaders(serviceKey, extra = {}) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

// Fetch analyzed-but-unresolved articles (tags present, junctions not built).
export async function fetchUnresolvedArticles(limit = 150) {
  const { url, serviceKey, anonKey } = sbConfig();
  const key = serviceKey || anonKey;
  if (!key) throw new Error("Need SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY to read.");
  const q = new URL(`${url}/rest/v1/articles`);
  q.searchParams.set("select", "id,url,title,companies,products");
  q.searchParams.set("analyzed_at", "not.is.null");
  q.searchParams.set("entities_resolved_at", "is.null");
  q.searchParams.set("order", "published_at.desc.nullslast");
  q.searchParams.set("limit", String(limit));
  const res = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Supabase read ${res.status}: ${await res.text()}`);
  return res.json();
}

// Fetch ALL rows of a table, paginated past PostgREST's per-request cap.
export async function fetchAllRows(table, select, { pageSize = 1000 } = {}) {
  const { url, serviceKey, anonKey } = sbConfig();
  const key = serviceKey || anonKey;
  if (!key) throw new Error("Need SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY to read.");
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const q = new URL(`${url}/rest/v1/${table}`);
    q.searchParams.set("select", select);
    q.searchParams.set("limit", String(pageSize));
    q.searchParams.set("offset", String(offset));
    const res = await fetch(q, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    if (!res.ok) throw new Error(`Supabase read ${table} ${res.status}: ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

// Generic insert. ignoreDuplicates needs onConflict (comma-separated columns).
// returning=true asks PostgREST for the created rows (to get generated ids).
export async function insertRows(table, rows, { onConflict, ignoreDuplicates = false, returning = false } = {}) {
  if (!rows.length) return [];
  const { url, serviceKey } = sbConfig();
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_KEY is required for writes.");
  const q = new URL(`${url}/rest/v1/${table}`);
  if (onConflict) q.searchParams.set("on_conflict", onConflict);
  const prefer = [
    ignoreDuplicates ? "resolution=ignore-duplicates" : null,
    returning ? "return=representation" : "return=minimal",
  ].filter(Boolean).join(",");
  const res = await fetch(q, {
    method: "POST",
    headers: writeHeaders(serviceKey, { Prefer: prefer }),
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Supabase insert ${table} ${res.status}: ${await res.text()}`);
  return returning ? res.json() : [];
}

// Delete resolution-cache rows by id (used to heal stale cache entries).
export async function deleteTagResolutions(ids) {
  if (!ids.length) return;
  const { url, serviceKey } = sbConfig();
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_KEY is required for writes.");
  const q = new URL(`${url}/rest/v1/tag_resolutions`);
  q.searchParams.set("id", `in.(${ids.join(",")})`);
  const res = await fetch(q, { method: "DELETE", headers: writeHeaders(serviceKey, { Prefer: "return=minimal" }) });
  if (!res.ok) throw new Error(`Supabase delete tag_resolutions ${res.status}: ${await res.text()}`);
}

// Stamp entities_resolved_at on fully-processed articles.
export async function stampEntitiesResolved(ids, { chunk = 100 } = {}) {
  if (!ids.length) return;
  const { url, serviceKey } = sbConfig();
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_KEY is required for writes.");
  for (let i = 0; i < ids.length; i += chunk) {
    const q = new URL(`${url}/rest/v1/articles`);
    q.searchParams.set("id", `in.(${ids.slice(i, i + chunk).join(",")})`);
    const res = await fetch(q, {
      method: "PATCH",
      headers: writeHeaders(serviceKey, { Prefer: "return=minimal" }),
      body: JSON.stringify({ entities_resolved_at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error(`Supabase stamp ${res.status}: ${await res.text()}`);
  }
}

// Count total rows (HEAD with count header).
export async function countArticles() {
  const { url, serviceKey, anonKey } = sbConfig();
  const key = serviceKey || anonKey;
  const res = await fetch(`${url}/rest/v1/articles?select=id`, {
    method: "HEAD",
    headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" },
  });
  const cr = res.headers.get("content-range") || "";
  const m = cr.match(/\/(\d+)$/);
  return m ? Number(m[1]) : null;
}
