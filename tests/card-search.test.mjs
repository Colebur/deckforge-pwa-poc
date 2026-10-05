import test from 'node:test';
import assert from 'node:assert/strict';
import {searchCards,cardSearchField} from '../dist/card-search.js';
test('regular card search covers fronts and backs, case and accents',()=>{
 const cards=[{id:'a',text:'Café',back:'A place for coffee'},{id:'b',text:'Tea'}];
 assert.deepEqual(searchCards(cards,' CAFE coffee ').map(x=>x.card.id),['a']);
 assert.deepEqual(searchCards(cards,'tea').map(x=>x.index),[1]);
 assert.equal(searchCards(cards,'missing').length,0);
});
test('Taboo search includes every forbidden word and combines fields',()=>{
 const cards=[{text:'Astronaut',forbidden:['Space','NASA','Rocket','Moon','Helmet']}];
 assert.equal(searchCards(cards,'astronaut helmet').length,1);
 for(const word of cards[0].forbidden)assert.equal(searchCards(cards,word).length,1);
});
test('Game Deck search includes questions, categories, all answers and aliases',()=>{
 const cards=[{prompt:'Who wrote it?',category:'Literature',answers:[{text:'Mary Shelley',aliases:['M. Shelley']},{text:'Another',aliases:['Second alias']}]}];
 for(const query of ['Who','literature','Mary','M. Shelley','second alias'])assert.equal(searchCards(cards,query).length,1);
 assert.equal(searchCards(cards,'literature second').length,1);
});
test('filtering retains original positions and content across a paginated deck',()=>{
 const cards=Array.from({length:120},(_,i)=>({id:String(i),text:'Card '+i,...(i===87?{back:'Needle'}:{})}));
 const before=structuredClone(cards),result=searchCards(cards,'needle');
 assert.equal(result[0].index,87);assert.strictEqual(result[0].card,cards[87]);
 assert.deepEqual(searchCards(cards,' ').map(x=>x.index),cards.map((_,i)=>i));
 assert.deepEqual(cards,before);
 assert.deepEqual(searchCards([],''),[]);
});
test('search input escapes query content',()=>{
 const html=cardSearchField('"><script>alert(1)</script>');
 assert.ok(!html.includes('<script>'));assert.ok(html.includes('&lt;script&gt;'));
});
