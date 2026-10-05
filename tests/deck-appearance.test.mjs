import test from 'node:test';
import assert from 'node:assert/strict';
import {deckEmoji} from '../dist/deck-appearance.js';
import {encodeState,decodeState,exportBackup,parseBackup,restoreBackup} from '../dist/backup.js';
import {copyDeck} from '../dist/editor-tools.js';
import {deckOptions} from '../dist/ui.js';
const deck={id:'d',name:'Movies',cards:[{id:'c',text:'Alien'}],activities:[],deckContext:'both',compatibleModes:['prompts']};
test('one complete emoji supports joined families, skin tones, flags and keycaps',()=>{
 for(const emoji of ['🎬','👩🏽‍🏫','🏳️‍🌈','🇺🇸','1️⃣','❤️','👨‍👩‍👧‍👦'])assert.equal(deckEmoji(emoji),emoji);
 assert.equal(deckEmoji(' 🎬 '),'🎬');assert.equal(deckEmoji(''),undefined);assert.equal(deckEmoji(undefined),undefined);
 for(const bad of ['hello','🎬🎵','<script>','🎬 hello',42])assert.throws(()=>deckEmoji(bad));
});
test('legacy decks stay exact; emoji survives storage, backup and copy restore',()=>{
 const legacy={decks:[deck],duration:60,probe:null};assert.deepEqual(decodeState(encodeState(legacy)),legacy);
 const value={...legacy,decks:[{...deck,emoji:'👩🏽‍🏫'}],tabooDecks:[{id:'t',name:'Taboo',deckContext:'both',emoji:'🗣️',cards:[],compatibleModes:['taboo']}]};
 assert.deepEqual(decodeState(encodeState(value)),value);assert.deepEqual(parseBackup(exportBackup(value)).library,value);
 assert.equal(restoreBackup(legacy,value,'add',()=>Math.random().toString()).decks[1].emoji,'👩🏽‍🏫');
 assert.equal(copyDeck(value.decks[0],[],()=>Math.random().toString()).emoji,'👩🏽‍🏫');
});
test('picker presents emoji and preserves selected ID and escaped name',()=>{
 const selected={...deck,emoji:'🎬',name:'Movies & TV'};
 assert.match(deckOptions({compatible:[selected],other:[]},'d','play',false),/🎬 Movies &amp; TV/);
 assert.match(deckOptions({compatible:[selected],other:[]},'d','play',false),/value="d" selected/);
});
