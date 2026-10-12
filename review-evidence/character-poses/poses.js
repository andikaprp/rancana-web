(async()=>{'use strict';
const NS='http://www.w3.org/2000/svg',make=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;},clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t,ease=x=>x*x*x*(x*(x*6-15)+10),lerp=(a,b,t)=>a.map((x,i)=>Array.isArray(x)?lerp(x,b[i],t):mix(x,b[i],t));
const poseNames=['Wave','Present','Point','Hold','Peek'],emotions=['happy','curious','thinking','playful','surprised'],duration=13000;
const configs={ranca:{width:244,color:'#f6fff8',stroke:3.6,leftShoulder:[77,203],rightShoulder:[223,190],faceROI:[118,109,195,187],handROI:[192,186,235,230]},cana:{width:236,color:'#fff9fc',stroke:3.7,leftShoulder:[57,209],rightShoulder:[175,194],faceROI:[52,135,140,194],handROI:[168,149,224,220]}};
const open=[[-4,11],[-8,9,-11,5,-14,0],[-18,-5,-17,-9,-14,-9],[-11,-9,-10,-5,-7,-3],[-8,-7,-9,-12,-9,-15],[-9,-20,-4,-21,-3,-16],[-2,-14,-1,-11,-1,-10],[-1,-12,-1,-16,-1,-18],[-1,-23,5,-23,5,-18],[5,-16,5,-12,5,-10],[5.7,-11.7,6.3,-13.3,7,-15],[9,-20,14,-18,13,-13],[12.3,-9,11.7,-5,11,-1],[10,4,5,8,4,11]];
const point=[[-4,11],[-8,9,-11,5,-13,1],[-17,-3,-16,-7,-13,-7],[-10,-7,-9,-4,-7,-3],[-8,-8,-8,-16,-8,-21],[-8,-26,-3,-26,-3,-21],[-3,-14,-2,-7,-2,-4],[-1,-5,1,-6,3,-5],[5,-5,7,-3,6,-1],[5,-.5,4,0,4,1],[7,-2,9,-2,11,0],[14,3,12,6,10,7],[8,8,6,9,5,10],[5,10.4,4,9,4,11]];
const relaxed=[[-4,11],[-8,9,-11,4,-12,0],[-15,-4,-13,-8,-10,-7],[-7,-6,-7,-3,-5,-2],[-5,-5,-6,-8,-5,-10],[-3,-13,0,-12,0,-9],[0,-7,0,-5,0,-4],[1,-6,2,-8,3,-9],[5,-11,8,-9,7,-6],[6,-4,6,-3,5,-2],[7,-4,9,-5,11,-3],[13,-1,11,3,9,5],[8,7,7,9,6,10],[5,10.5,4,9,4,11]];
const grip=[[-4,11],[-8,9,-11,5,-12,0],[-15,-4,-13,-8,-10,-7],[-7,-6,-7,-3,-5,-2],[-6,-5,-6,-9,-4,-11],[-1,-15,4,-13,3,-9],[3,-7,1,-6,0,-5],[2,-7,5,-8,7,-6],[10,-4,9,-1,6,0],[5,0,4,1,3,2],[6,-1,9,0,11,2],[14,5,11,9,8,10],[6,11,5,11,4,11],[4,12,4,14,4,15]];
const hands={open,point,relaxed,grip};
// Wrist position, rotation, contour, mirror, elbow. Each character has its own placements.
const layouts={
 ranca:[
  {l:[64,174,-8,'open',1,59,222],r:[183,224,174,'relaxed',-1,214,211],body:[-2,0,-2]},
  {l:[60,207,-72,'open',1,101,234],r:[183,224,174,'relaxed',-1,214,211],body:[4,1,0]},
  {l:[71,192,-26,'point',1,54,229],r:[183,224,174,'relaxed',-1,214,211],body:[-4,-1,-1]},
  {l:[94,207,0,'grip',1,64,231],r:[209,211,17,'grip',-1,229,226],body:[2,0,1]},
  {l:[133,137,78,'open',1,88,218],r:[183,224,174,'relaxed',-1,214,211],body:[-7,-10,1]}
 ],
 cana:[
  {l:[34,183,-4,'open',1,23,225],r:[178,224,170,'relaxed',-1,203,206],body:[3,0,0]},
  {l:[42,214,-75,'open',1,78,242],r:[178,224,170,'relaxed',-1,203,206],body:[-4,2,-1]},
  {l:[55,226,186,'relaxed',1,35,207],r:[200,181,18,'point',-1,204,226],body:[4,2,-1]},
  {l:[78,216,-23,'grip',1,42,241],r:[150,217,27,'grip',-1,184,242],body:[-2,0,-1]},
  {l:[55,226,186,'relaxed',1,35,207],r:[112,141,-78,'open',-1,179,215],body:[7,10,1]}
 ]
};
function pathOf(contour){return`M ${contour[0].join(' ')} `+contour.slice(1).map(c=>`C ${c.join(' ')}`).join(' ');}
function world(p,hand){const[x,y,angle,,mirror]=hand,a=angle*Math.PI/180;return[x+p[0]*mirror*Math.cos(a)-p[1]*Math.sin(a),y+p[0]*mirror*Math.sin(a)+p[1]*Math.cos(a)];}
const cleanplates={},repairReport={};
async function cleanPlate(key,cfg){
 const src=new Image();src.src=key+'-base.svg';await src.decode();const canvas=document.createElement('canvas');canvas.width=cfg.width;canvas.height=320;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(src,0,0);const data=ctx.getImageData(0,0,cfg.width,320).data,mask=new Uint8Array(cfg.width*320),seeds=[];
 for(const roi of [cfg.faceROI,cfg.handROI]){const[x0,y0,x1,y1]=roi;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*cfg.width+x)*4,cs=[data[i],data[i+1],data[i+2]];if(Math.min(...cs)>204&&Math.max(...cs)-Math.min(...cs)<39&&data[i+3]>2)seeds.push(y*cfg.width+x);}}
 for(const i of seeds){const x=i%cfg.width,y=Math.floor(i/cfg.width);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(dx*dx+dy*dy<=5&&x+dx>=0&&x+dx<cfg.width&&y+dy>=0&&y+dy<320)mask[(y+dy)*cfg.width+x+dx]=1;}
 const ids=[];for(let i=0;i<mask.length;i++)if(mask[i])ids.push(i);
 // Solve premultiplied RGBA only inside removed marks, including covered edge pixels.
 const rgba=new Float64Array(mask.length*4);for(let i=0;i<mask.length;i++){const a=data[i*4+3]/255;for(let k=0;k<3;k++)rgba[i*4+k]=data[i*4+k]*a;rgba[i*4+3]=data[i*4+3];}
 for(const i of ids){const inside=i%cfg.width<(key==='ranca'?215:208);const a=inside?255:0;for(let k=0;k<4;k++)rgba[i*4+k]=k===3?a:(key==='ranca'?[5,186,124]:[250,65,147])[k]*a/255;}
 for(let pass=0;pass<1100;pass++)for(const i of ids)for(let k=0;k<4;k++)rgba[i*4+k]=(rgba[(i-1)*4+k]+rgba[(i+1)*4+k]+rgba[(i-cfg.width)*4+k]+rgba[(i+cfg.width)*4+k])/4;
 const diagnostic=make('g',{'data-mask':key,fill:'#5539ff',opacity:'.6',display:'none','shape-rendering':'crispEdges'});
 const pixels=ctx.getImageData(0,0,cfg.width,320);
 for(const i of ids){const x=i%cfg.width,y=Math.floor(i/cfg.width),solvedAlpha=Math.max(0,Math.min(255,rgba[i*4+3]));let alpha=solvedAlpha;
  if(x>=cfg.handROI[0]&&y>=cfg.handROI[1]){
   // Reconstruct only covered edge pixels along the neighboring lobe's curve.
   // A narrow AA edge replaces the removed arm rather than a diffuse color halo.
   const edge=key==='ranca'?225-.25*(y-190)-.006*(y-190)**2:210-(y<194?.018:.01)*(y-194)**2;
   alpha=clamp(edge-x)*255;
  }
  for(let k=0;k<3;k++)pixels.data[i*4+k]=Math.round(solvedAlpha>1?rgba[i*4+k]*255/solvedAlpha:0);pixels.data[i*4+3]=Math.round(alpha);
  diagnostic.append(make('rect',{x,y,width:1,height:1}));
 }
 ctx.putImageData(pixels,0,0);const clean=canvas.toDataURL('image/png');
 repairReport[key]={pixels:ids.length,faceROI:cfg.faceROI,otherHandROI:cfg.handROI,coveredEdgePixels:ids.filter(i=>data[i*4+3]<250).length};
 const test=new Image();test.src=clean;await test.decode();const preview=make('svg',{viewBox:`0 0 ${cfg.width} 320`,width:cfg.width,height:320});preview.append(make('image',{href:clean,width:cfg.width,height:320}),diagnostic);document.querySelector('#diagnostics').append(preview);return clean;
}
for(const[key,cfg]of Object.entries(configs))cleanplates[key]=await cleanPlate(key,cfg);
const bean=[[4,-12],[-4,-16,-10,-9,-10,-2],[-10,9,-2,15,5,11],[10,8,10,1,8,-5],[8,2,1,2,-1,-4],[-3,-9,0,-12,4,-12]],half=[[8,-4],[0,-4,-8,-4,-8,-4],[-8,9,2,11,6,6],[8,3,8,0,8,-4],[8,-4,8,-4,8,-4],[8,-4,8,-4,8,-4]];
function face(key,expression,blink){
 const cfg=configs[key],g=make('g',{fill:cfg.color,stroke:cfg.color,'stroke-width':cfg.stroke,'stroke-linecap':'round','stroke-linejoin':'round','data-expression':emotions[expression]});
 const eyes=key==='ranca'?[[147,157,-17],[182,143,-17]]:[[72,167,-12],[117,166,-12]],openings=key==='ranca'?[[1,1],[1,.9],[.65,.85],[1,1],[1.14,1.14]]:[[0,0],[.65,.18],[0,.05],[0,0],[.9,.75]],eyeOp=openings[expression];
 eyes.forEach(([x,y,a],i)=>{let close=blink;if(expression===3&&i===(key==='ranca'?1:0))close=Math.max(close,.96);const eg=make('g',{transform:`translate(${x} ${y}) rotate(${a})`});const contour=key==='cana'?lerp(half,bean,eyeOp[i]):bean;const e=make('path',{d:pathOf(contour)+' Z',stroke:'none',transform:`scale(${key==='cana'?.92:1} ${Math.max(.05,(1-close)*(key==='ranca'?eyeOp[i]:1))})`});eg.append(e);if(key==='cana')eg.append(make('path',{d:`M ${i===0?-15:-11} -4 L ${i===0?15:11} -4`,fill:'none',opacity:Math.max(close,1-eyeOp[i])}));if(key==='ranca'&&close>.7)eg.append(make('path',{d:'M -8 0 Q 0 -1 7 0',fill:'none',opacity:(close-.7)/.3}));g.append(eg);});
 const brow=(d)=>g.append(make('path',{d,fill:'none'}));
 if(key==='ranca'){
  const lift=expression===1?-4:expression===4?-5:0;
  if(expression!==4)brow(`M 122 ${146+lift} Q 128 ${126+lift} 141 ${133+lift}`);brow(expression===2?'M 160 122 Q 170 122 178 124':`M 160 ${124+(expression===4?-3:0)} Q 166 ${108+(expression===4?-3:0)} 179 ${117+(expression===4?-3:0)}`);
 }else{brow(expression===4?'M 54 149 Q 69 140 81 146':expression===2?'M 108 144 Q 125 135 134 143':'M 107 150 Q 125 135 135 141');if(expression===1)brow('M 56 149 Q 69 141 79 146');}
 let mouth;
 if(key==='ranca'){
  if(expression===0)mouth=make('path',{d:'M 158 173 Q 166 171 177 166 C 179 176 174 185 168 184 C 161 184 158 180 158 173 Z',stroke:'none'});
  else if(expression===4)mouth=make('ellipse',{cx:169,cy:175,rx:4.5,ry:7,stroke:'none',transform:'rotate(-16 169 175)'});
  else mouth=make('path',{d:expression===1?'M 161 176 Q 167 181 173 175':expression===2?'M 162 178 Q 168 175 173 176':'M 159 176 Q 170 186 179 173',fill:'none'});
 }else{
  if(expression===4)mouth=make('ellipse',{cx:98,cy:188,rx:4,ry:5.5,stroke:'none'});
  else mouth=make('path',{d:expression===0?'M 82 185 Q 96 198 113 182':expression===1?'M 84 187 Q 97 194 110 183':expression===2?'M 88 190 Q 98 192 107 186':'M 83 186 Q 98 198 115 179',fill:'none'});
 }g.append(mouth);return g;
}
let counter=0;
function rig(key){const cfg=configs[key],svg=make('svg',{xmlns:NS,viewBox:`-12 -12 ${cfg.width+24} 344`,width:cfg.width+24,height:344,class:'character',role:'img','aria-label':key+' animated pose review','data-character':key}),body=make('g',{'data-body':key}),art=make('image',{href:cleanplates[key],width:cfg.width,height:320,'data-original-art':key});body.append(art);const faceLayer=make('g',{'data-face':key}),prop=make('g',{'data-prop':key}),limbs=make('g',{fill:'none',stroke:cfg.color,'stroke-width':cfg.stroke,'stroke-linecap':'round','stroke-linejoin':'round'});const larm=make('path',{'data-arm':'left'}),rarm=make('path',{'data-arm':'right'}),lpalm=make('path',{'data-palm':'left'}),rpalm=make('path',{'data-palm':'right'});limbs.append(larm,rarm,lpalm,rpalm);body.append(faceLayer,prop,limbs);const id=++counter,defs=make('defs'),occlusion=[];
 for(let side=0;side<2;side++){const mask=make('mask',{id:`palm-occlusion-${id}-${side}`,maskUnits:'userSpaceOnUse',x:-100,y:-100,width:500,height:500});mask.append(make('rect',{x:-100,y:-100,width:500,height:500,fill:'white'}));const front=make('path',{fill:'black',stroke:'black','stroke-width':cfg.stroke+1,'stroke-linejoin':'round'}),join=make('circle',{r:3.5,fill:'white'});mask.append(front,join);defs.append(mask);[larm,rarm][side].setAttribute('mask',`url(#palm-occlusion-${id}-${side})`);occlusion.push({front,join});}
 svg.append(defs,body);return{key,cfg,svg,body,faceLayer,prop,occlusion,arms:[larm,rarm],palms:[lpalm,rpalm],id};}
