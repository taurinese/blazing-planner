#!/usr/bin/env node
// Pulls ninja data from the Ultimate Ninja Blazing Fandom wiki through its public MediaWiki API.
//
//   node scripts/import-wiki.mjs discover
//       Lists categories that look like ninja lists and dumps one sample page
//       (templates + wikitext) to scripts/wiki-out/discover.json.
//
//   node scripts/import-wiki.mjs fetch [--limit 50]
//       Fetches every character page (pages using the "<Element> Characters" infoboxes)
//       and the material categories, and saves them to scripts/wiki-out/raw.json.
//
//   node scripts/import-wiki.mjs build
//       Converts raw.json into src/data/ninjas.json and src/data/resources.json.
//
// Be gentle with the wiki: requests are sequential, throttled and use maxlag.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractTemplates } from './wikitext.mjs';
import { buildCatalog, ELEMENT_TEMPLATES, MATERIAL_CATEGORIES } from './wiki-map.mjs';

const API = 'https://naruto-blazing.fandom.com/api.php';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'scripts', 'wiki-out');
const DATA_DIR = join(ROOT, 'src', 'data');
const USER_AGENT = 'blazing-planner-import/0.1 (open-source fan tool; one-off import)';
const DELAY_MS = 600;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const url = new URL(API);
  for (const [k, v] of Object.entries({ format: 'json', formatversion: '2', maxlag: '5', ...params })) {
    url.searchParams.set(k, String(v));
  }
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    const retryAfter = Number(res.headers.get('retry-after') ?? 0);
    if (res.ok) {
      const data = await res.json();
      if (data.error?.code === 'maxlag') { await sleep((retryAfter || 5) * 1000); continue; }
      if (data.error) throw new Error(`${data.error.code}: ${data.error.info}`);
      await sleep(DELAY_MS);
      return data;
    }
    if (res.status === 429 || res.status >= 500) { await sleep((retryAfter || attempt * 3) * 1000); continue; }
    throw new Error(`HTTP ${res.status} on ${url}`);
  }
  throw new Error(`Gave up after retries on ${url}`);
}

async function save(name, data) {
  await mkdir(OUT_DIR, { recursive: true });
  const file = join(OUT_DIR, name);
  await writeFile(file, JSON.stringify(data, null, 2));
  return file;
}

async function allCategories() {
  const cats = [];
  let cont = {};
  do {
    const data = await api({ action: 'query', list: 'allcategories', acprop: 'size', aclimit: 500, ...cont });
    cats.push(...data.query.allcategories);
    cont = data.continue ?? null;
  } while (cont);
  return cats;
}

async function categoryMembers(category, limit = Infinity) {
  const titles = [];
  let cont = {};
  do {
    const data = await api({ action: 'query', list: 'categorymembers', cmtitle: category, cmnamespace: 0, cmlimit: 500, ...cont });
    titles.push(...data.query.categorymembers.map((m) => m.title));
    cont = data.continue ?? null;
  } while (cont && titles.length < limit);
  return titles.slice(0, limit);
}

async function pagesWikitext(titles) {
  const pages = [];
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const data = await api({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: batch.join('|') });
    for (const p of data.query.pages) {
      pages.push({ title: p.title, wikitext: p.revisions?.[0]?.slots?.main?.content ?? '' });
    }
    process.stdout.write(`\r  ${Math.min(i + 50, titles.length)}/${titles.length} pages`);
  }
  process.stdout.write('\n');
  return pages;
}

