// xSonomy catalogue — client-side search / filter / render over generated JSON.

// Per-category facet configuration. Field names match the Airtable columns.
const CONFIG = {
  uav: {
    // Subcategory (Multirotor / Fixed-wing / VTOL-Hybrid / FPV / Loitering / …) is the lead
    // filter. Subtype + Frame type are too fragmented to be facets, so Subtype stays searchable.
    search: ["Name", "Company", "Summary", "Subtype"],
    selects: ["Subcategory", "Country", "UAV · Role", "UAV · Class", "UAV · Propulsion", "UAV · Combat-proven"],
    ranges: ["UAV · MTOW (kg)", "UAV · Endurance (min)", "UAV · Range (km)", "UAV · Max speed (km/h)"],
    cardTags: ["Subcategory", "Country"],
  },
  sensors: {
    // Subcategory (Radar / RF detection / Acoustic / EO-IR) is the lead filter — not a tab.
    search: ["Name", "Company", "Summary"],
    selects: ["Subcategory", "Country", "Subtype", "Radar · Band", "Radar · Coverage", "Radar · Use", "Acoustic · Type", "Acoustic · Coverage"],
    ranges: ["Radar · Detection range (km)", "Acoustic · Detection range (km)"],
    cardTags: ["Subcategory", "Country"],
  },
};

// Fields never shown in the public detail view (internal workflow / handled separately).
const HIDDEN = new Set(["Category", "Status", "Enrichment status", "Source URLs", "Image", "Name", "Company", "Summary", "Website", "Confidence"]);

const els = {
  tabs: document.getElementById("tabs"),
  facets: document.getElementById("facets"),
  search: document.getElementById("search"),
  reset: document.getElementById("reset"),
  grid: document.getElementById("grid"),
  count: document.getElementById("count"),
  empty: document.getElementById("empty"),
  meta: document.getElementById("meta"),
  modal: document.getElementById("modal"),
  modalTitle: document.getElementById("modal-title"),
  modalBody: document.getElementById("modal-body"),
  modalClose: document.getElementById("modal-close"),
};

const state = { cat: null, rows: [], cfg: null, filters: null };

const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);

