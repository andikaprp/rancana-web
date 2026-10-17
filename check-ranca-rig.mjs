import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.dirname(new URL(import.meta.url).pathname);
const server=http.createServer(async(req,res)=>{
 try{
  let p=new URL(req.url,'http://localhost').pathname;
  if(p.endsWith('/'))p+='index.html'; if(!path.extname(p))p+='.html';
  const file=path.resolve(root,'.'+p);if(!file.startsWith(root+'/'))throw Error('path');
  res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
  res.end(await fs.readFile(file));
 }catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
await fs.mkdir(path.join(root,'review-evidence'),{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:900,height:600},reducedMotion:'no-preference',recordVideo:{dir:path.join(root,'review-evidence','ranca-rig-output'),size:{width:900,height:600}}});
 await page.route('https://**/*',r=>r.abort());
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${origin}/review-evidence/ranca-rig/prototype.html`);
 await page.evaluate(async()=>{await window.rancaRigReady;await document.fonts.ready;});
 assert.equal(await page.locator('.ranca-rig').count(),2);
 assert.equal(await page.locator('#header-rig .ranca-rig').evaluate(el=>Math.round(el.getBoundingClientRect().width)),34);
 assert.equal(await page.locator('.ranca-cue').count(),0);
 const wordmark=await page.locator('.brand-name').boundingBox();
 const originalPaths=await page.locator('#closeup-rig path').evaluateAll(els=>els.map(el=>el.getAttribute('d')));
 const poses=['welcome','study','cards','confidence','download','question'];
 await page.waitForTimeout(500);
 for(const name of poses){
  console.log(`Rig prototype ${name}`);
  await page.evaluate(name=>window.playRancaPose(name),name);
  await page.waitForTimeout(950);
  assert.ok(await page.locator('#closeup-rig').evaluate(el=>el.getAnimations({subtree:true}).length>=1));
  assert.equal(await page.locator('.brand-name').evaluate(el=>el.getAnimations().length),0);
  assert.deepEqual(await page.locator('.brand-name').boundingBox(),wordmark);
  await page.screenshot({path:path.join(root,'review-evidence','ranca-rig-output',`${name}-mid.png`)});
  await page.waitForTimeout(1300);
  await page.waitForTimeout(1100);
  await page.evaluate(name=>window.playRancaPose(name,'idle'),name);
  await page.waitForTimeout(1900);
 }
 assert.deepEqual(await page.locator('#closeup-rig path').evaluateAll(els=>els.map(el=>el.getAttribute('d'))),originalPaths,'existing paths preserved throughout articulation');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>window.playRancaPose('welcome'));
 assert.equal(await page.locator('.ranca-rig').first().evaluate(el=>el.getAnimations({subtree:true}).length),0);
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{window.playRancaPose('cards');Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 assert.equal(await page.locator('.ranca-rig').first().evaluate(el=>el.getAnimations({subtree:true}).length),0);
 assert.deepEqual(errors,[]);
 const video=page.video();await page.close();await video.saveAs(path.join(root,'review-evidence','ranca-rig-output','ranca-articulated-prototype.webm'));
 const compare=await browser.newPage({viewport:{width:900,height:400},reducedMotion:'reduce'});
 await compare.goto(`${origin}/review-evidence/ranca-rig/prototype.html`);await compare.evaluate(()=>window.rancaRigReady);
 await compare.evaluate(()=>{
  document.querySelector('.site-header').remove();
  const rig=document.querySelector('.closeup');Object.assign(rig.style,{left:'480px',top:'55px',width:'370px',height:'266px'});rig.querySelector('svg').style.width='370px';
  const raster=document.createElement('img');raster.src='../../assets/mascots/ranca-cloud.webp';Object.assign(raster.style,{position:'absolute',left:'40px',top:'55px',width:'370px',height:'266px'});document.body.append(raster);
 });
 await compare.locator('img').evaluate(el=>el.decode());
 await compare.screenshot({path:path.join(root,'review-evidence','ranca-rig-output','raster-left-vector-right.png')});await compare.close();
 console.log('PASS — review-only independent eye/smile/hand articulation, original vector paths, stationary wordmark, actual34px header, reduced motion and hidden pause');
}finally{await browser.close();await new Promise(r=>server.close(r));}
