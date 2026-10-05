import {RandomCardBag,type DrawMemory} from './recent-cards.js';
import type {DeckMetadata} from './modes.js';
export interface Card { id: string; text: string; back?: string }
export interface Activity { id: string; text: string; createdAt: string }
export interface Deck extends DeckMetadata { id: string; name: string; emoji?: string; cards: Card[]; activities: Activity[] }
export interface TabooCard extends Card { forbidden: string[] }
export interface TabooDeck extends DeckMetadata { id: string; name: string; emoji?: string; cards: TabooCard[] }
export interface Library { tabooDecks?: TabooDeck[]; tabooDuration?: number; tabooTeams?: string[]; decks: Deck[]; duration: number; probe: string | null; teams?: string[]; headbandsDuration?: number }
export const emptyLibrary = (): Library => ({decks: [], duration: 0, probe: null});
export function importLines(input: string): string[] {
  return input.split(/\r\n|\n|\r/).map(line => line.trim()
    .replace(/^(?:\d{1,6}[.)](?:\s+|$)|[-*](?:\s+|$)|[•‣▪]\s*)/, '').trim()).filter(Boolean);
}
export function shuffled<T>(items: readonly T[], random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}
export interface PromptDraw { deck: Deck; card: Card }
// Pick a card position across the combined library, rather than picking a deck first.
// That gives cards in small and large decks the same chance, without copying them.
export function randomPrompt(decks: readonly Deck[], deckId: string | null = null, random = Math.random): PromptDraw | undefined {
  const pool = deckId === null ? decks : decks.filter(deck => deck.id === deckId);
  const count = pool.reduce((total, deck) => total + deck.cards.length, 0);
  if (!count) return undefined;
  let index = Math.floor(random() * count);
  for (const deck of pool) {
    if (index < deck.cards.length) return {deck, card: deck.cards[index]!};
    index -= deck.cards.length;
  }
  return undefined;
}
export function lookup(cards: readonly Card[], number: string): number {
  const input = number.trim();
  if (!/^\d+$/.test(input)) throw new Error('Enter a whole item number.');
  const index = Number(input) - 1;
  if (!Number.isSafeInteger(index) || index < 0 || index >= cards.length)
    throw new Error(`Choose a number from 1 to ${cards.length}.`);
  return index;
}
export class Round {
  phase: 'running' | 'paused' | 'ended' = 'running';
  readonly results: Card[] = [];
  score = 0;
  passed = 0;
  remaining: number;
  deadline: number;
  current: Card;
  private bag: RandomCardBag<Card>;
  private readonly cards: Card[];
  constructor(cards: readonly Card[], duration: number, now: number, memory?:DrawMemory) {
    if (!cards.length) throw new Error('Add cards before starting a round.');
    if (!Number.isFinite(duration) || duration < 5 || duration > 300) throw new Error('Choose 5–300 seconds.');
    this.cards = cards.map(card => ({...card}));
    this.bag=new RandomCardBag(this.cards,memory);
    this.remaining = duration * 1000;
    this.deadline = now + this.remaining;
    this.current = this.draw();
  }
  tick(now: number): void {
    if (this.phase !== 'running') return;
    this.remaining = Math.max(0, this.deadline - now);
    if (this.remaining === 0) this.phase = 'ended';
  }
  answer(correct: boolean, now: number): boolean {
    this.tick(now);
    if (this.phase !== 'running') return false;
    this.results.push({...this.current});
    if (correct) this.score++; else this.passed++;
    this.current = this.draw();
    return true;
  }
  pause(now: number): void { this.tick(now); if(this.phase==='running') this.phase='paused'; }
  resume(now: number): void { if(this.phase==='paused') { this.deadline=now+this.remaining; this.phase='running'; } }
  restart(duration: number, now: number): void {
    if(this.phase!=='ended') throw new Error('End the round first.');
    this.remaining=duration*1000;this.deadline=now+this.remaining;this.phase='running';this.results.length=0;this.score=0;this.passed=0;this.current=this.draw();
  }
  private draw(): Card {
    if (!this.bag.length) this.bag.refill();
    return this.bag.draw();
  }
}

const deckNames = new Intl.Collator(undefined, {sensitivity:'base',numeric:true});
// Sort a view, never the stored collection or the order of cards inside a deck.
export function alphabeticalDecks<T extends {name:string}>(decks:readonly T[]):T[] {
  return [...decks].sort((a,b)=>deckNames.compare(a.name,b.name));
}
