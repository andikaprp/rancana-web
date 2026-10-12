/* Isolated study only. Source-coordinate centerline trace, not a generic glove.
   Sources and deviations are recorded in REFERENCE-NOTES.md. */
(()=>{'use strict';
 const arm=document.querySelector('#study-arm'),hand=document.querySelector('#study-hand'),contour=document.querySelector('#study-contour'),stage=document.querySelector('#motion-stage');
 const sourceGrip=[[-2,-5,-2.5,-15,1,-20],[4,-26,12,-30,18,-27],[22,-26,24,-21,20,-20],[18,-19,15,-18,13,-18],[18,-21,22,-21,24,-17],[27,-14,26,-11,21,-11],[20,-11,18,-10,17,-10],[22,-13,26,-12,27,-8],[29,-4,22,0,19,2],[16,4,12,4,9,3]];
 // Keep the source's short rounded arcs and large palm; open only a little.
 const openGreeting=[[-3,-5,-3,-15,1,-20],[4,-26,11,-30,17,-28],[23,-27,25,-22,21,-20],[19,-19,16,-17,14,-17],[23,-24,29,-23,28,-18],[27,-15,23,-13,20,-12],[23,-13,25,-14,26,-14],[31,-17,34,-13,30,-9],[27,-4,22,0,18,2],[15,4,12,4,9,3]];
 const smooth=t=>t*t*(3-2*t),lerp=(a,b,t)=>a+(b-a)*t;
 const beats=[[0,91,216,0,0],[700,91,216,0,0],[1550,111,209,-70,.3],[2100,111,209,-60,.3],[2700,111,209,-80,.3],[3300,111,209,-60,.3],[3800,111,209,-70,.3],[4650,91,216,0,0],[5000,91,216,0,0],[6000,91,216,0,0]];
 let time=0,last=0,raf=0,playing=false,visible=true,pageActive=true;
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 function paint(ms){
  time=Math.min(6000,Math.max(0,ms));let i=0;while(i<beats.length-2&&beats[i+1][0]<=time)i++;
  const a=beats[i],b=beats[i+1],t=smooth((time-a[0])/(b[0]-a[0]));const values=a.slice(1).map((v,j)=>lerp(v,b[j+1],t));const[x,y,angle,open]=values;
  contour.setAttribute('d','M0 0 '+sourceGrip.map((p,j)=>'C'+p.map((v,k)=>lerp(v,openGreeting[j][k],open).toFixed(3)).join(' ')).join(' '));
  hand.setAttribute('transform',`translate(${x} ${y}) rotate(${angle})`);
  // The path starts at the exact transformed hand origin; no closed wrist seam.
  const lift=(216-y)/7;
  const radians=angle*Math.PI/180;
  const tangent=[-2*Math.cos(radians)+5*Math.sin(radians),-2*Math.sin(radians)-5*Math.cos(radians)];
  const control=[lerp(x-6,x-tangent[0]*1.25,lift),lerp(y+5,y-tangent[1]*1.25,lift)];
  arm.setAttribute('d',`M77 203 C${lerp(72,82,lift)} ${lerp(209,213,lift)} ${lerp(65,94,lift)} ${lerp(220,231,lift)} ${lerp(68,106,lift)} ${lerp(225,226,lift)} C${lerp(73,115,lift)} ${lerp(231,222,lift)} ${control[0]} ${control[1]} ${x} ${y}`);
  stage.dataset.time=time.toFixed(2);stage.dataset.wrist=`${x},${y}`;
 }
 function active(){return playing&&visible&&pageActive&&!document.hidden&&!reduce.matches;}
 function tick(now){raf=0;if(!active()){last=0;return;}if(last)paint(time+now-last);last=now;if(time>=6000){playing=false;document.querySelector('#play').setAttribute('aria-pressed','false');return;}raf=requestAnimationFrame(tick);}
 function sync(){if(raf)cancelAnimationFrame(raf);raf=0;last=0;if(reduce.matches){playing=false;paint(0);document.querySelector('#play').setAttribute('aria-pressed','false');}if(active())raf=requestAnimationFrame(tick);}
 document.querySelector('#play').onclick=()=>{if(reduce.matches)return;playing=!playing;if(playing){paint(0);document.querySelector('#underlay').checked=false;document.querySelector('#reference-underlay').setAttribute('opacity','0');}document.querySelector('#play').setAttribute('aria-pressed',String(playing));sync();};
 document.querySelectorAll('[data-pose]').forEach(b=>b.onclick=()=>{playing=false;paint(Number(b.dataset.pose));document.querySelector('#play').setAttribute('aria-pressed','false');sync();});
 document.querySelector('#underlay').onchange=e=>{playing=false;paint(0);document.querySelector('#reference-underlay').setAttribute('opacity',e.target.checked?'.55':'0');sync();};
 new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(stage);
 document.addEventListener('visibilitychange',sync);addEventListener('pagehide',()=>{pageActive=false;sync();});addEventListener('pageshow',()=>{pageActive=true;sync();});reduce.addEventListener('change',sync);
 stage.addEventListener('study:seek',e=>{playing=false;paint(e.detail.time);sync();});paint(0);
})();
