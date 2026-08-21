// node website/check-lang.mjs — guards ID/EN copy and locale sniff.
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const root = new URL('.', import.meta.url);
const index = await readFile(new URL('index.html', root), 'utf8');
const lang = await readFile(new URL('lang.js', root), 'utf8');

for (const cls of ['hero-title', 'hero-sub-1', 'hero-sub-2', 'features-title', 'features-sub',
                   'closing-title', 'closing-sub', 'pill-light', 'legal']) {
  const tag = index.match(new RegExp(`<[^>]*class="(?:[^"]*\\s)?${cls}(?:\\s[^"]*)?"[^>]*>`));
  assert.ok(tag, `no element with class ${cls}`);
  assert.match(tag[0], /data-id="[^"]+"/, `${cls} has no data-id copy`);
}
assert.match(index, /<title data-id="[^"]+"/, 'page title has no data-id copy');
assert.equal((index.match(/data-id="/g) ?? []).length, 21, 'copy count changed — translate the new string, then bump this number');
assert.doesNotMatch(index, /pill-dark/, 'Play CTAs must use official badges, not dark pills');
assert.equal((index.match(/assets\/badges\/en_badge_web_generic\.png/g) ?? []).length, 2, 'EN Play badge missing in hero or closing');
assert.equal((index.match(/assets\/badges\/id_badge_web_generic\.png/g) ?? []).length, 2, 'ID Play badge missing in hero or closing');
assert.equal(
  (index.match(/href="https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.planora\.labs"/g) ?? []).length,
  4,
  'Play Store links must cover EN+ID hero and closing CTAs',
);
assert.match(index, /href="privacy\.html"/);
assert.match(index, /href="terms\.html"/);
assert.match(index, /href="delete-account\.html"/);

for (const file of ['privacy.html', 'terms.html', 'delete-account.html']) {
  const html = await readFile(new URL(file, root), 'utf8');
  assert.match(html, /data-lang="en"/, `${file} missing EN block`);
  assert.match(html, /data-lang="id"/, `${file} missing ID block`);
  assert.match(html, /src="lang\.js"/, `${file} missing lang.js`);
  assert.doesNotMatch(html, /Planora/, `${file} still says Planora`);
}

const zones = lang.match(/\/\^Asia\\\/\(([^)]+)\)\$\//)[1].split('|');
const re = new RegExp(`^Asia/(${zones.join('|')})$`);
for (const tz of ['Asia/Jakarta', 'Asia/Pontianak', 'Asia/Makassar', 'Asia/Jayapura']) assert.match(tz, re);
for (const tz of ['Asia/Singapore', 'Europe/Amsterdam', 'America/New_York']) assert.doesNotMatch(tz, re);

console.log('ok — ID/EN copy complete, legal pages bilingual, locale sniff covers 4 Indonesian zones');
