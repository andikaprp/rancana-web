import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='review-evidence/selected-gesture-output';await fs.mkdir(out,{recursive:true});
const baseline=JSON.parse(await fs.readFile('review-evidence/selected-gesture-review/d1d034f-baseline-layers.json','utf8'));
const b=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:1860,height:1200}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:8140/review-evidence/selected-gesture-review/');await p.waitForFunction(()=>window.selectedReview?.ready);await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
const report=await p.evaluate(baseline=>{
  const canonical=n=>({tag:n.tagName.toLowerCase(),attributes:Object.fromEntries([...n.attributes].filter(a=>a.name!=='id').map(a=>[a.name,a.name==='href'?a.value.split('/').at(-1):a.value]).sort(([a],[b])=>a.localeCompare(b))),children:[...n.children].map(canonical)});
  const build=t=>{const n=document.createElementNS('http://www.w3.org/2000/svg',t.tag);for(const[k,v]of Object.entries(t.attributes))n.setAttribute(k,v);for(const c of t.children)if(typeof c!=='string')n.append(build(c));return n;};
  const eq=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
  const omitLashGeometry=n=>{const c=n.cloneNode(true);for(const p of c.querySelectorAll('[data-lashes]'))p.setAttribute('d','');return c;};
  const result={comparisonBase:selectedReview.comparisonBase,characters:{}};
  for(const key of ['ranca','cana']){
    const before=document.querySelector(`#before [data-character="${key}"]`),after=document.querySelector(`#after [data-character="${key}"]`),f=after.querySelector('[data-preserved-face]');
    const source=build(baseline.children.find(n=>typeof n!=='string'&&n.attributes['data-character']===key));
    const lashes=[...after.querySelectorAll('[data-lashes]')];
    result.characters[key]={beforeMatchesExactD1d034f:eq(before,source),allOtherArtworkUnchanged:eq(omitLashGeometry(before),omitLashGeometry(after)),noBrows:[...f.children].filter(n=>n.tagName.toLowerCase()==='path'&&n!==f.lastElementChild).length===0,lashCount:lashes.length,lashDetails:lashes.map(lash=>{
      const eye=lash.parentElement.querySelector('[data-line-eye]'),bounds=eye.getBBox();
      const curves=[...lash.getAttribute('d').matchAll(/M\s+([\d.-]+)\s+([\d.-]+)\s+Q\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)/g)].map(m=>m.slice(1).map(Number));
      const rootDistances=curves.map(([x,y])=>{let nearest=Infinity;for(let t=0;t<=eye.getTotalLength();t+=.005){const q=eye.getPointAtLength(t);nearest=Math.min(nearest,Math.hypot(x-q.x,y-q.y));}return nearest;});
      return{strokeWidth:Number(lash.getAttribute('stroke-width')),curvedStrokes:curves.length,rootDistances,rootSpanFraction:(curves.at(-1)[0]-curves[0][0])/bounds.width,minimumRootSpacing:Math.min(...curves.slice(1).map((c,i)=>Math.hypot(c[0]-curves[i][0],c[1]-curves[i][1]))),rise:curves.map(c=>c[1]-c[5]),changed:lash.getAttribute('d')!==before.querySelectorAll('[data-lashes]')[lashes.indexOf(lash)].getAttribute('d')};
    })};
  }
  result.canaBodyHeightRatio=Number(document.querySelector('#after [data-character="cana"]').dataset.bodyScale)*selectedReview.bodyMetrics.cana.height/selectedReview.bodyMetrics.ranca.height;return result;
},baseline);
for(const[key,c]of Object.entries(report.characters)){
  for(const name of ['beforeMatchesExactD1d034f','allOtherArtworkUnchanged','noBrows'])assert.equal(c[name],true,key+': '+name);
  assert.equal(c.lashCount,key==='ranca'?0:2);
  for(const lash of c.lashDetails){assert.equal(lash.changed,true);assert.equal(lash.strokeWidth,1.4);assert.equal(lash.curvedStrokes,3);assert.ok(lash.rootSpanFraction>.7);assert.ok(lash.minimumRootSpacing>6);for(const d of lash.rootDistances)assert.ok(d<.01);for(const rise of lash.rise)assert.ok(rise>=4.9&&rise<=7.1);}
}
assert.ok(Math.abs(report.canaBodyHeightRatio-.9)<1e-9);assert.deepEqual(errors,[]);
await p.locator('#comparison').screenshot({path:out+'/selected-baseline-before-after.png'});await fs.writeFile(out+'/comparison-check.json',JSON.stringify({...report,pageErrors:errors},null,2));await b.close();console.log(JSON.stringify(report));
