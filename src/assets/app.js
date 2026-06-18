// xSonomy catalogue — client-side search / filter / render over generated JSON.
// Hangar aesthetic: UAV "loadout" cards + sensor info-blocks. Cards link to static
// per-product pages (no modal). Data is keyed by Airtable field names.

const CONFIG = {
  uav: {
    search: ["Name", "Company", "Summary", "Subtype"],
    selects: ["Subcategory", "Country", "UAV · Role", "UAV · Class", "UAV · Propulsion", "UAV · Combat-proven"],
    ranges: ["UAV · MTOW (kg)", "UAV · Endurance (min)", "UAV · Range (km)", "UAV · Max speed (km/h)"],
  },
  sensors: {
    search: ["Name", "Company", "Summary", "Subtype"],
    selects: ["Subcategory", "Country", "Subtype", "Radar · Band", "Radar · Coverage", "Radar · Use", "Acoustic · Type", "Acoustic · Coverage"],
    ranges: ["Radar · Detection range (km)", "Acoustic · Detection range (km)"],
  },
};

const els = {
  tabs: document.getElementById("tabs"),
  facets: document.getElementById("facets"),
  search: document.getElementById("search"),
  reset: document.getElementById("reset"),
  grid: document.getElementById("grid"),
  count: document.getElementById("count"),
  empty: document.getElementById("empty"),
  meta: document.getElementById("meta"),
};

const state = { cat: null, rows: [], cfg: null, filters: null, max: {} };

// ---------- helpers ----------
const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (v) => (typeof v === "number" ? v : null);
const up = (s) => String(s || "").toUpperCase();
const first = (v) => asArray(v)[0];
const tierClass = (c) => (c === "High" ? "HIGH" : c === "Low" ? "LOW" : "MED");
const whyText = (row) => { const m = String(row["Source URLs"] || "").split(/Analyst note:\s*/i); return m.length > 1 ? m[1].trim() : null; };

const ISO2 = { "United States":"US","United Kingdom":"GB","Germany":"DE","France":"FR","Israel":"IL","Ukraine":"UA","Poland":"PL","Netherlands":"NL","Sweden":"SE","Italy":"IT","Australia":"AU","Norway":"NO","Czechia":"CZ","Czech Republic":"CZ","China":"CN","Turkey":"TR","Türkiye":"TR","Iran":"IR","Russia":"RU","India":"IN","Japan":"JP","South Korea":"KR","Spain":"ES","Switzerland":"CH","Canada":"CA","Finland":"FI","Estonia":"EE","Latvia":"LV","Lithuania":"LT","Austria":"AT","Belgium":"BE","Denmark":"DK","Portugal":"PT","Greece":"GR","Romania":"RO","Bulgaria":"BG","Slovakia":"SK","Slovenia":"SI","Croatia":"HR","Serbia":"RS","United Arab Emirates":"AE","Saudi Arabia":"SA","South Africa":"ZA","Brazil":"BR","Taiwan":"TW","Singapore":"SG","New Zealand":"NZ","Ireland":"IE" };
function geo(country) {
  const name = first(country) || "";
  const iso = ISO2[name];
  if (!iso) return ["", (name || "—").slice(0, 14)];
  const flag = String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
  return [flag, iso];
}

