import { filterCompanies, summarize, readFilters, filterQuery } from './landscape-model.js';

const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const flagCodes = new Set('AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE GB NO CH UA TR'.split(' '));
const flag = code => flagCodes.has(code) ? `<img class="flag-image" src="/assets/flags/${code.toLowerCase()}.svg" width="24" height="18" alt="" aria-hidden="true">` : '';
const count = n => n.toLocaleString('en-GB');
const colors = { uav: '#5ba5ff', cuas: '#b495f5', both: '#53d6bc' };
const paths = {
  building: '<path d="M5 22V5h14v17M9 5V2h6v3M9 22v-5h6v5M8 9h2m4 0h2M8 13h2m4 0h2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 6h14M5 18h14"/>',
  drone: '<path d="m6 6 12 12M18 6 6 18"/><rect x="9" y="9" width="6" height="6" rx="1"/><ellipse cx="5" cy="5" rx="4" ry="2"/><ellipse cx="19" cy="5" rx="4" ry="2"/><ellipse cx="5" cy="19" rx="4" ry="2"/><ellipse cx="19" cy="19" rx="4" ry="2"/>',
  shield: '<path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6Z"/><path d="M12 6v11"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v4m6-4v4M9 18v4m6-4v4M2 9h4m-4 6h4m12-6h4m-4 6h4"/>',
};
const icon = name => `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
let data, geography, countryByCode, sectorById;
let state = readFilters(location.search);

async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Cannot load ${url}`);
  return response.json();
}

async function init() {
  try {
    data = await getJSON('/data/landscape.json');
    if (!Array.isArray(data.companies) || !Array.isArray(data.sectors) || !Array.isArray(data.countries)) throw new Error('Invalid landscape data');
    countryByCode = new Map(data.countries.map(c => [c.code, c]));
    sectorById = new Map(data.sectors.map(s => [s.id, s]));
    data.companies = data.companies.map(c => ({ ...c, countryName: countryByCode.get(c.country)?.name || c.country, sectorNames: c.sectors.map(s => sectorById.get(s)?.name || s) }));
    $('country').innerHTML += data.countries.map(c => `<option value="${esc(c.code)}">${esc(c.code)} · ${esc(c.name)}</option>`).join('');
    try { geography = await getJSON('/assets/europe-map.json'); } catch { geography = null; }
    $('updated').textContent = `Updated ${new Date(data.generatedAt).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}`;
    if (data.preview) $('updated').textContent = 'DEMO DATA · preview only';
    $('dashboard').hidden = false;
    bind(); render();
  } catch (error) {
    $('status').innerHTML = 'The landscape is temporarily unavailable. <button type="button" id="retry">Try again</button> or <a href="/companies/">browse the company registry</a>.';
    $('retry').addEventListener('click', () => location.reload());
    console.error(error);
  }
}

function setState(patch) {
  state = { ...state, ...patch };
  history.pushState(null, '', location.pathname + filterQuery(state));
  render();
}

function bind() {
  $('filters').addEventListener('submit', e => e.preventDefault());
  $('search').addEventListener('input', e => {
    state.q = e.target.value;
    history.replaceState(null, '', location.pathname + filterQuery(state));
    render();
  });
  $('company-type').addEventListener('change', e => setState({ type:e.target.value }));
  $('domain').addEventListener('change', e => setState({ domain: e.target.value }));
  $('country').addEventListener('change', e => setState({ country: e.target.value }));
  $('reset').addEventListener('click', () => setState({ q:'', country:'', domain:'', sector:'', type:'' }));
  $('views').addEventListener('click', e => { if(e.target.dataset.view) setState({ view:e.target.dataset.view }); });
  $('all-tech').addEventListener('click', () => setState({ view:'technologies' }));
  document.addEventListener('click', e => {
    const clear = e.target.closest('[data-clear]');
    if (clear) return setState({ [clear.dataset.clear]:'' });
    const country = e.target.closest('[data-country]');
    if (country) return setState({ country:state.country === country.dataset.country ? '' : country.dataset.country });
    const sector = e.target.closest('[data-sector]');
    if (sector) return setState({ sector:sector.dataset.sector, view:'companies' });
    const type = e.target.closest('[data-type]');
    if (type) return setState({ type:type.dataset.type, view:'companies' });
    const domain = e.target.closest('[data-domain]');
    if (domain) return setState({ domain:domain.dataset.domain, view:'companies' });
    const profile = e.target.closest('[data-profile]');
    if (profile) showProfile(profile.dataset.profile);
  });
  $('close-profile').addEventListener('click', () => $('profile').close());
  $('profile').addEventListener('click', e => { if(e.target === $('profile')) { const r = e.target.getBoundingClientRect(); if(e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) e.target.close(); } });
  window.addEventListener('popstate', () => { state = readFilters(location.search); render(); });
}

