import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';

const root = path.dirname(new URL(import.meta.url).pathname);
const pages = ['index', 'about', 'help', 'premium', 'privacy', 'terms', 'delete-account', 'college-schedule', 'flashcard-guide'];
const documents = [];
for (const locale of ['', 'id/', 'en/']) for (const page of pages) documents.push({file: locale + page + '.html', source: await fs.readFile(path.join(root, locale + page + '.html'), 'utf8')});
const server = http.createServer(async (req, res) => {
  try {
    let name = new URL(req.url, 'http://localhost').pathname;
    if (name.endsWith('/')) name += 'index.html';
    if (!path.extname(name)) name += '.html';
    const file = path.resolve(root, '.' + name);
    if (!file.startsWith(root + '/')) throw Error('invalid path');
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined, args: ['--no-sandbox']});
const page = await browser.newPage();
let googleRequests = 0;
await page.route('https://www.googletagmanager.com/**', route => { googleRequests++; return route.abort(); });
try {
  const rows = await page.evaluate(documents => documents.map(({file, source}) => {
    const doc = new DOMParser().parseFromString(source, 'text/html');
    const meta = key => doc.querySelector('meta[name="' + key + '"],meta[property="' + key + '"]')?.content;
    return {file, title: doc.title, description: meta('description'), robots: meta('robots'), keywords: meta('keywords'), canonical: doc.querySelector('link[rel=canonical]')?.href, alternates: [...doc.querySelectorAll('link[hreflang]')].map(a => [a.hreflang, a.href]), ogTitle: meta('og:title'), ogDescription: meta('og:description'), schema: [...doc.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent)), links: [...doc.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))};
  }), documents);
  const canonicalSet = new Set(rows.filter(r => r.file.includes('/')).map(r => r.canonical));
  for (const row of rows) {
    assert.ok(row.title && row.description, row.file);
    assert.equal(row.ogTitle, row.title); assert.equal(row.ogDescription, row.description);
    assert.equal(row.keywords, undefined); assert.ok(canonicalSet.has(row.canonical));
    assert.equal(row.alternates.length, 3);
    for (const [locale, url] of row.alternates) { assert.ok(['id', 'en', 'x-default'].includes(locale)); assert.ok(canonicalSet.has(url)); }
    assert.equal(row.schema.length, 1);
    const graph = row.schema[0]['@graph'];
    assert.equal(graph[0]['@type'], 'WebSite'); assert.equal(graph[0].url, 'https://rancana.id/'); assert.equal(graph[0].name, 'Rancana');
    assert.equal(graph[1].url, row.canonical); assert.equal(graph[1].name, row.title);
    assert.equal(graph[1].isPartOf['@id'], graph[0]['@id']);
    assert.equal('aggregateRating' in (graph[1].mainEntity || {}), false);
    for (const href of row.links) {
      if (!href.startsWith('/')) continue;
      assert.equal(href.includes('.html'), false, row.file + ': ' + href);
      assert.ok(canonicalSet.has('https://rancana.id' + href.split('#')[0]), row.file + ': ' + href);
    }
  }
  for (const locale of ['id/', 'en/']) {
    const titles = rows.filter(r => r.file.startsWith(locale)).map(r => r.title);
    assert.equal(new Set(titles).size, pages.length, 'Unique page titles');
    const home = rows.find(r => r.file === locale + 'index.html');
    assert.match(home.description, /Android/); assert.match(home.description, locale === 'id/' ? /mahasiswa/ : /college/);
  }
  const sitemap = await fs.readFile(path.join(root, 'sitemap.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.equal(urls.length, 12); assert.equal(new Set(urls).size, 12);
  for (const url of urls) { assert.ok(canonicalSet.has(url)); assert.equal(rows.find(r => r.file.includes('/') && r.canonical === url).robots?.includes('noindex') || false, false); }
  await page.goto(origin + '/?lang=en');
  assert.equal(await page.locator('a[data-locale-page="premium"]').first().getAttribute('href'), '/en/premium');
  await page.locator('.lang-btn[data-set-lang=id]').click();
  assert.equal(await page.locator('a[data-locale-page="premium"]').first().getAttribute('href'), '/id/premium');
  assert.equal(await page.locator('a[data-locale-page="index"][data-locale-fragment="features"]').first().getAttribute('href'), '/id/#features');
  const hero = (await page.locator('.hero-title').innerText()).replace(/\s+/g, ' ').trim();
  assert.equal(hero, 'Teman belajar setiap harimu');
  assert.equal(googleRequests, 0);
  console.log('PASS — 27-page metadata/schema/canonical-link audit; 12 sitemap URLs; legacy language/fragment navigation and protected hero; no pre-consent Google tag');
} finally { await browser.close(); server.close(); }
