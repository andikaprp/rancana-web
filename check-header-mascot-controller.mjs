import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

// Deterministic controller coverage; actual markup, layout and artwork are checked
// in check-header-mascot.mjs. Only the intact mascot may own a WAAPI animation.
const code = await readFile(new URL('shared-nav.js', import.meta.url), 'utf8');
const pageProfiles = {
 index: ['welcome', 'study', 'cards', 'confidence', 'download', 'question'],
 about: ['welcome', 'purpose', 'contact'],
 help: ['welcome', 'study', 'start', 'question', 'contact'],
 premium: ['purpose', 'cards', 'compare', 'download', 'restore', 'question'],
 articles: ['study', 'calendar', 'task', 'flip'],
 'college-schedule': ['calendar', 'study', 'start', 'example', 'edit', 'question', 'cards', 'download'],
 'todo-guide': ['task', 'study', 'edit', 'example', 'confidence', 'question', 'cards', 'download'],
 'flashcard-guide': ['cards', 'study', 'edit', 'flip', 'question', 'example', 'next', 'download'],
 privacy: ['privacy', 'account', 'cloud', 'contact', 'payment', 'backup', 'diagnostics', 'privacy', 'delete', 'contact'],
 terms: ['document', 'cards', 'account', 'payment', 'fairness', 'edit', 'privacy', 'contact'],
 'delete-account': ['delete', 'document', 'cloud', 'contact']
};

