// Converts parsed wiki pages into the app's catalog format (src/data/*.json).
//
// On the wiki every star level of a ninja is its own page ("Ashura "Devoted to Studies" (★5)",
// "(★6)", "(★6) (Blazing Awakened)"). The infobox template is named after the element
// ("Heart Characters") and `material-1..n` lists the cards consumed to reach the next stage.
import { plainText } from './wikitext.mjs';

export const ELEMENT_TEMPLATES = {
  'Heart Characters': 'heart',
  'Skill Characters': 'skill',
  'Body Characters': 'body',
  'Bravery Characters': 'bravery',
  'Wisdom Characters': 'wisdom',
};

/** Wiki material category → app resource category. First match wins. */
export const MATERIAL_CATEGORIES = [
  ['Limit Break Materials', 'limitbreak'],
  ['Special Blazing Awakening Materials', 'blazing'],
  ['Blazing Awakening Materials', 'blazing'],
  ['Special Awakening Tool', 'awakening'],
  ['Awakening Materials', 'awakening'],
  ['Enhancement Materials', 'enhance'],
];

export function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** File name in `[[File:Card-0789.png|100px]]` → "Card-0789.png". */
export function fileName(value) {
  const m = String(value ?? '').match(/\[\[\s*(?:File|Image):([^|\]]+)/i);
  return m ? m[1].trim() : undefined;
}

/** Name of the material card in `[[File:Card-1192.png|75px|link=Deadly Beads "X"]]` or `[[Name]]`. */
export function materialName(value) {
  const raw = String(value ?? '');
  const link = raw.match(/link=([^\]|]+)/);
  if (link) return link[1].trim();
  const plain = raw.match(/\[\[(?!File:)([^\]|]+)/i);
  return plain ? plain[1].trim() : '';
}

function countStars(params, title) {
  const fromRarity = (String(params.rarity ?? '').match(/★/g) ?? []).length;
  if (fromRarity) return fromRarity;
  const m = String(title).match(/\(★(\d)\)/);
  return m ? Number(m[1]) : 0;
}

/** Wiki pages that are guides, renamed to what players call them. */
const SOURCE_ALIASES = { 'Story Mode Guide': 'Story Mode' };

/**
 * Banners, events and modes listed in `how-obtain`, in order, without duplicates.
 * Banner images carry the event in `link=`, text links use [[Target|label]].
 */
export function extractSources(value) {
  const raw = String(value ?? '');
  const found = [];
  const re = /\[\[(File:[^\]]*?link=([^\]|]+)[^\]]*|(?!File:)([^\]|]+)(?:\|[^\]]*)?)\]\]/gi;
  let m;
  while ((m = re.exec(raw))) {
    const name = (m[2] ?? m[3] ?? '').trim();
    // Links to another star page of a ninja ("obtained by awakening ★5") are not sources.
    if (name && !/\(★\d\)/.test(name)) found.push(SOURCE_ALIASES[name] ?? name);
  }
  // Plain text only when the field has no links at all (e.g. "Story Mode").
  if (found.length === 0 && !raw.includes('[[')) {
    const text = plainText(raw);
    if (text) found.push(text);
  }
  return [...new Set(found)];
}