function render() {
  const companies = filterCompanies(data.companies, state);
  const stats = summarize(companies);
  $('company-type').value = state.type || '';
  $('search').value = state.q; $('domain').value = state.domain; $('country').value = state.country;
  for (const view of ['overview','companies','technologies']) $(view).hidden = state.view !== view;
  for (const button of $('views').children) button.dataset.view === state.view ? button.setAttribute('aria-current','page') : button.removeAttribute('aria-current');
  const labels = { type:state.type === 'prime' ? 'Primes' : state.type, q:state.q, country:countryByCode.get(state.country)?.name || state.country, domain:({uav:'UAV','counter-uas':'Counter-UAS',both:'Both domains'})[state.domain] || state.domain, sector:sectorById.get(state.sector)?.name || state.sector };
  $('active-filters').innerHTML = Object.entries(labels).filter(([,v]) => v).map(([k,v]) => `<button type="button" data-clear="${k}" aria-label="Remove ${esc(v)} filter">${esc(v)} ×</button>`).join('');
  $('status').textContent = companies.length ? '' : 'No companies match these filters. Reset filters to explore the full landscape.';
  $('metrics').innerHTML = [
    ['building',stats.total,'Companies','Unique records'],
    ['globe',stats.countries.size,'Countries','Represented'],
    ['drone',stats.domains.uav + stats.domains.both,'UAV','Including both'],
    ['shield',stats.domains.cuas + stats.domains.both,'Counter-UAS','Including both'],
  ].map(([i,n,label,note]) => `<div class="metric">${icon(i)}<div><strong>${count(n)}</strong><span>${label}</span></div><small>${note}</small></div>`).join('');
  renderMap(stats);
  renderCharts(stats);
  renderExplore(stats);
  $('explore').innerHTML += `<button type="button" class="explore-tile" data-type="prime">${icon('building')}<span><strong>Primes</strong><small>${count(companies.filter(c=>c.companyType==='prime').length)} companies</small></span><b aria-hidden="true">↗</b></button>`;
  $('drone-breakdown').innerHTML = droneGroups(stats);
  renderCompanies(companies);
  renderTechnologies(stats);
}

