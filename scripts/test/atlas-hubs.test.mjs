import test from 'node:test';import assert from 'node:assert/strict';
import {defaults,normalize,readState,filterHubs,hubLocations,hubTypeOf,hubFocusOf,hubKindLabel,isTestOrResearchLocality,isSiteRecord,validateHubs,titleise,NOT_ESTABLISHED} from '../../src/assets/atlas/model-817ff0fd25b0.js';
// Shaped exactly like /data/landscape-hubs.json so the atlas is tested against the export
// it actually consumes, including the five relationship cases the import had to separate.
const loc=(locality,country,kind='published_campus_or_test_locality')=>({locality,country,latitude:50,longitude:10,kind,precision:'approximate_locality_centroid',coordinateBasis:'Manually selected approximate place centroid; not an operator-provided coordinate or a facility boundary.'});
const src=[{url:'https://example.com/about',title:'About',accessedAt:'2026-10-31'}];
const H={edition:'european-uav-cuas-hubs',generatedAt:'2026-11-01T06:00:00.000Z',
 membership:'Approved UAV and Counter-UAS hub research records.',
 counts:{organisations:4,sites:1,programmes:0,records:5,locations:6,countries:4},
 caveats:{coordinates:'Approximate locality centroids, generally rounded to two decimals.',locationKinds:'A contact office is not a flight-test site.',recordUnits:'A site belongs to another record and is not an independent hub.',bvlos:'Planned or authorisation-dependent BVLOS is not current BVLOS availability.'},
 countryReviews:[{country:'AT',name:'Austria',researchRecords:2,mapCandidates:2,approvedRecords:2,approvedLocations:2,note:'Not a census.',reviewedAt:'2026-10-31'}],
 hubs:[
 {researchId:'airlabs-austria',slug:'airlabs-austria',name:'AIRlabs Austria',country:'AT',countryName:'Austria',localityText:'Graz',hubType:'innovation_network',recordUnit:'organisation_or_hub',evidenceStatus:'documented',technologyFocus:['UAV','BVLOS'],summary:'Multi-site Austrian UAV innovation network.',researchNote:'Graz point represents the network office.',operationalStatus:'not_independently_confirmed',accessModel:'Contact operator.',bvlosStatus:'not_established',cuasEvidence:'not_established',reviewedAt:'2026-10-31',matchedCompanyId:null,matchedInvestorId:null,matchRole:null,matchConfirmed:false,matchedCompanySlug:null,matchedCompanyUrl:null,matchedCompanyName:null,matchedInvestorSlug:null,matchedInvestorName:null,matchNote:null,
  relationships:[{kind:'site_of',direction:'incoming',researchId:'airlabs-steinalpl-test-area',name:'AIRlabs Steinalpl test area',published:true,note:'Separate localities with separate functions.'}],sources:src,locations:[loc('Graz','AT','network_office_city')]},
 {researchId:'airlabs-steinalpl-test-area',slug:'airlabs-steinalpl-test-area',name:'AIRlabs Steinalpl test area',country:'AT',countryName:'Austria',localityText:'Steinalpl',hubType:'test_area',recordUnit:'site',evidenceStatus:'documented',technologyFocus:['UAV','Alpine testing'],summary:'Alpine test area in the AIRlabs network.',researchNote:null,operationalStatus:'not_independently_confirmed',accessModel:'Contact operator.',bvlosStatus:'operator_describes_bvlos_test_area_subject_to_arrangement',cuasEvidence:'not_established',reviewedAt:'2026-10-31',matchedCompanyId:null,matchedInvestorId:null,matchRole:null,matchConfirmed:false,matchedCompanySlug:null,matchedCompanyUrl:null,matchedCompanyName:null,matchedInvestorSlug:null,matchedInvestorName:null,matchNote:null,
  relationships:[{kind:'site_of',direction:'outgoing',researchId:'airlabs-austria',name:'AIRlabs Austria',published:true,note:'Belongs to the AIRlabs Austria network.'}],sources:src,locations:[loc('Steinalpl','AT')]},
 {researchId:'atlas-flight-centers',slug:'atlas-flight-centers',name:'ATLAS Flight Centers',country:'ES',countryName:'Spain',localityText:'Villacarrillo',hubType:'test_centre',recordUnit:'organisation_or_hub',evidenceStatus:'documented',technologyFocus:['UAV','Flight testing'],summary:'Spanish UAV flight test centre with two site localities.',researchNote:null,operationalStatus:'not_independently_confirmed',accessModel:'Contact operator.',bvlosStatus:'not_established',cuasEvidence:'not_established',reviewedAt:'2026-10-31',matchedCompanyId:null,matchedInvestorId:null,matchRole:null,matchConfirmed:false,matchedCompanySlug:null,matchedCompanyUrl:null,matchedCompanyName:null,matchedInvestorSlug:null,matchedInvestorName:null,matchNote:null,
  relationships:[{kind:'operated_by',direction:'outgoing',researchId:'catec-research-centre',name:'CATEC',published:false,note:'CATEC remains in staging pending location resolution.'}],sources:src,locations:[loc('Villacarrillo','ES'),loc('Beas de Segura','ES')]},
 {researchId:'bofors-test-center',slug:'bofors-test-center',name:'Bofors Test Center',country:'SE',countryName:'Sweden',localityText:'Karlskoga',hubType:'defence_test_centre',recordUnit:'organisation_or_hub',evidenceStatus:'documented',technologyFocus:['Target drones'],summary:'Swedish defence test range.',researchNote:null,operationalStatus:'not_independently_confirmed',accessModel:'Contact operator.',bvlosStatus:'not_established',cuasEvidence:'explicit_source_scope_or_documented_activity',reviewedAt:'2026-10-31',matchedCompanyId:'co-bofors',matchedInvestorId:null,matchRole:'needs_review',matchConfirmed:false,matchedCompanySlug:null,matchedCompanyUrl:null,matchedCompanyName:null,matchedInvestorSlug:null,matchedInvestorName:null,matchNote:'Shares a name with the catalogue company Bofors. Recorded as a link to resolve, NOT asserted as the same organisation.',relationships:[],sources:src,locations:[loc('Karlskoga','SE')]},
 {researchId:'mits-accelerator',slug:'mits-accelerator',name:'MITS Accelerator',country:'UA',countryName:'Ukraine',localityText:'Kyiv',hubType:'accelerator',recordUnit:'organisation_or_hub',evidenceStatus:'documented',technologyFocus:[],summary:'Ukrainian defence-tech acceleration programme.',researchNote:null,operationalStatus:'not_independently_confirmed',accessModel:'Apply via the programme.',bvlosStatus:'planned_2027_per_operator_not_current',cuasEvidence:'not_established',reviewedAt:'2026-10-31',matchedCompanyId:null,matchedInvestorId:'inv-mits',matchRole:'related_organisation_different_function',matchConfirmed:true,matchedCompanySlug:null,matchedCompanyUrl:null,matchedInvestorSlug:'mits-capital-lightning-fund',matchedInvestorName:'MITS Capital / Lightning Fund',matchNote:'Related to the catalogue investor MITS Capital but a different function.',relationships:[],sources:src,locations:[loc('Kyiv','UA','programme_delivery_city')]}]};
