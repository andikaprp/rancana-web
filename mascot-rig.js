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
// Palm centre, wrist rotation, finger spread, then the articulated elbow.
// Interior shoulder anchors never detach; elbows and wrists lead different phases.
function posture(character,pose){
 const green=character==='ranca';
 const s={left:green?[240,417,180,0,224,369]:[222,406,180,0,206,363],right:green?[568,427,180,0,587,374]:[550,418,180,0,568,368],closed:0,sassy:0,cover:0,gaze:[0,0]};
 const pair=(l,r)=>{s.left=l;s.right=r;};
 if(pose==='anticipate')pair(green?[261,437,165,.2,237,391]:[206,426,195,.2,201,385],green?[556,444,195,.2,584,394]:[530,438,165,.2,564,390]);
 if(['lift1','lift2','present','presentHold','settle1','settle2','encourage'].includes(pose)){
  const strength={lift1:.3,lift2:.7,present:1,presentHold:1,settle1:.76,settle2:.28,encourage:.7}[pose];
  const target=green?[[492,377,60,1,324,438],[648,227,60,1,623,340]]:[[165,253,300,1,161,340],[332,387,300,1,459,441]];
  for(const [i,key]of ['left','right'].entries())s[key]=s[key].map((v,j)=>mix(v,target[i][j],strength));
  if(pose==='lift1'||pose==='lift2'){s.left[5]+=25;s.right[5]+=25;}
  if(pose==='presentHold'){s.left[1]-=8;s.right[1]+=6;s.left[2]+=6;s.right[2]-=5;s.left[5]-=10;s.right[4]+=green?-8:8;}
  s.gaze=[green?4:-4,-2];
 }
 if(pose==='wave')s.left=green?[230,222,350,1,192,320]:[207,218,350,1,176,320];
 if(pose==='search'||pose==='scan'){
  pair(green?[447,357,65,1,321,411]:[265,178,275,1,178,269],green?[436,136,85,1,570,203]:[324,352,295,1,455,408]);
  s.gaze=[green?5:-5,-3];
  if(pose==='scan'){const reach=green?s.left:s.right;reach[0]+=green?63:-55;reach[1]-=30;reach[2]+=green?-15:15;reach[4]+=green?35:-35;s.gaze=[green?9:-9,2];}
 }
 if(pose==='feel'){
  pair(green?[378,382,70,1,282,427]:[151,340,290,1,166,379],green?[631,345,80,1,613,394]:[392,390,290,1,489,430]);s.gaze=[green?8:-8,5];
 }
 if(pose==='peek'||pose==='peekHigh'){
  pair(green?[264,305,340,.9,215,365]:[250,320,340,.9,195,367],green?[565,311,20,.9,594,369]:[518,308,20,.9,565,363]);s.sassy=green?0:1;s.gaze=[green?4:-4,0];
  if(pose==='peekHigh'){s.left[1]-=27;s.right[1]+=10;s.left[2]-=12;s.right[2]+=10;s.gaze[1]=-4;}
 }
 if(pose==='duck'||pose==='hide'){
  pair(green?[302,307,340,.9,222,372]:[260,310,340,.9,205,368],green?[496,296,20,.9,575,367]:[458,302,20,.9,558,365]);s.closed=pose==='hide'?1:.6;
 }
 if(pose==='cover'||pose==='count'){
  pair(green?[326,222,0,1,240,318]:[268,241,0,1,207,337],green?[431,180,0,1,560,291]:[407,238,0,1,533,333]);s.closed=1;s.cover=1;
  if(pose==='count'){s.left[2]=-7;s.right[2]=7;s.left[4]-=10;s.right[4]+=10;}
 }
 if(pose==='found'||pose==='celebrate'){
  pair(green?[229,190,340,1,191,292]:[194,202,340,1,167,304],green?[600,173,20,1,620,288]:[556,182,20,1,600,299]);
  if(pose==='celebrate'){s.left[1]+=20;s.right[1]-=15;s.left[2]-=13;s.right[2]+=13;s.left[4]-=12;s.right[4]+=9;}
 }
 if(pose==='think'){s.gaze=[4,-3];s.closed=green?.15:0;}
 if(pose==='read'){s.gaze=[3,8];s.closed=.15;}
 if(pose==='down'){s.right=green?[603,369,120,1,599,342]:[575,365,120,1,577,336];s.gaze=[3,6];}
 if(pose==='blink')s.closed=1;
 return s;
}
export function createMascot(character,{smallCana=true,sunglasses=false}={}){
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
 const hands=['left','right'].map((side,i)=>{const color=green?'#f6fff8':'#fff9fc';const g=element('g',{'data-companion-hand':side,'data-art-part':'hand-'+side,class:'rig-hand-'+side,fill:'none',stroke:color,'stroke-width':green?9.36:9.62,'stroke-linecap':'round','stroke-linejoin':'round'},placement);const arm=element('path',{'data-arm':side},g),hand=element('path',{'data-palm':side,'data-wrist-join':'outer-thumb','data-gap':'inner-wrist','stroke-width':green?3.6:3.7},g);const open=find(source,`${character}-left-palm`).attributes.d,rest=find(source,`${character}-right-palm`).attributes.d;return{g,arm,hand,open,rest,openPoints:points(open),restPoints:points(rest),root:green?(i?[568,306]:[240,312]):(i?[550,299]:[222,307])};});
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
   const key=i?'right':'left',[x,y,angle,flex,bx,by]=a[key].map((v,j)=>j===2?v+(((b[key][j]-v+540)%360)-180)*t:mix(v,b[key][j],t)),rad=angle*Math.PI/180;
   // Outer contour starts at (-4,11), flows into thumb and three fingers,
   // and ends at the inner palm (+4,11). Join the arm to the OUTER start;
   // only the inner wrist joint stays open.
   const ex=x+2.6*(4*Math.cos(rad)-11*Math.sin(rad)),ey=y+2.6*(4*Math.sin(rad)+11*Math.cos(rad));
   // Two tangent-continuous segments describe upper arm and forearm. The
   // wrist approaches along the palm axis, so the hand cannot appear detached.
   const tx=(ex-root[0])*.16,ty=(ey-root[1])*.16;
   arm.setAttribute('d',`M${root} C${mix(root[0],bx,.55)} ${mix(root[1],by,.55)} ${bx-tx} ${by-ty} ${bx} ${by} C${bx+tx} ${by+ty} ${ex-Math.sin(rad)*23} ${ey+Math.cos(rad)*23} ${ex} ${ey}`);
   hand.setAttribute('d',flex===0?rest:flex===1?open:path(between(restPoints,openPoints,flex)));
   hand.setAttribute('transform',`translate(${x} ${y}) rotate(${angle}) scale(-2.6 2.6)`);
  });
  svg.dataset.mascotPose=pose;svg.dataset.eyeState=closed>.95?'closed':sassy>.8?'contextual-sassy':'normal-open';
 }
 if(sunglasses&&!green){
  // Carry over only the existing PR24 sunglasses pixels, never its body/face.
  const id='cana-sunglasses-'+(++instance),defs=element('defs',{},svg),clip=element('clipPath',{id},defs);
  element('path',{d:'M188 238 Q202 228 232 225 L286 222 Q303 218 327 207 L390 191 Q404 187 409 197 L402 218 Q399 250 380 260 Q351 276 328 263 Q314 255 307 240 L297 243 Q298 267 276 281 Q252 296 228 287 Q209 280 201 255 L191 253 Z'},clip);
  element('image',{href:new URL('assets/mascots/cana-sunglasses-reference.webp',base).href,width:640,height:480,'clip-path':`url(#${id})`,transform:'translate(55 -20) scale(1.05)','data-static-accessory':'sunglasses'},placement);
 }
 setPose('ready');return{svg,body,face,hands,setPose,character};
}
