import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, cp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// Research & academia (adopted 2026-10-30) is a counting and presentation rule, not a
// schema change: universities and research institutes come back from the same companies
// fetch and are split here. The guarantee worth protecting is that they leave the company
// count and the supplier registry WITHOUT losing their pages, products or landscape place.
const company = (id, company_type) => ({
  id, name: id, slug: id, publication_status: 'live', hq_country: 'Germany', company_type,
  source_urls: [], description: '', website: 'https://example.com',
});
const product = (id, company_id) => ({
  id, name: `Prod ${company_id}`, category: 'Counter-UAS', company_id, publication_status: 'live',
  country: 'Germany', summary: `made by ${company_id}`, source_urls: [], specs: {},
});

test('universities and research institutes leave the company count but keep their pages', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xsonomy-research-'));
  const companies = [
    company('maker', 'sme'), company('integrator', 'prime'), company('untyped', null),
    company('tech-uni', 'university'), company('applied-institute', 'research_institute'),
  ];
  const products = companies.map((c, i) => product(`p${i}`, c.id));
  const tables = {
    companies, products,
    countries: [{ code: 'DE', name: 'Germany', is_landscape_scope: true }],
    sectors: [{ id: 'u', slug: 'uav', name: 'UAV', parent_id: null },
              { id: 'v', slug: 'uav-vtol', name: 'VTOL', parent_id: 'u' },
              { id: 'c', slug: 'counter-uas', name: 'Counter-UAS', parent_id: null },
              { id: 'i', slug: 'cuas-integrated', name: 'Integrated systems', parent_id: 'c' }],
    company_sectors: companies.map((c) => ({ company_id: c.id, sector_id: 'i', source_urls: [] })),
    landscape_candidates: companies.map((c) => ({ company_id: c.id, status: 'included' })),
    product_taxonomy_view: [], article_products: [], articles: [], slug_redirects: [],
    v_landscape_investors: [], v_investor_country_reviews: [],
  };
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const table = url.pathname.split('/').pop();
    if (!(table in tables)) { res.writeHead(404); res.end('Unknown table'); return; }
    let rows = tables[table];
    for (const [key, value] of url.searchParams)
      if (value.startsWith('eq.') && key !== 'landscape_slug') rows = rows.filter((r) => String(r[key]) === value.slice(3));
    const offset = Number(url.searchParams.get('offset') || 0);
    rows = rows.slice(offset, offset + Number(url.searchParams.get('limit') || 1000));
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(rows));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await cp(new URL('../../src', import.meta.url), join(root, 'src'), { recursive: true });
    await mkdir(join(root, 'scripts/lib'), { recursive: true });
    await cp(new URL('../generate-supabase.mjs', import.meta.url), join(root, 'scripts/generate-supabase.mjs'));
    await cp(new URL('../lib/landscape.mjs', import.meta.url), join(root, 'scripts/lib/landscape.mjs'));
    await promisify(execFile)(process.execPath, ['scripts/generate-supabase.mjs'], {
      cwd: root, timeout: 30000,
      env: { ...process.env, SUPABASE_URL: `http://127.0.0.1:${server.address().port}`, SUPABASE_SERVICE_KEY: 'test-only-secret' },
    });
    const read = (p) => readFile(join(root, 'public', p), 'utf8');
    const json = async (p) => JSON.parse(await read(p));

    // the two datasets partition the companies: untyped rows stay suppliers
    const ids = (rows) => rows.map((c) => c.slug).sort();
    assert.deepEqual(ids(await json('data/companies.json')), ['integrator', 'maker', 'untyped']);
    assert.deepEqual(ids(await json('data/research.json')), ['applied-institute', 'tech-uni']);

    // the headline count and the static supplier list exclude them
    const companiesPage = await read('companies/index.html');
    assert.match(companiesPage, /Directory of 3 UAV and counter-UAS companies/);
    assert.match(companiesPage, /Showing 1–3 of 3/);
    for (const slug of ['tech-uni', 'applied-institute'])
      assert.ok(!companiesPage.includes(`/companies/${slug}/`), `${slug} should not be listed as a supplier`);
    assert.match(await read('index.html'), /href="\/companies\/">Companies<\/a><span class="m">3 companies<\/span>/);

    // …but /research/ lists them, and nothing is lost: pages, products, landscape
    const researchPage = await read('research/index.html');
    for (const slug of ['tech-uni', 'applied-institute']) {
      assert.match(researchPage, new RegExp(`/companies/${slug}/`), `${slug} should be listed under /research/`);
      const detail = await read(`companies/${slug}/index.html`);
      assert.match(detail, new RegExp(`Prod ${slug}`), `${slug} should keep its product on its own page`);
    }
    assert.match(await read('sitemap.xml'), /https:\/\/xsonomy\.com\/research\//);
    const landscape = await json('data/landscape.json');
    assert.deepEqual(landscape.companies.map((c) => c.id).sort(),
      ['applied-institute', 'integrator', 'maker', 'tech-uni', 'untyped']);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