const S=o=>({...defaults(),...o});

test('a site record never inflates the independent organisation count',()=>{
 const all=filterHubs(H,S({}));
 assert.equal(all.length,5,'five records match with no filter');
 assert.equal(all.filter(h=>!isSiteRecord(h)).length,4,'four independent organisations');
 assert.equal(all.filter(isSiteRecord).length,1,'one associated site, counted apart');
 assert.equal(all.filter(h=>!isSiteRecord(h)).length+all.filter(isSiteRecord).length,all.length);
 // the exported counts agree with what the interface derives from the records themselves
 assert.equal(H.counts.organisations,all.filter(h=>!isSiteRecord(h)).length);
 assert.equal(H.counts.sites,all.filter(isSiteRecord).length);
 assert.equal(H.counts.records,all.length);
});

test('locations are counted separately from records and both respect a filter',()=>{
 const none=S({});
 assert.equal(filterHubs(H,none).reduce((n,h)=>n+hubLocations(h,none).length,0),6,'six locations across five records');
 assert.equal(H.counts.locations,6);
 const es=S({countries:['ES']}),list=filterHubs(H,es);
 assert.equal(list.length,1,'one record matches Spain');
 assert.equal(list.reduce((n,h)=>n+hubLocations(h,es).length,0),2,'ATLAS contributes two site localities under one organisation');
 const at=S({countries:['AT']}),atList=filterHubs(H,at);
 assert.equal(atList.filter(h=>!isSiteRecord(h)).length,1,'Austria: one organisation');
 assert.equal(atList.filter(isSiteRecord).length,1,'Austria: one associated site');
});

