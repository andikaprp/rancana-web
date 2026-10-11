import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.dirname(new URL(import.meta.url).pathname);
const server=http.createServer(async(req,res)=>{
 try{
  let p=new URL(req.url,'http://localhost').pathname;
  if(p.endsWith('/'))p+='index.html';
  if(!path.extname(p))p+='.html';
  const f=path.resolve(root,'.'+p);if(!f.startsWith(root+'/'))throw Error('path');
  const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
  res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');res.end(await fs.readFile(f));
 }catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
await fs.mkdir(path.join(root,'review-evidence'),{recursive:true});
const report=[];
try{

 for(const lang of ['id','en'])for(const width of [320,390,768,900,1440,1920]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',r=>r.abort());
  await page.goto(`${origin}/${lang}/`);await page.evaluate(()=>document.fonts.ready);
  if(await page.locator('[data-consent-reject]').isVisible())await page.locator('[data-consent-reject]').click();
  await page.evaluate(async()=>{for(const i of document.images)i.loading='eager';await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
  assert.deepEqual(errors,[]);
  assert.equal(await page.locator('.hero-mascot').count(),2);
  assert.equal(await page.locator('.site-header a[href*="articles"]').count(),0,'no top or sticky article link');
  assert.equal(await page.locator('footer a[href*="articles"]').count(),1,'footer article link retained');
  assert.equal(await page.locator('.audience-icon[src*="option-3"]').count(),2);
  assert.equal(await page.locator('.audience-icon:not([alt=""])').count(),0);
  assert.ok(await page.locator('.audience-icon').evaluateAll(els=>els.every(i=>i.complete&&i.naturalWidth>0)));
  assert.equal(await page.locator('.closing-mascots').count(),0);
  assert.equal(await page.locator('.footer-mascots').count(),1);
  assert.equal(await page.locator('.footer-mascot').count(),2);
  assert.equal(await page.locator('.hero-mascot:not([alt=""]),.footer-mascot:not([alt=""])').count(),0);
  const state=await page.evaluate(()=>{
   const mascots=[...document.querySelectorAll('.hero-mascot,.footer-mascot')];
   const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
   const controls=[...document.querySelectorAll('.hero-ctas a,.download-content a,.preview-footer a')];
   return {
    overflow:document.documentElement.scrollWidth>innerWidth,
    loaded:mascots.every(i=>i.complete&&i.naturalWidth>0),
    interactive:mascots.some(i=>getComputedStyle(i).pointerEvents!=='none'),
    overlaps:mascots.flatMap(i=>controls.filter(a=>intersects(i.getBoundingClientRect(),a.getBoundingClientRect())).map(a=>a.textContent.trim())),
    whiteFooter:getComputedStyle(document.querySelector('.preview-footer')).backgroundColor==='rgb(255, 255, 255)',
    artwork:getComputedStyle(document.querySelector('.sheet-1')).backgroundImage.includes('flashcard-aurora-background.webp'),
    whiteRear:['.sheet-2','.sheet-3'].every(s=>getComputedStyle(document.querySelector(s)).backgroundColor==='rgb(255, 255, 255)'),
    headerBrand:getComputedStyle(document.querySelector('.brand-mark')).backgroundImage.includes('app-icon-64.webp'),
    footerBrand:document.querySelector('.footer-brand-row').children[1].textContent==='Rancana'&&document.querySelectorAll('.preview-footer .wordmark-mark,.preview-footer .wordmark-glow').length===0,
    companionsAboveFade:parseInt(getComputedStyle(document.querySelector('.hero-companion')).zIndex)>parseInt(getComputedStyle(document.querySelector('.band-hero')).zIndex),
    paper:document.querySelector('.paper-hero').src.includes('paper.webp'),
    noAddedBackdrop:[...document.querySelectorAll('.hero-companion,.footer-mascots')].every(el=>getComputedStyle(el).backgroundImage==='none'&&getComputedStyle(el,'::before').content==='none'),
    noImageFilter:mascots.every(el=>getComputedStyle(el).filter==='none'),
   };
  });
  assert.deepEqual(state,{overflow:false,loaded:true,interactive:false,overlaps:[],whiteFooter:true,artwork:true,whiteRear:true,headerBrand:true,footerBrand:true,companionsAboveFade:true,paper:true,noAddedBackdrop:true,noImageFilter:true},`${lang} at ${width}`);
  for(const selector of ['.hero-ctas .play-cta','.download-content .play-cta']){
   const a=page.locator(selector);await a.scrollIntoViewIfNeeded();
   assert.equal(await a.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'CTA hit target');
  }
  await page.locator('.hero-wrap').screenshot({path:path.join(root,'review-evidence',`mascots-${lang}-hero-${width}.png`)});
  if(width<900){assert.equal(await page.locator('.nav-download').isVisible(),false,'mobile sticky CTA removed');assert.ok((await page.locator('#cta').boundingBox()).height<500,'mobile final card compact');}
  if(width===390||width===1440)await page.locator('#for-you').screenshot({path:path.join(root,'review-evidence',`audience-${lang}-${width}.png`)});
  await page.locator('#cta').screenshot({path:path.join(root,'review-evidence',`mascots-${lang}-cta-${width}.png`)});
  if(width===390||width===1440)await page.locator('.preview-footer').screenshot({path:path.join(root,'review-evidence',`mascots-${lang}-footer-${width}.png`)});
  report.push({lang,width,...state});await page.close();
 }
 for(const filename of ['ranca-cloud.webp','cana-cloud.webp'])assert.ok((await fs.stat(path.join(root,'assets/mascots',filename))).size<200000,filename+' budget');
 await fs.writeFile(path.join(root,'review-evidence','mascot-layout-report.json'),JSON.stringify(report,null,2));
 console.log('PASS — mascot assets, decorative semantics, CTA hit targets, original paper/sheets and white footer at 6 widths in both languages');
}finally{await browser.close();await new Promise(r=>server.close(r));}
