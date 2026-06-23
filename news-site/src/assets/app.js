// Client feed: reads from Supabase (anon key, read-only via RLS) so the archive,
// search and tag filters work on the full dataset — not just the build-time slice.
const CFG = window.XSONOMY || {};
const PAGE = CFG.pageSize || 24;

const THEME_CHIPS = [
  ["counter-uas", "Counter-UAS"], ["critical-infra", "Critical infra"],
  ["eu-regulatory", "EU / regulatory"], ["c2-sensors", "C2 / sensors"],
  ["contract-intel", "Contracts / M&A"], ["ukraine", "Ukraine"],
  ["swarm", "Swarms"], ["maritime", "Maritime"],
];

const feedEl = document.getElementById("feed");
const statusEl = document.getElementById("status");
const moreBtn = document.getElementById("more");
const qEl = document.getElementById("q");
const tagbar = document.getElementById("tagbar");

let offset = 0, activeTag = null, query = "", busy = false, done = false;

// ---- rendering ----
const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmtDate = (s) => {
  if (!s) return "";
  const d = new Date(s); if (isNaN(d)) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};
function card(a) {
  const tags = (a.tags || []).slice(0, 3).map((t) => `<span>${esc(t)}</span>`).join("");
  const thumb = a.image_url
    ? `<div class="thumb" style="background-image:url('${esc(a.image_url)}')"></div>`
    : `<div class="thumb empty" aria-hidden="true">◇</div>`;
  return `<a class="card" href="${esc(a.url)}" target="_blank" rel="noopener nofollow">
    ${thumb}
    <div class="body">
      <div class="meta"><span class="src">${esc(a.source)}</span><span>${fmtDate(a.published_at)}</span></div>
      <h3>${esc(a.title)}</h3>
      ${a.summary ? `<p>${esc(a.summary)}</p>` : ""}
      <div class="tags">${tags}</div>
    </div>
  </a>`;
}

// ---- data ----
function buildUrl() {
  const u = new URL(`${CFG.supabaseUrl}/rest/v1/articles`);
  u.searchParams.set("select",
    "url,title,summary,image_url,source,source_url,country,lang,tags,published_at");
  u.searchParams.set("order", "published_at.desc.nullslast");
  u.searchParams.set("limit", String(PAGE));
  u.searchParams.set("offset", String(offset));
  if (activeTag) u.searchParams.set("tags", `cs.{${activeTag}}`);
  if (query.trim()) {
    const q = query.trim().replace(/[%,()]/g, " ");
    u.searchParams.set("or", `(title.ilike.*${q}*,summary.ilike.*${q}*)`);
  }
  return u;
}
async function fetchPage() {
  const res = await fetch(buildUrl(), {
    headers: { apikey: CFG.anonKey, Authorization: `Bearer ${CFG.anonKey}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function load(reset = false) {
  if (busy) return;
  busy = true;
  if (reset) { offset = 0; done = false; feedEl.innerHTML = ""; }
  statusEl.textContent = "Loading…";
  moreBtn.hidden = true;
  try {
    const rows = await fetchPage();
    feedEl.insertAdjacentHTML("beforeend", rows.map(card).join(""));
    offset += rows.length;
    done = rows.length < PAGE;
    statusEl.textContent = feedEl.children.length ? "" : "No matching headlines.";
    moreBtn.hidden = done || !feedEl.children.length;
  } catch (e) {
    statusEl.textContent = "Could not load the feed. Please retry.";
    console.error(e);
  } finally {
    busy = false;
  }
}

// ---- controls ----
function buildChips() {
  tagbar.innerHTML = THEME_CHIPS
    .map(([id, label]) => `<button class="chip" data-tag="${id}">${label}</button>`).join("");
  tagbar.addEventListener("click", (e) => {
    const b = e.target.closest(".chip"); if (!b) return;
    const tag = b.dataset.tag;
    activeTag = activeTag === tag ? null : tag;
    [...tagbar.children].forEach((c) => c.classList.toggle("on", c.dataset.tag === activeTag));
    load(true);
  });
}
let qTimer;
qEl.addEventListener("input", () => {
  clearTimeout(qTimer);
  qTimer = setTimeout(() => { query = qEl.value; load(true); }, 300);
});
moreBtn.addEventListener("click", () => load(false));

// ---- boot ----
if (!CFG.supabaseUrl || !CFG.anonKey) {
  statusEl.textContent = "Feed config missing (SUPABASE_URL / SUPABASE_ANON_KEY not set at build).";
} else {
  buildChips();
  load(true); // replaces the server-rendered first page with a live query
}
