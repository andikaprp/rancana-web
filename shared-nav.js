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
  const delay = pendingEntry ? Math.max(0, 900 - (performance.now() - lastEntry)) : ((readingPolicy || gestures[activeKey].calm) ? 9000 : 5000);
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
  let movement = entry ? profile.entry : profile.idle;
  // Policy reading stays quiet with quarter-size mascot gestures.
  if (readingPolicy) movement = movement.map(transform => transform
   .replace(/(-?[\d.]+)(px|deg)/g, (_, value, unit) => `${Number(value) * .25}${unit}`)
   .replace(/(scale[XY]?\()([^)]+)(\))/g, (_, start, values, end) => start + values.split(',').map(value => 1 + (Number(value) - 1) * .25).join(',') + end));
  const duration = readingPolicy || profile.calm ? (entry ? 900 : 1600) : (entry ? 700 : 1100);
  const current = headerMascot.animate(movement.map(transform => ({transform})), {
   duration, easing: 'ease-in-out', iterations: 1
  });
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
