import {activityParts} from './activities.js';
import type {DeckMetadata,LaunchContext,ModeId} from './modes.js';
export const esc=(text:string):string=>text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export function button(action:string,text:string,cls=''):string{return `<button type="button" data-action="${action}" class="${cls}">${text}</button>`;}
export function cardDisplay(text:string,activity?:{text:string}):string {
  return activity?`<span>${activityParts(activity.text,text).map(part=>part.kind==='card'?`<strong>${esc(part.text)}</strong>`:`<em>${esc(part.text)}</em>`).join('')}</span>`:esc(text);
}
export function deckOptions<T extends DeckMetadata & {id:string;name:string;emoji?:string;cards:readonly unknown[]}>(pool:{compatible:T[];other:T[]},value:string|null,context:LaunchContext,all:boolean):string {
  const option=(d:T)=>`<option value="${esc(d.id)}" ${d.id===value?'selected':''}>${d.emoji?esc(d.emoji)+' ':''}${esc(d.name)} · ${d.cards.length} cards</option>`;
  const labels=[['Recommended for '+(context==='play'?'Play':'Work'),context],['Suited for Both','both'],['Other compatible decks',context==='play'?'work':'play']];
  return labels.map(([label,suited])=>{const decks=pool.compatible.filter(d=>d.deckContext===suited);return decks.length?`<optgroup label="${label}">${decks.map(option).join('')}</optgroup>`:'';}).join('')+(all&&pool.other.length?`<optgroup label="Other decks — not assigned to this mode">${pool.other.map(option).join('')}</optgroup>`:'');
}
export function pickerEscape(other:number,compatible:number,context:LaunchContext,all:boolean,mode:ModeId):string {
  return `<p class="muted picker-help">${all?'Showing all non-empty decks for this card format.':compatible?'Compatible decks, recommended for '+(context==='play'?'Play':'Work')+'.':other?'No compatible decks yet. Show all to try another deck, or edit Available in from Decks.':mode==='lookup'?'Create or edit a deck to contain exactly 54 cards.':'Add cards in Decks to make a deck playable.'}</p>${other?button('toggle-all-decks',all?'Show Compatible Decks':`Show All Decks (${other} more)`,'quiet picker-escape'):''}`;
}
