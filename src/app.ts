import {duplicateGroups,copyDeck,reviewImport,importItems,type ImportReview} from './editor-tools.js';
import {esc,button,cardDisplay,deckOptions as optionsHtml,pickerEscape as escapeHtml} from './ui.js';
import {webShare} from './share.js';
import {webHaptics} from './haptics.js';
import {filterLibrary,defaultPreferences,backupDue,backupOverlap,gameShortcut,type LibraryFilter,type Preferences} from './refinements.js';
import {PromptSession} from './prompt-session.js';
import {MODES,metadata,modeDecks,sectionRoot,type ModeId,type LaunchContext,type DeckMetadata} from './modes.js';
import {HeadbandsSetup} from './headbands-setup.js';
import {ActivitySession,activityParts,moveItem,type ActivityMode} from './activities.js';
import {importTaboo,validateTabooCard,TabooRound,TabooGame} from './taboo.js';
import { alphabeticalDecks, importLines, type PromptDraw, lookup, Round, emptyLibrary, type Deck, type TabooDeck, type Library } from './model.js';
import { load, save, recovery, loadPreferences, savePreferences, type Recovery } from './storage.js';
import { exportBackup, parseBackup, restoreBackup, MAX_BACKUP_BYTES, NewerFormatError, type BackupPreview } from './backup.js';
import {TeamGame, HeadbandsRound, TIMER_CHOICES, defaultTeams, teamNames, roundSeconds} from './games.js';
import {TiltDetector} from './tilt.js';
import {GameAudio} from './game-audio.js';
import { AudioProbe } from './audio.js';
import { Sensors } from './sensors.js';
const app = document.querySelector<HTMLElement>('#app')!;
const notice = document.querySelector<HTMLElement>('#notice')!;
// Navigation decoration only: session updates and gameplay never start transitions.
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
let navigationAnimation:Animation|undefined;
reducedMotion.addEventListener('change',()=>navigationAnimation?.cancel());
function animateNavigation(kind:'forward'|'back'|'tab-left'|'tab-right'):void {
  navigationAnimation?.cancel();
  if(reducedMotion.matches||typeof app.animate!=='function')return;
  const offset=kind==='forward'?'translateY(10px)':kind==='back'?'translateY(-6px)':`translateX(${kind==='tab-right'?14:-14}px)`;
  navigationAnimation=app.animate([
    {opacity:.6,transform:offset},
    {opacity:1,transform:'translate(0,0)'}
  ],{duration:180,easing:'cubic-bezier(.2,.8,.2,1)'});
}

