import {shuffled,type Card} from './model.js';
export type StudyDirection='front'|'back';
// Review order and flip state are session-only; stored cards and their order never change.
export class FlashcardSession {
  private cards:Card[];
  index=0;
  flipped=false;
  constructor(cards:readonly Card[],readonly direction:StudyDirection,readonly deckName:string){
    if(!cards.length)throw new Error('Add cards before studying.');
    this.cards=cards.map(c=>({...c}));
  }
  get count(){return this.cards.length;}
  get side():'front'|'back'{return (this.direction==='back')!==this.flipped?'back':'front';}
  get text(){return this.side==='front'?this.cards[this.index]!.text:this.cards[this.index]!.back?.trim()||'No back added';}
  get missingBack(){return this.side==='back'&&!this.cards[this.index]!.back?.trim();}
  flip(){this.flipped=!this.flipped;}
  move(delta:-1|1){const next=this.index+delta;if(next<0||next>=this.count)return;this.index=next;this.flipped=false;}
  shuffle(random=Math.random){this.cards=shuffled(this.cards,random);this.index=0;this.flipped=false;}
}
