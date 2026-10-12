import test from 'node:test';import assert from 'node:assert/strict';
import {validateActivity,parseActivities,exportActivities,mergeActivities,filterActivities,emptyActivityFilters,surpriseActivity,decodeActivities} from '../dist/activity-library.js';
const a=validateActivity({id:'a',title:'Tower',description:'Build together.',tags:['STEM'],minAge:5,maxAge:12,duration:15});
test('activities preserve metadata and roundtrip',()=>{assert.deepEqual(parseActivities(exportActivities([a])).items,[a]);assert.deepEqual(decodeActivities(undefined),[]);});
test('bad imports are reported without removing good rows',()=>{const p=parseActivities(JSON.stringify([a,{title:'Missing'}]));assert.equal(p.items.length,1);assert.equal(p.problems.length,1);assert.throws(()=>parseActivities('bad'));assert.throws(()=>validateActivity({...a,minAge:20,maxAge:10}));});
test('imports skip duplicates and retain current IDs/favorites',()=>{const p=mergeActivities([{...a,favorite:true}],[a,{...a,title:'Other'}],()=> 'new');assert.equal(p.skipped,1);assert.equal(p.items[0].id,'a');assert.equal(p.items[1].id,'new');});
test('filters combine and unspecified ages do not promise suitability',()=>{const f=emptyActivityFilters();f.search='stem';f.age='7';f.duration='15';assert.equal(filterActivities([a],f).length,1);f.age='14';assert.equal(filterActivities([a],f).length,0);});
test('surprise avoids immediate repeat and handles empty/single pools',()=>{assert.equal(surpriseActivity([]),undefined);assert.equal(surpriseActivity([a],'a').id,'a');assert.equal(surpriseActivity([a,{...a,id:'b'}],'a',()=>0).id,'b');});
import {activityLabelOptions,reviewActivityImport,applyActivityImport} from '../dist/activity-library.js';
test('labels group case and whitespace; unordered labels remain exact duplicates',()=>{
 assert.deepEqual(activityLabelOptions([' Pairs ','pairs','PAIRS','small   groups']),['pairs','small groups']);
 const base=validateActivity({...a,tags:['STEM','creative']});
 const changed=validateActivity({...base,tags:['Creative','stem']});assert.equal(mergeActivities([base],[changed]).skipped,1);
});
test('multi-select requires every selected purpose/tag and unknown values are opt-in',()=>{
 const base=validateActivity({...a,purposes:['cooperation','rapport'],materials:'None'}),f=emptyActivityFilters();f.purpose=['cooperation','rapport'];f.tag=['STEM'];f.noMaterials=true;assert.equal(filterActivities([base],f).length,1);
 f.purpose.push('communication');assert.equal(filterActivities([base],f).length,0);f.purpose=[];
 const unknown=validateActivity({title:'Unknown',description:'Try it',tags:['STEM'],materials:''});f.age='7';f.duration='15';f.noMaterials=false;assert.equal(filterActivities([unknown],f).length,0);f.includeUnknown=true;assert.equal(filterActivities([unknown],f).length,1);f.noMaterials=true;assert.equal(filterActivities([unknown],f).length,0);
});
test('import flags same titles; default skips, explicit update preserves ID and favorite',()=>{
 const current=[{...a,favorite:true}],incoming=[{...a,id:'external',description:'Revised instructions'}];
 const review=reviewActivityImport(current,incoming);assert.equal(review[0].exact,false);assert.equal(review[0].matches.length,1);
 assert.equal(applyActivityImport(current,incoming,{}).skipped,1);
 const updated=applyActivityImport(current,incoming,{0:{action:'update',target:'a'}});assert.equal(updated.updated,1);assert.equal(updated.items[0].id,'a');assert.equal(updated.items[0].favorite,true);assert.equal(updated.items[0].description,'Revised instructions');assert.equal(current[0].description,a.description);
 assert.equal(applyActivityImport(current,incoming,{0:{action:'both'}},()=> 'copy').items.length,2);assert.throws(()=>applyActivityImport(current,incoming,{0:{action:'update',target:'bad'}}));
});
test('same-title conflicts within an import and exact repeats are visible and conservative',()=>{
 const incoming=[a,{...a,id:'b',description:'Different'},a];const review=reviewActivityImport([],incoming);assert.equal(review[1].batchTitle,true);assert.equal(review[2].exact,true);
 const result=applyActivityImport([],incoming,{},()=> 'new');assert.equal(result.added,1);assert.equal(result.skipped,2);
});
test('two revisions cannot silently overwrite the same existing activity in one import',()=>{
 assert.throws(()=>applyActivityImport([a],[{...a,description:'First revision'},{...a,description:'Second revision'}],{0:{action:'update',target:'a'},1:{action:'update',target:'a'}}),/only one incoming version/);
});
