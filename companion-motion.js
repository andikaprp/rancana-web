// The approved WebPs are used intact. These are whole-image leans and dance steps,
// never independent hand or facial animation. No replacement artwork or overlays.
(()=>{
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 if(!('IntersectionObserver' in window)||!Element.prototype.animate)return;
 const actors=[];
 for(const [selector,character,scene] of [
  ['.hero-companion-ranca .hero-mascot','ranca','present'],
  ['.hero-companion-cana .hero-mascot','cana','present'],
  ['.footer-brand-row>.footer-mascot:first-child','ranca','dance'],
  ['.footer-brand-row>.footer-mascot:last-child','cana','dance']
 ]){
  const image=document.querySelector(selector);if(!image)continue;
  image.dataset.companionCharacter=character;image.dataset.companionScene=scene;
  actors.push({image,character,scene,visible:false,animation:null});
 }
 const neutral='translate(0%,0%) rotate(0deg) scale(1)';
 function create(actor){
  if(actor.animation)return;
  const green=actor.character==='ranca';let frames;
  if(actor.scene==='present'){
   const d=green?0:.09;
   frames=[[0,neutral],[.035+d,neutral],[.11+d,green?'translate(2%,-3%) rotate(5deg) scale(1.015)':'translate(-2%,-3%) rotate(-5deg) scale(1.015)'],[.22+d,green?'translate(2%,-1%) rotate(3deg) scale(1.01)':'translate(-2%,-1%) rotate(-3deg) scale(1.01)'],[.29+d,green?'translate(2%,-3%) rotate(5deg) scale(1.015)':'translate(-2%,-3%) rotate(-5deg) scale(1.015)'],[.38+d,neutral],[1,neutral]];
  }else{
   frames=green?[[0,neutral],[.05,neutral],[.1,'translate(-1%,-5%) rotate(-6deg) scale(1.01)'],[.16,neutral],[.22,'translate(1%,-6%) rotate(6deg) scale(1.015)'],[.29,neutral],[.39,'translate(0%,-1%) rotate(2deg) scale(1)'],[.46,neutral],[1,neutral]]:[[0,neutral],[.15,neutral],[.23,'translate(1%,-4%) rotate(7deg) scale(1.01)'],[.3,'translate(-1%,-5%) rotate(-7deg) scale(1.015)'],[.38,'translate(0%,-3%) rotate(4deg) scale(1)'],[.46,neutral],[1,neutral]];
  }
  actor.animation=actor.image.animate(frames.map(([offset,transform])=>({offset,transform,easing:'ease-in-out'})),{duration:actor.scene==='present'?11000:9600,iterations:Infinity,fill:'both'});
  actor.animation.pause();actor.animation.currentTime=0;
 }
 let pageActive=true;
 function sync(){
  for(const actor of actors){
   if(reduce.matches){actor.animation?.cancel();actor.animation=null;actor.image.dataset.companionMotion='reduced';continue;}
   create(actor);const active=actor.visible&&!document.hidden&&pageActive;
   active?actor.animation.play():actor.animation.pause();actor.image.dataset.companionMotion=active?'playing':'paused';
  }
 }
 const observer=new IntersectionObserver(entries=>{for(const entry of entries){const actor=actors.find(a=>a.image===entry.target);if(actor)actor.visible=entry.isIntersecting&&entry.intersectionRatio>=.25;}sync();},{threshold:[0,.25]});
 actors.forEach(a=>observer.observe(a.image));reduce.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
 window.addEventListener('pagehide',()=>{pageActive=false;sync();});window.addEventListener('pageshow',()=>{pageActive=true;sync();});sync();
})();
