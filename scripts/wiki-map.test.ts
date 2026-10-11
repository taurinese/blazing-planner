import { describe, expect, it } from 'vitest';
// @ts-expect-error plain JS module without types
import { buildCatalog, extractSources, materialName, pageToCard, toIsoDate } from './wiki-map.mjs';
import ashura6 from './fixtures/ashura-6.json';

// Real page from the wiki (Ashura "Devoted to Studies" ★6), plus a hand-made ★5 page for the chain.
const ashura5 = {
  title: 'Ashura "Devoted to Studies" (★5)',
  templates: [
    {
      name: 'Heart Characters',
      params: {
        'char-name': 'Ashura',
        'char-title': 'Devoted to Studies',
        rarity: '★★★★★',
        'card-no': '788',
        'material-1': '[[File:Card-0100.png|75px|link=Scroll of Heart]]',
        'material-2': '[[File:Card-0100.png|75px|link=Scroll of Heart]]',
        'material-3': '[[File:Card-0101.png|75px|link=Tome of Heart]]',
      },
    },
  ],
};

describe('wiki mapping', () => {
  it('reads a real character page', () => {
    const card = pageToCard(ashura6);
    expect(card).toMatchObject({
      name: 'Ashura',
      title: 'Devoted to Studies',
      element: 'heart',
      stars: 6,
      blazingAwakened: false,
      hasBlazingAwakening: true,
      cardNo: 789,
      maxLevel: 100,
      maxLevelLB: 150,
      limitBreak: true,
      range: 'short',
      globalDate: '2019-04-02',
      image: 'Card-0789.png',
    });
    expect(card.materials).toEqual([
      'Deadly Beads "Devoted to Studies"',
      'Deadly Beads "Devoted to Studies"',
      'Deadly Beads "Devoted to Studies"',
      'Ferocious Beads "Devoted to Studies"',
      'Ferocious Beads "Devoted to Studies"',
    ]);
  });

  it('extracts material names from file links and plain links', () => {
    expect(materialName('[[File:Card-1.png|75px|link=Tome of Heart]]')).toBe('Tome of Heart');
    expect(materialName('[[Tome of Heart|tome]]')).toBe('Tome of Heart');
    expect(materialName('')).toBe('');
  });

  it('groups star pages into one ninja with awakening steps and Blazing Awakening', () => {
    const baPage = { title: 'Ashura "Devoted to Studies" (★6) (Blazing Awakened)', templates: ashura6.templates };
    const { ninjas, resources, warnings } = buildCatalog([ashura5, ashura6, baPage], {
      'Blazing Awakening Materials': ['Deadly Beads "Devoted to Studies"', 'Ferocious Beads "Devoted to Studies"'],
      'Awakening Materials': ['Scroll of Heart', 'Tome of Heart'],
    });
    expect(warnings).toEqual([]);
    expect(ninjas).toHaveLength(1);
    expect(ninjas[0]).toMatchObject({
      id: 'ashura-devoted-to-studies',
      element: 'heart',
      minStars: 5,
      maxStars: 6,
      limitBreak: true,
      maxLevel: 150,
      cardNo: 789,
      awakening: [{ fromStars: 5, materials: [{ resourceId: 'scroll-of-heart', qty: 2 }, { resourceId: 'tome-of-heart', qty: 1 }] }],
      blazingAwakening: [
        { resourceId: 'deadly-beads-devoted-to-studies', qty: 3 },
        { resourceId: 'ferocious-beads-devoted-to-studies', qty: 2 },
      ],
      // The BA test page reuses the ★6 templates, so it carries the same card file.
      images: { 6: 'Card-0789.png', ba: 'Card-0789.png' },
    });
    expect(resources.find((r: { id: string }) => r.id === 'deadly-beads-devoted-to-studies')).toMatchObject({ image: 'Card-1192.png' });
    expect(resources.find((r: { id: string }) => r.id === 'tome-of-heart')).toMatchObject({ category: 'awakening', element: 'heart' });
    expect(resources.find((r: { id: string }) => r.id === 'deadly-beads-devoted-to-studies')).toMatchObject({ category: 'blazing' });
  });

  it('lists obtain sources from banner images and text links', () => {
    expect(pageToCard(ashura6).sources).toEqual(['Super Impact! Secrets of the Ninshu', 'Super Impact! Boss Rush']);
    expect(extractSources('[[Story Mode Guide|Story Mode]]: Stage 4-5 in "[[Stage 4: Exam Round 1|Exam Round #1]]"'))
      .toEqual(['Story Mode', 'Stage 4: Exam Round 1']);
    expect(extractSources('Story Mode')).toEqual(['Story Mode']);
    expect(extractSources('Awaken [[File:Card-0415.png|50px|link=Zabuza Momochi "The Measure of a Demon" (★5)]]')).toEqual([]);
    expect(extractSources('[[Zabuza Momochi "Silent Madness" (★5)]] / [[The Mist Demon]]')).toEqual(['The Mist Demon']);
  });

  it('parses wiki dates', () => {
    expect(toIsoDate('April 2, 2019')).toBe('2019-04-02');
    expect(toIsoDate('[[August 24, 2016]]')).toBe('2016-08-24');
    expect(toIsoDate('TBA')).toBeUndefined();
  });

  it('ignores pages without a character infobox', () => {
    expect(pageToCard({ title: 'Scroll of Heart', templates: [{ name: 'Material', params: {} }] })).toBeNull();
  });
});
