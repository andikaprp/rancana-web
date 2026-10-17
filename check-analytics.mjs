import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const root = path.dirname(new URL(import.meta.url).pathname);
const types = {'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.woff':'font/woff'};
const play = 'https://play.google.com/store/apps/details?id=com.planora.labs';
const server = http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost');
    if (url.pathname === '/go/play') {
      res.statusCode = 302;
      res.setHeader('Location', play);
      res.end();
      return;
    }
    let name = decodeURIComponent(url.pathname);
    if (name.endsWith('/')) name += 'index.html';
    if (!path.extname(name)) name += '.html';
    const file = path.resolve(root,'.' + name);
    if (!file.startsWith(root + '/')) throw Error('invalid path');
    const content = await fs.readFile(file);
    res.setHeader('Content-Type',types[path.extname(file)] || 'application/octet-stream');res.end(content);
  } catch { res.statusCode = 404;res.end(); }
});
await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
const origin = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,headless:true,args:['--no-sandbox']});
let assertions = 0;
const check = (actual,expected) => { assert.deepEqual(actual,expected);assertions++; };
const key = 'rancana_analytics_consent_v1';
const analyticsSource = await fs.readFile(path.join(root, 'analytics-consent.js'), 'utf8');
for (const hostname of ['rancana-staging-handoff.rancana.workers.dev','preview.pages.dev','staging.rancana.id']) {
  const previewWindow = {RancanaAnalyticsConfig:{measurementId:'G-2KDN1C2G3L'}};
  vm.runInNewContext(analyticsSource, {window:previewWindow,URLSearchParams,URL,location:{hostname,search:'',href:'https://'+hostname+'/',origin:'https://'+hostname},
    sessionStorage:{getItem:()=>null},document:{querySelectorAll:()=>[],addEventListener(){}}});
  assert.equal(previewWindow['ga-disable-G-2KDN1C2G3L'],true,hostname);
  assert.equal(previewWindow.__rancanaAnalyticsInitialized,true,hostname);
  assert.deepEqual(Object.keys(previewWindow).sort(),['RancanaAnalyticsConfig','__rancanaAnalyticsInitialized','__rancanaPlayCampaignInitialized','ga-disable-G-2KDN1C2G3L'].sort(),hostname);
  assertions++;
}
const sdk = `(() => {const process = args => {const a=Array.from(args);if(window['ga-disable-G-2KDN1C2G3L'])return;if(a[0]==='config')document.cookie='rancana_ga=test-browser; Path=/; SameSite=Lax';if(a[0]==='event')fetch('https://www.google-analytics.com/g/collect',{method:'POST',body:JSON.stringify(a)});};window.dataLayer.forEach(process);window.dataLayer.push=function(...items){items.forEach(process);return Array.prototype.push.apply(this,items);};})();`;
const contexts=[];
async function session(locale='en',initial=null) {
  const context = await browser.newContext({viewport:{width:390,height:844}});contexts.push(context);
  const requests=[],events=[];
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  if(initial)await context.addInitScript(({key,initial})=>localStorage.setItem(key,JSON.stringify(initial)),{key,initial});
  await context.route('https://www.googletagmanager.com/**',async route=>{requests.push(route.request().url());await route.fulfill({contentType:'text/javascript',body:sdk});});
  await context.route('https://www.google-analytics.com/**',async route=>{requests.push(route.request().url());events.push(JSON.parse(route.request().postData()));await route.fulfill({status:204});});
  const page=await context.newPage();
  await page.goto(origin+'/'+locale+'/?email=private@example.test#private-text');
  const settle=()=>page.waitForTimeout(150);
  await settle();
  return {context,page,requests,events,settle};
}
try {
  const s=await session();
  check(s.requests.length,0);check((await s.context.cookies()).length,0);
  check(await s.page.locator('.analytics-consent h2').textContent(),'Can we use cookies?');
  await s.page.locator('[data-consent-reject]').click();await s.settle();
  check(s.requests.length,0);
  await s.page.reload();await s.settle();check(s.requests.length,0);check(await s.page.locator('.analytics-consent').isVisible(),false);
  await s.page.evaluate(key=>localStorage.removeItem(key),key);await s.page.reload();await s.page.locator('[data-consent-accept]').click();await s.settle();
  check(s.requests.filter(x=>x.includes('googletagmanager')).length,1);
  check(s.events.map(x=>x[1]),['page_view']);
  check(s.events[0][2].page_location,'https://rancana.id/en/');
  const commands=await s.page.evaluate(()=>window.dataLayer.map(x=>Array.from(x)));
  const config=commands.find(x=>x[0]==='config')[2];
  check(config.send_page_view,false);check(config.allow_google_signals,false);check(config.allow_ad_personalization_signals,false);check(config.cookie_domain,'none');check(config.cookie_prefix,'rancana');check('user_id' in config,false);
  check(commands.filter(x=>x[0]==='consent').map(x=>x[2]),[{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'},{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'}]);
  check(s.events[0][2].page_referrer,'');check(s.events[0][2].send_to,'G-2KDN1C2G3L');
  check(JSON.stringify(s.events).includes('private'),false);
  check((await s.context.cookies()).some(x=>x.name==='rancana_ga'),true);
  // Loading the entry twice must not duplicate UI, tag loads, listeners or views.
  await s.page.addScriptTag({url:origin+'/analytics-consent.js'});await s.settle();
  check(await s.page.locator('.analytics-settings').count(),0);check(await s.page.locator('.analytics-consent').count(),1);check(s.events.length,1);
  await s.page.locator('[data-consent-accept]').evaluate(e=>e.click());await s.settle();check(s.events.length,1);
  // Browser history/hash do not create duplicate canonical-page views.
  await s.page.evaluate(()=>{history.pushState({},'','?email=another@example.test#name');});await s.settle();check(s.events.length,1);
  // Trusted click dispatch in Chromium; abort only its destination, never delay navigation for analytics.
  await s.context.route('https://play.google.com/**',route=>route.abort());
  const play=s.page.locator('.hero-ctas a[href^="/go/play"]').first();
  await play.evaluate(a=>a.addEventListener('click',e=>e.preventDefault())); // Keep this analytics assertion isolated from outbound navigation.
  await play.click({noWaitAfter:true});await s.settle();
  check(await play.getAttribute('href'),'/go/play');
  check(s.events.filter(x=>x[1]==='google_play_click').length,1);
  check(s.events.at(-1)[2].link_destination,'google_play');check(s.events.at(-1)[2].link_placement,'hero');
  await s.page.goto(origin+'/en/privacy?email=private@example.test');await s.settle();
  check(s.events.filter(x=>x[1]==='page_view').length,2);check(s.events.at(-1)[2].page_location,'https://rancana.id/en/privacy');
  await s.page.evaluate(()=>{const a=document.createElement('a');a.href='mailto:help@rancana.id?body=private';a.textContent='Email';a.addEventListener('click',e=>e.preventDefault());document.body.append(a);a.click();});await s.settle();
  check(s.events.filter(x=>x[1]==='google_play_click').length,1);
  const count=s.requests.length;
  // Exercise denial cleanup directly; no user-facing reopen control is shipped.
  await s.page.locator('[data-consent-reject]').evaluate(e=>e.click());await s.settle();
  check(await s.page.locator('script[src*="googletagmanager"]').count(),0);check((await s.context.cookies()).filter(x=>x.name.startsWith('rancana_ga')).length,0);check(s.requests.length,count);
  await s.page.reload();await s.settle();check(s.requests.length,count);
  const id=await session('id');check(await id.page.locator('[data-consent-accept]').textContent(),'Izinkan cookies');check(await id.page.locator('[data-consent-reject]').textContent(),'Tolak cookies');check(id.requests.length,0);
  const expired=await session('en',{version:1,choice:'granted',at:Date.now()-181*86400000});check(expired.requests.length,0);check(await expired.page.locator('.analytics-consent').isVisible(),true);
  const corrupt=await session('en',{version:1,choice:'granted',at:'invalid'});check(corrupt.requests.length,0);
  check(await s.page.locator('iframe').count(),0);
  // Cross-tab revocation reloads the document and removes consented cookies.
  const cross=await session();await cross.page.locator('[data-consent-accept]').click();await cross.settle();
  const second=await cross.context.newPage();await second.goto(origin+'/en/privacy');await second.evaluate(key=>localStorage.setItem(key,JSON.stringify({version:1,choice:'denied',at:Date.now()})),key);await cross.settle();
  check(await cross.page.locator('script[src*="googletagmanager"]').count(),0);
  // Disabled storage must fail closed rather than create an unremembered tag.
  const blocked=await browser.newContext();contexts.push(blocked);
  await blocked.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked')};Storage.prototype.setItem=()=>{throw Error('blocked')};});
  let blockedRequests=0;await blocked.route('https://www.googletagmanager.com/**',route=>{blockedRequests++;return route.abort();});
  const blockedPage=await blocked.newPage();await blockedPage.goto(origin+'/en/');await blockedPage.locator('[data-consent-accept]').click();await blockedPage.waitForTimeout(150);check(blockedRequests,0);
  const legacy=await session('en');await legacy.page.goto(origin+'/?lang=en');await legacy.settle();await legacy.page.locator('[data-consent-accept]').click();await legacy.settle();
  await legacy.page.locator('.lang-btn[data-set-lang="id"]').click();await legacy.settle();check(await legacy.page.locator('[data-consent-accept]').textContent(),'Izinkan cookies');check(legacy.events.filter(x=>x[1]==='page_view').length,2);check(legacy.events.at(-1)[2].page_location,'https://rancana.id/id/');
  const legacyCount=legacy.events.length;await legacy.page.evaluate(()=>document.documentElement.lang='id');await legacy.settle();check(legacy.events.length,legacyCount);
  const latestConfig=await legacy.page.evaluate(()=>window.dataLayer.map(x=>Array.from(x)).filter(x=>x[0]==='config').at(-1)[2]);
  check(latestConfig.update,true);check(latestConfig.send_page_view,false);check(latestConfig.page_location,'https://rancana.id/id/');check(latestConfig.language,'id');
  await legacy.page.evaluate(()=>document.cookie='rancana_ga=session-marker; Path=/; SameSite=Lax');
  const restoredCookies=await legacy.page.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));return document.cookie;});
  check(restoredCookies.includes('rancana_ga=session-marker'),true);await legacy.settle();
  const deadline=await session('en',{version:1,choice:'granted',at:Date.now()-180*86400000+1500});
  check(await deadline.page.locator('script[src*="googletagmanager"]').count(),1);await deadline.page.waitForTimeout(1600);
  check(await deadline.page.locator('script[src*="googletagmanager"]').count(),0);check((await deadline.context.cookies()).filter(x=>x.name.startsWith('rancana_ga')).length,0);check(await deadline.page.locator('.analytics-consent').isVisible(),true);
  const visibility=await session();await visibility.page.locator('[data-consent-accept]').click();await visibility.settle();
  await visibility.page.evaluate(key=>{localStorage.setItem(key,JSON.stringify({version:1,choice:'granted',at:Date.now()-181*86400000}));document.dispatchEvent(new Event('visibilitychange'));},key);
  await visibility.settle();check(await visibility.page.locator('script[src*="googletagmanager"]').count(),0);
  // Initial consent controls work with keyboard and remain reachable on small screens.
  await id.page.goto(origin+'/id/');await id.settle();
  await id.page.locator('[data-consent-reject]').focus();await id.page.keyboard.press('Enter');
  check(await id.page.locator('.analytics-consent').isVisible(),false);check(await id.page.locator('.analytics-settings').count(),0);
  await id.page.evaluate(key=>localStorage.removeItem(key),key);await id.page.reload();
  await id.page.setViewportSize({width:320,height:568});
  const geometry=await id.page.locator('.analytics-consent').evaluate(e=>({width:e.getBoundingClientRect().width,scroll:e.scrollHeight,client:e.clientHeight}));check(geometry.width<=288,true);
  // Previously persisted consent must not reactivate when a denial write fails.
  const failure=await session();await failure.page.locator('[data-consent-accept]').click();await failure.settle();
  await failure.page.evaluate(()=>{window.qaSetItem=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('write denied')};});
  const failureCount=failure.requests.length;
  await failure.page.locator('[data-consent-reject]').evaluate(e=>e.click());await failure.settle();
  check(await failure.page.evaluate(()=>window['ga-disable-G-2KDN1C2G3L']),true);
  check((await failure.context.cookies()).filter(c=>c.name.startsWith('rancana_ga')).length,0);
  check(await failure.page.locator('.analytics-consent p').first().textContent(),'Could not save your choice. Analytics is disabled in this tab. Clear this site’s browser data before leaving to keep it off.');
  await failure.page.evaluate(()=>{dispatchEvent(new Event('focus'));document.documentElement.lang='id';});await failure.settle();
  check(failure.requests.length,failureCount);
  await failure.page.evaluate(()=>{Storage.prototype.setItem=window.qaSetItem;});
  await failure.page.locator('[data-consent-accept]').click();await failure.settle();
  check(await failure.page.evaluate(()=>window['ga-disable-G-2KDN1C2G3L']),false);
  check(failure.requests.filter(x=>x.includes('googletagmanager')).length,2);
  // BFCache resumes valid consent without another SDK load or manual view.
  const bf=await session();await bf.page.locator('[data-consent-accept]').click();await bf.settle();const bfCount=bf.requests.length;
  await bf.page.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));});
  check(await bf.page.evaluate(()=>window['ga-disable-G-2KDN1C2G3L']),true);
  await bf.page.evaluate(()=>{dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});await bf.settle();
  check(await bf.page.evaluate(()=>window['ga-disable-G-2KDN1C2G3L']),false);check(bf.requests.length,bfCount);
  // New resource routes inherit consent and send only canonical, bounded page context.
  for (const locale of ['id', 'en']) for (const guide of ['college-schedule', 'flashcard-guide']) {
    const previousViews = bf.events.filter(event => event[1] === 'page_view').length;
    await bf.page.goto(origin + '/' + locale + '/' + guide + '?email=private@example.test#private-text');
    await bf.settle();
    check(bf.events.filter(event => event[1] === 'page_view').length, previousViews + 1);
    check(bf.events.at(-1)[2].page_location, 'https://rancana.id/' + locale + '/' + guide);
  }
  // Format-validated campaigns (no name allowlist) and the Play handoff: never deliver live analytics.
  const tags = 'utm_source=instagram&utm_medium=organic_social&utm_campaign=rancana_study_2026q4&utm_content=profile_bio';
  const hrefFor = query => '/go/play?' + query;
  const campaignSession = await session();
  await campaignSession.page.goto(origin + '/en/?' + tags + '&email=private@example.test&gclid=private-click#private');
  await campaignSession.settle();
  const campaignPlay = campaignSession.page.locator('.hero-ctas a[href^="/go/play"]').first();
  // The Play link carries the landing campaign before any consent decision.
  const playHref = hrefFor(tags);
  check(await campaignPlay.getAttribute('href'), playHref);
  check(campaignSession.requests.length, 0);
  await campaignSession.page.locator('[data-consent-accept]').click(); await campaignSession.settle();
  check(campaignSession.events.at(-1)[2].campaign_source, 'instagram');
  check(campaignSession.events.at(-1)[2].campaign_medium, 'organic_social');
  check(campaignSession.events.at(-1)[2].page_location, 'https://rancana.id/en/');
  check(campaignSession.events.at(-1)[2].page_referrer, '');
  check(await campaignSession.page.locator('link[rel="canonical"]').getAttribute('href'), 'https://rancana.id/en/');
  check(await campaignPlay.getAttribute('href'), playHref);
  check(JSON.stringify(campaignSession.events).includes('private'), false);
  await campaignPlay.evaluate(a => a.addEventListener('click', e => e.preventDefault()));
  await campaignSession.page.addScriptTag({url: origin + '/analytics-consent.js'});
  await campaignPlay.click(); await campaignSession.settle();
  check(await campaignPlay.getAttribute('href'), playHref);
  check(campaignSession.events.filter(e => e[1] === 'google_play_click').length, 1);
  await campaignPlay.evaluate(a => a.click()); await campaignSession.settle();
  check(campaignSession.events.filter(e => e[1] === 'google_play_click').length, 1);
  await campaignPlay.evaluate(a => a.addEventListener('auxclick', e => e.preventDefault()));
  await campaignPlay.click({button:'middle'}); await campaignSession.settle();
  check(campaignSession.events.filter(e => e[1] === 'google_play_click').length, 2);
  await campaignSession.page.locator('[data-consent-reject]').evaluate(e => e.click()); await campaignSession.settle();
  check(await campaignPlay.getAttribute('href'), playHref);
  check(await campaignSession.page.locator('script[src*="googletagmanager"]').count(), 0);
  // Injected /go/play queries are replaced by the validated campaign href, never forwarded.
  await campaignPlay.evaluate(a => { a.addEventListener('click', e => e.preventDefault()); a.setAttribute('href', a.getAttribute('href') + '&referrer=private&gclid=private&url=https://evil.test'); });
  await campaignPlay.click(); await campaignSession.settle();
  check(await campaignPlay.getAttribute('href'), playHref);
  // Source, medium and campaign are all-or-nothing: missing or malformed values drop the whole tuple.
  const invalid = [tags.replace('rancana_study_2026q4', 'private%40example.test'),
    tags.replace('utm_medium=organic_social&', ''), tags.replace('utm_source=instagram&', ''),
    tags.replace('instagram', 'a'.repeat(65)), tags.replace('organic_social', 'paid%20social'),
    tags.replace('instagram', 'insta%2Fgram'), tags.replace('instagram', ''), 'utm_content=profile_bio'];
  const registry = await session();
  await registry.page.locator('[data-consent-accept]').click();
  for (const query of invalid) {
    await registry.page.goto(origin + '/id/?' + query); await registry.settle();
    check(registry.events.at(-1)[2].campaign_source, '');
    check(await registry.page.locator('.hero-ctas a[href^="/go/play"]').first().getAttribute('href'), '/go/play');
  }
  // Format-only validation: lowercasing, first value wins, optional content, and new names need no deploy.
  for (const [query, expected] of [
    [tags.replace('instagram', 'Instagram'), ['instagram', 'organic_social', 'rancana_study_2026q4', 'profile_bio']],
    [tags + '&utm_source=x', ['instagram', 'organic_social', 'rancana_study_2026q4', 'profile_bio']],
    [tags.replace('&utm_content=profile_bio', ''), ['instagram', 'organic_social', 'rancana_study_2026q4', '']],
    [tags.replace('profile_bio', 'profile_bio%26url%3Dhttps%3A%2F%2Fevil.test'), ['instagram', 'organic_social', 'rancana_study_2026q4', '']],
    [tags.replace('profile_bio', '%2570rofile_bio'), ['instagram', 'organic_social', 'rancana_study_2026q4', '']],
    ['utm_source=threads&utm_medium=creator&utm_campaign=raya_launch.2027-q1', ['threads', 'creator', 'raya_launch.2027-q1', '']]]) {
    await registry.page.goto(origin + '/id/?' + query); await registry.settle();
    const e = registry.events.at(-1)[2];
    check([e.campaign_source, e.campaign_medium, e.campaign_name, e.campaign_content], expected);
    const q = new URLSearchParams({utm_source: expected[0], utm_medium: expected[1], utm_campaign: expected[2]});
    if (expected[3]) q.set('utm_content', expected[3]);
    check(await registry.page.locator('.hero-ctas a[href^="/go/play"]').first().getAttribute('href'), hrefFor(q.toString()));
    check(JSON.stringify(e).includes('evil'), false);
  }
  for (const locale of ['id', 'en']) for (const source of ['instagram', 'tiktok', 'x']) for (const medium of ['organic_social', 'paid_social']) {
    const content = medium === 'organic_social' ? 'profile_bio' : source === 'tiktok' ? 'video_ad' : 'feed_ad';
    const query = new URLSearchParams({utm_source:source,utm_medium:medium,utm_campaign:'rancana_study_2026q4',utm_content:content});
    await registry.page.goto(origin + '/' + locale + '/?' + query); await registry.settle();
    check(registry.events.at(-1)[2].campaign_source, source);
    check(registry.events.at(-1)[2].campaign_medium, medium);
    check(registry.events.at(-1)[2].page_location, 'https://rancana.id/' + locale + '/');
    check(await registry.page.locator('.hero-ctas a[href^="/go/play"]').first().getAttribute('href'), hrefFor(query.toString()));
  }
  // /go/play remains the client destination; injected queries are replaced with the session campaign.
  const lastHref = hrefFor('utm_source=x&utm_medium=paid_social&utm_campaign=rancana_study_2026q4&utm_content=feed_ad');
  await registry.page.evaluate(() => {
    const a = document.createElement('a'); a.id = 'redirect-probe'; a.href = '/go/play?url=https://evil.test&referrer=private'; a.textContent = 'probe';
    a.addEventListener('click', e => e.preventDefault()); document.body.prepend(a);
  });
  await registry.page.locator('#redirect-probe').click(); await registry.settle();
  check(await registry.page.locator('#redirect-probe').getAttribute('href'), lastHref);
  const beforeUnsafe = registry.events.length;
  for (const href of ['https://play.google.com.evil.test/store/apps/details?id=com.planora.labs',
    'https://user@play.google.com/store/apps/details?id=com.planora.labs',
    'https://play.google.com:444/store/apps/details?id=com.planora.labs',
    'https://play.google.com/store/apps/details?id=com.other.app',
    'https://play.google.com/store/apps/details?id=com.planora.labs&id=com.other.app']) {
    await registry.page.locator('#redirect-probe').evaluate((a, href) => {a.href=href;}, href);
    await registry.page.locator('#redirect-probe').click(); await registry.settle();
    check(await registry.page.locator('#redirect-probe').getAttribute('href'), href);
  }
  check(registry.events.length, beforeUnsafe);
  // Consented campaign survives same-origin page navigation without URL decoration.
  await registry.page.goto(origin + '/en/privacy'); await registry.settle();
  check(registry.events.at(-1)[2].campaign_source, 'x');
  // Withdrawal with failed persistence still removes tags immediately.
  await failure.page.goto(origin + '/en/?' + tags); await failure.settle();
  await failure.page.evaluate(() => {Storage.prototype.setItem=()=>{throw Error('blocked')};});
  await failure.page.locator('[data-consent-reject]').evaluate(e=>e.click()); await failure.settle();
  check(await failure.page.locator('.hero-ctas a[href^="/go/play"]').first().getAttribute('href'), playHref);
  // Session lifetime, tampering, navigation and regrant boundaries.
  const sessionKey = 'rancana_campaign_session_v1';
  const flow = await session();
  await flow.page.goto(origin + '/en/?' + tags + '&gclid=private-id&email=private@example.test');
  check(await flow.page.evaluate(k => sessionStorage.getItem(k), sessionKey), null);
  await flow.page.locator('[data-consent-accept]').click(); await flow.settle();
  const saved = await flow.page.evaluate(k => JSON.parse(sessionStorage.getItem(k)), sessionKey);
  check(Object.keys(saved).sort(), ['at', 'campaign', 'consentAt', 'version']);
  check(JSON.stringify(saved).includes('private'), false);
  await flow.page.goto(origin + '/en/privacy'); await flow.settle();
  check(flow.events.at(-1)[2].campaign_source, 'instagram');
  check(flow.events.at(-1)[2].page_location, 'https://rancana.id/en/privacy');
  await flow.page.goto(origin + '/id/'); await flow.settle();
  check(flow.events.at(-1)[2].campaign_source, 'instagram');
  check(await flow.page.evaluate(k => JSON.parse(sessionStorage.getItem(k)).at, sessionKey), saved.at);
  check(await flow.page.locator('.hero-ctas a[href^="/go/play"]').first().getAttribute('href'), playHref);
  // New independent tab does not inherit a campaign; no localStorage campaign record.
  const independent = await flow.context.newPage(); await independent.goto(origin + '/en/');
  check(await independent.evaluate(k => sessionStorage.getItem(k), sessionKey), null);
  check(await flow.page.evaluate(k => localStorage.getItem(k), sessionKey), null);
  await independent.close();
  await flow.page.evaluate(k => {const v=JSON.parse(sessionStorage.getItem(k));v.at=Date.now()-30*60000+300;sessionStorage.setItem(k,JSON.stringify(v));dispatchEvent(new Event('focus'));}, sessionKey);
  await flow.page.waitForTimeout(500);
  check(await flow.page.evaluate(k => sessionStorage.getItem(k), sessionKey), null);
  check(await flow.page.locator('.hero-ctas a[href^="/go/play"]').first().getAttribute('href'), playHref);
  await flow.page.goto(origin + '/en/privacy'); await flow.settle();
  check(flow.events.at(-1)[2].campaign_source, '');
  // Stored injection and extra fields are rejected rather than forwarded.
  for (const mutate of ['source', 'extra', 'future', 'consent', 'malformed']) {
    await flow.page.goto(origin + '/en/?' + tags); await flow.settle();
    await flow.page.evaluate(({k,mutate}) => {
      const v=JSON.parse(sessionStorage.getItem(k));
      if(mutate==='source')v.campaign.campaign_source='private@example.test';
      if(mutate==='extra')v.campaign.gclid='private-id';
      if(mutate==='future')v.at=Date.now()+60000;
      if(mutate==='consent')v.consentAt=1;
      sessionStorage.setItem(k,mutate==='malformed'?'bad json':JSON.stringify(v));
    }, {k:sessionKey,mutate});
    await flow.page.goto(origin + '/id/privacy'); await flow.settle();
    check(flow.events.at(-1)[2].campaign_source, '');
    check(await flow.page.evaluate(k => sessionStorage.getItem(k), sessionKey), null);
  }
  // Withdrawal clears session data; a later grant on an untagged page cannot resurrect it.
  await flow.page.goto(origin + '/en/?' + tags); await flow.settle();
  await flow.page.goto(origin + '/en/privacy'); await flow.settle();
  await flow.page.locator('[data-consent-reject]').evaluate(e=>e.click()); await flow.settle();
  check(await flow.page.evaluate(k => sessionStorage.getItem(k), sessionKey), null);
  await flow.page.locator('[data-consent-accept]').evaluate(e=>e.click()); await flow.settle();
  check(flow.events.at(-1)[2].campaign_source, '');
  // Session storage failure does not block normal navigation or permit campaign collection.
  await flow.page.evaluate(() => {Storage.prototype.setItem=function(){throw Error('blocked')};});
  await flow.page.goto(origin + '/en/?' + tags); await flow.settle();
  // Install the fault before script execution on the next document.
  await flow.context.addInitScript(() => {const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(this===sessionStorage)throw Error('blocked session');return original.call(this,k,v);};});
  await flow.page.evaluate(k=>sessionStorage.removeItem(k),sessionKey);
  await flow.page.reload(); await flow.settle();
  check(flow.events.at(-1)[2].campaign_source, '');
  check(await flow.page.locator('.hero-ctas a[href^="/go/play"]').first().getAttribute('href'), playHref);
  // Revocation actually creates a fresh document; expired consent does likewise.
  check(await s.page.evaluate(()=>window.dataLayer === undefined),true);
  check(await deadline.page.evaluate(()=>window.dataLayer === undefined),true);
  await fs.mkdir(path.join(root,'review-evidence'),{recursive:true});
  await id.page.setViewportSize({width:390,height:844});await id.page.goto(origin+'/id/');await id.settle();await id.page.screenshot({path:path.join(root,'review-evidence/consent-id-mobile.png')});
  await s.page.evaluate(key=>localStorage.removeItem(key),key);await s.page.reload();await s.page.screenshot({path:path.join(root,'review-evidence/consent-en-mobile.png')});
  console.log('PASS — '+assertions+' Chromium consent, cookie, navigation, deduplication, sanitization and Play-click assertions; Google SDK/collection intercepted, no live GA traffic');
} finally { await Promise.all(contexts.map(c=>c.close()));await browser.close();server.close(); }
