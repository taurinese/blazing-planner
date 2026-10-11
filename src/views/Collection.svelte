<script lang="ts">
  import ElementTag from '../components/ElementTag.svelte';
  import Modal from '../components/Modal.svelte';
  import NinjaPicker from '../components/NinjaPicker.svelte';
  import Stars from '../components/Stars.svelte';
  import { fmtDate, t } from '../lib/i18n.svelte';
  import { addGoal, addOwned, catalog, elements, limits, player, removeOwned } from '../lib/store.svelte';
  import type { ElementId, OwnedNinja } from '../lib/types';

  let { ongoal }: { ongoal: () => void } = $props();

  let pickerOpen = $state(false);
  let editing = $state<OwnedNinja | null>(null);
  let editOpen = $state(false);
  let query = $state('');
  let elementFilter = $state<ElementId | ''>('');
  let favoritesOnly = $state(false);
  let sort = $state<'name' | 'stars' | 'level'>('name');

  const goalUids = $derived(new Set(player.goals.filter((g) => !g.done).map((g) => g.uid)));

  const rows = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return player.owned
      .map((o) => ({ o, n: catalog.ninjaById.get(o.ninjaId) }))
      .filter(({ o, n }) => {
        if (favoritesOnly && !o.favorite) return false;
        if (elementFilter && n?.element !== elementFilter) return false;
        return !q || `${n?.name ?? ''} ${n?.title ?? ''}`.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sort === 'stars') return b.o.stars - a.o.stars || b.o.level - a.o.level;
        if (sort === 'level') return b.o.level - a.o.level;
        return (a.n?.name ?? '').localeCompare(b.n?.name ?? '');
      });
  });

  function openEditor(o: OwnedNinja) {
    editing = o;
    editOpen = true;
  }

  function onPick(ninjaId: string) {
    const ninja = catalog.ninjaById.get(ninjaId);
    // A ninja not released yet on the revival can only be planned.
    openEditor(addOwned(ninjaId, ninja ? !catalog.isReleased(ninja) : false));
  }

  function remove(o: OwnedNinja) {
    const n = catalog.ninjaById.get(o.ninjaId);
    if (confirm(t('common.confirmDelete', { name: n?.name ?? o.ninjaId }))) {
      removeOwned(o.uid);
      editOpen = false;
    }
  }

  function createGoal(o: OwnedNinja) {
    addGoal(o.uid);
    editOpen = false;
    ongoal();
  }

  const editingNinja = $derived(editing ? catalog.ninjaById.get(editing.ninjaId) : undefined);
  const maxLevel = $derived(editingNinja?.maxLevel ?? limits.maxLevel);
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(v) ? Math.round(v) : lo));
</script>

