// RAN-139: /berhenti exit survey page and /api/berhenti validation with a KV shim.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname);
const read = file => fs.readFile(path.join(root, file), 'utf8');
const exists = file => fs.access(path.join(root, file)).then(() => true, () => false);

// Page: Indonesian only, noindex, no analytics or consent, not in the sitemap or locale build.
const html = await read('berhenti.html');
assert.match(html, /<html lang="id">/);
assert.match(html, /<meta name="robots" content="noindex">/);
assert.doesNotMatch(html, /analytics-(?:config|consent)|gtag|googletagmanager|google-analytics|G-2KDN1C2G3L/i, 'no analytics or consent script');
assert.doesNotMatch(html, /hreflang/i, 'no hreflang pair');
assert.match(html, /<script src="\/berhenti\.js" defer><\/script>/);
assert.match(html, /maxlength="280"/);
const keys = [...html.matchAll(/name="reason" value="([a-z_]+)"/g)].map(match => match[1]);
assert.deepEqual(keys, ['confused_start', 'setup_tedious', 'missing_feature', 'other_app', 'forgot', 'not_needed', 'other']);
assert.match(html, /Lainnya \(tulis sendiri ya\)/);
assert.doesNotMatch(await read('sitemap.xml'), /berhenti/);
assert.doesNotMatch(await read('build-locales.py'), /berhenti/, 'not built into /id/ or /en/');
assert.equal(await exists('en/berhenti.html'), false);
assert.equal(await exists('id/berhenti.html'), false);
const assetsIgnore = await read('.assetsignore');
assert.doesNotMatch(assetsIgnore, /^\/?berhenti\.(?:html|css|js)$/m, 'page files are deployed');
assert.match(await read('wrangler.toml'), /^binding = "BERHENTI"$/m);

for (const workerFile of ['worker.js', 'worker.staging.mjs']) {
  const source = await read(workerFile);
  const worker = (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).default;
  const store = new Map();
  const env = {
    ASSETS: {fetch: async () => new Response('asset', {headers: {'Content-Type': 'text/html'}})},
    BERHENTI: {put: async (key, value) => { store.set(key, value); }},
  };
  const host = workerFile === 'worker.js' ? 'https://rancana.id' : 'https://staging.rancana.id';
  const post = (body, {origin = host, type = 'application/json', target = env} = {}) => worker.fetch(new Request(host + '/api/berhenti', {
    method: 'POST',
    headers: {...(origin ? {Origin: origin} : {}), 'Content-Type': type},
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }), target);
  const status = async (...args) => (await post(...args)).status;

  assert.equal((await worker.fetch(new Request(host + '/api/berhenti'), env)).status, 405, `${workerFile} GET is 405`);
  assert.equal((await worker.fetch(new Request(host + '/api/berhenti', {method: 'PUT', body: '{}'}), env)).status, 405);
  assert.equal(await status({option: 'nope'}), 400, 'bad option');
  assert.equal(await status({option: 'other', other: 'x'.repeat(281)}), 400, 'too-long other');
  assert.equal(await status({}), 400, 'missing option');
  assert.equal(await status({option: 'forgot', extra: 1}), 400, 'unknown field');
  assert.equal(await status({option: 'forgot', other: 'text only with Lainnya'}), 400, 'other text needs Lainnya');
  assert.equal(await status({option: 'other', other: 5}), 400, 'other must be text');
  assert.equal(await status('[]'), 400);
  assert.equal(await status('{bad json'), 400);
  assert.equal(await status(JSON.stringify({option: 'other', other: 'a'}) + ' '.repeat(2100)), 413, 'body cap');
  assert.equal(await status({option: 'forgot'}, {origin: 'https://evil.example'}), 403, 'cross-origin');
  assert.equal(await status({option: 'forgot'}, {origin: null}), 403, 'missing origin');
  assert.equal(await status({option: 'forgot'}, {type: 'text/plain'}), 415);
  assert.equal(store.size, 0, 'rejected requests store nothing');

  const good = await post({option: 'forgot'});
  assert.equal(good.status, 200);
  assert.deepEqual(await good.json(), {ok: true});
  assert.equal(await status({option: 'other', other: `  ${'y'.repeat(280)}  `}), 200, '280 chars after trim');
  assert.equal(await status({option: 'other', other: null}), 200, 'Lainnya text is optional');
  assert.equal(store.size, 3);
  const entries = [...store].map(([key, value]) => [key, JSON.parse(value)]);
  for (const [key, value] of entries) {
    assert.match(key, /^berhenti:\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z:[0-9a-f]{12}$/);
    assert.deepEqual(Object.keys(value), ['option', 'other', 'ts'], 'only option, other and timestamp are stored');
    assert.equal(key.split(':').slice(1, -1).join(':'), value.ts);
  }
  assert.deepEqual(entries.map(([, value]) => [value.option, value.other]), [['forgot', null], ['other', 'y'.repeat(280)], ['other', null]]);
  assert.equal(await status({option: 'forgot'}, {target: {ASSETS: env.ASSETS}}), 503, 'missing binding fails closed');

  const moved = await worker.fetch(new Request(host + '/id/berhenti?x=1'), env);
  assert.equal(moved.status, 301);
  assert.equal(moved.headers.get('Location'), host + '/berhenti?x=1');
}

// Client: shuffled each load with Lainnya last; sends only {option, other}.
const client = await read('berhenti.js');
assert.match(client, /Math\.random/);
assert.match(client, /option:not\(\[data-key=other\]\)/);
assert.match(client, /return \{option, other: other \|\| null\};/);
assert.match(client, /fetch\('\/api\/berhenti'/);
console.log('PASS /berhenti page (noindex, no analytics, not in sitemap, ID only) and /api/berhenti validation in both Workers');
