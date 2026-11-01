import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLandscapeInvestors, INVESTOR_EXPORT } from '../lib/landscape.mjs';

// The investor research layer holds all 106 records; only approved ones reach the export,
// and the distinctions that make the data honest have to survive the projection: a country
// association is not a headquarters, a city centroid is not an office, a contact address is
// not an operational office, and a published ticket range is not available capital.
const row = (over = {}) => ({
  id: 'u1', slug: 'keen-venture-partners', name: 'Keen Venture Partners',
  entity_type: 'VC', evidence_status: 'deal', evidence_status_label: 'Confirmed investment',
  evidence_basis: 'primary_or_transaction_party', priority_for_uav_review: 'high',
  stages: ['Pre-seed–B'], focus: ['Defence', 'UAV'], selected_portfolio: ['Kelluu'],
  investment_geography: [], research_note: 'Offices in Amsterdam and London verified.',
  missing_fields: ['Current deployment / intake status'], verified_as_of: '2026-10-30',
  matched_investor_id: null, country_associations: ['GB', 'NL'],
  country_association_meaning: 'Research index: not a verified HQ field.',
  ticket_currency: null, ticket_minimum: null, ticket_maximum: null,
  ticket_basis: null, ticket_source_url: null,
  legal_domicile_country: null, legal_domicile_precision: null, legal_domicile_note: null,
  source_dataset: 'European Defence & UAV Investor Research', source_dataset_version: 'research-1',
  sources: [{ url: 'https://www.keenventurepartners.com/defence', title: 'Defence | Keen', accessedAt: '2026-10-30' }],
  locations: [{
    city: 'Amsterdam', country: 'NL', latitude: 52.3676, longitude: 4.9041,
    kind: 'published_office_or_contact_city', precision: 'approximate_city_centroid',
    sources: [{ url: 'https://www.keenventurepartners.com/contact', title: 'Contact | Keen', accessedAt: '2026-10-30' }],
  }],
  ...over,
});

test('the export carries the caveats and keeps location kinds apart', () => {
  const out = buildLandscapeInvestors({
    investors: [row(), row({
      id: 'u2', slug: 'bsv-ventures', name: 'BSV Ventures', country_associations: ['LT'],
      locations: [{
        city: 'Tallinn', country: 'EE', latitude: 59.437, longitude: 24.7536,
        // a venue where the firm meets founders, not an office it occupies
        kind: 'published_meeting_location', precision: 'approximate_city_centroid', sources: [],
      }],
    })],
    reviews: [{ country: 'CY', name_en: 'Cyprus', status: 'gap',
      note_en: 'No local defence investor confirmed.', reviewed_at: '2026-10-30', record_count: 0 }],
  });

  assert.equal(out.edition, INVESTOR_EXPORT);
  assert.equal(out.investors.length, 2);
  // the kinds are not collapsed into one "office" concept
  assert.deepEqual(out.investors.map((i) => i.locations[0].kind),
    ['published_office_or_contact_city', 'published_meeting_location']);
  // coordinates are published as approximate, never as an address
  assert.ok(out.investors.every((i) => i.locations.every((l) => l.precision === 'approximate_city_centroid')));
  assert.match(out.caveats.coordinates, /approximate city centres/);
  // a country-association marker is never presented as an office
  assert.match(out.caveats.coordinates, /not an office or a headquarters/);
  assert.match(out.caveats.countryAssociations, /not a verified HQ/);
  assert.match(out.caveats.classification, /unverified\s+candidates and funding programmes keep their own labels/);
  // a country association stays an index entry and is never renamed to a country or HQ
  assert.deepEqual(out.investors[0].countryAssociations, ['GB', 'NL']);
  for (const i of out.investors) assert.ok(!('country' in i) && !('hqCountry' in i));
  // the per-country research log, including the gaps, travels with the export
  assert.deepEqual(out.countryReviews, [{ country: 'CY', name: 'Cyprus', status: 'gap',
    note: 'No local defence investor confirmed.', reviewedAt: '2026-10-30', recordCount: 0 }]);
});

