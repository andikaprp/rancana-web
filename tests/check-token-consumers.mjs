import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
// The shipped literals before adoption, deliberately independent of token generation.
const expected = {
  'v-1000': '#1e1e1e', 'v-800': '#6f6f6f', 'v-700': '#6f6f6f', 'v-600': '#6f6f6f',
  'v-200': '#e4e4e4', 'v-50': '#f9f9f9', 'green-700': '#1b6447', 'green-500': '#217957',
  lora: "'Lora', Georgia, serif", ssp: "'Source Sans Pro', 'Helvetica Neue', sans-serif",
};
const webCss = await fs.readFile(path.join(root, 'foundation-tokens.css'), 'utf8');
assert.equal((webCss.match(/--rancana-foundation-/g) || []).length, 8);
assert.doesNotMatch(webCss, /prefers-color-scheme|data-theme|\.ds-/);
const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    assert.ok(file.startsWith(root + path.sep));
    res.setHeader('Content-Type', ({'.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.woff':'font/woff'})[path.extname(file)] || 'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined});
  const page = await browser.newPage({reducedMotion:'reduce'});
  await page.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({width, height:1000});
    for (const url of ['/id/', '/en/', '/premium.html', '/articles.html', '/privacy.html']) {
      await page.goto(origin + url, {waitUntil:'networkidle'});
      await page.evaluate(() => document.fonts.ready);
      const actual = await page.evaluate(names => Object.fromEntries(names.map(name => [name, getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim()])), Object.keys(expected));
      for (const [name, value] of Object.entries(expected)) assert.equal(actual[name].toLowerCase(), value.toLowerCase(), `${url} ${width}px --${name}`);
      assert.equal(await page.evaluate(() => getComputedStyle(document.body).color), 'rgb(30, 30, 30)');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${url} ${width}px overflow`);
    }
  }
  console.log('Exact baseline aliases and live consumers pass on 5 pages at 320/390/1440px');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
