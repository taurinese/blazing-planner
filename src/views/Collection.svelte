<script lang="ts">
  import ElementTag from '../components/ElementTag.svelte';
  import Modal from '../components/Modal.svelte';
  import NinjaIcon from '../components/NinjaIcon.svelte';
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
        {@const ba = o.blazingAwakened && !!n?.blazingAwakening}
        <li>
          <button type="button" class="tile" class:planned={o.planned} onclick={() => openEditor(o)}
            aria-label="{n?.name ?? o.ninjaId} {n?.title ?? ''}, {o.stars}★, Lv {o.level}">
            <span class="art">
              <NinjaIcon ninja={n} stars={o.stars} blazing={ba} size={88} dim={o.planned} />
              {#if goalUids.has(o.uid)}<span class="badge goal-badge" title={t('collection.goalExists')}>◎</span>{/if}
              {#if o.favorite}<span class="badge fav-badge" title={t('collection.favorite')}>♥</span>{/if}
              <span class="lv num">Lv {o.level}</span>
            </span>
            <span class="name">{n?.name ?? o.ninjaId}</span>
            <span class="title">{n?.title ?? ''}</span>
            <span class="stars-ba">
              <Stars value={o.stars} max={n?.maxStars ?? 6} />
              {#if ba}<span class="ba" title={t('collection.blazing')}>BA</span>{/if}
            </span>
            {#if o.planned}
              <span class="planned-tag" title={t('collection.plannedHint')}>{t('collection.planned')}{#if n && !catalog.isReleased(n) && n.globalDate}{' · '}{fmtDate(catalog.expectedDate(n.globalDate))}{/if}</span>
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
      <div class="hero">
        <NinjaIcon ninja={editingNinja} stars={editing.stars} blazing={editing.blazingAwakened && !!editingNinja?.blazingAwakening} size={96} dim={editing.planned} />
        <div class="hero-side">
          {#if editingNinja}<ElementTag element={editingNinja.element} />{/if}
          <div class="field">
            <span>{t('common.stars')}</span>
            <Stars bind:value={editing.stars} editable min={editingNinja?.minStars ?? 1} max={editingNinja?.maxStars ?? limits.maxStars} />
          </div>
        </div>
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
    grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
    gap: 0.75rem;
  }
  .tile {
    width: 100%;
    height: 100%;
    display: grid;
    justify-items: center;
    align-content: start;
    gap: 0.15rem;
    padding: 0.85rem 0.5rem 0.7rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-m);
    background: var(--paper);
    text-align: center;
    cursor: pointer;
  }
  .tile:hover { border-color: var(--line-strong); background: var(--chakra-soft); }
  .tile.planned { border-style: dashed; background: transparent; }
  .art { position: relative; margin-bottom: 0.4rem; }
  .badge {
    position: absolute;
    top: -7px;
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    font-size: 0.75rem;
    font-weight: 700;
    background: var(--paper);
    box-shadow: 0 0 0 1px var(--line-strong);
  }
  .goal-badge { right: -8px; color: var(--chakra); }
  .fav-badge { left: -8px; color: var(--skill); }
  .lv {
    position: absolute;
    left: 50%;
    bottom: -8px;
    transform: translateX(-50%);
    padding: 0 0.35rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    background: var(--ink);
    color: var(--paper);
    white-space: nowrap;
  }
  .name { font-family: var(--font-cond); font-weight: 700; font-size: 1.02rem; line-height: 1.15; }
  .title {
    font-size: 0.78rem;
    color: var(--muted);
    line-height: 1.2;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .stars-ba { display: inline-flex; align-items: center; gap: 0.3rem; margin-top: 0.2rem; }
  .stars-ba :global(.star) { font-size: 0.8rem; }
  .ba { font-size: 0.65rem; font-weight: 700; padding: 0 0.25rem; border-radius: 3px; background: #e5a50a; color: #1d2433; }
  .planned-tag { font-size: 0.72rem; font-weight: 600; color: var(--muted); }
  .off { opacity: 0.5; }
  .hero { display: flex; gap: 1rem; align-items: center; }
  .hero-side { display: grid; gap: 0.5rem; }
  .form { display: grid; gap: 0.9rem; }
  .cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
  .small { font-size: 0.85rem; }
  .spacer { flex: 1; }
</style>
