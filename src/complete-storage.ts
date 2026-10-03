import {beginComplete,finishComplete,pendingComplete,load,loadPreferences} from './storage.js';
import {loadPacks,savePacks} from './game-pack-storage.js';
import {commitComplete,recoverInterrupted,type CompleteData,type RestoreStore} from './complete-backup.js';
const store:RestoreStore={pending:pendingComplete,begin:beginComplete,packs:savePacks,commit:finishComplete};
export async function snapshotComplete():Promise<CompleteData>{return {library:await load(),packs:await loadPacks(),preferences:await loadPreferences()};}
export async function saveComplete(before:CompleteData,after:CompleteData):Promise<void>{const run=()=>commitComplete(store,before,after);if(navigator.locks)await navigator.locks.request('deckforge-complete-restore',run);else await run();}
export async function recoverCompleteStartup():Promise<boolean>{const run=()=>recoverInterrupted(store);return navigator.locks?navigator.locks.request('deckforge-complete-restore',run):run();}