function createHarness({pathname = '/id/', count = 6, initialSection = 0, height = 1080,
 initialReduced = false, initialHidden = false, initialVisible = true, notifyInitially = true} = {}) {
 let now = 0, nextTimer = 1, sectionSelector;
 const timers = new Map(), observers = [], motions = [], active = new Set();
 const createdNodes = [], insertions = [], textWrites = [];
 const events = new Map(), documentEvents = new Map();
 const on = (map, name, callback) => map.set(name, [...(map.get(name) || []), callback]);
 const emit = (map, name) => (map.get(name) || []).forEach(callback => callback());
 const setTimer = (callback, delay) => {
  const id = nextTimer++;
  timers.set(id, {callback, at: now + Math.max(0, delay)});
  return id;
 };
 const makeElement = (tagName, name = tagName, initialText = '') => {
  const listeners = new Map();
  const element = {
   tagName, name, dataset: {}, attributes: {}, children: [], top: 0,
   setAttribute(key, value) { this.attributes[key] = value; },
   append(...children) { insertions.push({element: name, method: 'append', children}); this.children.push(...children); },
   appendChild(child) { this.append(child); return child; },
   prepend(...children) { insertions.push({element: name, method: 'prepend', children}); this.children.unshift(...children); },
   after(sibling) { insertions.push({element: name, method: 'after', sibling}); this.nextElementSibling = sibling; sibling.previousElementSibling = this; },
   before(sibling) { insertions.push({element: name, method: 'before', sibling}); this.previousElementSibling = sibling; },
   insertAdjacentElement(position, child) { insertions.push({element: name, method: 'insertAdjacentElement', position, child}); },
   insertAdjacentHTML(position, value) { textWrites.push({element: name, property: 'insertAdjacentHTML', position, value}); },
   insertAdjacentText(position, value) { textWrites.push({element: name, property: 'insertAdjacentText', position, value}); },
   getBoundingClientRect() { return {top: this.top, bottom: this.top + 700, height: 700}; },
   addEventListener: (name, callback) => on(listeners, name, callback),
   emit: name => emit(listeners, name),
   matches: selector => selector === '.article-card' && name.startsWith('section-') && Number(name.slice(8)) >= 1,
   animate(frames, options) {
    assert.equal(name, 'mascot', 'only the full mascot animates; the wordmark and other header elements stay still');
    assert.equal([...active].filter(animation => animation.element === this).length, 0,
     `${name} animations never overlap on the same element`);
    const motion = {element: name, time: now, frames: JSON.parse(JSON.stringify(frames)),
     options: JSON.parse(JSON.stringify(options)), duration: options.duration,
     behavior: mascot.dataset.rancaBehavior,
     kind: mascot.dataset.rancaMotion, cancelled: false};
    motions.push(motion);
    let resolve, reject, finished, state = 'running';
    const animation = {element: this,
     // Model the platform's lazily accessed finished promise so cancellation
     // does not invent an unobserved rejection.
     get finished() {
      if (!finished) finished = new Promise((yes, no) => {
       resolve = yes; reject = no;
       if (state === 'finished') yes();
       if (state === 'cancelled') no(new Error('cancelled'));
      });
      return finished;
     },
     cancel() {
      if (state === 'cancelled') return;
      state = 'cancelled'; motion.cancelled = true;
      timers.delete(endTimer); active.delete(animation); reject?.(new Error('cancelled'));
     }
    };
    const endTimer = setTimer(() => {
     state = 'finished'; active.delete(animation); resolve?.();
    }, options.duration);
    active.add(animation);
    return animation;
   }
  };
  for (const property of ['textContent', 'innerText', 'innerHTML', 'outerHTML']) {
   let value = initialText;
   Object.defineProperty(element, property, {
    get: () => value,
    set: next => { textWrites.push({element: name, property, value: next}); value = next; }
   });
  }
  return element;
 };
 const mascot = makeElement('span', 'mascot');
 const wordmark = makeElement('span', 'wordmark', 'Rancana');
 const brand = makeElement('a', 'brand');
 const header = makeElement('header', 'header');
 brand.children = [mascot, wordmark]; header.children = [brand];
 mascot.nextElementSibling = wordmark; wordmark.previousElementSibling = mascot;
 mascot.parentElement = brand; wordmark.parentElement = brand; brand.parentElement = header;
 const headerElement = selector => {
  if (selector.endsWith('.brand-mark')) return mascot;
  if (selector.endsWith('.brand-name')) return wordmark;
  if (selector.endsWith('.brand')) return brand;
  if (selector === '.site-header') return header;
  return null;
 };
 for (const element of [mascot, wordmark, brand, header]) {
  element.querySelector = headerElement;
  element.querySelectorAll = selector => selector.split(',').map(value => headerElement(value.trim())).filter(Boolean);
 }
 const assertMascotOnly = () => {
  assert.deepEqual(createdNodes, [], 'the controller creates no side icons or other nodes');
  assert.deepEqual(insertions, [], 'the controller inserts no side nodes');
  assert.deepEqual(textWrites, [], 'the controller injects no status text or HTML');
  assert.equal(mascot.children.length, 0, 'the approved full mascot is not redrawn or replaced');
  assert.equal(mascot.nextElementSibling, wordmark, 'the wordmark remains directly after the mascot');
  assert.deepEqual(brand.children, [mascot, wordmark], 'the original brand structure is preserved');
  assert.equal(wordmark.textContent, 'Rancana', 'the wordmark text is unchanged');
  assert.equal(motions.filter(motion => motion.element === 'wordmark').length, 0, 'the wordmark never animates');
  assert.ok(motions.every(motion => motion.element === 'mascot'), 'every motion belongs only to the mascot');
 };
 const sections = Array.from({length: count}, (_, index) => {
  const section = makeElement('section', `section-${index}`);
  section.id = `section-${index}`; section.top = index * 800;
  return section;
 });
 const reduced = {matches: initialReduced,
  addEventListener: (name, callback) => on(events, `reduced:${name}`, callback)};
 const document = {
  hidden: initialHidden,
  querySelector: headerElement,
  querySelectorAll: selector => {
   if (!selector.includes('main')) return selector.split(',').map(value => headerElement(value.trim())).filter(Boolean);
   sectionSelector = selector; return sections;
  },
  createElement: tag => { const element = makeElement(tag); createdNodes.push(element); return element; },
  createElementNS: (namespace, tag) => { const element = makeElement(tag); element.namespaceURI = namespace; createdNodes.push(element); return element; },
  createTextNode: value => { const element = makeElement('#text', '#text', value); createdNodes.push(element); return element; },
  addEventListener: (name, callback) => on(documentEvents, name, callback)
 };
 const context = {
  window: {IntersectionObserver: true}, document, innerHeight: height, location: {pathname},
  performance: {now: () => now}, matchMedia: () => reduced,
  setTimeout: setTimer, clearTimeout: id => timers.delete(id),
  requestAnimationFrame: callback => setTimer(callback, 16), cancelAnimationFrame: id => timers.delete(id),
  addEventListener: (name, callback) => on(events, name, callback),
  IntersectionObserver: class {
   constructor(callback, options) { this.callback = callback; this.options = options; this.targets = []; observers.push(this); }
   observe(target) { this.targets.push(target); }
   disconnect() { this.disconnected = true; }
  }
 };
 vm.runInNewContext(code, context);
 const sectionObserver = () => observers.filter(observer => observer.options).at(-1);
 const visibility = visible => observers[0].callback([{target: mascot, isIntersecting: visible}]);
 const intersections = entries => sectionObserver().callback(entries.map(({index, isIntersecting, top}) => {
  if (top !== undefined) sections[index].top = top;
  return {target: sections[index], isIntersecting};
 }));
 const enter = (index = 0) => intersections(sections.map((_, candidate) => ({
  index: candidate, isIntersecting: candidate === index,
  top: candidate === index ? context.innerHeight * .3 : (candidate - index) * 800
 })));
 const leave = () => intersections(sections.map((_, index) => ({index, isIntersecting: false})));
 const advance = async duration => {
  const end = now + duration;
  for (;;) {
   const due = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
   if (!due) break;
   timers.delete(due[0]); now = due[1].at; due[1].callback();
   await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  }
  now = end;
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  assertMascotOnly();
 };
 if (notifyInitially) {
  visibility(initialVisible);
  if (initialSection !== null) enter(initialSection);
 }
 assertMascotOnly();
 return {motions, active, mascot, wordmark, assertMascotOnly, sections, advance, enter, leave, intersections, visibility, sectionObserver,
  mascotMotions: () => motions.filter(motion => motion.element === 'mascot'),
  sectionSelector: () => sectionSelector,
  scroll: () => emit(events, 'scroll'),
  resize: height => { context.innerHeight = height; emit(events, 'resize'); },
  hidden: value => { document.hidden = value; emit(documentEvents, 'visibilitychange'); },
  reduced: value => { reduced.matches = value; emit(events, 'reduced:change'); }
 };
}
const transforms = motion => motion.frames.map(frame => frame.transform);

