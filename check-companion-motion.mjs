import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

// Run --static when a browser cannot be launched. This intentionally does not
// claim any visual, lifecycle, or playback result until the real-page run passes.
const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, 'review-evidence/companion-motion');
const widths = [320, 393, 768, 900, 1440, 1920];
const scenes = {present: 11000, 'hide-seek': 18000};
const originalHashes = {
  ranca: '550f22181dbc81f4ae1392d72600bde1fd41ed0e',
  cana: 'd7a64fb25e2a8a57272c567762f608fb9913b37f',
};
for (const [character, hash] of Object.entries(originalHashes)) {
  const bytes = await fs.readFile(path.join(root, `assets/mascots/${character}-cloud.webp`));
  assert.equal(crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'), hash,
    `${character}: approved original WebP bytes must remain unchanged`);
}
if (process.argv.includes('--static')) {
  console.log('PASS: both approved original asset hashes. Browser/layout/playback checks were NOT RUN.');
  process.exit(0);
}
await fs.mkdir(out, {recursive: true});
const report = {originalHashes, responsive: [], lifecycle: [], failures: [], headerIsolation: [], videos: [], complete: false};
const bodyAssets = new Set();
const server = http.createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    if (!path.extname(pathname)) pathname += '.html';
    const file = path.resolve(root, `.${pathname}`);
    if (!file.startsWith(`${root}${path.sep}`)) throw new Error('Invalid path');
    res.setHeader('Content-Type', ({'.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
      '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png',
      '.woff': 'font/woff', '.woff2': 'font/woff2'})[path.extname(file)] || 'application/octet-stream');
    res.end(await fs.readFile(file));
  } catch {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
const actorSelector = scene => `[data-companion-scene="${scene}"]`;
const rootSelector = scene => `[data-companion-scene-root="${scene}"]`;
const allActors = '[data-companion-scene]';

async function openPage(lang, width, {height = 1000, ...options} = {}) {
  const page = await browser.newPage({viewport: {width, height}, reducedMotion: 'no-preference', ...options});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://**/*', route => route.abort());
  await page.goto(`${origin}/${lang}/`);
  await settle(page);
  return {page, errors};
}
async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const image of document.images) image.loading = 'eager';
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
  });
  const reject = page.locator('[data-consent-reject]');
  if (await reject.isVisible()) await reject.click();
  await page.waitForFunction(() => document.querySelectorAll('[data-companion-scene]').length === 4);
  await page.waitForFunction(() => [...document.querySelectorAll('[data-companion-scene-root]')]
    .every(element => element.dataset.companionAssets && element.dataset.companionAssets !== 'loading'));
  await page.locator(allActors).evaluateAll(async elements => {
    await Promise.all(elements.flatMap(element => element.matches('img') ? [element] : [...element.querySelectorAll('img')])
      .map(image => image.decode().catch(() => {})));
  });
}
async function reveal(page, scene) {
  await page.locator(rootSelector(scene)).evaluate((element, which) => {
    const top = which === 'hide-seek' ? document.documentElement.scrollHeight
      : element.getBoundingClientRect().bottom + scrollY - innerHeight + 24;
    // Avoid smooth-scroll race conditions in measured layouts and recordings.
    scrollTo({top: Math.max(0, top), behavior: 'instant'});
  }, scene);
  await page.waitForFunction(which => [...document.querySelectorAll(`[data-companion-scene="${which}"]`)]
    .every(element => element.dataset.companionMotion === 'playing'), scene);
}
async function seek(page, scene, time) {
  await page.locator(rootSelector(scene)).evaluate((element, time) => {
    element.dispatchEvent(new CustomEvent('companion:seek', {detail: {time, paused: true}}));
  }, time);
  await page.locator(actorSelector(scene)).evaluateAll(async elements => {
    await Promise.all(elements.flatMap(element => element.matches('img') ? [element] : [...element.querySelectorAll('img')])
      .map(image => image.decode().catch(() => {})));
  });
}
async function resume(page, scene) {
  await page.locator(rootSelector(scene)).evaluate(element => {
    element.dispatchEvent(new CustomEvent('companion:resume'));
  });
  await page.waitForFunction(which => [...document.querySelectorAll(`[data-companion-scene="${which}"]`)]
    .every(element => element.dataset.companionMotion === 'playing'), scene);
}
async function verifyArtwork(page, {requireRig = true} = {}) {
  const result = await page.evaluate(async () => {
    const actors = [...document.querySelectorAll('[data-companion-scene]')];
    const visible = element => {
      if (['hidden', 'collapse'].includes(getComputedStyle(element).visibility)) return false;
      for (let node = element; node instanceof Element; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === 'none' || +style.opacity === 0) return false;
      }
      return true;
    };
    const source = image => image instanceof HTMLImageElement ? image.currentSrc || image.src : new URL(image.href.baseVal, document.baseURI).href;
    const inspect = async element => {
      const body = [...element.querySelectorAll('[data-companion-body]')].filter(visible);
      const faces = [...element.querySelectorAll('[data-companion-face]')].filter(visible);
      const hands = [...element.querySelectorAll('[data-companion-hand]')].filter(visible);
      const originals = (element.matches('img') ? [element] : [...element.querySelectorAll('img[data-companion-original]')]).filter(visible);
      const rasters = [...body, ...originals];
      const loaded = await Promise.all(rasters.map(async raster => {
        const image = new Image(); image.src = source(raster);
        try { await image.decode(); return image.naturalWidth > 0; } catch { return false; }
      }));
      const layers = [element, ...body, ...faces, ...hands];
      return {character: element.dataset.companionCharacter, scene: element.dataset.companionScene,
        art: element.dataset.companionArt, visible: visible(element), loaded: loaded.length > 0 && loaded.every(Boolean),
        opacity: getComputedStyle(element).opacity, filter: getComputedStyle(element).filter,
        pointerEvents: getComputedStyle(element).pointerEvents,
        bodies: body.length, faces: faces.length, hands: hands.map(hand => hand.dataset.companionHand).sort(),
        originals: originals.length, rasters: rasters.map(source),
        bodySources: body.map(source),
        translucentLayers: layers.filter(layer => getComputedStyle(layer).opacity !== '1').length,
        fading: layers.some(layer => layer.getAnimations().some(animation => animation.effect.getKeyframes()
          .some(frame => 'opacity' in frame))),
        rasterCount: [...element.querySelectorAll('image,img')].filter(visible).length || originals.length,
      };
    };
    return {
      actors: await Promise.all(actors.map(inspect)),
      missingImages: [...document.images].filter(image => visible(image) && (!image.complete || !image.naturalWidth))
        .map(image => image.currentSrc || image.src),
      wordmarks: document.querySelectorAll('.footer-brand-row .footer-brand-text').length,
      word: document.querySelector('.footer-brand-text')?.textContent.trim(),
    };
  });
  assert.equal(result.actors.length, 4, 'exactly four actor slots');
  for (const scene of Object.keys(scenes)) {
    assert.deepEqual(result.actors.filter(actor => actor.scene === scene).map(actor => actor.character).sort(), ['cana', 'ranca']);
  }
  for (const actor of result.actors) {
    assert.ok(actor.loaded && actor.visible, `${actor.scene}/${actor.character}: loaded visible artwork`);
    assert.equal(actor.rasterCount, 1, 'exactly one visible raster body, never original and repaired bodies together');
    assert.equal(actor.opacity, '1', 'no crossfade or ghost image');
    assert.equal(actor.translucentLayers, 0, 'no partially transparent face/body/hand layer');
    assert.equal(actor.filter, 'none', 'no actor-wide recoloring/filter');
    assert.equal(actor.fading, false, 'no opacity crossfades on whole artwork layers');
    assert.equal(actor.pointerEvents, 'none', 'decorations never capture controls');
    if (requireRig || actor.art === 'native') {
      assert.equal(actor.art, 'native', `${actor.scene}/${actor.character}: final art cannot remain a placeholder`);
      assert.equal(actor.bodies, 1, 'one repaired raster body');
      assert.equal(actor.faces, 1, 'one face layer');
      assert.deepEqual(actor.hands, ['left', 'right'], 'one hand/arm layer on each side');
      assert.equal(actor.originals, 0, 'original face and hands cannot show underneath articulated layers');
    } else {
      assert.equal(actor.originals, 1, 'fallback renders the intact original');
      assert.equal(actor.bodies + actor.faces + actor.hands.length, 0, 'fallback hides all articulated layers');
      assert.equal(new URL(actor.rasters[0], origin).pathname, `/assets/mascots/${actor.character}-cloud.webp`);
    }
    for (const source of actor.bodySources) bodyAssets.add(new URL(source, origin).pathname);
  }
  assert.deepEqual(result.missingImages, [], 'all visible page images must load');
  assert.equal(result.wordmarks, 1, 'the existing real wordmark remains the sole occluder');
  assert.equal(result.word, 'Rancana');
  return result.actors.map(({character, scene, art}) => ({character, scene, art}));
}

