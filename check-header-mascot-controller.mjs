import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

// Deterministic controller coverage; actual markup, layout and artwork are checked
// in check-header-mascot.mjs. Only the approved SVG and its named parts may animate.
const code = await readFile(new URL('shared-nav.js', import.meta.url), 'utf8');
const approvedSVG = await readFile(new URL('assets/mascots/ranca-header.svg', import.meta.url), 'utf8');
const rigNames = ['ranca-rig', 'rig-body', 'rig-eye-left', 'rig-eye-right', 'rig-smile', 'rig-hand-left', 'rig-hand-right'];
const pathNames = ['rig-eye-left path', 'rig-eye-right path', 'rig-smile path'];
const actorNames = [...rigNames, ...pathNames];
// The approved unanimated geometry is an independent fixture, not parsed out of
// the controller. Animated CSS d must never rewrite these SVG attributes.
const neutralPaths = {
 'rig-eye-left path': 'M281.8 246.7 C284.6 202.5 326.8 184.0 357.0 216.5',
 'rig-eye-right path': 'M417.8 201.0 C425.0 154.0 469.0 150.0 494.0 190.7',
 'rig-smile path': 'M345.2 275.4 C383.0 320.7 456.2 304.0 470.5 246.3'
};
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
 initialReduced = false, initialHidden = false, initialVisible = true, notifyInitially = true, completionLag = {}, supportsPath = true} = {}) {
 let now = 0, nextTimer = 1, sectionSelector;
 const timers = new Map(), observers = [], motions = [], groups = [], active = new Set();
 const createdNodes = [], insertions = [], textWrites = [], styleWrites = [], supportChecks = [];
 const effects = new Map();
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
   style: new Proxy({}, {set(target, key, value) { styleWrites.push({element: name, key, value}); target[key] = value; return true; }}),
   setAttribute(key, value) { this.attributes[key] = value; },
   getAttribute(key) { return this.attributes[key] ?? null; },
   removeAttribute(key) { delete this.attributes[key]; },
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
    assert.ok(actorNames.includes(name), 'only the approved SVG or its named parts animate; the brand and wordmark stay still');
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
    assert.equal(options.fill, undefined, 'animations must not retain an effect after finishing');
    effects.set(name, motion);
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
      timers.delete(endTimer); active.delete(animation); effects.delete(name); reject?.(new Error('cancelled'));
     }
    };
    const endTimer = setTimer(() => {
     state = 'finished'; active.delete(animation); effects.delete(name); resolve?.();
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
 for (const name of pathNames) {
  const path = makeElement('path', name);
  path.attributes.d = neutralPaths[name];
  path.parentElement = rig[name.split(' ')[0]];
  path.parentElement.children = [path];
  rig[name] = path;
 }
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
  assert.ok(motions.every(motion => actorNames.includes(motion.element)), 'every motion belongs only to the mascot rig');
  assert.deepEqual(styleWrites, [], 'no inline animation state is written to the approved artwork');
  for (const name of pathNames) {
   assert.deepEqual(rig[name].attributes, {d: neutralPaths[name]}, `${name} retains its exact base SVG attributes`);
   assert.deepEqual(rig[name].style, {}, `${name} retains no inline style`);
  }
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
 if (supportsPath !== null) {
  const CSS = {supports: (property, value) => {
   supportChecks.push({property, value});
   assert.equal(property, 'd', 'path capability checks target CSS d');
   assert.match(value, /^path\(["']M.+["']\)$/, 'path support is checked with actual CSS path syntax');
   return supportsPath;
  }};
  context.CSS = CSS; context.window.CSS = CSS;
 }
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
 return {motions, groups, active, effects, rig, supportChecks, mascot, wordmark, assertMascotOnly, sections, advance, enter, leave, intersections, visibility, sectionObserver,
  gestureMotions: () => groups,
  sectionSelector: () => sectionSelector,
  scroll: () => emit(events, 'scroll'),
  resize: height => { context.innerHeight = height; emit(events, 'resize'); },
  hidden: value => { document.hidden = value; emit(documentEvents, 'visibilitychange'); },
  reduced: value => { reduced.matches = value; emit(events, 'reduced:change'); }
 };
}
const transforms = motion => motion.frames.map(frame => frame.transform);
const partTransforms = group => Object.fromEntries(group.parts.filter(part => !pathNames.includes(part.element)).map(part => [`.${part.element}`, transforms(part)]));
const pathParts = group => group.parts.filter(part => pathNames.includes(part.element));
const pathFrames = group => Object.fromEntries(pathParts(group).map(part => [`.${part.element}`, part.frames]));
const assertNeutralFrames = part => {
 const {offset: firstOffset, ...first} = part.frames[0];
 const {offset: lastOffset, ...last} = part.frames.at(-1);
 assert.deepEqual(first, last, `${part.element} returns to its neutral frame`);
};
const assertNoEffects = h => {
 assert.equal(h.active.size, 0, 'no running group or path animation remains');
 assert.equal(h.effects.size, 0, 'no animated CSS effect remains after stopping or finishing');
 h.assertMascotOnly();
};

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
  '.rig-body':[bodyNeutral,'translate(10px,12px) rotate(5deg)','translate(10px,12px) rotate(5deg)','translate(-8px,12px) rotate(-4deg)','translate(-8px,12px) rotate(-4deg)',bodyNeutral],
  '.rig-eye-left':['translate(0px,0px)','translate(24px,28px)','translate(24px,28px)','translate(-20px,28px)','translate(-20px,28px)','translate(0px,0px)'],
  '.rig-eye-right':['translate(0px,0px)','translate(24px,28px)','translate(24px,28px)','translate(-20px,28px)','translate(-20px,28px)','translate(0px,0px)'],
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
  '.rig-eye-left':['translateY(0px)','translateY(8px)','translateY(8px)','translateY(0px)'],
  '.rig-eye-right':['translateY(0px)','translateY(8px)','translateY(8px)','translateY(0px)'],
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
  '.rig-eye-left':['translateY(0px)','translateY(-22px)','translateY(-22px)','translateY(6px)','translateY(0px)'],
  '.rig-eye-right':['translateY(0px)','translateY(9px)','translateY(9px)','translateY(-12px)','translateY(0px)'],
  '.rig-smile':['scale(1)','scale(.8,.65)','scale(.8,.65)','scale(1)'],
  '.rig-hand-right':[neutral,'translate(-15px,-5px) rotate(100deg)','translate(-15px,-5px) rotate(100deg)',neutral]
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
  '.rig-eye-left':['translate(0px,0px)','translate(16px,22px)','translate(-13px,22px)','translate(0px,0px)'],
  '.rig-eye-right':['translate(0px,0px)','translate(16px,22px)','translate(-13px,22px)','translate(0px,0px)']
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
  '.rig-eye-left':['translateY(0px)','translateY(5px)','translateY(0px)'],
  '.rig-eye-right':['translateY(0px)','translateY(5px)','translateY(0px)'],
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
  '.rig-eye-right':['translateY(0px)','translateY(5px)','translateY(0px)'],
  '.rig-smile':['scale(1)','scale(.9,.82)','scale(1)'],
  '.rig-hand-right':[neutral,'translate(-10px,0px) rotate(85deg)','translate(-10px,0px) rotate(85deg)',neutral]
 }
};

// Fixed path-shape and timing fixtures independent of controller internals.
// Closure fractions label known geometry; no production morph helper is reused.
const eyeShapes = {
 "0": {
  "left": [281.8,246.7,284.6,202.5,326.8,184.0,357,216.5],
  "right": [417.8,201,425.0,154.0,469.0,150.0,494,190.7]
 },
 "0.1": {
  "left": [281.8,246.7,286.8267,205.9133,327.3133,188.2567,357.0,216.5],
  "right": [417.8,201.0,426.82,158.3567,468.96,154.4133,494.0,190.7]
 },
 "0.15": {
  "left": [281.8,246.7,287.94,207.62,327.57,190.385,357.0,216.5],
  "right": [417.8,201.0,427.73,160.535,468.94,156.62,494.0,190.7]
 },
 "0.2": {
  "left": [281.8,246.7,289.0533,209.3267,327.8267,192.5133,357.0,216.5],
  "right": [417.8,201.0,428.64,162.7133,468.92,158.8267,494.0,190.7]
 },
 "0.3": {
  "left": [281.8,246.7,291.28,212.74,328.34,196.77,357.0,216.5],
  "right": [417.8,201.0,430.46,167.07,468.88,163.24,494.0,190.7]
 },
 "0.35": {
  "left": [281.8,246.7,292.3933,214.4467,328.5967,198.8983,357.0,216.5],
  "right": [417.8,201.0,431.37,169.2483,468.86,165.4467,494.0,190.7]
 },
 "0.75": {
  "left": [281.8,246.7,301.3,228.1,330.65,215.925,357.0,216.5],
  "right": [417.8,201.0,438.65,186.675,468.7,183.1,494.0,190.7]
 },
 "0.8": {
  "left": [281.8,246.7,302.4133,229.8067,330.9067,218.0533,357.0,216.5],
  "right": [417.8,201.0,439.56,188.8533,468.68,185.3067,494.0,190.7]
 },
 "1": {
  "left": [281.8,246.7,306.8667,236.6333,331.9333,226.5667,357,216.5],
  "right": [417.8,201,443.2,197.5667,468.6,194.1333,494,190.7]
 }
};
const mouthShapes = {
 "open": [345.2,275.4,383,320.7,456.2,304,470.5,246.3],
 "cheerful1": [345.2,275.4,375,339.0,462.0,318,470.5,246.3],
 "cheerful0.6": [345.2,275.4,378.2,331.68,459.68,312.4,470.5,246.3],
 "cheerful0.4": [345.2,275.4,379.8,328.02,458.52,309.6,470.5,246.3],
 "cheerful0.55": [345.2,275.4,378.6,330.765,459.39,311.7,470.5,246.3],
 "focused0.7": [345.2,275.4,387.9,304.81,451.86,288.6,470.5,246.3],
 "focused0.5": [345.2,275.4,386.5,309.35,453.1,293.0,470.5,246.3],
 "contented1": [345.2,275.4,378,330.0,462.0,314,470.5,246.3],
 "contented0.7": [345.2,275.4,379.5,327.21,460.26,311.0,470.5,246.3],
 "thinking1": [345.2,275.4,381,283.0,446.0,268,470.5,246.3],
 "thinking0.8": [345.2,275.4,381.4,290.54,448.04,275.2,470.5,246.3]
};
const facialTimelines = {
 entry: {
  welcome: {eyes: [[0,0],[.12,0],[.16,1],[.22,1],[.27,0],[1,0]], mouth: [[0,'open'],[.28,'cheerful1'],[.72,'cheerful1'],[1,'open']]},
  study: {eyes: [[0,0],[.1,0],[.14,1],[.2,1],[.25,.3],[.72,.3],[.9,0],[1,0]], mouth: [[0,'open'],[.3,'focused0.7'],[.75,'focused0.7'],[1,'open']]},
  cards: {eyes: [[0,0],[.36,0],[.4,1],[.47,1],[.52,0],[1,0]], mouth: [[0,'open'],[.35,'cheerful0.4'],[.75,'cheerful0.4'],[1,'open']]},
  confidence: {eyes: [[0,0],[.2,.35],[.32,1],[.65,1],[.83,.2],[1,0]], mouth: [[0,'open'],[.25,'contented1'],[.72,'contented1'],[1,'open']]},
  download: {eyes: [[0,0],[.1,0],[.14,1],[.2,1],[.25,.2],[.8,.2],[1,0]], mouth: [[0,'open'],[.3,'cheerful0.55'],[.75,'cheerful0.55'],[1,'open']]},
  question: {eyes: [[0,0],[.23,.1],[.65,.1],[.73,1],[.79,1],[.86,0],[1,0]], right: [[0,0],[.23,.8],[.65,.8],[.73,1],[.79,1],[.86,0],[1,0]], mouth: [[0,'open'],[.24,'thinking1'],[.7,'thinking1'],[1,'open']]}
 },
 idle: {
  welcome: {eyes: [[0,0],[.18,0],[.23,1],[.31,1],[.37,0],[1,0]], mouth: [[0,'open'],[.4,'cheerful0.6'],[.72,'cheerful0.6'],[1,'open']]},
  study: {eyes: [[0,0],[.2,.3],[.56,.3],[.61,1],[.69,1],[.76,.3],[1,0]], mouth: [[0,'open'],[.3,'focused0.5'],[.7,'focused0.5'],[1,'open']]},
  cards: {eyes: [[0,0],[.38,0],[.43,1],[.51,1],[.57,0],[1,0]]},
  confidence: {eyes: [[0,0],[.22,.3],[.35,1],[.65,1],[.82,.2],[1,0]], mouth: [[0,'open'],[.3,'contented0.7'],[.7,'contented0.7'],[1,'open']]},
  download: {eyes: [[0,0],[.2,.2],[.55,.2],[.6,1],[.68,1],[.75,.2],[1,0]]},
  question: {eyes: [[0,0],[.22,.15],[.55,.15],[.63,1],[.71,1],[.8,0],[1,0]], right: [[0,0],[.22,.75],[.55,.75],[.63,1],[.71,1],[.8,0],[1,0]], mouth: [[0,'open'],[.3,'thinking0.8'],[.7,'thinking0.8'],[1,'open']]}
 }
};
const fallbackEyeScales = {0:1, .1:.908, .15:.862, .2:.816, .3:.724, .35:.678, .75:.31, .8:.264, 1:.08};
const fallbackMouthScales = {open:1, cheerful1:.7, 'cheerful0.6':.82, 'cheerful0.4':.88, 'cheerful0.55':.835,
 'focused0.7':.79, 'focused0.5':.85, contented1:.7, 'contented0.7':.79, thinking1:.7, 'thinking0.8':.76};
const decodePath = value => {
 assert.match(value, /^path\("M-?[\d.]+ -?[\d.]+ C-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+"\)$/, 'each path retains one compatible cubic curve');
 const points = value.match(/-?[\d.]+/g).map(Number);
 assert.ok(points.every(Number.isFinite), 'every path coordinate is finite');
 return points;
};
const curveBow = ([x0,y0,x1,y1,x2,y2,x3,y3]) => Math.max(
 Math.abs((x3-x0)*(y1-y0)-(y3-y0)*(x1-x0)),
 Math.abs((x3-x0)*(y2-y0)-(y3-y0)*(x2-x0))) / Math.hypot(x3-x0,y3-y0);
function assertFacialFrames(group, supportsPath = true) {
 const expected = facialTimelines[group.kind][group.behavior];
 const specs = {
  '.rig-eye-left path': {timeline: expected.eyes, shapes: Object.fromEntries(Object.entries(eyeShapes).map(([amount, eyes]) => [amount, eyes.left])), scales: fallbackEyeScales},
  '.rig-eye-right path': {timeline: expected.right || expected.eyes, shapes: Object.fromEntries(Object.entries(eyeShapes).map(([amount, eyes]) => [amount, eyes.right])), scales: fallbackEyeScales},
  ...(expected.mouth ? {'.rig-smile path': {timeline: expected.mouth, shapes: mouthShapes, scales: fallbackMouthScales}} : {})
 };
 const actual = pathFrames(group);
 assert.deepEqual(Object.keys(actual).sort(), Object.keys(specs).sort(), `${group.behavior}/${group.kind} has exactly the expected facial actors`);
 for (const [selector, {timeline, shapes, scales}] of Object.entries(specs)) {
  const frames = actual[selector];
  assert.deepEqual(frames.map(frame => frame.offset), timeline.map(([offset]) => offset), `${selector} preserves the explicit closure and expression beats`);
  for (const [index, [, shape]] of timeline.entries()) {
   const frame = frames[index];
   assert.deepEqual(Object.keys(frame).sort(), ['offset', supportsPath ? 'd' : 'transform'].sort(), 'mixed frame objects keep their native WAAPI property');
   if (supportsPath) {
    const points = decodePath(frame.d);
    assert.deepEqual(points, shapes[shape], `${group.behavior}/${group.kind}/${selector} frame ${index}`);
    const neutral = selector.includes('smile') ? mouthShapes.open : eyeShapes[0][selector.includes('left') ? 'left' : 'right'];
    assert.deepEqual([points[0], points[1], points[6], points[7]], [neutral[0], neutral[1], neutral[6], neutral[7]], 'facial morphs keep their endpoints fixed');
    for (let i = 0; i < points.length; i += 2) {
     assert.ok(points[i] >= 280 && points[i] <= 495, 'facial curves remain inside their horizontal SVG bounds');
     assert.ok(points[i+1] >= 150 && points[i+1] <= 340, 'facial curves remain inside their vertical SVG bounds');
    }
   } else assert.equal(frame.transform, `scaleY(${scales[shape]})`, 'unsupported CSS d uses the independent scaleY fallback fixture');
  }
 }
}

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
   assert.equal(h.active.size, articulated ? Object.keys(articulated).length + 3 : 1,
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
     assertFacialFrames(group);
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
   assert.deepEqual(part.options, {duration: 1900, easing: pathNames.includes(part.element) ? 'linear' : 'ease-in-out', iterations: 1});
   assert.equal(part.time, 0, 'all parts start together');
   assertNeutralFrames(part);
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
   assert.deepEqual(part.options, {duration: 1400, easing: pathNames.includes(part.element) ? 'linear' : 'ease-in-out', iterations: 1});
   assert.equal(part.time, 4700, 'idle waits 2.8 seconds after the complete entry');
   assertNeutralFrames(part);
  }
  idleSequences.add(JSON.stringify(partTransforms(idle)));
 }
 assert.deepEqual([...animatedParts].sort(), actorNames.filter(name => name !== 'ranca-rig').sort(),
  'both eyes, smile, both hands and body each have independent animations');
 for (const [label, values] of Object.entries({entrySequences, idleSequences, entryBodies, idleBodies})) {
  assert.equal(values.size, 6, `all six homepage ${label} are distinct`);
 }
});

