import {parseBackup,validateLibrary,restoreBackup,MAX_BACKUP_BYTES,NewerFormatError} from './backup.js';
import {decodePacks} from './game-pack-storage.js';
import {decodePreferences,type Preferences} from './refinements.js';
import {emptyLibrary,type Library} from './model.js';
import type {GamePack} from './party-content.js';
export interface CompleteData {library:Library;packs:GamePack[];preferences:Preferences}
export interface CompletePreview {library:Library;packs?:GamePack[];preferences?:Preferences;source:string}
export function validateComplete(value:unknown):CompleteData {
 if(!value||typeof value!=='object')throw new Error('Invalid complete backup.');
 const v=value as Record<string,unknown>;
 if(!v.preferences||typeof v.preferences!=='object'||Array.isArray(v.preferences))throw new Error('Invalid saved settings.');
 return {library:validateLibrary(v.library),packs:decodePacks(v.packs),preferences:decodePreferences(v.preferences)};
}
export function exportComplete(value:CompleteData,now=new Date()):string {
 const text=JSON.stringify({format:'deckforge-complete-backup',version:1,exportedAt:now.toISOString(),...validateComplete(value)},null,2);if(new TextEncoder().encode(text).byteLength>MAX_BACKUP_BYTES)throw new Error('The complete backup exceeds 20 MB. Export individual collections instead.');return text;
}
export function parseComplete(text:string):CompletePreview {
 if(new TextEncoder().encode(text).byteLength>MAX_BACKUP_BYTES)throw new Error('Choose a backup smaller than 20 MB.');
 let v:unknown;try{v=JSON.parse(text);}catch{throw new Error('This file is not a valid JSON backup. Nothing was changed.');}
 if(v&&typeof v==='object'){
  const data=v as Record<string,unknown>;
  if(data.format==='deckforge-complete-backup'){
   if(data.version!==1)throw new NewerFormatError('This complete backup needs a newer update. Nothing was changed.');
   return {...validateComplete(data),source:'Complete DeckForge backup'};
  }
  if(data.format==='deckforge-game-decks'){
   if(data.version!==1)throw new NewerFormatError('This Game Decks backup needs a newer update.');
   return {library:emptyLibrary(),packs:decodePacks(data.packs),source:'Game Decks backup · regular decks and settings are not included'};
  }
 }
 return parseBackup(text);
}
export function restoreComplete(current:CompleteData,incoming:CompletePreview,mode:'add'|'replace',id=()=>crypto.randomUUID()):CompleteData {
 const packs=incoming.packs?.map(p=>({...structuredClone(p),id:id()}));
 return validateComplete({library:incoming.source.startsWith('Game Decks backup')?current.library:restoreBackup(current.library,incoming.library,mode,id),packs:packs===undefined?current.packs:mode==='add'?[...current.packs,...packs]:packs,preferences:mode==='replace'&&incoming.preferences?incoming.preferences:current.preferences});
}
// Two existing databases cannot share one IndexedDB transaction. Persist the
// original snapshot first, then commit the core state only after packs succeed.
export interface RestoreStore {
 pending():Promise<CompleteData|null>;
 begin(before:CompleteData):Promise<void>;
 packs(value:GamePack[]):Promise<void>;
 commit(value:CompleteData):Promise<void>;
}
export async function commitComplete(store:RestoreStore,before:CompleteData,after:CompleteData):Promise<void>{
 const validBefore=validateComplete(before),validAfter=validateComplete(after);
 if(await store.pending())throw new Error('An interrupted restore needs recovery before another import.');
 await store.begin(validBefore);
 try{await store.packs(validAfter.packs);await store.commit(validAfter);}
 catch(error){try{await store.packs(validBefore.packs);await store.commit(validBefore);}catch{throw new Error('Restore was interrupted. Reopen the app to recover the original data. The recovery snapshot is retained.');}throw error;}
}
export async function recoverInterrupted(store:RestoreStore):Promise<boolean>{
 const pending=await store.pending();if(!pending)return false;
 const valid=validateComplete(pending);await store.packs(valid.packs);await store.commit(valid);return true;
}
