import type {Card} from './model.js';
import {answerKey,validateCards,type GameCard} from './party-content.js';
export interface QuizDeck {id:string;name:string;cards:readonly Card[]}
export interface LibraryQuiz {id:string;name:string;cards:GameCard[];missingBack:number;tooLong:number;invalid:number}
// A session adapter, not a new library or a rewrite of the original cards.
export function libraryQuiz(deck:QuizDeck):LibraryQuiz {
 const result:LibraryQuiz={id:deck.id,name:deck.name,cards:[],missingBack:0,tooLong:0,invalid:0};
 for(const card of deck.cards){
  const prompt=card.text.trim(),answer=card.back?.trim()??'';
  if(!answer){result.missingBack++;continue;}
  if(prompt.length>300||answer.length>120){result.tooLong++;continue;}
  if(!prompt||!answerKey(answer)){result.invalid++;continue;}
  result.cards.push(validateCards([{prompt,answers:[{text:answer,aliases:[],points:1}],category:deck.name.slice(0,60),points:1}],'quiz')[0]!);
 }
 return result;
}
export function libraryQuizNote(source:LibraryQuiz):string {
 return `${source.cards.length} usable question${source.cards.length===1?'':'s'} · ${source.missingBack} without a back · ${source.tooLong} over the length limits${source.invalid?' · '+source.invalid+' unusable answers':''}. Up to 25 are randomly chosen; each is worth 1 point. The original deck stays unchanged.`;
}
