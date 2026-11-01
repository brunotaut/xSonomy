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
  // The versioned supplement that used to be merged in here is gone: the twelve workbook
  // additions, the Ukraine flag and the workbook row reference are all database columns now,
  // and the projection carries the whole 118-record directory rather than only the 21
  // records that had a city location.
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
    // A record with no city is normal here: most of the directory is placed only by country
    // association, which is a research-index position and not an office. The map decides
    // what to draw; the directory still lists the record.
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
      // Independent of office country and of investment eligibility.
      ukraineRelated: r.ukraine_related === true,
      // Where a record exists only because a supplied workbook listed it, this says so.
      sourceReference: r.source_reference || null,
      // Persistent relationships from the database, each with its own evidence. `url` is
      // null when the company is not published: the holding is still shown, it just does
      // not link anywhere.
      portfolio: (r.portfolio || []).map((h) => ({
        ...h, source: isWebUrl(h.source) ? h.source : null,
      })),
      // Holdings the investor publishes that no company record could be resolved to.
      portfolioUnresolved: (r.portfolio_unresolved || []).map((u) => ({
        ...u, source: isWebUrl(u.source) ? u.source : null,
      })),
      // Capital committed to another manager's fund. Kept in its own array, never
      // merged into `portfolio`: the fund's own investments are not this investor's
      // companies, and presenting them as holdings is the error this field prevents.
      // `targetSlug` is present only when the manager is itself a published record.
      fundPositions: (r.fund_positions || []).map((f) => ({
        ...f, source: isWebUrl(f.source) ? f.source : null,
      })),
      financialMetrics: (r.financial_metrics || []).filter((m) => isWebUrl(m.source)),
      sources: (r.sources || []).filter((s) => isWebUrl(s.url)),
      locations,
    };
  });
  return {
    edition: INVESTOR_EXPORT, generatedAt: new Date().toISOString(),
    membership: 'Investor research directory: confirmed investments, stated mandates, ' +
      'adjacent investors, separately labelled unverified candidates and funding programmes.',
    caveats: {
      countryAssociations: investors[0]?.country_association_meaning ||
        'Research index; not a verified headquarters, legal domicile or eligibility field.',
      coordinates: 'City markers use approximate city centres. A country-association marker ' +
        'is a research-index position, not an office or a headquarters.',
      locationKinds: 'Published offices, contact addresses, meeting locations and legal ' +
        'registrations are distinct and are not interchangeable.',
      tickets: 'Published investment or financing ranges; not a guarantee of available capital.',
      fundSizes: 'Deliberately omitted: targets, commitments and AUM are not comparable.',
      emptyFields: 'An absent value means not established, never zero.',
      classification: 'Evidence status is shown per record. Inclusion does not imply ' +
        'verification or current investment availability. Adjacent investors, unverified ' +
        'candidates and funding programmes keep their own labels and types.',
      portfolio: 'A portfolio relationship is a stored, sourced fact about a holding. It is ' +
        'not an eligibility argument: being in an investor\'s portfolio never admits a ' +
        'company to the UAV and counter-UAS landscape, which has its own criteria.',
      amounts: 'An investor contribution and a total round size are separate fields and ' +
        'either may be unknown. A round total is what all investors supplied together and ' +
        'is never read as one investor\'s cheque.',
      metricTypes: 'Financial metrics are typed precisely: a target is not a close, a first ' +
        'close is not a final close, manager AUM is not a fund, capital invested to date is ' +
        'not committed capital, a typical first cheque is not a fund size, and a count of ' +
        'investments is not a count of companies.',
      unresolvedHoldings: 'Holdings that could not be resolved to a company are listed with ' +
        'the reason rather than matched to a similarly named organisation.',
      fundPositions: 'A fund position is capital committed to another manager\'s fund. It ' +
        'is not a holding: the companies that fund invests in are its own, not this ' +
        'investor\'s, and indirect exposure through a fund is never shown as a direct ' +
        'company holding.',
      retiredRelationships: 'A relationship whose cited source turned out not to support ' +
        'the specific investor and company is withdrawn from the portfolio rather than ' +
        'kept with a softer label, and is listed as an unresolved holding instead.',
    },
    countryReviews: reviews.map((c) => ({
      country: c.country, name: c.name_en, status: c.status,
      note: c.note_en, reviewedAt: c.reviewed_at, recordCount: c.record_count,
    })),
    investors: records,
  };
}

