import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';

const root = path.resolve('dist-staging');
const config = await fs.readFile('wrangler.staging.toml', 'utf8');
assert.match(config, /^name = "rancana-staging"$/m);
assert.match(config, /^main = "worker\.js"$/m);
assert.match(config, /^workers_dev = false$/m);
assert.match(config, /^preview_urls = false$/m);
assert.match(config, /^pattern = "staging\.rancana\.id"$/m);
assert.match(config, /^custom_domain = true$/m);
assert.match(config, /^directory = "\.\/dist-staging"$/m);
assert.match(config, /^enabled = false$/m);
assert.equal((config.match(/^\[\[routes\]\]$/gm) || []).length, 1, 'Only one exact custom domain is configured');
assert.doesNotMatch(config, /\b(?:vars|secrets|kv_namespaces|r2_buckets|durable_objects)\b/i, 'No production bindings or secrets are reused');

const files = [];
async function collect(directory) {
  for (const entry of await fs.readdir(directory, {withFileTypes: true})) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(file);
    else files.push(path.relative(root, file));
  }
}
await collect(root);
assert.ok(files.includes('id/index.html') && files.includes('en/index.html'), 'Both localized home pages are staged');
assert.ok(!files.some(file => /\.(?:md|mjs|toml|py|json|yml|ttf)$/i.test(file)), 'Repository instructions, source, config, provenance JSON, and tests stay out of public assets');
assert.ok(!files.includes('AGENTS.md') && !files.includes('REVIEW-CHECKLIST.md'));

const htmlFiles = files.filter(file => file.endsWith('.html'));
for (const file of htmlFiles) {
  const html = await fs.readFile(path.join(root, file), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex,nofollow,noarchive">/i, `${file} has noindex metadata`);
  assert.match(html, /class="staging-notice"/, `${file} is visibly marked staging`);
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc=["'](?:https?:)?\/\//i, `${file} has no external script loader`);
}
const analyticsConfig = await fs.readFile(path.join(root, 'analytics-config.js'), 'utf8');
assert.match(analyticsConfig, /measurementId:\s*""/);
const executableAssets = await Promise.all(files.filter(file => /\.(?:html|js)$/i.test(file)).map(file => fs.readFile(path.join(root, file), 'utf8')));
assert.doesNotMatch(executableAssets.join('\n'), /G-2KDN1C2G3L|googletagmanager\.com|google-analytics\.com/i);

const workerText = await fs.readFile('worker.js', 'utf8');
const workerModule = await import(`data:text/javascript;base64,${Buffer.from(workerText).toString('base64')}`);
const worker = workerModule.default;
const mime = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.ico':'image/x-icon', '.woff':'font/woff', '.woff2':'font/woff2'};
const env = {ASSETS: {async fetch(request) {
  const url = new URL(request.url);
  let relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  let target = path.resolve(root, relative || 'index.html');
  if (url.pathname.endsWith('/')) target = path.join(target, 'index.html');
  if (!target.startsWith(root + path.sep) && target !== path.join(root, 'index.html')) return new Response('Not found', {status: 404});
  const candidates = [target, `${target}.html`, path.join(target, 'index.html')];
  for (const candidate of candidates) {
    try {
      const body = await fs.readFile(candidate);
      return new Response(body, {headers: {'Content-Type': mime[path.extname(candidate)] || 'application/octet-stream'}});
    } catch {}
  }
  return new Response('Not found', {status: 404});
}}};

for (const locale of ['id', 'en']) {
  const response = await worker.fetch(new Request(`https://staging.rancana.id/${locale}/`), env);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('X-Robots-Tag') || '', /noindex/i);
  const body = await response.text();
  assert.match(body, new RegExp(`<html lang="${locale}"`, 'i'));
}
const prodResponse = await worker.fetch(new Request('https://rancana.id/'), env);
assert.equal(prodResponse.headers.get('X-Robots-Tag'), null, 'Production hostname does not get preview noindex headers');

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const request = new Request(`https://staging.rancana.id${url.pathname}${url.search}`, {method: req.method, headers: req.headers});
    const response = await worker.fetch(request, env);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    res.writeHead(500);
    res.end(String(error));
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, headless: true});
try {
  const reports = [];
  for (const width of [320, 390, 1440]) for (const locale of ['id', 'en']) {
    const context = await browser.newContext({viewport: {width, height: 900}});
    const external = [];
    await context.route('**/*', route => {
      if (!route.request().url().startsWith(origin + '/')) {
        external.push(route.request().url());
        return route.abort();
      }
      return route.continue();
    });
    await context.addInitScript(() => localStorage.setItem('rancana_analytics_consent_v1', JSON.stringify({version: 1, choice: 'granted', at: Date.now()})));
    const page = await context.newPage();
    for (const route of [`/${locale}/`, `/${locale}/college-schedule`]) {
      const response = await page.goto(origin + route, {waitUntil: 'networkidle'});
      assert.equal(response.status(), 200, `${locale} ${route}`);
      assert.match(response.headers()['x-robots-tag'] || '', /noindex/i, `${locale} ${route} response header`);
      assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex,nofollow/);
      assert.equal(await page.locator('html').getAttribute('lang'), locale);
      assert.equal(await page.locator('.staging-notice').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${locale} has no horizontal overflow at ${width}px`);
      assert.equal(await page.evaluate(() => window.RancanaAnalyticsConfig.measurementId), '');
      assert.equal(await page.evaluate(() => typeof window.gtag), 'undefined');
      if (route.endsWith('college-schedule')) assert.equal(await page.locator('article:visible .study-week-example').count(), 1);
    }
    assert.deepEqual(external, [], `${locale} makes no external requests with prior consent granted`);
    reports.push({locale, width, externalRequests: external.length, analyticsOffWithGrantedConsent: true});
    await context.close();
  }
  console.log(`Staging checks passed: exact host config, ID/EN pages, noindex, no tracking ID, prior-consent analytics off, and 6 locale/viewport combinations (${reports.length * 2} routes).`);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
