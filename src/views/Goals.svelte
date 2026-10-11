<script lang="ts">
  import ElementTag from '../components/ElementTag.svelte';
  import NinjaPicker from '../components/NinjaPicker.svelte';
  import Stars from '../components/Stars.svelte';
  import { fmt, prefs, t } from '../lib/i18n.svelte';
  import { goalCost, goalProgress, missingSteps, resourceName, shoppingList } from '../lib/planning';
  import { addGoal, catalog, completeGoal, limits, player, removeGoal, templates } from '../lib/store.svelte';
  import type { Goal } from '../lib/types';

  let pickerOpen = $state(false);
  let showDone = $state(false);

  const visible = $derived(
    player.goals.filter((g) => showDone || !g.done).toSorted((a, b) => Number(a.done) - Number(b.done) || a.priority - b.priority),
  );

  const shopping = $derived(
    shoppingList(player.goals, catalog.ownedByUid, catalog.ninjaById, player.inventory, templates),
  );
  const toFarm = $derived(shopping.filter((l) => l.missing > 0));

  const name = (id: string) => resourceName(catalog.resourceById.get(id), id, prefs.lang);

  function info(goal: Goal) {
    const owned = catalog.ownedByUid.get(goal.uid);
    const ninja = owned ? catalog.ninjaById.get(owned.ninjaId) : undefined;
    const costs = goalCost(goal, owned, ninja, templates);
    const gaps = owned && ninja ? missingSteps(ninja, owned.stars, goal.targetStars, templates) : [];
    return { owned, ninja, costs, gaps, progress: goalProgress(costs, player.inventory) };
  }

  function complete(goal: Goal, costs: { resourceId: string; qty: number }[]) {
    if (confirm(t('goals.completeConfirm'))) completeGoal(goal.id, costs);
  }

  function remove(goal: Goal, label: string) {
    if (confirm(t('common.confirmDelete', { name: label }))) removeGoal(goal.id);
  }

  function addExtra(goal: Goal) {
    goal.extra.push({ resourceId: catalog.resources[0]?.id ?? '', qty: 1 });
  }
</script>

