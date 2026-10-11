<script lang="ts">
  import { initials, wikiImageUrl } from '../lib/images';
  import type { ResourceDef } from '../lib/types';

  let { resource, size = 36 }: { resource: ResourceDef | undefined; size?: number } = $props();

  const src = $derived(wikiImageUrl(resource?.image, size));
  let failedSrc = $state<string | undefined>();
  const showImage = $derived(!!src && failedSrc !== src);
  const label = $derived(resource?.name.en ?? '?');
</script>

<span
  class="icon"
  style:--size="{size}px"
  style:--el={resource?.element ? `var(--${resource.element})` : 'var(--muted)'}
  aria-hidden="true"
>
  <!-- Initials sit underneath: visible while the image loads or if it never does. -->
  <span class="fallback">{initials(label)}</span>
  {#if showImage}
    <img {src} alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" width={size} height={size} onerror={() => (failedSrc = src)} />
  {/if}
</span>

<style>
  .icon {
    position: relative;
    display: inline-grid;
    place-items: center;
    flex: none;
    width: var(--size);
    height: var(--size);
    border-radius: calc(var(--size) * 0.18);
    background: color-mix(in srgb, var(--el) 16%, var(--paper));
    overflow: hidden;
  }
  img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  .fallback { font-family: var(--font-cond); font-weight: 700; font-size: calc(var(--size) * 0.36); color: var(--el); }
</style>
