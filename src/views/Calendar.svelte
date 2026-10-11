<script lang="ts">
  import NinjaCard from '../components/NinjaCard.svelte';
  import { fmtDate, t } from '../lib/i18n.svelte';
  import { addGoal, addOwned, catalog, elements, player, revivalInfo } from '../lib/store.svelte';
  import type { ElementId, NinjaDef } from '../lib/types';

  const MAX_SOURCES = 4;
  const COLLAPSED_SIZE = 12;
  const DAY = 86_400_000;

  let expanded = $state(new Set<string>());
  let showPast = $state(false);
  let query = $state('');
  let elementFilter = $state<ElementId | ''>('');

  const ownedIds = $derived(new Set(player.owned.map((o) => o.ninjaId)));
  const today = catalog.today;
  const gachawiki = revivalInfo.sources.find((s) => s.name === 'GachaWiki');

  /** Revival releases grouped by date, oldest first, labelled with the waves announced that day. */
  const releases = $derived.by(() => {
    const byDate = new Map<string, NinjaDef[]>();
    for (const n of catalog.ninjas) {
      if (!n.revivalDate) continue;
      if (!byDate.has(n.revivalDate)) byDate.set(n.revivalDate, []);
      byDate.get(n.revivalDate)!.push(n);
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, ninjas]) => {
        const counts = new Map<string, number>();
        for (const n of ninjas) for (const s of n.sources ?? []) counts.set(s, (counts.get(s) ?? 0) + 1);
        const sources = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
        const waves = revivalInfo.batches.filter((b) => b.date === date && !b.label.startsWith('Upcoming')).map((b) => b.label);
        return { date, ninjas, sources, waves };
      });
  });

  /** Latest wave already out: kept visible so current banners stay on screen. */
  const currentDate = $derived(releases.filter((r) => r.date <= today).at(-1)?.date ?? '');

  const visible = $derived.by(() => {
    const q = query.trim().toLowerCase();
    return releases
      .filter((r) => showPast || r.date >= currentDate)
      .map((r) => ({
        ...r,
        ninjas: r.ninjas.filter(
          (n) =>
            (!elementFilter || n.element === elementFilter) &&
            (!q || `${n.name} ${n.title} ${(n.sources ?? []).join(' ')}`.toLowerCase().includes(q)),
        ),
      }))
      .filter((r) => r.ninjas.length > 0);
  });

  /** Index of the first upcoming release, where the "today" marker goes. */
  const hereIndex = $derived(visible.findIndex((r) => r.date > today));

  const daysUntil = (date: string) => Math.round((Date.parse(date) - Date.parse(today)) / DAY);

  function plan(n: NinjaDef) {
    const owned = addOwned(n.id, !catalog.isReleased(n));
    addGoal(owned.uid);
  }
</script>

<section>
  <div class="view-head">
    <div>
      <h1>{t('calendar.title')}</h1>
      <p class="muted">
        {t('calendar.credit', { date: fmtDate(revivalInfo.importedAt) })}
        {#if gachawiki}<a href={gachawiki.url} target="_blank" rel="noopener">GachaWiki</a>{/if}
      </p>
    </div>
  </div>

  <div class="toolbar filters">
    <label class="field grow"><span>{t('common.search')}</span>
      <input type="search" bind:value={query} placeholder={t('picker.placeholder')} /></label>
    <label class="field"><span>{t('form.element')}</span>
      <select bind:value={elementFilter}>
        <option value="">{t('common.all')}</option>
        {#each elements as el (el.id)}<option value={el.id}>{t(`element.${el.id}`)}</option>{/each}
      </select>
    </label>
    <label class="check"><input type="checkbox" bind:checked={showPast} /> {t('calendar.showPast')}</label>
  </div>

  {#if visible.length === 0}
    <p class="empty">{t('calendar.empty')}</p>
  {:else}
    <ol class="timeline">
      {#each visible as release, i (release.date)}
        {#if i === hereIndex}
          <li class="here"><span>{t('calendar.today')} · {fmtDate(today)}</span></li>
        {/if}
        {@const past = release.date <= today}
        <li class="release" class:past>
          <div class="when">
            <strong>{fmtDate(release.date)}</strong>
            {#if !past}<span class="soon">{t('calendar.inDays', { n: daysUntil(release.date) })}</span>{/if}
            {#each release.waves as w (w)}<span class="muted">{w}</span>{/each}
          </div>
          <div class="what">
            {#if release.sources.length}
              <p class="sources">
                <span class="sr-only">{t('calendar.sources')} :</span>
                {release.sources.slice(0, MAX_SOURCES).join(' · ')}{#if release.sources.length > MAX_SOURCES}{' · +'}{release.sources.length - MAX_SOURCES}{/if}
              </p>
            {/if}
            <ul class="ninjas">
              {#each expanded.has(release.date) || query ? release.ninjas : release.ninjas.slice(0, COLLAPSED_SIZE) as n (n.id)}
                <li class="ninja" title="{n.name} · {n.title} · {n.minStars}–{n.maxStars}★">
                  <NinjaCard ninja={n} stars={n.minStars} size={84} dim={!catalog.isReleased(n)} showTitle />
                  {#if ownedIds.has(n.id)}
                    <span class="have">✓ {t('calendar.planned')}</span>
                  {:else}
                    <button class="btn small" type="button" onclick={() => plan(n)} aria-label="{t('calendar.plan')} {n.name} {n.title}">{t('calendar.plan')}</button>
                  {/if}
                </li>
              {/each}
            </ul>
            {#if release.ninjas.length > COLLAPSED_SIZE && !expanded.has(release.date) && !query}
              <button class="btn small more" type="button" onclick={() => (expanded = new Set([...expanded, release.date]))}>
                {t('calendar.showMore', { n: release.ninjas.length - COLLAPSED_SIZE })}
              </button>
            {/if}
          </div>
        </li>
      {/each}
      {#if hereIndex === -1}
        <li class="here"><span>{t('calendar.today')} · {fmtDate(today)}</span></li>
      {/if}
    </ol>
  {/if}
</section>

<style>
  .filters { margin-bottom: 1.25rem; }
  .grow { flex: 1 1 220px; max-width: 360px; }
  .check { display: inline-flex; align-items: center; gap: 0.4rem; min-height: 2.25rem; }

  .timeline { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.75rem; }
  .release {
    display: grid;
    grid-template-columns: 11rem minmax(0, 1fr);
    gap: 1rem;
    padding: 0.9rem 1rem;
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: var(--radius-m);
  }
  .release.past { background: transparent; }
  .when { display: grid; align-content: start; gap: 0.1rem; }
  .when strong { font-family: var(--font-cond); font-size: 1.2rem; line-height: 1.15; }
  .when .muted { font-size: 0.8rem; }
  .soon { font-size: 0.82rem; font-weight: 700; color: var(--chakra); }
  .what { display: grid; gap: 0.6rem; min-width: 0; }
  .sources { font-size: 0.88rem; color: var(--muted); }
  .ninjas { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 0.75rem 0.4rem; }
  .ninja { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; }
  .ninja > :last-child { margin-top: auto; }
  .more { justify-self: start; }
  .have { font-size: 0.75rem; font-weight: 600; color: var(--ok); min-height: 1.9rem; display: grid; place-items: center; }

  .here { display: flex; align-items: center; gap: 0.75rem; color: var(--chakra); font-weight: 700; font-size: 0.9rem; }
  .here::before, .here::after { content: ''; flex: 1; height: 2px; background: var(--chakra); }

  @media (max-width: 640px) {
    .release { grid-template-columns: 1fr; gap: 0.5rem; }
  }
</style>
