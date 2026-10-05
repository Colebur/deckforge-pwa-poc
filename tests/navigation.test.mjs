import test from 'node:test';
import assert from 'node:assert/strict';
import {randomPrompt} from '../dist/model.js';
import {MODES,metadata,modeDecks,sectionRoot} from '../dist/modes.js';
import {decodeState,encodeState,exportBackup,parseBackup,restoreBackup} from '../dist/backup.js';
const old={decks:[{id:'d',name:'Old',cards:[{id:'c',text:'Unchanged'}],activities:[{id:'a',text:'Say {card}',createdAt:'2026-09-30T00:00:00.000Z'}]}],duration:90,probe:'keep'};
test('all legacy formats add conservative metadata without changing content or mutating input',()=>{
 for(const version of [1,2,3,4]){const upgraded=decodeState({format:'deckforge-pwa-state',version,library:old});assert.deepEqual(upgraded.decks[0],{...old.decks[0],...metadata(undefined,['prompts','catchphrase','headbands'],'regular')});assert.deepEqual(upgraded.decks[0].cards,old.decks[0].cards);assert.deepEqual(upgraded.decks[0].activities,old.decks[0].activities);}
 assert.equal(old.decks[0].deckContext,undefined);
 const native=parseBackup(JSON.stringify({version:1,decks:[{name:'Native',cards:['A']}]})).library.decks[0];assert.equal(native.deckContext,'both');assert.ok(!native.compatibleModes.includes('lookup'));
});
test('metadata survives save, export and both restore strategies including unknown future modes and empty assignment',()=>{
 for(const context of ['play','work','both'])for(const modes of [[],['lookup','headbands','futureMode']]){
 const library={...old,decks:[{...old.decks[0],deckContext:context,compatibleModes:modes}]};assert.deepEqual(decodeState(encodeState(library)),library);assert.deepEqual(parseBackup(exportBackup(library)).library,library);
 for(const strategy of ['add','replace']){const d=restoreBackup(library,library,strategy).decks.at(-1);assert.equal(d.deckContext,context);assert.deepEqual(d.compatibleModes,modes);assert.deepEqual(d.cards.map(c=>c.text),['Unchanged']);}
 }
 for(const args of [['invalid',[], 'regular'],['play','lookup','regular'],['work',['lookup','lookup'],'regular']])assert.throws(()=>metadata(...args));
});
const deck=(name,context,modes=['catchphrase'])=>({id:name,name,deckContext:context,compatibleModes:modes,cards:[{id:name,text:name}],activities:[]});
test('context ranks within compatibility groups, alphabetically within context, without sorting saved cards or library',()=>{
 const decks=[deck('Zulu','play'),deck('Bravo','work'),deck('Alpha','play'),deck('Both','both'),deck('Excluded','play',[]),{...deck('Empty','play'),cards:[]}];const before=structuredClone(decks);
 assert.deepEqual(modeDecks(decks,'catchphrase','play').visible.map(d=>d.name),['Alpha','Zulu','Both','Bravo']);assert.deepEqual(modeDecks(decks,'catchphrase','work').visible.map(d=>d.name),['Bravo','Both','Alpha','Zulu']);assert.deepEqual(modeDecks(decks,'catchphrase','play',true).visible.map(d=>d.name),['Alpha','Zulu','Both','Bravo','Excluded']);assert.deepEqual(decks,before);
 assert.deepEqual(modeDecks(decks,'headbands','work').visible,[]);assert.equal(modeDecks(decks,'headbands','work',true).visible.length,5);
});
test('Play excludes lookup; Work uses the same ordered catalog with lookup first; tab roots are existing screens',()=>{
 assert.equal(MODES[0].id,'lookup');assert.equal(MODES.find(m=>m.id==='prompts').play,true);assert.ok(!MODES.filter(m=>m.play).some(m=>m.id==='lookup'));assert.equal(new Set(MODES.map(m=>m.id)).size,6);assert.equal(sectionRoot('decks'),'library');assert.equal(sectionRoot('work'),'home');assert.equal(sectionRoot('play'),'home');
});

test('Prompt Picker combined draws use exactly the visible compatible or expanded pool',()=>{
 const decks=[deck('Included','play',['prompts']),deck('Other','work',[])];
 assert.equal(randomPrompt(modeDecks(decks,'prompts','play').visible,null,()=>.999).deck.name,'Included');
 assert.equal(randomPrompt(modeDecks(decks,'prompts','play',true).visible,null,()=>.999).deck.name,'Other');
 assert.equal(randomPrompt(modeDecks(decks,'prompts','play').visible,'Other'),undefined);
});
test('legacy and explicit Taboo metadata retain the separate rich card format through backups',()=>{
 const taboo={id:'t',name:'Taboo',cards:[{id:'c',text:'Cat',forbidden:['pet','fur','meow','animal','kitten']}]};
 const upgraded=decodeState({...old,tabooDecks:[taboo]});assert.deepEqual(upgraded.tabooDecks[0],{...taboo,deckContext:'both',compatibleModes:['taboo']});
 upgraded.tabooDecks[0].deckContext='work';upgraded.tabooDecks[0].compatibleModes=[];
 const restored=restoreBackup(upgraded,parseBackup(exportBackup(upgraded)).library,'replace');assert.equal(restored.tabooDecks[0].deckContext,'work');assert.deepEqual(restored.tabooDecks[0].compatibleModes,[]);assert.deepEqual(restored.tabooDecks[0].cards[0].forbidden,taboo.cards[0].forbidden);
 assert.equal(modeDecks(restored.tabooDecks,'taboo','work').visible.length,0);assert.equal(modeDecks(restored.tabooDecks,'taboo','work',true).visible.length,1);
});
