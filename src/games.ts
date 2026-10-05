import {RandomCardBag,type DrawMemory} from './recent-cards.js';
import {Round, type Card} from './model.js';
export const TIMER_CHOICES = [0,...Array.from({length:20},(_,i)=>(i+1)*15)];
export const defaultTeams = (): string[] => ['Team 1','Team 2'];
export function teamNames(names: string[]): string[] {
  const trimmed=names.map(n=>n.trim());
  if(trimmed.length<2 || trimmed.length>8 || trimmed.some(n=>!n) || new Set(trimmed.map(n=>n.toLocaleLowerCase())).size!==trimmed.length) throw new Error('Use 2–8 different, nonblank team names.');
  return trimmed;
}
export function roundSeconds(setting: number, random=Math.random): number {
  if(!Number.isInteger(setting) || (setting!==0 && setting!==5 && (setting<15 || setting>300))) throw new Error('Choose Random or a timer in 15-second steps.');
  return setting===0 ? 30+Math.floor(Math.min(0.999999999,Math.max(0,random()))*61) : setting;
}
export class TeamGame {
  readonly teams: string[];
  readonly scores: number[];
  number=0;
  scored=false;
  round?: Round;
  constructor(readonly cards: readonly Card[], names: string[], readonly duration: number,private memory?:DrawMemory) {
    this.teams=teamNames(names);this.scores=this.teams.map(()=>0);roundSeconds(duration);
  }
  start(now: number, random=Math.random): Round {
    if(this.round && (!this.scored || this.round.phase!=='ended')) throw new Error('Choose a team or No point before the next round.');
    const seconds=roundSeconds(this.duration,random);
    if(this.round) this.round.restart(seconds,now);
    else this.round=new Round(this.cards,seconds,now,this.memory);
    this.number++;this.scored=false;return this.round;
  }
  award(team: number | null): boolean {
    if(!this.round || this.round.phase!=='ended' || this.scored) return false;
    if(team!==null && (!Number.isInteger(team) || team<0 || team>=this.teams.length)) return false;
    if(team!==null) this.scores[team]!++;
    this.scored=true;return true;
  }
}
export type Outcome='Correct'|'Passed'|'Unanswered';
export class HeadbandsRound {
  phase: 'running'|'paused'|'ended'='running';
  remaining: number;
  deadline: number;
  current: Card;
  readonly results: {card: Card; outcome: Outcome}[]=[];
  reason: 'time'|'complete'|'manual'|undefined;
  private bag: RandomCardBag<Card>;
  constructor(cards: readonly Card[], seconds: number, now: number,memory?:DrawMemory) {
    if(!cards.length) throw new Error('Add cards first.');
    if(!Number.isFinite(seconds)||seconds<5||seconds>300)throw new Error('Invalid round length.');this.bag=new RandomCardBag(cards.map(c=>({...c})),memory);this.bag.refill();this.current=this.bag.draw();
    this.remaining=seconds*1000;this.deadline=now+this.remaining;
  }
  get score(): number {return this.results.filter(r=>r.outcome==='Correct').length;}
  get passed(): number {return this.results.filter(r=>r.outcome==='Passed').length;}
  tick(now:number): void {
    if(this.phase!=='running') return;
    this.remaining=Math.max(0,this.deadline-now);
    if(this.remaining===0){this.results.push({card:this.current,outcome:'Unanswered'});this.phase='ended';this.reason='time';}
  }
  answer(correct:boolean,now:number): boolean {
    this.tick(now);if(this.phase!=='running') return false;
    this.results.push({card:this.current,outcome:correct?'Correct':'Passed'});
    if(!this.bag.length){this.phase='ended';this.reason='complete';}else this.current=this.bag.draw();
    return true;
  }
  pause(now:number): void {this.tick(now);if(this.phase==='running')this.phase='paused';}
  resume(now:number): void {if(this.phase==='paused'){this.deadline=now+this.remaining;this.phase='running';}}
  end():void {if(this.phase!=='ended'){this.results.push({card:this.current,outcome:'Unanswered'});this.phase='ended';this.reason='manual';}}
}