test('a published ticket range keeps its basis, and the manager keeps its own domicile', () => {
  const out = buildLandscapeInvestors({
    investors: [row({
      ticket_currency: 'EUR', ticket_minimum: 1000000, ticket_maximum: 5000000,
      ticket_basis: 'Published investment/financing range; not a guarantee of available capital',
      ticket_source_url: 'https://www.helantic.com/',
      legal_domicile_country: 'LU', legal_domicile_precision: 'country_only',
      legal_domicile_note: 'Public statement or registration; exact legal entity remains to be matched.',
    })],
    reviews: [],
  });
  const i = out.investors[0];
  assert.deepEqual(i.ticket, {
    currency: 'EUR', minimum: 1000000, maximum: 5000000,
    basis: 'Published investment/financing range; not a guarantee of available capital',
    source: 'https://www.helantic.com/',
  });
  assert.match(out.caveats.tickets, /not a guarantee of available capital/);
  // the Luxembourg registration is its own fact, with its own precision — not the
  // Netherlands office above it, and not one of the country associations
  assert.deepEqual(i.legalDomicile,
    { country: 'LU', precision: 'country_only', note: 'Public statement or registration; exact legal entity remains to be matched.' });
  assert.ok(!i.countryAssociations.includes('LU'));
  assert.equal(i.locations[0].country, 'NL');
});

test('a record placed only by country association is published, not rejected', () => {
  // 94 of the 118 directory records have no city at all. Rejecting them was why a versioned
  // JSON supplement had to exist alongside the database; the directory lists them and the
  // map simply has nothing to draw.
  const out = buildLandscapeInvestors({
    investors: [row({ locations: [], country_associations: ['UA'], ukraine_related: true })],
    reviews: [],
  });
  assert.equal(out.investors.length, 1);
  assert.deepEqual(out.investors[0].locations, []);
  assert.deepEqual(out.investors[0].countryAssociations, ['UA']);
  assert.equal(out.investors[0].ukraineRelated, true);
});

test('portfolio holdings are stored relationships, and amounts stay separate', () => {
  const out = buildLandscapeInvestors({ reviews: [], investors: [row({
    portfolio: [
      { companyId: 'c1', name: 'Resolved Co', nameAsPublished: 'Resolved Co', slug: 'resolved-co',
        url: '/companies/resolved-co/', published: true, relationshipType: 'direct_investment',
        evidenceStatus: 'investor_announcement', source: 'https://example.com/round',
        investorContribution: { amount: 900000, currency: 'EUR' },
        roundTotal: { amount: 3200000, currency: 'EUR' }, role: 'lead',
        matchMethod: 'verified_new_record', matchNote: null },
      { companyId: 'c2', name: 'Unpublished Co', nameAsPublished: 'Unpublished Co',
        slug: 'unpublished-co', url: null, published: false,
        relationshipType: 'portfolio_listed', evidenceStatus: 'third_party_reported',
        source: 'javascript:alert(1)', investorContribution: null, roundTotal: null,
        role: null, matchMethod: 'draft_company', matchNote: 'not published' },
    ],
    portfolio_unresolved: [
      { name: 'Airvolve', reason: 'Could not be verified.', source: 'https://example.com/p' },
    ],
  })]});
  const [resolved, unpublished] = out.investors[0].portfolio;

  // A persistent company id always; a profile URL only when the company is published.
  assert.equal(resolved.companyId, 'c1');
  assert.equal(resolved.url, '/companies/resolved-co/');
  assert.equal(unpublished.companyId, 'c2');
  assert.equal(unpublished.url, null, 'an unpublished company must not be linked');
  assert.equal(unpublished.published, false, 'but the holding is still shown');

  // The two amounts are distinct fields. The round total is not the contribution.
  assert.equal(resolved.investorContribution.amount, 900000);
  assert.equal(resolved.roundTotal.amount, 3200000);
  assert.notEqual(resolved.investorContribution.amount, resolved.roundTotal.amount);
  assert.equal(unpublished.investorContribution, null);
  assert.equal(unpublished.roundTotal, null);

  // A non-web relationship source is dropped, as everywhere else in the export.
  assert.equal(unpublished.source, null);

  // Unresolved holdings travel with the reason instead of being matched to a near name.
  assert.equal(out.investors[0].portfolioUnresolved[0].name, 'Airvolve');
  assert.match(out.investors[0].portfolioUnresolved[0].reason, /Could not be verified/);
  assert.match(out.caveats.unresolvedHoldings, /rather than matched to a similarly named/);

  // Portfolio membership is never an eligibility argument.
  assert.match(out.caveats.portfolio, /never admits a company to the UAV and counter-UAS landscape/);
  assert.match(out.caveats.amounts, /never read as one investor/);
});

