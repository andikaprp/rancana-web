import fs from 'node:fs';
import assert from 'node:assert/strict';

const {default: worker} = await import('data:text/javascript,' + encodeURIComponent(fs.readFileSync(new URL('./worker.js', import.meta.url), 'utf8')));
const base = 'https://rancana.id/go/play';
const play = 'https://play.google.com/store/apps/details?id=com.planora.labs';
const defaultLocation = play + '&referrer=utm_source%3Drancana.id%26utm_medium%3Dweb%26utm_campaign%3Dplay_cta';
const instagramLocation = play + '&referrer=utm_source%3Dig%26utm_medium%3Dweb%26utm_campaign%3Dx';
const contentLocation = instagramLocation + '%26utm_content%3Dhero';
let assertions = 0;

const checkRedirect = async (query, expected) => {
  const response = await worker.fetch(new Request(base + query), {});
  assert.equal(response.status, 302); assertions++;
  assert.equal(response.headers.get('location'), expected); assertions++;
  assert.equal(response.headers.get('cache-control'), 'no-store'); assertions++;
};

await checkRedirect('', defaultLocation);
await checkRedirect('?utm_source=ig&utm_campaign=x', instagramLocation);
await checkRedirect('?' + new URLSearchParams({utm_source: '<script>'}), defaultLocation);
await checkRedirect('?' + new URLSearchParams({utm_campaign: 'a'.repeat(65)}), defaultLocation);
await checkRedirect('?' + new URLSearchParams({utm_medium: 'paid social'}), defaultLocation);
await checkRedirect('?utm_source=IG&utm_campaign=X', instagramLocation);
await checkRedirect('?utm_source=ig&utm_campaign=x&utm_content=hero', contentLocation);

const foreign = await worker.fetch(new Request(base + '?' + new URLSearchParams({
  url: 'https://evil.test', referrer: 'private', gclid: 'secret', id: 'com.evil.app',
})), {});
assert.equal(foreign.status, 302); assertions++;
assert.equal(foreign.headers.get('location'), defaultLocation); assertions++;
assert.equal(foreign.headers.get('cache-control'), 'no-store'); assertions++;
for (const value of ['evil.test', 'private', 'secret', 'com.evil.app']) {
  assert.equal(foreign.headers.get('location').includes(value), false); assertions++;
}

let called = false;
const assets = {fetch() { called = true; return new Response('ok'); }};
const assetResponse = await worker.fetch(new Request('https://rancana.id/en/'), {ASSETS: assets});
assert.equal(await assetResponse.text(), 'ok'); assertions++;
assert.equal(called, true); assertions++;
called = false;
const features = await worker.fetch(new Request('https://rancana.id/go/features'), {ASSETS: assets});
assert.equal(features.status, 204); assertions++;
assert.equal(called, false); assertions++;

console.log('PASS — ' + assertions + ' server-side Play redirect and asset passthrough assertions');
