import test from 'node:test';
import assert from 'node:assert/strict';
import {TeamGame,HeadbandsRound} from '../dist/games.js';
import {catchphraseEnd,headsUpEnd} from '../dist/round-end.js';
import {MODES,metadata} from '../dist/modes.js';
const cards=[{id:'a',text:'<script>word</script>'},{id:'b',text:'Second'}];
test('Catchphrase result exposes scores before and after a single award, then next round resets the decision',()=>{
 const game=new TeamGame(cards,['<Team A>','Team B'],15),round=game.start(0);round.tick(15000);
 let html=catchphraseEnd(game,round);assert.match(html,/Time’s up!/);assert.match(html,/&lt;Team A&gt;/);assert.match(html,/data-action="award-0"/);assert.match(html,/0 points/);assert.doesNotMatch(html,/data-action="next-team-round"/);
 assert.equal(game.award(0),true);assert.equal(game.award(0),false);html=catchphraseEnd(game,round);
 assert.match(html,/1 point/);assert.match(html,/data-action="next-team-round"/);assert.match(html,/settled-team" disabled/);
 game.start(16000).tick(31000);assert.equal(game.award(null),true);assert.deepEqual(game.scores,[1,0]);
});
test('eight team scores are retained and review content is safely escaped',()=>{
 const game=new TeamGame(cards,Array.from({length:8},(_,i)=>'Team '+(i+1)),15),round=game.start(0);round.phase='ended';
 const html=catchphraseEnd(game,round);assert.equal((html.match(/data-action="award-\d"/g)||[]).length,8);assert.match(html,/--team-columns:4/);assert.doesNotMatch(html,/<script>/);
});
test('Heads Up primary screen contains replay before expandable review and preserves result counts',()=>{
 const round=new HeadbandsRound(cards,15,0);round.answer(true,100);round.tick(15000);
 const html=headsUpEnd(round);assert.match(html,/1 correct · 0 passed · 1 unanswered/);assert.ok(html.indexOf('data-action="head-replay"')<html.indexOf('<details'));assert.doesNotMatch(html,/<script>/);
 assert.equal(MODES.find(m=>m.id==='headbands').title,'Heads Up');
 assert.ok(metadata(undefined,undefined,'regular').compatibleModes.includes('headbands'));
});
