// Read-only projection of the reconciled working edition. Never publishes drafts
// or recomputes research verdicts from loose product/category/name matches.
export const LANDSCAPE = 'europe-uav-cuas-2026';

export async function fetchLandscape(sbFetchAll, companies, productsByCompany) {
  const [candidates, countries, sectors, assignments] = await Promise.all([
    sbFetchAll('landscape_candidates', { select: 'company_id,status', landscape_slug: `eq.${LANDSCAPE}`, order: 'company_id.asc' }),
    sbFetchAll('countries', { select: 'code,name,is_landscape_scope', order: 'code.asc' }),
    sbFetchAll('sectors', { select: 'id,slug,name,parent_id', order: 'id.asc' }),
    sbFetchAll('company_sectors', { select: 'company_id,sector_id,source_urls', order: 'company_id.asc,sector_id.asc' }),
  ]);
  return buildLandscape({ companies, candidates, countries, sectors, assignments, productsByCompany });
}

export function buildLandscape({ companies, candidates, countries, sectors, assignments, productsByCompany = new Map() }) {
  const byId = new Map(sectors.map(s => [s.id, s]));
  const roots = sectors.filter(s => ['uav', 'counter-uas'].includes(s.slug));
  if (roots.length !== 2) throw new Error('Landscape requires UAV and Counter-UAS taxonomy roots.');
  const ancestry = id => {
    const result = []; const seen = new Set();
    while (id) {
      if (seen.has(id)) throw new Error('Cycle in landscape taxonomy.');
      seen.add(id);
      const sector = byId.get(id);
      if (!sector) throw new Error(`Missing taxonomy sector ${id}`);
      result.push(sector); id = sector.parent_id;
    }
    return result;
  };
  const domain = s => ancestry(s.id).find(x => roots.some(r => r.id === x.id))?.slug;
  const taxonomy = sectors.filter(s => domain(s)).map(s => ({
    id: s.slug, name: s.name, parent: byId.get(s.parent_id)?.slug || null,
    domain: domain(s), leaf: !sectors.some(child => child.parent_id === s.id),
  }));
  const included = new Set(candidates.filter(c => c.status === 'included').map(c => c.company_id));
  const scope = countries.filter(c => c.is_landscape_scope === true);
  const countryByName = new Map(scope.map(c => [c.name, c]));
  const companyAssignments = new Map();
  for (const a of assignments) {
    if (!byId.has(a.sector_id)) throw new Error(`Missing assigned sector ${a.sector_id}`);
    if (!domain(byId.get(a.sector_id))) continue;
    const rows = companyAssignments.get(a.company_id) || [];
    rows.push(a); companyAssignments.set(a.company_id, rows);
  }
  const seen = new Set(); const rows = [];
  for (const c of companies) {
    if (c.publication_status !== 'live' || !included.has(c.id) || !c.slug || !countryByName.has(c.hq_country)) continue;
    if (seen.has(c.id)) throw new Error(`Duplicate landscape company ${c.id}`);
    seen.add(c.id);
    const explicit = companyAssignments.get(c.id) || [];
    if (!explicit.length) continue;
    const effective = new Set(explicit.flatMap(a => ancestry(a.sector_id).map(s => s.slug)));
    rows.push({
      id: c.id, name: c.name, slug: c.slug, country: countryByName.get(c.hq_country).code.trim(),
      description: c.description || '',
      domains: roots.filter(r => effective.has(r.slug)).map(r => r.slug),
      sectors: taxonomy.filter(s => effective.has(s.id)).map(s => s.id),
      explicit: [...new Set(explicit.map(a => byId.get(a.sector_id).slug))],
      sources: [...new Set([...(Array.isArray(c.source_urls) ? c.source_urls : []), ...explicit.flatMap(a => a.source_urls || [])])].filter(isWebUrl),
      website: isWebUrl(c.website) ? c.website : null,
      products: (productsByCompany.get(c.id) || []).map(p => ({ name: p.name, url: p.url || null })),
    });
  }
  return {
    edition: LANDSCAPE, generatedAt: new Date().toISOString(),
    membership: 'Reconciled included companies with publication_status=live, in the configured landscape country scope.',
    countries: scope.map(c => ({ code: c.code.trim(), name: c.name })).sort((a,b) => a.name.localeCompare(b.name)),
    sectors: taxonomy, companies: rows.sort((a,b) => a.name.localeCompare(b.name)),
  };
}

function isWebUrl(value) {
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
}
