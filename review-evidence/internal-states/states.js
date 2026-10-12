(()=>{'use strict';
const names=['Greeting','Thinking','Presenting','Surprised','Playful'];
const shapes={
 relaxed:[[-2,-5,-2.5,-15,1,-20],[4,-26,12,-30,18,-27],[22,-26,24,-21,20,-20],[18,-19,15,-18,13,-18],[18,-21,22,-21,24,-17],[27,-14,26,-11,21,-11],[20,-11,18,-10,17,-10],[22,-13,26,-12,27,-8],[29,-4,22,0,19,2],[16,4,12,4,9,3]],
 open:[[-4,-3,-8,-8,-10,-11],[-15,-16,-11,-21,-7,-18],[-4,-16,-2,-13,0,-13],[-1,-18,-3,-25,1,-27],[5,-29,7,-25,8,-19],[8,-24,10,-30,14,-28],[18,-27,18,-22,18,-17],[20,-22,23,-24,26,-21],[30,-17,25,-6,21,-1],[18,3,12,5,9,3]],
 thinking:[[-2,-4,-4,-9,-3,-13],[-8,-20,-8,-24,-4,-25],[1,-26,4,-20,5,-17],[7,-20,16,-24,24,-24],[31,-24,33,-18,27,-16],[24,-15,18,-13,16,-12],[23,-15,28,-13,26,-8],[25,-5,21,-3,19,-3],[25,-6,27,-1,23,3],[19,8,13,8,9,5]],
 palm:[[-4,-3,-8,-7,-10,-10],[-15,-15,-11,-20,-7,-17],[-4,-14,-1,-12,1,-12],[0,-18,1,-24,5,-25],[10,-25,11,-20,11,-17],[13,-21,16,-25,20,-23],[24,-22,23,-18,23,-15],[27,-19,31,-20,33,-15],[34,-11,26,-2,21,1],[17,5,12,5,9,3]],
 playful:[[-3,-5,-5,-12,-4,-17],[-9,-21,-10,-26,-6,-28],[-1,-29,3,-23,4,-19],[5,-22,6,-30,10,-31],[15,-32,16,-27,15,-21],[20,-27,24,-30,27,-27],[31,-24,27,-18,23,-13],[28,-15,32,-12,28,-7],[26,-3,22,1,18,3],[15,5,12,5,9,3]]
};
const hand=(x,y,a,s,shape,start,bend)=>({x,y,a,s,shape,start,bend});
const poses={ranca:[
 {body:[-2,1,1,-4],hands:[hand(274,324,-25,1,'open',[224,305],[212,355]),hand(602,348,9,-1,'relaxed',[646,309],[659,371])],eyes:[1,1],gaze:[3,-3],brows:[1,1],mouth:'laugh',caption:'Open hello · bright smile'},
 {body:[3,1.012,.976,5],hands:[hand(307,355,-5,1,'thinking',[234,329],[245,390]),hand(600,363,-12,-1,'relaxed',[648,318],[660,393])],eyes:[.91,.91],gaze:[-7,-5],brows:[1,.45],mouth:'hmm',caption:'Curled hand · curious glance'},
 {body:[-3,1.012,.988,1],hands:[hand(233,349,25,1,'palm',[213,308],[203,365]),hand(593,356,15,-1,'relaxed',[641,307],[650,379])],eyes:[1,1],gaze:[-4,1],brows:[.55,.8],mouth:'smile',caption:'Upturned palm · welcoming lean'},
 {body:[0,.976,1.037,-6],hands:[hand(265,318,-12,1,'open',[220,302],[220,357]),hand(597,315,14,-1,'open',[642,292],[660,349])],eyes:[1.18,1.18],gaze:[0,0],brows:[1.6,1.6],mouth:'oh',caption:'Raised palms · wide-eyed surprise'},
 {body:[-4,1.025,.965,5],hands:[hand(273,332,-31,1,'playful',[222,310],[214,368]),hand(596,368,24,-1,'palm',[645,317],[654,389])],eyes:[0,1],gaze:[4,-1],brows:[.35,.9],mouth:'laugh',caption:'Small finger flick · cheerful wink'}
],cana:[
 {body:[2,1,1,-3],hands:[hand(186,364,-8,1,'relaxed',[129,320],[116,393]),hand(560,324,30,-1,'open',[614,298],[631,358])],eyes:[1,1],gaze:[2,0],brows:[0,1],mouth:'smirk',caption:'Easy hello · confident smile'},
 {body:[-3,1.008,.984,4],hands:[hand(257,363,-9,1,'thinking',[176,337],[194,392]),hand(568,363,-10,-1,'relaxed',[621,313],[638,394])],eyes:[.68,.85],gaze:[-5,-4],brows:[0,.6],mouth:'hmm',caption:'Chin-side curl · questioning brow'},
 {body:[3,1.015,.985,0],hands:[hand(189,371,16,1,'relaxed',[133,321],[121,398]),hand(583,350,-25,-1,'palm',[622,305],[642,370])],eyes:[.94,1],gaze:[4,0],brows:[0,1.1],mouth:'smirk',caption:'One open palm · assured posture'},
 {body:[-1,.985,1.027,-5],hands:[hand(189,322,-10,1,'open',[133,300],[127,360]),hand(558,319,11,-1,'open',[613,295],[635,358])],eyes:[1.12,1.04],gaze:[0,0],brows:[1.3,1.55],mouth:'oh',wide:true,caption:'Two palms up · amused surprise'},
 {body:[4,1.024,.972,4],hands:[hand(193,366,-5,1,'palm',[134,322],[119,393]),hand(560,330,35,-1,'playful',[614,301],[630,366])],eyes:[0,1],gaze:[2,0],brows:[0,1],mouth:'smirk',caption:'Playful fingers · knowing wink'}
]};
const bean='M4 -12 C-4 -16 -10 -9 -10 -2 C-10 9 -2 15 5 11 C10 8 10 1 8 -5 C8 2 1 2 -1 -4 C-3 -9 0 -12 4 -12';
function face(key,p){const centers=key==='ranca'?[[321,222],[454,178]]:[[260,254],[420,207]],parts=[];for(let i=0;i<2;i++){const[x,y]=centers[i],[dx,dy]=p.gaze,op=p.eyes[i];if(op===0){parts.push(`<path d="M${x-23} ${y+3} Q${x} ${y-15} ${x+23} ${y-4}"/>`);}else if(key==='ranca'||p.wide){parts.push(`<path class="eye" fill="white" stroke="none" d="${bean}" transform="translate(${x+dx} ${y+dy}) scale(${2.2*(p.wide?1.02:1)} ${2.2*op})"/>`);}else{parts.push(`<path fill="white" stroke="none" d="M${x-23+dx} ${y+dy} C${x-19+dx} ${y+38*op+dy} ${x+19+dx} ${y+34*op+dy} ${x+23+dx} ${y-7+dy} Z"/><path d="M${x-34} ${y+7} L${x+34} ${y-8}"/>`);}if(p.brows[i]){const raise=29+p.brows[i]*13;parts.push(`<path d="M${x-24} ${y-raise+5} Q${x} ${y-raise-17} ${x+23} ${y-raise-5}"/>`);}}
const mx=key==='ranca'?390:351,my=key==='ranca'?287:307;
if(p.mouth==='laugh')parts.push(`<path fill="white" stroke="none" d="M${mx-38} ${my} Q${mx} ${my-1} ${mx+39} ${my-12} C${mx+32} ${my+44} ${mx-21} ${my+53} ${mx-38} ${my} Z"/>`);
else if(p.mouth==='oh')parts.push(`<ellipse cx="${mx+3}" cy="${my+13}" rx="${key==='ranca'?17:14}" ry="${key==='ranca'?23:18}"/>`);
else if(p.mouth==='hmm')parts.push(`<path d="M${mx-13} ${my+12} Q${mx+4} ${my+4} ${mx+23} ${my+10}"/>`);
else parts.push(`<path d="M${mx-43} ${my-2} C${mx-19} ${my+29} ${mx+17} ${my+31} ${mx+47} ${my-(p.mouth==='smirk'?15:9)}"/>`);
return `<g class="face" fill="none" stroke="white" stroke-width="10" stroke-linecap="round" stroke-linejoin="round">${parts.join('')}</g>`;}
function handPath(p){const data=Array.isArray(p.shape)?p.shape:shapes[p.shape],contour='M0 0 '+data.map(r=>'C'+r.join(' ')).join(' '),r=p.a*Math.PI/180,tx=(data[0][0]*p.s*Math.cos(r)-data[0][1]*Math.sin(r)),ty=(data[0][0]*p.s*Math.sin(r)+data[0][1]*Math.cos(r));return `<path class="connection" d="M${p.start} C${p.bend} ${p.x-tx*3} ${p.y-ty*3} ${p.x} ${p.y}"/><path class="palm" transform="translate(${p.x} ${p.y}) rotate(${p.a}) scale(${p.s*2} 2)" stroke-width="4.3" d="${contour}"/>`;}
function art(key,p){const [rot,sx,sy,y]=p.body,cx=key==='ranca'?414:365,cy=290;return `<g class="body" transform="translate(0 ${y}) translate(${cx} ${cy}) rotate(${rot}) scale(${sx} ${sy}) translate(${-cx} ${-cy})"><image href="${key}-body.webp" width="${key==='ranca'?741:745}" height="${key==='ranca'?532:528}"/>${face(key,p)}<g class="hands" fill="none" stroke="white" stroke-width="8.6" stroke-linecap="round" stroke-linejoin="round">${p.hands.map(handPath).join('')}</g></g>`;}
function svg(key,p,index){return `<svg xmlns="http://www.w3.org/2000/svg" data-character="${key}" data-state="${names[index]}" viewBox="${key==='ranca'?'45 -27 750 580':'-35 -27 800 580'}">${art(key,p)}</svg>`;}
for(const key of ['ranca','cana'])poses[key].forEach((p,i)=>{const card=document.createElement('article');card.className='card';card.innerHTML=`<div class="label">${names[i]}</div>${svg(key,p,i)}<p class="caption">${p.caption}</p>`;document.getElementById(key+'-row').append(card);});
window.internalStates={ready:true,names,poses,shapes,art,svg};
})();
