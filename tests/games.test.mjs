import test from 'node:test';
import assert from 'node:assert/strict';
import {TeamGame,HeadbandsRound,roundSeconds,teamNames,TIMER_CHOICES} from '../dist/games.js';
import {TiltDetector,browserGravity} from '../dist/tilt.js';
import {cuePlan,beepInterval} from '../dist/cues.js';
import {decodeState,exportBackup,parseBackup} from '../dist/backup.js';
const cards=Array.from({length:5},(_,i)=>({id:String(i),text:'Card '+i}));
test('native timers, fresh random range and validated teams',()=>{
 assert.deepEqual(TIMER_CHOICES,[0,...Array.from({length:20},(_,i)=>(i+1)*15)]);
 assert.equal(roundSeconds(0,()=>0),30);assert.equal(roundSeconds(0,()=>0.9999),90);assert.equal(roundSeconds(45),45);
 assert.deepEqual(teamNames([' A ','B']),['A','B']);for(const names of [['A'],['A','a'],['','B'],Array(9).fill('x')])assert.throws(()=>teamNames(names));
});
test('Catchphrase awards one point once, next round requires a decision, random rerolls',()=>{
 const game=new TeamGame(cards,['A','B'],0);const round=game.start(0,()=>0);assert.equal(round.remaining,30000);
 assert.equal(game.award(0),false);assert.throws(()=>game.start(1));round.tick(30000);assert.equal(game.award(4),false);assert.equal(game.award(1),true);assert.equal(game.award(1),false);assert.deepEqual(game.scores,[0,1]);
 game.start(31000,()=>0.9999);assert.equal(game.round.remaining,90000);game.round.tick(121000);assert.equal(game.award(null),true);assert.deepEqual(game.scores,[0,1]);
});
test('Headbands visits each card once, records answers, finishes deck without refill',()=>{
 const round=new HeadbandsRound(cards,60,0);while(round.phase==='running')round.answer(round.results.length%2===0,1000);
 assert.equal(round.reason,'complete');assert.equal(round.results.length,5);assert.equal(new Set(round.results.map(r=>r.card.id)).size,5);assert.equal(round.score,3);assert.equal(round.passed,2);assert.equal(round.answer(true,1000),false);
});
test('Headbands pause and exact deadline reject late tilt/button without correct feedback',()=>{
 const round=new HeadbandsRound(cards,30,0);round.pause(10000);round.tick(90000);assert.equal(round.remaining,20000);round.resume(90000);assert.equal(round.answer(true,110000),false);assert.equal(round.score,0);assert.equal(round.reason,'time');assert.equal(round.results[0].outcome,'Unanswered');round.tick(120000);assert.equal(round.results.length,1);
});
function hold(detector,angle,start,duration,sign=1){let events=[];for(let t=start;t<start+duration;t+=0.02){const a=angle*Math.PI/180;const e=detector.update(sign*Math.cos(a),0,Math.sin(a),t);if(e)events.push(e);}return events;}
test('both landscape directions calibrate, tilt down correct/up pass, hold and neutral debounce',()=>{
 for(const sign of [1,-1]){const d=new TiltDetector();assert.deepEqual(hold(d,0,0,0.8,sign),['ready']);assert.deepEqual(hold(d,45,0.8,0.5,sign),['correct']);assert.deepEqual(hold(d,45,1.3,0.4,sign),[]);hold(d,0,1.7,0.4,sign);assert.deepEqual(hold(d,-45,2.1,0.4,sign),['pass']);}
});
test('manual answers, brief tilts, invalid readings, sensor gaps and direction changes cannot double-score',()=>{
 const d=new TiltDetector();hold(d,0,0,0.8);assert.deepEqual(hold(d,45,0.8,0.06),[]);hold(d,0,0.86,0.4);d.disarm();assert.deepEqual(hold(d,45,1.28,0.3),[]);
 d.update(1,0,0,3);assert.equal(d.calibrated,false);hold(d,0,3.02,0.8);d.update(-1,0,0,3.82);assert.equal(d.calibrated,false);assert.equal(d.update(NaN,0,0,4),null);assert.equal(d.calibrated,false);
});
test('web acceleration converts into native gravity, including linear acceleration subtraction',()=>{
 assert.deepEqual(browserGravity({x:0,y:0,z:9.80665}),[-0,-0,-1]);assert.equal(browserGravity({x:null,y:0,z:0}),null);
 const g=browserGravity({x:10.80665,y:0,z:0},{x:1,y:0,z:0});assert.equal(g[0],-1);
});
test('audio-clock plan accelerates continuously, final chunk is rapid, ends precisely without overlapping beep',()=>{
 for(const length of [30000,45000,90000,300000]){const plan=cuePlan(length,length);assert.equal(plan.beeps[0],0);assert.equal(plan.buzzer,length/1000);assert.ok(plan.beeps.at(-1)<=plan.buzzer-0.1);
 const gaps=plan.beeps.slice(1).map((time,i)=>time-plan.beeps[i]);for(let i=1;i<gaps.length;i++)assert.ok(gaps[i]<=gaps[i-1]+1e-10);assert.ok(gaps.at(-1)<0.25);assert.equal(beepInterval(length,length),2000);}
 assert.equal(cuePlan(20000,90000).buzzer,20);
});
test('v1 data remains intact; v2 backups retain saved teams, Random and Headbands timer',()=>{
 const old={decks:[{id:'d',name:'Original',activities:[],deckContext:'both',compatibleModes:['lookup','catchphrase','headbands','prompts'],cards}],duration:90,probe:'keep'};assert.deepEqual(decodeState({format:'deckforge-pwa-state',version:1,library:old}),old);
 const updated={...old,duration:0,teams:['A','B','C'],headbandsDuration:75};assert.deepEqual(parseBackup(exportBackup(updated)).library,updated);
});

test('gentle 26-degree tilts register promptly in both landscape directions without repeat scoring',()=>{
 for(const sign of [1,-1]){
  const d=new TiltDetector();hold(d,0,0,0.8,sign);
  assert.deepEqual(hold(d,20,0.8,0.3,sign),[]);
  assert.deepEqual(hold(d,26,1.1,0.12,sign),['correct']);
  assert.deepEqual(hold(d,26,1.22,0.3,sign),[]);
  hold(d,0,1.52,0.22,sign);
  assert.deepEqual(hold(d,-26,1.74,0.12,sign),['pass']);
  assert.deepEqual(hold(d,-26,1.86,0.3,sign),[]);
 }
});
test('crossing the opposite tilt direction without returning to neutral cannot answer twice',()=>{
 const d=new TiltDetector();hold(d,0,0,0.8);
 assert.deepEqual(hold(d,26,0.8,0.14),['correct']);
 assert.deepEqual(hold(d,-26,0.94,0.3),[]);
 hold(d,0,1.24,0.1);assert.deepEqual(hold(d,-26,1.34,0.2),[]);
 hold(d,0,1.54,0.24);assert.deepEqual(hold(d,-26,1.78,0.14),['pass']);
});
