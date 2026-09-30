import {cuePlan} from './cues.js';
export class GameAudio {
  private context?:AudioContext;
  private buffers=new Map<string,AudioBuffer>();
  private loading?:Promise<void>;
  private nodes=new Set<AudioScheduledSourceNode>();
  private feedbackNodes=new Set<AudioScheduledSourceNode>();
  onInterrupt?:()=>void;
  async unlock():Promise<void> {
    if(!this.context){
      const Constructor=window.AudioContext ?? (window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
      if(!Constructor)throw new Error('Game sound is unavailable in this browser.');
      this.context=new Constructor();
      this.context.addEventListener('statechange',()=>{if(this.context?.state!=='running'&&this.nodes.size)this.onInterrupt?.();});
    }
    // Called immediately by Start/Resume, before any permission/storage await.
    const resume=this.context.resume();
    this.loading??=Promise.all(['tone','headbands-correct','headbands-pass'].map(async name=>{
      const response=await fetch(`./${name}.wav`);if(!response.ok)throw new Error('Could not load game sounds. Reopen online once.');
      this.buffers.set(name,await this.context!.decodeAudioData(await response.arrayBuffer()));
    })).then(()=>{}).catch(error=>{this.loading=undefined;throw error;});
    await Promise.all([resume,this.loading]);
    if(this.context.state!=='running')throw new Error('Sound is interrupted. Tap Resume to retry.');
  }
  schedule(remaining:number,length:number,enabled:boolean):void {
    this.stopCountdown();const ctx=this.context;if(!enabled||!ctx||ctx.state!=='running')return;
    const plan=cuePlan(remaining,length), start=ctx.currentTime;
    for(const offset of plan.beeps)this.clip('tone',start+offset,0.48,this.nodes,Math.min(0.12,plan.buzzer-offset));
    this.buzzer(start+plan.buzzer);
  }
  private track(node:AudioScheduledSourceNode,set:Set<AudioScheduledSourceNode>):void {
    set.add(node);node.addEventListener('ended',()=>{set.delete(node);node.disconnect();},{once:true});
  }
  private clip(name:string,at:number,volume:number,set:Set<AudioScheduledSourceNode>,duration?:number):void {
    const ctx=this.context!,buffer=this.buffers.get(name);if(!buffer)return;
    const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=volume;source.connect(gain);gain.connect(ctx.destination);
    source.addEventListener('ended',()=>gain.disconnect(),{once:true});this.track(source,set);source.start(at);
    if(duration!==undefined)source.stop(at+Math.min(duration,buffer.duration));
  }
  private buzzer(at:number):void {
    const ctx=this.context!;
    // Two low square waves make a firmer buzzer, with a short envelope to avoid clicks.
    for(const frequency of [110,165]){
      const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.type='square';oscillator.frequency.value=frequency;
      gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(0.16,at+0.008);gain.gain.setValueAtTime(0.16,at+0.6);gain.gain.linearRampToValueAtTime(0,at+0.75);
      oscillator.connect(gain);gain.connect(ctx.destination);oscillator.addEventListener('ended',()=>gain.disconnect(),{once:true});this.track(oscillator,this.nodes);oscillator.start(at);oscillator.stop(at+0.76);
    }
  }
  feedback(correct:boolean):void {
    if(this.context?.state==='running')this.clip(correct?'headbands-correct':'headbands-pass',this.context.currentTime,0.65,this.feedbackNodes);
  }
  stopCountdown():void {for(const node of this.nodes){try{node.stop();}catch{}node.disconnect();}this.nodes.clear();}
  stop():void {this.stopCountdown();for(const node of this.feedbackNodes){try{node.stop();}catch{}node.disconnect();}this.feedbackNodes.clear();}
}
