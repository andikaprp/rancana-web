import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Deterministic controller coverage; browser layout/visibility stays in check-header-mascot.mjs.
const code = await readFile(new URL('shared-nav.js', import.meta.url), 'utf8');
function createHarness() {
 let now = 0, nextTimer = 1;
 const timers = new Map(), observers = [], motions = [], active = new Set();
 const events = new Map(), documentEvents = new Map();
 const sections = [{id: 'first'}, {id: 'second'}, {id: 'third'}];
 const on = (map, name, callback) => map.set(name, [...(map.get(name) || []), callback]);
 const emit = (map, name) => (map.get(name) || []).forEach(callback => callback());
 const setTimer = (callback, delay) => {
  const id = nextTimer++;
  timers.set(id, {callback, at: now + delay});
  return id;
 };
 const mascot = {animate: (frames, options) => {
  assert.equal(active.size, 0, 'mascot animations never overlap');
  const motion = {time: now, duration: options.duration, cancelled: false};
  motions.push(motion);
  let resolve, reject;
  const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
  const animation = {finished, cancel: () => {
   motion.cancelled = true;
   timers.delete(endTimer);
   active.delete(animation);
   reject(new Error('cancelled'));
  }};
  const endTimer = setTimer(() => { active.delete(animation); resolve(); }, options.duration);
  active.add(animation);
  return animation;
 }};
 const reduced = {matches: false, addEventListener: (name, callback) => on(events, `reduced:${name}`, callback)};
 let sectionSelector;
 const document = {
  hidden: false,
  querySelector: selector => selector === '.site-header .brand-mark' ? mascot : null,
  querySelectorAll: selector => { sectionSelector = selector; return sections; },
  addEventListener: (name, callback) => on(documentEvents, name, callback)
 };
 const context = {
  window: {IntersectionObserver: true}, document, innerHeight: 1080,
  performance: {now: () => now}, matchMedia: () => reduced,
  setTimeout: setTimer, clearTimeout: id => timers.delete(id),
  requestAnimationFrame: callback => setTimer(callback, 16), cancelAnimationFrame: id => timers.delete(id),
  addEventListener: (name, callback) => on(events, name, callback),
  IntersectionObserver: class {
   constructor(callback, options) { this.callback = callback; this.options = options; observers.push(this); }
   observe() {}
   disconnect() { this.disconnected = true; }
  }
 };
 vm.runInNewContext(code, context);
 const sectionObserver = () => observers.filter(observer => observer.options).at(-1);
 const visibility = visible => observers[0].callback([{isIntersecting: visible}]);
 const enter = (index = 0) => sectionObserver().callback([{target: sections[index], isIntersecting: true}]);
 const advance = async duration => {
  const end = now + duration;
  for (;;) {
   const due = [...timers].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
   if (!due) break;
   timers.delete(due[0]); now = due[1].at; due[1].callback();
   await Promise.resolve(); await Promise.resolve();
  }
  now = end;
  await Promise.resolve(); await Promise.resolve();
 };
 visibility(true); enter();
 return {motions, active, advance, enter, visibility, sectionObserver,
  sectionSelector: () => sectionSelector,
  scroll: () => emit(events, 'scroll'),
  resize: height => { context.innerHeight = height; emit(events, 'resize'); },
  hidden: value => { document.hidden = value; emit(documentEvents, 'visibilitychange'); },
  reduced: value => { reduced.matches = value; emit(events, 'reduced:change'); }
 };
}

{
 const h = createHarness();
 assert.equal(h.sectionObserver().options.rootMargin, '-162px 0px -486px 0px');
 assert.ok(h.sectionSelector().includes('.resource-main .resource-hero'), 'nested resource intros are observed');
 await h.advance(300); h.enter(1);
 await h.advance(599); assert.equal(h.motions.length, 1, 'entry waits for active motion and cooldown');
 await h.advance(1); assert.deepEqual(h.motions.map(m => m.time), [0, 900]);
 const oldObserver = h.sectionObserver();
 h.resize(800); await h.advance(16);
 assert.equal(oldObserver.disconnected, true);
 assert.equal(h.sectionObserver().options.rootMargin, '-120px 0px -360px 0px');
}
{
 const h = createHarness();
 await h.advance(750); h.enter(1);
 await h.advance(149); assert.equal(h.motions.length, 1);
 await h.advance(1); assert.equal(h.motions[1].time, 900, 'entry during cooldown is replayed');
}
{
 const h = createHarness();
 await h.advance(700);
 for (let i = 0; i < 24; i++) { await h.advance(250); h.scroll(); }
 assert.equal(h.motions.length, 1, 'continuous scrolling prevents idle motion');
 await h.advance(4999); assert.equal(h.motions.length, 1);
 await h.advance(1); assert.equal(h.motions[1].duration, 1100);
 await h.advance(100); h.enter(1);
 await h.advance(999); assert.equal(h.motions.length, 2, 'entry waits for active idle motion');
 await h.advance(1); assert.equal(h.motions[2].duration, 700, 'entry during idle is replayed');
}
{
 const h = createHarness();
 await h.advance(5700); assert.equal(h.motions.at(-1).duration, 1100);
 h.scroll(); assert.equal(h.active.size, 0, 'scroll cancels idle motion');
 assert.equal(h.motions.at(-1).cancelled, true);
 await h.advance(4999); assert.equal(h.motions.length, 2);
 await h.advance(1); assert.equal(h.motions.length, 3, 'idle resumes after stopping');
}
for (const setting of ['hidden', 'reduced', 'visibility']) {
 const h = createHarness();
 await h.advance(100);
 h[setting](setting !== 'visibility');
 assert.equal(h.active.size, 0, `${setting} cancels active motion`);
 h.enter(1); await h.advance(10000);
 assert.equal(h.motions.length, 1, `${setting} prevents entry and idle`);
 h[setting](setting === 'visibility');
 await h.advance(5000);
 assert.equal(h.motions.length, 2, `${setting} recovery resumes idle`);
}
console.log('PASS — header entry queue/cooldown, scroll-debounced idle, no overlap, pause/resume, height-based resize and nested intro selector');
