import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const evidence = path.join(root, 'review-evidence/design-system');
await fs.mkdir(evidence, {recursive: true});
execFileSync(process.execPath, ['scripts/generate-design-tokens.mjs', '--check'], {cwd: root, stdio: 'inherit'});
const manifest = JSON.parse(await fs.readFile(path.join(root, 'design-system/tokens.json'), 'utf8'));
const values = Object.fromEntries(manifest.tokens.map(token => [token.name, token.light]));
assert.equal(values['brand-green'], '#217957');
assert.equal(values['brand-pink'], '#FF197D');
const css = await fs.readFile(path.join(root, 'design-system/tokens.css'), 'utf8');
assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /:root|data-theme|prefers-color-scheme/);
assert.match(await fs.readFile(path.join(root, '.assetsignore'), 'utf8'), /^design-system\/$/m);

function luminance(hex) {
  const rgb = hex.slice(1).match(/../g).map(part => parseInt(part, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function contrast(a, b) { const aa = luminance(a), bb = luminance(b); return (Math.max(aa, bb) + .05) / (Math.min(aa, bb) + .05); }
const contrastPairs = [['color-text','color-surface'],['color-text-muted','color-bg'],['color-text-muted','color-surface'],['color-on-primary','color-primary'],['color-on-primary','color-primary-hover'],['color-on-primary-container','color-primary-container'],['color-on-accent','color-accent'],...['sage','sky','sand','lilac','rose','slate'].map(name => ['color-text',`subject-${name}`]), ...['success','warning','error','info'].map(name => [`color-${name}`,'color-surface'])].map(([foreground, background]) => ({foreground, background, ratio: contrast(values[foreground],values[background])}));
for (const pair of contrastPairs) assert.ok(pair.ratio >= 4.5, `${pair.foreground} on ${pair.background}: ${pair.ratio}`);

const mime = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.json':'application/json', '.svg':'image/svg+xml', '.webp':'image/webp', '.woff':'font/woff', '.md':'text/plain'};
const server = http.createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep)) throw new Error('Outside repository');
    res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const reports = [];
try {
  browser = await chromium.launch({headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined});
  for (const width of [320, 390, 1440]) {
    const context = await browser.newContext({viewport: {width, height: 1000}, reducedMotion: 'reduce'});
    const page = await context.newPage();
    const failures = [], external = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
    await context.route('**/*', route => {
      if (route.request().url().startsWith(origin + '/')) return route.continue();
      external.push(route.request().url());
      return route.abort();
    });
    await page.goto(`${origin}/design-system/`);
    await page.waitForFunction(() => document.querySelectorAll('#token-rows tr').length === 61);
    await page.evaluate(() => document.fonts.ready);
    assert.ok(await page.evaluate(() => document.fonts.check('600 32px Lora') && document.fonts.check('400 16px "Source Sans Pro"')));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Page overflow at ${width}`);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('img').evaluateAll(images => images.filter(image => !image.complete || image.naturalWidth === 0).length), 0);
    await page.screenshot({path: path.join(evidence, `overview-${width}.png`)});
    await page.screenshot({path: path.join(evidence, `catalog-${width}.png`), fullPage: true});
    await page.locator('.intro').screenshot({path: path.join(evidence, `brand-${width}.png`)});
    await page.locator('#recipes').screenshot({path: path.join(evidence, `components-${width}.png`)});
    const button = page.getByRole('button', {name:'Primary action', exact:true});
    await button.click();
    assert.match(await page.locator('#interaction-status').textContent(), /Reference interaction 1/);
    await button.hover();
    assert.equal(await button.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(27, 100, 71)');
    await page.getByRole('link', {name:'Skip to foundation'}).focus();
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle !== 'none'), 'Keyboard focus remains visible');
    await page.getByRole('searchbox', {name:'Find a token'}).fill('brand-');
    assert.equal(await page.locator('#token-rows tr').count(), 2);
    await page.getByRole('searchbox', {name:'Find a token'}).fill('does-not-exist');
    assert.equal(await page.locator('#token-rows tr').count(), 0);
    assert.match(await page.locator('#token-count').textContent(), /0 of 61/);
    await page.getByRole('searchbox', {name:'Find a token'}).fill('');
    assert.equal(await page.locator('#token-rows tr').count(), 61);
    assert.deepEqual(external, []);
    assert.deepEqual(failures, []);
    reports.push({width, tokenRows:61, overflow:false, fontsLoaded:true, imagesLoaded:true, localInteractions:true, keyboardFocus:true, externalRequests:external});
    await context.close();
  }
  await fs.writeFile(path.join(evidence, 'report.json'), JSON.stringify({baseline:manifest.baseline, status:'reference-tested-not-approved-or-released', reports, contrastPairs, limits:'Static pair checks and local browser checks only; no claim of complete accessibility compliance or app visual acceptance.'}, null, 2) + '\n');
  console.log('Catalog checks passed at 320, 390 and 1440px; captures and contrast report in review-evidence/design-system');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