// ---------- SVG art ----------
function schematicSVG(kind) {
  const grid = `<g opacity=".5">${[1,2,3,4,5,6,7].map(i=>`<line x1="${i*50}" y1="0" x2="${i*50}" y2="280" stroke="rgba(255,255,255,.05)"/>`).join("")}${[1,2,3,4,5].map(i=>`<line x1="0" y1="${i*47}" x2="400" y2="${i*47}" stroke="rgba(255,255,255,.05)"/>`).join("")}</g>`;
  const cross = `<g stroke="rgba(255,255,255,.18)" stroke-width="1" fill="none"><circle cx="200" cy="140" r="108" stroke-dasharray="2 4"/><line x1="50" y1="140" x2="350" y2="140"/><line x1="200" y1="30" x2="200" y2="250"/></g>`;
  const s = 'stroke="currentColor" stroke-width="1.5" fill="none"';
  let body = "";
  if (kind === "quad") {
    body = `<g ${s}><line x1="130" y1="80" x2="270" y2="200"/><line x1="270" y1="80" x2="130" y2="200"/><rect x="182" y="122" width="36" height="36" rx="3"/>${[[130,80],[270,80],[130,200],[270,200]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="22"/><circle cx="${x}" cy="${y}" r="34" stroke-dasharray="1 3"/>`).join("")}<circle cx="200" cy="170" r="6" fill="currentColor"/></g>`;
  } else if (kind === "hex") {
    const pts = Array.from({length:6},(_,i)=>{const a=(i*60-90)*Math.PI/180;return [200+Math.cos(a)*88,140+Math.sin(a)*88];});
    body = `<g ${s}>${pts.map(([x,y])=>`<line x1="200" y1="140" x2="${x}" y2="${y}"/><circle cx="${x}" cy="${y}" r="17"/>`).join("")}<polygon points="${Array.from({length:6},(_,i)=>{const a=i*60*Math.PI/180;return `${200+Math.cos(a)*26},${140+Math.sin(a)*26}`;}).join(" ")}"/></g>`;
  } else if (kind === "vtol") {
    body = `<g ${s}><ellipse cx="200" cy="145" rx="80" ry="13"/><path d="M170 133 L100 92 L82 94 L165 138 Z"/><path d="M230 133 L300 92 L318 94 L235 138 Z"/><path d="M170 157 L100 198 L82 196 L165 152 Z"/><path d="M230 157 L300 198 L318 196 L235 152 Z"/>${[[100,92],[300,92],[100,198],[300,198]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="15"/><circle cx="${x}" cy="${y}" r="26" stroke-dasharray="1 3"/>`).join("")}<rect x="172" y="138" width="56" height="14" rx="4"/></g>`;
  } else { // fixed
    body = `<g ${s}><path d="M90 140 L285 140 L312 145 L285 150 L90 150 Q72 145 90 140 Z"/><path d="M170 122 L232 62 L260 62 L220 126 Z"/><path d="M170 168 L232 228 L260 228 L220 164 Z"/><path d="M285 145 L322 116 L332 118 L298 148 Z"/><path d="M285 145 L322 174 L332 172 L298 142 Z"/><circle cx="100" cy="145" r="6" fill="currentColor"/><line x1="312" y1="135" x2="312" y2="155" stroke-width="2.5"/></g>`;
  }
  return `<svg class="art-svg" viewBox="0 0 400 280" width="100%" height="100%">${grid}${cross}${body}</svg>`;
}
function frameKind(frame) {
  const f = String(frame || "").toLowerCase();
  if (f.includes("vtol") || f.includes("tiltrotor") || f.includes("tailsitter") || f.includes("hybrid")) return "vtol";
  if (f.includes("quad")) return "quad";
  if (f.includes("hexa") || f.includes("octo") || f.includes("multirotor") || f.includes("helicopter") || f.includes("rotor")) return "hex";
  return "fixed";
}
function sensorKind(row) {
  const sub = String(row.Subtype || "").toLowerCase();
  const cat = String(row.Subcategory || "").toLowerCase();
  if (cat.includes("acoustic") || sub.includes("acoustic")) return "acoustic";
  if (cat.includes("rf") || sub.includes("rf")) return "rf";
  if (sub.includes("passive")) return "passive";
  if (cat.includes("eo") || sub.includes("optical") || sub.includes("eo")) return "eo";
  return "radar";
}
function sensorGlyph(kind) {
  const c = "currentColor";
  if (kind === "acoustic") return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.4"><circle cx="7.5" cy="12" r="2.2" fill="${c}"/><path d="M12 8 Q15 12 12 16"/><path d="M15.5 6 Q20 12 15.5 18"/></svg>`;
  if (kind === "rf") return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.4"><line x1="4" y1="18.5" x2="20" y2="18.5"/><rect x="5.5" y="12" width="2.4" height="6.5" fill="${c}" stroke="none"/><rect x="10" y="8" width="2.4" height="10.5" fill="${c}" stroke="none"/><rect x="14.5" y="10.5" width="2.4" height="8" fill="${c}" stroke="none"/></svg>`;
  if (kind === "passive") return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.4"><line x1="12" y1="20" x2="12" y2="9"/><line x1="8" y1="11" x2="16" y2="11"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/><circle cx="12" cy="20" r="1.3" fill="${c}"/></svg>`;
  if (kind === "eo") return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.4"><path d="M2 12 Q12 4 22 12 Q12 20 2 12 Z"/><circle cx="12" cy="12" r="3"/></svg>`;
  return `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.4"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="${c}"/><line x1="12" y1="12" x2="20" y2="6.5"/></svg>`;
}

