<script lang="ts">
  import ElementTag from '../components/ElementTag.svelte';
  import NinjaPicker from '../components/NinjaPicker.svelte';
  import Stars from '../components/Stars.svelte';
  import { t } from '../lib/i18n.svelte';
  import { duplicateUids, teamElements } from '../lib/planning';
  import { addTeam, catalog, duplicateTeam, elements, player, removeTeam } from '../lib/store.svelte';
  import type { ElementId, Team } from '../lib/types';

  let pickerOpen = $state(false);
  let target: { team: Team; slot: number; role: 'main' | 'support' } | null = null;

  function choose(team: Team, slot: number, role: 'main' | 'support') {
    target = { team, slot, role };
    pickerOpen = true;
  }

  function onPick(uid: string) {
    if (target) target.team.slots[target.slot][target.role] = uid;
  }

  function create() {
    addTeam(t('teams.defaultName', { n: player.teams.length + 1 }));
  }

  function remove(team: Team) {
    if (confirm(t('common.confirmDelete', { name: team.name }))) removeTeam(team.id);
  }

  function describe(uid: string | null) {
    if (!uid) return null;
    const o = catalog.ownedByUid.get(uid);
    const n = o ? catalog.ninjaById.get(o.ninjaId) : undefined;
    return o && n ? { o, n } : null;
  }

  /** Elements no main ninja hits for bonus damage. */
  function uncovered(counts: Record<ElementId, number>): ElementId[] {
    const covered = new Set(elements.filter((el) => counts[el.id] > 0).map((el) => el.beats));
    return elements.map((el) => el.id).filter((id) => !covered.has(id));
  }
</script>