// ---- UAV / Counter-UAS hub research export ----
// A third export beside the landscape and the investors, in its own file with a pointer
// from landscape.json, because hubs are a different kind of thing again: a test centre is
// neither a company in the landscape nor an investor, and must never be mixed into either
// count.
//
// Every caveat below is a mistake a consumer would otherwise make, and most of them are
// mistakes the research itself warns about:
//   * a research recommendation is not an editorial approval, so map_candidate alone did
//     not publish anything;
//   * a contact office, a programme delivery city, a simulation lab and a flight-test
//     locality are different facts, which is what `kind` keeps apart;
//   * a locality centroid is not a facility, a runway or an airspace boundary;
//   * a documented facility is not a bookable one;
//   * planned capability is not current capability, which is why bvlos is carried as the
//     source's own wording rather than reduced to a badge;
//   * a site belongs to another record and is not an independent organisation.
export const HUB_EXPORT = 'european-uav-cuas-hubs';

export async function fetchLandscapeHubs(sbFetchAll) {
  const [hubs, reviews] = await Promise.all([
    sbFetchAll('v_landscape_hubs', { select: '*', order: 'name.asc' }, 'hubs'),
    sbFetchAll('v_hub_country_reviews', { select: '*', order: 'country.asc' }, 'hub country reviews'),
  ]);
  return buildLandscapeHubs({ hubs, reviews });
}

// A hub match is a reviewed conclusion about how a hub record relates to an existing
// catalogue record. Only these three roles state a relationship; see matchConfirmed.
const CONFIRMED_MATCH_ROLES = [
  'same_organisation',
  'facility_of_matched_organisation',
  'related_organisation_different_function',
];

// The profile fields, emitted only when the relationship is confirmed AND the target is
// published. Identity is resolved in the database by id (v_landscape_hubs), never here
// by name, and the slug is never constructed - a company's url is the one routing
// convention the generator already uses, /companies/<slug>/, and an investor has no
// standalone page, so its research slug is emitted for the panel to open.
function matchedProfile(r) {
  const confirmed = CONFIRMED_MATCH_ROLES.includes(r.match_role);
  const company = confirmed && r.matched_company_slug ? String(r.matched_company_slug) : null;
  const investor = confirmed && r.matched_investor_slug ? String(r.matched_investor_slug) : null;
  return {
    matchedCompanySlug: company,
    matchedCompanyUrl: company ? `https://xsonomy.com/companies/${encodeURIComponent(company)}/` : null,
    // The label travels with the link, from the same resolved row. Looking the name up
    // in a payload instead is what made the DLR link read `dlr-german-aerospace-center`:
    // a research institute is not in the landscape company list, so there was no name
    // there either.
    matchedCompanyName: company ? (r.matched_company_name || company) : null,
    matchedInvestorSlug: investor,
    matchedInvestorName: investor ? (r.matched_investor_name || investor) : null,
  };
}

