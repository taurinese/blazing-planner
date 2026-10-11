// Single source of truth for the player's data, persisted to localStorage.
import baseNinjasJson from '../data/ninjas.json';
import baseResourcesJson from '../data/resources.json';
import game from '../data/game.json';
import { mergeById, newId, type Templates } from './planning';
import { parseBackup } from './importers';
import { isReleased, todayIso } from './timeline';
import revival from '../data/revival.json';
import type { ElementDef, Goal, NinjaDef, OwnedNinja, PlayerState, ResourceDef, Team } from './types';

export const STORAGE_KEY = 'nbr-planner:v1';
export const SCHEMA_VERSION = 3;

export const elements = game.elements as ElementDef[];
export const limits = game.limits;
export const templates = game.awakeningTemplates as unknown as Templates;
export const revivalInfo = revival as {
  importedAt: string;
  sources: { name: string; url: string; role: string; license?: string }[];
  batches: { id: number; label: string; date: string }[];
};
const baseNinjas = baseNinjasJson as unknown as NinjaDef[];
const baseResources = baseResourcesJson as unknown as ResourceDef[];

function emptyState(): PlayerState {
  return {
    version: SCHEMA_VERSION,
    owned: [],
    teams: [],
    goals: [],
    inventory: {},
    customNinjas: [],
    customResources: [],
    hiddenNinjaIds: [],
  };
}

/** Upgrades older saves. Add a case here whenever PlayerState changes shape. */
function migrate(state: PlayerState): PlayerState {
  const next = { ...emptyState(), ...state };
  // v2: Blazing Awakening on owned ninjas and goals. v3: planned ninjas.
  next.owned = next.owned.map((o) => ({ ...o, blazingAwakened: o.blazingAwakened ?? false, planned: o.planned ?? false }));
  next.goals = next.goals.map((g) => ({ ...g, targetBlazing: g.targetBlazing ?? false }));
  return { ...next, version: SCHEMA_VERSION };
}

function load(): PlayerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? migrate(parseBackup(raw)) : emptyState();
  } catch {
    return emptyState();
  }
}

export const player = $state<PlayerState>(load());
export const status = $state({ saveFailed: false });

class Catalog {
  ninjas = $derived(
    mergeById(baseNinjas, player.customNinjas, player.hiddenNinjaIds).sort(
      (a, b) => a.name.localeCompare(b.name) || a.title.localeCompare(b.title),
    ),
  );
  resources = $derived(mergeById(baseResources, player.customResources));
  ninjaById = $derived(new Map(this.ninjas.map((n) => [n.id, n])));
  resourceById = $derived(new Map(this.resources.map((r) => [r.id, r])));
  ownedByUid = $derived(new Map(player.owned.map((o) => [o.uid, o])));
  today = todayIso();
  isReleased = (n: NinjaDef) => isReleased(n, this.today);
  baseNinjaIds = new Set(baseNinjas.map((n) => n.id));
  baseResourceIds = new Set(baseResources.map((r) => r.id));
}
export const catalog = new Catalog();

let skipNextSave = false;
$effect.root(() => {
  $effect(() => {
    const json = JSON.stringify(player);
    if (skipNextSave) { skipNextSave = false; return; }
    try {
      localStorage.setItem(STORAGE_KEY, json);
      status.saveFailed = false;
    } catch {
      status.saveFailed = true;
    }
  });
});

function replaceState(next: PlayerState): void {
  Object.assign(player, migrate(next));
}

// Keep several open tabs in sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try { skipNextSave = true; replaceState(parseBackup(e.newValue)); } catch { skipNextSave = false; }
  });
}

// ---- Collection ----
export function addOwned(ninjaId: string, planned = false): OwnedNinja {
  const ninja = catalog.ninjaById.get(ninjaId);
  const owned: OwnedNinja = {
    uid: newId('own'),
    ninjaId,
    stars: ninja?.minStars ?? 1,
    blazingAwakened: false,
    level: 1,
    limitBreak: 0,
    ninjutsuLevel: 1,
    secretLevel: 1,
    favorite: false,
    planned,
    notes: '',
  };
  player.owned.push(owned);
  return player.owned[player.owned.length - 1]; // the reactive proxy, not the raw object
}