async function sampleGeometry(page, scene) {
  return page.evaluate(async ({scene, duration}) => {
    const root = document.querySelector(`[data-companion-scene-root="${scene}"]`);
    const actors = [...document.querySelectorAll(`[data-companion-scene="${scene}"]`)];
    const word = document.querySelector('.footer-brand-text');
    const rectangle = element => {
      const r = element.getBoundingClientRect();
      return {left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height};
    };
    const stillElements = [word, ...document.querySelectorAll('.social-icons,.social-icons a,.social-icons img,.footer-copyright')];
    const still = stillElements.map(rectangle);
    const protectedElements = [...document.querySelectorAll('.hero-ctas a,.download-content a,.preview-footer a,.footer-copyright')]
      .map(element => ({name: element.className || element.textContent.trim(), rect: rectangle(element)}));
    for (const screen of document.querySelectorAll('.hero .phone')) {
      const r = rectangle(screen);
      // These are the real content and add-button regions in the existing app
      // mockups. Transparent phone padding is deliberately not treated as UI.
      for (const [name, x1, y1, x2, y2] of [['screen-content', .125, .07, .875, .80], ['screen-add-button', .36, .825, .69, .895]]) {
        protectedElements.push({name: `${screen.className} ${name}`, rect: {
          left: r.left + r.width * x1, right: r.left + r.width * x2,
          top: r.top + r.height * y1, bottom: r.top + r.height * y2,
        }});
      }
    }
    const intersects = (a, b) => a.left < b.right - .5 && a.right > b.left + .5 && a.top < b.bottom - .5 && a.bottom > b.top + .5;
    const area = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const visible = element => {
      if (['hidden', 'collapse'].includes(getComputedStyle(element).visibility)) return false;
      for (let node = element; node instanceof Element; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.display === 'none' || +style.opacity === 0) return false;
      }
      return true;
    };
    const alphaCache = new Map();
    async function paintedPoints(element) {
      const htmlImage = element instanceof HTMLImageElement;
      const src = htmlImage ? element.currentSrc || element.src : new URL(element.href.baseVal, document.baseURI).href;
      if (!alphaCache.has(src)) {
        const image = htmlImage ? element : new Image();
        if (!htmlImage) image.src = src;
        await image.decode();
        const canvas = document.createElement('canvas');
        // Exact alpha rows prevent transparent corners of the raster body from
        // falsely colliding with UI. Articulated vectors are measured separately.
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', {willReadFrequently: true});
        context.drawImage(image, 0, 0);
        const {data} = context.getImageData(0, 0, canvas.width, canvas.height);
        const points = [];
        for (let y = 0; y < canvas.height; y += 2) {
          let first = -1, last = -1;
          for (let x = 0; x < canvas.width; x++) if (data[(y * canvas.width + x) * 4 + 3] >= 16) {
            if (first < 0) first = x;
            last = x;
          }
          if (first >= 0) points.push([first / canvas.width, y / canvas.height],
            [(last + 1) / canvas.width, Math.min(y + 2, canvas.height) / canvas.height]);
        }
        alphaCache.set(src, points);
      }
      return alphaCache.get(src);
    }
    const enclose = points => ({left: Math.min(...points.map(point => point.x)), right: Math.max(...points.map(point => point.x)),
      top: Math.min(...points.map(point => point.y)), bottom: Math.max(...points.map(point => point.y))});
    async function rasterBounds(image) {
      const points = await paintedPoints(image);
      if (image instanceof SVGImageElement) {
        const box = image.getBBox(), matrix = image.getScreenCTM();
        return enclose(points.map(([x, y]) => new DOMPoint(box.x + x * box.width, box.y + y * box.height).matrixTransform(matrix)));
      }
      const style = getComputedStyle(image), width = parseFloat(style.width), height = parseFloat(style.height);
      // Combine ancestor and actor linear transforms, then recover translation
      // from the real DOM box. This covers the retained original inside a rig.
      let matrix = new DOMMatrix();
      for (let element = image; element instanceof Element; element = element.parentElement) {
        const value = getComputedStyle(element).transform;
        matrix = (value === 'none' ? new DOMMatrix() : new DOMMatrix(value)).multiply(matrix);
      }
      const transform = (x, y) => ({x: matrix.a * x + matrix.c * y, y: matrix.b * x + matrix.d * y});
      const corners = [[0, 0], [width, 0], [width, height], [0, height]].map(([x, y]) => transform(x, y));
      const box = rectangle(image), left = box.left - Math.min(...corners.map(point => point.x)),
        top = box.top - Math.min(...corners.map(point => point.y));
      return enclose(points.map(([x, y]) => {
        const point = transform(x * width, y * height); return {x: left + point.x, y: top + point.y};
      }));
    }
    function vectorBounds(element) {
      const box = element.getBBox(), matrix = element.getScreenCTM(), style = getComputedStyle(element);
      // getBBox() excludes strokes in Chromium. Expand before transformation so
      // white line hands/arms count as painted content even outside the body.
      const stroke = style.stroke !== 'none' ? parseFloat(style.strokeWidth) / 2 : 0;
      const x = box.x - stroke, y = box.y - stroke, width = box.width + stroke * 2, height = box.height + stroke * 2;
      return enclose([[x, y], [x + width, y], [x + width, y + height], [x, y + height]]
        .map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix)));
    }
    async function paintedRect(actor) {
      if (actor instanceof HTMLImageElement) return rasterBounds(actor);
      const rasters = [...actor.querySelectorAll('img,image')].filter(visible);
      const vectors = [...actor.querySelectorAll('path,ellipse,circle,line,polyline,polygon,rect')].filter(visible)
        .filter(element => !element.closest('defs,clipPath,mask'));
      const parts = [...await Promise.all(rasters.map(rasterBounds)), ...vectors.map(vectorBounds)];
      return {left: Math.min(...parts.map(part => part.left)), right: Math.max(...parts.map(part => part.right)),
        top: Math.min(...parts.map(part => part.top)), bottom: Math.max(...parts.map(part => part.bottom))};
    }
    const problems = [], overlapCandidates = {ranca: [], cana: []}, poses = {ranca: new Set(), cana: new Set()};
    const featureStates = Object.fromEntries(['ranca', 'cana'].map(character => [character,
      Object.fromEntries(['face', 'left', 'right'].map(part => [part, new Set()]))]));
    const bodySources = {ranca: new Set(), cana: new Set()};
    const initialTimes = actors.flatMap(actor => actor.getAnimations().map(animation => ({
      duration: animation.effect.getTiming().duration, iterations: animation.effect.getTiming().iterations,
    })));
    let boundsAtStart, boundsAtEnd;
    for (let time = 0; time <= duration; time += 100) {
      root.dispatchEvent(new CustomEvent('companion:seek', {detail: {time, paused: true}}));
      await Promise.all(actors.flatMap(actor => actor.matches('img') ? [actor] : [...actor.querySelectorAll('img')])
        .map(image => image.decode().catch(() => {})));
      const current = [];
      for (const actor of actors) {
        const bounds = await paintedRect(actor), character = actor.dataset.companionCharacter;
        current.push(bounds);
        poses[character].add(actor.dataset.companionPose);
        for (const [name, selector] of [['face', '[data-companion-face]'], ['left', '[data-companion-hand=left]'], ['right', '[data-companion-hand=right]']]) {
          const part = actor.querySelector(selector);
          if (part) featureStates[character][name].add(JSON.stringify([part, ...part.querySelectorAll('*')]
            .map(element => [element.getAttribute('d'), element.getAttribute('transform'), element.getAttribute('opacity')])));
        }
        const body = actor.querySelector('[data-companion-body]');
        if (body) bodySources[character].add(body.href.baseVal);
        if (actor.dataset.companionArt !== 'native') problems.push({kind: 'placeholder-art', character, time});
        if (bounds.left < -1 || bounds.right > innerWidth + 1) problems.push({kind: 'viewport', character, time, bounds});
        for (const control of protectedElements) if (intersects(bounds, control.rect)) {
          problems.push({kind: 'control-overlap', character, time, target: control.name});
        }
        if (scene === 'hide-seek' && intersects(bounds, rectangle(word))) {
          overlapCandidates[character].push({time, area: area(bounds, rectangle(word))});
        }
        if (getComputedStyle(actor).opacity !== '1') problems.push({kind: 'crossfade', character, time});
      }
      if (scene === 'present' && current[0].left > current[1].left) problems.push({kind: 'character-order', time});
      if (JSON.stringify(stillElements.map(rectangle)) !== JSON.stringify(still)) problems.push({kind: 'stationary-layout', time});
      if (document.documentElement.scrollWidth > innerWidth + 1) problems.push({kind: 'document-overflow', time});
      if (time === 0) boundsAtStart = current;
      if (time === duration) boundsAtEnd = current;
    }
    const loopDelta = Math.max(...boundsAtStart.flatMap((bounds, i) => Object.keys(bounds)
      .map(key => Math.abs(bounds[key] - boundsAtEnd[i][key]))));
    return {samples: duration / 100 + 1, problems, loopDelta, animations: initialTimes,
      poses: Object.fromEntries(Object.entries(poses).map(([key, values]) => [key, [...values]])),
      featureVariants: Object.fromEntries(Object.entries(featureStates).map(([character, parts]) =>
        [character, Object.fromEntries(Object.entries(parts).map(([part, values]) => [part, values.size]))])),
      bodySourceCounts: Object.fromEntries(Object.entries(bodySources).map(([character, values]) => [character, values.size])),
      overlapCandidates: Object.fromEntries(Object.entries(overlapCandidates).map(([key, values]) =>
        [key, values.sort((a, b) => b.area - a.area).slice(0, 6)]))};
  }, {scene, duration: scenes[scene]});
}

