export type Gravity=[number,number,number];
export type SetupStage='rotate'|'forehead'|'countdown'|'ready';
const angleBetween=(a:Gravity,b:Gravity):number=>Math.acos(Math.min(1,Math.max(-1,a.reduce((n,v,i)=>n+v*b[i]!,0)/(Math.hypot(...a)*Math.hypot(...b)))))*180/Math.PI;
export function foreheadPose(g:Gravity):boolean {
  return g.every(Number.isFinite)&&Math.hypot(...g)>=.8&&Math.hypot(...g)<=1.2&&Math.abs(g[0])>.6&&Math.abs(g[1])<.4&&Math.abs(Math.atan2(g[2],Math.hypot(g[0],g[1]))*180/Math.PI)<40;
}
// This recognizes placement motion and a steady sideways pose, not body contact.
export class HeadbandsSetup {
  stage:SetupStage='rotate';
  gravity?:Gravity;
  private first?:Gravity;
  private heading?:number;
  private placement=false;
  private stable?:Gravity;
  private stableSince?:number;
  private countdownStart?:number;
  private last?:number;
  reset():void{this.stage='rotate';this.gravity=undefined;this.first=undefined;this.heading=undefined;this.placement=false;this.stable=undefined;this.stableSince=undefined;this.countdownStart=undefined;this.last=undefined;}
  get countdownStarted():number|undefined{return this.countdownStart;}
  seconds(now:number):number{return Math.max(1,Math.ceil(3-(now-(this.countdownStart??now))));}
  confirmPlacement():void{if(this.stage==='forehead')this.placement=true;}
  observe(g:Gravity,now:number,landscape:boolean,heading?:number):void {
    if(!landscape){this.reset();return;}
    if(this.stage==='rotate')this.stage='forehead';
    if(this.stage==='ready')return;
    if(this.last!==undefined&&(now<=this.last||now-this.last>.3)){this.stage='forehead';this.countdownStart=undefined;this.stable=undefined;this.stableSince=undefined;}
    this.last=now;this.gravity=[...g];
    if(!this.first){this.first=[...g];this.heading=heading;if(!foreheadPose(g))this.placement=true;}
    if(this.heading===undefined&&heading!==undefined)this.heading=heading;
    if(angleBetween(this.first,g)>35)this.placement=true;
    if(heading!==undefined&&this.heading!==undefined&&Math.abs(((heading-this.heading+540)%360)-180)>100)this.placement=true;
    if(!foreheadPose(g)){this.stage='forehead';this.countdownStart=undefined;this.stable=undefined;this.stableSince=undefined;return;}
    if(this.stable&&angleBetween(this.stable,g)>10){this.stage='forehead';this.countdownStart=undefined;this.stable=undefined;this.stableSince=undefined;}
    if(!this.stable){this.stable=[...g];this.stableSince=now;}
    if(this.stage==='forehead'&&this.placement&&now-this.stableSince!>=.5){this.stage='countdown';this.countdownStart=now;}
  }
  tick(now:number,landscape:boolean):void {
    if(!landscape){this.reset();return;}
    if(this.stage==='rotate')this.stage='forehead';
    if(this.stage!=='countdown')return;
    if(this.last===undefined||now-this.last>.3){this.stage='forehead';this.countdownStart=undefined;this.stable=undefined;this.stableSince=undefined;return;}
    if(now-this.countdownStart!>=3)this.stage='ready';
  }
}
