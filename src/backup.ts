import {validateActivities} from './activities.js';
import { type Library } from './model.js';
import {validateTabooCard} from './taboo.js';
import {teamNames, TIMER_CHOICES} from './games.js';

export class NewerFormatError extends Error {}
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const nonblank = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
export function validateLibrary(value: unknown): Library {
  if (!record(value) || !Array.isArray(value.decks) || typeof value.duration !== 'number' ||
      !Number.isFinite(value.duration) || (value.duration !== 0 && value.duration < 5) || value.duration > 300 ||
      !(value.probe === null || typeof value.probe === 'string')) throw new Error('Invalid deck library. Nothing was changed.');
  const deckIDs = new Set<string>();
  const decks = value.decks.map(entry => {
    if (!record(entry) || !nonblank(entry.id) || !nonblank(entry.name) || !Array.isArray(entry.cards) || deckIDs.has(entry.id))
      throw new Error('Invalid or duplicate deck. Nothing was changed.');
    deckIDs.add(entry.id);
    const cardIDs = new Set<string>();
    const cards = entry.cards.map(card => {
      if (!record(card) || !nonblank(card.id) || !nonblank(card.text) || cardIDs.has(card.id))
        throw new Error('Invalid or duplicate card ID. Nothing was changed.');
      cardIDs.add(card.id);
      return {id: card.id, text: card.text};
    });
    return {id: entry.id, name: entry.name, cards, activities:validateActivities(entry.activities)};
  });
  const result: Library={decks, duration: value.duration, probe: value.probe};
  if(value.teams!==undefined){if(!Array.isArray(value.teams)||!value.teams.every(v=>typeof v==='string'))throw new Error('Invalid team settings.');result.teams=teamNames(value.teams);}
  if(value.headbandsDuration!==undefined){if(typeof value.headbandsDuration!=='number'||!TIMER_CHOICES.includes(value.headbandsDuration))throw new Error('Invalid Headbands timer.');result.headbandsDuration=value.headbandsDuration;}
  if(value.tabooDecks!==undefined){
    if(!Array.isArray(value.tabooDecks))throw new Error('Invalid Taboo collection.');
    const ids=new Set<string>();
    result.tabooDecks=value.tabooDecks.map(d=>{
      if(!record(d)||!nonblank(d.id)||!nonblank(d.name)||!Array.isArray(d.cards)||ids.has(d.id))throw new Error('Invalid or duplicate Taboo deck.');
      ids.add(d.id);const cards=new Set<string>();
      return {id:d.id,name:d.name,cards:d.cards.map(c=>{
        if(!record(c)||!nonblank(c.id)||cards.has(c.id))throw new Error('Invalid or duplicate Taboo card.');
        cards.add(c.id);return {id:c.id,...validateTabooCard(c.text,c.forbidden)};
      })};
    });
  }
  if(value.tabooTeams!==undefined){if(!Array.isArray(value.tabooTeams)||!value.tabooTeams.every(v=>typeof v==='string'))throw new Error('Invalid Taboo teams.');result.tabooTeams=teamNames(value.tabooTeams);}
  if(value.tabooDuration!==undefined){if(typeof value.tabooDuration!=='number'||!TIMER_CHOICES.includes(value.tabooDuration))throw new Error('Invalid Taboo timer.');result.tabooDuration=value.tabooDuration;}
  return result;
}
// Keep the original database/store names. Old POC libraries upgrade without clearing data.
export function decodeState(value: unknown): Library {
  if (record(value) && value.format === 'deckforge-pwa-state') {
    if (value.version !== 1 && value.version !== 2 && value.version !== 3 && value.version !== 4) throw new NewerFormatError('This library needs a newer DeckForge update. Your saved data was not changed.');
    return validateLibrary(value.library);
  }
  return validateLibrary(value);
}
export function encodeState(library: Library): object {
  return {format: 'deckforge-pwa-state', version: 4, library: validateLibrary(library)};
}
export interface BackupPreview { library: Library; source: 'DeckForge PWA' | 'Original PWA backup' | 'Native DeckForge backup' }
export function exportBackup(library: Library, now = new Date()): string {
  return JSON.stringify({format: 'deckforge-pwa-backup', version: 4, exportedAt: now.toISOString(), library: validateLibrary(library)}, null, 2);
}
export function parseBackup(text: string): BackupPreview {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) throw new Error('Choose a backup smaller than 20 MB.');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('This file is not a valid JSON backup. Nothing was changed.'); }
  if (!record(value)) throw new Error('This is not a DeckForge backup.');
  if (value.format === 'deckforge-pwa-backup') {
    if (value.version !== 1 && value.version !== 2 && value.version !== 3 && value.version !== 4) throw new NewerFormatError('This backup needs a newer DeckForge update. Nothing was changed.');
    return {library: validateLibrary(value.library), source: 'DeckForge PWA'};
  }
  if (value.format === 'deckforge-pwa-poc-v1') return {library: validateLibrary(value), source: 'Original PWA backup'};
  // Read exported native files only; this never accesses or changes the native app.
  if (!('format' in value) && value.version === 1 && Array.isArray(value.decks)) {
    const decks = value.decks.map(entry => {
      if (!record(entry) || !nonblank(entry.name) || !Array.isArray(entry.cards) || !entry.cards.every(nonblank))
        throw new Error('This native backup contains an invalid deck or card. Nothing was changed.');
      return {id: crypto.randomUUID(), name: entry.name, activities:[], cards: entry.cards.map(text => ({id: crypto.randomUUID(), text}))};
    });
    return {library: {decks, duration: 90, probe: null}, source: 'Native DeckForge backup'};
  }
  throw new Error('Unrecognized backup format. Nothing was changed.');
}
export function restoreBackup(current: Library, incoming: Library, mode: 'add' | 'replace', id = () => crypto.randomUUID()): Library {
  const valid = validateLibrary(incoming);
  // Fresh IDs keep repeated imports separate. Text, duplicate prompts and order stay exact.
  const copies = valid.decks.map(d => ({id: id(), name: d.name, activities:d.activities.map(activity=>({...activity,id:id()})), cards: d.cards.map(c => ({id: id(), text: c.text}))}));
  const tabooCopies=(valid.tabooDecks??[]).map(d=>({id:id(),name:d.name,cards:d.cards.map(c=>({id:id(),text:c.text,forbidden:[...c.forbidden]}))}));
  return validateLibrary(mode === 'replace' ? {...valid, decks: copies, tabooDecks:tabooCopies} : {...validateLibrary(current), decks: [...current.decks, ...copies], tabooDecks:[...(current.tabooDecks??[]),...tabooCopies]});
}
