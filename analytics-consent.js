(() => {
  'use strict';
  if (window.__rancanaAnalyticsInitialized) return;
  window.__rancanaAnalyticsInitialized = true;
  const key = 'rancana_analytics_consent_v1';
  const maxAge = 180 * 86400000;
  const pages = new Set(['home', 'about', 'help', 'premium', 'privacy', 'terms', 'delete-account', 'college-schedule', 'flashcard-guide']);
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
  // Proposed campaign registry: changing values requires code review, never free text.
  const campaignPlacements = {
    instagram: {organic_social: ['profile_bio', 'story'], paid_social: ['feed_ad', 'story_ad']},
    tiktok: {organic_social: ['profile_bio'], paid_social: ['video_ad']},
    x: {organic_social: ['profile_bio', 'post'], paid_social: ['feed_ad']}
  };
  const validCampaign = (source, medium, name, content) => name === 'rancana_study_2026q4' &&
    Object.hasOwn(campaignPlacements, source) && Object.hasOwn(campaignPlacements[source], medium) &&
    campaignPlacements[source][medium].includes(content);
  const campaignFromURL = () => {
    const params = new URLSearchParams(location.search);
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
    if (keys.some(key => params.getAll(key).length !== 1)) return null;
    const [source, medium, name, content] = keys.map(key => params.get(key));
    if (!validCampaign(source, medium, name, content)) return null;
    return {campaign_source: source, campaign_medium: medium, campaign_name: name, campaign_content: content};
  };
  // Same-origin, tab-session storage only, with a fixed 30-minute maximum lifetime.
  const campaignKey = 'rancana_campaign_session_v1';
  const campaignAge = 30 * 60000;
  const campaignFields = ['campaign_source', 'campaign_medium', 'campaign_name', 'campaign_content'];
  let campaign = null, campaignTimer, campaignStorageFailed = false;
  const consentAt = () => {
    try { return readChoice() === 'granted' ? JSON.parse(localStorage.getItem(key)).at : null; }
    catch { return null; }
  };
  const clearCampaign = () => {
    campaign = null; clearTimeout(campaignTimer);
    try { sessionStorage.removeItem(campaignKey); } catch { campaignStorageFailed = true; }
  };
  const readCampaign = () => {
    if (campaignStorageFailed) return null;
    try {
      if (choice !== 'granted' || readChoice() !== 'granted') { clearCampaign(); return null; }
      const record = JSON.parse(sessionStorage.getItem(campaignKey));
      if (!record) return null;
      const c = record.campaign;
      if (Object.keys(record).sort().join() !== 'at,campaign,consentAt,version' || record.version !== 1 ||
          record.consentAt !== consentAt() || !Number.isFinite(record.at) || record.at > Date.now() ||
          Date.now() - record.at >= campaignAge || !c ||
          Object.keys(c).sort().join() !== [...campaignFields].sort().join() ||
          !campaignFields.every(field => typeof c[field] === 'string') ||
          !validCampaign(c.campaign_source, c.campaign_medium, c.campaign_name, c.campaign_content)) {
        clearCampaign(); return null;
      }
      return record;
    } catch { campaignStorageFailed = true; clearCampaign(); return null; }
  };
  const refreshCampaign = () => {
    clearTimeout(campaignTimer);
    const previous = campaign;
    const record = readCampaign(); campaign = record?.campaign || null;
    if (previous && !campaign && configured && choice === 'granted' && readChoice() === 'granted') {
      gtag('config', id, {update: true, send_page_view: false,
        campaign_source: '', campaign_medium: '', campaign_name: '', campaign_content: ''});
    }
    if (record) campaignTimer = setTimeout(() => {
      refreshCampaign(); preparePlayLinks();
    }, Math.max(0, record.at + campaignAge - Date.now()));
  };
  const startCampaign = () => {
    // A supplied but invalid tuple clears prior attribution instead of silently inheriting it.
    const params = new URLSearchParams(location.search);
    if (['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'].some(field => params.has(field))) {
      const incoming = campaignFromURL();
      const existing = readCampaign();
      if (!incoming) clearCampaign();
      else if (!existing || campaignFields.some(field => existing.campaign[field] !== incoming[field])) {
        try { sessionStorage.setItem(campaignKey, JSON.stringify({version: 1, at: Date.now(),
          consentAt: consentAt(), campaign: incoming})); }
        catch { campaignStorageFailed = true; clearCampaign(); }
      }
    }
    refreshCampaign();
  };
  const playBase = 'https://play.google.com/store/apps/details?id=com.planora.labs';
  const isPlayLink = anchor => {
    let url; try { url = new URL(anchor.href, location.href); } catch { return false; }
    if (url.username || url.password) return false;
    return (url.origin === 'https://play.google.com' && url.pathname === '/store/apps/details' &&
      url.searchParams.getAll('id').length === 1 && url.searchParams.get('id') === 'com.planora.labs') ||
      (url.origin === location.origin && url.pathname === '/go/play');
  };
  const preparePlayLink = anchor => {
    if (!isPlayLink(anchor)) return false;
    refreshCampaign();
    const url = new URL(playBase);
    if (choice === 'granted' && readChoice() === 'granted' && campaign) {
      const referrer = new URLSearchParams({utm_source: campaign.campaign_source,
        utm_medium: campaign.campaign_medium, utm_campaign: campaign.campaign_name,
        utm_content: campaign.campaign_content});
      url.searchParams.set('referrer', referrer.toString());
    }
    // Rebuild the destination; never forward link queries, click IDs or redirect targets.
    anchor.href = url.href;
    anchor.referrerPolicy = 'no-referrer';
    anchor.relList.add('noreferrer', 'noopener');
    return true;
  };
  const preparePlayLinks = () => document.querySelectorAll('a[href]').forEach(preparePlayLink);

  const language = () => document.documentElement.lang === 'en' ? 'en' : 'id';
  const pageName = () => {
    const parts = location.pathname.replace(/\.html$/, '').split('/').filter(Boolean);
    if (['id', 'en'].includes(parts[0])) parts.shift();
    const page = parts.length === 0 || parts[0] === 'index' ? 'home' : parts[0];
    return parts.length <= 1 && pages.has(page) ? page : null;
  };
  const text = {
    en: {title: 'Can we use cookies?', body: 'We use cookies to understand how you use the Rancana website and improve it. These cookies are only active if you agree.', accept: 'Allow cookies', reject: 'Reject cookies', close: 'Close', settings: 'Cookie settings', privacy: 'Privacy policy'},
    id: {title: 'Boleh pakai cookies?', body: 'Kami pakai cookies untuk memahami cara kamu menggunakan website Rancana dan memperbaikinya. Cookies ini aktif kalau kamu setuju.', accept: 'Izinkan cookies', reject: 'Tolak cookies', close: 'Tutup', settings: 'Pengaturan cookies', privacy: 'Kebijakan privasi'}
  };
  const settings = document.createElement('button');
  settings.type = 'button'; settings.className = 'analytics-settings';
  settings.setAttribute('aria-controls', 'analytics-consent');
  // No visible settings control: initial consent remains available until a choice is saved.
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
    clearCampaign(); preparePlayLinks();
    if (removeCookies) clearCookies();
    // Executed SDK code cannot be unloaded by removing a script element.
    // Persist denial/expiry first, disable collection, then replace this document.
    if (tag && reload) location.reload();
  };
  const send = message => {
    if (choice === 'granted' && readChoice() !== 'granted') { refreshChoice(); return; }
    if (choice !== 'granted' || !tag || !gtag) return;
    refreshCampaign();
    const context = {page_location: 'https://rancana.id/' + message.language + '/' + (message.page === 'home' ? '' : message.page), page_title: 'Rancana — ' + message.page, page_referrer: '', language: message.language,
      campaign_source: '', campaign_medium: '', campaign_name: '', campaign_content: '',
      campaign_id: '', campaign_term: '', ...(campaign || {})};
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
    startCampaign(); preparePlayLinks();
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
  const seenClicks = new WeakSet();
  const onPlayInteraction = event => {
    const anchor = event.target.closest?.('a[href]');
    if (!anchor || !preparePlayLink(anchor)) return;
    if (!['click', 'auxclick'].includes(event.type) || (event.type === 'auxclick' && event.button !== 1) ||
        choice !== 'granted' || !tag || !event.isTrusted || seenClicks.has(event)) return;
    seenClicks.add(event);
    const page = pageName();
    if (!page) return;
    const placement = anchor.closest('.site-header') ? 'header' : anchor.closest('.hero-ctas') ? 'hero' : anchor.closest('.preview-footer') ? 'footer' : 'body';
    send({type: 'rancana-analytics', event: 'google_play_click', page, language: language(), placement});
  };
  // Prepare before default navigation (including middle-click/context-menu), without delaying it.
  for (const type of ['pointerdown', 'contextmenu', 'click', 'auxclick']) {
    document.addEventListener(type, onPlayInteraction, {capture: true});
  }
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
    refreshCampaign(); preparePlayLinks();
    scheduleExpiry();
  };
  addEventListener('pagehide', () => { window[disabled] = true; });
  addEventListener('focus', refreshChoice);
  document.addEventListener('visibilitychange', refreshChoice);
  addEventListener('pageshow', event => {
    if (!event.persisted) return;
    choice = readChoice(); if (choice === 'granted') { window[disabled] = false; start(); } else stop(); panel.hidden = choice !== null; render(); scheduleExpiry();
  });
  panel.hidden = choice !== null; render(); preparePlayLinks();
  if (choice === 'granted') start(); else { clearCampaign(); clearCookies(); }
  scheduleExpiry();
})();
