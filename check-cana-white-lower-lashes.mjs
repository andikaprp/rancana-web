import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const dir='review-evidence/cana-white-lower-lashes',browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
const p=await browser.newPage({viewport:{width:1000,height:447}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
const decoded=()=>p.evaluate(()=>Promise.all([...document.querySelectorAll('image')].map(n=>new Promise((resolve,reject)=>{const i=new Image();i.onload=resolve;i.onerror=reject;i.src=n.getAttribute('href')}))));
await p.goto('http://127.0.0.1:8140/'+dir+'/preview.html');await decoded();const png=await p.screenshot({path:dir+'/Ranca-Cana-white-lashes.png'});
const report=await p.evaluate(()=>({rancaLashes:document.querySelectorAll('[data-character="ranca"] [data-lash]').length,canaLashes:document.querySelectorAll('[data-character="cana"] [data-lash]').length,canaPathCount:document.querySelectorAll('[data-character="cana"] path').length,eyes:[...document.querySelectorAll('[data-character="cana"] [data-line-eye]')].map(lid=>{
 const group=lid.parentElement,lashes=group.querySelector('[data-lashes]');
 const quad=(points,t)=>[0,1].map(i=>(1-t)**2*points[0][i]+2*(1-t)*t*points[1][i]+t*t*points[2][i]);
 return{lidPath:lid.getAttribute('d'),eyeTransform:group.getAttribute('transform'),lashColor:lashes.getAttribute('fill'),lashStroke:lashes.getAttribute('stroke'),noBrows:group.parentElement.children.length===3,strokes:[...lashes.children].map(path=>{
 const numbers=path.getAttribute('d').match(/-?\d*\.?\d+/g).map(Number),v=[];for(let i=0;i<numbers.length;i+=2)v.push(numbers.slice(i,i+2));
 const root=v[0].map((n,i)=>(n+v[6][i])/2),tip=v[2].map((n,i)=>(n+v[4][i])/2);let distance=Infinity;
 for(let l=0;l<=lid.getTotalLength();l+=.005){const q=lid.getPointAtLength(l);distance=Math.min(distance,Math.hypot(root[0]-q.x,root[1]-q.y));}
 return{rootX:root[0],attachmentDistance:distance,downwardLength:tip[1]-root[1],sidewaysCurve:tip[0]-root[0],softTipCap:(path.getAttribute('d').match(/Q/g)||[]).length===3,widths:[0,.5,1].map(t=>{const a=quad(v.slice(0,3),t),b=quad([v[6],v[5],v[4]],t);return Math.hypot(a[0]-b[0],a[1]-b[1]);})};})};
})}));
assert.equal(report.rancaLashes,0);assert.equal(report.canaLashes,12);assert.equal(report.canaPathCount,19);assert.equal(report.eyes.length,2);
for(const eye of report.eyes){assert.equal(eye.noBrows,true);assert.equal(eye.lashColor,'#fff9fc');assert.equal(eye.lashStroke,'none');assert.equal(eye.strokes.length,6);for(let i=0;i<6;i++){const s=eye.strokes[i];assert.ok(s.attachmentDistance<.01);assert.ok(s.downwardLength>=4.39&&s.downwardLength<=5.91);if(i)assert.ok(s.rootX-eye.strokes[i-1].rootX>3);assert.equal(s.softTipCap,true);assert.ok(Math.abs(s.widths[0]-1.05)<.001);assert.ok(Math.abs(s.widths[2]-.24)<.001);assert.ok(s.widths[0]>s.widths[1]&&s.widths[1]>s.widths[2]);}assert.ok(!eye.eyeTransform.includes('rotate'));}
await p.setContent('<!doctype html><style>html,body{margin:0;background:#24493b}svg{display:block;width:100%;height:auto;max-width:1600px;margin:auto}</style>'+await fs.readFile(dir+'/RancaCana.svg','utf8'));await decoded();assert.ok(png.equals(await p.screenshot()),'SVG and HTML must render pixel-identically');
await p.setViewportSize({width:1600,height:715});await p.screenshot({path:dir+'/Ranca-Cana-white-lashes-full.png'});
await p.setViewportSize({width:960,height:750});await p.goto('http://127.0.0.1:8140/'+dir+'/Cana-closeup.html');await decoded();await p.locator('main').screenshot({path:dir+'/Cana-closeup.png'});
await p.setViewportSize({width:1600,height:1200});await p.goto('http://127.0.0.1:8140/'+dir+'/contact-sheet.html');await decoded();await p.locator('main').screenshot({path:dir+'/same-frame-contact-sheet.png'});
assert.deepEqual(errors,[]);await browser.close();await fs.writeFile(dir+'/check.json',JSON.stringify({...report,svgHtmlPixelIdentical:true,pageErrors:errors},null,2)+'\n');console.log(JSON.stringify(report));
