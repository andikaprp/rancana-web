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
const firstBatch=(page,key,kind,after=-1)=>page.evaluate(({key,kind,after})=>{
 const matches=window.mascotMotions.filter(m=>m.key===key&&m.kind===kind&&m.time>after);
 return matches.filter(m=>m.time<matches[0].time+100);
},{key,kind,after});
// Observe natural-speed browser frames without changing the rendered page or animation clock.
const recordMotions=()=>{
 window.mascotMotions=[];window.mascotFrames=[];window.mascotNeutral=null;
 window.faceGeometry=()=>{
  const mark=document.querySelector('.site-header .brand-mark');
  return Object.fromEntries(['eye-left','eye-right','smile'].map(name=>{
   const group=mark.querySelector(`.rig-${name}`),feature=group.querySelector('path');
   const style=getComputedStyle(feature),box=feature.getBBox(),screen=feature.getBoundingClientRect(),matrix=feature.getScreenCTM();
   const transform=new DOMMatrixReadOnly(getComputedStyle(group).transform);
   const coordinates=(style.d||feature.getAttribute('d')).match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)?.map(Number)||[];
   // All three approved paths are a move plus cubic. Measure its bend relative
   // to its endpoint chord, so a tilted closed eyelid is still recognized.
   const curveBend=values=>{
    const [x0,y0,x1,y1,x2,y2,x3,y3]=values,dx=x3-x0,dy=y3-y0,chord=Math.hypot(dx,dy);
    // At t=.5 the cubic's normal displacement is 3/4 of the average
    // control-point displacement. Apply the full CTM for real CSS pixels.
    return chord ? .75*Math.abs((dx*(y1-y0)-dy*(x1-x0)+dx*(y2-y0)-dy*(x2-x0))/(2*chord)):0;
   };
   const bend=curveBend(coordinates),screenCoordinates=[];
   for(let i=0;i<coordinates.length;i+=2){const point=new DOMPoint(coordinates[i],coordinates[i+1]).matrixTransform(matrix);screenCoordinates.push(point.x,point.y);} 
   return [name,{
    d:style.d,attribute:feature.getAttribute('d'),inlineD:feature.style.d,
    transform:style.transform,groupTransform:getComputedStyle(group).transform,
    x:box.x,y:box.y,width:box.width,height:box.height,
    screenWidth:screen.width,screenHeight:screen.height,
    bend,bendPixels:curveBend(screenCoordinates),
    gazeX:transform.e,gazeY:transform.f
   }];
  }));
 };
 // Measure hand articulation relative to the body, so the preserved body nod
 // and tilt cannot be mistaken for an independently moving or raised hand.
 window.handGeometry=()=>Object.fromEntries(['left','right'].map(side=>{
  const hand=document.querySelector(`.site-header .rig-hand-${side}`),transform=getComputedStyle(hand).transform;
  const matrix=new DOMMatrixReadOnly(transform);
  return [side,{transform,x:matrix.e,y:matrix.f,angle:Math.atan2(matrix.b,matrix.a)*180/Math.PI}];
 }));
 window.headerGeometry=()=>{
  const brand=document.querySelector('.site-header .brand');
  const pill=brand.getBoundingClientRect(),mark=brand.querySelector('.brand-mark'),wordmark=brand.querySelector('.brand-name'),word=wordmark.getBoundingClientRect();
  const wordmarkVisible=wordmark.getClientRects().length>0&&word.width>0;
  const box=mark.getBoundingClientRect(),header=brand.closest('.site-header').getBoundingClientRect();
  // The trusted texture has transparent margins. The independently verified
  // alpha bounds count as paint; the empty 741x532 image canvas does not.
  const texture=mark.querySelector('.rig-body-texture'),matrix=texture.getScreenCTM();
  const corners=[[103,16],[725,16],[725,516],[103,516]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(matrix));
  const painted=[{left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),top:Math.min(...corners.map(p=>p.y)),bottom:Math.max(...corners.map(p=>p.y))},...[...mark.querySelectorAll('.rig-face path,.rig-hands path')].map(el=>{
   const r=el.getBoundingClientRect(),m=el.getScreenCTM(),style=getComputedStyle(el);
   const stroke=style.stroke==='none'?0:parseFloat(style.strokeWidth)/2;
   const x=stroke*Math.hypot(m.a,m.c),y=stroke*Math.hypot(m.b,m.d);
   return {left:r.left-x,right:r.right+x,top:r.top-y,bottom:r.bottom+y};
  })];
  const pillClearance=Math.min(...painted.flatMap(r=>[r.left-pill.left,pill.right-r.right,r.top-pill.top,pill.bottom-r.bottom]));
  // The compact, non-sticky 320px header intentionally hides its wordmark.
  const wordmarkClearance=Math.min(...painted.map(r=>(wordmarkVisible?word.left:pill.right)-r.right));
  return {
   artworkInsidePill:pillClearance>=-1,
   artworkBeforeWordmark:wordmarkClearance>=-1,
   visibleOverflow:getComputedStyle(mark).overflow==='visible'&&getComputedStyle(mark.querySelector('svg')).overflow==='visible',
   noPageOverflow:document.documentElement.scrollWidth<=innerWidth,
   markWidth:box.width,markHeight:box.height,pillHeight:pill.height,headerHeight:header.height,
   wrapperMotion:mark.getAnimations().length,
   wordmarkMotion:brand.querySelector('.brand-name').getAnimations({subtree:true}).length,
   cueCount:document.querySelectorAll('.ranca-cue,#preview-label').length,
   pillClearance,wordmarkClearance,wordmarkBoundary:wordmarkVisible?'wordmark':'pill'
  };
 };
 let frame=null,batch=null;
 const sample=()=>{
  frame=null;
  const mark=document.querySelector('.site-header .brand-mark');
  if(!mark||!batch)return;
  window.mascotFrames.push({...batch,time:performance.now(),geometry:window.headerGeometry(),face:window.faceGeometry(),hands:window.handGeometry()});
  if(mark.getAnimations({subtree:true}).length)frame=requestAnimationFrame(sample);
 };
 const animate=Element.prototype.animate;
 Element.prototype.animate=function(frames,options){
  const mark=this.closest('.site-header .brand-mark');
  if(mark&&!window.mascotNeutral)window.mascotNeutral=window.faceGeometry();
  const animation=animate.call(this,frames,options);
  if(mark){
   const target=this.tagName.toLowerCase()==='path'?`${this.parentElement.getAttribute('class')} path`:this.getAttribute('class');
   const motion={key:mark.dataset.rancaBehavior,kind:mark.dataset.rancaMotion,target,frames,duration:typeof options==='number'?options:options.duration,time:performance.now()};
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
 const {pillClearance,wordmarkClearance,wordmarkBoundary,...fixed}=state;
 assert.ok(wordmarkBoundary==='wordmark'||(width===320&&wordmarkBoundary==='pill'),`${label}: a hidden compact wordmark uses the pill boundary; visible lettering keeps its own clearance`);
 assert.deepEqual(fixed,expectedGeometry(width),`${label}: pill clearance ${pillClearance.toFixed(3)}px; wordmark clearance ${wordmarkClearance.toFixed(3)}px (${wordmarkBoundary} boundary)`);
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
 for(const {started,time,geometry} of samples)assertGeometryState(geometry,width,`${key} ${kind} at ${Math.round(time-started)}ms`);
 return {frames:samples.length,firstMs:Math.round(samples[0].time-motions[0].time),lastMs:Math.round(samples.at(-1).time-motions[0].time),minPillClearance:Math.min(...samples.map(s=>s.geometry.pillClearance)),minWordmarkClearance:Math.min(...samples.map(s=>s.geometry.wordmarkClearance)),wordmarkVisibleFrames:samples.filter(s=>s.geometry.wordmarkBoundary==='wordmark').length,hiddenWordmarkFrames:samples.filter(s=>s.geometry.wordmarkBoundary==='pill').length};
};
const assertNeutral=async(page,label)=>{
 const state=await page.evaluate(()=>({neutral:window.mascotNeutral,actual:window.faceGeometry(),transforms:[...document.querySelectorAll('.brand-mark .ranca-rig,.brand-mark .ranca-rig g,.brand-mark .rig-face path')].map(el=>getComputedStyle(el).transform)}));
 for(const feature of ['eye-left','eye-right','smile'])for(const field of ['d','attribute','inlineD','transform','groupTransform','x','y','width','height','bend'])assert.equal(state.actual[feature][field],state.neutral[feature][field],`${label}: ${feature} ${field} returns exactly to approved neutral`);
 assert.ok(state.transforms.every(transform=>transform==='none'),`${label}: every body/feature transform is removed`);
};
const batchFrames=(page,key,kind,motions)=>page.evaluate(({key,kind,start})=>window.mascotFrames.filter(frame=>frame.key===key&&frame.kind===kind&&Math.abs(frame.started-start)<100),{key,kind,start:motions[0].time});
const assertRestingHands=async(page,key,kind,motions)=>{
 if(!['download','question'].includes(key))return;
 const hands=motions.filter(m=>m.target.startsWith('rig-hand-'));
 const samples=await batchFrames(page,key,kind,motions);
 assert.ok(samples.length>=8,`${key} ${kind}: resting-hand checks observe actual browser frames`);
 if(key==='question'||kind==='idle'){
  assert.deepEqual(hands,[],`${key} ${kind}: neither resting hand is an animation actor`);
  for(const side of ['left','right'])assert.ok(samples.every(s=>s.hands[side].transform==='none'),`${key} ${kind}: ${side} hand stays at its exact resting pose while the body and face animate`);
  return {restingHands:['left','right'],sampledFrames:samples.length};
 }
 assert.deepEqual(hands.map(m=>m.target),['rig-hand-right'],'Download entry animates only one guiding hand');
 const frames=hands[0].frames.map(frame=>frame.transform);
 assert.deepEqual(frames,[
  'translate(0px,0px) rotate(0deg) scale(1)',
  'translate(8px,12px) rotate(-6deg)',
  'translate(8px,12px) rotate(-6deg)',
  'translate(0px,0px) rotate(0deg) scale(1)'
 ],'Download entry moves outward/down once, holds, and returns without pumping');
 assert.ok(samples.every(s=>s.hands.left.transform==='none'),'Download entry leaves the other hand resting');
 const observed=samples.map(s=>s.hands.right);
 assert.ok(observed.every(h=>h.x>=-.01&&h.x<=8.01&&h.y>=-.01&&h.y<=12.01&&h.angle>=-6.01&&h.angle<=.01),'the rendered guiding hand stays outward and lowered, away from the cheek');
 const held=observed.filter(h=>Math.abs(h.x-8)<.01&&Math.abs(h.y-12)<.01&&Math.abs(h.angle+6)<.01);
 assert.ok(held.length>=3,'the single guiding pose is visibly held on multiple browser frames');
 for(const axis of ['x','y']){
  const values=observed.map(h=>h[axis]),peak=values.indexOf(Math.max(...values));
  assert.ok(values.slice(1,peak+1).every((value,index)=>value>=values[index]-.05),`the rendered ${axis} motion never reverses before its held pose`);
  assert.ok(values.slice(peak+1).every((value,index)=>value<=values[peak+index]+.05),`the rendered ${axis} motion returns only once, without repeated strokes`);
 }
 return {restingHands:['left'],guidingHand:'right',heldFrames:held.length,sampledFrames:samples.length};
};
const assertFacialMotion=async(page,key,kind,motions)=>{
 const samples=await batchFrames(page,key,kind,motions),neutral=await page.evaluate(()=>window.mascotNeutral);
 const details={};
 for(const feature of ['eye-left','eye-right','smile']){
  const motion=motions.find(m=>m.target===`rig-${feature} path`);
  if(!motion&&feature==='smile'&&kind==='idle'&&['cards','download'].includes(key)){
   assert.ok(samples.every(s=>s.face[feature].d===neutral[feature].d),`${key} idle: the intentionally quiet smile retains its approved curve`);
   details[feature]={intentionallyNeutral:true};continue;
  }
  assert.ok(motion,`${key} ${kind}: ${feature} has a genuine path-shape animation`);
  assert.ok(motion.frames.every(frame=>typeof frame.d==='string'),`${key} ${kind}: ${feature} animates CSS d rather than an unchanged curve`);
  assert.equal(motion.frames[0].d,motion.frames.at(-1).d,`${key} ${kind}: ${feature} path ends at its exact starting shape`);
  const observed=samples.map(s=>s.face[feature]);
  assert.ok(observed.every(s=>s.attribute===neutral[feature].attribute&&s.inlineD===neutral[feature].inlineD),`${key} ${kind}: ${feature} source and inline d remain unchanged throughout`);
  const changed=observed.filter(s=>s.d!==neutral[feature].d);
  assert.ok(changed.length>=3,`${key} ${kind}: ${feature} computed d visibly changes on real browser frames`);
  const bends=observed.map(s=>s.bendPixels),span=Math.max(...bends)-Math.min(...bends);
  const minimum=feature==='smile'?.08:.5;
  assert.ok(span>minimum,`${key} ${kind}: ${feature} curve changes visibly at real header size (${span.toFixed(3)}px, minimum ${minimum}px)`);
  details[feature]={computedShapes:new Set(observed.map(s=>s.d)).size,bendChangePixels:span,minBend:Math.min(...observed.map(s=>s.bend)),maxBend:Math.max(...observed.map(s=>s.bend)),minScreenHeight:Math.min(...observed.map(s=>s.screenHeight)),maxScreenHeight:Math.max(...observed.map(s=>s.screenHeight))};
 }
 for(const feature of ['eye-left','eye-right']){
  const shut=samples.filter(s=>s.face[feature].bend<neutral[feature].bend*.12);
  assert.ok(shut.length>=2,`${key} ${kind}: the actual eyelid curve closes on multiple rendered frames`);
  const before=samples.filter(s=>s.time<shut[0].time&&s.face[feature].bend>neutral[feature].bend*.65).at(-1);
  const after=samples.find(s=>s.time>shut.at(-1).time&&s.face[feature].bend>neutral[feature].bend*.65);
  assert.ok(before&&after,`${key} ${kind}: the eyelid is open before closing and reopens afterwards`);
  const closedMs=shut.at(-1).time-shut[0].time;
  assert.ok(closedMs<(key==='confidence'?900:400),`${key} ${kind}: eyelid closure has bounded natural timing (${Math.round(closedMs)}ms)`);
  if(key==='welcome'){
   assert.ok(after.time-before.time<500,`${kind}: hero blink closes and reopens quickly (${Math.round(after.time-before.time)}ms)`);
   assert.ok(before.time-motions[0].time<500,`${kind}: hero blink begins early enough to see`);
  }
  details[feature].blink={closedFrames:shut.length,closedMs:Math.round(closedMs),openToOpenMs:Math.round(after.time-before.time),firstClosedMs:Math.round(shut[0].time-motions[0].time),reopenedMs:Math.round(after.time-motions[0].time)};
 }
 if(key==='study')for(const feature of ['eye-left','eye-right']){
  const gaze=samples.map(s=>s.face[feature]);
  assert.ok(Math.min(...gaze.map(s=>s.gazeX)) < -5&&Math.max(...gaze.map(s=>s.gazeX)) > 5,`${kind}: reading eyes genuinely scan left and right`);
  assert.ok(Math.max(...gaze.map(s=>s.gazeY)) > 3,`${kind}: reading eyes look down at the work`);
  details[feature].gazeRange={left:Math.min(...gaze.map(s=>s.gazeX)),right:Math.max(...gaze.map(s=>s.gazeX)),down:Math.max(...gaze.map(s=>s.gazeY))};
 }
 if(key==='question'){
  const asymmetric=samples.filter(s=>Math.abs(s.face['eye-left'].bend/neutral['eye-left'].bend-s.face['eye-right'].bend/neutral['eye-right'].bend)>.3);
  assert.ok(asymmetric.length>=3,`${kind}: thinking has asymmetrically shaped eyes on real browser frames`);
  details.asymmetricFrames=asymmetric.length;
 }
 return details;
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
   // Sticky positioning and the nav-slot reveal may change the pill's position.
   // Compare fixed layout only after that existing transition has settled.
   await page.waitForTimeout(350);
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
   await page.waitForFunction(()=>document.querySelector('.ranca-rig').getAnimations({subtree:true}).length===0);
   await assertNeutral(page,`${lang}/${key}/${width} completed entry`);
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
   await page.waitForFunction(()=>document.querySelector('.ranca-rig').getAnimations({subtree:true}).length===0);
   assert.deepEqual(await page.locator('.site-header .brand').boundingBox(),pillBox,'completed idle keeps layout fixed');
   assert.deepEqual(await page.locator('.brand-name').boundingBox(),wordmarkBox,'completed idle keeps wordmark fixed');
   await assertNeutral(page,`${lang}/${key}/${width} completed idle`);
   for(const [kind,batch] of [['entry',entry],['idle',idle]])signatures[kind].add(JSON.stringify(batch.map(({target,frames})=>({target,frames})).sort((a,b)=>a.target.localeCompare(b.target))));
   const finishedIdle=await firstBatch(page,key,'idle');
   assert.ok(finishedIdle.every(m=>m.finished&&!m.cancelled),`${key}: idle fully finishes`);
   const boundaries={entry:await assertFrameBoundaries(page,width,key,'entry',entry),idle:await assertFrameBoundaries(page,width,key,'idle',idle)};
   const facial={entry:await assertFacialMotion(page,key,'entry',entry),idle:await assertFacialMotion(page,key,'idle',idle)};
   const hands={entry:await assertRestingHands(page,key,'entry',entry),idle:await assertRestingHands(page,key,'idle',idle)};
   reports.push({lang,width,markWidth:width<900?44:48,key,entryParts:entry.map(m=>m.target),idleParts:idle.map(m=>m.target),entryDuration:1900,idleDuration:1400,quietMs:Math.round(quiet),boundaries,facial,hands});
  }
  assert.equal(signatures.entry.size,6,'six distinct articulated entry gestures');
  assert.equal(signatures.idle.size,6,'six distinct articulated idle gestures');
  assert.deepEqual(await page.locator('.brand-mark path').evaluateAll(els=>els.map(el=>el.getAttribute('d'))),sourcePaths,'articulation preserves all approved source paths');
  const repeatAfter=await page.evaluate(()=>performance.now());
  await scrollToSection(page,'#for-you');
  await page.waitForFunction(after=>window.mascotMotions.some(m=>m.key==='study'&&m.kind==='entry'&&m.time>after),repeatAfter);
  const repeatedEntry=await firstBatch(page,'study','entry',repeatAfter);
  await page.waitForFunction(()=>document.querySelector('.ranca-rig').getAnimations({subtree:true}).length===0);
  await assertNeutral(page,`${lang}/${width} repeated entry`);
  await page.waitForFunction(after=>window.mascotMotions.some(m=>m.key==='study'&&m.kind==='idle'&&m.time>after),repeatAfter,{timeout:10000});
  const repeatedIdle=await firstBatch(page,'study','idle',repeatAfter);
  await page.waitForFunction(()=>document.querySelector('.ranca-rig').getAnimations({subtree:true}).length===0);
  await assertNeutral(page,`${lang}/${width} repeated idle`);
  for(const [kind,motions] of [['entry',repeatedEntry],['idle',repeatedIdle]]){
   await assertFrameBoundaries(page,width,'study',kind,motions);
   await assertFacialMotion(page,'study',kind,motions);
  }
  // One continuing idle cycle confirms the blink/expression does not disappear
  // after its first replay. Keep this natural behavior in the mobile clip.
  if(lang==='id'&&width===390){
   const after=repeatedIdle.at(-1).time;
   await page.waitForFunction(after=>window.mascotMotions.some(m=>m.key==='study'&&m.kind==='idle'&&m.time>after+100),after,{timeout:10000});
   const nextIdle=await firstBatch(page,'study','idle',after+100);
   await page.waitForFunction(()=>document.querySelector('.ranca-rig').getAnimations({subtree:true}).length===0);
   await assertFacialMotion(page,'study','idle',nextIdle);
   await assertNeutral(page,'continuing idle returns exactly to neutral');
  }
  // Stop the clean actual-page clip before synthetic accessibility checks.
  assert.deepEqual(errors,[]);
  const video=page.video();await page.close();if(video)await video.saveAs(path.join(root,'review-evidence',width<900?'header-ranca-sections-mobile.webm':'header-ranca-sections.webm'));
 }
 // Separate closeup-only artifacts: the integrated 44px mark at six device
 // pixels per CSS pixel. The actual website UI, paths and animation clock are
 // unchanged; these crops are deliberately separate from the clean page clips.
 {
  const page=await browser.newPage({viewport:{width:390,height:900},deviceScaleFactor:6,reducedMotion:'reduce'});
  await page.route('https://**/*',r=>r.abort());await page.addInitScript(recordMotions);
  await page.goto(`${origin}/id/`);await page.evaluate(()=>document.fonts.ready);
  if(await page.locator('[data-consent-reject]').isVisible())await page.locator('[data-consent-reject]').click();
  const mark=await page.locator('.site-header .brand-mark').boundingBox();
  const clip={x:Math.floor(mark.x-4),y:Math.floor(mark.y-4),width:Math.ceil(mark.width+8),height:Math.ceil(mark.height+8)};
  await page.screenshot({clip,path:path.join(root,'review-evidence','header-ranca-svg-closeup-only-neutral-6x.png')});
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.waitForFunction(()=>window.mascotMotions.some(m=>m.key==='welcome'&&m.kind==='entry'));
  await page.waitForFunction(()=>window.faceGeometry()['eye-left'].bend<window.mascotNeutral['eye-left'].bend*.1,null,{polling:'raf'});
  const closed=await page.evaluate(()=>({time:performance.now(),face:window.faceGeometry()}));
  await page.screenshot({clip,path:path.join(root,'review-evidence','header-ranca-svg-closeup-only-blink-6x.png')});
  const afterCapture=await page.evaluate(()=>({time:performance.now(),face:window.faceGeometry()}));
  await page.waitForFunction(()=>window.faceGeometry()['eye-left'].bend>window.mascotNeutral['eye-left'].bend*.9,null,{polling:'raf'});
  await page.screenshot({clip,path:path.join(root,'review-evidence','header-ranca-svg-closeup-only-reopened-6x.png')});
  await page.waitForFunction(()=>document.querySelector('.ranca-rig').getAnimations({subtree:true}).length===0);
  await assertNeutral(page,'six-times detail capture completed entry');
  reports.push({artifact:'closeup-only',description:'Six-device-pixel crop of the actual integrated 44px SVG, separate from website screenshots; no labels, overlays, scaling or animation-clock changes to the page.',width:390,markWidth:44,deviceScaleFactor:6,closedFace:closed.face,afterBlinkCaptureFace:afterCapture.face,captureMs:afterCapture.time-closed.time});
  await page.close();
 }
 // The narrowest supported viewport gets natural-speed, actual-size geometry
 // spots for all six entries, independent of the desktop/mobile video captures.
 {
  const page=await browser.newPage({viewport:{width:320,height:900},reducedMotion:'no-preference'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',r=>r.abort());await page.addInitScript(recordMotions);
  await page.goto(`${origin}/id/`);await page.evaluate(()=>document.fonts.ready);
  if(await page.locator('[data-consent-reject]').isVisible())await page.locator('[data-consent-reject]').click();
  await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';});
  for(const [selector,key] of mapping){
   await scrollToSection(page,selector);
   await page.waitForFunction(key=>window.mascotMotions.some(m=>m.key===key&&m.kind==='entry'),key,{timeout:10000});
   const entry=await firstBatch(page,key,'entry');
   await page.waitForTimeout(400);
   await assertGeometry(page,320,`320px ${key} actual-size spot`);
   if(key==='study')await page.screenshot({path:path.join(root,'review-evidence','header-ranca-320-page.png')});
   await page.waitForFunction(()=>document.querySelector('.ranca-rig').getAnimations({subtree:true}).length===0);
   await assertNeutral(page,`320px ${key} completed entry`);
   const boundaries=await assertFrameBoundaries(page,320,key,'entry',entry),facial=await assertFacialMotion(page,key,'entry',entry);
   const hands=await assertRestingHands(page,key,'entry',entry);
   reports.push({lang:'id',width:320,markWidth:44,key,spot:true,boundaries,facial,hands});
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 // A browser without CSS d interpolation still gets the supported transform
 // fallback, and cancelling it also restores the unmodified approved curves.
 {
  const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'no-preference'});
  await page.route('https://**/*',r=>r.abort());await page.addInitScript(recordMotions);
  await page.addInitScript(()=>{const supports=CSS.supports.bind(CSS);CSS.supports=(...args)=>args[0]==='d'?false:supports(...args);});
  await page.goto(`${origin}/id/`);
  await page.waitForFunction(()=>window.mascotMotions.some(m=>m.target==='rig-eye-left path'));
  const entry=await firstBatch(page,'welcome','entry');
  for(const feature of ['eye-left','eye-right','smile']){
   const motion=entry.find(m=>m.target===`rig-${feature} path`);
   assert.ok(motion.frames.every(frame=>typeof frame.transform==='string'&&frame.d===undefined),`${feature}: unsupported CSS d uses the transform fallback`);
  }
  await page.waitForFunction(()=>document.querySelector('.ranca-rig').getAnimations({subtree:true}).length===0);
  await assertNeutral(page,'fallback completed entry');
  const samples=await batchFrames(page,'welcome','entry',entry),neutral=await page.evaluate(()=>window.mascotNeutral);
  for(const feature of ['eye-left','eye-right']){
   assert.ok(samples.every(s=>s.face[feature].d===neutral[feature].d&&s.face[feature].attribute===neutral[feature].attribute),'fallback leaves both source and computed path geometry intact');
   assert.ok(samples.some(s=>s.face[feature].transform!=='none'),'fallback has a rendered feature transform');
   assert.ok(Math.min(...samples.map(s=>s.face[feature].screenHeight))<Math.max(...samples.map(s=>s.face[feature].screenHeight))*.3,'fallback still visibly closes the eyes');
  }
  await page.waitForFunction(()=>window.mascotMotions.some(m=>m.kind==='idle'),null,{timeout:10000});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.querySelector('.ranca-rig').getAnimations({subtree:true}).length===0);
  await assertNeutral(page,'reduced-motion cancellation restores transform fallback');
  await page.close();
 }
 // Live preference changes cancel morphs as well as transforms and queued idle.
 {
  const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'no-preference'});
  await page.route('https://**/*',r=>r.abort());await page.addInitScript(recordMotions);
  await page.goto(`${origin}/id/`);
  await page.waitForFunction(()=>window.mascotMotions.some(m=>m.target==='rig-eye-left path'));
  await page.waitForTimeout(650);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.querySelector('.ranca-rig').getAnimations({subtree:true}).length===0);
  await assertNeutral(page,'live reduced motion cancels every facial change');
  const stopped=await page.evaluate(()=>window.mascotMotions.length);
  await scrollToSection(page,'#for-you');await page.waitForTimeout(4500);
  assert.equal(await page.evaluate(()=>window.mascotMotions.length),stopped,'reduced motion never restarts an entry or idle path morph');
  await assertNeutral(page,'reduced motion remains exactly neutral');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await scrollToSection(page,'#faq');
  await page.waitForFunction(count=>window.mascotMotions.length>count,stopped,{timeout:10000});
  await page.waitForFunction(()=>document.querySelector('.ranca-rig').getAnimations({subtree:true}).length===0);
  await assertNeutral(page,'resumed expressions return to neutral');
  await page.close();
 }
 // Every supporting section retains its explicit semantic map in both languages.
 for(const lang of ['id','en']){
  const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'});
  await page.route('https://**/*',r=>r.abort());await page.addInitScript(recordMotions);
  for(const file of ['about','help','premium','articles','college-schedule','todo-guide','flashcard-guide','privacy','terms','delete-account']){
   await page.goto(`${origin}/${lang}/${file}.html`);
   assert.equal(await page.locator('.brand-mark > svg.ranca-rig').count(),1,`${file}: integrated SVG`);
   await page.evaluate(()=>{window.mascotNeutral=window.faceGeometry();});
   const sections=await page.locator('main [data-ranca-behavior]').evaluateAll(els=>els.map(el=>({key:el.dataset.rancaBehavior,title:(el.querySelector('h1,h2,h3')?.textContent||el.textContent).trim().slice(0,100)})));
   assert.equal(sections.length,({about:3,help:5,premium:6,articles:4,'college-schedule':8,'todo-guide':8,'flashcard-guide':8,privacy:10,terms:8,'delete-account':4})[file],file+' complete semantic map');
   assert.ok(sections.every(s=>s.key),file+' no missing section profile');
   for(const section of await page.locator('main [data-ranca-behavior]').all()){
    await section.evaluate(el=>scrollTo(0,Math.max(0,el.getBoundingClientRect().top+scrollY-innerHeight*.22)));
    await page.waitForTimeout(60);
    assert.equal(await page.locator('.brand-mark').evaluate(el=>el.getAnimations({subtree:true}).length),0,'reduced motion includes every descendant');
    await assertNeutral(page,`${lang}/${file} reduced-motion section`);
   }
  }
  await page.close();
 }
 // Focused, natural-speed actual-page previews of the reported Download/FAQ
 // boundary. Each clip contains one full entry and idle for each section, with
 // the unchanged 2.8-second quiet intervals and no labels, icons or clock edits.
 for(const width of [1440,390]){
  const viewport={width,height:width<900?900:800};
  const page=await browser.newPage({viewport,reducedMotion:'no-preference',recordVideo:{dir:path.join(root,'review-evidence'),size:viewport}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',r=>r.abort());await page.addInitScript(recordMotions);
  const waitForPreviewBatch=async(key,kind,after)=>{
   try{
    await page.waitForFunction(({key,kind,after})=>document.querySelector('.brand-mark').dataset.rancaBehavior===key&&window.mascotMotions.some(m=>m.key===key&&m.kind===kind&&m.time>after),{key,kind,after},{timeout:12000});
   }catch(error){
    const diagnostic=await page.evaluate(()=>{
     const mark=document.querySelector('.brand-mark');
     return {time:performance.now(),scrollY,hidden:document.hidden,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
      activeBehavior:mark?.dataset.rancaBehavior,activeKind:mark?.dataset.rancaMotion,
      animations:mark?.getAnimations({subtree:true}).map(animation=>({playState:animation.playState,currentTime:animation.currentTime})),
      sections:['.hero-wrap','#cta','#faq'].map(selector=>{const element=document.querySelector(selector),rect=element.getBoundingClientRect();return {selector,top:rect.top,bottom:rect.bottom,behavior:element.dataset.rancaBehavior};}),
      recentMotions:window.mascotMotions.slice(-24).map(({key,kind,target,time,finished,cancelled})=>({key,kind,target,time,finished,cancelled}))};
    });
    throw new Error(`Focused ${width}px preview timed out waiting for ${key}/${kind} after ${after}ms: ${JSON.stringify(diagnostic)}`,{cause:error});
   }
  };
  // Start at a normal page load and let both observers establish the welcome
  // entry. A hash load can scroll before the header/section observers agree.
  await page.goto(`${origin}/id/`);await page.evaluate(()=>document.fonts.ready);
  if(await page.locator('[data-consent-reject]').isVisible())await page.locator('[data-consent-reject]').click();
  await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';});
  await waitForPreviewBatch('welcome','entry',-1);
  await page.waitForFunction(()=>document.querySelector('.ranca-rig').getAnimations({subtree:true}).length===0);
  assert.ok((await firstBatch(page,'welcome','entry')).every(m=>m.finished&&!m.cancelled),'the focused preview starts after a complete natural welcome entry');
  await assertNeutral(page,`${width}px focused preview ready after welcome`);
  for(const [selector,key] of [['#cta','download'],['#faq','question']]){
   const after=await page.evaluate(()=>performance.now());
   await scrollToSection(page,selector);
   for(const kind of ['entry','idle']){
    await waitForPreviewBatch(key,kind,after);
    const motions=await firstBatch(page,key,kind,after);
    await page.waitForFunction(()=>document.querySelector('.ranca-rig').getAnimations({subtree:true}).length===0);
    const finished=await firstBatch(page,key,kind,after);
    assert.ok(finished.every(m=>m.finished&&!m.cancelled),`${key} ${kind}: the focused preview records the complete gesture`);
    await assertNeutral(page,`${key} ${kind} focused preview`);
    const boundaries=await assertFrameBoundaries(page,width,key,kind,motions);
    const facial=await assertFacialMotion(page,key,kind,motions),hands=await assertRestingHands(page,key,kind,motions);
    reports.push({artifact:'download-faq-preview',lang:'id',width,key,kind,boundaries,facial,hands});
   }
  }
  assert.deepEqual(errors,[]);
  const video=page.video();await page.close();
  await video.saveAs(path.join(root,'review-evidence',`header-ranca-download-faq-${width<900?'mobile':'desktop'}.webm`));
 }
 await fs.writeFile(path.join(root,'review-evidence','header-ranca-context-report.json'),JSON.stringify(reports,null,2));
 console.log('PASS — six actual facial-morph entry/idle profiles in ID/EN at 390/1440px, 320px geometry spots, genuine quick eyelid close/reopen, reading gaze, thinking asymmetry, exact neutral return, repeated entry/idle, 2.8-second quiet periods, real-frame 44/48px checks, resting FAQ/idle hands and a single outward Download guide, clean desktop/mobile and focused Download/FAQ videos, separate SVG closeups, reduced motion and semantic coverage');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