/** "April 2, 2019" → "2019-04-02". */
export function toIsoDate(v) {
  const text = plainText(v);
  const m = text.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
  if (!m) return undefined;
  const month = ['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(m[1].toLowerCase());
  if (month < 0) return undefined;
  return `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[2].padStart(2, '0')}`;
}

function toInt(v) {
  const n = parseInt(plainText(v).replace(/[^\d]/g, ''), 10);
  return Number.isFinite(n) ? n : undefined;
}

/** One wiki page → a card (one star stage of one ninja), or null when it is not a character page. */
export function pageToCard(page) {
  const tpl = page.templates.find((t) => ELEMENT_TEMPLATES[t.name]);
  if (!tpl) return null;
  const p = tpl.params;
  const name = plainText(p['char-name']);
  if (!name) return null;
  const materials = [];
  const materialImages = {};
  for (let i = 1; i <= 12; i++) {
    const m = materialName(p[`material-${i}`]);
    if (!m) continue;
    materials.push(m);
    const img = fileName(p[`material-${i}`]);
    if (img) materialImages[m] = img;
  }
  return {
    pageTitle: page.title,
    name,
    title: plainText(p['char-title']),
    element: ELEMENT_TEMPLATES[tpl.name],
    stars: countStars(p, page.title),
    blazingAwakened: /blazing awakened/i.test(page.title),
    hasBlazingAwakening: Boolean(String(p['b-awaken-thum'] ?? '').trim()),
    cardNo: toInt(p['card-no']),
    maxLevel: toInt(p['max-lv']),
    maxLevelLB: toInt(p['max-lv-lb']),
    limitBreak: /^yes$/i.test(plainText(p['limit-break'])),
    range: plainText(p.range).toLowerCase() || undefined,
    globalDate: toIsoDate(p['global-date']),
    sources: extractSources(p['how-obtain']),
    image: fileName(p['char-image']),
    materials,
    materialImages,
  };
}

function tally(names, resourceIdByName) {
  const counts = new Map();
  for (const n of names) {
    const id = resourceIdByName(n);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()].map(([resourceId, qty]) => ({ resourceId, qty }));
}

/**
 * @param {{ title: string, templates: { name: string, params: Record<string,string> }[] }[]} pages
 * @param {Record<string, string[]>} materialCategories wiki category → page titles
 */
export function buildCatalog(pages, materialCategories = {}) {
  const warnings = [];
  const cards = pages.map(pageToCard).filter(Boolean);

  const groups = new Map();
  for (const card of cards) {
    const key = `${card.name}|${card.title}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(card);
  }

  const materialNames = new Set();
  const materialImage = new Map();
  for (const card of cards) for (const [n, img] of Object.entries(card.materialImages)) materialImage.set(n, img);
  const resourceIdByName = (n) => {
    materialNames.add(n);
    return slugify(n);
  };

  const ninjas = [];
  for (const group of groups.values()) {
    const regular = group.filter((c) => !c.blazingAwakened && c.stars > 0);
    if (regular.length === 0) {
      warnings.push(`${group[0].pageTitle}: no regular star page, skipped`);
      continue;
    }
    const top = regular.reduce((a, b) => (b.stars > a.stars ? b : a));
    const minStars = Math.min(...regular.map((c) => c.stars));
    const maxStars = top.stars;
    const elements = new Set(group.map((c) => c.element));
    if (elements.size > 1) warnings.push(`${top.name} "${top.title}": several elements across pages, using ${top.element}`);

    const awakening = regular
      .filter((c) => c.stars < maxStars && c.materials.length > 0)
      .sort((a, b) => a.stars - b.stars)
      .map((c) => ({ fromStars: c.stars, materials: tally(c.materials, resourceIdByName) }));

    const hasBlazing = top.hasBlazingAwakening || group.some((c) => c.blazingAwakened);
    const blazingAwakening = hasBlazing && top.materials.length > 0 ? tally(top.materials, resourceIdByName) : undefined;

    const ninja = {
      id: slugify(`${top.name} ${top.title}`),
      name: top.name,
      title: top.title,
      element: top.element,
      minStars,
      maxStars,
      awakening,
    };
    if (blazingAwakening) ninja.blazingAwakening = blazingAwakening;
    if (top.limitBreak) ninja.limitBreak = true;
    if (top.maxLevel) ninja.maxLevel = top.limitBreak && top.maxLevelLB ? top.maxLevelLB : top.maxLevel;
    if (top.cardNo) ninja.cardNo = top.cardNo;
    if (top.range) ninja.range = top.range;
    // Earliest release among the ninja's pages: when it first became obtainable.
    const dates = group.map((c) => c.globalDate).filter(Boolean).sort();
    if (dates.length) ninja.globalDate = dates[0];
    const sources = [...new Set(regular.sort((a, b) => a.stars - b.stars).flatMap((c) => c.sources))];
    if (sources.length) ninja.sources = sources;
    // Card art per star level, plus the Blazing Awakened card under "ba".
    const images = {};
    for (const c of regular) if (c.image) images[c.stars] = c.image;
    const baCard = group.find((c) => c.blazingAwakened && c.image);
    if (baCard) images.ba = baCard.image;
    if (Object.keys(images).length) ninja.images = images;
    ninjas.push(ninja);
  }

  // Keep ids unique even if two groups slugify the same way.
  const seen = new Map();
  for (const n of ninjas) {
    const count = seen.get(n.id) ?? 0;
    seen.set(n.id, count + 1);
    if (count > 0) {
      warnings.push(`duplicate id ${n.id}, renamed ${n.id}-${count + 1}`);
      n.id = `${n.id}-${count + 1}`;
    }
  }
  ninjas.sort((a, b) => a.name.localeCompare(b.name) || a.title.localeCompare(b.title));

  const categoryByTitle = new Map();
  for (const [wikiCat, appCat] of MATERIAL_CATEGORIES) {
    for (const title of materialCategories[wikiCat] ?? []) {
      if (!categoryByTitle.has(title)) categoryByTitle.set(title, appCat);
    }
  }
  const resources = [...materialNames]
    .sort((a, b) => a.localeCompare(b))
    .map((n) => {
      const resource = { id: slugify(n), name: { fr: n, en: n }, category: categoryByTitle.get(n) ?? 'awakening' };
      const element = n.match(/\b(Heart|Skill|Body|Bravery|Wisdom)\b/);
      if (element) resource.element = element[1].toLowerCase();
      if (materialImage.has(n)) resource.image = materialImage.get(n);
      return resource;
    });

  return { ninjas, resources, warnings, stats: { pages: pages.length, cards: cards.length, ninjas: ninjas.length, resources: resources.length } };
}