<section>
  <div class="view-head">
    <div>
      <h1>{t('collection.title')}</h1>
      <p class="muted">{t('collection.count', { n: player.owned.filter((o) => !o.planned).length })}</p>
    </div>
    <button class="btn primary" type="button" onclick={() => (pickerOpen = true)}>{t('collection.add')}</button>
  </div>

  {#if player.owned.length === 0}
    <div class="empty">
      <p>{t('collection.empty')}</p>
      <p style="margin-top: 1rem"><button class="btn primary" type="button" onclick={() => (pickerOpen = true)}>{t('collection.add')}</button></p>
    </div>
  {:else}
    <div class="toolbar filters">
      <label class="field grow">
        <span>{t('common.search')}</span>
        <input type="search" bind:value={query} placeholder={t('picker.placeholder')} />
      </label>
      <label class="field">
        <span>{t('form.element')}</span>
        <select bind:value={elementFilter}>
          <option value="">{t('common.all')}</option>
          {#each elements as el (el.id)}<option value={el.id}>{t(`element.${el.id}`)}</option>{/each}
        </select>
      </label>
      <label class="field">
        <span>{t('collection.sort')}</span>
        <select bind:value={sort}>
          <option value="name">{t('collection.sort.name')}</option>
          <option value="stars">{t('collection.sort.stars')}</option>
          <option value="level">{t('collection.sort.level')}</option>
        </select>
      </label>
      <label class="check"><input type="checkbox" bind:checked={favoritesOnly} /> {t('collection.favoritesOnly')}</label>
    </div>

    <ul class="grid">
      {#each rows as { o, n } (o.uid)}
        <li>
          <button type="button" class="card" class:planned={o.planned} style:--el="var(--{n?.element ?? 'muted'})" onclick={() => openEditor(o)}>
            <span class="top">
              <span class="who">
                <strong>{n?.name ?? o.ninjaId}{#if o.favorite}<span class="fav" aria-label={t('collection.favorite')}> ♥</span>{/if}</strong>
                <span class="muted">{n?.title ?? ''}</span>
              </span>
              {#if n}<ElementTag element={n.element} compact />{/if}
            </span>
            <span class="meta">
              <span class="stars-ba">
                <Stars value={o.stars} max={n?.maxStars ?? 6} />
                {#if o.blazingAwakened && n?.blazingAwakening}<span class="ba" title={t('collection.blazing')}>BA</span>{/if}
              </span>
              <span class="num">Lv {o.level}{#if o.limitBreak > 0} · LB {o.limitBreak}{/if}</span>
            </span>
            {#if o.planned || goalUids.has(o.uid)}
              <span class="tags">
                {#if o.planned}<span class="planned-tag" title={t('collection.plannedHint')}>{t('collection.planned')}{#if n && !catalog.isReleased(n) && n.globalDate}{' · '}{fmtDate(catalog.expectedDate(n.globalDate))}{/if}</span>{/if}
                {#if goalUids.has(o.uid)}<span class="goal">{t('collection.goalExists')}</span>{/if}
              </span>
            {/if}
          </button>
        </li>
      {:else}
        <li class="muted">{t('collection.noMatch')}</li>
      {/each}
    </ul>
  {/if}
</section>

<NinjaPicker bind:open={pickerOpen} mode="catalog" onpick={onPick} />

<Modal bind:open={editOpen} title={editingNinja ? `${editingNinja.name} · ${editingNinja.title}` : ''}>
  {#if editing}
    <div class="form">
      {#if editingNinja}
        <div class="row-between">
          <ElementTag element={editingNinja.element} />
        </div>
      {/if}
      <div class="field">
        <span>{t('common.stars')}</span>
        <Stars bind:value={editing.stars} editable min={editingNinja?.minStars ?? 1} max={editingNinja?.maxStars ?? limits.maxStars} />
      </div>
      {#if editingNinja?.blazingAwakening}
        {@const atMax = editing.stars >= editingNinja.maxStars}
        <label class="check">
          <input type="checkbox" disabled={!atMax} checked={atMax && editing.blazingAwakened}
            onchange={(e) => editing && (editing.blazingAwakened = e.currentTarget.checked)} />
          {t('collection.blazing')}
          {#if !atMax}<span class="muted small">{t('collection.blazingHint', { stars: editingNinja.maxStars })}</span>{/if}
        </label>
      {/if}
      <div class="cols">
        <label class="field"><span>{t('common.level')}</span>
          <input type="number" min="1" max={maxLevel} value={editing.level}
            onchange={(e) => editing && (editing.level = clamp(e.currentTarget.valueAsNumber, 1, maxLevel))} /></label>
        <label class="field" class:off={editingNinja?.limitBreak === false}><span>{t('collection.limitBreak')}</span>
          <input type="number" min="0" max={limits.maxLimitBreak} value={editing.limitBreak}
            onchange={(e) => editing && (editing.limitBreak = clamp(e.currentTarget.valueAsNumber, 0, limits.maxLimitBreak))} /></label>
        <label class="field"><span>{t('collection.ninjutsu')}</span>
          <input type="number" min="1" max={limits.maxSkillLevel} value={editing.ninjutsuLevel}
            onchange={(e) => editing && (editing.ninjutsuLevel = clamp(e.currentTarget.valueAsNumber, 1, limits.maxSkillLevel))} /></label>
        <label class="field"><span>{t('collection.secret')}</span>
          <input type="number" min="1" max={limits.maxSkillLevel} value={editing.secretLevel}
            onchange={(e) => editing && (editing.secretLevel = clamp(e.currentTarget.valueAsNumber, 1, limits.maxSkillLevel))} /></label>
      </div>
      <label class="check"><input type="checkbox" bind:checked={editing.planned} /> {t('collection.plannedToggle')}</label>
      <label class="check"><input type="checkbox" bind:checked={editing.favorite} /> {t('collection.favorite')}</label>
      <label class="field"><span>{t('common.notes')}</span><textarea bind:value={editing.notes}></textarea></label>
    </div>
  {/if}
  {#snippet footer()}
    {#if editing}
      {@const current = editing}
      <button class="btn danger" type="button" onclick={() => remove(current)}>{t('common.delete')}</button>
      <span class="spacer"></span>
      {#if !goalUids.has(current.uid)}
        <button class="btn" type="button" onclick={() => createGoal(current)}>{t('collection.addGoal')}</button>
      {/if}
      <button class="btn primary" type="button" onclick={() => (editOpen = false)}>{t('common.close')}</button>
    {/if}
  {/snippet}
</Modal>

<style>
  .filters { margin-bottom: 1rem; }
  .grow { flex: 1 1 220px; }
  .check { display: inline-flex; align-items: center; gap: 0.4rem; min-height: 2.25rem; }
  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 0.6rem;
  }
  .card {
    width: 100%;
    height: 100%;
    display: grid;
    gap: 0.5rem;
    align-content: start;
    padding: 0.75rem 0.9rem 0.75rem 1rem;
    border: 1px solid var(--line);
    border-left: 5px solid var(--el);
    border-radius: var(--radius-m);
    background: var(--paper);
    text-align: left;
    cursor: pointer;
  }
  .card:hover { border-color: var(--line-strong); border-left-color: var(--el); }
  .top { display: flex; justify-content: space-between; align-items: start; gap: 0.5rem; }
  .who { display: grid; line-height: 1.25; }
  .who strong { font-family: var(--font-cond); font-size: 1.15rem; }
  .who .muted { font-size: 0.85rem; }
  .fav { color: var(--skill); }
  .meta { display: flex; justify-content: space-between; align-items: center; font-size: 0.9rem; }
  .stars-ba { display: inline-flex; align-items: center; gap: 0.4rem; }
  .ba { font-size: 0.7rem; font-weight: 700; padding: 0 0.3rem; border-radius: 3px; background: var(--ink); color: var(--paper); }
  .off { opacity: 0.5; }
  .card.planned { border-style: dashed; border-left-style: solid; background: transparent; }
  .tags { display: flex; flex-wrap: wrap; gap: 0.2rem 0.75rem; }
  .planned-tag { font-size: 0.8rem; font-weight: 600; color: var(--muted); }
  .goal { font-size: 0.8rem; color: var(--chakra); font-weight: 600; }
  .form { display: grid; gap: 0.9rem; }
  .cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
  .row-between { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
  .small { font-size: 0.85rem; }
  .spacer { flex: 1; }
</style>
