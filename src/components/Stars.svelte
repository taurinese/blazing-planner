<script lang="ts">
  import { t } from '../lib/i18n.svelte';

  let {
    value = $bindable(),
    min = 1,
    max = 6,
    editable = false,
  }: { value: number; min?: number; max?: number; editable?: boolean } = $props();
</script>

{#if editable}
  <div class="stars" role="radiogroup" aria-label={t('common.stars')}>
    {#each Array.from({ length: max }, (_, i) => i + 1) as n (n)}
      <button
        type="button"
        role="radio"
        aria-checked={value === n}
        aria-label="{n}★"
        class="star"
        class:on={n <= value}
        disabled={n < min}
        onclick={() => (value = n)}>★</button
      >
    {/each}
  </div>
{:else}
  <span class="stars" aria-label="{value}/{max}★">
    {#each Array.from({ length: max }, (_, i) => i + 1) as n (n)}
      <span class="star" class:on={n <= value} aria-hidden="true">★</span>
    {/each}
  </span>
{/if}

<style>
  .stars { display: inline-flex; gap: 1px; line-height: 1; }
  .star {
    color: var(--line-strong);
    font-size: 1rem;
    background: none;
    border: 0;
    padding: 0;
  }
  button.star { font-size: 1.35rem; cursor: pointer; padding: 0 1px; }
  button.star:disabled { opacity: 0.35; cursor: not-allowed; }
  .star.on { color: #e5a50a; }
</style>
