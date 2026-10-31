import test from 'node:test';import assert from 'node:assert/strict';
import {defaults,normalize,readState,filterInvestors,investorLocations,investorTypeOf,investorFocusOf,stagePositions,validateInvestors,NOT_ESTABLISHED} from '../../src/assets/atlas/model-38a1ee1dfbb0.js';
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
 assert.throws(()=>validateInvestors({investors:[{slug:'x',name:'X',locations:[]}]}),/Invalid investor export/);
 assert.throws(()=>validateInvestors({investors:[{slug:'x',name:'X',locations:[{country:'DE',latitude:null,longitude:10}]}]}));
 assert.throws(()=>validateInvestors({}));
});
