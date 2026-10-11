import { describe, expect, it } from 'vitest';
// @ts-expect-error plain JS module without types
import { buildCatalog, cardFile, materialFile, materialId } from './gachawiki-map.mjs';
import sample from './fixtures/gachawiki-sample.json';

describe('GachaWiki mapping', () => {
  const { ninjas, resources, batches, warnings } = buildCatalog(sample);
  const byId = Object.fromEntries(ninjas.map((n: { id: string }) => [n.id, n]));

  it('converts a released ninja with its awakening and revival date', () => {
    expect(warnings).toEqual([]);
    expect(byId['minato-namikaze-rapid-lightning']).toMatchObject({
      name: 'Minato Namikaze',
      title: 'Rapid Lightning',
      element: 'bravery',
      minStars: 5,
      maxStars: 6,
      range: 'vast',
      globalDate: '2016-12-07',
      revivalDate: '2026-10-10',
      batch: 1,
      images: { 5: 'Card-0229.png', 6: 'Card-0230.png' },
      sources: expect.arrayContaining(['Revival Festival!']),
    });
    const step = byId['minato-namikaze-rapid-lightning'].awakening[0];
    expect(step.fromStars).toBe(5);
    expect(step.materials).toContainEqual({ resourceId: 'awakening-scroll-bravery-book-4', qty: 2 });
  });

  it('keeps upcoming ninjas with their announced date', () => {
    expect(byId['sakura-haruno-unrelenting-commitment'].revivalDate).toBe('2026-10-17');
  });

  it('builds materials with star rank, element and Fandom card file', () => {
    expect(resources.find((r: { id: string }) => r.id === 'awakening-scroll-bravery-book-4')).toEqual({
      id: 'awakening-scroll-bravery-book-4',
      name: { fr: 'Awakening Scroll "Bravery Book" (★4)', en: 'Awakening Scroll "Bravery Book" (★4)' },
      category: 'awakening',
      element: 'bravery',
      image: 'Card-0955.png',
    });
    expect(resources.some((r: { id: string }) => r.id.includes('special-awakening-tool'))).toBe(true);
  });

  it('exposes release waves', () => {
    expect(batches[0]).toEqual({ id: 1, label: 'Launch roster', date: '2026-10-10' });
  });

  it('has small helpers that match existing ids and files', () => {
    expect(materialId({ name: 'Awakening Scroll "Heart Book"', stars: 3 })).toBe('awakening-scroll-heart-book-3');
    expect(materialId({ name: 'Sand Gourd "Special Awakening Tool"', stars: null })).toBe('sand-gourd-special-awakening-tool');
    expect(cardFile(7)).toBe('Card-0007.png');
    expect(materialFile('/naruto-blazing/materials/card-0957.webp')).toBe('Card-0957.png');
  });
});
