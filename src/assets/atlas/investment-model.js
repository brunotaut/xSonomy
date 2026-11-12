import {isNamedInvestor} from './investor-presentation.js';
export const INVESTMENT_DEFAULTS={currency:'EUR',country:'',domain:'',period:'all',scope:'venture',status:'reported'};
const WEB=u=>{try{return ['https:','http:'].includes(new URL(u).protocol)}catch{return false}};
const VENTURE=/pre[- ]?seed|\bseed\b|series\s+[a-h](?:\b|\+)|venture|growth|angel|funding round|financing round|equity (?:funding|financing)|\b(?:first|second|third) (?:equity|investment) round/i;
const PUBLIC=/public|placement|share issue|share subscription|bookbuild|rights issue|warrant/i;
const NON_PRIMARY=/acquisition|buyout|secondary|share purchase|stake purchase|non[- ]?cash|debt (?:waiver|conversion)|debt[- ]to[- ]equity|in[- ]kind/i;
export const domainGroup=c=>c.domains?.includes('uav')&&c.domains?.includes('counter-uas')?'both':c.domains?.includes('counter-uas')?'counter-uas':'uav';
export const DOMAIN_LABEL={uav:'UAV only','counter-uas':'Counter-UAS only',both:'Both domains'};
export function stageGroup(stage=''){
 if(/pre[- ]?seed/i.test(stage))return 'Pre-seed';if(/pre[- ]series\s*a/i.test(stage))return 'Pre-Series A';if(/\bseed\b|angel/i.test(stage))return 'Seed / angel';
 if(PUBLIC.test(stage))return 'Public equity';const series=stage.match(/series\s+([a-z])\b/i);if(series)return 'Series '+series[1].toUpperCase();if(/growth/i.test(stage))return 'Growth';return 'Other / unspecified';
}
export function investmentRows(data){
 const rows=[],seen=new Set();for(const company of data.companies||[])for(const round of company.fundingRounds||[]){if(!round.id||seen.has(round.id))continue;seen.add(round.id);rows.push({company,round,domain:domainGroup(company)});}return rows;
}
const sum=rows=>rows.reduce((n,x)=>n+x.round.amount.amount,0);
const rank=(rows,key='amount')=>rows.sort((a,b)=>b[key]-a[key]||a.name.localeCompare(b.name));
function group(rows,key,name){const groups=new Map();for(const row of rows){const id=key(row),g=groups.get(id)||{id,name:name(row),amount:0,n:0,approximate:false,companyIds:new Set(),rows:[]};g.amount+=row.round.amount.amount;g.n++;g.approximate||=row.round.amountQualifier==='approximate';g.companyIds.add(row.company.id);g.rows.push(row);groups.set(id,g)}return rank([...groups.values()].map(g=>({...g,companies:g.companyIds.size})));}
export function buildInvestmentInsights(data,selection={},today=new Date().toISOString().slice(0,10)){
 const all=investmentRows(data),s={...INVESTMENT_DEFAULTS,...selection},year=Number(today.slice(0,4));
 const allowedPeriods=['all','5y',String(year),String(year-1),String(year-2)];if(!allowedPeriods.includes(s.period))s.period='all';
 s.scope=s.scope==='primary'?'primary':'venture';s.status=s.status==='closed'?'closed':'reported';
 const exclusions={nonEquity:0,disclosures:0,extensions:0,nonPrimary:0,notVenture:0,status:0,amount:0,qualifier:0,noSource:0,future:0};
 const eligible=[];
 for(const row of all){const r=row.round;
  if(r.type!=='equity'){exclusions.nonEquity++;continue}
  if(r.kind==='extension'||r.parentRoundId){exclusions.extensions++;continue}
  if((r.kind||'round')!=='round'){exclusions.disclosures++;continue}
  if(NON_PRIMARY.test(r.stage||'')){exclusions.nonPrimary++;continue}
  if(s.scope==='venture'&&(!VENTURE.test(r.stage||'')||PUBLIC.test(r.stage||''))){exclusions.notVenture++;continue}
  if(!['closed_amount','announced_round_size'].includes(r.amountBasis)||!(s.status==='closed'?['closed','final_close']:['announced','signed','closed','final_close']).includes(r.closingStatus)){exclusions.status++;continue}
  if(!(r.sources||[]).some(source=>WEB(source.url))){exclusions.noSource++;continue}
  if(typeof r.amount?.amount!=='number'||!Number.isFinite(r.amount.amount)||r.amount.amount<=0||!r.amount.currency){exclusions.amount++;continue}
  if(!['exact','approximate'].includes(r.amountQualifier||'exact')){exclusions.qualifier++;continue}
  if(r.date&&/^\d{4}(?:-\d{2})?(?:-\d{2})?$/.test(r.date)&&r.date>today.slice(0,r.date.length)){exclusions.future++;continue}
  eligible.push(row);
 }
 const currencies=[...new Set(eligible.map(x=>x.round.amount.currency))].sort((a,b)=>({EUR:0,USD:1}[a]??2)-({EUR:0,USD:1}[b]??2)||a.localeCompare(b));
 if(!currencies.includes(s.currency))s.currency=currencies.includes('EUR')?'EUR':currencies[0]||'EUR';
 if(s.country&&!data.countries.some(c=>c.code===s.country))s.country='';if(!Object.hasOwn(DOMAIN_LABEL,s.domain))s.domain='';
 const periodMatch=r=>{if(s.period==='all')return true;const y=/^\d{4}/.test(r.date||'')?Number(r.date.slice(0,4)):null;return y!==null&&(s.period==='5y'?y>=year-4&&y<=year:y===Number(s.period))};
 const acrossCurrencies=eligible.filter(x=>(!s.country||x.company.country===s.country)&&(!s.domain||x.domain===s.domain)&&periodMatch(x.round));
 const rows=acrossCurrencies.filter(x=>x.round.amount.currency===s.currency);
 const currencyCounts=currencies.map(currency=>({currency,n:acrossCurrencies.filter(x=>x.round.amount.currency===currency).length}));
 const latest=acrossCurrencies.filter(x=>/^\d{4}(?:-\d{2})?(?:-\d{2})?$/.test(x.round.date||'')).sort((a,b)=>b.round.date.localeCompare(a.round.date)||a.company.name.localeCompare(b.company.name)).slice(0,3);
 const name=code=>data.countries.find(c=>c.code===code)?.name||code;
 const countries=group(rows,x=>x.company.country,x=>name(x.company.country));
 const domains=['uav','counter-uas','both'].map(id=>{const rs=rows.filter(x=>x.domain===id);return {id,name:DOMAIN_LABEL[id],amount:sum(rs),n:rs.length,approximate:rs.some(x=>x.round.amountQualifier==='approximate')}});
 const companies=group(rows,x=>x.company.id,x=>x.company.name).map(g=>({...g,company:g.rows[0].company}));
 const stages=group(rows,x=>stageGroup(x.round.stage),x=>stageGroup(x.round.stage));
 const dated=rows.filter(x=>/^\d{4}(?:-\d{2})?(?:-\d{2})?$/.test(x.round.date||''));const years=dated.map(x=>Number(x.round.date.slice(0,4))),timeline=[];
 const first=years.length?Math.min(...years):year,last=years.length?Math.max(...years):year;
 for(let y=first;y<=last;y++){const rs=dated.filter(x=>Number(x.round.date.slice(0,4))===y);timeline.push({year:y,name:String(y),amount:sum(rs),n:rs.length,approximate:rs.some(x=>x.round.amountQualifier==='approximate')})}
 const investors=new Map();for(const row of rows){const seen=new Set();for(const i of row.round.investors||[]){if(!i.slug||seen.has(i.slug)||!isNamedInvestor(i)||['lender','grantor','arranger','adviser','underwriter'].includes(i.role))continue;seen.add(i.slug);const g=investors.get(i.slug)||{id:i.slug,name:i.name,n:0,companyIds:new Set(),lead:0};g.n++;g.companyIds.add(row.company.id);if(['lead','co_lead'].includes(i.role))g.lead++;investors.set(i.slug,g)}}
 return {selection:s,year,allRecords:all.length,eligibleRecords:eligible.length,exclusions,currencies,currencyCounts,latest,rows,total:sum(rows),approximate:rows.some(x=>x.round.amountQualifier==='approximate'),companyCount:new Set(rows.map(x=>x.company.id)).size,countries,domains,companies,stages,timeline,undated:rows.length-dated.length,investors:rank([...investors.values()].map(i=>({...i,companies:i.companyIds.size})),'n'),announced:rows.filter(x=>!['closed','final_close'].includes(x.round.closingStatus)).length,periods:allowedPeriods};
}
