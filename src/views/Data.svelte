<script lang="ts">
  import ElementTag from '../components/ElementTag.svelte';
  import Modal from '../components/Modal.svelte';
  import NinjaForm from '../components/NinjaForm.svelte';
  import { downloadText, readFile, today } from '../lib/files';
  import { importNinjas, importResources } from '../lib/importers';
  import { prefs, t } from '../lib/i18n.svelte';
  import { slugify } from '../lib/planning';
  import {
    catalog, deleteNinja, deleteResource, exportBackup, importBackup, player,
    resetAll, restoreHiddenNinjas, upsertNinja, upsertResource,
  } from '../lib/store.svelte';
  import type { NinjaDef, ResourceCategory, ResourceDef } from '../lib/types';

  const CATEGORIES: ResourceCategory[] = ['currency', 'awakening', 'enhance', 'event', 'other'];

  let message = $state<{ kind: 'ok' | 'error'; text: string; details?: string[] } | null>(null);
  let query = $state('');
  let ninjaFormOpen = $state(false);
  let editingNinja = $state<NinjaDef | null>(null);
  let resourceFormOpen = $state(false);
  let resourceDraft = $state<ResourceDef>({ id: '', name: { fr: '', en: '' }, category: 'other' });
  let resourceIsNew = $state(true);

  const customIds = $derived(new Set(player.customNinjas.map((n) => n.id)));
  const filtered = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return catalog.ninjas.filter((n) => !q || `${n.name} ${n.title} ${n.id}`.toLowerCase().includes(q));
  });

  function report(kind: 'ok' | 'error', text: string, details?: string[]) {
    message = { kind, text, details };
  }

  // ---- Backup ----
  function exportAll() {
    downloadText(`blazing-planner-${today()}.json`, exportBackup());
  }

  async function onBackupFile(e: Event) {
    const file = await readFile(e.currentTarget as HTMLInputElement);
    if (!file || !confirm(t('data.importConfirm'))) return;
    try {
      importBackup(file.text);
      report('ok', t('data.imported'));
    } catch (err) {
      report('error', t('data.error', { msg: (err as Error).message }));
    }
  }

  function reset() {
    if (confirm(t('data.resetConfirm'))) resetAll();
  }

  // ---- Catalog ----
  async function onNinjaFile(e: Event) {
    const file = await readFile(e.currentTarget as HTMLInputElement);
    if (!file) return;
    try {
      const res = importNinjas(file.text, file.name);
      res.items.forEach(upsertNinja);
      report(res.errors.length ? 'error' : 'ok', t('data.importResult', { ok: res.items.length, ko: res.errors.length }), res.errors.slice(0, 20));
    } catch (err) {
      report('error', t('data.error', { msg: (err as Error).message }));
    }
  }

  async function onResourceFile(e: Event) {
    const file = await readFile(e.currentTarget as HTMLInputElement);
    if (!file) return;
    try {
      const res = importResources(file.text, file.name);
      res.items.forEach(upsertResource);
      report(res.errors.length ? 'error' : 'ok', t('data.importResult', { ok: res.items.length, ko: res.errors.length }), res.errors.slice(0, 20));
    } catch (err) {
      report('error', t('data.error', { msg: (err as Error).message }));
    }
  }

  function exportCatalog() {
    downloadText('ninjas.json', JSON.stringify(catalog.ninjas, null, 2));
  }

  function newNinja() {
    editingNinja = { id: '', name: '', title: '', element: 'heart', minStars: 1, maxStars: 6, awakening: [], awakeningTemplate: 'standard', tags: [], verified: false };
    ninjaFormOpen = true;
  }

  function editNinja(n: NinjaDef) {
    editingNinja = n;
    ninjaFormOpen = true;
  }

  function saveNinja(n: NinjaDef) {
    upsertNinja(n);
    ninjaFormOpen = false;
  }

  function removeNinja(n: NinjaDef) {
    const used = player.owned.some((o) => o.ninjaId === n.id);
    if (!used && confirm(t('common.confirmDelete', { name: `${n.name} · ${n.title}` }))) deleteNinja(n.id);
  }

  // ---- Resources ----
  function newResource() {
    resourceDraft = { id: '', name: { fr: '', en: '' }, category: 'other' };
    resourceIsNew = true;
    resourceFormOpen = true;
  }

  function editResource(r: ResourceDef) {
    resourceDraft = structuredClone($state.snapshot(r)) as ResourceDef;
    resourceIsNew = false;
    resourceFormOpen = true;
  }

  function saveResource(e: SubmitEvent) {
    e.preventDefault();
    const d = $state.snapshot(resourceDraft) as ResourceDef;
    const fr = d.name.fr.trim() || d.name.en.trim();
    const en = d.name.en.trim() || fr;
    upsertResource({ ...d, id: d.id || slugify(en), name: { fr, en }, element: d.element || undefined });
    resourceFormOpen = false;
  }
