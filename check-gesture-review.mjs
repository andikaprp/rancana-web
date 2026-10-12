import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';
const root=path.dirname(new URL(import.meta.url).pathname),out=path.join(root,'review-evidence/gesture-review');
await fs.mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname;if(p.endsWith('/'))p+='index.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+'/'))throw Error('path');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(f)]||'application/octet-stream');res.end(await fs.readFile(f));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
const report={responsive:[],sunglasses:[],complete:false};
const seek=(page,selector,time)=>page.locator(selector).evaluate((e,time)=>e.dispatchEvent(new CustomEvent('companion:seek',{detail:{time,paused:true}})),time);
const ready=page=>page.waitForFunction(()=>[...document.querySelectorAll('[data-companion-scene-root]')].every(e=>e.dataset.companionAssets==='ready'));
const identity=page=>page.locator('.brand-mark').evaluate(e=>({bodies:e.querySelectorAll('.rig-body-texture').length,source:e.querySelector('.rig-body-texture')?.getAttribute('href'),switches:e.querySelectorAll('.study-costumes,img').length}));
try{
 for(const lang of ['id','en'])for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000}});await page.route('https://**/*',r=>r.abort());await page.goto(`${origin}/${lang}/`);await ready(page);if(await page.locator('[data-consent-reject]').isVisible())await page.locator('[data-consent-reject]').click();
  const original=await identity(page);assert.equal(original.bodies,1);assert.equal(original.switches,0);
  for(const selector of ['.hero-wrap','#for-you','#features','#benefits','#cta','#faq','.hero-wrap','#for-you']){
   await page.locator(selector).scrollIntoViewIfNeeded();await page.waitForTimeout(90);assert.deepEqual(await identity(page),original,'navbar keeps the very same green Ranca through repeated section entries');
  }
  const mobile=await page.locator('.card-flashcards').evaluate(e=>({raster:[...e.querySelectorAll('.fc-front,.fc-back')].filter(x=>getComputedStyle(x).display!=='none').length,mobile:[...e.querySelectorAll('.fc-mobile')].filter(x=>getComputedStyle(x).display!=='none').length}));
  assert.deepEqual(mobile,width<900?{raster:0,mobile:1}:{raster:2,mobile:0},'exactly one Flashcard composition');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.locator('.hero-wrap').scrollIntoViewIfNeeded();
  const contours=[];
  for(const [name,time] of [['rest',0],['present',2700]]){await seek(page,'.hero-wrap',time);contours.push(await page.locator('.hero-companion-ranca [data-companion-hand=right] path:last-child').getAttribute('d'));await page.screenshot({path:path.join(out,`${lang}-${width}-hero-${name}.png`)});}
  assert.notEqual(contours[0],contours[1],'rest and presentation have different finger contours');
  await page.locator('.footer-brand-row').scrollIntoViewIfNeeded();
  for(const [name,time] of [['search',3000],['discovery',6500],['cover',10500],['peek',14500]]){await seek(page,'.footer-brand-row',time);await page.screenshot({path:path.join(out,`${lang}-${width}-footer-${name}.png`)});}
  await page.emulateMedia({reducedMotion:'reduce'});const still=await page.locator('.footer-brand-row').screenshot();await page.waitForTimeout(300);assert.ok(still.equals(await page.locator('.footer-brand-row').screenshot()),'reduced-motion footer is pixel-stable');
  report.responsive.push({lang,width,navbarAlwaysRanca:true,singleFlashcardComposition:true,reducedMotionStable:true});await page.close();
 }
 for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});await page.goto(`${origin}/review-sunglasses-cana.html`);await ready(page);
  const scene='.sunglasses-stage',actor='[data-companion-character=cana]';
  const source=await page.locator('[data-companion-body]').getAttribute('href');assert.ok(source.endsWith('/cana-body.webp'));
  assert.equal(await page.locator('[data-companion-accessory]').count(),1);
  const frames=[];
  for(const [name,time] of [['relax',0],['adjust',2600],['glance',4300]]){await seek(page,scene,time);frames.push(await page.locator('[data-companion-hand=right]').innerHTML());await page.screenshot({path:path.join(out,`sunglasses-${width}-${name}.png`)});}
  assert.equal(new Set(frames).size,3,'relax, adjustment, glance have distinct articulation');
  // Sample live transformed strokes across the entire loop, including transitions.
  for(let time=0;time<10000;time+=100){await seek(page,scene,time);const bounds=await page.locator(actor).evaluate(e=>{const paths=[...e.querySelectorAll('[data-companion-hand] path,[data-companion-face] path')];return paths.map(p=>{const r=p.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};});});assert.ok(bounds.every(r=>r.left>=0&&r.right<=width&&r.top>=0&&r.bottom<900),'all facial and hand marks fit the viewport throughout motion');}
  await page.locator(scene).evaluate(e=>e.dispatchEvent(new CustomEvent('companion:resume')));await page.waitForTimeout(100);
  const time=()=>page.locator(actor).evaluate(e=>e.getAnimations()[0]?.currentTime);
  for(let n=0;n<3;n++){
   await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide')));const t=await time();await page.waitForTimeout(120);assert.equal(await time(),t);await page.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow')));await page.waitForTimeout(130);assert.ok(await time()>t);
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});const hidden=await time();await page.waitForTimeout(120);assert.equal(await time(),hidden);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(120);assert.ok(await time()>hidden);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);assert.equal(await page.locator(actor).evaluate(e=>e.getAnimations().length),0);const reduced=await page.locator(scene).screenshot();await page.waitForTimeout(250);assert.ok(reduced.equals(await page.locator(scene).screenshot()));assert.equal(await page.locator('[data-companion-accessory]').isVisible(),true);
  await page.screenshot({path:path.join(out,`sunglasses-${width}-reduced.png`)});report.sunglasses.push({width,source,threeDistinctPoses:true,fullLoopNoClipping:true,repeatedPageAndVisibilityResume:true,reducedMotionStable:true});await page.close();
 }
 for(const [label,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height},recordVideo:{dir:out,size:{width,height}}});const video=page.video();await page.goto(`${origin}/review-sunglasses-cana.html`);await ready(page);await page.waitForTimeout(12000);await page.close();await video.saveAs(path.join(out,`${label}-sunglasses.webm`));await video.delete();
 }
 report.complete=true;console.log('PASS: ID/EN 320/390/1440, Ranca-only navbar, single Flashcards, gesture checkpoints, sunglasses full loop, repeated lifecycle, reduced motion, desktop/mobile videos');
}finally{await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();server.close();}
