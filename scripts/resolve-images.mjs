#!/usr/bin/env node
// Resolves every card file used in src/data to its direct URL on the Fandom wiki's CDN,
// through the public MediaWiki API, and writes src/data/image-urls.json.
//
//   node scripts/resolve-images.mjs
//
// Run it after `import-gachawiki.mjs build` when new ninjas appear. Images stay on Fandom;
// nothing is downloaded into this repository.

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://naruto-blazing.fandom.com/api.php';
const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data');
const USER_AGENT = 'blazing-planner-images/0.2 (open-source fan planner)';
const DELAY_MS = 600;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const url = new URL(API);
  for (const [k, v] of Object.entries({ format: 'json', formatversion: '2', maxlag: '5', ...params })) url.searchParams.set(k, String(v));
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (res.ok) {
      const data = await res.json();
      if (data.error?.code === 'maxlag') { await sleep(5000); continue; }
      if (data.error) throw new Error(`${data.error.code}: ${data.error.info}`);
      await sleep(DELAY_MS);
      return data;
    }
    if (res.status === 429 || res.status >= 500) { await sleep(attempt * 3000); continue; }
    throw new Error(`HTTP ${res.status} on ${url}`);
  }
  throw new Error(`Gave up after retries on ${url}`);
}

const ninjas = JSON.parse(await readFile(join(DATA_DIR, 'ninjas.json'), 'utf8'));
const resources = JSON.parse(await readFile(join(DATA_DIR, 'resources.json'), 'utf8'));
const urlsFile = join(DATA_DIR, 'image-urls.json');
const urls = JSON.parse(await readFile(urlsFile, 'utf8').catch(() => '{}'));

const files = new Set();
for (const n of ninjas) for (const f of Object.values(n.images ?? {})) files.add(f);
for (const r of resources) if (r.image) files.add(r.image);
const todo = [...files].filter((f) => !urls[f]).sort();
console.log(`${files.size} files used, ${todo.length} to resolve`);

for (let i = 0; i < todo.length; i += 50) {
  const batch = todo.slice(i, i + 50);
  const data = await api({ action: 'query', prop: 'imageinfo', iiprop: 'url', titles: batch.map((f) => `File:${f}`).join('|') });
  // The API normalizes titles (underscores → spaces); map them back to our file names.
  const back = new Map(batch.map((f) => [`File:${f}`, f]));
  for (const n of data.query.normalized ?? []) back.set(n.to, back.get(n.from));
  for (const page of data.query.pages) {
    const file = back.get(page.title);
    const info = page.imageinfo?.[0];
    if (file && info?.url) urls[file] = info.url;
  }
  process.stdout.write(`\r  ${Math.min(i + 50, todo.length)}/${todo.length}`);
}
if (todo.length) process.stdout.write('\n');

const sorted = Object.fromEntries(Object.entries(urls).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(urlsFile, JSON.stringify(sorted, null, 2) + '\n');
const missing = [...files].filter((f) => !sorted[f]);
console.log(`src/data/image-urls.json: ${Object.keys(sorted).length} URLs, ${missing.length} used file(s) missing`);
if (missing.length) console.log('Missing:', missing.slice(0, 10).join(', '));