await test('every facial gesture genuinely closes both cubic eyelids and reopens them', async () => {
 for (const [index, key] of pageProfiles.index.entries()) {
  const h = createHarness({initialSection: index});
  assert.equal(h.supportChecks.length, 1, 'CSS d capability is checked once');
  await h.advance(4700);
  for (const group of h.gestureMotions()) {
   assertFacialFrames(group);
   for (const side of ['left', 'right']) {
    const part = pathParts(group).find(part => part.element === `rig-eye-${side} path`);
    const bows = part.frames.map(frame => curveBow(decodePath(frame.d)));
    assert.ok(bows[0] > 30 && bows.at(-1) > 30, `${key}/${group.kind}/${side} begins and ends visibly open`);
    const closed = bows.findIndex(bow => bow < .0001);
    assert.ok(closed > 0 && closed < bows.length - 2, `${key}/${group.kind}/${side} contains a real straightened eyelid`);
    assert.ok(bows[closed + 1] < .0001, 'eye closure is held across two keyframes rather than a single flash');
    assert.ok((part.frames[closed + 1].offset - part.frames[closed].offset) * part.duration >= 80,
     'the closed-eye hold remains visibly perceptible');
    assert.ok(part.frames[closed + 1].offset < 1, 'the eye reopens before the gesture completes');
    assertNeutralFrames(part);
    assert.ok(part.frames.every(frame => !('transform' in frame)), 'supported eyelids change their curve rather than merely scaling');
   }
  }
  await h.advance(1400);
  assertNoEffects(h);
 }
});

