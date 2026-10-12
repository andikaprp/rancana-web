import {selectedArtwork} from './mascot-data.js';
const NS='http://www.w3.org/2000/svg',base=new URL('.',import.meta.url);
const mix=(a,b,t)=>a+(b-a)*t,clamp=v=>Math.max(0,Math.min(1,v)),ease=t=>t*t*(3-2*t);
const element=(name,attrs={},parent)=>{const n=document.createElementNS(NS,name);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);parent?.append(n);return n;};
function fromTree(tree,parent){const attrs={...tree.attributes};if(attrs.id){attrs['data-source-id']=attrs.id;delete attrs.id;}if(tree.tag==='image')attrs.href=new URL(attrs.href,base).href;const n=element(tree.tag,attrs,parent);for(const c of tree.children)typeof c==='string'?n.append(c):fromTree(c,n);return n;}
const find=(tree,id)=>{if(tree.attributes?.id===id)return tree;for(const c of tree.children||[]){if(typeof c==='object'){const n=find(c,id);if(n)return n;}}};
const nums=d=>(d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)||[]).map(Number);
function points(d,count=80){const p=element('path',{d}),length=p.getTotalLength();return Array.from({length:count},(_,i)=>{const q=p.getPointAtLength(length*i/(count-1));return[q.x,q.y];});}
const path=(p,closed=false)=>p.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(3)} ${y.toFixed(3)}`).join(' ')+(closed?' Z':'');
const between=(a,b,t)=>a.map((p,i)=>p.map((q,j)=>mix(q,b[i][j],t)));
function transformedQuadratic(node){const n=fromTree(node),m=n.transform.baseVal.consolidate()?.matrix;return nums(node.attributes.d).reduce((a,_,i,v)=>{if(i%2===0){const p=new DOMPoint(v[i],v[i+1]);const q=m?p.matrixTransform(m):p;a.push([q.x,q.y]);}return a;},[]);}
function eyeShape(tree,side){const group=find(tree,`cana-${side}-eye-group`),lid=find(group,`cana-${side}-eye`),body=find(group,`cana-${side}-open-eye`);let contour;
 if(body?.tag==='ellipse'){const{cx,cy,rx,ry}=body.attributes;contour=Array.from({length:64},(_,i)=>{const a=-Math.PI/2+i*Math.PI*2/64;return[+cx+rx*Math.cos(a),+cy+ry*Math.sin(a)];});}
 else if(body){contour=points(body.attributes.d,64);const top=contour.reduce((m,p,i)=>p[1]<contour[m][1]?i:m,0);contour=contour.slice(top).concat(contour.slice(0,top));}
 else{const p=points(lid.attributes.d,33);contour=p.slice(0,32).concat(p.slice(1).reverse());}
 return{contour,lid:points(lid.attributes.d,32),lidPath:lid.attributes.d,stroke:body?.tag==='ellipse'?0:1,lashes:[1,2,3].map(i=>transformedQuadratic(find(group,`cana-${side}-lash-${i}`)))};
}
const cache={};let instance=0;
function faceShapes(){if(!cache.eyes)cache.eyes=['left','right'].map(side=>Object.fromEntries(['default-open','closed','contextual-sassy'].map(s=>[s,eyeShape(selectedArtwork[s].cana,side)])));return cache.eyes;}
function posture(character,pose){const green=character==='ranca';const s={left:green?[240,417,180,0]:[222,406,180,0],right:green?[568,427,180,0]:[550,418,180,0],closed:0,sassy:0,cover:0,gaze:[0,0]};
 if(['lift1','lift2','present','settle1','settle2','encourage'].includes(pose)){
  const strength={lift1:.33,lift2:.67,present:1,settle1:.67,settle2:.33,encourage:.72}[pose];const side=green?'right':'left';const target=green?[606,274,60,1]:[205,275,300,1];s[side]=s[side].map((v,i)=>mix(v,target[i],strength));
 }
 if(pose==='wave'){s.left=green?[230,222,350,1]:[207,218,350,1];}
 if(pose==='search'){if(green)s.right=[436,136,85,1];else s.left=[265,190,275,1];s.gaze=[green?5:-5,-3];}
 if(pose==='peek'){s.left=green?[240,335,350,.8]:[223,334,350,.8];s.right=green?[555,330,15,.8]:[523,326,15,.8];s.sassy=green?0:1;s.gaze=[green?4:-4,0];}
 if(pose==='duck'){s.closed=1;s.left=green?[245,361,180,.3]:[230,357,180,.3];s.right=green?[560,365,180,.3]:[537,360,180,.3];}
 if(pose==='cover'){s.left=green?[326,222,0,1]:[268,241,0,1];s.right=green?[431,180,0,1]:[407,238,0,1];s.closed=1;s.cover=1;}
 if(pose==='found'){s.right=green?[580,187,15,1]:[529,195,20,1];if(!green)s.left=[230,216,340,1];}
 if(pose==='think'){s.gaze=[4,-3];s.closed=green?.15:0;}
 if(pose==='read'){s.gaze=[3,8];s.closed=.15;}
 if(pose==='down'){s.right=green?[603,369,120,1]:[575,365,120,1];s.gaze=[3,6];}
 if(pose==='blink')s.closed=1;
 return s;
}
export function createMascot(character,{smallCana=true,costume=false}={}){
 if(!['ranca','cana'].includes(character))throw Error('Unknown mascot');const green=character==='ranca',w=green?741:745,h=green?532:528;
 const svg=element('svg',{xmlns:NS,viewBox:`0 0 ${w} ${h}`,width:w,height:h,'aria-hidden':'true',focusable:'false',class:'companion-art ranca-rig','data-mascot-identity':character,'data-selected-design':'A'});
 const body=element('g',{class:'rig-body'},svg),placement=element('g',{'data-character':character},body);
 if(!green&&smallCana)placement.setAttribute('transform','translate(34.545 48.97) scale(.907258064516129)');
 const source=selectedArtwork['default-open'][character];
 const image=fromTree(source.children.find(n=>n.tag==='image'),placement);image.classList.add('rig-body-texture');image.setAttribute('data-companion-body','');image.setAttribute('data-art-part','body');
 const faceTree=source.children.find(n=>n.attributes['data-face-map']);const face=fromTree(faceTree,placement);face.setAttribute('data-companion-face','');face.setAttribute('data-art-part','face');face.classList.add('rig-face');
 const eyes=['left','right'].map(side=>face.querySelector(`[data-source-id="${character}-${side}-eye-group"]`));
 let eyeModels;
 if(!green){const shapes=faceShapes();eyeModels=eyes.map((g,i)=>{g.replaceChildren();const white=element('path',{fill:'#fff9fc',stroke:'none'},g),lid=element('path',{fill:'none',stroke:'#fff9fc','stroke-width':3.7,'stroke-linecap':'round'},g);const lashes=element('g',{'data-lashes':i?'right':'left',fill:'none',stroke:'#fff9fc','stroke-width':.95,'stroke-linecap':'round','stroke-linejoin':'round'},g);return{g,white,lid,lashes:[0,1,2].map(j=>element('path',{'data-lash':j+1},lashes)),shapes:shapes[i]};});}
 const hands=['left','right'].map((side,i)=>{const color=green?'#f6fff8':'#fff9fc';const g=element('g',{'data-companion-hand':side,'data-art-part':'hand-'+side,class:'rig-hand-'+side,fill:'none',stroke:color,'stroke-width':green?9.36:9.62,'stroke-linecap':'round','stroke-linejoin':'round'},placement);const arm=element('path',{'data-arm':side},g),hand=element('path',{'data-palm':side,'stroke-width':green?3.6:3.7},g);const open=find(source,`${character}-left-palm`).attributes.d,rest=find(source,`${character}-right-palm`).attributes.d;return{g,arm,hand,open,rest,openPoints:points(open),restPoints:points(rest),root:green?(i?[568,306]:[240,312]):(i?[550,299]:[222,307])};});
 function setPose(pose='ready',time=0,context={}){
  const a=posture(character,pose),b=posture(character,context.nextPose||pose),t=ease(clamp(context.progress||0)),closed=Math.max(mix(a.closed,b.closed,t),clamp(context.blink||0)),sassy=mix(a.sassy,b.sassy,t),cover=mix(a.cover,b.cover,t),gaze=a.gaze.map((v,i)=>mix(v,b.gaze[i],t));
  face.setAttribute('transform',faceTree.attributes.transform+` translate(${gaze[0]} ${gaze[1]})`);
  if(green){eyes.forEach(g=>{g.querySelector('path').setAttribute('d',`M -8 1 Q 2 ${mix(-8,1,closed)} 12 1`);g.setAttribute('opacity',1-cover);});}
  else eyeModels.forEach(({g,white,lid,lashes,shapes})=>{const open=shapes['default-open'],half=shapes['contextual-sassy'],shut=shapes.closed;const shape=between(open.contour,half.contour,sassy),lidShape=between(open.lid,half.lid,sassy);
   white.setAttribute('d',path(between(shape,shut.contour,closed),true));white.setAttribute('opacity',1-closed);
   lid.setAttribute('d',closed===1?shut.lidPath:sassy===1&&closed===0?half.lidPath:path(between(lidShape,shut.lid,closed)));lid.setAttribute('opacity',mix(sassy,1,closed));
   lashes.forEach((l,i)=>{const q=between(between(open.lashes[i],half.lashes[i],sassy),shut.lashes[i],closed);l.setAttribute('d',`M${q[0]} Q${q[1]} ${q[2]}`);});g.setAttribute('opacity',1-cover);
  });
  hands.forEach(({arm,hand,root,open,rest,openPoints,restPoints},i)=>{
   const key=i?'right':'left',[x,y,angle,flex]=a[key].map((v,j)=>mix(v,b[key][j],t)),rad=angle*Math.PI/180;
   // The palm's connected wrist endpoint is (4,11), after the selected mirrored orientation.
   const ex=x+2.6*(-4*Math.cos(rad)-11*Math.sin(rad)),ey=y+2.6*(-4*Math.sin(rad)+11*Math.cos(rad));
   const resting=clamp(1-flex),bend=(i?1:-1)*mix(36,2,resting);
   arm.setAttribute('d',`M${root} C${root[0]+bend} ${root[1]+(ey-root[1])*.38} ${ex+bend*.25} ${ey+(angle<180?-20:15)*flex} ${ex} ${ey}`);
   hand.setAttribute('d',flex===0?rest:flex===1?open:path(between(restPoints,openPoints,flex)));
   hand.setAttribute('transform',`translate(${x} ${y}) rotate(${angle}) scale(-2.6 2.6)`);
  });
  svg.dataset.mascotPose=pose;svg.dataset.eyeState=closed>.95?'closed':sassy>.8?'contextual-sassy':'normal-open';
 }
 if(costume){
  svg.setAttribute('viewBox','0 0 280 320');svg.setAttribute('width','280');svg.setAttribute('height','320');
  // Retain the actual backpack/cap pixels from the canonical audience artwork.
  // Only accessory silhouettes are clipped out; no old face/body is overlaid.
  const id='audience-accessory-'+(++instance),defs=element('defs',{},svg),clip=element('clipPath',{id},defs);
  const outline=green?'M17 155 Q43 142 62 153 L69 177 L64 202 L61 233 L51 247 L23 247 Q0 228 3 193 Z M60 152 Q80 145 93 165 L102 181 L91 187 L85 175 Q79 167 69 165 Z':'M55 72 L122 50 L216 98 L218 110 L172 125 Q166 105 132 99 Q103 94 79 104 L78 93 Z M170 75 Q190 90 191 111 Q205 118 207 140 L212 145 Q200 157 185 147 L181 132 L185 115 Q181 94 170 82 Z';
  element('path',{d:outline},clip);
  const accessory=element('g',{'data-costume':green?'backpack':'academic-cap',transform:green?'translate(0 20)':'translate(28 48)'},svg);
  element('image',{href:new URL('assets/mascots/'+(green?'ranca-backpack-option-3.webp':'cana-academic-cap-option-3.webp'),base).href,width:green?244:236,height:320,'clip-path':`url(#${id})`},accessory);
  const frame=element('g',{transform:green?'translate(22 108) scale(.34)':'translate(7 125) scale(.35)','data-audience-placement':''},svg);frame.append(body);
  if(!green)svg.append(accessory);
 }
 setPose('ready');return{svg,body,face,hands,setPose,character};
}
