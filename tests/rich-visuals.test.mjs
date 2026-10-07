import test from 'node:test';
import assert from 'node:assert/strict';
import {accentMetadata,DECK_ACCENTS} from '../dist/rich-visuals.js';
import {encodeState,decodeState,exportBackup,parseBackup} from '../dist/backup.js';
import {copyDeck} from '../dist/editor-tools.js';
const library={decks:[{id:'d',name:'Feelings',cards:[{id:'c',text:'Happy'}],activities:[],deckContext:'both',compatibleModes:['prompts']}],duration:90,probe:null};
test('optional colors preserve old decks; unknown colors safely fall back',()=>{
 assert.equal(decodeState(encodeState(library)).decks[0].accentColor,undefined);
 assert.deepEqual(accentMetadata('unknown'),{});
 for(const [id] of DECK_ACCENTS)assert.deepEqual(accentMetadata(id),{accentColor:id});
});
test('color persists through reload, backup and independent duplicate; clearing is safe',()=>{
 const data=structuredClone(library);data.decks[0].accentColor='teal';
 assert.equal(decodeState(encodeState(data)).decks[0].accentColor,'teal');
 assert.equal(parseBackup(exportBackup(data)).library.decks[0].accentColor,'teal');
 let n=0;const copy=copyDeck(data.decks[0],[],()=>String(++n));assert.equal(copy.accentColor,'teal');copy.accentColor='red';assert.equal(data.decks[0].accentColor,'teal');
 delete data.decks[0].accentColor;assert.equal(decodeState(encodeState(data)).decks[0].accentColor,undefined);
});
import {IdleScheduler} from '../dist/idle-motion.js';
import {richCardFrames} from '../dist/motion.js';
test('idle scheduler replaces a single timer and stops on teardown',()=>{
 const pending=new Map();let id=0,calls=0;
 const idle=new IdleScheduler(()=>calls++,fn=>{pending.set(++id,fn);return id;},key=>pending.delete(key),()=>0);
 idle.start();idle.start();assert.equal(pending.size,1);
 const [key,fn]=[...pending][0];pending.delete(key);fn();assert.equal(calls,1);assert.equal(pending.size,1);
 idle.stop();assert.equal(pending.size,0);
});
test('rich mode plans keep reduced motion empty, preserve flips and distinguish tilt directions',()=>{
 for(const mode of ['headbands','catchphrase','taboo','lookup','prompts'])assert.deepEqual(richCardFrames('next',mode,true),{enter:[],exit:[],duration:0});
 assert.notDeepEqual(richCardFrames('correct','headbands'),richCardFrames('pass','headbands'));
 assert.equal(richCardFrames('next','catchphrase').duration,460);
 assert.match(richCardFrames('flip','flashcards').exit.at(-1).transform,/rotateY/);
});
import {exportComplete,parseComplete,restoreComplete} from '../dist/complete-backup.js';
import {defaultPreferences} from '../dist/refinements.js';
test('complete backup/restore retains visual metadata without altering source IDs',()=>{
 const original=structuredClone(library);original.decks[0].accentColor='pink';
 const data={library:original,packs:[],preferences:defaultPreferences()};
 const parsed=parseComplete(exportComplete(data));assert.equal(parsed.library.decks[0].accentColor,'pink');
 const restored=restoreComplete(data,parsed,'add');assert.equal(restored.library.decks[1].accentColor,'pink');assert.equal(original.decks[0].cards[0].id,'c');
 assert.equal(parseComplete(exportBackup(library)).library.decks[0].accentColor,undefined);
});

test('expressive profile lengthens card motion while preserving flip and reduced-motion guards',()=>{
 assert.equal(richCardFrames('draw','prompts').duration,560);
 assert.equal(richCardFrames('flip','flashcards').duration,520);
 assert.equal(richCardFrames('next','lookup').duration,480);
 for(const mode of ['headbands','taboo','catchphrase','lookup','prompts'])for(const kind of ['next','pass','draw','flip'])assert.deepEqual(richCardFrames(kind,mode,true),{enter:[],exit:[],duration:0});
 assert.match(richCardFrames('next','catchphrase').enter[0].transform,/100px/);
});