test('the country filter shows only the locations it matched',()=>{
 const multi={...H,hubs:[{...H.hubs[2],locations:[loc('Villacarrillo','ES'),loc('Lisbon','PT')]}]};
 const es=S({countries:['ES']});
 assert.equal(filterHubs(multi,es).length,1);
 const shown=hubLocations(filterHubs(multi,es)[0],es);
 assert.equal(shown.length,1);
 assert.equal(shown[0].country,'ES','the PT locality is not drawn while ES is selected');
 assert.equal(filterHubs(multi,es)[0].locations.length,2,'the record still carries its full location list');
});

test('a contact office, a programme city and a test locality stay distinguishable',()=>{
 assert.equal(isTestOrResearchLocality('published_campus_or_test_locality'),true);
 assert.equal(isTestOrResearchLocality('flight_test_locality'),true);
 assert.equal(isTestOrResearchLocality('research_lab_city'),true);
 assert.equal(isTestOrResearchLocality('simulation_lab_city'),true);
 for(const k of ['network_office_city','operator_contact_city','contact_office_city','programme_delivery_city'])
   assert.equal(isTestOrResearchLocality(k),false,`${k} must never be drawn as a test site`);
 assert.equal(hubKindLabel('programme_delivery_city'),'Programme delivery city');
 assert.equal(hubKindLabel('contact_office_city'),'Contact office city');
 // an unknown kind still reads as English rather than leaking a database token
 assert.equal(hubKindLabel('some_new_kind'),'Some new kind');
});

test('BVLOS is carried as wording, never as an availability flag',()=>{
 for(const h of H.hubs){
   assert.equal(typeof h.bvlosStatus,'string');
   assert.equal('bvlosAvailable' in h,false);
   assert.equal('bvlosCurrent' in h,false);
 }
 // the planned case must not read as current
 const planned=H.hubs.find(h=>h.slug==='mits-accelerator');
 assert.match(titleise(planned.bvlosStatus),/not current/);
 assert.equal(titleise('not_established'),'Not established');
});

test('hub type and technology focus filter, including UAV and C-UAS',()=>{
 assert.equal(hubTypeOf(H.hubs[0]),'Innovation network');
 assert.equal(hubTypeOf(H.hubs[3]),'Defence test centre');
 assert.deepEqual(filterHubs(H,S({hubTypes:['Test centre']})).map(h=>h.slug),['atlas-flight-centers']);
 assert.deepEqual(filterHubs(H,S({hubFocus:['UAV']})).map(h=>h.slug),['airlabs-austria','airlabs-steinalpl-test-area','atlas-flight-centers']);
 assert.deepEqual(filterHubs(H,S({hubFocus:[NOT_ESTABLISHED]})).map(h=>h.slug),['mits-accelerator']);
 // selections within a filter are OR, different filters are AND
 assert.deepEqual(filterHubs(H,S({hubFocus:['UAV','Target drones']})).map(h=>h.slug).sort(),['airlabs-austria','airlabs-steinalpl-test-area','atlas-flight-centers','bofors-test-center']);
 assert.deepEqual(filterHubs(H,S({hubFocus:['UAV'],countries:['ES']})).map(h=>h.slug),['atlas-flight-centers']);
 assert.deepEqual(hubFocusOf(H.hubs[0]),['UAV','BVLOS']);
});

test('search covers names, descriptions and localities',()=>{
 assert.deepEqual(filterHubs(H,S({q:'alpine'})).map(h=>h.slug),['airlabs-steinalpl-test-area'],'name');
 assert.deepEqual(filterHubs(H,S({q:'innovation network'})).map(h=>h.slug),['airlabs-austria'],'description');
 assert.deepEqual(filterHubs(H,S({q:'beas de segura'})).map(h=>h.slug),['atlas-flight-centers'],'a locality that is not the record headline');
 assert.deepEqual(filterHubs(H,S({q:'karlskoga'})).map(h=>h.slug),['bofors-test-center'],'locality');
 assert.equal(filterHubs(H,S({q:'nothing here'})).length,0,'an empty result is a real state');
});

