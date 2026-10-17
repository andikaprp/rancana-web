import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const importWorker = async file => {
  const source = await readFile(new URL(file, import.meta.url), 'utf8');
  return (await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)).default;
};
const worker = await importWorker('worker.staging.mjs');
const assetBody = '<!doctype html><html lang="en"><body>Rancana</body></html>';
const env = {ASSETS: {fetch: async () => new Response(assetBody, {headers: {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=3600',
}})}};
const noindex = 'noindex, nofollow, noarchive';

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

const previewRedirect = await worker.fetch(new Request('https://staging.rancana.id/go/play?utm_source=School&utm_medium=Email&utm_campaign=Fall2026&utm_content=Article'), env);
assert.equal(previewRedirect.status, 302);
assert.equal(previewRedirect.headers.get('x-robots-tag'), noindex);
assert.equal(previewRedirect.headers.get('cache-control'), 'no-store');
const destination = new URL(previewRedirect.headers.get('location'));
assert.equal(destination.hostname, 'play.google.com');
assert.deepEqual(Object.fromEntries(new URLSearchParams(destination.searchParams.get('referrer'))), {
  utm_source: 'school', utm_medium: 'email', utm_campaign: 'fall2026', utm_content: 'article',
});
const incompleteRedirect = await worker.fetch(new Request('https://staging.rancana.id/go/play?utm_source=school&utm_medium=email'), env);
assert.deepEqual(Object.fromEntries(new URLSearchParams(new URL(incompleteRedirect.headers.get('location')).searchParams.get('referrer'))), {
  utm_source: 'rancana.id', utm_medium: 'web', utm_campaign: 'play_cta',
});
const previewFeatures = await worker.fetch(new Request('https://staging.rancana.id/go/features'), env);
assert.equal(previewFeatures.status, 204);
assert.equal(previewFeatures.headers.get('x-robots-tag'), noindex);
const productionRedirect = await worker.fetch(new Request('https://rancana.id/go/play'), env);
assert.equal(productionRedirect.status, 302);
assert.equal(productionRedirect.headers.get('x-robots-tag'), null);

const analyticsSource = await readFile(new URL('analytics-consent.js', import.meta.url), 'utf8');
for (const hostname of ['rancana-preview.workers.dev', 'rancana-preview.pages.dev', 'staging.rancana.id']) {
  let networkRequests = 0;
  let scriptElements = 0;
  const window = {RancanaAnalyticsConfig: {measurementId: 'G-TEST123'}, fetch: () => networkRequests++};
  const granted = JSON.stringify({version: 1, choice: 'granted', at: Date.now()});
  const storage = {getItem: () => granted, setItem() {}, removeItem() {}};
  const document = {querySelectorAll: () => [], addEventListener() {}, createElement: () => {scriptElements++; return {};}};
  const fetch = () => networkRequests++;
  const localStorage = storage;
  const sessionStorage = {getItem: () => null, setItem() {}, removeItem() {}};
  const location = {hostname, search: '', href: `https://${hostname}/`, origin: `https://${hostname}`};
  const windowObject = window;
  runInNewContext(analyticsSource, {window: windowObject, URL, URLSearchParams, location, localStorage, sessionStorage, document, fetch});
  assert.equal(window['ga-disable-G-TEST123'], true, hostname);
  assert.equal(window.__rancanaAnalyticsInitialized, true, hostname);
  assert.equal(networkRequests, 0, hostname);
  assert.equal(scriptElements, 0, hostname);
}

console.log('PASS — staging Worker keeps Play referrer behavior, adds noindex on preview hosts, and leaves production responses unchanged');
