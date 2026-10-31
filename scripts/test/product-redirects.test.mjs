import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, cp, mkdir, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// Product redirects used to be written under /uav/ whichever section the target was
// actually in, because the path was derived from `kind` alone. Every redirect in the
// table was a company one, so the bug stayed latent until the first product split
// (Spotter Global's AX250 / GAX500-3D, both sensors) needed one: the stub would have
// landed at /uav/<old>/ and pointed at /uav/<new>/, two paths that do not exist.
const company = (id) => ({
  id, name: id, slug: id, publication_status: 'live', hq_country: 'Germany',
  source_urls: [], description: '', website: 'https://example.com',
});
const product = (id, name, category, company_id) => ({
  id, name, category, company_id, publication_status: 'live',
  country: 'Germany', summary: `${name} by ${company_id}`, source_urls: [], specs: {},
});
const missing = async (path) => {
  await assert.rejects(() => access(path), `${path} should not have been written`);
};

test('a product redirect is written into its target section, and a dead one is skipped', async () => {
  const root = await mkdtemp(join(tmpdir(), 'xsonomy-redirects-'));
  const companies = ['alpha', 'beta'].map(company);
  const tables = {
    companies,
    products: [product('p1', 'Radar Two', 'Sensor', 'alpha'),
               product('p2', 'Drone One', 'UAV', 'beta')],
    countries: [{ code: 'DE', name: 'Germany', is_landscape_scope: true }],
    sectors: [{ id: 'u', slug: 'uav', name: 'UAV', parent_id: null },
              { id: 'v', slug: 'uav-vtol', name: 'VTOL', parent_id: 'u' },
              { id: 'c', slug: 'counter-uas', name: 'Counter-UAS', parent_id: null },
              { id: 'i', slug: 'cuas-integrated', name: 'Integrated systems', parent_id: 'c' }],
    company_sectors: companies.map((c) => ({ company_id: c.id, sector_id: 'v', source_urls: [] })),
    landscape_candidates: companies.map((c) => ({ company_id: c.id, status: 'included' })),
    slug_redirects: [
      // the split case: an indexed sensor URL retired in favour of one of its halves
      { from_slug: 'radar-one-radar-two', to_slug: 'radar-two', kind: 'product' },
      // a UAV product, to prove the section is resolved rather than assumed
      { from_slug: 'drone-zero', to_slug: 'drone-one', kind: 'product' },
      // nothing live answers to this slug any more
      { from_slug: 'ghost', to_slug: 'never-built', kind: 'product' },
      { from_slug: 'alpha-old', to_slug: 'alpha', kind: 'company' },
    ],
    product_taxonomy_view: [], article_products: [], articles: [],
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
    await cp(new URL('../lib/investor-profiles.mjs', import.meta.url), join(root, 'scripts/lib/investor-profiles.mjs'));
    await cp(new URL('../lib/investor-directory.json', import.meta.url), join(root, 'scripts/lib/investor-directory.json'));
    await promisify(execFile)(process.execPath, ['scripts/generate-supabase.mjs'], {
      cwd: root, timeout: 30000,
      env: { ...process.env, SUPABASE_URL: `http://127.0.0.1:${server.address().port}`, SUPABASE_SERVICE_KEY: 'test-only-secret' },
    });
    const out = (...p) => join(root, 'public', ...p);

    // the sensor stub sits beside its target and sends search engines to it
    const stub = await readFile(out('sensors/radar-one-radar-two/index.html'), 'utf8');
    assert.match(stub, /<link rel="canonical" href="https:\/\/xsonomy\.com\/sensors\/radar-two\/">/);
    assert.match(stub, /content="0; url=\/sensors\/radar-two\/"/);
    await readFile(out('sensors/radar-two/index.html'), 'utf8');
    await missing(out('uav/radar-one-radar-two/index.html'));

    // a UAV product still resolves to /uav/, and companies are untouched
    const uavStub = await readFile(out('uav/drone-zero/index.html'), 'utf8');
    assert.match(uavStub, /href="https:\/\/xsonomy\.com\/uav\/drone-one\/">/);
    const companyStub = await readFile(out('companies/alpha-old/index.html'), 'utf8');
    assert.match(companyStub, /href="https:\/\/xsonomy\.com\/companies\/alpha\/">/);

    // an unresolvable product redirect is reported and written nowhere, rather than
    // being guessed into a section as a stub that points at a page that is not there
    for (const section of ['uav', 'cuas', 'sensors', 'software', 'other'])
      await missing(out(section, 'ghost/index.html'));

    // stubs stay out of the sitemap — they are not content
    const sitemap = await readFile(out('sitemap.xml'), 'utf8');
    for (const slug of ['radar-one-radar-two', 'drone-zero', 'alpha-old', 'ghost'])
      assert.ok(!sitemap.includes(`/${slug}/`), `${slug} must not be in the sitemap`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(root, { recursive: true, force: true });
  }
});
