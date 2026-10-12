/* Review-only full-character rig. Original WebPs remain untouched. */
(async()=>{
'use strict';
const NS='http://www.w3.org/2000/svg';
const spec={
 ranca:{width:244,file:'ranca-reference.webp',roi:[63,185,122,231],shoulder:[77,203],rest:[64,185,-6],raised:[64,174,-8],stroke:3.6,color:'#f6fff8'},
 cana:{width:236,file:'cana-reference.webp',roi:[33,190,109,235],shoulder:[57,209],rest:[34,196,-12],raised:[34,183,-4],stroke:3.7,color:'#fff9fc'}
};
const make=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
const ease=t=>t*t*t*(t*(6*t-15)+10),clamp=v=>Math.max(0,Math.min(1,v));
const lerp=(a,b,t)=>a+(b-a)*t;
// A broad palm with three compact rounded fingertips and one rounded thumb.
// Both ends remain open at the wrist. No closing cuff or inner finger loops.
const palm={
 ranca:'M -4 11 C -8 9 -11 5 -14 0 C -18 -5 -17 -9 -14 -9 C -11 -9 -10 -5 -7 -3 C -8 -7 -9 -12 -9 -15 C -9 -20 -4 -21 -3 -16 L -1 -10 L -1 -18 C -1 -23 5 -23 5 -18 L 5 -10 L 7 -15 C 9 -20 14 -18 13 -13 L 11 -1 C 10 4 8 9 4 11',
 cana:'M -4 11 C -8 9 -11 4 -14 -1 C -17 -5 -16 -8 -13 -8 C -10 -8 -9 -5 -7 -3 L -8 -13 C -9 -18 -4 -20 -2 -15 L 0 -9 L 0 -17 C 0 -22 6 -22 6 -17 L 6 -9 L 8 -14 C 10 -18 14 -16 13 -12 L 11 0 C 10 5 8 9 4 11'
};
const rigs={},repairReport={};
async function sourceAndRepair(key,cfg){
 const image=new Image();image.src=cfg.file;await image.decode();
 const c=document.createElement('canvas');c.width=cfg.width;c.height=320;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,c.width,c.height).data,mask=new Uint8Array(c.width*320),core=[];
 const[x0,y0,x1,y1]=cfg.roi;
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  const i=(y*c.width+x)*4,r=data[i],g=data[i+1],b=data[i+2];
  // Preserve Cana's smile, which is spatially separate from the moving hand.
  if(key==='cana'&&y<194&&x>80)continue;
  if(Math.min(r,g,b)>205&&Math.max(r,g,b)-Math.min(r,g,b)<37)core.push(y*c.width+x);
 }
 // A two-source-pixel collar covers anti-aliased edges of the baked white line.
 for(const i of core){const x=i%c.width,y=Math.floor(i/c.width);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(dx*dx+dy*dy<=5){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<c.width&&yy>=0&&yy<320&&!(key==='cana'&&xx>80&&yy<194))mask[yy*c.width+xx]=1;}}
 // Ranca's green palm also occludes the strap. Include that small palm interior.
 if(key==='ranca'){
  const hand=new Path2D('M91 216 C89 211 88.5 201 92 196 C95 190 103 186 109 189 C113 190 115 195 111 196 C109 197 106 198 104 198 C109 195 113 195 115 199 C118 202 117 205 112 205 C111 205 109 206 108 206 C113 203 117 204 118 208 C120 212 113 216 110 218 C107 220 103 220 100 219 Z');
  for(let y=186;y<224;y++)for(let x=87;x<122;x++)if(ctx.isPointInPath(hand,x+.5,y+.5))mask[y*c.width+x]=1;
 }
 const ids=[];for(let i=0;i<mask.length;i++)if(mask[i])ids.push(i);
 const repaired=new Float64Array(c.width*320*3);for(let i=0;i<mask.length;i++)for(let k=0;k<3;k++)repaired[i*3+k]=data[i*4+k];
 // Solve only inside the old stroke mask; all exterior pixels remain original.
 for(const i of ids)for(let k=0;k<3;k++)repaired[i*3+k]=key==='ranca'?[22,194,137][k]:[248,67,148][k];
 for(let pass=0;pass<650;pass++)for(const i of ids)for(let k=0;k<3;k++)repaired[i*3+k]=(repaired[(i-1)*3+k]+repaired[(i+1)*3+k]+repaired[(i-c.width)*3+k]+repaired[(i+c.width)*3+k])/4;
 if(key==='ranca'){
  // Continue the strap from two unobscured source rows. This is a local estimate,
  // not newly generated body art or a claim to recover the hidden original pixels.
  const sample=(x,y,k)=>{x=Math.max(0,Math.min(c.width-2,x));const lo=Math.floor(x),f=x-lo;return lerp(data[(y*c.width+lo)*4+k],data[(y*c.width+lo+1)*4+k],f);};
  for(const i of ids){const x=i%c.width,y=Math.floor(i/c.width);if(y<186||y>224||x<88)continue;const u=clamp((y-184)/42),bulge=5*Math.sin(Math.PI*u),left=lerp(92,94,u)+bulge,right=lerp(104,107,u)+bulge;
   const v=(x-left)/(right-left),sx0=92+v*12,sx1=94+v*13;
   const blend=clamp(Math.min((x-88)/3,(y-184)/2,(226-y)/2));
   for(let k=0;k<3;k++)repaired[i*3+k]=lerp(repaired[i*3+k],lerp(sample(sx0,184,k),sample(sx1,226,k),u),blend);
  }
 }
 const overlay=make('g',{'data-cleanup':key,'shape-rendering':'crispEdges'}),highlight=make('g',{'data-mask':key,display:'none',fill:'#663dff',opacity:'.65'});
 for(const i of ids){const x=i%c.width,y=Math.floor(i/c.width),rgb=[0,1,2].map(k=>Math.round(repaired[i*3+k]));overlay.append(make('rect',{x,y,width:1,height:1,fill:`rgb(${rgb.join(',')})`,opacity:data[i*4+3]/255}));highlight.append(make('rect',{x,y,width:1,height:1}));}
 const bounds=[Math.min(...ids.map(i=>i%c.width)),Math.min(...ids.map(i=>Math.floor(i/c.width))),Math.max(...ids.map(i=>i%c.width))+1,Math.max(...ids.map(i=>Math.floor(i/c.width)))+1];
 repairReport[key]={pixels:ids.length,bounds,sourceSize:[cfg.width,320],minimumSourceAlpha:Math.min(...ids.map(i=>data[i*4+3])),facePixelsCovered:ids.filter(i=>{const x=i%c.width,y=Math.floor(i/c.width);return key==='ranca'?x>119&&y<191:x>80&&x<134&&y<194;}).length};
 const blob=await (await fetch(cfg.file)).blob();const href=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});
 return{href,overlay,highlight};
}
function transformPoint(p,x,y,angle){const a=angle*Math.PI/180;return[x+p[0]*Math.cos(a)-p[1]*Math.sin(a),y+p[0]*Math.sin(a)+p[1]*Math.cos(a)];}
function pose(key,time){
 const cfg=spec[key],t=((time%6000)+6000)%6000;
 let lift=key==='ranca'?ease(clamp((t-350)/1050))*(1-ease(clamp((t-4300)/1200))):ease(clamp((t-650)/1250))*(1-ease(clamp((t-4450)/1150)));
 const start=key==='ranca'?1500:2100,end=key==='ranca'?3950:4100,phase=clamp((t-start)/(end-start));
 const wave=key==='ranca'?Math.sin(phase*Math.PI*4)*Math.sin(phase*Math.PI)*10:Math.sin(phase*Math.PI*2)*Math.sin(phase*Math.PI)*8;
 const[x,y,angle]=cfg.rest.map((v,i)=>lerp(v,cfg.raised[i],lift)+(i===2?wave:0));
 const wrist=transformPoint([4,11],x,y,angle),incoming=transformPoint([-4,15],x,y,angle);
 // Elbow follows the wrist as it rises; it never hooks around a fixed elbow.
 const elbow=key==='ranca'?[lerp(59,60,lift),lerp(237,222,lift)]:[lerp(37,23,lift),lerp(240,225,lift)];
 const arm=`M ${cfg.shoulder.join(' ')} C ${elbow[0]} ${elbow[1]} ${incoming[0]} ${incoming[1]} ${wrist[0]} ${wrist[1]}`;
 return{transform:`translate(${x} ${y}) rotate(${angle})`,arm,x,y,angle,lift};
}
for(const[key,cfg]of Object.entries(spec)){
 const base=await sourceAndRepair(key,cfg),svg=make('svg',{xmlns:NS,viewBox:`0 0 ${cfg.width} 320`,width:cfg.width,height:320,class:`character ${key}`,role:'img','aria-label':`${key==='ranca'?'Ranca':'Cana'} full-character open-palm greeting`});
 svg.append(make('image',{href:base.href,width:cfg.width,height:320,'data-original-body':key}),base.overlay,base.highlight);
 const strokes=make('g',{fill:'none',stroke:cfg.color,'stroke-width':cfg.stroke,'stroke-linecap':'round','stroke-linejoin':'round','data-new-gesture':key});
 const arm=make('path',{'data-arm':key}),hand=make('path',{d:palm[key],'data-palm':key});strokes.append(arm,hand);svg.append(strokes);document.querySelector(`#${key}-stage`).append(svg);rigs[key]={svg,arm,hand,highlight:base.highlight,strokes};
 const clean=svg.cloneNode(true);clean.querySelector('[data-new-gesture]').remove();clean.classList.add('repair-stage');clean.removeAttribute('role');document.querySelector(`#${key}-cleanup`).append(clean);
}
let time=0,last=0,raf=0,playing=true,visible=true,inView=true;
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),button=document.querySelector('#play'),slider=document.querySelector('#time'),clock=document.querySelector('#clock');
function render(t){time=t;for(const[key,rig]of Object.entries(rigs)){const p=pose(key,t);rig.arm.setAttribute('d',p.arm);rig.hand.setAttribute('transform',p.transform);rig.svg.dataset.time=t.toFixed(2);}slider.value=t;clock.value=`${(t/1000).toFixed(1)} s`;}
function stop(){cancelAnimationFrame(raf);raf=0;last=0;}
function tick(now){if(last)render((time+now-last)%6000);last=now;raf=requestAnimationFrame(tick);}
function sync(){stop();if(reduced.matches){playing=false;render(2600);}else if(playing&&visible&&!document.hidden&&inView)raf=requestAnimationFrame(tick);button.disabled=reduced.matches;button.textContent=reduced.matches?'Reduced motion':playing?'Pause':'Play';document.querySelector('#motion-note').textContent=reduced.matches?'Reduced motion: a static open-palm greeting. Use Pose to inspect other checkpoints.':'A restrained lift, wave and return. Drag Pose to inspect any point.';}
button.addEventListener('click',()=>{if(reduced.matches)return;playing=!playing;sync();});slider.addEventListener('input',()=>{playing=false;stop();render(Number(slider.value));button.textContent='Play';});
reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);addEventListener('pagehide',()=>{visible=false;sync();});addEventListener('pageshow',()=>{visible=true;sync();});
const visibleStages=new Set();const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting)visibleStages.add(entry.target);else visibleStages.delete(entry.target);}inView=visibleStages.size>0;sync();},{rootMargin:'100px'});for(const key of Object.keys(rigs))observer.observe(document.querySelector(`#${key}-stage`));
document.querySelector('#repairs').addEventListener('change',e=>{for(const mask of document.querySelectorAll('[data-mask]'))mask.setAttribute('display',e.target.checked?'inline':'none');});
document.querySelector('#repair-stats').textContent=Object.entries(repairReport).map(([k,v])=>`${k}: ${v.pixels} source pixels covered inside [${v.bounds.join(', ')}]`).join(' · ');
window.greetingStudy={ready:true,rigs,repairReport,pose,seek(t){playing=false;stop();render(t);button.textContent='Play';},play(){playing=true;sync();},state:()=>({time,playing,running:!!raf,reduced:reduced.matches}),exportSVG(key){const s=rigs[key].svg.cloneNode(true);s.removeAttribute('class');s.removeAttribute('data-time');s.querySelector('[data-mask]').remove();return s.outerHTML;}};
render(reduced.matches?2600:0);sync();
})();
