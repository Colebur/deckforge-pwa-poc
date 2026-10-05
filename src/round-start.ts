// No game or card draw exists until preparation finishes.
export class RoundStart {
 readonly deadline:number;
 constructor(now:number){this.deadline=now+3000;}
 seconds(now:number):number{return Math.max(0,Math.ceil((this.deadline-now)/1000));}
 ready(now:number):boolean{return now>=this.deadline;}
}
