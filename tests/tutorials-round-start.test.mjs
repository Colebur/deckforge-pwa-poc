import test from 'node:test';import assert from 'node:assert/strict';
import {RoundStart} from '../dist/round-start.js';
import {TeamGame} from '../dist/games.js';import {TabooGame} from '../dist/taboo.js';import {tabooEnd} from '../dist/round-end.js';
import {welcomePages,deckPages,modePages} from '../dist/tutorials.js';import {MODES} from '../dist/modes.js';
test('preparation is three seconds; actual game start retains the entire round duration',()=>{
 const prep=new RoundStart(100);assert.equal(prep.seconds(100),3);assert.equal(prep.seconds(1100),2);assert.equal(prep.seconds(2100),1);assert.equal(prep.ready(3099),false);assert.equal(prep.ready(3100),true);
 const match=new TeamGame([{id:'a',text:'Apple'}],['A','B'],60);assert.equal(match.round,undefined);
 const game=match.start(3100);assert.equal(game.remaining,60000);assert.equal(game.deadline,63100);
});
test('Taboo settles once and keeps next round before expanded review',()=>{
 const match=new TabooGame([{id:'a',text:'<apple>',forbidden:['fruit','red','tree','pie','seed']}],['Team <A>','Team B'],60);const round=match.start(0);round.answer('Correct',10);match.settle();match.settle();assert.equal(match.scores[0],1);
 const html=tabooEnd(match,round);assert.match(html,/Next Round: Team B/);assert.ok(html.indexOf('taboo-next-round')<html.indexOf('Review round cards'));assert.match(html,/Team &lt;A&gt;/);assert.match(html,/&lt;apple&gt;/);
 const next=match.start(3010);assert.equal(next.remaining,60000);assert.equal(match.teamIndex,1);assert.equal(match.scores[0],1);
});
test('guides cover current modes, richer formats and local/offline behavior',()=>{
 assert.equal(welcomePages.length,3);assert.equal(deckPages.length,3);for(const mode of MODES)assert.ok(modePages[mode.id]?.length);
 const content=welcomePages.map(p=>p.body).join('');assert.match(content,/\{card\}/);assert.match(content,/internet connection/);assert.match(content,/Game Deck editor/);
 assert.equal(MODES.find(m=>m.id==='prompts').title,'Wild Card');assert.equal(MODES.find(m=>m.id==='prompts').detail,'Draw randomly from any decks for charades, Pictionary, 20 Questions, conversation starters, and more.');
});