// ---------- cards ----------
function statRow(lbl, v, max, unit) {
  const na = v == null;
  const pct = na || !max ? 0 : Math.max(2, Math.min(100, (v / max) * 100));
  return `<div class="stat-row"><span class="lbl">${lbl}</span><div class="bar"><i style="width:${pct}%"></i></div><span class="val ${na ? "na" : ""}">${na ? "—" : v + unit}</span></div>`;
}
function uavCard(row) {
  const conf = row.Confidence || "Medium";
  const frame = first(row["UAV · Frame type"]);
  const prod = first(row["UAV · Production status"]);
  const isProd = /produc/i.test(prod || "");
  const role = first(row["UAV · Role"]);
  const mtow = num(row["UAV · MTOW (kg)"]);
  const prop = first(row["UAV · Propulsion"]);
  const [, code] = geo(row.Country);
  return `<a class="card" href="/uav/${esc(row.slug)}/">
    <div class="card-head"><span class="id">${esc(up(first(row.Subcategory)) || "UAV")}</span><span class="tier ${tierClass(conf)}">${esc(up(conf))} CONF</span></div>
    <div class="card-art">
      ${row.Image ? `<img class="card-photo" src="/${esc(row.Image)}" alt="${esc(row.Name)}" loading="lazy"/>` : schematicSVG(frameKind(frame))}
      ${prod ? `<span class="status-flag ${isProd ? "PROD" : "OTHER"}">${esc(isProd ? "IN PROD" : up(prod))}</span>` : ""}
      <span class="art-tag">${esc(up(frameKind(frame)))}</span>
    </div>
    <div class="card-body">
      <h3 class="card-name">${esc(row.Name || "Untitled")}</h3>
      <div class="card-mfr">${esc(first(row.Company) || "")}${code ? " · " + esc(code) : ""}</div>
      <div class="card-tags">${first(row.Subcategory) ? `<span class="tag">${esc(first(row.Subcategory))}</span>` : ""}${role ? `<span class="tag role">${esc(role)}</span>` : ""}${frame ? `<span class="tag">${esc(frame)}</span>` : ""}</div>
      <div class="stat-bars">
        ${statRow("RANGE", num(row["UAV · Range (km)"]), state.max.range, "km")}
        ${statRow("ENDUR", num(row["UAV · Endurance (min)"]), state.max.endurance, "m")}
        ${statRow("PAYLD", num(row["UAV · Max payload (kg)"]), state.max.payload, "kg")}
        ${statRow("SPEED", num(row["UAV · Max speed (km/h)"]), state.max.speed, "k")}
      </div>
    </div>
    <div class="card-footer"><div><div class="price">${mtow != null ? mtow + "kg" : "—"}</div><div class="lt">MTOW · ${esc(prop ? up(prop) : "—")}</div></div></div>
  </a>`;
}
const SENSOR_SPEC_FIELDS = [
  ["Price", "Price", "price"],
  ["Radar · Detection range (km)", "Detection range", "", "km"],
  ["Radar · Band", "Band"],
  ["Radar · Coverage", "Coverage"],
  ["Acoustic · Detection range (km)", "Detection range", "", "km"],
  ["Acoustic · Type", "Type"],
  ["Radar · Architecture", "Architecture"],
  ["Form factor", "Form factor"],
  ["Radar · Frequency (GHz)", "Frequency", "", " GHz"],
  ["Notable partners", "Notable partners"],
];
function sensorBlock(row, i) {
  const conf = row.Confidence;
  const [flag, code] = geo(row.Country);
  const why = whyText(row);
  const kind = sensorKind(row);
  const subtitle = [first(row.Subtype), first(row["Form factor"])].filter(Boolean).join(" · ");
  const specs = [];
  for (const [field, lbl, cls, unit] of SENSOR_SPEC_FIELDS) {
    const v = row[field];
    if (v == null || v === "") continue;
    const val = unit ? v + unit : asArray(v).join(", ");
    specs.push(`<div><div class="lbl">${lbl}</div><div class="val ${cls || ""}">${esc(val)}</div></div>`);
    if (specs.length >= 6) break;
  }
  return `<a class="sblock" href="/sensors/${esc(row.slug)}/">
    <div class="sblock-top"><div class="sblock-num"><b>${String(i + 1).padStart(2, "0")}.</b> ${esc(up(first(row.Subcategory)) || "SENSOR")}${row.Subtype ? " · " + esc(up(first(row.Subtype))) : ""}</div><div class="sblock-geo">${flag} ${esc(code)}</div></div>
    <div class="sblock-title"><div class="sblock-ic">${sensorGlyph(kind)}</div><div><h3 class="sblock-name">${esc(row.Name || "Untitled")}</h3><div class="sblock-sub">${esc(subtitle)}</div></div></div>
    ${row.Image ? `<img class="sblock-photo" src="/${esc(row.Image)}" alt="${esc(row.Name)}" loading="lazy"/>` : ""}
    <p class="sblock-summary clamp">${esc(row.Summary || "")}</p>
    ${why ? `<div class="why"><h6>WHY IT MATTERS</h6><p>${esc(why)}</p></div>` : ""}
    <div class="sblock-specs">${specs.join("")}</div>
  </a>`;
}
function card(row, i) {
  const wrap = document.createElement("div");
  wrap.style.display = "contents";
  wrap.innerHTML = state.cat === "uav" ? uavCard(row) : sensorBlock(row, i);
  return wrap.firstElementChild;
}