function renderMap(stats) {
  const max = Math.max(1,...stats.countries.values());
  $('map-max').textContent = `${stats.total ? max : 0} companies`;
  $('map-tooltip').hidden = true;
  if (geography) {
    const drawn = new Set();
    const shade = code => {
      if (!countryByCode.has(code)) return '#202a38';
      const n = stats.countries.get(code) || 0;
      return n ? `hsl(214 78% ${32 + 32 * Math.sqrt(n/max)}%)` : '#192a42';
    };
    $('map').innerHTML = `<svg viewBox="0 0 760 420" role="group" aria-label="Europe. Select a country to filter companies.">${geography.countries.map(c => {
      drawn.add(c.code);
      const n = stats.countries.get(c.code) || 0;
      const selectable = countryByCode.has(c.code);
      return `<path d="${esc(c.path)}" fill="${shade(c.code)}" ${selectable ? `role="button" tabindex="0" data-country="${c.code}" aria-pressed="${state.country === c.code}" aria-label="${esc(countryByCode.get(c.code).name)}, ${n} companies"` : ''}><title>${esc(c.name)}${selectable ? `: ${n} companies` : ': outside scope'}</title></path>`;
    }).join('')}${(geography.markers || []).filter(c => countryByCode.has(c.code) && !drawn.has(c.code)).map(c => `<circle cx="${c.x}" cy="${c.y}" r="4" fill="${shade(c.code)}" role="button" tabindex="0" data-country="${c.code}" aria-pressed="${state.country === c.code}" aria-label="${esc(countryByCode.get(c.code).name)}, ${stats.countries.get(c.code)||0} companies"><title>${esc(countryByCode.get(c.code).name)}</title></circle>`).join('')}</svg>`;
    for (const node of $('map').querySelectorAll('[data-country]')) {
      const show = () => {
        const code = node.dataset.country;
        $('map-tooltip').innerHTML = `<strong>${flag(code)} ${esc(countryByCode.get(code).name)}</strong><span>${count(stats.countries.get(code)||0)} companies · click to filter</span>`;
        $('map-tooltip').hidden = false;
      };
      node.addEventListener('mouseenter', show); node.addEventListener('focus', show);
      node.addEventListener('mouseleave', () => $('map-tooltip').hidden = true);
      node.addEventListener('blur', () => $('map-tooltip').hidden = true);
      node.addEventListener('keydown', e => { if(['Enter',' '].includes(e.key)) { e.preventDefault(); setState({ country:state.country === node.dataset.country ? '' : node.dataset.country }); $('country').focus(); } });
    }
  } else $('map').innerHTML = '<p style="padding:60px 24px">Map unavailable. Use the country filter or country buttons below.</p>';
  const top = [...stats.countries].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0])).slice(0,5);
  const shorts = { GB:'UK', CZ:'Czechia' };
  $('country-chips').innerHTML = top.map(([code,n]) => `<button type="button" class="country-chip" data-country="${esc(code)}" aria-pressed="${state.country===code}" title="${esc(countryByCode.get(code).name)}"><span class="flag" aria-hidden="true">${flag(code)}</span><span><strong>${esc(shorts[code] || countryByCode.get(code).name)}</strong><small>${count(n)} companies</small></span></button>`).join('');
}

function renderCharts(stats) {
  const groups = data.sectors.filter(s => ['uav','counter-uas'].includes(s.parent));
  const ranked = groups.map(s => ({...s,n:stats.sectors.get(s.id)||0})).filter(s => s.n).sort((a,b)=>b.n-a.n).slice(0,6);
  const max = Math.max(1,...ranked.map(s=>s.n));
  $('capabilities').innerHTML = ranked.length ? ranked.map(s => `<button type="button" class="bar-row ${s.domain==='counter-uas'?'cuas':''}" data-sector="${esc(s.id)}" aria-label="${esc(s.name)}: ${s.n} companies. Show companies."><span class="bar-label" title="${esc(s.name)}">${esc(s.name)}</span><span class="bar-track"><i style="width:${s.n/max*100}%"></i></span><strong>${count(s.n)}</strong></button>`).join('') : '<p>No capability data for this selection.</p>';
  const segments = [['uav','UAV only',stats.domains.uav],['cuas','Counter-UAS only',stats.domains.cuas],['both','Both domains',stats.domains.both]];
  const circumference = 2*Math.PI*48; let offset = 0;
  $('donut').innerHTML = `<svg viewBox="0 0 120 120" role="img" aria-label="${segments.map(([,label,n])=>`${label}: ${n}`).join('; ')}"><circle cx="60" cy="60" r="48" fill="none" stroke="#263246" stroke-width="13"/>${segments.map(([key,,n]) => {
    const length = stats.total ? n/stats.total*circumference : 0;
    const svg = `<circle cx="60" cy="60" r="48" fill="none" stroke="${colors[key]}" stroke-width="13" stroke-dasharray="${length} ${circumference-length}" stroke-dashoffset="${-offset}"/>`;
    offset += length; return n ? svg : '';
  }).join('')}</svg><div class="donut-label"><strong>${count(stats.total)}</strong><span>companies</span></div>`;
  // Legend is descriptive: clicking "UAV only" must not select an overlapping UAV filter.
  $('domain-legend').innerHTML = segments.map(([key,label,n]) => `<div class="legend-row"><i style="background:${colors[key]}"></i><div><strong>${label}</strong><span>${count(n)} · ${stats.total ? Math.round(n/stats.total*100) : 0}%</span></div></div>`).join('');
}

function renderExplore(stats) {
  const groups = [['uav-platform','UAV platforms','drone'],['uav-ecosystem','Enabling technology','chip'],['counter-uas','Counter-UAS','shield']];
  $('explore').innerHTML = groups.filter(([id])=>sectorById.has(id)).map(([id,name,i])=>`<button type="button" class="explore-tile" data-sector="${id}">${icon(i)}<span><strong>${name}</strong><small>${count(stats.sectors.get(id)||0)} companies</small></span><b aria-hidden="true">↗</b></button>`).join('');
}

