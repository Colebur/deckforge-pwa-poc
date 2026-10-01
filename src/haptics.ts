export interface HapticsService {available():boolean;test():boolean}
export const webHaptics:HapticsService={available:()=>typeof navigator.vibrate==='function',test:()=>typeof navigator.vibrate==='function'&&navigator.vibrate([100,60,100])};