function stateAt(time){const t=((time%duration)+duration)%duration,index=Math.floor(t/2600),local=t%2600,u=ease(clamp((local-2075)/525));return{index,next:(index+1)%5,u,local,t};}
function draw(r,state,still=false){
 const{index,next,u,local,t}=state,active=u>.5?next:index,cfg=r.cfg,from=layouts[r.key][index],to=layouts[r.key][next];
 const body=lerp(from.body,to.body,u),phase=local/2600;
 if(!still){body[0]+=Math.sin(phase*Math.PI*2)*(r.key==='ranca'?1.3:.8)*(1-u);body[2]+=(index===0||index===3?-Math.sin(phase*Math.PI*2)*2:Math.sin(phase*Math.PI)*.6)*(1-u);}
 r.body.setAttribute('transform',`translate(${body[1]} ${body[2]}) rotate(${body[0]} ${cfg.width/2} 180)`);
 for(let side=0;side<2;side++){
  const field=side===0?'l':'r',a=from[field],b=to[field],hand=a.map((v,i)=>typeof v==='number'?mix(v,b[i],u):v);if(!still&&index===0&&side===0)hand[2]+=Math.sin(phase*Math.PI*(r.key==='ranca'?4:2))*Math.sin(phase*Math.PI)*(r.key==='ranca'?9:7)*(1-u);
    hand[2]=a[2]+(((b[2]-a[2]+180)%360+360)%360-180)*u;
  const contour=lerp(hands[a[3]],hands[b[3]],u);if(r.key==='cana')for(let n=1;n<contour.length;n++)for(let j=0;j<6;j++)if(j%2===1&&contour[n][j]<0)contour[n][j]*=.93;
  const end=contour[contour.length-1].slice(4),last=contour[contour.length-1].slice(2,4),wrist=world(end,hand),norm=Math.hypot(end[0]-last[0],end[1]-last[1])||1,incoming=world([end[0]+(end[0]-last[0])/norm*10,end[1]+(end[1]-last[1])/norm*10],hand),shoulder=side===0?cfg.leftShoulder:cfg.rightShoulder;
  r.arms[side].setAttribute('d',`M ${shoulder.join(' ')} C ${hand[5]} ${hand[6]} ${incoming.join(' ')} ${wrist.join(' ')}`);r.palms[side].setAttribute('d',pathOf(contour));r.palms[side].setAttribute('transform',`translate(${hand[0]} ${hand[1]}) rotate(${hand[2]}) scale(${hand[4]} 1)`);r.occlusion[side].front.setAttribute('d',pathOf(contour)+' Z');r.occlusion[side].front.setAttribute('transform',r.palms[side].getAttribute('transform'));r.occlusion[side].join.setAttribute('cx',wrist[0]);r.occlusion[side].join.setAttribute('cy',wrist[1]);
 }
 // Blink at each held pose and during the expression change between poses.
 const blink=still?0:Math.max(Math.max(0,1-Math.abs(local-1510)/115),u>0?Math.max(0,1-Math.abs(u-.5)/.25):0);
 r.faceLayer.replaceChildren(face(r.key,active,blink));r.prop.replaceChildren();if(r.key==='cana'&&(index===3||next===3)){const opacity=index===3?1-u:u;r.prop.append(make('rect',{x:89,y:205,width:48,height:32,rx:4,fill:'#f4ffed',stroke:'#c7e7cf','stroke-width':1.2,opacity}),make('path',{d:'M 99 214 H 125 M 99 221 H 117',stroke:'#8db89b','stroke-width':2,'stroke-linecap':'round',opacity}));}
 r.svg.dataset.time=t;r.svg.dataset.pose=poseNames[active];r.svg.dataset.blink=blink;
}
const motionRigs=[];
for(const key of Object.keys(configs)){
 const row=document.querySelector(`#${key}-sheet`),ref=document.createElement('article');ref.className='pose-card reference';ref.innerHTML=`<h3>Canonical reference</h3><svg class="reference-art" viewBox="-12 -12 ${configs[key].width+24} 344" role="img" aria-label="Original ${key} audience artwork"><image href="${key}-reference.webp" width="${configs[key].width}" height="320"/></svg><span>Original single-frame artwork</span>`;row.append(ref);
 for(let index=0;index<5;index++){const card=document.createElement('article');card.className='pose-card';card.dataset.pose=index;card.innerHTML=`<h3>${poseNames[index]}</h3><span>${emotions[index]}</span>`;const r=rig(key);draw(r,{index,next:(index+1)%5,u:0,local:900,t:index*2600+900},true);card.insertBefore(r.svg,card.querySelector('span'));row.append(card);}
 const moving=rig(key);document.querySelector('#motion-stage').append(moving.svg);motionRigs.push(moving);
}
let time=0,playing=true,visible=true,inView=true,last=0,raf=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)'),button=document.querySelector('#play'),slider=document.querySelector('#time'),clock=document.querySelector('#clock');
function render(t){time=t;const state=stateAt(t);for(const r of motionRigs)draw(r,state);slider.value=t;clock.value=`${(t/1000).toFixed(1)} s`;document.querySelector('#pose-label').textContent=`${poseNames[state.u>.5?state.next:state.index]} · ${emotions[state.u>.5?state.next:state.index]}`;}
function stop(){cancelAnimationFrame(raf);raf=0;last=0;}function tick(now){if(last)render((time+now-last)%duration);last=now;raf=requestAnimationFrame(tick);}function sync(){stop();if(reduced.matches){playing=false;render(900);}else if(playing&&visible&&!document.hidden&&inView)raf=requestAnimationFrame(tick);button.disabled=reduced.matches;button.textContent=reduced.matches?'Reduced motion':playing?'Pause':'Play';}
button.onclick=()=>{playing=!playing;sync();};slider.oninput=()=>{playing=false;stop();render(Number(slider.value));button.textContent='Play';};reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);addEventListener('pagehide',()=>{visible=false;sync();});addEventListener('pageshow',()=>{visible=true;sync();});const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();},{rootMargin:'100px'});observer.observe(document.querySelector('#motion-stage'));
document.querySelector('#show-mask').onchange=e=>document.querySelectorAll('[data-mask]').forEach(n=>n.setAttribute('display',e.target.checked?'inline':'none'));
document.querySelector('#repair-report').textContent=Object.entries(repairReport).map(([k,r])=>`${k}: ${r.pixels} additional repaired pixels, including ${r.coveredEdgePixels} pixels with partial alpha at the old marks.`).join(' ');
window.characterPoses={ready:true,motionRigs,repairReport,cleanplates,stateAt,draw,seek(t){playing=false;stop();render(t);button.textContent='Play';},play(){playing=true;sync();},state:()=>({time,playing,running:!!raf,reduced:reduced.matches}),exportSVG(key){const s=motionRigs.find(r=>r.key===key).svg.cloneNode(true);s.removeAttribute('class');return s.outerHTML;}};render(0);sync();
})();
