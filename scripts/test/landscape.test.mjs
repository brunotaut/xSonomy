import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLandscape, fetchLandscape, LANDSCAPE } from '../lib/landscape.mjs';
import { summarize, filterCompanies, readFilters, filterQuery } from '../../src/assets/landscape-model.js';

import { fixture } from './landscape-fixture.mjs';

test('public landscape intersects reconciled membership, scope, publication and taxonomy',()=>{
  const result=buildLandscape(fixture());
  assert.deepEqual(result.companies.map(c=>c.id),['both','cuas','uav']);
  assert.equal(result.countries.length,2);
  assert.ok(result.companies.every(c=>!('publication_status' in c)));
});
test('derives ancestors, never assigns descendants or inherits other companies capabilities',()=>{
  const result=buildLandscape(fixture());
  const integrated=result.companies.find(c=>c.id==='cuas');
  assert.deepEqual(integrated.explicit,['cuas-integrated']);
  assert.deepEqual(integrated.sectors,['counter-uas','cuas-integrated']);
  const uav=result.companies.find(c=>c.id==='uav');
  assert.deepEqual(uav.sectors,['uav','uav-platform','uav-vtol']);
  assert.ok(!uav.sectors.includes('eco-autonomy'));
  assert.equal(uav.products[0].name,'Example aircraft');
});
test('only safe web sources reach the public data projection',()=>{
  const input=fixture();input.companies[0].website='javascript:alert(1)';
  const result=buildLandscape(input);
  assert.equal(result.companies.find(c=>c.id==='uav').website,null);
  assert.deepEqual(result.companies.find(c=>c.id==='both').sources,['https://example.com/radar']);
});
test('domain donut is disjoint and country/capability counts deduplicate',()=>{
  const companies=buildLandscape(fixture()).companies;
  companies[0].sectors.push(companies[0].sectors[0]);
  const s=summarize(companies);
  assert.deepEqual(s.domains,{uav:1,cuas:1,both:1});
  assert.equal(Object.values(s.domains).reduce((a,b)=>a+b),s.total);
  assert.equal(s.countries.get('DE'),3);
  assert.equal(s.sectors.get('uav'),2);
});
test('filters intersect and search includes products; no results is legitimate',()=>{
  const companies=buildLandscape(fixture()).companies;
  assert.deepEqual(filterCompanies(companies,{domain:'both'}).map(c=>c.id),['both']);
  assert.equal(filterCompanies(companies,{domain:'uav',sector:'cuas-det-radar'}).length,1);
  assert.equal(filterCompanies(companies,{q:'Example aircraft'}).length,1);
  assert.equal(filterCompanies(companies,{country:'GB'}).length,0);
});
test('shareable filter state round-trips punctuation and defaults',()=>{
  const state={type:'prime',q:'A&B + UAV',country:'DE',domain:'both',sector:'uav-platform',view:'companies'};
  assert.deepEqual(readFilters(filterQuery(state)),state);
  assert.equal(readFilters('?view=garbage').view,'overview');
});
test('bad taxonomy and duplicate identities fail loudly',()=>{
  let f=fixture();f.sectors[0].parent_id='v';assert.throws(()=>buildLandscape(f),/Cycle/);
  f=fixture();f.companies.push(f.companies[0]);assert.throws(()=>buildLandscape(f),/Duplicate/);
  f=fixture();f.assignments[0].sector_id='missing';assert.throws(()=>buildLandscape(f),/Missing assigned/);
});
test('fetch uses the working edition, stable pagination keys and propagates missing-source errors',async()=>{
  const f=fixture();const calls=[];
  const tables={landscape_candidates:f.candidates,countries:f.countries,sectors:f.sectors,company_sectors:f.assignments};
  const result=await fetchLandscape(async(table,params)=>{calls.push({table,params});return tables[table];},f.companies,f.productsByCompany);
  assert.equal(result.companies.length,3);
  assert.equal(calls[0].params.landscape_slug,`eq.${LANDSCAPE}`);
  assert.equal(calls.find(c=>c.table==='company_sectors').params.order,'company_id.asc,sector_id.asc');
  await assert.rejects(fetchLandscape(async()=>{throw Error('database unavailable');},[]),/database unavailable/);
});

test('primes use explicit company type, without inferring from size or name',()=>{
  const f=fixture();f.companies[0].company_type='prime';
  const rows=buildLandscape(f).companies;
  assert.deepEqual(filterCompanies(rows,{type:'prime'}).map(c=>c.id),['uav']);
  assert.equal(filterCompanies(rows,{type:'prime',domain:'counter-uas'}).length,0);
});
