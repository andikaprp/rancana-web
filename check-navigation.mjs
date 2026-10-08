import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('shared-nav.js',import.meta.url),'utf8');
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
 focused=false;focusout();assert.equal(language.hidden,true);
 scrollTo(250);assert.equal(download.hidden,true);
}
console.log('PASS — Home CTA/supporting visible intro, jitter deadband, reverse and focus preservation');
