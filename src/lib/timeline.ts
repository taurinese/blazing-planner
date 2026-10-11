// The revival replays the original game's release schedule. Dates are ISO "YYYY-MM-DD" strings,
// compared as strings and converted through UTC to avoid timezone drift.
import type { NinjaDef } from './types';

export interface Timeline {
  /** Global launch of the original game. */
  originalLaunch: string;
  /** Launch of the revival. */
  revivalLaunch: string;
}

const DAY = 86_400_000;

function toUtc(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtc(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(toUtc(value));
}

export function todayIso(now = new Date()): string {
  return fromUtc(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY);
}

export function addDays(iso: string, days: number): string {
  return fromUtc(toUtc(iso) + days * DAY);
}

/** Point of the original timeline the revival has reached, assuming it runs at the original pace. */
export function estimateProgress(today: string, t: Timeline): string {
  const elapsed = Math.max(0, daysBetween(t.revivalLaunch, today));
  return addDays(t.originalLaunch, elapsed);
}

/**
 * When an original-game date should come out on the revival: as many days after today as it is
 * after the current progress. Follows a manual progress setting too. Past dates return today.
 */
export function expectedRevivalDate(originalDate: string, progress: string, today: string): string {
  return addDays(today, Math.max(0, daysBetween(progress, originalDate)));
}

/** Ninjas without a date (custom content) count as released. */
export function isReleased(ninja: Pick<NinjaDef, 'globalDate'>, progress: string): boolean {
  return !ninja.globalDate || ninja.globalDate <= progress;
}
