import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='review-evidence/selected-gesture-output';await fs.mkdir(out,{recursive:true});
const baseline=JSON.parse(await fs.readFile('review-evidence/selected-gesture-review/12db327-baseline-layers.json','utf8'));
const b=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:1860,height:1200}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:8140/review-evidence/selected-gesture-review/');await p.waitForFunction(()=>window.selectedReview?.ready);await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
const report=await p.evaluate(baseline=>{
  const canonical=n=>({tag:n.tagName.toLowerCase(),attributes:Object.fromEntries([...n.attributes].filter(a=>a.name!=='id').map(a=>[a.name,a.name==='href'?a.value.split('/').at(-1):a.value]).sort(([a],[b])=>a.localeCompare(b))),children:[...n.children].map(canonical)});
  const build=t=>{const n=document.createElementNS('http://www.w3.org/2000/svg',t.tag);for(const[k,v]of Object.entries(t.attributes))n.setAttribute(k,v);for(const c of t.children)if(typeof c!=='string')n.append(build(c));return n;};
  const eq=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
  const omitCanaEyes=n=>{const c=n.cloneNode(true);if(c.dataset.character==='cana')for(const e of c.querySelectorAll('[data-line-eye]'))e.parentElement.remove();return c;};
  const cubic=(p,t)=>[0,1].map(i=>(1-t)**3*p[0][i]+3*(1-t)**2*t*p[1][i]+3*(1-t)*t*t*p[2][i]+t**3*p[3][i]);
  const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  const result={comparisonBase:selectedReview.comparisonBase,characters:{}};
  for(const key of ['ranca','cana']){
    const before=document.querySelector(`#before [data-character="${key}"]`),after=document.querySelector(`#after [data-character="${key}"]`),f=after.querySelector('[data-preserved-face]');
    const source=build(baseline.children.find(n=>typeof n!=='string'&&n.attributes['data-character']===key));
    result.characters[key]={beforeMatchesExact12db327:eq(before,source),allArtworkOutsideCanaEyesUnchanged:eq(omitCanaEyes(before),omitCanaEyes(after)),noBrows:[...f.children].filter(n=>n.tagName.toLowerCase()==='path'&&n!==f.lastElementChild).length===0};
    if(key!=='cana')continue;
    const eyes=[...after.querySelectorAll('[data-line-eye]')],oldEyes=[...before.querySelectorAll('[data-line-eye]')];
    result.rightEyeAndLashesUnchanged=eq(eyes[1].parentElement,oldEyes[1].parentElement);
    result.eyes=eyes.map((eye,index)=>{
      const old=oldEyes[index],group=eye.parentElement,local=group.transform.baseVal.consolidate().matrix,prior=old.parentElement.transform.baseVal.consolidate().matrix;
      const world=(node,q)=>new DOMPoint(q[0],q[1]).matrixTransform(after.getCTM().inverse().multiply(node.getCTM()));
      const a=eye.getPointAtLength(0),z=eye.getPointAtLength(eye.getTotalLength()),ends=[world(eye,[a.x,a.y]),world(eye,[z.x,z.y])].sort((a,b)=>a.x-b.x);
      const outer=ends[index===0?0:1],inner=ends[index===0?1:0],lash=group.querySelector('[data-lashes]');
      const ribbons=lash.getAttribute('d').split('Z').map(s=>s.trim()).filter(Boolean).map(d=>{
        const nums=d.match(/-?\d*\.?\d+/g).map(Number),points=[];for(let i=0;i<nums.length;i+=2)points.push(nums.slice(i,i+2));
        const a=points.slice(0,4),b=[points[6],points[5],points[4],points[3]],center=a.map((v,i)=>v.map((x,j)=>(x+b[i][j])/2));
        let rootDistance=Infinity;for(let l=0;l<=eye.getTotalLength();l+=.005){const q=eye.getPointAtLength(l);rootDistance=Math.min(rootDistance,distance(center[0],[q.x,q.y]));}
        const root=world(lash,center[0]),tip=world(lash,center[3]);
        return{rootDistance,widths:[0,.25,.5,.75,1].map(t=>distance(cubic(a,t),cubic(b,t))),outwardSweepX:tip.x-root.x,upwardTip:tip.y<root.y};
      });
      return{side:index?'right':'left',eyeOriginUnchanged:local.e===prior.e&&local.f===prior.f,lineOnly:eye.getAttribute('fill')==='none'&&!/[zZ]/.test(eye.getAttribute('d')),localWidth:eye.getBBox().width,previousLocalWidth:old.getBBox().width,outerAboveInner:outer.y<inner.y,outwardDirectionX:outer.x-inner.x,tiltDegrees:Math.atan2(Math.abs(outer.y-inner.y),Math.abs(outer.x-inner.x))*180/Math.PI,lashFill:lash.getAttribute('fill'),lashStroke:lash.getAttribute('stroke'),ribbons};
    });
  }
  result.canaBodyHeightRatio=Number(document.querySelector('#after [data-character="cana"]').dataset.bodyScale)*selectedReview.bodyMetrics.cana.height/selectedReview.bodyMetrics.ranca.height;return result;
},baseline);
for(const[key,c]of Object.entries(report.characters))for(const name of ['beforeMatchesExact12db327','allArtworkOutsideCanaEyesUnchanged','noBrows'])assert.equal(c[name],true,key+': '+name);
assert.equal(report.rightEyeAndLashesUnchanged,true);
for(const[index,eye]of report.eyes.entries()){
  assert.equal(eye.eyeOriginUnchanged,true);assert.equal(eye.lineOnly,true);assert.equal(eye.localWidth,eye.previousLocalWidth);assert.equal(eye.outerAboveInner,true);assert.ok(index===0?eye.outwardDirectionX<0:eye.outwardDirectionX>0);
  assert.equal(eye.lashFill,'#fff9fc');assert.equal(eye.lashStroke,'none');assert.equal(eye.ribbons.length,2);
  for(const r of eye.ribbons){assert.ok(r.rootDistance<.01);assert.equal(r.widths[4],0);for(let i=1;i<r.widths.length;i++)assert.ok(r.widths[i]<r.widths[i-1]);assert.ok(index===0?r.outwardSweepX<0:r.outwardSweepX>0);assert.equal(r.upwardTip,true);}
}
assert.ok(report.eyes[0].tiltDegrees<report.eyes[1].tiltDegrees);assert.ok(Math.abs(report.canaBodyHeightRatio-.9)<1e-9);assert.deepEqual(errors,[]);
await p.locator('#comparison').screenshot({path:out+'/selected-baseline-before-after.png'});await fs.writeFile(out+'/comparison-check.json',JSON.stringify({...report,pageErrors:errors},null,2));await b.close();console.log(JSON.stringify(report));
