/* Selected A identities share one original texture and one articulated face. */
(() => {
 const moduleURL=new URL('./mascot-rig.js',document.currentScript.src);
 window.RancanaCompanionArt=Object.freeze({async create(original,character){
  const {createMascot}=await import(moduleURL.href),rig=createMascot(character);
  const body=rig.svg.querySelector('image'),preload=new Image();preload.src=body.getAttribute('href');await preload.decode();
  const wrap=document.createElement('span');wrap.className='companion-actor';wrap.setAttribute('aria-hidden','true');original.before(wrap);wrap.append(original,rig.svg);original.dataset.companionOriginal='';
  let shown=false;
  const show=()=>{shown=true;original.style.visibility='hidden';rig.svg.style.visibility='visible';};
  const restoreOriginal=()=>{shown=false;original.style.visibility='visible';rig.svg.style.visibility='hidden';};
  restoreOriginal();return{motionElement:wrap,setPose:rig.setPose,show,restoreOriginal,destroy(){original.style.visibility='';delete original.dataset.companionOriginal;wrap.before(original);wrap.remove();},get shown(){return shown;}};
 }});
})();
