<script lang="ts">
  import { untrack } from 'svelte';
  import { prefs, t } from '../lib/i18n.svelte';
  import { resourceName, slugify } from '../lib/planning';
  import { catalog, elements, limits, templates } from '../lib/store.svelte';
  import type { MaterialCost, NinjaDef } from '../lib/types';

  let { ninja, onsave, oncancel }: { ninja: NinjaDef; onsave: (n: NinjaDef) => void; oncancel: () => void } = $props();

  // Local editable copy taken once; the parent remounts this form ({#key}) for another ninja.
  // Nothing touches the store until "Save".
  const initial = untrack(() => $state.snapshot(ninja) as NinjaDef);
  let draft = $state(structuredClone(initial));
  let tags = $state((initial.tags ?? []).join(', '));
  const templateNames = Object.keys(templates);
  let useTemplate = $state(initial.awakening.length === 0 && !!initial.awakeningTemplate && initial.awakeningTemplate in templates);
  let hasBlazing = $state(!!initial.blazingAwakening);
  let blazing = $state<MaterialCost[]>(structuredClone(initial.blazingAwakening ?? []));
  const isNew = !initial.id;

  const stepRange = $derived(
    Array.from({ length: Math.max(0, draft.maxStars - draft.minStars) }, (_, i) => draft.minStars + i),
  );

  // Make sure every star step in range has an entry to edit.
  $effect(() => {
    if (useTemplate) return;
    for (const from of stepRange) {
      if (!draft.awakening.some((s) => s.fromStars === from)) draft.awakening.push({ fromStars: from, materials: [] });
    }
  });

  const cleanList = (list: MaterialCost[]) => list.filter((m) => m.resourceId && m.qty > 0);

  function submit(e: SubmitEvent) {
    e.preventDefault();
    const snap = $state.snapshot(draft) as NinjaDef;
    const result: NinjaDef = {
      ...snap,
      id: snap.id || slugify(`${snap.name} ${snap.title}`),
      maxStars: Math.max(snap.minStars, snap.maxStars),
      tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
      awakening: useTemplate
        ? []
        : snap.awakening
            .filter((s) => s.fromStars >= snap.minStars && s.fromStars < snap.maxStars)
            .map((s) => ({ ...s, materials: cleanList(s.materials) }))
            .filter((s) => s.materials.length > 0)
            .sort((a, b) => a.fromStars - b.fromStars),
      awakeningTemplate: useTemplate ? templateNames[0] : undefined,
      blazingAwakening: hasBlazing ? cleanList($state.snapshot(blazing) as MaterialCost[]) : undefined,
      maxLevel: snap.maxLevel && snap.maxLevel > 0 ? snap.maxLevel : undefined,
      limitBreak: snap.limitBreak || undefined,
    };
    onsave(result);
  }
</script>

{#snippet materialList(list: MaterialCost[])}
  {#each list as m, i (i)}
    <div class="mat">
      <select bind:value={m.resourceId} aria-label={t('form.resource')}>
        {#each catalog.resources as r (r.id)}<option value={r.id}>{resourceName(r, r.id, prefs.lang)}</option>{/each}
      </select>
      <input type="number" min="1" bind:value={m.qty} aria-label={t('form.qty')} />
      <button class="btn ghost small danger" type="button" onclick={() => list.splice(i, 1)}>{t('common.delete')}</button>
    </div>
  {/each}
  <button class="btn small" type="button" onclick={() => list.push({ resourceId: catalog.resources[0]?.id ?? '', qty: 1 })}>{t('goals.addExtra')}</button>
{/snippet}

<form class="form" onsubmit={submit}>
  <div class="cols">
    <label class="field"><span>{t('form.name')}</span><input type="text" required bind:value={draft.name} /></label>
    <label class="field"><span>{t('form.title')}</span><input type="text" bind:value={draft.title} /></label>
    <label class="field"><span>{t('form.element')}</span>
      <select bind:value={draft.element}>
        {#each elements as el (el.id)}<option value={el.id}>{t(`element.${el.id}`)}</option>{/each}
      </select>
    </label>
    <label class="field"><span>{t('form.tags')}</span><input type="text" bind:value={tags} /></label>
    <label class="field"><span>{t('form.minStars')}</span>
      <input type="number" min="1" max={limits.maxStars} bind:value={draft.minStars} /></label>
    <label class="field"><span>{t('form.maxStars')}</span>
      <input type="number" min={draft.minStars} max={limits.maxStars} bind:value={draft.maxStars} /></label>
    <label class="field"><span>{t('form.maxLevel')}</span>
      <input type="number" min="1" max={limits.maxLevel} placeholder={String(limits.maxLevel)} bind:value={draft.maxLevel} /></label>
    <label class="check pad"><input type="checkbox" bind:checked={draft.limitBreak} /> {t('form.limitBreak')}</label>
  </div>
  {#if isNew}<p class="muted small">ID : {slugify(`${draft.name} ${draft.title}`) || '—'}</p>{/if}
  <label class="check"><input type="checkbox" bind:checked={draft.verified} /> {t('form.verified')}</label>

  <fieldset>
    <legend>{t('form.awakening')}</legend>
    {#if templateNames.length > 0}
      <label class="check"><input type="checkbox" bind:checked={useTemplate} /> {t('form.useTemplate')}</label>
    {/if}
    {#if !useTemplate}
      {#each stepRange as from (from)}
        {@const step = draft.awakening.find((s) => s.fromStars === from)}
        {#if step}
          <div class="step">
            <strong>{t('form.step', { from, to: from + 1 })}</strong>
            {@render materialList(step.materials)}
          </div>
        {/if}
      {/each}
    {/if}
    <div class="step">
      <label class="check"><input type="checkbox" bind:checked={hasBlazing} /> {t('form.hasBlazing')}</label>
      {#if hasBlazing}
        <strong>{t('form.blazing', { stars: draft.maxStars })}</strong>
        {@render materialList(blazing)}
      {/if}
    </div>
  </fieldset>

  <div class="actions">
    <button class="btn" type="button" onclick={oncancel}>{t('common.cancel')}</button>
    <button class="btn primary" type="submit">{t('common.save')}</button>
  </div>
</form>

<style>
  .form { display: grid; gap: 0.9rem; }
  .cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
  .check { display: inline-flex; align-items: center; gap: 0.4rem; }
  .pad { align-self: end; min-height: 2.25rem; }
  .small { font-size: 0.85rem; }
  fieldset { border: 1px solid var(--line); border-radius: var(--radius-s); padding: 0.75rem; display: grid; gap: 0.75rem; margin: 0; }
  legend { font-weight: 600; padding: 0 0.3rem; }
  .step { display: grid; gap: 0.4rem; justify-items: start; padding-top: 0.5rem; border-top: 1px solid var(--line); }
  .mat { display: grid; grid-template-columns: minmax(0, 1fr) 6rem auto; gap: 0.4rem; width: 100%; }
  .actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
  @media (max-width: 520px) { .cols { grid-template-columns: 1fr; } }
</style>
