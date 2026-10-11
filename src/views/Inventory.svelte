<script lang="ts">
  import ResourceIcon from '../components/ResourceIcon.svelte';
  import { fmt, prefs, t } from '../lib/i18n.svelte';
  import { resourceName, shoppingList } from '../lib/planning';
  import { catalog, player, setQty, templates } from '../lib/store.svelte';
  import { RESOURCE_CATEGORIES } from '../lib/types';

  const CATEGORIES = RESOURCE_CATEGORIES;

  let onlyNeeded = $state(false);
  let query = $state('');

  const needs = $derived(
    new Map(shoppingList(player.goals, catalog.ownedByUid, catalog.ninjaById, player.inventory, templates).map((l) => [l.resourceId, l])),
  );

  const groups = $derived(
    CATEGORIES.map((cat) => ({
      cat,
      items: catalog.resources.filter((r) => {
        if (r.category !== cat) return false;
        if (onlyNeeded && !needs.has(r.id)) return false;
        const q = query.trim().toLowerCase();
        return !q || `${r.name.fr} ${r.name.en}`.toLowerCase().includes(q);
      }),
    })).filter((g) => g.items.length > 0),
  );

  function step(id: string, delta: number) {
    setQty(id, (player.inventory[id] ?? 0) + delta);
  }
</script>

<section>
  <div class="view-head">
    <div>
      <h1>{t('inventory.title')}</h1>
      <p class="muted">{t('inventory.hint')}</p>
    </div>
  </div>

  <div class="toolbar filters">
    <label class="field grow"><span>{t('common.search')}</span><input type="search" bind:value={query} /></label>
    <label class="check"><input type="checkbox" bind:checked={onlyNeeded} /> {t('inventory.onlyNeeded')}</label>
  </div>

  {#each groups as group (group.cat)}
    <section class="group">
      <h2>{t(`inventory.category.${group.cat}`)}</h2>
      <ul class="items">
        {#each group.items as r (r.id)}
          {@const need = needs.get(r.id)}
          {@const qty = player.inventory[r.id] ?? 0}
          <li class="item" style:--el={r.element ? `var(--${r.element})` : 'var(--line-strong)'}>
            <ResourceIcon resource={r} size={56} />
            <div class="label">
              <span class="name">{resourceName(r, r.id, prefs.lang)}</span>
              {#if need}
                <span class="need" class:met={need.missing === 0}>{t('inventory.needed', { n: fmt(need.need) })}</span>
              {/if}
            </div>
            <div class="qty">
              <button class="btn small" type="button" aria-label="-1" onclick={() => step(r.id, -1)} disabled={qty === 0}>−</button>
              <input
                type="number"
                min="0"
                inputmode="numeric"
                value={qty}
                aria-label={resourceName(r, r.id, prefs.lang)}
                onchange={(e) => setQty(r.id, e.currentTarget.valueAsNumber)}
              />
              <button class="btn small" type="button" aria-label="+1" onclick={() => step(r.id, 1)}>+</button>
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {:else}
    <p class="empty">{t('collection.noMatch')}</p>
  {/each}
</section>

<style>
  .filters { margin-bottom: 1.25rem; }
  .grow { flex: 1 1 220px; max-width: 360px; }
  .check { display: inline-flex; align-items: center; gap: 0.4rem; min-height: 2.25rem; }
  .group { margin-bottom: 1.5rem; }
  .group h2 { margin-bottom: 0.6rem; }
  .items {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 0.5rem;
  }
  .item {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-areas: "icon label" "icon qty";
    column-gap: 0.75rem;
    row-gap: 0.4rem;
    align-items: center;
    padding: 0.6rem 0.7rem;
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: var(--radius-m);
  }
  .item > :global(.icon) { grid-area: icon; }
  .label { grid-area: label; display: grid; gap: 0.1rem; min-width: 0; }
  .name { font-size: 0.9rem; line-height: 1.2; font-weight: 600; }
  .need { font-size: 0.78rem; color: var(--danger); }
  .need.met { color: var(--ok); }
  .qty { grid-area: qty; display: flex; gap: 0.25rem; align-items: center; }
  .qty input { flex: 1; min-width: 0; max-width: 8rem; text-align: right; }
</style>