const audio = new AudioProbe();
const sensors = new Sensors();
const gameAudio=new GameAudio();
const tilt=new TiltDetector(false);
const placement=new HeadbandsSetup();
let placementLabel='';
const sideways=():boolean=>matchMedia('(orientation: landscape)').matches;
let library: Library;
let preferences=defaultPreferences();
const libraryFilters:Record<'regular'|'taboo',LibraryFilter>={regular:{search:'',context:'all',mode:'all'},taboo:{search:'',context:'all',mode:'all'}};
let replaceAcknowledged=false;
async function setPreferences(change:(next:Preferences)=>void):Promise<void>{
  const next={...preferences};change(next);await savePreferences(next);preferences=next;render();
}
let revealedDeck="";
let suppressDeckClickUntil=0;
let route = 'home';
let section:'play'|'work'|'decks'='play';
let launchContext:LaunchContext='play';
let showAllDecks=false;
let selected = '';
let lookupIndex: number | null = null;
let activityMode:ActivityMode='none';
let fixedActivityId='';
let lookupActivity:ActivitySession|undefined;
let editorSection:'cards'|'activities'='cards';
let editingActivity:string|undefined;
let confirmActivityDelete=false;
let activityPage=0;
let promptIds:Set<string>|undefined;
let promptSearch='';
let promptActivityMode:ActivityMode='none';
let promptFixed:Record<string,string>={};
let promptSession:PromptSession|undefined;
let promptDraw: PromptDraw | undefined;
let round: Round | HeadbandsRound | TabooRound | undefined;
let match: TeamGame | undefined;
let tabooSelected="",tabooTeams=defaultTeams(),tabooDuration=0;
let tabooMatch:TabooGame|undefined;
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
let expandedCards=false;
let bulkDraft='';
let pendingImport:ImportReview|undefined;
let skipImportDuplicates=false;
let presenting=false;
let presentationControls=true;
function pagination(total:number):string {
  if(total<=50)return '';
  const pages=Math.ceil(total/50);
  return `${expandedCards?`<p class="muted">All ${total} cards</p>`:`<p class="muted">Page ${cardPage+1} of ${pages}</p><div class="actions"><button data-action="page-prev" ${cardPage===0?'disabled':''}>Previous 50</button><button data-action="page-next" ${cardPage===pages-1?'disabled':''}>Next 50</button></div>`}<div class="actions">${button('expand-cards',expandedCards?'Show 50 at a Time':'Expand All','quiet full')}</div>`;
}
function duplicateReport(cards:Deck['cards']):string {
  const groups=duplicateGroups(cards);
  return `<details class="panel"><summary>Check duplicate prompts</summary><p class="muted">Matches ignore capitalization and surrounding spaces. Nothing is deleted automatically.</p>${groups.length?groups.map(g=>`<p><strong>${esc(g.text)}</strong> · cards ${g.positions.join(', ')}</p>`).join(''):'<p>No duplicate prompts found.</p>'}</details>`;
}
function importPreview():string {
  if(!pendingImport)return '';
  return `<section id="import-review" class="panel"><h3>Review Import</h3><p>${pendingImport.items.length} cleaned lines · ${pendingImport.duplicates} duplicates (existing or repeated lines).</p><label class="check"><input id="skip-import-duplicates" type="checkbox" ${skipImportDuplicates?'checked':''}> Skip duplicates</label><p class="muted">Duplicates are kept unless you choose to skip them. Review the cleaned text before saving.</p><ol class="import-preview">${pendingImport.items.map(c=>`<li>${esc(c.text)}${c.forbidden?`<small>${c.forbidden.map(esc).join(' · ')}</small>`:''}</li>`).join('')}</ol>${button('confirm-import','Confirm Import','primary full')}</section>`;
}
function presentationToggle():string {
  return presenting?`<div class="presentation-bar">${button('presentation-controls',presentationControls?'Hide Controls':'Show Controls','quiet')}${presentationControls?button('presentation','Exit Presentation','quiet'):''}</div>`:button('presentation','Presentation View','quiet full');
}
function updateActivityPreview():void {
  const text=app.querySelector<HTMLTextAreaElement>('#activity-text')?.value??'';
  const card=app.querySelector<HTMLSelectElement>('#preview-card')?.value??app.querySelector<HTMLInputElement>('#preview-card-text')?.value??'Example';
  const preview=app.querySelector('#activity-preview');if(preview)preview.innerHTML=cardDisplay(card,{text});
}
let editingCard: string | undefined;
let entry: '' | 'new-deck' | 'rename' | 'card' | 'bulk' | 'activity' | 'activity-bulk' = '';
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
const deck = (): Deck | undefined => library.decks.find(d=>d.id===selected);
const uid = (): string => crypto.randomUUID();
function say(message: string): void { notice.textContent=message; }
function destination(target: string, title: string, detail: string, symbol: string): string {
  return `<button class="menu-row" data-route="${target}"><span class="symbol" aria-hidden="true">${symbol}</span><span><strong>${title}</strong>${detail?`<small>${detail}</small>`:''}</span><span class="arrow" aria-hidden="true">›</span></button>`;
}
function currentMode():ModeId {return MODES.find(m=>m.id===route)?.id??'catchphrase';}
function availableDecks(){return modeDecks(library.decks,currentMode(),launchContext,showAllDecks);}
const deckOptions=(pool:ReturnType<typeof availableDecks>|ReturnType<typeof modeDecks<TabooDeck>>,value:string|null)=>optionsHtml<Deck|TabooDeck>(pool,value,launchContext,showAllDecks);
const pickerEscape=(other:number,compatible:number)=>escapeHtml(other,compatible,launchContext,showAllDecks,currentMode());
function picker(): string {
  const pool=availableDecks();
  if(!pool.visible.some(d=>d.id===selected)){selected=pool.visible[0]?.id??'';resetLookup();}
  return (pool.visible.length?`<label for="deck-picker">Deck</label><select id="deck-picker">${deckOptions(pool,selected)}</select>`:'<p class="empty">No decks to select.</p>')+pickerEscape(pool.other.length,pool.compatible.length);
}
function organization(d:Deck|TabooDeck,format:'regular'|'taboo'):string {
  return `<details class="panel deck-organization"><summary>Deck organization · ${d.deckContext==='both'?'Both':d.deckContext==='play'?'Play':'Work'}</summary><form id="organization-form" data-format="${format}"><fieldset><legend>Best suited for</legend><div class="context-options">${['play','work','both'].map(c=>`<label><input type="radio" name="deckContext" value="${c}" ${d.deckContext===c?'checked':''}> ${c==='both'?'Both':c==='play'?'Play':'Work'}</label>`).join('')}</div></fieldset><fieldset><legend>Available in</legend>${MODES.filter(m=>m.format===format).map(m=>`<label class="check"><input type="checkbox" name="compatibleModes" value="${m.id}" ${d.compatibleModes.includes(m.id)?'checked':''} ${m.id==='lookup'&&d.cards.length!==54?'disabled':''}> ${m.title}${m.id==='lookup'&&d.cards.length!==54?' — requires exactly 54 cards':''}</label>`).join('')}</fieldset><p class="muted">Context recommends decks; it never restricts access. Unchecked modes can still find this deck with Show All Decks when its card format and size are valid. Jenga requires 54 cards; an existing assignment stays saved but is unavailable at other sizes.${format==='taboo'?' Taboo cards require five forbidden words and use their separate editor.':''}</p><button class="primary full">Save Organization</button></form></details>`;
}
function render(): void {
  navigationAnimation?.cancel();
  const active=document.activeElement instanceof HTMLElement && app.contains(document.activeElement)?document.activeElement:undefined;
  const focusId=active?.id;
  const focusAction=active?.dataset.action;
  document.body.classList.toggle('large-text',preferences.largeText);
  document.body.classList.toggle('work-presentation',presenting);
  document.body.classList.toggle('presentation-hidden-controls',presenting&&!presentationControls);
  const playing=presenting || (['catchphrase','headbands','taboo'].includes(route) && (calibrating || (!!round && round.phase!=='ended'))) || (route==='prompts' && !!promptDraw);
  document.body.dataset.context=section;
  document.body.classList.toggle('playing',playing);
  document.body.classList.toggle('home-screen',route==='home');
  document.body.classList.toggle('has-tabs',!playing);
  const tabs=document.querySelector<HTMLElement>('#main-tabs')!;tabs.hidden=playing;
  tabs.innerHTML=[['play','▶','Play'],['work','▦','Work'],['decks','▱','Decks']].map(([id,icon,title])=>`<button data-tab="${id}" ${section===id?'aria-current="page"':''}><span aria-hidden="true">${icon}</span>${title}</button>`).join('');
  document.body.classList.toggle('lookup-screen',route==='lookup');
  document.querySelector<HTMLButtonElement>('#rename-button')!.hidden=!['editor','taboo-editor'].includes(route)||!!loadFailure;
  document.querySelector<HTMLElement>('#page-title')!.textContent=({home:section==='work'?'Work':'DeckForge',taboo:'Taboo','taboo-library':'Taboo Decks','taboo-editor':tabooDeck()?.name??'Taboo Deck',library:'Deck Library',editor:deck()?.name ?? 'Deck',lookup:'Jenga',prompts:'Prompt Picker',catchphrase:'Catchphrase',headbands:'Headbands',backups:'Backups',settings:'Settings',lab:'Device Tests'} as Record<string,string>)[route] ?? 'DeckForge';
  document.querySelector<HTMLButtonElement>('#home-button')!.hidden=route==='home';
  const back=document.querySelector<HTMLButtonElement>('#home-button')!;
  back.dataset.action=route==='editor'?'back':route==='taboo-editor'?'taboo-library':'home';
  back.setAttribute('aria-label',route==='editor'?'Back to Deck Library':route==='taboo-editor'?'Back to Taboo Decks':`Back to ${section==='play'?'Play':section==='work'?'Work':'Decks'}`);
  document.querySelector<HTMLButtonElement>('#settings-button')!.hidden=route==='settings' || !!loadFailure;
  document.querySelector<HTMLElement>('footer')!.hidden=!['settings','lab'].includes(route);
  if(loadFailure && route!=='backups') { renderStorageError(); return; }
  if(route==='home') renderHome();
  else if(route==='library') renderLibrary();
  else if(route==='editor') renderEditor();
  else if(route==='lookup') renderLookup();
  else if(route==='prompts') renderPrompts();
  else if(route==='catchphrase') renderCatchphrase();
  else if(route==='headbands') renderHeadbands();
  else if(route==='taboo') renderTaboo();
  else if(route==='taboo-library') renderTabooLibrary();
  else if(route==='taboo-editor') renderTabooEditor();
  else if(route==='backups') renderBackups();
  else if(route==='settings') renderSettings();
  else renderLab();
  if(active){
    const replacement=focusId?document.getElementById(focusId):focusAction?Array.from(app.querySelectorAll<HTMLElement>('[data-action]')).find(el=>el.dataset.action===focusAction):undefined;
    (replacement && !replacement.hidden && !(replacement instanceof HTMLButtonElement && replacement.disabled)?replacement:app).focus({preventScroll:true});
  }
}
function renderHome(): void {
  const modes=section==='work'?MODES:MODES.filter(m=>m.play);
  app.innerHTML=`<p class="section-label">${section==='work'?'WORK':'PLAY'}</p>${section==='work'?'<p class="muted section-intro">Reusable decks for facilitated, family and group activities.</p>':''}<section class="list-panel">${modes.map(m=>destination(m.id,m.title,m.detail,m.icon)).join('')}</section>`;
}
function libraryRow(d:Deck|TabooDeck,kind:'regular'|'taboo'):string {
  const key=kind+':'+d.id,open=revealedDeck===key;
  return `<div class="swipe-deck ${open?'revealed':''}" data-swipe-key="${esc(key)}"><button class="swipe-delete" data-swipe-delete="${esc(d.id)}" data-kind="${kind}" aria-label="Delete ${esc(d.name)}" ${open?'':'hidden'}>Delete</button><button type="button" class="deck-reveal quiet" data-reveal-key="${esc(key)}" aria-label="Show delete for ${esc(d.name)}" aria-expanded="${open}" ${open?'hidden':''}>···</button><button class="menu-row swipe-front" data-${kind==='regular'?'deck':'taboo-deck'}="${esc(d.id)}"><span><strong>${esc(d.name)}</strong><small>${d.cards.length} cards${kind==='regular'?` · ${(d as Deck).activities.length} activities`:''} · ${d.deckContext==='both'?'Both':d.deckContext==='play'?'Play':'Work'}</small></span><span class="arrow" aria-hidden="true">›</span></button></div>`;
}
function revealDeck(key:string):void {
  revealedDeck=key;
  app.querySelectorAll<HTMLElement>('.swipe-deck').forEach(row=>{const open=row.dataset.swipeKey===key;row.classList.toggle('revealed',open);row.querySelector<HTMLButtonElement>('.swipe-delete')!.hidden=!open;const toggle=row.querySelector<HTMLButtonElement>('.deck-reveal')!;toggle.hidden=open;toggle.setAttribute('aria-expanded',String(open));});
}
async function deleteLibraryDeck(id:string,kind:string):Promise<void>{
  await mutate(next=>{if(kind==='taboo')next.tabooDecks=next.tabooDecks?.filter(d=>d.id!==id);else next.decks=next.decks.filter(d=>d.id!==id);},true);
  revealedDeck='';restorePoint=await recovery();render();say('Deck deleted. You can recover it from Backups → Local recovery.');
}
function backupReminder():string {
  return backupDue(preferences,Date.now())?`<aside class="panel backup-reminder" aria-label="Backup reminder"><p>${preferences.lastConfirmedBackup?'It’s been a month since your last confirmed backup.':'It’s been a month since you enabled backup reminders.'} Keep a copy of your library somewhere safe.</p><div class="form-actions">${button('backups','Back Up Library','primary')}${button('snooze-backup','Remind Me in a Week','quiet')}</div></aside>`:'';
}
function libraryTools(kind:'regular'|'taboo'):string {
  const filter=libraryFilters[kind];
  return `<section class="library-tools" aria-label="Find decks"><label for="library-search">Search deck names</label><input id="library-search" type="search" value="${esc(filter.search)}" placeholder="Find a deck" autocomplete="off"><div class="filter-controls"><div><label for="library-context">Context</label><select id="library-context">${[['all','All contexts'],['play','Play'],['work','Work'],['both','Both']].map(([id,title])=>`<option value="${id}" ${filter.context===id?'selected':''}>${title}</option>`).join('')}</select></div><div><label for="library-mode">Available in</label><select id="library-mode">${[['all','All modes'],...MODES.filter(m=>m.format===kind).map(m=>[m.id,m.title]),['unassigned','Unassigned']].map(([id,title])=>`<option value="${id}" ${filter.mode===id?'selected':''}>${title}</option>`).join('')}</select></div></div>${button('clear-library-filters','Clear Search & Filters','quiet')}<p id="library-count" class="muted" role="status" aria-live="polite"></p></section>`;
}
function updateLibraryResults():void {
  const kind=route==='taboo-library'?'taboo':'regular';
  const decks=kind==='taboo'?library.tabooDecks??[]:library.decks;
  const filtered=filterLibrary<Deck|TabooDeck>(decks,libraryFilters[kind]);
  const results=document.querySelector('#library-results');if(!results)return;
  results.innerHTML=filtered.map(d=>libraryRow(d,kind)).join('')||`<p class="empty">${decks.length?'No decks match. Clear the search and filters to see every deck.':'Create a deck, then add cards or paste a list.'}</p>`;
  document.querySelector('#library-count')!.textContent=`${filtered.length} of ${decks.length} decks · alphabetical`;
}
function renderLibrary(): void {
  app.innerHTML=`${backupReminder()}<div class="toolbar"><span class="muted">${library.decks.length} decks</span>${button('new-deck','＋ New Deck','primary')}</div>
    ${entry==='new-deck'?`<form id="new-deck" class="panel"><h2>New Deck</h2><label for="deck-name">Deck name</label><input id="deck-name" name="name" required maxlength="120" placeholder="Celebrities"><div class="form-actions"><button class="primary">Create Deck</button>${button('cancel-edit','Cancel')}</div></form>`:''}
    ${libraryTools('regular')}<section id="library-results" class="list-panel" aria-label="Regular decks"></section><p class="section-label">MORE DECK TOOLS</p><section class="list-panel">${destination('taboo-library','Taboo Decks','Cards with five forbidden words.','◇')}${destination('backups','Backups','Export or restore your local library.','↥')}</section>`;
  updateLibraryResults();
}
function editorTabs():string {
  return `<div class="segmented" role="group" aria-label="Deck content"><button data-action="editor-cards" aria-pressed="${editorSection==='cards'}">Cards</button><button data-action="editor-activities" aria-pressed="${editorSection==='activities'}">Activities</button></div>`;
}
function reorderControls(kind:'card'|'activity',id:string,index:number,total:number):string {
  return `<div class="reorder-controls"><button type="button" data-${kind}-move="${esc(id)}" data-direction="-1" aria-label="Move ${kind} ${index+1} up" ${index===0||entry?'disabled':''}>↑</button><button type="button" data-${kind}-move="${esc(id)}" data-direction="1" aria-label="Move ${kind} ${index+1} down" ${index===total-1||entry?'disabled':''}>↓</button></div>`;
}
function renderActivityEditor(d:Deck):void {
  const items=d.activities,editable=items.find(a=>a.id===editingActivity),pages=Math.max(1,Math.ceil(items.length/50));activityPage=Math.min(activityPage,pages-1);
  let form='';
  if(entry==='activity')form=`<form id="activity-form" class="panel"><h2>${editable?'Edit':'Add'} Activity</h2><label for="activity-text">Activity template</label><textarea id="activity-text" name="text" required placeholder="I feel {card} when...">${esc(editable?.text??'')}</textarea><p class="muted">Use {card} to insert the current card text.</p>${d.cards.length?`<label for="preview-card">Preview with card</label><select id="preview-card">${d.cards.map(c=>`<option value="${esc(c.text)}">${esc(c.text)}</option>`).join('')}</select>`:'<label for="preview-card-text">Preview card text</label><input id="preview-card-text" value="Example">'}<div id="activity-preview" class="activity-preview"></div><div class="form-actions"><button class="primary">Save Activity</button>${button('cancel-edit','Cancel')}${editable?button('delete-activity','Delete Activity','danger'):''}</div>${confirmActivityDelete?`<div class="delete-confirm"><p>Delete this Activity? A local restore point will be saved.</p><div class="form-actions">${button('confirm-delete-activity','Confirm Delete Activity','danger')}${button('cancel-delete-activity','Keep Activity')}</div></div>`:''}</form>`;
  if(entry==='activity-bulk')form=`<form id="activity-bulk-form" class="panel"><h2>Bulk Paste Activities</h2><label for="activity-bulk">One activity per line</label><textarea id="activity-bulk" name="text" required placeholder="I feel {card} when...&#10;Show {card} with your face.&#10;Draw what {card} looks like.">${esc(bulkDraft)}</textarea><p class="muted">Use {card} to insert the current card text. Simple numbered and bulleted prefixes are removed.</p><div class="form-actions"><button class="primary">Review Import</button>${button('cancel-edit','Cancel')}</div></form>`;
  app.innerHTML=`<div class="toolbar"><span class="muted">${d.cards.length} cards · ${items.length} activities</span>${button('back','All Decks')}</div>${editorTabs()}${organization(d,'regular')}<p class="muted">Activities belong to this deck and can be paired with any of its cards in Jenga or Prompt Picker. Use {card} to insert the current card text.</p><div class="actions">${button('add-activity','＋ Add Activity','primary')}${button('activity-bulk','Bulk Paste')}</div>${form}${importPreview()}<p class="section-label">ACTIVITIES IN ORDER</p><section class="list-panel">${items.slice(activityPage*50,activityPage*50+50).map((a,i)=>`<div class="card-row ordered-row"><button class="ordered-edit" data-activity-edit="${esc(a.id)}"><span class="number">${activityPage*50+i+1}</span><span class="card-text">${esc(a.text)}</span></button>${reorderControls('activity',a.id,activityPage*50+i,items.length)}</div>`).join('')||'<p class="empty">Add an Activity or paste a list. Your cards stay as they are.</p>'}</section>${pages>1?`<p class="muted">Page ${activityPage+1} of ${pages}</p><div class="actions"><button data-action="activity-page-prev" ${activityPage===0?'disabled':''}>Previous 50</button><button data-action="activity-page-next" ${activityPage===pages-1?'disabled':''}>Next 50</button></div>`:''}`;
}

