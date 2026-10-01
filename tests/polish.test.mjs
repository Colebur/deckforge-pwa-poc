import test from 'node:test';
import assert from 'node:assert/strict';
import {alphabeticalDecks} from '../dist/model.js';
import {activityParts} from '../dist/activities.js';
import {HeadbandsSetup} from '../dist/headbands-setup.js';
import {TiltDetector} from '../dist/tilt.js';
const pose=(angle,sign=1)=>[sign*Math.cos(angle*Math.PI/180),0,Math.sin(angle*Math.PI/180)];
function observe(s,start,end,g=pose(10),heading=180){for(let t=start;t<=end;t+=.02){s.observe(g,t,true,heading);s.tick(t,true);}}
test('alphabetical views are natural/case-insensitive without modifying storage order',()=>{
 const source=[{name:'zebra',cards:['unchanged']},{name:'Deck 10'},{name:'apple'},{name:'Deck 2'},{name:'Banana'}];
 assert.deepEqual(alphabeticalDecks(source).map(d=>d.name),['apple','Banana','Deck 2','Deck 10','zebra']);assert.equal(source[0].name,'zebra');assert.deepEqual(source[0].cards,['unchanged']);
});
test('composed Activities distinguish literal template and card portions, including repeated and absent placeholders',()=>{
 assert.deepEqual(activityParts('I feel {card} when...','Overwhelmed'),[{kind:'template',text:'I feel '},{kind:'card',text:'Overwhelmed'},{kind:'template',text:' when...'}]);
 assert.equal(activityParts('{card} / {card} {player}','<b>$&</b>').filter(p=>p.kind==='card').length,2);
 assert.deepEqual(activityParts('Draw this.','Happy').at(-1),{kind:'card',text:'Happy'});
});
test('portrait cannot calibrate; placement movement plus steadiness starts three seconds before ready',()=>{
 const s=new HeadbandsSetup();s.observe(pose(0),0,false,0);assert.equal(s.stage,'rotate');
 s.observe(pose(60),.1,true,0);assert.equal(s.stage,'forehead');observe(s,.2,1,pose(10));assert.equal(s.stage,'countdown');const at=s.countdownStarted;
 observe(s,1,at+2.9);assert.equal(s.stage,'countdown');observe(s,at+2.92,at+3.1);assert.equal(s.stage,'ready');
});
test('already sideways in front of face waits for flip or explicit placement confirmation',()=>{
 const s=new HeadbandsSetup();observe(s,0,1,pose(0),0);assert.equal(s.stage,'forehead');observe(s,1.02,1.8,pose(0),180);assert.equal(s.stage,'countdown');
 const fallback=new HeadbandsSetup();observe(fallback,0,1,pose(0),0);fallback.confirmPlacement();observe(fallback,1.02,1.2,pose(0),0);assert.equal(fallback.stage,'countdown');
});
test('movement, stale sensors or portrait cancels countdown; restart uses a new stable baseline',()=>{
 const s=new HeadbandsSetup();s.observe(pose(60),0,true);observe(s,.02,1);assert.equal(s.stage,'countdown');s.observe(pose(-10),1.1,true);assert.equal(s.stage,'forehead');
 observe(s,1.12,2);assert.equal(s.stage,'countdown');s.tick(3,true);assert.equal(s.stage,'forehead');
 observe(s,3.02,4);assert.equal(s.stage,'countdown');s.tick(4.02,false);assert.equal(s.stage,'rotate');assert.equal(s.countdownStarted,undefined);
});
test('explicit detector captures the actual forehead angle in both landscape directions and never self-rebaselines',()=>{
 for(const sign of [1,-1]){const d=new TiltDetector(false);assert.equal(d.update(...pose(10,sign),0),null);assert.equal(d.calibrated,false);assert.equal(d.calibrate(pose(15,sign),.1),true);
 let events=[];for(let t=.12;t<.3;t+=.02){const e=d.update(...pose(41,sign),t);if(e)events.push(e);}assert.deepEqual(events,['correct']);
 for(let t=.3;t<.55;t+=.02)d.update(...pose(15,sign),t);
 events=[];for(let t=.56;t<.72;t+=.02){const e=d.update(...pose(-11,sign),t);if(e)events.push(e);}assert.deepEqual(events,['pass']);
 d.update(...pose(15,sign),2);assert.equal(d.calibrated,false);for(let t=2.02;t<3;t+=.02)d.update(...pose(15,sign),t);assert.equal(d.calibrated,false);
 }
});

test('diagonal gestures accept sideways lean without lowering elevation threshold or double scoring',()=>{
 for(const sign of [1,-1])for(const lean of [-65,65]){
  const d=new TiltDetector(false);assert.equal(d.calibrate([sign,0,0],0),true);
  let t=0;const sample=(degrees,duration)=>{const events=[];const a=degrees*Math.PI/180,b=lean*Math.PI/180;for(let i=0;i<duration;i++){t+=.02;const e=d.update(sign*Math.cos(a)*Math.cos(b),Math.cos(a)*Math.sin(b),Math.sin(a),t);if(e)events.push(e);}return events;};
  assert.deepEqual(sample(20,10),[]);assert.equal(d.calibrated,true);
  assert.deepEqual(sample(26,10),['correct']);assert.deepEqual(sample(26,10),[]);
  assert.deepEqual(sample(-26,10),[]);sample(0,12);assert.deepEqual(sample(-26,10),['pass']);
 }
});
