import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, cp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// Two live products may share a name exactly. Before this was keyed on the product id,
// the page-URL lookup was keyed on the name, so the last product written won for every
// owner: Bionic System Solutions' Komodo pointed at DOK-ING's ground robot, and HADES'
// HAWK pointed at an unrelated HAWK. Both shapes are covered here — a collision across
// two buckets, and one inside a single bucket where slugify appends "-2".
const company = (id) => ({
  id, name: id, slug: id, publication_status: 'live', hq_country: 'Germany',
  source_urls: [], description: '', website: 'https://example.com',
});
const product = (id, name, category, company_id) => ({
  id, name, category, company_id, publication_status: 'live',
  country: 'Germany', summary: `${name} by ${company_id}`, source_urls: [], specs: {},
});

test('a company page links to its own product when two live products share a name', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xsonomy-prodlinks-'));
  const companies = ['alpha', 'beta', 'gamma', 'delta'].map(company);
  const products = [
    // across buckets: Counter-UAS lands in `cuas`, Other in `other`
    product('p1', 'Komodo', 'Counter-UAS', 'alpha'),
    product('p2', 'Komodo', 'Other', 'beta'),
    // inside one bucket: the second gets the de-duplicated slug
    product('p3', 'HAWK', 'Counter-UAS', 'gamma'),
    product('p4', 'HAWK', 'Counter-UAS', 'delta'),
  ];
  const tables = {
    companies, products,
    countries: [{ code: 'DE', name: 'Germany', is_landscape_scope: true }],
    sectors: [{ id: 'u', slug: 'uav', name: 'UAV', parent_id: null },
              { id: 'v', slug: 'uav-vtol', name: 'VTOL', parent_id: 'u' },
              { id: 'c', slug: 'counter-uas', name: 'Counter-UAS', parent_id: null },
              { id: 'i', slug: 'cuas-integrated', name: 'Integrated systems', parent_id: 'c' }],
    company_sectors: companies.map((c) => ({ company_id: c.id, sector_id: 'v', source_urls: [] })),
    landscape_candidates: companies.map((c) => ({ company_id: c.id, status: 'included' })),
    product_taxonomy_view: [], article_products: [], articles: [], slug_redirects: [],
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

    const linkOn = async (slug) => {
      const html = await readFile(join(root, 'public/companies', slug, 'index.html'), 'utf8');
      const section = html.slice(html.indexOf('Products in the catalogue'));
      return (section.match(/<a href="(\/(?:uav|cuas|sensors|software|other)\/[^"]+)"/) || [])[1] || null;
    };
    const [alpha, beta, gamma, delta] = await Promise.all(['alpha', 'beta', 'gamma', 'delta'].map(linkOn));

    // each owner points at a page that exists, and no two owners share one
    for (const [owner, link] of [['alpha', alpha], ['beta', beta], ['gamma', gamma], ['delta', delta]]) {
      assert.ok(link, `${owner}'s company page should link its product`);
      await readFile(join(root, 'public', link, 'index.html'), 'utf8');
    }
    assert.notEqual(alpha, beta, 'same-named products in different buckets must not share a link');
    assert.notEqual(gamma, delta, 'same-named products in one bucket must not share a link');
    assert.equal(alpha, '/cuas/komodo/');
    assert.equal(beta, '/other/komodo/');

    // the link must lead to that owner's own product, not merely to a distinct page
    for (const [owner, link] of [['alpha', alpha], ['beta', beta], ['gamma', gamma], ['delta', delta]]) {
      const page = await readFile(join(root, 'public', link, 'index.html'), 'utf8');
      assert.match(page, new RegExp(`by ${owner}`), `${link} should be ${owner}'s product page`);
    }

    // the landscape JSON is built from the same lookup and must agree
    const landscape = JSON.parse(await readFile(join(root, 'public/data/landscape.json'), 'utf8'));
    const urlFor = (id) => (landscape.companies.find((c) => c.id === id)?.products || [])[0]?.url;
    assert.equal(urlFor('alpha'), alpha);
    assert.equal(urlFor('beta'), beta);
    assert.notEqual(urlFor('gamma'), urlFor('delta'));
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
