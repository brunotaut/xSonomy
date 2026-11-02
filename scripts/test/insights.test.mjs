import test from 'node:test';
import assert from 'node:assert/strict';
import {buildInsights,londonDate} from '../../src/assets/atlas/insights-model.js';
const data={generatedAt:'2026-11-02T00:00:00Z',countries:[{code:'DE',name:'Germany'},{code:'FR',name:'France'}],sectors:[{id:'u',name:'UAV',leaf:false,domain:'uav'},{id:'ai',name:'Autonomy',leaf:true,domain:'uav'},{id:'rf',name:'RF',leaf:true,domain:'counter-uas'}],companies:[{id:'a',country:'DE',domains:['uav'],sectors:['u','ai','ai']},{id:'b',country:'DE',domains:['uav','counter-uas'],sectors:['ai','rf']},{id:'c',country:'FR',domains:['counter-uas'],sectors:['rf']}]};
test('domain slices and HQ totals partition company identities; capability assignments overlap safely',()=>{
 const m=buildInsights(data);assert.equal(m.total,3);assert.equal(m.mix.reduce((n,r)=>n+r.n,0),3);assert.deepEqual(m.mix.map(r=>r.n),[1,1,1]);assert.equal(m.countries.reduce((n,r)=>n+r.n,0),3);assert.equal(m.capabilities.find(r=>r.id==='ai').n,2);assert.ok(!m.capabilities.some(r=>r.id==='u'));assert.equal(m.matrix.find(r=>r.code==='DE').values[m.matrixCapabilities.findIndex(r=>r.id==='rf')],1);
});
test('country filter consistently narrows company, capability, network and event charts',()=>{
 const opts={country:'FR',today:'2026-11-02',hubs:{hubs:[{slug:'h',locations:[{country:'DE'},{country:'FR'}]}]},investors:{investors:[{slug:'i',locations:[{country:'DE',kind:'published_office_or_contact_city'}]}]},events:{events:[{country:'FR',start:'2026-12-01',end:'2026-12-02',relevance:'core'},{country:'DE',start:'2026-12-01',end:'2026-12-02',relevance:'core'}],watchlist:[{country:'DE'}]}};
 const m=buildInsights(data,opts);assert.equal(m.total,1);assert.equal(m.capabilities.length,1);assert.deepEqual(m.network.rows.map(r=>r.code),['FR']);assert.equal(m.network.rows[0].hubs,1);assert.equal(m.network.rows[0].investors,0);assert.equal(m.events.total,1);assert.equal(m.events.undated,0);
});
test('network counts each identity once per country and excludes sites, meetings and country associations',()=>{
 const m=buildInsights(data,{hubs:{hubs:[{slug:'h',locations:[{country:'DE'},{country:'DE'},{country:'FR'}]},{slug:'site',recordUnit:'site',locations:[{country:'DE'}]}]},investors:{investors:[{slug:'office',locations:[{country:'DE',kind:'published_office_or_contact_city'},{country:'DE',kind:'published_office_or_contact_city'}]},{slug:'meeting',locations:[{country:'FR',kind:'published_meeting_location'}]},{slug:'index',locations:[],countryAssociations:['FR']}]}});
 const de=m.network.rows.find(r=>r.code==='DE'),fr=m.network.rows.find(r=>r.code==='FR');assert.equal(de.hubs,1);assert.equal(de.investors,1);assert.equal(fr.hubs,1);assert.equal(fr.investors,0);assert.equal(m.network.officeInvestors,1);assert.equal(m.network.allInvestors,3);
});
test('calendar retains all twelve buckets, excludes past/TBA/far-future and counts ongoing editions once',()=>{
 const m=buildInsights(data,{today:'2026-11-02',events:{events:[{start:'2026-10-30',end:'2026-11-03',relevance:'core'},{start:'2026-11-01',end:'2026-11-01',relevance:'core'},{start:'2027-10-31',end:'2027-11-02',relevance:'adjacent'},{start:'2027-11-01',end:'2027-11-02',relevance:'core'},{start:null,end:null}],watchlist:[{year:2027}]}});
 assert.equal(m.events.months.length,12);assert.equal(m.events.months[0].month,'2026-11');assert.equal(m.events.months.at(-1).month,'2027-10');assert.equal(m.events.total,2);assert.equal(m.events.months[0].core,1);assert.equal(m.events.months.at(-1).adjacent,1);assert.equal(m.events.months.reduce((n,r)=>n+r.n,0),2);assert.equal(m.events.undated,1);assert.equal(m.events.months[1].n,0);
});
test('empty selections and unavailable secondary data preserve meaningful zero/availability distinctions',()=>{
 const m=buildInsights(data,{country:'XX'});assert.equal(m.total,0);assert.equal(m.topThreeShare,0);assert.equal(m.events.available,false);assert.equal(m.network.hubsAvailable,false);assert.equal(m.network.investorsAvailable,false);assert.equal(m.events.months.length,12);
});
test('date buckets follow London local date at the daylight-saving boundary',()=>{assert.equal(londonDate(new Date('2027-06-01T23:30:00Z')),'2027-06-02');assert.equal(londonDate(new Date('2026-11-02T23:30:00Z')),'2026-11-02')});
