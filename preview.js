// Retain the original hero composition while keeping the remaining page in normal flow.
const fitHero = () => {
 const w = innerWidth;
 document.documentElement.style.setProperty('--product-zoom', Math.min(1,(w - 120)/1120));
 document.documentElement.style.setProperty('--hero-scale', Math.min(1, w / 1440));
 document.documentElement.style.setProperty('--card-scale', Math.min(1, (w - 48) / 560));
 document.documentElement.style.setProperty('--phone-scale', Math.min(1, (w - 40) / 458));
};
fitHero(); addEventListener('resize', fitHero);
