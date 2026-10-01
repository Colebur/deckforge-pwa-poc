import {importLines,shuffled,type TabooCard} from './model.js';
import {teamNames,roundSeconds} from './games.js';
export function validateTabooCard(text:unknown, forbidden:unknown):{text:string;forbidden:string[]} {
  if(typeof text!=='string'||!text.trim()||!Array.isArray(forbidden)||forbidden.length!==5||!forbidden.every(w=>typeof w==='string'&&w.trim()))throw new Error('Each Taboo card needs an answer and five forbidden words.');
  return {text,forbidden:[...forbidden]};
}
export function importTaboo(input:string):{text:string;forbidden:string[]}[] {
  const lines=importLines(input);
  if(!lines.length)throw new Error('Paste at least one card.');
  return lines.map((line,i)=>{const parts=line.split('|').map(w=>w.trim());if(parts.length!==6)throw new Error(`Line ${i+1}: use Answer | Word 1 | Word 2 | Word 3 | Word 4 | Word 5.`);try{return validateTabooCard(parts[0],parts.slice(1));}catch{throw new Error(`Line ${i+1}: fill in the answer and all five forbidden words.`);}});
}
export type TabooOutcome='Correct'|'Passed'|'Taboo';
export class TabooRound {
  phase:'running'|'paused'|'ended'='running';
  remaining:number;deadline:number;current:TabooCard;
  readonly results:{card:TabooCard;outcome:TabooOutcome}[]=[];
  reason:'time'|'complete'|'manual'|undefined;
  private bag:TabooCard[];
  constructor(cards:readonly TabooCard[],seconds:number,now:number){
    if(!cards.length)throw new Error('Add Taboo cards first.');
    if(!Number.isFinite(seconds)||seconds<5||seconds>300)throw new Error('Invalid round length.');
    this.bag=shuffled(cards.map(c=>({id:c.id,...validateTabooCard(c.text,c.forbidden)})));this.current=this.bag.pop()!;this.remaining=seconds*1000;this.deadline=now+this.remaining;
  }
  get score():number{return this.results.reduce((n,r)=>n+(r.outcome==='Correct'?1:r.outcome==='Taboo'?-1:0),0);}
  tick(now:number):void{if(this.phase!=='running')return;this.remaining=Math.max(0,this.deadline-now);if(!this.remaining){this.phase='ended';this.reason='time';}}
  answer(outcome:TabooOutcome,now:number):boolean{this.tick(now);if(this.phase!=='running')return false;this.results.push({card:this.current,outcome});if(this.bag.length)this.current=this.bag.pop()!;else{this.phase='ended';this.reason='complete';}return true;}
  pause(now:number):void{this.tick(now);if(this.phase==='running')this.phase='paused';}
  resume(now:number):void{if(this.phase==='paused'){this.deadline=now+this.remaining;this.phase='running';}}
  end():void{if(this.phase!=='ended'){this.phase='ended';this.reason='manual';}}
}
export class TabooGame {
  readonly teams:string[];readonly scores:number[];round?:TabooRound;number=0;scored=false;
  constructor(readonly cards:readonly TabooCard[],names:string[],readonly duration:number){this.teams=teamNames(names);this.scores=this.teams.map(()=>0);roundSeconds(duration);}
  get teamIndex():number{return (Math.max(1,this.number)-1)%this.teams.length;}
  settle():void{if(this.round?.phase==='ended'&&!this.scored){this.scores[this.teamIndex]!+=this.round.score;this.scored=true;}}
  start(now:number,random=Math.random):TabooRound{if(this.round?.phase!=='ended'&&this.round)throw new Error('End this round first.');this.settle();this.round=new TabooRound(this.cards,roundSeconds(this.duration,random),now);this.number++;this.scored=false;return this.round;}
}
