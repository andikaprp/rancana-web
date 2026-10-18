import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';

const root = path.resolve('dist-staging');
const config = await fs.readFile('wrangler.staging.toml', 'utf8');
assert.match(config, /^name = "rancana-staging"$/m);
assert.match(config, /^main = "worker\.staging\.mjs"$/m);
assert.match(config, /^workers_dev = false$/m);
assert.match(config, /^preview_urls = false$/m);
assert.match(config, /^pattern = "staging\.rancana\.id"$/m);
assert.match(config, /^custom_domain = true$/m);
assert.match(config, /^directory = "\.\/dist-staging"$/m);
assert.match(config, /^enabled = false$/m);
assert.equal((config.match(/^\[\[routes\]\]$/gm) || []).length, 1, 'Only the staging custom domain is configured');
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
for (const locale of ['id', 'en']) for (const page of ['articles', 'college-schedule', 'todo-guide', 'flashcard-guide']) {
  assert.ok(files.includes(`${locale}/${page}.html`), `${locale}/${page} is staged`);
}
assert.ok(!files.some(file => /\.(?:md|mjs|toml|py|json|yml)$/i.test(file)), 'Repository instructions, source, configuration, evidence, and tests stay out of public assets');
assert.ok(!files.includes('AGENTS.md') && !files.includes('REVIEW-CHECKLIST.md') && !files.includes('worker.js'));

const htmlFiles = files.filter(file => file.endsWith('.html'));
for (const file of htmlFiles) {
  const html = await fs.readFile(path.join(root, file), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex,nofollow,noarchive">/i, `${file} has noindex metadata`);
  assert.match(html, /class="staging-notice"/, `${file} is visibly marked staging`);
  assert.doesNotMatch(html, /<script\b[^>]*\bsrc=["'](?:https?:)?\/\//i, `${file} has no external script loader`);
}
const guideScreens = [
  ['id/college-schedule.html', ['../assets/articles/schedule-form-id.png', '../assets/articles/schedule-list-id.png']],
  ['en/college-schedule.html', ['../assets/articles/schedule-form-en.png', '../assets/articles/schedule-list-en.png']],
  ['id/todo-guide.html', ['../assets/articles/todo-form-id.png', '../assets/articles/todo-list-id.png']],
  ['en/todo-guide.html', ['../assets/articles/todo-form-en.png', '../assets/articles/todo-list-en.png']],
];
for (const [page, screenshots] of guideScreens) {
  const html = await fs.readFile(path.join(root, page), 'utf8');
  for (const screenshot of screenshots) {
    assert.ok(html.includes(screenshot), `${page} includes its app screenshot`);
    assert.ok(files.includes(screenshot.replace(/^\.\.\//, '')), `${screenshot} is included in staging assets`);
  }
  assert.doesNotMatch(html, /not an app screenshot/i, `${page} does not present a UI as text-only sample data`);
}
assert.match(await fs.readFile(path.join(root, 'id/flashcard-guide.html'), 'utf8'), /phone-center\.webp/, 'Flashcard guide uses the genuine app screen');
const analyticsConfig = await fs.readFile(path.join(root, 'analytics-config.js'), 'utf8');
assert.match(analyticsConfig, /measurementId:\s*""/);
assert.equal(await fs.readFile(path.join(root, 'analytics-consent.js'), 'utf8'), '// Staging only: analytics disabled.\n');
const executableAssets = await Promise.all(files.filter(file => /\.(?:html|js)$/i.test(file)).map(file => fs.readFile(path.join(root, file), 'utf8')));
assert.doesNotMatch(executableAssets.join('\n'), /G-2KDN1C2G3L|googletagmanager\.com|google-analytics\.com/i);

const workerText = await fs.readFile('worker.staging.mjs', 'utf8');
const worker = (await import(`data:text/javascript;base64,${Buffer.from(workerText).toString('base64')}`)).default;
const mime = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp', '.ico':'image/x-icon', '.woff':'font/woff', '.woff2':'font/woff2'};
const env = {ASSETS: {async fetch(request) {
  const url = new URL(request.url);
  let relative = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  let target = path.resolve(root, relative || 'index.html');
  if (url.pathname.endsWith('/')) target = path.join(target, 'index.html');
  if (!target.startsWith(root + path.sep) && target !== path.join(root, 'index.html')) return new Response('Not found', {status: 404});
  for (const candidate of [target, `${target}.html`, path.join(target, 'index.html')]) {
    try { return new Response(await fs.readFile(candidate), {headers: {'Content-Type': mime[path.extname(candidate)] || 'application/octet-stream'}}); } catch {}
  }
  return new Response('Not found', {status: 404});
}}};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://127.0.0.1');
    const request = new Request(`https://staging.rancana.id${url.pathname}${url.search}`, {method: req.method, headers: req.headers});
    const response = await worker.fetch(request, env);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { res.writeHead(500); res.end(String(error)); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, headless: true});
const screenshotDir = path.resolve('review-evidence/staging');
await fs.mkdir(screenshotDir, {recursive: true});
try {
  const reports = [];
  for (const width of [320, 390, 1440]) for (const locale of ['id', 'en']) {
    const context = await browser.newContext({viewport: {width, height: 900}});
    const external = [];
    await context.route('**/*', route => {
      if (!route.request().url().startsWith(origin + '/')) { external.push(route.request().url()); return route.abort(); }
      return route.continue();
    });
    await context.addInitScript(() => localStorage.setItem('rancana_analytics_consent_v1', JSON.stringify({version: 1, choice: 'granted', at: Date.now()})));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const routes = [`/${locale}/`, ...['articles', 'college-schedule', 'todo-guide', 'flashcard-guide'].map(slug => `/${locale}/${slug}`)];
    for (const route of routes) {
      const response = await page.goto(origin + route, {waitUntil: 'networkidle'});
      assert.equal(response.status(), 200, `${locale} ${route}`);
      await page.evaluate(async () => {
        for (const image of document.images) image.loading = 'eager';
        await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
      });
      assert.match(response.headers()['x-robots-tag'] || '', /noindex/i, `${locale} ${route} response header`);
      assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex,nofollow/);
      assert.equal(await page.locator('html').getAttribute('lang'), locale);
      assert.equal(await page.locator('.staging-notice').count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${locale} ${route} has no overflow at ${width}px`);
      assert.equal(await page.evaluate(() => window.RancanaAnalyticsConfig.measurementId), '');
      assert.equal(await page.evaluate(() => typeof window.gtag), 'undefined');
      if (route.endsWith('college-schedule') || route.endsWith('todo-guide')) assert.equal(await page.locator('.guide-app-shot img').count(), 2);
      if (route.endsWith('flashcard-guide')) {
        const screenshot = page.locator('img[src*="phone-center.webp"]');
        assert.equal(await screenshot.count(), 1);
        assert.ok(await screenshot.evaluate(image => image.complete && image.naturalWidth > 0));
      }
      if (locale === 'id' && [390, 1440].includes(width) && !route.endsWith('/')) {
        const slug = route.split('/').pop();
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({path: path.join(screenshotDir, `${slug}-${width}.png`), fullPage: true});
      }
    }
    assert.deepEqual(external, [], `${locale} makes no external requests even with prior consent granted`);
    assert.deepEqual(errors, [], `${locale} has no page errors`);
    reports.push(`${locale} at ${width}px: five routes, no overflow, no external requests`);
    await context.close();
  }
  console.log(`PASS — isolated staging assets, noindex, analytics off, Play worker behavior and 30 locale/viewport page checks.\n${reports.join('\n')}`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
