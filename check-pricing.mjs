import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

const buttons = [];
const prices = [];
const periods = [];
const toggles = ['id','en'].map(lang => {
  for (const billing of ['monthly','yearly']) buttons.push({dataset:{billing},setAttribute(key,value){this[key]=value;}});
  for (const [monthly,yearly] of [['0','0'],['15.000','159.000'],['23.000','210.000']]) {
    prices.push({dataset:{priceMonthly:monthly,priceYearly:yearly},textContent:`Rp${monthly}`});
    periods.push({closest:()=>({dataset:{lang}})});
  }
  return {hidden:true,addEventListener(type,callback){this.click=callback;}};
});
const document = {querySelectorAll(selector){return ({'.billing-toggle':toggles,'[data-billing]':buttons,'[data-price-monthly]':prices,'[data-price-period]':periods})[selector];}};
vm.runInNewContext((await fs.readFile('shared-nav.js','utf8')).split('// One billing selection')[1].replace(/^[^\n]*\n/, ''),{document});
assert.ok(toggles.every(t=>!t.hidden));
for (const index of [1,0,3,2]) {
  toggles[index<2?0:1].click({target:{closest:()=>buttons[index]}});
  const yearly=index%2===1;
  assert.deepEqual(prices.map(p=>p.textContent),Array(2).fill(yearly?['Rp0','Rp159.000','Rp210.000']:['Rp0','Rp15.000','Rp23.000']).flat());
  assert.ok(buttons.every(b=>b['aria-pressed']===String(b.dataset.billing===(yearly?'yearly':'monthly'))));
  assert.ok(periods.every((p,i)=>p.textContent===(i<3?(yearly?' / tahun':' / bulan'):(yearly?' / year':' / month'))));
}
// Built locale pages: no [data-lang] wrapper, period label follows <html lang>.
for (const lang of ['id','en']) {
  const lb=[{dataset:{billing:'monthly'},setAttribute(){}},{dataset:{billing:'yearly'},setAttribute(){}}];
  const lp=[['0','0'],['15.000','159.000'],['23.000','210.000']].map(([m,y])=>({dataset:{priceMonthly:m,priceYearly:y},textContent:`Rp${m}`}));
  const lper=lp.map(()=>({closest:()=>null}));
  const lt=[{hidden:true,addEventListener(type,callback){this.click=callback;}}];
  const ldoc={documentElement:{lang},querySelectorAll(selector){return ({'.billing-toggle':lt,'[data-billing]':lb,'[data-price-monthly]':lp,'[data-price-period]':lper})[selector];}};
  vm.runInNewContext((await fs.readFile('shared-nav.js','utf8')).split('// One billing selection')[1].replace(/^[^\n]*\n/, ''),{document:ldoc});
  for (const yearly of [true,false,true]) {
    lt[0].click({target:{closest:()=>lb[yearly?1:0]}});
    assert.deepEqual(lp.map(p=>p.textContent),yearly?['Rp0','Rp159.000','Rp210.000']:['Rp0','Rp15.000','Rp23.000']);
    assert.ok(lper.every(p=>p.textContent===(lang==='en'?(yearly?' / year':' / month'):(yearly?' / tahun':' / bulan'))));
  }
}
for (const file of ['premium.html','id/premium.html','en/premium.html']) {
  const html=await fs.readFile(file,'utf8');
  const panels=file==='premium.html'?2:1;
  assert.equal((html.match(/class="billing-toggle"/g)||[]).length,panels);
  assert.equal((html.match(/data-price-monthly="15.000" data-price-yearly="159.000"/g)||[]).length,panels);
  assert.equal((html.match(/data-price-monthly="23.000" data-price-yearly="210.000"/g)||[]).length,panels);
  assert.match(html,/src="(?:\.\.\/)?shared-nav\.js(?:\?[^"]*)?"/);
}
console.log('PASS: shared billing state, both locales, repeated monthly/yearly changes, exact catalog prices and generated script references');
