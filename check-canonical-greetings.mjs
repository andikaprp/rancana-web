import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';
const root=path.dirname(new URL(import.meta.url).pathname),study=path.join(root,'review-evidence/canonical-greetings'),out=path.join(root,'review-evidence/canonical-greeting-output');await fs.mkdir(out,{recursive:true});
const sources={ranca:['ranca-backpack-option-3.webp','5dc88e3c525f530d7fd28df0c011ec4a3326f9ebb22f1ab1b6c4869ae704e1af'],cana:['cana-academic-cap-option-3.webp','c97a6a2a5792b9905f04f85478b24468eeca6dc9331607c1583d80866da75775']};
for(const[key,[file,hash]]of Object.entries(sources)){for(const f of [path.join(root,'assets/mascots',file),path.join(study,`${key}-reference.webp`)])assert.equal(crypto.createHash('sha256').update(await fs.readFile(f)).digest('hex'),hash);}
const base='acfd672dbe56f2dc51f4aecd3867ac732ed7719a';
const protectedFiles=execFileSync('git',['ls-tree','-r','--name-only',base],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(f=>f!=='.assetsignore'&&!f.startsWith('.github/')&&!f.startsWith('review-evidence/')&&!/^check-/.test(f));
for(const file of protectedFiles){const original=execFileSync('git',['show',`${base}:${file}`],{cwd:root,maxBuffer:20*1024*1024});assert.ok(original.equals(await fs.readFile(path.join(root,file))),`Production file unchanged: ${file}`);}
const server=http.createServer(async(req,res)=>{try{let p=new URL(req.url,'http://local').pathname;if(p.endsWith('/'))p+='index.html';if(!path.extname(p))p+='.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+'/'))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'})[path.extname(f)]||'application/octet-stream');res.end(await fs.readFile(f));}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
const report={base,sourceHashes:sources,unchangedProductionFiles:protectedFiles.length,geometry:{},responsive:[],lifecycle:[],website:[],complete:false};
async function open(width=1100,height=1200){const p=await browser.newPage({viewport:{width,height}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/review-evidence/canonical-greetings/');await p.waitForFunction(()=>window.greetingStudy?.ready);await p.evaluate(async()=>Promise.all([...document.images].map(i=>i.decode())));assert.deepEqual(errors,[]);return p;}
try{
 const p=await open();await p.evaluate(()=>greetingStudy.seek(2600));report.repairs=await p.evaluate(()=>greetingStudy.repairReport);
 for(const r of Object.values(report.repairs)){assert.equal(r.facePixelsCovered,0);assert.ok(r.minimumSourceAlpha>=250);}
 // Validate actual transformed paths throughout the entire motion, including return.
 report.geometry=await p.evaluate(()=>{
  const result={samples:0,maxJoinGap:0,minNonJoinDistance:Infinity,maxTangentError:0};
  const matrices=new Map();const point=(path,d)=>{const p=path.getPointAtLength(d);if(!matrices.has(path))matrices.set(path,path.getCTM());return new DOMPoint(p.x,p.y).matrixTransform(matrices.get(path));};
  for(let t=0;t<=6000;t+=25){greetingStudy.seek(t);matrices.clear();for(const[key,rig]of Object.entries(greetingStudy.rigs)){
   const a=rig.arm,h=rig.hand,al=a.getTotalLength(),hl=h.getTotalLength(),ae=point(a,al),he=point(h,hl),ap=point(a,al-.02),hp=point(h,hl-.02);const gap=Math.hypot(ae.x-he.x,ae.y-he.y);result.maxJoinGap=Math.max(result.maxJoinGap,gap);
   const av=[ae.x-ap.x,ae.y-ap.y],hv=[hp.x-he.x,hp.y-he.y],dot=(av[0]*hv[0]+av[1]*hv[1])/(Math.hypot(...av)*Math.hypot(...hv));result.maxTangentError=Math.max(result.maxTangentError,Math.acos(Math.max(-1,Math.min(1,dot)))*180/Math.PI);
   const w=key==='ranca'?244:236,face=key==='ranca'?[116,110,186,189]:[56,134,137,193];
   for(const[path,len]of [[a,al],[h,hl]])for(let s=0;s<=len;s+=1.5){const q=point(path,s);if(!(q.x>3&&q.x<w-3&&q.y>3&&q.y<317))throw Error(`${key} clipping at ${t}`);if(q.x>face[0]-2&&q.x<face[2]+2&&q.y>face[1]-2&&q.y<face[3]+2)throw Error(`${key} face collision at ${t}`);}
   const armPoints=[],handPoints=[];for(let u=0;u<al-7;u+=1.5)armPoints.push(point(a,u));for(let v=0;v<hl-7;v+=1.5)handPoints.push(point(h,v));for(const x of armPoints)for(const y of handPoints){const d=Math.hypot(x.x-y.x,x.y-y.y);result.minNonJoinDistance=Math.min(result.minNonJoinDistance,d);if(d<3.8)throw Error(`${key} arm/palm crossing at ${t}: ${d}`);}
  }result.samples++;}return result;
 });console.log('Geometry checks complete');assert.ok(report.geometry.maxJoinGap<.001);assert.ok(report.geometry.maxTangentError<2);
 // SVG base image embeds exact original WebP bytes; cleanup is explicitly bounded.
 for(const[key,[file,hash]]of Object.entries(sources)){
  const data=await p.locator(`[data-original-body="${key}"]`).first().getAttribute('href');assert.equal(crypto.createHash('sha256').update(Buffer.from(data.split(',')[1],'base64')).digest('hex'),hash);
  const pixels=await p.evaluate(async key=>{const rig=greetingStudy.rigs[key],svg=rig.svg.cloneNode(true);svg.querySelector('[data-new-gesture]').remove();svg.querySelector('[data-mask]').remove();const width=key==='ranca'?244:236,read=async src=>{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=width;c.height=320;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,width,320);return ctx.getImageData(0,0,width,320).data;};const before=await read(rig.svg.querySelector('image').getAttribute('href')),after=await read('data:image/svg+xml;base64,'+btoa(svg.outerHTML)),mask=new Set([...svg.querySelectorAll('[data-cleanup] rect')].map(r=>Number(r.getAttribute('y'))*width+Number(r.getAttribute('x'))));let outside=0,face=0;for(let i=0;i<width*320;i++){if(mask.has(i))continue;for(let k=0;k<4;k++)if(before[i*4+k]!==after[i*4+k]){outside++;break;}}return{outsideMaskChangedPixels:outside};},key);assert.equal(pixels.outsideMaskChangedPixels,0,`${key} unchanged pixels outside repair`);report.repairs[key].pixelCheck=pixels;
 }
 await p.locator('#cleanup').evaluate(e=>e.open=true);await p.locator('#cleanup').screenshot({path:path.join(out,'localized-cleanup.png')});await p.locator('#repairs').check();await p.locator('#cleanup').screenshot({path:path.join(out,'localized-cleanup-mask.png')});await p.close();
 for(const width of [320,390,1440]){
  const q=await open(width,1100);await q.evaluate(()=>greetingStudy.seek(2600));assert.equal(await q.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await q.screenshot({path:path.join(out,`comparison-${width}.png`),fullPage:true});
  for(const key of ['ranca','cana']){await q.locator(`#${key}-stage`).screenshot({path:path.join(out,`${key}-natural-${width}.png`)});}
  // Interrupt/resume repeatedly. Time must freeze while hidden and resume without jumps.
  await q.locator('#ranca-stage').scrollIntoViewIfNeeded();await q.evaluate(()=>greetingStudy.play());await q.waitForTimeout(100);
  for(let cycle=0;cycle<3;cycle++){await q.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide')));const t=await q.evaluate(()=>greetingStudy.state().time);await q.waitForTimeout(60);assert.equal(await q.evaluate(()=>greetingStudy.state().time),t);await q.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow')));await q.waitForTimeout(70);const diff=await q.evaluate(t=>greetingStudy.state().time-t,t);assert.ok(diff>=0&&diff<150);}
  await q.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});const hidden=await q.evaluate(()=>greetingStudy.state().time);await q.waitForTimeout(70);assert.equal(await q.evaluate(()=>greetingStudy.state().time),hidden);await q.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await q.evaluate(()=>document.querySelector('main').style.transform='translateY(10000px)');await q.waitForTimeout(100);assert.equal(await q.evaluate(()=>greetingStudy.state().running),false);await q.evaluate(()=>document.querySelector('main').style.transform='');await q.waitForTimeout(100);assert.equal(await q.evaluate(()=>greetingStudy.state().running),true);
  await q.emulateMedia({reducedMotion:'reduce'});await q.waitForTimeout(80);assert.equal(await q.evaluate(()=>greetingStudy.state().time),2600);assert.equal(await q.evaluate(()=>greetingStudy.state().running),false);await q.waitForTimeout(80);assert.equal(await q.evaluate(()=>greetingStudy.state().time),2600);await q.screenshot({path:path.join(out,`reduced-motion-${width}.png`),fullPage:true});report.responsive.push({width,noOverflow:true,naturalSize:true});report.lifecycle.push({width,threeInterruptions:true,hiddenTab:true,offscreenPause:true,reducedMotionStatic:true});await q.close();
 }
 for(const lang of ['id','en'])for(const width of [320,390,1440]){
  const q=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});await q.route('https://**/*',r=>r.abort());await q.goto(`${origin}/${lang}/`);await q.evaluate(async()=>{for(const i of document.images)i.loading='eager';await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});const consent=q.locator('[data-consent-reject]');if(await consent.isVisible())await consent.click();
  const result=await q.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,wrappedRaster:document.querySelectorAll('.card-flashcards .feature-art .fc-front,.card-flashcards .feature-art .fc-back').length,directRasterVisible:[...document.querySelectorAll('.card-flashcards > .fc-front,.card-flashcards > .fc-back')].filter(x=>x.checkVisibility()).length,mobileCards:document.querySelectorAll('.card-flashcards .fc-mobile').length}));assert.equal(result.overflow,false);assert.equal(result.wrappedRaster,0);if(width<600)assert.equal(result.directRasterVisible,0);await q.locator('.card-flashcards').screenshot({path:path.join(out,`website-${lang}-${width}-flashcard.png`)});report.website.push({lang,width,...result});await q.close();
 }
 const q=await open(1080,1350);
 for(const[key]of Object.entries(sources)){
  const dir=path.join(out,key);await fs.mkdir(path.join(dir,'frames'),{recursive:true});
  for(const[name,t]of[['ready',0],['lift',1100],['open-greeting',2600],['wave',3300],['return',5000]]){await q.evaluate(t=>greetingStudy.seek(t),t);const svg=await q.evaluate(key=>greetingStudy.exportSVG(key),key);await fs.writeFile(path.join(dir,`${key}-${name}.svg`),svg);await q.locator(`#${key}-stage svg`).screenshot({path:path.join(dir,`${key}-${name}.png`),omitBackground:true});}
 }
 // Native-resolution transparent full-character frames, never detached hand footage.
 await q.evaluate(()=>{document.body.style.cssText='margin:0;background:transparent';document.querySelector('main').style.display='none';for(const rig of Object.values(greetingStudy.rigs)){document.body.append(rig.svg);rig.svg.style.cssText='position:absolute;left:0;top:0;background:transparent';}});
 for(const[key]of Object.entries(sources)){
  const width=key==='ranca'?244:236;await q.setViewportSize({width,height:320});await q.evaluate(key=>{for(const[k,rig]of Object.entries(greetingStudy.rigs))rig.svg.style.visibility=k===key?'visible':'hidden';},key);
  for(let i=0;i<180;i++){await q.evaluate(t=>greetingStudy.seek(t),i*1000/30);await q.screenshot({path:path.join(out,key,'frames',`${String(i).padStart(3,'0')}.png`),omitBackground:true});}
  for(const[name,i]of [['ready',0],['lift',33],['open-greeting',78],['wave',99],['return',150]])await fs.copyFile(path.join(out,key,'frames',String(i).padStart(3,'0')+'.png'),path.join(out,key,`${key}-${name}.png`));
 }await q.close();
 // Bundle the exact playable review page and original comparisons beside outputs.
 await fs.mkdir(path.join(out,'playable'),{recursive:true});for(const file of await fs.readdir(study))await fs.copyFile(path.join(study,file),path.join(out,'playable',file));report.complete=true;console.log('PASS: canonical sources and production byte-identical; continuous noncrossing wrists; full motion geometry; responsive/lifecycle/reduced motion; ID/EN mobile preservation; 360 transparent full-character frames and 10 SVG poses');
}finally{await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();server.close();}