await test('section observer can fire before mascot visibility without dropping the initial entry', async () => {
 const h = createHarness({notifyInitially: false});
 h.enter(0);
 await h.advance(100);
 assert.equal(h.motions.length, 0, 'a visible section alone cannot start motion');
 h.visibility(true);
 await h.advance(0);
 assert.deepEqual(h.mascotMotions().map(m => [m.time, m.kind, m.behavior, m.duration]),
  [[100, 'entry', 'welcome', 700]], 'welcome starts immediately once both observers agree');
 h.visibility(true); h.enter(0);
 await h.advance(700);
 assert.equal(h.mascotMotions().length, 1, 'duplicate observations do not repeat the initial entry');
 await h.advance(5000);
 assert.deepEqual(h.mascotMotions().map(m => [m.time, m.kind]), [[100, 'entry'], [5800, 'idle']]);
});

await test('only the intact mascot animates, without side nodes, status text or wordmark motion', async () => {
 for (const [page, profiles] of Object.entries(pageProfiles)) {
  const h = createHarness({pathname: `/id/${page}`, count: profiles.length});
  assert.equal(h.mascot.attributes['aria-hidden'], 'true', 'the mascot remains decorative');
  assert.equal(h.active.size, 1, 'only one mascot entry animation is active');
  for (const index of profiles.keys()) {
   h.enter(index);
   await h.advance(12000);
   h.assertMascotOnly();
  }
 }
});

