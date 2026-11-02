import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {defaults,normalize,readState,filterInvestors,investorLocations,investorTypeOf,investorFocusOf,stagePositions,validateInvestors,NOT_ESTABLISHED} from '../../src/assets/atlas/model-56c96e9c93bf.js';
// Shaped exactly like /data/landscape-investors.json so the atlas is tested against the
// export it actually consumes, including the fields the research layer may leave empty.
const loc=(city,country,kind='published_office_or_contact_city')=>({city,country,latitude:50,longitude:10,kind,precision:'approximate_city_centroid',sources:[{url:'https://example.com/contact',title:'Contact',accessedAt:'2026-10-30'}]});
const V={edition:'european-defence-investors',membership:'Approved investor research records.',caveats:{coordinates:'Approximate city centroids, not exact office locations.'},investors:[
 {slug:'alpha',name:'Alpha Ventures',entityType:'VC',evidenceStatus:'deal',evidenceStatusLabel:'Confirmed investment',stages:['Pre-seed–B'],focus:['UAV','Autonomy'],selectedPortfolio:['Airvolve'],countryAssociations:['UA'],ticket:null,legalDomicile:null,missingFields:[],verifiedAsOf:'2026-10-30',sources:[],locations:[loc('Munich','DE'),loc('London','GB'),loc('Tallinn','EE','published_meeting_location')]},
 {slug:'beta',name:'Beta Capital',entityType:'Generalist VC',evidenceStatus:'mandate',evidenceStatusLabel:'Confirmed mandate',stages:[],focus:['C-UAS'],selectedPortfolio:[],countryAssociations:['DE'],ticket:{currency:'GBP',minimum:150000,maximum:500000,basis:'Published range',source:'https://example.com/fund'},legalDomicile:{country:'LU',precision:'country_only'},missingFields:['Complete vehicle and manager identity'],verifiedAsOf:'2026-10-30',sources:[],locations:[loc('Paris','FR')]},
 {slug:'gamma',name:'Gamma Partners',entityType:'VC',evidenceStatus:'deal',evidenceStatusLabel:'Confirmed investment',stages:['Stage-agnostic'],focus:[],selectedPortfolio:['Airvolve','Tekever'],countryAssociations:['GB'],ticket:null,legalDomicile:null,missingFields:[],verifiedAsOf:'2026-10-30',sources:[],locations:[loc('Munich','DE')]}]};
const S=o=>({...defaults(),...o});

test('published stage ranges read onto one ladder and an absent stage stays distinguishable',()=>{
 assert.deepEqual(stagePositions(['Pre-seed–B']),['Pre-seed','Seed','A','B']);
 assert.deepEqual(stagePositions(['Seed–B+']),['Seed','A','B','C','Growth']);
 assert.deepEqual(stagePositions(['Early']),['Pre-seed','Seed']);
 assert.deepEqual(stagePositions(['Late Seed','A']),['Seed','A']);
 assert.deepEqual(stagePositions(['Stage-agnostic']),['Pre-seed','Seed','A','B','C','Growth']);
 assert.deepEqual(stagePositions([]),[]);
 assert.deepEqual(filterInvestors(V,S({investorStages:['B']})).map(i=>i.slug),['alpha','gamma']);
 assert.deepEqual(filterInvestors(V,S({investorStages:[NOT_ESTABLISHED]})).map(i=>i.slug),['beta']);
});

test('the country filter reads published locations, never countryAssociations',()=>{
 assert.deepEqual(filterInvestors(V,S({countries:['DE']})).map(i=>i.slug),['alpha','gamma']);
 // beta is associated with DE but publishes only a Paris location, so DE must not match it
 assert.equal(filterInvestors(V,S({countries:['DE']})).some(i=>i.slug==='beta'),false);
 assert.deepEqual(filterInvestors(V,S({countries:['UA']})).map(i=>i.slug),[]);
});

test('one investor keeps one identity across locations and locations are counted apart',()=>{
 const all=filterInvestors(V,S({}));
 assert.equal(all.length,3);
 assert.equal(all.reduce((n,i)=>n+investorLocations(i,S({})).length,0),5);
 const de=S({countries:['DE']}),list=filterInvestors(V,de);
 assert.equal(list.length,2,'two investors match DE');
 assert.equal(list.reduce((n,i)=>n+investorLocations(i,de).length,0),2,'only the DE locations are shown on the map');
 assert.equal(list[0].locations.length,3,'the record still carries its complete location list');
});

test('search covers investor names and portfolio companies',()=>{
 assert.deepEqual(filterInvestors(V,S({q:'alpha'})).map(i=>i.slug),['alpha']);
 assert.deepEqual(filterInvestors(V,S({q:'airvolve'})).map(i=>i.slug),['alpha','gamma']);
 assert.deepEqual(filterInvestors(V,S({q:'tekever'})).map(i=>i.slug),['gamma']);
 assert.deepEqual(filterInvestors(V,S({q:'nothing here'})).map(i=>i.slug),[]);
});

