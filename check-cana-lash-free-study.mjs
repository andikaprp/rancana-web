import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const dir='review-evidence/cana-lash-free-study',browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined,args:['--no-sandbox']});
const p=await browser.newPage({viewport:{width:1000,height:447}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
const decoded=()=>p.evaluate(()=>Promise.all([...document.querySelectorAll('image')].map(n=>new Promise((resolve,reject)=>{const i=new Image();i.onload=resolve;i.onerror=reject;i.src=n.getAttribute('href')}))));
await p.goto('http://127.0.0.1:8140/'+dir+'/preview.html');await decoded();await p.screenshot({path:dir+'/Ranca-Cana-lash-free.png'});
const report=await p.evaluate(()=>({lashes:document.querySelectorAll('[data-lashes]').length,eyes:[...document.querySelectorAll('[data-character="cana"] [data-line-eye]')].map(p=>{const a=p.getPointAtLength(0),b=p.getPointAtLength(p.getTotalLength());return{lineOnly:p.getAttribute('fill')==='none',levelEndpoints:a.y===b.y,depth:p.getBBox().height,transform:p.parentElement.getAttribute('transform')};}),canaPathCount:document.querySelectorAll('[data-character="cana"] path').length,rancaPathCount:document.querySelectorAll('[data-character="ranca"] path').length}));
assert.equal(report.lashes,0);assert.equal(report.eyes.length,2);assert.equal(report.canaPathCount,7);assert.equal(report.rancaPathCount,7);for(const eye of report.eyes){assert.equal(eye.lineOnly,true);assert.equal(eye.levelEndpoints,true);assert.ok(eye.depth<=1.51);assert.ok(!eye.transform.includes('rotate'));}
await p.setViewportSize({width:1600,height:715});await p.screenshot({path:dir+'/Ranca-Cana-lash-free-full.png'});
await p.setViewportSize({width:960,height:750});await p.goto('http://127.0.0.1:8140/'+dir+'/Cana-closeup.html');await decoded();await p.locator('main').screenshot({path:dir+'/Cana-closeup.png'});
assert.deepEqual(errors,[]);await browser.close();await fs.writeFile(dir+'/check.json',JSON.stringify({...report,pageErrors:errors},null,2)+'\n');console.log(JSON.stringify(report));
