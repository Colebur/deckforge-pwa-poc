import {foreheadPose,type Gravity} from './headbands-setup.js';
export type TiltEvent='ready'|'correct'|'pass';
// Gentle deliberate gestures; return to neutral prevents repeated answers. Times are seconds.
export class TiltDetector {
  constructor(private readonly automaticCalibration=true){}
  calibrated=false;
  private baseline=0;
  private sign=1;
  private candidate?:number;
  private candidateSince?:number;
  private neutralSince?:number;
  private pending?:TiltEvent;
  private pendingSince?:number;
  private armed=false;
  private last?:number;
  reset():void {this.calibrated=false;this.baseline=0;this.sign=1;this.candidate=undefined;this.candidateSince=undefined;this.last=undefined;this.disarm();}
  calibrate(g:Gravity,time:number):boolean {
    this.reset();if(!foreheadPose(g)||!Number.isFinite(time))return false;
    this.baseline=Math.atan2(g[2],Math.hypot(g[0],g[1]))*180/Math.PI;this.sign=g[0]>=0?1:-1;this.last=time;this.calibrated=true;this.armed=true;return true;
  }
  disarm():void {this.armed=false;this.neutralSince=undefined;this.pending=undefined;this.pendingSince=undefined;}
  update(x:number,y:number,z:number,time:number):TiltEvent|null {
    const magnitude=Math.hypot(x,y,z);
    if(![x,y,z,time].every(Number.isFinite) || magnitude<0.8 || magnitude>1.2){this.reset();return null;}
    if(this.last!==undefined && (time<=this.last || time-this.last>0.25))this.reset();
    this.last=time;
    const angle=Math.atan2(z,Math.hypot(x,y))*180/Math.PI;
    if(!this.calibrated){
      if(!this.automaticCalibration)return null;
      if(!(Math.abs(x)>0.7 && Math.abs(y)<0.35 && Math.abs(angle)<25)){this.candidate=undefined;this.candidateSince=undefined;return null;}
      if(this.candidate!==undefined && Math.abs(angle-this.candidate)<=5 && time-this.candidateSince!>=0.6){this.baseline=angle;this.sign=x>=0?1:-1;this.calibrated=true;this.armed=true;return 'ready';}
      if(this.candidate===undefined || Math.abs(angle-this.candidate)>5){this.candidate=angle;this.candidateSince=time;}
      return null;
    }
    if(Math.abs(y)>=0.5 || x*this.sign<0){this.reset();return null;}
    const delta=angle-this.baseline;
    if(Math.abs(delta)<=12){this.pending=undefined;this.pendingSince=undefined;this.neutralSince??=time;if(time-this.neutralSince>=0.18)this.armed=true;return null;}
    this.neutralSince=undefined;if(!this.armed)return null;
    const event=delta>=25?'correct':delta<=-25?'pass':null;
    if(!event){this.pending=undefined;this.pendingSince=undefined;return null;}
    if(this.pending!==event){this.pending=event;this.pendingSince=time;}
    else if(time-this.pendingSince!>=0.08){this.disarm();return event;}
    return null;
  }
}
// Browser acceleration includes the force opposing gravity. Subtract linear motion,
// then invert it to match native Core Motion gravity (positive z = screen down).
export function browserGravity(including:{x:number|null;y:number|null;z:number|null},linear?:{x:number|null;y:number|null;z:number|null}|null):[number,number,number]|null {
  const total=[including.x,including.y,including.z];if(!total.every(v=>typeof v==='number'&&Number.isFinite(v)))return null;
  const movement=linear&&[linear.x,linear.y,linear.z].every(v=>typeof v==='number'&&Number.isFinite(v))?[linear.x!,linear.y!,linear.z!]:[0,0,0];
  return total.map((v,i)=>-(v!-movement[i]!)/9.80665) as [number,number,number];
}
