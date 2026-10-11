<script lang="ts">
  import Modal from './Modal.svelte';
  import ElementTag from './ElementTag.svelte';
  import Stars from './Stars.svelte';
  import { t } from '../lib/i18n.svelte';
  import { catalog, elements, player } from '../lib/store.svelte';
  import type { ElementId } from '../lib/types';

  let {
    open = $bindable(false),
    mode,
    onpick,
  }: { open: boolean; mode: 'catalog' | 'owned'; onpick: (id: string) => void } = $props();

  let query = $state('');
  let elementFilter = $state<ElementId | ''>('');

  const ownedCount = $derived.by(() => {
    const counts = new Map<string, number>();
    for (const o of player.owned) counts.set(o.ninjaId, (counts.get(o.ninjaId) ?? 0) + 1);
    return counts;
  });

  function matches(name: string, title: string, element: ElementId): boolean {
    if (elementFilter && element !== elementFilter) return false;
    const q = query.trim().toLowerCase();
    return !q || `${name} ${title}`.toLowerCase().includes(q);
  }

  const rows = $derived.by(() => {
    if (mode === 'catalog') {
      return catalog.ninjas
        .filter((n) => matches(n.name, n.title, n.element))
        .map((n) => ({ id: n.id, ninja: n, stars: n.minStars, extra: ownedCount.get(n.id) ?? 0 }));
    }
    return player.owned
      .map((o) => ({ o, n: catalog.ninjaById.get(o.ninjaId) }))
      .filter((r) => r.n && matches(r.n.name, r.n.title, r.n.element))
      .map((r) => ({ id: r.o.uid, ninja: r.n!, stars: r.o.stars, extra: r.o.level }));
  });

  function pick(id: string) {
    onpick(id);
    open = false;
  }
</script>

<Modal bind:open title={t('picker.title')}>
  <div class="filters">
    <input type="search" placeholder={t('picker.placeholder')} bind:value={query} aria-label={t('common.search')} />
    <div class="els" role="group" aria-label={t('form.element')}>
      <button type="button" class="chip" class:active={elementFilter === ''} onclick={() => (elementFilter = '')}>{t('common.all')}</button>
      {#each elements as el (el.id)}
        <button type="button" class="chip" class:active={elementFilter === el.id} onclick={() => (elementFilter = el.id)}>
          <ElementTag element={el.id} compact />
        </button>
      {/each}
    </div>
  </div>

  <ul class="list">
    {#each rows as row (row.id)}
      <li>
        <button type="button" class="row" style:--el="var(--{row.ninja.element})" onclick={() => pick(row.id)}>
          <span class="who">
            <strong>{row.ninja.name}</strong>
            <span class="muted">{row.ninja.title}</span>
          </span>
          <Stars value={row.stars} max={row.ninja.maxStars} />
          {#if mode === 'catalog' && row.extra > 0}
            <span class="badge">{t('picker.owned', { n: row.extra })}</span>
          {:else if mode === 'owned'}
            <span class="badge num">Lv {row.extra}</span>
          {/if}
        </button>
      </li>
    {:else}
      <li class="muted none">{t('collection.noMatch')}</li>
    {/each}
  </ul>
  {#if mode === 'catalog'}<p class="muted hint">{t('picker.notInCatalog')}</p>{/if}
</Modal>

<style>
  .filters { display: grid; gap: 0.6rem; margin-bottom: 0.75rem; }
  .els { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .chip {
    border: 1px solid var(--line);
    background: var(--paper);
    border-radius: 999px;
    padding: 0.2rem 0.7rem;
    cursor: pointer;
    font-size: 0.85rem;
    min-height: 2rem;
  }
  .chip.active { border-color: var(--ink); background: var(--chakra-soft); }
  .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.35rem; }
  .row {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 0.75rem;
    padding: 0.55rem 0.75rem 0.55rem 0.9rem;
    border: 1px solid var(--line);
    border-left: 4px solid var(--el);
    border-radius: var(--radius-s);
    background: var(--paper);
    text-align: left;
    cursor: pointer;
  }
  .row:hover { background: var(--chakra-soft); }
  .who { display: grid; line-height: 1.25; }
  .who .muted { font-size: 0.85rem; }
  .badge { font-size: 0.8rem; color: var(--muted); }
  .none { padding: 1rem 0; }
  .hint { margin-top: 0.75rem; font-size: 0.85rem; }
</style>
