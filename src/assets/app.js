// xSonomy catalogue — client-side search / filter / render over generated JSON.
// UAV "loadout" cards + sensor info-blocks, compare tray, and (for Sensors) four
// subcategory sub-tabs in the sidebar, each with its own filters.
// Cards link to static per-product pages. Data is keyed by Airtable field names.

const UAV_CFG = {
  search: ["Name", "Company", "Summary", "Subtype"],
  selects: ["Subcategory", "Country", "UAV · Role", "UAV · Class", "UAV · Propulsion", "UAV · Combat-proven"],
  ranges: ["UAV · MTOW (kg)", "UAV · Endurance (min)", "UAV · Range (km)", "UAV · Max speed (km/h)"],
  compare: [
    ["Subcategory", "Subcategory"], ["UAV · Role", "Role"], ["Country", "Country"],
    ["UAV · Range (km)", "Range", "num", " km"], ["UAV · Endurance (min)", "Endurance", "num", " min"],
    ["UAV · Max payload (kg)", "Max payload", "num", " kg"], ["UAV · Max speed (km/h)", "Max speed", "num", " km/h"],
    ["UAV · MTOW (kg)", "MTOW", "num", " kg"], ["UAV · Propulsion", "Propulsion"],
    ["UAV · Combat-proven", "Combat-proven"], ["Confidence", "Confidence"],
  ],
};

// Sensor subcategory tabs (shown in the sidebar). Each is its own page with its own
// filters. Only fields that exist in Airtable render — more appear automatically as
// the schema is filled in.
// Sensor subcategory tabs — each its own page with shared + category-specific filters,
// wired to the Airtable field names. Empty fields auto-hide until populated.
const SENSOR_TABS = [
  { key: "radar", label: "Radar", match: (s) => first(s.Subcategory) === "Radar",
    cfg: {
      search: ["Name", "Company", "Summary", "Subtype"],
      selects: ["Use class", "Radar · Type", "Radar · Band", "Radar · Coverage", "Radar · Scan type", "Radar · Use", "Radar · Micro-Doppler", "Sensor · Active/Passive", "Sensor · All-weather / day-night", "Sensor · Mounting", "Sensor · Output data", "Sensor · Price band", "Country", "Subtype"],
      ranges: ["Radar · Detection range (km)", "Radar · Min RCS (m²)", "Radar · Min radial velocity (m/s)", "Radar · Track capacity", "Radar · Weight (kg)"],
      compare: [["Use class", "Class"], ["Country", "Country"], ["Radar · Band", "Band"], ["Radar · Detection range (km)", "Detection range", "num", " km"], ["Radar · Min RCS (m²)", "Min RCS", "num", " m²"], ["Radar · Coverage", "Coverage"], ["Radar · Scan type", "Scan type"], ["Sensor · Active/Passive", "Active/Passive"], ["Sensor · Price band", "Price band"], ["Confidence", "Confidence"]],
    },
    cardFields: [["Radar · Min RCS (m²)", "Min RCS", " m²"], ["Radar · Range vs RCS / target class", "Range vs RCS"], ["Radar · Coverage", "Coverage"], ["Radar · Band", "Band"]],
  },
  { key: "thermal", label: "Thermal / EO-IR", match: (s) => ["EO/IR cameras", "Thermal"].includes(first(s.Subcategory)),
    cfg: {
      search: ["Name", "Company", "Summary", "Subtype"],
      selects: ["Use class", "EO/IR · Spectral band", "EO/IR · Cooled/uncooled", "EO/IR · Stabilisation", "EO/IR · AI classification / TWS", "Sensor · Active/Passive", "Sensor · All-weather / day-night", "Sensor · Mounting", "Sensor · Price band", "Country", "Subtype"],
      ranges: ["Sensor · Detection range (km)"],
      compare: [["Use class", "Class"], ["Country", "Country"], ["EO/IR · Spectral band", "Spectral band"], ["EO/IR · DRI ranges", "DRI ranges"], ["EO/IR · Cooled/uncooled", "Cooled/uncooled"], ["EO/IR · Resolution (px)", "Resolution"], ["Sensor · Price band", "Price band"], ["Confidence", "Confidence"]],
    },
    cardFields: [["EO/IR · DRI ranges", "DRI ranges"], ["EO/IR · Spectral band", "Spectral band"], ["EO/IR · Resolution (px)", "Resolution"], ["EO/IR · FoV / focal length", "FoV / focal length"]],
  },
  { key: "acoustic", label: "Acoustic", match: (s) => first(s.Subcategory) === "Acoustic",
    cfg: {
      search: ["Name", "Company", "Summary", "Subtype"],
      selects: ["Use class", "Acoustic · Type", "Acoustic · Coverage", "Acoustic · Localisation mode", "Sensor · Active/Passive", "Sensor · All-weather / day-night", "Sensor · Mounting", "Sensor · Price band", "Country", "Subtype"],
      ranges: ["Acoustic · Detection range (km)"],
      compare: [["Use class", "Class"], ["Country", "Country"], ["Acoustic · Type", "Type"], ["Acoustic · Detection range (km)", "Detection range", "num", " km"], ["Acoustic · Coverage", "Coverage"], ["Acoustic · Localisation mode", "Localisation"], ["Sensor · Price band", "Price band"], ["Confidence", "Confidence"]],
    },
    cardFields: [["Acoustic · Detection range (km)", "Detection range", " km"], ["Acoustic · Array config", "Array config"], ["Acoustic · DoA accuracy", "DoA accuracy"], ["Acoustic · Localisation mode", "Localisation"]],
  },
  { key: "rf", label: "RF", match: (s) => first(s.Subcategory) === "RF detection",
    cfg: {
      search: ["Name", "Company", "Summary", "Subtype"],
      selects: ["Use class", "RF · Detection mode", "RF · Blind to RF-silent / autonomous", "Sensor · Active/Passive", "Sensor · All-weather / day-night", "Sensor · Mounting", "Sensor · Output data", "Sensor · Price band", "Country", "Subtype"],
      ranges: ["RF · Simultaneous tracks", "Sensor · Detection range (km)"],
      compare: [["Use class", "Class"], ["Country", "Country"], ["RF · Frequency coverage", "Frequency coverage"], ["RF · Detection mode", "Detection mode"], ["RF · Simultaneous tracks", "Simultaneous tracks", "num"], ["RF · Sensitivity (dBm)", "Sensitivity"], ["Sensor · Price band", "Price band"], ["Confidence", "Confidence"]],
    },
    cardFields: [["RF · Frequency coverage", "Frequency coverage"], ["RF · Detection mode", "Detection mode"], ["RF · Protocol/signal library", "Protocol / library"], ["Sensor · Detection range (km)", "Detection range", " km"]],
  },
];

