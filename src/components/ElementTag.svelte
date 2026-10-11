<script lang="ts">
  import { t } from '../lib/i18n.svelte';
  import type { ElementId } from '../lib/types';

  let { element, compact = false }: { element: ElementId; compact?: boolean } = $props();
</script>

<span class="tag" style:--el="var(--{element})" title={t(`element.${element}`)}>
  <span class="dot" aria-hidden="true"></span>
  {#if compact}<span class="sr-only">{t(`element.${element}`)}</span>{:else}{t(`element.${element}`)}{/if}
</span>

<style>
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--el);
  }
  .dot {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    background: var(--el);
    flex: none;
  }
</style>
