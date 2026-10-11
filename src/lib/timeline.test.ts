import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, estimateProgress, expectedRevivalDate, isIsoDate, isReleased, todayIso } from './timeline';

const t = { originalLaunch: '2016-08-24', revivalLaunch: '2026-10-10' };

describe('timeline', () => {
  it('does date arithmetic across months and leap years', () => {
    expect(addDays('2016-02-28', 1)).toBe('2016-02-29');
    expect(daysBetween('2026-10-10', '2026-11-09')).toBe(30);
  });

  it('maps revival days onto the original schedule', () => {
    expect(estimateProgress('2026-10-10', t)).toBe('2016-08-24');
    expect(estimateProgress('2026-10-25', t)).toBe('2016-09-08');
    expect(estimateProgress('2026-01-01', t)).toBe('2016-08-24'); // before launch
    // Auto progress on launch day: 15 original days later = 15 revival days later.
    expect(expectedRevivalDate('2016-09-08', '2016-08-24', '2026-10-10')).toBe('2026-10-25');
    // Revival running 5 days behind (progress set by hand): dates shift accordingly.
    expect(expectedRevivalDate('2016-09-08', '2016-08-19', '2026-10-10')).toBe('2026-10-30');
  });

  it('treats undated ninjas as released', () => {
    expect(isReleased({}, '2016-08-24')).toBe(true);
    expect(isReleased({ globalDate: '2016-09-08' }, '2016-09-07')).toBe(false);
    expect(isReleased({ globalDate: '2016-09-08' }, '2016-09-08')).toBe(true);
  });

  it('validates and formats ISO dates', () => {
    expect(isIsoDate('2016-08-24')).toBe(true);
    expect(isIsoDate('24/08/2016')).toBe(false);
    expect(todayIso(new Date(2026, 9, 11, 23, 30))).toBe('2026-10-11');
  });
});
