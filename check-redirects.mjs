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
  assert.deepEqual(seen, [], `${file} answers redirects without reading assets`); assertions++;

  // The target page itself and look-alike paths are served from assets, not redirected.
  for (const path of ['/id/tka-2026', '/tka-2026x', '/en/tka-2026']) {
    const response = await worker.fetch(new Request('https://rancana.id' + path), env);
    assert.equal(response.status, 200, `${file} ${path}`); assertions++;
  }
  // /go/play keeps its 302 and attribution.
  const play = await worker.fetch(new Request('https://rancana.id/go/play'), env);
  assert.equal(play.status, 302); assertions++;
  assert.match(play.headers.get('location'), /^https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.planora\.labs&referrer=/); assertions++;

  if (file === 'worker.staging.mjs') {
    const preview = await expectRedirect('https://staging.rancana.id/tka-2026', 'https://staging.rancana.id/id/tka-2026');
    assert.equal(preview.headers.get('x-robots-tag'), noindex, 'staging redirect stays noindex'); assertions++;
  }
}

console.log(`PASS — ${assertions} permanent redirect assertions across worker.js and worker.staging.mjs`);
