import test from 'node:test';
import assert from 'node:assert/strict';
import {MOTION,cardFrames,navigationMotion,MotionSystem} from '../dist/motion.js';
const info=(screen='home',section='play',card='',phase)=>({screen,section,card,phase});
test('navigation separates peer tabs from hierarchical forward/back, including nested editors',()=>{
 assert.equal(navigationMotion(undefined,info()),undefined);assert.equal(navigationMotion(info(),info()),undefined);
 assert.equal(navigationMotion(info('editor:a','decks'),info('home','work')),'tab');
 assert.equal(navigationMotion(info(),info('catchphrase')),'forward');assert.equal(navigationMotion(info('catchphrase'),info()),'back');
 assert.equal(navigationMotion({...info('game-card','decks'),depth:2},{...info('game-editor','decks'),depth:1}),'back');
});
test('card directions reverse; stack draws settle, flips remain within ±90 degrees with no mirrored face',()=>{
 const next=cardFrames('next'),previous=cardFrames('previous');assert.match(next.exit.at(-1).transform,/translateX\(-38px/);assert.match(next.enter[0].transform,/translateX\(42px/);
 assert.match(previous.exit.at(-1).transform,/translateX\(38px/);assert.match(previous.enter[0].transform,/translateX\(-42px/);
 for(const kind of ['draw','shuffle']){const f=cardFrames(kind);assert.equal(f.enter.length,3);assert.match(f.enter[0].transform,/translateY\(18px/);assert.equal(f.duration,320);}
 assert.match(cardFrames('flip').exit.at(-1).transform,/rotateY\(90deg/);assert.match(cardFrames('unflip').exit.at(-1).transform,/rotateY\(-90deg/);
 for(const kind of ['flip','unflip'])for(const frame of [...cardFrames(kind).enter,...cardFrames(kind).exit]){const degrees=Number(/rotateY\((-?\d+)deg/.exec(frame.transform)?.[1]);assert.ok(Math.abs(degrees)<=90);}
});
test('reduced-motion plans contain no translations, rotations, flips or animation delay',()=>{
 for(const kind of ['next','previous','draw','shuffle','activity','flip','unflip'])assert.deepEqual(cardFrames(kind,true),{enter:[],exit:[],duration:0});
 assert.ok(Object.entries(MOTION).filter(([,v])=>typeof v==='number').every(([,v])=>v<=400));
});
// Small DOM/animation adapter verifies cancellation and cleanup without dependencies.
function environment(reduced=false){
 const listeners={},body={nodes:[],append(node){this.nodes.push(node);node.parent=this;}};
 class Node {
  constructor(text=''){this.textContent=text;this.dataset={};this.hidden=false;this.style={setProperty(k,v){this[k]=v;}};this.effects=[];this.attributes={id:'original'};this.classes=new Set();this.classList={add:c=>this.classes.add(c),remove:c=>this.classes.delete(c)};this.card=undefined;}
  querySelector(selector){return selector.includes('.study-card')?this.card:null;}
  querySelectorAll(){return [];}
  cloneNode(){return new Node(this.textContent);}
  getBoundingClientRect(){return {left:20,top:50,width:300,height:200};}
  removeAttribute(name){delete this.attributes[name];}
  setAttribute(name,value){this.attributes[name]=value;}
  remove(){if(this.parent)this.parent.nodes=this.parent.nodes.filter(n=>n!==this);}
  animate(frames,options){let resolve,reject;const effect={frames,options,cancelled:false,finished:new Promise((a,b)=>{resolve=a;reject=b;}),cancel(){this.cancelled=true;reject(new Error('cancelled'));},finish(){resolve();}};this.effects.push(effect);return effect;}
 }
 const preference={matches:reduced,addEventListener(name,callback){listeners.preference=callback;}};
 const old={document:globalThis.document,window:globalThis.window,matchMedia:globalThis.matchMedia,getComputedStyle:globalThis.getComputedStyle};
 globalThis.document={documentElement:new Node(),body,querySelector(){return null;},addEventListener(){}};
 globalThis.window={addEventListener(){}};globalThis.matchMedia=()=>preference;
 globalThis.getComputedStyle=()=>({font:'20px system-ui',color:'black',display:'block',getPropertyValue(){return '#fff';}});
 return {Node,body,preference,listeners,restore(){for(const [key,value] of Object.entries(old))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}};
}
test('rapid flips cancel prior effects, use inert ghosts, preserve current text, and cannot queue',async()=>{
 const e=environment();try{
  const m=new MotionSystem(),root=new e.Node();root.card=new e.Node('Front');m.after(root,m.before(root,info('flashcards','work','a:front')));
  for(let i=0;i<20;i++){
   const old=root.card;m.flip(i%2===1);const frame=m.before(root,info('flashcards','work',i%2?'a:front':'a:back'));
   root.card=new e.Node(i%2?'Front':'Back');m.after(root,frame);
   assert.equal(root.card.textContent,i%2?'Front':'Back');assert.ok(e.body.nodes.length<=1);
   const ghost=e.body.nodes[0];assert.equal(ghost.inert,true);assert.equal(ghost.attributes['aria-hidden'],'true');assert.equal(ghost.attributes.id,undefined);
   assert.equal(root.card.effects.at(-1).options.delay,260);assert.equal(root.card.effects.at(-1).options.fill,'backwards');
   if(i>0)assert.ok(old.effects.every(effect=>effect.cancelled));
  }
  m.cancel();assert.equal(e.body.nodes.length,0);assert.ok(root.card.effects.every(effect=>effect.cancelled));await Promise.resolve();
 }finally{e.restore();}
});
test('enabling Reduce Motion mid-animation removes overlays and settles the current card immediately',()=>{
 const e=environment();try{
  const m=new MotionSystem(),root=new e.Node();root.card=new e.Node('A');m.after(root,m.before(root,info('prompts','play','A')));
  m.intent('prompt-draw');const frame=m.before(root,info('prompts','play','B'));root.card=new e.Node('B');m.after(root,frame);assert.ok(root.card.classes.has('motion-stack'));
  e.preference.matches=true;e.listeners.preference();assert.equal(e.body.nodes.length,0);assert.ok(!root.card.classes.has('motion-stack'));assert.equal(root.card.textContent,'B');
  const count=root.card.effects.length;m.pop(root.card);assert.equal(root.card.effects.length,count);
 }finally{e.restore();}
});
test('unchanged cards and timer-only renders do not animate, and missing animation support remains usable',()=>{
 const e=environment();try{
  const m=new MotionSystem(),root=new e.Node();root.card=new e.Node('A');
  m.after(root,m.before(root,info('headbands','play','A','running')));m.cancel();const count=root.card.effects.length;
  m.after(root,m.before(root,info('headbands','play','A','running')));assert.equal(root.card.effects.length,count);
  root.card.animate=undefined;m.pop(root.card);assert.equal(e.body.nodes.length,0);assert.equal(root.card.textContent,'A');
 }finally{e.restore();}
});
