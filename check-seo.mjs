import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';

const root = path.dirname(new URL(import.meta.url).pathname);
const pages = ['index', 'about', 'help', 'premium', 'privacy', 'terms', 'delete-account', 'college-schedule', 'flashcard-guide', 'articles', 'todo-guide', 'flashcard-hafalan', 'jadwal-belajar', 'todo-tugas'];
const SITEMAP_LASTMOD = '2026-10-29';
// Expected sameAs after the social-profile extension (PR #34): Play entity first, then verified socials.
const ORG_SAMEAS = ['https://play.google.com/store/apps/dev?id=4897195411202652501', 'https://www.instagram.com/rancana.app/', 'https://www.tiktok.com/@rancana.id', 'https://x.com/rancanaid'];
const APP_SAMEAS = ['https://play.google.com/store/apps/details?id=com.planora.labs', 'https://www.instagram.com/rancana.app/', 'https://www.tiktok.com/@rancana.id', 'https://x.com/rancanaid'];
// Indonesian-only pages have no legacy root route and no EN counterpart.
const idOnly = ['tka-2026'];
const documents = [];
for (const locale of ['', 'id/', 'en/']) for (const page of pages) documents.push({file: locale + page + '.html', source: await fs.readFile(path.join(root, locale + page + '.html'), 'utf8')});
for (const page of idOnly) documents.push({file: 'id/' + page + '.html', source: await fs.readFile(path.join(root, 'id/' + page + '.html'), 'utf8')});
const server = http.createServer(async (req, res) => {
  try {
    let name = new URL(req.url, 'http://localhost').pathname;
    if (name.endsWith('/')) name += 'index.html';
    if (!path.extname(name)) name += '.html';
    const file = path.resolve(root, '.' + name);
    if (!file.startsWith(root + '/')) throw Error('invalid path');
    res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.html') ? 'text/html' : file.endsWith('.png') ? 'image/png' : 'application/octet-stream');
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
    return {file, title: doc.title, description: meta('description'), robots: meta('robots'), keywords: meta('keywords'), canonical: doc.querySelector('link[rel=canonical]')?.href, alternates: [...doc.querySelectorAll('link[hreflang]')].map(a => [a.hreflang, a.href]), ogTitle: meta('og:title'), ogDescription: meta('og:description'), ogImage: meta('og:image'), ogImageWidth: meta('og:image:width'), ogImageHeight: meta('og:image:height'), ogImageAlt: meta('og:image:alt'), twitterCard: meta('twitter:card'), twitterImage: meta('twitter:image'), twitterImageAlt: meta('twitter:image:alt'), schema: [...doc.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent)), links: [...doc.querySelectorAll('a[href]')].map(a => a.getAttribute('href'))};
  }), documents);
  const canonicalSet = new Set(rows.filter(r => r.file.includes('/')).map(r => r.canonical));
  for (const row of rows) {
    assert.ok(row.title && row.description, row.file);
    assert.equal(row.ogTitle, row.title); assert.equal(row.ogDescription, row.description);
    assert.equal(row.keywords, undefined); assert.ok(canonicalSet.has(row.canonical));
    const idOnlyPage = idOnly.some(page => row.file === 'id/' + page + '.html');
    assert.equal(row.alternates.length, idOnlyPage ? 0 : 3, row.file);
    for (const [locale, url] of row.alternates) { assert.ok(['id', 'en', 'x-default'].includes(locale)); assert.ok(canonicalSet.has(url)); }
    assert.equal(row.schema.length, 1);
    const graph = row.schema[0]['@graph'];
    assert.equal(graph[0]['@type'], 'WebSite'); assert.equal(graph[0].url, 'https://rancana.id/'); assert.equal(graph[0].name, 'Rancana');
    assert.equal(graph[1].url, row.canonical); assert.equal(graph[1].name, row.title);
    assert.equal(graph[1].isPartOf['@id'], graph[0]['@id']);
    const org=graph.find(e=>e['@type']==='Organization');
    const app=graph.find(e=>e['@type']==='SoftwareApplication');
    assert.equal(org['@id'],'https://rancana.id/#organization');assert.equal(org.name,'Rancana');
    assert.deepEqual(org.sameAs, ORG_SAMEAS);
    assert.equal(app['@id'],'https://rancana.id/#android-app');assert.equal(app.name,'Rancana');
    assert.equal(app.operatingSystem,'Android');assert.equal(app.url,'https://rancana.id/');
    assert.equal(app.installUrl,'https://play.google.com/store/apps/details?id=com.planora.labs');
    assert.deepEqual(app.sameAs, APP_SAMEAS);assert.equal(app.publisher['@id'],org['@id']);
    assert.equal(graph[0].publisher['@id'],org['@id']);
    if(row.file.endsWith('index.html'))assert.equal(graph[1].mainEntity['@id'],app['@id']);
    assert.equal('aggregateRating' in (graph[1].mainEntity || {}), false);
    for (const href of row.links) {
      if (!href.startsWith('/')) continue;
      if (href === '/go/play') continue;
      assert.equal(href.includes('.html'), false, row.file + ': ' + href);
      assert.ok(canonicalSet.has('https://rancana.id' + href.split('#')[0]), row.file + ': ' + href);
    }
  }
  // Raya SEO audit: no em dashes in titles/metas, shared 1200×1200 card on every page, no price wording on the homepage.
  for (const row of rows) {
    assert.doesNotMatch(row.title + row.description, /\u2014/, row.file);
    assert.equal(row.ogImage, 'https://rancana.id/assets/rancana-og-mascot-square-20261017.png', row.file);
    assert.equal(row.twitterImage, row.ogImage, row.file);
    if (row.file.startsWith('id/')) assert.ok(row.title.length <= 60 && row.description.length <= 160, row.file);
  }
  const idHome = rows.find(r => r.file === 'id/index.html');
  assert.equal(idHome.title, 'Rancana: Aplikasi Jadwal Pelajaran, Tugas dan Flashcard');
  assert.doesNotMatch(idHome.description, /gratis/i);
  assert.equal(idHome.schema[0]['@graph'][1].description, idHome.description);
  assert.doesNotMatch(rows.find(r => r.file === 'id/help.html').description, /pengingat/i);
  const homeLinks = rows.find(r => r.file === 'id/index.html').links;
  for (const href of ['/id/jadwal-belajar', '/id/todo-tugas', '/id/flashcard-hafalan']) assert.ok(homeLinks.includes(href), 'homepage links ' + href);
  for (const locale of ['id/', 'en/']) {
    const titles = rows.filter(r => r.file.startsWith(locale)).map(r => r.title);
    assert.equal(new Set(titles).size, titles.length, 'Unique page titles');
    assert.equal(titles.length, pages.length + (locale === 'id/' ? idOnly.length : 0));
    const home = rows.find(r => r.file === locale + 'index.html');
    assert.match(home.description, /Android/); assert.match(home.description, locale === 'id/' ? /mahasiswa/ : /college/);
    assert.equal(home.ogImage, 'https://rancana.id/assets/rancana-og-mascot-square-20261017.png');
    assert.equal(home.ogImageWidth, '1200'); assert.equal(home.ogImageHeight, '1200');
    assert.ok(home.ogImageAlt && home.ogImageAlt.length > 20);
    assert.equal(home.twitterCard, 'summary'); assert.equal(home.twitterImage, home.ogImage);
    assert.equal(home.twitterImageAlt, home.ogImageAlt);
  }
  const legacyHome = rows.find(r => r.file === 'index.html');
  assert.equal(legacyHome.ogImage, 'https://rancana.id/assets/rancana-og-mascot-square-20261017.png');
  assert.equal(legacyHome.ogImageWidth, '1200'); assert.equal(legacyHome.ogImageHeight, '1200');
  assert.ok(legacyHome.ogImageAlt && legacyHome.twitterImageAlt);
  const imageSize = await page.evaluate(async url => {
    const image = new Image(); image.src = url;
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
    return [image.naturalWidth, image.naturalHeight];
  }, origin + new URL(legacyHome.ogImage).pathname);
  assert.deepEqual(imageSize, [1200, 1200]);
  const sitemap = await fs.readFile(path.join(root, 'sitemap.xml'), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.equal(urls.length, 23); assert.equal(new Set(urls).size, 23);
  assert.ok(urls.includes('https://rancana.id/id/tka-2026')); assert.equal(urls.includes('https://rancana.id/en/tka-2026'), false);
  const lastmods = [...sitemap.matchAll(/<url><loc>[^<]+<\/loc><lastmod>([^<]+)<\/lastmod><\/url>/g)].map(m => m[1]);
  assert.deepEqual(lastmods, urls.map(() => SITEMAP_LASTMOD), 'every sitemap URL has a lastmod');
  const tka = rows.find(r => r.file === 'id/tka-2026.html');
  assert.equal(tka.canonical, 'https://rancana.id/id/tka-2026');
  assert.equal(tka.title, 'Jadwal TKA 2026 dan Cara Atur Belajar Sampai ASAS | Rancana');
  assert.equal(tka.description, 'Cek jadwal gelombang TKA 2026, susulan, dan pengumuman hasil. Plus cara atur jadwal belajar, tugas, dan flashcard sampai ASAS selesai pakai Rancana.');
  assert.ok(tka.title.length <= 60 && tka.description.length <= 155);
  // Internal links to the TKA page use the agreed anchor text.
  const tkaAnchors = await page.evaluate(documents => documents.flatMap(({file, source}) => [...new DOMParser().parseFromString(source, 'text/html').querySelectorAll('a[href="/id/tka-2026"]')].map(a => [file, a.textContent.replace(/\s+/g, ' ').trim()])), documents.filter(d => d.file.startsWith('id/')));
  for (const file of ['id/index.html', 'id/jadwal-belajar.html', 'id/flashcard-hafalan.html', 'id/todo-tugas.html']) assert.deepEqual(tkaAnchors.filter(([f]) => f === file).map(([, text]) => text), ['jadwal TKA 2026'], file);
  assert.equal(tkaAnchors.filter(([f, text]) => f === 'id/articles.html' && text.includes('jadwal TKA 2026')).length, 1);
  for (const target of ['/id/jadwal-belajar', '/id/todo-tugas', '/id/flashcard-hafalan']) assert.ok(tka.links.includes(target), 'TKA back-link ' + target);
  for (const url of urls) { assert.ok(canonicalSet.has(url)); assert.equal(rows.find(r => r.file.includes('/') && r.canonical === url).robots?.includes('noindex') || false, false); }
  await page.goto(origin + '/?lang=en');
  assert.equal(await page.locator('a[data-locale-page="premium"]').first().getAttribute('href'), '/en/premium');
  await page.locator('.lang-btn[data-set-lang=id]').click();
  assert.equal(await page.locator('a[data-locale-page="premium"]').first().getAttribute('href'), '/id/premium');
  assert.equal(await page.locator('a[data-locale-page="index"][data-locale-fragment="features"]').first().getAttribute('href'), '/id/#features');
  const hero = (await page.locator('.hero-title').innerText()).replace(/\s+/g, ' ').trim();
  assert.equal(hero, 'Teman belajar setiap harimu');
  assert.equal(googleRequests, 0);
  console.log('PASS — 43-page metadata/schema/canonical-link audit; localized 1200×1200 homepage OG/Twitter card image loaded; 23 sitemap URLs with lastmod; TKA anchors; legacy language/fragment navigation and protected hero; no pre-consent Google tag');
} finally { await browser.close(); server.close(); }
