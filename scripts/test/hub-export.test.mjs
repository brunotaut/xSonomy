import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLandscapeHubs, HUB_EXPORT } from '../lib/landscape.mjs';

// The distinctions this export exists to preserve, each one a mistake a consumer would
// otherwise make. They are asserted here rather than left to the caveat strings, because a
// caveat nobody reads is not a safeguard.
const hub = (over = {}) => ({
  id: '00000000-0000-0000-0000-000000000001',
  research_id: 'a-test-centre', slug: 'a-test-centre', name: 'A Test Centre',
  country: 'ES', country_name: 'Spain', locality_text: 'Somewhere',
  hub_type: 'test_centre', record_unit: 'organisation_or_hub',
  evidence_status: 'documented', technology_focus: ['UAV', 'C-UAS'],
  summary_en: 'A documented test centre.', research_note_en: 'A note.',
  operational_status: 'not_independently_confirmed', access_model: 'Contact operator.',
  bvlos_status: 'not_established', cuas_evidence: 'explicit_source_scope_or_documented_activity',
  reviewed_at: '2026-10-31',
  matched_company_id: null, matched_investor_id: null, match_role: null, match_note_en: null,
  sources: [{ url: 'https://example.com/a', title: 'Página oficial', accessedAt: '2026-10-31' }],
  locations: [{ locality: 'Somewhere', country: 'ES', latitude: 38.12, longitude: -3.08,
    kind: 'published_campus_or_test_locality', precision: 'approximate_locality_centroid',
    coordinateBasis: 'Manually selected approximate place centroid.' }],
  relationships: [],
  ...over,
});

test('site records are listed but never counted as independent organisations', () => {
  const out = buildLandscapeHubs({ reviews: [], hubs: [
    hub(),
    hub({ id: '2', research_id: 'the-site', slug: 'the-site', name: 'The Site',
          record_unit: 'site',
          relationships: [{ kind: 'site_of', direction: 'outgoing',
            researchId: 'a-test-centre', name: 'A Test Centre', published: true, note: 'n' }] }),
    hub({ id: '3', research_id: 'a-programme', slug: 'a-programme', name: 'A Programme',
          record_unit: 'programme' }),
  ]});
  assert.equal(out.counts.records, 3);
  assert.equal(out.counts.organisations, 1, 'only the organisation counts as an independent hub');
  assert.equal(out.counts.sites, 1);
  assert.equal(out.counts.programmes, 1);
  // The three are reported separately and are never summed into one "hub count".
  assert.notEqual(out.counts.organisations, out.counts.records);
  assert.equal(out.counts.locations, 3);
  assert.equal(out.counts.countries, 1);
  assert.equal(out.edition, HUB_EXPORT);
});

test('location kinds survive the projection, so an office is never a test site', () => {
  const kinds = ['contact_office_city', 'programme_delivery_city', 'simulation_lab_city',
                 'network_office_city', 'research_lab_city', 'operator_contact_city',
                 'flight_test_locality'];
  const out = buildLandscapeHubs({ reviews: [], hubs: kinds.map((kind, i) => hub({
    id: String(i), research_id: `h${i}`, slug: `h${i}`,
    locations: [{ locality: 'X', country: 'MT', latitude: 1.1, longitude: 2.2,
      kind, precision: 'approximate_locality_centroid', coordinateBasis: 'centroid' }],
  }))});
  assert.deepEqual(out.hubs.map((h) => h.locations[0].kind), kinds);
  // Precision travels with every point; a centroid must never read as a facility location.
  assert.ok(out.hubs.every((h) => h.locations[0].precision === 'approximate_locality_centroid'));
});

test('planned BVLOS is carried as wording, never as an availability flag', () => {
  const out = buildLandscapeHubs({ reviews: [], hubs: [
    hub({ bvlos_status: 'planned_2027_per_operator_not_current' }),
  ]});
  assert.equal(out.hubs[0].bvlosStatus, 'planned_2027_per_operator_not_current');
  // No boolean anywhere that could collapse "planned" into "available".
  assert.ok(!Object.keys(out.hubs[0]).some((k) => /^bvlos(Available|Current)/.test(k)));
  assert.match(out.caveats.bvlos, /not current BVLOS availability/);
});

test('a relationship to an unpublished record is marked, not hidden', () => {
  const out = buildLandscapeHubs({ reviews: [], hubs: [hub({ relationships: [
    { kind: 'operated_by', direction: 'outgoing', researchId: 'its-operator',
      name: 'Its Operator', published: false, note: 'Operator still in staging.' },
  ] })]});
  const rel = out.hubs[0].relationships[0];
  assert.equal(rel.published, false, 'a consumer must know not to link to it');
  assert.equal(rel.kind, 'operated_by');
  assert.equal(rel.name, 'Its Operator');
});

test('an approved hub with no location or no web source fails loudly', () => {
  assert.throws(() => buildLandscapeHubs({ reviews: [], hubs: [hub({ locations: [] })] }),
    /has no location/);
  assert.throws(() => buildLandscapeHubs({ reviews: [], hubs: [hub({ sources: [] })] }),
    /has no web source/);
  // A non-web source is dropped, and dropping the only one is the same failure.
  assert.throws(() => buildLandscapeHubs({ reviews: [], hubs: [
    hub({ sources: [{ url: 'ftp://example.com/x', title: 't' }] })] }), /has no web source/);
});

test('original source titles are preserved as evidence metadata, not translated', () => {
  const out = buildLandscapeHubs({ reviews: [], hubs: [hub()] });
  assert.equal(out.hubs[0].sources[0].title, 'Página oficial');
});

