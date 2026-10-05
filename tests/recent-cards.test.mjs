import test from 'node:test';
import assert from 'node:assert/strict';
import {RecentCards,chooseCard,RandomCardBag,recentLimit,decodeRecentCards} from '../dist/recent-cards.js';
import {Round,lookup} from '../dist/model.js';
import {TeamGame,HeadbandsRound} from '../dist/games.js';
import {TabooRound} from '../dist/taboo.js';
import {PromptSession} from '../dist/prompt-session.js';
import {FlashcardSession} from '../dist/flashcards.js';
const deck=(id='d',size=6)=>({id,name:id,deckContext:'both',compatibleModes:['prompts'],activities:[],cards:Array.from({length:size},(_,i)=>({id:`${id}${i}`,text:`Word ${i}`,back:`Answer ${i}`}))});
const setup=(decks=[deck()],changed)=>{const memory=new RecentCards(undefined,changed);memory.reconcile(decks);return memory;};
test('old installations start enabled and empty; selecting/binding/bag preparation records nothing',()=>{
 const d=deck(),m=setup([d]);const policy=m.forDeck(d.id);const bag=new RandomCardBag(d.cards,policy);bag.refill();
 assert.equal(m.enabled(d.id),true);assert.deepEqual(m.ids(d.id),[]);assert.equal(policy.recent().size,0);
 assert.deepEqual([0,1,2,3,6,7].map(recentLimit),[0,0,1,1,3,3]);
});
test('rolling half-window holds newest unique IDs only; restart snapshot preserves IDs and toggle, no content',()=>{
 const d=deck(),m=setup([d]),policy=m.forDeck(d.id);
 for(const id of ['d0','d1','d2','d3','d1'])policy.shown(id);
 assert.deepEqual(m.ids(d.id),['d2','d3','d1']);m.setEnabled(d.id,false);policy.shown('d5');assert.deepEqual(m.ids(d.id),['d2','d3','d1']);
 const saved=JSON.parse(JSON.stringify(m.snapshot())),reopened=new RecentCards(saved);reopened.reconcile([d]);
 assert.equal(reopened.enabled(d.id),false);assert.deepEqual(reopened.ids(d.id),m.ids(d.id));assert.ok(!JSON.stringify(saved).includes('Word'));
 reopened.setEnabled(d.id,true);assert.ok(reopened.forDeck(d.id).recent().has('d1'));
});
test('fresh eligible cards take priority; fallback stays eligible and avoids immediate repeats',()=>{
 const d=deck(),m=setup([d]),policy=m.forDeck(d.id);policy.shown('d0');policy.shown('d1');policy.shown('d2');
 assert.equal(chooseCard(d.cards,policy,undefined,()=>0).id,'d3');
 assert.equal(chooseCard(d.cards.slice(0,2),policy,'d0',()=>0).id,'d1');
 assert.equal(chooseCard([d.cards[0]],policy,'d0',()=>0).id,'d0');assert.equal(chooseCard([],policy),undefined);
 m.setEnabled(d.id,false);assert.equal(chooseCard(d.cards,policy,undefined,()=>0).id,'d0');
});
test('reset affects only its deck; missing IDs/decks and shrinking windows are pruned safely',()=>{
 const a=deck('A'),b=deck('B');const m=setup([a,b]);m.forDeck('A').shown('A0');m.forDeck('B').shown('B0');m.reset('A');
 assert.deepEqual(m.ids('A'),[]);assert.deepEqual(m.ids('B'),['B0']);m.forDeck('B').shown('deleted');assert.deepEqual(m.ids('B'),['B0']);
 m.forDeck('B').shown('B1');m.forDeck('B').shown('B2');m.reconcile([{...b,cards:b.cards.slice(1,3)}]);
 assert.deepEqual(m.ids('B'),['B2']);assert.equal(m.snapshot().decks.A,undefined);
 m.reconcile([{...b,cards:[b.cards[2]]}]);assert.deepEqual(m.ids('B'),[]);
});
test('malformed/legacy history is tolerated; duplicate IDs retain most recent position',()=>{
 assert.deepEqual(decodeRecentCards(null),{version:1,decks:{}});assert.deepEqual(decodeRecentCards({decks:42}),{version:1,decks:{}});
 const value=decodeRecentCards({version:1,decks:{d:{ids:['a','b','a',null,4],enabled:false},bad:null}});
 assert.deepEqual(value.decks.d,{enabled:false,ids:['b','a']});assert.equal(value.decks.bad,undefined);assert.throws(()=>decodeRecentCards({version:2,decks:{}}));
});
test('Catchphrase records only current draws, retains bag uniqueness/refill, restart and deadline safety',()=>{
 const d=deck(),m=setup([d]),game=new TeamGame(d.cards,['A','B'],30,m.forDeck(d.id));assert.deepEqual(m.ids(d.id),[]);
 let r=game.start(0);assert.deepEqual(m.ids(d.id),[r.current.id]);const seen=new Set([r.current.id]);
 for(let i=0;i<5;i++){r.answer(false,1);seen.add(r.current.id);}assert.equal(seen.size,6);
 const before=[...m.ids(d.id)],last=r.current.id;r.pause(2);assert.equal(r.answer(true,3),false);r.resume(4);assert.deepEqual(m.ids(d.id),before);
 r.answer(false,5);assert.notEqual(r.current.id,last);const recorded=[...m.ids(d.id)];r.tick(40000);assert.equal(r.answer(true,40000),false);assert.deepEqual(m.ids(d.id),recorded);
 game.award(null);r=game.start(40001);assert.ok(!recorded.includes(r.current.id));
});
test('Headbands and Taboo prioritize fresh first, fall back to remaining recent cards, never refill',()=>{
 const d=deck();for(const kind of ['head','taboo']){
  const m=setup([d]),policy=m.forDeck(d.id);for(const c of d.cards.slice(0,3))policy.shown(c.id);
  const cards=kind==='taboo'?d.cards.map(c=>({...c,forbidden:['a','b','c','d','e']})):d.cards;
  const r=kind==='taboo'?new TabooRound(cards,60,0,policy):new HeadbandsRound(cards,60,0,policy);
  assert.ok(!d.cards.slice(0,3).some(c=>c.id===r.current.id));const seen=[];
  while(r.phase==='running'){seen.push(r.current.id);r.answer(kind==='taboo'?'Passed':false,1);}
  assert.equal(new Set(seen).size,6);assert.equal(r.reason,'complete');const history=m.ids(d.id);r.answer(kind==='taboo'?'Correct':true,2);assert.deepEqual(m.ids(d.id),history);
 }
});
test('Prompt Picker preserves equal deck chances and source-only histories, even with shared card IDs',()=>{
 const a=deck('A',2),b=deck('B',300);b.cards[0].id=a.cards[0].id;const m=setup([a,b]);
 const s=new PromptSession([a,b],'none',{},id=>m.forDeck(id));assert.deepEqual(m.ids('A'),[]);assert.deepEqual(m.ids('B'),[]);
 const counts={A:0,B:0};for(let i=0;i<100;i++){let call=0;const draw=s.draw(()=>call++===0?(i+.5)/100:0);counts[draw.deck.id]++;}
 assert.deepEqual(counts,{A:50,B:50});assert.equal(m.ids('A').length,1);assert.equal(m.ids('B').length,50);
 const priorB=m.ids('B');s.draw(()=>0);assert.deepEqual(m.ids('B'),priorB);
 const saved=m.snapshot(),next=new RecentCards(saved);next.reconcile([a,b]);const fresh=new PromptSession([a],'none',{},id=>next.forDeck(id));assert.ok(!m.ids('A').includes(fresh.draw(()=>0).card.id));
});
test('Flashcards, fixed numbered lookup and shuffle do not participate in memory',()=>{
 const d=deck(),m=setup([d]);const study=new FlashcardSession(d.cards,'front',d.name);study.flip();study.move(1);study.move(-1);study.shuffle();lookup(d.cards,'2');assert.deepEqual(m.ids(d.id),[]);
});
test('2000-card deck retains only 1000 IDs with no content or source mutation',()=>{
 const d=deck('large',2000),before=structuredClone(d),m=setup([d]),bag=new RandomCardBag(d.cards,m.forDeck(d.id));bag.refill();
 const seen=new Set();for(let i=0;i<2000;i++)seen.add(bag.draw(()=>0).id);
 assert.equal(seen.size,2000);assert.equal(m.ids(d.id).length,1000);assert.deepEqual(d,before);
});
