// Review-only articulation of the pre-existing reconstructed vector. No raster overlays.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let running=[];
const frames=(values)=>values.map(transform=>({transform}));
const neutral='translate(0px,0px) rotate(0deg) scale(1)';
const poses={
 welcome:{
  '.rig-hand-left':[neutral,'translate(65px,-12px) rotate(35deg)','translate(65px,-12px) rotate(57deg)','translate(65px,-12px) rotate(22deg)','translate(65px,-12px) rotate(48deg)',neutral],
  '.rig-eye-left':['translateY(0px)','translateY(-8px)','translateY(0px)'],
  '.rig-eye-right':['translateY(0px)','translateY(-8px)','translateY(0px)'],
  '.rig-smile':['scale(1)','scale(1.06,1.1)','scale(1)']
 },
 study:{
  '.rig-eye-left':['translate(0px,0px)','translate(12px,4px)','translate(12px,4px)','translate(-9px,8px)','translate(-9px,8px)','translate(0px,0px)'],
  '.rig-eye-right':['translate(0px,0px)','translate(12px,4px)','translate(12px,4px)','translate(-9px,8px)','translate(-9px,8px)','translate(0px,0px)'],
  '.rig-hand-left':[neutral,'translate(65px,30px) rotate(-14deg)','translate(65px,30px) rotate(-14deg)',neutral],
  '.rig-smile':['scale(1)','scale(.96,.9)','scale(1)']
 },
 cards:{
  '.rig-hand-left':[neutral,'translate(100px,20px) rotate(22deg)','translate(65px,40px) rotate(-3deg)',neutral,neutral],
  '.rig-hand-right':[neutral,neutral,'translate(-85px,-65px) rotate(14deg)','translate(-50px,-30px) rotate(-9deg)',neutral],
  '.rig-eye-left':['translateX(0px)','translateX(-12px)','translateX(12px)','translateX(12px)','translateX(0px)'],
  '.rig-eye-right':['translateX(0px)','translateX(-12px)','translateX(12px)','translateX(12px)','translateX(0px)']
 },
 confidence:{
  '.rig-eye-left':['scaleY(1)','scaleY(.35)','scaleY(.35)','scaleY(1)'],
  '.rig-eye-right':['scaleY(1)','scaleY(.35)','scaleY(.35)','scaleY(1)'],
  '.rig-smile':['scale(1)','scale(1.06,.85)','scale(1.06,.85)','scale(1)'],
  '.rig-hand-left':[neutral,'translate(20px,14px) rotate(-8deg)',neutral],
  '.rig-hand-right':[neutral,'translate(-18px,12px) rotate(7deg)',neutral]
 },
 download:{
  '.rig-hand-right':[neutral,'translate(-70px,-75px) rotate(8deg)','translate(-70px,-30px) rotate(8deg)','translate(-70px,-65px) rotate(8deg)','translate(-70px,-25px) rotate(8deg)',neutral],
  '.rig-eye-left':['translateY(0px)','translateY(13px)','translateY(13px)','translateY(0px)'],
  '.rig-eye-right':['translateY(0px)','translateY(13px)','translateY(13px)','translateY(0px)']
 },
 question:{
  '.rig-body':['rotate(0deg)','rotate(-4deg)','rotate(-4deg)','rotate(0deg)'],
  '.rig-eye-left':['translateY(0px) scaleY(1)','translateY(-12px) scaleY(1.14)','translateY(-12px) scaleY(1.14)','translateY(0px) scaleY(1)'],
  '.rig-eye-right':['translateY(0px) scaleY(1)','translateY(5px) scaleY(.65)','translateY(5px) scaleY(.65)','translateY(0px) scaleY(1)'],
  '.rig-smile':['scale(1)','scale(.88,.8)','scale(.88,.8)','scale(1)']
 }
};
const idles={
 welcome:{'.rig-hand-left':[neutral,'translate(50px,-8px) rotate(34deg)','translate(50px,-8px) rotate(46deg)',neutral]},
 study:{'.rig-eye-left':['translateX(0px)','translateX(7px)','translateX(-5px)','translateX(0px)'],'.rig-eye-right':['translateX(0px)','translateX(7px)','translateX(-5px)','translateX(0px)']},
 cards:{'.rig-hand-left':[neutral,'translate(70px,20px) rotate(16deg)',neutral],'.rig-eye-left':['translateX(0px)','translateX(-7px)','translateX(0px)'],'.rig-eye-right':['translateX(0px)','translateX(-7px)','translateX(0px)']},
 confidence:{'.rig-eye-left':['scaleY(1)','scaleY(.55)','scaleY(1)'],'.rig-eye-right':['scaleY(1)','scaleY(.55)','scaleY(1)'],'.rig-smile':['scale(1)','scale(1.025,.95)','scale(1)']},
 download:{'.rig-hand-right':[neutral,'translate(-55px,-65px) rotate(5deg)','translate(-55px,-35px) rotate(5deg)',neutral],'.rig-eye-left':['translateY(0px)','translateY(7px)','translateY(0px)'],'.rig-eye-right':['translateY(0px)','translateY(7px)','translateY(0px)']},
 question:{'.rig-eye-left':['translateY(0px)','translateY(-7px)','translateY(0px)'],'.rig-eye-right':['scaleY(1)','scaleY(.8)','scaleY(1)']}
};
function stop(){running.forEach(a=>a.cancel());running=[];}
window.playRancaPose=(name,kind='entry')=>{
 stop();if(reduced.matches||document.hidden)return [];
 const pose=(kind==='idle'?idles:poses)[name];if(!pose)throw Error('Unknown prototype pose');
 for(const rig of document.querySelectorAll('.ranca-rig'))for(const [selector,values] of Object.entries(pose)){
  const part=rig.querySelector(selector);const a=part.animate(frames(values),{duration:kind==='idle'?1400:1900,easing:'ease-in-out',iterations:1});running.push(a);
 }
 return running;
};
window.stopRancaPose=stop;
reduced.addEventListener('change',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.rancaRigReady=(async()=>{
 const svg=await(await fetch('ranca-rig.svg')).text();
 for(const [index,id] of ['header-rig','closeup-rig'].entries()){
  // Separate paint-server IDs allow two honest simultaneous scales of the same vector.
  let unique=svg.replace(/id="([^"]+)"/g,(_,name)=>`id="${name}-${index}"`).replace(/href="#([^"]+)"/g,(_,name)=>`href="#${name}-${index}"`).replace(/url\(#([^)]+)\)/g,(_,name)=>`url(#${name}-${index})`);
  document.getElementById(id).innerHTML=unique;
 }
})();
