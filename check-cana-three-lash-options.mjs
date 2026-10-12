import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const dir='review-evidence/cana-three-lash-options',browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1476,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
const decode=()=>page.evaluate(()=>Promise.all([...document.querySelectorAll('image')].map(n=>new Promise((resolve,reject)=>{const i=new Image();i.onload=resolve;i.onerror=reject;i.src=n.getAttribute('href')}))));
await page.goto('http://127.0.0.1:8140/'+dir+'/');await decode();
const report=await page.evaluate(()=>[...document.querySelectorAll('article')].map(card=>{
 const svg=card.querySelector('.full svg'),eyes=[...svg.querySelectorAll('[data-line-eye="cana"]')];
 return{option:card.dataset.option,fullFrame:svg.getAttribute('viewBox'),renderedWidth:svg.getBoundingClientRect().width,faceFrame:card.querySelector('.face svg').getAttribute('viewBox'),bodyScale:svg.querySelector('[data-character="cana"]').getAttribute('data-body-scale'),eyes:eyes.map(lid=>{
  const g=lid.parentElement,lashes=g.querySelector('[data-lashes]'),rounded=lashes.dataset.style==='rounded';
  return{lid:lid.getAttribute('d'),transform:g.getAttribute('transform'),style:lashes.dataset.style,color:lashes.getAttribute(rounded?'stroke':'fill'),roundedCap:!rounded||lashes.getAttribute('stroke-linecap')==='round',noBrows:g.parentElement.children.length===3,lashCount:lashes.children.length,geometry:[...lashes.children].map(lash=>{
   const nums=lash.getAttribute('d').match(/-?\d*\.?\d+/g).map(Number),p=[];for(let i=0;i<nums.length;i+=2)p.push(nums.slice(i,i+2));
   const root=rounded?p[0]:p[0].map((n,i)=>(n+p[6][i])/2),tip=rounded?p[2]:p[2].map((n,i)=>(n+p[4][i])/2);let distance=Infinity;
   for(let l=0;l<=lid.getTotalLength();l+=.005){const q=lid.getPointAtLength(l);distance=Math.min(distance,Math.hypot(root[0]-q.x,root[1]-q.y));}
   return{rootX:root[0],attachment:distance,length:tip[1]-root[1],fan:tip[0]-root[0],baseWidth:rounded?Number(lashes.getAttribute('stroke-width')):Math.hypot(p[0][0]-p[6][0],p[0][1]-p[6][1]),tipWidth:rounded?Number(lashes.getAttribute('stroke-width')):Math.hypot(p[2][0]-p[4][0],p[2][1]-p[4][1])};
  })};
 })};
}));
assert.deepEqual(report.map(o=>o.option),['A','B','C']);
for(const [i,option] of report.entries()){
 assert.equal(option.fullFrame,'830 130 740 580');assert.equal(option.faceFrame,'1030 295 285 160');assert.equal(option.renderedWidth,462.5);assert.equal(option.bodyScale,'0.907258064516129');
 for(const [j,e] of option.eyes.entries()){
  assert.equal(e.lashCount,i+3);assert.equal(e.color,'#fff9fc');assert.equal(e.roundedCap,true);assert.equal(e.noBrows,true);assert.ok(!e.transform.includes('rotate'));assert.equal(e.lid,j===0?'M -7 -4.5 Q 2.5 -1.5 12 -4.5':'M -11 -5 Q 0.5 -2.8 12 -5');
  for(let k=0;k<e.geometry.length;k++){const g=e.geometry[k];assert.ok(g.attachment<.01);assert.ok(g.length>=3.89&&g.length<=6.21);if(k)assert.ok(g.rootX-e.geometry[k-1].rootX>3.7);if(i>0)assert.ok(g.tipWidth<g.baseWidth*.3);if(i===1)assert.ok(j===0?g.fan<0:g.fan>0);}
  if(i===2)assert.ok(e.geometry.reduce((n,g)=>n+g.baseWidth,0)<4);
 }
}
await page.locator('main').screenshot({path:dir+'/Cana-ABC-comparison.png'});for(const id of ['A','B','C'])await page.locator('[data-option="'+id+'"]').screenshot({path:dir+'/'+id+'-review-card.png'});
for(const id of ['A','B','C']){
 await page.setViewportSize({width:1000,height:447});await page.goto('http://127.0.0.1:8140/'+dir+'/'+id+'/pair.html');await decode();const png=await page.screenshot({path:dir+'/'+id+'/Ranca-Cana-normal.png'});
 await page.setContent('<!doctype html><style>html,body{margin:0;background:#24493b}svg{display:block;width:100%;height:auto}</style>'+await fs.readFile(dir+'/'+id+'/RancaCana.svg','utf8'));await decode();assert.ok(png.equals(await page.screenshot()),id+' native SVG must match HTML pixel-for-pixel');
 await page.setViewportSize({width:463,height:363});await page.goto('http://127.0.0.1:8140/'+dir+'/'+id+'/Cana.html');await decode();await page.screenshot({path:dir+'/'+id+'/Cana-normal.png'});
 await page.setViewportSize({width:960,height:539});await page.goto('http://127.0.0.1:8140/'+dir+'/'+id+'/face.html');await decode();await page.screenshot({path:dir+'/'+id+'/Cana-face-closeup.png'});
}
assert.deepEqual(errors,[]);await browser.close();await fs.writeFile(dir+'/check.json',JSON.stringify({options:report,svgHtmlPixelIdentical:true,pageErrors:errors},null,2)+'\n');console.log(JSON.stringify(report));
