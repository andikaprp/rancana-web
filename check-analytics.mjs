import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const root = path.dirname(new URL(import.meta.url).pathname);
const types = {'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.woff':'font/woff'};
const server = http.createServer(async (req,res) => {
  try {
    let name = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
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
const sdk = `(() => {const process = args => {const a=Array.from(args);if(window['ga-disable-G-2KDN1C2G3L'])return;if(a[0]==='config')document.cookie='rancana_ga=test-browser; Path=/; SameSite=Lax';if(a[0]==='event')fetch('https://www.google-analytics.com/g/collect',{method:'POST',body:JSON.stringify(a)});};window.dataLayer.forEach(process);window.dataLayer.push=function(...items){items.forEach(process);return Array.prototype.push.apply(this,items);};})();`;
const contexts=[];
async function session(locale='en',initial=null) {
  const context = await browser.newContext({viewport:{width:390,height:844}});contexts.push(context);
  const requests=[],events=[];
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
  check(await s.page.locator('.analytics-consent h2').textContent(),'Your analytics choice');
  await s.page.locator('[data-consent-reject]').click();await s.settle();
  check(s.requests.length,0);
  await s.page.reload();await s.settle();check(s.requests.length,0);check(await s.page.locator('.analytics-consent').isVisible(),false);
  await s.page.locator('.analytics-settings').click();await s.page.locator('[data-consent-accept]').click();await s.settle();
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
  check(await s.page.locator('.analytics-settings').count(),1);check(s.events.length,1);
  await s.page.locator('.analytics-settings').click();await s.page.locator('[data-consent-accept]').click();await s.settle();check(s.events.length,1);
  // Browser history/hash do not create duplicate canonical-page views.
  await s.page.evaluate(()=>{history.pushState({},'','?email=another@example.test#name');});await s.settle();check(s.events.length,1);
  // Trusted click dispatch in Chromium; abort only its destination, never delay navigation for analytics.
  await s.context.route('https://play.google.com/**',route=>route.abort());
  const play=s.page.locator('.hero-ctas a[href*="play.google.com"]').first();
  await play.click({noWaitAfter:true});await s.settle();
  check(s.events.filter(x=>x[1]==='google_play_click').length,1);
  check(s.events.at(-1)[2].link_destination,'google_play');check(s.events.at(-1)[2].link_placement,'hero');
  await s.page.goto(origin+'/en/privacy?email=private@example.test');await s.settle();
  check(s.events.filter(x=>x[1]==='page_view').length,2);check(s.events.at(-1)[2].page_location,'https://rancana.id/en/privacy');
  await s.page.evaluate(()=>{const a=document.createElement('a');a.href='mailto:help@rancana.id?body=private';a.textContent='Email';a.addEventListener('click',e=>e.preventDefault());document.body.append(a);a.click();});await s.settle();
  check(s.events.filter(x=>x[1]==='google_play_click').length,1);
  const count=s.requests.length;
  await s.page.locator('.analytics-settings').click();await s.page.locator('[data-consent-reject]').click();await s.settle();
  check(await s.page.locator('script[src*="googletagmanager"]').count(),0);check((await s.context.cookies()).filter(x=>x.name.startsWith('rancana_ga')).length,0);check(s.requests.length,count);
  await s.page.reload();await s.settle();check(s.requests.length,count);
  const id=await session('id');check(await id.page.locator('[data-consent-accept]').textContent(),'Izinkan analitik');check(await id.page.locator('[data-consent-reject]').textContent(),'Tolak analitik');check(id.requests.length,0);
  const expired=await session('en',{version:1,choice:'granted',at:Date.now()-181*86400000});check(expired.requests.length,0);check(await expired.page.locator('.analytics-consent').isVisible(),true);
  const corrupt=await session('en',{version:1,choice:'granted',at:'invalid'});check(corrupt.requests.length,0);
  check(await s.page.locator('iframe').count(),0);
  // Cross-tab revocation reloads the document and removes consented cookies.
  const cross=await session();await cross.page.locator('[data-consent-accept]').click();await cross.settle();
  const second=await cross.context.newPage();await second.goto(origin+'/en/privacy');await second.locator('.analytics-settings').click();await second.locator('[data-consent-reject]').click();await cross.settle();
  check(await cross.page.locator('script[src*="googletagmanager"]').count(),0);
  // Disabled storage must fail closed rather than create an unremembered tag.
  const blocked=await browser.newContext();contexts.push(blocked);
  await blocked.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked')};Storage.prototype.setItem=()=>{throw Error('blocked')};});
  let blockedRequests=0;await blocked.route('https://www.googletagmanager.com/**',route=>{blockedRequests++;return route.abort();});
  const blockedPage=await blocked.newPage();await blockedPage.goto(origin+'/en/');await blockedPage.locator('[data-consent-accept]').click();await blockedPage.waitForTimeout(150);check(blockedRequests,0);
  const legacy=await session('en');await legacy.page.goto(origin+'/?lang=en');await legacy.settle();await legacy.page.locator('[data-consent-accept]').click();await legacy.settle();
  await legacy.page.locator('.lang-btn[data-set-lang="id"]').click();await legacy.settle();check(await legacy.page.locator('[data-consent-accept]').textContent(),'Izinkan analitik');check(legacy.events.filter(x=>x[1]==='page_view').length,2);check(legacy.events.at(-1)[2].page_location,'https://rancana.id/id/');
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
  // Keyboard reopening/closing restores focus; zoom/mobile controls remain reachable.
  await id.page.goto(origin+'/id/');await id.settle();await id.page.locator('[data-consent-reject]').click();
  await id.page.locator('.analytics-settings').focus();await id.page.keyboard.press('Enter');check(await id.page.locator('[data-consent-accept]').evaluate(e=>e===document.activeElement),true);
  await id.page.keyboard.press('Escape');check(await id.page.locator('.analytics-settings').evaluate(e=>e===document.activeElement),true);
  await id.page.setViewportSize({width:320,height:568});await id.page.locator('.analytics-settings').click();
  const geometry=await id.page.locator('.analytics-consent').evaluate(e=>({width:e.getBoundingClientRect().width,scroll:e.scrollHeight,client:e.clientHeight}));check(geometry.width<=288,true);
  // Previously persisted consent must not reactivate when a denial write fails.
  const failure=await session();await failure.page.locator('[data-consent-accept]').click();await failure.settle();
  await failure.page.evaluate(()=>{window.qaSetItem=Storage.prototype.setItem;Storage.prototype.setItem=()=>{throw Error('write denied')};});
  const failureCount=failure.requests.length;
  await failure.page.locator('.analytics-settings').click();await failure.page.locator('[data-consent-reject]').click();await failure.settle();
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
  // Revocation actually creates a fresh document; expired consent does likewise.
  check(await s.page.evaluate(()=>window.dataLayer === undefined),true);
  check(await deadline.page.evaluate(()=>window.dataLayer === undefined),true);
  await fs.mkdir(path.join(root,'review-evidence'),{recursive:true});
  await id.page.setViewportSize({width:390,height:844});await id.page.goto(origin+'/id/');await id.settle();await id.page.locator('.analytics-settings').click();await id.page.screenshot({path:path.join(root,'review-evidence/consent-id-mobile.png')});
  await s.page.locator('.analytics-settings').click();await s.page.screenshot({path:path.join(root,'review-evidence/consent-en-mobile.png')});
  console.log('PASS — '+assertions+' Chromium consent, cookie, navigation, deduplication, sanitization and Play-click assertions; Google SDK/collection intercepted, no live GA traffic');
} finally { await Promise.all(contexts.map(c=>c.close()));await browser.close();server.close(); }
