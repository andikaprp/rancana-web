import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const code=await readFile(new URL('lang.js',import.meta.url),'utf8');
for(const name of ['contact','restore','who-we-are','our-purpose']){
 const anchors=['en','id'].map(lang=>({id:lang==='en'?name:'',dataset:{anchor:name},removeAttribute(k){if(k==='id')this.id='';},scrollIntoView(){this.scrolled=true;}}));
 const blocks=['en','id'].map((lang,i)=>({dataset:{lang},querySelectorAll(){return [anchors[i]];}}));
 const buttons=['en','id'].map(lang=>({dataset:{setLang:lang},classList:{toggle(){}},setAttribute(){},addEventListener(k,cb){this.click=cb;}}));
 const context={document:{documentElement:{},querySelectorAll(q){return q==='[data-id]'?[]:q==='[data-lang]'?blocks:buttons;},getElementById(id){return anchors.find(a=>a.id===id);}},location:{search:'?lang=id',hash:'#'+name},localStorage:{getItem(){throw new Error('storage disabled');},setItem(){throw new Error('storage disabled');}},navigator:{languages:['en']},URLSearchParams,Intl};
 vm.runInNewContext(code,context);
 assert.equal(anchors[0].id,'');assert.equal(anchors[1].id,name);assert.equal(anchors[1].scrolled,true);
 buttons[0].click();assert.equal(anchors[0].id,name);assert.equal(anchors[1].id,'');assert.equal(anchors[0].scrolled,true);
 context.location.hash='#%';buttons[1].click();assert.equal(anchors[1].id,name);
}
console.log('PASS — contact/restore follow active language, scroll target, disabled storage and malformed fragments');
