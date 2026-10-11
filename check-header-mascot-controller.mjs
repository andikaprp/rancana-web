import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

// Deterministic controller coverage; actual markup, layout and artwork are checked
// in check-header-mascot.mjs. Only the approved SVG and its named parts may animate.
const code = await readFile(new URL('shared-nav.js', import.meta.url), 'utf8');
const approvedSVG = await readFile(new URL('assets/mascots/ranca-header.svg', import.meta.url), 'utf8');
const rigNames = ['ranca-rig', 'rig-body', 'rig-eye-left', 'rig-eye-right', 'rig-smile', 'rig-hand-left', 'rig-hand-right'];
const calmProfiles = ['account', 'cloud', 'privacy', 'document', 'payment', 'backup', 'diagnostics', 'delete', 'fairness'];
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
 initialReduced = false, initialHidden = false, initialVisible = true, notifyInitially = true, completionLag = {}} = {}) {
 let now = 0, nextTimer = 1, sectionSelector;
 const timers = new Map(), observers = [], motions = [], groups = [], active = new Set();
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
    assert.ok(rigNames.includes(name), 'only the approved SVG or its named parts animate; the brand and wordmark stay still');
    assert.ok([...active].every(animation => animation.motion.time === now &&
     animation.motion.kind === mascot.dataset.rancaMotion && animation.motion.behavior === mascot.dataset.rancaBehavior),
     'a new gesture never overlaps any part of an unfinished gesture');
    assert.equal([...active].filter(animation => animation.element === this).length, 0,
     `${name} animations never overlap on the same element`);
    const motion = {element: name, time: now, frames: JSON.parse(JSON.stringify(frames)),
     options: JSON.parse(JSON.stringify(options)), duration: options.duration,
     behavior: mascot.dataset.rancaBehavior,
     kind: mascot.dataset.rancaMotion, cancelled: false};
    motions.push(motion);
    let group = groups.at(-1);
    if (!group || group.time !== now || group.kind !== motion.kind || group.behavior !== motion.behavior) {
     group = {time: now, kind: motion.kind, behavior: motion.behavior,
      duration: motion.duration, options: motion.options, frames: motion.frames, parts: []};
     groups.push(group);
    }
    group.parts.push(motion);
    let resolve, reject, finished, state = 'running';
    const animation = {element: this, motion,
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
    }, options.duration + (completionLag[name] || 0));
    active.add(animation);
    return animation;
   }
  };
  for (const property of ['textContent', 'innerText', 'innerHTML', 'outerHTML']) {
   let value = initialText;
   Object.defineProperty(element, property, {
    get: () => value,
    set: next => {
     textWrites.push({element: name, property, value: next});
     assert.equal(name, 'mascot', 'no text or HTML is changed outside the mascot');
     assert.equal(property, 'innerHTML', 'the sole permitted content write is the bundled SVG injection');
     assert.equal(next, approvedSVG, 'only the exact approved SVG may be injected');
     assert.equal(textWrites.length, 1, 'the approved SVG is injected exactly once');
     value = next;
     element.children = [rig['ranca-rig']];
    }
   });
  }
  return element;
 };
 const mascot = makeElement('span', 'mascot');
 const rig = Object.fromEntries(rigNames.map(name => [name, makeElement(name === 'ranca-rig' ? 'svg' : 'g', name)]));
 rig['ranca-rig'].children = [rig['rig-body']];
 rig['rig-body'].children = rigNames.filter(name => !['ranca-rig', 'rig-body'].includes(name)).map(name => rig[name]);
 rig['ranca-rig'].parentElement = mascot;
 for (const element of rig['rig-body'].children) element.parentElement = rig['rig-body'];
 rig['rig-body'].parentElement = rig['ranca-rig'];
 const wordmark = makeElement('span', 'wordmark', 'Rancana');
 const brand = makeElement('a', 'brand');
 const header = makeElement('header', 'header');
 brand.children = [mascot, wordmark]; header.children = [brand];
 mascot.nextElementSibling = wordmark; wordmark.previousElementSibling = mascot;
 mascot.parentElement = brand; wordmark.parentElement = brand; brand.parentElement = header;
 const headerElement = selector => {
  if (mascot.children.length && selector.startsWith('.') && rig[selector.slice(1)]) return rig[selector.slice(1)];
  if (selector.endsWith('.brand-mark')) return mascot;
  if (selector.endsWith('.brand-name')) return wordmark;
  if (selector.endsWith('.brand')) return brand;
  if (selector === '.site-header') return header;
  return null;
 };
 for (const element of [mascot, wordmark, brand, header, ...Object.values(rig)]) {
  element.querySelector = headerElement;
  element.querySelectorAll = selector => selector.split(',').map(value => headerElement(value.trim())).filter(Boolean);
 }
 const assertMascotOnly = () => {
  assert.deepEqual(createdNodes, [], 'the controller creates no side icons or other nodes');
  assert.deepEqual(insertions, [], 'the controller inserts no side nodes');
  assert.deepEqual(textWrites, [{element: 'mascot', property: 'innerHTML', value: approvedSVG}],
   'only one exact bundled SVG injection is permitted; no status text or other HTML');
  assert.deepEqual(mascot.children, [rig['ranca-rig']], 'the approved rig is the sole mascot child');
  assert.equal(mascot.dataset.rancaRig, 'true', 'the SVG replaces the bitmap background');
  assert.equal(mascot.nextElementSibling, wordmark, 'the wordmark remains directly after the mascot');
  assert.deepEqual(brand.children, [mascot, wordmark], 'the original brand structure is preserved');
  assert.equal(wordmark.textContent, 'Rancana', 'the wordmark text is unchanged');
  assert.equal(motions.filter(motion => motion.element === 'wordmark').length, 0, 'the wordmark never animates');
  assert.ok(motions.every(motion => rigNames.includes(motion.element)), 'every motion belongs only to the mascot rig');
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
   for (let i = 0; i < 8; i++) await Promise.resolve();
  }
  now = end;
  for (let i = 0; i < 8; i++) await Promise.resolve();
  assertMascotOnly();
 };
 if (notifyInitially) {
  visibility(initialVisible);
  if (initialSection !== null) enter(initialSection);
 }
 assertMascotOnly();
 return {motions, groups, active, mascot, wordmark, assertMascotOnly, sections, advance, enter, leave, intersections, visibility, sectionObserver,
  gestureMotions: () => groups,
  sectionSelector: () => sectionSelector,
  scroll: () => emit(events, 'scroll'),
  resize: height => { context.innerHeight = height; emit(events, 'resize'); },
  hidden: value => { document.hidden = value; emit(documentEvents, 'visibilitychange'); },
  reduced: value => { reduced.matches = value; emit(events, 'reduced:change'); }
 };
}
const transforms = motion => motion.frames.map(frame => frame.transform);
const partTransforms = group => Object.fromEntries(group.parts.map(part => [`.${part.element}`, transforms(part)]));

