import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';

const root=path.dirname(new URL(import.meta.url).pathname);
const items=JSON.parse(await fs.readFile(path.join(root,'review-evidence/approved-copy-116.json'),'utf8'));
assert.equal(items.length,116);
assert.equal(new Set(items.map(i=>i.id)).size,116);
// Raya's SEO audit (29 Oct 2026) replaced these approved meta descriptions. Body copy for the same items is unchanged.
const metadataUpdates={
 26:'Bandingkan batas pelajaran, tugas, jadwal, dan flashcard di tiap paket Rancana. Cek juga cara memulihkan akses Premium dan mengelola langganan.',
 41:'Kenalan dengan Rancana, teman belajar buat pelajar dan mahasiswa yang dibuat oleh Andika Pramudya. Baca misi kami dan cara menghubungi kami.',
 53:'Atur jadwal pelajaran atau kuliah mingguan, juga pertemuan satu kali, lengkap dengan hari, jam, dan mapelnya. Panduan langkah demi langkah di Rancana.',
 65:'Catat tugas sekolah, lengkapi detailnya, lalu pantau sampai selesai. Kelompokkan tugas per pelajaran biar gampang dicari di Rancana.',
 78:'Tulis pertanyaan dan jawaban singkat, pilih pelajarannya, lalu latihan flashcard hafalan dengan jawab dulu sebelum membalik kartu.',
};
for(const id of Object.keys(metadataUpdates))assert.ok(items.find(i=>i.id===+id).source_locations.some(p=>p.startsWith('/html/head/')),'metadata item '+id);
const pages=[...new Set(items.map(i=>i.page))];
assert.equal(pages.length,11);
const server=http.createServer(async(req,res)=>{
 try {
  let p=new URL(req.url,'http://localhost').pathname;
  if(p.endsWith('/'))p+='index.html';
  if(!path.extname(p))p+='.html';
  const f=path.resolve(root,'.'+p);
  if(!f.startsWith(root+'/'))throw Error('path');
  const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'};
  res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');
  res.end(await fs.readFile(f));
 }catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
const report=[];
try {
 for(const width of [320,390,1440]) {
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',r=>r.abort());
  for(const filename of pages) {
   const slug=filename==='index.html'?'':filename.replace('.html','');
   await page.goto(`${origin}/id/${slug}`);
   await page.evaluate(()=>document.fonts.ready);
   if(await page.locator('[data-consent-reject]').isVisible())await page.locator('[data-consent-reject]').click();
   assert.equal(await page.locator('html').getAttribute('lang'),'id');
   const missing=await page.evaluate(expected=>{
    const norm=s=>s.replace(/\s+/g,' ').trim();
    const textWithBreaks=e=>{
     const clone=e.cloneNode(true);
     clone.querySelectorAll('br').forEach(br=>br.replaceWith('\n'));
     return clone.textContent;
    };
    const texts=new Set([...document.querySelectorAll('body *')].filter(e=>!['SCRIPT','STYLE'].includes(e.tagName)).map(e=>norm(textWithBreaks(e))));
    const description=norm(document.querySelector('meta[name="description"]').content);
    return expected.filter(item=>{
     const needsMetadata=item.source_locations.some(p=>p.startsWith('/html/head/'));
     const needsBody=item.source_locations.some(p=>p.startsWith('/html/body/'));
     return (needsMetadata&&description!==norm(item.metadataAfter??item.after))||(needsBody&&!texts.has(norm(item.after)));
    }).map(i=>i.id);
   },items.filter(i=>i.page===filename).map(i=>({...i,metadataAfter:metadataUpdates[i.id]})));
   assert.deepEqual(missing,[],`${filename}: all approved text present`);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${filename} overflow at ${width}`);
   assert.equal(await page.locator('.site-header .articles-nav').count(),0);
   assert.equal(await page.locator('footer a[href*="articles"]').count(),1);
   await page.evaluate(async()=>{
    for(const image of document.images)image.loading='eager';
    await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));
   });
   assert.deepEqual(await page.locator('img').evaluateAll(images=>images.filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src)),[],`${filename} images`);
   // Exercise repeated expansion and dismissal without changing navigation.
   for(const detail of await page.locator('details').all()) {
    await detail.locator('summary').click();
    await detail.locator('summary').click();
   }
   await page.evaluate(()=>document.querySelectorAll('details').forEach(d=>d.open=true));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${filename} expanded FAQ overflow at ${width}`);
   await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:path.join(root,'review-evidence',`copy-${slug||'home'}-${width}.png`),fullPage:true});
   // The counterpart page and browser Back must retain the same route and language.
   await page.locator('a[hreflang="en"]').first().click();
   assert.equal(await page.locator('html').getAttribute('lang'),'en');
   assert.equal(new URL(page.url()).pathname,`/en/${slug}`);
   await page.goBack();
   assert.equal(await page.locator('html').getAttribute('lang'),'id');
   assert.equal(new URL(page.url()).pathname,`/id/${slug}`);
   report.push({page:filename,width,approvedItems:items.filter(i=>i.page===filename).length,status:'passed'});
  }
  assert.deepEqual(errors,[]);
  await page.close();
 }
 await fs.writeFile(path.join(root,'review-evidence/approved-copy-qa.json'),JSON.stringify(report,null,2)+'\n');
 console.log('PASS — all 116 approved changes across 11 Indonesian pages, 33 layout checks, image integrity, repeated FAQ toggles and locale/Back navigation');
}finally{await browser.close();server.close();}
