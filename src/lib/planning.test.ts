import { describe, expect, it } from 'vitest';
import {
  awakeningCost,
  goalCost,
  duplicateUids,
  goalProgress,
  mergeById,
  missingSteps,
  resolveAwakening,
  shoppingList,
  teamElements,
  type Templates,
} from './planning';
import { normalizeNinja, parseBackup, parseCsv } from './importers';
import type { Goal, NinjaDef, OwnedNinja, Team } from './types';

const templates: Templates = {
  standard: [
    { fromStars: 4, materials: [{ resourceId: 'scroll-{element}-2', qty: 10 }, { resourceId: 'ryo', qty: 100 }] },
    { fromStars: 5, materials: [{ resourceId: 'scroll-{element}-3', qty: 10 }, { resourceId: 'ryo', qty: 200 }] },
  ],
};

const ninja: NinjaDef = {
  id: 'n1', name: 'Naruto', title: 'Test', element: 'bravery',
  minStars: 4, maxStars: 6, awakening: [], awakeningTemplate: 'standard', verified: false,
};

const owned = (uid: string, stars = 4): OwnedNinja => ({
  uid, ninjaId: 'n1', stars, blazingAwakened: false, level: 1, limitBreak: 0, ninjutsuLevel: 1, secretLevel: 1, favorite: false, notes: '',
});

describe('awakening', () => {
  it('resolves templates with the ninja element', () => {
    expect(resolveAwakening(ninja, templates)[0].materials[0].resourceId).toBe('scroll-bravery-2');
  });

  it('sums every step between current and target stars', () => {
    const cost = awakeningCost(ninja, 4, 6, templates);
    expect(cost).toContainEqual({ resourceId: 'ryo', qty: 300 });
    expect(cost).toContainEqual({ resourceId: 'scroll-bravery-3', qty: 10 });
  });

  it('never goes past the ninja max stars', () => {
    expect(awakeningCost({ ...ninja, maxStars: 5 }, 4, 6, templates)).toEqual([
      { resourceId: 'scroll-bravery-2', qty: 10 },
      { resourceId: 'ryo', qty: 100 },
    ]);
  });

  it('adds Blazing Awakening on top of the remaining stars', () => {
    const withBa = { ...ninja, blazingAwakening: [{ resourceId: 'beads', qty: 3 }] };
    const goal: Goal = { id: 'g', uid: 'a', targetStars: 5, targetBlazing: true, targetLevel: null, targetLimitBreak: null, extra: [], priority: 2, done: false };
    const cost = goalCost(goal, owned('a', 5), withBa, templates);
    expect(cost).toContainEqual({ resourceId: 'beads', qty: 3 });
    expect(cost).toContainEqual({ resourceId: 'scroll-bravery-3', qty: 10 }); // 5★ → 6★ still needed
    expect(goalCost(goal, { ...owned('a', 6), blazingAwakened: true }, withBa, templates)).toEqual([]);
  });

  it('reports steps without data', () => {
    expect(missingSteps({ ...ninja, minStars: 3 }, 3, 6, templates)).toEqual([3]);
  });
});

describe('shopping list', () => {
  it('aggregates open goals and subtracts the inventory', () => {
    const goals: Goal[] = [
      { id: 'g1', uid: 'a', targetStars: 6, targetBlazing: false, targetLevel: null, targetLimitBreak: null, extra: [], priority: 2, done: false },
      { id: 'g2', uid: 'b', targetStars: 5, targetBlazing: false, targetLevel: null, targetLimitBreak: null, extra: [{ resourceId: 'ramen', qty: 5 }], priority: 2, done: false },
      { id: 'g3', uid: 'b', targetStars: 6, targetBlazing: false, targetLevel: null, targetLimitBreak: null, extra: [], priority: 2, done: true },
    ];
    const list = shoppingList(
      goals,
      new Map([['a', owned('a')], ['b', owned('b')]]),
      new Map([['n1', ninja]]),
      { ryo: 350, ramen: 10 },
      templates,
    );
    const byId = Object.fromEntries(list.map((l) => [l.resourceId, l]));
    expect(byId.ryo).toEqual({ resourceId: 'ryo', need: 400, have: 350, missing: 50 });
    expect(byId['scroll-bravery-2'].need).toBe(20);
    expect(byId.ramen.missing).toBe(0);
  });

  it('measures progress per material', () => {
    expect(goalProgress([{ resourceId: 'a', qty: 10 }, { resourceId: 'b', qty: 10 }], { a: 10, b: 0 })).toBe(0.5);
    expect(goalProgress([], {})).toBe(1);
  });
});

describe('teams', () => {
  const team: Team = {
    id: 't', name: 'T', notes: '',
    slots: [{ main: 'a', support: 'b' }, { main: 'a', support: null }, { main: null, support: null }, { main: null, support: null }],
  };
  it('counts main elements', () => {
    expect(teamElements(team, new Map([['a', owned('a')]]), new Map([['n1', ninja]])).bravery).toBe(2);
  });
  it('detects duplicates', () => {
    expect(duplicateUids(team)).toEqual(['a']);
  });
});

describe('catalog merge', () => {
  it('lets custom entries override and hide base entries', () => {
    const merged = mergeById([{ id: 'a', v: 1 }, { id: 'b', v: 1 }], [{ id: 'a', v: 2 }], ['b']);
    expect(merged).toEqual([{ id: 'a', v: 2 }]);
  });
});

describe('importers', () => {
  it('parses CSV with quotes and semicolons', () => {
    const rows = parseCsv('name;title;element\n"Uzumaki; Naruto";"Sage ""Mode""";coeur\n');
    expect(rows).toEqual([{ name: 'Uzumaki; Naruto', title: 'Sage "Mode"', element: 'coeur' }]);
  });

  it('normalizes ninja rows and reports errors', () => {
    const ok = normalizeNinja({ name: 'Gaara', title: 'Kazekage', element: 'Corps', minStars: '4', maxStars: '6' }, 1);
    expect(ok).toMatchObject({ id: 'gaara-kazekage', element: 'body', minStars: 4, maxStars: 6, awakeningTemplate: undefined });
    expect(normalizeNinja({ name: 'X', element: 'fire' }, 2)).toContain('unknown element');
  });

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('{"foo":1}')).toThrow();
    expect(parseBackup('{"owned":[],"inventory":{"ryo":"12","bad":-3}}').inventory).toEqual({ ryo: 12 });
  });
});
