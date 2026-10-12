import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const dir='review-evidence/selected-cana-A',manifest=JSON.parse(await fs.readFile(dir+'/manifest.json','utf8'));
assert.equal(manifest.status,'selected-design');assert.equal(manifest.selectedOption,'A');assert.equal(manifest.defaultState,'default-open');
const normalize=tree=>{const t=structuredClone(tree);function visit(n){if(typeof n==='string')return;if(n.tag==='image')n.attributes.href='assets/'+n.attributes['data-body-art']+'-body.webp';n.children.forEach(visit)}visit(t);return t.children.filter(n=>typeof n==='object'&&n.attributes['data-character'])};
for(const state of manifest.states){const actual=JSON.parse(await fs.readFile(dir+'/'+state.id+'/editable-layers.json','utf8')),expected=JSON.parse(await fs.readFile(state.sourcePath+'/editable-layers.json','utf8'));assert.deepEqual(normalize(actual),normalize(expected),state.id+' artwork differs from selected source');}
assert.deepEqual(normalize(JSON.parse(await fs.readFile(dir+'/editable-layers.json','utf8'))),normalize(JSON.parse(await fs.readFile(dir+'/default-open/editable-layers.json','utf8'))));
for(const name of ['Cana','Ranca','RancaCana'])assert.equal(await fs.readFile(dir+'/'+name+'.svg','utf8'),await fs.readFile(dir+'/default-open/'+name+'.svg','utf8'));
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
const p=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
const decode=()=>p.evaluate(()=>Promise.all([...document.querySelectorAll('image')].map(n=>new Promise((resolve,reject)=>{const i=new Image();i.onload=resolve;i.onerror=reject;i.src=n.getAttribute('href')}))));
await p.goto('http://127.0.0.1:8140/'+dir+'/');await decode();assert.match(await p.locator('header').innerText(),/SELECTED DESIGN · OPTION A/);
assert.deepEqual(await p.locator('article').evaluateAll(nodes=>nodes.map(n=>n.dataset.state)),['default-open','closed','contextual-sassy']);
const counts=await p.locator('article .character').evaluateAll(nodes=>nodes.map(n=>[...n.querySelectorAll('[data-lashes]')].map(g=>g.children.length)));assert.deepEqual(counts,[[3,3],[3,3],[3,3]]);
await p.locator('main').screenshot({path:dir+'/Selected-A-overview.png'});await p.locator('#selected-states').screenshot({path:dir+'/Selected-A-expression-set.png'});
const responsive=[];
for(const width of [320,390]){await p.setViewportSize({width,height:900});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);responsive.push(width);}
for(const {id} of manifest.states){const folder=dir+'/'+id;
 for(const [name,width,height] of [['RancaCana',1600,715],['Ranca',800,580],['Cana',740,580],['face',960,607]]){
  await p.setViewportSize({width,height});await p.goto('http://127.0.0.1:8140/'+folder+'/'+name+'.html');await decode();
  const preview=await p.screenshot({path:folder+'/'+name+'-preview.png'});
  const svg=await fs.readFile(folder+'/'+name+'.svg','utf8');await p.setContent('<!doctype html><style>html,body{margin:0;background:#24493b}svg{display:block;width:100%;height:auto}</style>'+svg);await decode();assert.ok(preview.equals(await p.screenshot()),id+' '+name+' SVG/HTML mismatch');
  await p.addStyleTag({content:'html,body{background:transparent!important}'});await p.screenshot({path:folder+'/'+name+'-transparent.png',omitBackground:true});
 }
}
await p.setViewportSize({width:1000,height:447});await p.goto('http://127.0.0.1:8140/'+dir+'/default-open/RancaCana.html');await decode();await p.screenshot({path:dir+'/Ranca-Cana-selected-A.png'});
await p.setViewportSize({width:2000,height:894});await p.screenshot({path:dir+'/Ranca-Cana-selected-A@2x.png'});
for(const name of ['RancaCana','Ranca','Cana'])await fs.copyFile(dir+'/default-open/'+name+'-transparent.png',dir+'/'+name+'-transparent.png');
const alpha=[];
for(const name of ['RancaCana','Ranca','Cana']){
 const data=await fs.readFile(dir+'/'+name+'-transparent.png');
 const result=await p.evaluate(async src=>{const i=new Image();i.src=src;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const g=c.getContext('2d');g.drawImage(i,0,0);const pixels=g.getImageData(0,0,c.width,c.height).data;let transparent=0,opaque=0;for(let n=3;n<pixels.length;n+=4){if(pixels[n]===0)transparent++;if(pixels[n]===255)opaque++;}return{width:i.width,height:i.height,cornerAlpha:pixels[3],transparentPixels:transparent,opaquePixels:opaque};},'data:image/png;base64,'+data.toString('base64'));
 assert.equal(result.cornerAlpha,0);assert.ok(result.transparentPixels>1000);assert.ok(result.opaquePixels>1000);alpha.push({name,...result});
}
assert.deepEqual(errors,[]);await browser.close();
const result={selectedOption:'A',default:'normal fully open',sourceCommit:manifest.selectedSourceCommit,exactCharacterTreesMatchSources:true,threeLashesPerEyeAllStates:true,svgHtmlPixelIdentical:true,staticPreviewWidthsWithoutOverflow:responsive,transparentAssets:alpha,pageErrors:errors};await fs.writeFile(dir+'/check.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
