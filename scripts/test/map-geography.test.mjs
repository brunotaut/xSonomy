import test from 'node:test';
import assert from 'node:assert/strict';
import {groupLocations,resolvePlace,markerRadius,densityLevel,labelPositions,capitals} from '../../src/assets/atlas/map-geography.js';
import {normalize} from '../../src/assets/atlas/model-map-20261102.js';
test('city aliases resolve only inside their country; invalid cities stay country-only',()=>{
 assert.equal(resolvePlace('DE','Munich').id,resolvePlace('DE','Munchen').id);
 assert.equal(resolvePlace('UA','Boston'),null);
 assert.equal(resolvePlace('GB','Norfolk'),null);
 for(const p of capitals)for(const name of [null,undefined,'',' '])assert.equal(resolvePlace(p.country,name),null);
 assert.equal(new Set(capitals.map(p=>p.country)).size,32);
 const g=groupLocations({companies:[{id:'a',country:'UA',hqCity:'Boston'}],centers:{UA:[31,49]}})[0];
 assert.equal(g.approximate,true);assert.equal(g.city,null);assert.equal(g.lon,31);
});
test('city groups deduplicate identities across locations and preserve all layers and location kinds',()=>{
 const g=groupLocations({companies:[{id:'a',country:'GB',hqCity:'London'},{id:'b',country:'GB',hqCity:'London'}],hubs:[{slug:'h1',locations:[{country:'GB',locality:'London',kind:'contact_office_city'},{country:'GB',locality:'London',kind:'research_lab_city'}]},{slug:'h2',locations:[{country:'GB',locality:'London',kind:'research_lab_city'}]}],investors:[{slug:'v',locations:[{country:'GB',city:'London',kind:'published_office_or_contact_city'}]}]});
 assert.equal(g.length,1);assert.equal(g[0].n,5);assert.equal(g[0].hubs.length,2);assert.equal(g[0].capital,true);assert.ok(g[0].kinds.includes('contact_office_city'));assert.ok(g[0].kinds.includes('research_lab_city'));
});
test('country-only investors never become capital office locations',()=>{
 const g=groupLocations({investors:[{slug:'a',locations:[],countryAssociations:['FR']},{slug:'b',locations:[],countryAssociations:['FR']}],centers:{FR:[2,46.3]}})[0];
 assert.equal(g.n,2);assert.equal(g.city,null);assert.equal(g.capital,false);assert.equal(g.approximate,true);assert.equal(g.lat,46.3);
});
test('density and radii increase monotonically; label layout never moves map anchors',()=>{
 assert.ok(markerRadius(10)>markerRadius(1));assert.ok(densityLevel(20,100)>densityLevel(2,100));assert.equal(densityLevel(0,100),0);
 const input=[{id:'a',x:400,y:300,label:'London',n:4,radius:10},{id:'b',x:400,y:300,label:'Paris',n:1,radius:7}];
 const out=labelPositions(input);for(const p of out){assert.equal(p.x,400);assert.equal(p.y,300)}
 assert.ok(out.some(p=>p.labelVisible));assert.equal(normalize({selected:{type:'locality',id:'GB:2643743'}}).selected.type,'locality');
});
