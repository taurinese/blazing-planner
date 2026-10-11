// Card art is served by the wiki, never stored in this repository.
import game from '../data/game.json';
import directUrls from '../data/image-urls.json';
import type { NinjaDef } from './types';

const BASE = (game as { imageBase?: string }).imageBase ?? '';
/** File name → direct CDN thumbnail, resolved by `node scripts/import-wiki.mjs images`. */
const DIRECT = directUrls as Record<string, string>;

/** Thumbnail widths requested from the wiki, so the browser cache is shared between sizes. */
const WIDTHS = [64, 128, 256];

export function wikiImageUrl(file: string | undefined, displaySize: number): string | undefined {
  if (!file) return undefined;
  if (DIRECT[file]) return DIRECT[file];
  if (!BASE) return undefined;
  const wanted = displaySize * 2; // sharp on high-density screens
  const width = WIDTHS.find((w) => w >= wanted) ?? WIDTHS[WIDTHS.length - 1];
  return `${BASE}${encodeURIComponent(file.replace(/ /g, '_'))}?width=${width}`;
}

/** Card for a given star level: exact match, else the closest lower one, else the closest higher one. */
export function ninjaCard(ninja: NinjaDef | undefined, stars?: number, blazing = false): string | undefined {
  const images = ninja?.images;
  if (!images) return undefined;
  if (blazing && images.ba) return images.ba;
  const levels = Object.keys(images).filter((k) => k !== 'ba').map(Number).sort((a, b) => a - b);
  if (levels.length === 0) return images.ba;
  const target = stars ?? levels[levels.length - 1];
  const lower = levels.filter((l) => l <= target).pop();
  return images[String(lower ?? levels[0])];
}

export function initials(name: string): string {
  return name
    .split(/[\s"-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}
