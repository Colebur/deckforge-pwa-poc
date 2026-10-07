// Reversible presentation layer; no content or session behavior depends on this switch.
export const ENABLE_RICH_VISUALS=true;
// Set false to restore the restrained 0.31.0 profile without changing deck data.
export const EXPRESSIVE_VISUALS=true;
export const EXPRESSIVE_MOTION={micro:180,ui:420,playful:560,exit:280,idle:700};
export const DECK_ACCENTS=[['red','#b8324b'],['coral','#be5145'],['orange','#a85c20'],['amber','#956b16'],['green','#35774a'],['teal','#267a73'],['cyan','#257487'],['blue','#326cbc'],['indigo','#5956ad'],['violet','#8051ad'],['purple','#934a9b'],['pink','#b64f83'],['slate','#626c7d']] as const;
export type DeckAccentColor=typeof DECK_ACCENTS[number][0];
export function accentMetadata(value:unknown):{accentColor?:DeckAccentColor}{
  return typeof value==='string'&&DECK_ACCENTS.some(([id])=>id===value)?{accentColor:value as DeckAccentColor}:{};
}
export function colorSelector(value?:DeckAccentColor):string {
  if(!ENABLE_RICH_VISUALS)return '';
  return '<fieldset class="deck-colors"><legend>Deck color</legend>'+[['','Default','var(--soft)'],...DECK_ACCENTS.map(([id,color])=>[id,id.charAt(0).toUpperCase()+id.slice(1),color])].map(([id,label,color])=>'<label title="'+label+'"><input type="radio" name="accentColor" value="'+id+'" '+((value??'')===id?'checked':'')+'><span style="--swatch:'+color+'">'+label+'</span></label>').join('')+'</fieldset>';
}
export function deckColorStyle(deck:{accentColor?:DeckAccentColor}):string {
 const color=DECK_ACCENTS.find(([id])=>id===deck.accentColor)?.[1];
 return ENABLE_RICH_VISUALS&&color?' style="--deck-accent:'+color+'"':'';
}
export function deckBadge(emoji:string|undefined,deck:{accentColor?:DeckAccentColor}={}):string {
 // Emoji validation/HTML escaping stays at the existing rendering boundary.
 return '<span class="deck-emblem'+(ENABLE_RICH_VISUALS?' rich-badge':'')+'" aria-hidden="true"'+deckColorStyle(deck)+'>'+(emoji??'▤')+'</span>';
}
export function applyDeckColor(body:HTMLElement,deck?:{accentColor?:DeckAccentColor}):void {
 body.classList.toggle('rich-expressive',ENABLE_RICH_VISUALS&&EXPRESSIVE_VISUALS);
 const color=ENABLE_RICH_VISUALS?DECK_ACCENTS.find(([id])=>id===deck?.accentColor)?.[1]:undefined;
 if(color)body.style.setProperty('--deck-accent',color);else body.style.removeProperty('--deck-accent');
}
const ICONS:Record<string,string>={
 prompts:'<rect x="7" y="7" width="15" height="20" rx="3"/><path d="M4 3v6M1 6h6M23 2v6M20 5h6"/>',
 catchphrase:'<circle cx="15" cy="16" r="10"/><path d="M15 10v6l4 2M11 2h8M15 2v4"/>',
 headbands:'<path d="M9 3 25 8 19 27 3 22Z"/><path d="m11 12 7 2m-8 3 5 2"/>',
 taboo:'<rect x="5" y="3" width="20" height="24" rx="3"/><path d="m4 26 22-22M10 11h10M10 18h6"/>',
 lookup:'<rect x="3" y="7" width="24" height="16" rx="3"/><path d="M12 11v8M18 11v8M9 14h12M9 17h12"/>',
 flashcards:'<rect x="4" y="5" width="16" height="21" rx="3"/><path d="M10 2h13a3 3 0 0 1 3 3v17M9 12h6M9 17h6"/>',
};
export function modeIcon(id:string,fallback:string):string {
 return ENABLE_RICH_VISUALS&&ICONS[id]?'<svg class="mode-icon" viewBox="0 0 30 30" aria-hidden="true">'+ICONS[id]+'</svg>':fallback;
}
