import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {isNamedInvestor} from '../../src/assets/atlas/investor-presentation.js';
import {buildLandscape,buildLandscapeInvestors} from '../lib/landscape.mjs';
import {fixture} from './landscape-fixture.mjs';
const app=readFileSync(new URL('../../src/assets/atlas/atlas.js',import.meta.url),'utf8');

test('anonymous participants stay in sourced rounds without being counted as named investor identities',()=>{
 const anon={id:'anon',slug:'undisclosed-investors',name:'11 undisclosed accredited investors',locations:[]};
 const named={id:'named',slug:'named',name:'Named Ventures',locations:[]};
 const round={id:'round',company_id:'uav',stage:'Seed',amount:2000000,currency:'EUR',sources:[{url:'https://example.com/round'}],investors:[{slug:anon.slug,name:anon.name,role:'participant',source:'https://example.com/round'}]};
 const company=buildLandscape({...fixture(),fundingRounds:[round]}).companies.find(c=>c.id==='uav');
 assert.equal(company.fundingRounds[0].investors[0].name,anon.name);
 assert.equal(company.fundingRounds[0].amount.amount,2000000);
 assert.deepEqual(buildLandscapeInvestors({investors:[anon,named],reviews:[]}).investors.map(i=>i.slug),['named']);
 const ctx=vm.createContext({isNamedInvestor,esc:s=>String(s??''),amt:m=>m.currency+' '+m.amount,safeUrl:u=>u,rounds:company.fundingRounds});
 vm.runInContext(app.slice(app.indexOf('function fundingRoundCards('),app.indexOf('function investorFundingRounds(')),ctx);
 const html=vm.runInContext('fundingRoundCards(rounds)',ctx);
 assert.match(html,/11 undisclosed accredited investors/);
 assert.doesNotMatch(html,/data-related-investor/);
 assert.match(html,/EUR 2000000/);
 for(const name of ['Undisclosed institutional investor','Undisclosed leading U.S. investment fund','Undisclosed third-party allotment subscribers'])assert.equal(isNamedInvestor({name}),false);
 assert.equal(isNamedInvestor({name:'Anonymous Ventures'}),true);
});

test('compact investor cards show sourced figures and links without empty field repetition',()=>{
 const ctx=vm.createContext({V:{},state:{},investorLocations:i=>i.locations||[],investorTypeOf:i=>i.entityType||'Investor',countryName:c=>c,flag:c=>c,esc:s=>String(s??'').replaceAll('<','&lt;'),money:n=>n.toLocaleString('en-GB')});
 vm.runInContext(app.slice(app.indexOf('const METRIC_LABEL='),app.indexOf('function invPanel(')),ctx);
 const render=i=>{ctx.rows=[i];return vm.runInContext('invCards(rows)',ctx)};
 let html=render({slug:'fund',name:'Fund <script>',locations:[],financialMetrics:[],fundingCompanies:[{id:'a'},{id:'a'}]});
 assert.doesNotMatch(html,/not established|<script>/);assert.match(html,/1 linked company/);assert.match(html,/Fund &lt;script>/);
 html=render({slug:'fund',name:'Fund',financialMetrics:[{metricType:'fund_size_target',display:'€50M target'}],fundingCompanies:[]});assert.match(html,/€50M target/);
});

test('launch pages expose valid social image metadata and a correction route without changing map fragment state',()=>{
 const image=readFileSync(new URL('../../src/assets/atlas/landscape-social.png',import.meta.url));
 assert.equal(image.readUInt32BE(16),1200);assert.equal(image.readUInt32BE(20),630);
 for(const route of ['landscape','landscape/events','landscape/insights']){
  const html=readFileSync(new URL('../../src/'+route+'/index.html',import.meta.url),'utf8');
  assert.match(html,/<meta property="og:image" content="https:\/\/xsonomy.com\/assets\/atlas\/landscape-social.png">/);
  assert.match(html,/<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html,/Share a suggestion/);
  assert.match(html,/href="\/landscape\/feedback\/"/);
  assert.doesNotMatch(html,/href="\/landscape\/#about-data"/);
 }
});
