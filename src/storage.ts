import { emptyLibrary, type Library } from './model.js';
import { decodeState, encodeState, NewerFormatError } from './backup.js';
let database: Promise<IDBDatabase> | undefined;
function open(): Promise<IDBDatabase> {
  database ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('deckforge-pwa-poc', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('state');
    req.onsuccess = () => {
      req.result.onversionchange = () => { req.result.close(); database = undefined; };
      resolve(req.result);
    };
    req.onerror = () => { database = undefined; reject(req.error); };
    req.onblocked = () => { database = undefined; reject(new Error('Close other DeckForge POC windows, then reopen.')); };
  });
  return database;
}
async function read(key: string): Promise<unknown> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('state', 'readonly');
    const request = tx.objectStore('state').get(key);
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Storage read canceled.'));
  });
}
export async function load(): Promise<Library> {
  const value = await read('library');
  // Only a truly new installation starts empty. Bad/unknown data never silently resets.
  return value === undefined ? emptyLibrary() : decodeState(value);
}
export async function save(library: Library, restorePoint = false): Promise<void> {
  const encoded = encodeState(library);
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('state', 'readwrite');
    const store = tx.objectStore('state');
    const previous = store.get('library');
    let failure: unknown;
    previous.onsuccess = () => {
      try {
        if (previous.result !== undefined) {
          try {
            const valid = encodeState(decodeState(previous.result));
            store.put(valid, 'previous');
            if (restorePoint) store.put({savedAt: new Date().toISOString(), state: valid}, 'restore-point');
          } catch (error) {
            if (error instanceof NewerFormatError) throw error;
            // Keep unreadable data for investigation when the user explicitly recovers.
            store.put(previous.result, 'unreadable');
          }
        }
        store.put(encoded, 'library');
      } catch (error) { failure = error; tx.abort(); }
    };
    // New library and safety copies commit together, or none of them do.
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(failure ?? tx.error);
    tx.onabort = () => reject(failure ?? tx.error ?? new Error('Storage write canceled.'));
  });
}
export interface Recovery { library: Library; savedAt: string | null }
export async function recovery(): Promise<Recovery | null> {
  const point = await read('restore-point') as {savedAt?: string; state?: unknown} | undefined;
  if (point?.state) {
    try { return {library: decodeState(point.state), savedAt: point.savedAt ?? null}; } catch { /* An unreadable safety copy must not block a valid library. */ }
  }
  const previous = await read('previous');
  if(previous === undefined) return null;
  try { return {library: decodeState(previous), savedAt: null}; } catch { return null; }
}