await test('reading and thinking expressions have distinct geometry alongside their coordinated group poses', async () => {
 const reading = createHarness({initialSection: 1});
 const thinking = createHarness({initialSection: 5});
 await reading.advance(4700); await thinking.advance(4700);
 for (const group of reading.gestureMotions()) {
  assert.deepEqual(partTransforms(group), (group.kind === 'entry' ? expectedPoses : expectedIdles).study);
  assertFacialFrames(group);
  for (const side of ['left', 'right']) {
   const part = pathParts(group).find(part => part.element === `rig-eye-${side} path`);
   const lowered = part.frames.find(frame => decodePath(frame.d).every((value, i) => value === eyeShapes[.3][side][i]));
   assert.ok(lowered, 'reading holds a lowered 30%-closed eyelid while scanning');
  }
  const smile = pathParts(group).find(part => part.element === 'rig-smile path');
  assert.ok(curveBow(decodePath(smile.frames[1].d)) < curveBow(mouthShapes.open), 'reading changes the smile into a focused curve');
 }
 for (const group of thinking.gestureMotions()) {
  assert.deepEqual(partTransforms(group), (group.kind === 'entry' ? expectedPoses : expectedIdles).question);
  assertFacialFrames(group);
  const left = pathParts(group).find(part => part.element === 'rig-eye-left path');
  const right = pathParts(group).find(part => part.element === 'rig-eye-right path');
  assert.ok(curveBow(decodePath(left.frames[1].d)) > 3 * curveBow(decodePath(right.frames[1].d)),
   'thinking narrows one eye more than the other');
  const smile = pathParts(group).find(part => part.element === 'rig-smile path');
  assert.ok(curveBow(decodePath(smile.frames[1].d)) < .65 * curveBow(mouthShapes.open),
   'thinking has a substantially flatter mouth with fixed endpoints');
  assert.ok(group.parts.some(part => part.element === 'rig-hand-right'), 'the thoughtful face is coordinated with a raised right hand');
  assertRigidBody(group);
 }
});

