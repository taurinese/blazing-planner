<script lang="ts">
  import Calendar from './views/Calendar.svelte';
  import Collection from './views/Collection.svelte';
  import Data from './views/Data.svelte';
  import Goals from './views/Goals.svelte';
  import Inventory from './views/Inventory.svelte';
  import Teams from './views/Teams.svelte';
  import { REPO_URL } from './lib/config';
  import { prefs, t, type MessageKey } from './lib/i18n.svelte';
  import { player, status } from './lib/store.svelte';

  type Route = 'collection' | 'teams' | 'goals' | 'calendar' | 'inventory' | 'data';
  const ROUTES: Route[] = ['collection', 'teams', 'goals', 'calendar', 'inventory', 'data'];

  function fromHash(): Route {
    const h = location.hash.replace(/^#\/?/, '') as Route;
    return ROUTES.includes(h) ? h : 'collection';
  }

  let route = $state<Route>(fromHash());

  $effect(() => {
    const onHash = () => (route = fromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  });

  function go(r: Route) {
    location.hash = `/${r}`;
  }

  const ownedCount = $derived(player.owned.filter((o) => !o.planned).length);
  const openGoals = $derived(player.goals.filter((g) => !g.done).length);

  function cycleTheme() {
    const dark = prefs.theme === 'dark' || (prefs.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    prefs.theme = dark ? 'light' : 'dark';
  }
</script>

<header class="top">
  <div class="inner">
    <a class="brand" href="#/collection">
      <span class="mark" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
      <span>
        <span class="name">{t('app.name')}</span>
        <span class="tagline">{t('app.tagline')}</span>
      </span>
    </a>
    <div class="prefs">
      <button class="btn ghost small" type="button" onclick={() => (prefs.lang = prefs.lang === 'fr' ? 'en' : 'fr')} lang={prefs.lang === 'fr' ? 'en' : 'fr'}>
        {t('lang.switch')}
      </button>
      <button class="btn ghost small" type="button" onclick={cycleTheme} aria-label={t('theme.toggle')} title={t('theme.toggle')}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/></svg>
      </button>
    </div>
  </div>
  <nav aria-label="Navigation">
    <ul class="inner tabs">
      {#each ROUTES as r (r)}
        <li>
          <a href="#/{r}" aria-current={route === r ? 'page' : undefined} onclick={(e) => { e.preventDefault(); go(r); }}>
            {t(`nav.${r}` as MessageKey)}
            {#if r === 'collection' && ownedCount}<span class="count">{ownedCount}</span>{/if}
            {#if r === 'goals' && openGoals}<span class="count">{openGoals}</span>{/if}
          </a>
        </li>
      {/each}
    </ul>
  </nav>
</header>

{#if status.saveFailed}
  <p class="banner" role="alert">{t('save.failed')}</p>
{/if}

<main class="inner">
  {#if route === 'collection'}<Collection ongoal={() => go('goals')} />
  {:else if route === 'teams'}<Teams />
  {:else if route === 'goals'}<Goals />
  {:else if route === 'calendar'}<Calendar />
  {:else if route === 'inventory'}<Inventory />
  {:else}<Data />{/if}
</main>

<footer class="inner foot muted">
  <p>{t('footer.disclaimer')}</p>
  <a href={REPO_URL} target="_blank" rel="noopener">{t('footer.source')}</a>
</footer>

<style>
  :global(.inner) { max-width: 1200px; margin: 0 auto; padding-left: 16px; padding-right: 16px; }
  .top { background: var(--paper); border-bottom: 1px solid var(--line); }
  .top > .inner { display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding-top: 0.9rem; padding-bottom: 0.5rem; }
  .brand { display: flex; align-items: center; gap: 0.75rem; color: inherit; text-decoration: none; }
  .mark { display: flex; gap: 3px; height: 32px; align-items: stretch; }
  .mark i { width: 5px; border-radius: 2px; }
  .mark i:nth-child(1) { background: var(--heart); }
  .mark i:nth-child(2) { background: var(--skill); }
  .mark i:nth-child(3) { background: var(--body); }
  .mark i:nth-child(4) { background: var(--bravery); }
  .mark i:nth-child(5) { background: var(--wisdom); }
  .name { display: block; font-family: var(--font-cond); font-weight: 700; font-size: 1.45rem; line-height: 1; }
  .tagline { display: block; font-size: 0.8rem; color: var(--muted); }
  .prefs { display: flex; gap: 0.25rem; }
  .tabs {
    list-style: none;
    display: flex;
    gap: 0.25rem;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .tabs a {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.55rem 0.8rem 0.6rem;
    color: var(--muted);
    text-decoration: none;
    font-weight: 600;
    border-bottom: 3px solid transparent;
    white-space: nowrap;
  }
  .tabs a:hover { color: var(--ink); }
  .tabs a[aria-current='page'] { color: var(--ink); border-bottom-color: var(--chakra); }
  .count {
    font-size: 0.75rem;
    min-width: 1.4rem;
    padding: 0 0.35rem;
    border-radius: 999px;
    background: var(--chakra-soft);
    color: var(--chakra);
    text-align: center;
  }
  main { padding-top: 1.5rem; padding-bottom: 3rem; }
  .banner { background: var(--danger); color: #fff; padding: 0.6rem 16px; text-align: center; font-weight: 600; }
  .foot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.5rem; padding-bottom: 2rem; font-size: 0.85rem; }
  @media (max-width: 520px) {
    .tagline { display: none; }
  }
</style>
