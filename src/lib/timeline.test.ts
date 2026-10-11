import { describe, expect, it } from 'vitest';
import { isIsoDate, isReleased, todayIso } from './timeline';

describe('timeline', () => {
  it('uses the revival release date', () => {
    expect(isReleased({ revivalDate: '2026-10-17' }, '2026-10-16')).toBe(false);
    expect(isReleased({ revivalDate: '2026-10-17' }, '2026-10-17')).toBe(true);
    expect(isReleased({}, '2026-10-11')).toBe(true);
  });

  it('validates and formats ISO dates', () => {
    expect(isIsoDate('2026-10-10')).toBe(true);
    expect(isIsoDate('10/10/2026')).toBe(false);
    expect(todayIso(new Date(2026, 9, 11, 23, 30))).toBe('2026-10-11');
  });
});
