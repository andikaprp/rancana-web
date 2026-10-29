// Exercises the permanent redirects in both the production and staging Workers.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const importWorker = async file => {
  const source = await readFile(new URL(file, import.meta.url), 'utf8');
  return (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).default;
};
const assetBody = '<!doctype html><html lang="id"><body>Rancana</body></html>';
const noindex = 'noindex, nofollow, noarchive';
let assertions = 0;

for (const file of ['worker.js', 'worker.staging.mjs']) {
  const worker = await importWorker(file);
  const seen = [];
  const env = {ASSETS: {fetch: async request => {
    seen.push(new URL(request.url).pathname);
    return new Response(assetBody, {headers: {'Content-Type': 'text/html'}});
  }}};
  const expectRedirect = async (url, location, status = 301) => {
    const response = await worker.fetch(new Request(url), env);
    assert.equal(response.status, status, `${file} ${url}`); assertions++;
    assert.equal(response.headers.get('location'), location, `${file} ${url}`); assertions++;
    return response;
  };

  // TKA 2026 short path moves permanently to the Indonesian page; campaign parameters survive.
  await expectRedirect('https://rancana.id/tka-2026', 'https://rancana.id/id/tka-2026');
  await expectRedirect('https://rancana.id/tka-2026/', 'https://rancana.id/id/tka-2026');
  await expectRedirect('https://rancana.id/tka-2026?utm_source=instagram&utm_medium=social&utm_campaign=tka',
    'https://rancana.id/id/tka-2026?utm_source=instagram&utm_medium=social&utm_campaign=tka');
  await expectRedirect('https://rancana.id/jadwal-belajar-ujian', 'https://rancana.id/id/jadwal-belajar-ujian');
  await expectRedirect('https://rancana.id/jadwal-belajar-ujian/', 'https://rancana.id/id/jadwal-belajar-ujian');
  assert.deepEqual(seen, [], `${file} answers redirects without reading assets`); assertions++;

  // The target page itself and look-alike paths are served from assets, not redirected.
  for (const path of ['/id/tka-2026', '/tka-2026x', '/en/tka-2026', '/id/jadwal-belajar-ujian', '/jadwal-belajar']) {
    const response = await worker.fetch(new Request('https://rancana.id' + path), env);
    assert.equal(response.status, 200, `${file} ${path}`); assertions++;
  }
  // /go/play keeps its 302 and attribution.
  const play = await worker.fetch(new Request('https://rancana.id/go/play'), env);
  assert.equal(play.status, 302); assertions++;
  assert.match(play.headers.get('location'), /^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.planora\.labs&referrer=/); assertions++;

  seen.length = 0;
  // Root moves to the Indonesian home; /index.html too. Query strings survive.
  await expectRedirect('https://rancana.id/', 'https://rancana.id/id/');
  await expectRedirect('https://rancana.id/index.html', 'https://rancana.id/id/');
  await expectRedirect('https://rancana.id/?lang=en', 'https://rancana.id/id/?lang=en');
  // www and http move to https://rancana.id with the same path and query.
  await expectRedirect('https://www.rancana.id/', 'https://rancana.id/');
  await expectRedirect('https://www.rancana.id/id/help?x=1', 'https://rancana.id/id/help?x=1');
  await expectRedirect('https://WWW.rancana.id/en/', 'https://rancana.id/en/');
  await expectRedirect('http://rancana.id/', 'https://rancana.id/');
  await expectRedirect('http://rancana.id/id/', 'https://rancana.id/id/');
  await expectRedirect('http://www.rancana.id/tka-2026', 'https://rancana.id/tka-2026');
  assert.deepEqual(seen, [], `${file} answers redirects without reading assets`); assertions++;
  // Local development over http is not redirected.
  const local = await worker.fetch(new Request('http://localhost:8787/id/'), env);
  assert.equal(local.status, 200); assertions++;
  // /go/* is untouched by the new redirects: same 302 on www and http.
  for (const origin of ['https://www.rancana.id', 'http://rancana.id']) {
    const response = await worker.fetch(new Request(origin + '/go/play'), env);
    assert.equal(response.status, 302, `${file} ${origin}/go/play`); assertions++;
    const features = await worker.fetch(new Request(origin + '/go/features'), env);
    assert.equal(features.status, 204, `${file} ${origin}/go/features`); assertions++;
  }

  // HTML from assets gains an explicit UTF-8 charset; other types and existing charsets are unchanged.
  const typed = type => ({ASSETS: {fetch: async () => new Response('x', {status: 200, headers: {'Content-Type': type, 'Cache-Control': 'public, max-age=60'}})}});
  for (const [type, expected] of [['text/html', 'text/html; charset=utf-8'], ['text/html; charset=utf-8', 'text/html; charset=utf-8'],
    ['text/css', 'text/css'], ['image/webp', 'image/webp'], ['text/html; charset=ISO-8859-1', 'text/html; charset=ISO-8859-1']]) {
    const response = await worker.fetch(new Request('https://rancana.id/id/'), typed(type));
    assert.equal(response.headers.get('content-type'), expected, `${file} ${type}`); assertions++;
    assert.equal(response.headers.get('cache-control'), 'public, max-age=60'); assertions++;
    assert.equal(await response.text(), 'x'); assertions++;
  }
  const missing = await worker.fetch(new Request('https://rancana.id/nope'), {ASSETS: {fetch: async () => new Response('missing', {status: 404, headers: {'Content-Type': 'text/html'}})}});
  assert.equal(missing.status, 404); assertions++;
  assert.equal(missing.headers.get('content-type'), 'text/html; charset=utf-8'); assertions++;

  if (file === 'worker.staging.mjs') {
    const root = await expectRedirect('https://staging.rancana.id/', 'https://staging.rancana.id/id/');
    assert.equal(root.headers.get('x-robots-tag'), noindex); assertions++;
    const insecure = await expectRedirect('http://staging.rancana.id/id/', 'https://staging.rancana.id/id/');
    assert.equal(insecure.headers.get('x-robots-tag'), noindex); assertions++;
    const page = await worker.fetch(new Request('https://staging.rancana.id/id/'), env);
    assert.equal(page.headers.get('content-type'), 'text/html; charset=utf-8'); assertions++;
    assert.equal(page.headers.get('x-robots-tag'), noindex); assertions++;
    const preview = await expectRedirect('https://staging.rancana.id/tka-2026', 'https://staging.rancana.id/id/tka-2026');
    assert.equal(preview.headers.get('x-robots-tag'), noindex, 'staging redirect stays noindex'); assertions++;
  }
}

console.log(`PASS — ${assertions} permanent redirect assertions across worker.js and worker.staging.mjs`);
