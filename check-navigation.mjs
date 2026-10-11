import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('shared-nav.js',import.meta.url),'utf8');
const css=await readFile(new URL('preview.css',import.meta.url),'utf8');
const mobile=css.match(/@media\(max-width:899px\)\{\s*\.download\{min-height:[\s\S]*?\n\}/)?.[0];
assert.ok(mobile,'mobile sticky rules are scoped below the desktop breakpoint');
assert.match(mobile,/\.site-header\.is-sticky\{[\s\S]*?justify-content:center;/,'sticky mobile pill is flex-centered');
for(const inset of ['top','left','right'])assert.ok(mobile.includes(`env(safe-area-inset-${inset},0px)`),`${inset} safe area is respected`);
assert.match(mobile,/width:calc\(100% - var\(--mobile-nav-gutter\) - var\(--mobile-nav-gutter\)\)/,'symmetric safe gutters preserve viewport centering');
assert.match(mobile,/\.site-header\.is-sticky \.nav-slot:not\(:focus-within\)\{display:none\}/,'only the unfocused empty slot leaves the mobile layout');
assert.match(mobile,/\.site-header\.is-sticky \.nav-slot:focus-within\{margin-left:auto\}/,'focused language slot retains the non-overlapping split layout');
assert.match(css,/\.site-header\.is-sticky:not\(:has\(\.nav-slot:focus-within\)\) \.brand-name\{display:block\}/,'centered narrow-mobile pill restores the full wordmark');
assert.doesNotMatch(mobile,/\.brand[^{}]*\{[^}]*\b(?:transform|transition|animation)\s*:/,'mobile positioning adds no brand transforms or animation');
for(const supporting of [false,true]){
 const language={hidden:false},download={hidden:true};
 let focused=false,bottom=250,sticky=false,focusout;
 const events={};
 const boundary={getBoundingClientRect:()=>({bottom}),getClientRects:()=>[{}]};
 const hiddenBoundary={getBoundingClientRect:()=>({bottom:0}),getClientRects:()=>[]};
 const slot={closest:()=>({classList:{toggle:(_,on)=>sticky=on}}),querySelector:s=>s==='.lang'?language:download,contains:()=>focused,addEventListener:(_,fn)=>focusout=fn};
 const context={document:{activeElement:{},querySelector:s=>s.includes('nav-slot')?slot:s.includes('hero-ctas')?(supporting?null:boundary):hiddenBoundary,querySelectorAll:s=>s.includes('data-nav-boundary')?[hiddenBoundary,boundary]:[]},addEventListener:(name,fn)=>events[name]=fn,queueMicrotask:fn=>fn(),requestAnimationFrame:fn=>fn()};
 vm.runInNewContext(code,context);
 assert.equal(sticky,false);assert.equal(language.hidden,false);
 const scrollTo=b=>{bottom=b;events.scroll()};
 scrollTo(-1);assert.equal(sticky,true);assert.equal(download.hidden,false);
 for(const b of [1,-1,2,-2,7]){scrollTo(b);assert.equal(sticky,true);assert.equal(download.hidden,false)}
 scrollTo(8);assert.equal(sticky,false);assert.equal(language.hidden,false);
 focused=true;scrollTo(-20);assert.equal(sticky,true);assert.equal(language.hidden,false);
 for(const b of [-60,-2,7]){scrollTo(b);assert.equal(sticky,true);assert.equal(language.hidden,false);assert.equal(download.hidden,true)}
 focusout();assert.equal(language.hidden,false,'moving focus within the slot does not hide its control');
 focused=false;focusout();assert.equal(language.hidden,true);
 // A desktop download control is likewise retained while focused on reverse scroll.
 focused=true;scrollTo(250);assert.equal(sticky,false);assert.equal(download.hidden,false);
 focused=false;focusout();assert.equal(language.hidden,false);assert.equal(download.hidden,true);
 for(let pass=0;pass<3;pass++){
  scrollTo(-40);assert.equal(sticky,true);assert.equal(language.hidden,true);
  scrollTo(250);assert.equal(sticky,false);assert.equal(language.hidden,false);
 }
 scrollTo(250);assert.equal(download.hidden,true);
}
console.log('PASS — Home CTA/supporting intro, jitter deadband, repeated reverse, focus preservation, mobile-only centering and safe-area CSS');