test('financial metric types stay distinct and unsourced metrics are dropped', () => {
  const m = (over) => ({ metricType: 'fund_size_target', display: 'EUR50M', amountMin: 5e7,
    amountMax: 5e7, currency: 'EUR', count: null, bound: 'exact', scope: 'Fund V launch size',
    asOf: '2025', asOfIsExactDate: false, vehicle: 'Fund V',
    source: 'https://example.com/f', verification: 'source_confirmed',
    checkedAt: '2026-10-31', ...over });
  const out = buildLandscapeInvestors({ reviews: [], investors: [row({ financial_metrics: [
    m({}),
    m({ metricType: 'fund_close_final', display: 'EUR214M' }),
    m({ metricType: 'manager_aum', display: 'Approximately EUR450M', bound: 'approximate' }),
    m({ metricType: 'cumulative_capital_invested', display: 'USD46M', currency: 'USD' }),
    m({ metricType: 'initial_investment_range', amountMin: 1e6, amountMax: 1e7, bound: 'range' }),
    m({ metricType: 'investment_count', amountMin: null, amountMax: null, currency: null, count: 9 }),
    m({ metricType: 'portfolio_company_count', amountMin: null, amountMax: null, currency: null, count: 97 }),
    m({ metricType: 'fund_close_first', bound: 'minimum', amountMax: null, display: 'More than EUR150M' }),
    m({ source: 'ftp://example.com/nope' }),
  ] })]});
  const kinds = out.investors[0].financialMetrics.map((x) => x.metricType);

  // A target, a first close and a final close are three different facts.
  for (const k of ['fund_size_target', 'fund_close_first', 'fund_close_final'])
    assert.ok(kinds.includes(k), `${k} must survive as its own type`);
  // Manager AUM is not a fund; capital invested is not committed capital.
  assert.ok(kinds.includes('manager_aum') && kinds.includes('cumulative_capital_invested'));
  // A count of investments is not a count of companies.
  assert.ok(kinds.includes('investment_count') && kinds.includes('portfolio_company_count'));
  const counts = out.investors[0].financialMetrics.filter((x) => x.count !== null);
  assert.deepEqual(counts.map((x) => x.count).sort((a, b) => a - b), [9, 97]);
  assert.ok(counts.every((x) => x.currency === null && x.amountMin === null),
    'a count must not carry money fields');
  // A bound qualifier keeps "more than" from rendering as an exact figure.
  assert.equal(out.investors[0].financialMetrics.find((x) => x.metricType === 'fund_close_first').bound, 'minimum');
  // The metric with a non-web source is gone; the other nine remain.
  assert.equal(out.investors[0].financialMetrics.length, 8);
  assert.match(out.caveats.metricTypes, /a target is not a close/);
});

test('non-web source URLs are dropped rather than published', () => {
  const out = buildLandscapeInvestors({
    investors: [row({
      sources: [{ url: 'javascript:alert(1)', title: 'bad' },
                { url: 'https://example.com/ok', title: 'good' }],
      ticket_currency: 'EUR', ticket_source_url: 'not-a-url',
    })],
    reviews: [],
  });
  assert.deepEqual(out.investors[0].sources.map((s) => s.url), ['https://example.com/ok']);
  assert.equal(out.investors[0].ticket.source, null);
});

test('a fund position never becomes a portfolio holding', () => {
  const out = buildLandscapeInvestors({
    investors: [row({
      slug: 'eifo', name: 'EIFO',
      // one real holding and one commitment to somebody else's fund
      portfolio: [{
        companyId: 'c1', name: 'Six Robotics', nameAsPublished: 'Six Robotics',
        slug: 'six-robotics', url: '/companies/six-robotics/', published: true,
        relationshipType: 'direct_investment', evidenceStatus: 'third_party_reported',
        source: 'https://www.dtcp.capital/news-and-insights/detail/dtcp-defence-fund-leads-eur12-million-financing-round-in-six-robotics/',
        reviewedAt: '2026-11-01', round: 'Seed', role: 'participant', vehicle: null,
        investorContribution: null, roundTotal: { amount: 12000000, currency: 'EUR' },
        matchMethod: 'manual', matchNote: 'Named as a participant by the lead investor.',
      }],
      fund_positions: [{
        targetName: 'D3', targetSlug: 'd3', vehicle: null, positionType: 'limited_partner',
        commitment: { amount: 5000000, currency: 'USD', bound: 'exact' },
        announcedAt: '2025-07-04', evidenceStatus: 'investor_announcement',
        source: 'https://eifo.dk/en/knowledge-hub/eifo-invests-in-the-venture-fund-d3-to-boost-ukrainian-and-european-innovation-in-defence',
        reviewedAt: '2026-11-01', note: 'D3’s portfolio companies are not EIFO holdings.',
      }],
    })],
    reviews: [],
  });
  const i = out.investors[0];
  // the two arrays are separate, and neither leaks into the other
  assert.equal(i.portfolio.length, 1);
  assert.equal(i.fundPositions.length, 1);
  assert.equal(i.portfolio.some((p) => p.name === 'D3'), false);
  assert.equal(i.fundPositions.some((f) => f.targetName === 'Six Robotics'), false);
  // a commitment carries its own bound, and is not a company holding of any kind
  assert.deepEqual(i.fundPositions[0].commitment, { amount: 5000000, currency: 'USD', bound: 'exact' });
  assert.equal('companyId' in i.fundPositions[0], false);
  assert.match(out.caveats.fundPositions, /not a holding/);
  assert.match(out.caveats.fundPositions, /never shown as a direct\s+company holding/);
  // the round total is the whole round, and no contribution was invented from it
  assert.equal(i.portfolio[0].investorContribution, null);
  assert.deepEqual(i.portfolio[0].roundTotal, { amount: 12000000, currency: 'EUR' });
});

