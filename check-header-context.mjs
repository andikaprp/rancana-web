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
const browser=await chromium.launch({args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
await fs.mkdir(path.join(root,'review-evidence'),{recursive:true});
const mapping=[
 ['.hero-wrap','welcome','wave','Welcome · friendly greeting'],
 ['#for-you','study','book','School & college · reading together'],
 ['#features','cards','cards','Features · organize study cards'],
 ['#benefits','confidence','check','Benefits · ready and confident'],
 ['#cta','download','download','Get Rancana · a downward invitation'],
 ['#faq','question','question','Questions · a curious listening tilt']
];
try{
 for(const lang of ['id','en']){
  const page=await browser.newPage({viewport:{width:1440,height:800},reducedMotion:'no-preference',...(lang==='id'?{recordVideo:{dir:path.join(root,'review-evidence'),size:{width:1440,height:800}}}:{})});
  await page.route('https://**/*',r=>r.abort());
  await page.addInitScript(()=>{
   window.mascotMotions=[];const animate=Element.prototype.animate;
   Element.prototype.animate=function(frames,options){if(this.matches('.site-header .brand-mark'))window.mascotMotions.push({key:this.dataset.rancaBehavior,kind:this.dataset.rancaMotion,frames,time:performance.now()});return animate.call(this,frames,options);};
  });
  await page.goto(`${origin}/${lang}/`);
  if(await page.locator('[data-consent-reject]').isVisible())await page.locator('[data-consent-reject]').click();
  await page.evaluate(()=>{
   document.documentElement.style.scrollBehavior='auto';
   const label=document.createElement('div');label.id='preview-label';
   Object.assign(label.style,{position:'fixed',left:'120px',top:'120px',zIndex:10000,padding:'8px 12px',background:'#fff',borderRadius:'8px',font:'15px sans-serif',color:'#244e3d',pointerEvents:'none'});document.body.append(label);
  });
  const signatures={entry:new Set(),idle:new Set()};
  for(const [selector,key,cue,label] of mapping){
   console.log(`Checking contextual ${lang}/${key}`);
   await page.evaluate(({selector,label})=>{
    document.querySelector('#preview-label').textContent=label;
    const section=document.querySelector(selector),top=section.getBoundingClientRect().top+scrollY;
    scrollTo(0,Math.max(0,top-innerHeight*.22));
   },{selector,label});
   await page.waitForFunction(key=>document.querySelector('.brand-mark').dataset.rancaBehavior===key,key);
   await page.waitForFunction(key=>window.mascotMotions.some(m=>m.key===key&&m.kind==='entry'),key,{timeout:10000}).catch(async error=>{console.log(await page.evaluate(()=>({motions:window.mascotMotions,key:document.querySelector('.brand-mark').dataset.rancaBehavior,header:document.querySelector('.brand-mark').getBoundingClientRect().toJSON()})));throw error;});
   assert.equal(await page.locator('.ranca-cue').getAttribute('data-ranca-cue'),cue);
   const box=await page.locator('.site-header .brand').boundingBox();
   await page.waitForFunction(key=>window.mascotMotions.some(m=>m.key===key&&m.kind==='idle'),key,{timeout:12000});
   await page.waitForTimeout(1200);
   assert.deepEqual(await page.locator('.site-header .brand').boundingBox(),box,'context gesture cannot shift header');
   for(const kind of ['entry','idle']) signatures[kind].add(await page.evaluate(({key,kind})=>JSON.stringify(window.mascotMotions.find(m=>m.key===key&&m.kind===kind).frames),{key,kind}));
   await page.locator('.site-header').screenshot({path:path.join(root,'review-evidence',`header-context-${lang}-${key}.png`)});
  }
  assert.equal(signatures.entry.size,6,'six distinct entry gesture sequences');
  assert.equal(signatures.idle.size,6,'six distinct idle gesture sequences');
  const before=await page.evaluate(()=>window.mascotMotions.filter(m=>m.key==='study'&&m.kind==='entry').length);
  await page.evaluate(()=>document.querySelector('#for-you').scrollIntoView());
  await page.waitForFunction(before=>window.mascotMotions.filter(m=>m.key==='study'&&m.kind==='entry').length>before,before);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
  const stopped=await page.evaluate(()=>window.mascotMotions.length);
  for(const [selector,key,cue] of mapping){
   await page.evaluate(selector=>{const el=document.querySelector(selector);scrollTo(0,Math.max(0,el.getBoundingClientRect().top+scrollY-innerHeight*.22));},selector);
   await page.waitForFunction(key=>document.querySelector('.brand-mark').dataset.rancaBehavior===key,key);
   assert.equal(await page.locator('.ranca-cue').getAttribute('data-ranca-cue'),cue,'reduced motion keeps section meaning');
   assert.equal(await page.locator('.ranca-cue').evaluate(el=>el.getAnimations().length),0);
  }
  assert.equal(await page.evaluate(()=>window.mascotMotions.length),stopped,'no contextual motion under reduced motion');
  const video=page.video();await page.close();if(video)await video.saveAs(path.join(root,'review-evidence','header-ranca-sections.webm'));
 }
 // Every supporting section has an explicit mapping in both languages.
 for(const lang of ['id','en']){
  const page=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'});
  await page.route('https://**/*',r=>r.abort());
  for(const file of ['about','help','premium','articles','college-schedule','todo-guide','flashcard-guide','privacy','terms','delete-account']){
   await page.goto(`${origin}/${lang}/${file}.html`);
   const sections=await page.locator('[data-ranca-behavior]').evaluateAll(els=>els.filter(el=>!el.matches('.brand-mark')).map(el=>({key:el.dataset.rancaBehavior,title:(el.querySelector('h1,h2,h3')?.textContent||el.textContent).trim().slice(0,100)})));
   assert.equal(sections.length,({about:3,help:5,premium:6,articles:4,'college-schedule':8,'todo-guide':8,'flashcard-guide':8,privacy:10,terms:8,'delete-account':4})[file],file+' complete semantic map');
   assert.ok(sections.every(s=>s.key),file+' no missing section profile');
   for(const section of await page.locator('main [data-ranca-behavior]').all()){
    await section.evaluate(el=>scrollTo(0,Math.max(0,el.getBoundingClientRect().top+scrollY-innerHeight*.22)));
    await page.waitForTimeout(60);
   }
   assert.equal(await page.locator('.brand-mark').evaluate(el=>el.getAnimations().length),0);
  }
  await page.close();
 }
 console.log('PASS — six content-correlated entry and idle gestures in both locales, repeated entry, stable layout, static reduced-motion cues, supporting-page semantic coverage');
}finally{await browser.close();await new Promise(r=>server.close(r));}
