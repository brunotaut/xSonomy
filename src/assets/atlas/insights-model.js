export const pct=(n,total)=>total?Math.round(n/total*100):0;
export function londonDate(now=new Date()){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}`;
}
const rank=rows=>rows.sort((a,b)=>b.n-a.n||a.name.localeCompare(b.name));
export function buildInsights(data,{country='',hubs=null,investors=null,events=null,today=londonDate()}={}){
 const companies=data.companies.filter(c=>!country||c.country===country),name=code=>data.countries.find(c=>c.code===code)?.name||code;
 const countries=rank(data.countries.map(c=>({code:c.code,name:c.name,n:companies.filter(x=>x.country===c.code).length})).filter(c=>c.n));
 const mix=[{id:'uav',name:'UAV only',color:'mint',n:companies.filter(c=>c.domains.includes('uav')&&!c.domains.includes('counter-uas')).length},{id:'counter-uas',name:'Counter-UAS only',color:'blue',n:companies.filter(c=>c.domains.includes('counter-uas')&&!c.domains.includes('uav')).length},{id:'both',name:'Both domains',color:'purple',n:companies.filter(c=>c.domains.includes('uav')&&c.domains.includes('counter-uas')).length}];
 const capabilities=rank(data.sectors.filter(s=>s.leaf).map(s=>({id:s.id,name:s.name,domain:s.domain,n:companies.filter(c=>c.sectors.includes(s.id)).length})).filter(s=>s.n));
 const matrixCountries=countries.slice(0,8),matrixCapabilities=capabilities.slice(0,6);
 const matrix=matrixCountries.map(c=>({...c,values:matrixCapabilities.map(s=>companies.filter(a=>a.country===c.code&&a.sectors.includes(s.id)).length)}));
 const offices=i=>(i.locations||[]).filter(l=>l.kind==='published_office_or_contact_city');
 const hubRows=(hubs?.hubs||[]).filter(h=>h.recordUnit!=='site');
 const network=data.countries.filter(c=>!country||c.code===country).map(c=>({code:c.code,name:c.name,hubs:hubRows.filter(h=>(h.locations||[]).some(l=>l.country===c.code)).length,investors:(investors?.investors||[]).filter(i=>offices(i).some(l=>l.country===c.code)).length})).map(r=>({...r,n:r.hubs+r.investors}));
 const networkRows=rank(network.filter(r=>r.n));
 const [y,m]=today.slice(0,7).split('-').map(Number),months=Array.from({length:12},(_,i)=>{const d=new Date(Date.UTC(y,m-1+i,1));return {month:d.toISOString().slice(0,7),core:0,adjacent:0,n:0}});
 const end=new Date(Date.UTC(y,m+11,1)).toISOString().slice(0,10),dated=(events?.events||[]).filter(e=>(!country||e.country===country)&&/^\d{4}-\d{2}-\d{2}$/.test(e.start||'')&&/^\d{4}-\d{2}-\d{2}$/.test(e.end||'')&&e.end>=today&&e.start<end);
 for(const e of dated){const bucket=months.find(m=>m.month===(e.start<today?today.slice(0,7):e.start.slice(0,7)));if(bucket){bucket.n++;if(e.relevance==='core')bucket.core++;else bucket.adjacent++}}
 return {country,countryName:country?name(country):'All Europe',total:companies.length,countries,mix,capabilities,matrixCountries,matrixCapabilities,matrix,topThreeShare:pct(countries.slice(0,3).reduce((n,c)=>n+c.n,0),companies.length),network:{rows:networkRows,hubsAvailable:!!hubs,investorsAvailable:!!investors,officeInvestors:(investors?.investors||[]).filter(i=>offices(i).length).length,allInvestors:investors?.investors.length||0},events:{available:!!events,months,total:dated.length,start:today,end,undated:(events?.watchlist||[]).filter(e=>!country||e.country===country).length},generatedAt:data.generatedAt};
}