async function discover() {
  console.log('Listing categories…');
  const cats = await allCategories();
  const interesting = cats
    .filter((c) => /ninja|character|unit|shinobi|awaken|material|scroll|item/i.test(c.category))
    .sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
  console.table(interesting.slice(0, 25).map((c) => ({ category: c.category, pages: c.size })));

  const best = interesting.find((c) => /ninja|character|unit/i.test(c.category));
  let sample = null;
  if (best) {
    const [title] = await categoryMembers(`Category:${best.category}`, 1);
    if (title) {
      const [page] = await pagesWikitext([title]);
      sample = { title, templates: extractTemplates(page.wikitext), wikitext: page.wikitext.slice(0, 6000) };
      console.log(`\nSample page: ${title}`);
      console.log('Templates:', sample.templates.map((t) => `${t.name} (${Object.keys(t.params).length} params)`).join(', '));
    }
  }
  const file = await save('discover.json', { categories: interesting, sample });
  console.log(`\nSaved ${file}\nSend this file back so the mapping can be written.`);
}

async function embeddedIn(template, limit = Infinity) {
  const titles = [];
  let cont = {};
  do {
    const data = await api({ action: 'query', list: 'embeddedin', eititle: `Template:${template}`, einamespace: 0, eilimit: 500, ...cont });
    titles.push(...data.query.embeddedin.map((m) => m.title));
    cont = data.continue ?? null;
  } while (cont && titles.length < limit);
  return titles.slice(0, limit);
}

async function fetchAll(limit) {
  const titles = new Set();
  for (const template of Object.keys(ELEMENT_TEMPLATES)) {
    const found = await embeddedIn(template, limit);
    console.log(`${template}: ${found.length} pages`);
    found.forEach((t) => titles.add(t));
  }
  console.log(`Fetching wikitext of ${titles.size} pages…`);
  const pages = await pagesWikitext([...titles]);
  const raw = pages.map((p) => ({ title: p.title, templates: extractTemplates(p.wikitext) }));

  const materialCategories = {};
  for (const [wikiCat] of MATERIAL_CATEGORIES) {
    materialCategories[wikiCat] = await categoryMembers(`Category:${wikiCat}`);
    console.log(`Category:${wikiCat}: ${materialCategories[wikiCat].length} pages`);
  }
  const file = await save('raw.json', { source: API, fetchedAt: new Date().toISOString(), pages: raw, materialCategories });
  console.log(`Saved ${file}\nNext: node scripts/import-wiki.mjs build`);
}

/** Currencies are not cards on the wiki; keep them from the current resources file. */
const KEEP_RESOURCE_CATEGORIES = new Set(['currency']);

async function build() {
  const raw = JSON.parse(await readFile(join(OUT_DIR, 'raw.json'), 'utf8'));
  const { ninjas, resources, warnings, stats } = buildCatalog(raw.pages, raw.materialCategories);
  const current = JSON.parse(await readFile(join(DATA_DIR, 'resources.json'), 'utf8'));
  const kept = current.filter((r) => KEEP_RESOURCE_CATEGORIES.has(r.category));
  const keptIds = new Set(kept.map((r) => r.id));
  await writeFile(join(DATA_DIR, 'ninjas.json'), JSON.stringify(ninjas, null, 2) + '\n');
  await writeFile(join(DATA_DIR, 'resources.json'), JSON.stringify([...kept, ...resources.filter((r) => !keptIds.has(r.id))], null, 2) + '\n');
  await save('warnings.txt', warnings.join('\n'));
  console.log(stats);
  console.log(`${warnings.length} warning(s), see scripts/wiki-out/warnings.txt`);
  console.log('Wrote src/data/ninjas.json and src/data/resources.json');
}

const [cmd, ...rest] = process.argv.slice(2);
const limitIdx = rest.indexOf('--limit');
const limit = limitIdx >= 0 ? Number(rest[limitIdx + 1]) : Infinity;

try {
  if (cmd === 'discover') await discover();
  else if (cmd === 'fetch') await fetchAll(limit);
  else if (cmd === 'build') await build();
  else console.log('Usage:\n  node scripts/import-wiki.mjs discover\n  node scripts/import-wiki.mjs fetch [--limit N]\n  node scripts/import-wiki.mjs build');
} catch (err) {
  console.error(`\nImport failed: ${err.message}`);
  process.exit(1);
}
