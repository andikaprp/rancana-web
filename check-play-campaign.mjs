// Browser check: landing campaign decoration of /go/play links, independent of analytics consent.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const root = path.dirname(new URL(import.meta.url).pathname);
const {default: worker} = await import('data:text/javascript,' + encodeURIComponent(await fs.readFile(path.join(root, 'worker.js'), 'utf8')));
const types = {'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/go/')) {
      // The real Worker owns the redirect; static files stand in for ASSETS.
      const response = await worker.fetch(new Request('https://rancana.id' + url.pathname + url.search), {});
      res.statusCode = response.status; response.headers.forEach((v, k) => res.setHeader(k, v)); res.end(); return;
    }
    let name = decodeURIComponent(url.pathname);
    if (name.endsWith('/')) name += 'index.html';
    if (!path.extname(name)) name += '.html';
    const file = path.resolve(root, '.' + name);
    if (!file.startsWith(root + '/')) throw Error('invalid path');
    const content = await fs.readFile(file);
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.end(content);
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, headless: true, args: ['--no-sandbox']});
const consentKey = 'rancana_analytics_consent_v1', playKey = 'rancana_play_campaign_v1';
const play = 'https://play.google.com/store/apps/details?id=com.planora.labs';
const referrer = q => play + '&referrer=' + encodeURIComponent(q);
const defaults = 'utm_source=rancana.id&utm_medium=web&utm_campaign=play_cta';
const full = 'utm_source=instagram&utm_medium=social&utm_campaign=x';
let assertions = 0;
const check = (actual, expected, message) => { assert.deepEqual(actual, expected, message); assertions++; };
const contexts = [];
async function open(consent = null) {
  const context = await browser.newContext({viewport: {width: 390, height: 844}}); contexts.push(context);
  const google = [], plays = [];
  if (consent) await context.addInitScript(({k, v}) => localStorage.setItem(k, JSON.stringify(v)), {k: consentKey, v: {version: 1, choice: consent, at: Date.now()}});
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    if (url.hostname === 'play.google.com') { plays.push(url.href); return route.fulfill({contentType: 'text/html', body: '<p>play</p>'}); }
    if (/google/.test(url.hostname)) google.push(url.href);
    return route.abort();
  });
  // Own the /go/play hop: fetch the Worker's real 302 without following it, then serve a local stub
  // so the live Play Store page (and its Google-hosted images) never loads in CI.
  const hops = [];
  await context.route(u => u.origin === origin && u.pathname === '/go/play', async route => {
    const response = await route.fetch({maxRedirects: 0});
    const url = new URL(route.request().url());
    hops.push({status: response.status(), location: response.headers().location || null, hop: url.pathname + url.search});
    return route.fulfill({contentType: 'text/html', body: '<p>play stub</p>'});
  });
  const page = await context.newPage();
  const go = async (p) => { await page.goto(origin + p); await page.waitForTimeout(100); };
  const hrefs = () => page.$$eval('a[href^="/go/play"]', as => [...new Set(as.map(a => a.getAttribute('href')))]);
  const hero = () => page.locator('.hero-ctas a.play-cta').first();
  const stored = () => page.evaluate(k => sessionStorage.getItem(k), playKey);
  // Tap the CTA for real and capture the Worker's 302 Location from the stubbed /go/play hop.
  const tap = async (locator) => {
    const count = hops.length;
    await Promise.all([page.waitForResponse(r => new URL(r.url()).origin === origin && new URL(r.url()).pathname === '/go/play'), locator.click()]);
    check(hops.length, count + 1, 'one /go/play hop per tap');
    const {status, location, hop} = hops.at(-1);
    check(status, 302, 'Worker answers /go/play with 302');
    const target = new URL(location);
    check(target.origin + target.pathname, 'https://play.google.com/store/apps/details');
    check(target.searchParams.get('id'), 'com.planora.labs');
    check(location.includes('&referrer=' + encodeURIComponent(target.searchParams.get('referrer'))), true, 'referrer is URL-encoded');
    check(plays.length, 0, 'live Play page never requested');
    await page.goBack(); await page.waitForTimeout(100);
    return {location, hop};
  };
  return {context, page, go, hrefs, hero, stored, tap, google, plays};
}
try {
  // 1. Valid landing, no consent decision: every /go/play link is decorated, no Google traffic.
  const a = await open();
  await a.go('/id/?' + full + '&gclid=private-click&email=private@example.test');
  check(await a.page.locator('.analytics-consent').isVisible(), true, 'consent panel still undecided');
  check(await a.hrefs(), ['/go/play?' + full]);
  check(await a.stored(), full);
  let t = await a.tap(a.hero());
  check(t.hop, '/go/play?' + full); check(t.location, referrer(full));
  check(a.google.length, 0, 'no Google request without consent');
  // 2. Session persistence: an untagged second page is decorated from sessionStorage.
  await a.go('/id/privacy');
  check(await a.hrefs(), ['/go/play?' + full]);
  await a.go('/en/about');
  check(await a.hrefs(), ['/go/play?' + full]);
  // Unrelated params never replace or leak into the campaign.
  await a.go('/en/?gclid=private-click&ref=x');
  check(await a.hrefs(), ['/go/play?' + full]);
  // 3. Rejecting consent does not remove campaign decoration.
  await a.page.locator('[data-consent-reject]').click(); await a.page.waitForTimeout(100);
  check(await a.hrefs(), ['/go/play?' + full]);
  await a.go('/id/help'); check(await a.hrefs(), ['/go/play?' + full]);
  check(a.google.length, 0);
  // 4. Partial landing: all-or-nothing, clears the stored campaign, Worker applies all three defaults.
  await a.go('/id/?utm_source=ig');
  check(await a.hrefs(), ['/go/play']); check(await a.stored(), null);
  t = await a.tap(a.hero()); check(t.hop, '/go/play'); check(t.location, referrer(defaults));
  await a.go('/id/privacy'); check(await a.hrefs(), ['/go/play']);
  for (const partial of ['utm_source=ig&utm_campaign=x', 'utm_medium=social&utm_campaign=x', 'utm_content=hero',
    'utm_source=ig&utm_campaign=x&utm_content=hero', full.replace('instagram', 'private%40example.test'),
    full.replace('social', 'paid%20social'), full.replace('utm_campaign=x', 'utm_campaign=' + 'a'.repeat(65))]) {
    await a.go('/en/?' + full); check(await a.hrefs(), ['/go/play?' + full]);
    await a.go('/en/?' + partial); check(await a.hrefs(), ['/go/play'], partial); check(await a.stored(), null);
  }
  // 5. Already-denied consent: still decorated; content kept only when valid; values lowercased.
  const b = await open('denied');
  await b.go('/en/?utm_source=Instagram&utm_medium=SOCIAL&utm_campaign=x&utm_content=Hero');
  check(await b.hrefs(), ['/go/play?' + full + '&utm_content=hero']);
  t = await b.tap(b.hero()); check(t.location, referrer(full + '&utm_content=hero'));
  await b.go('/en/?' + full + '&utm_content=hero%26url%3Dhttps%3A%2F%2Fevil.test');
  check(await b.hrefs(), ['/go/play?' + full]);
  // No allowlist: a brand-new campaign name works without a deploy.
  const raya = 'utm_source=tiktok&utm_medium=paid_social&utm_campaign=raya_launch.2027-q1';
  await b.go('/id/?' + raya); check(await b.hrefs(), ['/go/play?' + raya]);
  t = await b.tap(b.hero()); check(t.location, referrer(raya));
  check(b.google.length, 0);
  // 6. Granted consent decorates the same way (consent has no effect on the handoff).
  const c = await open('granted');
  await c.go('/en/?' + full); check(await c.hrefs(), ['/go/play?' + full]);
  // 7. Independent tab: no inherited campaign; nothing written to localStorage.
  const fresh = await c.context.newPage(); await fresh.goto(origin + '/en/'); await fresh.waitForTimeout(100);
  check(await fresh.$$eval('a[href^="/go/play"]', as => [...new Set(as.map(x => x.getAttribute('href')))]), ['/go/play']);
  check(await c.page.evaluate(k => localStorage.getItem(k), playKey), null);
  await fresh.close();
  // 8. Tampered storage is rebuilt or rejected, never forwarded verbatim.
  await c.page.evaluate(k => sessionStorage.setItem(k, 'utm_source=ig&utm_medium=web&utm_campaign=x&gclid=private'), playKey);
  await c.go('/en/privacy'); check(await c.hrefs(), ['/go/play']); check(await c.stored(), null);
  await c.page.evaluate(k => sessionStorage.setItem(k, 'utm_source=ig&utm_medium=web'), playKey);
  await c.go('/en/privacy'); check(await c.hrefs(), ['/go/play']);
  // 9. Injected /go/play hrefs are normalised to the campaign href on interaction.
  await c.go('/en/?' + full);
  await c.page.evaluate(() => { const x = document.querySelector('.hero-ctas a.play-cta'); x.setAttribute('href', '/go/play?referrer=private&url=https://evil.test'); x.addEventListener('click', e => e.preventDefault()); });
  await c.hero().click(); check(await c.hero().getAttribute('href'), '/go/play?' + full);
  // 10. Failed sessionStorage still decorates from the current landing URL only.
  const d = await open();
  await d.context.addInitScript(() => { Storage.prototype.setItem = function () { throw Error('blocked'); }; Storage.prototype.getItem = function () { throw Error('blocked'); }; });
  await d.go('/en/?' + full); check(await d.hrefs(), ['/go/play?' + full]);
  await d.go('/en/privacy'); check(await d.hrefs(), ['/go/play']);
  console.log('PASS — ' + assertions + ' Chromium Play campaign decoration, session persistence, consent-independence and all-or-nothing default assertions');
} finally { await Promise.all(contexts.map(x => x.close())); await browser.close(); server.close(); }
