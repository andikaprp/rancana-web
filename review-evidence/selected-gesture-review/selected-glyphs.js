(async()=>{'use strict';
const NS='http://www.w3.org/2000/svg',make=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;},clamp=x=>Math.max(0,Math.min(1,x)),mix=(a,b,t)=>a+(b-a)*t,ease=x=>x*x*x*(x*(x*6-15)+10),lerp=(a,b,t)=>a.map((x,i)=>Array.isArray(x)?lerp(x,b[i],t):mix(x,b[i],t));
const poseNames=['Wave','Present','Point','Hold','Peek'],emotions=['happy','curious','thinking','playful','surprised'],duration=13000;
const configs={ranca:{width:244,color:'#f6fff8',stroke:3.6,leftShoulder:[77,203],rightShoulder:[207,197],faceROI:[118,109,195,187],handROI:[192,186,235,230]},cana:{width:236,color:'#fff9fc',stroke:3.7,leftShoulder:[57,209],rightShoulder:[175,194],faceROI:[52,135,140,194],handROI:[168,149,224,220]}};
const open=[[-4,11],[-8,9,-11,5,-14,0],[-18,-5,-17,-9,-14,-9],[-11,-9,-10,-5,-7,-3],[-8,-7,-9,-12,-9,-15],[-9,-20,-4,-21,-3,-16],[-2,-14,-1,-11,-1,-10],[-1,-12,-1,-16,-1,-18],[-1,-23,5,-23,5,-18],[5,-16,5,-12,5,-10],[5.7,-11.7,6.3,-13.3,7,-15],[9,-20,14,-18,13,-13],[12.3,-9,11.7,-5,11,-1],[10,4,8,9,4,11]];
const point=[[-4,11],[-8,9,-11,5,-13,1],[-17,-3,-16,-7,-13,-7],[-10,-7,-9,-4,-7,-3],[-8,-8,-8,-16,-8,-21],[-8,-26,-3,-26,-3,-21],[-3,-14,-2,-7,-2,-4],[-1,-5,1,-6,3,-5],[5,-5,7,-3,6,-1],[5,-.5,4,0,4,1],[7,-2,9,-2,11,0],[14,3,12,6,10,7],[8,8,6,9,5,10],[4.5,10.4,4.3,10.8,4,11]];
const relaxed=[[-4,11],[-8,9,-11,4,-12,0],[-15,-4,-13,-8,-10,-7],[-7,-6,-7,-3,-5,-2],[-5,-5,-6,-8,-5,-10],[-3,-13,0,-12,0,-9],[0,-7,0,-5,0,-4],[1,-6,2,-8,3,-9],[5,-11,8,-9,7,-6],[6,-4,6,-3,5,-2],[7,-4,9,-5,11,-3],[13,-1,11,3,9,5],[8,7,7,9,6,10],[5,10.5,4.5,10.8,4,11]];
const grip=[[-4,11],[-5.6,7,-6, -1,-3.2,-5],[-.8,-9.8,5.6,-13,10.4,-10.6],[13.6,-9.8,15.2,-5.8,12,-5],[10.4,-4.2,8,-3.4,6.4,-3.4],[10.4,-5.8,13.6,-5.8,15.2,-2.6],[17.6,-.2,16.8,2.2,12.8,2.2],[12,2.2,10.4,3,9.6,3],[13.6,.6,16.8,1.4,17.6,4.6],[19.2,7.8,13.6,11,11.2,12.6],[9.6,13.6,8,14.1,6.4,14.1],[5.6,14.1,4.8,14,4,13.6],[4,12.8,4,12,4,11.6],[4,11.4,4,11.2,4,11]];
const hands={open,point,relaxed,grip};
// Wrist position, rotation, contour, mirror, elbow. Each character has its own placements.
const layouts={
 ranca:[
  {l:[64,174,-8,'open',1,59,222],r:[183,224,174,'relaxed',-1,214,211],body:[-2,0,-2]},
  {l:[60,207,-72,'open',1,54,235],r:[183,224,174,'relaxed',-1,214,211],body:[4,1,0]},
  {l:[71,192,-26,'point',1,54,229],r:[183,224,174,'relaxed',-1,214,211],body:[-4,-1,-1]},
  {l:[94,207,0,'grip',1,64,231],r:[209,211,17,'grip',-1,229,226],body:[2,0,1]},
  {l:[133,137,78,'open',1,88,218],r:[183,224,174,'relaxed',-1,214,211],body:[-7,-10,1]}
 ],
 cana:[
  {l:[34,183,-4,'open',1,23,225],r:[178,224,170,'relaxed',-1,203,206],body:[3,0,0]},
  {l:[42,214,-75,'open',1,29,238],r:[178,224,170,'relaxed',-1,203,206],body:[-4,2,-1]},
  {l:[55,226,186,'relaxed',1,35,207],r:[200,181,18,'point',-1,204,226],body:[4,2,-1]},
  {l:[78,216,-23,'grip',1,42,241],r:[150,217,27,'grip',-1,184,242],body:[-2,0,-1]},
  {l:[55,226,186,'relaxed',1,35,207],r:[112,141,-78,'open',-1,179,215],body:[7,10,1]}
 ]
};
function pathOf(contour){return`M ${contour[0].join(' ')} `+contour.slice(1).map(c=>`C ${c.join(' ')}`).join(' ');}
function world(p,hand){const[x,y,angle,,mirror]=hand,a=angle*Math.PI/180;return[x+p[0]*mirror*Math.cos(a)-p[1]*Math.sin(a),y+p[0]*mirror*Math.sin(a)+p[1]*Math.cos(a)];}
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

window.selectedGlyphs={make,configs,hands,layouts,pathOf,world,face};
})();
