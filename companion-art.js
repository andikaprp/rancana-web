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
 // Every hand shares the same wrist and cubic topology. Finger landmarks stay
 // paired during interpolation, instead of resampling unrelated silhouettes.
 const handShapes={
  rest:[[-18,20,-22,12,-21,4],[-20,-3,-12,-4,-10,4],[-7,12,-3,10,-5,1],[-8,-10,3,-15,6,-3],[8,4,9,8,10,9],[12,-5,23,-6,24,4],[25,12,24,18,20,21],[17,26,8,29,0,27],[-4,27,-8,26,-10,24]],
  palm:[[-23,18,-29,7,-28,-1],[-27,-9,-18,-11,-15,-3],[-11,7,-6,7,-9,-5],[-18,-33,-4,-41,1,-22],[3,-14,4,-9,5,-8],[4,-40,21,-44,21,-27],[21,-16,19,-8,18,-3],[33,-24,44,-15,34,0],[26,16,16,28,-10,24]],
  shade:[[-24,16,-28,6,-24,-1],[-20,-9,-11,-7,-10,1],[-8,8,-4,8,-4,-1],[-7,-23,5,-27,9,-12],[11,-7,12,-3,13,0],[13,-25,26,-28,28,-13],[29,-6,28,0,27,4],[33,-15,45,-11,41,5],[34,23,15,29,-10,24]],
  grip:[[-21,19,-26,8,-23,0],[-19,-6,-11,-4,-10,2],[-8,7,-3,8,-2,3],[-2,-7,10,-9,12,0],[12,5,12,9,13,11],[17,0,28,1,28,9],[28,14,23,19,18,20],[16,27,8,30,0,27],[-4,27,-8,26,-10,24]],
  cover:[[-24,16,-29,5,-27,-3],[-24,-12,-15,-11,-12,-3],[-8,6,-5,4,-8,-8],[-14,-37,1,-42,5,-23],[7,-14,8,-7,9,-5],[10,-42,27,-43,26,-24],[25,-14,23,-6,22,-1],[37,-28,49,-18,39,2],[32,22,13,30,-10,24]],
  point:[[-22,16,-25,5,-20,-2],[-16,-10,-7,-8,-8,2],[-9,9,-3,9,-3,-4],[-5,-38,10,-43,12,-27],[13,-14,12,-2,12,3],[15,-8,27,-7,28,3],[29,11,24,15,20,16],[22,24,9,30,0,27],[-4,27,-8,26,-10,24]],
  adjust:[[-19,19,-22,9,-19,2],[-16,-5,-7,-3,-8,4],[-9,10,-3,10,-2,4],[-3,-17,10,-21,14,-11],[18,-2,13,4,10,4],[20,-10,31,-4,26,5],[23,11,19,16,15,18],[15,25,7,29,0,27],[-4,27,-8,26,-10,24]]
 };
 const eyePaths={open:'M-4 -24 C-22 -29 -30 -10 -27 9 C-24 30 -7 38 9 28 C16 23 20 13 19 5 C8 14 -3 6 -3 -4 C-3 -14 5 -19 13 -12 C10 -19 4 -23 -4 -24Z',happy:'M-32 11 C-31 -22 16 -30 35 0 L23 9 C9 -10 -14 -5 -18 14Z',wink:'M-32 -2 C-12 10 12 8 29 -3 L32 10 C9 25 -14 23 -34 11Z',canaWink:'M22 -24 L-14 0 L22 24 L14 34 L-32 0 L14 -34Z'};
 const lerp=(a,b,t)=>a+(b-a)*t;
 const smooth=t=>t*t*(3-2*t);
 const eyeSamples={};
 function samples(svg){
  if(Object.keys(eyeSamples).length)return;
  for(const [name,d] of Object.entries(eyePaths)){
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
 function state(character,pose){
  const green=character==='ranca';
  const s={left:[217,384,155,.86],right:[610,390,205,.86],hands:['rest','rest'],eyes:['open','open'],brow:[0,0],mouth:green?.35:.05,gaze:green?0:-4,glasses:0};
  const reach=({lift1:.28,lift2:.65,present:1,settle1:.65,settle2:.28})[pose]||0;
  if(reach){
   s.right=[lerp(610,622,reach),lerp(390,278,reach),lerp(205,65,reach),.9];
   s.hands[1]='palm';s.gaze=(green?7:-7)*reach;s.mouth=green?.8:.35;
   // Cana presents with one hand and a low, relaxed hand on her hip.
   if(!green){s.left=[242,354,135,.85];s.brow=[-6,8];}
  }
  if(pose==='found'){
   s.right=[631,247,55,.96];s.hands[1]=green?'point':'palm';
   s.left=green?[220,356,145,.88]:[240,333,125,.88];s.mouth=green?1:.65;
   s.gaze=green?10:-9;s.eyes=green?['open','open']:['canaWink','open'];
  }
  if(pose==='search'){
   s.right=[515,146,76,.96];s.hands[1]='shade';s.brow=[-12,12];
   s.gaze=green?10:-10;s.mouth=-.45;
  }
  if(pose==='peek'||pose==='duck'){
   s.left=[230,385,0,.8];s.right=[556,385,0,.8];s.hands=['grip','grip'];
   s.eyes=pose==='duck'?['wink','wink']:['open','open'];s.brow=[12,-12];
   s.mouth=pose==='duck'?-.65:-.2;s.gaze=green?8:-8;
  }
  if(pose==='cover'){
   s.left=green?[321,230,0,1.18]:[325,218,0,1.18];
   s.right=green?[454,186,0,1.18]:[485,264,0,1.18];
   s.hands=['cover','cover'];s.eyes=['wink','wink'];s.mouth=.3;
  }
  if(pose==='cool'||pose==='adjust'||pose==='glance'){
   s.left=[225,380,160,.88];s.right=[560,350,145,.88];
   s.mouth=.2;s.gaze=-5;s.brow=[-7,9];
   if(pose==='adjust'||pose==='glance'){
    s.right=[533,203,25,.92];s.hands[1]='adjust';s.glasses=pose==='glance'?-80:8;
    s.gaze=-12;s.mouth=.5;
    if(pose==='glance'){s.eyes=['canaWink','open'];s.right=[533,121,25,.92];}
   }
  }
  return s;
 }
 async function create(original,character,options={}){
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
  let glasses;
  if(options.accessory==='sunglasses'){
   // A separate accessory over Cana's exact original wide raster silhouette.
   // The graduate image is never substituted, recolored, or modified.
   const accessoryURL=new URL('cana-sunglasses-source.webp',base).href;
   const accessoryImage=new Image();accessoryImage.src=accessoryURL;await accessoryImage.decode();
   const defs=make('defs',{},svg),id='cana-glass-'+Math.random().toString(36).slice(2);
   const clip=make('clipPath',{id},defs);
   // Clip ONLY the existing PR24 green glasses pixels; no pink body or pointing
   // hands from that image appear. This retains the reviewed soft 3D accessory.
   make('path',{d:'M190 240 Q230 222 280 221 L299 214 Q346 196 399 193 Q409 192 405 203 L397 217 L391 245 Q386 261 366 268 Q335 277 315 266 L302 245 Q297 241 290 252 Q284 278 260 287 Q233 296 216 282 L201 255 Q198 248 193 248Z'},clip);
   // Keep only green accessory pixels inside the clip. This excludes the tiny
   // white smile/brow fragments and pink fringe baked into the source composite.
   const mask=make('filter',{id:id+'-green','color-interpolation-filters':'sRGB'},defs);
   make('feColorMatrix',{type:'matrix',values:'1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -16 16 0 0 0'},mask);
   glasses=make('g',{'data-companion-accessory':'sunglasses'},svg);
   const accessory=make('g',{transform:'matrix(1.3 -.12 0 1.3 -51 -52)','clip-path':'url(#'+id+')'},glasses);
   make('image',{href:accessoryURL,width:640,height:480,filter:'url(#'+id+'-green)'},accessory);
  }
  const hands=['left','right'].map(side=>{
   const g=make('g',{'data-companion-hand':side,'data-art-part':'hand-'+side,transform:green?'':'translate(745 0) scale(-1 1)'},svg);
   const arm=make('path',line,g),hand=make('path',{...line,'stroke-width':10},g);return {g,arm,hand};
  });
  samples(svg);
  let shown=false;
  function setPose(pose,time,context={}){
   const a=state(character,pose),b=state(character,context.nextPose||pose);
   const clock=(time+(green?0:730))%(context.duration||11000);
   const blink=clock>8200&&clock<8460?Math.sin((clock-8200)/260*Math.PI):0;
   const t=smooth(Math.max(0,Math.min(1,context.progress||0)));
   const gaze=lerp(a.gaze,b.gaze,t);
   // Both eye silhouettes are single white paths, including a Pelajar-style open
   // bean with body-colored cutout. Geometry morphs instead of duplicate overlays.
   eyes.forEach((eye,i)=>{
    const aa=eyeSamples[a.eyes[i]],bb=eyeSamples[b.eyes[i]];
    eye.setAttribute('d',aa.map((p,j)=>`${j?'L':'M'}${lerp(p[0],bb[j][0],t).toFixed(2)} ${lerp(p[1],bb[j][1],t).toFixed(2)}`).join(' ')+'Z');
    eye.setAttribute('opacity',lerp(pose==='cover'?0:1,context.nextPose==='cover'?0:1,t).toFixed(3));
    const [x,y]=centers[i];eye.setAttribute('transform',`translate(${x+gaze} ${y}) rotate(-8) scale(${green ? .86 : -.86} ${.86*(1-.94*blink)})`);
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
   if(glasses)glasses.setAttribute('transform',`translate(0 ${lerp(a.glasses,b.glasses,t)})`);
   hands.forEach(({arm,hand},i)=>{
    const key=i?'right':'left',v=a[key].map((q,j)=>lerp(q,b[key][j],t)),[x,y,angle,scale]=v;
    const start=i?[603,326]:[210,328];
    const radians=angle*Math.PI/180;
    const wrist=[x-24*Math.sin(radians)*scale,y+24*Math.cos(radians)*scale];
    const cx=i?Math.max(628,x+20):Math.min(160,x-20),cy=(start[1]+wrist[1])*.5+24;
    arm.setAttribute('d',`M${start[0]} ${start[1]} Q${cx} ${cy} ${wrist[0]} ${wrist[1]}`);
    const shapeA=handShapes[a.hands[i]],shapeB=handShapes[b.hands[i]];
    hand.setAttribute('d','M-10 24 '+shapeA.map((points,j)=>'C'+points.map((q,k)=>lerp(q,shapeB[j][k],t).toFixed(2)).join(' ')).join(' ')+' Z');
    hand.setAttribute('transform',`translate(${x} ${y}) rotate(${angle}) scale(${i?-scale:scale} ${scale})`);
    hand.dataset.gesture=a.hands[i];

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
