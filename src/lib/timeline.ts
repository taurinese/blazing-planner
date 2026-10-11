// Revival release dates are ISO "YYYY-MM-DD" strings, compared as strings.
import type { NinjaDef } from './types';

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

/** Today in the viewer's timezone, as YYYY-MM-DD. */
export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Out on the revival once its release date has passed. Ninjas without a date (custom content) count as released. */
export function isReleased(ninja: Pick<NinjaDef, 'revivalDate'>, today: string): boolean {
  return !ninja.revivalDate || ninja.revivalDate <= today;
}
