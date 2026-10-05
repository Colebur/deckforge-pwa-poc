import test from 'node:test';
import assert from 'node:assert/strict';
import {mobilePlatform,shouldOfferSafety,safetyInstructions} from '../dist/device-safety.js';
test('mobile detection includes desktop-mode iPads without mistaking Macs for iPads',()=>{
  assert.equal(mobilePlatform('Mozilla iPhone'), 'ios');
  assert.equal(mobilePlatform('Mozilla iPad'), 'ios');
  assert.equal(mobilePlatform('Mozilla Macintosh',5), 'ios');
  assert.equal(mobilePlatform('Mozilla Macintosh',0), 'other');
  assert.equal(mobilePlatform('Mozilla Android'), 'android');
  assert.equal(mobilePlatform('Windows'), 'other');
});
test('first-run tutorial is limited to unseen mobile Work entries',()=>{
  for(const platform of ['ios','android','other'])for(const section of ['play','work','decks','link'])for(const seen of [true,false]){
    assert.equal(shouldOfferSafety(platform,section,seen),platform!=='other'&&section==='work'&&!seen);
  }
});
test('instructions are platform-specific, include authentication, and preserve motion controls',()=>{
  const ios=safetyInstructions('ios'),android=safetyInstructions('android');
  assert.match(ios,/Guided Access/);assert.match(ios,/Face ID/);assert.match(ios,/Motion enabled/);
  assert.match(android,/Screen Pinning/);assert.match(android,/vary by manufacturer/);assert.match(android,/password/);
  assert.doesNotMatch(android,/Settings → Accessibility/);
  assert.match(safetyInstructions('other'),/shared computers/);
});
