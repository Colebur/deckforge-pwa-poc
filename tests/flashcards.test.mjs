import test from 'node:test';import assert from 'node:assert/strict';
import {FlashcardSession} from '../dist/flashcards.js';
import {flashcardMarkup} from '../dist/flashcard-ui.js';
import {encodeState,decodeState,exportBackup,parseBackup,restoreBackup,validateLibrary} from '../dist/backup.js';
import {MODES,defaultModes,modeDecks} from '../dist/modes.js';
import {copyDeck} from '../dist/editor-tools.js';
import {cardDisplay} from '../dist/ui.js';
const cards=[{id:'1',text:'Antecedent',back:'An event before a behavior'},{id:'2',text:'Consequence',back:'An event after a behavior'},{id:'3',text:'One-sided'}];
const deck={id:'d',name:'Study',deckContext:'work',compatibleModes:['flashcards'],activities:[],cards};
const library={decks:[deck],duration:0,probe:null};
test('both study directions reset to the chosen first side on navigation',()=>{
 for(const direction of ['front','back']){const s=new FlashcardSession(cards,direction,'Study');assert.equal(s.side,direction);s.flip();assert.notEqual(s.side,direction);s.move(1);assert.equal(s.index,1);assert.equal(s.side,direction);s.move(-1);assert.equal(s.index,0);s.move(-1);assert.equal(s.index,0);s.move(1);s.move(1);s.move(1);assert.equal(s.index,2);}
});
test('missing backs are explicit, safe in either direction, and never invented',()=>{
 const s=new FlashcardSession([cards[2]],'back','Study');assert.equal(s.text,'No back added');assert.equal(s.missingBack,true);s.flip();assert.equal(s.text,'One-sided');assert.equal(s.missingBack,false);assert.equal(cards[2].back,undefined);assert.throws(()=>new FlashcardSession([],'front','Empty'));
});
test('shuffle keeps every card and both sides, resets review, never reorders the deck',()=>{
 const original=structuredClone(cards),s=new FlashcardSession(cards,'front','Study');s.move(1);s.flip();s.shuffle(()=>0);assert.equal(s.index,0);assert.equal(s.flipped,false);const found=[];for(let i=0;i<s.count;i++){found.push(s.text);s.move(1);}assert.deepEqual([...found].sort(),cards.map(c=>c.text).sort());assert.deepEqual(cards,original);assert.notEqual(found[0],cards[0].text);
});
test('front/back survive state, backup, additive restore and deck duplication',()=>{
 assert.deepEqual(decodeState(encodeState(library)),library);assert.deepEqual(parseBackup(exportBackup(library)).library,library);
 let n=0;const restored=restoreBackup(library,library,'add',()=>String(++n));assert.equal(restored.decks[1].cards[0].back,cards[0].back);const copy=copyDeck(deck,[],()=>String(++n));assert.equal(copy.cards[0].back,cards[0].back);assert.notEqual(copy.cards[0].id,cards[0].id);
});
test('v6 libraries retain cards, Activities and explicit compatibility without new assignments',()=>{
 const old={...library,decks:[{...deck,compatibleModes:['prompts'],activities:[{id:'a',text:'Show {card}',createdAt:'2026-01-01'}],cards:[cards[2]]}]};assert.deepEqual(decodeState({format:'deckforge-pwa-state',version:6,library:old}),old);assert.ok(!defaultModes('regular').includes('flashcards'));assert.throws(()=>validateLibrary({...library,decks:[{...deck,cards:[{...cards[0],back:42}]}]}));
});
test('Flashcards is Work-only, opt-in, with Show All escape hatch',()=>{
 assert.equal(MODES.find(m=>m.id==='flashcards').play,false);const other={...deck,id:'old',compatibleModes:['prompts']};assert.deepEqual(modeDecks([other,deck],'flashcards','work').visible.map(d=>d.id),['d']);assert.equal(modeDecks([other,deck],'flashcards','work',true).visible.length,2);
});
test('review UI shows one escaped side, correct progress and boundary controls',()=>{
 const s=new FlashcardSession([{id:'a',text:'<term>',back:'Secret back'}],'front','Study');const front=flashcardMarkup(s);assert.ok(front.includes('&lt;term&gt;'));assert.ok(!front.includes('Secret back'));assert.ok(front.includes('1 / 1'));assert.ok(front.includes('study-prev" disabled'));assert.ok(front.includes('study-next" disabled'));s.flip();assert.ok(flashcardMarkup(s).includes('Secret back'));assert.equal(cardDisplay(cards[0].text),'Antecedent');
});
