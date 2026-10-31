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
 navSlot.addEventListener('focusout', event => {
  if (navSlot.contains(event.relatedTarget)) return;
  requestAnimationFrame(updateNavigation);
 });
}

// The navbar always uses Ranca. Navigation stays independent of decorative art.
const headerMascot = document.querySelector('.site-header .brand-mark');
if (typeof window !== 'undefined' && headerMascot) import(new URL('./header-mascot.js', document.currentScript.src).href)
 .then(({mountHeaderMascot}) => mountHeaderMascot(headerMascot)).catch(() => { /* Selected static Ranca remains available. */ });

// One billing selection controls every plan in both language panels.
(() => {
  const toggles = document.querySelectorAll('.billing-toggle');
  toggles.forEach(toggle => {
    toggle.hidden = false;
    toggle.addEventListener('click', event => {
      const button = event.target.closest('[data-billing]');
      if (!button) return;
      const yearly = button.dataset.billing === 'yearly';
      document.querySelectorAll('[data-billing]').forEach(item => {
        item.setAttribute('aria-pressed', String(item.dataset.billing === button.dataset.billing));
      });
      document.querySelectorAll('[data-price-monthly]').forEach(price => {
        price.textContent = `Rp${yearly ? price.dataset.priceYearly : price.dataset.priceMonthly}`;
      });
      document.querySelectorAll('[data-price-period]').forEach(period => {
        // Built locale pages (/id/, /en/) have no [data-lang] wrapper; fall back to <html lang>.
        const scope = period.closest('[data-lang]');
        const english = (scope ? scope.dataset.lang : document.documentElement.lang) === 'en';
        period.textContent = english ? (yearly ? ' / year' : ' / month') : (yearly ? ' / tahun' : ' / bulan');
      });
    });
  });
})();
