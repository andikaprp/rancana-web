import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const out='review-evidence/selected-gesture-output';await fs.mkdir(out,{recursive:true});
const baseline=JSON.parse(await fs.readFile('review-evidence/selected-gesture-review/a4bde1c-baseline-layers.json','utf8'));
const b=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
const p=await b.newPage({viewport:{width:1860,height:1200}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:8140/review-evidence/selected-gesture-review/');await p.waitForFunction(()=>window.selectedReview?.ready);
await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
const report=await p.evaluate(async baseline=>{
  const canonical=n=>({tag:n.tagName.toLowerCase(),attributes:Object.fromEntries([...n.attributes].filter(a=>a.name!=='id').map(a=>[a.name,a.name==='href'?a.value.split('/').at(-1):a.value]).sort(([a],[b])=>a.localeCompare(b))),children:[...n.children].map(canonical)});
  const build=t=>{const n=document.createElementNS('http://www.w3.org/2000/svg',t.tag);for(const[k,v]of Object.entries(t.attributes))n.setAttribute(k,v);for(const c of t.children)if(typeof c!=='string')n.append(build(c));return n;};
  const eq=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
  const result={comparisonBase:selectedReview.comparisonBase,characters:{}};
  for(const key of ['ranca','cana']){
    const before=document.querySelector(`#before [data-character="${key}"]`),after=document.querySelector(`#after [data-character="${key}"]`),f=after.querySelector('[data-preserved-face]');
    const source=build(baseline.children.find(n=>typeof n!=='string'&&n.attributes['data-character']===key));
    const get=(node,s)=>node.querySelector(s),same=s=>eq(get(before,s),get(after,s));
    const palm=get(after,'[data-limb="active"] [data-palm]'),arm=get(after,'[data-limb="active"] [data-arm]');
    const point=(path,l)=>new DOMPoint(...Object.values({x:path.getPointAtLength(l).x,y:path.getPointAtLength(l).y})).matrixTransform(after.getCTM().inverse().multiply(path.getCTM()));
    const connected=point(palm,palm.getTotalLength()),open=point(palm,0),armEnd=point(arm,arm.getTotalLength());
    const eyes=[...after.querySelectorAll('[data-line-eye]')],oldEyes=[...before.querySelectorAll('[data-line-eye]')];
    const lashes=[...after.querySelectorAll('[data-lashes]')],oldLashes=[...before.querySelectorAll('[data-lashes]')];
    result.characters[key]={
      beforeMatchesExactA4bde1c:eq(before,source),
      noBrows:[...f.children].filter(n=>n.tagName.toLowerCase()==='path'&&n!==f.lastElementChild).length===0,
      bodyUnchanged:same('image'),mouthUnchanged:eq(before.querySelector('[data-preserved-face]').lastElementChild,f.lastElementChild),
      placementUnchanged:before.getAttribute('transform')===after.getAttribute('transform'),
      restingLimbUnchanged:same('[data-limb="resting"]'),
      palmContourUnchanged:get(before,'[data-limb="active"] [data-palm]').getAttribute('d')===palm.getAttribute('d'),
      activeLimbPlacementUnchanged:get(before,'[data-limb="active"]').getAttribute('transform')===get(after,'[data-limb="active"]').getAttribute('transform'),
      activePalmMirrored:palm.getAttribute('transform')===get(before,'[data-limb="active"] [data-palm]').getAttribute('transform').replace('scale(1 1)','scale(-1 1)'),
      connectedEdgeOutside:connected.x<open.x,
      openGapInside:open.x>connected.x&&open.x<(key==='ranca'?414:365),
      wristJoinDistance:Math.hypot(connected.x-armEnd.x,connected.y-armEnd.y),
      wristOpening:Math.hypot(connected.x-open.x,connected.y-open.y),
      eyeWidthRatios:eyes.map((e,i)=>e.getBBox().width/oldEyes[i].getBBox().width),
      eyeGroupsUnchanged:eyes.every((e,i)=>e.parentElement.getAttribute('transform')===oldEyes[i].parentElement.getAttribute('transform')),
      eyesLineOnly:eyes.length===2&&eyes.every(e=>e.getAttribute('fill')==='none'&&!/[zZ]/.test(e.getAttribute('d'))),
      lashCount:lashes.length,
      lashLengthRatios:lashes.map((e,i)=>e.getTotalLength()/oldLashes[i].getTotalLength()),
      lashStrokeRatios:lashes.map((e,i)=>Number(e.getAttribute('stroke-width'))/Number(oldLashes[i].getAttribute('stroke-width'))),
      canaEyeContoursUnchanged:key!=='cana'||eyes.every((e,i)=>eq(e,oldEyes[i]))
    };
  }
  result.canaBodyHeightRatio=Number(document.querySelector('#after [data-character="cana"]').dataset.bodyScale)*selectedReview.bodyMetrics.cana.height/selectedReview.bodyMetrics.ranca.height;
  return result;
},baseline);
for(const[key,c]of Object.entries(report.characters)){
  for(const name of ['beforeMatchesExactA4bde1c','noBrows','bodyUnchanged','mouthUnchanged','placementUnchanged','restingLimbUnchanged','palmContourUnchanged','activeLimbPlacementUnchanged','activePalmMirrored','connectedEdgeOutside','openGapInside','eyeGroupsUnchanged','eyesLineOnly','canaEyeContoursUnchanged'])assert.equal(c[name],true,key+': '+name);
  assert.ok(c.wristJoinDistance<.001);assert.ok(c.wristOpening>20);
  for(const ratio of c.eyeWidthRatios)assert.ok(Math.abs(ratio-(key==='ranca'?1.25:1))<1e-6);
  assert.equal(c.lashCount,key==='ranca'?0:2);
  for(const ratio of [...c.lashLengthRatios,...c.lashStrokeRatios])assert.ok(Math.abs(ratio-.5)<.001);
}
assert.ok(Math.abs(report.canaBodyHeightRatio-.9)<1e-9);assert.deepEqual(errors,[]);
await p.locator('#comparison').screenshot({path:out+'/selected-baseline-before-after.png'});
await fs.writeFile(out+'/comparison-check.json',JSON.stringify({...report,pageErrors:errors},null,2));await b.close();console.log(JSON.stringify(report));
