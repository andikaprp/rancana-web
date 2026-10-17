import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';
import worker, {headers} from './staging/worker.mjs';

const root = path.resolve('dist-staging');
const type = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.woff2':'font/woff2'};
const env = {ASSETS: {async fetch(request) {
  const pathname = decodeURIComponent(new URL(request.url).pathname);
  let file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep)) file = path.join(root, 'index.html');
  try {
    if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
  } catch { if (!path.extname(file)) file += '.html'; }
  try { return new Response(await fs.readFile(file), {headers:{'Content-Type':type[path.extname(file)] || 'application/octet-stream'}}); }
  catch { return new Response('Not found', {status:404}); }
}}};
for (const route of ['/', '/id/', '/en/college-schedule', '/missing', '/robots.txt', '/sitemap.xml', '/go/features', '/go/play?next=https://evil.test&referrer=bad']) {
  const response = await worker.fetch(new Request('https://staging.rancana.id' + route), env);
  for (const [key,value] of Object.entries(headers)) assert.equal(response.headers.get(key),value);
  if (route.startsWith('/go/play')) assert.equal(response.headers.get('Location'),'https://play.google.com/store/apps/details?id=com.planora.labs');
  if (route === '/robots.txt') assert.match(await response.text(),/Disallow: \//);
  if (route === '/sitemap.xml') assert.equal(response.status,404);
}
for (const host of ['rancana.id','www.rancana.id','evil.test']) {
  assert.equal((await worker.fetch(new Request('https://' + host),env)).status,421);
}
assert.doesNotMatch(await fs.readFile(path.join(root,'analytics-config.js'),'utf8'),/G-2KDN1C2G3L/);
async function audit(directory) {
  for (const entry of await fs.readdir(directory,{withFileTypes:true})) {
    const file = path.join(directory,entry.name);
    if (entry.isDirectory()) { await audit(file); continue; }
    assert.ok(!/\.(?:mjs|py|toml|md|yml)$/.test(file),'No source/configuration documents in public assets');
    if (/\.(?:html|js)$/.test(file)) {
      const content = await fs.readFile(file,'utf8');
      assert.doesNotMatch(content,/G-2KDN1C2G3L/,'No production measurement ID in deployed executable/document bytes');
      if (file.endsWith('.html')) assert.match(content,/<meta name="robots" content="noindex,nofollow,noarchive">/);
    }
  }
}
await audit(root);
const server = http.createServer(async (req,res) => {
  try {
    const response = await worker.fetch(new Request('http://127.0.0.1:' + server.address().port + req.url),env);
    res.writeHead(response.status,Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { res.writeHead(500); res.end(String(error)); }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,headless:true});
const report = [];
try {
  for (const width of [320,390,1440]) for (const locale of ['id','en']) {
    const context = await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
    const external = [];
    await context.route('**/*',route=> {
      if (!route.request().url().startsWith(origin + '/')) { external.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    await context.addInitScript(()=>localStorage.setItem('rancana_analytics_consent_v1',JSON.stringify({version:1,choice:'granted',at:Date.now()})));
    const page = await context.newPage();
    for (const route of ['/', '/college-schedule']) {
      await page.goto(origin + '/' + locale + route + '?utm_source=instagram&utm_medium=organic_social&utm_campaign=rancana_study_2026q4&utm_content=profile_bio&gclid=must-not-leave',{waitUntil:'networkidle'});
      assert.equal(await page.locator('.staging-notice').count(),1);
      assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex,nofollow/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
      assert.equal(await page.evaluate(()=>typeof window.gtag),'undefined');
      assert.equal(await page.evaluate(()=>window.RancanaAnalyticsConfig.measurementId),'');
      if (route.includes('college')) {
        assert.equal(await page.locator('article:visible .study-week-example').count(),1);
        await page.locator('article:visible .study-week-example').screenshot({path:`review-evidence/staging/${locale}-${width}-study-week.png`});
      }
      await page.screenshot({path:`review-evidence/staging/${locale}-${width}-${route==='/'?'home':'guide'}.png`});
      await page.evaluate(()=>localStorage.setItem('rancana_analytics_consent_v1',JSON.stringify({version:1,choice:'denied',at:Date.now()})));
      await page.reload({waitUntil:'networkidle'});
      assert.equal(await page.evaluate(()=>typeof window.gtag),'undefined');
    }
    assert.deepEqual(external,[],'No third-party request, including analytics/replay');
    report.push({locale,width,noOverflow:true,externalRequests:0,grantedAndDeniedAnalyticsOff:true});
    await context.close();
  }
  await fs.writeFile('review-evidence/staging/checks.json',JSON.stringify(report,null,2));
  console.log('Staging checks passed: host isolation, all-response headers, no indexing, fixed redirect, 6 locale/viewport combinations, analytics off for grant/denial, zero external requests.');
} finally { await browser.close(); await new Promise(resolve=>server.close(resolve)); }