// Independent fixtures lock the stronger, coordinated six semantic gestures.
// These are deliberately declared here rather than read from controller source.
const neutral='translate(0px,0px) rotate(0deg) scale(1)';
const bodyNeutral='translate(0px,0px) rotate(0deg)';
const expectedPoses={
 welcome:{
  '.rig-body':[bodyNeutral,'translate(0px,-18px) rotate(-6deg)','translate(0px,-10px) rotate(5deg)','translate(0px,-8px) rotate(-3deg)',bodyNeutral],
  '.rig-hand-left':[neutral,'translate(80px,-20px) rotate(38deg)','translate(80px,-20px) rotate(70deg)','translate(80px,-20px) rotate(12deg)','translate(80px,-20px) rotate(62deg)',neutral],
  '.rig-eye-left':['translateY(0px)','translateY(-14px)','translateY(0px)'],
  '.rig-eye-right':['translateY(0px)','translateY(-14px)','translateY(0px)'],
  '.rig-smile':['scale(1)','scale(1.12,1.2)','scale(1)']
 },
 study:{
  '.rig-body':[bodyNeutral,'translate(12px,0px) rotate(7deg)','translate(12px,0px) rotate(7deg)','translate(-10px,0px) rotate(-5deg)','translate(-10px,0px) rotate(-5deg)',bodyNeutral],
  '.rig-eye-left':['translate(0px,0px)','translate(24px,7px)','translate(24px,7px)','translate(-20px,12px)','translate(-20px,12px)','translate(0px,0px)'],
  '.rig-eye-right':['translate(0px,0px)','translate(24px,7px)','translate(24px,7px)','translate(-20px,12px)','translate(-20px,12px)','translate(0px,0px)'],
  '.rig-hand-left':[neutral,'translate(75px,35px) rotate(-24deg)','translate(75px,35px) rotate(-24deg)',neutral],
  '.rig-smile':['scale(1)','scale(.93,.82)','scale(1)']
 },
 cards:{
  '.rig-body':[bodyNeutral,'translate(-18px,0px) rotate(-4deg)','translate(18px,0px) rotate(4deg)','translate(18px,0px) rotate(4deg)',bodyNeutral],
  '.rig-hand-left':[neutral,'translate(130px,15px) rotate(32deg)','translate(80px,50px) rotate(-10deg)',neutral,neutral],
  '.rig-hand-right':[neutral,neutral,'translate(-110px,-85px) rotate(24deg)','translate(-65px,-30px) rotate(-18deg)',neutral],
  '.rig-eye-left':['translateX(0px)','translateX(-22px)','translateX(22px)','translateX(22px)','translateX(0px)'],
  '.rig-eye-right':['translateX(0px)','translateX(-22px)','translateX(22px)','translateX(22px)','translateX(0px)']
 },
 confidence:{
  '.rig-body':[bodyNeutral,'translate(0px,16px) rotate(0deg)','translate(0px,-10px) rotate(0deg)',bodyNeutral],
  '.rig-eye-left':['scaleY(1)','scaleY(.2)','scaleY(.2)','scaleY(1)'],
  '.rig-eye-right':['scaleY(1)','scaleY(.2)','scaleY(.2)','scaleY(1)'],
  '.rig-smile':['scale(1)','scale(1.13,.76)','scale(1.13,.76)','scale(1)'],
  '.rig-hand-left':[neutral,'translate(36px,24px) rotate(-16deg)',neutral],
  '.rig-hand-right':[neutral,'translate(-32px,20px) rotate(14deg)',neutral]
 },
 download:{
  '.rig-body':[bodyNeutral,'translate(0px,0px) rotate(0deg)','translate(0px,20px) rotate(0deg)','translate(0px,0px) rotate(0deg)','translate(0px,16px) rotate(0deg)',bodyNeutral],
  '.rig-hand-right':[neutral,'translate(-90px,-100px) rotate(14deg)','translate(-90px,-15px) rotate(14deg)','translate(-90px,-90px) rotate(14deg)','translate(-90px,-10px) rotate(14deg)',neutral],
  '.rig-eye-left':['translateY(0px)','translateY(22px)','translateY(22px)','translateY(0px)'],
  '.rig-eye-right':['translateY(0px)','translateY(22px)','translateY(22px)','translateY(0px)']
 },
 question:{
  '.rig-body':[bodyNeutral,'translate(-8px,0px) rotate(-9deg)','translate(-8px,0px) rotate(-9deg)','translate(8px,0px) rotate(6deg)',bodyNeutral],
  '.rig-eye-left':['translateY(0px) scaleY(1)','translateY(-22px) scaleY(1.25)','translateY(-22px) scaleY(1.25)','translateY(6px) scaleY(.7)','translateY(0px) scaleY(1)'],
  '.rig-eye-right':['translateY(0px) scaleY(1)','translateY(9px) scaleY(.4)','translateY(9px) scaleY(.4)','translateY(-12px) scaleY(1.15)','translateY(0px) scaleY(1)'],
  '.rig-smile':['scale(1)','scale(.8,.65)','scale(.8,.65)','scale(1)']
 }
};
const expectedIdles={
 welcome:{
  '.rig-body':[bodyNeutral,'translate(0px,-10px) rotate(-4deg)','translate(0px,-6px) rotate(4deg)',bodyNeutral],
  '.rig-hand-left':[neutral,'translate(70px,-15px) rotate(28deg)','translate(70px,-15px) rotate(62deg)','translate(70px,-15px) rotate(22deg)',neutral],
  '.rig-smile':['scale(1)','scale(1.07,1.12)','scale(1)']
 },
 study:{
  '.rig-body':[bodyNeutral,'translate(8px,0px) rotate(4deg)','translate(-6px,0px) rotate(-3deg)',bodyNeutral],
  '.rig-eye-left':['translateX(0px)','translateX(16px)','translateX(-13px)','translateX(0px)'],
  '.rig-eye-right':['translateX(0px)','translateX(16px)','translateX(-13px)','translateX(0px)']
 },
 cards:{
  '.rig-body':[bodyNeutral,'translate(-12px,0px) rotate(-3deg)','translate(12px,0px) rotate(3deg)',bodyNeutral],
  '.rig-hand-left':[neutral,'translate(95px,18px) rotate(25deg)',neutral,neutral],
  '.rig-hand-right':[neutral,neutral,'translate(-70px,-55px) rotate(18deg)',neutral],
  '.rig-eye-left':['translateX(0px)','translateX(-15px)','translateX(15px)','translateX(0px)'],
  '.rig-eye-right':['translateX(0px)','translateX(-15px)','translateX(15px)','translateX(0px)']
 },
 confidence:{
  '.rig-body':[bodyNeutral,'translate(0px,10px) rotate(0deg)','translate(0px,-5px) rotate(0deg)',bodyNeutral],
  '.rig-eye-left':['scaleY(1)','scaleY(.35)','scaleY(1)'],
  '.rig-eye-right':['scaleY(1)','scaleY(.35)','scaleY(1)'],
  '.rig-smile':['scale(1)','scale(1.07,.86)','scale(1)']
 },
 download:{
  '.rig-body':[bodyNeutral,'translate(0px,0px) rotate(0deg)','translate(0px,13px) rotate(0deg)',bodyNeutral],
  '.rig-hand-right':[neutral,'translate(-75px,-85px) rotate(10deg)','translate(-75px,-25px) rotate(10deg)',neutral],
  '.rig-eye-left':['translateY(0px)','translateY(14px)','translateY(0px)'],
  '.rig-eye-right':['translateY(0px)','translateY(14px)','translateY(0px)']
 },
 question:{
  '.rig-body':[bodyNeutral,'translate(-5px,0px) rotate(-6deg)','translate(5px,0px) rotate(4deg)',bodyNeutral],
  '.rig-eye-left':['translateY(0px)','translateY(-14px)','translateY(0px)'],
  '.rig-eye-right':['scaleY(1)','scaleY(.55)','scaleY(1)'],
  '.rig-smile':['scale(1)','scale(.9,.82)','scale(1)']
 }
};

