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
 const palm='M-22 10 Q-10 29 18 17 L51 4 Q61 0 57 -7 Q54 -13 44 -8 L16 1 Q1 1 -5 -10 L-14 -24 Q-21 -33 -28 -27 Q-33 -22 -25 -12 L-18 0Z';
 const eyePaths={open:'M-4 -24 C-22 -29 -30 -10 -27 9 C-24 30 -7 38 9 28 C16 23 20 13 19 5 C8 14 -3 6 -3 -4 C-3 -14 5 -19 13 -12 C10 -19 4 -23 -4 -24Z',happy:'M-32 11 C-31 -22 16 -30 35 0 L23 9 C9 -10 -14 -5 -18 14Z',wink:'M-32 -2 C-12 10 12 8 29 -3 L32 10 C9 25 -14 23 -34 11Z'};
 const lerp=(a,b,t)=>a+(b-a)*t;
 const smooth=t=>t*t*(3-2*t);
 const grip='M-20 -8 C-28 -14 -33 -4 -27 7 L-18 21 L-16 38 Q-14 48 -8 39 L-7 15 L-3 42 Q1 51 6 41 L7 14 L13 38 Q18 45 22 35 L22 7 Q20 -9 8 -12Z';
 const point='M-22 12 Q-13 26 9 20 L21 12 Q27 6 20 1 L9 2 L56 -1 Q67 -2 65 -10 Q64 -16 54 -15 L3 -12 L-9 -24 Q-16 -33 -22 -26 Q-28 -21 -21 -12 L-22 0Z';
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
 const reach=a=>({left:[220,408,85,.72],right:[632+30*a,410-162*a,85-97*a,.85],eyes:['open','open'],brow:[0,0],mouth:0,gaze:0});
 function state(character,pose){
  const s=reach(({lift1:.33,lift2:.67,present:1,settle1:.67,settle2:.33,found:1})[pose]||0);
  if(character==='cana')s.eyes=['wink','open'];
  if(pose==='present'||pose==='found'){s.eyes=character==='cana'?['wink','happy']:['happy','happy'];s.mouth=1;}
  if(pose==='found'){if(character==='cana'){s.left=[210,211,-28,.8];s.right=[645,214,0,.8];}else{s.right=[648,248,-5,.85];}}
  if(pose==='search'){s.right=[440,145,175,.7];s.eyes=['open','open'];s.brow=[-16,15];s.mouth=-.5;s.gaze=character==='ranca'?6:-6;}
  if(pose==='peek'||pose==='duck'){s.left=[230,382,0,.72];s.right=[557,382,0,.72];s.eyes=pose==='duck'?['wink','wink']:['open','open'];s.brow=[18,-18];s.mouth=-1;s.gaze=character==='ranca'?5:-5;}
  if(pose==='cover'){s.left=[292,216,155,.78];s.right=[451,172,190,.78];s.eyes=['wink','wink'];s.mouth=.4;}
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
  const brows=centers.map(()=>make('path',{...line,'stroke-width':9,d:'M-23 0 Q0 -13 23 0'},face));
  const mouth=make('path',{...line,'stroke-width':13},face);
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
   eyes.forEach((eye,i)=>{
    const aa=eyeSamples[a.eyes[i]],bb=eyeSamples[b.eyes[i]];
    eye.setAttribute('d',aa.map((p,j)=>`${j?'L':'M'}${lerp(p[0],bb[j][0],t).toFixed(2)} ${lerp(p[1],bb[j][1],t).toFixed(2)}`).join(' ')+'Z');
    const [x,y]=centers[i];eye.setAttribute('transform',`translate(${x+gaze} ${y}) rotate(-8) scale(${green ? .86 : -.86} .86)`);
    const brow=lerp(a.brow[i],b.brow[i],t);
    brows[i].setAttribute('transform',`translate(${x+gaze} ${y-43}) rotate(${brow})`);
    // Only searching/peeking has eyebrows; no extra facial markings at rest.
    const ba=(pose==='search'||pose==='peek')?1:0,bbrow=(context.nextPose==='search'||context.nextPose==='peek')?1:0;
    brows[i].setAttribute('opacity',lerp(ba,bbrow,t).toFixed(3));
   });
   const mood=lerp(a.mouth,b.mouth,t),mx=green?390:351,my=green?282:307;
   const half=lerp(15,40,(mood+1)/2),depth=lerp(5,33,(mood+1)/2);
   mouth.setAttribute('d',`M${-half} 0 Q0 ${depth} ${half} -5`);
   mouth.setAttribute('transform',`translate(${mx+gaze*.5} ${my}) rotate(-14)`);
   hands.forEach(({arm,hand},i)=>{
    const key=i?'right':'left',v=a[key].map((q,j)=>lerp(q,b[key][j],t)),[x,y,angle,scale]=v;
    const start=i?[603,326]:[210,328];
    const cx=i?Math.max(625,x+20):Math.min(120,x-20),cy=(start[1]+y)*.5;
    arm.setAttribute('d',`M${start[0]} ${start[1]} Q${cx} ${cy} ${x-8} ${y+8}`);
    const handShape=p=>(p==='peek'||p==='duck')?'grip':p==='found'&&green&&i===1?'point':'palm';
    const shapeA=eyeSamples[handShape(pose)],shapeB=eyeSamples[handShape(context.nextPose)];
    hand.setAttribute('d',shapeA.map((p,j)=>`${j?'L':'M'}${lerp(p[0],shapeB[j][0],t).toFixed(2)} ${lerp(p[1],shapeB[j][1],t).toFixed(2)}`).join(' ')+'Z');
    hand.setAttribute('transform',`translate(${x} ${y}) rotate(${angle}) scale(${scale})`);
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
