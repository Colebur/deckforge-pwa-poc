import {chooseCard,type DrawMemory} from './recent-cards.js';
import type {Deck, PromptDraw} from './model.js';
import {ActivitySession,type ActivityMode} from './activities.js';

// Session snapshots preserve source-deck identity; no combined deck is stored.
export class PromptSession {
  readonly decks:readonly Deck[];
  current:PromptDraw|undefined;
  private sessions=new Map<string,ActivitySession>();
  constructor(decks:readonly Deck[], mode:ActivityMode='none',fixed:Readonly<Record<string,string>>={},private memoryForDeck?:(id:string)=>DrawMemory){
    this.decks=decks.filter(d=>d.cards.length).map(d=>({...d,cards:d.cards.map(c=>({...c})),activities:d.activities.map(a=>({...a}))}));
    for(const d of this.decks)this.sessions.set(d.id,new ActivitySession(d.activities,mode,fixed[d.id]??d.activities[0]?.id));
  }
  draw(random=Math.random):PromptDraw|undefined {
    if(!this.decks.length)return undefined;
    const pick=<T>(items:readonly T[]):T=>items[Math.floor(Math.min(.999999999,Math.max(0,random()))*items.length)]!;
    // Equal deck probability, even for unequal card counts. Avoid the last card
    // within its source deck; a singleton is unavoidable when drawn again.
    const deck=pick(this.decks);
    const memory=this.memoryForDeck?.(deck.id);
    const card=chooseCard(deck.cards,memory,deck.id===this.current?.deck.id?this.current.card.id:undefined,random)!;
    this.current={deck,card};memory?.shown(card.id);
    this.sessions.get(deck.id)!.select(random);
    return this.current;
  }
  get activity(){return this.current?this.sessions.get(this.current.deck.id)?.current:undefined;}
  reroll(random=Math.random){if(this.current)this.sessions.get(this.current.deck.id)?.reroll(random);return this.activity;}
}
