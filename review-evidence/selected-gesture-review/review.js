(()=>{'use strict';
const {make,configs,hands,layouts,pathOf,world,face}=selectedGlyphs;
const bodyMetrics={ranca:{height:500,width:622,yMax:516},cana:{height:496,width:698,yMax:512}};
const maps={ranca:{face:[-115,-249,3],left:[83.6,-192.4,2.6],right:[30.2,-207.4,2.6]},cana:{face:[29.6,-293.4,3.2],left:[70.6,-220.8,2.6],right:[87.2,-207.4,2.6]}};
const T=([x,y,s])=>`translate(${x} ${y}) scale(${s})`;
function limb(key,side,after){const cfg=configs[key],base=layouts[key][0][side?'r':'l'],h=base.slice(),c=hands[h[3]].map(r=>r.slice());if(key==='cana')for(let n=1;n<c.length;n++)for(let j=1;j<6;j+=2)if(c[n][j]<0)c[n][j]*=.93;
 const g=make('g',{'data-limb':side?'resting':'active',transform:T(maps[key][side?'right':'left']),fill:'none',stroke:cfg.color,'stroke-width':cfg.stroke,'stroke-linecap':'round','stroke-linejoin':'round'});
 if(key==='ranca'&&side===1){h[0]=203;h[1]=(405+207.4)/2.6+11;h[2]=180;}
 if(side===0)h[4]*=-1;
 const end=c.at(-1).slice(4),last=c.at(-1).slice(2,4),wrist=world(end,h),incoming=world([end[0]+(end[0]-last[0])*2,end[1]+(end[1]-last[1])*2],h),shoulder=side?cfg.rightShoulder:cfg.leftShoulder;
 const d=key==='ranca'&&side===1?`M ${shoulder.join(' ')} L ${wrist.join(' ')}`:`M ${shoulder.join(' ')} C ${h[5]} ${h[6]} ${incoming.join(' ')} ${wrist.join(' ')}`;
 g.append(make('path',{'data-arm':side?'right':'left',d}),make('path',{'data-palm':side?'right':'left',d:pathOf(c),transform:`translate(${h[0]} ${h[1]}) rotate(${h[2]}) scale(${h[4]} 1)`}));return g;}
function marks(key,after){const f=face(key,0,0);f.setAttribute('data-preserved-face',key);const eyes=[...f.children].filter(n=>n.tagName.toLowerCase()==='g');
 if(key==='ranca'){for(const eye of eyes)eye.replaceChildren(make('path',{d:'M -8 1 Q 2 -8 12 1',fill:'none','data-line-eye':'ranca'}));const brows=[...f.children].filter(n=>n.tagName.toLowerCase()==='path');brows[0].setAttribute('d','M 135 142 Q 143 139 150 141');brows[1].setAttribute('d','M 171 128 Q 179 125 186 127');}
 if(key==='cana'){eyes[0].replaceChildren(make('path',{d:'M -7 -3 Q 1 -2 12 -6',fill:'none','data-line-eye':'cana'}),make('path',{d:'M -3.91138 -3.52797 C -6.57121 -5.12931 -10.72891 -6.02139 -11.8 -10.4 C -11.27109 -5.57861 -7.22879 -3.67069 -4.81502 -2.08803 Z M 5.56498 -4.74813 C 3.36391 -5.51244 -0.40192 -7.18343 -1 -11.3 C -0.99808 -6.81657 2.63609 -4.08756 4.96942 -3.15587 Z',fill:configs.cana.color,stroke:'none','stroke-width':1.4,'data-lashes':'cana'}));eyes[1].replaceChildren(make('path',{d:'M -11 -3 Q 1 -4 12 -7',fill:'none','data-line-eye':'cana'}),make('path',{d:'M -4.71046 -2.85133 C -2.25045 -4.03825 0.5264 -7.07365 -0.3 -10.9 C -0.1264 -7.32635 -3.14955 -5.36175 -5.41454 -4.39867 Z M 7.88161 -5.09319 C 10.60245 -6.25938 15.48763 -8.80058 15.5 -14.5 C 14.91237 -9.19942 9.99755 -7.74062 7.23839 -6.66681 Z',fill:configs.cana.color,stroke:'none','stroke-width':1.4,'data-lashes':'cana'}));if(after){
   // Mirror the right-eye direction into the shorter left-eye frame.
   // Keep both eye origins, preserve the left lid's 19-unit width and 3-unit rise,
   // and use a slightly gentler tilt for the asymmetric sassy expression.
   const mirrorToLeft=d=>{let i=0;return d.replace(/-?\d*\.?\d+/g,n=>{const value=i++%2===0?2.5-(Number(n)-.5)*19/23:.75*Number(n)-.75;return String(Number(value.toFixed(5)));});};
   eyes[0].setAttribute('transform','translate(72 167) rotate(8)');
   eyes[0].querySelector('[data-line-eye]').setAttribute('d',mirrorToLeft(eyes[1].querySelector('[data-line-eye]').getAttribute('d')));
   eyes[0].querySelector('[data-lashes]').setAttribute('d',mirrorToLeft(eyes[1].querySelector('[data-lashes]').getAttribute('d')));
 }f.lastElementChild.setAttribute('d','M 86 186 Q 98 194 112 181');}
 {const mouth=f.lastElementChild;for(const node of [...f.children])if(node.tagName.toLowerCase()==='path'&&node!==mouth)node.remove();}
 const g=make('g',{transform:T(maps[key].face),'data-face-map':key});g.append(f);return g;}

function character(key,after){const scale=key==='ranca'?1:.9*bodyMetrics.ranca.height/bodyMetrics.cana.height,tx=key==='ranca'?20:860,ty=616-bodyMetrics[key].yMax*scale,g=make('g',{'data-character':key,'data-body-scale':scale,transform:`translate(${tx} ${ty}) scale(${scale})`});g.append(make('image',{href:key+'-body.webp',width:key==='ranca'?741:745,height:key==='ranca'?532:528,'data-body-art':key}),marks(key,after),limb(key,0,after),limb(key,1,after));return g;}
for(const after of [false,true]){const svg=make('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:'0 0 1600 715','data-comparison':after?'after':'before'});svg.append(character('ranca',after),character('cana',after));for(const [x,label]of[[434,'Ranca · playful'],[1191,'Cana · sassy']]){const text=make('text',{x,y:676});text.textContent=label;svg.append(text);}document.querySelector('#'+(after?'after':'before')+' .canvas').append(svg);}
window.selectedReview={ready:true,bodyMetrics,maps,comparisonBase:'12db3276be39c5d2fe391e09d2d3be51121aa9c7',baseline:'e8af2396b35c1ba6c5752a8a83cff2eaa3100725'};
})();
