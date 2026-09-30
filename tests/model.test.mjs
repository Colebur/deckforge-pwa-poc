import test from 'node:test';
import assert from 'node:assert/strict';
import { importLines, lookup, Round, shuffled } from '../dist/model.js';
const cards=Array.from({length:2000},(_,i)=>({id:String(i),text:`Card ${i+1}`}));
test('bulk import handles line endings, prefixes, blanks, Unicode and duplicates',()=>{
  assert.deepEqual(importLines('1. Beyoncé\r\n2) Apple\r• Beyoncé\n -   \n* Orange\n2024\n3.14 pi\n-5 degrees'),['Beyoncé','Apple','Beyoncé','Orange','2024','3.14 pi','-5 degrees']);
});
test('fixed-number lookup validates full integers and bounds',()=>{
  assert.equal(lookup(cards,' 0007 '),6); assert.equal(lookup(cards,'2000'),1999);
  for(const input of ['','0','-1','+1','1.5','2001','999999999999999999999']) assert.throws(()=>lookup(cards,input));
});
test('shuffle preserves all 2000 distinct card IDs and leaves source untouched',()=>{
  const result=shuffled(cards); assert.equal(new Set(result.map(c=>c.id)).size,2000); assert.equal(cards[0].id,'0');
});
test('round snapshots cards and draws the whole shuffled deck before reuse',()=>{
  const prompts=[...cards]; const round=new Round(prompts,300,1000); prompts[0]={id:'changed',text:'Changed'};
  const seen=new Set(); for(let i=0;i<2000;i++){ seen.add(round.current.id); round.answer(true,1001); }
  assert.equal(seen.size,2000);assert.equal(round.score,2000);
});
test('pause/resume freezes remaining time and late answers cannot score',()=>{
  const r=new Round(cards,5,0); r.answer(true,1000);r.pause(2000); r.tick(500000);
  assert.equal(r.remaining,3000);assert.equal(r.answer(true,500000),false);r.resume(500000);r.tick(502999);
  assert.equal(r.phase,'running');assert.equal(r.answer(true,503000),false);assert.equal(r.score,1);assert.equal(r.phase,'ended');
});
test('pass advances without scoring; refill avoids immediate repeated card',()=>{
  const r=new Round(cards.slice(0,2),90,0); const first=r.current.id;r.answer(false,1);const last=r.current.id;
  assert.notEqual(first,last);r.answer(true,2);assert.notEqual(r.current.id,last);assert.equal(r.score,1);assert.equal(r.passed,1);
});
test('empty decks and bad durations cannot start; single-card decks remain usable',()=>{
  assert.throws(()=>new Round([],90,0));for(const seconds of [0,301,NaN])assert.throws(()=>new Round(cards,seconds,0));
  const r=new Round(cards.slice(0,1),5,0);r.answer(false,1);assert.equal(r.current.id,'0');
});

import { mediaResponse } from '../dist/media.js';
test('offline media supports Safari initial, open-ended and suffix byte requests',async()=>{
  const response=()=>new Response(new Uint8Array([0,1,2,3,4,5]),{headers:{'Content-Type':'audio/wav'}});
  const initial=await mediaResponse(response(),'bytes=0-1');
  assert.equal(initial.status,206);assert.equal(initial.headers.get('Content-Range'),'bytes 0-1/6');
  assert.deepEqual([...new Uint8Array(await initial.arrayBuffer())],[0,1]);
  const rest=await mediaResponse(response(),'bytes=3-');assert.deepEqual([...new Uint8Array(await rest.arrayBuffer())],[3,4,5]);
  const suffix=await mediaResponse(response(),'bytes=-2');assert.deepEqual([...new Uint8Array(await suffix.arrayBuffer())],[4,5]);
  const clamped=await mediaResponse(response(),'bytes=0-99');assert.equal(clamped.headers.get('Content-Length'),'6');
});
test('invalid media ranges fail explicitly; full requests stay intact',async()=>{
  const response=()=>new Response(new Uint8Array([0,1,2]));
  for(const range of ['bytes=99-','bytes=2-1','bytes=-0','bytes=-','bytes=0-1,2-3','bad'])
    assert.equal((await mediaResponse(response(),range)).status,416);
  assert.equal((await mediaResponse(response(),null)).status,200);
});

// Uneven deck sizes expose the bias that picking a random deck first would create.
test('Prompt Picker weights every card equally across uneven decks and retains source identity',async()=>{
 const {randomPrompt}=await import('../dist/model.js');
 const decks=[{id:'empty',name:'Empty',cards:[]},{id:'small',name:'Small',cards:[{id:'s',text:'Duplicate'}]},{id:'big',name:'Big',cards:[{id:'b1',text:'Duplicate'},{id:'b2',text:'Two'},{id:'b3',text:'Three'}]}];
 const before=structuredClone(decks);
 const picks=Array.from({length:4},(_,i)=>randomPrompt(decks,null,()=>(i+0.5)/4));
 assert.deepEqual(picks.map(p=>[p.deck.id,p.card.id]),[['small','s'],['big','b1'],['big','b2'],['big','b3']]);
 assert.equal(randomPrompt(decks,null,()=>0).card.id,'s');assert.equal(randomPrompt(decks,null,()=>0.999999).card.id,'b3');assert.deepEqual(decks,before);
});
test('Prompt Picker restricts a single deck, safely handles empty/deleted decks and reaches large-deck endpoints',async()=>{
 const {randomPrompt}=await import('../dist/model.js');
 const decks=[{id:'empty',name:'Empty',cards:[]},{id:'large',name:'Large',cards:Array.from({length:2000},(_,i)=>({id:String(i),text:String(i)}))}];
 assert.equal(randomPrompt(decks,'large',()=>0).card.id,'0');assert.equal(randomPrompt(decks,'large',()=>0.999999).card.id,'1999');
 assert.equal(randomPrompt(decks,'empty'),undefined);assert.equal(randomPrompt(decks,'deleted'),undefined);assert.equal(randomPrompt([]),undefined);
});