await test('all routes and locale aliases map their ordered sections to contextual behaviors', () => {
 for (const locale of ['id', 'en']) {
  for (const [page, expected] of Object.entries(pageProfiles)) {
   for (const suffix of ['', '.html']) {
    const h = createHarness({pathname: `/${locale}/${page}${suffix}`, count: expected.length});
    assert.deepEqual(h.sections.map(section => section.dataset.rancaBehavior), expected, `${locale}/${page}${suffix}`);
    assert.deepEqual(h.sectionObserver().targets, h.sections);
   }
  }
  for (const pathname of [`/${locale}`, `/${locale}/`, `/${locale}/index.html`]) {
   assert.deepEqual(createHarness({pathname}).sections.map(section => section.dataset.rancaBehavior), pageProfiles.index);
  }
 }
 assert.deepEqual(createHarness({pathname: '/unmapped', count: 2}).sections.map(section => section.dataset.rancaBehavior), ['document', 'document']);
});

await test('six homepage sections have distinct meaningful mascot entry and idle motions', async () => {
 const expected = [
  {key: 'welcome', entry: ['rotate(0deg)', 'rotate(-9deg)', 'rotate(7deg)', 'rotate(-4deg)', 'rotate(0deg)'], idle: ['rotate(0deg)', 'rotate(-4deg)', 'rotate(3deg)', 'rotate(0deg)']},
  {key: 'study', entry: ['translateX(0) rotate(0deg)', 'translateX(2px) rotate(7deg)', 'translateX(2px) rotate(7deg)', 'translateX(0) rotate(0deg)'], idle: ['rotate(0deg)', 'rotate(4deg)', 'rotate(4deg)', 'rotate(0deg)']},
  {key: 'cards', entry: ['translateX(0) rotate(0deg)', 'translateX(-2px) rotate(-5deg)', 'translateX(2px) rotate(5deg)', 'translateX(0) rotate(0deg)'], idle: ['translateX(0)', 'translateX(-1px)', 'translateX(1px)', 'translateX(0)']},
  {key: 'confidence', entry: ['translateY(0) scale(1)', 'translateY(1.5px) scale(.96,1.02)', 'translateY(-1px) scale(1.02,.98)', 'translateY(0) scale(1)'], idle: ['scale(1)', 'scale(1.025)', 'scale(1)']},
  {key: 'download', entry: ['translateY(0)', 'translateY(3px)', 'translateY(0)', 'translateY(2px)', 'translateY(0)'], idle: ['translateY(0)', 'translateY(1.5px)', 'translateY(0)']},
  {key: 'question', entry: ['rotate(0deg)', 'rotate(-10deg)', 'rotate(-10deg)', 'rotate(3deg)', 'rotate(0deg)'], idle: ['rotate(0deg)', 'rotate(-6deg)', 'rotate(-6deg)', 'rotate(0deg)']}
 ];
 const entrySequences = new Set(), idleSequences = new Set();
 for (const [index, profile] of expected.entries()) {
  const h = createHarness({initialSection: index});
  const entry = h.mascotMotions()[0];
  assert.equal(entry.behavior, profile.key); assert.equal(entry.kind, 'entry');
  assert.deepEqual(transforms(entry), profile.entry, `${profile.key} entry gesture`);
  assert.deepEqual(entry.options, {duration: 700, easing: 'ease-in-out', iterations: 1});
  entrySequences.add(JSON.stringify(entry.frames));
  await h.advance(5699); assert.equal(h.mascotMotions().length, 1);
  await h.advance(1);
  const idle = h.mascotMotions()[1];
  assert.equal(idle.kind, 'idle'); assert.equal(idle.behavior, profile.key);
  assert.deepEqual(transforms(idle), profile.idle, `${profile.key} idle gesture`);
  assert.deepEqual(idle.options, {duration: 1100, easing: 'ease-in-out', iterations: 1});
  idleSequences.add(JSON.stringify(idle.frames));
 }
 for (const [label, values] of Object.entries({entrySequences, idleSequences})) {
  assert.equal(values.size, 6, `all six homepage ${label} are distinct`);
 }
});