async function checkWordmarkOcclusion(page, lang, width, candidates) {
  const styles = await page.locator('.footer-brand-text').evaluate(element => {
    const style = getComputedStyle(element);
    return {color: style.color, opacity: style.opacity, background: style.backgroundColor,
      backgroundImage: style.backgroundImage, mask: style.maskImage, clip: style.clipPath,
      z: +style.zIndex, children: element.children.length,
      pseudo: ['::before', '::after'].map(pseudo => getComputedStyle(element, pseudo).content),
      actors: [...document.querySelectorAll('[data-companion-scene="hide-seek"]')].map(actor => +getComputedStyle(actor).zIndex)};
  });
  assert.equal(styles.opacity, '1', 'the foreground glyphs are opaque');
  assert.equal(styles.color, 'rgb(183, 183, 183)', 'preserve original .32-opacity #1e1e1e appearance on white');
  assert.equal(styles.background, 'rgba(0, 0, 0, 0)', 'no rectangular wordmark cover');
  assert.equal(styles.backgroundImage, 'none');
  assert.equal(styles.mask, 'none');
  assert.equal(styles.clip, 'none');
  assert.equal(styles.children, 0, 'the original real text node remains intact');
  assert.ok(styles.pseudo.every(content => content === 'none' || content === 'normal'), 'no cloned letter/rectangle overlay');
  assert.ok(Number.isFinite(styles.z) && styles.actors.every(z => Number.isFinite(z) && styles.z > z), 'real glyphs are stacked in front of both actors');
  const results = [];
  for (const character of ['ranca', 'cana']) {
    assert.ok(candidates[character].length, `${character} must actually enter the wordmark area during hide-and-seek`);
    let best;
    // The largest geometric overlap generally gives solid glyph intersections.
    // A second nearby pose avoids a false failure caused by a transparent hand.
    for (const candidate of candidates[character].filter((_, i) => i % 2 === 0).slice(0, 3)) {
      await seek(page, 'hide-seek', candidate.time);
      const row = page.locator(rootSelector('hide-seek'));
      const images = [];
      const original = await page.locator(`${actorSelector('hide-seek')},.footer-brand-text`).evaluateAll(elements =>
        elements.map(element => element.getAttribute('style')));
      try {
        // Isolate each actor to prove both characters pass behind the actual
        // glyphs, rather than accepting a successful overlap by only one.
        await page.locator(actorSelector('hide-seek')).evaluateAll((elements, character) => {
          for (const element of elements) element.style.opacity = element.dataset.companionCharacter === character ? '1' : '0';
        }, character);
        images.push(await row.screenshot()); // actor + letters
        await page.locator(actorSelector('hide-seek')).evaluateAll(elements => elements.forEach(element => element.style.opacity = '0'));
        images.push(await row.screenshot()); // letters only
        await page.locator('.footer-brand-text').evaluate(element => element.style.visibility = 'hidden');
        images.push(await row.screenshot()); // background only
        await page.locator(`${actorSelector('hide-seek')}[data-companion-character="${character}"]`).evaluate(element => element.style.opacity = '1');
        images.push(await row.screenshot()); // actor only
      } finally {
        await page.locator(`${actorSelector('hide-seek')},.footer-brand-text`).evaluateAll((elements, original) => {
          elements.forEach((element, i) => original[i] === null ? element.removeAttribute('style') : element.setAttribute('style', original[i]));
        }, original);
      }
      const wordArea = await page.locator('.footer-brand-text').evaluate(element => {
        const word = element.getBoundingClientRect(), row = element.closest('.footer-brand-row').getBoundingClientRect();
        return {left: word.left - row.left, right: word.right - row.left, top: word.top - row.top, bottom: word.bottom - row.top};
      });
      const pixels = await page.evaluate(async ({encoded, wordArea}) => {
        let pixelWidth, pixelHeight;
        const pictures = await Promise.all(encoded.map(async source => {
          const image = new Image(); image.src = `data:image/png;base64,${source}`; await image.decode();
          pixelWidth = image.width; pixelHeight = image.height;
          const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
          const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
          return context.getImageData(0, 0, image.width, image.height).data;
        }));
        const [actual, word, background, actor] = pictures;
        const difference = (a, b, i) => Math.max(...[0, 1, 2].map(channel => Math.abs(a[i + channel] - b[i + channel])));
        const neighborhood = (x, y, test) => {
          if (x < 1 || y < 1 || x >= pixelWidth - 1 || y >= pixelHeight - 1) return false;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!test(((y + dy) * pixelWidth + x + dx) * 4)) return false;
          }
          return true;
        };
        let hiddenByGlyph = 0, wrongGlyph = 0, visibleInGap = 0, wrongGap = 0;
        const mismatches = [];

        for (let i = 0; i < actual.length; i += 4) {
          const x = (i / 4) % pixelWidth, y = Math.floor(i / 4 / pixelWidth);
          // Count only pixels INSIDE the real text box. Actor pixels outside
          // the lettering cannot falsely satisfy the transparent-gap test.
          if (x <= wordArea.left + 1 || x >= wordArea.right - 1 || y <= wordArea.top + 1 || y >= wordArea.bottom - 1) continue;
          if (difference(actor, background, i) < 12) continue;
          // Baseline gray184 is not opaque: it can be a ~98.6%-covered
          // antialiased edge over white. A colored actor correctly UNDER that
          // edge can change it by >3 levels. Prove occlusion only inside a 3x3
          // neighborhood of exact opaque gray183, and gap visibility only away
          // from glyph edges. Keep the pixel comparison tolerance unchanged.
          const solidGlyph = neighborhood(x, y, j => [0, 1, 2].every(channel => word[j + channel] === 183));
          const clearGap = neighborhood(x, y, j => difference(word, background, j) <= 1);
          if (solidGlyph) {
            hiddenByGlyph++;
            if (difference(actual, word, i) > 3) {
              wrongGlyph++;
              if (mismatches.length < 20) mismatches.push({kind: 'glyph', x, y,
                actual: [...actual.slice(i, i + 3)], expected: [...word.slice(i, i + 3)]});
            }
          }
          if (clearGap) {
            visibleInGap++;
            if (difference(actual, actor, i) > 3) {
              wrongGap++;
              if (mismatches.length < 20) mismatches.push({kind: 'gap', x, y,
                actual: [...actual.slice(i, i + 3)], expected: [...actor.slice(i, i + 3)]});
            }
          }
        }
        return {hiddenByGlyph, wrongGlyph, visibleInGap, wrongGap, mismatches};
      }, {encoded: images.map(buffer => buffer.toString('base64')), wordArea});
      best = {character, time: candidate.time, ...pixels};
      if (pixels.hiddenByGlyph < 3 || pixels.visibleInGap < 3 ||
          pixels.wrongGlyph > Math.max(1, pixels.hiddenByGlyph * .015) ||
          pixels.wrongGap > Math.max(1, pixels.visibleInGap * .015)) {
        // Retain all inputs on failure so a genuine z-order/mask regression can
        // be distinguished from rasterization without loosening the assertion.
        for (const [index, layer] of ['actual', 'word', 'background', 'actor'].entries()) {
          await fs.writeFile(path.join(out, `${lang}-${width}-occlusion-${character}-${candidate.time}-${layer}.png`), images[index]);
        }
        await fs.writeFile(path.join(out, `${lang}-${width}-occlusion-${character}-${candidate.time}-pixels.json`), JSON.stringify(best, null, 2));
      }
      if (pixels.hiddenByGlyph >= 3 && pixels.visibleInGap >= 3) {
        await fs.writeFile(path.join(out, `${lang}-${width}-occlusion-${character}.png`), images[0]);
        break;
      }
    }
    assert.ok(best.hiddenByGlyph >= 3, `${lang}/${width}/${character}: must be hidden by actual glyph interiors: ${JSON.stringify(best)}`);
    assert.ok(best.visibleInGap >= 3, `${lang}/${width}/${character}: must remain visible through letter gaps`);
    assert.ok(best.wrongGlyph <= Math.max(1, best.hiddenByGlyph * .015), `actor rendered over foreground glyphs: ${JSON.stringify(best)}`);
    assert.ok(best.wrongGap <= Math.max(1, best.visibleInGap * .015), `a solid mask incorrectly covered letter gaps: ${JSON.stringify(best)}`);
    results.push(best);
  }
  return results;
}

