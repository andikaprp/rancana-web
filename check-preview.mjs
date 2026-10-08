// Exercise the actual shared language switch without adding a build dependency.
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const strings=[{innerHTML:'English',dataset:{id:'Indonesia'}}];
const buttons=['id','en'].map(lang=>({dataset:{setLang:lang},classList:{toggle(){}},setAttribute(k,v){this[k]=v},addEventListener(k,v){this.click=v}}));
const storage=new Map();
const context={document:{documentElement:{},querySelectorAll:q=>q==='[data-id]'?strings:q==='[data-lang]'?[]:buttons},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},location:{search:''},navigator:{languages:['en']},URLSearchParams,Intl};
vm.runInNewContext(await readFile(new URL('lang.js',import.meta.url),'utf8'),context);
assert.equal(context.document.documentElement.lang,'id');assert.equal(strings[0].innerHTML,'Indonesia');
buttons[1].click();assert.equal(strings[0].innerHTML,'English');assert.equal(storage.get('lang'),'en');
buttons[0].click();assert.equal(strings[0].innerHTML,'Indonesia');assert.equal(buttons[0]['aria-pressed'],true);
console.log('PASS — Indonesian default, EN/ID switching, persistence and pressed state');
