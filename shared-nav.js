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
 const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
 let mascotVisible = false;
 let sectionVisible = false;
 let animation = null;
 let idleTimer = null;
 let lastEntry = -Infinity;
 const canMove = () => mascotVisible && sectionVisible && !document.hidden && !reducedMotion.matches;
 const clearIdle = () => { clearTimeout(idleTimer); idleTimer = null; };
 const scheduleIdle = () => {
  clearIdle();
  if (canMove() && !animation) idleTimer = setTimeout(() => playMascot(false), 5000);
 };
 const stopMotion = () => {
  clearIdle();
  if (animation) { const previous = animation; animation = null; previous.cancel(); }
 };
 const playMascot = (entry) => {
  if (!canMove() || animation) return;
  clearIdle();
  const movement = entry
   ? ['translateY(0) rotate(0deg)', 'translateY(-2px) rotate(-6deg)', 'translateY(-1px) rotate(4deg)', 'translateY(0) rotate(0deg)']
   : ['translateY(0) rotate(0deg)', 'translateY(-1.5px) rotate(-3deg)', 'translateY(0) rotate(0deg)'];
  const current = headerMascot.animate(movement.map(transform => ({transform})), {
   duration: entry ? 700 : 1100, easing: 'ease-in-out', iterations: 1
  });
  animation = current;
  current.finished.then(() => {
   if (animation === current) { animation = null; scheduleIdle(); }
  }).catch(() => {});
 };
 const syncMotion = () => { if (canMove()) scheduleIdle(); else stopMotion(); };
 const mascotObserver = new IntersectionObserver(entries => {
  mascotVisible = entries[0].isIntersecting;
  syncMotion();
 });
 mascotObserver.observe(headerMascot);
 const visibleSections = new Set();
 const onSectionsChanged = entries => {
  let entering = false;
  for (const entry of entries) {
   if (entry.isIntersecting) { visibleSections.add(entry.target); entering = true; }
   else visibleSections.delete(entry.target);
  }
  sectionVisible = visibleSections.size > 0;
  if (!canMove()) { stopMotion(); return; }
  if (entering && performance.now() - lastEntry >= 900 && !animation) {
   lastEntry = performance.now(); playMascot(true);
  } else if (!animation && idleTimer === null) scheduleIdle();
 };
 let sectionObserver;
 let resizeFrame;
 const observeSections = () => {
  sectionObserver?.disconnect();
  visibleSections.clear();
  // Pixel margins use viewport height; IO percentage margins use viewport width.
  sectionObserver = new IntersectionObserver(onSectionsChanged, {rootMargin: `-${Math.round(innerHeight * .15)}px 0px -${Math.round(innerHeight * .45)}px 0px`, threshold: 0});
  document.querySelectorAll('main > .hero-wrap, main section, .resource-main .resource-hero').forEach(section => sectionObserver.observe(section));
 };
 observeSections();
 addEventListener('resize', () => {cancelAnimationFrame(resizeFrame);resizeFrame = requestAnimationFrame(observeSections);});
 document.addEventListener('visibilitychange', syncMotion);
 reducedMotion.addEventListener('change', syncMotion);
}
