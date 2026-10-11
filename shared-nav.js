// Swap the right-hand slot only once the main download action scrolls away.
const navSlot = document.querySelector('.site-header .nav-slot');
const heroDownload = document.querySelector('.hero-ctas .play-cta') || document.querySelector('[data-nav-boundary]');
if (navSlot && heroDownload) {
 const language = navSlot.querySelector('.lang');
 const download = navSlot.querySelector('.nav-download');
 let pastHeroAction = false;
 const updateNavigation = () => {
  navSlot.closest('.site-header').classList.toggle('is-sticky', pastHeroAction);
  // Keep a keyboard user's focused control available until they leave the slot.
  if (navSlot.contains(document.activeElement)) return;
  language.hidden = pastHeroAction;
  download.hidden = !pastHeroAction;
 };
 const checkHeroPosition = () => {
  const boundary = document.querySelector('.hero-ctas .play-cta') || [...document.querySelectorAll('[data-nav-boundary]')].find(el => el.getClientRects().length);
  if (!boundary) return;
  const bottom = boundary.getBoundingClientRect().bottom;
  // Activate after the CTA passes above; a tiny return margin stops edge jitter.
  pastHeroAction = pastHeroAction ? bottom < 8 : bottom <= 0;
  updateNavigation();
 };
 let scheduled = false;
 const scheduleCheck = () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => { scheduled = false; checkHeroPosition(); });
 };
 addEventListener('scroll', scheduleCheck, {passive:true});
 addEventListener('resize', scheduleCheck);
 addEventListener('load', scheduleCheck);
 addEventListener('hashchange', scheduleCheck);
 document.querySelectorAll('.lang-btn').forEach(button => button.addEventListener('click', scheduleCheck));
 checkHeroPosition();
 navSlot.addEventListener('focusout', () => queueMicrotask(updateNavigation));
}