test('search folds accents so a plain-ASCII spelling still finds a European locality',()=>{
 const pl={...H,hubs:[{...H.hubs[2],slug:'psnc',researchId:'psnc',name:'PSNC Aerospace Lab',localityText:'Kąkolewo',locations:[loc('Kąkolewo','PL')]}]};
 assert.deepEqual(filterHubs(pl,S({q:'kakolewo'})).map(h=>h.slug),['psnc'],'typed without the ogonek');
 assert.deepEqual(filterHubs(pl,S({q:'Kąkolewo'})).map(h=>h.slug),['psnc'],'typed with it');
 const tr={...H,hubs:[{...H.hubs[3],slug:'kosice',researchId:'kosice',name:'TUKE Košice',locations:[loc('Košice','SK')]}]};
 assert.deepEqual(filterHubs(tr,S({q:'kosice'})).map(h=>h.slug),['kosice']);
});

test('facet counts ignore their own filter so a selection does not zero its own menu',()=>{
 const s=S({hubTypes:['Test centre']});
 assert.equal(filterHubs(H,s,{ignoreTypes:true}).filter(h=>hubTypeOf(h)==='Accelerator').length,1,'other types still show a count');
 assert.equal(filterHubs(H,s).length,1,'while the applied filter still narrows the results');
});

test('the two hub facets round-trip through the URL and reset with everything else',()=>{
 const s={...defaults(),mode:'hubs',hubTypes:['Test centre'],hubFocus:['UAV'],countries:['ES'],selected:{type:'hub',id:'atlas-flight-centers'},layers:{companies:false,hubs:true,investors:false}};
 assert.deepEqual(readState('#'+encodeURIComponent(JSON.stringify(s))),s);
 assert.deepEqual(defaults().hubTypes,[]);
 assert.deepEqual(defaults().hubFocus,[]);
 // a hostile hash cannot smuggle a non-string facet or an unknown selection type through
 assert.deepEqual(normalize({hubTypes:['ok',7,null],hubFocus:'not-an-array',selected:{type:'nonsense',id:'x'}}).hubTypes,['ok']);
 assert.deepEqual(normalize({hubFocus:'not-an-array'}).hubFocus,[]);
 assert.equal(normalize({selected:{type:'nonsense',id:'x'}}).selected,null);
 assert.deepEqual(normalize({selected:{type:'hub',id:'airlabs-austria'}}).selected,{type:'hub',id:'airlabs-austria'});
});

test('an unusable payload fails loudly instead of degrading to invented records',()=>{
 assert.throws(()=>validateHubs({hubs:[{slug:'x',name:'X',locations:[]}],counts:{}}),/Invalid hub export/,'a record with no location is not publishable');
 assert.throws(()=>validateHubs({hubs:[{slug:'x',name:'X',locations:[{country:'DE',kind:'k',latitude:'50',longitude:10}]}],counts:{}}),/Invalid hub export/,'a non-numeric coordinate');
 assert.throws(()=>validateHubs({hubs:[{name:'X',locations:[{country:'DE',kind:'k',latitude:50,longitude:10}]}],counts:{}}),/Invalid hub export/,'a missing stable slug');
 assert.throws(()=>validateHubs({hubs:[]}),/Invalid hub export/,'a payload with no counts block');
 assert.equal(validateHubs(H),H,'the real export shape passes');
 // nothing in the model can produce a record, so a failed fetch can only yield emptiness
 assert.deepEqual(filterHubs(null,S({})),[]);
 assert.deepEqual(filterHubs({},S({})),[]);
});

test('unpublished relationship targets are never resolvable to a record',()=>{
 const byId=id=>H.hubs.find(h=>h.researchId===id||h.slug===id);
 const atlas=H.hubs.find(h=>h.slug==='atlas-flight-centers');
 const rel=atlas.relationships[0];
 assert.equal(rel.published,false);
 assert.equal(byId(rel.researchId),undefined,'CATEC is in staging, so there is nothing to link to');
 // the four published relationship ends do resolve, in both directions
 for(const h of H.hubs)for(const r of h.relationships||[])if(r.published)
   assert.ok(byId(r.researchId),`${r.researchId} must be reachable`);
 const net=H.hubs.find(h=>h.slug==='airlabs-austria'),site=H.hubs.find(h=>h.slug==='airlabs-steinalpl-test-area');
 assert.equal(net.relationships[0].direction,'incoming');
 assert.equal(site.relationships[0].direction,'outgoing');
 assert.equal(isSiteRecord(site),true,'the operator and its test area stay separate records');
 assert.equal(isSiteRecord(net),false);
});