await test('unsupported and absent CSS d retain timed scaleY fallbacks with no residual artwork state', async () => {
 for (const supportsPath of [false, null]) {
  for (const [index, key] of pageProfiles.index.entries()) {
   const h = createHarness({initialSection: index, supportsPath});
   assert.equal(h.supportChecks.length, supportsPath === null ? 0 : 1);
   const entry = h.gestureMotions()[0];
   assert.deepEqual(partTransforms(entry), expectedPoses[key], 'fallback keeps independent group poses unchanged');
   assertFacialFrames(entry, false);
   assert.equal(entry.duration, 1900);
   await h.advance(1900); assertNoEffects(h);
   await h.advance(2799); assert.equal(h.gestureMotions().length, 1);
   await h.advance(1);
   const idle = h.gestureMotions()[1];
   assert.equal(idle.time, 4700); assert.equal(idle.duration, 1400);
   assert.deepEqual(partTransforms(idle), expectedIdles[key]);
   assertFacialFrames(idle, false);
   for (const group of h.gestureMotions()) {
    assertRigidBody(group);
    for (const part of pathParts(group)) {
     assertNeutralFrames(part);
     assert.ok(part.frames.every(frame => !('d' in frame)), 'unsupported browsers never receive CSS d frames');
    }
   }
   await h.advance(1400); assertNoEffects(h);
  }
 }
});

