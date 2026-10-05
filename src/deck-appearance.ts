// Appearance is optional and platform-neutral; never alters card or game content.
export function deckEmoji(value:unknown):string|undefined {
  if(value===undefined||value==='')return undefined;
  if(typeof value!=='string')throw new Error('Choose one emoji for the deck icon.');
  const text=value.trim();if(!text)return undefined;
  const parts=[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)];
  if(text.length>64||parts.length!==1||!/(?:\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20e3)/u.test(text))throw new Error('Choose one emoji for the deck icon, or leave it empty.');
  return text;
}
export function emojiMetadata(value:unknown):{emoji?:string}{const emoji=deckEmoji(value);return emoji?{emoji}:{};}