async function boot() {
  const meta = await fetch("data/meta.json").then((r) => r.json());
  els.meta.textContent = `Updated ${new Date(meta.generatedAt).toLocaleDateString()}`;
  const keys = Object.keys(meta.categories);
  keys.forEach((key, i) => {
    const c = meta.categories[key];
    const b = document.createElement("button");
    b.innerHTML = `${c.label}<span class="n">${c.count}</span>`;
    b.onclick = () => selectCat(key, c.file, b);
    els.tabs.appendChild(b);
    if (i === 0) b.dataset.first = "1";
  });
  const first = els.tabs.querySelector("[data-first]");
  if (first) first.click();

  els.search.addEventListener("input", () => { state.filters.search = els.search.value.toLowerCase().trim(); render(); });
  els.reset.addEventListener("click", resetFilters);
  els.modalClose.addEventListener("click", closeModal);
  els.modal.addEventListener("click", (e) => { if (e.target === els.modal) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
}

async function selectCat(key, file, btn) {
  [...els.tabs.children].forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  state.cat = key;
  state.cfg = CONFIG[key];
  state.rows = await fetch(file).then((r) => r.json());
  resetFilters();
  buildFacets();
}

function resetFilters() {
  state.filters = { search: "", selects: {}, ranges: {} };
  els.search.value = "";
  if (state.cfg) buildFacets();
  render();
}

function buildFacets() {
  const { selects, ranges } = state.cfg;
  els.facets.innerHTML = "";

  for (const field of selects) {
    const counts = new Map();
    for (const row of state.rows) for (const val of asArray(row[field])) counts.set(val, (counts.get(val) || 0) + 1);
    if (counts.size === 0) continue;
    const box = document.createElement("div");
    box.className = "facet";
    box.innerHTML = `<h4>${field.replace(/^.*· /, "")}</h4>`;
    [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([val, n]) => {
      const id = `f_${field}_${val}`.replace(/\W/g, "_");
      const label = document.createElement("label");
      label.innerHTML = `<input type="checkbox" id="${id}" /> <span>${val}</span><span class="n">${n}</span>`;
      label.querySelector("input").addEventListener("change", (e) => {
        const set = state.filters.selects[field] || (state.filters.selects[field] = new Set());
        e.target.checked ? set.add(val) : set.delete(val);
        if (set.size === 0) delete state.filters.selects[field];
        render();
      });
      box.appendChild(label);
    });
    els.facets.appendChild(box);
  }

  for (const field of ranges) {
    const nums = state.rows.map((r) => r[field]).filter((v) => typeof v === "number");
    if (nums.length === 0) continue;
    const lo = Math.min(...nums), hi = Math.max(...nums);
    const box = document.createElement("div");
    box.className = "facet";
    box.innerHTML = `<h4>${field.replace(/^.*· /, "")}</h4>
      <div class="range">
        <input type="number" placeholder="${lo}" step="any" data-b="min" style="width:50%" />
        <span>–</span>
        <input type="number" placeholder="${hi}" step="any" data-b="max" style="width:50%" />
      </div>`;
    box.querySelectorAll("input").forEach((inp) => inp.addEventListener("input", () => {
      const min = box.querySelector('[data-b="min"]').value;
      const max = box.querySelector('[data-b="max"]').value;
      state.filters.ranges[field] = { min: min === "" ? null : +min, max: max === "" ? null : +max };
      render();
    }));
    els.facets.appendChild(box);
  }
}

function matches(row) {
  const f = state.filters;
  if (f.search) {
    const hay = state.cfg.search.map((k) => row[k] || "").join(" ").toLowerCase();
    if (!hay.includes(f.search)) return false;
  }
  for (const [field, set] of Object.entries(f.selects)) {
    const vals = asArray(row[field]);
    if (!vals.some((v) => set.has(v))) return false;
  }
  for (const [field, { min, max }] of Object.entries(f.ranges)) {
    const v = row[field];
    if (typeof v !== "number") return false;
    if (min != null && v < min) return false;
    if (max != null && v > max) return false;
  }
  return true;
}

function render() {
  const list = state.rows.filter(matches).sort((a, b) => (a.Name || "").localeCompare(b.Name || ""));
  els.grid.innerHTML = "";
  els.count.textContent = `${list.length} of ${state.rows.length} products`;
  els.empty.hidden = list.length > 0;
  for (const row of list) els.grid.appendChild(card(row));
}

function card(row) {
  const el = document.createElement("a");
  el.className = "card";
  el.href = `/${state.cat}/${row.slug}/`;        // real per-product page (crawlable, shareable)
  const tags = [];
  for (const t of state.cfg.cardTags) for (const v of asArray(row[t])) tags.push(`<span class="tag">${v}</span>`);
  if (row.Confidence) tags.push(`<span class="tag conf-${row.Confidence}">${row.Confidence} confidence</span>`);
  el.innerHTML = `
    ${row.Image ? `<img class="card-img" src="/${row.Image}" alt="${(row.Name || "").replace(/"/g, "&quot;")}" loading="lazy" />` : ""}
    <h3>${row.Name || "Untitled"}</h3>
    <div class="sub">${row.Company || ""}</div>
    <div class="summary">${row.Summary || ""}</div>
    <div class="tags">${tags.join("")}</div>`;
  return el;
}

function openModal(row) {
  els.modalTitle.textContent = row.Name || "Untitled";
  const rows = [];
  for (const [k, v] of Object.entries(row)) {
    if (HIDDEN.has(k)) continue;
    const val = asArray(v).join(", ");
    if (val !== "") rows.push(`<tr><th>${k}</th><td>${val}</td></tr>`);
  }
  const website = row.Website ? `<div class="modal-actions"><a class="btn-link" href="${row.Website}" target="_blank" rel="noopener noreferrer">Visit source ↗</a></div>` : "";
  els.modalBody.innerHTML = `
    <div class="modal-sub">${row.Company || ""}${row.Country ? " · " + asArray(row.Country).join(", ") : ""}</div>
    <p>${row.Summary || ""}</p>
    ${website}
    <table class="spec-table"><tbody>${rows.join("")}</tbody></table>`;
  els.modal.hidden = false;
}

function closeModal() { els.modal.hidden = true; }

boot().catch((e) => { document.body.innerHTML = `<pre style="padding:20px">Failed to load catalogue: ${e.message}</pre>`; });
