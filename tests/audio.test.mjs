import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio} from '../dist/game-audio.js';
// Fake the browser's output device to verify scheduled audible times and cancellation.
test('game audio schedules the final buzzer on the same clock, cancels pause cues, keeps final-answer feedback',async()=>{
 const nodes=[];
 class Node {frequency={value:0};gain={value:0,setValueAtTime(){},linearRampToValueAtTime(){}};connect(){}disconnect(){}addEventListener(){}start(at){this.at=at;}stop(at){this.stopAt=at;this.stopped=true;}}
 class Context {state='running';currentTime=100;destination={};resume(){return Promise.resolve();}addEventListener(){}decodeAudioData(){return Promise.resolve({duration:0.105});}createBufferSource(){const node=new Node();node.kind='clip';nodes.push(node);return node;}createGain(){return new Node();}createOscillator(){const node=new Node();node.kind='buzzer';nodes.push(node);return node;}}
 const oldWindow=globalThis.window,oldFetch=globalThis.fetch;globalThis.window={AudioContext:Context};globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(2)});
 try{const audio=new GameAudio();await audio.unlock();audio.schedule(15000,90000,true);
 const buzzers=nodes.filter(n=>n.kind==='buzzer');assert.equal(buzzers.length,2);assert.ok(buzzers.every(n=>n.at===115));assert.ok(nodes.filter(n=>n.kind==='clip').every(n=>n.at<=114.9));
 audio.feedback(true);const feedback=nodes.at(-1);audio.stopCountdown();assert.ok(buzzers.every(n=>n.stopped));assert.equal(feedback.stopped,undefined);audio.stop();assert.equal(feedback.stopped,true);
 audio.placementCountdown(true);const placement=nodes.slice(-3);assert.deepEqual(placement.map(n=>n.at),[100,101,102]);assert.ok(placement.every(n=>n.type==='triangle'&&n.frequency.value===1320&&n.stopAt===n.at+0.17));audio.stopCountdown();assert.ok(placement.every(n=>n.stopped));
 const count=nodes.length;audio.placementCountdown(false);assert.equal(nodes.length,count);audio.schedule(10000,90000,false);assert.equal(nodes.length,count);
 }finally{globalThis.window=oldWindow;globalThis.fetch=oldFetch;}
});
