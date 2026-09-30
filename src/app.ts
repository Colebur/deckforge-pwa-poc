import { importLines, lookup, Round, emptyLibrary, type Deck, type Library } from './model.js';
import { load, save, recovery, type Recovery } from './storage.js';
import { exportBackup, parseBackup, restoreBackup, MAX_BACKUP_BYTES, NewerFormatError, type BackupPreview } from './backup.js';
import {TeamGame, HeadbandsRound, TIMER_CHOICES, defaultTeams, teamNames, roundSeconds} from './games.js';
import {TiltDetector} from './tilt.js';
import {GameAudio} from './game-audio.js';
import { AudioProbe } from './audio.js';
import { Sensors } from './sensors.js';
const app = document.querySelector<HTMLElement>('#app')!;
const notice = document.querySelector<HTMLElement>('#notice')!;
const audio = new AudioProbe();
const sensors = new Sensors();
const gameAudio=new GameAudio();
const tilt=new TiltDetector();
let library: Library;
let route = 'home';
let selected = '';
let lookupIndex: number | null = null;
let round: Round | HeadbandsRound | undefined;
let match: TeamGame | undefined;
let draftTeams=defaultTeams();
let draftDuration=0;
let headDuration=60;
let useTilt=true;
let calibrating=false;
let preparing=false;
let gameGeneration=0;
let wakeLock: WakeLockSentinel | undefined;
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
  const playing=['catchphrase','headbands'].includes(route) && (calibrating || (!!round && round.phase!=='ended')); 
  document.body.classList.toggle('playing',playing);
  document.querySelector<HTMLElement>('#page-title')!.textContent=({home:'DeckForge',library:'Deck Library',editor:deck()?.name ?? 'Deck',lookup:'Numbered Lookup',catchphrase:'Catchphrase',headbands:'Headbands',backups:'Backups',settings:'Settings',lab:'Device Tests'} as Record<string,string>)[route] ?? 'DeckForge';
  document.querySelector<HTMLButtonElement>('#home-button')!.hidden=route==='home';
  document.querySelector<HTMLButtonElement>('#settings-button')!.hidden=route==='settings' || !!loadFailure;
  document.querySelector<HTMLElement>('footer')!.hidden=!['settings','lab'].includes(route);
  if(loadFailure && route!=='backups') { renderStorageError(); return; }
  if(route==='home') renderHome();
  else if(route==='library') renderLibrary();
  else if(route==='editor') renderEditor();
  else if(route==='lookup') renderLookup();
  else if(route==='catchphrase') renderCatchphrase();
  else if(route==='headbands') renderHeadbands();
  else if(route==='backups') renderBackups();
  else if(route==='settings') renderSettings();
  else renderLab();
}
function renderHome(): void {
  app.innerHTML=`<p class="section-label">PLAY</p><section class="list-panel">${destination('catchphrase','Catchphrase','Give clues. Guess the word. Pass the phone.','◷')}${destination('headbands','Headbands','Hold it at your forehead. Tilt to answer.','▱')}${destination('lookup','Numbered Lookup / Jenga','Find a card by its number, or pick at random.','#')}</section>
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
function durationPicker(value:number):string {
  const choices=[...TIMER_CHOICES];if(!choices.includes(value))choices.push(value);
  return choices.map(n=>`<option value="${n}" ${n===value?'selected':''}>${n===0?'Random (30–90 seconds)':`${n} seconds`}</option>`).join('');
}
function scores():string {
  return match?`<section class="list-panel scoreboard">${match.teams.map((name,i)=>`<div class="card-row"><span class="card-text">${esc(name)}</span><strong>${match!.scores[i]}</strong></div>`).join('')}</section>`:'';
}
function renderCatchphrase(): void {
  if(!round){
    const choose=picker();
    app.innerHTML=`<form id="round-form" class="panel">${choose}${deck()?.cards.length?`<label for="team-count">Teams</label><select id="team-count">${Array.from({length:7},(_,i)=>`<option value="${i+2}" ${draftTeams.length===i+2?'selected':''}>${i+2} teams</option>`).join('')}</select>${draftTeams.map((name,i)=>`<label for="team-${i}">Team ${i+1} name</label><input id="team-${i}" data-team="${i}" value="${esc(name)}" maxlength="80" required>`).join('')}<label for="duration">Round timer</label><select id="duration" name="duration">${durationPicker(draftDuration)}</select><label class="check"><input type="checkbox" id="timer-sound" ${timerSound?'checked':''}> Timer sound</label><p class="muted">Random picks a fresh duration each round. The countdown stays hidden.</p><button class="primary full" ${preparing?'disabled':''}>${preparing?'Preparing…':'Start Game'}</button>`:''}</form><details class="panel"><summary>How to play</summary><p>Give clues until your team guesses the card. Tap Next Card and pass the phone to the next team. At the buzzer, choose which team gets one point, or choose No point.</p><p>Cards shuffle and repeat after the whole deck. Pause stops the timer and sounds. Leaving the app pauses the round.</p></details>`;return;
  }
  const ended=round.phase==='ended',paused=round.phase==='paused';
  app.innerHTML=`<section class="game"><div class="game-status"><span class="tag">Round ${match?.number ?? 1}</span><span id="remaining">${showCountdown?`${Math.ceil(round.remaining/1000)}s`:''}</span></div><div class="prompt" aria-live="polite">${ended?(round.remaining===0?'Time’s up!':'Round ended'):paused?'Paused':esc(round.current.text)}</div>
    ${ended?`${scores()}${!match?.scored?`<h2 class="award-title">Who gets the point?</h2><div class="option-list">${match?.teams.map((name,i)=>button('award-'+i,esc(name),'primary')).join('')}${button('award-none','No point')}</div>`:button('next-team-round','Next Round','primary full')}${button('finish-game','Finish Game','full quiet')}`:paused?`<div class="actions">${button('resume','Resume','primary')}${button('end-round','End Round')}</div>`:`${button('next-card','Next Card','primary full next-card')}<div class="game-bottom">${button('pause','Pause','quiet')}<span class="muted">Pass between teams</span>${button('end-round','End','quiet')}</div>`}</section>`;
}
function renderHeadbands():void {
  if(calibrating){
    app.innerHTML=`<section class="game calibration"><h2>Hold Steady</h2><p>Hold the phone sideways at your forehead, screen facing your friends.</p><div class="prompt">Ready to tilt?</div><p>Tilt down for Correct · Tilt up for Pass</p><p class="muted" id="tilt-status">${preparing?'Preparing audio and motion…':sensors.motionAllowed?'Hold steady. The round starts automatically.':'Motion unavailable or denied. You can use the buttons.'}</p>${button('use-buttons','Use Buttons','primary full')}${button('cancel-headbands','Cancel','full quiet')}</section>`;return;
  }
  if(!round){const choose=picker();app.innerHTML=`<form id="headbands-form" class="panel">${choose}${deck()?.cards.length?`<label for="head-duration">Round timer</label><select id="head-duration" name="duration">${durationPicker(headDuration)}</select><label class="check"><input type="checkbox" id="use-tilt" ${useTilt?'checked':''}> Tilt controls</label><label class="check"><input type="checkbox" id="timer-sound" ${timerSound?'checked':''}> Timer sound</label><button class="primary full">Start Round</button>`:''}</form><details class="panel"><summary>How to play</summary><p>Hold sideways and steady at your forehead. Your friends give clues. Tilt down for Correct and up for Pass, then return to your forehead before the next answer. You can also use the buttons.</p><p>Each card appears once per round. The round ends when time runs out or every card has been used. The timer waits while you position the phone.</p></details>`;return;}
  const game=round as HeadbandsRound,ended=game.phase==='ended',paused=game.phase==='paused';
  app.innerHTML=`<section class="game"><div class="game-status"><span class="tag">${paused?'Paused':ended?'Round complete':''}</span><span id="remaining">${showCountdown?`${Math.ceil(game.remaining/1000)}s`:''}</span></div><div class="prompt" aria-live="polite">${ended?(game.reason==='complete'?'Deck complete!':game.reason==='time'?'Time’s up!':'Round ended'):paused?'Paused':esc(game.current.text)}</div>${ended?`<p class="result">${game.score} correct · ${game.passed} passed · ${game.results.filter(r=>r.outcome==='Unanswered').length} unanswered</p>${button('new-round','Play Again','primary full')}${button('home','Home','full quiet')}<section class="list-panel results">${game.results.map(r=>`<div class="card-row"><span class="card-text">${esc(r.card.text)}</span><span class="muted">${r.outcome}</span></div>`).join('')}</section>`:paused?`<div class="actions">${button('resume','Resume','primary')}${button('end-round','End Round')}</div>`:`<p class="tilt-hint muted" id="tilt-status">${useTilt?(tilt.calibrated?'Return to forehead between tilts':'Hold sideways and steady to enable tilts'):'Button controls'}</p><div class="actions">${button('head-correct','Correct','primary')}${button('head-pass','Pass')}</div><div class="game-bottom">${button('pause','Pause','quiet')}<span class="muted">${game.score} correct</span>${button('end-round','End','quiet')}</div>`}</section>`;
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
    <section class="panel"><h2>App updates</h2>${metric('Installed version','0.3.0')}${metric('Offline & updates',offline,'settings-offline')}<p class="muted">Updates keep your decks. After an update downloads, close every window for this web app and reopen.</p>${button('check-update','Check for Update')}</section>
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
    <details class="panel diagnostic"><summary>Motion & orientation</summary>${metric('Permission / sensor status',sensors.status,'sensor-status')}${metric('Readings',sensors.angles,'angles')}${metric('Acceleration including gravity',sensors.gravity,'gravity')}${metric('Events / rate / freshness','Not listening','sensor-count')}<div class="row">${button('sensors','Enable Sensors','primary')}${button('stop-sensors','Stop Sensors')}</div><p class="muted">Allow permission, turn sideways both ways, then tip the screen up and down. Values should change smoothly. Repeat after closing/reopening and after leaving the app. Headbands gameplay is available from Home.</p></details>
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
  if((calibrating || (round && round.phase!=='ended')) && !confirm('Leave and end the current round?')) return;
  gameGeneration++;calibrating=false;preparing=false;round=undefined;match=undefined;gameAudio.stop();releaseWake();audio.stop();sensors.stop();tilt.reset();sensors.onGravity=undefined; entry=''; editingCard=undefined; lookupIndex=null;
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
  if(name.startsWith('award-')){const index=name==='award-none'?null:Number(name.slice(6));if(match?.award(index))render();return;}
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
    case 'next-card': checkRound();if(round instanceof Round && round.answer(false,performance.now()))render();break;
    case 'head-correct':case 'head-pass': headAnswer(name==='head-correct');break;
    case 'pause': pauseGame();break;
    case 'resume': if(preparing)break;if(route==='headbands')await prepareHeadbands(true);else if(round?.phase==='paused'){
      const token=gameGeneration;await readyAudio();if(token!==gameGeneration||document.hidden||round?.phase!=='paused')break;round.resume(performance.now());gameAudio.schedule(round.remaining,roundLength,timerSound);if(loopForRound)void audio.startLoop().catch(audioError);void keepAwake();render();
    }break;
    case 'end-round': pauseGame();if(confirm('End this round?')){if(round instanceof HeadbandsRound)round.end();else if(round)round.phase='ended';gameAudio.stop();audio.stop();render();}break;
    case 'new-round': gameGeneration++;round=undefined;gameAudio.stop();audio.stop();sensors.stop();tilt.reset();calibrating=false;render();break;
    case 'next-team-round': if(match?.scored&&!preparing){const token=gameGeneration;preparing=true;try{await readyAudio();if(token===gameGeneration&&!document.hidden&&match?.scored){round=match.start(performance.now());startCues();}}finally{preparing=false;}}break;
    case 'finish-game': navigate('home');break;
    case 'use-buttons': if(!preparing){useTilt=false;calibrating=false;sensors.stop();tilt.reset();beginHeadbands();}break;
    case 'cancel-headbands': gameGeneration++;calibrating=false;preparing=false;sensors.stop();tilt.reset();gameAudio.stop();releaseWake();render();break;
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
      draftTeams=library.teams?[...library.teams]:defaultTeams();draftDuration=library.teams?library.duration:0;headDuration=library.headbandsDuration??60;loadFailure='';restorePoint=await recovery();pendingBackup=undefined;entry='';selected='';lookupIndex=null;route='library';render();say('Backup restored and saved.');
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
    case 'round-form': if(d && !preparing){
      const names=teamNames(draftTeams),duration=draftDuration;roundSeconds(duration);
      timerSound=document.querySelector<HTMLInputElement>('#timer-sound')!.checked;
      const token=++gameGeneration;preparing=true;const sound=readyAudio();render();
      try{await Promise.all([sound,mutate(next=>{next.duration=duration;next.teams=names;})]);if(token!==gameGeneration||document.hidden)return;
      match=new TeamGame(d.cards,names,duration);round=match.start(performance.now());startCues();say('');}
      finally{preparing=false;render();}break;
    }
    case 'headbands-form': if(d && !preparing){
      headDuration=Number(data.get('duration'));useTilt=document.querySelector<HTMLInputElement>('#use-tilt')!.checked;timerSound=document.querySelector<HTMLInputElement>('#timer-sound')!.checked;
      await prepareHeadbands(false);break;
    }
  }
}
app.addEventListener('submit',event=>{event.preventDefault();if(event.target instanceof HTMLFormElement) void submit(event.target).catch(error=>say(`Could not save: ${String(error)}`));});
app.addEventListener('input',event=>{if(event.target instanceof HTMLInputElement && event.target.dataset.team!==undefined)draftTeams[Number(event.target.dataset.team)]=event.target.value;if(event.target instanceof HTMLTextAreaElement && event.target.id==='bulk-text')document.querySelector('#bulk-count')!.textContent=`${importLines(event.target.value).length} cards ready`;});
app.addEventListener('change',event=>{
  const el=event.target;
  if(el instanceof HTMLSelectElement && el.id==='team-count'){const count=Number(el.value);while(draftTeams.length<count)draftTeams.push('Team '+(draftTeams.length+1));draftTeams=draftTeams.slice(0,count);render();}
  if(el instanceof HTMLSelectElement && el.id==='duration')draftDuration=Number(el.value);
  if(el instanceof HTMLSelectElement && el.id==='head-duration')headDuration=Number(el.value);
  if(el instanceof HTMLInputElement && el.id==='timer-sound')timerSound=el.checked;
  if(el instanceof HTMLInputElement && el.id==='use-tilt')useTilt=el.checked;
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
async function readyAudio():Promise<void> {
  try{await gameAudio.unlock();}catch(error){timerSound=false;audio.log(String(error));say('Sound unavailable. You can still play with the controls.');}
}
async function keepAwake():Promise<void> {
  try{if('wakeLock' in navigator && !document.hidden && (calibrating||round?.phase==='running')){const lock=await navigator.wakeLock.request('screen');if(document.hidden||(!calibrating&&round?.phase!=='running'))await lock.release();else{await wakeLock?.release();wakeLock=lock;}}}catch{}
}
function releaseWake():void {void wakeLock?.release();wakeLock=undefined;}
function startCues():void {
  if(!round)return;roundLength=round.remaining;gameAudio.schedule(round.remaining,roundLength,timerSound);if(route==='catchphrase'&&loopForRound)void audio.startLoop().catch(audioError);void keepAwake();render();
}
function beginHeadbands():void {
  calibrating=false;
  if(round instanceof HeadbandsRound&&round.phase==='paused'){round.resume(performance.now());gameAudio.schedule(round.remaining,roundLength,timerSound);void keepAwake();render();}
  else{round=new HeadbandsRound(deck()!.cards,roundSeconds(headDuration),performance.now());startCues();}
}
async function prepareHeadbands(resuming:boolean):Promise<void> {
  if(preparing)return;roundSeconds(headDuration);const token=++gameGeneration;preparing=true;calibrating=useTilt;tilt.reset();sensors.onGravity=undefined;
  const sound=readyAudio(),permission=useTilt?sensors.start():Promise.resolve();render();void keepAwake();
  try{
    await Promise.all([sound,permission,resuming?Promise.resolve():mutate(next=>{next.headbandsDuration=headDuration;})]);
    if(token!==gameGeneration||document.hidden)return;
    if(useTilt){
      sensors.onGravity=(g,at)=>{
        if(document.hidden||route!=='headbands')return;
        const event=tilt.update(...g,at);if(event==='ready'&&calibrating)beginHeadbands();else if(!calibrating&&round?.phase==='running'&&(event==='correct'||event==='pass'))headAnswer(event==='correct');
        const status=document.querySelector('#tilt-status');if(status&&!calibrating)status.textContent=tilt.calibrated?'Return to forehead between tilts':'Hold sideways and steady to enable tilts';
      };
    }else beginHeadbands();
  }finally{if(token===gameGeneration){preparing=false;render();}}
}
function headAnswer(correct:boolean):void {
  checkRound();if(!(round instanceof HeadbandsRound))return;
  if(round.answer(correct,performance.now())){gameAudio.feedback(correct);tilt.disarm();if(round.phase==='ended'){gameAudio.stopCountdown();sensors.stop();releaseWake();}render();}
}
function pauseGame():void {
  checkRound();gameGeneration++;preparing=false;calibrating=false;
  if(round?.phase==='running')round.pause(performance.now());
  // Expiry owns its scheduled buzzer; pausing an already-ended round must not cut it off.
  if(round?.phase!=='ended')gameAudio.stop();audio.stop();sensors.stop();tilt.reset();releaseWake();render();
}
gameAudio.onInterrupt=()=>{if(calibrating||round?.phase==='running'){pauseGame();say('Audio was interrupted. Tap Resume when ready.');}};
function checkRound(): void {
  if(calibrating&&!preparing){const status=document.querySelector('#tilt-status');if(status&&sensors.motionAllowed&&!sensors.lastAt&&performance.now()-sensors.startedAt>5000)status.textContent='No motion readings yet. Use Buttons, or check motion permission in Safari.';}
  if(!round)return;const previous=round.phase;round.tick(performance.now());
  if(previous==='running'&&round.phase==='ended'){audio.stop();sensors.stop();tilt.reset();releaseWake();render();}
  const remaining=document.querySelector('#remaining');if(remaining&&showCountdown)remaining.textContent=`${Math.ceil(round.remaining/1000)}s`;
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
    if(calibrating||preparing||round?.phase==='running'){pauseGame();say('Paused while the app was off screen. Resume when ready.');}
    gameAudio.stop();sensors.stop();releaseWake();if(!audio.keepInBackground)audio.stop();
  }
});
window.addEventListener('pagehide',()=>{sensors.stop();gameAudio.stop();releaseWake();if(!audio.keepInBackground)audio.stop();});
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
try {library=await load();draftTeams=library.teams?[...library.teams]:defaultTeams();draftDuration=library.teams?library.duration:0;headDuration=library.headbandsDuration??60;restorePoint=await recovery();render();void storageProtection(true);void setupOffline();}
catch(error) {library=emptyLibrary();loadFailure=String(error);futureData=error instanceof NewerFormatError;try{restorePoint=await recovery();}catch{}render();void setupOffline();}
