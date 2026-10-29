import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root = path.dirname(fileURLToPath(import.meta.url));
const baseline = process.argv.find(arg => arg.startsWith('--baseline='))?.slice(11);
assert.ok(baseline, 'Pass --baseline=/path/to/d289e92-checkout for before/after evidence');
const out = path.join(root, 'review-evidence/mobile-layout');
await fs.mkdir(out, {recursive: true});
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const before = url.pathname.startsWith('/before/');
    const base = before ? path.resolve(baseline) : root;
    let pathname = url.pathname.replace(/^\/(before|after)/, '');
    if (pathname.endsWith('/')) pathname += 'index.html';
    if (!path.extname(pathname)) pathname += '.html';
    const file = path.resolve(base, '.' + pathname);
    if (!file.startsWith(base + path.sep)) throw Error('Invalid path');
    res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8', '.css':'text/css',
      '.js':'text/javascript', '.svg':'image/svg+xml', '.webp':'image/webp',
      '.png':'image/png', '.woff':'font/woff', '.woff2':'font/woff2'})[path.extname(file)] || 'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch { res.statusCode = 404; res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({args:['--no-sandbox'],
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {})});
const report = {baseline:'d289e92315f601045326f72536178e117c27ea6f', layouts:[], screenshots:[]};

async function open(variant, lang, width, reducedMotion) {
  const page = await browser.newPage({viewport:{width,height:1000}, deviceScaleFactor:2, reducedMotion});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://**/*', route => route.abort());
  await page.goto(`${origin}/${variant}/${lang}/`);
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const image of document.images) image.loading = 'eager';
    await Promise.all([...document.images].map(image => image.decode()));
  });
  const reject = page.locator('[data-consent-reject]');
  if (await reject.isVisible()) await reject.click();
  await page.evaluate(() => document.documentElement.style.scrollBehavior = 'auto');
  assert.deepEqual(errors, [], `${variant}/${lang}/${width}: page errors`);
  return page;
}

async function measure(page) {
  return page.evaluate(() => {
    const card = document.querySelector('.card-flashcards');
    const box = card.getBoundingClientRect();
    const caption = card.querySelector('.card-head p');
    const last = document.querySelector('.benefit-list article:last-child .section-copy').getBoundingClientRect();
    const sheet = document.querySelector('#cta .sheet-1').getBoundingClientRect();
    const text = [...card.querySelectorAll('.card-head h3,.card-head p,.fc-mobile span,.fc-mobile-answer')]
      .filter(element => element.checkVisibility());
    return {
      overflow:document.documentElement.scrollWidth > innerWidth,
      cardInsideViewport:box.left >= 0 && box.right <= innerWidth,
      captionSize:parseFloat(getComputedStyle(caption).fontSize) * parseFloat(getComputedStyle(card).zoom),
      mobileExample:!!card.querySelector('.fc-mobile')?.checkVisibility(),
      labelSizes:[...card.querySelectorAll('.fc-mobile-top span,.fc-mobile-bottom span')].map(element => parseFloat(getComputedStyle(element).fontSize)),
      formulaSize:card.querySelector('.fc-mobile-answer') ? parseFloat(getComputedStyle(card.querySelector('.fc-mobile-answer')).fontSize) : null,
      textFits:text.every(element => {
        const range = document.createRange(); range.selectNodeContents(element);
        return [...range.getClientRects()].every(rect => rect.left >= box.left && rect.right <= box.right && rect.top >= box.top && rect.bottom <= box.bottom);
      }),
      gapToGreen:sheet.top - last.bottom,
      headerMotions:document.querySelector('.brand-mark').getAnimations({subtree:true}).length,
      companionMotions:[...document.querySelectorAll('[data-companion-scene]')].reduce((sum,element) => sum + element.getAnimations({subtree:true}).length, 0),
    };
  });
}

async function screenshots(page, variant, lang, width) {
  const prefix = `${lang}-${width}-${variant}`;
  const flashcard = `${prefix}-flashcard.png`, gap = `${prefix}-gap.png`;
  await page.locator('.card-flashcards').screenshot({path:path.join(out, flashcard)});
  await page.locator('.benefit-list article:last-child').evaluate(element => {
    scrollTo({top:element.getBoundingClientRect().top + scrollY - 140, behavior:'instant'});
  });
  // Allow the sticky header to settle before freezing a stable reduced-motion frame.
  await page.waitForTimeout(100);
  await page.screenshot({path:path.join(out, gap)});
  report.screenshots.push({variant, lang, width, flashcard, gap});
}

