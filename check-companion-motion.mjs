import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.dirname(new URL(import.meta.url).pathname),out=path.join(root,'review-evidence/companion-motion');
await fs.mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname;if(p.endsWith('/'))p+='index.html';if(!path.extname(p))p+='.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+'/'))throw Error('path');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp'})[path.extname(f)]||'application/octet-stream');res.end(await fs.readFile(f));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
const reports=[];
const reveal=async(page,scene)=>{await page.locator(`.companion-stage[data-scene="${scene}"]`).first().evaluate((el,scene)=>scrollTo(0,scene==='dance'?document.documentElement.scrollHeight:el.getBoundingClientRect().top+scrollY-innerHeight*.67),scene);await page.waitForTimeout(150);};
const settle=async page=>{await page.evaluate(()=>document.fonts.ready);if(await page.locator('[data-consent-reject]').isVisible())await page.locator('[data-consent-reject]').click();await page.evaluate(async()=>{for(const i of document.images)i.loading='eager';await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});};
try{
 for(const lang of ['id','en'])for(const width of [320,393,768,900,1440,1920]){
  const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());await page.goto(`${origin}/${lang}/`);await settle(page);
  assert.equal(await page.locator('.companion-rig').count(),4);
  assert.equal(await page.locator('.footer-brand-text').textContent(),'Rancana');
  for(const scene of ['present','dance']){
   await reveal(page,scene);
   await page.waitForFunction(scene=>[...document.querySelectorAll(`.companion-stage[data-scene="${scene}"]`)].every(el=>el.dataset.motion==='playing'),scene);
   const geometry=await page.evaluate(scene=>{
    const items=[...document.querySelectorAll(`.companion-stage[data-scene="${scene}"]`)];
    const protectedEls=[...document.querySelectorAll('.hero-ctas a,.download-content a,.preview-footer a,.footer-brand-text')].map(el=>({name:el.className,rect:el.getBoundingClientRect()}));
    // The screenshot includes a faded white border. Protect its actual UI, not that decorative margin.
    for(const screen of document.querySelectorAll('.hero .phone')){
     const phone=screen.getBoundingClientRect();
     for(const [name,x1,y1,x2,y2] of [['screen-content',.125,.07,.875,.80],['screen-add-button',.36,.825,.69,.895]])protectedEls.push({name:screen.className+' '+name,rect:{left:phone.left+phone.width*x1,right:phone.left+phone.width*x2,top:phone.top+phone.height*y1,bottom:phone.top+phone.height*y2}});
    }
    const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    const problems=[];
    const initialWord=document.querySelector('.footer-brand-text').getBoundingClientRect().toJSON();
    for(const el of items)for(const a of el.getAnimations({subtree:true}))a.pause();
    for(let t=0;t<=11000;t+=160){
     for(const el of items)for(const a of el.getAnimations({subtree:true}))a.currentTime=t;
     for(const el of items){
      for(const actor of el.querySelectorAll('.rig-body>use,.rig-face path,.rig-hands path')){
       const r=actor.getBoundingClientRect();
       if(r.left < -1 || r.right>innerWidth+1)problems.push({kind:'viewport',t,character:el.dataset.character,left:r.left,right:r.right});
       for(const control of protectedEls){if(overlaps(r,control.rect))problems.push({kind:'overlap',t,character:el.dataset.character,target:control.name});}
      }
     }
    }
    return {problems,overflow:document.documentElement.scrollWidth>innerWidth,wordUnchanged:JSON.stringify(initialWord)===JSON.stringify(document.querySelector('.footer-brand-text').getBoundingClientRect().toJSON()),pointerInert:items.every(el=>getComputedStyle(el).pointerEvents==='none')};
   },scene);
   reports.push({lang,width,scene,...geometry});
   await page.screenshot({path:path.join(out,`${lang}-${width}-${scene}-bounds.png`)});assert.equal(geometry.overflow,false);assert.equal(geometry.wordUnchanged,true);assert.equal(geometry.pointerInert,true);
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>[...document.querySelectorAll('.companion-stage')].every(e=>e.dataset.motion==='reduced'));assert.equal(await page.locator('.companion-stage').evaluateAll(els=>els.reduce((n,e)=>n+e.getAnimations({subtree:true}).length,0)),0);
   await page.emulateMedia({reducedMotion:'no-preference'});
   await page.evaluate(()=>scrollTo(0,document.querySelector('#features').offsetTop));await page.waitForTimeout(250);
   assert.ok(await page.locator('.companion-stage').evaluateAll(els=>els.every(e=>e.dataset.motion==='paused')),'offscreen pause');
   await reveal(page,scene);await page.waitForTimeout(250);
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
   assert.ok(await page.locator('.companion-stage').evaluateAll(els=>els.every(e=>e.dataset.motion==='paused')),'hidden document pause');
   await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
   await page.waitForTimeout(100);
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 // Natural-speed real-page recordings, two cycles with rests, at actual responsive sizes.
 for(const [label,width,height] of [['mobile',393,852],['desktop',1440,1000]])for(const scene of ['present','dance']){
  const context=await browser.newContext({viewport:{width,height},recordVideo:{dir:out,size:{width,height}}});
  const page=await context.newPage();await page.route('https://**/*',r=>r.abort());await page.goto(`${origin}/id/`);await settle(page);await reveal(page,scene);
  await page.locator(`.companion-stage[data-scene="${scene}"]`).evaluateAll(els=>{for(const el of els)for(const a of el.getAnimations({subtree:true}))a.currentTime=0;});
  await page.waitForTimeout(1900);await page.screenshot({path:path.join(out,`${label}-${scene}.png`)});await page.waitForTimeout(12500);
  const video=page.video();await page.close();await context.close();await video.saveAs(path.join(out,`${label}-${scene}.webm`));
 }
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(reports,null,2));assert.deepEqual(reports.filter(r=>r.problems.length).map(r=>({lang:r.lang,width:r.width,scene:r.scene,problems:r.problems.slice(0,8)})),[],'all actual painted geometry must clear controls and viewport');console.log('PASS: 24 responsive/locale scenes, painted bounds and control clearance, stationary wordmark, separate arm/face tracks, reduced-motion cancellation/resume, offscreen and hidden-document pause; four actual-page recordings.');
}finally{await fs.writeFile(path.join(out,'report.json'),JSON.stringify(reports,null,2));await browser.close();await new Promise(r=>server.close(r));}
