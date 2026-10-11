// Converts GachaWiki's Naruto Blazing Revival roster (ninjas.json) into the app's catalog.
// GachaWiki tracks what the revival has released and announced, wave by wave; its game data
// comes from the Fandom wiki (CC BY-SA 3.0).

export const GACHAWIKI_URL = 'https://gachawiki.net/data/naruto-blazing/ninjas.json';

const MATERIAL_CATEGORY = { scroll: 'awakening', special: 'awakening' };

export function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const lower = (v) => (v ? String(v).toLowerCase() : undefined);

/** Fandom card file for a card number: 229 → "Card-0229.png". */
export function cardFile(cardNo) {
  return Number.isFinite(cardNo) ? `Card-${String(cardNo).padStart(4, '0')}.png` : undefined;
}

/** "/naruto-blazing/materials/card-0955.webp" → "Card-0955.png" (same file on Fandom). */
export function materialFile(icon) {
  const m = String(icon ?? '').match(/card-(\d+)\./i);
  return m ? cardFile(Number(m[1])) : undefined;
}

/** Material name as shown in game, with its star rank when it has one. */
export function materialLabel(m) {
  return m.stars ? `${m.name} (★${m.stars})` : m.name;
}

export function materialId(m) {
  return slugify(materialLabel(m));
}

/**
 * @param {{ batches: {id:number,label:string,released:string}[], ninjas: any[] }} data
 */
export function buildCatalog(data) {
  const warnings = [];
  const materials = new Map();
  const ninjas = [];

  for (const n of data.ninjas ?? []) {
    const forms = [...(n.forms ?? [])].sort((a, b) => a.stars - b.stars || Number(a.blazingAwakened) - Number(b.blazingAwakened));
    const regular = forms.filter((f) => !f.blazingAwakened);
    const top = regular.at(-1) ?? forms.at(-1);
    if (!top) {
      warnings.push(`${n.id}: no forms, skipped`);
      continue;
    }

    const toCosts = (list) =>
      (list ?? []).map((m) => {
        const id = materialId(m);
        if (!materials.has(id)) materials.set(id, m);
        return { resourceId: id, qty: m.count };
      });

    const awakening = regular
      .filter((f) => f.awakening && Number(f.awakening.to) > f.stars)
      .map((f) => ({ fromStars: f.stars, materials: toCosts(f.awakening.materials) }));

    // The Blazing Awakening starts from the top regular form when a BA form exists.
    const baForm = forms.find((f) => f.blazingAwakened);
    const baCost = baForm && top.awakening && !(Number(top.awakening.to) > top.stars) ? toCosts(top.awakening.materials) : undefined;

    const images = {};
    for (const f of regular) if (cardFile(f.cardNo)) images[f.stars] = cardFile(f.cardNo);
    if (baForm && cardFile(baForm.cardNo)) images.ba = cardFile(baForm.cardNo);

    const ninja = {
      id: n.id,
      name: n.name,
      title: n.title,
      element: lower(n.element),
      minStars: n.baseStars ?? regular[0]?.stars ?? top.stars,
      maxStars: n.maxStars ?? top.stars,
      awakening,
    };
    if (baCost?.length) ninja.blazingAwakening = baCost;
    if (regular.some((f) => f.limitBreak)) ninja.limitBreak = true;
    const maxLevel = top.maxLvLb ?? top.maxLv;
    if (maxLevel) ninja.maxLevel = maxLevel;
    if (top.cardNo) ninja.cardNo = top.cardNo;
    if (n.range) ninja.range = lower(n.range);
    if (n.released?.global) ninja.globalDate = n.released.global;
    if (n.serverReleased) ninja.revivalDate = n.serverReleased;
    if (n.batch !== undefined) ninja.batch = n.batch;
    const sources = [...new Set((n.obtain ?? []).map((o) => o.name).filter(Boolean))];
    if (sources.length) ninja.sources = sources;
    if (Object.keys(images).length) ninja.images = images;
    if (n.affiliations?.length) ninja.tags = n.affiliations;
    ninjas.push(ninja);

    if (!['heart', 'skill', 'body', 'bravery', 'wisdom'].includes(ninja.element)) warnings.push(`${n.id}: unknown element ${n.element}`);
    if (awakening.length !== ninja.maxStars - ninja.minStars) warnings.push(`${n.id}: ${awakening.length} awakening steps for ${ninja.minStars}→${ninja.maxStars}★`);
  }

  ninjas.sort((a, b) => a.name.localeCompare(b.name) || a.title.localeCompare(b.title));

  const resources = [...materials.entries()]
    .map(([id, m]) => {
      const r = { id, name: { fr: materialLabel(m), en: materialLabel(m) }, category: MATERIAL_CATEGORY[m.kind] ?? 'other' };
      if (m.element) r.element = lower(m.element);
      const image = materialFile(m.icon);
      if (image) r.image = image;
      return r;
    })
    .sort((a, b) => a.name.en.localeCompare(b.name.en));

  const batches = (data.batches ?? []).map((b) => ({ id: b.id, label: b.label, date: b.released }));

  return { ninjas, resources, batches, warnings, stats: { ninjas: ninjas.length, resources: resources.length, batches: batches.length } };
}