test('a fund position with no commitment figure and no published manager still travels', () => {
  const out = buildLandscapeInvestors({
    investors: [row({
      fund_positions: [{
        targetName: 'Some Fund III', targetSlug: null, vehicle: 'Some Fund III',
        positionType: 'limited_partner', commitment: null, announcedAt: null,
        evidenceStatus: 'third_party_reported', source: 'not-a-url',
        reviewedAt: '2026-11-01', note: 'Commitment size not disclosed.',
      }],
    })],
    reviews: [],
  });
  const f = out.investors[0].fundPositions[0];
  assert.equal(f.commitment, null, 'an undisclosed commitment stays undisclosed, never zero');
  assert.equal(f.targetSlug, null, 'an unpublished manager gets no link target');
  assert.equal(f.source, null, 'a non-web source is dropped rather than rendered');
  assert.match(out.caveats.retiredRelationships, /withdrawn from the portfolio/);
});

test('an investor with no fund positions gets an empty array, not a missing field', () => {
  const out = buildLandscapeInvestors({ investors: [row()], reviews: [] });
  assert.deepEqual(out.investors[0].fundPositions, []);
  assert.deepEqual(out.investors[0].portfolio, []);
});

// A figure's TYPE is what the interface reads. Notes do not reach the label, the card
// slot or any filter, so a figure whose type is wrong is displayed wrong however careful
// its prose. These four were corrected in the 2026-11-01 pass.
test('corrected metric types survive the projection with their vehicle and scope', () => {
  const out = buildLandscapeInvestors({ reviews: [], investors: [row({
    financial_metrics: [
      { metricType: 'vehicle_nav', display: '£421.3M NAV', currency: 'GBP', amountMin: 421300000,
        vehicle: 'Seraphim Space Investment Trust plc', scope: 'One listed vehicle’s NAV, not the manager’s total.',
        verification: 'reported', asOf: '2026-03-31', asOfIsExactDate: true, checkedAt: '2026-11-01',
        source: 'https://investors.seraphim.vc/q3.pdf' },
      { metricType: 'average_investment_size', display: 'About €20M average investment', currency: 'EUR',
        amountMin: 20000000, amountMax: null, scope: 'A stated average, not a published range.',
        verification: 'source_confirmed', checkedAt: '2026-11-01', source: 'https://www.dtcp.capital/news' },
      { metricType: 'grant_funding_disbursed', display: '₴6.2B in grants disbursed', currency: 'UAH',
        amountMin: 6200000000, scope: 'Grants, not equity capital invested.', verification: 'reported',
        checkedAt: '2026-11-01', source: 'https://mod.gov.ua/en/news/brave1' },
      { metricType: 'grant_count', display: '1,000+ grants awarded', count: 1000,
        scope: 'Grants awarded, not investments in companies.', verification: 'reported',
        checkedAt: '2026-11-01', source: 'https://mod.gov.ua/en/news/brave1' },
    ],
  })] });
  const m = out.investors[0].financialMetrics;
  const byType = Object.fromEntries(m.map((x) => [x.metricType, x]));

  // a vehicle NAV is one vehicle's, so it must carry the vehicle it belongs to
  assert.equal(byType.vehicle_nav.vehicle, 'Seraphim Space Investment Trust plc');
  assert.ok(!('manager_aum' in byType), 'a vehicle NAV must not be published as manager AUM');

  // an average is a single figure: it must not acquire an upper bound and become a range
  assert.equal(byType.average_investment_size.amountMax, null);
  assert.ok(!('initial_investment_range' in byType), 'an average ticket is not a published range');

  // grants are their own instrument in both the money row and the count row
  assert.equal(byType.grant_funding_disbursed.currency, 'UAH');
  assert.equal(byType.grant_count.count, 1000);
  assert.ok(!('cumulative_capital_invested' in byType) && !('investment_count' in byType),
    'grant disbursements and grant counts must never aggregate with equity and investments');

  assert.match(out.caveats.metricTypes, /grant funding is not equity capital/);
  assert.match(out.caveats.metricTypes, /different types, currencies or periods are never added/);
});

