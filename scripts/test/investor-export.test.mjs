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
  assert.match(out.caveats.coordinates, /city centroids/);
  assert.match(out.caveats.countryAssociations, /not a verified HQ/);
  assert.match(out.caveats.classification, /Adjacent investors, unverified candidates and financial programmes/);
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

test('an approved record with no location fails the build instead of shipping', () => {
  assert.throws(() => buildLandscapeInvestors({ investors: [row({ locations: [] })], reviews: [] }),
    /Approved investor keen-venture-partners has no location/);
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