function renderEditor(): void {
  const d=deck(); if(!d) { route='library'; render(); return; }
  if(editorSection==='activities'){renderActivityEditor(d);updateActivityPreview();return;}
  const editable=d.cards.find(c=>c.id===editingCard);
  const pages=Math.max(1,Math.ceil(d.cards.length/50)); cardPage=Math.min(cardPage,pages-1);
  let form='';
  if(entry==='rename') form=`<form id="rename" class="panel"><h2>Rename Deck</h2><label for="rename-name">Deck name</label><input id="rename-name" name="name" value="${esc(d.name)}" required maxlength="120"><div class="form-actions"><button class="primary">Save Name</button>${button('cancel-edit','Cancel')}</div></form>`;
  if(entry==='card') form=`<form id="card-form" class="panel"><h2>${editable?'Edit Card':'Add Card'}</h2><label for="card-text">Word or prompt</label><textarea id="card-text" name="text" required>${editable?esc(editable.text):''}</textarea><div class="form-actions"><button class="primary">${editable?'Save Card':'Add Card'}</button>${button('cancel-edit','Cancel')}${editable?button('delete-card','Delete Card','danger'):''}</div></form>`;
  if(entry==='bulk') form=`<form id="bulk-form" class="panel"><h2>Bulk Paste</h2><p class="muted">One card per line. Simple numbered and bulleted prefixes are removed.</p><label for="bulk-text">Your list</label><textarea id="bulk-text" name="text" placeholder="1. Beyoncé&#10;2. Taylor Swift&#10;• Keanu Reeves">${esc(bulkDraft)}</textarea><p id="bulk-count" class="muted">${importLines(bulkDraft).length} cards ready</p><div class="form-actions"><button class="primary">Review Import</button>${button('cancel-edit','Cancel')}</div></form>`;
  app.innerHTML=`<div class="toolbar"><span class="muted">${d.cards.length} cards</span>${button('back','All Decks')}</div>${editorTabs()}${organization(d,'regular')}<div class="actions">${button('add-card','＋ Add Card','primary')}${button('bulk','Bulk Paste')}</div>
    ${form}${importPreview()}<p class="section-label">CARDS IN ORDER</p><section class="list-panel">${d.cards.slice(expandedCards?0:cardPage*50,expandedCards?undefined:cardPage*50+50).map((c,i)=>`<div class="card-row ordered-row"><button class="ordered-edit" data-edit="${esc(c.id)}"><span class="number">${(expandedCards?0:cardPage*50)+i+1}</span><span class="card-text">${esc(c.text)}</span></button>${reorderControls('card',c.id,(expandedCards?0:cardPage*50)+i,d.cards.length)}</div>`).join('') || '<p class="empty">No cards yet.</p>'}</section>
    ${pagination(d.cards.length)}${duplicateReport(d.cards)}
    <details class="panel"><summary>Deck options</summary><div class="option-list">${button('duplicate-deck','Duplicate Deck')}${button('rename-deck','Rename Deck')}${button('backup-deck','Back Up This Deck')}${button('delete-deck','Delete Deck','danger')}</div></details>`;
}
function resetLookup():void {
  lookupIndex=null;activityMode='none';fixedActivityId='';lookupActivity=undefined;
}
function configureLookup():void {
  const activities=deck()?.activities??[];
  if(!activities.length)activityMode='none';
  if(!activities.some(a=>a.id===fixedActivityId))fixedActivityId=activities[0]?.id??'';
  lookupActivity=new ActivitySession(activities,activityMode,fixedActivityId);
  if(lookupIndex!==null)lookupActivity.select();
}
function selectLookupCard(index:number):void {
  if(!lookupActivity)configureLookup();
  lookupIndex=index;lookupActivity!.select();render();say('');
}
function activityChoices(id:string,value:ActivityMode):string {
  return `<label for="${id}">Activity mode</label><select id="${id}">${[['none','None — card only'],['fixed','Fixed / Choose One'],['random','Random'],['cycle','Cycle — in list order']].map(([key,label])=>`<option value="${key}" ${value===key?'selected':''}>${label}</option>`).join('')}</select>`;
}
function renderLookup(): void {
  const choose=picker()+'<p class="muted">Jenga requires exactly 54 cards, in block-number order.</p>',d=deck();
  const current=lookupIndex===null?undefined:d?.cards[lookupIndex];
  const activity=lookupActivity?.current;
  const setup=d?.activities.length?`${activityChoices('activity-mode',activityMode)}${activityMode==='fixed'?`<label for="fixed-activity">Use this Activity</label><select id="fixed-activity">${d.activities.map((a,i)=>`<option value="${esc(a.id)}" ${a.id===fixedActivityId?'selected':''}>${i+1}. ${esc(a.text)}</option>`).join('')}</select>`:''}`:'';
  app.innerHTML=`<section class="panel compact lookup-setup">${choose}${setup}</section>${d?.cards.length?`
    <form id="lookup-form" class="number-form"><label for="item-number">Block number · 1–54</label><div class="row"><input id="item-number" name="number" type="text" inputmode="numeric" pattern="[0-9]+" value="${lookupIndex===null?'':lookupIndex+1}" required><button class="narrow primary">Show</button></div></form>
    <section class="panel lookup-display"><span class="tag">${lookupIndex===null?'Choose a number':`Card ${lookupIndex+1} of ${d.cards.length}`}</span><div class="prompt ${current&&activity?'composed-activity':''}" aria-live="polite"><div class="prompt-content">${current?cardDisplay(current.text,activity):'Ready when you are'}</div></div>${current&&activityMode==='random'&&d.activities.length>1?button('reroll-activity','↻ Reroll Activity','quiet full'):''}<div class="row"><button data-action="lookup-prev" ${lookupIndex===0?'disabled':''}>Previous</button><button data-action="lookup-next" ${lookupIndex===d.cards.length-1?'disabled':''}>Next</button>${button('lookup-random','Random')}</div></section>${current?presentationToggle():''}`:''}`;
}
function renderPrompts(): void {
  const pool=availableDecks(),playable=pool.visible;
  if(promptIds===undefined)promptIds=new Set(pool.compatible.map(d=>d.id));
  promptIds=new Set([...promptIds].filter(id=>playable.some(d=>d.id===id)));
  const chosen=playable.filter(d=>promptIds!.has(d.id));
  if(promptDraw){
    const activity=promptSession?.activity;
    app.innerHTML=`<section class="game active-game prompt-picker"><div class="game-status"><span class="tag">${esc(promptDraw.deck.name)}</span><span class="tag">${chosen.length} selected decks</span></div><div class="prompt ${activity?'composed-activity':''}" aria-live="polite">${cardDisplay(promptDraw.card.text,activity)}</div><div class="game-controls">${activity&&promptActivityMode==='random'&&promptDraw.deck.activities.length>1?button('prompt-reroll','↻ Reroll Activity','quiet full'):''}<div class="answer-bar">${button('prompt-choose','Setup','quiet')}${button('prompt-draw','Draw Again','primary next-card')}${button('home','Work','quiet')}</div></div></section>${presentationToggle()}`;return;
  }
  const withActivities=chosen.filter(d=>d.activities.length);
  app.innerHTML=`<section class="panel"><h2>Choose decks</h2>${playable.length?`<label for="prompt-search">Find a deck</label><input id="prompt-search" type="search" value="${esc(promptSearch)}" placeholder="Search deck names"><div class="actions">${button('prompt-select-all','Select Compatible')}${button('prompt-clear','Clear')}</div><fieldset class="prompt-deck-list" aria-label="Prompt decks">${playable.map(d=>`<label class="check" data-prompt-name="${esc(d.name.toLocaleLowerCase())}" ${d.name.toLocaleLowerCase().includes(promptSearch.toLocaleLowerCase())?'':'hidden'}><input type="checkbox" data-prompt-id="${esc(d.id)}" ${promptIds!.has(d.id)?'checked':''}><span>${esc(d.name)}<small>${d.cards.length} cards · ${d.deckContext==='both'?'Both':d.deckContext==='play'?'Play':'Work'}</small></span></label>`).join('')}</fieldset>`:'<p>No eligible decks yet.</p>'}${pickerEscape(pool.other.length,pool.compatible.length)}<p class="muted">${chosen.length} decks selected · each deck has an equal chance.</p>${withActivities.length?`${activityChoices('prompt-activity-mode',promptActivityMode)}${promptActivityMode==='fixed'?withActivities.map(d=>`<label for="prompt-fixed-${esc(d.id)}">${esc(d.name)} Activity</label><select id="prompt-fixed-${esc(d.id)}" data-prompt-fixed="${esc(d.id)}">${d.activities.map(a=>`<option value="${esc(a.id)}" ${(promptFixed[d.id]??d.activities[0]?.id)===a.id?'selected':''}>${esc(a.text)}</option>`).join('')}</select>`).join(''):''}<p class="muted">Activities always come from the card’s source deck. Decks without Activities show the card alone.</p>`:''}<button type="button" data-action="prompt-draw" class="primary full" ${chosen.length?'':'disabled'}>Draw a Prompt</button></section><details class="panel"><summary>How to use</summary><p>Draw for group discussion, acting, drawing or guessing. Select one or more decks. Each deck has an equal chance, regardless of size. Random and Cycle Activities keep separate state for each source deck; Fixed lets you choose one per deck.</p></details>`;
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
  app.innerHTML=`<section class="game ${ended?'':'active-game'}"><div class="game-status"><span class="tag">Round ${match?.number ?? 1}</span><span id="remaining">${showCountdown?`${Math.ceil(round.remaining/1000)}s`:''}</span></div><div class="prompt" aria-live="polite">${ended?(round.remaining===0?'Time’s up!':'Round ended'):paused?'Paused':esc(round.current.text)}</div>
    ${ended?`${scores()}${!match?.scored?`<h2 class="award-title">Who gets the point?</h2><div class="option-list">${match?.teams.map((name,i)=>button('award-'+i,esc(name),'primary')).join('')}${button('award-none','No point')}</div>`:button('next-team-round','Next Round','primary full')}${button('finish-game','Finish Game','full quiet')}`:paused?`<div class="game-controls actions">${button('resume','Resume','primary')}${button('end-round','End Round')}</div>`:`<div class="game-controls"><div class="answer-bar">${button('pause','Pause','quiet')}${button('next-card','Next Card','primary next-card')}${button('end-round','End','quiet')}</div></div>`}</section>`;
}
function renderHeadbands():void {
  if(calibrating){
    const stage=placement.stage;
    const title=stage==='rotate'?'Rotate Your Phone':stage==='countdown'?'Get Ready':'Hold to Your Forehead';
    app.innerHTML=`<section class="game calibration guided-placement"><h2>${title}</h2><p>${stage==='rotate'?'Turn your phone sideways into landscape.':stage==='countdown'?'Keep it steady. Your friends will see the first card after the countdown.':'Raise the phone to your forehead with the screen facing your friends.'}</p><div class="prompt" aria-live="polite">${stage==='rotate'?'↻':stage==='countdown'?placement.seconds(performance.now()/1000):'▱'}</div><p class="muted" id="tilt-status">${preparing?'Preparing audio and motion…':!sensors.motionAllowed?'Motion unavailable or denied. Use Buttons to play.':stage==='countdown'?'Hold this position for calibration.':'Tilt down for Correct · Tilt up for Pass'}</p>${stage==='forehead'&&sensors.motionAllowed?button('forehead-ready','I’m at My Forehead','primary full'):''}${button('use-buttons','Use Buttons','full quiet')}${button('cancel-headbands','Cancel','full quiet')}</section>`;return;
  }
  if(!round){const choose=picker();app.innerHTML=`<form id="headbands-form" class="panel">${choose}${deck()?.cards.length?`<label for="head-duration">Round timer</label><select id="head-duration" name="duration">${durationPicker(headDuration)}</select><label class="check"><input type="checkbox" id="use-tilt" ${useTilt?'checked':''}> Tilt controls</label><label class="check"><input type="checkbox" id="timer-sound" ${timerSound?'checked':''}> Timer sound</label><button class="primary full">Start Round</button>`:''}</form><details class="panel"><summary>How to play</summary><p>Rotate into landscape, then hold the phone at your forehead for the three-second countdown. Your friends give clues. Tilt down for Correct and up for Pass, then return to your forehead before the next answer. You can also use the buttons.</p><p>Each card appears once per round. The round ends when time runs out or every card has been used. The timer waits while you position the phone.</p></details>`;return;}
  const game=round as HeadbandsRound,ended=game.phase==='ended',paused=game.phase==='paused';
  app.innerHTML=`<section class="game ${ended?'':'active-game'} ${useTilt?'tilt-game':''}"><div class="game-status"><span class="tag">${paused?'Paused':ended?'Round complete':''}</span><span id="remaining">${showCountdown?`${Math.ceil(game.remaining/1000)}s`:''}</span></div><div class="prompt" aria-live="polite">${ended?(game.reason==='complete'?'Deck complete!':game.reason==='time'?'Time’s up!':'Round ended'):paused?'Paused':esc(game.current.text)}</div>${ended?`<p class="result">${game.score} correct · ${game.passed} passed · ${game.results.filter(r=>r.outcome==='Unanswered').length} unanswered</p>${button('new-round','Play Again','primary full')}${button('home','Home','full quiet')}<section class="list-panel results">${game.results.map(r=>`<div class="card-row"><span class="card-text">${esc(r.card.text)}</span><span class="muted">${r.outcome}</span></div>`).join('')}</section>`:paused?`<div class="game-controls actions">${button('resume','Resume','primary')}${button('end-round','End Round')}</div>`:`<div class="game-controls">${useTilt?`<p class="tilt-hint muted" id="tilt-status">${tilt.calibrated?'Return to forehead between tilts':'Hold sideways and steady to enable tilts'}</p>`:''}<div class="answer-bar">${button('pause','Pause','quiet')}${useTilt?`<span class="muted tilt-score">${game.score} correct</span>`:`<div class="answer-buttons">${button('head-correct','Correct','primary')}${button('head-pass','Pass')}</div>`}${button('end-round','End','quiet')}</div></div>`}</section>`;
}
function tabooDeck():TabooDeck|undefined{return library.tabooDecks?.find(d=>d.id===tabooSelected);}
function renderTabooLibrary():void{
  const decks=alphabeticalDecks(library.tabooDecks??[]);
  app.innerHTML=`<div class="toolbar">${button('decks-tab','‹ All Decks')} ${button('taboo-new','＋ New Taboo Deck','primary')}</div>${entry==='new-deck'?`<form id="taboo-new-form" class="panel"><label for="taboo-name">Taboo deck name</label><input id="taboo-name" name="name" required maxlength="120"><div class="form-actions"><button class="primary">Create Deck</button>${button('cancel-edit','Cancel')}</div></form>`:''}<p class="muted">Only Taboo uses these decks. Regular decks stay front-and-center in Decks.</p>${libraryTools('taboo')}<section id="library-results" class="list-panel" aria-label="Taboo decks"></section>`;updateLibraryResults();
}
function renderTabooEditor():void{
  const d=tabooDeck();if(!d){route='taboo-library';render();return;}
  const c=d.cards.find(c=>c.id===editingCard),pages=Math.max(1,Math.ceil(d.cards.length/50));cardPage=Math.min(cardPage,pages-1);
  let form='';
  if(entry==='rename')form=`<form id="taboo-rename-form" class="panel"><label for="taboo-name">Deck name</label><input id="taboo-name" name="name" value="${esc(d.name)}" required maxlength="120"><div class="form-actions"><button class="primary">Save Name</button>${button('cancel-edit','Cancel')}</div></form>`;
  if(entry==='card')form=`<form id="taboo-card-form" class="panel"><h2>${c?'Edit':'Add'} Taboo Card</h2><label for="taboo-answer">Answer</label><input id="taboo-answer" name="text" value="${esc(c?.text??'')}" required>${Array.from({length:5},(_,i)=>`<label for="forbidden-${i}">Forbidden word ${i+1}</label><input id="forbidden-${i}" name="forbidden-${i}" value="${esc(c?.forbidden[i]??'')}" required>`).join('')}<div class="form-actions"><button class="primary">Save Card</button>${button('cancel-edit','Cancel')}${c?button('taboo-delete-card','Delete','danger'):''}</div></form>`;
  if(entry==='bulk')form=`<form id="taboo-bulk-form" class="panel"><h2>Paste Taboo Cards</h2><p class="muted">One card per line. Separate the answer and five forbidden words with |.</p><label for="taboo-bulk">Cards</label><textarea id="taboo-bulk" name="text" required placeholder="Astronaut | Space | NASA | Rocket | Moon | Helmet">${esc(bulkDraft)}</textarea><p class="muted">Every line is checked before any cards are saved.</p><div class="form-actions"><button class="primary">Review Import</button>${button('cancel-edit','Cancel')}</div></form>`;
  app.innerHTML=`<div class="toolbar">${button('taboo-library','‹ Taboo Decks')}<span class="muted">${d.cards.length} cards</span></div>${organization(d,'taboo')}<div class="actions">${button('add-card','＋ Add Card','primary')}${button('bulk','Paste a List')}</div>${form}${importPreview()}<section class="list-panel">${d.cards.slice(expandedCards?0:cardPage*50,expandedCards?undefined:cardPage*50+50).map(c=>`<button class="menu-row" data-taboo-edit="${esc(c.id)}"><span><strong>${esc(c.text)}</strong><small>${c.forbidden.map(esc).join(' · ')}</small></span><span class="arrow">›</span></button>`).join('')||'<p class="empty">Add an answer and five forbidden words.</p>'}</section>${pagination(d.cards.length)}${duplicateReport(d.cards)}<details class="panel"><summary>Deck options</summary><div class="option-list">${button('duplicate-deck','Duplicate Deck')}${button('rename-deck','Rename Deck')}${button('taboo-backup','Back Up This Deck')}${button('taboo-delete','Delete Deck','danger')}</div></details>`;
}
function renderTaboo():void{
  const pool=modeDecks(library.tabooDecks??[],'taboo',launchContext,showAllDecks),playable=pool.visible;
  if(!playable.some(d=>d.id===tabooSelected))tabooSelected=playable[0]?.id??'';
  if(!(round instanceof TabooRound)){
    app.innerHTML=`<section class="list-panel">${destination('taboo-library','Manage Taboo Decks','Create cards with five forbidden words.','▱')}</section>${playable.length?`<form id="taboo-round-form" class="panel"><label for="taboo-picker">Taboo deck</label><select id="taboo-picker">${deckOptions(pool,tabooSelected)}</select>${pickerEscape(pool.other.length,pool.compatible.length)}<label for="taboo-team-count">Teams</label><select id="taboo-team-count">${Array.from({length:7},(_,i)=>`<option value="${i+2}" ${tabooTeams.length===i+2?'selected':''}>${i+2} teams</option>`).join('')}</select>${tabooTeams.map((name,i)=>`<label for="taboo-team-${i}">Team ${i+1} name</label><input id="taboo-team-${i}" data-taboo-team="${i}" value="${esc(name)}" required maxlength="80">`).join('')}<label for="taboo-duration">Round timer</label><select id="taboo-duration">${durationPicker(tabooDuration)}</select><label class="check"><input id="timer-sound" type="checkbox" ${timerSound?'checked':''}> Timer sound</label><button class="primary full" ${preparing?'disabled':''}>${preparing?'Preparing…':'Start Game'}</button></form>`:`<p class="empty">No compatible Taboo decks to select.</p>${pickerEscape(pool.other.length,pool.compatible.length)}`}<details class="panel"><summary>How to play</summary><p>Describe the bold answer without saying it or any of the five forbidden words. A player from another team watches the card and calls violations.</p><p>Correct earns 1 point. Pass earns 0. Taboo subtracts 1. Teams take turns each round. Each card appears once per round; the deck reshuffles next round. The countdown stays hidden.</p></details>`;return;
  }
  const g=round,ended=g.phase==='ended',paused=g.phase==='paused';if(ended)tabooMatch?.settle();
  app.innerHTML=`<section class="game ${ended?'':'active-game'}"><div class="game-status"><span class="tag">${esc(tabooMatch?.teams[tabooMatch.teamIndex]??'')} · Round ${tabooMatch?.number??1}</span><span id="remaining">${showCountdown?`${Math.ceil(g.remaining/1000)}s`:''}</span></div><div class="taboo-prompt"><div class="prompt" aria-live="polite">${ended?(g.reason==='complete'?'Deck complete!':g.reason==='time'?'Time’s up!':'Round ended'):paused?'Paused':esc(g.current.text)}</div>${!ended&&!paused?`<p class="forbidden-label">DON’T SAY</p><ul class="forbidden-words">${g.current.forbidden.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>`:''}</div>${ended?`<p class="result">Round score: ${g.score} · ${g.results.filter(r=>r.outcome==='Correct').length} correct · ${g.results.filter(r=>r.outcome==='Taboo').length} violations</p><section class="list-panel">${tabooMatch?.teams.map((name,i)=>`<div class="card-row"><span class="card-text">${esc(name)}</span><strong>${tabooMatch!.scores[i]}</strong></div>`).join('')}</section>${button('taboo-next-round',`Next: ${esc(tabooMatch?.teams[tabooMatch.number%tabooMatch.teams.length]??'team')}`,'primary full')}${button('finish-game','Finish Game','full quiet')}`:paused?`<div class="game-controls actions">${button('resume','Resume','primary')}${button('end-round','End Round')}</div>`:`<div class="game-controls"><div class="answer-bar taboo-controls">${button('pause','Pause','quiet')}<div class="answer-buttons">${button('taboo-correct','Correct','primary')}${button('taboo-pass','Pass')}${button('taboo-violation','Taboo','danger')}</div>${button('end-round','End','quiet')}</div></div>`}</section>`;
}

function collectionSummary(value:Library):string{return `${value.decks.length} regular decks · ${value.decks.reduce((n,d)=>n+d.cards.length,0)} cards · ${value.decks.reduce((n,d)=>n+d.activities.length,0)} activities<br>${value.tabooDecks?.length??0} Taboo decks · ${(value.tabooDecks??[]).reduce((n,d)=>n+d.cards.length,0)} Taboo cards`;}
function backupStatus():string {
  const date=(value:string|null)=>value?esc(new Date(value).toLocaleString()):'Not yet';
  return `${metric('Last full-library export requested',date(preferences.lastExport))}${metric('Last backup you confirmed saving',date(preferences.lastConfirmedBackup))}<p class="muted">An export request doesn’t prove the file was saved. After saving the full library to Files or another safe location, confirm it here.</p>${button('confirm-backup','I Saved a Full-Library Backup')}<label class="check"><input id="backup-reminders" type="checkbox" ${preferences.backupReminders?'checked':''}> Remind me monthly in Decks</label><p class="muted">Local reminders only, shown while using the app. No notifications or uploads. Individual-deck exports do not reset this reminder.</p>`;
}
function renderBackups(): void {
  const overlap=pendingBackup?backupOverlap(library,pendingBackup.library):0;
  const incoming=pendingBackup?.library;
  app.innerHTML=`<p class="muted">Keep a backup in Files or iCloud Drive. Decks stay on this device; GitHub does not back them up.</p>
    ${!loadFailure?`<section class="panel"><h2>Save a copy</h2><p>${collectionSummary(library)}</p>${button('backup','Export Backup','primary full')}${backupStatus()}<details ${showBackupText?'open':''}><summary>Copy backup text instead</summary>${button('backup-text','Show Backup Text')}${showBackupText?`<label for="backup-json">Backup JSON</label><textarea id="backup-json" readonly>${esc(exportBackup(library))}</textarea>${button('copy-backup','Copy Backup Text')}<p class="muted">Save this text in a file ending in .json. The file can be restored below.</p>`:''}</details></section>`:`<p class="error">${esc(loadFailure)}</p>`}
    <section class="panel"><h2>Restore a backup</h2><p class="muted">Choose a DeckForge JSON backup. You’ll review it before anything changes.</p><label for="backup-file" class="file-label">Choose Backup File</label><input id="backup-file" type="file" accept=".json,application/json" ${futureData?'disabled':''}>
      ${incoming?`<div class="restore-preview"><h3>Ready to import</h3><p>${esc(backupFilename)}<br>${collectionSummary(incoming)}<br><small>${esc(pendingBackup!.source)}</small></p><details><summary>Preview decks</summary><ul>${[...incoming.decks,...(incoming.tabooDecks??[]).map(d=>({...d,name:d.name+' (Taboo)'}))].map(d=>`<li>${esc(d.name)} · ${d.cards.length} cards · ${'activities' in d?d.activities.length+' activities · ':''}${esc(d.deckContext)} · ${esc(d.compatibleModes.map(id=>MODES.find(m=>m.id===id)?.title??id).join(', ')||'No assigned modes')}</li>`).join('')}</ul></details>${overlap?`<p class="muted">${overlap} incoming deck names already exist. Add copies keeps both; names are never used to overwrite decks.</p>`:''}<label for="restore-mode">Import as</label><select id="restore-mode"><option value="add" ${restoreMode==='add'?'selected':''}>Add copies — keep existing decks</option><option value="replace" ${restoreMode==='replace'?'selected':''}>Replace library — save a restore point first</option></select><p class="muted">${restoreMode==='add'?'Your existing decks and timer settings stay as they are.':'Your current decks will be replaced. A local restore point lets you undo this; export a file for a separate backup.'}</p>${restoreMode==='replace'?`<p>Current library: ${collectionSummary(library)}</p><label class="check"><input id="acknowledge-replace" type="checkbox" ${replaceAcknowledged?'checked':''}> I understand this replaces my current library and saved game settings.</label>`:''}<div class="form-actions"><button type="button" data-action="restore-backup" class="primary" ${restoreMode==='replace'&&!replaceAcknowledged?'disabled':''}>${restoreMode==='add'?'Add Deck Copies':'Replace Library'}</button>${button('cancel-restore','Cancel')}</div></div>`:''}</section>
    ${restorePoint && !futureData?`<details class="panel"><summary>Local recovery</summary><p>Recover ${restorePoint.library.decks.length} regular and ${restorePoint.library.tabooDecks?.length??0} Taboo decks${restorePoint.savedAt?` from ${esc(new Date(restorePoint.savedAt).toLocaleString())}`:' from the previous save'}. A local copy cannot protect against clearing all app data.</p>${button('recover','Review Restore Point')}</details>`:''}`;
}
function renderSettings(): void {
  app.innerHTML=`<p class="section-label">YOUR DATA</p><section class="list-panel">${destination('backups','Backups','Export a file or restore your decks.','↥')}</section>
    <section class="panel"><h2>Reading & controls</h2><label class="check"><input id="large-text" type="checkbox" ${preferences.largeText?'checked':''}> Larger text</label><p class="muted">Also supports browser zoom and your device’s reduced-motion preference.</p><details><summary>Keyboard controls</summary><p>Tab moves between controls; Enter activates buttons. Jenga: Left/Right for Previous/Next, R for Random. Prompt Picker: Space draws again during presentation. Timed games: Space pauses/resumes. Catchphrase: Right for Next Card. Headbands with buttons: Down for Correct, Up for Pass. Taboo: Right for Correct, Left for Pass, V for a violation.</p><p>Shortcuts are inactive while typing or using menus, and never start a round or end one.</p></details></section><section class="panel"><h2>Storage protection</h2>${metric('Protection',storageMode,'storage-mode')}<p class="muted">Protection helps prevent automatic cleanup. A saved backup file is still the safest recovery option.</p>${button('storage','Request Storage Protection')}</section>
    <section class="panel"><h2>App updates</h2>${metric('Installed version','0.11.1')}${metric('Offline & updates',offline,'settings-offline')}<p class="muted">Updates keep your decks. After an update downloads, close every window for this web app and reopen.</p>${button('check-update','Check for Update')}</section>
    <p class="section-label">DIAGNOSTICS</p><section class="list-panel">${destination('lab','Device Tests','Motion, audio, offline checks and vibration.','⚙')}</section>`;
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
    <details class="panel diagnostic"><summary>Haptic / vibration</summary>${metric('Vibration API',webHaptics.available()?'Available · feeling it is the real test':'Unavailable in this browser')}${button('vibrate','Test Vibration')}<p class="muted">Unavailable vibration is a platform limitation, not a deck-game failure.</p></details>`;
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
function navigate(target: string,nextSection?:typeof section): void {
  const previousSection=section,previousRoute=route;
  if((calibrating || (round && round.phase!=='ended')) && !confirm('Leave and end the current round?')) return;
  if(nextSection)section=nextSection;
  if(['library','editor','taboo-library','taboo-editor'].includes(target))section='decks';
  if(MODES.some(m=>m.id===target)){launchContext=(target==='lookup'||target==='prompts'||section==='work')?'work':'play';section=launchContext;showAllDecks=false;selected='';tabooSelected='';promptIds=undefined;promptSearch='';promptActivityMode='none';promptFixed={};promptSession=undefined;}
  gameGeneration++;calibrating=false;preparing=false;round=undefined;match=undefined;tabooMatch=undefined;gameAudio.stop();releaseWake();audio.stop();sensors.stop();tilt.reset();placement.reset();sensors.onGravity=undefined; entry=''; editingCard=undefined; lookupIndex=null;
  presenting=false;presentationControls=true;expandedCards=false;pendingImport=undefined;bulkDraft='';revealedDeck='';resetLookup();editorSection='cards';editingActivity=undefined;promptDraw=undefined;route=target; say(''); render(); app.focus({preventScroll:true});window.scrollTo({top:0});
  if(previousSection!==section){
    const tabs=['play','work','decks'];
    animateNavigation(tabs.indexOf(section)>tabs.indexOf(previousSection)?'tab-right':'tab-left');
  }else if(previousRoute!==route)animateNavigation(['home','library','taboo-library'].includes(route)?'back':'forward');
}
function openEntry(next: typeof entry): void {
  pendingImport=undefined;bulkDraft='';skipImportDuplicates=false;confirmActivityDelete=false;entry=next; render(); app.querySelector<HTMLElement>('form:not(#organization-form) input,form:not(#organization-form) textarea')?.focus();
}
async function downloadBackup(value:Library,fullLibrary=false):Promise<void>{
  const result=await webShare.saveFile(exportBackup(value),`DeckForge-backup-${new Date().toISOString().slice(0,10)}.json`);
  if(result==='canceled')return;
  if(fullLibrary)await setPreferences(next=>{next.lastExport=new Date().toISOString();});
  say(result==='shared'?'Backup shared. Keep a copy in Files or another safe location, then confirm saving it.':'Backup download requested. Keep the file somewhere safe.');
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
    case 'expand-cards':expandedCards=!expandedCards;cardPage=0;render();break;
    case 'presentation':presenting=!presenting;presentationControls=true;render();break;
    case 'presentation-controls':presentationControls=!presentationControls;render();break;
    case 'duplicate-deck':{const source=route==='taboo-editor'?tabooDeck():d;if(!source)break;const names=(route==='taboo-editor'?library.tabooDecks??[]:library.decks).map(x=>x.name);const copy=copyDeck(source,names,uid);await mutate(next=>{if('activities' in copy)next.decks.push(copy);else(next.tabooDecks??=[]).push(copy);});if('activities' in copy)selected=copy.id;else tabooSelected=copy.id;expandedCards=false;cardPage=0;expandedCards=false;pendingImport=undefined;entry='';render();say('Independent copy saved. The original deck is unchanged.');break;}
    case 'confirm-import':{const review=pendingImport;if(!review)break;const target=review.kind==='taboo'?tabooDeck():d;if(!target||target.id!==review.deckId)throw new Error('Reopen import for this deck.');const existing=review.kind==='activities'?(target as Deck).activities:target.cards;const items=importItems(review,existing,skipImportDuplicates);if(!items.length){say('No new lines to import. Uncheck Skip duplicates to keep them.');break;}await mutate(next=>{if(review.kind==='taboo'){const t=next.tabooDecks!.find(x=>x.id===target.id)!;items.forEach(c=>t.cards.push({id:uid(),text:c.text,forbidden:c.forbidden!}));}else{const t=next.decks.find(x=>x.id===target.id)!;if(review.kind==='activities'){const createdAt=new Date().toISOString();items.forEach(c=>t.activities.push({id:uid(),text:c.text,createdAt}));}else items.forEach(c=>t.cards.push({id:uid(),text:c.text}));}});pendingImport=undefined;bulkDraft='';entry='';render();say(`${items.length} ${review.kind==='activities'?'activities':'cards'} saved.`);break;}
    case 'editor-cards':case 'editor-activities':pendingImport=undefined;bulkDraft='';confirmActivityDelete=false;editorSection=name==='editor-cards'?'cards':'activities';entry='';editingCard=undefined;editingActivity=undefined;render();break;
    case 'add-activity':editingActivity=undefined;openEntry('activity');break;
    case 'activity-bulk':openEntry('activity-bulk');break;
    case 'activity-page-prev':activityPage--;render();break;
    case 'activity-page-next':activityPage++;render();break;
    case 'delete-activity':confirmActivityDelete=true;render();break;
    case 'cancel-delete-activity':confirmActivityDelete=false;render();break;
    case 'confirm-delete-activity':if(d&&editingActivity&&confirmActivityDelete){const id=editingActivity;await mutate(next=>{const target=next.decks.find(x=>x.id===d.id)!;target.activities=target.activities.filter(a=>a.id!==id);},true);entry='';editingActivity=undefined;restorePoint=await recovery();render();say('Activity deleted. A local restore point was saved.');}break;

    case 'taboo-menu':navigate('taboo');break;
    case 'taboo-library':navigate('taboo-library');break;
    case 'taboo-new':openEntry('new-deck');break;
    case 'taboo-backup':if(tabooDeck())await downloadBackup({...library,decks:[],tabooDecks:[tabooDeck()!]});break;
    case 'taboo-delete':{const t=tabooDeck();if(t&&confirm(`Delete “${t.name}” and its cards?`)){await mutate(next=>{next.tabooDecks=next.tabooDecks?.filter(d=>d.id!==t.id);},true);entry='';route='taboo-library';render();say('Taboo deck deleted. A local restore point was saved.');}break;}
    case 'taboo-delete-card':{const t=tabooDeck(),id=editingCard;if(t&&id&&confirm('Delete this Taboo card?')){await mutate(next=>{const d=next.tabooDecks!.find(d=>d.id===t.id)!;d.cards=d.cards.filter(c=>c.id!==id);},true);entry='';editingCard=undefined;render();say('Card deleted. A local restore point was saved.');}break;}
    case 'taboo-correct':case 'taboo-pass':case 'taboo-violation':checkRound();if(round instanceof TabooRound&&round.answer(name==='taboo-correct'?'Correct':name==='taboo-pass'?'Passed':'Taboo',performance.now())){if(name!=='taboo-pass')gameAudio.feedback(name==='taboo-correct');if(round.phase==='ended'){gameAudio.stopCountdown();releaseWake();tabooMatch?.settle();}render();}break;
    case 'taboo-next-round':if(tabooMatch&&round?.phase==='ended'&&!preparing){const token=gameGeneration;preparing=true;try{await readyAudio();if(token===gameGeneration&&!document.hidden){round=tabooMatch.start(performance.now());startCues();}}finally{preparing=false;render();}}break;
    case 'quick-rename':if(route==='editor'){editorSection='cards';openEntry('rename');document.querySelector('#rename')?.scrollIntoView({block:'start'});}else if(route==='taboo-editor'){openEntry('rename');document.querySelector('#taboo-rename-form')?.scrollIntoView({block:'start'});}break;
    case 'home': navigate(sectionRoot(section)); break;
    case 'settings': navigate('settings'); break;
    case 'backups': restorePoint=await recovery(); navigate('backups'); break;
    case 'back': navigate('library'); break;
    case 'decks-tab':navigate('library','decks');break;
    case 'toggle-all-decks':showAllDecks=!showAllDecks;render();break;
    case 'new-deck': openEntry('new-deck'); break;
    case 'rename-deck': openEntry('rename'); break;
    case 'add-card': editingCard=undefined; openEntry('card'); break;
    case 'bulk': openEntry('bulk'); break;
    case 'delete-deck': if(d && confirm(`Delete “${d.name}” and its ${d.cards.length} cards?`)) { await mutate(next=>{next.decks=next.decks.filter(x=>x.id!==d.id);},true); restorePoint=await recovery(); selected=''; entry=''; route='library'; render(); say('Deck deleted. You can recover the library from Backups.'); } break;
    case 'delete-card': if(d && editingCard && confirm('Delete this card?')) {
      const id=editingCard; await mutate(next=>{const target=next.decks.find(x=>x.id===d.id)!;target.cards=target.cards.filter(c=>c.id!==id);},true); editingCard=undefined;entry='';restorePoint=await recovery();render();say('Card deleted. A local restore point was saved.');
    } break;
    case 'cancel-edit': pendingImport=undefined;bulkDraft='';confirmActivityDelete=false;editingActivity=undefined;editingCard=undefined; entry=''; render(); break;
    case 'page-prev': cardPage--; render(); break;
    case 'page-next': cardPage++; render(); break;
    case 'prompt-draw': if(!promptSession)promptSession=new PromptSession(availableDecks().visible.filter(d=>promptIds?.has(d.id)),promptActivityMode,promptFixed);promptDraw=promptSession.draw();render();if(promptDraw)window.scrollTo({top:0});break;
    case 'prompt-reroll':promptSession?.reroll();render();break;
    case 'prompt-select-all':promptIds=new Set(availableDecks().compatible.map(d=>d.id));promptSession=undefined;render();break;
    case 'prompt-clear':promptIds=new Set();promptSession=undefined;render();break;
    case 'prompt-choose': presenting=false;promptDraw=undefined;promptSession=undefined;render();break;
    case 'prompt-library': navigate('library');break;
    case 'lookup-prev': if(d?.cards.length)selectLookupCard(lookupIndex===null?0:Math.max(0,lookupIndex-1));break;
    case 'lookup-next': if(d?.cards.length)selectLookupCard(lookupIndex===null?0:Math.min(d.cards.length-1,lookupIndex+1));break;
    case 'lookup-random': if(d?.cards.length)selectLookupCard(Math.floor(Math.random()*d.cards.length));break;
    case 'reroll-activity':if(lookupIndex!==null&&lookupActivity?.mode==='random'){lookupActivity.reroll();render();say('Activity changed. The card stayed the same.');}break;
    case 'next-card': checkRound();if(round instanceof Round && round.answer(false,performance.now()))render();break;
    case 'head-correct':case 'head-pass': headAnswer(name==='head-correct');break;
    case 'pause': pauseGame();break;
    case 'resume': if(preparing)break;if(route==='headbands')await prepareHeadbands(true);else if(round?.phase==='paused'){
      const token=gameGeneration;await readyAudio();if(token!==gameGeneration||document.hidden||round?.phase!=='paused')break;round.resume(performance.now());gameAudio.schedule(round.remaining,roundLength,timerSound);if(loopForRound)void audio.startLoop().catch(audioError);void keepAwake();render();
    }break;
    case 'end-round': pauseGame();if(confirm('End this round?')){if(round instanceof HeadbandsRound||round instanceof TabooRound)round.end();else if(round)round.phase='ended';gameAudio.stop();audio.stop();render();}break;
    case 'new-round': gameGeneration++;round=undefined;gameAudio.stop();audio.stop();sensors.stop();tilt.reset();calibrating=false;render();break;
    case 'next-team-round': if(match?.scored&&!preparing){const token=gameGeneration;preparing=true;try{await readyAudio();if(token===gameGeneration&&!document.hidden&&match?.scored){round=match.start(performance.now());startCues();}}finally{preparing=false;}}break;
    case 'finish-game': navigate(sectionRoot(section));break;
    case 'forehead-ready':placement.confirmPlacement();say('Keep the phone steady at your forehead.');break;
    case 'use-buttons': if(!preparing){gameAudio.stopCountdown();placement.reset();useTilt=false;calibrating=false;sensors.stop();tilt.reset();beginHeadbands();}break;
    case 'cancel-headbands': placement.reset();gameGeneration++;calibrating=false;preparing=false;sensors.stop();tilt.reset();gameAudio.stop();releaseWake();render();break;
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
    case 'backup': await downloadBackup(library,true); break;
    case 'confirm-backup':await setPreferences(next=>{next.lastConfirmedBackup=new Date().toISOString();next.snoozedUntil=null;});say('Backup confirmation saved on this device.');break;
    case 'snooze-backup':await setPreferences(next=>{next.snoozedUntil=new Date(Date.now()+7*24*60*60*1000).toISOString();});break;
    case 'clear-library-filters':{const kind=route==='taboo-library'?'taboo':'regular';libraryFilters[kind]={search:'',context:'all',mode:'all'};revealedDeck='';render();break;}
    case 'backup-text': showBackupText=true;render();break;
    case 'copy-backup': await webShare.copyText(document.querySelector<HTMLTextAreaElement>('#backup-json')!.value);say('Backup text copied. Save it as a .json file.');break;
    case 'backup-deck': if(d) await downloadBackup({...library,decks:[d],tabooDecks:[]}); break;
    case 'cancel-restore': pendingBackup=undefined;backupFilename='';render();break;
    case 'restore-backup': if(pendingBackup) {
      if(restoreMode==='replace'&&!replaceAcknowledged)throw new Error('Acknowledge replacement before continuing.');
      const restored=restoreBackup(library,pendingBackup.library,restoreMode);
      await mutate(next=>{for(const key of Object.keys(next))delete (next as unknown as Record<string,unknown>)[key];Object.assign(next,restored);},restoreMode==='replace');
      tabooTeams=library.tabooTeams?[...library.tabooTeams]:defaultTeams();tabooDuration=library.tabooDuration??0;draftTeams=library.teams?[...library.teams]:defaultTeams();draftDuration=library.teams?library.duration:0;headDuration=library.headbandsDuration??60;loadFailure='';restorePoint=await recovery();pendingBackup=undefined;entry='';selected='';lookupIndex=null;route='library';render();say('Backup restored and saved.');
    } break;
    case 'recover': if(restorePoint) { pendingBackup={library:restorePoint.library,source:'DeckForge PWA'};backupFilename='Local restore point';restoreMode='replace';replaceAcknowledged=false;render();say('Review this recovery copy before replacing the library.'); } break;
    case 'sensors': await sensors.start(); updateLab(); break;
    case 'stop-sensors': sensors.stop(); updateLab(); break;
    case 'tone': await audio.playTone(); updateLab(); say('Tone playback requested. Confirm you hear it.'); break;
    case 'start-loop': await audio.startLoop(); updateLab(); break;
    case 'stop-audio': audio.stop(); updateLab(); break;
    case 'vibrate': say(webHaptics.available() ? `Vibration request ${webHaptics.test()?'accepted':'rejected'}. Did you feel it?` : 'Vibration unavailable in this browser.'); break;
  }
}
function audioError(error: unknown): void { audio.log(`Playback failed: ${String(error)}`);say('Sound was interrupted. Pause and Resume to retry timer audio, or use Device Tests.'); }
async function submit(form: HTMLFormElement): Promise<void> {
  const data=new FormData(form),text=String(data.get('text') ?? '').trim(),name=String(data.get('name') ?? '').trim(),d=deck();
  switch(form.id) {
    case 'organization-form':{
      const format=form.dataset.format==='taboo'?'taboo':'regular',target=format==='taboo'?tabooDeck():deck();if(!target)break;
      const known=MODES.filter(m=>m.format===format).map(m=>m.id as string);
      const fields=metadata(data.get('deckContext'),[...(target.cards.length!==54&&target.compatibleModes.includes('lookup')?['lookup']:[]),...data.getAll('compatibleModes').map(String),...target.compatibleModes.filter(m=>!known.includes(m))],format);
      await mutate(next=>{Object.assign((format==='taboo'?next.tabooDecks:next.decks)!.find(d=>d.id===target.id)!,fields);});say('Deck organization saved.');break;
    }
    case 'activity-form':if(!text)throw new Error('Enter an Activity template.');if(d){const id=editingActivity;await mutate(next=>{const target=next.decks.find(x=>x.id===d.id)!;if(id)target.activities.find(a=>a.id===id)!.text=text;else target.activities.push({id:uid(),text,createdAt:new Date().toISOString()});});entry='';editingActivity=undefined;render();say('Activity saved.');}break;
    case 'activity-bulk-form':case 'taboo-bulk-form':case 'bulk-form':{const kind=form.id==='activity-bulk-form'?'activities':form.id==='taboo-bulk-form'?'taboo':'cards';const target=kind==='taboo'?tabooDeck():d;if(!target)break;bulkDraft=String(data.get('text')??'');pendingImport=reviewImport(kind,target.id,bulkDraft,kind==='activities'?(target as Deck).activities:target.cards);render();document.querySelector('#import-review')?.scrollIntoView({block:'nearest'});say('Review the cleaned lines, then confirm to save.');break;}

    case 'taboo-new-form':if(!name)throw new Error('Enter a deck name.');{const id=uid();await mutate(next=>{(next.tabooDecks??=[]).push({id,name,cards:[],...metadata(undefined,undefined,'taboo')});});tabooSelected=id;route='taboo-editor';entry='';cardPage=0;render();say('Taboo deck saved.');break;}
    case 'taboo-rename-form':if(!name)throw new Error('Enter a deck name.');await mutate(next=>{next.tabooDecks!.find(d=>d.id===tabooSelected)!.name=name;});entry='';render();break;
    case 'taboo-card-form':{const value=validateTabooCard(text,Array.from({length:5},(_,i)=>String(data.get('forbidden-'+i)??'').trim()));await mutate(next=>{const d=next.tabooDecks!.find(d=>d.id===tabooSelected)!;if(editingCard)Object.assign(d.cards.find(c=>c.id===editingCard)!,value);else d.cards.push({id:uid(),...value});});entry='';editingCard=undefined;render();say('Taboo card saved.');break;}
    case 'taboo-round-form':{const d=tabooDeck();if(!d||preparing)break;const names=teamNames(tabooTeams),duration=tabooDuration;roundSeconds(duration);const token=++gameGeneration;preparing=true;const sound=readyAudio();render();try{await Promise.all([sound,mutate(next=>{next.tabooTeams=names;next.tabooDuration=duration;})]);if(token!==gameGeneration||document.hidden)return;tabooMatch=new TabooGame(d.cards,names,duration);round=tabooMatch.start(performance.now());startCues();}finally{preparing=false;render();}break;}

    case 'new-deck': if(!name) throw new Error('Enter a deck name.'); {
      const id=uid();await mutate(next=>next.decks.push({id,name,cards:[],activities:[],...metadata(undefined,MODES.filter(m=>m.format==='regular'&&m.id!=='lookup').map(m=>m.id),'regular')}));selected=id;route='editor';editorSection='cards';cardPage=0;expandedCards=false;pendingImport=undefined;entry='';render();say('Deck saved.');break;
    }
    case 'rename': if(!name) throw new Error('Enter a deck name.'); if(d) await mutate(next=>{next.decks.find(x=>x.id===d.id)!.name=name;});entry='';render();say('Name saved.');break;
    case 'card-form': if(!text) throw new Error('Enter a word or prompt.');if(d) {
      await mutate(next=>{const target=next.decks.find(x=>x.id===d.id)!;if(editingCard) target.cards.find(c=>c.id===editingCard)!.text=text;else target.cards.push({id:uid(),text});});editingCard=undefined;entry='';render();say('Card saved.');
    } break;
    case 'lookup-form':if(d?.cards.length===54)selectLookupCard(lookup(d.cards,String(data.get('number'))));break;
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
app.addEventListener('input',event=>{if(event.target instanceof HTMLTextAreaElement&&['bulk-text','activity-bulk','taboo-bulk'].includes(event.target.id)){bulkDraft=event.target.value;pendingImport=undefined;document.querySelector('#import-review')?.remove();}if(event.target instanceof HTMLElement&&['activity-text','preview-card-text'].includes(event.target.id))updateActivityPreview();if(event.target instanceof HTMLInputElement&&event.target.id==='library-search'){libraryFilters[route==='taboo-library'?'taboo':'regular'].search=event.target.value;revealedDeck='';updateLibraryResults();}if(event.target instanceof HTMLInputElement&&event.target.id==='prompt-search'){promptSearch=event.target.value;const term=promptSearch.toLocaleLowerCase();app.querySelectorAll<HTMLElement>('[data-prompt-name]').forEach(el=>{el.hidden=!el.dataset.promptName!.includes(term);});}if(event.target instanceof HTMLInputElement&&event.target.dataset.tabooTeam!==undefined)tabooTeams[Number(event.target.dataset.tabooTeam)]=event.target.value;if(event.target instanceof HTMLInputElement && event.target.dataset.team!==undefined)draftTeams[Number(event.target.dataset.team)]=event.target.value;if(event.target instanceof HTMLTextAreaElement && event.target.id==='bulk-text')document.querySelector('#bulk-count')!.textContent=`${importLines(event.target.value).length} cards ready`;});
app.addEventListener('change',event=>{
  if(event.target instanceof HTMLInputElement&&event.target.id==='skip-import-duplicates')skipImportDuplicates=event.target.checked;
  if(event.target instanceof HTMLSelectElement&&event.target.id==='preview-card')updateActivityPreview();
  const el=event.target;
  if(el instanceof HTMLSelectElement&&['library-context','library-mode'].includes(el.id)){const filter=libraryFilters[route==='taboo-library'?'taboo':'regular'];if(el.id==='library-context')filter.context=el.value;else filter.mode=el.value;revealedDeck='';updateLibraryResults();}
  if(el instanceof HTMLInputElement&&el.id==='acknowledge-replace'){replaceAcknowledged=el.checked;const button=app.querySelector<HTMLButtonElement>('[data-action="restore-backup"]');if(button)button.disabled=!replaceAcknowledged;}
  if(el instanceof HTMLInputElement&&['large-text','backup-reminders'].includes(el.id))void setPreferences(next=>{if(el.id==='large-text')next.largeText=el.checked;else{next.backupReminders=el.checked;if(el.checked&&!next.reminderSince)next.reminderSince=new Date().toISOString();}}).catch(error=>say(`Could not save preference: ${String(error)}`));
  if(el instanceof HTMLSelectElement&&el.id==='activity-mode'){activityMode=el.value as ActivityMode;configureLookup();render();}
  if(el instanceof HTMLSelectElement&&el.id==='fixed-activity'){fixedActivityId=el.value;configureLookup();render();}
  if(el instanceof HTMLSelectElement&&el.id==='taboo-picker'){tabooSelected=el.value;render();}
  if(el instanceof HTMLSelectElement&&el.id==='taboo-duration')tabooDuration=Number(el.value);
  if(el instanceof HTMLSelectElement&&el.id==='taboo-team-count'){const count=Number(el.value);while(tabooTeams.length<count)tabooTeams.push('Team '+(tabooTeams.length+1));tabooTeams=tabooTeams.slice(0,count);render();}
  if(el instanceof HTMLSelectElement && el.id==='team-count'){const count=Number(el.value);while(draftTeams.length<count)draftTeams.push('Team '+(draftTeams.length+1));draftTeams=draftTeams.slice(0,count);render();}
  if(el instanceof HTMLSelectElement && el.id==='duration')draftDuration=Number(el.value);
  if(el instanceof HTMLSelectElement && el.id==='head-duration')headDuration=Number(el.value);
  if(el instanceof HTMLInputElement && el.id==='timer-sound')timerSound=el.checked;
  if(el instanceof HTMLInputElement && el.id==='use-tilt')useTilt=el.checked;
  if(el instanceof HTMLInputElement&&el.dataset.promptId){if(el.checked)promptIds?.add(el.dataset.promptId);else promptIds?.delete(el.dataset.promptId);promptSession=undefined;render();}
  if(el instanceof HTMLSelectElement&&el.id==='prompt-activity-mode'){promptActivityMode=el.value as ActivityMode;promptSession=undefined;render();}
  if(el instanceof HTMLSelectElement&&el.dataset.promptFixed){promptFixed[el.dataset.promptFixed]=el.value;promptSession=undefined;}
  if(el instanceof HTMLSelectElement && el.id==='deck-picker') {selected=el.value;resetLookup();render();}
  if(el instanceof HTMLSelectElement && el.id==='restore-mode') {restoreMode=el.value==='replace'?'replace':'add';replaceAcknowledged=false;render();}
  if(el instanceof HTMLInputElement && el.id==='background-audio') audio.keepInBackground=el.checked;
  if(el instanceof HTMLInputElement && el.id==='round-loop') loopForRound=el.checked;
  if(el instanceof HTMLInputElement && el.id==='show-countdown') showCountdown=el.checked;
  if(el instanceof HTMLInputElement && el.id==='backup-file') {
    const file=el.files?.[0];if(!file)return;pendingBackup=undefined;
    void (async()=>{
      if(file.size>MAX_BACKUP_BYTES)throw new Error('Choose a backup smaller than 20 MB.');
      const preview=parseBackup(await file.text());pendingBackup=preview;backupFilename=file.name;restoreMode='add';replaceAcknowledged=false;render();say('Backup checked. Review it before importing.');
    })().catch(error=>{render();say(String(error));});
  }
});
let deckSwipe:{row:HTMLElement;x:number;y:number;pointer:number;horizontal:boolean}|undefined;
app.addEventListener('pointerdown',event=>{
  const row=(event.target as HTMLElement).closest<HTMLElement>('.swipe-front')?.parentElement;
  if(!row)return;deckSwipe={row,x:event.clientX,y:event.clientY,pointer:event.pointerId,horizontal:false};
});
app.addEventListener('pointermove',event=>{
  if(!deckSwipe||event.pointerId!==deckSwipe.pointer)return;
  const dx=event.clientX-deckSwipe.x,dy=event.clientY-deckSwipe.y;
  if(Math.abs(dy)>20&&!deckSwipe.horizontal&&Math.abs(dy)>Math.abs(dx)){deckSwipe=undefined;return;}
  if(Math.abs(dx)>20&&Math.abs(dx)>Math.abs(dy)*1.3){deckSwipe.horizontal=true;event.preventDefault();}
});
app.addEventListener('pointerup',event=>{
  if(!deckSwipe||event.pointerId!==deckSwipe.pointer)return;
  const swipe=deckSwipe;deckSwipe=undefined;const dx=event.clientX-swipe.x;
  if(swipe.horizontal){suppressDeckClickUntil=performance.now()+400;if(dx<-45)revealDeck(swipe.row.dataset.swipeKey??'');else if(dx>45)revealDeck('');}
});
app.addEventListener('pointercancel',()=>{deckSwipe=undefined;});
document.addEventListener('click',event=>{
  const el=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(!el)return;
  if(el.classList.contains('swipe-front')&&performance.now()<suppressDeckClickUntil){event.preventDefault();return;}
  if(el.dataset.revealKey){revealDeck(el.dataset.revealKey);el.closest('.swipe-deck')?.querySelector<HTMLButtonElement>('.swipe-delete')?.focus();return;}
  if(el.dataset.swipeDelete){void deleteLibraryDeck(el.dataset.swipeDelete,el.dataset.kind??'regular').catch(error=>say(String(error)));return;}
  if(!el.closest('.swipe-deck'))revealDeck('');
  if(el.dataset.tab){const tab=el.dataset.tab as typeof section;navigate(sectionRoot(tab),tab);}
  else if(el.dataset.route) { if(el.dataset.route==='backups') void action('backups').catch(error=>say(String(error)));else navigate(el.dataset.route); }
  else if(el.dataset.tabooDeck){tabooSelected=el.dataset.tabooDeck;cardPage=0;expandedCards=false;pendingImport=undefined;entry='';editingCard=undefined;route='taboo-editor';section='decks';render();app.focus({preventScroll:true});window.scrollTo({top:0});animateNavigation('forward');}
  else if(el.dataset.tabooEdit){editingCard=el.dataset.tabooEdit;openEntry('card');document.querySelector('#taboo-card-form')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
  else if(el.dataset.deck) {editorSection='cards';editingActivity=undefined;activityPage=0;selected=el.dataset.deck;cardPage=0;expandedCards=false;pendingImport=undefined;entry='';editingCard=undefined;route='editor';section='decks';say('');render();app.focus({preventScroll:true});window.scrollTo({top:0});animateNavigation('forward');}
  else if(el.dataset.activityEdit){editingActivity=el.dataset.activityEdit;openEntry('activity');document.querySelector('#activity-form')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
  else if(el.dataset.activityMove||el.dataset.cardMove){const d=deck(),id=el.dataset.activityMove??el.dataset.cardMove,direction=el.dataset.direction==='-1'?-1:1;if(d&&id&&!entry)void mutate(next=>{const target=next.decks.find(x=>x.id===d.id)!;if(el.dataset.activityMove)target.activities=moveItem(target.activities,id,direction);else target.cards=moveItem(target.cards,id,direction);}).then(()=>say('Order saved.')).catch(error=>say(String(error)));}
  else if(el.dataset.edit) {editingCard=el.dataset.edit;openEntry('card');document.querySelector('#card-form')?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
  else if(el.dataset.action) void action(el.dataset.action).catch(error=>say(`Could not complete action: ${String(error)}`));
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&presenting){presenting=false;render();event.preventDefault();return;}
  if(event.key==='Escape'&&revealedDeck){const row=Array.from(app.querySelectorAll<HTMLElement>('.swipe-deck')).find(row=>row.dataset.swipeKey===revealedDeck);revealDeck('');row?.querySelector<HTMLButtonElement>('.deck-reveal')?.focus();event.preventDefault();return;}
  if(event.defaultPrevented||event.repeat||event.isComposing||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
  const target=event.target instanceof HTMLElement?event.target:undefined;
  if(target?.closest('input,textarea,select,button,summary,a,[contenteditable="true"]'))return;
  if(route==='prompts'&&!promptDraw)return;
  const intent=gameShortcut(route,event.key,round?.phase);
  const control=intent?Array.from(app.querySelectorAll<HTMLButtonElement>('[data-action]')).find(el=>el.dataset.action===intent&&!el.disabled&&el.getClientRects().length>0):undefined;
  if(control){event.preventDefault();void action(intent!).catch(error=>say(String(error)));}
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
  if(preparing)return;roundSeconds(headDuration);const token=++gameGeneration;preparing=true;calibrating=useTilt;placement.reset();placementLabel='';tilt.reset();sensors.onGravity=undefined;
  const sound=readyAudio(),permission=useTilt?sensors.start():Promise.resolve();render();void keepAwake();
  try{
    await Promise.all([sound,permission,resuming?Promise.resolve():mutate(next=>{next.headbandsDuration=headDuration;})]);
    if(token!==gameGeneration||document.hidden)return;
    if(useTilt){
      sensors.onGravity=(g,at)=>{
        if(document.hidden||route!=='headbands')return;
        if(calibrating){placement.observe(g,at,sideways(),sensors.heading);updatePlacement();return;}
        if(round?.phase!=='running')return;
        const event=tilt.update(...g,at);
        if(!tilt.calibrated){pauseGame();say('Phone position changed or motion was interrupted. Tap Resume to recalibrate.');return;}
        if(event==='correct'||event==='pass')headAnswer(event==='correct');
        const status=document.querySelector('#tilt-status');if(status&&!calibrating)status.textContent=tilt.calibrated?'Return to forehead between tilts':'Hold sideways and steady to enable tilts';
      };
    }else beginHeadbands();
  }finally{if(token===gameGeneration){preparing=false;render();}}
}
function updatePlacement():void {
  if(!calibrating||preparing)return;
  const old=placementLabel;placement.tick(performance.now()/1000,sideways());
  if(placement.stage==='ready'&&placement.gravity){
    if(tilt.calibrate(placement.gravity,performance.now()/1000)){beginHeadbands();placementLabel='';return;}
    placement.reset();
  }
  const label=placement.stage+':'+(placement.stage==='countdown'?placement.seconds(performance.now()/1000):'');
  if(old!==label){
    if(placement.stage==='countdown'&&!old.startsWith('countdown:'))gameAudio.placementCountdown(timerSound);
    else if(placement.stage!=='countdown'&&old.startsWith('countdown:'))gameAudio.stopCountdown();
    placementLabel=label;render();
  }
}
function headAnswer(correct:boolean):void {
  checkRound();if(!(round instanceof HeadbandsRound))return;
  if(round.answer(correct,performance.now())){gameAudio.feedback(correct);tilt.disarm();if(round.phase==='ended'){gameAudio.stopCountdown();sensors.stop();releaseWake();}render();}
}
function pauseGame():void {
  checkRound();gameGeneration++;preparing=false;calibrating=false;placement.reset();placementLabel='';
  if(round?.phase==='running')round.pause(performance.now());
  // Expiry owns its scheduled buzzer; pausing an already-ended round must not cut it off.
  if(round?.phase!=='ended')gameAudio.stop();audio.stop();sensors.stop();tilt.reset();releaseWake();render();
}
gameAudio.onInterrupt=()=>{if(calibrating||round?.phase==='running'){pauseGame();say('Audio was interrupted. Tap Resume when ready.');}};
function checkRound(): void {
  if(calibrating)updatePlacement();
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
try {try{preferences=await loadPreferences();}catch{/* Preferences must never block deck recovery. */}library=await load();tabooTeams=library.tabooTeams?[...library.tabooTeams]:defaultTeams();tabooDuration=library.tabooDuration??0;draftTeams=library.teams?[...library.teams]:defaultTeams();draftDuration=library.teams?library.duration:0;headDuration=library.headbandsDuration??60;restorePoint=await recovery();render();void storageProtection(true);void setupOffline();}
catch(error) {library=emptyLibrary();loadFailure=String(error);futureData=error instanceof NewerFormatError;try{restorePoint=await recovery();}catch{}render();void setupOffline();}