test('an unknown amount travels as null and never as zero', () => {
  const out = buildLandscapeInvestors({ reviews: [], investors: [row({
    financial_metrics: [{ metricType: 'initial_investment_range', display: 'Up to €500K',
      currency: 'EUR', amountMin: 500000, amountMax: null, bound: 'maximum',
      scope: 'A ceiling, not a range.', verification: 'reported', checkedAt: '2026-11-01',
      source: 'https://example.com/a' }],
    portfolio: [{ name: 'Scandinavian X', slug: 'scandinavian-x',
      url: 'https://xsonomy.com/companies/scandinavian-x/', relationshipType: 'direct_investment',
      evidenceStatus: 'investor_published_portfolio', investorContribution: null, roundTotal: null,
      role: 'co_investor' }],
  })] });
  const i = out.investors[0];
  assert.equal(i.financialMetrics[0].amountMax, null, 'an absent upper bound stays absent');
  assert.notEqual(i.financialMetrics[0].amountMax, 0);
  assert.equal(i.portfolio[0].investorContribution, null, 'an undisclosed contribution is null');
  assert.equal(i.portfolio[0].roundTotal, null, 'an undisclosed round total is null');
  assert.match(out.caveats.emptyFields, /never zero/);
});

test('a retired relationship stays out of the export whichever reason retired it', () => {
  // the view filters retired rows, so the export must never be handed one; this asserts
  // the contract the projection relies on rather than re-testing the view
  const out = buildLandscapeInvestors({ reviews: [], investors: [row({ portfolio: [] })] });
  assert.deepEqual(out.investors[0].portfolio, []);
  assert.match(out.caveats.retiredRelationships, /withdrawn from the portfolio/);
});

// An unproven identity match once put a Luxembourg entity's ticket range and a Prague
// fund's announced raise on the same vehicle, with a sentence of prose to say the match
// was unproven. Prose does not filter an export. A figure whose recipient is not
// established now carries that status from the database and is dropped here, so neither
// layer alone has to be right for the wrong thing to stay unpublished.
test('an observation whose recipient is unresolved is not published as anyone\'s', () => {
  const out = buildLandscapeInvestors({ reviews: [], investors: [row({
    financial_metrics: [
      { metricType: 'fund_size_target', display: '€150M announced at launch',
        amountMin: 150000000, amountMax: null, currency: 'EUR', bound: 'exact',
        scope: 'An announced launch size.', vehicle: 'Tech Horizons SCSp',
        source: 'https://example.com/launch', verification: 'reported',
        attribution: 'attributed', checkedAt: '2026-11-01' },
      { metricType: 'initial_investment_range', display: '€300K–€3M per deal',
        amountMin: 300000, amountMax: 3000000, currency: 'EUR', bound: 'range',
        scope: 'An aggregator profile for a similarly named entity.',
        vehicle: 'Tech Horizons SCSp', source: 'https://example.com/aggregator',
        verification: 'unverified', attribution: 'unresolved_identity',
        checkedAt: '2026-11-01' },
    ],
  })] });
  const metrics = out.investors[0].financialMetrics;
  assert.equal(metrics.length, 1, 'the unresolved figure must not travel');
  assert.equal(metrics[0].metricType, 'fund_size_target');
  // not merely hidden from the card: absent from the file
  assert.equal(JSON.stringify(out).includes('300000'), false,
    'the withheld amount must not survive anywhere in the export');
  assert.match(out.caveats.metricAttribution, /held back/);
});

test('a figure with no attribution field still publishes, so older rows are not dropped', () => {
  const out = buildLandscapeInvestors({ reviews: [], investors: [row({
    financial_metrics: [{ metricType: 'manager_aum', display: '€1.2B AUM', amountMin: 1200000000,
      amountMax: null, currency: 'EUR', bound: 'approximate', scope: 'Manager-wide.',
      source: 'https://example.com/aum', verification: 'reported', checkedAt: '2026-11-01' }],
  })] });
  assert.equal(out.investors[0].financialMetrics.length, 1,
    'absent means attributed: a guard that silently empties the export is worse than none');
});
