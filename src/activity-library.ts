/** Structured facilitation activities; distinct from deck {card} templates. */
export interface FacilitationActivity {
 id:string;title:string;description:string;purposes:string[];audiences:string[];tags:string[];
 minAge?:number;maxAge?:number;duration?:number;materials:string;preparation:''|'none'|'minimal'|'substantial';adaptations:string;variations:string;favorite:boolean;
}
const text=(v:unknown,max=12000)=>typeof v==='string'?v.trim().slice(0,max):'';
export const activityLabelKey=(value:string)=>value.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
const list=(v:unknown)=>Array.isArray(v)?[...new Set(v.map(x=>activityLabelKey(text(x,100))).filter(Boolean))].slice(0,50):[];
export function activityLabelOptions(values:string[]):string[]{return [...new Set(values.map(activityLabelKey).filter(Boolean))].sort((a,b)=>a.localeCompare(b));}
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
export function fingerprint(a:FacilitationActivity):string {const {id,favorite,...content}=a;return JSON.stringify({...content,purposes:activityLabelOptions(a.purposes),audiences:activityLabelOptions(a.audiences),tags:activityLabelOptions(a.tags)}).normalize('NFKC').toLocaleLowerCase();}
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
export interface ActivityFilters {search:string;age:string;purpose:string|string[];audience:string;duration:string;preparation:string;tag:string|string[];favorites:boolean;includeUnknown?:boolean;noMaterials?:boolean}
export const emptyActivityFilters=():ActivityFilters=>({search:'',age:'',purpose:'',audience:'',duration:'',preparation:'',tag:'',favorites:false,includeUnknown:false,noMaterials:false});
export function filterActivities(items:FacilitationActivity[],f:ActivityFilters):FacilitationActivity[]{
 const selected=(value:string|string[])=>typeof value==='string'?(value?[value]:[]):value;
 const matches=(values:string[],choices:string|string[])=>selected(choices).every(c=>values.some(v=>activityLabelKey(v)===activityLabelKey(c)));
 return items.filter(a=>{
 const hay=activityLabelKey([a.title,a.description,...a.tags].join(' '));
 const ageKnown=a.minAge!==undefined&&a.maxAge!==undefined;
 const ageMatches=!f.age||(ageKnown?+f.age>=a.minAge!&&+f.age<=a.maxAge!:!!f.includeUnknown);
 const durationMatches=!f.duration||(a.duration!==undefined?a.duration<=+f.duration:!!f.includeUnknown);
 const noMaterials=['none','no materials','no materials required','not required'].includes(activityLabelKey(a.materials).replace(/[.!]$/,''));
 return activityLabelKey(f.search).split(/\s+/).every(s=>hay.includes(s))&&(!f.favorites||a.favorite)&&ageMatches&&durationMatches&&(!f.preparation||a.preparation===f.preparation)&&matches(a.purposes,f.purpose)&&matches(a.audiences,f.audience)&&matches(a.tags,f.tag)&&(!f.noMaterials||noMaterials);
 }).sort((a,b)=>a.title.localeCompare(b.title));
}
export interface ActivityImportRow {index:number;activity:FacilitationActivity;exact:boolean;matches:FacilitationActivity[];batchTitle:boolean}
export type ActivityImportChoice={action:'both'|'skip'|'update';target?:string};
export function reviewActivityImport(current:FacilitationActivity[],incoming:FacilitationActivity[]):ActivityImportRow[]{
 const seen=new Set(current.map(fingerprint)),titles=new Set<string>();
 return incoming.map((activity,index)=>{const key=fingerprint(activity),title=activityLabelKey(activity.title),exact=seen.has(key),matches=current.filter(a=>activityLabelKey(a.title)===title),batchTitle=titles.has(title);seen.add(key);titles.add(title);return {index,activity,exact,matches,batchTitle};});
}
/** Applying an import is pure. Updating requires a selected, existing target. */
export function applyActivityImport(current:FacilitationActivity[],incoming:FacilitationActivity[],choices:Record<number,ActivityImportChoice>,id:()=>string=()=>crypto.randomUUID()):{items:FacilitationActivity[];added:number;updated:number;skipped:number}{
 let items=[...current],added=0,updated=0,skipped=0;const updatedTargets=new Set<string>();
 for(const row of reviewActivityImport(current,incoming)){
 if(row.exact){skipped++;continue;}
 const choice=choices[row.index]??{action:row.matches.length||row.batchTitle?'skip':'both'};
 if(choice.action==='skip'){skipped++;continue;}
 if(choice.action==='update'){
 const target=row.matches.find(a=>a.id===choice.target);if(!target)throw new Error('Choose an existing matching activity to update.');
 if(updatedTargets.has(target.id))throw new Error('Choose only one incoming version to update each existing activity.');updatedTargets.add(target.id);
 items=items.map(a=>a.id===target.id?{...row.activity,id:a.id,favorite:a.favorite}:a);updated++;
 }else{items.push({...row.activity,id:id()});added++;}
 }
 return {items,added,updated,skipped};
}
export function surpriseActivity(items:FacilitationActivity[],previous?:string,random=Math.random):FacilitationActivity|undefined {const fresh=items.filter(a=>a.id!==previous),pool=fresh.length?fresh:items;return pool[Math.floor(random()*pool.length)];}