for (const switchAt of [300, 750]) await test(`entry at ${switchAt}ms replays after active motion/cooldown`, async () => {
 const h = createHarness();
 await h.advance(switchAt); h.enter(1);
 await h.advance(899 - switchAt); assert.equal(h.mascotMotions().length, 1);
 await h.advance(1);
 assert.deepEqual(h.mascotMotions().map(m => [m.time, m.behavior, m.kind]), [[0, 'welcome', 'entry'], [900, 'study', 'entry']]);
});

await test('latest section wins while an entry is queued', async () => {
 const h = createHarness();
 await h.advance(300); h.enter(1);
 await h.advance(200); h.enter(2);
 await h.advance(400);
 assert.deepEqual(h.mascotMotions().map(m => m.behavior), ['welcome', 'cards']);
});

await test('returning to a previous section replays its original entry', async () => {
 const h = createHarness();
 await h.advance(900); h.enter(1);
 await h.advance(900); h.enter(0);
 assert.deepEqual(h.mascotMotions().map(m => [m.time, m.behavior]), [[0, 'welcome'], [900, 'study'], [1800, 'welcome']]);
 assert.deepEqual(h.mascotMotions()[2].frames, h.mascotMotions()[0].frames);
 h.enter(0); await h.advance(900);
 assert.equal(h.mascotMotions().length, 3, 'duplicate observations of the active section do not replay');
});

await test('leaving the reading band and re-entering the same section replays entry', async () => {
 const h = createHarness();
 await h.advance(1000); h.leave();
 await h.advance(1000); h.enter(0);
 assert.deepEqual(h.mascotMotions().map(m => [m.time, m.kind]), [[0, 'entry'], [2000, 'entry']]);
});

await test('section closest to the 30% reading line wins regardless of observer entry order', () => {
 const h = createHarness({initialSection: null, height: 1000});
 h.intersections([{index: 0, isIntersecting: true, top: 250}, {index: 1, isIntersecting: true, top: 299}]);
 assert.equal(h.mascot.dataset.rancaBehavior, 'study');
 assert.equal(h.mascotMotions()[0].behavior, 'study');
 const second = createHarness({initialSection: null, height: 1000});
 second.intersections([{index: 1, isIntersecting: true, top: 299}, {index: 0, isIntersecting: true, top: 250}]);
 assert.equal(second.mascot.dataset.rancaBehavior, 'study');
});

await test('height-based 30%/69% margins rebuild once after a burst of resizes', async () => {
 const h = createHarness();
 assert.equal(h.sectionObserver().options.rootMargin, '-324px 0px -745px 0px');
 assert.equal(h.sectionObserver().options.threshold, 0);
 assert.ok(h.sectionSelector().includes('.resource-main .resource-hero'), 'nested resource intros are observed');
 assert.ok(h.sectionSelector().includes('main .article-end'), 'article endings are observed');
 const oldObserver = h.sectionObserver();
 h.resize(1000); h.resize(800); await h.advance(15);
 assert.equal(h.sectionObserver(), oldObserver);
 await h.advance(1);
 assert.equal(oldObserver.disconnected, true);
 assert.equal(h.sectionObserver().options.rootMargin, '-240px 0px -552px 0px');
 assert.deepEqual(h.sectionObserver().targets, h.sections);
});

