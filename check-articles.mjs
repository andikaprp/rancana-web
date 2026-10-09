import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {chromium} from 'playwright';
const root=path.dirname(new URL(import.meta.url).pathname);
const routes=['articles','college-schedule','todo-guide','flashcard-guide'];
const server=http.createServer(async(req,res)=>{try{let p=new URL(req.url,'http://localhost').pathname;if(p.endsWith('/'))p+='index.html';if(!path.extname(p))p+='.html';const f=path.resolve(root,'.'+p);if(!f.startsWith(root+'/'))throw Error();res.setHeader('Content-Type',f.endsWith('.html')?'text/html':f.endsWith('.css')?'text/css':f.endsWith('.js')?'text/javascript':f.endsWith('.svg')?'image/svg+xml':f.endsWith('.png')?'image/png':f.endsWith('.webp')?'image/webp':'application/octet-stream');res.end(await fs.readFile(f));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(4173,'127.0.0.1',r));
const origin='http://127.0.0.1:4173';
const browser=await chromium.launch({args:['--no-sandbox']});
const evidence=[];
try{
 for(const size of [{width:1440,height:1000},{width:390,height:844}]){
  const page=await browser.newPage({viewport:size});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://www.googletagmanager.com/**',r=>r.abort());
  for(const lang of ['id','en'])for(const route of routes){
   await page.goto(`${origin}/${lang}/${route}`);await page.evaluate(()=>document.fonts.ready);if(await page.locator('[data-consent-reject]').isVisible())await page.locator('[data-consent-reject]').click();
   assert.equal(await page.locator('h1').count(),1);
   assert.equal(await page.locator('html').getAttribute('lang'),lang);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'overflow '+route);
   await page.evaluate(()=>{for(const i of document.images)i.loading='eager'});await page.locator('footer').scrollIntoViewIfNeeded();await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));await page.evaluate(()=>scrollTo(0,0));
   const images=await page.locator('img').evaluateAll(imgs=>imgs.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src));assert.deepEqual(images,[]);
   const links=await page.locator('a[href]').evaluateAll(as=>as.map(a=>a.getAttribute('href')).filter(h=>h.startsWith('/')));
   for(const href of new Set(links)){let p=href.split('#')[0];if(p.endsWith('/'))p+='index.html';if(!path.extname(p))p+='.html';await fs.access(path.join(root,p));}
   const schema=JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());assert.equal(schema['@graph'][1]['@type'],route==='articles'?'CollectionPage':'Article');
   if(route==='articles')assert.equal(await page.locator('.article-card').count(),3);
   if(lang==='id')await page.screenshot({path:path.join(root,'review-evidence',`${route}-${size.width}.png`),fullPage:true});
   evidence.push(`${lang}/${route} @ ${size.width}: no overflow, assets and local links valid`);
  }
  await page.goto(origin+'/id/');await page.locator('.articles-nav').click();assert.ok(page.url().endsWith('/id/articles'));
  await page.locator('a[hreflang="en"]').first().click();assert.ok(page.url().endsWith('/en/articles'));
  assert.deepEqual(errors,[]);await page.close();
 }
 const robots=await fs.readFile(path.join(root,'robots.txt'),'utf8');assert.ok(robots.includes('Sitemap: https://rancana.id/sitemap.xml'));
 await fs.writeFile(path.join(root,'review-evidence/article-qa.txt'),evidence.join('\n')+'\nHeader → hub → locale switch passed.\n');
 console.log('PASS — 16 locale/viewport article checks, real assets, local navigation, schema and mobile overflow');
}finally{await browser.close();server.close();}