// ---------- boot / filters / render ----------
async function boot() {
  const meta = await fetch("data/meta.json").then((r) => r.json());
  if (els.meta) els.meta.textContent = `Updated ${new Date(meta.generatedAt).toLocaleDateString()}`;
  Object.keys(meta.categories).forEach((key, i) => {
    const c = meta.categories[key];
    const b = document.createElement("button");
    b.innerHTML = `${c.label}<span class="n">${c.count}</span>`;
    b.onclick = () => selectCat(key, c.file, b);
    els.tabs.appendChild(b);
    if (i === 0) b.dataset.first = "1";
  });
  const f = els.tabs.querySelector("[data-first]");
  if (f) f.click();
  els.search.addEventListener("input", () => { state.filters.search = els.search.value.toLowerCase().trim(); render(); });
  els.reset.addEventListener("click", resetFilters);
}
async function selectCat(key, file, btn) {
  [...els.tabs.children].forEach((c) => c.classList.remove("active"));
  btn.classList.add("active");
  state.cat = key;
  state.cfg = CONFIG[key];
  state.rows = await fetch(file).then((r) => r.json());
  state.max = {
    range: Math.max(1, ...state.rows.map((r) => num(r["UAV · Range (km)"]) || 0)),
    endurance: Math.max(1, ...state.rows.map((r) => num(r["UAV · Endurance (min)"]) || 0)),
    payload: Math.max(1, ...state.rows.map((r) => num(r["UAV · Max payload (kg)"]) || 0)),
    speed: Math.max(1, ...state.rows.map((r) => num(r["UAV · Max speed (km/h)"]) || 0)),
  };
  resetFilters();
}
function resetFilters() {
  state.filters = { search: "", selects: {}, ranges: {} };
  els.search.value = "";
  if (state.cfg) buildFacets();
  render();
}
// A collapsed-by-default filter group with an Expand/Hide toggle.
function makeFacet(label) {
  const box = document.createElement("div");
  box.className = "facet collapsed";
  const head = document.createElement("button");
  head.type = "button";
  head.className = "facet-h";
  head.innerHTML = `<span>${esc(label)}</span><span class="exp">Expand</span>`;
  const body = document.createElement("div");
  body.className = "facet-body";
  head.addEventListener("click", () => {
    const collapsed = box.classList.toggle("collapsed");
    head.querySelector(".exp").textContent = collapsed ? "Expand" : "Hide";
  });
  box.appendChild(head);
  box.appendChild(body);
  return { box, body };
}
function buildFacets() {
  const { selects, ranges } = state.cfg;
  els.facets.innerHTML = "";
  for (const field of selects) {
    const counts = new Map();
    for (const row of state.rows) for (const val of asArray(row[field])) counts.set(val, (counts.get(val) || 0) + 1);
    if (counts.size === 0) continue;
    const { box, body } = makeFacet(field.replace(/^.*· /, ""));
    [...counts.entries()].sort((a, b) => String(a[0]).localeCompare(String(b[0]))).forEach(([val, n]) => {
      const label = document.createElement("label");
      label.innerHTML = `<input type="checkbox" /> <span>${esc(val)}</span><span class="n">${n}</span>`;
      label.querySelector("input").addEventListener("change", (e) => {
        const set = state.filters.selects[field] || (state.filters.selects[field] = new Set());
        e.target.checked ? set.add(val) : set.delete(val);
        if (set.size === 0) delete state.filters.selects[field];
        render();
      });
      body.appendChild(label);
    });
    els.facets.appendChild(box);
  }
  for (const field of ranges) {
    const nums = state.rows.map((r) => r[field]).filter((v) => typeof v === "number");
    if (nums.length === 0) continue;
    const lo = Math.min(...nums), hi = Math.max(...nums);
    const { box, body } = makeFacet(field.replace(/^.*· /, ""));
    body.innerHTML = `<div class="range"><input type="number" placeholder="${lo}" data-b="min"/><span>–</span><input type="number" placeholder="${hi}" data-b="max"/></div>`;
    body.querySelectorAll("input").forEach((inp) => inp.addEventListener("input", () => {
      const mn = body.querySelector('[data-b="min"]').value, mx = body.querySelector('[data-b="max"]').value;
      state.filters.ranges[field] = { min: mn === "" ? null : +mn, max: mx === "" ? null : +mx };
      render();
    }));
    els.facets.appendChild(box);
  }
}
function matches(row) {
  const f = state.filters;
  if (f.search) {
    const hay = state.cfg.search.map((k) => asArray(row[k]).join(" ")).join(" ").toLowerCase();
    if (!hay.includes(f.search)) return false;
  }
  for (const [field, set] of Object.entries(f.selects)) if (!asArray(row[field]).some((v) => set.has(v))) return false;
  for (const [field, { min, max }] of Object.entries(f.ranges)) {
    const v = row[field];
    if (typeof v !== "number") return false;
    if (min != null && v < min) return false;
    if (max != null && v > max) return false;
  }
  return true;
}
function render() {
  const list = state.rows.filter(matches).sort((a, b) => String(a.Name || "").localeCompare(String(b.Name || "")));
  els.grid.className = "grid " + state.cat;
  els.grid.innerHTML = "";
  els.count.innerHTML = `<b>${list.length}</b> / ${state.rows.length} ${state.cat === "uav" ? "UNITS" : "SENSORS"}`;
  els.empty.hidden = list.length > 0;
  list.forEach((row, i) => els.grid.appendChild(card(row, i)));
}

boot().catch((e) => { document.body.innerHTML = `<pre style="padding:20px">Failed to load catalogue: ${e.message}</pre>`; });
