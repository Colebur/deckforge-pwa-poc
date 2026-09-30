import { type Library } from './model.js';

export class NewerFormatError extends Error {}
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const nonblank = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
export function validateLibrary(value: unknown): Library {
  if (!record(value) || !Array.isArray(value.decks) || typeof value.duration !== 'number' ||
      !Number.isFinite(value.duration) || value.duration < 5 || value.duration > 300 ||
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
    return {id: entry.id, name: entry.name, cards};
  });
  return {decks, duration: value.duration, probe: value.probe};
}
// Keep the original database/store names. Old POC libraries upgrade without clearing data.
export function decodeState(value: unknown): Library {
  if (record(value) && value.format === 'deckforge-pwa-state') {
    if (value.version !== 1) throw new NewerFormatError('This library needs a newer DeckForge update. Your saved data was not changed.');
    return validateLibrary(value.library);
  }
  return validateLibrary(value);
}
export function encodeState(library: Library): object {
  return {format: 'deckforge-pwa-state', version: 1, library: validateLibrary(library)};
}
export interface BackupPreview { library: Library; source: 'DeckForge PWA' | 'Original PWA backup' | 'Native DeckForge backup' }
export function exportBackup(library: Library, now = new Date()): string {
  return JSON.stringify({format: 'deckforge-pwa-backup', version: 1, exportedAt: now.toISOString(), library: validateLibrary(library)}, null, 2);
}
export function parseBackup(text: string): BackupPreview {
  if (new TextEncoder().encode(text).byteLength > MAX_BACKUP_BYTES) throw new Error('Choose a backup smaller than 20 MB.');
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('This file is not a valid JSON backup. Nothing was changed.'); }
  if (!record(value)) throw new Error('This is not a DeckForge backup.');
  if (value.format === 'deckforge-pwa-backup') {
    if (value.version !== 1) throw new NewerFormatError('This backup needs a newer DeckForge update. Nothing was changed.');
    return {library: validateLibrary(value.library), source: 'DeckForge PWA'};
  }
  if (value.format === 'deckforge-pwa-poc-v1') return {library: validateLibrary(value), source: 'Original PWA backup'};
  // Read exported native files only; this never accesses or changes the native app.
  if (!('format' in value) && value.version === 1 && Array.isArray(value.decks)) {
    const decks = value.decks.map(entry => {
      if (!record(entry) || !nonblank(entry.name) || !Array.isArray(entry.cards) || !entry.cards.every(nonblank))
        throw new Error('This native backup contains an invalid deck or card. Nothing was changed.');
      return {id: crypto.randomUUID(), name: entry.name, cards: entry.cards.map(text => ({id: crypto.randomUUID(), text}))};
    });
    return {library: {decks, duration: 90, probe: null}, source: 'Native DeckForge backup'};
  }
  throw new Error('Unrecognized backup format. Nothing was changed.');
}
export function restoreBackup(current: Library, incoming: Library, mode: 'add' | 'replace', id = () => crypto.randomUUID()): Library {
  const valid = validateLibrary(incoming);
  // Fresh IDs keep repeated imports separate. Text, duplicate prompts and order stay exact.
  const copies = valid.decks.map(d => ({id: id(), name: d.name, cards: d.cards.map(c => ({id: id(), text: c.text}))}));
  return validateLibrary(mode === 'replace' ? {...valid, decks: copies} : {...validateLibrary(current), decks: [...current.decks, ...copies]});
}