export function buildLandscapeHubs({ hubs, reviews }) {
  const records = hubs.map((r) => {
    const locations = (r.locations || []).map((l) => ({
      locality: l.locality, country: l.country,
      latitude: l.latitude, longitude: l.longitude,
      kind: l.kind, precision: l.precision, coordinateBasis: l.coordinateBasis || null,
    }));
    // Approval required one, so an empty list means the projection or the approval gate
    // has drifted. Fail loudly rather than publish a hub with nowhere to put it.
    if (!locations.length) throw new Error(`Approved hub ${r.research_id} has no location.`);
    const sources = (r.sources || []).filter((s) => isWebUrl(s.url));
    if (!sources.length) throw new Error(`Approved hub ${r.research_id} has no web source.`);
    return {
      id: r.id, researchId: r.research_id, slug: r.slug, name: r.name,
      country: r.country, countryName: r.country_name || null,
      localityText: r.locality_text || null,
      hubType: r.hub_type,
      // organisation | site | programme. Only `organisation` counts as an independent hub.
      recordUnit: r.record_unit,
      evidenceStatus: r.evidence_status,
      technologyFocus: r.technology_focus || [],
      summary: r.summary_en || null,
      researchNote: r.research_note_en || null,
      operationalStatus: r.operational_status || null,
      accessModel: r.access_model || null,
      // The source's own wording, deliberately not reduced to a boolean: "planned for
      // 2027" and "subject to authorisation" are both true and neither is "available".
      bvlosStatus: r.bvlos_status || null,
      cuasEvidence: r.cuas_evidence || null,
      reviewedAt: r.reviewed_at || null,
      // A link to an existing catalogue record, never a merge, and the role says what kind
      // of link it is: the same organisation, a facility of it, or a related organisation
      // with a different function.
      matchedCompanyId: r.matched_company_id || null,
      matchedInvestorId: r.matched_investor_id || null,
      matchRole: r.match_role || null,
      matchNote: r.match_note_en || null,
      // Whether the relationship itself is settled. `same_organisation`,
      // `facility_of_matched_organisation` and `related_organisation_different_function`
      // are all reviewed conclusions - the last says the two are definitely related and
      // definitely not the same thing, which is a finding, not a doubt. `needs_review` is
      // an unresolved candidate and `rejected_false_positive` is a confirmed NON-match,
      // so neither may ever be rendered as a relationship.
      matchConfirmed: CONFIRMED_MATCH_ROLES.includes(r.match_role),
      // Profile links. Two independent conditions, and both must hold: the relationship
      // is confirmed, AND the target has a published profile (the view resolves the
      // stored id to a slug and returns null when no published profile exists). Bofors
      // Test Center is why they are kept apart - its matched company IS published, but
      // the match is only `needs_review`, so it must stay unlinked text.
      ...matchedProfile(r),
      relationships: (r.relationships || []).map((x) => ({
        kind: x.kind, direction: x.direction, researchId: x.researchId,
        name: x.name, published: x.published === true, note: x.note || null,
      })),
      sources, locations,
    };
  });
  const organisations = records.filter((h) => h.recordUnit === 'organisation_or_hub');
  return {
    edition: HUB_EXPORT, generatedAt: new Date().toISOString(),
    membership: 'Approved UAV and Counter-UAS hub research records: a documented relevant ' +
      'function, a public locality with an approximate centroid, and an evidence URL. ' +
      'Planned, historical, unverified and location-pending records are held in research ' +
      'staging and are not here.',
    counts: {
      // Reported separately and never added together. A site belongs to another record, so
      // counting it as an organisation would overstate how many independent hubs exist.
      organisations: organisations.length,
      sites: records.filter((h) => h.recordUnit === 'site').length,
      programmes: records.filter((h) => h.recordUnit === 'programme').length,
      records: records.length,
      locations: records.reduce((n, h) => n + h.locations.length, 0),
      countries: new Set(records.map((h) => h.country)).size,
    },
    caveats: {
      approval: 'A research map-candidate recommendation is not an approval. Each record ' +
        'and locality here was reviewed separately.',
      coordinates: 'Approximate locality centroids, generally rounded to two decimals. ' +
        'Never a runway, an airspace boundary, a flight volume or a facility outline.',
      locationKinds: 'Test localities, research-laboratory cities, simulation-laboratory ' +
        'cities, network offices, operator contact cities and programme delivery cities are ' +
        'distinct and are not interchangeable. A contact office is not a flight-test site.',
      availability: 'A documented facility is not a bookable one. Access, eligibility and ' +
        'commissioning of planned capability are not established by this research.',
      bvlos: 'Carried as the source\'s own wording. Planned or authorisation-dependent ' +
        'BVLOS is not current BVLOS availability.',
      cuas: 'Counter-UAS scope is recorded only where a source states it. Absence means ' +
        'not established, not absent.',
      affiliation: 'Programme or alliance affiliation, including NATO DIANA, does not by ' +
        'itself establish UAV or Counter-UAS capability.',
      recordUnits: 'Sites and programmes are listed alongside organisations but counted ' +
        'separately. A site belongs to another record and is not an independent hub.',
      classification: 'A research laboratory is not automatically a regional industrial ' +
        'cluster, and a national programme is not automatically a physical test site.',
      locationEvidence: 'In this wave every locality carries the same evidence set as its ' +
        'record, so sources are listed once per record rather than repeated per locality.',
      matches: 'A match links this record to an existing catalogue company or investor ' +
        'without merging them. The role states whether it is the same organisation, a ' +
        'facility of it, or a related organisation with a different function.',
      matchLinks: 'A profile link appears only where the relationship is a reviewed ' +
        'conclusion and the matched record has a published profile. A possible match ' +
        'that has not been confirmed stays unlinked text even when the record it points ' +
        'at is published, because the link would assert a relationship the review has ' +
        'not reached.',
      emptyFields: 'An absent value means not established, never zero.',
      completeness: 'A first-wave country review, not a census of European facilities.',
    },
    countryReviews: reviews.map((c) => ({
      country: c.country, name: c.name_en,
      researchRecords: c.research_records, mapCandidates: c.map_candidates,
      approvedRecords: c.approved_records, approvedLocations: c.approved_locations,
      note: c.review_note_en, reviewedAt: c.reviewed_at,
    })),
    hubs: records,
  };
}
