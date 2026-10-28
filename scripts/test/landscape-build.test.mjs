import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, cp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fixture } from './landscape-fixture.mjs';

test('whole static generator emits the gated landscape, analytics and sitemap from a read-only API',async()=>{
  const root=await mkdtemp(join(tmpdir(),'xsonomy-build-'));
  const f=fixture(); const requests=[];
  const tables={companies:f.companies,countries:f.countries,sectors:f.sectors,company_sectors:f.assignments,landscape_candidates:f.candidates,products:[],product_taxonomy_view:[],article_products:[],articles:[],slug_redirects:[]};
  const server=createServer((req,res)=>{
    requests.push({method:req.method,url:req.url});
    const url=new URL(req.url,'http://localhost'); const table=url.pathname.split('/').pop();
    if(!(table in tables)){res.writeHead(404);res.end('Unknown table');return;}
    let rows=tables[table];
    for(const [key,value] of url.searchParams) if(value.startsWith('eq.') && key!=='landscape_slug') rows=rows.filter(r=>String(r[key])===value.slice(3));
    rows=rows.slice(Number(url.searchParams.get('offset')||0),Number(url.searchParams.get('offset')||0)+Number(url.searchParams.get('limit')||1000));
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify(rows));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    await cp(new URL('../../src',import.meta.url),join(root,'src'),{recursive:true});
    await mkdir(join(root,'scripts/lib'),{recursive:true});
    await cp(new URL('../generate-supabase.mjs',import.meta.url),join(root,'scripts/generate-supabase.mjs'));
    await cp(new URL('../lib/landscape.mjs',import.meta.url),join(root,'scripts/lib/landscape.mjs'));
    const {stdout}=await promisify(execFile)(process.execPath,['scripts/generate-supabase.mjs'],{cwd:root,env:{...process.env,SUPABASE_URL:`http://127.0.0.1:${server.address().port}`,SUPABASE_SERVICE_KEY:'test-only-secret'},timeout:30000});
    assert.match(stdout,/Landscape: 3 included, published/);
    const output=JSON.parse(await readFile(join(root,'public/data/landscape.json'),'utf8'));
    assert.deepEqual(output.companies.map(c=>c.id),['both','cuas','uav']);
    assert.ok(!JSON.stringify(output).includes('test-only-secret'));
    const html=await readFile(join(root,'public/landscape/index.html'),'utf8');
    assert.ok(html.indexOf("gtag('consent', 'default'")<html.indexOf('googletagmanager.com'));
    assert.ok(!html.includes('<!--LANDSCAPE_ANALYTICS-->'));
    assert.match(await readFile(join(root,'public/sitemap.xml'),'utf8'),/https:\/\/xsonomy.com\/landscape\//);
    assert.ok(requests.every(r=>r.method==='GET'));
    for(const r of requests.filter(r=>r.url.startsWith('/rest/v1/companies?'))) assert.match(r.url,/publication_status=eq.live/);
  } finally { await new Promise(resolve=>server.close(resolve)); await rm(root,{recursive:true,force:true}); }
});
