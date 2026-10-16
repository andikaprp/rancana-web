import fs from 'node:fs';
import assert from 'node:assert/strict';
const {default: worker} = await import('data:text/javascript,' + encodeURIComponent(fs.readFileSync(new URL('./worker.js', import.meta.url), 'utf8')));
for (const query of ['', '?url=https://evil.test', '?referrer=private&gclid=secret', '?utm_source=instagram&utm_medium=paid_social', '?id=com.evil.app']) {
  const response = await worker.fetch(new Request('https://rancana.id/go/play' + query), {});
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://play.google.com/store/apps/details?id=com.planora.labs');
}
let called = false;
await worker.fetch(new Request('https://rancana.id/en/'), {ASSETS: {fetch() { called = true; return new Response('ok'); }}});
assert.ok(called);
console.log('PASS — 11 fixed redirect and asset passthrough assertions');
