import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.dirname(new URL(import.meta.url).pathname);
const out=process.env.FEATURE_DEMO_OUTPUT || '/tmp/rancana-feature-demos';
await fs.mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{let p=new URL(req.url,'http://local').pathname;if(p.endsWith('/'))p+='index.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+'/'))throw Error('path');res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff':'font/woff','.webp':'image/webp','.png':'image/png'})[path.extname(f)]||'application/octet-stream');res.end(await fs.readFile(f));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({args:['--no-sandbox'],executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||undefined});
const report=[];
const baselineCSS=process.env.FEATURE_DEMO_BASELINE_CSS ? await fs.readFile(process.env.FEATURE_DEMO_BASELINE_CSS,'utf8') : null;
try{
for(const lang of ['id','en'])for(const width of [320,360,390,600,899,900,1024,1440]){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('https://**/*',r=>r.abort());
 await page.goto(`http://127.0.0.1:${server.address().port}/${lang}/`);
 await page.evaluate(async()=>{await document.fonts.ready;for(const i of document.images)i.loading='eager';await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));document.documentElement.style.scrollBehavior='auto';document.querySelector('.site-header').style.visibility='hidden';});
 const reject=page.locator('[data-consent-reject]');if(await reject.isVisible())await reject.click();
 const data=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,cards:[...document.querySelectorAll('.product-grid>.card')].map(card=>{const box=card.getBoundingClientRect(),css=getComputedStyle(card);const text=[...card.querySelectorAll('h3,p,.subject-name,.todo-title,.todo-note,.todo-meta,.day span,.slot-title,.slot-sub')].filter(e=>e.checkVisibility());return{width:box.width,zoom:Number(css.zoom),heading:Number.parseFloat(getComputedStyle(card.querySelector('h3')).fontSize),caption:Number.parseFloat(getComputedStyle(card.querySelector('.card-head p')).fontSize),fits:text.every(e=>{const range=document.createRange();range.selectNodeContents(e);return [...range.getClientRects()].every(r=>r.left>=box.left-1&&r.right<=box.right+1&&r.top>=box.top-1&&r.bottom<=box.bottom+1);})};})}));
 assert.deepEqual(errors,[]);assert.equal(data.overflow,false,`${lang}/${width}: page overflow`);assert.equal(data.cards.length,4);
 if(width<900)for(const card of data.cards){assert.equal(card.zoom,1);assert.equal(card.heading,24);assert.equal(card.caption,16);assert.ok(Math.abs(card.width-Math.min(560,width-48))<1);assert.ok(card.fits,`${lang}/${width}: card text fits`);}
 const after=[];
 for(let i=0;i<4;i++)after.push(await page.locator('.product-grid>.card').nth(i).screenshot({path:path.join(out,`${lang}-${width}-${i}.png`)}));
 if(baselineCSS){
  await page.route('**/preview.css*',r=>r.fulfill({contentType:'text/css',body:baselineCSS}));
  await page.reload();await page.evaluate(async()=>{await document.fonts.ready;for(const i of document.images)i.loading='eager';await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));document.documentElement.style.scrollBehavior='auto';document.querySelector('.site-header').style.visibility='hidden';});
  if(await reject.isVisible())await reject.click();
  for(let i=0;i<4;i++){const before=await page.locator('.product-grid>.card').nth(i).screenshot({path:path.join(out,`before-${lang}-${width}-${i}.png`)});if(width>=900||i===0)assert.ok(before.equals(after[i]),`${lang}/${width}/${i}: preserved pixels`);}
 }
 report.push({lang,width,...data});await page.close();
}
await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(`All four demos pass in ID/EN at eight widths; evidence: ${out}`);
}finally{await browser.close();server.close();}
