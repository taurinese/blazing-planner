<script lang="ts">
  import type { Snippet } from 'svelte';
  import { t } from '../lib/i18n.svelte';

  let {
    open = $bindable(false),
    title,
    children,
    footer,
    wide = false,
  }: { open: boolean; title: string; children: Snippet; footer?: Snippet; wide?: boolean } = $props();

  let dialog: HTMLDialogElement | undefined = $state();

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  });
</script>

<dialog
  bind:this={dialog}
  class:wide
  onclose={() => (open = false)}
  onclick={(e) => { if (e.target === dialog) open = false; }}
  aria-labelledby="modal-title"
>
  {#if open}
    <header>
      <h2 id="modal-title">{title}</h2>
      <button class="btn ghost small" type="button" onclick={() => (open = false)}>{t('common.close')}</button>
    </header>
    <div class="body">{@render children()}</div>
    {#if footer}<footer>{@render footer()}</footer>{/if}
  {/if}
</dialog>

<style>
  dialog {
    width: min(560px, calc(100vw - 32px));
    max-height: min(85vh, 760px);
    padding: 0;
    border: 1px solid var(--line);
    border-radius: var(--radius-m);
    background: var(--paper);
    color: var(--ink);
    box-shadow: var(--shadow-pop);
  }
  dialog.wide { width: min(820px, calc(100vw - 32px)); }
  dialog[open] { display: flex; flex-direction: column; }
  dialog::backdrop { background: rgb(13 17 27 / 0.55); }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem 0.75rem;
    border-bottom: 1px solid var(--line);
  }
  .body { padding: 1rem 1.25rem; overflow: auto; }
  footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border-top: 1px solid var(--line);
  }
</style>
