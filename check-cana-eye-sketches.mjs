import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const dir='review-evidence/cana-eye-sketches';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1200,height:650}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:8140/'+dir+'/');
const report=await page.evaluate(()=>[...document.querySelectorAll('article')].map(card=>{
 const actual=card.querySelector('.actual svg'),close=card.querySelector('.close svg');
 return{option:card.dataset.option,images:card.querySelectorAll('image,img').length,eyelids:actual.querySelectorAll('[data-lid]').length,paths:actual.querySelectorAll('path').length,actualPixelWidth:actual.getBoundingClientRect().width,closeupMatches:JSON.stringify([...actual.querySelectorAll('path')].map(n=>n.outerHTML))===JSON.stringify([...close.querySelectorAll('path')].map(n=>n.outerHTML)),eyes:[...actual.querySelectorAll('[data-eye]')].map(g=>{
  const lid=g.querySelector('[data-lid]'),start=lid.getPointAtLength(0),end=lid.getPointAtLength(lid.getTotalLength()),lashes=g.querySelector('[data-lashes]');return{side:g.dataset.eye,baselineLevel:start.y===0&&end.y===0,rotationAbsent:!g.getAttribute('transform').includes('rotate'),depth:lid.getBBox().height,lineOnly:lid.getAttribute('fill')==='none',taperedLashContours:(lashes.getAttribute('d').match(/Z/g)||[]).length};
 })};
}));
assert.equal(report.length,3);for(const c of report){assert.equal(c.images,0);assert.equal(c.eyelids,2);assert.equal(c.paths,4);assert.equal(c.closeupMatches,true);assert.ok(Math.abs(c.actualPixelWidth-146.975806)<.02);for(const e of c.eyes){assert.equal(e.baselineLevel,true);assert.equal(e.rotationAbsent,true);assert.equal(e.lineOnly,true);assert.ok(e.depth<=1.61);assert.equal(e.taperedLashContours,c.option==='B'?1:2);}assert.ok(Math.abs(c.eyes[0].depth-c.eyes[1].depth)<=.31);}
const frozen=JSON.parse(await fs.readFile(dir+'/frozen-pair-hashes.json','utf8'));const preserved=Object.keys(frozen);
for(const[file,hash]of Object.entries(frozen))assert.equal(createHash('sha256').update(await fs.readFile(file)).digest('hex'),hash,file+' must remain frozen');
assert.deepEqual(errors,[]);await page.locator('main').screenshot({path:dir+'/cana-eye-sketches.png'});for(const label of ['A','B','C'])await page.locator('[data-option="'+label+'"]').screenshot({path:dir+'/'+label+'.png'});await browser.close();await fs.writeFile(dir+'/check.json',JSON.stringify({options:report,fullPairFilesUnchanged:preserved,pageErrors:errors},null,2)+'\n');console.log(JSON.stringify(report));
