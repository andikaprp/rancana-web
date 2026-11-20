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
