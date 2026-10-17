import fs from 'node:fs';
import assert from 'node:assert/strict';

const {default: worker} = await import('data:text/javascript,' + encodeURIComponent(fs.readFileSync(new URL('./worker.js', import.meta.url), 'utf8')));
const base = 'https://rancana.id/go/play';
const play = 'https://play.google.com/store/apps/details?id=com.planora.labs';
const defaultLocation = play + '&referrer=utm_source%3Drancana.id%26utm_medium%3Dweb%26utm_campaign%3Dplay_cta';
const instagramLocation = play + '&referrer=utm_source%3Dinstagram%26utm_medium%3Dsocial%26utm_campaign%3Dx';
const contentLocation = instagramLocation + '%26utm_content%3Dhero';
let assertions = 0;

const checkRedirect = async (query, expected) => {
  const response = await worker.fetch(new Request(base + query), {});
  assert.equal(response.status, 302); assertions++;
  assert.equal(response.headers.get('location'), expected); assertions++;
  assert.equal(response.headers.get('cache-control'), 'no-store'); assertions++;
};

const full = 'utm_source=instagram&utm_medium=social&utm_campaign=x';
await checkRedirect('', defaultLocation);
await checkRedirect('?' + full, instagramLocation);
await checkRedirect('?' + full + '&utm_content=hero', contentLocation);
await checkRedirect('?utm_source=INSTAGRAM&utm_medium=Social&utm_campaign=X', instagramLocation);
// First value wins for repeated keys.
await checkRedirect('?' + full + '&utm_source=tiktok', instagramLocation);
// No campaign-name allowlist: any well-formed new campaign passes through.
await checkRedirect('?utm_source=x&utm_medium=paid_social&utm_campaign=raya_launch.2027-q1',
  play + '&referrer=utm_source%3Dx%26utm_medium%3Dpaid_social%26utm_campaign%3Draya_launch.2027-q1');
// All-or-nothing defaults: any missing or invalid source/medium/campaign uses all three defaults,
// and content is never attached to the default tuple.
for (const query of ['?utm_source=ig', '?utm_source=ig&utm_campaign=x', '?utm_medium=social&utm_campaign=x',
  '?utm_source=ig&utm_medium=social', '?utm_content=hero', '?utm_source=ig&utm_campaign=x&utm_content=hero',
  '?' + full.replace('instagram', '%3Cscript%3E'), '?' + full.replace('social', 'paid%20social'),
  '?' + full.replace('utm_campaign=x', 'utm_campaign=' + 'a'.repeat(65)),
  '?' + full.replace('instagram', 'private%40example.test'), '?' + full.replace('instagram', '')]) {
  await checkRedirect(query, defaultLocation);
}
// Invalid content is dropped; the valid tuple is kept.
await checkRedirect('?' + full + '&utm_content=hero%26url%3Dhttps%3A%2F%2Fevil.test', instagramLocation);
await checkRedirect('?' + full + '&utm_content=' + 'c'.repeat(65), instagramLocation);

const foreign = await worker.fetch(new Request(base + '?' + new URLSearchParams({
  url: 'https://evil.test', referrer: 'private', gclid: 'secret', id: 'com.evil.app',
})), {});
assert.equal(foreign.status, 302); assertions++;
assert.equal(foreign.headers.get('location'), defaultLocation); assertions++;
assert.equal(foreign.headers.get('cache-control'), 'no-store'); assertions++;
for (const value of ['evil.test', 'private', 'secret', 'com.evil.app']) {
  assert.equal(foreign.headers.get('location').includes(value), false); assertions++;
}

let called = false;
const assets = {fetch() { called = true; return new Response('ok'); }};
const assetResponse = await worker.fetch(new Request('https://rancana.id/en/'), {ASSETS: assets});
assert.equal(await assetResponse.text(), 'ok'); assertions++;
assert.equal(called, true); assertions++;
called = false;
const features = await worker.fetch(new Request('https://rancana.id/go/features'), {ASSETS: assets});
assert.equal(features.status, 204); assertions++;
assert.equal(called, false); assertions++;

// No campaign-name allowlist anywhere in the shipped Play/analytics code.
for (const file of ['worker.js', 'analytics-consent.js']) {
  const source = fs.readFileSync(new URL('./' + file, import.meta.url), 'utf8');
  for (const marker of ['rancana_study_2026q4', 'campaignPlacements', 'validCampaign', 'organic_social', 'paid_social']) {
    assert.equal(source.includes(marker), false, file + ' contains ' + marker); assertions++;
  }
}
// Crawlers are kept off the redirect endpoints.
const robots = fs.readFileSync(new URL('./robots.txt', import.meta.url), 'utf8');
assert.match(robots, /^User-agent: \*\nDisallow: \/go\/\n/m); assertions++;
assert.ok(robots.includes('Sitemap: https://rancana.id/sitemap.xml')); assertions++;

console.log('PASS — ' + assertions + ' server-side Play redirect, all-or-nothing default, no-allowlist, robots and asset passthrough assertions');