<section>
  <div class="view-head">
    <h1>{t('teams.title')}</h1>
    <button class="btn primary" type="button" onclick={create}>{t('teams.add')}</button>
  </div>

  {#if player.owned.length === 0}
    <p class="empty">{t('teams.needOwned')}</p>
  {:else if player.teams.length === 0}
    <div class="empty">
      <p>{t('teams.empty')}</p>
      <p style="margin-top: 1rem"><button class="btn primary" type="button" onclick={create}>{t('teams.add')}</button></p>
    </div>
  {/if}

  <div class="teams">
    {#each player.teams as team (team.id)}
      {@const counts = teamElements(team, catalog.ownedByUid, catalog.ninjaById)}
      {@const dups = duplicateUids(team)}
      {@const holes = uncovered(counts)}
      {@const filled = Object.values(counts).reduce((a, b) => a + b, 0)}
      <article class="panel team">
        <header>
          <input class="name" type="text" bind:value={team.name} aria-label={t('teams.rename')} />
          <div class="actions">
            <button class="btn ghost small" type="button" onclick={() => duplicateTeam(team.id, t('common.copySuffix'))}>{t('common.duplicate')}</button>
            <button class="btn ghost small danger" type="button" onclick={() => remove(team)}>{t('common.delete')}</button>
          </div>
        </header>

        <ol class="slots">
          {#each team.slots as slot, i (i)}
            <li class="slot">
              <span class="pos muted">{t('teams.slot', { n: i + 1 })}</span>
              {#each ['main', 'support'] as const as role (role)}
                {@const d = describe(slot[role])}
                <div class="cell {role}" style:--el={d ? `var(--${d.n.element})` : 'var(--line)'}>
                  <span class="role">{t(role === 'main' ? 'teams.main' : 'teams.support')}</span>
                  {#if d}
                    <button type="button" class="filled" onclick={() => choose(team, i, role)}>
                      <strong>{d.n.name}</strong>
                      <span class="muted title">{d.n.title}</span>
                      <span class="line"><Stars value={d.o.stars} max={d.n.maxStars} /><span class="num muted">Lv {d.o.level}</span></span>
                    </button>
                    <button type="button" class="btn ghost small clear" onclick={() => (slot[role] = null)}>{t('teams.clear')}</button>
                  {:else}
                    <button type="button" class="pick" onclick={() => choose(team, i, role)}>+ {t('teams.pick')}</button>
                  {/if}
                </div>
              {/each}
            </li>
          {/each}
        </ol>

        <div class="analysis">
          <div>
            <span class="muted label">{t('teams.elements')}</span>
            <div class="bar" role="img" aria-label={elements.map((el) => `${t(`element.${el.id}`)} ${counts[el.id]}`).join(', ')}>
              {#each elements as el (el.id)}
                {#each Array.from({ length: counts[el.id] }) as _, k (k)}<span style:background="var(--{el.id})"></span>{/each}
              {/each}
              {#each Array.from({ length: 4 - filled }) as _, k (k)}<span class="free"></span>{/each}
            </div>
          </div>
          {#if dups.length > 0}<p class="warn">{t('teams.duplicate')}</p>{/if}
          {#if filled > 0 && holes.length > 0}
            <p class="holes">
              <span>{t('teams.weakTo')}</span>
              {#each holes as h (h)}<ElementTag element={h} />{/each}
            </p>
          {/if}
        </div>
        <label class="field notes"><span>{t('common.notes')}</span><textarea bind:value={team.notes}></textarea></label>
      </article>
    {/each}
  </div>
</section>

<NinjaPicker bind:open={pickerOpen} mode="owned" onpick={onPick} />

<style>
  .teams { display: grid; gap: 1rem; }
  .team { padding: 1rem; display: grid; gap: 1rem; }
  header { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: space-between; align-items: center; }
  .name {
    font-family: var(--font-cond);
    font-size: 1.4rem;
    font-weight: 700;
    border-color: transparent;
    background: transparent;
    max-width: 24rem;
    padding-left: 0.3rem;
  }
  .name:hover, .name:focus { border-color: var(--line-strong); }
  .actions { display: flex; gap: 0.25rem; }
  .slots {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.6rem;
  }
  .slot { display: grid; gap: 0.4rem; align-content: start; }
  .pos { font-size: 0.8rem; font-weight: 600; }
  .cell {
    position: relative;
    display: grid;
    gap: 0.2rem;
    padding: 0.5rem 0.6rem 0.5rem 0.75rem;
    border: 1px solid var(--line);
    border-left: 4px solid var(--el);
    border-radius: var(--radius-s);
    min-height: 6.2rem;
    align-content: start;
  }
  .cell.support { min-height: 5.2rem; background: var(--stone); }
  .role { font-size: 0.75rem; color: var(--muted); font-weight: 600; }
  .filled, .pick {
    background: none;
    border: 0;
    padding: 0;
    text-align: left;
    cursor: pointer;
    display: grid;
    line-height: 1.25;
  }
  .filled strong { font-family: var(--font-cond); font-size: 1.05rem; }
  .title { font-size: 0.8rem; }
  .line { display: flex; flex-wrap: wrap; white-space: nowrap; gap: 0 0.5rem; align-items: center; font-size: 0.85rem; margin-top: 0.15rem; }
  .pick { color: var(--chakra); font-weight: 600; min-height: 2.5rem; }
  .clear { justify-self: start; padding-left: 0; margin-left: -0.1rem; color: var(--muted); }
  .analysis { display: grid; gap: 0.5rem; }
  .label { font-size: 0.85rem; display: block; margin-bottom: 0.3rem; }
  .bar { display: flex; gap: 3px; max-width: 320px; }
  .bar span { flex: 1; height: 10px; border-radius: 2px; }
  .bar .free { background: var(--line); }
  .warn { color: var(--danger); font-weight: 600; font-size: 0.9rem; }
  .holes { display: flex; flex-wrap: wrap; gap: 0.25rem 0.8rem; align-items: center; font-size: 0.85rem; color: var(--muted); }
  .notes textarea { min-height: 2.5rem; }

  @media (max-width: 760px) {
    .slots { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
</style>