await test('continuous scrolling debounces idle for a full five seconds', async () => {
 const h = createHarness();
 await h.advance(700);
 for (let i = 0; i < 24; i++) { await h.advance(250); h.scroll(); }
 assert.equal(h.mascotMotions().length, 1);
 await h.advance(4999); assert.equal(h.mascotMotions().length, 1);
 await h.advance(1);
 assert.equal(h.mascotMotions()[1].time, 11700);
 assert.equal(h.mascotMotions()[1].kind, 'idle');
});

await test('entry during idle waits and replays with the latest section gesture', async () => {
 const h = createHarness();
 await h.advance(5800); h.enter(1);
 await h.advance(999); assert.equal(h.mascotMotions().length, 2);
 await h.advance(1);
 assert.deepEqual(h.mascotMotions().map(m => [m.time, m.kind, m.behavior]),
  [[0, 'entry', 'welcome'], [5700, 'idle', 'welcome'], [6800, 'entry', 'study']]);
});

await test('scroll cancels the mascot idle animation and resumes after stopping', async () => {
 const h = createHarness();
 await h.advance(5800); h.scroll();
 assert.equal(h.active.size, 0);
 assert.equal(h.mascotMotions().at(-1).cancelled, true);
 await h.advance(4999); assert.equal(h.mascotMotions().length, 2);
 await h.advance(1);
 assert.equal(h.mascotMotions()[2].time, 10800);
});

await test('scroll preserves entry and each idle has a full pause after it finishes', async () => {
 const h = createHarness();
 await h.advance(100); h.scroll();
 assert.equal(h.active.size, 1);
 assert.equal(h.mascotMotions()[0].cancelled, false);
 await h.advance(11699); assert.equal(h.mascotMotions().length, 2);
 await h.advance(1);
 assert.deepEqual(h.mascotMotions().map(m => m.time), [0, 5700, 11800]);
});

for (const setting of ['hidden', 'reduced', 'visibility']) await test(`${setting} cancels the mascot and resumes idle without stale entry`, async () => {
 const h = createHarness();
 await h.advance(100); h[setting](setting !== 'visibility');
 assert.equal(h.active.size, 0);
 assert.ok(h.motions.every(motion => motion.cancelled));
 h.enter(1); await h.advance(10000);
 assert.equal(h.mascotMotions().length, 1);
 h[setting](setting === 'visibility');
 await h.advance(4999); assert.equal(h.mascotMotions().length, 1);
 await h.advance(1);
 assert.equal(h.mascotMotions()[1].kind, 'idle');
 assert.equal(h.mascotMotions()[1].behavior, 'study');
});

await test('an initially reduced, hidden or offscreen page never starts motion', async () => {
 for (const option of ['initialReduced', 'initialHidden', 'initialVisible']) {
  const h = createHarness({[option]: option !== 'initialVisible'});
  await h.advance(20000);
  assert.equal(h.motions.length, 0, option);
 }
 const h = createHarness({initialSection: null});
 await h.advance(20000); assert.equal(h.motions.length, 0, 'no section in the reading band');
});

await test('leaving all sections stops active motion and suppresses idle', async () => {
 const h = createHarness();
 await h.advance(100); h.leave();
 assert.equal(h.active.size, 0);
 await h.advance(20000); assert.equal(h.mascotMotions().length, 1);
});

await test('article cards activate contextual entries by pointer and keyboard', async () => {
 const h = createHarness({pathname: '/en/articles', count: 4});
 assert.ok(h.sectionSelector().includes('main .article-hub-header'));
 assert.ok(h.sectionSelector().includes('main .article-card'));
 await h.advance(900); h.sections[1].emit('pointerenter');
 assert.equal(h.mascotMotions().at(-1).behavior, 'calendar');
 await h.advance(900); h.sections[2].emit('focusin');
 assert.equal(h.mascotMotions().at(-1).behavior, 'task');
});

