import assert from 'node:assert/strict';
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
let browser;
await fs.mkdir(path.join(root,'review-evidence'),{recursive:true});
const mapping=[
 ['.hero-wrap','welcome'], ['#for-you','study'], ['#features','cards'],
 ['#benefits','confidence'], ['#cta','download'], ['#faq','question']
];
const reports=[];
const scrollToSection=(page,selector)=>page.evaluate(selector=>{
 const el=document.querySelector(selector);scrollTo(0,Math.max(0,el.getBoundingClientRect().top+scrollY-innerHeight*.22));
},selector);
const firstBatch=(page,key,kind)=>page.evaluate(({key,kind})=>{
 const matches=window.mascotMotions.filter(m=>m.key===key&&m.kind===kind);
 return matches.filter(m=>m.time<matches[0].time+100);
},{key,kind});
// Observe natural-speed browser frames without changing the rendered page or animation clock.
const recordMotions=()=>{
 window.mascotMotions=[];window.mascotFrames=[];
 window.headerGeometry=()=>{
  const brand=document.querySelector('.site-header .brand');
  const pill=brand.getBoundingClientRect(),mark=brand.querySelector('.brand-mark'),word=brand.querySelector('.brand-name').getBoundingClientRect();
  const box=mark.getBoundingClientRect(),header=brand.closest('.site-header').getBoundingClientRect();
  // The rim is clipped to the cloud. Measure its fill and the original stroked paths,
  // allowing the intentional SVG overflow while keeping every painted part in the pill.
  const painted=[...mark.querySelectorAll('.rig-face path,.rig-hands path,.rig-body > use')].map(el=>{
   const r=el.getBoundingClientRect(),m=el.getScreenCTM(),style=getComputedStyle(el);
   const stroke=style.stroke==='none'?0:parseFloat(style.strokeWidth)/2;
   const x=stroke*Math.hypot(m.a,m.c),y=stroke*Math.hypot(m.b,m.d);
   return {left:r.left-x,right:r.right+x,top:r.top-y,bottom:r.bottom+y};
  });
  const pillClearance=Math.min(...painted.flatMap(r=>[r.left-pill.left,pill.right-r.right,r.top-pill.top,pill.bottom-r.bottom]));
  const wordmarkClearance=Math.min(...painted.map(r=>word.left-r.right));
  return {
   artworkInsidePill:pillClearance>=-1,
   artworkBeforeWordmark:wordmarkClearance>=-1,
   visibleOverflow:getComputedStyle(mark).overflow==='visible'&&getComputedStyle(mark.querySelector('svg')).overflow==='visible',
   noPageOverflow:document.documentElement.scrollWidth<=innerWidth,
   markWidth:box.width,markHeight:box.height,pillHeight:pill.height,headerHeight:header.height,
   wrapperMotion:mark.getAnimations().length,
   wordmarkMotion:brand.querySelector('.brand-name').getAnimations({subtree:true}).length,
   cueCount:document.querySelectorAll('.ranca-cue,#preview-label').length,
   pillClearance,wordmarkClearance
  };
 };
 let frame=null,batch=null;
 const sample=()=>{
  frame=null;
  const mark=document.querySelector('.site-header .brand-mark');
  if(!mark||!batch)return;
  window.mascotFrames.push({...batch,time:performance.now(),...window.headerGeometry()});
  if(mark.getAnimations({subtree:true}).length)frame=requestAnimationFrame(sample);
 };
 const animate=Element.prototype.animate;
 Element.prototype.animate=function(frames,options){
  const animation=animate.call(this,frames,options),mark=this.closest('.site-header .brand-mark');
  if(mark){
   const motion={key:mark.dataset.rancaBehavior,kind:mark.dataset.rancaMotion,target:this.getAttribute('class'),frames,duration:typeof options==='number'?options:options.duration,time:performance.now()};
   window.mascotMotions.push(motion);
   if(!batch||motion.key!==batch.key||motion.kind!==batch.kind||motion.time-batch.started>100)batch={key:motion.key,kind:motion.kind,started:motion.time};
   if(frame===null)frame=requestAnimationFrame(sample);
   animation.finished.then(()=>{motion.finished=performance.now();},()=>{motion.cancelled=performance.now();});
  }
  return animation;
 };
};
const expectedGeometry=width=>({
 artworkInsidePill:true,artworkBeforeWordmark:true,visibleOverflow:true,noPageOverflow:true,
 markWidth:width<900?44:48,markHeight:width<900?32:35,pillHeight:48,headerHeight:48,
 wrapperMotion:0,wordmarkMotion:0,cueCount:0
});
const assertGeometryState=(state,width,label)=>{
 const {pillClearance,wordmarkClearance,...fixed}=state;
 assert.deepEqual(fixed,expectedGeometry(width),`${label}: pill clearance ${pillClearance.toFixed(3)}px; wordmark clearance ${wordmarkClearance.toFixed(3)}px`);
};
const assertGeometry=async(page,width,label)=>{
 const state=await page.evaluate(()=>window.headerGeometry());
 assertGeometryState(state,width,label);
 return state;
};
const assertFrameBoundaries=async(page,width,key,kind,motions)=>{
 const samples=await page.evaluate(({key,kind,start})=>window.mascotFrames.filter(frame=>frame.key===key&&frame.kind===kind&&Math.abs(frame.started-start)<100),{key,kind,start:motions[0].time});
 assert.ok(samples.length>=8,`${key} ${kind}: real animation frames were sampled`);
 assert.ok(samples.at(-1).time-samples[0].time>=motions[0].duration*.7,`${key} ${kind}: samples cover the whole gesture`);
 for(const {key:sampleKey,kind:sampleKind,started,time,...state} of samples)assertGeometryState(state,width,`${key} ${kind} at ${Math.round(time-started)}ms`);
 return {frames:samples.length,firstMs:Math.round(samples[0].time-motions[0].time),lastMs:Math.round(samples.at(-1).time-motions[0].time),minPillClearance:Math.min(...samples.map(s=>s.pillClearance)),minWordmarkClearance:Math.min(...samples.map(s=>s.wordmarkClearance))};
};
try{
 browser=await chromium.launch({args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 for(const lang of ['id','en'])for(const width of [1440,390]){
  // This is the actual integrated page, with no inserted labels, controls or cues.
  const viewport={width,height:width<900?900:800};
  const page=await browser.newPage({viewport,reducedMotion:'no-preference',...(lang==='id'?{recordVideo:{dir:path.join(root,'review-evidence'),size:viewport}}:{})});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',r=>r.abort());
  await page.addInitScript(recordMotions);
  await page.goto(`${origin}/${lang}/`);await page.evaluate(()=>document.fonts.ready);
  if(await page.locator('[data-consent-reject]').isVisible())await page.locator('[data-consent-reject]').click();
  await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';});
  const sourcePaths=await page.locator('.brand-mark path').evaluateAll(els=>els.map(el=>el.getAttribute('d')));
  const signatures={entry:new Set(),idle:new Set()};
  for(const [selector,key] of mapping){
   console.log(`Checking articulated context ${lang}/${key} at ${width}px`);
   await scrollToSection(page,selector);
   await page.waitForFunction(key=>document.querySelector('.brand-mark').dataset.rancaBehavior===key,key);
   await page.waitForFunction(key=>window.mascotMotions.some(m=>m.key===key&&m.kind==='entry'),key,{timeout:10000});
   const entry=await firstBatch(page,key,'entry');
   assert.ok(entry.length>=3,`${key}: multiple independently animated parts`);
   assert.ok(entry.every(m=>m.duration===1900&&m.target.startsWith('rig-')),`${key}: 1900ms SVG-part entry, never the wrapper`);
   assert.ok(entry.some(m=>m.target==='rig-body'),`${key}: the body changes position too`);
   assert.ok(entry.some(m=>m.target==='rig-eye-left')&&entry.some(m=>m.target==='rig-eye-right'),`${key}: both eyes independently addressable`);
   if(key!=='question')assert.ok(entry.some(m=>m.target.startsWith('rig-hand-')),`${key}: articulated hand`);
   if(key==='cards')assert.notDeepEqual(entry.find(m=>m.target==='rig-hand-left').frames,entry.find(m=>m.target==='rig-hand-right').frames,'cards hands move independently');
   if(key==='question')assert.notDeepEqual(entry.find(m=>m.target==='rig-eye-left').frames,entry.find(m=>m.target==='rig-eye-right').frames,'question eyes have different expressions');
   // Allow the existing 200ms nav-slot reveal to settle before measuring links.
   await page.waitForTimeout(250);
   const wordmarkBox=await page.locator('.brand-name').boundingBox(),pillBox=await page.locator('.site-header .brand').boundingBox();
   const linkBoxes=await page.locator('.site-header a:visible').evaluateAll(els=>els.map(el=>({href:el.href,box:el.getBoundingClientRect().toJSON()})));
   for(const fraction of [.25,.5,.75,.95]){
    const remaining=await page.evaluate(({start,offset})=>start+offset-performance.now(),{start:entry[0].time,offset:1900*fraction});
    if(remaining>0)await page.waitForTimeout(remaining);
    await assertGeometry(page,width,`${lang}/${key}/${width} entry ${fraction}`);
    assert.deepEqual(await page.locator('.brand-name').boundingBox(),wordmarkBox,'articulation cannot move the wordmark');
    assert.deepEqual(await page.locator('.site-header .brand').boundingBox(),pillBox,'articulation cannot resize the pill');
    assert.deepEqual(await page.locator('.site-header a:visible').evaluateAll(els=>els.map(el=>({href:el.href,box:el.getBoundingClientRect().toJSON()}))),linkBoxes,'articulation cannot shift link hit targets');
    if(fraction===.5){
     await page.locator('.site-header').screenshot({path:path.join(root,'review-evidence',`header-context-${lang}-${key}-${width}.png`)});
     if(width===1440)await page.locator('.site-header').screenshot({path:path.join(root,'review-evidence',`header-context-${lang}-${key}.png`)});
     if(lang==='id'){
      await page.screenshot({path:path.join(root,'review-evidence',`header-ranca-context-${key}-${width}-page.png`)});
      if(key==='welcome')await page.screenshot({path:path.join(root,'review-evidence',`header-ranca-${width<900?'mobile':'desktop'}-page.png`)});
     }
    }
   }
   await page.waitForFunction(()=>document.querySelector('.brand-mark').getAnimations({subtree:true}).length===0);
   await page.waitForFunction(key=>window.mascotMotions.some(m=>m.key===key&&m.kind==='idle'),key,{timeout:12000});
   const idle=await firstBatch(page,key,'idle');
   assert.ok(idle.some(m=>m.target==='rig-body'),`${key}: idle has a modest body response`);
   assert.ok(idle.every(m=>m.duration===1400&&m.target.startsWith('rig-')),`${key}: 1400ms articulated idle`);
   const finishedEntry=await firstBatch(page,key,'entry');
   assert.ok(finishedEntry.every(m=>m.finished&&!m.cancelled),`${key}: entry fully finishes`);
   const quiet=idle[0].time-Math.max(...finishedEntry.map(m=>m.finished));
   assert.ok(quiet>=2700&&quiet<4500,`${key}: 2.8 quiet seconds before idle (${quiet}ms)`);
   await page.waitForTimeout(650);await assertGeometry(page,width,`${lang}/${key}/${width} idle`);
   await page.locator('.site-header').screenshot({path:path.join(root,'review-evidence',`header-context-${lang}-${key}-${width}-idle.png`)});
   await page.waitForFunction(()=>document.querySelector('.brand-mark').getAnimations({subtree:true}).length===0);
   assert.deepEqual(await page.locator('.site-header .brand').boundingBox(),pillBox,'completed idle keeps layout fixed');
   assert.deepEqual(await page.locator('.brand-name').boundingBox(),wordmarkBox,'completed idle keeps wordmark fixed');
   assert.ok(await page.locator('.brand-mark .ranca-rig, .brand-mark .ranca-rig g').evaluateAll(els=>els.every(el=>getComputedStyle(el).transform==='none')),'completed gestures return to neutral');
   for(const [kind,batch] of [['entry',entry],['idle',idle]])signatures[kind].add(JSON.stringify(batch.map(({target,frames})=>({target,frames})).sort((a,b)=>a.target.localeCompare(b.target))));
   const finishedIdle=await firstBatch(page,key,'idle');
   assert.ok(finishedIdle.every(m=>m.finished&&!m.cancelled),`${key}: idle fully finishes`);
   const boundaries={entry:await assertFrameBoundaries(page,width,key,'entry',entry),idle:await assertFrameBoundaries(page,width,key,'idle',idle)};
   reports.push({lang,width,markWidth:width<900?44:48,key,entryParts:entry.map(m=>m.target),idleParts:idle.map(m=>m.target),entryDuration:1900,idleDuration:1400,quietMs:Math.round(quiet),boundaries});
  }
  assert.equal(signatures.entry.size,6,'six distinct articulated entry gestures');
  assert.equal(signatures.idle.size,6,'six distinct articulated idle gestures');
  assert.deepEqual(await page.locator('.brand-mark path').evaluateAll(els=>els.map(el=>el.getAttribute('d'))),sourcePaths,'articulation preserves all approved source paths');
  const before=await page.evaluate(()=>window.mascotMotions.filter(m=>m.key==='study'&&m.kind==='entry').length);
  await scrollToSection(page,'#for-you');
  await page.waitForFunction(before=>window.mascotMotions.filter(m=>m.key==='study'&&m.kind==='entry').length>before,before);
  // Stop this clip after the re-entry completes, before synthetic accessibility checks.
  await page.waitForFunction(()=>document.querySelector('.brand-mark').getAnimations({subtree:true}).length===0);
  assert.deepEqual(errors,[]);
  const video=page.video();await page.close();if(video)await video.saveAs(path.join(root,'review-evidence',width<900?'header-ranca-sections-mobile.webm':'header-ranca-sections.webm'));
 }
 // Every supporting section retains its explicit semantic map in both languages.
 for(const lang of ['id','en']){
  const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'});
  await page.route('https://**/*',r=>r.abort());
  for(const file of ['about','help','premium','articles','college-schedule','todo-guide','flashcard-guide','privacy','terms','delete-account']){
   await page.goto(`${origin}/${lang}/${file}.html`);
   assert.equal(await page.locator('.brand-mark > svg.ranca-rig').count(),1,`${file}: integrated SVG`);
   const sections=await page.locator('main [data-ranca-behavior]').evaluateAll(els=>els.map(el=>({key:el.dataset.rancaBehavior,title:(el.querySelector('h1,h2,h3')?.textContent||el.textContent).trim().slice(0,100)})));
   assert.equal(sections.length,({about:3,help:5,premium:6,articles:4,'college-schedule':8,'todo-guide':8,'flashcard-guide':8,privacy:10,terms:8,'delete-account':4})[file],file+' complete semantic map');
   assert.ok(sections.every(s=>s.key),file+' no missing section profile');
   for(const section of await page.locator('main [data-ranca-behavior]').all()){
    await section.evaluate(el=>scrollTo(0,Math.max(0,el.getBoundingClientRect().top+scrollY-innerHeight*.22)));
    await page.waitForTimeout(60);
    assert.equal(await page.locator('.brand-mark').evaluate(el=>el.getAnimations({subtree:true}).length),0,'reduced motion includes every descendant');
   }
  }
  await page.close();
 }
 await fs.writeFile(path.join(root,'review-evidence','header-ranca-context-report.json'),JSON.stringify(reports,null,2));
 console.log('PASS — six stronger articulated entry/idle profiles in ID/EN at 390/1440px, independent body/eyes/hands, repeat entry, 2.8-second quiet periods, real-frame 44/48px boundary checks, clean desktop/mobile videos, reduced motion and semantic coverage');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
