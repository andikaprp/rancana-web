(() => {
  'use strict';
  if (window.__rancanaAnalyticsInitialized) return;
  window.__rancanaAnalyticsInitialized = true;
  const key = 'rancana_analytics_consent_v1';
  const maxAge = 180 * 86400000;
  const pages = new Set(['home', 'about', 'help', 'premium', 'privacy', 'terms', 'delete-account']);
  const id = window.RancanaAnalyticsConfig?.measurementId;
  const disabled = 'ga-disable-' + id;
  let tag = null, configured = false, lastView = '', focusReturn = null, expiryTimer;
  let gtag, storageFailed = false;
  const readChoice = () => {
    if (storageFailed) return 'denied';
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value?.version === 1 && ['granted', 'denied'].includes(value.choice) &&
        Number.isFinite(value.at) && value.at <= Date.now() && Date.now() - value.at < maxAge ? value.choice : null;
    } catch { return null; }
  };
  let choice = readChoice();
  const language = () => document.documentElement.lang === 'en' ? 'en' : 'id';
  const pageName = () => {
    const parts = location.pathname.replace(/\.html$/, '').split('/').filter(Boolean);
    if (['id', 'en'].includes(parts[0])) parts.shift();
    const page = parts.length === 0 || parts[0] === 'index' ? 'home' : parts[0];
    return parts.length <= 1 && pages.has(page) ? page : null;
  };
  const text = {
    en: {title: 'Your analytics choice', body: 'Allow Google Analytics to measure website page views and Google Play clicks? Analytics uses browser cookies. Our custom events do not include names, email addresses or form text. Google also collects standard browser and session information. You can change your choice here at any time.', accept: 'Allow analytics', reject: 'Reject analytics', close: 'Close', settings: 'Analytics settings', privacy: 'Privacy policy'},
    id: {title: 'Pilihan analitik kamu', body: 'Izinkan Google Analytics mengukur kunjungan halaman dan klik Google Play? Analitik menggunakan cookie browser. Peristiwa khusus kami tidak menyertakan nama, alamat email, atau isi formulir. Google juga mengumpulkan informasi browser dan sesi standar. Kamu dapat mengubah pilihan di sini kapan saja.', accept: 'Izinkan analitik', reject: 'Tolak analitik', close: 'Tutup', settings: 'Pengaturan analitik', privacy: 'Kebijakan privasi'}
  };
  const settings = document.createElement('button');
  settings.type = 'button'; settings.className = 'analytics-settings';
  settings.setAttribute('aria-controls', 'analytics-consent');
  (document.querySelector('.preview-footer') || document.body).append(settings);
  const panel = document.createElement('section');
  panel.id = 'analytics-consent'; panel.className = 'analytics-consent'; panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', 'analytics-consent-title');
  panel.innerHTML = '<h2 id="analytics-consent-title"></h2><p></p><p><a data-consent-privacy></a></p><div class="analytics-consent-actions"><button type="button" data-consent-accept></button><button type="button" data-consent-reject></button><button type="button" data-consent-close></button></div>';
  document.body.append(panel);
  const render = () => {
    const t = text[language()];
    settings.textContent = t.settings;
    settings.setAttribute('aria-expanded', String(!panel.hidden));
    panel.querySelector('h2').textContent = t.title;
    panel.querySelector('p').textContent = storageFailed ? (language() === 'en' ? 'Could not save your choice. Analytics is disabled in this tab. Clear this site’s browser data before leaving to keep it off.' : 'Pilihanmu tidak dapat disimpan. Analitik dinonaktifkan di tab ini. Hapus data situs ini di browser sebelum meninggalkan halaman agar tetap nonaktif.') : t.body;
    for (const action of ['accept', 'reject', 'close']) panel.querySelector('[data-consent-' + action + ']').textContent = t[action];
    const link = panel.querySelector('[data-consent-privacy]');
    link.textContent = t.privacy; link.href = '/' + language() + '/privacy';
    panel.querySelector('[data-consent-close]').hidden = choice === null;
  };
  const hide = () => { panel.hidden = true; settings.setAttribute('aria-expanded', 'false'); focusReturn?.focus(); };
  settings.addEventListener('click', () => { focusReturn = settings; panel.hidden = false; render(); panel.querySelector('[data-consent-accept]').focus(); });
  panel.querySelector('[data-consent-close]').addEventListener('click', hide);
  panel.addEventListener('keydown', event => { if (event.key === 'Escape' && choice !== null) hide(); });
  const clearCookies = () => {
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.split('=')[0].trim();
      if (/^rancana_ga(?:_|$)/.test(name)) document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax';
    }
  };
  const stop = (removeCookies = true, reload = true) => {
    window[disabled] = true;
    if (removeCookies) clearCookies();
    // Executed SDK code cannot be unloaded by removing a script element.
    // Persist denial/expiry first, disable collection, then replace this document.
    if (tag && reload) location.reload();
  };
  const send = message => {
    if (choice === 'granted' && readChoice() !== 'granted') { refreshChoice(); return; }
    if (choice !== 'granted' || !tag || !gtag) return;
    const context = {page_location: 'https://rancana.id/' + message.language + '/' + (message.page === 'home' ? '' : message.page), page_title: 'Rancana — ' + message.page, page_referrer: '', language: message.language};
    if (!configured) {
      gtag('config', id, {...context, send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false, cookie_domain: 'none', cookie_path: '/', cookie_prefix: 'rancana', cookie_expires: 15552000, cookie_update: false});
      configured = true;
    } else {
      gtag('config', id, {...context, update: true, send_page_view: false});
    }
    gtag('event', message.event, {...context, send_to: id, ...(message.event === 'google_play_click' ? {link_destination: 'google_play', link_placement: message.placement} : {})});
  };
  const view = () => {
    const page = pageName();
    const viewKey = page + ':' + language();
    if (!page || viewKey === lastView || choice !== 'granted' || !tag) return;
    lastView = viewKey;
    send({event: 'page_view', page, language: language()});
  };
  const start = () => {
    if (choice !== 'granted' || readChoice() !== 'granted' || !pageName() || !/^G-[A-Z0-9]+$/.test(id || '')) return;
    if (tag) { if (window[disabled]) location.reload(); return; }
    window[disabled] = false;
    window.dataLayer = window.dataLayer || [];
    gtag = function () { window.dataLayer.push(arguments); };
    gtag('consent', 'default', {analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'});
    gtag('consent', 'update', {analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'});
    gtag('js', new Date());
    tag = document.createElement('script'); tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(id);
    tag.referrerPolicy = 'no-referrer';
    view();
    document.head.append(tag);
  };
  const choose = value => {
    choice = value;
    try { localStorage.setItem(key, JSON.stringify({version: 1, choice, at: Date.now()})); storageFailed = false; } catch { storageFailed = true; choice = 'denied'; clearTimeout(expiryTimer); stop(true, false); panel.hidden = false; render(); return; }
    if (choice === 'granted') start(); else stop();
    render(); hide(); scheduleExpiry();
  };
  panel.querySelector('[data-consent-accept]').addEventListener('click', () => choose('granted'));
  panel.querySelector('[data-consent-reject]').addEventListener('click', () => choose('denied'));
  addEventListener('storage', event => {
    if (event.key !== key && event.key !== null) return;
    choice = readChoice(); if (choice === 'granted') start(); else stop();
    panel.hidden = choice !== null; render(); scheduleExpiry();
  });
  new MutationObserver(() => { render(); view(); }).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
  document.addEventListener('click', event => {
    if (choice !== 'granted' || !tag || !event.isTrusted) return;
    const anchor = event.target.closest?.('a[href]');
    if (!anchor) return;
    let url; try { url = new URL(anchor.href, location.href); } catch { return; }
    const direct = url.protocol === 'https:' && url.hostname === 'play.google.com' && url.pathname === '/store/apps/details' && url.searchParams.get('id') === 'com.planora.labs';
    const redirect = url.origin === location.origin && url.pathname === '/go/play';
    const page = pageName();
    if ((!direct && !redirect) || !page) return;
    const placement = anchor.closest('.site-header') ? 'header' : anchor.closest('.hero-ctas') ? 'hero' : anchor.closest('.preview-footer') ? 'footer' : 'body';
    send({type: 'rancana-analytics', event: 'google_play_click', page, language: language(), placement});
  }, {capture: true});
  const scheduleExpiry = () => {
    clearTimeout(expiryTimer);
    if (choice === null || storageFailed) return;
    try {
      const at = JSON.parse(localStorage.getItem(key))?.at;
      if (Number.isFinite(at)) expiryTimer = setTimeout(refreshChoice, Math.max(0, Math.min(at + maxAge - Date.now(), 2147483647)));
    } catch { /* Failed persistence never permits the Google tag to load. */ }
  };
  const refreshChoice = () => {
    const next = readChoice();
    if (next !== choice) { choice = next; if (choice === 'granted') start(); else stop(); panel.hidden = choice !== null; render(); }
    scheduleExpiry();
  };
  addEventListener('pagehide', () => { window[disabled] = true; });
  addEventListener('focus', refreshChoice);
  document.addEventListener('visibilitychange', refreshChoice);
  addEventListener('pageshow', event => {
    if (!event.persisted) return;
    choice = readChoice(); if (choice === 'granted') { window[disabled] = false; start(); } else stop(); panel.hidden = choice !== null; render(); scheduleExpiry();
  });
  panel.hidden = choice !== null; render();
  if (choice === 'granted') start(); else clearCookies();
  scheduleExpiry();
})();