export function removeOwned(uid: string): void {
  player.owned = player.owned.filter((o) => o.uid !== uid);
  player.goals = player.goals.filter((g) => g.uid !== uid);
  for (const team of player.teams) {
    for (const slot of team.slots) {
      if (slot.main === uid) slot.main = null;
      if (slot.support === uid) slot.support = null;
    }
  }
}

// ---- Teams ----
export function addTeam(name: string): Team {
  const team: Team = {
    id: newId('team'),
    name,
    slots: Array.from({ length: 4 }, () => ({ main: null, support: null })),
    notes: '',
  };
  player.teams.push(team);
  return player.teams[player.teams.length - 1];
}

export function duplicateTeam(id: string, suffix: string): void {
  const src = player.teams.find((t) => t.id === id);
  if (!src) return;
  player.teams.push({ ...$state.snapshot(src), id: newId('team'), name: `${src.name} ${suffix}` });
}

export function removeTeam(id: string): void {
  player.teams = player.teams.filter((t) => t.id !== id);
}

// ---- Goals ----
export function addGoal(uid: string): Goal {
  const owned = catalog.ownedByUid.get(uid);
  const ninja = owned ? catalog.ninjaById.get(owned.ninjaId) : undefined;
  const goal: Goal = {
    id: newId('goal'),
    uid,
    targetStars: ninja?.maxStars ?? owned?.stars ?? 1,
    targetBlazing: false,
    targetLevel: null,
    targetLimitBreak: null,
    extra: [],
    priority: 2,
    done: false,
  };
  player.goals.push(goal);
  return player.goals[player.goals.length - 1];
}

export function removeGoal(id: string): void {
  player.goals = player.goals.filter((g) => g.id !== id);
}

/** Marks the goal done, applies the new stars and spends the materials from the inventory. */
export function completeGoal(id: string, costs: { resourceId: string; qty: number }[]): void {
  const goal = player.goals.find((g) => g.id === id);
  if (!goal) return;
  const owned = player.owned.find((o) => o.uid === goal.uid);
  if (owned) {
    const ninja = catalog.ninjaById.get(owned.ninjaId);
    owned.stars = Math.max(owned.stars, goal.targetBlazing && ninja ? ninja.maxStars : goal.targetStars);
    if (goal.targetBlazing) owned.blazingAwakened = true;
    owned.planned = false; // awakening it means it has been obtained
    if (goal.targetLevel) owned.level = Math.max(owned.level, goal.targetLevel);
    if (goal.targetLimitBreak) owned.limitBreak = Math.max(owned.limitBreak, goal.targetLimitBreak);
  }
  for (const c of costs) {
    player.inventory[c.resourceId] = Math.max(0, (player.inventory[c.resourceId] ?? 0) - c.qty);
  }
  goal.done = true;
}

// ---- Inventory ----
export function setQty(resourceId: string, qty: number): void {
  player.inventory[resourceId] = Math.max(0, Math.floor(Number.isFinite(qty) ? qty : 0));
}

// ---- Catalog editing ----
export function upsertNinja(ninja: NinjaDef): void {
  const i = player.customNinjas.findIndex((n) => n.id === ninja.id);
  if (i >= 0) player.customNinjas[i] = ninja;
  else player.customNinjas.push(ninja);
  player.hiddenNinjaIds = player.hiddenNinjaIds.filter((id) => id !== ninja.id);
}

/** Removes a user entry. For a base entry this hides it instead. */
export function deleteNinja(id: string): void {
  player.customNinjas = player.customNinjas.filter((n) => n.id !== id);
  if (catalog.baseNinjaIds.has(id) && !player.hiddenNinjaIds.includes(id)) player.hiddenNinjaIds.push(id);
}

export function restoreHiddenNinjas(): void {
  player.hiddenNinjaIds = [];
}

export function upsertResource(resource: ResourceDef): void {
  const i = player.customResources.findIndex((r) => r.id === resource.id);
  if (i >= 0) player.customResources[i] = resource;
  else player.customResources.push(resource);
}

export function deleteResource(id: string): void {
  player.customResources = player.customResources.filter((r) => r.id !== id);
}

// ---- Backup ----
export function exportBackup(): string {
  return JSON.stringify({ app: 'blazing-planner', exportedAt: new Date().toISOString(), ...$state.snapshot(player) }, null, 2);
}

export function importBackup(text: string): void {
  replaceState(parseBackup(text));
}

export function resetAll(): void {
  replaceState(emptyState());
}