await test('policy gestures are quarter-amplitude with nine-second idle pauses', async () => {
 // Independent expected transforms for policy sections, including non-calm
 // gestures reused from other pages. This catches missed translate/scale axes.
 const expected = {
  privacy: {entry: ['rotate(0deg)', 'rotate(-0.5deg)', 'rotate(0deg)'], idle: ['scale(1)', 'scale(1.0025,0.9975)', 'scale(1)']},
  account: {entry: ['scale(1)', 'scale(1.005)', 'scale(1)'], idle: ['scale(1)', 'scale(1.0025)', 'scale(1)']},
  cloud: {entry: ['translateY(0)', 'translateY(-0.375px)', 'translateY(0)'], idle: ['translateY(0)', 'translateY(-0.125px)', 'translateY(0)']},
  contact: {entry: ['rotate(0deg)', 'rotate(1.5deg)', 'rotate(-0.75deg)', 'rotate(1.5deg)', 'rotate(0deg)'], idle: ['translateX(0)', 'translateX(0.375px)', 'translateX(0)']},
  payment: {entry: ['rotate(0deg)', 'rotate(0.5deg)', 'rotate(0deg)'], idle: ['translateY(0)', 'translateY(0.125px)', 'translateY(0)']},
  backup: {entry: ['scale(1)', 'scale(0.995)', 'scale(1)'], idle: ['scaleY(1)', 'scaleY(0.9975)', 'scaleY(1)']},
  diagnostics: {entry: ['translateX(0)', 'translateX(0.25px)', 'translateX(0)'], idle: ['translateX(0)', 'translateX(0.125px)', 'translateX(0)']},
  delete: {entry: ['rotate(0deg)', 'rotate(-0.25deg)', 'rotate(0deg)'], idle: ['translateY(0)', 'translateY(0.1px)', 'translateY(0)']},
  document: {entry: ['translateY(0)', 'translateY(0.25px)', 'translateY(0)'], idle: ['rotate(0deg)', 'rotate(0.25deg)', 'rotate(0deg)']},
  cards: {entry: ['translateX(0) rotate(0deg)', 'translateX(-0.5px) rotate(-1.25deg)', 'translateX(0.5px) rotate(1.25deg)', 'translateX(0) rotate(0deg)'], idle: ['translateX(0)', 'translateX(-0.25px)', 'translateX(0.25px)', 'translateX(0)']},
  fairness: {entry: ['rotate(-0.25deg)', 'rotate(0.25deg)', 'rotate(0deg)'], idle: ['rotate(0deg)', 'rotate(0.125deg)', 'rotate(-0.125deg)', 'rotate(0deg)']},
  edit: {entry: ['rotate(0deg)', 'rotate(-1deg) translateX(-0.25px)', 'rotate(1deg) translateX(0.25px)', 'rotate(-0.75deg)', 'rotate(0deg)'], idle: ['rotate(0deg)', 'rotate(0.5deg)', 'rotate(-0.5deg)', 'rotate(0deg)']}
 };
 for (const page of ['privacy', 'terms', 'delete-account']) {
  for (const [index, key] of pageProfiles[page].entries()) {
   const label = `${page} section ${index} (${key})`;
   const h = createHarness({pathname: `/id/${page}`, count: pageProfiles[page].length, initialSection: index});
   assert.deepEqual(transforms(h.mascotMotions()[0]), expected[key].entry, `${label} entry`);
   assert.equal(h.mascotMotions()[0].duration, 900, label);
   await h.advance(9899); assert.equal(h.mascotMotions().length, 1, `${label} waits nine seconds after entry`);
   await h.advance(1);
   assert.deepEqual(transforms(h.mascotMotions()[1]), expected[key].idle, `${label} idle`);
   assert.equal(h.mascotMotions()[1].duration, 1600, label);
   await h.advance(10599); assert.equal(h.mascotMotions().length, 2, `${label} pauses again after idle`);
   await h.advance(1); assert.equal(h.mascotMotions()[2].time, 20500, label);
  }
 }
});
