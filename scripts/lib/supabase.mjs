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

// Read the most recent N rows (used by the build step).
export async function fetchRecent(limit = 500) {
  const { url, serviceKey, anonKey } = sbConfig();
  const key = serviceKey || anonKey;
  if (!key) throw new Error("Need SUPABASE_SERVICE_KEY or SUPABASE_ANON_KEY to read.");
  const q = new URL(`${url}/rest/v1/articles`);
  q.searchParams.set("select",
    "url,title,summary,image_url,source,source_url,country,lang,tags,published_at");
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
