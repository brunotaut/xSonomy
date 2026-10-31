import test from 'node:test';
import assert from 'node:assert/strict';
import {enrichInvestorProfiles} from '../lib/investor-profiles.mjs';
test('portfolio links resolve only unique published company identities and never infer amounts',()=>{
 const p={investors:[{selectedPortfolio:['Known','Draft','Missing','Duplicate'],sources:[{url:'https://example.org/portfolio'}]}]};
 enrichInvestorProfiles(p,[{id:'1',name:'Known',slug:'known',publication_status:'live'},{id:'2',name:'Draft',slug:'draft',publication_status:'draft'},{name:'Duplicate',slug:'one',publication_status:'live'},{name:'Duplicate',slug:'two',publication_status:'live'}]);
 assert.equal(p.investors[0].portfolio[0].url,'/companies/known/');
 assert.equal(p.investors[0].portfolio[0].companyId,'1');
 for(const r of p.investors[0].portfolio.slice(1))assert.equal(r.url,null);
 assert.ok(p.investors[0].portfolio.every(r=>r.investorContribution===null&&r.roundTotal===null));
});
