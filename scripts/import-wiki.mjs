#!/usr/bin/env node
// Pulls ninja data from the Ultimate Ninja Blazing Fandom wiki through its public MediaWiki API.
//
//   node scripts/import-wiki.mjs discover
//       Lists categories that look like ninja lists and dumps one sample page
//       (templates + wikitext) to scripts/wiki-out/discover.json.
//
//   node scripts/import-wiki.mjs fetch "Category:Ninja" [--limit 50]
//       Fetches every page of the category and saves the parsed templates of each page
//       to scripts/wiki-out/raw.json. Mapping raw.json to src/data/ninjas.json comes next,
//       once the infobox field names are known.
//
// Be gentle with the wiki: requests are sequential, throttled and use maxlag.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractTemplates } from './wikitext.mjs';

const API = 'https://naruto-blazing.fandom.com/api.php';
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'wiki-out');
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

async function fetchCategory(category, limit) {
  if (!category) throw new Error('Usage: fetch "Category:Name" [--limit N]');
  const name = category.startsWith('Category:') ? category : `Category:${category}`;
  console.log(`Listing ${name}…`);
  const titles = await categoryMembers(name, limit);
  console.log(`${titles.length} pages found. Fetching wikitext…`);
  const pages = await pagesWikitext(titles);
  const raw = pages.map((p) => ({ title: p.title, templates: extractTemplates(p.wikitext) }));
  const file = await save('raw.json', { source: API, category: name, fetchedAt: new Date().toISOString(), pages: raw });
  console.log(`Saved ${file}`);
}

const [cmd, arg, ...rest] = process.argv.slice(2);
const limitIdx = rest.indexOf('--limit');
const limit = limitIdx >= 0 ? Number(rest[limitIdx + 1]) : Infinity;

try {
  if (cmd === 'discover') await discover();
  else if (cmd === 'fetch') await fetchCategory(arg, limit);
  else console.log('Usage:\n  node scripts/import-wiki.mjs discover\n  node scripts/import-wiki.mjs fetch "Category:Name" [--limit N]');
} catch (err) {
  console.error(`\nImport failed: ${err.message}`);
  process.exit(1);
}
