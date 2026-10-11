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
if (typeof window !== 'undefined' && headerMascot && 'IntersectionObserver' in window && headerMascot.animate) {
 // Semantic gestures preserve the approved bitmap; no facial/limb redraws.
 const gestures = {
  welcome: {cue:'wave', entry:['rotate(0deg)','rotate(-9deg)','rotate(7deg)','rotate(-4deg)','rotate(0deg)'], idle:['rotate(0deg)','rotate(-4deg)','rotate(3deg)','rotate(0deg)']},
  study: {cue:'book', entry:['translateX(0) rotate(0deg)','translateX(2px) rotate(7deg)','translateX(2px) rotate(7deg)','translateX(0) rotate(0deg)'], idle:['rotate(0deg)','rotate(4deg)','rotate(4deg)','rotate(0deg)']},
  cards: {cue:'cards', entry:['translateX(0) rotate(0deg)','translateX(-2px) rotate(-5deg)','translateX(2px) rotate(5deg)','translateX(0) rotate(0deg)'], idle:['translateX(0)','translateX(-1px)','translateX(1px)','translateX(0)']},
  confidence: {cue:'check', entry:['translateY(0) scale(1)','translateY(1.5px) scale(.96,1.02)','translateY(-1px) scale(1.02,.98)','translateY(0) scale(1)'], idle:['scale(1)','scale(1.025)','scale(1)']},
  download: {cue:'download', entry:['translateY(0)','translateY(3px)','translateY(0)','translateY(2px)','translateY(0)'], idle:['translateY(0)','translateY(1.5px)','translateY(0)']},
  question: {cue:'question', entry:['rotate(0deg)','rotate(-10deg)','rotate(-10deg)','rotate(3deg)','rotate(0deg)'], idle:['rotate(0deg)','rotate(-6deg)','rotate(-6deg)','rotate(0deg)']},
  purpose: {cue:'target', entry:['translateX(-2px) scale(.96)','translateX(0) scale(1.04)','translateX(0) scale(1)'], idle:['scale(1)','scale(1.02,1)','scale(1)']},
  contact: {cue:'chat', entry:['rotate(0deg)','rotate(6deg)','rotate(-3deg)','rotate(6deg)','rotate(0deg)'], idle:['translateX(0)','translateX(1.5px)','translateX(0)']},
  start: {cue:'plus', entry:['scale(.94)','scale(1.06)','scale(1)'], idle:['scale(1)','scale(1.035)','scale(1)']},
  compare: {cue:'compare', entry:['rotate(0deg)','rotate(-7deg)','rotate(7deg)','rotate(0deg)'], idle:['rotate(-2deg)','rotate(2deg)','rotate(-2deg)','rotate(0deg)']},
  restore: {cue:'restore', entry:['rotate(0deg)','rotate(-7deg) translateX(-1px)','rotate(0deg) translateY(-2px)','rotate(7deg) translateX(1px)','rotate(0deg)'], idle:['rotate(0deg)','rotate(-3deg)','rotate(0deg)']},
  calendar: {cue:'calendar', entry:['translateX(0)','translateX(-2px)','translateX(0)','translateX(2px)','translateX(0)'], idle:['translateY(0)','translateY(1px)','translateY(0)','translateY(1px)','translateY(0)']},
  task: {cue:'checklist', entry:['translateX(0) translateY(0)','translateX(-1px) translateY(2px)','translateX(2px) translateY(-1px)','translateX(0) translateY(0)'], idle:['rotate(0deg)','rotate(3deg)','rotate(0deg)']},
  flip: {cue:'cards', entry:['scaleX(1)','scaleX(.78)','scaleX(1.02)','scaleX(1)'], idle:['scaleX(1)','scaleX(.92)','scaleX(1)']},
  example: {cue:'eye', entry:['translateX(0)','translateX(2px)','translateX(-1px)','translateX(0)'], idle:['scaleY(1)','scaleY(.96)','scaleY(1)']},
  edit: {cue:'pencil', entry:['rotate(0deg)','rotate(-4deg) translateX(-1px)','rotate(4deg) translateX(1px)','rotate(-3deg)','rotate(0deg)'], idle:['rotate(0deg)','rotate(2deg)','rotate(-2deg)','rotate(0deg)']},
  next: {cue:'arrow', entry:['translateX(0)','translateX(3px)','translateX(0)'], idle:['translateX(0)','translateX(1px)','translateX(0)']},
  account: {cue:'person', calm:true, entry:['scale(1)','scale(1.02)','scale(1)'], idle:['scale(1)','scale(1.01)','scale(1)']},
  cloud: {cue:'cloud', calm:true, entry:['translateY(0)','translateY(-1.5px)','translateY(0)'], idle:['translateY(0)','translateY(-.5px)','translateY(0)']},
  privacy: {cue:'shield', calm:true, entry:['rotate(0deg)','rotate(-2deg)','rotate(0deg)'], idle:['scale(1)','scale(1.01,.99)','scale(1)']},
  document: {cue:'document', calm:true, entry:['translateY(0)','translateY(1px)','translateY(0)'], idle:['rotate(0deg)','rotate(1deg)','rotate(0deg)']},
  payment: {cue:'receipt', calm:true, entry:['rotate(0deg)','rotate(2deg)','rotate(0deg)'], idle:['translateY(0)','translateY(.5px)','translateY(0)']},
  backup: {cue:'archive', calm:true, entry:['scale(1)','scale(.98)','scale(1)'], idle:['scaleY(1)','scaleY(.99)','scaleY(1)']},
  diagnostics: {cue:'chart', calm:true, entry:['translateX(0)','translateX(1px)','translateX(0)'], idle:['translateX(0)','translateX(.5px)','translateX(0)']},
  delete: {cue:'delete', calm:true, entry:['rotate(0deg)','rotate(-1deg)','rotate(0deg)'], idle:['translateY(0)','translateY(.4px)','translateY(0)']},
  fairness: {cue:'balance', calm:true, entry:['rotate(-1deg)','rotate(1deg)','rotate(0deg)'], idle:['rotate(0deg)','rotate(.5deg)','rotate(-.5deg)','rotate(0deg)']}
 };
 const cuePaths = {
  wave:'M3 9V6m3 2V3m3 5V2m3 7V4m-9 5 3 5h5l3-6',
  book:'M8 4C5 2 2 3 2 3v9s3-1 6 1c3-2 6-1 6-1V3s-3-1-6 1v9',
  cards:'M2 3h9v9H2z M5 1h9v9', check:'M2 8l4 4 8-9',
  download:'M8 2v9m-4-4 4 4 4-4M2 12v2h12v-2', question:'M5 4a3 3 0 0 1 6 0c0 3-3 2-3 5m0 3v.1',
  target:'M8 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12 M8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M8 8h.1',
  chat:'M2 2h12v9H7l-4 3v-3H2z M5 6h6', plus:'M8 2v12M2 8h12', compare:'M2 3h4v10H2zM10 3h4v10h-4zM7 8h2',
  restore:'M3 5a6 6 0 1 1 0 6M3 2v4h4', calendar:'M2 4h12v10H2zM5 2v4m6-4v4M2 7h12M5 10h1m3 0h1',
  checklist:'M2 4l1 1 2-2m2 1h7M2 10l1 1 2-2m2 1h7', eye:'M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5zM8 6v4',
  pencil:'M3 10 11 2l3 3-8 8-4 1zM9 4l3 3', arrow:'M2 8h12m-5-5 5 5-5 5',
  person:'M8 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6M2 14a6 5 0 0 1 12 0',
  cloud:'M4 12a3 3 0 0 1 0-6 4 4 0 0 1 8-1 3.5 3.5 0 0 1 0 7z', shield:'M8 1 14 4v4c0 4-6 7-6 7S2 12 2 8V4z',
  document:'M3 1h7l3 3v11H3zM6 7h4M6 10h4', receipt:'M3 1 5 2l3-1 3 1 2-1v14l-2-1-3 1-3-1-2 1zM6 6h4M6 10h4',
  archive:'M2 2h12v3H2zM3 5v9h10V5M6 8h4', chart:'M2 2v12h12M5 11V8m3 3V5m3 6V3',
  delete:'M3 4h10M6 2h4M4 4l1 10h6l1-10M7 7v4m2-4v4', balance:'M8 2v12M3 14h10M2 5h12M3 5l-2 5h4zM13 5l-2 5h4z'
 };
 const cue = document.createElement('span');
 cue.className = 'ranca-cue'; cue.setAttribute('aria-hidden','true');
 const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 16 16');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');
 const cuePath = document.createElementNS('http://www.w3.org/2000/svg','path');svg.append(cuePath);cue.append(svg);headerMascot.after(cue);headerMascot.setAttribute('aria-hidden','true');
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
 const cueMoves = {
  wave:{entry:['rotate(0deg)','rotate(-16deg)','rotate(12deg)','rotate(0deg)'],idle:['rotate(0deg)','rotate(-8deg)','rotate(0deg)']},
  book:{entry:['scaleX(.65)','scaleX(1)','scaleX(1)'],idle:['perspective(40px) rotateY(0deg)','perspective(40px) rotateY(-25deg)','perspective(40px) rotateY(0deg)']},
  cards:{entry:['translateX(-2px) rotate(-12deg)','translateX(2px) rotate(10deg)','translateX(0) rotate(0deg)'],idle:['perspective(40px) rotateY(0deg)','perspective(40px) rotateY(65deg)','perspective(40px) rotateY(0deg)']},
  check:{entry:['scale(.5)','scale(1.15)','scale(1)'],idle:['scale(1)','scale(1.1)','scale(1)']},
  download:{entry:['translateY(-3px)','translateY(2px)','translateY(0)'],idle:['translateY(0)','translateY(2px)','translateY(0)']},
  question:{entry:['rotate(-12deg) scale(.8)','rotate(7deg) scale(1.1)','rotate(0deg) scale(1)'],idle:['rotate(0deg)','rotate(-8deg)','rotate(0deg)']},
  calendar:{entry:['translateX(-2px)','translateX(2px)','translateX(0)'],idle:['translateY(0)','translateY(1px)','translateY(0)']},
  checklist:{entry:['rotate(-8deg)','rotate(3deg)','rotate(0deg)'],idle:['translateY(0)','translateY(1px)','translateY(0)']},
  pencil:{entry:['translate(-2px,1px)','translate(2px,-1px)','translate(-1px,1px)','translate(0,0)'],idle:['rotate(0deg)','rotate(-6deg)','rotate(0deg)']},
  chat:{entry:['scale(.8)','scale(1.08)','scale(1)'],idle:['scale(1)','scale(1.07)','scale(1)']},
  restore:{entry:['rotate(-45deg)','rotate(0deg)'],idle:['rotate(0deg)','rotate(-12deg)','rotate(0deg)']},
  arrow:{entry:['translateX(-2px)','translateX(3px)','translateX(0)'],idle:['translateX(0)','translateX(1px)','translateX(0)']}
 };
 const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
 let mascotVisible = false;
 let sectionVisible = false;
 let animation = null;
 let cueAnimation = null;
 let activeSection = null;
 let activeKey = sectionProfiles[pageKey]?.[0] || "document";
 const updateCue = () => {
  cuePath.setAttribute("d", cuePaths[gestures[activeKey].cue]);
  headerMascot.dataset.rancaBehavior = activeKey;
  cue.dataset.rancaCue = gestures[activeKey].cue;
 };
 updateCue();
 let idleTimer = null;
 let lastEntry = -Infinity;
 let pendingEntry = false;
 let animationIsEntry = false;
 const canMove = () => mascotVisible && sectionVisible && !document.hidden && !reducedMotion.matches;
 const clearIdle = () => { clearTimeout(idleTimer); idleTimer = null; };
 const scheduleIdle = () => {
  clearIdle();
  if (!canMove() || animation) return;
  const delay = pendingEntry ? Math.max(0, 900 - (performance.now() - lastEntry)) : ((readingPolicy || gestures[activeKey].calm) ? 9000 : 5000);
  idleTimer = setTimeout(() => playMascot(pendingEntry), delay);
 };
 const stopMotion = () => {
  clearIdle();
  pendingEntry = false;
  cueAnimation?.cancel();cueAnimation = null;
  if (animation) { const previous = animation; animation = null; previous.cancel(); }
 };
 const playMascot = (entry) => {
  if (!canMove() || animation) return;
  clearIdle();
  if (entry) { pendingEntry = false; lastEntry = performance.now(); }
  animationIsEntry = entry;
  const profile = gestures[activeKey];
  updateCue();
  headerMascot.dataset.rancaMotion = entry ? 'entry' : 'idle';
  let movement = entry ? profile.entry : profile.idle;
  // Policy reading stays quiet; symbols remain still and gestures are quarter-size.
  if (readingPolicy) movement = movement.map(transform => transform
   .replace(/(-?[\d.]+)(px|deg)/g, (_, value, unit) => `${Number(value) * .25}${unit}`)
   .replace(/(scale[XY]?\()([^)]+)(\))/g, (_, start, values, end) => start + values.split(',').map(value => 1 + (Number(value) - 1) * .25).join(',') + end));
  const duration = readingPolicy || profile.calm ? (entry ? 900 : 1600) : (entry ? 700 : 1100);
  const current = headerMascot.animate(movement.map(transform => ({transform})), {
   duration, easing: 'ease-in-out', iterations: 1
  });
  const cueMovement = cueMoves[profile.cue]?.[entry ? 'entry' : 'idle'];
  if (cueMovement && !readingPolicy && !profile.calm) cueAnimation = cue.animate(cueMovement.map(transform => ({transform})), {duration, easing:'ease-in-out', iterations:1});
  animation = current;
  current.finished.then(() => {
   if (animation === current) { animation = null; cueAnimation = null; scheduleIdle(); }
  }).catch(() => {});
 };
 const syncMotion = () => { if (canMove()) scheduleIdle(); else stopMotion(); };
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
   activeSection = section; activeKey = profileFor.get(section); updateCue(); pendingEntry = true;
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
  if (animation && !animationIsEntry) { cueAnimation?.cancel();cueAnimation = null;const previous = animation; animation = null; previous.cancel(); }
  if (!animation) scheduleIdle();
 }, {passive: true});
 document.addEventListener('visibilitychange', syncMotion);
 reducedMotion.addEventListener('change', syncMotion);
}
