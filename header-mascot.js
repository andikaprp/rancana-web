import {createMascot} from './mascot-rig.js';
export async function mountHeaderMascot(mark){
 const rig=createMascot('ranca'),image=new Image();image.src=rig.svg.querySelector('image').getAttribute('href');await image.decode();
 mark.replaceChildren(rig.svg);mark.dataset.rancaRig='true';mark.setAttribute('aria-hidden','true');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const pageName=location.pathname.replace(/\/$/,'').split('/').pop()?.replace(/\.html$/,'')||'index',pageKey=['id','en'].includes(pageName)?'index':pageName;
 const sectionProfiles = {
  index:['welcome','study','cards','confidence','download','question'],
  about:['welcome','purpose','contact'],
  help:['welcome','study','start','question','contact'],
  premium:['purpose','cards','compare','download','restore','question'],
  articles:['study','calendar','task','flip'],
  'college-schedule':['calendar','study','start','example','edit','question','cards','download'],
  'todo-guide':['task','study','edit','example','confidence','question','cards','download'],
  'flashcard-guide':['cards','study','edit','flip','question','example','next','download'],
  privacy:['privacy','account','cloud','contact','payment','backup','diagnostics','privacy','delete','contact'],
  terms:['document','cards','account','payment','fairness','edit','privacy','contact'],
  'delete-account':['delete','document','cloud','contact']
 };
 const readingPolicy=['privacy','terms','delete-account'].includes(pageKey);
 const selector=pageKey==='articles'?'main .article-hub-header, main > section > header, main .article-card':'main > .hero-wrap, main section, .resource-main .resource-hero, main > article > header, main .article-end';
 const sections=[...document.querySelectorAll(selector)],profiles=new Map(sections.map((section,i)=>{const key=sectionProfiles[pageKey]?.[i]||'document';section.dataset.rancaBehavior=key;return[section,key];}));
 const sequences={welcome:['ready','wave','wave','ready'],study:['ready','read','read','ready'],cards:['ready','present','wave','ready'],confidence:['ready','encourage','encourage','ready'],download:['ready','down','down','ready'],question:['ready','think','think','ready'],purpose:['ready','encourage','ready'],contact:['ready','wave','ready'],calendar:['ready','read','ready'],task:['ready','down','ready'],flip:['ready','present','ready'],edit:['ready','read','ready']};
 const tilts={welcome:-5,study:3,cards:4,confidence:-2,download:2,question:-7};
 let key=sectionProfiles[pageKey]?.[0]||'document',activeSection=null,visible=false,sectionVisible=false,pageActive=true,manual=false,clock=null,raf=0,timer=null,lastEntry=-Infinity,pending=true,kind='entry',repaint=null;
 mark.dataset.rancaBehavior=key;
 const canMove=()=>visible&&sectionVisible&&!document.hidden&&pageActive&&!reduced.matches&&!manual;
 function paint(time,duration,profile=key){const f=Math.max(0,Math.min(1,time/duration)),seq=readingPolicy?['ready','think','ready']:sequences[profile]||['ready','encourage','ready'],position=f*(seq.length-1),index=Math.min(seq.length-2,Math.floor(position)),progress=position-index;
  rig.setPose(seq[index],time,{nextPose:seq[index+1],progress,blink:Math.max(0,1-Math.abs(f-.23)/.04)});
  const amount=Math.sin(Math.PI*f),tilt=(tilts[profile]||2)*(readingPolicy?.2:1);rig.body.style.transform=`translateY(${-8*amount}px) rotate(${tilt*amount}deg)`;
 }
 function reset(){rig.setPose('ready');rig.body.style.transform='';mark.dataset.rancaMotion=reduced.matches?'reduced':'rest';}
 function stop(){clearTimeout(timer);timer=null;cancelAnimationFrame(raf);raf=0;clock?.cancel();clock=null;reset();}
 function schedule(){clearTimeout(timer);if(!canMove()||clock)return;timer=setTimeout(()=>play(pending),pending?Math.max(0,900-(performance.now()-lastEntry)):readingPolicy?9000:3000);}
 function pause(){clearTimeout(timer);timer=null;cancelAnimationFrame(raf);raf=0;clock?.pause();if(clock)mark.dataset.rancaMotion='paused';}
 function play(entry){if(!canMove()||clock)return;clearTimeout(timer);timer=null;pending=false;kind=entry?'entry':'idle';if(entry)lastEntry=performance.now();mark.dataset.rancaBehavior=key;mark.dataset.rancaMotion=kind;const duration=readingPolicy?1600:entry?2200:1800;
  clock=rig.svg.animate([{opacity:1},{opacity:1}],{duration,fill:'none'});const current=clock,profile=key;
  const tick=()=>{raf=0;if(clock!==current||!canMove())return;paint(Number(clock.currentTime||0),duration,profile);raf=requestAnimationFrame(tick);};repaint=tick;tick();
  current.finished.then(()=>{if(clock!==current)return;clock=null;cancelAnimationFrame(raf);raf=0;reset();schedule();}).catch(()=>{});
 }
 function sync(){if(reduced.matches){stop();return;}if(canMove()){if(clock){clock.play();mark.dataset.rancaMotion=kind;if(!raf)repaint?.();}else schedule();}else pause();}
 function activate(section){sectionVisible=!!section;if(section&&section!==activeSection){activeSection=section;key=profiles.get(section);mark.dataset.rancaBehavior=key;pending=true;}sync();}
 if(!('IntersectionObserver'in window)||!rig.svg.animate){reset();return;}
 const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();});observer.observe(mark);
 let sectionObserver,resizeFrame;
 const visibleSections=new Set();function observeSections(){sectionObserver?.disconnect();visibleSections.clear();sectionObserver=new IntersectionObserver(entries=>{for(const e of entries)e.isIntersecting?visibleSections.add(e.target):visibleSections.delete(e.target);activate([...visibleSections].sort((a,b)=>Math.abs(a.getBoundingClientRect().top-innerHeight*.3)-Math.abs(b.getBoundingClientRect().top-innerHeight*.3))[0]||null);},{rootMargin:`-${Math.round(innerHeight*.3)}px 0px -${Math.round(innerHeight*.69)}px 0px`,threshold:0});sections.forEach(s=>sectionObserver.observe(s));}
 observeSections();if(pageKey==='articles')sections.filter(s=>s.matches('.article-card')).forEach(s=>{s.addEventListener('pointerenter',()=>activate(s));s.addEventListener('focusin',()=>activate(s));});
 addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(observeSections);});
 addEventListener('scroll',()=>{if(kind==='idle')stop();schedule();},{passive:true});
 document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',()=>{manual=false;sync();});
 addEventListener('pagehide',()=>{pageActive=false;pause();});addEventListener('pageshow',()=>{pageActive=true;sync();});
 // Deterministic visual checkpoints use the same renderer and duration as playback.
 mark.addEventListener('mascot:seek',e=>{if(reduced.matches||!Number.isFinite(e.detail?.time))return;stop();manual=true;if(e.detail.profile)key=e.detail.profile;mark.dataset.rancaBehavior=key;mark.dataset.rancaMotion='review';paint(e.detail.time,e.detail.duration||2200);});
 mark.addEventListener('mascot:resume',()=>{manual=false;pending=true;sync();});reset();
}
