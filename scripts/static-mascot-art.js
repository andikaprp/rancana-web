// Build-time only. These exports are static SVG images, never runtime actors.
import {selectedArtwork} from '../mascot-data.js';
import {createMascot} from '../mascot-rig.js';
const NS='http://www.w3.org/2000/svg',base=new URL('../',import.meta.url);
const el=(tag,a={},parent)=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(a))n.setAttribute(k,v);parent?.append(n);return n;};
function tree(node,parent){const a={...node.attributes};if(a.id){a['data-source-id']=a.id;delete a.id;}const n=el(node.tag,a,parent);for(const c of node.children||[])tree(c,n);return n;}
const image=async url=>{const i=new Image();i.src=new URL(url,base).href;await i.decode();return i;};
export async function audience(character,{rebuildCleanup=false}={}){
 const green=character==='ranca',w=green?244:236,file=green?'ranca-backpack-option-3.webp':'cana-academic-cap-option-3.webp',box=green?[117,109,80,80]:[52,134,91,61];
 const original=await image('assets/mascots/'+file),canvas=document.createElement('canvas');canvas.width=w;canvas.height=320;const ctx=canvas.getContext('2d');ctx.drawImage(original,0,0);const pixels=ctx.getImageData(0,0,w,320).data,mask=new Uint8Array(w*320);
 // Detect only the old white facial ink, within a bounded face-only region.
 // One-pixel dilation removes its antialias fringe without touching hands/costume.
 for(let y=box[1];y<box[1]+box[3];y++)for(let x=box[0];x<box[0]+box[2];x++){
  const k=(y*w+x)*4,[r,g,b]=pixels.slice(k,k+3),white=green?r>115&&g>150&&b>125:g>125&&r>190&&b>145;
  if(white)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx>=box[0]&&xx<box[0]+box[2]&&yy>=box[1]&&yy<box[1]+box[3])mask[yy*w+xx]=1;}
 }
 // Match the generated clean texture to the untouched surrounding pixels.
 // Only the old facial-ink mask is blended; no body/accessory/hand pixel outside
 // that mask is replaced. Boundary-constrained Poisson blending avoids ghosts.
 let cleanData=new URL('assets/mascots/face-patches/'+character+'-cleaned-ink.png',base).href;
 if(rebuildCleanup){
 const patch=await image('assets/mascots/face-patches/'+character+'-cleanup.png'),clean=document.createElement('canvas');clean.width=w;clean.height=320;const cc=clean.getContext('2d');cc.drawImage(patch,box[0],box[1]);const seed=cc.getImageData(0,0,w,320).data,blend=new Float64Array(pixels),indices=[];
 for(let y=box[1];y<box[1]+box[3];y++)for(let x=box[0];x<box[0]+box[2];x++)if(mask[y*w+x]){const k=(y*w+x)*4;indices.push(k);for(let c=0;c<3;c++)blend[k+c]=seed[k+c];}
 for(let n=0;n<350;n++)for(const k of indices)for(let c=0;c<3;c++){const neighbors=[k-4,k+4,k-w*4,k+w*4],lap=4*seed[k+c]-neighbors.reduce((sum,j)=>sum+seed[j+c],0);blend[k+c]=(neighbors.reduce((sum,j)=>sum+blend[j+c],0)+lap)/4;}
 const patched=ctx.createImageData(w,320);patched.data.set(pixels);for(const k of indices)for(let c=0;c<3;c++)patched.data[k+c]=Math.max(0,Math.min(255,Math.round(blend[k+c])));ctx.putImageData(patched,0,0);clean.width=box[2];clean.height=box[3];cc.drawImage(canvas,-box[0],-box[1]);cleanData=clean.toDataURL('image/png');
 }
 const svg=el('svg',{xmlns:NS,viewBox:`0 0 ${w} 320`,width:w,height:320,'data-static-character':character,'data-face-only':'true','data-face-box':box.join(' ')});
 el('image',{href:new URL('assets/mascots/'+file,base).href,width:w,height:320,'data-original-composition':file},svg);
 const defs=el('defs',{},svg),clip=el('clipPath',{id:character+'-facial-ink'},defs);let d='';
 for(let y=box[1];y<box[1]+box[3];y++){let x=box[0];while(x<box[0]+box[2]){if(!mask[y*w+x]){x++;continue;}const start=x;while(x<box[0]+box[2]&&mask[y*w+x])x++;d+=`M${start} ${y}h${x-start}v1h-${x-start}Z`;}}
 el('path',{d},clip);
 el('image',{href:cleanData,x:box[0],y:box[1],width:box[2],height:box[3],'clip-path':`url(#${character}-facial-ink)`,'data-old-face-cleanup':''},svg);
 const face=selectedArtwork['default-open'][character].children.find(n=>n.attributes['data-face-map']).children[0];tree(face,svg);
 return svg;
}
export function glasses(){
 const rig=createMascot('cana',{sunglasses:true}),svg=rig.svg;svg.dataset.staticCharacter='cana';svg.dataset.staticPose='adjust-glasses';
 // Eyes sit behind the unchanged opaque lenses; three soft lashes can peek above.
 const eyes=[...svg.querySelectorAll('[data-source-id$="eye-group"]')];
 eyes[0].setAttribute('transform','translate(86.7 170.8) rotate(-12) scale(.75)');
 eyes[1].setAttribute('transform','translate(125 162.6) rotate(-12) scale(.75)');
 // Keep all three short lashes readable along each unchanged frame rim.
 svg.querySelectorAll('[data-lashes]').forEach(n=>n.remove());
 const placement=svg.querySelector('[data-character="cana"]'),accessory=svg.querySelector('[data-static-accessory]');
 for(const [side,roots]of [['left',[[290,222],[311,218],[332,214]]],['right',[[408,200],[428,194],[448,189]]]]){const lashes=el('g',{'data-lashes':side,fill:'none',stroke:'#fff9fc','stroke-width':3.04,'stroke-linecap':'round'},placement);placement.insertBefore(lashes,accessory);for(const [i,[x,y]]of roots.entries())el('path',{'data-lash':i+1,d:`M${x} ${y} Q${x+(i-1)*2} ${y-5} ${x+(i-1)*3} ${y-10}`},lashes);}
 svg.querySelector('[data-source-id="cana-mouth"]').setAttribute('d','M 87 186 Q 99 199 113 184');
 const poses=[[321,383,80,238,404],[502,211,320,587,274]];
 rig.hands.forEach(({arm,hand,root,rest},i)=>{
  const[x,y,angle,bx,by]=poses[i],rad=angle*Math.PI/180,ex=x+2.6*(4*Math.cos(rad)-11*Math.sin(rad)),ey=y+2.6*(4*Math.sin(rad)+11*Math.cos(rad)),tx=(ex-root[0])*.16,ty=(ey-root[1])*.16;
  arm.setAttribute('d',i?`M${root} C620 339 608 246 ${ex} ${ey}`:`M${root} C210 411 264 414 ${ex} ${ey}`);
  hand.setAttribute('d',rest);hand.setAttribute('transform',`translate(${x} ${y}) rotate(${angle}) scale(-2.6 2.6)`);
 });return svg;
}