function assertRigidBody(group) {
 const bodies = group.parts.filter(part => part.element === 'rig-body');
 assert.equal(bodies.length, 1, `${group.behavior}/${group.kind} animates the body once`);
 const values = transforms(bodies[0]);
 assert.equal(values[0], bodyNeutral, 'body begins neutral');
 assert.equal(values.at(-1), bodyNeutral, 'body returns neutral');
 assert.ok(values.some(value => value !== bodyNeutral), 'body gesture is perceptible rather than static');
 for (const value of values) {
  const match = /^translate\((-?[\d.]+)px,(-?[\d.]+)px\) rotate\((-?[\d.]+)deg\)$/.exec(value);
  assert.ok(match, 'body only translates and rotates; no scaling, skew or silhouette distortion');
  const [x, y, angle] = match.slice(1).map(Number);
  assert.ok([x, y, angle].every(Number.isFinite), 'body values are finite');
  assert.ok(Math.hypot(x, y) <= 20, 'body travel stays within 20 SVG units');
  assert.ok(Math.abs(angle) <= 9, 'body rotation stays within nine degrees');
 }
 return values;
}

// Supporting-only gestures keep their existing whole-SVG transformations.
const expectedFallback = {
 purpose: {entry:['translateX(-2px) scale(.96)','translateX(0) scale(1.04)','translateX(0) scale(1)'], idle:['scale(1)','scale(1.02,1)','scale(1)']},
 contact: {entry:['rotate(0deg)','rotate(6deg)','rotate(-3deg)','rotate(6deg)','rotate(0deg)'], idle:['translateX(0)','translateX(1.5px)','translateX(0)']},
 start: {entry:['scale(.94)','scale(1.06)','scale(1)'], idle:['scale(1)','scale(1.035)','scale(1)']},
 compare: {entry:['rotate(0deg)','rotate(-7deg)','rotate(7deg)','rotate(0deg)'], idle:['rotate(-2deg)','rotate(2deg)','rotate(-2deg)','rotate(0deg)']},
 restore: {entry:['rotate(0deg)','rotate(-7deg) translateX(-1px)','rotate(0deg) translateY(-2px)','rotate(7deg) translateX(1px)','rotate(0deg)'], idle:['rotate(0deg)','rotate(-3deg)','rotate(0deg)']},
 calendar: {entry:['translateX(0)','translateX(-2px)','translateX(0)','translateX(2px)','translateX(0)'], idle:['translateY(0)','translateY(1px)','translateY(0)','translateY(1px)','translateY(0)']},
 task: {entry:['translateX(0) translateY(0)','translateX(-1px) translateY(2px)','translateX(2px) translateY(-1px)','translateX(0) translateY(0)'], idle:['rotate(0deg)','rotate(3deg)','rotate(0deg)']},
 flip: {entry:['scaleX(1)','scaleX(.78)','scaleX(1.02)','scaleX(1)'], idle:['scaleX(1)','scaleX(.92)','scaleX(1)']},
 example: {entry:['translateX(0)','translateX(2px)','translateX(-1px)','translateX(0)'], idle:['scaleY(1)','scaleY(.96)','scaleY(1)']},
 edit: {entry:['rotate(0deg)','rotate(-4deg) translateX(-1px)','rotate(4deg) translateX(1px)','rotate(-3deg)','rotate(0deg)'], idle:['rotate(0deg)','rotate(2deg)','rotate(-2deg)','rotate(0deg)']},
 next: {entry:['translateX(0)','translateX(3px)','translateX(0)'], idle:['translateX(0)','translateX(1px)','translateX(0)']}
};

