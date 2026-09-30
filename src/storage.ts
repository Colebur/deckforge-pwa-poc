import { emptyLibrary, type Library } from './model.js';
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
export async function load(): Promise<Library> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('state', 'readonly');
    const request = tx.objectStore('state').get('library');
    tx.oncomplete = () => resolve(request.result ?? emptyLibrary());
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Storage read canceled.'));
  });
}
export async function save(library: Library): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('state', 'readwrite');
    tx.objectStore('state').put(library, 'library');
    // Commit completion matters: a queued write is not yet a saved deck.
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Storage write canceled.'));
  });
}
