// Local-only deck adapter. Never sends the imported library to the room API.
export interface CategoryDeck {id:string;name:string;items:string[]}
export const categoryKey=(text:string)=>text.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
export function categoryPool(values:unknown):string[]{
 if(!Array.isArray(values)||values.length<1||values.length>10000||!values.every(x=>typeof x==='string'&&x.trim().length>0&&x.trim().length<=60))throw new Error('Use 1–10,000 category names, each 1–60 characters.');
 const unique=new Map<string,string>();for(const value of values){const text=(value as string).trim();if(!unique.has(categoryKey(text)))unique.set(categoryKey(text),text);}return [...unique.values()];
}
export function readCategoryDecks(text:string):CategoryDeck[]{
 if(new TextEncoder().encode(text).byteLength>20*1024*1024)throw new Error('Choose a backup smaller than 20 MB.');
 let data;try{data=JSON.parse(text);}catch{throw new Error('Choose a valid DeckForge JSON backup.');}
 let decks:unknown;
 if(data?.format==='deckforge-pwa-backup'&&[1,2,3,4,5,6].includes(data.version))decks=data.library?.decks;
 else if(data?.format==='deckforge-pwa-poc-v1')decks=data.decks;
 else throw new Error('Choose a DeckForge PWA backup.');
 if(!Array.isArray(decks)||decks.length>10000)throw new Error('Invalid deck list.');
 const result:CategoryDeck[]=[];
 decks.forEach((d,i)=>{if(!d||typeof d.name!=='string'||!Array.isArray(d.cards))throw new Error('Invalid deck in backup.');if(!d.cards.length)return;result.push({id:String(i),name:d.name,items:d.cards.map((c:unknown)=>{if(!c||typeof c!=='object'||!('text' in c)||typeof c.text!=='string')throw new Error('Invalid card in backup.');return c.text;})});});
 if(!result.length)throw new Error('This backup has no regular decks with cards.');return result;
}
export function drawCategories(pool:readonly string[],used:readonly string[],random=Math.random):string[]{
 const seen=new Set(used.map(categoryKey));const available=categoryPool([...pool]).filter(x=>!seen.has(categoryKey(x)));
 for(let i=available.length-1;i>0;i--){const j=Math.floor(Math.max(0,Math.min(.999999,random()))*(i+1));[available[i],available[j]]=[available[j]!,available[i]!];}return available.slice(0,12);
}
