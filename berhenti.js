// RAN-139 exit survey: shuffle, state machine and send to /api/berhenti.
// Only the option id and the optional Lainnya text are sent; the Worker adds the timestamp.
(() => {
  const form = document.getElementById('survey');
  const list = document.getElementById('survey-options');
  const submit = document.getElementById('survey-submit');
  const label = submit.querySelector('.survey-submit-label');
  const alertBox = document.getElementById('survey-alert');
  const thanks = document.getElementById('survey-thanks');
  const otherText = document.getElementById('other-text');
  const counter = document.getElementById('other-count');
  const LIMIT = 280;

  // Fisher-Yates over every option except "other", which always stays last.
  const items = [...list.querySelectorAll('.option:not([data-key=other])')];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  items.forEach(item => list.insertBefore(item, list.querySelector('[data-key=other]')));

  const radios = [...form.querySelectorAll('input[name=reason]')];
  const chosen = () => radios.find(radio => radio.checked);
  let state = 'default';

  const setState = next => {
    state = next;
    form.dataset.state = next;
    const busy = next === 'submitting';
    form.setAttribute('aria-busy', String(busy));
    radios.forEach(radio => { radio.readOnly = busy; });
    otherText.readOnly = busy;
    alertBox.hidden = next !== 'error';
    label.textContent = busy ? label.dataset.labelBusy : next === 'error' ? label.dataset.labelRetry : label.dataset.labelDefault;
    submit.disabled = next === 'default';
    submit.setAttribute('aria-disabled', String(busy));
    if (next === 'thanks') {
      form.hidden = true;
      thanks.hidden = false;
      thanks.querySelector('#thanks-title').focus();
    }
  };

  const updateCount = () => {
    const length = otherText.value.length;
    counter.querySelector('[data-count]').textContent = length;
    counter.classList.toggle('is-limit', length >= LIMIT);
  };

  form.addEventListener('change', event => {
    if (state === 'submitting') { event.preventDefault(); return; }
    if (event.target.name === 'reason') setState('picked');
  });
  // readOnly does not stop radios from changing, so block clicks and arrows while sending.
  form.addEventListener('click', event => {
    if (state === 'submitting' && event.target.closest('.option > label')) event.preventDefault();
  });
  form.addEventListener('keydown', event => {
    if (state === 'submitting' && event.target.name === 'reason' && event.key.startsWith('Arrow')) event.preventDefault();
  });
  otherText.addEventListener('input', updateCount);

  const payload = () => {
    const option = chosen().value;
    // The Lainnya text is kept in the field when switching away but only sent with "other".
    const other = option === 'other' ? otherText.value.trim().slice(0, LIMIT) : '';
    return {option, other: other || null};
  };

  const send = async data => {
    const response = await fetch('/api/berhenti', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
  };

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (state === 'submitting' || !chosen()) return; // double-submit guard
    const data = payload();
    setState('submitting');
    send(data).then(() => setState('thanks'), () => { setState('error'); submit.focus(); });
  });

  // JS takes over from the no-JS form; also restores state from a back/forward cache radio.
  setState(chosen() ? 'picked' : 'default');
  updateCount();
})();
