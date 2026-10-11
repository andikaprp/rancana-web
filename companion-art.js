/* Original raster bodies; independently animated minimal white line features.
 * No vector cloud reconstruction, color filter, crossfade, or animation timer.
 * Body repairs are limited to removed embedded features; see art-provenance.json.
 */
(() => {
 'use strict';
 const base = new URL('./assets/mascots/poses/', document.currentScript.src);
 const ns='http://www.w3.org/2000/svg';
 const make=(tag,attrs={},parent)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);parent?.append(e);return e;};
 const line={fill:'none',stroke:'#fff','stroke-width':12,'stroke-linecap':'round','stroke-linejoin':'round'};
 const palm='M-14 20 C-25 12 -25 0 -18 -9 L-8 -24 C-2 -32 8 -26 3 -18 L-2 -8 L23 -20 C34 -25 40 -13 29 -8 L13 -1 L30 -7 C42 -11 47 2 35 7 L17 13 L29 10 C41 7 46 20 34 24 L15 31 C2 36 -8 32 -14 20Z';
 const eyePaths={open:'M-4 -24 C-22 -29 -30 -10 -27 9 C-24 30 -7 38 9 28 C16 23 20 13 19 5 C8 14 -3 6 -3 -4 C-3 -14 5 -19 13 -12 C10 -19 4 -23 -4 -24Z',wink:'M-32 -2 C-12 10 12 8 29 -3 L32 10 C9 25 -14 23 -34 11Z',canaWink:'M22 -24 L-14 0 L22 24 L14 34 L-32 0 L14 -34Z'};
 const lerp=(a,b,t)=>a+(b-a)*t;
 const smooth=t=>t*t*(3-2*t);
 const grip='M-16 24 C-25 15 -25 -5 -15 -15 C-5 -25 13 -24 24 -16 C33 -10 30 0 20 -3 L8 -8 L23 1 C33 7 27 17 18 12 L5 6 L18 17 C27 25 18 34 10 27 L-1 18 C2 33 -8 38 -16 24Z';
 const point='M-14 20 C-24 12 -25 0 -18 -9 L-8 -24 C-2 -32 8 -26 3 -18 L-2 -8 L43 -16 C55 -18 58 -5 46 -2 L15 5 L29 3 C41 1 44 14 32 17 L17 20 C25 28 17 36 7 32 C-3 33 -10 28 -14 20Z';
 const eyeSamples={};
 function samples(svg){
  if(Object.keys(eyeSamples).length)return;
  for(const [name,d] of Object.entries({...eyePaths,palm,grip,point})){
   const p=make('path',{d,visibility:'hidden'},svg),len=p.getTotalLength();
   let points=Array.from({length:64},(_,i)=>{const q=p.getPointAtLength(len*i/64);return[q.x,q.y];});
   // Match winding and topmost start points before morphing closed contours.
   // Otherwise a bean-to-arc interpolation can twist through itself midway.
   const area=points.reduce((sum,q,i)=>{const n=points[(i+1)%points.length];return sum+q[0]*n[1]-n[0]*q[1];},0);
   if(area<0)points.reverse();
   const start=points.reduce((best,q,i)=>q[1]<points[best][1]?i:best,0);
   eyeSamples[name]=points.slice(start).concat(points.slice(0,start));p.remove();
  }
 }
 const reach=a=>({left:[224,376,-8,.92],right:[600+14*a,378-110*a,12-35*a,.92],eyes:['open','open'],brow:[0,0],mouth:0,gaze:0});
 function state(character,pose){
  const s=reach(({lift1:.33,lift2:.67,present:1,settle1:.67,settle2:.33,found:1})[pose]||0);
  if(character==='cana')s.eyes=['wink','open'];
  if(pose==='present'||pose==='found'){s.eyes=character==='cana'?['wink','open']:['open','open'];s.mouth=1;}
  if(pose==='found'){if(character==='cana'){s.left=[210,211,-28,.8];s.right=[645,214,0,.8];}else{s.right=[648,248,-5,.85];}}
  if(pose==='search'){s.right=[545,150,-70,.9];s.eyes=['open','open'];s.brow=[-16,15];s.mouth=-.5;s.gaze=character==='ranca'?6:-6;}
  if(pose==='peek'||pose==='duck'){s.left=[230,382,0,.72];s.right=[557,382,0,.72];s.eyes=pose==='duck'?['wink','wink']:['open','open'];s.brow=[18,-18];s.mouth=-1;s.gaze=character==='ranca'?5:-5;}
  if(pose==='cover'){s.left=character==='cana'?[325,185,0,1.05]:[310,195,0,1.05];s.right=character==='cana'?[485,233,0,1.05]:[445,152,0,1.05];s.eyes=['wink','wink'];s.mouth=.4;}
  return s;
 }
 async function create(original,character){
  if(!['ranca','cana'].includes(character))throw Error('Unknown companion');
  const green=character==='ranca',w=green?741:745,h=green?532:528;
  const url=new URL(character+'-body.webp',base).href;
  const preload=new Image();preload.src=url;await preload.decode();
  if(preload.naturalWidth!==w||preload.naturalHeight!==h)throw Error('Body canvas mismatch');
  const wrap=document.createElement('span');wrap.className='companion-actor';wrap.setAttribute('aria-hidden','true');
  original.before(wrap);wrap.append(original);original.dataset.companionOriginal='';
  const svg=make('svg',{viewBox:`0 0 ${w} ${h}`,width:w,height:h,'aria-hidden':'true',focusable:'false',class:'companion-art'},wrap);
  Object.assign(svg.style,{position:'absolute',inset:'0',width:'100%',height:'100%',overflow:'visible',pointerEvents:'none',visibility:'hidden'});
  make('image',{href:url,width:w,height:h,'data-companion-body':'','data-art-part':'body'},svg);
  const face=make('g',{'data-companion-face':'','data-art-part':'face'},svg);
  const centers=green?[[321,222],[454,178]]:[[260,254],[420,207]];
  const eyes=centers.map(()=>make('path',{fill:'#fff'},face));
  const brows=centers.map(()=>make('path',{...line,'stroke-width':green?9:7,d:green?'M-23 0 Q0 -13 23 0':'M-18 0 Q0 -15 18 0'},face));
  const mouth=make('path',{fill:'#fff'},face);
  const lashes=green?[]:centers.map(()=>make('path',{...line,'stroke-width':7,'data-companion-lash':''},face));
  const hands=['left','right'].map(side=>{
   const g=make('g',{'data-companion-hand':side,'data-art-part':'hand-'+side,transform:green?'':'translate(745 0) scale(-1 1)'},svg);
   const arm=make('path',line,g),hand=make('path',{...line,'stroke-width':10,d:palm},g);return {g,arm,hand};
  });
  samples(svg);
  let shown=false;
  function setPose(pose,time,context={}){
   const a=state(character,pose),b=state(character,context.nextPose||pose);
   const t=smooth(Math.max(0,Math.min(1,context.progress||0)));
   const gaze=lerp(a.gaze,b.gaze,t);
   // Both eye silhouettes are single white paths, including a Pelajar-style open
   // bean with body-colored cutout. Geometry morphs instead of duplicate overlays.
   const eyeShape=name=>green||name!=='wink'?name:'canaWink';
   eyes.forEach((eye,i)=>{
    const aa=eyeSamples[eyeShape(a.eyes[i])],bb=eyeSamples[eyeShape(b.eyes[i])];
    eye.setAttribute('d',aa.map((p,j)=>`${j?'L':'M'}${lerp(p[0],bb[j][0],t).toFixed(2)} ${lerp(p[1],bb[j][1],t).toFixed(2)}`).join(' ')+'Z');
    eye.setAttribute('opacity',lerp(pose==='cover'?0:1,context.nextPose==='cover'?0:1,t).toFixed(3));
    const [x,y]=centers[i];
    const transform=`translate(${x+gaze} ${y}) rotate(-8) scale(${green ? .86 : -.92} ${green ? .86 : .98})`;
    eye.setAttribute('transform',transform);
    if(!green){
     const open=i?[-26,-12,-38,-13,-41,-24,-19,-23,-26,-29,-24,-37]:[15,-16,27,-18,28,-29,9,-25,19,-29,17,-38];
     const wink=i?[-29,0,-41,-4,-44,-14,-26,-4,-32,-11,-32,-22]:[21,-24,31,-26,32,-36,15,-33,23,-37,21,-44];
     const from=a.eyes[i]==='wink'?wink:open,to=b.eyes[i]==='wink'?wink:open;
     const points=from.map((value,index)=>lerp(value,to[index],t));
     lashes[i].setAttribute('d',`M${points[0]} ${points[1]} Q${points[2]} ${points[3]} ${points[4]} ${points[5]} M${points[6]} ${points[7]} Q${points[8]} ${points[9]} ${points[10]} ${points[11]}`);
     lashes[i].setAttribute('transform',transform);
     lashes[i].setAttribute('opacity',eye.getAttribute('opacity'));
    }
    const brow=lerp(a.brow[i],b.brow[i],t)*(green?1:.55);
    brows[i].setAttribute('transform',`translate(${x+gaze} ${y-(green?43:51)}) rotate(${brow})`);
    // Small rounded brows retain the school/college characters' playful expression.
    const ba=pose==='cover'?0:1,bbrow=context.nextPose==='cover'?0:1;
    brows[i].setAttribute('opacity',lerp(ba,bbrow,t).toFixed(3));
   });
   const mood=lerp(a.mouth,b.mouth,t),mx=green?390:351,my=green?282:307;
   const half=lerp(18,32,(mood+1)/2),depth=lerp(12,42,(mood+1)/2);
   mouth.setAttribute('d',green
    ? `M${-half} -3 Q0 8 ${half} -10 C${half} ${depth*.7} ${-half*.4} ${depth} ${-half} 12 Q${-half-3} 5 ${-half} -3Z`
    : `M${-half*.85} -4 Q0 8 ${half*.85} -4 C${half*.8} ${depth*.7} ${-half*.8} ${depth*.7} ${-half*.85} -4Z`);
   mouth.setAttribute('transform',`translate(${mx+gaze*.5} ${my}) rotate(${green?-14:-8})`);
   hands.forEach(({arm,hand},i)=>{
    const key=i?'right':'left',v=a[key].map((q,j)=>lerp(q,b[key][j],t)),[x,y,angle,scale]=v;
    const start=i?[603,326]:[210,328];
    const radians=angle*Math.PI/180;
    const wrist=[x-24*Math.sin(radians)*scale,y+24*Math.cos(radians)*scale];
    const cx=i?Math.max(650,x+50):Math.min(145,x-50),cy=(start[1]+wrist[1])*.5+45;
    arm.setAttribute('d',`M${start[0]} ${start[1]} Q${cx} ${cy} ${wrist[0]} ${wrist[1]}`);
    const handShape=p=>(p==='peek'||p==='duck'||p==='cover')?'grip':p==='found'&&green&&i===1?'point':'palm';
    const shapeA=eyeSamples[handShape(pose)],shapeB=eyeSamples[handShape(context.nextPose)];
    hand.setAttribute('d',shapeA.map((p,j)=>`${j?'L':'M'}${lerp(p[0],shapeB[j][0],t).toFixed(2)} ${lerp(p[1],shapeB[j][1],t).toFixed(2)}`).join(' ')+'Z');
    hand.setAttribute('transform',`translate(${x} ${y}) rotate(${angle}) scale(${i?-scale:scale} ${scale})`);
   });
   wrap.dataset.companionRenderedPose=pose;
  }
  function show(){shown=true;original.style.visibility='hidden';svg.style.visibility='visible';}
  function restoreOriginal(){shown=false;original.style.visibility='visible';svg.style.visibility='hidden';}
  setPose('ready',0);restoreOriginal();
  return {motionElement:wrap,setPose,show,restoreOriginal,destroy(){original.style.visibility='';delete original.dataset.companionOriginal;wrap.before(original);wrap.remove();},get shown(){return shown;}};
 }
 window.RancanaCompanionArt=Object.freeze({create});
})();
