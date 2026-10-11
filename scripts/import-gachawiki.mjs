#!/usr/bin/env node
// Imports the Naruto Blazing Revival roster from GachaWiki (https://gachawiki.net/naruto-blazing).
//
//   node scripts/import-gachawiki.mjs fetch   download ninjas.json to scripts/gachawiki/
//   node scripts/import-gachawiki.mjs build   convert it into src/data/{ninjas,resources,revival}.json
//
// Run both after each new revival wave. Credit: GachaWiki for the roster and release waves,
// Naruto Blazing Fandom wiki (CC BY-SA 3.0) for the game data it is based on.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCatalog, GACHAWIKI_URL } from './gachawiki-map.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_FILE = join(ROOT, 'scripts', 'gachawiki', 'ninjas.json');
const DATA_DIR = join(ROOT, 'src', 'data');
const USER_AGENT = 'blazing-planner-import/0.2 (open-source fan planner)';

const writeJson = (file, data) => writeFile(file, JSON.stringify(data, null, 2) + '\n');

async function fetchRoster() {
  const res = await fetch(GACHAWIKI_URL, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${GACHAWIKI_URL}`);
  const data = await res.json();
  if (!Array.isArray(data.ninjas)) throw new Error('Unexpected format: no "ninjas" array');
  await mkdir(dirname(SOURCE_FILE), { recursive: true });
  await writeJson(SOURCE_FILE, data);
  console.log(`Saved ${data.ninjas.length} ninjas to scripts/gachawiki/ninjas.json\nNext: node scripts/import-gachawiki.mjs build`);
}

/** Currencies are not part of the GachaWiki data; keep the ones already defined. */
const KEEP_RESOURCE_CATEGORIES = new Set(['currency']);

async function build() {
  const data = JSON.parse(await readFile(SOURCE_FILE, 'utf8'));
  const { ninjas, resources, batches, warnings, stats } = buildCatalog(data);
  const current = JSON.parse(await readFile(join(DATA_DIR, 'resources.json'), 'utf8'));
  const kept = current.filter((r) => KEEP_RESOURCE_CATEGORIES.has(r.category));
  const keptIds = new Set(kept.map((r) => r.id));

  await writeJson(join(DATA_DIR, 'ninjas.json'), ninjas);
  await writeJson(join(DATA_DIR, 'resources.json'), [...kept, ...resources.filter((r) => !keptIds.has(r.id))]);
  await writeJson(join(DATA_DIR, 'revival.json'), {
    importedAt: new Date().toISOString().slice(0, 10),
    sources: [
      { name: 'GachaWiki', url: 'https://gachawiki.net/naruto-blazing', role: 'Revival roster and release waves' },
      { name: data.source?.name ?? 'Naruto Blazing Fandom wiki', url: data.source?.url ?? 'https://naruto-blazing.fandom.com', license: data.source?.license ?? 'CC BY-SA 3.0', role: 'Game data' },
    ],
    batches,
  });
  console.log(stats);
  if (warnings.length) console.log(`${warnings.length} warning(s):\n  ${warnings.join('\n  ')}`);
  console.log('Wrote src/data/ninjas.json, resources.json and revival.json');
}

const [cmd] = process.argv.slice(2);
try {
  if (cmd === 'fetch') await fetchRoster();
  else if (cmd === 'build') await build();
  else console.log('Usage:\n  node scripts/import-gachawiki.mjs fetch\n  node scripts/import-gachawiki.mjs build');
} catch (err) {
  console.error(`Import failed: ${err.message}`);
  process.exit(1);
}
