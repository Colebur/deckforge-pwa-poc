import {ENABLE_RICH_VISUALS,EXPRESSIVE_VISUALS,EXPRESSIVE_MOTION} from './rich-visuals.js';
// Reversible decoration layer: no deck, storage, timer, score or session imports.
export const MOTION={micro:140,ui:220,playful:320,exit:160,ease:'cubic-bezier(.2,.8,.2,1)',spring:'cubic-bezier(.2,.9,.3,1.12)'} as const;
const ACTIVE_MOTION=ENABLE_RICH_VISUALS&&EXPRESSIVE_VISUALS?{...MOTION,...EXPRESSIVE_MOTION}:MOTION;
export type CardMotion='next'|'previous'|'draw'|'shuffle'|'activity'|'flip'|'unflip'|'correct'|'pass'|'violation';
export interface MotionIdentity {screen:string;section:string;card:string;phase?:string;depth?:number}
export function navigationMotion(previous:MotionIdentity|undefined,next:MotionIdentity):'tab'|'forward'|'back'|undefined {
  if(!previous)return undefined;
  if(previous.section!==next.section)return 'tab';
  if(previous.screen===next.screen)return undefined;
  if(previous.depth!==undefined&&next.depth!==undefined)return next.depth<previous.depth?'back':'forward';
  const roots=['home','library','taboo-library'];
  return roots.includes(next.screen.split(':')[0]!)?'back':'forward';
}
export function cardFrames(kind:CardMotion,reduced=false):{enter:Keyframe[];exit:Keyframe[];duration:number} {
  if(reduced)return {enter:[],exit:[],duration:0};
  const still={opacity:1,transform:'translate(0,0) rotate(0deg) scale(1)'};
  if(kind==='flip'||kind==='unflip'){
    const sign=kind==='flip'?1:-1;
    return {exit:[{opacity:1,transform:'perspective(1000px) rotateY(0deg)'},{opacity:1,transform:`perspective(1000px) rotateY(${sign*90}deg)`}],enter:[{opacity:1,transform:`perspective(1000px) rotateY(${-sign*90}deg)`},{opacity:1,transform:'perspective(1000px) rotateY(0deg)'}],duration:MOTION.playful};
  }
  if(kind==='activity')return {exit:[still,{opacity:0,transform:'translateY(-4px)'}],enter:[{opacity:0,transform:'translateY(6px)'},still],duration:MOTION.ui};
  if(kind==='draw'||kind==='shuffle')return {exit:[still,{opacity:0,transform:'translateY(-12px) rotate(-2deg) scale(.97)'}],enter:[{opacity:0,transform:'translateY(18px) rotate(2deg) scale(.96)'},{opacity:1,transform:'translateY(-2px) rotate(-.4deg) scale(1.01)'},still],duration:MOTION.playful};
  const direction=kind==='previous'?-1:1;
  return {exit:[still,{opacity:0,transform:`translateX(${-direction*38}px) rotate(${-direction*1.5}deg)`}],enter:[{opacity:0,transform:`translateX(${direction*42}px) rotate(${direction*1}deg)`},still],duration:MOTION.ui};
}
export function richCardFrames(kind:CardMotion,mode:string,reduced=false):ReturnType<typeof cardFrames> {
 const baseline=cardFrames(kind,reduced);
 if(ENABLE_RICH_VISUALS&&EXPRESSIVE_VISUALS&&!reduced){
  const still={opacity:1,transform:'translate(0,0) rotate(0deg) scale(1)'};
  if(kind==='flip'||kind==='unflip')return {...baseline,duration:520};
  if(kind==='activity')return {exit:[still,{opacity:0,transform:'translateY(-14px)'}],enter:[{opacity:0,transform:'translateY(20px) scale(.98)'},still],duration:420};
  if(mode==='lookup')return {exit:[still,{opacity:0,transform:'translateY(-18px) scale(.98)'}],enter:[{opacity:0,transform:'translateY(38px) scale(.94)'},{opacity:1,transform:'translateY(-4px) scale(1.02)'},still],duration:480};
  if(mode==='headbands'){
   const sign=kind==='pass'?1:-1;
   return {exit:[still,{opacity:0,transform:'translateY('+sign*65+'px) rotate('+sign*5+'deg)'}],enter:[{opacity:0,transform:'translateY('+(-sign*42)+'px) scale(.94)'},{opacity:1,transform:'translateY('+sign*3+'px) scale(1.025)'},still],duration:440};
  }
  if(kind==='draw'||kind==='shuffle'||mode==='prompts')return {exit:[still,{opacity:0,transform:'translateY(-40px) rotate(-6deg) scale(.94)'}],enter:[{opacity:0,transform:'translateY(58px) rotate(7deg) scale(.88)'},{opacity:1,transform:'translateY(-7px) rotate(-1deg) scale(1.035)'},still],duration:560};
  if(kind==='violation')return {exit:[still,{opacity:0,transform:'translateY(24px) rotate(-4deg) scale(.92)'}],enter:[{opacity:0,transform:'scale(.88)'},{opacity:1,transform:'scale(1.04)'},still],duration:440};
  const sign=kind==='previous'||kind==='pass'?-1:1;
  return {exit:[still,{opacity:0,transform:'translateX('+(-sign*100)+'px) rotate('+(-sign*5)+'deg)'}],enter:[{opacity:0,transform:'translateX('+sign*100+'px) rotate('+sign*5+'deg) scale(.95)'},{opacity:1,transform:'translateX('+(-sign*5)+'px) rotate(0deg) scale(1.02)'},still],duration:460};
 }

 if(!ENABLE_RICH_VISUALS||reduced||kind==='flip'||kind==='unflip'||kind==='activity')return baseline;
 const still={opacity:1,transform:'translate(0,0) rotate(0deg) scale(1)'};
 if(mode==='headbands'){
  const sign=kind==='pass'?1:-1;
  return {exit:[still,{opacity:0,transform:'translateY('+sign*22+'px) rotate('+sign*2+'deg)'}],enter:[{opacity:.4,transform:'translateY('+(-sign*14)+'px) scale(.99)'},still],duration:180};
 }
 if(mode==='lookup')return {exit:[still,{opacity:0,transform:'translateY(-4px)'}],enter:[{opacity:0,transform:'translateY(12px) scale(.985)'},still],duration:200};
 if(mode==='taboo'){const plan=cardFrames(kind==='pass'?'previous':'next');return {...plan,duration:170,...(kind==='violation'?{enter:[{opacity:.5,transform:'scale(.975)'},still]}:{})};}
 if(mode==='catchphrase')return {...baseline,duration:170};
 return baseline;
}
const actions:Record<string,CardMotion>={'next-card':'next','head-correct':'correct','head-pass':'pass','taboo-correct':'correct','taboo-pass':'pass','taboo-violation':'violation','study-next':'next','study-prev':'previous','lookup-prev':'previous','lookup-next':'next','lookup-random':'draw','lookup-form':'draw','prompt-draw':'draw','study-shuffle':'shuffle','reroll-activity':'activity','prompt-reroll':'activity'};
const listActions=new Set(['confirm-import','delete-card','taboo-delete-card','confirm-delete-activity','delete-deck','taboo-delete','new-deck','card-form','activity-form','taboo-card-form','taboo-new-form','confirm-delete-deck']);
interface Visual {node:HTMLElement;rect:DOMRect;copy?:HTMLElement;style:{font:string;color:string;display:string;variables:Record<string,string>}}
interface Row {key:string;visual:Visual}
export interface MotionFrame {previous?:MotionIdentity;identity:MotionIdentity;navigation?:ReturnType<typeof navigationMotion>;page?:Visual;card?:Visual;hint?:CardMotion;list:boolean;rows:Row[];counters:string[];forms:Set<string>}
export class MotionSystem {
  private preference=matchMedia('(prefers-reduced-motion: reduce)');
  private identities=new WeakMap<HTMLElement,MotionIdentity>();
  private hint?:CardMotion;
  private list=false;
  private celebration=false;
  private effects=new Map<Animation,{node:HTMLElement;cleanup:()=>void}>();
  constructor(){
    for(const [key,value] of Object.entries(ACTIVE_MOTION))document.documentElement.style.setProperty('--motion-'+key,typeof value==='number'?value+'ms':value);
    window.addEventListener('resize',()=>this.indicator());
    this.preference.addEventListener('change',()=>{if(this.preference.matches)this.cancel();});
    document.addEventListener('click',event=>{
      const target=(event.target as Element)?.closest<HTMLElement>('[data-action],[data-pack-action],[data-swipe-delete]');
      if(target)this.intent(target.dataset.action??target.dataset.packAction??'confirm-delete-deck');
    },{capture:true});
    document.addEventListener('submit',event=>{if(event.target instanceof HTMLFormElement)this.intent(event.target.id);},{capture:true});
    document.addEventListener('change',event=>{
      const target=event.target;
      if(target instanceof HTMLInputElement&&['checkbox','radio'].includes(target.type)&&target.checked)this.pop(target);
    });
    const notice=document.querySelector<HTMLElement>('#notice');
    if(notice){let last='';new MutationObserver(()=>{const message=notice.textContent??'';if(message&&message!==last){this.run(notice,[{opacity:0,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],ACTIVE_MOTION.micro);if(/^(Deck saved|Taboo deck saved|Imported |Independent copy saved|Recent cards reset|\d+ (?:cards|activities) saved)/.test(message))this.pop(notice);}last=message;}).observe(notice,{childList:true,characterData:true,subtree:true});}
  }
  get reduced():boolean{return this.preference.matches;}
  intent(action:string):void{this.hint=actions[action];this.list=listActions.has(action);this.celebration=ENABLE_RICH_VISUALS&&(action.startsWith('award')||['taboo-correct','head-correct','confirm-reset-recent'].includes(action));}
  flip(reverse:boolean):void{this.hint=reverse?'unflip':'flip';}
  private visual(node:HTMLElement,copy=true):Visual {
    const style=getComputedStyle(node);
    return {node,rect:node.getBoundingClientRect(),style:{font:style.font,color:style.color,display:style.display,variables:Object.fromEntries(['--accent','--soft','--panel','--line','--muted','--deck-accent'].map(name=>[name,style.getPropertyValue(name)]))},copy:copy?node.cloneNode(true) as HTMLElement:undefined};
  }
  private rows(root:HTMLElement,copy=true):Row[]{
    const buttons=root.querySelectorAll<HTMLElement>('[data-edit],[data-activity-edit],[data-taboo-edit],[data-deck],[data-taboo-deck]');
    if(buttons.length>100)return []; // Expand All / huge imports must stay cheap.
    return [...buttons].map(button=>{const key=['edit','activityEdit','tabooEdit','deck','tabooDeck'].map(k=>button.dataset[k]).find(Boolean)!;return {key,visual:this.visual(button.closest<HTMLElement>('.ordered-row,.swipe-deck,.card-row')??button,copy)};});
  }
  before(root:HTMLElement,identity:MotionIdentity):MotionFrame {
    const previous=this.identities.get(root),navigation=navigationMotion(previous,identity),card=root.querySelector<HTMLElement>('.study-card,.prompt,.party-question,.wheel-puzzle');
    const frame:MotionFrame={previous,identity,navigation,hint:this.hint,list:this.list,rows:[],counters:[...root.querySelectorAll('.study-heading strong,.game-status .tag,.tilt-score')].map(n=>n.textContent??''),forms:new Set([...root.querySelectorAll('form[id]')].map(n=>n.id))};
    this.hint=undefined;this.list=false;
    if(this.reduced)return frame;
    if(navigation&&root.querySelectorAll('*').length<=1000)frame.page=this.visual(root);
    if(!navigation&&card&&(previous?.card!==identity.card||frame.hint))frame.card=this.visual(card);
    if(frame.list&&!navigation)frame.rows=this.rows(root);
    return frame;
  }
  after(root:HTMLElement,frame:MotionFrame):void {
    this.identities.set(root,frame.identity);this.indicator();
    if(this.reduced)return;
    if(this.celebration){this.celebration=false;const result=root.querySelector<HTMLElement>('.team-total,.tilt-score,.game-status,.result');if(result)this.pop(result);}
    if(frame.navigation){
      this.cancel();const kind=frame.navigation;
      if(frame.page)this.ghost(frame.page,kind==='tab'?[{opacity:.65,transform:'translateY(0)'},{opacity:0,transform:'translateY(-8px)'}]:[{opacity:.7,transform:'translateX(0)'},{opacity:0,transform:`translateX(${kind==='back'?(ENABLE_RICH_VISUALS&&EXPRESSIVE_VISUALS?100:48):(ENABLE_RICH_VISUALS&&EXPRESSIVE_VISUALS?-60:-28)}px)`}],ACTIVE_MOTION.exit);
      this.run(root,[{opacity:0,transform:kind==='tab'?'translateY(12px) scale(.995)':`translateX(${kind==='back'?(ENABLE_RICH_VISUALS&&EXPRESSIVE_VISUALS?-60:-28):(ENABLE_RICH_VISUALS&&EXPRESSIVE_VISUALS?100:48)}px)`},{opacity:1,transform:'translate(0,0) scale(1)'}],ACTIVE_MOTION.ui);
      if(kind==='tab')this.tab();return;
    }
    const next=root.querySelector<HTMLElement>('.study-card,.prompt,.party-question,.wheel-puzzle');
    const changed=frame.previous?.card!==frame.identity.card;
    const completion=frame.identity.phase==='ended'&&frame.previous?.phase!==undefined&&frame.previous.phase!=='ended';
    if(completion&&next)this.pop(next);
    else if(next&&frame.identity.card&&(changed||frame.hint||frame.identity.phase==='running'&&frame.previous?.phase==='ended')){
      const kind=frame.hint??(frame.previous?.card?'next':'draw');
      const plan=richCardFrames(kind,frame.identity.screen.split(':')[0]!);
      this.cancel();
      const flip=kind==='flip'||kind==='unflip';
      if(frame.card)this.ghost(frame.card,plan.exit,flip?plan.duration/2:ACTIVE_MOTION.exit);
      // The new state is already accessible and tappable. Only its painted face waits.
      this.run(next,plan.enter,flip?plan.duration/2:plan.duration,flip?plan.duration/2:0,flip?'backwards':'none');
      if((kind==='draw'||kind==='shuffle')&&frame.identity.screen!=='lookup')this.stack(next,plan.duration);
    }
    if(frame.list)this.listChange(root,frame.rows);
    [...root.querySelectorAll<HTMLElement>('.study-heading strong,.game-status .tag,.tilt-score')].forEach((node,i)=>{if(frame.counters[i]!==undefined&&node.textContent!==frame.counters[i])this.pop(node);});
    for(const form of root.querySelectorAll<HTMLElement>('form[id]:not(#organization-form)'))if(!frame.forms.has(form.id))this.run(form,[{opacity:0,transform:'translateY(8px) scale(.99)'},{opacity:1,transform:'translateY(0) scale(1)'}],ACTIVE_MOTION.ui);
  }
  private run(node:HTMLElement,frames:Keyframe[],duration:number,delay=0,fill:FillMode='none',cleanup=()=>{}):Animation|undefined {
    if(this.reduced||!node.animate){cleanup();return undefined;}
    // One effect per element. New input replaces, rather than queues, motion.
    for(const [animation,entry] of this.effects)if(entry.node===node){animation.cancel();entry.cleanup();this.effects.delete(animation);}
    let effect:Animation;try{effect=node.animate(frames,{duration,delay,fill,easing:ACTIVE_MOTION.ease});}catch{cleanup();return undefined;}
    this.effects.set(effect,{node,cleanup});
    void effect.finished.catch(()=>{}).then(()=>{if(this.effects.delete(effect))cleanup();});return effect;
  }
  cancel():void{for(const [effect,entry] of this.effects){effect.cancel();entry.cleanup();}this.effects.clear();}
  pop(node:HTMLElement):void{this.run(node,ENABLE_RICH_VISUALS&&EXPRESSIVE_VISUALS?[{transform:'scale(.95)'},{transform:'scale(1.075)'},{transform:'scale(.995)'},{transform:'scale(1)'}]:[{transform:'scale(.985)'},{transform:'scale(1.018)'},{transform:'scale(1)'}],ACTIVE_MOTION.playful);}
  private indicator():void {
    const nav=document.querySelector<HTMLElement>('#main-tabs'),selected=nav?.querySelector<HTMLElement>('[aria-current=page]');
    if(!nav||nav.hidden||!selected)return;
    const base=nav.getBoundingClientRect(),rect=selected.getBoundingClientRect();
    nav.style.setProperty('--motion-tab-left',rect.left-base.left+'px');nav.style.setProperty('--motion-tab-width',rect.width+'px');
  }
  private tab():void {
    const tab=document.querySelector<HTMLElement>('#main-tabs [aria-current=page]>span');
    if(tab)this.run(tab,[{transform:'translateY(0) scale(.96)'},{transform:'translateY(-3px) scale(1.07)'},{transform:'translateY(0) scale(1)'}],ACTIVE_MOTION.playful);
  }
  private ghost(visual:Visual,frames:Keyframe[],duration:number):void {
    if(this.reduced)return;
    const copy=visual.copy;if(!copy||visual.rect.width===0||visual.rect.height===0)return;
    copy.removeAttribute('id');for(const child of copy.querySelectorAll('[id]'))child.removeAttribute('id');
    copy.setAttribute('aria-hidden','true');copy.inert=true;copy.classList.add('motion-ghost');
    const rect=visual.rect;
    Object.assign(copy.style,{position:'fixed',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px',minHeight:'0',maxWidth:'none',margin:'0',pointerEvents:'none',zIndex:'30',font:visual.style.font,color:visual.style.color,display:visual.style.display,overflow:'clip',backfaceVisibility:'hidden'});
    for(const [name,value] of Object.entries(visual.style.variables))copy.style.setProperty(name,value);
    document.body.append(copy);this.run(copy,frames,duration,0,'none',()=>copy.remove());
  }
  private stack(card:HTMLElement,duration:number):void {
    card.classList.add('motion-stack');
    // Class lifetime follows an animation, not a game-state timeout.
    const effect=this.run(card,ENABLE_RICH_VISUALS&&EXPRESSIVE_VISUALS?richCardFrames('draw','prompts').enter:[{opacity:0,transform:'translateY(18px) rotate(2deg) scale(.96)'},{opacity:1,transform:'translateY(-2px) rotate(-.4deg) scale(1.01)'},{opacity:1,transform:'translateY(0) rotate(0) scale(1)'}],duration,0,'none',()=>card.classList.remove('motion-stack'));
    if(!effect)card.classList.remove('motion-stack');
  }
  private listChange(root:HTMLElement,before:Row[]):void {
    const next=this.rows(root,false),old=new Map(before.map(r=>[r.key,r.visual])),fresh=new Set(next.map(r=>r.key));
    for(const row of before)if(!fresh.has(row.key))this.ghost(row.visual,[{opacity:.7,transform:'scale(1)'},{opacity:0,transform:'scale(.96) translateX(-8px)'}],ACTIVE_MOTION.exit);
    let entrances=0;
    for(const row of next){const prior=old.get(row.key),node=row.visual.node;
      if(!prior){if(entrances++<6)this.run(node,[{opacity:0,transform:'translateY(8px) scale(.98)'},{opacity:1,transform:'translateY(0) scale(1)'}],ACTIVE_MOTION.ui);}
      else{const dy=prior.rect.top-row.visual.rect.top;if(Math.abs(dy)>1&&Math.abs(dy)<innerHeight)this.run(node,[{transform:`translateY(${dy}px)`},{transform:'translateY(0)'}],ACTIVE_MOTION.ui);}
    }
  }
  openDialog(dialog:HTMLDialogElement):void {
    this.run(dialog,[{opacity:0,transform:'translateY(18px) scale(.97)'},{opacity:1,transform:'translateY(0) scale(1)'}],ACTIVE_MOTION.playful);
  }
  closeDialog(dialog:HTMLDialogElement,close:()=>void):void {
    // Keep the actual close/focus behavior immediate; only a noninteractive copy exits.
    if(this.reduced){close();return;}
    const visual=this.visual(dialog),backdrop=document.createElement('div');
    backdrop.className='motion-backdrop-ghost';backdrop.setAttribute('aria-hidden','true');backdrop.style.background=getComputedStyle(dialog,'::backdrop').backgroundColor;document.body.append(backdrop);
    this.run(backdrop,[{opacity:1},{opacity:0}],ACTIVE_MOTION.exit,0,'none',()=>backdrop.remove());
    close();this.ghost(visual,[{opacity:.8,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(12px) scale(.98)'}],ACTIVE_MOTION.exit);
  }
}
