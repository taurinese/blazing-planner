// Domain model for the planner.
// Catalog = what exists in the game (shared, bundled in the repo, extendable by the user).
// Player state = what one player owns, plans and has farmed (stored in localStorage).

export type ElementId = 'heart' | 'skill' | 'body' | 'bravery' | 'wisdom';

export interface ElementDef {
  id: ElementId;
  color: string;
  /** Element this one deals bonus damage to. */
  beats: ElementId;
}

export interface MaterialCost {
  resourceId: string;
  qty: number;
}

/** Cost to go from `fromStars` to `fromStars + 1`. */
export interface AwakeningStep {
  fromStars: number;
  materials: MaterialCost[];
}

export interface NinjaDef {
  id: string;
  name: string;
  title: string;
  element: ElementId;
  minStars: number;
  maxStars: number;
  /** Explicit steps. When empty, `awakeningTemplate` from game.json is used. */
  awakening: AwakeningStep[];
  /** Name of a shared template in game.json; `{element}` in resource ids is replaced. */
  awakeningTemplate?: string;
  /** Materials for the Blazing Awakening done after reaching `maxStars`. */
  blazingAwakening?: MaterialCost[];
  limitBreak?: boolean;
  /** Max level, including limit break when the ninja has one. */
  maxLevel?: number;
  cardNo?: number;
  range?: string;
  tags?: string[];
  notes?: string;
  /** Global release date in the original game (YYYY-MM-DD); the revival follows the same order. */
  globalDate?: string;
}

export type ResourceCategory = 'currency' | 'awakening' | 'blazing' | 'limitbreak' | 'enhance' | 'event' | 'other';
export const RESOURCE_CATEGORIES: ResourceCategory[] = ['currency', 'awakening', 'blazing', 'limitbreak', 'enhance', 'event', 'other'];

export interface ResourceDef {
  id: string;
  name: { fr: string; en: string };
  category: ResourceCategory;
  element?: ElementId;
}

export interface OwnedNinja {
  uid: string;
  ninjaId: string;
  stars: number;
  blazingAwakened: boolean;
  level: number;
  limitBreak: number;
  ninjutsuLevel: number;
  secretLevel: number;
  favorite: boolean;
  notes: string;
}

export interface TeamSlot {
  main: string | null; // OwnedNinja.uid
  support: string | null;
}

export interface Team {
  id: string;
  name: string;
  slots: TeamSlot[]; // always 4
  notes: string;
}

export interface Goal {
  id: string;
  uid: string; // OwnedNinja.uid
  targetStars: number;
  targetBlazing: boolean;
  targetLevel: number | null;
  targetLimitBreak: number | null;
  extra: MaterialCost[];
  priority: 1 | 2 | 3;
  done: boolean;
}

export interface PlayerState {
  version: number;
  owned: OwnedNinja[];
  teams: Team[];
  goals: Goal[];
  inventory: Record<string, number>;
  /** User-added or user-edited catalog entries; override base entries with the same id. */
  customNinjas: NinjaDef[];
  customResources: ResourceDef[];
  hiddenNinjaIds: string[];
}
