import { describe, expect, it } from 'vitest';
import { initials, ninjaCard, wikiImageUrl } from './images';
import type { NinjaDef } from './types';

const ninja = {
  id: 'a', name: 'Ashura', title: 'T', element: 'heart', minStars: 5, maxStars: 6, awakening: [],
  images: { 5: 'Card-0788.png', 6: 'Card-0789.png', ba: 'Card-0790.png' },
} as unknown as NinjaDef;

describe('images', () => {
  it('picks the card for the star level, falling back to the closest one', () => {
    expect(ninjaCard(ninja, 5)).toBe('Card-0788.png');
    expect(ninjaCard(ninja, 6)).toBe('Card-0789.png');
    expect(ninjaCard(ninja, 7)).toBe('Card-0789.png');
    expect(ninjaCard(ninja, 3)).toBe('Card-0788.png');
    expect(ninjaCard(ninja)).toBe('Card-0789.png');
    expect(ninjaCard(ninja, 6, true)).toBe('Card-0790.png');
    expect(ninjaCard({ ...ninja, images: undefined })).toBeUndefined();
  });

  it('builds thumbnail URLs in shared width buckets', () => {
    expect(wikiImageUrl('Card 0789.png', 40)).toBe('https://naruto-blazing.fandom.com/wiki/Special:FilePath/Card_0789.png?width=128');
    expect(wikiImageUrl('Card-1.png', 24)).toMatch(/width=64$/);
    expect(wikiImageUrl(undefined, 40)).toBeUndefined();
  });

  it('makes initials for the fallback tile', () => {
    expect(initials('Naruto Uzumaki')).toBe('NU');
    expect(initials('Deadly Beads "Devoted to Studies"')).toBe('DB');
  });
});
