// Content-independent library tools and local preferences. No browser APIs here.
import {alphabeticalDecks,type Library} from './model.js';
import type {DeckMetadata} from './modes.js';
export interface LibraryFilter {search:string;context:string;mode:string}
export function filterLibrary<T extends DeckMetadata & {name:string}>(decks:readonly T[],filter:LibraryFilter):T[] {
  const term=filter.search.trim().toLocaleLowerCase();
  return alphabeticalDecks(decks.filter(d=>d.name.toLocaleLowerCase().includes(term) &&
    (filter.context==='all'||d.deckContext===filter.context) &&
    (filter.mode==='all'||(filter.mode==='unassigned'?d.compatibleModes.length===0:d.compatibleModes.includes(filter.mode)))));
}
export interface Preferences {largeText:boolean;backupReminders:boolean;reminderSince:string|null;lastExport:string|null;lastConfirmedBackup:string|null;snoozedUntil:string|null}
export const defaultPreferences=():Preferences=>({largeText:false,backupReminders:false,reminderSince:null,lastExport:null,lastConfirmedBackup:null,snoozedUntil:null});
export function decodePreferences(value:unknown):Preferences {
  const p=value && typeof value==='object'?value as Record<string,unknown>:{};
  const date=(key:string):string|null=>typeof p[key]==='string'&&Number.isFinite(Date.parse(p[key] as string))?p[key] as string:null;
  return {largeText:p.largeText===true,backupReminders:p.backupReminders===true,reminderSince:date('reminderSince'),lastExport:date('lastExport'),lastConfirmedBackup:date('lastConfirmedBackup'),snoozedUntil:date('snoozedUntil')};
}
export const MONTH=30*24*60*60*1000;
export function backupDue(p:Preferences,now:number):boolean {
  if(!p.backupReminders || (p.snoozedUntil && Date.parse(p.snoozedUntil)>now))return false;
  const since=p.lastConfirmedBackup??p.reminderSince;
  return !!since && now-Date.parse(since)>=MONTH;
}
export function backupOverlap(current:Library,incoming:Library):number {
  const names=(decks:readonly {name:string}[])=>new Set(decks.map(d=>d.name.trim().toLocaleLowerCase()));
  const regular=names(current.decks),taboo=names(current.tabooDecks??[]);
  return incoming.decks.filter(d=>regular.has(d.name.trim().toLocaleLowerCase())).length+
    (incoming.tabooDecks??[]).filter(d=>taboo.has(d.name.trim().toLocaleLowerCase())).length;
}
// Shortcut intent only; the UI checks that the corresponding control exists and is enabled.
export function gameShortcut(route:string,key:string,phase?:string):string|undefined {
  if(route==='lookup')return ({ArrowLeft:'lookup-prev',ArrowRight:'lookup-next',r:'lookup-random'} as Record<string,string>)[key];
  if(route==='prompts'&&key===' ')return 'prompt-draw';
  if(!['catchphrase','headbands','taboo'].includes(route)||!phase||phase==='ended')return;
  if(key===' ')return phase==='paused'?'resume':'pause';
  if(phase!=='running')return;
  if(route==='catchphrase'&&key==='ArrowRight')return 'next-card';
  if(route==='headbands')return ({ArrowDown:'head-correct',ArrowUp:'head-pass'} as Record<string,string>)[key];
  if(route==='taboo')return ({ArrowRight:'taboo-correct',ArrowLeft:'taboo-pass',v:'taboo-violation'} as Record<string,string>)[key];
}
