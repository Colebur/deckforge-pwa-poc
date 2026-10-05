import {esc} from './ui.js';
export interface SearchableCard {
  text?:string; back?:string; forbidden?:readonly string[];
  prompt?:string; category?:string;
  answers?:readonly {text:string;aliases?:readonly string[]}[];
}
function normalize(value:string):string {
  return value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase();
}
/** Each query word may match anywhere in the card's editable text. */
export function searchCards<T extends SearchableCard>(cards:readonly T[],query:string):{card:T;index:number}[] {
  const words=normalize(query.trim()).split(/\s+/).filter(Boolean);
  return cards.map((card,index)=>({card,index})).filter(({card})=>{
    const text=normalize([card.text,card.back,...card.forbidden??[],card.prompt,card.category,
      ...(card.answers??[]).flatMap(a=>[a.text,...a.aliases??[]])].filter(Boolean).join(' '));
    return words.every(word=>text.includes(word));
  });
}
export function cardSearchField(query:string):string {
  return '<label for="card-search">Search cards</label><input id="card-search" type="search" value="'+esc(query)+'" placeholder="Search any card text" autocomplete="off"><p class="muted">Search all card fields. Card order stays unchanged.</p>';
}
