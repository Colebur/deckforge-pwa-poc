import type {Activity} from './model.js';

export type ActivityMode = 'none' | 'fixed' | 'random' | 'cycle';

// Literal substitution: card text containing $, braces or HTML stays plain text.
export function renderActivity(template: string, cardText: string): string {
  return template.replaceAll('{card}', () => cardText);
}

export function validateActivities(value: unknown): Activity[] {
  if (value === undefined) return []; // Decks made before Activities existed.
  if (!Array.isArray(value)) throw new Error('Invalid Activities list. Nothing was changed.');
  const ids = new Set<string>();
  return value.map(activity => {
    if (!activity || typeof activity !== 'object' ||
        typeof activity.id !== 'string' || !activity.id.trim() || ids.has(activity.id) ||
        typeof activity.text !== 'string' || !activity.text.trim() ||
        typeof activity.createdAt !== 'string' || !Number.isFinite(Date.parse(activity.createdAt)))
      throw new Error('Invalid or duplicate Activity. Nothing was changed.');
    ids.add(activity.id);
    return {id: activity.id, text: activity.text, createdAt: activity.createdAt};
  });
}

// Array order is the source of truth; a second order field would drift out of sync.
export function moveItem<T extends {id: string}>(items: readonly T[], id: string, direction: -1 | 1): T[] {
  const next = [...items], from = next.findIndex(item => item.id === id), to = from + direction;
  if (from >= 0 && to >= 0 && to < next.length) [next[from], next[to]] = [next[to]!, next[from]!];
  return next;
}

// A session owns a snapshot. Selecting cards never writes back into a deck.
export class ActivitySession {
  readonly activities: readonly Activity[];
  readonly mode: ActivityMode;
  current: Activity | undefined;
  private cycleIndex = 0;
  constructor(activities: readonly Activity[], mode: ActivityMode = 'none', readonly fixedId?: string) {
    this.activities = activities.map(activity => ({...activity}));
    if (!['none','fixed','random','cycle'].includes(mode)) throw new Error('Choose a valid Activity mode.');
    this.mode = this.activities.length ? mode : 'none';
    if (this.mode === 'fixed' && !this.activities.some(activity => activity.id === fixedId))
      throw new Error('Choose an Activity first.');
  }
  select(random = Math.random): Activity | undefined {
    if (this.mode === 'none') this.current = undefined;
    else if (this.mode === 'fixed') this.current = this.activities.find(activity => activity.id === this.fixedId);
    else if (this.mode === 'cycle') {
      this.current = this.activities[this.cycleIndex];
      this.cycleIndex = (this.cycleIndex + 1) % this.activities.length;
    } else {
      const pool = this.activities.length > 1 ? this.activities.filter(activity => activity.id !== this.current?.id) : this.activities;
      this.current = pool[Math.floor(Math.min(.999999999, Math.max(0, random())) * pool.length)];
    }
    return this.current;
  }
  reroll(random = Math.random): Activity | undefined {
    return this.mode === 'random' && this.current ? this.select(random) : this.current;
  }
}

export interface ActivityPart {kind:'template'|'card';text:string}
export function activityParts(template:string,cardText:string):ActivityPart[] {
  const pieces=template.split('{card}'),parts:ActivityPart[]=[];
  pieces.forEach((text,i)=>{if(i)parts.push({kind:'card',text:cardText});if(text)parts.push({kind:'template',text});});
  // Plain instructions without a placeholder still keep the selected card visible.
  if(pieces.length===1)parts.push({kind:'template',text:'\n'},{kind:'card',text:cardText});
  return parts;
}