test('investor filters combine with AND across dimensions and OR within one',()=>{
 assert.deepEqual(filterInvestors(V,S({investorTypes:['VC']})).map(i=>i.slug),['alpha','gamma']);
 assert.deepEqual(filterInvestors(V,S({investorTypes:['VC','Generalist VC']})).map(i=>i.slug),['alpha','beta','gamma']);
 assert.deepEqual(filterInvestors(V,S({investorTypes:['VC'],countries:['GB']})).map(i=>i.slug),['alpha']);
 assert.deepEqual(filterInvestors(V,S({investorFocus:['UAV']})).map(i=>i.slug),['alpha']);
 assert.deepEqual(filterInvestors(V,S({investorFocus:[NOT_ESTABLISHED]})).map(i=>i.slug),['gamma']);
 assert.deepEqual(filterInvestors(V,S({investorFocus:['UAV'],investorStages:[NOT_ESTABLISHED]})).map(i=>i.slug),[]);
 assert.equal(investorTypeOf(V.investors[1]),'Generalist VC');
 assert.deepEqual(investorFocusOf(V.investors[0]),['UAV','Autonomy']);
});

test('investor filters survive a URL round trip',()=>{
 const s=S({mode:'investors',countries:['DE'],investorTypes:['VC'],investorStages:['Seed'],investorFocus:['UAV'],selected:{type:'investor',id:'alpha'},layers:{companies:false,hubs:false,investors:true}});
 assert.deepEqual(readState('#'+encodeURIComponent(JSON.stringify(s))),s);
 assert.deepEqual(normalize({investorTypes:['VC',7,'VC']}).investorTypes,['VC']);
 assert.deepEqual(readState('#broken').investorFocus,[]);
});

test('the investor export is validated before it is drawn',()=>{
 assert.equal(validateInvestors(V),V);
 assert.equal(validateInvestors({investors:[{slug:'x',name:'X',locations:[]}]}).investors.length,1);
 assert.throws(()=>validateInvestors({investors:[{slug:'x',name:'X',locations:[{country:'DE',latitude:null,longitude:10}]}]}));
 assert.throws(()=>validateInvestors({}));
});

 test('unverified country-only records and Ukraine linkage remain discoverable',()=>{
 const data={investors:[{slug:'candidate',name:'Candidate',locations:[],countryAssociations:['UA'],ukraineRelated:true}]};
 assert.equal(filterInvestors(data,S({countries:['UA']})).length,1);
 assert.equal(filterInvestors(data,S({ukraineOnly:true})).length,1);
 assert.equal(filterInvestors(data,S({countries:['DE']})).length,0);
 assert.equal(readState('#'+encodeURIComponent(JSON.stringify(S({ukraineOnly:true})))).ukraineOnly,true);
 });

test('search reaches stored portfolio companies and fund-position managers',()=>{
 const data={investors:[
  {slug:'eifo',name:'EIFO',locations:[],countryAssociations:['DK'],
   portfolio:[{name:'Six Robotics',nameAsPublished:'Six Robotics'}],
   fundPositions:[{targetName:'D3',targetSlug:'d3'}]},
  {slug:'smartcap',name:'SmartCap',locations:[],countryAssociations:['EE'],
   portfolio:[{name:'Frankenburg Technologies',nameAsPublished:'Frankenburg Technologies'}],
   fundPositions:[{targetName:'DTCP Defence Fund I',targetSlug:'dtcp'}]}]};
 // a holding the investor publishes under another spelling is still findable
 assert.deepEqual(filterInvestors(data,S({q:'six robotics'})).map(i=>i.slug),['eifo']);
 assert.deepEqual(filterInvestors(data,S({q:'frankenburg'})).map(i=>i.slug),['smartcap']);
 // the manager of a fund someone committed to is findable from the LP's side
 assert.deepEqual(filterInvestors(data,S({q:'d3'})).map(i=>i.slug),['eifo']);
 assert.deepEqual(filterInvestors(data,S({q:'defence fund'})).map(i=>i.slug),['smartcap']);
 // and a fund position is never mistaken for a holding of that name
 assert.deepEqual(filterInvestors(data,S({q:'nothing here'})).map(i=>i.slug),[]);
});

