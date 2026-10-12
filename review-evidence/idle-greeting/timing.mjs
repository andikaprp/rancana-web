// Draft only. Resting artwork is reviewed before greeting animation is authored.
export const duration = 6500;
export const plannedBeats = {
  ranca: {prepare:1600, lift:1850, greet:2450, lower:2800, settled:3550},
  cana: {prepare:1900, lift:2150, greet:2550, lower:2890, settled:3560}
};
// About 70% of each cycle is rest. Body anticipation leads the lifting hand.
// Lower wrist/elbow first on return; finger opening settles afterward.
export const ease = t => t*t*t*(t*(t*6-15)+10);
