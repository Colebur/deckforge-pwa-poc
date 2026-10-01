import test from 'node:test';
import assert from 'node:assert/strict';
import {ActivitySession,renderActivity,moveItem} from '../dist/activities.js';
import {decodeState,encodeState,parseBackup,exportBackup,restoreBackup} from '../dist/backup.js';
const activities=['I feel {card} when...','Show {card} with your face.','Draw {card}.'].map((text,i)=>({id:`activity-${i}`,text,createdAt:'2026-09-30T00:00:00.000Z'}));
const legacy={decks:[{id:'deck',name:'Feelings',cards:[{id:'card',text:'Frustrated'}]}],duration:0,probe:null};
const library={...legacy,decks:[{...legacy.decks[0],activities,deckContext:'both',compatibleModes:['prompts','catchphrase','headbands']}]};
test('all old state/backup versions safely add empty Activities without changing cards',()=>{
  for(const version of [1,2,3]){
    const state=decodeState({format:'deckforge-pwa-state',version,library:legacy});
    assert.deepEqual(state.decks[0],{...legacy.decks[0],activities:[],deckContext:'both',compatibleModes:['prompts','catchphrase','headbands']});
    assert.deepEqual(parseBackup(JSON.stringify({format:'deckforge-pwa-backup',version,library:legacy})).library,state);
  }
  assert.deepEqual(decodeState(legacy).decks[0].activities,[]);
});
test('Activities survive state/export, and restores retain text/date/order with fresh IDs',()=>{
  assert.deepEqual(decodeState(encodeState(library)),library);
  assert.deepEqual(parseBackup(exportBackup(library)).library,library);
  let n=0;const added=restoreBackup(library,library,'add',()=>`copy-${n++}`);
  assert.deepEqual(added.decks[1].activities.map(({text,createdAt})=>({text,createdAt})),activities.map(({text,createdAt})=>({text,createdAt})));
  assert.notEqual(added.decks[1].activities[0].id,activities[0].id);
  assert.deepEqual(restoreBackup(library,decodeState(legacy),'replace').decks[0].activities,[]);
});
test('malformed Activities fail validation rather than silently dropping content',()=>{
  for(const value of [null,{},[{...activities[0],text:''}],[{...activities[0],createdAt:'bad'}],[activities[0],activities[0]]])
    assert.throws(()=>decodeState({...legacy,decks:[{...legacy.decks[0],activities:value}]}));
});
test('template replaces every literal card placeholder; unknown placeholders and replacement characters remain literal',()=>{
  assert.equal(renderActivity('I feel {card} when...','Frustrated'),'I feel Frustrated when...');
  assert.equal(renderActivity('{card} / {card} / {player}', '$& <b>{team}</b>'),'$& <b>{team}</b> / $& <b>{team}</b> / {player}');
  assert.equal(activities[0].text,'I feel {card} when...');
});
test('Fixed stays fixed; None and zero Activities never produce an instruction',()=>{
  const fixed=new ActivitySession(activities,'fixed',activities[1].id);
  for(let i=0;i<5;i++)assert.equal(fixed.select().id,activities[1].id);
  assert.equal(new ActivitySession(activities).select(),undefined);
  for(const mode of ['none','fixed','random','cycle']){const s=new ActivitySession([],mode);assert.equal(s.mode,'none');assert.equal(s.select(),undefined);assert.equal(s.reroll(),undefined);}
  assert.throws(()=>new ActivitySession(activities,'fixed','missing'));
});
test('Random and reroll avoid immediate repeats; one Activity works and reroll before selection does nothing',()=>{
  const s=new ActivitySession(activities,'random');assert.equal(s.reroll(),undefined);
  let previous;for(let i=0;i<30;i++){const current=i%2?s.select(()=>0):s.reroll(()=>0)??s.select(()=>0);assert.notEqual(current.id,previous);previous=current.id;}
  const single=new ActivitySession(activities.slice(0,1),'random');assert.equal(single.select().id,single.reroll().id);
});
test('Cycle wraps in deck order and sessions snapshot without mutating content',()=>{
  const source=structuredClone(activities),s=new ActivitySession(source,'cycle');source.reverse();source[0].text='Edited later';
  assert.deepEqual(Array.from({length:7},()=>s.select().id),['activity-0','activity-1','activity-2','activity-0','activity-1','activity-2','activity-0']);
  assert.equal(s.activities[2].text,activities[2].text);
});
test('reorder preserves objects and safely handles endpoints or missing IDs',()=>{
  const moved=moveItem(activities,'activity-1',-1);assert.deepEqual(moved.map(a=>a.id),['activity-1','activity-0','activity-2']);assert.deepEqual(activities.map(a=>a.id),['activity-0','activity-1','activity-2']);
  assert.deepEqual(moveItem(activities,'activity-0',-1),activities);assert.deepEqual(moveItem(activities,'activity-2',1),activities);assert.deepEqual(moveItem(activities,'missing',1),activities);
});
