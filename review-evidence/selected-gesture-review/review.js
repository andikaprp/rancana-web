(()=>{'use strict';
const {make,configs,hands,layouts,pathOf,world,face}=selectedGlyphs;
const bodyMetrics={ranca:{height:500,width:622,yMax:516},cana:{height:496,width:698,yMax:512}};
const maps={ranca:{face:[-115,-249,3],left:[83.6,-192.4,2.6],right:[30.2,-207.4,2.6]},cana:{face:[29.6,-293.4,3.2],left:[70.6,-220.8,2.6],right:[87.2,-207.4,2.6]}};
const T=([x,y,s])=>`translate(${x} ${y}) scale(${s})`;
function limb(key,side,after){const cfg=configs[key],base=layouts[key][0][side?'r':'l'],h=base.slice(),c=hands[h[3]].map(r=>r.slice());if(key==='cana')for(let n=1;n<c.length;n++)for(let j=1;j<6;j+=2)if(c[n][j]<0)c[n][j]*=.93;
 const g=make('g',{'data-limb':side?'resting':'active',transform:T(maps[key][side?'right':'left']),fill:'none',stroke:cfg.color,'stroke-width':cfg.stroke,'stroke-linecap':'round','stroke-linejoin':'round'});
 if(key==='ranca'&&side===1){h[0]=203;h[1]=(405+207.4)/2.6+11;h[2]=180;}
 if(after&&side===0)h[4]*=-1;
 const end=c.at(-1).slice(4),last=c.at(-1).slice(2,4),wrist=world(end,h),incoming=world([end[0]+(end[0]-last[0])*2,end[1]+(end[1]-last[1])*2],h),shoulder=side?cfg.rightShoulder:cfg.leftShoulder;
 const d=key==='ranca'&&side===1?`M ${shoulder.join(' ')} L ${wrist.join(' ')}`:`M ${shoulder.join(' ')} C ${h[5]} ${h[6]} ${incoming.join(' ')} ${wrist.join(' ')}`;
 g.append(make('path',{'data-arm':side?'right':'left',d}),make('path',{'data-palm':side?'right':'left',d:pathOf(c),transform:`translate(${h[0]} ${h[1]}) rotate(${h[2]}) scale(${h[4]} 1)`}));return g;}
function marks(key,after){const f=face(key,0,0);f.setAttribute('data-preserved-face',key);const eyes=[...f.children].filter(n=>n.tagName.toLowerCase()==='g');
 if(key==='ranca'){for(const eye of eyes)eye.replaceChildren(make('path',{d:after?'M -8 1 Q 2 -8 12 1':'M -8 1 Q 0 -8 8 1',fill:'none','data-line-eye':'ranca'}));const brows=[...f.children].filter(n=>n.tagName.toLowerCase()==='path');brows[0].setAttribute('d','M 135 142 Q 143 139 150 141');brows[1].setAttribute('d','M 171 128 Q 179 125 186 127');}
 if(key==='cana'){eyes[0].replaceChildren(make('path',{d:'M -7 -3 Q 1 -2 12 -6',fill:'none','data-line-eye':'cana'}),make('path',{d:after?'M -7 -3 Q -8.5 -4 -9.5 -6.5 M -8.5 -4.5 L -9.5 -7.5 M -7 -3.5 L -8 -6.5':'M -7 -3 Q -10 -5 -12 -10 M -10 -6 L -12 -12 M -7 -4 L -9 -10',fill:'none','stroke-width':after?1.4:2.8,'data-lashes':'cana'}));eyes[1].replaceChildren(make('path',{d:'M -11 -3 Q 1 -4 12 -7',fill:'none','data-line-eye':'cana'}),make('path',{d:after?'M 12 -7 Q 15 -8 16.5 -10 M 14 -8 L 15 -10 M 12.5 -7.5 L 14 -9':'M 12 -7 Q 18 -9 21 -13 M 16 -9 L 18 -13 M 13 -8 L 16 -11',fill:'none','stroke-width':after?1.4:2.8,'data-lashes':'cana'}));f.lastElementChild.setAttribute('d','M 86 186 Q 98 194 112 181');}
 {const mouth=f.lastElementChild;for(const node of [...f.children])if(node.tagName.toLowerCase()==='path'&&node!==mouth)node.remove();}
 const g=make('g',{transform:T(maps[key].face),'data-face-map':key});g.append(f);return g;}

function character(key,after){const scale=key==='ranca'?1:.9*bodyMetrics.ranca.height/bodyMetrics.cana.height,tx=key==='ranca'?20:860,ty=616-bodyMetrics[key].yMax*scale,g=make('g',{'data-character':key,'data-body-scale':scale,transform:`translate(${tx} ${ty}) scale(${scale})`});g.append(make('image',{href:key+'-body.webp',width:key==='ranca'?741:745,height:key==='ranca'?532:528,'data-body-art':key}),marks(key,after),limb(key,0,after),limb(key,1,after));return g;}
for(const after of [false,true]){const svg=make('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:'0 0 1600 715','data-comparison':after?'after':'before'});svg.append(character('ranca',after),character('cana',after));for(const [x,label]of[[434,'Ranca · playful'],[1191,'Cana · sassy']]){const text=make('text',{x,y:676});text.textContent=label;svg.append(text);}document.querySelector('#'+(after?'after':'before')+' .canvas').append(svg);}
window.selectedReview={ready:true,bodyMetrics,maps,comparisonBase:'a4bde1cb7d2f7e3f9abffea6a1241fda7ee15939',baseline:'e8af2396b35c1ba6c5752a8a83cff2eaa3100725'};
})();
