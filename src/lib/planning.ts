// Pure planning logic, no Svelte or storage here so it stays easy to test.
import type {
  AwakeningStep,
  ElementId,
  Goal,
  MaterialCost,
  NinjaDef,
  OwnedNinja,
  ResourceDef,
  Team,
} from './types';

export type Templates = Record<string, AwakeningStep[]>;

export function mergeById<T extends { id: string }>(base: T[], custom: T[], hidden: string[] = []): T[] {
  const map = new Map<string, T>();
  for (const item of base) map.set(item.id, item);
  for (const item of custom) map.set(item.id, item);
  const hiddenSet = new Set(hidden);
  return [...map.values()].filter((item) => !hiddenSet.has(item.id));
}

export function resolveAwakening(ninja: NinjaDef, templates: Templates): AwakeningStep[] {
  if (ninja.awakening.length > 0) return ninja.awakening;
  const template = ninja.awakeningTemplate ? templates[ninja.awakeningTemplate] : undefined;
  if (!template) return [];
  return template.map((step) => ({
    fromStars: step.fromStars,
    materials: step.materials.map((m) => ({
      resourceId: m.resourceId.replaceAll('{element}', ninja.element),
      qty: m.qty,
    })),
  }));
}

export function addCosts(target: Map<string, number>, costs: MaterialCost[], factor = 1): void {
  for (const c of costs) {
    if (!c.resourceId || !Number.isFinite(c.qty) || c.qty <= 0) continue;
    target.set(c.resourceId, (target.get(c.resourceId) ?? 0) + c.qty * factor);
  }
}

export function toCostList(map: Map<string, number>): MaterialCost[] {
  return [...map.entries()].map(([resourceId, qty]) => ({ resourceId, qty }));
}

/** Materials to awaken from `fromStars` up to `toStars`, limited to the ninja's star range. */
export function awakeningCost(
  ninja: NinjaDef,
  fromStars: number,
  toStars: number,
  templates: Templates,
): MaterialCost[] {
  const steps = resolveAwakening(ninja, templates);
  const upper = Math.min(toStars, ninja.maxStars);
  const total = new Map<string, number>();
  for (const step of steps) {
    if (step.fromStars >= fromStars && step.fromStars < upper) addCosts(total, step.materials);
  }
  return toCostList(total);
}

/** Star levels where no awakening data exists, so the user knows the total is incomplete. */
export function missingSteps(ninja: NinjaDef, fromStars: number, toStars: number, templates: Templates): number[] {
  const known = new Set(resolveAwakening(ninja, templates).map((s) => s.fromStars));
  const missing: number[] = [];
  for (let s = fromStars; s < Math.min(toStars, ninja.maxStars); s++) if (!known.has(s)) missing.push(s);
  return missing;
}

export function goalCost(goal: Goal, owned: OwnedNinja | undefined, ninja: NinjaDef | undefined, templates: Templates): MaterialCost[] {
  const total = new Map<string, number>();
  if (owned && ninja) addCosts(total, awakeningCost(ninja, owned.stars, goal.targetStars, templates));
  addCosts(total, goal.extra);
  return toCostList(total);
}

export interface NeedLine {
  resourceId: string;
  need: number;
  have: number;
  missing: number;
}

/** Aggregates the cost of every open goal and compares it with the inventory. */
export function shoppingList(
  goals: Goal[],
  ownedByUid: Map<string, OwnedNinja>,
  ninjaById: Map<string, NinjaDef>,
  inventory: Record<string, number>,
  templates: Templates,
): NeedLine[] {
  const total = new Map<string, number>();
  for (const goal of goals) {
    if (goal.done) continue;
    const owned = ownedByUid.get(goal.uid);
    addCosts(total, goalCost(goal, owned, owned ? ninjaById.get(owned.ninjaId) : undefined, templates));
  }
  return [...total.entries()]
    .map(([resourceId, need]) => {
      const have = inventory[resourceId] ?? 0;
      return { resourceId, need, have, missing: Math.max(0, need - have) };
    })
    .sort((a, b) => b.missing - a.missing || a.resourceId.localeCompare(b.resourceId));
}

/** Progress of a goal, 0..1, based on materials already in the inventory. */
export function goalProgress(costs: MaterialCost[], inventory: Record<string, number>): number {
  if (costs.length === 0) return 1;
  const ratios = costs.map((c) => Math.min(1, (inventory[c.resourceId] ?? 0) / c.qty));
  return ratios.reduce((a, b) => a + b, 0) / ratios.length;
}

export function teamElements(
  team: Team,
  ownedByUid: Map<string, OwnedNinja>,
  ninjaById: Map<string, NinjaDef>,
): Record<ElementId, number> {
  const counts: Record<ElementId, number> = { heart: 0, skill: 0, body: 0, bravery: 0, wisdom: 0 };
  for (const slot of team.slots) {
    if (!slot.main) continue;
    const owned = ownedByUid.get(slot.main);
    const ninja = owned ? ninjaById.get(owned.ninjaId) : undefined;
    if (ninja) counts[ninja.element]++;
  }
  return counts;
}

/** Ninjas used in more than one slot of the same team. */
export function duplicateUids(team: Team): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const slot of team.slots) {
    for (const uid of [slot.main, slot.support]) {
      if (!uid) continue;
      if (seen.has(uid)) dup.add(uid);
      seen.add(uid);
    }
  }
  return [...dup];
}

export function resourceName(r: ResourceDef | undefined, id: string, lang: 'fr' | 'en'): string {
  return r ? r.name[lang] || r.name.en || r.name.fr : id;
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function newId(prefix: string): string {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}