await test('section observer can fire before mascot visibility without dropping the initial entry', async () => {
 const h = createHarness({notifyInitially: false});
 h.enter(0);
 await h.advance(100);
 assert.equal(h.motions.length, 0, 'a visible section alone cannot start motion');
 h.visibility(true);
 await h.advance(0);
 assert.deepEqual(h.gestureMotions().map(m => [m.time, m.kind, m.behavior, m.duration]),
  [[100, 'entry', 'welcome', 1900]], 'welcome starts immediately once both observers agree');
 h.visibility(true); h.enter(0);
 await h.advance(1900);
 assert.equal(h.gestureMotions().length, 1, 'duplicate observations do not repeat the initial entry');
 await h.advance(2800);
 assert.deepEqual(h.gestureMotions().map(m => [m.time, m.kind]), [[100, 'entry'], [4800, 'idle']]);
});

await test('only the approved rig animates, with no side nodes, status text or wordmark motion', async () => {
 for (const [page, profiles] of Object.entries(pageProfiles)) {
  const policy = ['privacy', 'terms', 'delete-account'].includes(page);
  for (const [index, key] of profiles.entries()) {
   const h = createHarness({pathname: `/id/${page}`, count: profiles.length, initialSection: index});
   assert.equal(h.mascot.attributes['aria-hidden'], 'true', 'the mascot remains decorative');
   const articulated = !policy && expectedPoses[key];
   assert.equal(h.active.size, articulated ? Object.keys(articulated).length : 1,
    `${page}/${key} has one coordinated gesture with the expected independent parts`);
   const calm = policy || calmProfiles.includes(key);
   const entryDuration = articulated ? 1900 : calm ? 900 : 700;
   const idleDuration = articulated ? 1400 : calm ? 1600 : 1100;
   const pause = calm ? 9000 : articulated ? 2800 : 5000;
   await h.advance(entryDuration + pause - 1);
   assert.equal(h.gestureMotions().length, 1, `${page}/${key} waits its full ${pause}ms quiet pause`);
   await h.advance(1);
   assert.equal(h.gestureMotions()[1].time, entryDuration + pause, `${page}/${key} first idle time`);
   await h.advance(idleDuration + pause - 1);
   assert.equal(h.gestureMotions().length, 2, `${page}/${key} preserves the pause after idle completion`);
   await h.advance(1);
   assert.equal(h.gestureMotions()[2].time, entryDuration + idleDuration + 2 * pause, `${page}/${key} repeated idle time`);
   h.assertMascotOnly();
   for (const group of h.gestureMotions()) {
    const entry = group.kind === 'entry';
    if (articulated) {
     assert.deepEqual(partTransforms(group), (entry ? expectedPoses : expectedIdles)[key], `${page}/${key} ${group.kind}`);
     assertRigidBody(group);
     assert.equal(group.duration, entry ? 1900 : 1400);
    } else {
     assert.deepEqual(group.parts.map(part => part.element), ['ranca-rig'], `${page}/${key} uses the whole SVG fallback`);
     if (!policy) assert.deepEqual(transforms(group.parts[0]), expectedFallback[key][group.kind], `${page}/${key} preserves its legacy ${group.kind} gesture`);
     assert.equal(group.duration, policy || calmProfiles.includes(key) ? (entry ? 900 : 1600) : (entry ? 700 : 1100));
    }
   }
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

await test('six homepage sections have distinct independently articulated entry and idle gestures', async () => {
 const entrySequences = new Set(), idleSequences = new Set(), animatedParts = new Set();
 const entryBodies = new Set(), idleBodies = new Set();
 for (const [index, key] of pageProfiles.index.entries()) {
  const h = createHarness({initialSection: index});
  const entry = h.gestureMotions()[0];
  assert.equal(entry.behavior, key); assert.equal(entry.kind, 'entry');
  assert.deepEqual(partTransforms(entry), expectedPoses[key], `${key} entry gesture`);
  entryBodies.add(JSON.stringify(assertRigidBody(entry)));
  assert.ok(entry.parts.length >= 4, `${key} coordinates its body with independent face and limb motion`);
  for (const part of entry.parts) {
   assert.deepEqual(part.options, {duration: 1900, easing: 'ease-in-out', iterations: 1});
   assert.equal(part.time, 0, 'all parts start together');
   assert.equal(part.frames[0].transform, part.frames.at(-1).transform, 'each part returns to its neutral pose');
   animatedParts.add(part.element);
  }
  assert.ok(new Set(entry.parts.map(part => JSON.stringify(part.frames))).size > 1, 'parts move independently rather than repeating one whole-mascot transform');
  entrySequences.add(JSON.stringify(partTransforms(entry)));
  await h.advance(4699); assert.equal(h.gestureMotions().length, 1);
  await h.advance(1);
  const idle = h.gestureMotions()[1];
  assert.equal(idle.kind, 'idle'); assert.equal(idle.behavior, key);
  assert.deepEqual(partTransforms(idle), expectedIdles[key], `${key} idle gesture`);
  idleBodies.add(JSON.stringify(assertRigidBody(idle)));
  for (const part of idle.parts) {
   assert.deepEqual(part.options, {duration: 1400, easing: 'ease-in-out', iterations: 1});
   assert.equal(part.time, 4700, 'idle waits 2.8 seconds after the complete entry');
   assert.equal(part.frames[0].transform, part.frames.at(-1).transform, 'idle restores each neutral part');
  }
  idleSequences.add(JSON.stringify(partTransforms(idle)));
 }
 assert.deepEqual([...animatedParts].sort(), rigNames.filter(name => name !== 'ranca-rig').sort(),
  'both eyes, smile, both hands and body each have independent animations');
 for (const [label, values] of Object.entries({entrySequences, idleSequences, entryBodies, idleBodies})) {
  assert.equal(values.size, 6, `all six homepage ${label} are distinct`);
 }
});

for (const switchAt of [300, 750]) await test(`entry at ${switchAt}ms waits for every active part and the 900ms minimum cooldown`, async () => {
 for (const scenario of [
  {pathname: '/id/', first: 0, next: 1, replay: 1900, keys: ['welcome', 'study']},
  {pathname: '/id/', first: 0, next: 1, replay: 2400, completionLag: {'rig-smile': 500}, keys: ['welcome', 'study']},
  {pathname: '/id/', first: 0, next: 1, replay: 2600, completionLag: {'rig-body': 700}, keys: ['welcome', 'study']},
  {pathname: '/id/about', first: 1, next: 2, replay: 900, keys: ['purpose', 'contact']}
 ]) {
  const h = createHarness({pathname: scenario.pathname, initialSection: scenario.first, completionLag: scenario.completionLag});
  await h.advance(switchAt); h.enter(scenario.next);
  await h.advance(scenario.replay - 1 - switchAt);
  assert.equal(h.gestureMotions().length, 1, 'no queued gesture starts early');
  await h.advance(1);
  assert.deepEqual(h.gestureMotions().map(m => [m.time, m.behavior, m.kind]),
   [[0, scenario.keys[0], 'entry'], [scenario.replay, scenario.keys[1], 'entry']]);
 }
});

await test('latest section wins while an entry is queued', async () => {
 const h = createHarness();
 await h.advance(300); h.enter(1);
 await h.advance(200); h.enter(2);
 await h.advance(1399); assert.equal(h.gestureMotions().length, 1);
 await h.advance(1);
 assert.deepEqual(h.gestureMotions().map(m => m.behavior), ['welcome', 'cards']);
});

await test('returning to a previous section replays its original entry', async () => {
 const h = createHarness();
 await h.advance(1900); h.enter(1);
 await h.advance(1900); h.enter(0);
 assert.deepEqual(h.gestureMotions().map(m => [m.time, m.behavior]), [[0, 'welcome'], [1900, 'study'], [3800, 'welcome']]);
 assert.deepEqual(partTransforms(h.gestureMotions()[2]), partTransforms(h.gestureMotions()[0]));
 h.enter(0); await h.advance(900);
 assert.equal(h.gestureMotions().length, 3, 'duplicate observations of the active section do not replay');
});

await test('leaving the reading band and re-entering the same section replays entry', async () => {
 const h = createHarness();
 await h.advance(1000); h.leave();
 await h.advance(1000); h.enter(0);
 assert.deepEqual(h.gestureMotions().map(m => [m.time, m.kind]), [[0, 'entry'], [2000, 'entry']]);
});

await test('section closest to the 30% reading line wins regardless of observer entry order', () => {
 const h = createHarness({initialSection: null, height: 1000});
 h.intersections([{index: 0, isIntersecting: true, top: 250}, {index: 1, isIntersecting: true, top: 299}]);
 assert.equal(h.mascot.dataset.rancaBehavior, 'study');
 assert.equal(h.gestureMotions()[0].behavior, 'study');
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

await test('continuous scrolling debounces articulated idle for a full 2.8 seconds', async () => {
 const h = createHarness();
 await h.advance(1900);
 for (let i = 0; i < 24; i++) { await h.advance(250); h.scroll(); }
 assert.equal(h.gestureMotions().length, 1);
 await h.advance(2799); assert.equal(h.gestureMotions().length, 1);
 await h.advance(1);
 assert.equal(h.gestureMotions()[1].time, 10700);
 assert.equal(h.gestureMotions()[1].kind, 'idle');
});

await test('entry during idle waits and replays with the latest section gesture', async () => {
 const h = createHarness();
 await h.advance(4800); h.enter(1);
 await h.advance(1299); assert.equal(h.gestureMotions().length, 2);
 await h.advance(1);
 assert.deepEqual(h.gestureMotions().map(m => [m.time, m.kind, m.behavior]),
  [[0, 'entry', 'welcome'], [4700, 'idle', 'welcome'], [6100, 'entry', 'study']]);
});

await test('scroll cancels every idle part and resumes after stopping', async () => {
 for (const index of pageProfiles.index.keys()) {
  const h = createHarness({initialSection: index});
  await h.advance(4800); h.scroll();
  assert.equal(h.active.size, 0);
  assert.ok(h.gestureMotions().at(-1).parts.every(part => part.cancelled), 'every active idle part is cancelled');
  await h.advance(2799); assert.equal(h.gestureMotions().length, 2);
  await h.advance(1);
  assert.equal(h.gestureMotions()[2].time, 7600);
 }
});

await test('scroll preserves entry and each idle has a full pause after it finishes', async () => {
 for (const {completionLag, expectedTimes} of [
  {completionLag: {}, expectedTimes: [0, 4700, 8900]},
  {completionLag: {'rig-body': 500}, expectedTimes: [0, 5200, 9900]}
 ]) {
  const h = createHarness({completionLag});
  await h.advance(100); h.scroll();
  assert.equal(h.active.size, Object.keys(expectedPoses.welcome).length);
  assert.ok(h.gestureMotions()[0].parts.every(part => !part.cancelled));
  await h.advance(expectedTimes[2] - 101); assert.equal(h.gestureMotions().length, 2);
  await h.advance(1);
  assert.deepEqual(h.gestureMotions().map(m => m.time), expectedTimes,
   'the full quiet pause begins only after the last part, including a late body, finishes');
 }
});

for (const setting of ['hidden', 'reduced', 'visibility']) await test(`${setting} cancels every rig part and resumes idle without stale entry`, async () => {
 for (const [index, key] of pageProfiles.index.entries()) {
  for (const phase of ['entry', 'idle']) {
   const h = createHarness({initialSection: index});
   await h.advance(phase === 'entry' ? 100 : 4800);
   const interrupted = h.gestureMotions().at(-1), count = h.gestureMotions().length;
   assert.equal(interrupted.kind, phase);
   h[setting](setting !== 'visibility');
   assert.equal(h.active.size, 0, `${setting}/${key}/${phase} cancels all active parts`);
   assert.ok(interrupted.parts.every(part => part.cancelled), 'group cancellation reaches each individual animation');
   const nextIndex = (index + 1) % pageProfiles.index.length;
   h.enter(nextIndex); await h.advance(10000);
   assert.equal(h.gestureMotions().length, count, 'no motion while blocked');
   h[setting](setting === 'visibility');
   await h.advance(2799); assert.equal(h.gestureMotions().length, count);
   await h.advance(1);
   assert.equal(h.gestureMotions().at(-1).kind, 'idle');
   assert.equal(h.gestureMotions().at(-1).behavior, pageProfiles.index[nextIndex]);
  }
 }
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
 assert.ok(h.gestureMotions()[0].parts.every(part => part.cancelled));
 await h.advance(20000); assert.equal(h.gestureMotions().length, 1);
});

await test('article cards activate contextual entries by pointer and keyboard', async () => {
 const h = createHarness({pathname: '/en/articles', count: 4});
 assert.ok(h.sectionSelector().includes('main .article-hub-header'));
 assert.ok(h.sectionSelector().includes('main .article-card'));
 await h.advance(1900); h.sections[1].emit('pointerenter');
 assert.equal(h.gestureMotions().at(-1).behavior, 'calendar');
 await h.advance(900); h.sections[2].emit('focusin');
 assert.equal(h.gestureMotions().at(-1).behavior, 'task');
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
   assert.deepEqual(transforms(h.gestureMotions()[0]), expected[key].entry, `${label} entry`);
   assert.equal(h.gestureMotions()[0].duration, 900, label);
   await h.advance(9899); assert.equal(h.gestureMotions().length, 1, `${label} waits nine seconds after entry`);
   await h.advance(1);
   assert.deepEqual(transforms(h.gestureMotions()[1]), expected[key].idle, `${label} idle`);
   assert.equal(h.gestureMotions()[1].duration, 1600, label);
   await h.advance(10599); assert.equal(h.gestureMotions().length, 2, `${label} pauses again after idle`);
   await h.advance(1); assert.equal(h.gestureMotions()[2].time, 20500, label);
  }
 }
});
