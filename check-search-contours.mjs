import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';
const noImages=process.argv.includes('--no-images');
const root=path.dirname(new URL(import.meta.url).pathname);
const before=path.resolve(process.argv.find(a=>a.startsWith('--baseline='))?.slice(11)||'/workspace/rancana-pr26-search-before');
const out=path.join(root,'review-evidence/selected-A-website/search-review');
await fs.mkdir(out,{recursive:true});
function serve(dir){return http.createServer(async(req,res)=>{try{let p=new URL(req.url,'http://local').pathname;if(p.endsWith('/'))p+='index.html';const f=path.resolve(dir,'.'+p);if(!f.startsWith(dir+'/'))throw Error();res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp'})[path.extname(f)]||'application/octet-stream');res.end(await fs.readFile(f));}catch{res.statusCode=404;res.end();}});}
// Sample the actual rendered curves, not just their coincident wrist endpoints.
function measure(svg){
 const character=svg.dataset.mascotIdentity,side=character==='ranca'?'right':'left';
 const arm=svg.querySelector(`[data-arm="${side}"]`),palm=svg.querySelector(`[data-palm="${side}"]`);
 const inv=arm.getCTM().inverse(),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const sample=p=>{const len=p.getTotalLength(),n=Math.ceil(len/1.5),m=inv.multiply(p.getCTM());return Array.from({length:n+1},(_,i)=>p.getPointAtLength(len*i/n).matrixTransform(m));};
 const a=sample(arm),p=sample(palm),end=a.at(-1);
 const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 const intersects=(a,b,c,d)=>cross(a,b,c)*cross(a,b,d)<-1e-5&&cross(c,d,a)*cross(c,d,b)<-1e-5;
 let crossings=0;
 for(let i=1;i<a.length;i++)for(let j=1;j<p.length;j++)if(distance(a[i],end)>3&&distance(p[j],end)>3&&intersects(a[i-1],a[i],p[j-1],p[j]))crossings++;
 for(let i=1;i<a.length;i++)for(let j=i+3;j<a.length;j++)if(intersects(a[i-1],a[i],a[j-1],a[j]))crossings++;
 const eyes=[...svg.querySelectorAll(`[data-source-id$="-eye-group"] path`)].filter(e=>getComputedStyle(e).opacity!=='0').flatMap(sample);
 let clearance=Infinity;
 for(const q of [...a,...p])for(const e of eyes)clearance=Math.min(clearance,distance(q,e));
 const av={x:end.x-a.at(-3).x,y:end.y-a.at(-3).y},pv={x:p[2].x-p[0].x,y:p[2].y-p[0].y};
 return {crossings,eyeCenterlineClearance:clearance,outerJoin:distance(end,p[0]),innerGap:distance(end,p.at(-1)),wristTangentCosine:(av.x*pv.x+av.y*pv.y)/(Math.hypot(av.x,av.y)*Math.hypot(pv.x,pv.y))};
}
const b=await chromium.launch({args:['--no-sandbox'],executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
const report={baseline:'e08df59b3d84dc159c7f7e8820b2617eb2683e25',before:{},after:{},unchangedPoses:[]};
const signatures={};
try{for(const [version,dir]of [['before',before],['after',root]]){
 const server=serve(dir);await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
 try{
 const page=await b.newPage({viewport:{width:900,height:660}});await page.goto(origin);await page.evaluate(()=>{document.head.innerHTML='';document.body.style.margin='0'});
 signatures[version]={};
 for(const character of ['ranca','cana']){
  await page.evaluate(async character=>{const {createMascot}=await import('/mascot-rig.js');window.rig=createMascot(character);document.body.replaceChildren(rig.svg);rig.svg.style.width='900px';rig.svg.style.height='auto';await Promise.all([...rig.svg.querySelectorAll('image')].map(n=>{const i=new Image();i.src=n.getAttribute('href');return i.decode()}));},character);
  for(const pose of ['ready','anticipate','lift1','lift2','present','presentHold','settle1','settle2','peek','peekHigh','cover','count','hide','duck','found','celebrate']){await page.evaluate(pose=>rig.setPose(pose),pose);signatures[version][`${character}-${pose}`]=await page.locator('svg').evaluate(svg=>[...svg.querySelectorAll('path')].map(n=>[n.getAttribute('d'),n.getAttribute('transform'),n.getAttribute('opacity')]));}
  for(const pose of ['search','scan']){await page.evaluate(pose=>rig.setPose(pose),pose);report[version][`${character}-${pose}`]=await page.locator('svg').evaluate(measure);if(!noImages)await page.locator('svg').screenshot({path:path.join(out,`${version}-${character}-${pose}.png`)});}
 }
 await page.close();
 for(const width of [390,1440]){
  const p=await b.newPage({viewport:{width,height:1000}});await p.route('https://**/*',r=>r.abort());await p.goto(origin+'/id/');await p.waitForFunction(()=>document.querySelectorAll('[data-companion-assets="ready"]').length===2);if(await p.locator('[data-consent-reject]').isVisible())await p.locator('[data-consent-reject]').click();await p.locator('.preview-footer').scrollIntoViewIfNeeded();
  const failures=[],clearances=[];
  for(const [character,start,end]of [['ranca',1050,5050],['cana',12300,16100]]){
   const frames=[];
   for(let time=start;time<=end;time+=50){
    await p.locator('.footer-brand-row').evaluate((el,time)=>el.dispatchEvent(new CustomEvent('companion:seek',{detail:{time,paused:true}})),time);
    const svg=p.locator(`[data-companion-scene="hide-seek"][data-companion-character="${character}"] svg`),m=await svg.evaluate(measure);
    if(m.crossings)failures.push({character,time,...m});clearances.push({character,time,clearance:m.eyeCenterlineClearance});
    if(!noImages&&(time-start)%200===0){const f=`${version}-${width}-${character}-${time}.png`;await svg.screenshot({path:path.join(out,f)});frames.push({f,time});}
   }
   if(!noImages){const sheet=await b.newPage({viewport:{width:1440,height:1100}});await sheet.setContent(`<style>body{font:16px system-ui;background:#edf1ea}main{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}figure{margin:0;background:white}img{width:100%}</style><h1>${version} · ${width}px · ${character} search entry / scan / exit (200ms)</h1><main>${(await Promise.all(frames.map(async({f,time})=>`<figure><figcaption>${time}ms</figcaption><img src="data:image/png;base64,${(await fs.readFile(path.join(out,f))).toString('base64')}"></figure>`))).join('')}</main>`);await sheet.locator('img').evaluateAll(is=>Promise.all(is.map(i=>i.decode())));await sheet.screenshot({path:path.join(out,`${version}-${width}-${character}-contact.png`),fullPage:true});await sheet.close();}
  }
  if(!noImages)for(const time of [3000,4000,13100,14200]){await p.locator('.footer-brand-row').evaluate((el,time)=>el.dispatchEvent(new CustomEvent('companion:seek',{detail:{time,paused:true}})),time);await p.locator('.preview-footer').screenshot({path:path.join(out,`${version}-${width}-hide-seek-${time}.png`)});}
  report[version][width]={crossingFrames:failures,minEyeClearance:Math.min(...clearances.map(x=>x.clearance)),closestEyeFrames:clearances.filter(x=>x.clearance<12)};await p.close();
 }
 }finally{await new Promise(r=>server.close(r));}
}}finally{await b.close();}
for(const key of Object.keys(signatures.before)){assert.deepEqual(signatures.after[key],signatures.before[key],`${key} stays identical`);report.unchangedPoses.push(key);}
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
const comparisons=['ranca-search','cana-search',...['390','1440'].flatMap(w=>[`${w}-ranca-contact`,`${w}-cana-contact`,...[3000,4000,13100,14200].map(t=>`${w}-hide-seek-${t}`)])];
await fs.writeFile(path.join(out,'index.html'),`<!doctype html><meta name="viewport" content="width=device-width"><title>Search contour correction</title><style>body{font:16px system-ui;margin:24px;background:#edf1ea}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}img{width:100%}figure{margin:0}section{margin-bottom:36px}@media(max-width:700px){.pair{grid-template-columns:1fr}}</style><h1>Search wrists and eye clearance</h1><p>Before: e08df59. After: current review head. Same scene times, pose timing, approved faces and static art. Enlarged transition frames are sampled every 200ms; crossing checks every 50ms. Desktop 3000/4000ms are the scene beats seen at roughly 18–21s in the original video.</p>${comparisons.map(s=>`<section><h2>${s}</h2><div class=pair>${['before','after'].map(v=>`<figure><figcaption>${v}</figcaption><img src="${v}-${s}.png"></figure>`).join('')}</div></section>`).join('')}`);
assert.ok(report.before['ranca-search'].crossings>0,'regression detects the reviewed original Ranca crossing');
assert.ok(report.before['cana-search'].eyeCenterlineClearance<8,'regression detects original Cana eye crowding');
for(const character of ['ranca','cana'])for(const pose of ['search','scan']){const m=report.after[`${character}-${pose}`];assert.equal(m.crossings,0,`${character} ${pose} contour`);assert.ok(m.eyeCenterlineClearance>14,`${character} ${pose} eye clearance: ${m.eyeCenterlineClearance}`);assert.ok(m.wristTangentCosine>.98,`${character} ${pose} smooth outer tangent`);assert.ok(m.outerJoin<.03&&m.innerGap>15);}
for(const width of [390,1440]){
 assert.equal(report.after[width].crossingFrames.length,0,`${width}px no search contour crossings during entry/exit`);
 assert.ok(report.after[width].minEyeClearance>12,`${width}px raised hand stays clear of eye ink throughout search entry/exit`);
}
console.log('PASS search regression detects original defects; corrected search/scan and transitions clear; 32 other pose snapshots unchanged.');
