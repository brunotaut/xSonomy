import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {buildLandscape} from '../lib/landscape.mjs';
import {fixture} from './landscape-fixture.mjs';
const source=readFileSync(new URL('../../src/assets/atlas/atlas.js',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('function companyInvestments('),source.indexOf('function companyProducts('));
function context(extra={}){return vm.createContext({esc:s=>String(s??'').replaceAll('<','&lt;').replaceAll('"','&quot;'),safeUrl:u=>/^https?:\/\//.test(u||'')?u:'',amt:m=>`${m.currency||''} ${m.amount}`,REL_LABEL:{portfolio_listed:'Listed in portfolio material',direct_investment:'Direct investment'},EVID_LABEL:{},titleise:s=>s,vStatus:'ok',D:{companies:[{id:'co'}]},...extra})}
test('investments match stable company IDs and keep round totals apart from investor contributions',()=>{
  const c=context({V:{investors:[{name:'Fund',slug:'fund',portfolio:[{companyId:'co',name:'Company',round:'Seed',roundTotal:{currency:'EUR',amount:5000000},investorContribution:{currency:'EUR',amount:1000000},relationshipType:'direct_investment',investmentDate:'2025-01-01',source:'https://example.com/deal'}]},{name:'Wrong fund',slug:'wrong',portfolio:[{companyId:'other',name:'Company',round:'Series A'}]}]}});
  vm.runInContext(helpers,c);
  const html=vm.runInContext(`companyInvestments({id:'co',funding:{currency:'EUR',amount:9000000}})`,c);
  assert.match(html,/Total funding reported/);assert.match(html,/EUR 9000000/);
  assert.match(html,/Total round: EUR 5000000/);assert.match(html,/Investor contribution: EUR 1000000/);
  assert.match(html,/Seed · 2025-01-01/);assert.match(html,/data-related-investor="fund"/);
  assert.doesNotMatch(html,/Wrong fund|Series A/);
  assert.match(vm.runInContext(`portfolioCompanyLink({companyId:'co',name:'Company'})`,c),/data-related-company="co"/);
  assert.doesNotMatch(vm.runInContext(`portfolioCompanyLink({companyId:'other',name:'Other'})`,c),/data-related-company/);
});
test('unknown rounds and unavailable investor data remain explicit without invented zero values',()=>{
  const c=context({V:{investors:[{name:'Fund',slug:'fund',portfolio:[{companyId:'co',relationshipType:'portfolio_listed'}]}]}});vm.runInContext(helpers,c);
  let html=vm.runInContext(`companyInvestments({id:'co'})`,c);
  assert.match(html,/Listed in portfolio material/);assert.match(html,/Round not disclosed/);assert.match(html,/Total round: not disclosed/);
  c.V=null;c.vStatus='error';html=vm.runInContext(`companyInvestments({id:'co'})`,c);assert.match(html,/currently unavailable/);assert.match(html,/data-retry-investors/);
});
test('linked detail Back restores the originating card, filters, list limit and scroll position',async()=>{
  const previous={state:{mode:'companies',countries:['CZ'],selected:{type:'company',id:'co'}},limit:80,scroll:380,companyListScroll:240};
  let handler;const panel={scrollTop:0,focus(){}};
  const c=context({state:{mode:'companies',selected:{type:'investor',id:'fund'}},panelHistory:[previous],D:{},suppressClick:false,companyListScroll:0,limit:40,detailOpen:false,$:()=>panel,render(){},save(){},document:{addEventListener(event,fn){handler=fn}}});
  vm.runInContext(source.slice(source.indexOf("document.addEventListener('click'"),source.indexOf("document.addEventListener('change'")),c);
  await handler({target:{closest:()=>({id:'backToCompanies',dataset:{}})}});
  assert.deepEqual(c.state,previous.state);assert.equal(c.limit,80);assert.equal(panel.scrollTop,380);assert.equal(c.companyListScroll,240);assert.equal(c.panelHistory.length,0);
});
test('the investor detail omits its Research note while hub notes remain unchanged',()=>{
  const investor=source.slice(source.indexOf('function invPanel('),source.indexOf('function renderInvestorMenus('));
  assert.doesNotMatch(investor,/i\.researchNote|Research note/);
  assert.match(source,/if\(h\.researchNote\)/);
});
test('company funding projection preserves known totals and unknown amounts',()=>{
  const input=fixture();input.companies.find(c=>c.id==='uav').total_funding=12000000;input.companies.find(c=>c.id==='uav').funding_currency='EUR';
  const rows=buildLandscape(input).companies;assert.deepEqual(rows.find(c=>c.id==='uav').funding,{amount:12000000,currency:'EUR'});assert.equal(rows.find(c=>c.id==='cuas').funding,null);
});
