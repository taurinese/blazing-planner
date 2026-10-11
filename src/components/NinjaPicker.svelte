<script lang="ts">
  import Modal from './Modal.svelte';
  import ElementTag from './ElementTag.svelte';
  import NinjaCard from './NinjaCard.svelte';
  import { fmtDate, t } from '../lib/i18n.svelte';
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
      // Released ninjas first: they are the ones players add most.
      return catalog.ninjas
        .filter((n) => matches(n.name, n.title, n.element))
        .toSorted((a, b) => Number(!catalog.isReleased(a)) - Number(!catalog.isReleased(b)))
        .map((n) => ({ id: n.id, ninja: n, stars: n.minStars, extra: ownedCount.get(n.id) ?? 0, planned: false }));
    }
    return player.owned
      .map((o) => ({ o, n: catalog.ninjaById.get(o.ninjaId) }))
      .filter((r) => r.n && matches(r.n.name, r.n.title, r.n.element))
      .map((r) => ({ id: r.o.uid, ninja: r.n!, stars: r.o.stars, extra: r.o.level, planned: r.o.planned }));
  });

  function pick(id: string) {
    onpick(id);
    open = false;
  }
</script>

{#snippet cardGrid(list: typeof rows)}
  <ul class="grid">
    {#each list as row (row.id)}
      {@const upcoming = !catalog.isReleased(row.ninja)}
      <li>
        <button type="button" class="pick" class:planned={row.planned} onclick={() => pick(row.id)}
          aria-label="{row.ninja.name} {row.ninja.title}, {row.stars}★">
          <NinjaCard ninja={row.ninja} stars={row.stars} size={84} dim={upcoming || row.planned}
            level={mode === 'owned' ? row.extra : undefined} showTitle>
            {#snippet badges()}
              {#if mode === 'catalog' && row.extra > 0}<span class="owned" title={t('picker.owned', { n: row.extra })}>×{row.extra}</span>{/if}
            {/snippet}
          </NinjaCard>
          {#if upcoming && row.ninja.revivalDate}
            <span class="release">{fmtDate(row.ninja.revivalDate)}</span>
          {:else if row.planned}
            <span class="release">{t('collection.planned')}</span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>
{/snippet}

<Modal bind:open wide title={t('picker.title')}>
  <div class="filters">
    <input type="search" placeholder={t('picker.placeholder')} bind:value={query} aria-label={t('common.search')} />
    <div class="els" role="group" aria-label={t('form.element')}>
      <button type="button" class="chip" class:active={elementFilter === ''} onclick={() => (elementFilter = '')}>{t('common.all')}</button>
      {#each elements as el (el.id)}
        <button type="button" class="chip" class:active={elementFilter === el.id} onclick={() => (elementFilter = el.id)}>
          <ElementTag element={el.id} />
        </button>
      {/each}
    </div>
  </div>


  {#if rows.length === 0}
    <p class="muted none">{t('collection.noMatch')}</p>
  {:else if mode === 'catalog'}
    {@const released = rows.filter((r) => catalog.isReleased(r.ninja))}
    {@const upcoming = rows.filter((r) => !catalog.isReleased(r.ninja))}
    {#if released.length}
      <h3 class="section">{t('picker.released')} <span class="muted">{released.length}</span></h3>
      {@render cardGrid(released)}
    {/if}
    {#if upcoming.length}
      <h3 class="section">{t('picker.upcoming')} <span class="muted">{upcoming.length}</span></h3>
      {@render cardGrid(upcoming)}
    {/if}
    <p class="muted hint">{t('picker.notInCatalog')}</p>
  {:else}
    {@render cardGrid(rows)}
  {/if}
</Modal>

<style>
  .filters { display: grid; gap: 0.6rem; margin-bottom: 0.75rem; position: sticky; top: -1rem; z-index: 1; background: var(--paper); padding: 0.25rem 0 0.5rem; }
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
  .section { font-size: 1rem; margin: 0.75rem 0 0.5rem; }
  .section .muted { font-family: var(--font); font-weight: 500; font-size: 0.85rem; }
  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
    gap: 0.6rem 0.4rem;
  }
  .pick {
    width: 100%;
    display: grid;
    justify-items: center;
    gap: 0.1rem;
    padding: 0.35rem 0.2rem;
    border: 1px solid transparent;
    border-radius: var(--radius-m);
    background: none;
    cursor: pointer;
  }
  .pick:hover, .pick:focus-visible { background: var(--chakra-soft); border-color: var(--line); }
  .owned {
    padding: 0 0.3rem;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 700;
    background: var(--ok);
    color: #fff;
  }
  .release { font-size: 0.7rem; font-weight: 600; color: var(--muted); }
  .none { padding: 1rem 0; }
  .hint { margin-top: 0.75rem; font-size: 0.85rem; }
</style>
