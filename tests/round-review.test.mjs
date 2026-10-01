import test from 'node:test';
import assert from 'node:assert/strict';
import {Round} from '../dist/model.js';
import {HeadbandsRound,TeamGame} from '../dist/games.js';
import {TabooRound} from '../dist/taboo.js';
const cards=[{id:'a',text:'Alpha'},{id:'b',text:'Beta'},{id:'c',text:'Gamma'}];
test('Catchphrase review records only accepted advances and resets for a new round',()=>{
 const game=new TeamGame(cards,['A','B'],30),r=game.start(0),first={...r.current};
 r.answer(false,1000);assert.deepEqual(r.results,[first]);assert.equal(r.passed,1);
 r.pause(2000);assert.equal(r.answer(false,3000),false);assert.equal(r.results.length,1);
 r.resume(5000);r.tick(33000);assert.equal(r.answer(false,33000),false);
 game.award(null);game.start(34000);assert.deepEqual(r.results,[]);assert.equal(r.passed,0);
 assert.deepEqual(cards,[{id:'a',text:'Alpha'},{id:'b',text:'Beta'},{id:'c',text:'Gamma'}]);
});
test('all timed rounds freeze while paused and reject an answer at the resumed deadline',()=>{
 const tabooCards=cards.map(c=>({...c,forbidden:['one','two','three','four','five']}));
 for(const r of [new Round(cards,30,0),new HeadbandsRound(cards,30,0),new TabooRound(tabooCards,30,0)]){
  r.pause(10000);r.tick(100000);assert.equal(r.remaining,20000);assert.equal(r.phase,'paused');
  r.resume(100000);assert.equal(r.deadline,120000);
  assert.equal(r.answer(r instanceof TabooRound?'Correct':true,120000),false);
  assert.equal(r.phase,'ended');assert.equal(r.score,0);
 }
});