test('country reviews keep countries where nothing was approved', () => {
  const out = buildLandscapeHubs({ hubs: [hub()], reviews: [
    { country: 'ES', name_en: 'Spain', research_records: 4, map_candidates: 3,
      approved_records: 3, approved_locations: 3, note_en: null, reviewed_at: '2026-10-31' },
    { country: 'RO', name_en: 'Romania', research_records: 1, map_candidates: 0,
      approved_records: 0, approved_locations: 0,
      review_note_en: 'No current UAV service established.', reviewed_at: '2026-10-31' },
  ]});
  assert.equal(out.countryReviews.length, 2);
  const ro = out.countryReviews.find((c) => c.country === 'RO');
  assert.equal(ro.approvedRecords, 0);
  assert.equal(ro.researchRecords, 1, 'a reviewed country with no approved hub is a finding');
});

test('a match is a link with a stated role, never a merge', () => {
  const out = buildLandscapeHubs({ reviews: [], hubs: [hub({
    matched_investor_id: '11111111-1111-1111-1111-111111111111',
    match_role: 'related_organisation_different_function',
    match_note_en: 'The accelerator, not the fund.',
  })]});
  const h = out.hubs[0];
  assert.equal(h.matchRole, 'related_organisation_different_function');
  assert.equal(h.matchedInvestorId, '11111111-1111-1111-1111-111111111111');
  assert.equal(h.matchedCompanyId, null);
  assert.match(out.caveats.matches, /without merging/);
});

// The profile link is two independent conditions, and Bofors Test Center is why they
// have to be kept apart: its matched company IS published, but the match is only a
// possible one. A link there would assert a relationship nobody has concluded.
test('a confirmed match with a published target becomes a profile link', () => {
  const out = buildLandscapeHubs({ reviews: [], hubs: [
    hub({ research_id: 'dlr-test-center', slug: 'dlr-test-center', name: 'DLR test centre',
      matched_company_id: 'aaaaaaaa-0000-0000-0000-000000000001',
      matched_company_slug: 'dlr-german-aerospace-center',
      match_role: 'facility_of_matched_organisation' }),
    hub({ research_id: 'mits-accelerator', slug: 'mits-accelerator', name: 'MITS Accelerator',
      matched_investor_id: 'bbbbbbbb-0000-0000-0000-000000000002',
      matched_investor_slug: 'mits-capital-lightning-fund',
      match_role: 'related_organisation_different_function' }),
  ]});
  const dlr = out.hubs.find((h) => h.slug === 'dlr-test-center');
  assert.equal(dlr.matchConfirmed, true);
  assert.equal(dlr.matchedCompanySlug, 'dlr-german-aerospace-center');
  assert.equal(dlr.matchedCompanyUrl, 'https://xsonomy.com/companies/dlr-german-aerospace-center/',
    'the url follows the generator\'s own company route, it is not invented here');
  assert.equal(dlr.matchedInvestorSlug, null);

  // an investor has no standalone page, so the slug travels and the panel opens it
  const mits = out.hubs.find((h) => h.slug === 'mits-accelerator');
  assert.equal(mits.matchConfirmed, true);
  assert.equal(mits.matchedInvestorSlug, 'mits-capital-lightning-fund');
  assert.equal(mits.matchedCompanyUrl, null);
  assert.equal(mits.matchedCompanySlug, null);

  // "related, with a different function" is a conclusion, not a doubt: the two are
  // definitely connected and definitely not the same organisation
  assert.equal(mits.matchRole, 'related_organisation_different_function');
});

test('an unconfirmed match is never linked, even when its target is published', () => {
  const out = buildLandscapeHubs({ reviews: [], hubs: [hub({
    name: 'Bofors Test Center',
    matched_company_id: 'cccccccc-0000-0000-0000-000000000003',
    matched_company_slug: 'bofors',            // published and addressable
    match_role: 'needs_review',                 // but the match is not concluded
    match_note_en: 'Shares a name with the catalogue company Bofors.',
  })]});
  const h = out.hubs[0];
  assert.equal(h.matchConfirmed, false);
  assert.equal(h.matchedCompanySlug, null, 'a published target is not enough on its own');
  assert.equal(h.matchedCompanyUrl, null);
  assert.equal(h.matchedCompanyId, 'cccccccc-0000-0000-0000-000000000003',
    'the stored id and the note still travel, so the panel can show it as text');
  assert.match(h.matchNote, /Shares a name/);
  assert.match(out.caveats.matchLinks, /not been confirmed stays unlinked text/);
});

test('a confirmed match whose target is unpublished stays text', () => {
  const out = buildLandscapeHubs({ reviews: [], hubs: [hub({
    matched_company_id: 'dddddddd-0000-0000-0000-000000000004',
    matched_company_slug: null,   // the view returns null for a draft or slugless row
    match_role: 'same_organisation',
  })]});
  const h = out.hubs[0];
  assert.equal(h.matchConfirmed, true, 'same_organisation is a confirmed role');
  assert.equal(h.matchedCompanyUrl, null, 'but there is no published profile to open');
  assert.equal(h.matchedCompanySlug, null);
});

test('a rejected match carries no link and no relationship', () => {
  const out = buildLandscapeHubs({ reviews: [], hubs: [hub({
    matched_company_id: null, matched_company_slug: null,
    match_role: 'rejected_false_positive',
    match_note_en: 'Name similarity only.',
  })]});
  assert.equal(out.hubs[0].matchConfirmed, false);
  assert.equal(out.hubs[0].matchedCompanyUrl, null);
});
