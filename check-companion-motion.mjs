import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.dirname(new URL(import.meta.url).pathname),out=path.join(root,'review-evidence/companion-motion');
await fs.mkdir(out,{recursive:true});
for(const [name,sha] of [['ranca','550f22181dbc81f4ae1392d72600bde1fd41ed0e'],['cana','d7a64fb25e2a8a57272c567762f608fb9913b37f']]){const b=await fs.readFile(path.join(root,`assets/mascots/${name}-cloud.webp`));assert.equal(crypto.createHash('sha1').update(`blob ${b.length}\0`).update(b).digest('hex'),sha,'approved original bytes unchanged');}
const hulls={"ranca": [[0.269906, 0.806391], [0.105263, 0.56391], [0.039136, 0.445489], [0.032389, 0.432331], [0.02834, 0.422932], [0.026991, 0.419173], [0.025641, 0.413534], [0.025641, 0.400376], [0.026991, 0.394737], [0.02969, 0.389098], [0.049933, 0.351504], [0.055331, 0.343985], [0.329285, 0.133459], [0.338731, 0.12782], [0.345479, 0.12406], [0.354926, 0.120301], [0.360324, 0.118421], [0.595142, 0.041353], [0.603239, 0.039474], [0.612686, 0.037594], [0.624831, 0.035714], [0.659919, 0.035714], [0.680162, 0.039474], [0.704453, 0.046992], [0.720648, 0.054511], [0.734143, 0.06203], [0.758435, 0.078947], [0.765182, 0.084586], [0.775978, 0.093985], [0.790823, 0.109023], [0.79892, 0.118421], [0.811066, 0.133459], [0.816464, 0.140977], [0.82726, 0.159774], [0.831309, 0.167293], [0.94332, 0.390977], [0.948718, 0.402256], [0.952767, 0.411654], [0.960864, 0.434211], [0.964912, 0.449248], [0.966262, 0.454887], [0.968961, 0.468045], [0.97031, 0.477444], [0.97166, 0.488722], [0.973009, 0.503759], [0.973009, 0.537594], [0.97166, 0.550752], [0.97031, 0.56203], [0.968961, 0.571429], [0.905533, 0.866541], [0.902834, 0.87782], [0.901484, 0.881579], [0.898785, 0.887218], [0.896086, 0.890977], [0.892038, 0.894737], [0.889339, 0.896617], [0.867746, 0.906015], [0.697706, 0.956767], [0.690958, 0.958647], [0.674764, 0.962406], [0.661269, 0.964286], [0.630229, 0.964286], [0.615385, 0.962406], [0.597841, 0.958647], [0.584345, 0.954887], [0.34143, 0.866541], [0.329285, 0.860902], [0.322537, 0.857143], [0.311741, 0.849624], [0.302294, 0.842105], [0.295547, 0.836466], [0.2861, 0.827068], [0.275304, 0.81391]], "cana": [[0.963758, 0.507576], [0.969128, 0.518939], [0.971812, 0.528409], [0.973154, 0.535985], [0.973154, 0.558712], [0.95302, 0.693182], [0.951678, 0.700758], [0.944966, 0.729167], [0.942282, 0.738636], [0.93557, 0.757576], [0.924832, 0.784091], [0.922148, 0.789773], [0.915436, 0.80303], [0.907383, 0.818182], [0.889933, 0.842803], [0.881879, 0.852273], [0.869799, 0.86553], [0.861745, 0.873106], [0.841611, 0.890152], [0.828188, 0.899621], [0.818792, 0.905303], [0.805369, 0.912879], [0.793289, 0.918561], [0.779866, 0.924242], [0.774497, 0.926136], [0.761074, 0.929924], [0.751678, 0.931818], [0.739597, 0.933712], [0.475168, 0.965909], [0.442953, 0.965909], [0.120805, 0.922348], [0.097987, 0.907197], [0.095302, 0.905303], [0.091275, 0.899621], [0.088591, 0.893939], [0.036242, 0.685606], [0.02953, 0.657197], [0.025503, 0.63447], [0.024161, 0.623106], [0.022819, 0.609848], [0.021477, 0.587121], [0.021477, 0.564394], [0.022819, 0.537879], [0.024161, 0.524621], [0.025503, 0.513258], [0.030872, 0.479167], [0.036242, 0.456439], [0.041611, 0.4375], [0.045638, 0.424242], [0.053691, 0.401515], [0.06443, 0.375], [0.067114, 0.369318], [0.075168, 0.354167], [0.091275, 0.325758], [0.112752, 0.295455], [0.120805, 0.285985], [0.136913, 0.268939], [0.157047, 0.25], [0.178523, 0.234848], [0.195973, 0.223485], [0.451007, 0.070076], [0.471141, 0.058712], [0.481879, 0.05303], [0.492617, 0.049242], [0.504698, 0.045455], [0.511409, 0.043561], [0.528859, 0.039773], [0.551678, 0.035985], [0.562416, 0.035985], [0.575839, 0.037879], [0.593289, 0.041667], [0.618792, 0.047348], [0.64698, 0.060606], [0.653691, 0.064394], [0.672483, 0.077652], [0.684564, 0.087121], [0.700671, 0.102273], [0.714094, 0.117424], [0.74094, 0.155303]]};
const server=http.createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname;if(p.endsWith('/'))p+='index.html';if(!path.extname(p))p+='.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+'/'))throw Error('path');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp'})[path.extname(f)]||'application/octet-stream');res.end(await fs.readFile(f));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
const reports=[];const selector=scene=>`[data-companion-scene="${scene}"]`;
const reveal=async(page,scene)=>{await page.locator(selector(scene)).first().evaluate((el,scene)=>scrollTo(0,scene==='dance'?document.documentElement.scrollHeight:el.getBoundingClientRect().top+scrollY-innerHeight*.67),scene);await page.waitForTimeout(200);};
const settle=async page=>{await page.evaluate(()=>document.fonts.ready);if(await page.locator('[data-consent-reject]').isVisible())await page.locator('[data-consent-reject]').click();await page.evaluate(async()=>{for(const i of document.images)i.loading='eager';await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});};
try{
 for(const lang of ['id','en'])for(const width of [320,393,768,900,1440,1920]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());await page.goto(`${origin}/${lang}/`);await settle(page);
  assert.equal(await page.locator('.companion-rig,.companion-stage').count(),0,'no rebuilt artwork or overlay wrappers');
  assert.equal(await page.locator('[data-companion-scene]').count(),4);
  assert.ok(await page.locator('[data-companion-scene]').evaluateAll(els=>els.every(e=>e.tagName==='IMG'&&new URL(e.src).pathname===`/assets/mascots/${e.dataset.companionCharacter}-cloud.webp`&&getComputedStyle(e).filter==='none'&&getComputedStyle(e).opacity==='1')),'only intact original images');
  for(const scene of ['present','dance']){
   await reveal(page,scene);await page.waitForFunction(scene=>[...document.querySelectorAll(`[data-companion-scene="${scene}"]`)].every(e=>e.dataset.companionMotion==='playing'),scene);
   const geometry=await page.evaluate(({scene,hulls})=>{
    const items=[...document.querySelectorAll(`[data-companion-scene="${scene}"]`)];
    const protectedEls=[...document.querySelectorAll('.hero-ctas a,.download-content a,.preview-footer a,.footer-brand-text')].map(e=>({name:e.className,rect:e.getBoundingClientRect()}));
    for(const screen of document.querySelectorAll('.hero .phone')){const p=screen.getBoundingClientRect();for(const [name,x1,y1,x2,y2] of [['screen-content',.125,.07,.875,.80],['screen-add-button',.36,.825,.69,.895]])protectedEls.push({name:screen.className+' '+name,rect:{left:p.left+p.width*x1,right:p.left+p.width*x2,top:p.top+p.height*y1,bottom:p.top+p.height*y2}});}
    const overlap=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top,problems=[];
    const word=()=>JSON.stringify(document.querySelector('.footer-brand-text').getBoundingClientRect().toJSON()),initialWord=word();
    for(const el of items)for(const a of el.getAnimations())a.pause();
    for(let t=0;t<=11000;t+=160){
     for(const el of items)for(const a of el.getAnimations())a.currentTime=t;
     for(const el of items){
      const s=getComputedStyle(el),m=new DOMMatrixReadOnly(s.transform),w=parseFloat(s.width),h=parseFloat(s.height),[ox,oy]=s.transformOrigin.split(' ').map(parseFloat);
      const transform=(x,y)=>{const p=new DOMPoint(x-ox,y-oy).matrixTransform(m);return{x:p.x+ox,y:p.y+oy};};
      const corners=[[0,0],[w,0],[w,h],[0,h]].map(([x,y])=>transform(x,y)),rect=el.getBoundingClientRect(),left=rect.left-Math.min(...corners.map(p=>p.x)),top=rect.top-Math.min(...corners.map(p=>p.y));
      const painted=hulls[el.dataset.companionCharacter].map(([x,y])=>transform(x*w,y*h));
      const r={left:left+Math.min(...painted.map(p=>p.x)),right:left+Math.max(...painted.map(p=>p.x)),top:top+Math.min(...painted.map(p=>p.y)),bottom:top+Math.max(...painted.map(p=>p.y))};
      if(r.left < -1 ||r.right>innerWidth+1)problems.push({kind:'viewport',character:el.dataset.companionCharacter,t,...r});
      for(const control of protectedEls)if(overlap(r,control.rect))problems.push({kind:'overlap',character:el.dataset.companionCharacter,t,target:control.name});
     }
    }
    return{problems,overflow:document.documentElement.scrollWidth>innerWidth,wordUnchanged:initialWord===word(),pointerInert:items.every(e=>getComputedStyle(e).pointerEvents==='none')};
   },{scene,hulls});
   reports.push({lang,width,scene,...geometry});await page.screenshot({path:path.join(out,`${lang}-${width}-${scene}-bounds.png`)});
   assert.equal(geometry.overflow,false);assert.equal(geometry.wordUnchanged,true);assert.equal(geometry.pointerInert,true);
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>[...document.querySelectorAll('[data-companion-scene]')].every(e=>e.dataset.companionMotion==='reduced'&&e.getAnimations().length===0));
   await page.emulateMedia({reducedMotion:'no-preference'});await page.evaluate(()=>scrollTo(0,document.querySelector('#features').offsetTop));await page.waitForTimeout(500);assert.ok(await page.locator('[data-companion-scene]').evaluateAll(els=>els.every(e=>e.dataset.companionMotion==='paused')),'offscreen pause');
   await reveal(page,scene);await page.waitForTimeout(250);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.ok(await page.locator('[data-companion-scene]').evaluateAll(els=>els.every(e=>e.dataset.companionMotion==='paused')),'hidden document pause');
   await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 for(const [label,width,height] of [['mobile',393,852],['desktop',1440,1000]])for(const scene of ['present','dance']){
  const context=await browser.newContext({viewport:{width,height},recordVideo:{dir:out,size:{width,height}}});const page=await context.newPage();await page.route('https://**/*',r=>r.abort());await page.goto(`${origin}/id/`);await settle(page);await reveal(page,scene);
  await page.locator(selector(scene)).evaluateAll(els=>{for(const el of els)for(const a of el.getAnimations())a.currentTime=0;});await page.waitForTimeout(1900);await page.screenshot({path:path.join(out,`${label}-${scene}.png`)});await page.waitForTimeout(12500);
  const video=page.video();await page.close();await context.close();await video.saveAs(path.join(out,`${label}-${scene}.webm`));
 }
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(reports,null,2));assert.deepEqual(reports.filter(r=>r.problems.length).map(r=>({lang:r.lang,width:r.width,scene:r.scene,problems:r.problems.slice(0,8)})),[],'original-art painted bounds');console.log('PASS: approved original hashes; image-only motion, 24 responsive scenes, UI/wordmark clearance, reduced motion, visibility pauses and four real-page recordings.');
}finally{await fs.writeFile(path.join(out,'report.json'),JSON.stringify(reports,null,2));await browser.close();await new Promise(r=>server.close(r));}
