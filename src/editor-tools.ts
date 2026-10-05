import type {Deck,TabooDeck,Card} from './model.js';
import {importLines} from './model.js';
import {importTaboo} from './taboo.js';
import {prepareCardImport,mappedCards,type ImportedCard} from './card-import.js';
export const contentKey=(text:string):string=>text.trim().toLocaleLowerCase();
export function duplicateGroups(items:readonly Card[]):{text:string;positions:number[]}[]{
  const groups=new Map<string,{text:string;positions:number[]}>();
  items.forEach((item,i)=>{const key=contentKey(item.text);const group=groups.get(key)??{text:item.text,positions:[]};group.positions.push(i+1);groups.set(key,group);});
  return [...groups.values()].filter(group=>group.positions.length>1);
}
export function copyDeck<T extends Deck|TabooDeck>(deck:T,names:readonly string[],id:()=>string):T {
  let name=deck.name+' copy',suffix=2;
  while(names.some(existing=>contentKey(existing)===contentKey(name)))name=deck.name+' copy '+suffix++;
  const copy=structuredClone(deck);copy.id=id();copy.name=name;copy.cards=copy.cards.map(card=>({...card,id:id()}));
  if('activities' in copy)copy.activities=copy.activities.map(activity=>({...activity,id:id()}));
  return copy;
}
export type ImportKind='cards'|'activities'|'taboo';
export interface ImportReview {kind:ImportKind;deckId:string;items:{text:string;back?:string;forbidden?:string[]}[];duplicates:number;problems?:string[]}
const itemKey=(item:{text:string;back?:string;forbidden?:string[]})=>JSON.stringify([contentKey(item.text),...(item.back?.trim()?[contentKey(item.back)]:[]),...(item.forbidden??[]).map(contentKey)]);
export function reviewCardItems(deckId:string,parsed:{items:ImportedCard[];problems:string[]},existing:readonly ImportedCard[]):ImportReview {
  const seen=new Set(existing.map(itemKey));let duplicates=0;
  for(const item of parsed.items){const key=itemKey(item);if(seen.has(key))duplicates++;seen.add(key);}
  return {kind:'cards',deckId,items:parsed.items,duplicates,problems:parsed.problems};
}
export function reviewImport(kind:ImportKind,deckId:string,input:string,existing:readonly {text:string;back?:string;forbidden?:string[]}[]):ImportReview {
  if(kind==='cards'){
    const parsed=mappedCards(prepareCardImport(input,'paste'));
    if(parsed.problems.length)throw new Error(parsed.problems.join('\n'));
    return reviewCardItems(deckId,parsed,existing);
  }
  const items=kind==='taboo'?importTaboo(input):importLines(input).map(text=>({text}));
  if(!items.length)throw new Error('Paste at least one non-empty line.');
  const seen=new Set(existing.map(itemKey));let duplicates=0;
  for(const item of items){const key=itemKey(item);if(seen.has(key))duplicates++;seen.add(key);}
  return {kind,deckId,items,duplicates};
}
export function importItems(review:ImportReview,existing:readonly {text:string;back?:string;forbidden?:string[]}[],skipDuplicates:boolean):ImportReview['items'] {
  if(review.problems?.length)throw new Error('Fix the import problems before saving.');
  const seen=new Set(existing.map(itemKey));
  return review.items.filter(item=>{const key=itemKey(item),duplicate=seen.has(key);seen.add(key);return !skipDuplicates||!duplicate;}).map(item=>({...item,...(item.forbidden?{forbidden:[...item.forbidden]}:{})}));
}
