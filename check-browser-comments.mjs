import assert from 'node:assert/strict';
import os from 'node:os';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.dirname(new URL(import.meta.url).pathname);
const server=http.createServer(async(req,res)=>{
 try{
  let p=new URL(req.url,'http://localhost').pathname;
  if(p.endsWith('/'))p+='index.html'; if(!path.extname(p))p+='.html';
  const file=path.resolve(root,'.'+p);if(!file.startsWith(root+'/'))throw Error('path');
  res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
  res.end(await fs.readFile(file));
 }catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({headless:true});
try {
 for (const width of [320,390,900,1341]) {
  const page = await browser.newPage({viewport:{width,height:914}});
  for (const lang of ['id','en']) {
   await page.goto(`${origin}/${lang}/`);
   const reject = page.locator('[data-consent-reject]');
   if (await reject.isVisible()) await reject.click();
   await page.waitForFunction(()=>document.querySelector('.hero-companion-cana .companion-art'));
   await page.locator('.hero-wrap').evaluate(root=>root.dispatchEvent(new CustomEvent('companion:seek',{detail:{time:0,paused:true}})));
   const wink = await page.locator('.hero-companion-cana [data-companion-face] > path').first().evaluate(eye=>({
    height:eye.getBBox().height,
    tip:eye.isPointInFill(new DOMPoint(-24,0)),
    upper:eye.isPointInFill(new DOMPoint(7,-23)),
    lower:eye.isPointInFill(new DOMPoint(7,23)),
    middle:eye.isPointInFill(new DOMPoint(7,0))
   }));
   assert.equal(await page.locator('.hero-companion-cana [data-companion-lash]').count(),2);
   assert.equal(await page.locator('.hero-companion-ranca [data-companion-lash]').count(),0);
   assert.ok(wink.height>60&&wink.tip&&wink.upper&&wink.lower&&!wink.middle,'Cana wink has two angled arms and an open center');
   await page.locator('.hero-companion-cana').screenshot({path:`${os.tmpdir()}/rancana-cana-wink-${lang}-${width}.png`});
   for (const [selector,times] of [['.hero-wrap',[0,1100,1400,4200]],['.footer-brand-row',[0,3000,6000,10000,14000]]]) {
    const scene=page.locator(selector);
    await scene.scrollIntoViewIfNeeded();
    await page.waitForFunction(selector=>document.querySelector(selector).querySelectorAll('.companion-art').length===2,selector);
    for (const time of times) {
     await scene.evaluate((root,time)=>root.dispatchEvent(new CustomEvent('companion:seek',{detail:{time,paused:true}})),time);
     const wrists=await scene.locator('[data-companion-hand]').evaluateAll(groups=>groups.map(group=>{
      const [arm,hand]=group.children;
      const tip=arm.getPointAtLength(arm.getTotalLength()).matrixTransform(arm.getCTM());
      const wrist=new DOMPoint(0,24).matrixTransform(hand.getCTM());
      return Math.hypot(tip.x-wrist.x,tip.y-wrist.y);
     }));
     const lashes=await scene.locator('[data-companion-lash]').evaluateAll(lashes=>lashes.map(lash=>({
      opacity:lash.getAttribute('opacity'),
      eye:lash.parentElement.children[[...lash.parentElement.querySelectorAll('[data-companion-lash]')].indexOf(lash)].getAttribute('opacity')
     })));
     assert.ok(lashes.every(lash=>lash.opacity===lash.eye),'lashes follow blinking and disappear beneath covering hands');
     assert.equal(wrists.length,4);
     assert.ok(wrists.every(gap=>Number.isFinite(gap)&&gap<.1),'all four wrists stay joined to their arms through each pose');
    }
    await scene.evaluate(root=>root.dispatchEvent(new CustomEvent('companion:resume')));
   }
   await page.locator('.hero-wrap').evaluate(root=>root.dispatchEvent(new CustomEvent('companion:resume')));
   await page.locator('#features').scrollIntoViewIfNeeded();
   await page.waitForTimeout(300);
   const sizes = await page.locator('.card-head').evaluateAll(heads=>heads.map(head=>({text:parseFloat(getComputedStyle(head.querySelector('p')).fontSize),icon:head.querySelector('img').getBoundingClientRect().width,head:head.getBoundingClientRect().bottom,art:head.nextElementSibling.getBoundingClientRect().top})));
   assert.equal(sizes.length,4);
   for (const size of sizes) {assert.ok(size.text>=18);assert.ok(size.icon>=47);assert.ok(size.art>=size.head-1);}
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.locator('#features').screenshot({style:'.site-header{visibility:hidden}',path:`${os.tmpdir()}/rancana-features-${lang}-${width}.png`});
   await page.locator('#benefits').screenshot({style:'.site-header{visibility:hidden}',path:`${os.tmpdir()}/rancana-benefits-${lang}-${width}.png`});
   await page.evaluate(()=>scrollTo(0,document.querySelector('#for-you').offsetTop-innerHeight*.2));
   await page.waitForTimeout(700);
   const costume=page.locator('.study-costumes');
   await costume.waitFor({state:'visible'});
   assert.equal(await costume.locator('img').count(),2);
   assert.ok(await costume.locator('img').evaluateAll(images=>images.every(img=>img.complete&&img.naturalWidth>0)));
   assert.equal(await costume.evaluate(el=>getComputedStyle(el).animationName),'study-flip');
   assert.equal(await costume.evaluate(el=>getComputedStyle(el).animationPlayState),'running');
   for (const [name,time] of [['backpack',2000],['graduate',6000]]) {
    await costume.evaluate((el,time)=>{const animation=el.getAnimations()[0];animation.pause();animation.currentTime=time;},time);
    await page.locator('.site-header .brand').screenshot({path:`${os.tmpdir()}/rancana-header-${name}-${lang}-${width}.png`});
   }
   await page.emulateMedia({reducedMotion:'reduce'});
   assert.equal(await costume.evaluate(el=>getComputedStyle(el).animationName),'none');
   const cana=page.locator('.hero-companion-cana .companion-actor');
   await page.waitForFunction(()=>document.querySelector('.hero-companion-cana .companion-actor')?.dataset.companionMotion==='reduced');
   assert.equal(await cana.locator('.companion-art').isVisible(),true,'reduced motion retains Chana’s updated static face');
   assert.equal(await cana.evaluate(el=>el.getAnimations({subtree:true}).length),0);
   const rest=await cana.innerHTML();await page.waitForTimeout(100);assert.equal(await cana.innerHTML(),rest,'static expression remains still');
   await page.emulateMedia({reducedMotion:'no-preference'});
  }
  await page.close();
 }
 console.log('PASS: ID/EN at 320, 390, 900 and 1341px; soft Chana face and static reduced motion, rounded connected hands, chevron wink, readable copy/icons, no overflow, costumes loaded, flip and reduced motion.');
} finally {await browser.close();server.close();}
