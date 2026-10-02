import test from 'node:test';import assert from 'node:assert/strict';
import {libraryQuiz,libraryQuizNote} from '../dist/library-quiz.js';
import {partyUI} from '../dist/party-ui.js';
import {validateCards} from '../dist/party-content.js';
const deck={id:'d',name:'Review',cards:[{id:'a',text:'Red planet?',back:'Mars'},{id:'b',text:'One side'},{id:'c',text:'Question',back:'x'.repeat(121)},{id:'d',text:'x'.repeat(301),back:'Yes'},{id:'e',text:'Nothing?',back:'!!!'}]};
const snapshot=mode=>({host:true,round:0,players:[],party:{mode,stage:'lobby',teams:{},totals:{},selfId:'host'}});
test('two-sided cards adapt to 1-point Trivia without mutating library content',()=>{
 const original=structuredClone(deck),source=libraryQuiz(deck);assert.deepEqual(source.cards,[{prompt:'Red planet?',answers:[{text:'Mars',aliases:[],points:1}],category:'Review',points:1}]);assert.deepEqual(validateCards(source.cards,'quiz'),source.cards);assert.deepEqual(deck,original);assert.equal(source.missingBack,1);assert.equal(source.tooLong,2);assert.equal(source.invalid,1);assert.match(libraryQuizNote(source),/1 usable question ·/);
});
test('empty, whitespace and boundary answers are handled without inventing or truncating text',()=>{
 const source=libraryQuiz({id:'x',name:'n'.repeat(100),cards:[{id:'a',text:'Q'.repeat(300),back:'A'.repeat(120)},{id:'b',text:'Blank',back:'  '}]});assert.equal(source.cards.length,1);assert.equal(source.cards[0].prompt.length,300);assert.equal(source.cards[0].answers[0].text.length,120);assert.equal(source.cards[0].category.length,60);assert.equal(source.missingBack,1);assert.equal(libraryQuiz({id:'e',name:'Empty',cards:[]}).cards.length,0);
});
test('Trivia source picker separates game packs and library decks without leaking answers',()=>{
 const source=libraryQuiz({...deck,name:'<Library>'}),pack={id:'d',name:'Rich Quiz',kind:'quiz',cards:[]};const html=partyUI(snapshot('trivia'),[pack],[],[source]);assert.match(html,/pack:d/);assert.match(html,/library:d/);assert.match(html,/Two-sided library decks/);assert.ok(html.includes('&lt;Library&gt;'));assert.ok(!html.includes('Mars'));assert.match(html,/Only up to 25/);
});
test('other game setup flows retain their original pack IDs and do not include library quiz decks',()=>{
 const pack={id:'d',name:'Rich Quiz',kind:'quiz',cards:[]};for(const mode of ['team-trivia','jeopardy']){const html=partyUI(snapshot(mode),[pack],[],[libraryQuiz(deck)]);assert.match(html,/value="d"/);assert.ok(!html.includes('library:d'));}const html=partyUI(snapshot('trivia'),[],[],[libraryQuiz({id:'old',name:'One side',cards:[{id:'1',text:'Prompt'}]})]);assert.match(html,/value="library:old" disabled/);
});
