import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeState, encodeState, exportBackup, parseBackup, restoreBackup, NewerFormatError} from '../dist/backup.js';
import {CountdownCues, beepInterval} from '../dist/cues.js';
const library = {decks:[{id:'deck-1',name:'Unicode & duplicates',activities:[],deckContext:'both',compatibleModes:['catchphrase','headbands','prompts'],cards:[{id:'a',text:'Beyoncé'},{id:'b',text:'Beyoncé'},{id:'c',text:'-5 degrees'},{id:'d',text:'<script>just text</script>'}]}],duration:60,probe:'existing-marker'};
test('versioned export/restore preserves deck order, duplicate prompts, settings and Unicode',()=>{
  const parsed=parseBackup(exportBackup(library)).library;
  assert.deepEqual(parsed,library);
  let sequence=0; const restored=restoreBackup({decks:[],duration:90,probe:null},parsed,'replace',()=>`new-${sequence++}`);
  assert.deepEqual(restored.decks[0].cards.map(c=>c.text),library.decks[0].cards.map(c=>c.text));
  assert.equal(restored.duration,60); assert.equal(restored.probe,'existing-marker');assert.notEqual(restored.decks[0].id,'deck-1');
});
test('old persisted library upgrades without losing IDs or data, new state roundtrips',()=>{
  assert.deepEqual(decodeState(library),library); assert.deepEqual(decodeState(encodeState(library)),library);
  assert.throws(()=>decodeState({format:'deckforge-pwa-state',version:7,library}),NewerFormatError);
});
test('additive restore is non-mutating and repeated imports have fresh IDs',()=>{
  let sequence=0; const next=restoreBackup(library,library,'add',()=>`copy-${sequence++}`);
  assert.equal(library.decks.length,1); assert.equal(next.decks.length,2); assert.equal(next.decks[0].id,'deck-1');
  assert.equal(new Set(next.decks.map(d=>d.id)).size,2); assert.equal(next.duration,60);
});
test('original POC and exported native backups are readable',()=>{
  assert.deepEqual(parseBackup(JSON.stringify({format:'deckforge-pwa-poc-v1',...library})).library,library);
  const native=parseBackup(JSON.stringify({version:1,decks:[{name:'Native copy',cards:['A','A','B']}]}));
  assert.equal(native.source,'Native DeckForge backup'); assert.deepEqual(native.library.decks[0].cards.map(c=>c.text),['A','A','B']);
});
test('bad, partial, duplicate-ID and future backups are rejected before mutation',()=>{
  for(const text of ['{','null','{}',JSON.stringify({format:'other',...library}),JSON.stringify({version:1,decks:[{name:'Oops',cards:['']}]}),JSON.stringify({format:'deckforge-pwa-backup',version:1,library:{...library,decks:[{...library.decks[0],cards:[{id:'a',text:'A'},{id:'a',text:'B'}]}]}})]) assert.throws(()=>parseBackup(text));
  assert.throws(()=>parseBackup(JSON.stringify({format:'deckforge-pwa-backup',version:7,library})),NewerFormatError);
  assert.equal(library.decks.length,1);
});
test('2,000-card backup restores every numbered position',()=>{
  const large={...library,decks:[{id:'large',name:'Large',activities:[],deckContext:'both',compatibleModes:['catchphrase','headbands','prompts'],cards:Array.from({length:2000},(_,i)=>({id:String(i),text:`Item ${i+1}`}))}]};
  const restored=parseBackup(exportBackup(large)).library;
  assert.deepEqual(restored,large);assert.equal(restored.decks[0].cards[1999].text,'Item 2000');
});
test('timer smoothly accelerates from two seconds to urgent 180ms cues',()=>{
  assert.equal(beepInterval(90000,90000),2000);assert.equal(beepInterval(0,90000),180);
  assert.ok(beepInterval(45000,90000)<2000);assert.ok(beepInterval(1000,90000)<beepInterval(45000,90000));
});
test('cue scheduling respects pause/resume and buzzes only once at expiry',()=>{
  const cues=new CountdownCues(); assert.equal(cues.update('running',90000,90000,0),'beep');
  assert.equal(cues.update('running',89000,90000,1000),null);assert.equal(cues.update('paused',88000,90000,2000),null);
  assert.equal(cues.update('running',88000,90000,9000),'beep');assert.equal(cues.update('ended',0,90000,97000),'buzzer');
  assert.equal(cues.update('ended',0,90000,97050),null); cues.reset(); assert.equal(cues.update('ended',0,90000,98000),null);
});
test('late timer callbacks schedule one new beep instead of replaying missed cues',()=>{
  const cues=new CountdownCues();cues.update('running',90000,90000,0);
  assert.equal(cues.update('running',10000,90000,80000),'beep');assert.equal(cues.update('running',10000,90000,80001),null);
});
