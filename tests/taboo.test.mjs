import test from 'node:test';
import assert from 'node:assert/strict';
import {importTaboo,TabooRound,TabooGame} from '../dist/taboo.js';
import {decodeState,exportBackup,parseBackup,restoreBackup} from '../dist/backup.js';
const cards=Array.from({length:3},(_,i)=>({id:`c${i}`,text:`Answer ${i}`,forbidden:['one','two','three','four','five']}));
const old={decks:[{id:'regular',name:'Regular',cards:[{id:'a',text:'Original'}]}],duration:60,probe:null};
const library={...old,tabooDecks:[{id:'taboo',name:'Taboo',cards}],tabooTeams:['Red','Blue'],tabooDuration:0};
test('Taboo import strips prefixes and rejects a partial batch with a line number',()=>{
  assert.deepEqual(importTaboo('1. Cat | pet | fur | meow | kitten | animal\n\n• Dog | bark | puppy | pet | tail | animal').map(c=>c.text),['Cat','Dog']);
  assert.throws(()=>importTaboo('Cat | pet | fur | meow | kitten | animal\nDog | bark'),/Line 2/);
  assert.throws(()=>importTaboo('Cat | | fur | meow | kitten | animal'),/Line 1/);
});
test('legacy states retain regular decks and mixed backups preserve both collections',()=>{
  for(const version of [1,2])assert.deepEqual(decodeState({format:'deckforge-pwa-state',version,library:old}),old);
  assert.deepEqual(parseBackup(exportBackup(library)).library,library);
  let n=0;const added=restoreBackup(library,library,'add',()=>`copy${n++}`);
  assert.equal(added.decks.length,2);assert.equal(added.tabooDecks.length,2);
  assert.notEqual(added.tabooDecks[1].cards[0].id,cards[0].id);
  assert.deepEqual(added.tabooDecks[1].cards[0].forbidden,cards[0].forbidden);
  assert.deepEqual(restoreBackup(library,old,'replace',()=>`replacement${n++}`).tabooDecks,[]);
  assert.equal(library.tabooDecks.length,1);
});
test('malformed Taboo backups fail before any data changes',()=>{
  const bad=structuredClone(library);bad.tabooDecks[0].cards[0].forbidden.pop();
  assert.throws(()=>parseBackup(JSON.stringify({format:'deckforge-pwa-backup',version:3,library:bad})));
  assert.equal(library.tabooDecks[0].cards[0].forbidden.length,5);
});
test('Correct +1, Pass 0, Taboo -1; each card appears once and scores settle once',()=>{
  const match=new TabooGame(cards,['Red','Blue'],60),r=match.start(0);
  const seen=[r.current.id];r.answer('Correct',1);seen.push(r.current.id);r.answer('Passed',2);seen.push(r.current.id);r.answer('Taboo',3);
  assert.equal(new Set(seen).size,3);assert.equal(r.score,0);assert.equal(r.reason,'complete');
  match.settle();match.settle();assert.deepEqual(match.scores,[0,0]);match.start(4);assert.equal(match.teamIndex,1);
});
test('paused time freezes, expiry rejects answers, negative scores carry to the active team',()=>{
  const m=new TabooGame(cards,['Red','Blue'],15),r=m.start(0);r.answer('Taboo',1000);r.pause(2000);r.tick(90000);assert.equal(r.remaining,13000);r.resume(100000);r.tick(113000);assert.equal(r.phase,'ended');assert.equal(r.answer('Correct',113001),false);m.settle();m.settle();assert.deepEqual(m.scores,[-1,0]);
  assert.throws(()=>new TabooRound([],60,0));
});