// Keep the full Ranca mascot lively without moving the header or its hit targets.
const headerMascot = document.querySelector('.site-header .brand-mark');
// Trusted bundled artwork, approved in the articulated prototype. No network or user HTML.
if (typeof window !== 'undefined' && headerMascot) {
 headerMascot.innerHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"741\" height=\"532\" viewBox=\"0 0 741 532\" class=\"ranca-rig\" aria-hidden=\"true\" focusable=\"false\">\n\n<defs>\n<path id=\"header-ranca-cloud\" d=\"M190 134 C210 63 286 39 346 75 C433 -29 627 17 645 165 C743 208 747 334 659 385 C634 506 459 564 346 455 C274 492 174 455 171 362 C69 316 81 172 190 134Z\"/>\n<clipPath id=\"header-ranca-clip\"><use href=\"#header-ranca-cloud\"/></clipPath>\n<radialGradient id=\"header-ranca-jade\" cx=\"46%\" cy=\"44%\" r=\"76%\"><stop offset=\"0\" stop-color=\"#18b375\"/><stop offset=\".52\" stop-color=\"#17b375\"/><stop offset=\"1\" stop-color=\"#19bd81\"/></radialGradient>\n<filter id=\"header-ranca-soft-rim\" x=\"-12%\" y=\"-12%\" width=\"124%\" height=\"124%\" color-interpolation-filters=\"sRGB\"><feGaussianBlur stdDeviation=\"15\"/></filter>\n<filter id=\"header-ranca-top-rim\" x=\"-12%\" y=\"-12%\" width=\"124%\" height=\"124%\" color-interpolation-filters=\"sRGB\"><feGaussianBlur stdDeviation=\"11\"/></filter>\n<linearGradient id=\"header-ranca-light-fade\" x1=\"0\" y1=\"0\" x2=\".2\" y2=\"1\"><stop offset=\"0\" stop-color=\"white\"/><stop offset=\".42\" stop-color=\"white\" stop-opacity=\".55\"/><stop offset=\".78\" stop-color=\"white\" stop-opacity=\"0\"/></linearGradient>\n<mask id=\"header-ranca-upper-light\" maskUnits=\"userSpaceOnUse\" x=\"0\" y=\"0\" width=\"741\" height=\"532\"><rect width=\"741\" height=\"532\" fill=\"url(#header-ranca-light-fade)\"/></mask>\n</defs>\n<g class=\"rig-body\">\n<use href=\"#header-ranca-cloud\" fill=\"url(#header-ranca-jade)\"/>\n<g clip-path=\"url(#header-ranca-clip)\">\n<use href=\"#header-ranca-cloud\" fill=\"none\" stroke=\"#91ffd5\" stroke-width=\"32\" opacity=\".97\" filter=\"url(#header-ranca-soft-rim)\"/>\n<g mask=\"url(#header-ranca-upper-light)\"><use href=\"#header-ranca-cloud\" fill=\"none\" stroke=\"#eefff6\" stroke-width=\"25\" opacity=\".99\" filter=\"url(#header-ranca-top-rim)\"/></g>\n</g>\n<g fill=\"none\" stroke=\"#ffffff\" stroke-width=\"15.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"rig-face\">\n<g class=\"rig-eye-left\"><path d=\"M281.8 246.7 C284.6 202.5 326.8 184.0 357.0 216.5\"/>\n</g><g class=\"rig-eye-right\"><path d=\"M417.8 201.0 C425.0 154.0 469.0 150.0 494.0 190.7\"/>\n</g><g class=\"rig-smile\"><path d=\"M345.2 275.4 C383.0 320.7 456.2 304.0 470.5 246.3\"/>\n</g></g>\n<g fill=\"none\" stroke=\"#ffffff\" stroke-width=\"11.7\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"rig-hands\">\n<g class=\"rig-hand-left\"><path d=\"M114.0 322.0 C87.5 314.8 70.5 279.7 57.5 255.3 C42.5 248.3 28.8 229.0 23.5 215.3 C20.6 208.2 27.4 203.6 32.8 207.2 L47.4 223.2 L40.1 201.0 C33.4 183.5 46.8 178.6 52.1 190.9 L66.9 216.0 L67.0 190.6 C66.0 177.1 81.1 176.9 82.4 188.8 L86.0 216.0 L95.4 204.0 C102.7 195.6 111.1 202.3 107.4 211.8 L94.9 241.5 C102.0 279.0 120.7 306.8 152.1 296.3\"/>\n</g><g class=\"rig-hand-right\"><path d=\"M622.3 323.7 C639.4 350.1 654.1 382.5 662.0 410.3 C667.6 430.1 672.9 452.2 666.2 466.4 C662.5 474.1 651.5 475.0 653.5 464.0 L657.1 447.9\"/>\n<path d=\"M651.9 388.6 C649.2 409.4 636.7 417.9 623.7 423.2 C609.4 429.6 597.9 446.2 603.6 455.1 C608.1 462.1 615.5 455.8 619.0 448.5 L617.0 466.7 C615.1 481.2 629.0 482.6 631.6 468.8 L635.1 447.7 M631.6 468.8 C629.8 482.0 644.0 482.0 646.2 470.2 L649.6 448.6\"/>\n</g></g>\n</g></svg>\n";
 headerMascot.dataset.rancaRig = 'true';
 headerMascot.setAttribute('aria-hidden', 'true');
}
if (typeof window !== 'undefined' && headerMascot && 'IntersectionObserver' in window && headerMascot.animate) {
 // Supporting pages retain their restrained semantic gestures on the full SVG.
 const gestures = {
  welcome: {entry:['rotate(0deg)','rotate(-9deg)','rotate(7deg)','rotate(-4deg)','rotate(0deg)'], idle:['rotate(0deg)','rotate(-4deg)','rotate(3deg)','rotate(0deg)']},
  study: {entry:['translateX(0) rotate(0deg)','translateX(2px) rotate(7deg)','translateX(2px) rotate(7deg)','translateX(0) rotate(0deg)'], idle:['rotate(0deg)','rotate(4deg)','rotate(4deg)','rotate(0deg)']},
  cards: {entry:['translateX(0) rotate(0deg)','translateX(-2px) rotate(-5deg)','translateX(2px) rotate(5deg)','translateX(0) rotate(0deg)'], idle:['translateX(0)','translateX(-1px)','translateX(1px)','translateX(0)']},
  confidence: {entry:['translateY(0) scale(1)','translateY(1.5px) scale(.96,1.02)','translateY(-1px) scale(1.02,.98)','translateY(0) scale(1)'], idle:['scale(1)','scale(1.025)','scale(1)']},
  download: {entry:['translateY(0)','translateY(3px)','translateY(0)','translateY(2px)','translateY(0)'], idle:['translateY(0)','translateY(1.5px)','translateY(0)']},
  question: {entry:['rotate(0deg)','rotate(-10deg)','rotate(-10deg)','rotate(3deg)','rotate(0deg)'], idle:['rotate(0deg)','rotate(-6deg)','rotate(-6deg)','rotate(0deg)']},
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
  next: {entry:['translateX(0)','translateX(3px)','translateX(0)'], idle:['translateX(0)','translateX(1px)','translateX(0)']},
  account: {calm:true, entry:['scale(1)','scale(1.02)','scale(1)'], idle:['scale(1)','scale(1.01)','scale(1)']},
  cloud: {calm:true, entry:['translateY(0)','translateY(-1.5px)','translateY(0)'], idle:['translateY(0)','translateY(-.5px)','translateY(0)']},
  privacy: {calm:true, entry:['rotate(0deg)','rotate(-2deg)','rotate(0deg)'], idle:['scale(1)','scale(1.01,.99)','scale(1)']},
  document: {calm:true, entry:['translateY(0)','translateY(1px)','translateY(0)'], idle:['rotate(0deg)','rotate(1deg)','rotate(0deg)']},
  payment: {calm:true, entry:['rotate(0deg)','rotate(2deg)','rotate(0deg)'], idle:['translateY(0)','translateY(.5px)','translateY(0)']},
  backup: {calm:true, entry:['scale(1)','scale(.98)','scale(1)'], idle:['scaleY(1)','scaleY(.99)','scaleY(1)']},
  diagnostics: {calm:true, entry:['translateX(0)','translateX(1px)','translateX(0)'], idle:['translateX(0)','translateX(.5px)','translateX(0)']},
  delete: {calm:true, entry:['rotate(0deg)','rotate(-1deg)','rotate(0deg)'], idle:['translateY(0)','translateY(.4px)','translateY(0)']},
  fairness: {calm:true, entry:['rotate(-1deg)','rotate(1deg)','rotate(0deg)'], idle:['rotate(0deg)','rotate(.5deg)','rotate(-.5deg)','rotate(0deg)']}
 };
 // Every gesture coordinates body posture with independently animated features.
 // Body transforms are rigid: no squash/stretch or silhouette redraw.
 const neutral='translate(0px,0px) rotate(0deg) scale(1)';
 const bodyNeutral='translate(0px,0px) rotate(0deg)';
 const poses={
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
 const idles={
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
 
 headerMascot.setAttribute('aria-hidden','true');
 const pageName = location.pathname.replace(/\/$/,'').split('/').pop()?.replace(/\.html$/,'') || 'index';
 const pageKey = ['id','en'].includes(pageName) ? 'index' : pageName;
 const sectionProfiles = {
  index:['welcome','study','cards','confidence','download','question'],
  about:['welcome','purpose','contact'],
  help:['welcome','study','start','question','contact'],
  premium:['purpose','cards','compare','download','restore','question'],
  articles:['study','calendar','task','flip'],
  'college-schedule':['calendar','study','start','example','edit','question','cards','download'],
  'todo-guide':['task','study','edit','example','confidence','question','cards','download'],
  'flashcard-guide':['cards','study','edit','flip','question','example','next','download'],
  privacy:['privacy','account','cloud','contact','payment','backup','diagnostics','privacy','delete','contact'],
  terms:['document','cards','account','payment','fairness','edit','privacy','contact'],
  'delete-account':['delete','document','cloud','contact']
 };
 const readingPolicy = ['privacy','terms','delete-account'].includes(pageKey);
 const sectionSelector = pageKey === 'articles'
  ? 'main .article-hub-header, main > section > header, main .article-card'
  : 'main > .hero-wrap, main section, .resource-main .resource-hero, main > article > header, main .article-end';
 const sections = [...document.querySelectorAll(sectionSelector)];
 const profileFor = new Map(sections.map((section,index) => {
  const key = sectionProfiles[pageKey]?.[index] || 'document';
  section.dataset.rancaBehavior = key;
  return [section,key];
 }));
 const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
 let mascotVisible = false;
 let sectionVisible = false;
 let animation = null;
 let activeSection = null;
 let activeKey = sectionProfiles[pageKey]?.[0] || "document";
 const updateProfile = () => { headerMascot.dataset.rancaBehavior = activeKey; };
 updateProfile();
 let idleTimer = null;
 let lastEntry = -Infinity;
 let pendingEntry = false;
 let animationIsEntry = false;
 let hasEntered = false;
 const canMove = () => mascotVisible && sectionVisible && !document.hidden && !reducedMotion.matches;
 const clearIdle = () => { clearTimeout(idleTimer); idleTimer = null; };
 const scheduleIdle = () => {
  clearIdle();
  if (!canMove() || animation) return;
  const delay = pendingEntry ? Math.max(0, 900 - (performance.now() - lastEntry)) : ((readingPolicy || gestures[activeKey].calm) ? 9000 : poses[activeKey] ? 2800 : 5000);
  idleTimer = setTimeout(() => playMascot(pendingEntry), delay);
 };
 const stopMotion = () => {
  clearIdle();
  pendingEntry = false;
  if (animation) { const previous = animation; animation = null; previous.cancel(); }
 };
 const playMascot = (entry) => {
  if (!canMove() || animation) return;
  clearIdle();
  if (entry) { hasEntered = true; pendingEntry = false; lastEntry = performance.now(); }
  animationIsEntry = entry;
  const profile = gestures[activeKey];
  updateProfile();
  headerMascot.dataset.rancaMotion = entry ? 'entry' : 'idle';
  const articulated = !readingPolicy && (entry ? poses : idles)[activeKey];
  const duration = articulated ? (entry ? 1900 : 1400)
   : readingPolicy || profile.calm ? (entry ? 900 : 1600) : (entry ? 700 : 1100);
  let movements = articulated || {'.ranca-rig': entry ? profile.entry : profile.idle};
  // Policy reading stays quiet with quarter-size whole-mascot gestures.
  if (readingPolicy) movements = Object.fromEntries(Object.entries(movements).map(([selector, values]) => [selector, values.map(transform => transform
   .replace(/(-?[\d.]+)(px|deg)/g, (_, value, unit) => `${Number(value) * .25}${unit}`)
   .replace(/(scale[XY]?\()([^)]+)(\))/g, (_, start, values, end) => start + values.split(',').map(value => 1 + (Number(value) - 1) * .25).join(',') + end))]));
  const parts = Object.entries(movements).map(([selector, values]) =>
   headerMascot.querySelector(selector).animate(values.map(transform => ({transform})), {
    duration, easing: 'ease-in-out', iterations: 1
   }));
  // Treat independent parts as one gesture: cancel together, never overlap or restart.
  const current = {cancel: () => parts.forEach(part => part.cancel()), finished: Promise.all(parts.map(part => part.finished))};
  animation = current;
  current.finished.then(() => {
   if (animation === current) { animation = null; scheduleIdle(); }
  }).catch(() => {});
 };
 const syncMotion = () => {
  if (canMove()) { if (!hasEntered) pendingEntry = true; scheduleIdle(); }
  else stopMotion();
 };
 const mascotObserver = new IntersectionObserver(entries => {
  mascotVisible = entries[0].isIntersecting;
  syncMotion();
 });
 mascotObserver.observe(headerMascot);
 const visibleSections = new Set();
 const activateSection = section => {
  sectionVisible = !!section;
  if (!section) activeSection = null;
  if (section && section !== activeSection) {
   activeSection = section; activeKey = profileFor.get(section); updateProfile(); pendingEntry = true;
  }
  if (!canMove()) { stopMotion(); return; }
  if (pendingEntry && performance.now() - lastEntry >= 900 && !animation) playMascot(true);
  else if (!animation && (pendingEntry || idleTimer === null)) scheduleIdle();
 };
 const onSectionsChanged = entries => {
  for (const entry of entries) {
   if (entry.isIntersecting) visibleSections.add(entry.target);
   else visibleSections.delete(entry.target);
  }
  const active = [...visibleSections].sort((a,b) => Math.abs(a.getBoundingClientRect().top - innerHeight * .3) - Math.abs(b.getBoundingClientRect().top - innerHeight * .3))[0];
  activateSection(active || null);
 };
 let sectionObserver;
 let resizeFrame;
 const observeSections = () => {
  sectionObserver?.disconnect();
  visibleSections.clear();
  // Pixel margins use viewport height; IO percentage margins use viewport width.
  sectionObserver = new IntersectionObserver(onSectionsChanged, {rootMargin: `-${Math.round(innerHeight * .3)}px 0px -${Math.round(innerHeight * .69)}px 0px`, threshold: 0});
  sections.forEach(section => sectionObserver.observe(section));
 };
 observeSections();
 if (pageKey === 'articles') sections.filter(section => section.matches('.article-card')).forEach(section => {
  section.addEventListener('pointerenter', () => activateSection(section));
  section.addEventListener('focusin', () => activateSection(section));
 });
 addEventListener('resize', () => {cancelAnimationFrame(resizeFrame);resizeFrame = requestAnimationFrame(observeSections);});
 addEventListener('scroll', () => {
  clearIdle();
  if (animation && !animationIsEntry) { const previous = animation; animation = null; previous.cancel(); }
  if (!animation) scheduleIdle();
 }, {passive: true});
 document.addEventListener('visibilitychange', syncMotion);
 reducedMotion.addEventListener('change', syncMotion);
}
