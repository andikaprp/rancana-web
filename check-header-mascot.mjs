import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';
const root=path.dirname(new URL(import.meta.url).pathname);
const trustedBodySHA256='3808db0e90cf26493bd78e91dee03c541dd115051f958adfca4ddfe2b566a93a';
const previousSVG=await fs.readFile(path.join(root,'tests/fixtures/ranca-header-outlined.svg'),'utf8');
const expectedFeaturePaths=[...previousSVG.matchAll(/<path\b[^>]*\sd="([^"]+)"/g)].slice(1).map(match=>match[1]);
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
const origin=process.env.SITE_BASE_URL || `http://127.0.0.1:${server.address().port}`;
let browser;
await fs.mkdir(path.join(root,'review-evidence'),{recursive:true});
const report=[];
const navigationReport=[];
const scrollNavigation=async(page,sticky)=>{
 await page.evaluate(sticky=>{
  document.documentElement.style.scrollBehavior='auto';
  const boundary=document.querySelector('.hero-ctas .play-cta')||[...document.querySelectorAll('[data-nav-boundary]')].find(el=>el.getClientRects().length);
  scrollTo(0,sticky?boundary.getBoundingClientRect().bottom+scrollY+40:0);
 },sticky);
 await page.waitForFunction(sticky=>document.querySelector('.site-header').classList.contains('is-sticky')===sticky,sticky);
};
const navigationLayout=page=>page.locator('.site-header').evaluate(header=>{
 const box=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,width:r.width,height:r.height};};
 const brand=header.querySelector('.brand'),wordmark=brand.querySelector('.brand-name'),mark=brand.querySelector('.brand-mark'),language=header.querySelector('.lang');
 const pill=box(brand),lang=box(language),visible=language.checkVisibility();
 return {header:box(header),pill,wordmark:box(wordmark),mascot:box(mark),viewport:innerWidth,
  sticky:header.classList.contains('is-sticky'),position:getComputedStyle(header).position,
  centerError:Math.abs(pill.left+pill.width/2-innerWidth/2),
  languageVisible:visible,languageOverlap:visible&&pill.left<lang.right&&pill.right>lang.left,
  downloadVisible:header.querySelector('.nav-download').checkVisibility(),
  wordmarkVisible:wordmark.checkVisibility(),overflow:document.documentElement.scrollWidth>innerWidth,
  outerTransforms:[brand,mark,mark.querySelector('svg')].map(el=>getComputedStyle(el).transform),
  extraCues:document.querySelectorAll('.ranca-cue,#preview-label').length};
});
const assertStickyLayout=(state,initial,label)=>{
 assert.equal(state.position,'fixed',`${label}: sticky position`);
 assert.equal(state.header.height,48,`${label}: header stays 48px`);
 assert.equal(state.pill.height,48,`${label}: pill stays 48px`);
 assert.equal(state.overflow,false,`${label}: no horizontal overflow`);
 assert.equal(state.languageOverlap,false,`${label}: language does not overlap brand`);
 assert.equal(state.languageVisible,false,`${label}: scrolled language slot is hidden`);
 assert.equal(state.wordmarkVisible,true,`${label}: full sticky wordmark remains visible`);
 assert.deepEqual(state.outerTransforms,['none','none','none'],`${label}: layout does not transform the brand or mascot wrapper`);
 assert.equal(state.extraCues,0,`${label}: no extra icons or status text`);
 if(state.viewport<900){
  assert.ok(state.centerError<.5,`${label}: mobile pill is exactly viewport-centered (${state.centerError}px)`);
  assert.equal(state.mascot.width,44,`${label}: 44px mobile mascot`);
  assert.equal(state.downloadVisible,false,`${label}: mobile download remains hidden`);
  assert.ok(state.header.left>=24&&state.header.right<=state.viewport-24,`${label}: safe side gutters`);
 }else{
  assert.deepEqual(state.header,initial.header,`${label}: desktop header geometry is unchanged`);
  assert.deepEqual(state.pill,initial.pill,`${label}: desktop brand geometry is unchanged`);
  assert.deepEqual(state.wordmark,initial.wordmark,`${label}: desktop wordmark is unchanged`);
  assert.equal(state.downloadVisible,true,`${label}: desktop download remains visible`);
 }
};
const scrollToSection=(page,selector)=>page.evaluate(selector=>{
 const el=document.querySelector(selector);scrollTo(0,Math.max(0,el.getBoundingClientRect().top+scrollY-innerHeight*.22));
},selector);
const motionCount=page=>page.evaluate(()=>window.mascotMotions.length);
const assertStopped=async(page,message)=>{
 await page.waitForFunction(()=>document.querySelector('.brand-mark').getAnimations({subtree:true}).length===0);
 assert.equal(await page.locator('.brand-mark').evaluate(el=>el.getAnimations({subtree:true}).length),0,message);
};
const checkLink=async locator=>{
 assert.ok(await locator.evaluate(el=>{
  const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));
 }),'header link remains pointer reachable');
 await locator.focus();assert.ok(await locator.evaluate(el=>document.activeElement===el),'header link remains focusable');
};
try{
 browser=await chromium.launch({args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
 const pages=(await fs.readdir(path.join(root,'id'))).filter(f=>f.endsWith('.html'));
 for(const lang of ['id','en'])for(const width of [320,390,1440]){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce',deviceScaleFactor:2});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',r=>new URL(r.request().url()).origin===origin ? r.continue() : r.abort());
  // The outlined reference is review-only and intentionally excluded from deployment.
  await page.route('**/tests/fixtures/ranca-header-outlined.svg',r=>r.fulfill({contentType:'image/svg+xml',body:previousSVG}));
  for(const file of pages){
   await page.goto(`${origin}/${lang}/${file}`);await page.evaluate(()=>document.fonts.ready);
   const state=await page.locator('.site-header .brand-mark').evaluate(async el=>{
    const svg=el.querySelector('svg.ranca-rig'),css=getComputedStyle(el),pill=el.closest('.brand').getBoundingClientRect(),header=el.closest('.site-header').getBoundingClientRect(),word=el.parentElement.querySelector('.brand-name').getBoundingClientRect();
    const parts=['rig-body','rig-eye-left','rig-eye-right','rig-smile','rig-hand-left','rig-hand-right'];
    const texture=svg.querySelector('image.rig-body-texture'),src=texture.getAttribute('href');
    const image=new Image();image.src=src;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    const context=canvas.getContext('2d');context.drawImage(image,0,0);
    const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;
    let left=canvas.width,top=canvas.height,right=0,bottom=0;
    for(let i=3;i<pixels.length;i+=4)if(pixels[i]){
     const pixel=(i-3)/4,x=pixel%canvas.width,y=Math.floor(pixel/canvas.width);
     left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);
    }
    const bytes=Uint8Array.from(atob(src.split(',')[1]),value=>value.charCodeAt(0));
    const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');
    // Measure the decoded nontransparent texture extent, while still including
    // the exact white feature strokes and their intentional SVG overflow.
    const matrix=texture.getScreenCTM();
    const corners=[[left,top],[right,top],[right,bottom],[left,bottom]].map(([x,y])=>new DOMPoint(x,y).matrixTransform(matrix));
    const rects=[{left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),top:Math.min(...corners.map(p=>p.y)),bottom:Math.max(...corners.map(p=>p.y))},...[...svg.querySelectorAll('.rig-face path,.rig-hands path')].map(part=>{
     const r=part.getBoundingClientRect(),m=part.getScreenCTM(),style=getComputedStyle(part);
     const stroke=style.stroke==='none'?0:parseFloat(style.strokeWidth)/2,x=stroke*Math.hypot(m.a,m.c),y=stroke*Math.hypot(m.b,m.d);
     return {left:r.left-x,right:r.right+x,top:r.top-y,bottom:r.bottom+y};
    })];
    return {
     inline:el.dataset.rancaRig==='true'&&el.querySelectorAll('svg').length===1,
     background:css.backgroundImage,width:el.offsetWidth,height:el.offsetHeight,
     viewBox:svg.getAttribute('viewBox'),preservesAspect:svg.preserveAspectRatio.baseVal.meetOrSlice===1,
     complete:parts.every(name=>svg.querySelector(`.${name}`)),
     embeddedBody:{count:svg.querySelectorAll('image').length,format:src.startsWith('data:image/webp;base64,'),sha256:digest,
      x:texture.getAttribute('x'),y:texture.getAttribute('y'),width:texture.getAttribute('width'),height:texture.getAttribute('height'),
      decodedWidth:image.naturalWidth,decodedHeight:image.naturalHeight,alphaBounds:[left,top,right,bottom]},
     isolated:svg.querySelectorAll('foreignObject,defs,use,filter,style,script,[id]').length===0&&
      [...svg.querySelectorAll('*')].every(node=>[...node.attributes].every(attribute=>!/^on|^(?:filter|clip-path|mask)$/i.test(attribute.name)&&!attribute.value.includes('url(')))&&
      [...svg.querySelectorAll('[href]')].every(node=>node===texture),
     noBodyEffects:[svg.querySelector('.rig-body'),texture].every(node=>getComputedStyle(node).stroke==='none'&&getComputedStyle(node).filter==='none'),
     bodyChildren:[...svg.querySelector('.rig-body').children].map(node=>node.getAttribute('class')),
     featurePaths:[...svg.querySelectorAll('path')].map(node=>node.getAttribute('d')),
     featureCounts:['rig-eye-left','rig-eye-right','rig-smile','rig-hand-left','rig-hand-right'].map(name=>svg.querySelectorAll('.'+name+' path').length),
     motion:el.getAnimations({subtree:true}).length,
     decorative:el.getAttribute('aria-hidden')==='true'&&svg.getAttribute('aria-hidden')==='true'&&svg.getAttribute('focusable')==='false',
     pointerInert:css.pointerEvents==='none'&&getComputedStyle(svg).pointerEvents==='none',
     name:el.parentElement.querySelector('.brand-name').textContent,
     pillHeight:pill.height,headerHeight:header.height,
     unclipped:rects.every(r=>r.left>=pill.left-1&&r.right<=pill.right+1&&r.top>=pill.top-1&&r.bottom<=pill.bottom+1),
     beforeWordmark:word.width===0||rects.every(r=>r.right<=word.left+1),
     withinViewport:header.left>=0&&header.right<=innerWidth,
     overflow:document.documentElement.scrollWidth>innerWidth,
     extraCues:document.querySelectorAll('.ranca-cue,#preview-label').length
    };
   });
   assert.deepEqual(state,{
    inline:true,background:'none',width:width<900?44:48,height:width<900?32:35,
    viewBox:'0 0 741 532',preservesAspect:true,complete:true,
    embeddedBody:{count:1,format:true,sha256:trustedBodySHA256,x:'0',y:'0',width:'741',height:'532',decodedWidth:741,decodedHeight:532,alphaBounds:[103,16,725,516]},
    isolated:true,noBodyEffects:true,bodyChildren:['rig-body-texture','rig-face','rig-hands'],featurePaths:expectedFeaturePaths,featureCounts:[1,1,1,1,2],motion:0,
    decorative:true,pointerInert:true,name:'Rancana',pillHeight:48,headerHeight:48,
    unclipped:true,beforeWordmark:true,withinViewport:true,overflow:false,extraCues:0
   },`${lang}/${file} at ${width}`);
   for(const link of await page.locator('.site-header a:visible').all())await checkLink(link);
   assert.deepEqual(errors,[],`${lang}/${file}: browser errors`);
   if(file==='index.html'||file==='about.html')await page.locator('.site-header').screenshot({path:path.join(root,'review-evidence',`header-ranca-${lang}-${file.replace('.html','')}-${width}.png`)});
   if(file==='index.html'&&lang==='id'&&width===390){
    if(await page.locator('[data-consent-reject]').isVisible())await page.locator('[data-consent-reject]').click();
    await page.locator('body').click({position:{x:3,y:300}});
    await page.screenshot({path:path.join(root,'review-evidence','header-ranca-mobile-page.png')});
   }
   report.push({lang,file,width,...state});
  }
  // The home and supporting-page boundaries must repeatedly enter/leave sticky mode.
  for(const file of ['index.html','about.html']){
   await page.goto(`${origin}/${lang}/${file}`);await page.evaluate(()=>document.fonts.ready);
   if(await page.locator('[data-consent-reject]').isVisible())await page.locator('[data-consent-reject]').click();
   const initial=await navigationLayout(page),label=`${lang}/${file} at ${width}`;
   assert.equal(initial.sticky,false,`${label}: initial navigation is unchanged`);
   assert.equal(initial.languageVisible,true,`${label}: initial language controls remain visible`);
   assert.equal(initial.wordmarkVisible,width>380,`${label}: initial compact wordmark rule is unchanged`);
   for(let pass=0;pass<3;pass++){
    await scrollNavigation(page,true);
    const sticky=await navigationLayout(page);assertStickyLayout(sticky,initial,`${label}, pass ${pass+1}`);
    navigationReport.push({lang,file,width,pass:pass+1,...sticky});
    await scrollNavigation(page,false);
    const restored=await navigationLayout(page);
    assert.deepEqual(restored.header,initial.header,`${label}: reverse restores initial header geometry`);
    assert.deepEqual(restored.pill,initial.pill,`${label}: reverse restores initial pill geometry`);
    assert.equal(restored.languageVisible,true,`${label}: reverse restores language controls`);
   }
   // A focused language control remains in its original, non-overlapping split layout.
   await page.locator('.site-header .lang-btn[hreflang="id"]').focus();
   await scrollNavigation(page,true);
   const focused=await navigationLayout(page);
   assert.equal(focused.languageVisible,true,`${label}: focused language remains available`);
   assert.equal(focused.languageOverlap,false,`${label}: focused language is not covered by the brand`);
   assert.equal(focused.overflow,false,`${label}: focused split layout does not overflow`);
   assert.deepEqual(focused.pill,initial.pill,`${label}: focused language preserves the original split layout`);
   assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('hreflang')),'id',`${label}: ID retains focus across sticky activation`);
   for(let transfer=0;transfer<3;transfer++)for(const [key,locale] of [['Tab','en'],['Shift+Tab','id']]){
    await page.keyboard.press(key);
    const focusState=await page.evaluate(()=>({
     locale:document.activeElement.getAttribute('hreflang'),
     activeTag:document.activeElement.tagName,activeClass:document.activeElement.className,
     languageHidden:document.querySelector('.site-header .lang').hidden,
     slotDisplay:getComputedStyle(document.querySelector('.site-header .nav-slot')).display
    }));
    assert.equal(focusState.locale,locale,`${label}: ${key} transfer ${transfer+1} keeps language focus; ${JSON.stringify(focusState)}`);
    assert.equal(focusState.languageHidden,false,`${label}: internal keyboard movement never hides language controls`);
    const retained=await navigationLayout(page);
    assert.equal(retained.languageVisible,true,`${label}: language remains visible after internal keyboard movement`);
    assert.equal(retained.languageOverlap,false,`${label}: internal keyboard movement cannot overlap brand and language`);
    assert.deepEqual(retained.pill,initial.pill,`${label}: internal keyboard movement preserves split geometry`);
   }
   await page.evaluate(()=>document.activeElement.blur());
   await page.waitForFunction(()=>document.querySelector('.site-header .lang').hidden);
   assertStickyLayout(await navigationLayout(page),initial,`${label}: after language blur`);
   if(width<900)await page.locator('.site-header').screenshot({path:path.join(root,'review-evidence',`header-ranca-sticky-${lang}-${file.replace('.html','')}-${width}.png`)});
  }
  // The full mascot stays inside the supporting-page home link's hit target.
  await page.goto(`${origin}/${lang}/about.html`);
  if(await page.locator('[data-consent-reject]').isVisible())await page.locator('[data-consent-reject]').click();
  await scrollNavigation(page,true);
  const mascotTarget=await page.locator('.site-header .brand-mark').boundingBox();
  await Promise.all([page.waitForURL(`${origin}/${lang}/`),page.mouse.click(mascotTarget.x+mascotTarget.width/2,mascotTarget.y+mascotTarget.height/2)]);
  await page.goto(`${origin}/${lang}/about.html`);
  await scrollNavigation(page,true);
  await page.locator('.site-header .brand').focus();
  await Promise.all([page.waitForURL(`${origin}/${lang}/`),page.keyboard.press('Enter')]);
  // Real keyboard and pointer navigation, on the local test origin only.
  await page.goto(`${origin}/${lang}/`);
  if(await page.locator('[data-consent-reject]').isVisible())await page.locator('[data-consent-reject]').click();
  await page.evaluate(()=>{document.body.tabIndex=-1;document.body.focus();document.body.removeAttribute('tabindex');});
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('hreflang')),'id','first header language is keyboard reachable');
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('hreflang')),'en','second header language is keyboard reachable');
  const keyboardLocale=lang==='id'?'en':'id';
  if(keyboardLocale==='id')await page.keyboard.press('Shift+Tab');
  await Promise.all([page.waitForURL(`${origin}/${keyboardLocale}/`),page.keyboard.press('Enter')]);
  await Promise.all([page.waitForURL(`${origin}/${lang}/`),page.locator(`.site-header .lang-btn[hreflang="${lang}"]`).click()]);
  // Locale switching still works while sticky mode preserves the focused slot.
  await page.locator(`.site-header .lang-btn[hreflang="${keyboardLocale}"]`).focus();
  await scrollNavigation(page,true);
  assert.equal((await navigationLayout(page)).languageOverlap,false,'sticky locale switch is not overlapped');
  await Promise.all([page.waitForURL(`${origin}/${keyboardLocale}/`),page.keyboard.press('Enter')]);
  await page.close();
 }
 // Asymmetric display cutouts use symmetric gutters, not a shifted visual center.
 for(const width of [320,390]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  await page.route('https://**/*',r=>new URL(r.request().url()).origin===origin ? r.continue() : r.abort());
  // The outlined reference is review-only and intentionally excluded from deployment.
  await page.route('**/tests/fixtures/ranca-header-outlined.svg',r=>r.fulfill({contentType:'image/svg+xml',body:previousSVG}));
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:38,left:54,right:8,bottom:0}});
  await page.goto(`${origin}/id/`);await page.evaluate(()=>document.fonts.ready);
  await scrollNavigation(page,true);
  const state=await navigationLayout(page);
  assert.ok(state.centerError<.5,`safe-area ${width}: pill remains viewport-centered`);
  assert.equal(state.header.top,38,`safe-area ${width}: top inset respected`);
  assert.equal(state.header.left,54,`safe-area ${width}: larger horizontal inset protects both sides`);
  assert.equal(state.header.right,width-54,`safe-area ${width}: symmetric right gutter`);
  assert.equal(state.overflow,false,`safe-area ${width}: no overflow`);
  navigationReport.push({lang:'id',file:'index.html',width,safeArea:{top:38,left:54,right:8},...state});
  await page.close();
 }
 // A legacy inline SVG may still carry the old IDs and ID-targeted styles.
 // Neither its definitions nor its styles may alter the self-contained header.
 {
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  await page.route('https://**/*',r=>new URL(r.request().url()).origin===origin ? r.continue() : r.abort());
  // The outlined reference is review-only and intentionally excluded from deployment.
  await page.route('**/tests/fixtures/ranca-header-outlined.svg',r=>r.fulfill({contentType:'image/svg+xml',body:previousSVG}));
  await page.goto(`${origin}/id/`);await page.evaluate(()=>document.fonts.ready);
  await page.locator('.brand-mark .rig-body-texture').evaluate(async node=>{const image=new Image();image.src=node.getAttribute('href');await image.decode();});
  const before=await page.locator('.site-header .brand').screenshot();
  const stylesBefore=await page.locator('.brand-mark .ranca-rig *').evaluateAll(nodes=>nodes.map(node=>{
   const style=getComputedStyle(node);return {tag:node.tagName,fill:style.fill,stroke:style.stroke,strokeWidth:style.strokeWidth,filter:style.filter,transform:style.transform};
  }));
  const isolation=await page.evaluate(previous=>{
   const probe=document.createElement('div');probe.id='legacy-header-isolation-probe';
   probe.style.cssText='position:fixed;left:-2000px;top:0;width:1px;height:1px;overflow:hidden;pointer-events:none';
   probe.innerHTML='<style>#header-ranca-cloud{fill:#ff0000!important;stroke:#ff00ff!important;stroke-width:200!important}#header-ranca-jade stop{stop-color:#ff0000!important}</style>'+previous;
   document.body.prepend(probe);
   const header=document.querySelector('.brand-mark .ranca-rig');
   const ids=[...document.querySelectorAll('[id]')].map(node=>node.id);
   const localReferences=[...probe.querySelectorAll('*')].flatMap(node=>[...node.attributes].flatMap(attribute=>[
    ...(attribute.name==='href'&&attribute.value.startsWith('#')?[attribute.value.slice(1)]:[]),
    ...[...attribute.value.matchAll(/url\(#([^)]*)\)/g)].map(match=>match[1])
   ]));
   return {headerIDs:header.querySelectorAll('[id]').length,headerDefinitions:header.querySelectorAll('defs,use,filter').length,
    headerLocalReferences:[...header.querySelectorAll('*')].some(node=>[...node.attributes].some(attribute=>attribute.value.includes('url(')||(attribute.name==='href'&&attribute.value.startsWith('#')))),
    uniqueDocumentIDs:ids.length===new Set(ids).size,legacyIDs:probe.querySelectorAll('[id]').length,
    legacyReferencesResolveLocally:localReferences.length>0&&localReferences.every(id=>probe.contains(document.getElementById(id)))};
  },previousSVG);
  assert.deepEqual(isolation,{headerIDs:0,headerDefinitions:0,headerLocalReferences:false,uniqueDocumentIDs:true,legacyIDs:7,legacyReferencesResolveLocally:true},
   'the header introduces no IDs or references that can collide with another inline SVG');
  assert.deepEqual(await page.locator('.brand-mark .ranca-rig *').evaluateAll(nodes=>nodes.map(node=>{
   const style=getComputedStyle(node);return {tag:node.tagName,fill:style.fill,stroke:style.stroke,strokeWidth:style.strokeWidth,filter:style.filter,transform:style.transform};
  })),stylesBefore,'legacy SVG ID-targeted styles leave every header body and feature style unchanged');
  assert.deepEqual(await page.locator('.site-header .brand').screenshot(),before,'the complete header pill remains pixel-identical beside colliding legacy SVG definitions/styles');
  report.push({artifact:'svg-id-style-isolation',...isolation});
  await page.close();
 }
 // A separate review-only sheet compares the actual original, previous and new
 // assets at a true 48px CSS width, then at six times that size. No labels or
 // comparison assets are inserted into the website or its clean motion clips.
 {
  const page=await browser.newPage({viewport:{width:1050,height:480},deviceScaleFactor:1,reducedMotion:'reduce'});
  await page.route('https://**/*',r=>new URL(r.request().url()).origin===origin ? r.continue() : r.abort());
  // The outlined reference is review-only and intentionally excluded from deployment.
  await page.route('**/tests/fixtures/ranca-header-outlined.svg',r=>r.fulfill({contentType:'image/svg+xml',body:previousSVG}));
  const samples=[['Original static','assets/mascots/ranca-cloud.webp'],['Previous outline','tests/fixtures/ranca-header-outlined.svg'],['Restored texture','assets/mascots/ranca-header.svg']];
  for(const scale of [1,6]){
   await page.setViewportSize({width:1050,height:scale===1?240:430});
   await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;padding:28px;background:#f4f5f2;color:#172820;font:16px/1.4 Arial,sans-serif}
    h1{font-size:22px;margin:0 0 6px}p{margin:0 0 24px;color:#526259}.samples{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
    figure{margin:0;text-align:center}figcaption{margin-bottom:12px;font-weight:600}.surface{display:flex;align-items:center;justify-content:center;padding:16px;background:white;border-radius:18px;min-height:${scale===1?68:242}px}
    img{display:block;width:${48*scale}px;height:${35*scale}px;object-fit:contain}
   </style></head><body><h1>Ranca at rest</h1><p>${scale===1?'Actual desktop header scale: 48px wide.':'Six-times enlargement of the same 48px assets for texture and edge review.'} All three are shown on white.</p><div class="samples">${samples.map(([label,file])=>`<figure><figcaption>${label}</figcaption><div class="surface"><img alt="${label}" src="${origin}/${file}"></div></figure>`).join('')}</div></body></html>`);
   await page.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
   assert.deepEqual(await page.locator('img').evaluateAll(images=>images.map(image=>[image.getBoundingClientRect().width,image.getBoundingClientRect().height])),Array(3).fill([48*scale,35*scale]));
   await page.screenshot({path:path.join(root,'review-evidence',`header-ranca-rest-comparison-${scale===1?'actual-48px':'enlarged-6x'}.png`)});
  }
  await page.close();
 }
 // With JavaScript disabled, the same complete SVG is the CSS fallback.
 for(const lang of ['id','en'])for(const width of [390,1440]){
  const page=await browser.newPage({javaScriptEnabled:false,viewport:{width,height:900}});
  await page.route('https://**/*',r=>new URL(r.request().url()).origin===origin ? r.continue() : r.abort());
  // The outlined reference is review-only and intentionally excluded from deployment.
  await page.route('**/tests/fixtures/ranca-header-outlined.svg',r=>r.fulfill({contentType:'image/svg+xml',body:previousSVG}));
  await page.goto(`${origin}/${lang}/`);
  const fallback=await page.locator('.brand-mark').evaluate(async el=>{
   const style=getComputedStyle(el),src=style.backgroundImage.match(/url\(["']?([^"')]+)/)?.[1];
   const image=new Image();image.src=src;await image.decode();
   return {src,fit:style.backgroundSize,ratio:image.naturalWidth/image.naturalHeight,width:el.offsetWidth,height:el.offsetHeight,pillHeight:el.closest('.brand').getBoundingClientRect().height,inline:el.querySelectorAll('svg').length};
  });
  assert.ok(fallback.src.endsWith('/assets/mascots/ranca-header.svg'));
  assert.equal(fallback.fit,'contain');assert.equal(fallback.ratio,741/532);
  assert.equal(fallback.width,width<900?44:48);assert.equal(fallback.height,width<900?32:35);assert.equal(fallback.pillHeight,48);assert.equal(fallback.inline,0);
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:800},reducedMotion:'no-preference'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('https://**/*',r=>new URL(r.request().url()).origin===origin ? r.continue() : r.abort());
  // The outlined reference is review-only and intentionally excluded from deployment.
  await page.route('**/tests/fixtures/ranca-header-outlined.svg',r=>r.fulfill({contentType:'image/svg+xml',body:previousSVG}));
 await page.addInitScript(()=>{
  window.mascotMotions=[];const animate=Element.prototype.animate;
  Element.prototype.animate=function(frames,options){
   const mark=this.closest('.site-header .brand-mark');
   if(mark)window.mascotMotions.push({key:mark.dataset.rancaBehavior,kind:mark.dataset.rancaMotion,target:this.getAttribute('class'),time:performance.now(),duration:options.duration});
   return animate.call(this,frames,options);
  };
 });
 await page.goto(`${origin}/id/`);
 if(await page.locator('[data-consent-reject]').isVisible())await page.locator('[data-consent-reject]').click();
 await page.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';});
 await scrollToSection(page,'#for-you');
 await page.waitForFunction(()=>window.mascotMotions.some(m=>m.key==='study'&&m.kind==='entry'&&m.duration===1900));
 assert.ok(await page.locator('.brand-mark').evaluate(el=>el.getAnimations({subtree:true}).length>=3),'multiple articulated parts are active');
 assert.ok(await page.locator('.brand-mark .rig-body').evaluate(el=>el.getAnimations().length===1),'whole-body position participates in the gesture');
 await page.emulateMedia({reducedMotion:'reduce'});await assertStopped(page,'reduced motion cancels every active part');
 let stopped=await motionCount(page);
 await scrollToSection(page,'#features');await page.waitForTimeout(5500);
 assert.equal(await motionCount(page),stopped,'reduced motion stops entry and idle');
 await page.emulateMedia({reducedMotion:'no-preference'});
 await scrollToSection(page,'#benefits');
 await page.waitForFunction(n=>window.mascotMotions.length>n,stopped,{timeout:10000});
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
 await assertStopped(page,'hidden document cancels every active part');stopped=await motionCount(page);
 await scrollToSection(page,'#cta');await page.waitForTimeout(5500);
 assert.equal(await motionCount(page),stopped,'hidden document stops entry and idle');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});
 await scrollToSection(page,'#faq');
 await page.waitForFunction(n=>window.mascotMotions.length>n,stopped,{timeout:10000});
 await page.evaluate(()=>{document.querySelector('.site-header').style.display='none';});
 await assertStopped(page,'offscreen header cancels every active part');stopped=await motionCount(page);
 await page.waitForTimeout(5500);assert.equal(await motionCount(page),stopped,'offscreen mascot stays paused');
 await page.evaluate(()=>{document.querySelector('.site-header').style.display='';});
 await scrollToSection(page,'#for-you');
 await page.waitForFunction(n=>window.mascotMotions.length>n,stopped,{timeout:10000});
 const pill=await page.locator('.site-header .brand').boundingBox(),wordmark=await page.locator('.brand-name').boundingBox();
 const download=page.locator('.site-header .nav-download');await download.waitFor({state:'visible'});await page.waitForTimeout(250);
 await checkLink(download);
 // Prevent leaving the local page; real pointer/Enter events must still reach the CTA.
 await download.evaluate(el=>el.addEventListener('click',event=>{event.preventDefault();window.headerPlayActivation={trusted:event.isTrusted,detail:event.detail,href:el.href};}));
 await download.click();
 assert.deepEqual(await page.evaluate(()=>window.headerPlayActivation),{trusted:true,detail:1,href:'https://play.google.com/store/apps/details?id=com.planora.labs'},'pointer activates existing Play link');
 await download.focus();await page.keyboard.press('Enter');
 assert.deepEqual(await page.evaluate(()=>window.headerPlayActivation),{trusted:true,detail:0,href:'https://play.google.com/store/apps/details?id=com.planora.labs'},'Enter activates existing Play link');
 await assertStopped(page,'resumed entry completes');
 assert.deepEqual(await page.locator('.site-header .brand').boundingBox(),pill,'resumed articulation keeps pill fixed');
 assert.deepEqual(await page.locator('.brand-name').boundingBox(),wordmark,'resumed articulation keeps lettering fixed');
 assert.deepEqual(errors,[]);await page.close();
 await fs.writeFile(path.join(root,'review-evidence','header-ranca-layout-report.json'),JSON.stringify(report,null,2));
 await fs.writeFile(path.join(root,'review-evidence','header-ranca-navigation-report.json'),JSON.stringify(navigationReport,null,2));
 console.log(`PASS — articulated SVG on ${report.length} locale/page/viewport views, 48px header, centered mobile sticky navigation, focus-safe language controls, asymmetric safe areas, desktop preservation, no-JS fallback, keyboard/pointer links, reduced motion, hidden/offscreen cancellation and resume`);
}finally{await browser?.close();await new Promise(r=>server.close(r));}
