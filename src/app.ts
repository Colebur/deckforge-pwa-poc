import { importLines, lookup, Round, type Deck, type Library } from './model.js';
import { load, save } from './storage.js';
import { AudioProbe } from './audio.js';
import { Sensors } from './sensors.js';
const app = document.querySelector<HTMLElement>('#app')!;
const notice = document.querySelector<HTMLElement>('#notice')!;
const audio = new AudioProbe();
const sensors = new Sensors();
let library: Library;
let route = 'library';
let selected = '';
let lookupIndex: number | null = null;
let round: Round | undefined;
let cardPage = 0;
let editingCard: string | undefined;
let saving = false;
let offline = 'Offline setup pending';
let storageMode = 'Not checked';
let loopForRound = false;
let showCountdown = false;
const esc = (text: string): string => text.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const deck = (): Deck | undefined => library.decks.find(d=>d.id===selected);
const uid = (): string => crypto.randomUUID();
function say(message: string): void { notice.textContent=message; }
function button(action: string, text: string, cls=''): string { return `<button data-action="${action}" class="${cls}">${text}</button>`; }
function picker(): string {
  const playable=library.decks.filter(d=>d.cards.length);
  if(!playable.length) return '<p class="empty">Create a deck and add some cards in Decks first.</p>';
  if(!playable.some(d=>d.id===selected)) { selected=playable[0]!.id; lookupIndex=null; }
  return `<label for="deck-picker">Choose a deck</label><select id="deck-picker">${playable.map(d=>`<option value="${d.id}" ${d.id===selected?'selected':''}>${esc(d.name)} · ${d.cards.length} cards</option>`).join('')}</select>`;
}
function render(): void {
  document.body.classList.toggle('playing',route==='catchphrase' && !!round && round.phase!=='ended');
  document.querySelectorAll<HTMLButtonElement>('nav button').forEach(el=> {
    if(el.dataset.route===(route==='editor'?'library':route)) el.setAttribute('aria-current','page'); else el.removeAttribute('aria-current');
  });
  if(route==='library') renderLibrary();
  else if(route==='editor') renderEditor();
  else if(route==='lookup') renderLookup();
  else if(route==='catchphrase') renderCatchphrase();
  else renderLab();
}
function renderLibrary(): void {
  app.innerHTML=`<h2>Your decks</h2><p class="muted">Saved on this device. Separate from your native DeckForge decks.</p>
    <form id="new-deck" class="panel"><h3>Create a deck</h3><label for="deck-name">Deck name</label><input id="deck-name" name="name" required maxlength="120" placeholder="Celebrities, places, anything…"><p></p><button class="primary">Create Deck</button></form>
    ${library.decks.length ? library.decks.map(d=>`<button class="deck" data-deck="${d.id}"><span><strong>${esc(d.name)}</strong><small>${d.cards.length} cards</small></span><span class="arrow">↗</span></button>`).join('') : '<p class="empty">Your first deck starts here. Paste a list or add cards one at a time.</p>'}`;
}
function renderEditor(): void {
  const d=deck(); if(!d) { route='library'; render(); return; }
  const editable = d.cards.find(c=>c.id===editingCard);
  const pages=Math.max(1,Math.ceil(d.cards.length/50)); cardPage=Math.min(cardPage,pages-1);
  app.innerHTML=`${button('back','← All Decks')}<div class="panel"><h2>${esc(d.name)}</h2><p class="muted">${d.cards.length} cards · deck order defines lookup numbers.</p>
    <form id="rename"><label for="rename-name">Deck name</label><div class="row"><input id="rename-name" name="name" value="${esc(d.name)}" required maxlength="120"><button class="narrow">Rename</button></div></form><p></p>${button('delete-deck','Delete Deck','danger')}</div>
    <form id="card-form" class="panel"><h3>${editable?'Edit card':'Add a card'}</h3><label for="card-text">Word or prompt</label><textarea id="card-text" name="text" required>${editable?esc(editable.text):''}</textarea><p></p><div class="row"><button class="primary">${editable?'Save Card':'Add Card'}</button>${editable?button('cancel-edit','Cancel'):''}</div></form>
    <form id="bulk-form" class="panel"><h3>Bulk paste</h3><p class="muted">One card per non-empty line. Simple “1.”, “2)”, “-”, and “•” prefixes are removed. Duplicates stay.</p><label for="bulk-text">Your list</label><textarea id="bulk-text" name="text" placeholder="1. Beyoncé&#10;2. Taylor Swift&#10;• Keanu Reeves"></textarea><p id="bulk-count" class="muted">0 cards ready</p><button class="primary">Import Cards</button></form>
    <section class="panel"><h3>Cards in order</h3>${d.cards.slice(cardPage*50,cardPage*50+50).map((c,i)=>`<div class="card-row"><span class="number">${cardPage*50+i+1}</span><button class="card-text" data-edit="${c.id}">${esc(c.text)}</button><button class="danger" data-delete="${c.id}" aria-label="Delete card ${cardPage*50+i+1}">Delete</button></div>`).join('') || '<p class="muted">No cards yet.</p>'}
    ${pages>1?`<p class="muted">Page ${cardPage+1} of ${pages}</p><div class="row"><button data-action="page-prev" ${cardPage===0?'disabled':''}>Previous 50</button><button data-action="page-next" ${cardPage===pages-1?'disabled':''}>Next 50</button></div>`:''}</section>`;
}
function renderLookup(): void {
  const choose=picker(); const d=deck();
  app.innerHTML=`<h2>Numbered Lookup</h2><p class="muted">The same number always shows the same card in this deck.</p><section class="panel">${choose}</section>${d?.cards.length?`
    <form id="lookup-form" class="panel"><label for="item-number">Item number · 1–${d.cards.length}</label><div class="row"><input id="item-number" name="number" type="text" inputmode="numeric" pattern="[0-9]+" value="${lookupIndex===null?'':lookupIndex+1}" required><button class="narrow primary">Show</button></div></form>
    <div class="panel"><span class="tag">${lookupIndex===null?'Choose a number':`Card ${lookupIndex+1} of ${d.cards.length}`}</span><div class="prompt">${lookupIndex===null?'Ready when you are':esc(d.cards[lookupIndex]?.text ?? '')}</div><div class="row">${button('lookup-prev','Previous')}${button('lookup-next','Next')}${button('lookup-random','Random')}</div></div>`:''}`;
}
function renderCatchphrase(): void {
  if(!round) {
    const choose=picker();
    app.innerHTML=`<h2>Catchphrase</h2><p class="muted">A small game test: Got It earns one point; Pass moves on. Cards are shuffled and reused after the whole deck.</p><form id="round-form" class="panel">${choose}${deck()?.cards.length?`
      <label for="duration">Round length</label><select id="duration" name="duration">${[5,30,60,90,120,180,300].map(s=>`<option value="${s}" ${s===library.duration?'selected':''}>${s===5?'5 seconds · quick test':`${s} seconds`}</option>`).join('')}</select>
      <label class="check"><input type="checkbox" id="round-loop" ${loopForRound?'checked':''}> Play an audio loop during the round</label><label class="check"><input type="checkbox" id="show-countdown" ${showCountdown?'checked':''}> Show countdown for testing</label><p class="muted">Leaving the app pauses the round. Use Test Lab for background-audio experiments.</p><button class="primary">Start Round</button>`:''}</form>`;
    return;
  }
  const ended=round.phase==='ended', paused=round.phase==='paused';
  app.innerHTML=`<h2>Catchphrase</h2><section class="panel"><div class="row"><span class="tag">${ended?'Round complete':paused?'Paused':'Round in progress'}</span><span class="stat">Score ${round.score}</span><span id="remaining" class="narrow">${showCountdown?`${Math.ceil(round.remaining/1000)}s`:''}</span></div>
    <div class="prompt" aria-live="polite">${ended?'Time’s up!':paused?'Ready to resume?':esc(round.current.text)}</div>
    ${ended?`<p class="muted">${round.score} correct · ${round.passed} passed</p>${button('new-round','Set Up Another Round','primary')}`:paused?`<div class="actions">${button('resume','Resume','primary')}${button('end-round','End Round')}</div>`:`<div class="actions">${button('got-it','Got It','primary')}${button('pass','Pass')}</div><p></p><div class="row">${button('pause','Pause')}${button('end-round','End Round')}</div>`}</section>`;
}
function metric(label: string, value: string, id=''): string { return `<div class="metric"><strong>${label}</strong><span ${id?`id="${id}"`:''}>${esc(value)}</span></div>`; }
function renderLab(): void {
  const standalone=matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & {standalone?:boolean}).standalone;
  app.innerHTML=`<h2>iPhone test lab</h2><p class="muted">Test from the Home Screen app, then repeat offline. These controls measure support; your eyes and ears confirm the experience.</p>
    <section class="panel"><h3>Install & offline</h3>${metric('Launch mode',standalone?'Standalone Home Screen app':'Browser tab · install from Safari')}${metric('Secure connection',window.isSecureContext?'Yes':'No · use HTTPS on iPhone')}${metric('App files',offline,'lab-offline')}${metric('Network hint',navigator.onLine?'Online · hint only':'Offline · hint only','lab-network')}<p class="muted">After “Ready”, enable Airplane Mode, turn Wi-Fi off, close this app, and reopen from its icon. Play both games. An online/offline badge alone is not proof.</p>${button('reload','Reload to Test Offline')}<p></p>${button('media-range','Check Audio Cache')}</section>
    <section class="panel"><h3>Storage survives reopening</h3>${metric('Saved test marker',library.probe ?? 'No marker saved yet','probe')}${metric('Persistence protection',storageMode,'storage-mode')}<p class="muted">Save a marker, fully close the Home Screen app, then reopen. The exact marker and your decks should remain.</p><div class="row">${button('save-probe','Save Test Marker','primary')}${button('storage','Check / Request Persistence')}</div><p></p>${button('backup','Download POC Deck Backup')}<p class="muted">This experimental backup is separate from native DeckForge’s backup format.</p></section>
    <section class="panel"><h3>Motion & orientation</h3>${metric('Permission / sensor status',sensors.status,'sensor-status')}${metric('Readings',sensors.angles,'angles')}${metric('Acceleration including gravity',sensors.gravity,'gravity')}${metric('Events / rate / freshness','Not listening','sensor-count')}<div class="row">${button('sensors','Enable Sensors','primary')}${button('stop-sensors','Stop Sensors')}</div><p class="muted">Allow permission, turn sideways both ways, then tip the screen up and down. Values should change smoothly. Repeat after closing/reopening and after leaving the app. No Heads Up scoring is implemented.</p></section>
    <section class="panel"><h3>Audio & background loop</h3><div class="row">${button('tone','Play Soft Tone','primary')}${button('start-loop','Start Loop')}${button('stop-audio','Stop Audio')}</div><label class="check"><input type="checkbox" id="background-audio" ${audio.keepInBackground?'checked':''}> Keep the loop requested when hidden (test only)</label>${metric('Loop state','Not started','audio-status')}<p class="muted">Start the loop with a tap. Listen for 30 seconds during a round. To test background behavior, enable the option, switch apps or lock the phone, then return. Note any interruption; “playing” does not prove audible sound.</p><pre id="audio-events">No audio events yet.</pre></section>
    <section class="panel"><h3>Haptic / vibration</h3>${metric('Vibration API',typeof navigator.vibrate === 'function'?'Available · feeling it is the real test':'Unavailable in this browser')}${button('vibrate','Test Vibration')}<p class="muted">Unavailable vibration is a platform limitation, not a deck-game failure.</p></section>`;
  updateLab();
}
async function mutate(change: (next: Library)=>void): Promise<void> {
  if(saving) throw new Error('A save is in progress. Try again in a moment.');
  saving=true;
  try {
    const next=structuredClone(library); change(next);
    await save(next); library=next; render();
  } finally { saving=false; }
}
async function action(name: string): Promise<void> {
  const d=deck();
  switch(name) {
    case 'back': editingCard=undefined; route='library'; render(); break;
    case 'delete-deck': if(d && confirm(`Delete “${d.name}” and its ${d.cards.length} cards?`)) { await mutate(next=>{next.decks=next.decks.filter(x=>x.id!==d.id);}); selected=''; route='library'; render(); say('Deck deleted.'); } break;
    case 'cancel-edit': editingCard=undefined; render(); break;
    case 'page-prev': cardPage--; render(); break;
    case 'page-next': cardPage++; render(); break;
    case 'lookup-prev': if(d?.cards.length) { lookupIndex=lookupIndex===null?0:Math.max(0,lookupIndex-1); render(); } break;
    case 'lookup-next': if(d?.cards.length) { lookupIndex=lookupIndex===null?0:Math.min(d.cards.length-1,lookupIndex+1); render(); } break;
    case 'lookup-random': if(d?.cards.length) { lookupIndex=Math.floor(Math.random()*d.cards.length); render(); } break;
    case 'got-it': case 'pass': checkRound(); if(round?.answer(name==='got-it',performance.now())) { render(); } else checkRound(); break;
    case 'pause': round?.pause(performance.now()); audio.stop(); render(); break;
    case 'resume': if(loopForRound) void audio.startLoop().catch(audioError); round?.resume(performance.now()); render(); break;
    case 'end-round': if(confirm('End this round?')) { if(round) round.phase='ended'; audio.stop(); render(); } break;
    case 'new-round': round=undefined; render(); break;
    case 'reload': if(round?.phase==='running' && !confirm('Reload and end the current round?')) return; location.reload(); break;
    case 'media-range': {
      const response=await fetch('./tone.wav',{headers:{Range:'bytes=0-1'}});
      const bytes=await response.arrayBuffer();
      if(response.status!==206 || bytes.byteLength!==2) throw new Error('Audio byte-range check failed. Reopen online to update the app, then retry.');
      say('Audio cache check passed: requested two bytes and received HTTP 206 with exactly two bytes. Repeat this while offline.'); break;
    }
    case 'save-probe': await mutate(next=>{next.probe=`Saved ${new Date().toLocaleString()} · ${uid().slice(0,8)}`;}); say('Marker saved. Close and reopen the installed app to check it.'); break;
    case 'storage': {
      if(!navigator.storage?.persisted) { storageMode='Storage persistence API unavailable.'; render(); break; }
      const result=await navigator.storage.persisted() || await navigator.storage.persist();
      const size=await navigator.storage.estimate();
      storageMode=`${result?'Persistent mode granted':'Best-effort only · not guaranteed'} · ${Math.round((size.usage ?? 0)/1024)} KB used`;
      render(); break;
    }
    case 'backup': {
      const blob=new Blob([JSON.stringify({format:'deckforge-pwa-poc-v1',...library},null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='DeckForge-POC-backup.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),60000); break;
    }
    case 'sensors': await sensors.start(); updateLab(); break;
    case 'stop-sensors': sensors.stop(); updateLab(); break;
    case 'tone': await audio.playTone(); updateLab(); say('Tone playback requested. Confirm you hear it.'); break;
    case 'start-loop': await audio.startLoop(); updateLab(); break;
    case 'stop-audio': audio.stop(); updateLab(); break;
    case 'vibrate': say(typeof navigator.vibrate==='function' ? `Vibration request ${navigator.vibrate([100,60,100])?'accepted':'rejected'}. Did you feel it?` : 'Vibration API unavailable on this browser.'); break;
  }
}
function audioError(error: unknown): void { audio.log(`Playback failed: ${String(error)}`); say('Audio was blocked or interrupted. Tap Play Soft Tone or Start Loop to retry.'); }
async function submit(form: HTMLFormElement): Promise<void> {
  const data=new FormData(form), text=String(data.get('text') ?? '').trim(), name=String(data.get('name') ?? '').trim();
  const d=deck();
  switch(form.id) {
    case 'new-deck': if(!name) throw new Error('Enter a deck name.'); {
      const id=uid(); await mutate(next=>next.decks.push({id,name,cards:[]})); selected=id; route='editor'; cardPage=0; render(); say('Deck saved. Now add cards or paste a list.'); break;
    }
    case 'rename': if(!name) throw new Error('Enter a deck name.'); if(d) await mutate(next=>{next.decks.find(x=>x.id===d.id)!.name=name;}); say('Deck renamed and saved.'); break;
    case 'card-form': if(!text) throw new Error('Enter a word or prompt.'); if(d) {
      await mutate(next=> {
        const target=next.decks.find(x=>x.id===d.id)!;
        if(editingCard) target.cards.find(c=>c.id===editingCard)!.text=text;
        else target.cards.push({id:uid(),text});
      }); editingCard=undefined; render(); say('Card saved.'); break;
    } break;
    case 'bulk-form': {
      const lines=importLines(String(data.get('text') ?? ''));
      if(!lines.length) throw new Error('Paste at least one non-empty line.');
      if(d) await mutate(next=>next.decks.find(x=>x.id===d.id)!.cards.push(...lines.map(text=>({id:uid(),text}))));
      say(`${lines.length} cards imported and saved.`); break;
    }
    case 'lookup-form': if(d) { lookupIndex=lookup(d.cards,String(data.get('number'))); render(); say(''); } break;
    case 'round-form': if(d) {
      const duration=Number(data.get('duration'));
      loopForRound=document.querySelector<HTMLInputElement>('#round-loop')!.checked;
      showCountdown=document.querySelector<HTMLInputElement>('#show-countdown')!.checked;
      // Start playback while still in the user's tap, before waiting for storage.
      if(loopForRound) void audio.startLoop().catch(audioError);
      void audio.playTone().catch(audioError);
      await mutate(next=>{next.duration=duration;});
      round=new Round(d.cards,duration,performance.now()); render(); say(''); break;
    }
  }
}
app.addEventListener('submit',event=> {
  event.preventDefault(); if(event.target instanceof HTMLFormElement) void submit(event.target).catch(error=>say(`Could not complete action: ${String(error)}`));
});
app.addEventListener('input',event=> {
  if(event.target instanceof HTMLTextAreaElement && event.target.id==='bulk-text')
    document.querySelector('#bulk-count')!.textContent=`${importLines(event.target.value).length} cards ready`;
});
app.addEventListener('change',event=> {
  const el=event.target;
  if(el instanceof HTMLSelectElement && el.id==='deck-picker') { selected=el.value; lookupIndex=null; render(); }
  if(el instanceof HTMLInputElement && el.id==='background-audio') audio.keepInBackground=el.checked;
});
app.addEventListener('click',event=> {
  const el=(event.target as HTMLElement).closest<HTMLButtonElement>('button'); if(!el) return;
  if(el.dataset.deck) { selected=el.dataset.deck; cardPage=0; editingCard=undefined; route='editor'; render(); }
  else if(el.dataset.edit) { editingCard=el.dataset.edit; render(); document.querySelector('#card-form')?.scrollIntoView({block:'start',behavior:'smooth'}); }
  else if(el.dataset.delete) {
    const id=el.dataset.delete, d=deck();
    if(d && confirm('Delete this card?')) void mutate(next=>{const target=next.decks.find(x=>x.id===d.id)!; target.cards=target.cards.filter(c=>c.id!==id);}).catch(error=>say(`Card was not saved: ${String(error)}`));
  }
  else if(el.dataset.action) void action(el.dataset.action).catch(error=>say(`Could not complete action: ${String(error)}`));
});
document.querySelector('nav')!.addEventListener('click',event=> {
  const el=(event.target as HTMLElement).closest<HTMLButtonElement>('button'); if(!el?.dataset.route) return;
  if(round && round.phase!=='ended' && !confirm('Leave and end the current round?')) return;
  round=undefined; audio.stop(); sensors.stop(); editingCard=undefined; lookupIndex=null; route=el.dataset.route; say(''); render();
});
function checkRound(): void {
  if(!round) return;
  const previous=round.phase; round.tick(performance.now());
  if(previous==='running' && round.phase==='ended') { void audio.expiry().catch(audioError); render(); }
  const remaining=document.querySelector('#remaining'); if(remaining && showCountdown) remaining.textContent=`${Math.ceil(round.remaining/1000)}s`;
}
function updateLab(): void {
  if(route!=='lab') return;
  const set=(id:string,text:string):void=> { const el=document.getElementById(id); if(el) el.textContent=text; };
  set('lab-offline',offline); set('lab-network',navigator.onLine?'Online · hint only':'Offline · hint only');
  set('sensor-status',sensors.status); set('angles',sensors.angles); set('gravity',sensors.gravity);
  const elapsed=Math.max(0.001,(performance.now()-sensors.startedAt)/1000);
  set('sensor-count',`Orientation ${sensors.validOrientation}/${sensors.orientationCount} usable · motion ${sensors.validMotion}/${sensors.motionCount} usable · ${sensors.active?(sensors.motionCount/elapsed).toFixed(1):'0'} motion events/s · last usable ${sensors.lastAt?((performance.now()-sensors.lastAt)/1000).toFixed(1)+'s ago':'none'}`);
  set('audio-status',`${audio.loop.paused?'Paused / stopped':'Playback requested'} · position ${audio.loop.currentTime.toFixed(1)}s · loop ${audio.loop.loop?'on':'off'}`);
  set('audio-events',audio.events.join('\n') || 'No audio events yet.');
}
window.setInterval(()=>{checkRound();updateLab();},250);
document.addEventListener('visibilitychange',()=> {
  audio.log(`App ${document.hidden?'hidden':'visible'}`);
  if(document.hidden) {
    if(round?.phase==='running') { round.pause(performance.now()); say('Round paused when the app left the screen. Tap Resume to continue.'); render(); }
    sensors.stop();
    if(!audio.keepInBackground) audio.stop();
  }
});
window.addEventListener('pagehide',()=> { sensors.stop(); if(!audio.keepInBackground) audio.stop(); });
function connection(): void { document.querySelector('#connection')!.textContent=navigator.onLine?'Online':'Offline'; updateLab(); }
window.addEventListener('online',connection); window.addEventListener('offline',connection); connection();
async function setupOffline(): Promise<void> {
  const status=document.querySelector('#offline-status')!;
  if(!window.isSecureContext || !('serviceWorker' in navigator)) { offline='Unavailable · HTTPS is required'; status.textContent=offline; return; }
  try {
    const registration=await navigator.serviceWorker.register('./sw.js', {type:'module'});
    await navigator.serviceWorker.ready;
    // Ready means the worker has finished its all-assets install; claim then controls this page.
    const mark=():void=> { offline=navigator.serviceWorker.controller?'Ready · cached for offline use':'Installed · reopen to enable offline'; status.textContent=offline; updateLab(); };
    navigator.serviceWorker.addEventListener('controllerchange',mark); mark();
    if(registration.waiting) { offline='Offline ready · update waiting; close all app windows to apply'; status.textContent=offline; }
  } catch(error) { offline='Offline setup failed · reopen online'; status.textContent=offline; say(`Offline setup: ${String(error)}`); }
}
try { library=await load(); render(); void setupOffline(); }
catch(error) { app.innerHTML='<h2>Local storage could not open</h2><p>Your saved decks were not replaced. Reopen in a normal Safari window or the Home Screen app, then try again.</p>'; say(String(error)); }