await test('fallback facial actors stop cleanly on scroll, reduced motion, hidden pages and offscreen headers', async () => {
 for (const supportsPath of [false, null]) {
  for (const setting of ['scroll', 'hidden', 'reduced', 'visibility']) {
   for (const index of pageProfiles.index.keys()) {
    for (const phase of setting === 'scroll' ? ['idle'] : ['entry', 'idle']) {
     const h = createHarness({initialSection: index, supportsPath});
     await h.advance(phase === 'entry' ? 500 : 5300);
     const interrupted = h.gestureMotions().at(-1), count = h.gestureMotions().length;
     assert.equal(interrupted.kind, phase);
     assert.equal(pathParts(interrupted).length, phase === 'entry' || ![2,4].includes(index) ? 3 : 2);
     h[setting](setting !== 'visibility');
     assert.ok(interrupted.parts.every(part => part.cancelled), 'cancellation reaches every group and fallback path actor');
     assertNoEffects(h);
     if (setting !== 'scroll') {
      h.enter((index + 1) % pageProfiles.index.length);
      await h.advance(10000);
      assert.equal(h.gestureMotions().length, count, 'blocked state schedules no stale path or group motion');
      assertNoEffects(h);
      h[setting](setting === 'visibility');
     }
     await h.advance(2799); assert.equal(h.gestureMotions().length, count);
     await h.advance(1);
     assert.equal(h.gestureMotions().at(-1).kind, 'idle', 'resuming starts one fresh idle group');
     assertFacialFrames(h.gestureMotions().at(-1), false);
    }
   }
  }
  for (const option of ['initialReduced', 'initialHidden', 'initialVisible']) {
   const h = createHarness({supportsPath, [option]: option !== 'initialVisible'});
   await h.advance(20000); assertNoEffects(h);
   assert.equal(h.motions.length, 0, 'initially blocked fallback starts no animations');
  }
 }
});