async function animationSnapshot(page, scene) {
  return page.locator(actorSelector(scene)).evaluateAll(elements => elements.flatMap(element => element.getAnimations()
    .map(animation => ({time: animation.currentTime, state: animation.playState}))));
}
async function featureSnapshot(page, scene) {
  return page.locator(actorSelector(scene)).evaluateAll(elements => elements.map(element =>
    [...element.querySelectorAll('svg path,svg g,svg image')].map(part => [part.tagName,
      part.getAttribute('d'), part.getAttribute('transform'), part.getAttribute('opacity'), part.getAttribute('href')])));
}
async function checkLifecycle(page, scene, label) {
  await resume(page, scene);
  await seek(page, scene, 3700);
  await resume(page, scene);
  await page.waitForTimeout(100);
  for (const kind of ['offscreen', 'hidden', 'pagehide']) {
    if (kind === 'offscreen') {
      await page.evaluate(() => document.querySelector('#features').scrollIntoView({behavior: 'instant', block: 'center'}));
    } else if (kind === 'hidden') {
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', {configurable: true, value: true}); document.dispatchEvent(new Event('visibilitychange')); });
    } else {
      await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pagehide', {persisted: true})));
    }
    await page.waitForFunction(() => [...document.querySelectorAll('[data-companion-scene]')]
      .every(element => element.dataset.companionMotion === 'paused'));
    const paused = await animationSnapshot(page, scene);
    const pausedFeatures = await featureSnapshot(page, scene);
    assert.equal(paused.length, 2);
    assert.ok(paused.every(animation => animation.state === 'paused'));
    await page.waitForTimeout(170);
    const still = await animationSnapshot(page, scene);
    assert.deepEqual(await featureSnapshot(page, scene), pausedFeatures, `${kind}: all articulated feature paths must freeze with the scene`);
    still.forEach((animation, i) => assert.ok(Math.abs(animation.time - paused[i].time) < 1, `${kind}: native clock must stop`));
    if (kind === 'offscreen') await reveal(page, scene);
    else if (kind === 'hidden') await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    else await page.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true})));
    await page.waitForFunction(which => [...document.querySelectorAll(`[data-companion-scene="${which}"]`)]
      .every(element => element.dataset.companionMotion === 'playing'), scene);
    await page.waitForTimeout(100);
    const resumed = await animationSnapshot(page, scene);
    resumed.forEach((animation, i) => {
      assert.ok(animation.time > paused[i].time + 20, `${kind}: native clock advances after resume`);
      assert.ok(animation.time < paused[i].time + 1500, `${kind}: resumes retained progress without reset/hidden-time jump`);
    });
    report.lifecycle.push({label, scene, kind, paused: true, resumed: true});
  }
}
async function checkReducedMotion(page, scene) {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.waitForFunction(() => [...document.querySelectorAll('[data-companion-scene]')].every(element =>
    element.dataset.companionMotion === 'reduced' && element.getAnimations({subtree: true}).length === 0));
  const snapshot = () => page.locator(allActors).evaluateAll(elements => elements.map(element => {
    const original = element.matches('img') ? element : element.querySelector('img[data-companion-original]');
    return {character: element.dataset.companionCharacter, src: new URL(original.currentSrc || original.src).pathname,
      rect: element.getBoundingClientRect().toJSON(), transform: getComputedStyle(element).transform,
      loaded: original.complete && original.naturalWidth > 0, opacity: getComputedStyle(element).opacity,
      originalVisible: getComputedStyle(original).visibility === 'visible',
      svgHidden: [...element.querySelectorAll('svg')].every(svg => getComputedStyle(svg).visibility === 'hidden'),
    };
  }));
  const before = await snapshot();
  for (const actor of before) {
    assert.equal(actor.src, `/assets/mascots/${actor.character}-cloud.webp`, 'reduced motion restores exact original art');
    assert.ok(actor.loaded && actor.originalVisible && actor.svgHidden); assert.equal(actor.opacity, '1');
    assert.ok(actor.transform === 'none' || actor.transform === 'matrix(1, 0, 0, 1, 0, 0)', 'reduced motion returns to neutral');
  }
  await page.waitForTimeout(170);
  assert.deepEqual(await snapshot(), before, 'reduced-motion artwork remains stable');
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await reveal(page, scene);
}