</script>

<section class="data">
  <div class="view-head"><h1>{t('data.title')}</h1></div>

  {#if message}
    <div class="message {message.kind}" role="status">
      <p>{message.text}</p>
      {#if message.details?.length}<ul>{#each message.details as d (d)}<li>{d}</li>{/each}</ul>{/if}
      <button class="btn ghost small" type="button" onclick={() => (message = null)}>{t('common.close')}</button>
    </div>
  {/if}

  <section class="panel block">
    <h2>{t('data.backup')}</h2>
    <p class="muted">{t('data.backupHint')}</p>
    <div class="toolbar">
      <button class="btn primary" type="button" onclick={exportAll}>{t('data.export')}</button>
      <label class="btn file">{t('data.import')}<input type="file" accept=".json,application/json" onchange={onBackupFile} /></label>
      <span class="spacer"></span>
      <button class="btn danger" type="button" onclick={reset}>{t('data.reset')}</button>
    </div>
  </section>

  <section class="panel block">
    <h2>{t('data.catalog')}</h2>
    <p class="muted">{t('data.catalogHint', { n: catalog.ninjas.length })}</p>
    <div class="toolbar">
      <button class="btn primary" type="button" onclick={newNinja}>{t('data.newNinja')}</button>
      <label class="btn file">{t('data.importNinjas')}<input type="file" accept=".csv,.json,text/csv,application/json" onchange={onNinjaFile} /></label>
      <button class="btn" type="button" onclick={exportCatalog}>{t('data.exportCatalog')}</button>
      {#if player.hiddenNinjaIds.length > 0}
        <button class="btn ghost" type="button" onclick={restoreHiddenNinjas}>{t('data.restoreHidden', { n: player.hiddenNinjaIds.length })}</button>
      {/if}
    </div>
    <details class="help">
      <summary>{t('data.formatHelp')}</summary>
      <pre>name,title,element,minStars,maxStars,tags,awakeningTemplate,verified
Naruto Uzumaki,Sage Mode,bravery,5,6,attacker|aoe,standard,false</pre>
      <p class="muted small">element : heart · skill · body · bravery · wisdom (ou cœur, technique, corps, bravoure, sagesse)</p>
    </details>

    <input class="search" type="search" bind:value={query} placeholder={t('picker.placeholder')} aria-label={t('common.search')} />
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">{t('form.name')}</th>
            <th scope="col">{t('form.element')}</th>
            <th scope="col">★</th>
            <th scope="col"></th>
            <th scope="col"><span class="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {#each filtered as n (n.id)}
            <tr>
              <th scope="row"><strong>{n.name}</strong> <span class="muted">{n.title}</span></th>
              <td><ElementTag element={n.element} /></td>
              <td class="num">{n.minStars}–{n.maxStars}</td>
              <td class="flags">
                {#if n.verified}<span class="flag ok">{t('data.verified')}</span>{/if}
                {#if customIds.has(n.id)}<span class="flag">{t('data.custom')}</span>{/if}
              </td>
              <td class="row-actions">
                <button class="btn ghost small" type="button" onclick={() => editNinja(n)}>{t('common.edit')}</button>
                <button class="btn ghost small danger" type="button" disabled={player.owned.some((o) => o.ninjaId === n.id)} onclick={() => removeNinja(n)}>{t('common.delete')}</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <section class="panel block">
    <h2>{t('data.resources')}</h2>
    <div class="toolbar">
      <button class="btn primary" type="button" onclick={newResource}>{t('data.newResource')}</button>
      <label class="btn file">{t('data.importResources')}<input type="file" accept=".csv,.json,text/csv,application/json" onchange={onResourceFile} /></label>
    </div>
    <details class="help">
      <summary>{t('data.formatHelp')}</summary>
      <pre>id,name_fr,name_en,category,element
scroll-heart-1,Rouleau Cœur I,Heart Scroll I,awakening,heart</pre>
      <p class="muted small">category : {CATEGORIES.join(' · ')}</p>
    </details>
    <ul class="resources">
      {#each catalog.resources as r (r.id)}
        <li style:--el={r.element ? `var(--${r.element})` : 'var(--line-strong)'}>
          <span>{r.name[prefs.lang]}</span>
          <span class="muted small">{t(`inventory.category.${r.category}`)}</span>
          <span class="row-actions">
            <button class="btn ghost small" type="button" onclick={() => editResource(r)}>{t('common.edit')}</button>
            {#if !catalog.baseResourceIds.has(r.id)}
              <button class="btn ghost small danger" type="button" onclick={() => deleteResource(r.id)}>{t('common.delete')}</button>
            {/if}
          </span>
        </li>
      {/each}
    </ul>
  </section>
</section>

<Modal bind:open={ninjaFormOpen} wide title={editingNinja?.id ? `${editingNinja.name} · ${editingNinja.title}` : t('data.newNinja')}>
  {#if editingNinja}
    {#key editingNinja}
      <NinjaForm ninja={editingNinja} onsave={saveNinja} oncancel={() => (ninjaFormOpen = false)} />
    {/key}
  {/if}
</Modal>

<Modal bind:open={resourceFormOpen} title={resourceIsNew ? t('data.newResource') : resourceDraft.name[prefs.lang]}>
  <form class="rform" onsubmit={saveResource}>
    <label class="field"><span>{t('form.nameFr')}</span><input type="text" bind:value={resourceDraft.name.fr} required /></label>
    <label class="field"><span>{t('form.nameEn')}</span><input type="text" bind:value={resourceDraft.name.en} /></label>
    <label class="field"><span>{t('form.category')}</span>
      <select bind:value={resourceDraft.category}>
        {#each CATEGORIES as c (c)}<option value={c}>{t(`inventory.category.${c}`)}</option>{/each}
      </select>
    </label>
    <label class="field"><span>{t('form.element')}</span>
      <select bind:value={resourceDraft.element}>
        <option value={undefined}>{t('form.noElement')}</option>
        {#each ['heart', 'skill', 'body', 'bravery', 'wisdom'] as const as el (el)}<option value={el}>{t(`element.${el}`)}</option>{/each}
      </select>
    </label>
    <div class="actions">
      <button class="btn" type="button" onclick={() => (resourceFormOpen = false)}>{t('common.cancel')}</button>
      <button class="btn primary" type="submit">{t('common.save')}</button>
    </div>
  </form>
</Modal>

<style>
  .data { display: grid; gap: 1rem; }
  .data > .view-head { margin-bottom: 0; }
  .block { padding: 1rem; display: grid; gap: 0.75rem; }
  .spacer { flex: 1; }
  .file { position: relative; overflow: hidden; }
  .file input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .file:focus-within { outline: 2px solid var(--chakra); outline-offset: 2px; }
  .help summary { cursor: pointer; color: var(--muted); font-size: 0.9rem; font-weight: 600; }
  .help pre {
    background: var(--stone);
    padding: 0.6rem 0.75rem;
    border-radius: var(--radius-s);
    overflow-x: auto;
    font-size: 0.82rem;
    margin: 0.5rem 0;
  }
  .small { font-size: 0.85rem; }
  .search { max-width: 360px; }
  .table-wrap { overflow-x: auto; max-height: 520px; overflow-y: auto; border: 1px solid var(--line); border-radius: var(--radius-s); }
  table { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
  thead th { position: sticky; top: 0; background: var(--paper); text-align: left; color: var(--muted); font-weight: 500; font-size: 0.82rem; border-bottom: 1px solid var(--line); }
  th, td { padding: 0.45rem 0.6rem; }
  tbody th { text-align: left; font-weight: 400; }
  tbody tr + tr { border-top: 1px solid var(--line); }
  .num { white-space: nowrap; font-variant-numeric: tabular-nums; }
  .flags { white-space: nowrap; }
  .flag { font-size: 0.75rem; font-weight: 600; color: var(--chakra); margin-right: 0.4rem; }
  .flag.ok { color: var(--ok); }
  .row-actions { white-space: nowrap; text-align: right; }
  .resources { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.4rem; }
  .resources li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    column-gap: 0.5rem;
    padding: 0.35rem 0.4rem 0.35rem 0.7rem;
    border: 1px solid var(--line);
    border-left: 4px solid var(--el);
    border-radius: var(--radius-s);
  }
  .resources li .muted { grid-column: 1; }
  .resources li .row-actions { grid-column: 2; grid-row: 1 / span 2; }
  .message { padding: 0.75rem 1rem; border-radius: var(--radius-m); border: 1px solid; display: grid; gap: 0.4rem; justify-items: start; }
  .message.ok { border-color: var(--ok); color: var(--ok); }
  .message.error { border-color: var(--danger); color: var(--danger); }
  .message ul { margin: 0; padding-left: 1.2rem; font-size: 0.85rem; }
  .rform { display: grid; gap: 0.75rem; }
  .actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
</style>
