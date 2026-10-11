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
try{
 const pages=(await fs.readdir(path.join(root,'id'))).filter(f=>f.endsWith('.html'));
 for(const lang of ['id','en'])for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce',deviceScaleFactor:2});
  await page.route('https://**/*',r=>r.abort());
  for(const file of pages){
   await page.goto(`${origin}/${lang}/${file}`);await page.evaluate(()=>document.fonts.ready);
   const state=await page.locator('.site-header .brand-mark').evaluate(async el=>{
    const css=getComputedStyle(el),url=css.backgroundImage.match(/url\("?([^"\)]+)/)[1];
    const image=new Image();image.src=url;await image.decode();
    return {image:css.backgroundImage,fit:css.backgroundSize,width:el.offsetWidth,height:el.offsetHeight,ratio:image.naturalWidth/image.naturalHeight,motion:el.getAnimations().length,name:el.parentElement.querySelector('.brand-name').textContent,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.ok(state.image.includes('mascots/ranca-cloud.webp'));
   assert.equal(state.fit,'contain');assert.equal(state.ratio,741/532);
   assert.equal(state.width,width<900?32:34);assert.equal(state.height,width<900?24:26);
   assert.equal(state.name,'Rancana');assert.equal(state.motion,0);assert.equal(state.overflow,false);
   if(file==='index.html'||file==='about.html')await page.locator('.site-header').screenshot({path:path.join(root,'review-evidence',`header-ranca-${lang}-${file.replace('.html','')}-${width}.png`)});
  }
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:800},reducedMotion:'no-preference',recordVideo:{dir:path.join(root,'review-evidence'),size:{width:1440,height:1000}}});
 await page.route('https://**/*',r=>r.abort());
 await page.addInitScript(()=>{
  window.mascotMotions=[];const animate=Element.prototype.animate;
  Element.prototype.animate=function(frames,options){if(this.matches('.site-header .brand-mark'))window.mascotMotions.push({time:performance.now(),duration:options.duration});return animate.call(this,frames,options);};
 });
 await page.goto(`${origin}/id/`);
 if(await page.locator('[data-consent-reject]').isVisible())await page.locator('[data-consent-reject]').click();
 await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';document.querySelector('#for-you').scrollIntoView();});
 await page.waitForFunction(()=>window.mascotMotions.some(m=>m.duration===700));
 await page.waitForTimeout(1200);
 const initial=await page.evaluate(()=>window.mascotMotions.length);
 await page.evaluate(()=>document.querySelector('#features').scrollIntoView());
 await page.waitForFunction(n=>window.mascotMotions.length>n,initial);
 const before=await page.locator('.site-header .brand').boundingBox();
 await page.waitForFunction(()=>window.mascotMotions.some(m=>m.duration===1100),{},{timeout:10000});
 await page.waitForTimeout(1200);
 assert.deepEqual(await page.locator('.site-header .brand').boundingBox(),before,'motion does not shift pill');
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
 assert.equal(await page.locator('.brand-mark').evaluate(el=>el.getAnimations().length),0);
 const stopped=await page.evaluate(()=>window.mascotMotions.length);
 await page.evaluate(()=>document.querySelector('#benefits').scrollIntoView());await page.waitForTimeout(5500);
 assert.equal(await page.evaluate(()=>window.mascotMotions.length),stopped,'reduced motion stops entry and idle');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await page.waitForTimeout(5500);assert.equal(await page.evaluate(()=>window.mascotMotions.length),stopped,'hidden document stops motion');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));document.querySelector('.site-header').style.display='none';});
 await page.waitForTimeout(5500);assert.equal(await page.evaluate(()=>window.mascotMotions.length),stopped,'offscreen mascot stops motion');
 await page.evaluate(()=>{document.querySelector('.site-header').style.display='';});
 await page.setViewportSize({width:1920,height:1080});
 await page.evaluate(()=>document.querySelector('#for-you').scrollIntoView());
 await page.waitForFunction(n=>window.mascotMotions.length>n,stopped,{timeout:10000});
 const video=page.video();await page.close();await video.saveAs(path.join(root,'review-evidence','header-ranca-motion.webm'));
 console.log('PASS — full header Ranca on 66 locale/viewport views; section entry, paused idle, stable layout, reduced motion, hidden document and offscreen pause');
}finally{await browser.close();await new Promise(r=>server.close(r));}