async function checkResizeContinuity(lang) {
  const {page, errors} = await openPage(lang, 393);
  try {
    await reveal(page, 'hide-seek'); await seek(page, 'hide-seek', 8700);
    for (const width of [1440, 320, 900, 393]) {
      const before = await animationSnapshot(page, 'hide-seek');
      await page.setViewportSize({width, height: 1000});
      await page.waitForTimeout(100);
      const after = await animationSnapshot(page, 'hide-seek');
      assert.equal(after.length, 2, 'resize must not accumulate duplicate animations');
      after.forEach((animation, i) => assert.ok(Math.abs(animation.time - before[i].time) < 1, 'resize preserves held clock'));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
}

async function checkFailures(lang, width) {
  assert.ok(bodyAssets.size >= 2, 'normal-page verification must discover both repaired-body asset URLs');
  const page = await browser.newPage({viewport: {width, height: 1000}}), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://**/*', route => route.abort());
  let failedRequests = 0;
  for (const source of bodyAssets) await page.route(`${origin}${source}`, route => { failedRequests++; return route.abort(); });
  try {
    await page.goto(`${origin}/${lang}/`); await settle(page);
    assert.ok(await page.locator('[data-companion-scene-root]').evaluateAll(elements =>
      elements.every(element => element.dataset.companionAssets === 'partial')),
    'failed body preparation is reported as partial rather than ready');
    for (const scene of Object.keys(scenes)) {
      await reveal(page, scene);
      for (const time of [0, 2400, 5700, 9100, scenes[scene] - 100]) await seek(page, scene, time);
      await verifyArtwork(page, {requireRig: false});
      assert.ok(await page.locator(actorSelector(scene)).evaluateAll(elements => elements.every(element =>
        element.dataset.companionArt === 'fallback')),
      'failed optional native body falls back safely to the intact original');
      await resume(page, scene);
    }
    assert.ok(failedRequests > 0, 'the test must actually fail repaired-body network requests');
    assert.deepEqual(errors, []);
    report.failures.push({lang, width, kind: 'native-body-assets', failedRequests, safeOriginalFallback: true});
  } finally { await page.close(); }

  // Module loss must also be harmless, including the worst case in which the
  // original image is unavailable: hide only that failed decoration, retain its
  // layout slot and keep the other mascot, lettering and controls usable.
  const missing = await browser.newPage({viewport: {width, height: 1000}}), missingErrors = [];
  missing.on('pageerror', error => missingErrors.push(error.message));
  await missing.route('https://**/*', route => route.abort());
  await missing.route('**/companion-art.js*', route => route.abort());
  await missing.route('**/assets/mascots/ranca-cloud.webp', route => route.abort());
  await missing.route(`${origin}/${lang}/`, async route => {
    const html = (await fs.readFile(path.join(root, lang, 'index.html'), 'utf8'))
      .replace(/<script\b[^>]*\bid=["']companion-pose-manifest["'][^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/\sdata-companion-poses=["'][^"']*["']/g, '');
    await route.fulfill({contentType: 'text/html', body: html});
  });
  try {
    await missing.goto(`${origin}/${lang}/`); await settle(missing);
    const failed = await missing.locator(`${allActors}[data-companion-character="ranca"]`).evaluateAll(elements =>
      elements.map(element => ({visible: getComputedStyle(element).visibility, width: element.getBoundingClientRect().width})));
    assert.equal(failed.length, 2);
    assert.ok(failed.every(actor => actor.visible === 'hidden' && actor.width > 0), 'failed decoration hidden without collapsing layout');
    assert.ok(await missing.locator(`${allActors}[data-companion-character="cana"]`).evaluateAll(elements =>
      elements.every(element => element.complete && element.naturalWidth > 0 && getComputedStyle(element).visibility !== 'hidden')));
    assert.equal(await missing.locator('.footer-brand-text').textContent(), 'Rancana');
    assert.ok(await missing.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.deepEqual(missingErrors, []);
    report.failures.push({lang, width, kind: 'module-and-original-image', failedDecorationHidden: true});
  } finally { await missing.close(); }
}


async function checkInitialReducedAndUnsupported(lang) {
  for (const mode of ['reduced', 'unsupported']) {
    const page = await browser.newPage({viewport: {width: 393, height: 852},
      reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference'}), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**/*', route => route.abort());
    if (mode === 'unsupported') await page.addInitScript(() => { delete window.IntersectionObserver; });
    try {
      await page.goto(`${origin}/${lang}/`); await settle(page);
      for (const scene of Object.keys(scenes)) {
        await page.locator(rootSelector(scene)).scrollIntoViewIfNeeded();
        const states = await page.locator(allActors).evaluateAll(elements => elements.map(element => {
          const original = element.matches('img') ? element : element.querySelector('img[data-companion-original]');
          return {state: element.dataset.companionMotion, src: new URL(original.currentSrc || original.src).pathname,
            original: `/assets/mascots/${element.dataset.companionCharacter}-cloud.webp`,
            animations: element.getAnimations({subtree: true}).length, transform: getComputedStyle(element).transform};
        }));
        assert.ok(states.every(state => state.state === mode && state.src === state.original && state.animations === 0),
          `${mode} on initial load must show stable originals without starting a clock`);
        assert.ok(states.every(state => state.transform === 'none' || state.transform === 'matrix(1, 0, 0, 1, 0, 0)'));
      }
      await verifyArtwork(page, {requireRig: false}); assert.deepEqual(errors, []);
      report.lifecycle.push({label: `${lang}/393`, kind: `initial-${mode}`, originalsStable: true});
    } finally { await page.close(); }
  }
}

async function checkHeaderIsolation(lang, width) {
  // The existing header has its own animation controller. Compare its exact
  // reduced-motion rest state, not screenshots taken at different gesture times.
  const pages = [];
  try {
    for (const enabled of [true, false]) {
      const page = await browser.newPage({viewport: {width, height: 1000}, reducedMotion: 'reduce'}), errors = [];
      pages.push({page, enabled, errors});
      page.on('pageerror', error => errors.push(error.message));
      await page.route('https://**/*', route => route.abort());
      if (!enabled) {
        await page.route('**/companion-motion.css*', route => route.fulfill({contentType: 'text/css', body: ''}));
        for (const script of ['companion-motion', 'companion-art']) {
          await page.route(`**/${script}.js*`, route => route.fulfill({contentType: 'text/javascript', body: ''}));
        }
      }
      await page.goto(`${origin}/${lang}/`);
      await page.evaluate(async () => {
        await document.fonts.ready;
        for (const image of document.images) image.loading = 'eager';
        await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
      });
      const reject = page.locator('[data-consent-reject]');
      if (await reject.isVisible()) await reject.click();
      await page.waitForFunction(() => !!document.querySelector('.site-header .brand-mark svg'));
      if (enabled) await page.waitForFunction(() => [...document.querySelectorAll('[data-companion-scene-root]')]
        .every(element => element.dataset.companionAssets && element.dataset.companionAssets !== 'loading'));
    }
    for (const state of ['top', 'sticky']) {
      const captures = [];
      for (const {page, enabled, errors} of pages) {
        await page.evaluate(sticky => {
          scrollTo({top: sticky ? 700 : 0, behavior: 'instant'});
        }, state === 'sticky');
        await page.waitForFunction(sticky => document.querySelector('.site-header').classList.contains('is-sticky') === sticky,
          state === 'sticky');
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const snapshot = await page.locator('.site-header').evaluate(header => ({
          scroll: {x: scrollX, y: scrollY},
          html: header.outerHTML,
          nodes: [header, ...header.querySelectorAll('*')].map(element => {
            const style = getComputedStyle(element);
            return {tag: element.tagName, rect: element.getBoundingClientRect().toJSON(),
              style: Object.fromEntries([...style].map(property => [property, style.getPropertyValue(property)]))};
          }),
          animations: header.getAnimations({subtree: true}).length,
        }));
        assert.equal(snapshot.animations, 0, 'header A/B uses the same reduced-motion rest state');
        assert.deepEqual(errors, []);
        const screenshot = await page.locator('.site-header').screenshot();
        const icon = await page.locator('.site-header .brand-mark').screenshot();
        // The header's bounding rectangle includes transparent margins. In the
        // sticky state these can reveal the deliberately repositioned HERO
        // companions below it. That is page-backdrop content, not header pixels.
        // Preserve the real-page capture and compare the actual opaque icon,
        // then isolate the whole unchanged header against an identical backdrop.
        // This screenshot-only style never changes production DOM/styles.
        const isolated = await page.locator('.site-header').screenshot({style:
          'html, body { background: #fff !important; } body * { visibility: hidden !important; } .site-header, .site-header * { visibility: visible !important; }'});
        const prefix = `header-isolation-${lang}-${width}-${state}-${enabled ? 'enabled' : 'blocked'}`;
        await fs.writeFile(path.join(out, `${prefix}.png`), screenshot);
        await fs.writeFile(path.join(out, `${prefix}-icon.png`), icon);
        await fs.writeFile(path.join(out, `${prefix}-same-backdrop.png`), isolated);
        captures.push({snapshot, screenshot, icon, isolated, prefix});
      }
      // Save structured diagnostic input as well if a selector/style unexpectedly
      // leaks into the header, before throwing away the comparison context.
      if (JSON.stringify(captures[0].snapshot) !== JSON.stringify(captures[1].snapshot)) {
        for (const capture of captures) await fs.writeFile(path.join(out, `${capture.prefix}.json`), JSON.stringify(capture.snapshot, null, 2));
      }
      assert.deepEqual(captures[0].snapshot, captures[1].snapshot,
        `${lang}/${width}/${state}: companion code must not change header DOM, computed styles, geometry or scroll`);
      assert.ok(captures[0].icon.equals(captures[1].icon),
        `${lang}/${width}/${state}: actual header icon pixels must be identical with companion code enabled vs blocked`);
      assert.ok(captures[0].isolated.equals(captures[1].isolated),
        `${lang}/${width}/${state}: same-state header must be pixel-identical on the same backdrop`);
      report.headerIsolation.push({lang, width, state, sameDOM: true, sameStylesAndBounds: true,
        identicalIconPixels: true, identicalSameBackdropPixels: true,
        identicalPageBackdropPixels: captures[0].screenshot.equals(captures[1].screenshot),
        iconSha256: crypto.createHash('sha256').update(captures[0].icon).digest('hex'),
        sameBackdropSha256: crypto.createHash('sha256').update(captures[0].isolated).digest('hex')});
    }
  } finally { await Promise.all(pages.map(({page}) => page.close())); }
}

async function captureFooterStoryBeats() {
  const beats = [
    {time: 3000, name: 'green-search-pink-peek', poses: ['search', 'peek']},
    {time: 6500, name: 'found-together', poses: ['found', 'found']},
    {time: 10500, name: 'green-duck-pink-count', poses: ['duck', 'cover']},
    {time: 14500, name: 'pink-search-green-peek', poses: ['peek', 'search']},
  ];
  report.storyBeats = [];
  for (const [label, width, height] of [['mobile', 393, 852], ['desktop', 1440, 1000]]) {
    const {page, errors} = await openPage('id', width, {height});
    try {
      await reveal(page, 'hide-seek');
      for (const beat of beats) {
        await seek(page, 'hide-seek', beat.time);
        const prefix = `${label}-story-${beat.time}-${beat.name}`;
        await page.screenshot({path: path.join(out, `${prefix}.png`)});
        const region = await page.locator(rootSelector('hide-seek')).evaluate(element => {
          const box = element.getBoundingClientRect();
          const top = Math.max(0, box.top - 160), left = Math.max(0, box.left);
          return {x: left, y: top, width: Math.min(innerWidth - left, box.width),
            height: Math.min(innerHeight, box.bottom + 16) - top};
        });
        await page.screenshot({path: path.join(out, `${prefix}-detail.png`), clip: region});
        const poses = await page.locator(actorSelector('hide-seek')).evaluateAll(elements =>
          elements.map(element => element.dataset.companionPose));
        report.storyBeats.push({label, width, time: beat.time, name: beat.name, poses, file: `${prefix}.png`});
        assert.deepEqual(poses, beat.poses, `${prefix}: requested held story beat`);
      }
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  }
}

async function recordNaturalVideo(label, width, height, scene) {
  const context = await browser.newContext({viewport: {width, height}, reducedMotion: 'no-preference',
    recordVideo: {dir: out, size: {width, height}}});
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const video = page.video();
  try {
    await page.route('https://**/*', route => route.abort());
    await page.goto(`${origin}/id/`); await settle(page); await reveal(page, scene);
    // No time seeking, forced poses, speed changes, or test UI in these videos.
    // Twenty seconds includes one whole 18-second hide-and-seek cycle.
    const started = Date.now();
    const before = await animationSnapshot(page, scene);
    await page.waitForTimeout(5000);
    await page.screenshot({path: path.join(out, `${label}-${scene}.png`)});
    await page.waitForTimeout(Math.max(0, 20000 - (Date.now() - started)));
    const after = await animationSnapshot(page, scene);
    assert.ok(after.every((animation, i) => animation.state === 'running' && animation.time - before[i].time >= 19500),
      'recording contains at least 20 seconds of natural, unpaused playback');
    assert.deepEqual(errors, []);
    await verifyArtwork(page);
    report.videos.push({label, scene, width, height, naturalPlaybackMs: Date.now() - started,
      file: `${label}-${scene}.webm`});
  } finally {
    await page.close(); await context.close();
    await video.saveAs(path.join(out, `${label}-${scene}.webm`));
    await video.delete(); // Keep the named review copy, not a duplicate random filename.
  }
}

try {
  browser = await chromium.launch({args: ['--no-sandbox'], ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? {executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH} : {})});
  await captureFooterStoryBeats();
  if (process.argv.includes('--storyboard-only')) {
    report.storyboardOnly = true;
    await fs.writeFile(path.join(out, 'storyboard-report.json'), JSON.stringify(report.storyBeats, null, 2));
    await browser.close();
    await new Promise(resolve => server.close(resolve));
    console.log('Captured actual-page story poses; full motion QA is a separate step.');
    process.exit(0);
  }
  for (const [label, width, height] of [['mobile', 393, 852], ['desktop', 1440, 1000]]) {
    for (const scene of Object.keys(scenes)) await recordNaturalVideo(label, width, height, scene);
  }
  for (const lang of ['id', 'en']) for (const width of [320, 393, 1440]) await checkHeaderIsolation(lang, width);
  for (const lang of ['id', 'en']) for (const width of widths) {
    const {page, errors} = await openPage(lang, width);
    try {
      const artwork = await verifyArtwork(page);
      if (process.env.COMPANION_REQUIRE_POSES === '1') assert.ok(artwork.every(actor => actor.art === 'native'),
        'CI final-art gate: all four actors require native body, face and hand articulation, with no placeholder');
      for (const scene of Object.keys(scenes)) {
        await reveal(page, scene);
        const geometry = await sampleGeometry(page, scene);
        const entry = {lang, width, scene, artwork: artwork.filter(actor => actor.scene === scene), ...geometry};
        report.responsive.push(entry);
        assert.equal(geometry.animations.length, 2, 'exactly one transform animation per actor');
        assert.ok(geometry.animations.every(animation => animation.duration === scenes[scene] && animation.iterations === Infinity), 'documented shared scene duration');
        assert.deepEqual(geometry.problems.slice(0, 20), [], `${lang}/${width}/${scene}: painted artwork must clear app UI and controls`);
        assert.ok(geometry.loopDelta < 1, `${scene}: exact neutral start/end without a wrap jump`);
        assert.ok(Object.values(geometry.poses).every(poses => poses.length > 1), 'choreography must advance through multiple pose states');
        for (const [character, parts] of Object.entries(geometry.featureVariants)) {
          assert.ok(parts.face > 1, `${scene}/${character}: facial geometry must change independently`);
          assert.ok(parts.right > 1, `${scene}/${character}: presenting/searching hand must articulate`);
          if (scene === 'hide-seek') assert.ok(parts.left > 1, `${scene}/${character}: covering hand must articulate`);
        }
        assert.ok(Object.values(geometry.bodySourceCounts).every(count => count === 1), 'same raster body throughout, no whole-body pose replacements');
        if (scene === 'hide-seek') entry.occlusion = await checkWordmarkOcclusion(page, lang, width, geometry.overlapCandidates);
        await seek(page, scene, scene === 'present' ? 2200 : 5700);
        await page.screenshot({path: path.join(out, `${lang}-${width}-${scene}-bounds.png`)});
        await checkLifecycle(page, scene, `${lang}/${width}`);
        await checkReducedMotion(page, scene);
        await verifyArtwork(page);
      }
      assert.deepEqual(errors, []);
    } finally { await page.close(); }
  }
  for (const lang of ['id', 'en']) {
    await checkResizeContinuity(lang);
    await checkInitialReducedAndUnsupported(lang);
    for (const width of [393, 1440]) await checkFailures(lang, width);
  }
  report.complete = true;
  report.nativeArtReady = report.responsive.every(entry => entry.artwork.every(actor => actor.art === 'native'));
  console.log('PASS: original hashes; 24 responsive ID/EN scenes; painted UI/control clearance; real foreground glyph occlusion and visible gaps; stationary wordmark/socials; lifecycle pause/resume; reduced-motion originals; safe asset failures; four 20-second natural recordings.');
  assert.equal(report.nativeArtReady, true, 'the final-art gate rejects placeholder choreography');
} finally {
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
