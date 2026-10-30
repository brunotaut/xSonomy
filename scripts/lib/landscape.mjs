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
      description: c.description || '', companyType: c.company_type || null,
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

// ---- Investor research export ----
// A separate export, built by the same pipeline and pointed to from landscape.json, so
// the map payload does not grow for consumers that only want companies.
//
// Only `approved` rows reach this: the staging layer holds all 106 research records, and
// approval requires a validated city-level location. The caveats are carried in the
// payload rather than left in a report, because every one of them is a mistake a consumer
// would otherwise make: a country association is an index entry, not a headquarters or an
// eligibility claim; a coordinate is a city centroid, not an office; a published ticket
// range is not available capital; and an empty field means "not established", never zero.
export const INVESTOR_EXPORT = 'european-defence-investors';

export async function fetchLandscapeInvestors(sbFetchAll) {
  const [investors, reviews] = await Promise.all([
    sbFetchAll('v_landscape_investors', { select: '*', order: 'name.asc' }, 'investors'),
    sbFetchAll('v_investor_country_reviews', { select: '*', order: 'country.asc' }, 'investor country reviews'),
  ]);
  return buildLandscapeInvestors({ investors, reviews });
}

export function buildLandscapeInvestors({ investors, reviews }) {
  const records = investors.map((r) => {
    const locations = (r.locations || []).map((l) => ({
      city: l.city, country: l.country,
      latitude: l.latitude, longitude: l.longitude,
      // An operational office, a contact address, a meeting venue and a legal
      // registration are different facts; the kind is what keeps them apart.
      kind: l.kind, precision: l.precision,
      sources: (l.sources || []).filter((s) => isWebUrl(s.url)),
    }));
    // Approval required one, so an empty list here means the projection or the approval
    // gate has drifted. Fail loudly rather than publish a record with nowhere to put it.
    if (!locations.length) throw new Error(`Approved investor ${r.slug} has no location.`);
    return {
      id: r.id, slug: r.slug, name: r.name,
      entityType: r.entity_type || null,
      evidenceStatus: r.evidence_status,
      evidenceStatusLabel: r.evidence_status_label || null,
      evidenceBasis: r.evidence_basis || null,
      uavReviewPriority: r.priority_for_uav_review || null,
      stages: r.stages || [], focus: r.focus || [],
      selectedPortfolio: r.selected_portfolio || [],
      investmentGeography: r.investment_geography || [],
      ticket: r.ticket_currency ? {
        currency: r.ticket_currency, minimum: r.ticket_minimum, maximum: r.ticket_maximum,
        basis: r.ticket_basis, source: isWebUrl(r.ticket_source_url) ? r.ticket_source_url : null,
      } : null,
      legalDomicile: r.legal_domicile_country ? {
        country: r.legal_domicile_country, precision: r.legal_domicile_precision,
        note: r.legal_domicile_note,
      } : null,
      countryAssociations: r.country_associations || [],
      researchNote: r.research_note || null,
      missingFields: r.missing_fields || [],
      verifiedAsOf: r.verified_as_of || null,
      // The investor already in the catalogue that this record describes, where one
      // exists. A link, not a merge: that row is unchanged.
      matchedInvestorId: r.matched_investor_id || null,
      sources: (r.sources || []).filter((s) => isWebUrl(s.url)),
      locations,
    };
  });
  return {
    edition: INVESTOR_EXPORT, generatedAt: new Date().toISOString(),
    membership: 'Approved investor research records: a confirmed deal or a stated mandate, ' +
      'with a published city-level location, an evidence URL and a review date.',
    caveats: {
      countryAssociations: investors[0]?.country_association_meaning ||
        'Research index; not a verified headquarters, legal domicile or eligibility field.',
      coordinates: 'Approximate city centroids, not exact office locations.',
      locationKinds: 'Published offices, contact addresses, meeting locations and legal ' +
        'registrations are distinct and are not interchangeable.',
      tickets: 'Published investment or financing ranges; not a guarantee of available capital.',
      fundSizes: 'Deliberately omitted: targets, commitments and AUM are not comparable.',
      emptyFields: 'An absent value means not established, never zero.',
      classification: 'Adjacent investors, unverified candidates and financial programmes are ' +
        'classified separately from confirmed deals and stated mandates, and are not approved here.',
    },
    countryReviews: reviews.map((c) => ({
      country: c.country, name: c.name_en, status: c.status,
      note: c.note_en, reviewedAt: c.reviewed_at, recordCount: c.record_count,
    })),
    investors: records,
  };
}
