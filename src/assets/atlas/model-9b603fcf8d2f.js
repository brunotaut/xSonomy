export const defaults=()=>({countries:[],sectors:[],investorTypes:[],investorStages:[],investorFocus:[],hubTypes:[],hubFocus:[],ukraineOnly:false,q:'',domain:'',prime:false,mode:'overview',layout:'map',layers:{companies:true,hubs:true,investors:false},camera:{zoom:1,x:0,y:0},selected:null});
export function normalize(raw={}){let s=defaults();if(!raw||typeof raw!=='object')return s;for(let k of ['countries','sectors','investorTypes','investorStages','investorFocus','hubTypes','hubFocus'])s[k]=Array.isArray(raw[k])?[...new Set(raw[k].filter(x=>typeof x==='string').slice(0,100))]:[];s.q=typeof raw.q==='string'?raw.q.slice(0,200):'';s.domain=['uav','counter-uas','both'].includes(raw.domain)?raw.domain:'';s.prime=raw.prime===true;s.ukraineOnly=raw.ukraineOnly===true;s.mode=['overview','companies','hubs','investors','technologies'].includes(raw.mode)?raw.mode:'overview';s.layout=raw.layout==='list'?'list':'map';for(let k of Object.keys(s.layers))if(typeof raw.layers?.[k]==='boolean')s.layers[k]=raw.layers[k];let number=(v,d,min,max)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):d;s.camera={zoom:number(raw.camera?.zoom,1,1,4),x:number(raw.camera?.x,0,-3500,800),y:number(raw.camera?.y,0,-2620,580)};if(['country','hub','investor','company'].includes(raw.selected?.type)&&typeof raw.selected.id==='string')s.selected={type:raw.selected.type,id:raw.selected.id};return s}
export function readState(hash){try{return normalize(JSON.parse(decodeURIComponent(hash.replace(/^#/,''))))}catch{return defaults()}}
export function filterCompanies(data,s,{ignoreCountry=false,ignoreSectors=false}={}){const names=new Map(data.sectors.map(x=>[x.id,x.name]));return data.companies.filter(c=>(ignoreCountry||!s.countries.length||s.countries.includes(c.country))&&(!s.domain||(s.domain==='both'?c.domains.includes('uav')&&c.domains.includes('counter-uas'):c.domains.includes(s.domain)))&&(!s.prime||c.companyType==='prime')&&(ignoreSectors||!s.sectors.length||s.sectors.some(x=>c.sectors.includes(x)))&&(!s.q||(c.name+' '+(c.description||'')+' '+(c.products||[]).map(p=>p.name||'').join(' ')+' '+c.sectors.map(x=>names.get(x)||x).join(' ')).toLowerCase().includes(s.q.toLowerCase())))}
export const project=(lon,lat)=>[(lon+22)*13,(1.86-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360)))*500];
export function placeMarkers(items){const occupied=[];return items.map(item=>{let pos={...item},scale=item.scale||1;for(let n=0;n<100;n++){let angle=n*2.39996, r=n?9*Math.sqrt(n)*scale:0;pos.x=item.anchorX+Math.cos(angle)*r;pos.y=item.anchorY+Math.sin(angle)*r;let box={left:pos.x-17*scale,top:pos.y-18*scale,right:pos.x+(item.label?Math.min(110,item.label.length*7+17):17)*scale,bottom:pos.y+18*scale};if(!occupied.some(b=>box.left<b.right&&box.right>b.left&&box.top<b.bottom&&box.bottom>b.top)){occupied.push(box);return pos}}occupied.push({left:pos.x-17,top:pos.y-18,right:pos.x+17,bottom:pos.y+18});return pos})}
export function validateData(d){if(!d||!Array.isArray(d.companies)||!Array.isArray(d.countries)||!Array.isArray(d.sectors)||!d.companies.every(c=>typeof c.id==='string'&&typeof c.name==='string'&&Array.isArray(c.domains)&&Array.isArray(c.sectors)))throw Error('Invalid catalogue format');return d}
// Investor research records are a different organisation class from the catalogue
// companies: they are never merged into the company count, and the helpers below only
// tidy published wording for display and filtering. Nothing here rewrites the database.
const LABEL_CANON={'c-uas':'C-UAS','counter-uas':'C-UAS','cuas':'C-UAS','uav':'UAV','uas':'UAV','uav components':'UAV components','ew':'EW','isr':'ISR','dual-use':'Dual-use','dual use':'Dual-use','vc':'VC'};
export const NOT_ESTABLISHED='Not established';
export const normalizeLabel=v=>{const s=String(v??'').replace(/\s+/g,' ').trim();return LABEL_CANON[s.toLowerCase()]||s};
// A published stage is a point ("Seed"), a range ("Pre-seed–B", "Seed–B+") or a word
// ("Early", "Stage-agnostic"). Reading it onto one ladder is what lets a stage filter
// work at all; every card still shows the published wording, so the reading stays visible.
export const STAGE_LADDER=['Pre-seed','Seed','A','B','C','Growth'];
const STAGE_ALIAS={'pre-seed':'Pre-seed','preseed':'Pre-seed','seed':'Seed','late seed':'Seed','early seed':'Seed','a':'A','b':'B','c':'C','growth':'Growth','late':'Growth'};
const rung=v=>STAGE_ALIAS[String(v??'').toLowerCase().replace(/^series\s+/,'').replace(/\+$/,'').trim()]||null;
export function stagePositions(published){const out=new Set();for(const raw of published||[]){const s=normalizeLabel(raw),low=s.toLowerCase();if(/agnostic|any stage|all stages/.test(low)){STAGE_LADDER.forEach(x=>out.add(x));continue}if(low==='early'||low==='early stage'){out.add('Pre-seed');out.add('Seed');continue}const parts=s.split(/\s*[–—]\s*|\s+to\s+/).map(x=>x.trim()).filter(Boolean);if(parts.length>1){const a=STAGE_LADDER.indexOf(rung(parts[0])),b=STAGE_LADDER.indexOf(rung(parts.at(-1)));if(a>=0&&b>=0){for(let i=Math.min(a,b);i<=Math.max(a,b);i++)out.add(STAGE_LADDER[i]);if(/\+\s*$/.test(s))for(let i=Math.max(a,b);i<STAGE_LADDER.length;i++)out.add(STAGE_LADDER[i]);continue}}const one=rung(s);if(one){out.add(one);if(/\+\s*$/.test(s))for(let i=STAGE_LADDER.indexOf(one);i<STAGE_LADDER.length;i++)out.add(STAGE_LADDER[i])}}return STAGE_LADDER.filter(x=>out.has(x))}
export const investorTypeOf=i=>normalizeLabel(i.entityType)||NOT_ESTABLISHED;
export const investorFocusOf=i=>(i.focus||[]).map(normalizeLabel).filter(Boolean);
// The country filter reads published location countries only — never countryAssociations,
// which the export itself describes as a research index rather than a headquarters field.
export const investorLocations=(i,s)=>s?.countries?.length?(i.locations||[]).filter(l=>s.countries.includes(l.country)):(i.locations||[]);
export function filterInvestors(data,s,{ignoreCountry=false,ignoreTypes=false,ignoreStages=false,ignoreFocus=false}={}){const q=(s.q||'').trim().toLowerCase();return (data?.investors||[]).filter(i=>{if(s.ukraineOnly&&!i.ukraineRelated)return false;if(!ignoreCountry&&s.countries.length&&!(i.locations||[]).some(l=>s.countries.includes(l.country))&&!(!(i.locations||[]).length&&(i.countryAssociations||[]).some(c=>s.countries.includes(c))))return false;if(!ignoreTypes&&s.investorTypes.length&&!s.investorTypes.includes(investorTypeOf(i)))return false;if(!ignoreFocus&&s.investorFocus.length){const f=investorFocusOf(i);if(!s.investorFocus.some(x=>x===NOT_ESTABLISHED?!f.length:f.includes(x)))return false}if(!ignoreStages&&s.investorStages.length){const pos=stagePositions(i.stages),none=!(i.stages||[]).length;if(!s.investorStages.some(x=>x===NOT_ESTABLISHED?none:pos.includes(x)))return false}if(q){const hay=[i.name,i.entityType,...(i.selectedPortfolio||[]),...(i.focus||[]),...(i.stages||[]),...(i.locations||[]).map(l=>l.city),...(i.portfolio||[]).flatMap(p=>[p.name,p.nameAsPublished]),...(i.fundPositions||[]).map(f=>f.targetName)].join(' ').toLowerCase();if(!hay.includes(q))return false}return true})}
export function validateInvestors(d){if(!d||!Array.isArray(d.investors)||!d.investors.every(i=>typeof i.slug==='string'&&typeof i.name==='string'&&Array.isArray(i.locations)&&i.locations.every(l=>typeof l.country==='string'&&Number.isFinite(l.latitude)&&Number.isFinite(l.longitude))))throw Error('Invalid investor export format');return d}

// ---- Hub research layer ------------------------------------------------------
// Approved hub research records are a third organisation class, counted separately from
// companies and from investors. A `site` record belongs to another record and is never an
// independent organisation, so the two units are never added together.
// Location kinds are not interchangeable: a contact office is not a flight-test site, and
// nothing here turns a planned capability into an available one.
export const titleise=v=>{const s=String(v??'').replace(/_/g,' ').trim();return s?s[0].toUpperCase()+s.slice(1):''};
const HUB_TYPE_LABEL={research_test_centre:'Research & test centre',cluster_test_centre:'Cluster & test centre',training_test_centre:'Training & test centre',training_test_service:'Training & test service',defence_test_centre:'Defence test centre',defence_innovation_centre:'Defence innovation centre',defence_training_centre:'Defence training centre'};
export const hubTypeLabel=t=>HUB_TYPE_LABEL[t]||titleise(t);
export const hubTypeOf=h=>hubTypeLabel(h.hubType)||NOT_ESTABLISHED;
// Published campuses, flight-test localities and laboratory cities are research or test
// places. Network offices, contact cities and programme delivery cities are not: they are
// drawn differently, labelled differently and named in the legend as not being test sites.
const HUB_KIND_LABEL={published_campus_or_test_locality:'Published campus or test locality',flight_test_locality:'Flight-test locality',research_lab_city:'Research-laboratory city',simulation_lab_city:'Simulation-laboratory city',network_office_city:'Network office city',operator_contact_city:'Operator contact city',contact_office_city:'Contact office city',programme_delivery_city:'Programme delivery city'};
const TEST_OR_RESEARCH_KINDS=['published_campus_or_test_locality','flight_test_locality','research_lab_city','simulation_lab_city'];
export const hubKindLabel=k=>HUB_KIND_LABEL[k]||titleise(k);
export const isTestOrResearchLocality=k=>TEST_OR_RESEARCH_KINDS.includes(k);
export const hubFocusOf=h=>(h.technologyFocus||[]).map(normalizeLabel).filter(Boolean);
export const isSiteRecord=h=>h?.recordUnit==='site';
// The country filter reads published location countries only, and the markers that survive
// it are exactly the locations it matched — so a filtered map never shows a location the
// filter excluded.
export const hubLocations=(h,s)=>s?.countries?.length?(h.locations||[]).filter(l=>s.countries.includes(l.country)):(h.locations||[]);
// Hub localities are European place names: Kakolewo, Kosice, Troia, Brno. Folding accents
// on both sides lets someone type the plain-ASCII spelling and still find the record.
export const fold=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function filterHubs(data,s,{ignoreCountry=false,ignoreTypes=false,ignoreFocus=false}={}){const q=fold((s.q||'').trim());return (data?.hubs||[]).filter(h=>{if(!ignoreCountry&&s.countries.length&&!(h.locations||[]).some(l=>s.countries.includes(l.country)))return false;if(!ignoreTypes&&s.hubTypes.length&&!s.hubTypes.includes(hubTypeOf(h)))return false;if(!ignoreFocus&&s.hubFocus.length){const f=hubFocusOf(h);if(!s.hubFocus.some(x=>x===NOT_ESTABLISHED?!f.length:f.includes(x)))return false}if(q){const hay=fold([h.name,h.summary,h.localityText,h.researchNote,hubTypeOf(h),...hubFocusOf(h),...(h.locations||[]).map(l=>l.locality),...(h.locations||[]).map(l=>l.country)].join(' '));if(!hay.includes(q))return false}return true})}
// A record with no location or no source would be a map pin we cannot justify, so an
// invalid payload fails loudly here and the interface shows its error state instead of
// anything invented.
export function validateHubs(d){const ok=d&&Array.isArray(d.hubs)&&d.counts&&typeof d.counts==='object'&&d.hubs.every(h=>typeof h.slug==='string'&&h.slug&&typeof h.name==='string'&&h.name&&Array.isArray(h.locations)&&h.locations.length&&h.locations.every(l=>typeof l.country==='string'&&typeof l.kind==='string'&&Number.isFinite(l.latitude)&&Number.isFinite(l.longitude)));if(!ok)throw Error('Invalid hub export format');return d}

