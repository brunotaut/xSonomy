import {PLACES} from './places-20261102.js';
export const MAP_COLORS={companies:'#8ce7bb',hubs:'#b7a0ff',investors:'#ffc777'};
export const foldPlace=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ß/g,'ss').trim();
const places=new Map();
for(const p of PLACES)for(const n of new Set([p.name,...p.aliases].filter(n=>foldPlace(n)))){const key=p.country+':'+foldPlace(n),previous=places.get(key);places.set(key,places.has(key)&&previous?.id!==p.id?null:p)}
export const capitals=PLACES.filter(p=>p.capital);
export function resolvePlace(country,city){return foldPlace(city)?places.get(country+':'+foldPlace(city))||null:null}
export const markerRadius=n=>4+Math.min(16,2.8*Math.sqrt(Math.max(0,n)));
export const densityLevel=(n,max)=>n>0?Math.sqrt(n/Math.max(n,max)):0;
// Every group stays at its geographical anchor. Only text labels may move.
// Country-only records never inherit the capital's coordinates or name.
export function groupLocations({companies=[],hubs=[],investors=[],centers={}}){
 const groups=new Map();
 function add(type,record,country,city,lon,lat,kind){
  const p=resolvePlace(country,city),known=!!p||(!!city&&Number.isFinite(lon)&&Number.isFinite(lat));
  const coord=p?[p.lon,p.lat]:known?[lon,lat]:centers[country];if(!coord)return;
  const key=country+':'+(known?(p?.id||foldPlace(city)):'country');
  if(!groups.has(key))groups.set(key,{id:key,country,city:known?(p?.name||city):null,lon:coord[0],lat:coord[1],capital:!!p?.capital,approximate:!known,companies:[],hubs:[],investors:[],kinds:[]});
  const g=groups.get(key);if(!g[type].some(r=>(r.id||r.slug)===(record.id||record.slug)))g[type].push(record);
  if(kind&&!g.kinds.includes(kind))g.kinds.push(kind);
 }
 for(const c of companies)add('companies',c,c.country,c.hqCity,c.longitude,c.latitude,'company_hq');
 for(const h of hubs)for(const l of h.locations||[])add('hubs',h,l.country,l.locality,l.longitude,l.latitude,l.kind);
 for(const i of investors){for(const l of i.locations||[])add('investors',i,l.country,l.city,l.longitude,l.latitude,l.kind);if(!i.locations?.length)for(const c of i.countryAssociations||[])add('investors',i,c,null,null,null,'country_research_index')}
 return [...groups.values()].map(g=>({...g,n:g.companies.length+g.hubs.length+g.investors.length}));
}
// Reserve labels, never displace markers. Zoom reveals more labels as cities separate.
export function labelPositions(items,{scale=1,zoom=1,bounds={x:0,y:0,width:900,height:680}}={}){
 const used=[];return [...items].sort((a,b)=>(b.n||0)-(a.n||0)||Number(b.capital)-Number(a.capital)||a.id.localeCompare(b.id)).map(i=>{
  const radius=(i.radius||3)*scale,w=(i.label.length*5.8+9)*scale,h=15*scale;
  const candidates=[[radius+5*scale,-4*scale],[radius+5*scale,14*scale],[-radius-5*scale-w,-4*scale],[-radius-5*scale-w,14*scale]];
  let result={...i,labelVisible:false,labelX:candidates[0][0],labelY:candidates[0][1]};
  for(const [dx,dy]of candidates){const box={l:i.x+dx,t:i.y+dy-h,r:i.x+dx+w,b:i.y+dy+3*scale};if(box.l<bounds.x+5||box.r>bounds.x+bounds.width-5||box.t<bounds.y+90||box.b>bounds.y+bounds.height-37)continue;if(used.some(b=>box.l<b.r&&box.r>b.l&&box.t<b.b&&box.b>b.t))continue;used.push(box);return {...result,labelVisible:true,labelX:dx,labelY:dy}}
  return result;
 });
}