try {
  for (const lang of ['id','en']) for (const width of [320,390,768,899,900,1440]) {
    const before = await open('before', lang, width, 'reduce');
    const old = await measure(before);
    const after = await open('after', lang, width, 'reduce');
    const current = await measure(after);
    assert.equal(current.overflow, false, `${lang}/${width}: page overflow`);
    assert.equal(current.cardInsideViewport, true, `${lang}/${width}: card overflow`);
    assert.equal(current.textFits, true, `${lang}/${width}: text clipping`);
    assert.equal(current.headerMotions, 0, 'reduced-motion header remains still');
    assert.equal(current.companionMotions, 0, 'reduced-motion companions remain still');
    if (width < 900) {
      assert.equal(current.mobileExample, true);
      assert.ok(current.captionSize >= 16, 'caption must remain readable without whole-card scaling');
      assert.ok(current.labelSizes.every(size => size >= 14), 'raster labels replaced with readable type');
      assert.ok(current.formulaSize >= 24);
      assert.ok(current.gapToGreen >= 48 && current.gapToGreen <= 64, 'compact, positive breathing room before green CTA');
      assert.ok(old.gapToGreen - current.gapToGreen >= 100, 'remove accumulated mobile whitespace');
    } else {
      assert.equal(current.mobileExample, false, 'original desktop composition');
      assert.equal(current.gapToGreen, old.gapToGreen, 'desktop spacing unchanged');
      // Description typography is intentionally larger in the website refresh.
      // Hide only that ink while retaining its box to compare the original artwork.
      for (const page of [before, after]) await page.addStyleTag({content:'.card-flashcards .card-head p{visibility:hidden}'});
      const original = await before.locator('.card-flashcards').screenshot();
      const updated = await after.locator('.card-flashcards').screenshot();
      assert.equal(original.equals(updated), true, 'desktop Flashcard artwork pixels unchanged');
    }
    if ([320,390,1440].includes(width)) {
      await screenshots(before, 'before', lang, width);
      await screenshots(after, 'after', lang, width);
    }
    report.layouts.push({lang,width,reducedMotion:'reduce',before:old,after:current});
    await before.close(); await after.close();
  }
  for (const lang of ['id','en']) for (const width of [320,390,1440]) {
    const page = await open('after', lang, width, 'no-preference');
    for (const selector of ['#features','#benefits','#cta','.preview-footer']) {
      await page.locator(selector).scrollIntoViewIfNeeded();
      const state = await measure(page);
      assert.equal(state.overflow, false);
      assert.equal(state.textFits, true);
    }
    report.layouts.push({lang,width,reducedMotion:'no-preference',after:await measure(page)});
    await page.close();
  }
  await fs.writeFile(path.join(out,'report.json'), JSON.stringify(report,null,2) + '\n');
  const sections = [];
  for (const lang of ['id','en']) for (const width of [320,390,1440]) for (const target of ['flashcard','gap']) {
    sections.push(`<section><h2>${lang.toUpperCase()} · ${width}px · ${target}</h2><div class="pair">${['before','after'].map(variant => `<figure><figcaption>${variant}</figcaption><img src="${lang}-${width}-${variant}-${target}.png" alt="${variant} ${target} at ${width}px"></figure>`).join('')}</div></section>`);
  }
  await fs.writeFile(path.join(out,'index.html'), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Rancana mobile layout review</title><style>body{font:16px/1.5 system-ui;margin:24px;color:#182c23;background:#f8faf9}section{margin:40px 0}.pair{display:flex;align-items:flex-start;gap:24px}figure{margin:0;flex:1;min-width:0}figcaption{font-weight:700;margin:8px 0}img{display:block;max-width:100%;height:auto;border:1px solid #ddd}h2{font-size:20px}</style><h1>Rancana mobile layout review</h1><p>Before: d289e92315f601045326f72536178e117c27ea6f. Screenshots use Chromium, 2× pixel density and reduced motion. Open report.json for measurements. Supplied Library JPEGs could not be downloaded; these comparisons use the actual baseline checkout.</p>${sections.join('')}`);
  console.log('PASS — 12 baseline/updated comparisons, 6 normal-motion layouts, 24 screenshots; desktop Flashcard artwork pixels unchanged');
  console.log(JSON.stringify(report.layouts.filter(row => row.width < 900 && row.before).map(row => ({lang:row.lang,width:row.width,captionBefore:row.before.captionSize,captionAfter:row.after.captionSize,gapBefore:row.before.gapToGreen,gapAfter:row.after.gapToGreen}))));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
