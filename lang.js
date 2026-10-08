/* Shared ID/EN switch. ?lang= or a saved choice wins, otherwise Indonesian
   clocks and locales get ID. Short strings swap through data-id attributes;
   whole documents swap by hiding the [data-lang] block of the other language. */

const LANGS = ['en', 'id'];
const read = el => ('content' in el ? el.content : el.innerHTML);
const write = (el, v) => { if ('content' in el) el.content = v; else el.innerHTML = v; };

const strings = [...document.querySelectorAll('[data-id]')].map(el => [el, el.dataset.en ?? read(el), el.dataset.id]);
const blocks = [...document.querySelectorAll('[data-lang]')];
const buttons = document.querySelectorAll('.lang-btn');

const setLang = lang => {
  document.documentElement.lang = lang;
  for (const [el, en, id] of strings) write(el, lang === 'id' ? id : en);
  for (const el of blocks) {
    const active = el.dataset.lang === lang;
    el.hidden = !active;
    for (const anchor of el.querySelectorAll('[data-anchor]')) {
      if (active) anchor.id = anchor.dataset.anchor;
      else anchor.removeAttribute('id');
    }
  }
  if (location.hash) {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { id = ''; }
    document.getElementById(id)?.scrollIntoView({block: 'start', behavior: 'instant'});
  }
  for (const b of buttons) {
    const on = b.dataset.setLang === lang;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-pressed', on);
  }
};

const remember = v => { try { localStorage.setItem('lang', v); } catch {} };
const saved = (() => { try { return localStorage.getItem('lang'); } catch { return null; } })();
const asked = new URLSearchParams(location.search).get('lang');
const looksIndonesian = () =>
  /^Asia\/(Jakarta|Pontianak|Makassar|Jayapura)$/.test(Intl.DateTimeFormat().resolvedOptions().timeZone || '') ||
  (navigator.languages ?? [navigator.language ?? '']).some(l => l.toLowerCase().startsWith('id'));

// Saved so a shared ?lang= link keeps its language when the visitor opens the legal pages.
if (LANGS.includes(asked)) remember(asked);
setLang(LANGS.includes(asked) ? asked : LANGS.includes(saved) ? saved : 'id');

for (const b of buttons) b.addEventListener('click', () => {
  remember(b.dataset.setLang);
  setLang(b.dataset.setLang);
});
