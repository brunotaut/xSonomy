// xSonomy Companies registry — client-side filter + 100/page pagination.
// Loads /data/companies.json (written by the build) and renders the card rows.

const TYPE_LABEL = { prime:"Prime", tier1:"Tier 1", tier2:"Tier 2", sme:"SME", startup:"Startup",
  state_owned:"State-owned", research_institute:"Research institute", university:"University",
  jv:"Joint venture", division:"Division", distributor:"Distributor", other:"Other" };
const TYPE_COLOR = { prime:"#5fd0e0", tier1:"#8fd94a", tier2:"#8fd94a", sme:"#5fd0e0", startup:"#c95fff",
  state_owned:"#ffc24d", research_institute:"#9aa6ad", university:"#9aa6ad", jv:"#ff7a4f",
  division:"#6b7780", distributor:"#ffc24d", other:"#6b7780" };
const fmtType = (t) => (t ? (TYPE_LABEL[t] || t) : "");

const CMETA = {
  "United States":["US","NORTH AM"],"USA":["US","NORTH AM"],"Canada":["CA","NORTH AM"],
  "United Kingdom":["GB","EUROPE"],"France":["FR","EUROPE"],"Germany":["DE","EUROPE"],"Germany/USA":["DE","EUROPE"],
  "Italy":["IT","EUROPE"],"Spain":["ES","EUROPE"],"Netherlands":["NL","EUROPE"],"Sweden":["SE","EUROPE"],
  "Norway":["NO","EUROPE"],"Finland":["FI","EUROPE"],"Denmark":["DK","EUROPE"],"Poland":["PL","EUROPE"],
  "Czech Republic":["CZ","EUROPE"],"Czechia":["CZ","EUROPE"],"Estonia":["EE","EUROPE"],"Latvia":["LV","EUROPE"],
  "Lithuania":["LT","EUROPE"],"Bulgaria":["BG","EUROPE"],"Romania":["RO","EUROPE"],"Switzerland":["CH","EUROPE"],
  "Austria":["AT","EUROPE"],"Belgium":["BE","EUROPE"],"Slovenia":["SI","EUROPE"],"Ukraine":["UA","EUROPE"],"Turkey":["TR","EUROPE"],
  "Israel":["IL","MIDEAST"],"United Arab Emirates":["AE","MIDEAST"],"Iran":["IR","MIDEAST"],
  "China":["CN","APAC"],"Japan":["JP","APAC"],"South Korea":["KR","APAC"],"Singapore":["SG","APAC"],
  "India":["IN","APAC"],"Australia":["AU","APAC"],"Pakistan":["PK","APAC"],
  "Russia":["RU","EURASIA"],"Belarus":["BY","EURASIA"],"South Africa":["ZA","AFRICA"],
};
function countryMeta(name) {
  const e = CMETA[name]; if (!e) return { flag:"", region:"" };
  const flag = String.fromCodePoint(...[...e[0]].map((ch) => 0x1F1E6 + ch.charCodeAt(0) - 65));
  return { flag, region: e[1] };
}
const esc = (s) => String(s == null ? "" : s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const initials = (n) => (String(n||"").replace(/[^A-Za-z0-9]/g,"").slice(0,2).toUpperCase() || "—");
const empShort = (r) => ({ "1-10":"1–10","11-50":"11–50","51-200":"51–200","201-500":"201–500","501-1000":"501–1K","1001-5000":"1K–5K","5001-10000":"5K–10K","10000+":"10K+" }[r] || r || "");
function moneyShort(a, cur) {
  if (a == null || a === "") return ""; const n = Number(a); if (!isFinite(n)) return "";
  const sym = ({USD:"$",EUR:"€",GBP:"£",JPY:"¥"}[cur]) || (cur ? cur+" " : "$");
  if (n >= 1e9) return sym + (n/1e9).toFixed(n>=1e10?0:2).replace(/\.?0+$/,"") + "B";
  if (n >= 1e6) return sym + Math.round(n/1e6) + "M";
  if (n >= 1e3) return sym + Math.round(n/1e3) + "K";
  return sym + n;
}
function bar(v, max, cls, color) {
  const n = Number(v); if (!v || !isFinite(n) || max <= 0) return "";
  const pct = Math.max(4, Math.min(100, Math.round(n/max*100)));
  return `<div class="bartrack"><div class="bar ${cls}" style="${color?`background:${color};`:""}width:${pct}%"></div></div>`;
}

const PER = 100;
let DATA = [], MAXREV = 1, MAXVAL = 1;
const state = { q:"", types:new Set(), regions:new Set(), sanctioned:false, page:1 };

const el = (id) => document.getElementById(id);

function row(c) {
  const dash = '<span class="mut">—</span>';
  const tcol = TYPE_COLOR[c.company_type] || "#9aa6ad";
  const nm = esc(c.name);
  const nameInner = c.website ? `<a href="${esc(c.website)}" target="_blank" rel="noopener">${nm}</a>` : nm;
  const { flag, region } = countryMeta(c.hq_country);
  const cc = c.hq_country ? `<div class="cc">${flag?`<span class="fl">${flag}</span>`:""}${esc(c.hq_country)}${region?` · ${region}`:""}</div>` : "";
  const typeCell = c.company_type ? `<span class="badge" style="color:${tcol}">${esc(fmtType(c.company_type))}</span>` : dash;
  const emp = empShort(c.employee_range);
  const rev = moneyShort(c.revenue_amount, c.revenue_currency);
  const val = moneyShort(c.valuation, c.valuation_currency);
  const fy = c.revenue_year ? `<span class="fy">FY${String(c.revenue_year).slice(-2)}</span>` : "";
  return `<tr>
    <td><div class="corow"><span class="mono-sq" style="--c:${tcol}"><i class="br"></i>${initials(c.name)}</span>
      <div><div class="cn">${nameInner}${c.is_sanctioned?' <span class="flag">Sanctioned</span>':""}</div>${cc}</div></div></td>
    <td>${typeCell}</td>
    <td class="emp">${emp?`<div class="v">${esc(emp)}</div><div class="l">Employees</div>`:dash}</td>
    <td class="money">${rev?`<div class="v">${rev}${fy}</div>${bar(c.revenue_amount,MAXREV,"rev")}`:dash}</td>
    <td class="money">${val?`<div class="v" style="color:${tcol}">${val}</div>${bar(c.valuation,MAXVAL,"val",tcol)}`:dash}</td>
  </tr>`;
}

function applyFilters() {
  const q = state.q.trim().toLowerCase();
  return DATA.filter((c) => {
    if (state.sanctioned && !c.is_sanctioned) return false;
    if (state.types.size && !state.types.has(c.company_type)) return false;
    if (state.regions.size && !state.regions.has(countryMeta(c.hq_country).region)) return false;
    if (q && !(`${c.name} ${c.hq_country||""}`.toLowerCase().includes(q))) return false;
    return true;
  });
}

function render() {
  const filtered = applyFilters();
  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  if (state.page > pages) state.page = 1;
  const from = (state.page - 1) * PER;
  const slice = filtered.slice(from, from + PER);
  el("cocount").innerHTML = filtered.length
    ? `Showing ${from+1}–${from+slice.length} of <b>${filtered.length}</b> · page ${state.page} of ${pages}`
    : "No companies match these filters.";
  el("cogrid").innerHTML = slice.length
    ? `<div class="cowrap"><table class="cotable"><thead><tr><th>Company</th><th>Type</th><th>Employees</th><th>Revenue</th><th>Valuation</th></tr></thead><tbody>${slice.map(row).join("")}</tbody></table></div>`
    : "";
  // pager
  const btn = (label, p, opt = {}) =>
    `<button ${opt.dis?"disabled":""} ${opt.cur?'class="cur"':""} data-p="${p}">${label}</button>`;
  let pg = btn("← Prev", state.page-1, { dis: state.page<=1 });
  for (let p = 1; p <= pages; p++) pg += btn(p, p, { cur: p===state.page });
  pg += btn("Next →", state.page+1, { dis: state.page>=pages });
  el("copager").innerHTML = pages > 1 ? pg : "";
  el("copager").querySelectorAll("button[data-p]").forEach((b) => {
    if (!b.disabled) b.onclick = () => { state.page = Number(b.dataset.p); render(); window.scrollTo(0,0); };
  });
}

function chip(container, label, active, onclick, color) {
  const b = document.createElement("button");
  b.className = "cochip" + (active ? " on" : "");
  b.textContent = label;
  if (color && active) b.style.color = color;
  b.onclick = onclick;
  container.appendChild(b);
}

function buildFilters() {
  // Company type facet
  const types = [...new Set(DATA.map((c) => c.company_type).filter(Boolean))]
    .sort((a,b) => fmtType(a).localeCompare(fmtType(b)));
  const tWrap = el("cofacet-type");
  const drawTypes = () => { tWrap.innerHTML = "";
    types.forEach((t) => chip(tWrap, fmtType(t), state.types.has(t), () => {
      state.types.has(t) ? state.types.delete(t) : state.types.add(t); state.page=1; drawTypes(); render();
    }, TYPE_COLOR[t]));
  };
  drawTypes();
  // Region facet
  const regions = [...new Set(DATA.map((c) => countryMeta(c.hq_country).region).filter(Boolean))].sort();
  const rWrap = el("cofacet-region");
  const drawRegions = () => { rWrap.innerHTML = "";
    regions.forEach((r) => chip(rWrap, r, state.regions.has(r), () => {
      state.regions.has(r) ? state.regions.delete(r) : state.regions.add(r); state.page=1; drawRegions(); render();
    }));
  };
  drawRegions();
  // search
  el("cosearch").oninput = (e) => { state.q = e.target.value; state.page=1; render(); };
  // sanctioned toggle
  el("cosanc").onchange = (e) => { state.sanctioned = e.target.checked; state.page=1; render(); };
  // reset
  el("coreset").onclick = () => {
    state.q=""; state.types.clear(); state.regions.clear(); state.sanctioned=false; state.page=1;
    el("cosearch").value=""; el("cosanc").checked=false; drawTypes(); drawRegions(); render();
  };
}

(async function init() {
  try {
    const res = await fetch("/data/companies.json");
    DATA = await res.json();
  } catch (e) { el("cocount").textContent = "Failed to load companies."; return; }
  MAXREV = Math.max(1, ...DATA.map((c) => Number(c.revenue_amount) || 0));
  MAXVAL = Math.max(1, ...DATA.map((c) => Number(c.valuation) || 0));
  buildFilters();
  render();
})();