const els = {
  tabs: document.getElementById("tabs"),
  subtabs: document.getElementById("subtabs"),
  facets: document.getElementById("facets"),
  search: document.getElementById("search"),
  reset: document.getElementById("reset"),
  grid: document.getElementById("grid"),
  empty: document.getElementById("empty"),
  meta: document.getElementById("meta"),
};

const state = { cat: null, subKey: null, rows: [], allSensors: [], cfg: null, cardFields: null, filters: null, max: {}, compare: [] };

// ---------- helpers ----------
const asArray = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const num = (v) => (typeof v === "number" ? v : null);
const up = (s) => String(s || "").toUpperCase();
const first = (v) => asArray(v)[0];
const whyText = (row) => { const m = String(row["Source URLs"] || "").split(/Analyst note:\s*/i); return m.length > 1 ? m[1].trim() : null; };
const rowBySlug = (slug) => state.rows.find((r) => r.slug === slug);

const ISO2 = { "United States":"US","United Kingdom":"GB","Germany":"DE","France":"FR","Israel":"IL","Ukraine":"UA","Poland":"PL","Netherlands":"NL","Sweden":"SE","Italy":"IT","Australia":"AU","Norway":"NO","Czechia":"CZ","Czech Republic":"CZ","China":"CN","Turkey":"TR","Türkiye":"TR","Iran":"IR","Russia":"RU","India":"IN","Japan":"JP","South Korea":"KR","Spain":"ES","Switzerland":"CH","Canada":"CA","Finland":"FI","Estonia":"EE","Latvia":"LV","Lithuania":"LT","Austria":"AT","Belgium":"BE","Denmark":"DK","Portugal":"PT","Greece":"GR","Romania":"RO","Bulgaria":"BG","Slovakia":"SK","Slovenia":"SI","Croatia":"HR","Serbia":"RS","United Arab Emirates":"AE","Saudi Arabia":"SA","South Africa":"ZA","Brazil":"BR","Taiwan":"TW","Singapore":"SG","New Zealand":"NZ","Ireland":"IE" };
function geoBadge(country) {
  const name = first(country) || "";
  const iso = ISO2[name];
  const code = iso || (name || "—").slice(0, 14);
  const flag = iso ? String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : "";
  const ru = name === "Russia" ? " ru" : "";
  return `<span class="geo-badge${ru}">${flag} ${esc(code)}</span>`;
}

