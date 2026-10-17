// Preview behavior must stay isolated from production and must not activate analytics.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const workerSource = await readFile(new URL('worker.js', import.meta.url), 'utf8');
const {default: worker} = await import(`data:text/javascript;base64,${Buffer.from(workerSource).toString('base64')}`);
const assetBody = '<!doctype html><html><head></head><body>Rancana</body></html>';
const env = {ASSETS: {fetch: async () => new Response(assetBody, {headers: {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=3600',
}})}};
const noindex = 'noindex, nofollow, noarchive';

for (const [page, expected] of [
  ['id/college-schedule.html', 'Contoh jadwal belajar mahasiswa selama satu minggu'],
  ['en/college-schedule.html', 'A sample study week for a university student'],
]) {
  const html = await readFile(new URL(page, import.meta.url), 'utf8');
  assert.ok(html.includes('study-week-example'), page);
  assert.ok(html.includes(expected), page);
}

for (const hostname of ['rancana-preview.workers.dev', 'rancana-preview.pages.dev', 'staging.rancana.id']) {
  const response = await worker.fetch(new Request(`https://${hostname}/en/`), env);
  assert.equal(response.status, 200, hostname);
  assert.equal(await response.text(), assetBody, hostname);
  assert.equal(response.headers.get('x-robots-tag'), noindex, hostname);
}

const production = await worker.fetch(new Request('https://rancana.id/en/'), env);
assert.equal(production.status, 200);
assert.equal(await production.text(), assetBody);
assert.equal(production.headers.get('x-robots-tag'), null);
assert.equal(production.headers.get('content-type'), 'text/html; charset=utf-8');
assert.equal(production.headers.get('cache-control'), 'public, max-age=3600');

const previewRedirect = await worker.fetch(new Request('https://rancana-preview.workers.dev/go/play'), env);
assert.equal(previewRedirect.status, 302);
assert.equal(previewRedirect.headers.get('x-robots-tag'), noindex);
assert.equal(new URL(previewRedirect.headers.get('location')).hostname, 'play.google.com');
const productionRedirect = await worker.fetch(new Request('https://rancana.id/go/play'), env);
assert.equal(productionRedirect.status, 302);
assert.equal(productionRedirect.headers.get('x-robots-tag'), null);

const analyticsSource = await readFile(new URL('analytics-consent.js', import.meta.url), 'utf8');
for (const hostname of ['rancana-preview.workers.dev', 'rancana-preview.pages.dev', 'staging.rancana.id']) {
  let networkRequests = 0;
  let scriptElements = 0;
  const window = {RancanaAnalyticsConfig: {measurementId: 'G-TEST123'}, fetch: () => networkRequests++};
  const granted = JSON.stringify({version: 1, choice: 'granted', at: Date.now()});
  vm.runInNewContext(analyticsSource, {
    window,
    URL,
    URLSearchParams,
    location: {hostname, search: '', href: `https://${hostname}/`, origin: `https://${hostname}`},
    localStorage: {getItem: () => granted},
    sessionStorage: {getItem: () => null, setItem() {}, removeItem() {}},
    document: {
      querySelectorAll: () => [],
      addEventListener() {},
      createElement: () => {scriptElements++; return {};},
    },
    fetch: () => networkRequests++,
  });
  assert.equal(window['ga-disable-G-TEST123'], true, hostname);
  assert.equal(window.__rancanaAnalyticsInitialized, true, hostname);
  assert.equal(networkRequests, 0, hostname);
  assert.equal(scriptElements, 0, hostname);
}

console.log('PASS — preview responses carry noindex, production responses pass through, and granted consent sends no analytics requests on preview hosts');
