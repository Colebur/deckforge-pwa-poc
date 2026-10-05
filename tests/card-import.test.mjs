import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareCardImport,mappedCards,delimitedRows} from '../dist/card-import.js';
import {reviewCardItems,reviewImport,importItems} from '../dist/editor-tools.js';
import {encodeState,decodeState} from '../dist/backup.js';
test('plain paste and TXT retain one-card-per-line cleanup, tabs in TXT remain literal',()=>{
  for(const format of ['paste','txt'])assert.deepEqual(mappedCards(prepareCardImport('1. Apple\r\n\n• Banana\n  Cherry  ',format)),{items:[{text:'Apple'},{text:'Banana'},{text:'Cherry'}],problems:[]});
  assert.deepEqual(mappedCards(prepareCardImport('Front\tBack','txt')).items,[{text:'Front\tBack'}]);
  assert.deepEqual(mappedCards(prepareCardImport('"A quoted word"','paste')).items,[{text:'"A quoted word"'}]);
});
test('tab paste imports both sides and permits mixed one-sided rows and missing backs',()=>{
  const parsed=mappedCards(prepareCardImport('  Sun\t Star  \nMoon\t\n\t\nEarth','paste'));
  assert.deepEqual(parsed,{items:[{text:'Sun',back:'Star'},{text:'Moon'},{text:'Earth'}],problems:[]});
  assert.match(mappedCards(prepareCardImport('a\tb\tc','paste')).problems[0],/one or two columns/);
});
test('CSV detects Front/Back, Term/Definition and reversed Answer/Question columns',()=>{
  for(const header of ['Front,Back','Term,Definition','Question,Answer']){
    const table=prepareCardImport('\uFEFF'+header+'\r\n  Sun , Star \r\nMoon,\r\n,,','csv');
    assert.equal(table.mapping.header,true);assert.deepEqual(mappedCards(table),{items:[{text:'Sun',back:'Star'},{text:'Moon'}],problems:[]});
  }
  assert.deepEqual(mappedCards(prepareCardImport('Answer,Notes,Question\nStar,ignore,Sun','csv')).items,[{text:'Sun',back:'Star'}]);
});
test('CSV preserves quoted commas, escaped quotes, multiline fields and Unicode literally',()=>{
  const table=prepareCardImport('Front,Back\n"Hello, world","She said ""yes"""\n"two\nlines","définition 🦋"','csv');
  assert.deepEqual(mappedCards(table).items,[{text:'Hello, world',back:'She said "yes"'},{text:'two\nlines',back:'définition 🦋'}]);
});
test('CSV without obvious headers supports manual header and column mapping, including no back',()=>{
  const table=prepareCardImport('Answer text,Extra,Prompt text\nA,x,Q\nB,y,R','csv');
  assert.equal(table.mapping.header,false);
  assert.deepEqual(mappedCards(table,{front:2,back:0,header:true}).items,[{text:'Q',back:'A'},{text:'R',back:'B'}]);
  assert.deepEqual(mappedCards(table,{front:2,back:null,header:true}).items,[{text:'Q'},{text:'R'}]);
  assert.ok(mappedCards(table,{front:0,back:0,header:false}).problems.length);
  assert.ok(mappedCards(table,{front:10,back:null,header:false}).problems.length);
  assert.deepEqual(mappedCards(prepareCardImport('Sun\nMoon','csv')).items,[{text:'Sun'},{text:'Moon'}]);
});
test('malformed CSV, missing fronts and empty input block the shared import path without mutation',()=>{
  for(const input of ['Front,Back\n"unclosed','Front,Back\n"ok"bad,answer','Front,Back\n,answer','','Front,Back']){
    const parsed=mappedCards(prepareCardImport(input,'csv'));assert.ok(parsed.problems.length);
    const existing=[{text:'Keep',back:'Safe'}],before=structuredClone(existing);
    assert.throws(()=>importItems(reviewCardItems('d',parsed,existing),existing,false));assert.deepEqual(existing,before);
  }
  assert.throws(()=>delimitedRows('a"b,c',','));
});
test('duplicate skipping compares both sides and all formats use the same review/import pipeline',()=>{
  const existing=[{text:'Sun',back:'Star'}];
  const review=reviewImport('cards','d','Sun\tStar\nsun\tPlanet\nSun\t\nSun\tStar',existing);
  assert.equal(review.duplicates,2);
  assert.deepEqual(importItems(review,existing,true),[{text:'sun',back:'Planet'},{text:'Sun'}]);
  const csv=reviewCardItems('d',mappedCards(prepareCardImport('Front,Back\nSun,Star','csv')),existing);
  assert.equal(csv.duplicates,1);assert.deepEqual(importItems(csv,existing,true),[]);
});
test('large two-sided batches retain order and survive existing state persistence',()=>{
  const input='Front,Back\n'+Array.from({length:2000},(_,i)=>`Question ${i},Answer ${i}`).join('\n');
  const review=reviewCardItems('d',mappedCards(prepareCardImport(input,'csv')),[]);
  const cards=importItems(review,[],false).map((card,i)=>({...card,id:String(i)}));
  const library={decks:[{id:'d',name:'Study',deckContext:'work',compatibleModes:['flashcards'],activities:[],cards}],duration:90,probe:null};
  assert.deepEqual(decodeState(encodeState(library)).decks[0].cards,cards);assert.equal(cards[1999].back,'Answer 1999');
});