<section>
  <div class="view-head">
    <h1>{t('goals.title')}</h1>
    <div class="toolbar">
      {#if player.goals.some((g) => g.done)}
        <label class="check"><input type="checkbox" bind:checked={showDone} /> {t('goals.showDone')}</label>
      {/if}
      <button class="btn primary" type="button" disabled={player.owned.length === 0} onclick={() => (pickerOpen = true)}>{t('goals.add')}</button>
    </div>
  </div>

  {#if player.owned.length === 0}
    <p class="empty">{t('teams.needOwned')}</p>
  {:else if player.goals.length === 0}
    <div class="empty">
      <p>{t('goals.empty')}</p>
      <p style="margin-top: 1rem"><button class="btn primary" type="button" onclick={() => (pickerOpen = true)}>{t('goals.add')}</button></p>
    </div>
  {:else}
    <div class="layout">
      <div class="goals">
        {#each visible as goal (goal.id)}
          {@const g = info(goal)}
          {@const label = g.ninja ? `${g.ninja.name} · ${g.ninja.title}` : t('goals.ninjaGone')}
          <article class="panel goal" class:done={goal.done} style:--el={g.ninja ? `var(--${g.ninja.element})` : 'var(--line)'}>
            <header>
              <div class="who">
                <h2>{g.ninja?.name ?? t('goals.ninjaGone')}</h2>
                {#if g.ninja}<span class="muted">{g.ninja.title}</span> <ElementTag element={g.ninja.element} compact />{/if}
              </div>
              <label class="field prio">
                <span>{t('goals.priority')}</span>
                <select bind:value={goal.priority} disabled={goal.done}>
                  <option value={1}>{t('goals.priority.1')}</option>
                  <option value={2}>{t('goals.priority.2')}</option>
                  <option value={3}>{t('goals.priority.3')}</option>
                </select>
              </label>
            </header>

            {#if g.owned && g.ninja}
              <div class="stars-line">
                <Stars value={g.owned.stars} max={g.ninja.maxStars} />
                <span class="arrow" aria-hidden="true">→</span>
                {#if goal.done}
                  <Stars value={goal.targetStars} max={g.ninja.maxStars} />
                {:else}
                  <Stars bind:value={goal.targetStars} editable min={g.owned.stars} max={g.ninja.maxStars} />
                {/if}
              </div>
              {#if !goal.done}
                <div class="targets">
                  <label class="field"><span>{t('goals.targetLevel')}</span>
                    <input type="number" min="1" max={limits.maxLevel} placeholder="—" value={goal.targetLevel ?? ''}
                      onchange={(e) => (goal.targetLevel = e.currentTarget.value ? Math.min(limits.maxLevel, Math.max(1, e.currentTarget.valueAsNumber)) : null)} /></label>
                  <label class="field"><span>{t('goals.targetLB')}</span>
                    <input type="number" min="0" max={limits.maxLimitBreak} placeholder="—" value={goal.targetLimitBreak ?? ''}
                      onchange={(e) => (goal.targetLimitBreak = e.currentTarget.value ? Math.min(limits.maxLimitBreak, Math.max(0, e.currentTarget.valueAsNumber)) : null)} /></label>
                </div>
              {/if}
            {/if}

            {#if g.gaps.length > 0 && !goal.done}
              <p class="warn">{t('goals.missingData', { stars: g.gaps.join(', ') })}</p>
            {/if}

            {#if g.costs.length > 0}
              <table class="costs">
                <caption class="sr-only">{t('goals.cost')}</caption>
                <tbody>
                  {#each g.costs as c (c.resourceId)}
                    {@const have = player.inventory[c.resourceId] ?? 0}
                    <tr class:ok={have >= c.qty}>
                      <th scope="row">{name(c.resourceId)}</th>
                      <td class="num">{fmt(Math.min(have, c.qty))} / {fmt(c.qty)}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
              {#if !goal.done}
                <div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(g.progress * 100)}>
                  <span style:width="{g.progress * 100}%"></span>
                </div>
                <p class="muted small">{g.progress >= 1 ? t('goals.ready') : t('goals.progress', { p: Math.floor(g.progress * 100) })}</p>
              {/if}
            {/if}

            {#if !goal.done}
              <details class="extra" open={goal.extra.length > 0}>
                <summary>{t('goals.extra')} ({goal.extra.length})</summary>
                <div class="extra-list">
                  {#each goal.extra as item, i (i)}
                    <div class="extra-row">
                      <select bind:value={item.resourceId} aria-label={t('form.resource')}>
                        {#each catalog.resources as r (r.id)}<option value={r.id}>{name(r.id)}</option>{/each}
                      </select>
                      <input type="number" min="1" bind:value={item.qty} aria-label={t('form.qty')} />
                      <button class="btn ghost small danger" type="button" onclick={() => goal.extra.splice(i, 1)}>{t('common.delete')}</button>
                    </div>
                  {/each}
                  <button class="btn small" type="button" onclick={() => addExtra(goal)}>{t('goals.addExtra')}</button>
                </div>
              </details>
            {/if}

            <footer>
              <button class="btn ghost small danger" type="button" onclick={() => remove(goal, label)}>{t('common.delete')}</button>
              {#if !goal.done && g.owned}
                <button class="btn small" class:primary={g.progress >= 1} type="button" onclick={() => complete(goal, g.costs)}>{t('goals.complete')}</button>
              {:else if goal.done}
                <span class="done-label">{t('goals.completed')}</span>
              {/if}
            </footer>
          </article>
        {/each}
      </div>

      <aside class="panel shopping">
        <h2>{t('goals.shopping')}</h2>
        {#if toFarm.length === 0}
          <p class="muted">{t('goals.shoppingEmpty')}</p>
        {:else}
          <table>
            <thead>
              <tr><th scope="col"></th><th scope="col" class="num">{t('goals.need')}</th><th scope="col" class="num">{t('goals.have')}</th><th scope="col" class="num">{t('goals.missing')}</th></tr>
            </thead>
            <tbody>
              {#each toFarm as line (line.resourceId)}
                <tr>
                  <th scope="row">{name(line.resourceId)}</th>
                  <td class="num">{fmt(line.need)}</td>
                  <td class="num">{fmt(line.have)}</td>
                  <td class="num miss">{fmt(line.missing)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        {/if}
      </aside>
    </div>
  {/if}
</section>

<NinjaPicker bind:open={pickerOpen} mode="owned" onpick={(uid) => addGoal(uid)} />

<style>
  .check { display: inline-flex; align-items: center; gap: 0.4rem; min-height: 2.25rem; }
  .layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 1rem; align-items: start; }
  .goals { display: grid; gap: 0.75rem; }
  .goal { padding: 1rem 1rem 0.75rem 1.1rem; border-left: 5px solid var(--el); display: grid; gap: 0.75rem; }
  .goal.done { opacity: 0.7; }
  header { display: flex; justify-content: space-between; gap: 1rem; align-items: start; }
  .who h2 { font-size: 1.35rem; }
  .who .muted { font-size: 0.9rem; }
  .prio { min-width: 8rem; }
  .stars-line { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
  .arrow { color: var(--muted); }
  .targets { display: grid; grid-template-columns: repeat(2, minmax(0, 10rem)); gap: 0.6rem; }
  .warn { color: var(--warn); font-size: 0.9rem; font-weight: 500; }
  .costs { width: 100%; border-collapse: collapse; font-size: 0.92rem; }
  .costs th { text-align: left; font-weight: 500; padding: 0.2rem 0; }
  .costs td { text-align: right; padding: 0.2rem 0; color: var(--muted); }
  .costs tr.ok td { color: var(--ok); font-weight: 600; }
  .costs tr + tr { border-top: 1px solid var(--line); }
  .progress { height: 6px; background: var(--line); border-radius: 3px; overflow: hidden; }
  .progress span { display: block; height: 100%; background: var(--chakra); }
  .small { font-size: 0.85rem; }
  .extra summary { cursor: pointer; color: var(--muted); font-size: 0.9rem; font-weight: 600; }
  .extra-list { display: grid; gap: 0.4rem; margin-top: 0.5rem; justify-items: start; }
  .extra-row { display: grid; grid-template-columns: minmax(0, 1fr) 6rem auto; gap: 0.4rem; width: 100%; }
  footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--line); padding-top: 0.6rem; }
  .done-label { color: var(--ok); font-weight: 600; font-size: 0.9rem; }
  .shopping { padding: 1rem; position: sticky; top: 1rem; display: grid; gap: 0.75rem; }
  .shopping table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  .shopping th, .shopping td { padding: 0.3rem 0.25rem; }
  .shopping thead th { color: var(--muted); font-weight: 500; font-size: 0.8rem; }
  .shopping tbody th { text-align: left; font-weight: 500; }
  .shopping tbody tr { border-top: 1px solid var(--line); }
  .num { text-align: right; }
  .miss { color: var(--danger); font-weight: 700; }

  @media (max-width: 900px) {
    .layout { grid-template-columns: 1fr; }
    .shopping { position: static; order: -1; }
  }
</style>
