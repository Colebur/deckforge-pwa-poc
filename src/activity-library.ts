/** Structured facilitation activities; distinct from deck {card} templates. */
export interface FacilitationActivity {
 id:string;title:string;description:string;purposes:string[];audiences:string[];tags:string[];
 minAge?:number;maxAge?:number;duration?:number;materials:string;preparation:''|'none'|'minimal'|'substantial';adaptations:string;variations:string;favorite:boolean;
}
const text=(v:unknown,max=12000)=>typeof v==='string'?v.trim().slice(0,max):'';
const list=(v:unknown)=>Array.isArray(v)?[...new Set(v.map(x=>text(x,100)).filter(Boolean))].slice(0,50):[];
export function validateActivity(value:unknown,id:()=>string=()=>crypto.randomUUID()):FacilitationActivity {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Activity must be an object.');
 const v=value as Record<string,unknown>,title=text(v.title,200),description=text(v.description);
 if(!title||!description)throw new Error('Title and description are required.');
 const number=(key:string)=>{const n=v[key];if(n===undefined||n===null||n==='')return undefined;if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>10000)throw new Error(`Invalid ${key}.`);return n;};
 const minAge=number('minAge'),maxAge=number('maxAge'),duration=number('duration');
 if(minAge!==undefined&&maxAge!==undefined&&minAge>maxAge)throw new Error('Minimum age exceeds maximum age.');
 const preparation=text(v.preparation);if(preparation&&!['none','minimal','substantial'].includes(preparation))throw new Error('Unknown preparation level.');
 return {id:text(v.id,200)||id(),title,description,purposes:list(v.purposes),audiences:list(v.audiences),tags:list(v.tags),minAge,maxAge,duration,materials:text(v.materials),preparation:preparation as FacilitationActivity['preparation'],adaptations:text(v.adaptations),variations:text(v.variations),favorite:v.favorite===true};
}
export function decodeActivities(value:unknown):FacilitationActivity[]{if(value===undefined)return [];if(!Array.isArray(value))throw new Error('Invalid saved Activities library.');return value.map(v=>validateActivity(v));}
export function fingerprint(a:FacilitationActivity):string {const {id,favorite,...content}=a;return JSON.stringify(content).normalize('NFKC').toLocaleLowerCase();}
export function parseActivities(text:string):{items:FacilitationActivity[];problems:string[]}{
 if(new TextEncoder().encode(text).length>5*1024*1024)throw new Error('Choose an activity file smaller than 5 MB.');
 let value:unknown;try{value=JSON.parse(text);}catch{throw new Error('Invalid JSON. Nothing was changed.');}
 const v=value as {format?:string;version?:number;activities?:unknown};
 if(!Array.isArray(value)&&(v?.format!=='deckforge-activities'||v.version!==1))throw new Error('Expected a version 1 DeckForge Activities file or an array.');
 const rows=Array.isArray(value)?value:v.activities;if(!Array.isArray(rows)||rows.length>5000)throw new Error('Expected up to 5,000 activities.');
 const items:FacilitationActivity[]=[],problems:string[]=[];rows.forEach((row,i)=>{try{items.push(validateActivity(row));}catch(e){problems.push(`Row ${i+1}: ${String(e)}`);}});return {items,problems};
}
export function mergeActivities(current:FacilitationActivity[],incoming:FacilitationActivity[],id:()=>string=()=>crypto.randomUUID()):{items:FacilitationActivity[];skipped:number}{
 const seen=new Set(current.map(fingerprint)),items=[...current];let skipped=0;
 for(const a of incoming){const key=fingerprint(a);if(seen.has(key)){skipped++;continue;}seen.add(key);items.push({...a,id:id()});}return {items,skipped};
}
export function exportActivities(items:FacilitationActivity[]):string{return JSON.stringify({format:'deckforge-activities',version:1,activities:items},null,2);}
export interface ActivityFilters {search:string;age:string;purpose:string;audience:string;duration:string;preparation:string;tag:string;favorites:boolean}
export const emptyActivityFilters=():ActivityFilters=>({search:'',age:'',purpose:'',audience:'',duration:'',preparation:'',tag:'',favorites:false});
export function filterActivities(items:FacilitationActivity[],f:ActivityFilters):FacilitationActivity[]{return items.filter(a=>{
 const hay=[a.title,a.description,...a.tags].join(' ').toLocaleLowerCase();
 return f.search.toLocaleLowerCase().split(/\s+/).every(s=>hay.includes(s))&&(!f.favorites||a.favorite)&&(!f.age||(a.minAge!==undefined&&a.maxAge!==undefined&&+f.age>=a.minAge&&+f.age<=a.maxAge))&&(!f.duration||(a.duration!==undefined&&a.duration<=+f.duration))&&(!f.preparation||a.preparation===f.preparation)&&(!f.purpose||a.purposes.includes(f.purpose))&&(!f.audience||a.audiences.includes(f.audience))&&(!f.tag||a.tags.includes(f.tag));
 }).sort((a,b)=>a.title.localeCompare(b.title));}
export function surpriseActivity(items:FacilitationActivity[],previous?:string,random=Math.random):FacilitationActivity|undefined {const fresh=items.filter(a=>a.id!==previous),pool=fresh.length?fresh:items;return pool[Math.floor(random()*pool.length)];}
