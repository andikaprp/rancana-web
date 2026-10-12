import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const dir='review-evidence/cana-normal-open-closed-options',browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
const p=await browser.newPage({viewport:{width:1000,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
const decode=()=>p.evaluate(()=>Promise.all([...document.querySelectorAll('image')].map(n=>new Promise((resolve,reject)=>{const i=new Image();i.onload=resolve;i.onerror=reject;i.src=n.getAttribute('href')}))));
await p.goto('http://127.0.0.1:8140/'+dir+'/');await decode();
const report=await p.evaluate(()=>[...document.querySelectorAll('section')].map(section=>({option:section.dataset.option,states:[...section.querySelectorAll('article')].map(card=>{
 const svg=card.querySelector('.normal svg'),cana=svg.querySelector('[data-character="cana"]'),open=card.dataset.state==='open';
 return{state:card.dataset.state,normalWidth:svg.getBoundingClientRect().width,frame:svg.getAttribute('viewBox'),openWhiteShapes:cana.querySelectorAll('[data-open-eye]').length,noBrows:cana.querySelector('[data-preserved-face]').children.length===3,eyes:[...cana.querySelectorAll('[data-line-eye]')].map(lid=>{
  const g=lid.parentElement,lashes=g.querySelector('[data-lashes]'),white=g.querySelector('[data-open-eye]'),box=white?.getBBox(),lidBox=lid.getBBox(),toGroup=node=>g.getCTM().inverse().multiply(node.getCTM()),point=(node,q)=>new DOMPoint(q[0],q[1]).matrixTransform(toGroup(node));
  return{openEyeBounds:box?{x:box.x,y:box.y,width:box.width,height:box.height}:null,upperLidEndsAtCenter:box?Math.abs(lidBox.y+lidBox.height-(box.y+box.height/2))<.01:null,groupTransform:g.getAttribute('transform'),lidTransform:lid.getAttribute('transform'),lidPath:lid.getAttribute('d'),count:lashes.children.length,strokes:[...lashes.children].map(lash=>{
   const nums=lash.getAttribute('d').match(/-?\d*\.?\d+/g).map(Number),v=[];for(let i=0;i<nums.length;i+=2)v.push(nums.slice(i,i+2));const rounded=lashes.dataset.style==='rounded';
   const root=rounded?v[0]:v[0].map((x,i)=>(x+v[6][i])/2),tip=rounded?v[2]:v[2].map((x,i)=>(x+v[4][i])/2),r=point(lash,root),t=point(lash,tip);let distance=Infinity;
   for(let l=0;l<=lid.getTotalLength();l+=.005){const q=lid.getPointAtLength(l),a=point(lid,[q.x,q.y]);distance=Math.min(distance,Math.hypot(a.x-r.x,a.y-r.y));}
   return{attachment:distance,tipVerticalOffset:t.y-r.y,rootOnUpperEdge:!open||r.y<box.y+box.height/2,transform:lash.getAttribute('transform')};
  })};
 })};
})})));
assert.deepEqual(report.map(o=>o.option),['A','B','C']);
for(const[i,o]of report.entries()){
 assert.deepEqual(o.states.map(s=>s.state),['closed','open']);
 for(const s of o.states){const open=s.state==='open';assert.equal(s.normalWidth,462.5);assert.equal(s.frame,'830 130 740 580');assert.equal(s.noBrows,true);assert.equal(s.openWhiteShapes,open?2:0);
  for(const[j,e]of s.eyes.entries()){assert.equal(e.count,i+3);assert.equal(e.groupTransform,j?'translate(117 166)':'translate(72 167)');if(open){assert.ok(e.openEyeBounds.height/e.openEyeBounds.width>1.25&&e.openEyeBounds.height/e.openEyeBounds.width<1.5);assert.equal(e.upperLidEndsAtCenter,true);}else assert.equal(e.lidPath,j?'M -11 -5 Q 0.5 -2.8 12 -5':'M -7 -4.5 Q 2.5 -1.5 12 -4.5');for(const l of e.strokes){assert.ok(l.attachment<.01);assert.equal(l.rootOnUpperEdge,true);assert.ok(open?l.tipVerticalOffset<0:l.tipVerticalOffset>0);}}
 }
}
await p.locator('main').screenshot({path:dir+'/Cana-ABC-open-closed.png'});for(const id of ['A','B','C'])await p.locator('section[data-option="'+id+'"]').screenshot({path:dir+'/'+id+'-open-closed-card.png'});
await p.goto('http://127.0.0.1:8140/'+dir+'/face-contact-sheet.html');await decode();await p.locator('main').screenshot({path:dir+'/Cana-face-state-contact-sheet.png'});
for(const id of ['A','B','C'])for(const state of ['closed','open']){
 const folder=dir+'/'+id+'/'+state;await p.setViewportSize({width:1000,height:447});await p.goto('http://127.0.0.1:8140/'+folder+'/pair.html');await decode();const png=await p.screenshot({path:folder+'/Ranca-Cana-normal.png'});
 await p.setContent('<!doctype html><style>html,body{margin:0;background:#24493b}svg{display:block;width:100%;height:auto}</style>'+await fs.readFile(folder+'/RancaCana.svg','utf8'));await decode();assert.ok(png.equals(await p.screenshot()),id+' '+state+' SVG/HTML mismatch');
 await p.setViewportSize({width:463,height:363});await p.goto('http://127.0.0.1:8140/'+folder+'/Cana.html');await decode();await p.screenshot({path:folder+'/Cana-normal.png'});
 await p.setViewportSize({width:960,height:607});await p.goto('http://127.0.0.1:8140/'+folder+'/face.html');await decode();await p.screenshot({path:folder+'/Cana-face-closeup.png'});
}
assert.deepEqual(errors,[]);await browser.close();await fs.writeFile(dir+'/check.json',JSON.stringify({options:report,svgHtmlPixelIdentical:true,pageErrors:errors},null,2)+'\n');console.log(JSON.stringify(report.map(o=>({option:o.option,states:o.states.map(s=>({state:s.state,whiteShapes:s.openWhiteShapes,lashCounts:s.eyes.map(e=>e.count)}))}))));