// ---------- SVG art ----------
function schematicSVG(kind) {
  const grid = `<g opacity=".5">${[1,2,3,4,5,6,7].map(i=>`<line x1="${i*50}" y1="0" x2="${i*50}" y2="280" stroke="rgba(255,255,255,.05)"/>`).join("")}${[1,2,3,4,5].map(i=>`<line x1="0" y1="${i*47}" x2="400" y2="${i*47}" stroke="rgba(255,255,255,.05)"/>`).join("")}</g>`;
  const cross = `<g stroke="rgba(255,255,255,.18)" stroke-width="1" fill="none"><circle cx="200" cy="140" r="108" stroke-dasharray="2 4"/><line x1="50" y1="140" x2="350" y2="140"/><line x1="200" y1="30" x2="200" y2="250"/></g>`;
  const s = 'stroke="currentColor" stroke-width="1.5" fill="none"';
  let body = "";
  if (kind === "quad") body = `<g ${s}><line x1="130" y1="80" x2="270" y2="200"/><line x1="270" y1="80" x2="130" y2="200"/><rect x="182" y="122" width="36" height="36" rx="3"/>${[[130,80],[270,80],[130,200],[270,200]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="22"/><circle cx="${x}" cy="${y}" r="34" stroke-dasharray="1 3"/>`).join("")}<circle cx="200" cy="170" r="6" fill="currentColor"/></g>`;
  else if (kind === "hex") { const pts = Array.from({length:6},(_,i)=>{const a=(i*60-90)*Math.PI/180;return [200+Math.cos(a)*88,140+Math.sin(a)*88];}); body = `<g ${s}>${pts.map(([x,y])=>`<line x1="200" y1="140" x2="${x}" y2="${y}"/><circle cx="${x}" cy="${y}" r="17"/>`).join("")}<polygon points="${Array.from({length:6},(_,i)=>{const a=i*60*Math.PI/180;return `${200+Math.cos(a)*26},${140+Math.sin(a)*26}`;}).join(" ")}"/></g>`; }
  else if (kind === "vtol") body = `<g ${s}><ellipse cx="200" cy="145" rx="80" ry="13"/><path d="M170 133 L100 92 L82 94 L165 138 Z"/><path d="M230 133 L300 92 L318 94 L235 138 Z"/><path d="M170 157 L100 198 L82 196 L165 152 Z"/><path d="M230 157 L300 198 L318 196 L235 152 Z"/>${[[100,92],[300,92],[100,198],[300,198]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="15"/><circle cx="${x}" cy="${y}" r="26" stroke-dasharray="1 3"/>`).join("")}<rect x="172" y="138" width="56" height="14" rx="4"/></g>`;
  else body = `<g ${s}><path d="M90 140 L285 140 L312 145 L285 150 L90 150 Q72 145 90 140 Z"/><path d="M170 122 L232 62 L260 62 L220 126 Z"/><path d="M170 168 L232 228 L260 228 L220 164 Z"/><path d="M285 145 L322 116 L332 118 L298 148 Z"/><path d="M285 145 L322 174 L332 172 L298 142 Z"/><circle cx="100" cy="145" r="6" fill="currentColor"/><line x1="312" y1="135" x2="312" y2="155" stroke-width="2.5"/></g>`;
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
  const sub = String(row.Subtype || "").toLowerCase(), cat = String(row.Subcategory || "").toLowerCase();
  if (cat.includes("acoustic") || sub.includes("acoustic")) return "acoustic";
  if (cat.includes("rf") || sub.includes("rf")) return "rf";
  if (sub.includes("passive")) return "passive";
  if (cat.includes("eo") || cat.includes("thermal") || sub.includes("optical") || sub.includes("eo") || sub.includes("thermal")) return "eo";
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
const CMP_ICON = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="5" height="10"/><rect x="9" y="5" width="5" height="8"/></svg>`;

// ---------- cards ----------
function statRow(lbl, v, max, unit) {
  const na = v == null;
  const pct = na || !max ? 0 : Math.max(2, Math.min(100, (v / max) * 100));
  return `<div class="stat-row"><span class="lbl">${lbl}</span><div class="bar"><i style="width:${pct}%"></i></div><span class="val ${na ? "na" : ""}">${na ? "—" : v + unit}</span></div>`;
}
function cmpBtn(slug) {
  const on = state.compare.includes(slug) ? " on" : "";
  return `<button class="cmp-btn${on}" data-slug="${esc(slug)}" title="Add to compare" aria-label="Add to compare">${CMP_ICON}</button>`;
}
function uavCard(row) {
  const frame = first(row["UAV · Frame type"]);
  const prod = first(row["UAV · Production status"]);
  const isProd = /produc/i.test(prod || "");
  const role = first(row["UAV · Role"]);
  const mtow = num(row["UAV · MTOW (kg)"]);
  const prop = first(row["UAV · Propulsion"]);
  const href = `/uav/${esc(row.slug)}/`;
  return `<div class="card" data-href="${href}">
    <div class="card-art">
      ${row.Image ? `<img class="card-photo" src="/${esc(row.Image)}" alt="${esc(row.Name)}" loading="lazy"/>` : schematicSVG(frameKind(frame))}
      ${prod ? `<span class="status-flag ${isProd ? "PROD" : "OTHER"}">${esc(isProd ? "IN PROD" : up(prod))}</span>` : ""}
      <span class="art-tag">${esc(up(frameKind(frame)))}</span>
    </div>
    <div class="card-body">
      <div class="card-geo">${geoBadge(row.Country)}</div>
      <a class="card-name" href="${href}">${esc(row.Name || "Untitled")}</a>
      <div class="card-mfr">${esc(first(row.Company) || "")}</div>
      <div class="card-tags">${first(row.Subcategory) ? `<span class="tag">${esc(first(row.Subcategory))}</span>` : ""}${role ? `<span class="tag role">${esc(role)}</span>` : ""}${frame ? `<span class="tag">${esc(frame)}</span>` : ""}</div>
      <div class="stat-bars">
        ${statRow("RANGE", num(row["UAV · Range (km)"]), state.max.range, "km")}
        ${statRow("ENDUR", num(row["UAV · Endurance (min)"]), state.max.endurance, "m")}
        ${statRow("PAYLD", num(row["UAV · Max payload (kg)"]), state.max.payload, "kg")}
        ${statRow("SPEED", num(row["UAV · Max speed (km/h)"]), state.max.speed, "k")}
      </div>
    </div>
    <div class="card-footer"><div><div class="price">${mtow != null ? mtow + "kg" : "—"}</div><div class="lt">MTOW · ${esc(prop ? up(prop) : "—")}</div></div>${cmpBtn(row.slug)}</div>
  </div>`;
}
function sensorBlock(row, i) {
  const why = whyText(row);
  const kind = sensorKind(row);
  const subtitle = [first(row.Subtype), first(row["Form factor"])].filter(Boolean).join(" · ");
  const href = `/sensors/${esc(row.slug)}/`;
  // Card shows: Sensor class, Price band, + first 4 category fields (that exist).
  const cls = first(row["Use class"]) || first(row.Subcategory) || "—";
  const priceBand = first(row["Sensor · Price band"]) || row.Price || "";
  const specs = [
    `<div><div class="lbl">Class</div><div class="val">${esc(cls)}</div></div>`,
    `<div><div class="lbl">Price band</div><div class="val ${priceBand ? "price" : "na"}">${esc(priceBand || "—")}</div></div>`,
  ];
  let added = 0;
  for (const [field, label, unit] of (state.cardFields || [])) {
    const v = row[field];
    if (v == null || v === "") continue;
    const val = unit ? v + unit : asArray(v).join(", ");
    specs.push(`<div><div class="lbl">${esc(label)}</div><div class="val">${esc(val)}</div></div>`);
    if (++added >= 4) break;
  }
  return `<div class="sblock" data-href="${href}">
    <div class="sblock-top"><div class="sblock-num"><b>${String(i + 1).padStart(2, "0")}.</b> ${esc(up(first(row.Subcategory)) || "SENSOR")}${row.Subtype ? " · " + esc(up(first(row.Subtype))) : ""}</div>${geoBadge(row.Country)}</div>
    <div class="sblock-title"><div class="sblock-ic">${sensorGlyph(kind)}</div><div><a class="sblock-name" href="${href}">${esc(row.Name || "Untitled")}</a><div class="sblock-sub">${esc(subtitle)}</div></div></div>
    ${row.Image ? `<img class="sblock-photo" src="/${esc(row.Image)}" alt="${esc(row.Name)}" loading="lazy"/>` : ""}
    <p class="sblock-summary clamp">${esc(row.Summary || "")}</p>
    ${why ? `<div class="why"><h6>WHY IT MATTERS</h6><p>${esc(why)}</p></div>` : ""}
    <div class="sblock-specs">${specs.join("")}</div>
    <div class="sblock-foot">${cmpBtn(row.slug)}</div>
  </div>`;
}
function card(row, i) {
  const wrap = document.createElement("div");
  wrap.style.display = "contents";
  wrap.innerHTML = state.cat === "uav" ? uavCard(row) : sensorBlock(row, i);
  return wrap.firstElementChild;
}

// ---------- compare ----------
let tray, modal;
function buildCompareUI() {
  tray = document.createElement("div"); tray.className = "cmp-tray"; tray.hidden = true; document.body.appendChild(tray);
  modal = document.createElement("div"); modal.className = "cmp-modal-bg"; modal.hidden = true;
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.hidden = true; });
  document.body.appendChild(modal);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") modal.hidden = true; });
}
function toggleCompare(slug) {
  const i = state.compare.indexOf(slug);
  if (i >= 0) state.compare.splice(i, 1);
  else { if (state.compare.length >= 3) state.compare.shift(); state.compare.push(slug); }
  els.grid.querySelectorAll(".cmp-btn").forEach((b) => b.classList.toggle("on", state.compare.includes(b.dataset.slug)));
  renderTray();
}
function renderTray() {
  if (!state.compare.length) { tray.hidden = true; tray.innerHTML = ""; return; }
  const slots = [0, 1, 2].map((i) => state.compare[i] ? rowBySlug(state.compare[i]) : null);
  tray.hidden = false;
  tray.innerHTML = `
    <div class="cmp-h">${CMP_ICON} COMPARE <span>[${state.compare.length}/3]</span></div>
    <div class="cmp-slots">${slots.map((r, i) => r
      ? `<div class="cmp-slot filled"><span class="num">0${i+1}</span><span class="nm">${esc(r.Name || "")}</span><button class="cmp-x" data-slug="${esc(r.slug)}" aria-label="Remove">×</button></div>`
      : `<div class="cmp-slot">// EMPTY</div>`).join("")}</div>
    <div class="cmp-cta"><button class="btn" id="cmp-clear">CLEAR</button><button class="btn primary" id="cmp-run"${state.compare.length < 2 ? " disabled" : ""}>RUN COMPARE</button></div>`;
  tray.querySelector("#cmp-clear").onclick = () => { state.compare = []; els.grid.querySelectorAll(".cmp-btn.on").forEach((b) => b.classList.remove("on")); renderTray(); };
  tray.querySelector("#cmp-run").onclick = openCompare;
  tray.querySelectorAll(".cmp-x").forEach((x) => x.onclick = () => toggleCompare(x.dataset.slug));
}
function openCompare() {
  const rows = state.compare.map(rowBySlug).filter(Boolean);
  if (rows.length < 2) return;
  const fields = state.cfg.compare;
  const best = {};
  fields.forEach(([f, , type]) => { if (type === "num") { const vals = rows.map((r) => num(r[f])).filter((v) => v != null); best[f] = vals.length ? Math.max(...vals) : null; } });
  const body = fields.map(([f, label, type, unit]) => {
    const tds = rows.map((r) => {
      const v = r[f]; const na = v == null || v === "";
      const isBest = type === "num" && !na && best[f] != null && num(v) === best[f] && rows.length > 1;
      const disp = na ? "—" : (type === "num" ? v + (unit || "") : asArray(v).join(", "));
      return `<td class="${na ? "na" : ""} ${isBest ? "best" : ""}">${esc(disp)}</td>`;
    }).join("");
    return `<tr><th>${esc(label)}</th>${tds}</tr>`;
  }).join("");
  modal.innerHTML = `<div class="cmp-modal"><button class="cmp-close" aria-label="Close">×</button>
    <h2>// COMPARE · ${rows.length} ${state.cat === "uav" ? "UNITS" : "SENSORS"}</h2>
    <table class="cmp-table"><thead><tr><th>SPEC</th>${rows.map((r) => `<th>${esc(r.Name || "")}<span>${esc(first(r.Company) || "")}</span></th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`;
  modal.querySelector(".cmp-close").onclick = () => { modal.hidden = true; };
  modal.hidden = false;
}

// ---------- boot / tabs / filters / render ----------
async function boot() {
  buildCompareUI();
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
  els.grid.addEventListener("click", (e) => {
    const c = e.target.closest(".cmp-btn");
    if (c) { e.preventDefault(); toggleCompare(c.dataset.slug); return; }
    if (e.target.closest("a")) return;
    const cardEl = e.target.closest("[data-href]");
    if (cardEl) window.location.href = cardEl.dataset.href;
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
  state.compare = []; renderTray();
  const data = await fetch(file).then((r) => r.json());
  if (key === "sensors") {
    state.allSensors = data;
    state.subKey = "radar";
    buildSubtabs();
    selectSub("radar");
  } else {
    els.subtabs.innerHTML = "";
    state.cfg = UAV_CFG;
    state.cardFields = null;
    state.rows = data;
    state.max = {
      range: Math.max(1, ...data.map((r) => num(r["UAV · Range (km)"]) || 0)),
      endurance: Math.max(1, ...data.map((r) => num(r["UAV · Endurance (min)"]) || 0)),
      payload: Math.max(1, ...data.map((r) => num(r["UAV · Max payload (kg)"]) || 0)),
      speed: Math.max(1, ...data.map((r) => num(r["UAV · Max speed (km/h)"]) || 0)),
    };
    resetFilters();
  }
}
function buildSubtabs() {
  els.subtabs.innerHTML = "";
  if (state.cat !== "sensors") return;
  SENSOR_TABS.forEach((t) => {
    const n = state.allSensors.filter(t.match).length;
    const b = document.createElement("button");
    b.innerHTML = `${t.label}<span class="n">${n}</span>`;
    b.classList.toggle("active", t.key === state.subKey);
    b.onclick = () => selectSub(t.key);
    els.subtabs.appendChild(b);
  });
}
function selectSub(key) {
  state.subKey = key;
  const t = SENSOR_TABS.find((x) => x.key === key) || SENSOR_TABS[0];
  state.cfg = t.cfg;
  state.cardFields = t.cardFields;
  state.rows = state.allSensors.filter(t.match);
  state.compare = []; renderTray();
  buildSubtabs();
  resetFilters();
}
function resetFilters() {
  state.filters = { search: "", selects: {}, ranges: {}, showRussian: false };
  els.search.value = "";
  if (state.cfg) buildFacets();
  render();
}
function makeFacet(label) {
  const box = document.createElement("div");
  box.className = "facet collapsed";
  const head = document.createElement("button");
  head.type = "button"; head.className = "facet-h";
  head.innerHTML = `<span>${esc(label)}</span><span class="exp">Expand</span>`;
  const body = document.createElement("div"); body.className = "facet-body";
  head.addEventListener("click", () => { const collapsed = box.classList.toggle("collapsed"); head.querySelector(".exp").textContent = collapsed ? "Expand" : "Hide"; });
  box.appendChild(head); box.appendChild(body);
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
  const rb = document.createElement("label");
  rb.className = "russia-toggle";
  rb.innerHTML = `<input type="checkbox" /> <span>Russian products</span>`;
  rb.querySelector("input").checked = state.filters.showRussian;
  rb.querySelector("input").addEventListener("change", (e) => { state.filters.showRussian = e.target.checked; render(); });
  els.facets.appendChild(rb);
}
function matches(row) {
  const f = state.filters;
  if (!f.showRussian && first(row.Country) === "Russia") return false;
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
  els.empty.hidden = list.length > 0;
  list.forEach((row, i) => els.grid.appendChild(card(row, i)));
}

boot().catch((e) => { document.body.innerHTML = `<pre style="padding:20px">Failed to load catalogue: ${e.message}</pre>`; });