// The list card picks each figure by metric TYPE. Retyping a figure - which the
// 2026-11-01 semantic pass did to four of them - silently empties the slot it used to
// fill unless the slot knows the new type, so Seraphim's NAV, DTCP's average ticket and
// Brave1's grants would each have vanished from the card while still being in the data.
test('every corrected metric type still reaches a card slot, with its own label',async()=>{
 const app=await import('node:fs/promises').then(fs=>fs.readFile(new URL('../../src/assets/atlas/atlas.js',import.meta.url),'utf8'));
 for(const t of ['vehicle_nav','average_investment_size','follow_on_investment_range','grant_funding_disbursed','grant_count'])
  assert.ok(app.includes(`${t}:'`),`${t} needs a label in METRIC_LABEL, which also drives METRIC_ORDER`);
 assert.match(app,/SCALE_METRICS=\['manager_aum','vehicle_nav','cumulative_capital_raised'\]/);
 assert.match(app,/TICKET_METRICS=\['initial_investment_range','average_investment_size','follow_on_investment_range'\]/);
 assert.match(app,/DEPLOYED_METRICS=\['cumulative_capital_invested','grant_funding_disbursed'\]/);
 // and each slot must label the corrected type as what it is, not as what it replaced
 assert.match(app,/'Vehicle NAV: '/,'a vehicle NAV must not be captioned as manager AUM');
 assert.match(app,/'Average ticket: '/,'an average must not be captioned as a ticket range');
 assert.match(app,/'Grants disbursed: '/,'grant money must not be captioned as own capital invested');
 assert.match(app,/'Own capital invested: '/);
 // no slot may be keyed on a single bare type any more
 assert.equal(/firstMetric\(i,\['manager_aum'\]\)/.test(app),false);
 assert.equal(/firstMetric\(i,\['cumulative_capital_invested'\]\)/.test(app),false);
});

test('an unverified candidate with sourced facts is not called wholly unverified',async()=>{
 const app=await import('node:fs/promises').then(fs=>fs.readFile(new URL('../../src/assets/atlas/atlas.js',import.meta.url),'utf8'));
 const notice=app.slice(app.indexOf("i.evidenceStatus==='watchlist'"),app.indexOf("i.sourceReference"));
 // the uncertainty is about defence relevance, not about whether the organisation exists
 assert.match(notice,/defence relevance/);
 assert.match(notice,/not its existence/);
 // and the old blanket claim is gone
 assert.equal(/inclusion is not confirmation of investment activity\.<\/p>'\)/.test(app),false,
  'the blanket "not confirmation of investment activity" claim must no longer stand beside sourced figures');
 // the softer fallback survives for a record that genuinely has nothing
 assert.match(notice,/Limited information is available/);
 assert.match(notice,/sourced facts in their own right/);
});

test('an unknown amount is never rendered as a zero',async()=>{
 const app=await import('node:fs/promises').then(fs=>fs.readFile(new URL('../../src/assets/atlas/atlas.js',import.meta.url),'utf8'));
 assert.match(app,/Investor contribution: \$\{p\.investorContribution\?esc\(amt\(p\.investorContribution\)\):'not disclosed'\}/);
 assert.match(app,/not established/);
 assert.equal(/:'0'/.test(app),false,'no slot may fall back to a zero');
});

// Every metric type the database can store must have a label and a card slot. METRIC_ORDER is
// derived from METRIC_LABEL, so an unlabelled type is dropped from the detail panel silently,
// and a type in no slot group never reaches a list card — a figure researched and stored, then
// invisible. This list mirrors the investor_financial_metrics_metric_type_check constraint.
test('every stored metric type has a label and exactly one card slot',()=>{
 const src=readFileSync(new URL('../../src/assets/atlas/atlas.js',import.meta.url),'utf8');
 const TYPES=['fund_size_target','fund_size_stated','fund_close_first','fund_close_interim',
  'fund_close_final','fund_close_announced','committed_capital','manager_aum','vehicle_nav',
  'cumulative_capital_raised','cumulative_capital_invested','grant_funding_disbursed','grant_count',
  'initial_investment_range','follow_on_investment_range','average_investment_size',
  'investment_count','portfolio_company_count'];
 const group=n=>{const m=src.match(new RegExp(n+'=\\\[([^\\\]]*)\\\]'));assert.ok(m,n+' not found in atlas.js');
  return m[1].split(',').map(s=>s.trim().replace(/^'|'$/g,''))};
 const labels=src.match(/const METRIC_LABEL=\{([^}]*)\}/);assert.ok(labels,'METRIC_LABEL not found');
 const slots=[...group('FUND_METRICS'),...group('SCALE_METRICS'),...group('TICKET_METRICS'),...group('DEPLOYED_METRICS')];
 const counted=['investment_count','portfolio_company_count','grant_count'];
 for(const t of TYPES){
  assert.ok(new RegExp('(^|,|\\{)'+t+':').test(labels[1]),t+' has no METRIC_LABEL entry, so the detail panel would drop it');
  if(counted.includes(t))continue; // counts are rendered from their own fields, not a money slot
  assert.equal(slots.filter(s=>s===t).length,1,t+' must appear in exactly one card slot group');
 }
 // and a scale metric must never be mislabelled as AUM
 assert.ok(/SCALE_PREFIX=\{[^}]*cumulative_capital_raised:/.test(src),
  'capital raised since inception needs its own prefix: it is not assets under management');
});

