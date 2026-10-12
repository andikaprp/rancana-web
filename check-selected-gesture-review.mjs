import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='review-evidence/selected-gesture-output';await fs.mkdir(out,{recursive:true});
const baseline=JSON.parse(await fs.readFile('review-evidence/selected-gesture-review/e488ad4-baseline-layers.json','utf8'));
const b=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:1860,height:1200}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:8140/review-evidence/selected-gesture-review/');await p.waitForFunction(()=>window.selectedReview?.ready);await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
const report=await p.evaluate(baseline=>{
  const canonical=n=>({tag:n.tagName.toLowerCase(),attributes:Object.fromEntries([...n.attributes].filter(a=>a.name!=='id').map(a=>[a.name,a.name==='href'?a.value.split('/').at(-1):a.value]).sort(([a],[b])=>a.localeCompare(b))),children:[...n.children].map(canonical)});
  const build=t=>{const n=document.createElementNS('http://www.w3.org/2000/svg',t.tag);for(const[k,v]of Object.entries(t.attributes))n.setAttribute(k,v);for(const c of t.children)if(typeof c!=='string')n.append(build(c));return n;};
  const eq=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
  const omitLashes=n=>{const c=n.cloneNode(true);for(const p of c.querySelectorAll('[data-lashes]'))p.remove();return c;};
  const cubic=(p,t)=>[0,1].map(i=>(1-t)**3*p[0][i]+3*(1-t)**2*t*p[1][i]+3*(1-t)*t*t*p[2][i]+t**3*p[3][i]);
  const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  const result={comparisonBase:selectedReview.comparisonBase,characters:{}};
  for(const key of ['ranca','cana']){
    const before=document.querySelector(`#before [data-character="${key}"]`),after=document.querySelector(`#after [data-character="${key}"]`),f=after.querySelector('[data-preserved-face]');
    const source=build(baseline.children.find(n=>typeof n!=='string'&&n.attributes['data-character']===key));
    const lashes=[...after.querySelectorAll('[data-lashes]')];
    result.characters[key]={beforeMatchesExactE488ad4:eq(before,source),allOtherArtworkUnchanged:eq(omitLashes(before),omitLashes(after)),noBrows:[...f.children].filter(n=>n.tagName.toLowerCase()==='path'&&n!==f.lastElementChild).length===0,lashPathCount:lashes.length,lashDetails:lashes.map(lash=>{
      const eye=lash.parentElement.querySelector('[data-line-eye]');
      const ribbons=lash.getAttribute('d').split('Z').map(s=>s.trim()).filter(Boolean).map(d=>{
        const nums=d.match(/-?\d*\.?\d+/g).map(Number),points=[];for(let i=0;i<nums.length;i+=2)points.push(nums.slice(i,i+2));
        const a=points.slice(0,4),b=[points[6],points[5],points[4],points[3]],center=a.map((v,i)=>v.map((x,j)=>(x+b[i][j])/2));
        let rootDistance=Infinity;for(let l=0;l<=eye.getTotalLength();l+=.005){const q=eye.getPointAtLength(l);rootDistance=Math.min(rootDistance,distance(center[0],[q.x,q.y]));}
        const midpoint=cubic(center,.5),chordMid=center[0].map((v,i)=>(v+center[3][i])/2);
        return{cubicEdges:(d.match(/C/g)||[]).length,root:center[0],rootDistance,widths:[0,.25,.5,.75,1].map(t=>distance(cubic(a,t),cubic(b,t))),curveDeviation:distance(midpoint,chordMid),rise:center[0][1]-center[3][1],sideSweep:Math.abs(center[3][0]-center[0][0])};
      });
      return{fill:lash.getAttribute('fill'),stroke:lash.getAttribute('stroke'),curvedTaperedStrokes:ribbons.length,rootSpacing:distance(ribbons[0].root,ribbons[1].root),ribbons};
    })};
  }
  result.canaBodyHeightRatio=Number(document.querySelector('#after [data-character="cana"]').dataset.bodyScale)*selectedReview.bodyMetrics.cana.height/selectedReview.bodyMetrics.ranca.height;return result;
},baseline);
for(const[key,c]of Object.entries(report.characters)){
  for(const name of ['beforeMatchesExactE488ad4','allOtherArtworkUnchanged','noBrows'])assert.equal(c[name],true,key+': '+name);
  assert.equal(c.lashPathCount,key==='ranca'?0:2);
  for(const lash of c.lashDetails){assert.equal(lash.fill,'#fff9fc');assert.equal(lash.stroke,'none');assert.equal(lash.curvedTaperedStrokes,2);assert.ok(lash.rootSpacing>9);for(const r of lash.ribbons){assert.equal(r.cubicEdges,2);assert.ok(r.rootDistance<.01);assert.ok(r.widths[0]<1.71&&r.widths[0]>1.69);assert.ok(r.widths[2]>1);assert.equal(r.widths[4],0);for(let i=1;i<r.widths.length;i++)assert.ok(r.widths[i]<r.widths[i-1]);assert.ok(r.curveDeviation>.7);assert.ok(r.rise>7&&r.rise<9);assert.ok(r.sideSweep>4);}}
}
assert.ok(Math.abs(report.canaBodyHeightRatio-.9)<1e-9);assert.deepEqual(errors,[]);
await p.locator('#comparison').screenshot({path:out+'/selected-baseline-before-after.png'});await fs.writeFile(out+'/comparison-check.json',JSON.stringify({...report,pageErrors:errors},null,2));await b.close();console.log(JSON.stringify(report));
