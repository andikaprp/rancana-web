import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

// RAN-248 v2.1 (21 Nov 2026): Free forever + optional Premium+. No prices, billing toggle or trial on the site.
const files = ['premium.html', 'id/premium.html', 'en/premium.html'];
const slots = {
  id: ['Gratis selamanya.', 'Cek harga di aplikasi'],
  en: ['Free forever.', 'See price in the app'],
};
const panelsOf = (html, file) => {
  const name = file.split('/')[0];
  if (file === 'premium.html') {
    const [, enPart, idPart] = html.split(/<div data-lang="(?:en|id)"(?: hidden)?>/);
    return [['en', enPart], ['id', idPart]];
  }
  return [[name, html]];
};
for (const file of files) {
  const html = await fs.readFile(file, 'utf8');
  assert.doesNotMatch(html, /billing-toggle/, `${file}: billing toggle removed`);
  assert.doesNotMatch(html, /data-billing|data-price-monthly|data-price-yearly|data-price-period/, `${file}: price switching attributes removed`);
  assert.doesNotMatch(html, /Rp\s?\d/, `${file}: no Rp figures`);
  assert.doesNotMatch(html, /Buat kamu yang ingin mencatat lebih banyak pelajaran dan tugas/, `${file}: mid-tier Premium card copy removed`);
  assert.match(html, /src="(?:\.\.\/)?shared-nav\.js(?:\?[^"]*)?"/);
  for (const [lang, panel] of panelsOf(html, file)) {
    assert.equal((panel.match(/<article class="plan-card/g) || []).length, 2, `${file} ${lang}: two plan cards`);
    assert.equal((panel.match(/class="plan-card plan-plus"/g) || []).length, 1, `${file} ${lang}: one Premium+ card`);
    const prices = [...panel.matchAll(/<div class="plan-price"[^>]*><strong>([^<]*)<\/strong><\/div>/g)].map(m => m[1]);
    assert.deepEqual(prices, slots[lang], `${file} ${lang}: price slots`);
    assert.equal((panel.match(/<th scope="col">/g) || []).length, 3, `${file} ${lang}: three comparison columns`);
  }
}
console.log('PASS: v2.1 premium pages have two plan cards, app-pointing price slots, no billing toggle and no Rp figures, in all three files');
