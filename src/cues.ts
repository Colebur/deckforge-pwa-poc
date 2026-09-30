// A continuous curve: leisurely at first, urgent throughout the final portion.
export function beepInterval(remaining: number, length: number): number {
  const fraction = Math.min(1, Math.max(0, remaining / Math.max(1, length)));
  return 180 + 1820 * Math.pow(fraction, 1.6);
}
export interface CuePlan { beeps: number[]; buzzer: number }
// Offsets in seconds, scheduled on the audio clock rather than a UI callback.
export function cuePlan(remaining:number,length:number):CuePlan {
  const beeps:number[]=[];let elapsed=0;
  while(elapsed<remaining){if(remaining-elapsed>=100)beeps.push(elapsed/1000);elapsed+=beepInterval(remaining-elapsed,length);}
  return {beeps,buzzer:remaining/1000};
}
// Retained for diagnostic tests; game audio uses the complete clock-based plan.
export class CountdownCues {
  private running=false;
  private next=0;
  reset():void {this.running=false;this.next=0;}
  update(phase:'running'|'paused'|'ended',remaining:number,length:number,now:number):'beep'|'buzzer'|null {
    const wasRunning=this.running;this.running=phase==='running';
    if(!this.running){this.next=0;return phase==='ended'&&wasRunning?'buzzer':null;}
    if(wasRunning&&now<this.next)return null;
    this.next=now+beepInterval(remaining,length);return 'beep';
  }
}