for (const switchAt of [300, 750]) await test(`entry at ${switchAt}ms waits for every active part and the 900ms minimum cooldown`, async () => {
 for (const scenario of [
  {pathname: '/id/', first: 0, next: 1, replay: 1900, keys: ['welcome', 'study']},
  {pathname: '/id/', first: 0, next: 1, replay: 2400, completionLag: {'rig-smile': 500}, keys: ['welcome', 'study']},
  {pathname: '/id/', first: 0, next: 1, replay: 2600, completionLag: {'rig-body': 700}, keys: ['welcome', 'study']},
  {pathname: '/id/', first: 0, next: 1, replay: 2700, completionLag: {'rig-eye-left path': 800}, keys: ['welcome', 'study']},
  {pathname: '/id/', first: 0, next: 1, replay: 2800, completionLag: {'rig-smile path': 900}, keys: ['welcome', 'study']},
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
  assertNoEffects(h);
  assert.ok(h.gestureMotions().at(-1).parts.every(part => part.cancelled), 'every active idle part is cancelled');
  await h.advance(2799); assert.equal(h.gestureMotions().length, 2);
  await h.advance(1);
  assert.equal(h.gestureMotions()[2].time, 7600);
 }
});

await test('scroll preserves entry and each idle has a full pause after it finishes', async () => {
 for (const {completionLag, expectedTimes} of [
  {completionLag: {}, expectedTimes: [0, 4700, 8900]},
  {completionLag: {'rig-body': 500}, expectedTimes: [0, 5200, 9900]},
  {completionLag: {'rig-eye-right path': 600}, expectedTimes: [0, 5300, 10100]},
  {completionLag: {'rig-smile path': 700}, expectedTimes: [0, 5400, 10300]}
 ]) {
  const h = createHarness({completionLag});
  await h.advance(100); h.scroll();
  assert.equal(h.active.size, Object.keys(expectedPoses.welcome).length + 3);
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
   assertNoEffects(h);
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
 assertNoEffects(h);
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
