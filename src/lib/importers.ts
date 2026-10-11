// Parsing and validation for everything that comes from outside: CSV/JSON catalogs and backup files.
import type { ElementId, NinjaDef, PlayerState, ResourceCategory, ResourceDef } from './types';
import { slugify } from './planning';

export const ELEMENT_IDS: ElementId[] = ['heart', 'skill', 'body', 'bravery', 'wisdom'];
const CATEGORIES: ResourceCategory[] = ['currency', 'awakening', 'enhance', 'event', 'other'];

/** Minimal RFC 4180 CSV parser: quoted fields, escaped quotes, `,` or `;` separator. */
export function parseCsv(text: string): Record<string, string>[] {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (nonEmpty.length === 0) return [];
  const header = nonEmpty[0].map((h) => h.trim().toLowerCase());
  return nonEmpty.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}

export interface ImportResult<T> {
  items: T[];
  errors: string[];
}

function toInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

const ELEMENT_ALIASES: Record<string, ElementId> = {
  heart: 'heart', coeur: 'heart', 'cœur': 'heart',
  skill: 'skill', technique: 'skill',
  body: 'body', corps: 'body',
  bravery: 'bravery', bravoure: 'bravery', courage: 'bravery',
  wisdom: 'wisdom', sagesse: 'wisdom',
};

export function normalizeElement(value: unknown): ElementId | null {
  return ELEMENT_ALIASES[String(value ?? '').trim().toLowerCase()] ?? null;
}

export function normalizeNinja(raw: Record<string, unknown>, line: number): NinjaDef | string {
  const name = String(raw.name ?? '').trim();
  if (!name) return `#${line}: name missing`;
  const element = normalizeElement(raw.element);
  if (!element) return `#${line} (${name}): unknown element "${raw.element ?? ''}"`;
  const title = String(raw.title ?? '').trim();
  const minStars = Math.min(6, Math.max(1, toInt(raw.minStars ?? raw.minstars, 1)));
  const maxStars = Math.min(6, Math.max(minStars, toInt(raw.maxStars ?? raw.maxstars, minStars)));
  const tagsRaw = raw.tags;
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.map(String)
    : String(tagsRaw ?? '').split('|').map((t) => t.trim()).filter(Boolean);
  const awakening = Array.isArray(raw.awakening) ? (raw.awakening as NinjaDef['awakening']) : [];
  const template = String(raw.awakeningTemplate ?? raw.awakeningtemplate ?? '').trim();
  return {
    id: String(raw.id ?? '').trim() || slugify(`${name} ${title}`),
    name,
    title,
    element,
    minStars,
    maxStars,
    awakening,
    awakeningTemplate: template || (awakening.length ? undefined : 'standard'),
    tags,
    notes: raw.notes ? String(raw.notes) : undefined,
    verified: raw.verified === true || String(raw.verified).toLowerCase() === 'true',
  };
}

export function normalizeResource(raw: Record<string, unknown>, line: number): ResourceDef | string {
  const nameObj = (raw.name && typeof raw.name === 'object' ? raw.name : {}) as Record<string, string>;
  const fr = String(nameObj.fr ?? raw.name_fr ?? raw.name ?? '').trim();
  const en = String(nameObj.en ?? raw.name_en ?? raw.name ?? '').trim();
  if (!fr && !en) return `#${line}: name missing`;
  const category = CATEGORIES.includes(raw.category as ResourceCategory) ? (raw.category as ResourceCategory) : 'other';
  const element = normalizeElement(raw.element) ?? undefined;
  return { id: String(raw.id ?? '').trim() || slugify(en || fr), name: { fr: fr || en, en: en || fr }, category, element };
}

function collect<T>(rows: Record<string, unknown>[], fn: (r: Record<string, unknown>, line: number) => T | string): ImportResult<T> {
  const items: T[] = [];
  const errors: string[] = [];
  rows.forEach((row, i) => {
    const res = fn(row, i + 1);
    if (typeof res === 'string') errors.push(res);
    else items.push(res);
  });
  return { items, errors };
}

function rowsFromText(text: string, fileName: string): Record<string, unknown>[] {
  if (fileName.toLowerCase().endsWith('.csv')) return parseCsv(text);
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error('Expected a JSON array');
  return data;
}

export function importNinjas(text: string, fileName: string): ImportResult<NinjaDef> {
  return collect(rowsFromText(text, fileName), normalizeNinja);
}

export function importResources(text: string, fileName: string): ImportResult<ResourceDef> {
  return collect(rowsFromText(text, fileName), normalizeResource);
}

/** Validates a backup file. Unknown fields are dropped, missing arrays default to empty. */
export function parseBackup(text: string): PlayerState {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || !Array.isArray(data.owned)) {
    throw new Error('Not a planner backup');
  }
  const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const inventory: Record<string, number> = {};
  if (data.inventory && typeof data.inventory === 'object') {
    for (const [k, v] of Object.entries(data.inventory)) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) inventory[k] = Math.floor(n);
    }
  }
  return {
    version: toInt(data.version, 1),
    owned: arr(data.owned),
    teams: arr(data.teams),
    goals: arr(data.goals),
    inventory,
    customNinjas: arr(data.customNinjas),
    customResources: arr(data.customResources),
    hiddenNinjaIds: arr<string>(data.hiddenNinjaIds).filter((x) => typeof x === 'string'),
  };
}
