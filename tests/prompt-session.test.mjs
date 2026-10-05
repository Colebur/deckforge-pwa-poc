import test from 'node:test';
import assert from 'node:assert/strict';
import {PromptSession} from '../dist/prompt-session.js';
import {modeDecks,MODES} from '../dist/modes.js';
import {decodeState,encodeState,parseBackup,exportBackup} from '../dist/backup.js';
import {renderActivity} from '../dist/activities.js';
const deck=(id,n)=>({id,name:id,deckContext:'work',compatibleModes:['lookup','prompts'],cards:Array.from({length:n},(_,i)=>({id:id+i,text:id+i})),activities:[0,1,2].map(i=>({id:id+'a'+i,text:`${id} ${i} {card} {card} {unknown}`,createdAt:'2026-10-01T00:00:00Z'}))});
test('Jenga structural gate excludes 53/55 even with Show All and preserves dormant assignment',()=>{
 const decks=[deck('a',53),deck('b',54),deck('c',55)];assert.deepEqual(modeDecks(decks,'lookup','work',true).visible.map(d=>d.id),['b']);
 const library={decks,duration:90,probe:null};assert.deepEqual(decodeState(encodeState(library)),library);
 assert.equal(MODES[0].title,'Jenga');assert.equal(MODES[1].id,'prompts');assert.ok(!MODES.filter(m=>m.play).some(m=>m.id==='lookup'));
});
test('v5 lookup migration preserves 54 assignment and removes only invalid lookup assignments',()=>{
 const decks=[deck('a',53),deck('b',54),deck('c',55)],source={decks,duration:90,probe:'keep'},before=structuredClone(source);
 const migrated=decodeState({format:'deckforge-pwa-state',version:5,library:source});
 assert.deepEqual(migrated.decks.map(d=>d.compatibleModes),[['prompts'],['lookup','prompts'],['prompts']]);
 assert.deepEqual(migrated.decks.map(d=>d.cards),decks.map(d=>d.cards));assert.deepEqual(migrated.decks.map(d=>d.activities),decks.map(d=>d.activities));assert.deepEqual(source,before);
 assert.deepEqual(parseBackup(exportBackup(migrated)).library,migrated);
});
test('balanced draw gives a 1-card and a 300-card deck equal opportunity, retaining identity',()=>{
 const a=deck('A',1),b=deck('B',300),s=new PromptSession([a,b]);let counts={A:0,B:0};
 for(let i=0;i<100;i++){let call=0;const drawn=s.draw(()=>call++===0?(i+.5)/100:.25);counts[drawn.deck.id]++;assert.ok(drawn.card.text.startsWith(drawn.deck.id));}
 assert.deepEqual(counts,{A:50,B:50});assert.equal(s.decks[1].cards.length,300);
});
test('no immediate card repeats within a multi-card deck, including identical IDs across source decks',()=>{
 const a=deck('A',2),b=deck('B',2);b.cards[0].id=a.cards[0].id;const s=new PromptSession([a,b]);const first=s.draw(()=>0);const second=s.draw(()=>0);assert.notEqual(first.card.id,second.card.id);
 const singleton=new PromptSession([deck('only',1)]);assert.equal(singleton.draw(()=>0).card.id,singleton.draw(()=>0).card.id);
 assert.equal(new PromptSession([]).draw(),undefined);
});
test('Fixed and Cycle keep source-specific Activities and independent cycle cursors; None and empty are safe',()=>{
 const a=deck('A',2),b=deck('B',2);const fixed=new PromptSession([a,b],'fixed',{A:'Aa2',B:'Ba1'});
 fixed.draw(()=>0);assert.equal(fixed.activity.id,'Aa2');fixed.draw(()=>.9);assert.equal(fixed.activity.id,'Ba1');
 const cycle=new PromptSession([a,b],'cycle');cycle.draw(()=>0);assert.equal(cycle.activity.id,'Aa0');cycle.draw(()=>.9);assert.equal(cycle.activity.id,'Ba0');cycle.draw(()=>0);assert.equal(cycle.activity.id,'Aa1');cycle.draw(()=>0);cycle.draw(()=>0);assert.equal(cycle.activity.id,'Aa0');
 const none=new PromptSession([a]);none.draw();assert.equal(none.activity,undefined);
 const empty=new PromptSession([{...a,activities:[]}],'fixed');empty.draw();assert.equal(empty.activity,undefined);
});
test('Random/reroll never borrow another deck Activity or change card, and replace repeated placeholders literally',()=>{
 const decks=[deck('A',2),deck('B',2)],before=structuredClone(decks),s=new PromptSession(decks,'random');s.draw(()=>0);const card=s.current.card,first=s.activity.id;s.reroll(()=>0);assert.notEqual(s.activity.id,first);assert.equal(s.current.card,card);
 assert.ok(renderActivity(s.activity.text,card.text).includes(`${card.text} ${card.text} {unknown}`));s.draw(()=>.9);assert.ok(s.activity.id.startsWith('B'));assert.deepEqual(decks,before);
});
