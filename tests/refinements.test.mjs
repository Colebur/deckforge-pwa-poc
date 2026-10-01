import test from 'node:test';
import assert from 'node:assert/strict';
import {filterLibrary,defaultPreferences,decodePreferences,backupDue,backupOverlap,MONTH,gameShortcut} from '../dist/refinements.js';
const deck=(id,name,context,modes)=>({id,name,deckContext:context,compatibleModes:modes,cards:[],activities:[]});
const decks=[deck('z','Zulu','both',['headbands']),deck('b','Beta','work',['lookup','prompts']),deck('a','alpha','play',[]),deck('c','ALPHA TWO','both',['prompts'])];
const filter={search:'',context:'all',mode:'all'};
test('library search combines exact context and intended compatibility while preserving all content and order',()=>{
 const before=structuredClone(decks);
 assert.deepEqual(filterLibrary(decks,filter).map(d=>d.id),['a','c','b','z']);
 assert.deepEqual(filterLibrary(decks,{...filter,search:' ALpha '}).map(d=>d.id),['a','c']);
 assert.deepEqual(filterLibrary(decks,{search:'a',context:'work',mode:'prompts'}).map(d=>d.id),['b']);
 assert.deepEqual(filterLibrary(decks,{...filter,mode:'unassigned'}).map(d=>d.id),['a']);
 assert.deepEqual(filterLibrary(decks,{...filter,context:'both'}).map(d=>d.id),['c','z']);
 assert.deepEqual(filterLibrary(decks,{...filter,search:'no result'}),[]);
 assert.equal(filterLibrary(decks,filter).length,4);assert.deepEqual(decks,before);
});
test('local preferences default safely, reject malformed values and round-trip valid timestamps',()=>{
 for(const value of [undefined,null,[],42,{largeText:'yes',lastExport:'broken'}])assert.deepEqual(decodePreferences(value),defaultPreferences());
 const p={...defaultPreferences(),largeText:true,backupReminders:true,lastExport:'2026-10-01T00:00:00.000Z'};
 assert.deepEqual(decodePreferences(JSON.parse(JSON.stringify(p))),p);
});
test('monthly reminders are opt-in, use confirmed backups rather than export requests, and honor snooze',()=>{
 const start=Date.parse('2026-10-01T00:00:00.000Z');
 const p={...defaultPreferences(),backupReminders:true,reminderSince:new Date(start).toISOString()};
 assert.equal(backupDue(p,start+MONTH-1),false);assert.equal(backupDue(p,start+MONTH),true);
 assert.equal(backupDue({...p,backupReminders:false},start+MONTH*2),false);
 assert.equal(backupDue({...p,lastExport:new Date(start+MONTH).toISOString()},start+MONTH),true);
 assert.equal(backupDue({...p,lastConfirmedBackup:new Date(start+MONTH).toISOString()},start+MONTH),false);
 const snoozedUntil=new Date(start+MONTH+1000).toISOString();
 assert.equal(backupDue({...p,snoozedUntil},start+MONTH),false);assert.equal(backupDue({...p,snoozedUntil},start+MONTH+1000),true);
 assert.equal(backupDue({...p,reminderSince:null},start+MONTH),false);
});
test('restore overlap distinguishes regular and Taboo deck formats and never mutates libraries',()=>{
 const current={decks:[deck('a','alpha','play',[])],tabooDecks:[deck('t','Taboo','both',[])],duration:90,probe:null};
 const incoming={...current,decks:[deck('b',' ALPHA ','work',[]),deck('c','Taboo','work',[])],tabooDecks:[deck('x','TABOO','both',[])]};
 const before=structuredClone([current,incoming]);assert.equal(backupOverlap(current,incoming),2);assert.deepEqual([current,incoming],before);
});
test('keyboard intents stay contextual and never start or end rounds',()=>{
 assert.equal(gameShortcut('lookup','ArrowRight'),'lookup-next');assert.equal(gameShortcut('lookup','r'),'lookup-random');
 assert.equal(gameShortcut('prompts',' '),'prompt-draw');assert.equal(gameShortcut('catchphrase',' ','running'),'pause');
 assert.equal(gameShortcut('headbands',' ','paused'),'resume');assert.equal(gameShortcut('headbands','ArrowDown','running'),'head-correct');
 assert.equal(gameShortcut('taboo','v','running'),'taboo-violation');assert.equal(gameShortcut('taboo','ArrowLeft','running'),'taboo-pass');
 for(const phase of [undefined,'ended','paused'])assert.equal(gameShortcut('catchphrase','ArrowRight',phase),undefined);
 for(const route of ['library','editor','home'])assert.equal(gameShortcut(route,' '),undefined);
 for(const route of ['catchphrase','headbands','taboo'])assert.equal(gameShortcut(route,'Escape','running'),undefined);
});
