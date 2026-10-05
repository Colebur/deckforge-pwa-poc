// Catalog and deck organization are independent of screens, storage and browser APIs.
import {alphabeticalDecks} from './model.js';
export type DeckContext='play'|'work'|'both';
export type LaunchContext='play'|'work';
export const MODES=[
  {id:'lookup',title:'Jenga',detail:'Use numbered 54-block prompts with optional Activities.',icon:'#',format:'regular',play:false},
  {id:'prompts',title:'Prompt Picker',detail:'Draw from one or more decks, with optional Activities.',icon:'✦',format:'regular',play:true},
  {id:'flashcards',title:'Flashcards',detail:'Flip through cards to study and review both sides.',icon:'▤',format:'regular',play:false},
  {id:'catchphrase',title:'Catchphrase',detail:'Give clues. Guess the word. Pass the phone.',icon:'◷',format:'regular',play:true},
  {id:'headbands',title:'Heads Up',detail:'Hold it at your forehead. Tilt to answer.',icon:'▱',format:'regular',play:true},
  {id:'taboo',title:'Taboo',detail:'Describe the word. Avoid the forbidden words.',icon:'◇',format:'taboo',play:true},
] as const;
export type ModeId=typeof MODES[number]['id'];
export interface DeckMetadata {deckContext:DeckContext;compatibleModes:string[]}
export const defaultModes=(format:'regular'|'taboo'):string[]=>MODES.filter(m=>m.format===format&&m.id!=='flashcards').map(m=>m.id);
export function metadata(context:unknown,modes:unknown,format:'regular'|'taboo'):DeckMetadata {
  const deckContext=context===undefined?'both':context;
  if(deckContext!=='play'&&deckContext!=='work'&&deckContext!=='both')throw new Error('Invalid deck context. Nothing was changed.');
  const compatibleModes=modes===undefined?defaultModes(format):modes;
  // Preserve unknown future mode IDs through edit/export; card-format validation is separate.
  if(!Array.isArray(compatibleModes)||!compatibleModes.every(m=>typeof m==='string'&&/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(m))||new Set(compatibleModes).size!==compatibleModes.length)throw new Error('Invalid deck compatibility. Nothing was changed.');
  return {deckContext,compatibleModes:[...compatibleModes]};
}
export function modeDecks<T extends DeckMetadata & {name:string;cards:readonly unknown[]}>(decks:readonly T[],mode:ModeId,context:LaunchContext,all=false):{compatible:T[];other:T[];visible:T[]} {
  const ranked=alphabeticalDecks(decks.filter(d=>d.cards.length && (mode!=='lookup'||d.cards.length===54))).sort((a,b)=>rank(a.deckContext,context)-rank(b.deckContext,context));
  const compatible=ranked.filter(d=>d.compatibleModes.includes(mode)),other=ranked.filter(d=>!d.compatibleModes.includes(mode));
  return {compatible,other,visible:all?[...compatible,...other]:compatible};
}
function rank(value:DeckContext,context:LaunchContext):number{return value===context?0:value==='both'?1:2;}
export const sectionRoot=(section:'play'|'work'|'link'|'decks'):string=>section==='link'?'link':section==='decks'?'library':'home';
