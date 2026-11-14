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
for(const type of ['company','investor'])test(`Back from ${type} details restores the map view, filters, list scroll and focus`,async()=>{
  const state={selected:{type,id:'test'},countries:['CZ'],q:'radar',sectors:['radar'],layout:'map',camera:{zoom:2,x:31,y:-80}};
  const expected={...state,selected:null};let handler,rendered=false,saved=false,focused=false;
  const panel={scrollTop:0},list={scrollTop:0},target={getClientRects:()=>[{}],focus(options){assert.equal(options.preventScroll,true);focused=true}};
  const workspace={querySelectorAll(selector){assert.equal(selector,`[data-${type}="test"]`);return [{getClientRects:()=>[]},target]}};
  const nodes={'#panel':panel,'#list':list,'#workspace':workspace};
  const context=vm.createContext({state,D:{},panelHistory:[],detailReturn:{scroll:260,listScroll:90,detailOpen:false},suppressClick:false,companyListScroll:0,detailOpen:true,CSS:{escape:v=>v},$:s=>nodes[s],render:()=>{rendered=true},save:()=>{saved=true},document:{addEventListener(event,fn){handler=fn}}});
  vm.runInContext(source.slice(source.indexOf("document.addEventListener('click'"),source.indexOf("document.addEventListener('change'")),context);
  await handler({target:{closest:()=>({id:'backToCompanies',dataset:{}})}});
  assert.deepEqual(state,expected);assert.equal(panel.scrollTop,260);assert.equal(list.scrollTop,90);assert.ok(rendered&&saved&&focused);assert.equal(context.detailOpen,false);assert.equal(context.detailReturn,null);
});
for(const type of ['company','investor'])test(`${type} detail disables the covered map and exposes Back`,()=>{
 const classes={},attrs={},map={},panel={setAttribute:(k,v)=>attrs[k]=v},workspace={classList:{toggle:(k,v)=>classes[k]=v}};
 map.setAttribute=(k,v)=>attrs['map-'+k]=v;
 const c={id:'co',name:'Company',country:'DE',sectors:[],description:'Description'};
 const context=vm.createContext({D:{companies:[c]},state:{selected:{type,id:'co'}},detailOpen:true,panelHistory:[],$:s=>({'#panel':panel,'#workspace':workspace,'#map':map}[s]),esc:s=>s??'',flag:s=>s,countryName:s=>s,companyHeaderFacts:()=>'',companyProducts:()=>'',companyInvestments:()=>'',results:()=>[c],invPanel:()=>'<h2>Investor</h2>',invSelected:()=>({}),directory:()=>''});
 vm.runInContext(source.slice(source.indexOf('function renderPanel('),source.indexOf('function renderMenus(')),context);vm.runInContext('renderPanel()',context);
 assert.equal(classes['entity-open'],true);assert.equal(map.inert,true);assert.equal(attrs['map-aria-hidden'],'true');assert.match(panel.innerHTML,/Back to previous view/);
 context.state.selected=null;context.state.mode='companies';context.detailOpen=false;vm.runInContext('renderPanel()',context);assert.equal(classes['entity-open'],false);assert.equal(map.inert,false);
});
