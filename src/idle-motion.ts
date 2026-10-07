import {ENABLE_RICH_VISUALS} from './rich-visuals.js';
// Testable one-shot scheduler: one timer, one animation, no per-mode intervals.
export class IdleScheduler {
 private timer?:ReturnType<typeof setTimeout>;
 constructor(private tick:()=>void,private schedule:typeof setTimeout=(fn,ms)=>setTimeout(fn,ms),private clear:typeof clearTimeout=id=>clearTimeout(id),private random=Math.random){}
 start():void{this.stop();this.timer=this.schedule(()=>{this.timer=undefined;this.tick();this.start();},8000+this.random()*7000);}
 stop():void{if(this.timer!==undefined)this.clear(this.timer);this.timer=undefined;}
}
export class LandingIdle {
 private root?:HTMLElement;
 private effect?:Animation;
 private preference=matchMedia('(prefers-reduced-motion: reduce)');
 private scheduler=new IdleScheduler(()=>this.tick());
 constructor(){
  document.addEventListener('visibilitychange',()=>this.sync());
  window.addEventListener('pagehide',()=>{this.scheduler.stop();this.effect?.cancel();});
  this.preference.addEventListener('change',()=>this.sync());
  document.addEventListener('pointerdown',()=>this.sync(),{passive:true});
  document.addEventListener('keydown',()=>this.sync());
 }
 update(root:HTMLElement,landing:boolean):void{this.root=landing?root:undefined;this.sync();}
 private sync():void{this.scheduler.stop();this.effect?.cancel();this.effect=undefined;if(ENABLE_RICH_VISUALS&&this.root&&!document.hidden&&!this.preference.matches)this.scheduler.start();}
 private tick():void{
  if(!this.root||document.hidden||this.preference.matches)return;
  const icons=[...this.root.querySelectorAll<HTMLElement>('.mode-icon')].filter(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;});
  const icon=icons[Math.floor(Math.random()*icons.length)];if(!icon?.animate)return;
  this.effect?.cancel();this.effect=icon.animate([{transform:'rotate(0) scale(1)'},{transform:'rotate(-4deg) scale(1.04)'},{transform:'rotate(0) scale(1)'}],{duration:320,easing:'ease-out'});
 }
}
