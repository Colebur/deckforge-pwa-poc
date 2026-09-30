import { importLines, lookup, Round, emptyLibrary, type Deck, type Library } from './model.js';
import { load, save, recovery, type Recovery } from './storage.js';
import { exportBackup, parseBackup, restoreBackup, MAX_BACKUP_BYTES, NewerFormatError, type BackupPreview } from './backup.js';
import { CountdownCues } from './cues.js';
import { AudioProbe } from './audio.js';
import { Sensors } from './sensors.js';
const app = document.querySelector<HTMLElement>('#app')!;
const notice = document.querySelector<HTMLElement>('#notice')!;
const audio = new AudioProbe();
const sensors = new Sensors();
const cues = new CountdownCues();
let library: Library;
let route = 'home';
let selected = '';
let lookupIndex: number | null = null;
let round: Round | undefined;
let roundLength = 90000;
let cardPage = 0;
let editingCard: string | undefined;
let entry: '' | 'new-deck' | 'rename' | 'card' | 'bulk' = '';
let saving = false;
let offline = 'Preparing offline use…';
let storageMode = 'Checking protection…';
let loopForRound = false;
let showCountdown = false;
let timerSound = true;
let pendingBackup: BackupPreview | undefined;
let showBackupText=false;
let backupFilename = '';
let restoreMode: 'add' | 'replace' = 'add';
let restorePoint: Recovery | null = null;
let loadFailure = '';
let futureData = false;
const esc = (text: string): string => text.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
const deck = (): Deck | undefined => library.decks.find(d=>d.id===selected);
const uid = (): string => crypto.randomUUID();
function say(message: string): void { notice.textContent=message; }
function button(action: string, text: string, cls=''): string { return `<button type="button" data-action="${action}" class="${cls}">${text}</button>`; }
function destination(target: string, title: string, detail: string, symbol: string): string {
  return `<button class="menu-row" data-route="${target}"><span class="symbol" aria-hidden="true">${symbol}</span><span><strong>${title}</strong>${detail?`<small>${detail}</small>`:''}</span><span class="arrow" aria-hidden="true">›</span></button>`;
}
function picker(): string {
  const playable=library.decks.filter(d=>d.cards.length);
  if(!playable.length) return '<p class="empty">Add cards in Manage Decks to start playing.</p>';
  if(!playable.some(d=>d.id===selected)) { selected=playable[0]!.id; lookupIndex=null; }
  return `<label for="deck-picker">Deck</label><select id="deck-picker">${playable.map(d=>`<option value="${esc(d.id)}" ${d.id===selected?'selected':''}>${esc(d.name)} · ${d.cards.length} cards</option>`).join('')}</select>`;
}
function render(): void {
  const playing=route==='catchphrase' && !!round && round.phase!=='ended';
  document.body.classList.toggle('playing',playing);
  document.querySelector<HTMLElement>('#page-title')!.textContent=({home:'DeckForge',library:'Deck Library',editor:deck()?.name ?? 'Deck',lookup:'Numbered Lookup',catchphrase:'Catchphrase',backups:'Backups',settings:'Settings',lab:'Device Tests'} as Record<string,string>)[route] ?? 'DeckForge';
  document.querySelector<HTMLButtonElement>('#home-button')!.hidden=route==='home';
  document.querySelector<HTMLButtonElement>('#settings-button')!.hidden=route==='settings' || !!loadFailure;
  document.querySelector<HTMLElement>('footer')!.hidden=!['settings','lab'].includes(route);
  if(loadFailure && route!=='backups') { renderStorageError(); return; }
  if(route==='home') renderHome();
  else if(route==='library') renderLibrary();
  else if(route==='editor') renderEditor();
  else if(route==='lookup') renderLookup();
  else if(route==='catchphrase') renderCatchphrase();
  else if(route==='backups') renderBackups();
  else if(route==='settings') renderSettings();
  else renderLab();
}
function renderHome(): void {
  app.innerHTML=`<p class="section-label">PLAY</p><section class="list-panel">${destination('catchphrase','Catchphrase','Give clues. Guess the word. Pass the phone.','◷')}${destination('lookup','Numbered Lookup / Jenga','Find a card by its number, or pick at random.','#')}</section>
    <p class="section-label">YOUR DECKS</p><section class="list-panel">${destination('library','Manage Decks',`${library.decks.length} ${library.decks.length===1?'deck':'decks'} saved on this device`,'▱')}${destination('backups','Backups','Save a copy or restore a backup.','↥')}</section>`;
}
function renderLibrary(): void {
  app.innerHTML=`<div class="toolbar"><span class="muted">${library.decks.length} decks</span>${button('new-deck','＋ New Deck','primary')}</div>
    ${entry==='new-deck'?`<form id="new-deck" class="panel"><h2>New Deck</h2><label for="deck-name">Deck name</label><input id="deck-name" name="name" required maxlength="120" placeholder="Celebrities"><div class="form-actions"><button class="primary">Create Deck</button>${button('cancel-edit','Cancel')}</div></form>`:''}
    <section class="list-panel">${library.decks.length ? library.decks.map(d=>`<button class="menu-row" data-deck="${esc(d.id)}"><span><strong>${esc(d.name)}</strong><small>${d.cards.length} cards</small></span><span class="arrow" aria-hidden="true">›</span></button>`).join('') : '<p class="empty">Create a deck, then add cards or paste a list.</p>'}</section>`;
}
function renderEditor(): void {
  const d=deck(); if(!d) { route='library'; render(); return; }
  const editable=d.cards.find(c=>c.id===editingCard);
  const pages=Math.max(1,Math.ceil(d.cards.length/50)); cardPage=Math.min(cardPage,pages-1);
  let form='';
  if(entry==='rename') form=`<form id="rename" class="panel"><h2>Rename Deck</h2><label for="rename-name">Deck name</label><input id="rename-name" name="name" value="${esc(d.name)}" required maxlength="120"><div class="form-actions"><button class="primary">Save Name</button>${button('cancel-edit','Cancel')}</div></form>`;
  if(entry==='card') form=`<form id="card-form" class="panel"><h2>${editable?'Edit Card':'Add Card'}</h2><label for="card-text">Word or prompt</label><textarea id="card-text" name="text" required>${editable?esc(editable.text):''}</textarea><div class="form-actions"><button class="primary">${editable?'Save Card':'Add Card'}</button>${button('cancel-edit','Cancel')}${editable?button('delete-card','Delete Card','danger'):''}</div></form>`;
  if(entry==='bulk') form=`<form id="bulk-form" class="panel"><h2>Bulk Paste</h2><p class="muted">One card per line. Simple numbered and bulleted prefixes are removed.</p><label for="bulk-text">Your list</label><textarea id="bulk-text" name="text" placeholder="1. Beyoncé&#10;2. Taylor Swift&#10;• Keanu Reeves"></textarea><p id="bulk-count" class="muted">0 cards ready</p><div class="form-actions"><button class="primary">Import Cards</button>${button('cancel-edit','Cancel')}</div></form>`;
  app.innerHTML=`<div class="toolbar"><span class="muted">${d.cards.length} cards</span>${button('back','All Decks')}</div><div class="actions">${button('add-card','＋ Add Card','primary')}${button('bulk','Bulk Paste')}</div>
    ${form}<p class="section-label">CARDS IN ORDER</p><section class="list-panel">${d.cards.slice(cardPage*50,cardPage*50+50).map((c,i)=>`<button class="card-row" data-edit="${esc(c.id)}"><span class="number">${cardPage*50+i+1}</span><span class="card-text">${esc(c.text)}</span><span class="arrow" aria-hidden="true">›</span></button>`).join('') || '<p class="empty">No cards yet.</p>'}</section>
    ${pages>1?`<p class="muted">Page ${cardPage+1} of ${pages}</p><div class="actions"><button data-action="page-prev" ${cardPage===0?'disabled':''}>Previous 50</button><button data-action="page-next" ${cardPage===pages-1?'disabled':''}>Next 50</button></div>`:''}
    <details class="panel"><summary>Deck options</summary><div class="option-list">${button('rename-deck','Rename Deck')}${button('backup-deck','Back Up This Deck')}${button('delete-deck','Delete Deck','danger')}</div></details>`;
}
function renderLookup(): void {
  const choose=picker(), d=deck();
  app.innerHTML=`<section class="panel compact">${choose}</section>${d?.cards.length?`
    <form id="lookup-form" class="number-form"><label for="item-number">Card number · 1–${d.cards.length}</label><div class="row"><input id="item-number" name="number" type="text" inputmode="numeric" pattern="[0-9]+" value="${lookupIndex===null?'':lookupIndex+1}" required><button class="narrow primary">Show</button></div></form>
    <section class="panel"><span class="tag">${lookupIndex===null?'Choose a number':`Card ${lookupIndex+1} of ${d.cards.length}`}</span><div class="prompt">${lookupIndex===null?'Ready when you are':esc(d.cards[lookupIndex]?.text ?? '')}</div><div class="row"><button data-action="lookup-prev" ${lookupIndex===0?'disabled':''}>Previous</button><button data-action="lookup-next" ${lookupIndex===d.cards.length-1?'disabled':''}>Next</button>${button('lookup-random','Random')}</div></section>`:''}`;
}
function renderCatchphrase(): void {
  if(!round) {
    const choose=picker();
    const durations=[...new Set([5,30,60,90,120,180,300,library.duration])].sort((a,b)=>a-b);
    app.innerHTML=`<form id="round-form" class="panel">${choose}${deck()?.cards.length?`<label for="duration">Round length</label><select id="duration" name="duration">${durations.map(s=>`<option value="${s}" ${s===library.duration?'selected':''}>${s} seconds</option>`).join('')}</select><label class="check"><input type="checkbox" id="timer-sound" ${timerSound?'checked':''}> Timer sound</label><p class="muted">Beeps speed up as time runs out. The countdown stays hidden.</p><button class="primary full">Start Round</button>`:''}</form><details class="panel"><summary>How to play</summary><p>Give clues until the word is guessed. Got It earns a point; Pass moves on. Cards shuffle and repeat after the whole deck. Leaving the app pauses the round.</p></details>`;
    return;
  }
  const ended=round.phase==='ended', paused=round.phase==='paused';
  app.innerHTML=`<section class="game"><div class="game-status"><span class="tag">${ended?'Round complete':paused?'Paused':''}</span><span id="remaining">${showCountdown?`${Math.ceil(round.remaining/1000)}s`:''}</span></div><div class="prompt" aria-live="polite">${ended?(round.remaining===0?'Time’s up!':'Round ended'):paused?'Paused':esc(round.current.text)}</div>
    ${ended?`<p class="result">${round.score} correct · ${round.passed} passed</p>${button('new-round','Another Round','primary full')}${button('home','Home','full quiet')}`:paused?`<div class="actions">${button('resume','Resume','primary')}${button('end-round','End Round')}</div>`:`<div class="actions">${button('got-it','Got It','primary')}${button('pass','Pass')}</div><div class="game-bottom">${button('pause','Pause','quiet')}<span class="muted">${round.score} correct</span>${button('end-round','End','quiet')}</div>`}</section>`;
}
function renderBackups(): void {
  const count=library.decks.reduce((n,d)=>n+d.cards.length,0);
  const incoming=pendingBackup?.library;
  app.innerHTML=`<p class="muted">Keep a backup in Files or iCloud Drive. Decks stay on this device; GitHub does not back them up.</p>
    ${!loadFailure?`<section class="panel"><h2>Save a copy</h2><p>${library.decks.length} decks · ${count} cards</p>${button('backup','Export Backup','primary full')}<details ${showBackupText?'open':''}><summary>Copy backup text instead</summary>${button('backup-text','Show Backup Text')}${showBackupText?`<label for="backup-json">Backup JSON</label><textarea id="backup-json" readonly>${esc(exportBackup(library))}</textarea>${button('copy-backup','Copy Backup Text')}<p class="muted">Save this text in a file ending in .json. The file can be restored below.</p>`:''}</details></section>`:`<p class="error">${esc(loadFailure)}</p>`}
    <section class="panel"><h2>Restore a backup</h2><p class="muted">Choose a DeckForge JSON backup. You’ll review it before anything changes.</p><label for="backup-file" class="file-label">Choose Backup File</label><input id="backup-file" type="file" accept=".json,application/json" ${futureData?'disabled':''}>
      ${incoming?`<div class="restore-preview"><h3>Ready to import</h3><p>${esc(backupFilename)}<br>${incoming.decks.length} decks · ${incoming.decks.reduce((n,d)=>n+d.cards.length,0)} cards<br><small>${esc(pendingBackup!.source)}</small></p><details><summary>Preview decks</summary><ul>${incoming.decks.map(d=>`<li>${esc(d.name)} · ${d.cards.length} cards</li>`).join('')}</ul></details><label for="restore-mode">Import as</label><select id="restore-mode"><option value="add" ${restoreMode==='add'?'selected':''}>Add copies — keep existing decks</option><option value="replace" ${restoreMode==='replace'?'selected':''}>Replace library — save a restore point first</option></select><p class="muted">${restoreMode==='add'?'Your existing decks and timer settings stay as they are.':'Your current decks will be replaced. A local restore point lets you undo this; export a file for a separate backup.'}</p><div class="form-actions">${button('restore-backup',restoreMode==='add'?'Add Deck Copies':'Replace Library','primary')}${button('cancel-restore','Cancel')}</div></div>`:''}</section>
    ${restorePoint && !futureData?`<details class="panel"><summary>Local recovery</summary><p>Recover ${restorePoint.library.decks.length} decks${restorePoint.savedAt?` from ${esc(new Date(restorePoint.savedAt).toLocaleString())}`:' from the previous save'}. A local copy cannot protect against clearing all app data.</p>${button('recover','Review Restore Point')}</details>`:''}`;
}
function renderSettings(): void {
  app.innerHTML=`<p class="section-label">YOUR DATA</p><section class="list-panel">${destination('backups','Backups','Export a file or restore your decks.','↥')}</section>
    <section class="panel"><h2>Storage protection</h2>${metric('Protection',storageMode,'storage-mode')}<p class="muted">Protection helps prevent automatic cleanup. A saved backup file is still the safest recovery option.</p>${button('storage','Request Storage Protection')}</section>
    <section class="panel"><h2>App updates</h2>${metric('Installed version','0.2.0')}${metric('Offline & updates',offline,'settings-offline')}<p class="muted">Updates keep your decks. After an update downloads, close every window for this web app and reopen.</p>${button('check-update','Check for Update')}</section>
    <p class="section-label">EXPERIMENT</p><section class="list-panel">${destination('lab','Device Tests','Motion, audio, offline checks and vibration.','⚙')}</section><p class="muted footnote">Separate PWA experiment. Your native DeckForge app is unchanged.</p>`;
}
function renderStorageError(): void {
  app.innerHTML=`<section class="panel"><h2>Your saved data needs attention</h2><p class="error">${esc(loadFailure)}</p><p>No empty library was saved over your data.</p>${!futureData?button('backups','Open Backups','primary'):''}${button('reload','Try Reopening')}</section>`;
}
function metric(label: string, value: string, id=''): string { return `<div class="metric"><strong>${label}</strong><span ${id?`id="${id}"`:''}>${esc(value)}</span></div>`; }
function renderLab(): void {
  const standalone=matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & {standalone?:boolean}).standalone;
  app.innerHTML=`<h2>Device tests</h2><p class="muted">Test from the Home Screen app, then repeat offline. These controls measure support; your eyes and ears confirm the experience.</p>
    <details class="panel diagnostic"><summary>Install & offline</summary>${metric('Launch mode',standalone?'Standalone Home Screen app':'Browser tab · install from Safari')}${metric('Secure connection',window.isSecureContext?'Yes':'No · use HTTPS on iPhone')}${metric('App files',offline,'lab-offline')}${metric('Network hint',navigator.onLine?'Online · hint only':'Offline · hint only','lab-network')}<p class="muted">After “Ready”, enable Airplane Mode, turn Wi-Fi off, close this app, and reopen from its icon. Play both games. An online/offline badge alone is not proof.</p>${button('reload','Reload to Test Offline')}<p></p>${button('media-range','Check Audio Cache')}</details>
    <details class="panel diagnostic"><summary>Storage survives reopening</summary>${metric('Saved test marker',library.probe ?? 'No marker saved yet','probe')}${metric('Persistence protection',storageMode,'storage-mode')}<p class="muted">Save a marker, fully close the Home Screen app, then reopen. The exact marker and your decks should remain.</p><div class="row">${button('save-probe','Save Test Marker','primary')}${button('storage','Check / Request Persistence')}</div><p></p>${button('backups','Backups')}<p class="muted">Export backups and restore copies from Backups.</p></details>
    <details class="panel diagnostic"><summary>Motion & orientation</summary>${metric('Permission / sensor status',sensors.status,'sensor-status')}${metric('Readings',sensors.angles,'angles')}${metric('Acceleration including gravity',sensors.gravity,'gravity')}${metric('Events / rate / freshness','Not listening','sensor-count')}<div class="row">${button('sensors','Enable Sensors','primary')}${button('stop-sensors','Stop Sensors')}</div><p class="muted">Allow permission, turn sideways both ways, then tip the screen up and down. Values should change smoothly. Repeat after closing/reopening and after leaving the app. No Heads Up scoring is implemented.</p></details>
    <details class="panel diagnostic"><summary>Audio & background loop</summary><div class="row">${button('tone','Play Soft Tone','primary')}${button('start-loop','Start Loop')}${button('stop-audio','Stop Audio')}</div><label class="check"><input type="checkbox" id="round-loop" ${loopForRound?'checked':''}> Add test loop during Catchphrase</label><label class="check"><input type="checkbox" id="show-countdown" ${showCountdown?'checked':''}> Show countdown for testing</label><label class="check"><input type="checkbox" id="background-audio" ${audio.keepInBackground?'checked':''}> Keep the loop requested when hidden (test only)</label>${metric('Loop state','Not started','audio-status')}<p class="muted">Start the loop with a tap. Listen for 30 seconds during a round. To test background behavior, enable the option, switch apps or lock the phone, then return. Note any interruption; “playing” does not prove audible sound.</p><pre id="audio-events">No audio events yet.</pre></details>
    <details class="panel diagnostic"><summary>Haptic / vibration</summary>${metric('Vibration API',typeof navigator.vibrate === 'function'?'Available · feeling it is the real test':'Unavailable in this browser')}${button('vibrate','Test Vibration')}<p class="muted">Unavailable vibration is a platform limitation, not a deck-game failure.</p></details>`;
  updateLab();
}
async function mutate(change: (next: Library)=>void, checkpoint=false): Promise<void> {
  if(saving) throw new Error('A save is in progress. Try again in a moment.');
  saving=true;
  try {
    const next=structuredClone(library); change(next);
    await save(next,checkpoint); library=next; render();
  } finally { saving=false; }
}
function navigate(target: string): void {
  if(round && round.phase!=='ended' && !confirm('Leave and end the current round?')) return;
  round=undefined; cues.reset(); audio.stop(); sensors.stop(); entry=''; editingCard=undefined; lookupIndex=null;
  route=target; say(''); render(); window.scrollTo({top:0});
}
function openEntry(next: typeof entry): void {
  entry=next; render(); app.querySelector<HTMLElement>('input,textarea')?.focus();
}
async function downloadBackup(value: Library): Promise<void> {
  const name=`DeckForge-backup-${new Date().toISOString().slice(0,10)}.json`;
  const contents=exportBackup(value);
  const file=new File([contents],name,{type:'application/json'});
  if(navigator.canShare?.({files:[file]}) && navigator.share) {
    try { await navigator.share({files:[file],title:'DeckForge Backup'}); say('Backup shared. Keep a copy in Files or iCloud Drive.'); return; }
    catch(error) { if(error instanceof DOMException && error.name==='AbortError') return; }
    // Some embedded browsers advertise sharing but reject it. Still offer a file.
  }
  const url=URL.createObjectURL(file), a=document.createElement('a'); a.href=url; a.download=name; document.body.append(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000); say('Backup download requested. Keep the file somewhere safe.');
}
async function storageProtection(request: boolean): Promise<void> {
  try {
    if(!navigator.storage?.persisted) storageMode='Protection unavailable in this browser';
    else {
      const protectedNow=await navigator.storage.persisted() || (request && await navigator.storage.persist());
      const size=await navigator.storage.estimate();
      storageMode=`${protectedNow?'Persistent storage granted':'Standard storage · keep a backup'} · ${Math.round((size.usage ?? 0)/1024)} KB used`;
    }
  } catch { storageMode='Could not check protection · keep a backup'; }
  if(route==='settings' || route==='lab') render();
}
async function action(name: string): Promise<void> {
  const d=deck();
  switch(name) {
    case 'home': navigate('home'); break;
    case 'settings': navigate('settings'); break;
    case 'backups': restorePoint=await recovery(); navigate('backups'); break;
    case 'back': entry=''; editingCard=undefined; route='library'; render(); break;
    case 'new-deck': openEntry('new-deck'); break;
    case 'rename-deck': openEntry('rename'); break;
    case 'add-card': editingCard=undefined; openEntry('card'); break;
    case 'bulk': openEntry('bulk'); break;
    case 'delete-deck': if(d && confirm(`Delete “${d.name}” and its ${d.cards.length} cards?`)) { await mutate(next=>{next.decks=next.decks.filter(x=>x.id!==d.id);},true); restorePoint=await recovery(); selected=''; entry=''; route='library'; render(); say('Deck deleted. You can recover the library from Backups.'); } break;
    case 'delete-card': if(d && editingCard && confirm('Delete this card?')) {
      const id=editingCard; await mutate(next=>{const target=next.decks.find(x=>x.id===d.id)!;target.cards=target.cards.filter(c=>c.id!==id);},true); editingCard=undefined;entry='';restorePoint=await recovery();render();say('Card deleted. A local restore point was saved.');
    } break;
    case 'cancel-edit': editingCard=undefined; entry=''; render(); break;
    case 'page-prev': cardPage--; render(); break;
    case 'page-next': cardPage++; render(); break;
    case 'lookup-prev': if(d?.cards.length) { lookupIndex=lookupIndex===null?0:Math.max(0,lookupIndex-1); render(); } break;
    case 'lookup-next': if(d?.cards.length) { lookupIndex=lookupIndex===null?0:Math.min(d.cards.length-1,lookupIndex+1); render(); } break;
    case 'lookup-random': if(d?.cards.length) { lookupIndex=Math.floor(Math.random()*d.cards.length); render(); } break;
    case 'got-it': case 'pass': checkRound(); if(round?.answer(name==='got-it',performance.now())) render(); else checkRound(); break;
    case 'pause': checkRound();if(round?.phase==='running'){round.pause(performance.now());cues.reset();audio.stop();}render();break;
    case 'resume': if(timerSound) void audio.playTone().catch(audioError); if(loopForRound) void audio.startLoop().catch(audioError); round?.resume(performance.now()); if(round) cues.update(round.phase,round.remaining,roundLength,performance.now()); render(); break;
    case 'end-round': if(confirm('End this round?')) { if(round) round.phase='ended'; cues.reset();audio.stop(); render(); } break;
    case 'new-round': round=undefined;cues.reset();audio.stop(); render(); break;
    case 'reload': location.reload(); break;
    case 'check-update': {
      if(!('serviceWorker' in navigator)) throw new Error('Updates need a secure browser connection.');
      const registration=await navigator.serviceWorker.getRegistration();
      if(!registration) throw new Error('Reopen online to prepare the app first.');
      await registration.update(); say(registration.waiting?'Update ready. Close all PWA windows and reopen.':'Update check requested. Any downloaded update applies after all PWA windows close.'); break;
    }
    case 'media-range': {
      const response=await fetch('./tone.wav',{headers:{Range:'bytes=0-1'}}), bytes=await response.arrayBuffer();
      if(response.status!==206 || bytes.byteLength!==2) throw new Error('Audio cache check failed. Reopen online to update, then retry.');
      say('Audio cache check passed: HTTP 206 with exactly two bytes. Repeat offline.'); break;
    }
    case 'save-probe': await mutate(next=>{next.probe=`Saved ${new Date().toLocaleString()} · ${uid().slice(0,8)}`;}); say('Marker saved. Close and reopen to check it.'); break;
    case 'storage': await storageProtection(true); break;
    case 'backup': await downloadBackup(library); break;
    case 'backup-text': showBackupText=true;render();break;
    case 'copy-backup': await navigator.clipboard.writeText(document.querySelector<HTMLTextAreaElement>('#backup-json')!.value);say('Backup text copied. Save it as a .json file.');break;
    case 'backup-deck': if(d) await downloadBackup({...library,decks:[d]}); break;
    case 'cancel-restore': pendingBackup=undefined;backupFilename='';render();break;
    case 'restore-backup': if(pendingBackup) {
      const restored=restoreBackup(library,pendingBackup.library,restoreMode);
      await mutate(next=>{Object.assign(next,restored);},restoreMode==='replace');
      loadFailure='';restorePoint=await recovery();pendingBackup=undefined;entry='';selected='';lookupIndex=null;route='library';render();say('Backup restored and saved.');
    } break;
    case 'recover': if(restorePoint) { pendingBackup={library:restorePoint.library,source:'DeckForge PWA'};backupFilename='Local restore point';restoreMode='replace';render();say('Review this recovery copy before replacing the library.'); } break;
    case 'sensors': await sensors.start(); updateLab(); break;
    case 'stop-sensors': sensors.stop(); updateLab(); break;
    case 'tone': await audio.playTone(); updateLab(); say('Tone playback requested. Confirm you hear it.'); break;
    case 'start-loop': await audio.startLoop(); updateLab(); break;
    case 'stop-audio': audio.stop(); updateLab(); break;
    case 'vibrate': say(typeof navigator.vibrate==='function' ? `Vibration request ${navigator.vibrate([100,60,100])?'accepted':'rejected'}. Did you feel it?` : 'Vibration unavailable in this browser.'); break;
  }
}
function audioError(error: unknown): void { audio.log(`Playback failed: ${String(error)}`);say('Sound was interrupted. Pause and Resume to retry timer audio, or use Device Tests.'); }
async function submit(form: HTMLFormElement): Promise<void> {
  const data=new FormData(form),text=String(data.get('text') ?? '').trim(),name=String(data.get('name') ?? '').trim(),d=deck();
  switch(form.id) {
    case 'new-deck': if(!name) throw new Error('Enter a deck name.'); {
      const id=uid();await mutate(next=>next.decks.push({id,name,cards:[]}));selected=id;route='editor';cardPage=0;entry='';render();say('Deck saved.');break;
    }
    case 'rename': if(!name) throw new Error('Enter a deck name.'); if(d) await mutate(next=>{next.decks.find(x=>x.id===d.id)!.name=name;});entry='';render();say('Name saved.');break;
    case 'card-form': if(!text) throw new Error('Enter a word or prompt.');if(d) {
      await mutate(next=>{const target=next.decks.find(x=>x.id===d.id)!;if(editingCard) target.cards.find(c=>c.id===editingCard)!.text=text;else target.cards.push({id:uid(),text});});editingCard=undefined;entry='';render();say('Card saved.');
    } break;
    case 'bulk-form': {
      const lines=importLines(String(data.get('text') ?? ''));if(!lines.length) throw new Error('Paste at least one non-empty line.');
      if(d) await mutate(next=>{const target=next.decks.find(x=>x.id===d.id)!;for(const text of lines)target.cards.push({id:uid(),text});});entry='';render();say(`${lines.length} cards saved.`);break;
    }
    case 'lookup-form': if(d) {lookupIndex=lookup(d.cards,String(data.get('number')));render();say('');}break;
    case 'round-form': if(d) {
      const duration=Number(data.get('duration'));timerSound=document.querySelector<HTMLInputElement>('#timer-sound')!.checked;
      if(timerSound) void audio.playTone().catch(audioError);if(loopForRound) void audio.startLoop().catch(audioError);
      try { await mutate(next=>{next.duration=duration;}); } catch(error) {audio.stop();throw error;}
      roundLength=duration*1000;round=new Round(d.cards,duration,performance.now());cues.reset();cues.update(round.phase,round.remaining,roundLength,performance.now());render();say('');break;
    }
  }
}
app.addEventListener('submit',event=>{event.preventDefault();if(event.target instanceof HTMLFormElement) void submit(event.target).catch(error=>say(`Could not save: ${String(error)}`));});
app.addEventListener('input',event=>{if(event.target instanceof HTMLTextAreaElement && event.target.id==='bulk-text')document.querySelector('#bulk-count')!.textContent=`${importLines(event.target.value).length} cards ready`;});
app.addEventListener('change',event=>{
  const el=event.target;
  if(el instanceof HTMLSelectElement && el.id==='deck-picker') {selected=el.value;lookupIndex=null;render();}
  if(el instanceof HTMLSelectElement && el.id==='restore-mode') {restoreMode=el.value==='replace'?'replace':'add';render();}
  if(el instanceof HTMLInputElement && el.id==='background-audio') audio.keepInBackground=el.checked;
  if(el instanceof HTMLInputElement && el.id==='round-loop') loopForRound=el.checked;
  if(el instanceof HTMLInputElement && el.id==='show-countdown') showCountdown=el.checked;
  if(el instanceof HTMLInputElement && el.id==='backup-file') {
    const file=el.files?.[0];if(!file)return;pendingBackup=undefined;
    void (async()=>{
      if(file.size>MAX_BACKUP_BYTES)throw new Error('Choose a backup smaller than 20 MB.');
      const preview=parseBackup(await file.text());pendingBackup=preview;backupFilename=file.name;restoreMode='add';render();say('Backup checked. Review it before importing.');
    })().catch(error=>{render();say(String(error));});
  }
});
document.addEventListener('click',event=>{
  const el=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!el)return;
  if(el.dataset.route) { if(el.dataset.route==='backups') void action('backups').catch(error=>say(String(error)));else navigate(el.dataset.route); }
  else if(el.dataset.deck) {selected=el.dataset.deck;cardPage=0;entry='';editingCard=undefined;route='editor';say('');render();}
  else if(el.dataset.edit) {editingCard=el.dataset.edit;openEntry('card');document.querySelector('#card-form')?.scrollIntoView({block:'start',behavior:'smooth'});}
  else if(el.dataset.action) void action(el.dataset.action).catch(error=>say(`Could not complete action: ${String(error)}`));
});
function checkRound(): void {
  if(!round)return;
  const previous=round.phase,now=performance.now();round.tick(now);
  const cue=cues.update(round.phase,round.remaining,roundLength,now);
  if(timerSound && cue==='beep')void audio.playTone().catch(audioError);
  if(cue==='buzzer') {if(timerSound)void audio.expiry().catch(audioError);else audio.stop();}
  if(previous==='running' && round.phase==='ended')render();
  const remaining=document.querySelector('#remaining');if(remaining && showCountdown)remaining.textContent=`${Math.ceil(round.remaining/1000)}s`;
}
function updateLab(): void {
  if(route!=='lab')return;
  const set=(id:string,text:string):void=>{const el=document.getElementById(id);if(el)el.textContent=text;};
  set('lab-offline',offline);set('lab-network',navigator.onLine?'Online · hint only':'Offline · hint only');
  set('sensor-status',sensors.status);set('angles',sensors.angles);set('gravity',sensors.gravity);
  const elapsed=Math.max(0.001,(performance.now()-sensors.startedAt)/1000);
  set('sensor-count',`Orientation ${sensors.validOrientation}/${sensors.orientationCount} usable · motion ${sensors.validMotion}/${sensors.motionCount} usable · ${sensors.active?(sensors.motionCount/elapsed).toFixed(1):'0'} motion events/s · last usable ${sensors.lastAt?((performance.now()-sensors.lastAt)/1000).toFixed(1)+'s ago':'none'}`);
  set('audio-status',`${audio.loop.paused?'Paused / stopped':'Playback requested'} · position ${audio.loop.currentTime.toFixed(1)}s · loop ${audio.loop.loop?'on':'off'}`);
  set('audio-events',audio.events.join('\n') || 'No audio events yet.');
}
window.setInterval(checkRound,50);window.setInterval(updateLab,250);
document.addEventListener('visibilitychange',()=>{
  audio.log(`App ${document.hidden?'hidden':'visible'}`);
  if(document.hidden) {
    if(round?.phase==='running') {round.pause(performance.now());cues.reset();say('Paused while the app was off screen. Tap Resume to continue.');render();}
    sensors.stop();if(!audio.keepInBackground)audio.stop();
  }
});
window.addEventListener('pagehide',()=>{sensors.stop();cues.reset();if(!audio.keepInBackground)audio.stop();});
function connection(): void {document.querySelector('#connection')!.textContent=navigator.onLine?'Online':'Offline';updateLab();}
window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();
async function setupOffline(): Promise<void> {
  const status=document.querySelector('#offline-status')!;
  const mark=():void=>{status.textContent=offline;updateLab();const settings=document.querySelector('#settings-offline');if(settings)settings.textContent=offline;};
  if(!window.isSecureContext || !('serviceWorker' in navigator)) {offline='Offline use requires HTTPS';mark();return;}
  try {
    const registration=await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
    const ready=():void=>{offline=registration.waiting?'Update ready · close all app windows and reopen':navigator.serviceWorker.controller?'Ready · cached for offline use':'Installed · reopen for offline use';mark();};
    navigator.serviceWorker.addEventListener('controllerchange',ready);ready();
    registration.addEventListener('updatefound',()=>{const installing=registration.installing;installing?.addEventListener('statechange',ready);});
  } catch(error) {offline='Offline setup failed · reopen online';mark();say(`Offline setup: ${String(error)}`);}
}
try {library=await load();restorePoint=await recovery();render();void storageProtection(true);void setupOffline();}
catch(error) {library=emptyLibrary();loadFailure=String(error);futureData=error instanceof NewerFormatError;try{restorePoint=await recovery();}catch{}render();void setupOffline();}
