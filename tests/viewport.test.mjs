import test from 'node:test';
import assert from 'node:assert/strict';
import {refreshViewport,mainTabsVisible} from '../dist/viewport.js';
test('tabs appear only on section roots, never game setup, deck editing or Link details',()=>{
 for(const root of ['home','library','link'])assert.equal(mainTabsVisible(root),true);
 for(const page of ['lookup','prompts','flashcards','catchphrase','headbands','taboo','editor','taboo-library','taboo-editor','game-decks','settings','backups','lab'])assert.equal(mainTabsVisible(page),false);
 assert.equal(mainTabsVisible('link',true),false);
});
test('rotation bursts write one settled height, skip identical writes and ignore focused keyboards',()=>{
 const old={window:globalThis.window,document:globalThis.document},listeners={},jobs=new Map(),writes=[];let id=0;
 globalThis.window={innerHeight:852,addEventListener:(name,fn)=>listeners[name]=fn,setTimeout:fn=>{jobs.set(++id,fn);return id;},clearTimeout:key=>jobs.delete(key)};
 globalThis.document={activeElement:{matches:()=>false},documentElement:{style:{setProperty:(key,value)=>writes.push(value)}},addEventListener:(name,fn)=>listeners[name]=fn};
 const settle=()=>{for(const [key,fn] of jobs){jobs.delete(key);fn();}};
 try {
  refreshViewport();assert.deepEqual(writes,['852px']);
  for(const height of [500,393,700,820,852]){window.innerHeight=height;listeners.resize();}
  assert.equal(jobs.size,1);settle();assert.deepEqual(writes,['852px']);
  window.innerHeight=393;listeners.resize();settle();assert.deepEqual(writes,['852px','393px']);
  document.activeElement.matches=()=>true;window.innerHeight=200;listeners.resize();settle();assert.equal(writes.length,2);
  document.activeElement.matches=()=>false;window.innerHeight=852;listeners.pageshow();settle();assert.equal(writes.at(-1),'852px');
 }finally{for(const [key,value] of Object.entries(old))if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
});
