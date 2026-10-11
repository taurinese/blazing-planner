<script lang="ts">
  import ElementTag from '../components/ElementTag.svelte';
  import NinjaPicker from '../components/NinjaPicker.svelte';
  import NinjaIcon from '../components/NinjaIcon.svelte';
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
                {@const size = role === 'main' ? 80 : 52}
                {@const roleLabel = t(role === 'main' ? 'teams.main' : 'teams.support')}
                <div class="cell {role}">
                  {#if d}
                    <button type="button" class="filled" onclick={() => choose(team, i, role)}
                      aria-label="{roleLabel} : {d.n.name} {d.n.title}, {d.o.stars}★, Lv {d.o.level}">
                      <span class="art">
                        <NinjaIcon ninja={d.n} stars={d.o.stars} blazing={d.o.blazingAwakened && !!d.n.blazingAwakening} {size} dim={d.o.planned} />
                        <span class="lv num">Lv {d.o.level}</span>
                      </span>
                      <span class="nm">{d.n.name}</span>
                      {#if role === 'main'}<span class="tt">{d.n.title}</span>{/if}
                    </button>
                    <button type="button" class="clear" onclick={() => (slot[role] = null)} aria-label="{t('teams.clear')} {d.n.name}" title={t('teams.clear')}>×</button>
                  {:else}
                    <button type="button" class="pick" style:--size="{size}px" onclick={() => choose(team, i, role)} aria-label="{roleLabel} : {t('teams.pick')}">
                      <span class="plus" aria-hidden="true">+</span>
                    </button>
                    <span class="role">{roleLabel}</span>
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
  .slot {
    display: grid;
    gap: 0.5rem;
    align-content: start;
    justify-items: center;
    padding: 0.6rem 0.4rem 0.75rem;
    border-radius: var(--radius-m);
    background: var(--stone);
  }
  .pos { font-size: 0.75rem; font-weight: 600; }
  .cell { position: relative; display: grid; justify-items: center; gap: 0.1rem; width: 100%; }
  .cell.support { padding-top: 0.5rem; border-top: 1px dashed var(--line-strong); }
  .role { font-size: 0.72rem; color: var(--muted); font-weight: 600; }
  .filled {
    display: grid;
    justify-items: center;
    gap: 0.1rem;
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    text-align: center;
    max-width: 100%;
  }
  .art { position: relative; margin-bottom: 0.45rem; }
  .lv {
    position: absolute;
    left: 50%;
    bottom: -8px;
    transform: translateX(-50%);
    padding: 0 0.35rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 700;
    background: var(--ink);
    color: var(--paper);
    white-space: nowrap;
  }
  .nm { font-family: var(--font-cond); font-weight: 700; font-size: 0.98rem; line-height: 1.1; }
  .support .nm { font-size: 0.85rem; }
  .tt { font-size: 0.74rem; color: var(--muted); line-height: 1.15; }
  .clear {
    position: absolute;
    top: -6px;
    right: calc(50% - 52px);
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 0;
    background: var(--paper);
    box-shadow: 0 0 0 1px var(--line-strong);
    color: var(--muted);
    font-weight: 700;
    cursor: pointer;
    line-height: 1;
  }
  .support .clear { right: calc(50% - 38px); top: 2px; }
  .clear:hover { color: var(--danger); }
  .pick {
    width: var(--size);
    height: var(--size);
    display: grid;
    place-items: center;
    border: 2px dashed var(--line-strong);
    border-radius: calc(var(--size) * 0.16);
    background: var(--paper);
    color: var(--chakra);
    cursor: pointer;
  }
  .pick:hover { border-color: var(--chakra); background: var(--chakra-soft); }
  .plus { font-size: 1.6rem; font-weight: 700; line-height: 1; }
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
