<script lang="ts">
  import { initials, ninjaCard, wikiImageUrl } from '../lib/images';
  import type { NinjaDef } from '../lib/types';

  let {
    ninja,
    stars,
    blazing = false,
    size = 56,
    dim = false,
  }: { ninja: NinjaDef | undefined; stars?: number; blazing?: boolean; size?: number; dim?: boolean } = $props();

  const src = $derived(wikiImageUrl(ninjaCard(ninja, stars, blazing), size));
  let failedSrc = $state<string | undefined>();
  let loadedSrc = $state<string | undefined>();
  const showImage = $derived(!!src && failedSrc !== src);
</script>

<span
  class="icon"
  class:dim
  class:ba={blazing && !!ninja?.images?.ba}
  style:--size="{size}px"
  style:--el={ninja ? `var(--${ninja.element})` : 'var(--line-strong)'}
  aria-hidden="true"
>
  <!-- Initials sit underneath: visible while the image loads or if it never does. -->
  <span class="fallback" class:hidden={loadedSrc === src && showImage}>{ninja ? initials(ninja.name) : '?'}</span>
  {#if showImage}
    <img {src} alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" width={size} height={size} onload={() => (loadedSrc = src)} onerror={() => (failedSrc = src)} />
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
    border-radius: calc(var(--size) * 0.16);
    background: color-mix(in srgb, var(--el) 22%, var(--paper));
    box-shadow: 0 0 0 2px var(--el);
    overflow: hidden;
  }
  .icon.ba { box-shadow: 0 0 0 2px var(--el), 0 0 0 4px #e5a50a; }
  img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
  .fallback {
    font-family: var(--font-cond);
    font-weight: 700;
    font-size: calc(var(--size) * 0.36);
    color: var(--el);
    letter-spacing: 0.02em;
  }
  .dim img, .dim .fallback { filter: grayscale(1); opacity: 0.55; }
  .fallback.hidden { visibility: hidden; }
</style>