// Whether a match may be linked is now decided once, in the export, and arrives as
// matchConfirmed plus a resolved slug. The interface must not re-derive it from the
// role: a second copy of that rule in the client is what let the two drift apart, so
// that DLR and MITS Capital were both confirmed and both still rendered as plain text.
test('a needs_review match never becomes an asserted relationship',()=>{
 const bofors=H.hubs.find(h=>h.slug==='bofors-test-center');
 assert.equal(bofors.matchRole,'needs_review');
 assert.equal(bofors.matchConfirmed,false,'so the interface must not link it');
 assert.equal(bofors.matchedCompanyUrl,null,'and the export withholds the url, not just the role');
 assert.notEqual(bofors.matchedCompanyId,null,'the stored id still travels, for the text');
 assert.match(bofors.matchNote,/NOT asserted as the same organisation/);
 const mits=H.hubs.find(h=>h.slug==='mits-accelerator');
 assert.equal(mits.matchConfirmed,true,'a different-function link is a conclusion, so it may link');
 assert.equal(mits.matchedInvestorSlug,'mits-capital-lightning-fund');
 assert.equal(mits.matchedCompanyUrl,null,'and it is an investor, not a company');
});

test('the hub panel links from the resolved fields and does not re-derive the rule',async()=>{
 const app=await import('node:fs/promises').then(fs=>fs.readFile(new URL('../../src/assets/atlas/atlas.js',import.meta.url),'utf8'));
 const panel=app.slice(app.indexOf('function hubPanel'),app.indexOf('function renderHubMenus'));
 assert.match(panel,/h\.matchConfirmed===true/,'the gate comes from the export');
 assert.match(panel,/safeUrl\(h\.matchedCompanyUrl\)/,'the company link is the resolved url');
 assert.match(panel,/data-investor="\$\{esc\(invSlug\)\}"/,'the investor opens by its resolved slug');
 // the old bug: resolving the match by searching a payload that does not contain the
 // target. DLR is a research institute and is not in the landscape company list at all.
 assert.match(panel,/h\.matchedCompanyName\|\|h\.matchedCompanySlug/,'and so does its label');
 // the old bug, in both halves: the link and the label both came from searching a
 // payload that does not contain the target
 assert.equal(/\.find\(c=>c\.id===h\.matchedCompanyId\)/.test(panel),false,
  'nothing about the company match may depend on finding the id in the landscape payload');
 assert.equal(/\.find\(i=>i\.id===h\.matchedInvestorId\)/.test(panel),false,
  'and the investor id in hub records belongs to a different table than that payload');
 assert.equal(/ASSERTED_MATCH/.test(app),false,'no second copy of the confirmed-role list in the client');
 assert.match(panel,/A possible match, not confirmed/,'an unconfirmed match says so in words');
});

test('no Ukrainian UI label and no demo record survives in the model',async()=>{
 const model=await import('node:fs/promises').then(fs=>fs.readFile(new URL('../../src/assets/atlas/model-817ff0fd25b0.js',import.meta.url),'utf8'));
 const app=await import('node:fs/promises').then(fs=>fs.readFile(new URL('../../src/assets/atlas/atlas.js',import.meta.url),'utf8'));
 for(const [name,text] of [['model.js',model],['atlas.js',app]]){
  assert.equal(/[Ѐ-ӿ]/.test(text),false,`${name} must carry no Cyrillic UI text`);
  assert.equal(/illustrative|Illustrative|DEMONSTRATION|demoItems|demoCards/.test(text),false,`${name} must carry no demo hub wording`);
 }
 assert.equal(/\{id:'prague'|'munich'|'kyiv',lon:/.test(app),false,'the fictional hub records are gone');
 assert.equal(/Development hubs will appear/.test(app),false);
});
