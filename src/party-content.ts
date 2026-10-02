// Shared content validation; no browser or hosting dependencies.
export type PartyMode='trivia'|'team-trivia'|'jeopardy'|'survey'|'wheel';
export interface AcceptedAnswer {text:string;aliases:string[];points:number}
export interface GameCard {prompt:string;answers:AcceptedAnswer[];category:string;points:number}
export interface GamePack {id:string;name:string;kind:'quiz'|'survey';cards:GameCard[]}
export const PARTY_MODES:Record<PartyMode,string>={trivia:'Trivia','team-trivia':'Team Trivia',jeopardy:'Clue Board',survey:'Survey Showdown',wheel:'Word Wheel'};
export const answerKey=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function matchesAnswer(text:string,answer:AcceptedAnswer){const key=answerKey(text);return !!key&&[answer.text,...answer.aliases].some(a=>answerKey(a)===key);}
function text(v:unknown,max:number,label:string):string{if(typeof v!=='string'||!v.trim()||v.trim().length>max)throw new Error(`${label}: use 1–${max} characters.`);return v.trim();}
export function validateCards(value:unknown,kind:'quiz'|'survey',max=500):GameCard[]{
 if(!Array.isArray(value)||!value.length||value.length>max)throw new Error(`Use 1–${max} cards.`);
 return value.map(c=>{if(!c||typeof c!=='object')throw new Error('Invalid game card.');const prompt=text(c.prompt,300,'Question');if(!Array.isArray(c.answers)||!c.answers.length||c.answers.length>(kind==='survey'?8:1))throw new Error(kind==='survey'?'Use 1–8 survey answers.':'Use one main answer with optional aliases.');
 const seen=new Set<string>();const answers=c.answers.map((a:AcceptedAnswer)=>{if(!a||typeof a!=='object')throw new Error('Invalid answer.');const main=text(a.text,120,'Answer');if(!Array.isArray(a.aliases)||a.aliases.length>8)throw new Error('Use up to 8 accepted alternatives.');const aliases=a.aliases.map(x=>text(x,120,'Alternative'));for(const label of [main,...aliases]){const key=answerKey(label);if(!key||seen.has(key))throw new Error('Answers and alternatives must be distinct within a card.');seen.add(key);}if(!Number.isInteger(a.points)||a.points<1||a.points>1000)throw new Error('Answer points must be 1–1000.');return {text:main,aliases,points:a.points};});
 const category=typeof c.category==='string'?c.category.trim():'General';if(category.length>60)throw new Error('Category: use up to 60 characters.');if(!Number.isInteger(c.points)||c.points<1||c.points>1000)throw new Error('Card points must be 1–1000.');return {prompt,answers,category:category||'General',points:c.points};});
}
// Editable, beginner-friendly line format; JSON export retains the full structure.
export function parseGameLines(input:string,kind:'quiz'|'survey'):GameCard[]{
 const cards=input.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map((line,i)=>{try{const fields=line.split('|').map(x=>x.trim());if(kind==='quiz'){if(fields.length<2||fields.length>5)throw new Error('Question | Answer | alternatives separated by ; | Category | Points');return {prompt:fields[0],answers:[{text:fields[1],aliases:(fields[2]??'').split(';').map(x=>x.trim()).filter(Boolean),points:1}],category:fields[3]||'General',points:Number(fields[4]||1)};}
 if(fields.length<2||fields.length>9)throw new Error('Question | Answer:points;alternative | Answer:points;alternative');return {prompt:fields[0],answers:fields.slice(1).map(field=>{const [main,...aliases]=field.split(';').map(x=>x.trim());const split=main!.lastIndexOf(':');if(split<1)throw new Error('Each answer needs :points.');return {text:main!.slice(0,split).trim(),points:Number(main!.slice(split+1)),aliases:aliases.filter(Boolean)};}),category:'Survey',points:1};}catch(e){throw new Error(`Line ${i+1}: ${String(e)}`);}});
 return validateCards(cards,kind);
}
export function gameLines(cards:readonly GameCard[],kind:'quiz'|'survey'):string{return cards.map(c=>kind==='quiz'?[c.prompt,c.answers[0]!.text,c.answers[0]!.aliases.join('; '),c.category,c.points].join(' | '):[c.prompt,...c.answers.map(a=>a.text+':'+a.points+(a.aliases.length?'; '+a.aliases.join('; '):''))].join(' | ')).join('\n');}