function companyCapabilities(c) {
  return c.explicit.map(id => sectorById.get(id)).filter(Boolean).sort((a,b)=>Number(b.leaf)-Number(a.leaf));
}

function renderCompanies(companies) {
  $('company-count').textContent = `${count(companies.length)} companies`;
  $('company-empty').hidden = companies.length > 0;
  $('company-rows').innerHTML = companies.map(c => `<tr><td><button type="button" data-profile="${esc(c.id)}">${esc(c.name)}</button></td><td><span class="flag" aria-hidden="true">${flag(c.country)}</span>${esc(c.countryName)}</td><td>${c.domains.map(d => `<span class="pill">${d==='uav'?'UAV':'Counter-UAS'}</span>`).join('')}</td><td>${companyCapabilities(c).slice(0,2).map(s=>`<span class="pill">${esc(s.name)}</span>`).join('')}${c.explicit.length>2?`<span class="pill">+${c.explicit.length-2}</span>`:''}</td><td><a href="/companies/${encodeURIComponent(c.slug)}/" aria-label="Full profile: ${esc(c.name)}">↗</a></td></tr>`).join('');
}

function sectorCards(sectors, stats) {
  return `<div class="tech-grid">${sectors.map(s => `<button class="tech-card" type="button" data-sector="${esc(s.id)}"><strong>${esc(s.name)}</strong><span>${count(stats.sectors.get(s.id)||0)}</span><small>companies →</small></button>`).join('')}</div>`;
}
function droneGroups(stats) {
  return [['uav-platform','Platform types'],['uav-mission','Missions & applications']].map(([id,label]) => `<section class="tech-group"><h3>${label}</h3>${sectorCards(data.sectors.filter(s=>s.parent===id),stats)}</section>`).join('') + '<p class="chart-note">Counts represent classified companies, not aircraft models. Types and missions can overlap; unclassified capabilities are not inferred.</p>';
}
function renderTechnologies(stats) {
  $('technology-groups').innerHTML = droneGroups(stats) + ['uav-ecosystem','counter-uas'].map(id => `<section class="tech-group"><h3>${id==='uav-ecosystem'?'Enabling technology':'Counter-UAS'}</h3>${sectorCards(data.sectors.filter(s=>s.leaf && (id==='counter-uas'?s.domain===id:s.parent===id)),stats)}</section>`).join('');
}

function safeURL(url) { try { const u = new URL(url, location.origin); return ['http:','https:'].includes(u.protocol) ? u.href : null; } catch { return null; } }
function showProfile(id) {
  const c = data.companies.find(c => c.id === id);
  if (!c) return;
  const sources = c.sources.filter(safeURL);
  $('profile-content').innerHTML = `<p class="profile-country">${flag(c.country)} ${esc(c.countryName)} · ${c.domains.map(d=>d==='uav'?'UAV':'Counter-UAS').join(' + ')}</p><h2 class="profile-title">${esc(c.name)}</h2>${c.description?`<p class="profile-description">${esc(c.description)}</p>`:''}<div>${companyCapabilities(c).map(s=>`<span class="pill">${esc(s.name)}</span>`).join('')}</div>${c.products.length?`<section class="profile-section"><h3>Published products</h3><ul>${c.products.slice(0,6).map(p=>`<li>${p.url && safeURL(p.url)?`<a href="${esc(safeURL(p.url))}">${esc(p.name)}</a>`:esc(p.name)}</li>`).join('')}</ul>${c.products.length>6?`<p class="profile-note">${c.products.length-6} more on the full profile.</p>`:''}</section>`:''}${sources.length?`<section class="profile-section"><h3>Company & capability sources</h3><ul>${sources.slice(0,5).map(u=>`<li><a href="${esc(safeURL(u))}" target="_blank" rel="noopener noreferrer">${esc(new URL(u).hostname)} ↗</a></li>`).join('')}</ul></section>`:''}<p class="profile-note">Maturity is not assessed in this view. Category membership does not imply deployment.</p><a class="profile-action" href="/companies/${encodeURIComponent(c.slug)}/">View full company profile ↗</a>`;
  $('profile').showModal();
}

init();
