export function filterCompanies(companies, filters) {
  const q = (filters.q || '').trim().toLocaleLowerCase();
  return companies.filter(c =>
    (!filters.type || c.companyType === filters.type) &&
    (!filters.country || c.country === filters.country) &&
    (!filters.domain || (filters.domain === 'both' ? c.domains.length === 2 : c.domains.includes(filters.domain))) &&
    (!filters.sector || c.sectors.includes(filters.sector)) &&
    (!q || [c.name, c.description, c.countryName, ...(c.sectorNames || []), ...c.products.map(p => p.name)].join(' ').toLocaleLowerCase().includes(q))
  );
}

export function summarize(companies) {
  const countries = new Map(); const sectors = new Map();
  const domains = { uav: 0, cuas: 0, both: 0 };
  for (const c of companies) {
    countries.set(c.country, (countries.get(c.country) || 0) + 1);
    for (const s of new Set(c.sectors)) sectors.set(s, (sectors.get(s) || 0) + 1);
    if (c.domains.length === 2) domains.both++;
    else if (c.domains.includes('uav')) domains.uav++;
    else if (c.domains.includes('counter-uas')) domains.cuas++;
  }
  return { total: companies.length, countries, sectors, domains };
}

export function readFilters(search) {
  const p = new URLSearchParams(search);
  return { type: p.get('type') || '', q: p.get('q') || '', country: p.get('country') || '', domain: p.get('domain') || '', sector: p.get('sector') || '', view: ['companies', 'technologies'].includes(p.get('view')) ? p.get('view') : 'overview' };
}

export function filterQuery(filters) {
  const p = new URLSearchParams();
  for (const key of ['q', 'country', 'domain', 'sector', 'type', 'view']) if (filters[key] && !(key === 'view' && filters[key] === 'overview')) p.set(key, filters[key]);
  return p.toString() ? `?${p}` : '';
}
