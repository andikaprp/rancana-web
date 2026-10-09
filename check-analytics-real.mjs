// Real Google SDK, with every collection request intercepted before delivery.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const root = path.dirname(new URL(import.meta.url).pathname);
const id = 'G-2KDN1C2G3L';
const types = {'.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff': 'font/woff'};
const server = http.createServer(async (req, res) => {
  try {
    let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (name.endsWith('/')) name += 'index.html';
    if (!path.extname(name)) name += '.html';
    const file = path.resolve(root, '.' + name);
    if (!file.startsWith(root + '/')) throw Error('invalid path');
    const content = await fs.readFile(file);
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.end(content);
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, headless: true, args: ['--no-sandbox']});
const context = await browser.newContext({viewport: {width: 390, height: 844}});
const captures = [], blocked = [], scriptFailures = [], auxiliary = [];
let consentPhase = 'unknown';
let sdkRequests = 0, sdkResponses = 0, assertions = 0, outcome = 'failed';
const check = (actual, expected) => { assert.deepEqual(actual, expected); assertions++; };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async predicate => {
  const deadline = Date.now() + 20000;
  while (!predicate() && Date.now() < deadline) await pause(100);
  assert.ok(predicate(), 'No expected SDK collection request captured; check SDK network availability');
};
const events = name => captures.filter(p => p.get('en') === name);
await context.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url());
  if (url.origin === origin) return route.continue();
  if (url.hostname === 'www.googletagmanager.com' && url.pathname === '/gtag/js' && url.searchParams.get('id') === id && request.resourceType() === 'script') {
    sdkRequests++;
    return route.continue();
  }
  // Never forward Google collection, including regional hosts or batching.
  if ((url.hostname === 'google-analytics.com' || url.hostname.endsWith('.google-analytics.com') || url.hostname === 'analytics.google.com' || url.hostname === 'www.googletagmanager.com') && /\/(?:g\/)?collect$/.test(url.pathname)) {
    const lines = (request.postData() || '').split('\n').filter(Boolean);
    for (const line of lines.length ? lines : ['']) {
      const params = new URLSearchParams(url.search);
      for (const [key, value] of new URLSearchParams(line)) params.set(key, value);
      captures.push(params);
    }
    return route.fulfill({status: 204, headers: {'access-control-allow-origin': origin}});
  }
  // Some real SDK variants emit this auxiliary request; intercept it and retain its consent phase.
  if (url.hostname === 'www.googletagmanager.com' && url.pathname === '/a') {
    auxiliary.push({host: url.hostname, path: url.pathname, consentPhase});
    return route.fulfill({status: 204});
  }
  blocked.push({host: url.hostname, path: url.pathname});
  return route.abort();
});
const page = await context.newPage();
page.on('response', response => { if (response.url().startsWith('https://www.googletagmanager.com/gtag/js')) { if (response.ok()) sdkResponses++; else scriptFailures.push(response.status()); } });
try {
  await page.goto(origin + '/en/?email=qa-probe@example.invalid&utm_campaign=qa_probe#qa-private');
  await pause(500);
  check(sdkRequests, 0); check(captures.length, 0); check((await context.cookies()).length, 0); check(await page.locator('.analytics-settings').count(),0);
  consentPhase = 'denied'; await page.locator('[data-consent-reject]').click(); await page.reload(); await pause(500);
  check(sdkRequests, 0); check(captures.length, 0);
  await page.evaluate(() => localStorage.removeItem('rancana_analytics_consent_v1')); await page.reload(); consentPhase = 'granted'; await page.locator('[data-consent-accept]').click();
  await waitFor(() => events('page_view').length > 0); await pause(1000);
  check(sdkResponses, 1); check(events('page_view').length, 1);
  check(events('page_view')[0].get('dl'), 'https://rancana.id/en/');
  check((await context.cookies()).some(c => /^rancana_ga(?:_|$)/.test(c.name)), true);
  const beforeHistory = events('page_view').length;
  await page.evaluate(() => history.pushState({}, '', '?email=qa-probe@example.invalid#qa-private'));
  await pause(1000); check(events('page_view').length, beforeHistory);
  await page.locator('[data-consent-accept]').evaluate(e=>e.click());
  await pause(500); check(sdkRequests, 1); check(events('page_view').length, 1);
  // Keep the test page open; product navigation handlers remain unchanged.
  const play = page.locator('.hero-ctas a[href*="play.google.com"]').first();
  await play.evaluate(a => a.addEventListener('click', e => e.preventDefault()));
  await play.click(); await waitFor(() => events('google_play_click').length > 0);
  check(events('google_play_click').length, 1);
  check(events('google_play_click')[0].get('ep.link_destination'), 'google_play');
  check(events('google_play_click')[0].get('ep.link_placement'), 'hero');
  await page.goto(origin + '/en/privacy?email=qa-probe@example.invalid');
  await waitFor(() => events('page_view').length >= 2); await pause(1000);
  check(events('page_view').length, 2); check(events('page_view').at(-1).get('dl'), 'https://rancana.id/en/privacy');
  for (const params of captures) {
    check(params.get('tid'), id);
    check(['https://rancana.id/en/', 'https://rancana.id/en/privacy'].includes(params.get('dl')), true);
    check(params.get('dr') || '', '');
    check([...params.values()].some(value => value.includes('qa-probe@example.invalid') || value.includes('qa-private')), false);
  }
  check(captures.some(p => ['scroll', 'click', 'video_start', 'video_progress', 'video_complete', 'file_download', 'view_search_results', 'form_start', 'form_submit'].includes(p.get('en'))), false);
  const requestsBeforeRevocation = sdkRequests;
  // Exercise internal denial cleanup; reopening is intentionally unavailable to visitors.
  const auxiliaryBeforeRevocation = auxiliary.length;
  consentPhase = 'denied'; await page.locator('[data-consent-reject]').evaluate(e=>e.click());
  await page.waitForFunction(() => window.dataLayer === undefined);
  await pause(1000);
  const afterRevocation = captures.length;
  check((await context.cookies()).filter(c => /^rancana_ga(?:_|$)/.test(c.name)).length, 0);
  check(sdkRequests, requestsBeforeRevocation);
  await page.evaluate(() => { document.documentElement.lang = 'id'; history.pushState({}, '', '?email=qa-probe@example.invalid'); });
  await pause(1000); check(captures.length, afterRevocation); check(blocked.length, 0); check(auxiliary.every(r=>r.consentPhase==='granted'),true); check(auxiliary.length,auxiliaryBeforeRevocation);
  outcome = 'passed';
  console.log('PASS — ' + assertions + ' real-SDK assertions; ' + captures.length + ' intercepted event requests, no collection forwarded to Google');
} finally {
  await fs.mkdir(path.join(root, 'review-evidence'), {recursive: true});
  await fs.writeFile(path.join(root, 'review-evidence/real-sdk-report.json'), JSON.stringify({outcome, assertions, measurementId: id, sdkRequests, sdkResponses, scriptFailures, collectionForwarded: false, auxiliaryForwarded: false, auxiliary, blocked, captures: captures.map(p => ({event: p.get('en'), measurementId: p.get('tid'), pageLocation: p.get('dl'), pageReferrer: p.get('dr'), title: p.get('dt'), campaign: p.get('cn'), placement: p.get('ep.link_placement'), parameterNames: [...p.keys()].sort()}))}, null, 2));
  await context.close(); await browser.close(); server.close();
}
