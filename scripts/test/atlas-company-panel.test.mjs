import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../../src/assets/atlas/atlas.js',import.meta.url),'utf8');
test('product tags open published relative URLs and escape names without linking unsafe or absent URLs',()=>{
  const context=vm.createContext({});
  vm.runInContext(source.slice(source.indexOf('const $='),source.indexOf('const centers='))+'\n'+source.slice(source.indexOf('const safeUrl='),source.indexOf('\n',source.indexOf('const safeUrl=')))+'\n'+source.slice(source.indexOf('function companyProducts('),source.indexOf('function renderPanel(')),context);
  const html=vm.runInContext(`companyProducts({products:[{name:'Test <UAV>',url:'/uav/test/'},{name:'External',url:'https://xsonomy.com/cuas/test/'},{name:'Pending',url:null},{name:'Unsafe',url:'javascript:alert(1)'},{name:'Protocol relative',url:'//evil.example'}]})`,context);
  assert.match(html,/href="\/uav\/test\/"/);
  assert.match(html,/Test &lt;UAV&gt;/);
  assert.match(html,/href="https:\/\/xsonomy.com\/cuas\/test\/"/);
  assert.equal((html.match(/<a /g)||[]).length,2);
  assert.doesNotMatch(html,/href="(?:javascript:|\/\/evil)/);
  assert.match(vm.runInContext('companyProducts({})',context),/No products listed yet/);
});
test('Back returns to the same filtered company list and restores scroll and keyboard focus',async()=>{
  const state={selected:{type:'company',id:'test'},countries:['CZ'],q:'radar',sectors:['radar'],layout:'map'};
  const expected={...state,selected:null};
  let handler,rendered=false,saved=false,focused=false;
  const panel={scrollTop:0,querySelector(selector){assert.equal(selector,'[data-company="test"]');return {focus(options){assert.equal(options.preventScroll,true);focused=true}}}};
  const context=vm.createContext({state,D:{},panelHistory:[],suppressClick:false,companyListScroll:260,detailOpen:false,CSS:{escape:v=>v},$:()=>panel,render:()=>{rendered=true},save:()=>{saved=true},document:{addEventListener(event,fn){handler=fn}}});
  vm.runInContext(source.slice(source.indexOf("document.addEventListener('click'"),source.indexOf("document.addEventListener('change'")),context);
  await handler({target:{closest:()=>({id:'backToCompanies',dataset:{}})}});
  assert.deepEqual(state,expected);
  assert.equal(panel.scrollTop,260);
  assert.ok(rendered&&saved&&focused);
  assert.equal(context.detailOpen,true);
});
