// Keep the fixed consent banner from covering this page. Height varies with the viewport.
const consentBanner = document.getElementById('analytics-consent');
if (consentBanner) {
  const syncBannerSpace = () => {
    if (consentBanner.hidden) {
      document.documentElement.style.removeProperty('--dukung-banner-space');
      return;
    }
    const space = Math.ceil(window.innerHeight - consentBanner.getBoundingClientRect().top) + 16;
    document.documentElement.style.setProperty('--dukung-banner-space', space + 'px');
  };
  syncBannerSpace();
  new ResizeObserver(syncBannerSpace).observe(consentBanner);
  new MutationObserver(syncBannerSpace).observe(consentBanner, {attributes: true, attributeFilter: ['hidden']});
  addEventListener('resize', syncBannerSpace);
}

// Copy button for the Dukung page: copies only the account digits, then confirms briefly.
const btn = document.querySelector('.dukung-copy');
const status = document.querySelector('.dukung-status');
if (btn) {
  const label = btn.querySelector('.dukung-copy-label') || btn.firstElementChild || btn;
  const original = () => document.documentElement.lang === 'id' ? 'Salin' : 'Copy';
  const confirmation = () => document.documentElement.lang === 'id'
    ? (btn.dataset.idLabel || 'Tersalin')
    : (btn.dataset.enLabel || 'Copied');
  const copyDigits = async (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    throw new Error('clipboard unavailable');
  };
  let timer;
  btn.addEventListener('click', async () => {
    try {
      await copyDigits(btn.dataset.copy || '090005091307');
    } catch {
      return;
    }
    const msg = confirmation();
    if (status) status.textContent = msg;
    if (label !== btn) label.textContent = msg;
    else btn.textContent = msg;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (status) status.textContent = '';
      if (label !== btn) label.textContent = original();
      else btn.textContent = original();
    }, 2000);
  });
}
