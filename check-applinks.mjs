// RAN-161: assetlinks.json and the /app/jadwal app handoff in both Workers.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const importWorker = async file => {
  const source = await readFile(new URL(file, import.meta.url), 'utf8');
  return (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).default;
};
const FINGERPRINT = '54:60:20:A1:73:65:94:A8:B7:47:64:9B:F7:F5:A1:6D:D0:B0:60:2A:2E:1E:4D:33:CF:F3:FB:FA:19:DF:F4:93';
const EXPECTED_LINKS = '[{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"com.planora.labs","sha256_cert_fingerprints":["' + FINGERPRINT + '"]}}]';
const PLAY = 'https://play.google.com/store/apps/details?id=com.planora.labs&referrer=utm_source%3Demail%26utm_medium%3Demail%26utm_campaign%3Dwelcome_v2';
const INTENT = 'intent:#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.planora.labs;S.browser_fallback_url=' + encodeURIComponent(PLAY) + ';end';
const UA = {
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
};
let assertions = 0;

for (const file of ['worker.js', 'worker.staging.mjs']) {
  const worker = await importWorker(file);
  const seen = [];
  const env = {ASSETS: {fetch: async request => { seen.push(new URL(request.url).pathname); return new Response('asset', {status: 404}); }}};
  const host = file === 'worker.js' ? 'https://rancana.id' : 'https://staging.rancana.id';

  const links = await worker.fetch(new Request(host + '/.well-known/assetlinks.json'), env);
  assert.equal(links.status, 200, file); assertions++;
  assert.equal(links.headers.get('location'), null, file); assertions++;
  assert.equal(links.headers.get('content-type'), 'application/json', file); assertions++;
  const body = await links.text();
  assert.equal(body, EXPECTED_LINKS, file); assertions++;
  const parsed = JSON.parse(body);
  assert.equal(parsed[0].target.package_name, 'com.planora.labs'); assertions++;
  assert.deepEqual(parsed[0].target.sha256_cert_fingerprints, [FINGERPRINT]); assertions++;
  // Android verifiers do not follow redirects; never redirect it, even on http/www.
  for (const origin of ['http://rancana.id', 'https://www.rancana.id']) {
    const response = await worker.fetch(new Request(origin + '/.well-known/assetlinks.json'), env);
    assert.equal(response.status, 200, `${file} ${origin}`); assertions++;
  }

  for (const path of ['/app/jadwal', '/app/jadwal/']) {
    for (const [name, expected] of [['android', INTENT], ['desktop', PLAY], ['ios', PLAY], [null, PLAY]]) {
      const headers = name ? {'User-Agent': UA[name]} : {};
      const response = await worker.fetch(new Request(host + path, {headers}), env);
      assert.equal(response.status, 302, `${file} ${path} ${name}`); assertions++;
      assert.equal(response.headers.get('location'), expected, `${file} ${path} ${name}`); assertions++;
      assert.equal(response.headers.get('cache-control'), 'no-store'); assertions++;
      assert.match(response.headers.get('x-robots-tag'), /noindex/); assertions++;
    }
  }
  // Campaign query parameters cannot override the welcome email attribution.
  const spoof = await worker.fetch(new Request(host + '/app/jadwal?utm_source=x&utm_medium=y&utm_campaign=z', {headers: {'User-Agent': UA.desktop}}), env);
  assert.equal(spoof.headers.get('location'), PLAY); assertions++;
  assert.deepEqual(seen, [], `${file} answers without reading assets`); assertions++;
  // Look-alike paths are not handled.
  await worker.fetch(new Request(host + '/app/jadwalx'), env);
  assert.deepEqual(seen, ['/app/jadwalx']); assertions++;
}

// Kept out of the sitemap.
const sitemap = await readFile(new URL('sitemap.xml', import.meta.url), 'utf8');
assert.equal(sitemap.includes('/app/'), false); assertions++;
assert.equal(sitemap.includes('assetlinks'), false); assertions++;

console.log(`PASS — ${assertions} assetlinks.json and /app/jadwal handoff assertions across worker.js and worker.staging.mjs`);
