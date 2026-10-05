// Platform-neutral draw policy. Storage adapters contain no card content.
export interface CardIdentity {id:string}
export interface DrawMemory {recent():ReadonlySet<string>;shown(id:string):void}
interface DeckIdentity {id:string;cards:readonly CardIdentity[]}
interface RecentEntry {enabled:boolean;ids:string[]}
export interface RecentCardState {version:1;decks:Record<string,RecentEntry>}
export const recentLimit=(size:number):number=>Math.floor(size/2);
export function decodeRecentCards(value:unknown):RecentCardState {
  if(value&&typeof value==='object'&&'version' in value&&typeof value.version==='number'&&value.version>1)throw new Error('Recent card memory needs a newer DeckForge version.');
  const entries: [string,RecentEntry][]=[];
  if(value&&typeof value==='object'&&'version' in value&&value.version===1&&'decks' in value&&value.decks&&typeof value.decks==='object'){
    for(const [id,entry] of Object.entries(value.decks)){
      if(!entry||typeof entry!=='object')continue;
      const e=entry as Partial<RecentEntry>;
      const ids=Array.isArray(e.ids)?e.ids.filter((id):id is string=>typeof id==='string'):[];
      // Retain the newest occurrence of each ID; legacy/bad entries are harmless.
      entries.push([id,{enabled:e.enabled!==false,ids:[...new Set(ids.reverse())].reverse()}]);
    }
  }
  return {version:1,decks:Object.fromEntries(entries)};
}
export class RecentCards {
  private entries:Map<string,RecentEntry>;
  private decks=new Map<string,DeckIdentity>();
  constructor(value:unknown=undefined,private changed:()=>void=()=>{}){this.entries=new Map(Object.entries(decodeRecentCards(value).decks));}
  snapshot():RecentCardState{return {version:1,decks:Object.fromEntries([...this.entries].map(([id,e])=>[id,{enabled:e.enabled,ids:[...e.ids]}]))};}
  enabled(id:string):boolean{return this.entries.get(id)?.enabled!==false;}
  ids(id:string):readonly string[]{return [...(this.entries.get(id)?.ids??[])];}
  reconcile(decks:readonly DeckIdentity[]):void {
    this.decks=new Map(decks.map(d=>[d.id,d]));let dirty=false;
    for(const [id,e] of this.entries){
      const deck=this.decks.get(id);if(!deck){this.entries.delete(id);dirty=true;continue;}
      const valid=new Set(deck.cards.map(c=>c.id)),limit=recentLimit(valid.size);
      const ids=limit?e.ids.filter(id=>valid.has(id)).slice(-limit):[];
      if(ids.length!==e.ids.length||ids.some((id,i)=>id!==e.ids[i])){e.ids=ids;dirty=true;}
    }
    if(dirty)this.changed();
  }
  setEnabled(id:string,enabled:boolean):void{if(!this.decks.has(id))return;const e=this.entries.get(id)??{enabled:true,ids:[]};e.enabled=enabled;this.entries.set(id,e);this.changed();}
  reset(id:string):void{const e=this.entries.get(id);if(e){e.ids=[];this.changed();}}
  forDeck(id:string):DrawMemory{return {recent:()=>new Set(this.enabled(id)?this.ids(id):[]),shown:card=>this.record(id,card)};}
  private record(id:string,card:string):void {
    const deck=this.decks.get(id);if(!deck||!this.enabled(id)||!deck.cards.some(c=>c.id===card))return;
    const limit=recentLimit(deck.cards.length);if(!limit)return; // Singletons always remain usable.
    const e=this.entries.get(id)??{enabled:true,ids:[]};e.ids=[...e.ids.filter(i=>i!==card),card].slice(-limit);this.entries.set(id,e);this.changed();
  }
}
// Eligibility (including once-per-round rules) is resolved before freshness.
export function chooseCard<T extends CardIdentity>(eligible:readonly T[],memory?:DrawMemory,lastId?:string,random=Math.random):T|undefined {
  const pool=eligible.length>1?eligible.filter(c=>c.id!==lastId):eligible;
  if(!pool.length)return undefined;
  const recent=memory?.recent(),fresh=recent?pool.filter(c=>!recent.has(c.id)):pool;
  const choices=fresh.length?fresh:pool;
  return choices[Math.floor(Math.min(.999999999,Math.max(0,random()))*choices.length)];
}
export class RandomCardBag<T extends CardIdentity> {
  private remaining:T[]=[];
  private lastId?:string;
  constructor(private cards:readonly T[],private memory?:DrawMemory){}
  get length():number{return this.remaining.length;}
  refill():void{this.remaining=[...this.cards];}
  draw(random=Math.random):T {
    const card=chooseCard(this.remaining,this.memory,this.lastId,random);
    if(!card)throw new Error('No eligible cards to draw.');
    this.remaining=this.remaining.filter(c=>c.id!==card.id);this.lastId=card.id;
    this.memory?.shown(card.id);return card;
  }
}
