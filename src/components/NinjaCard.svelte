<script lang="ts">
  import type { Snippet } from 'svelte';
  import { initials, ninjaCard, wikiImageUrl } from '../lib/images';
  import type { NinjaDef } from '../lib/types';

  // A ninja card in the spirit of the game's unit list: framed art, stars over the art,
  // level pill, short name underneath. `badges` renders in the top corners.
  let {
    ninja,
    stars,
    blazing = false,
    level,
    size = 96,
    dim = false,
    showName = true,
    showTitle = false,
    badges,
  }: {
    ninja: NinjaDef | undefined;
    stars?: number;
    blazing?: boolean;
    level?: number;
    size?: number;
    dim?: boolean;
    showName?: boolean;
    showTitle?: boolean;
    badges?: Snippet;
  } = $props();

  const shownStars = $derived(stars ?? ninja?.maxStars ?? 0);
  const ba = $derived(blazing && !!ninja?.blazingAwakening);
  const src = $derived(wikiImageUrl(ninjaCard(ninja, shownStars, ba), size));
  let failedSrc = $state<string | undefined>();
  let loadedSrc = $state<string | undefined>();
  const showImage = $derived(!!src && failedSrc !== src);
</script>

<span class="card" class:dim class:ba style:--size="{size}px" style:--el={ninja ? `var(--${ninja.element})` : 'var(--line-strong)'}>
  <span class="frame">
    <span class="fallback" class:hidden={loadedSrc === src && showImage} aria-hidden="true">{ninja ? initials(ninja.name) : '?'}</span>
    {#if showImage}
      <img {src} alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onload={() => (loadedSrc = src)} onerror={() => (failedSrc = src)} />
    {/if}
    <span class="gem" aria-hidden="true"></span>
    {#if shownStars > 0}
      <span class="stars" aria-label="{shownStars}★">{'★'.repeat(shownStars)}</span>
    {/if}
    {#if badges}<span class="badges">{@render badges()}</span>{/if}
  </span>
  {#if level !== undefined}<span class="lv">Lv {level}</span>{/if}
  {#if showName && ninja}
    <span class="name" title="{ninja.name} · {ninja.title}">{ninja.name}</span>
    {#if showTitle}<span class="title" title={ninja.title}>{ninja.title}</span>{/if}
  {/if}
</span>

<style>
  .card {
    display: inline-grid;
    justify-items: center;
    width: var(--size);
    max-width: 100%;
    gap: 0.15rem;
  }
  .frame {
    position: relative;
    display: grid;
    place-items: center;
    width: var(--size);
    aspect-ratio: 1;
    border-radius: calc(var(--size) * 0.1);
    overflow: hidden;
    background:
      radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--el) 35%, transparent), transparent 70%),
      color-mix(in srgb, var(--el) 18%, #141824);
    box-shadow: inset 0 0 0 calc(var(--size) * 0.035) var(--el), 0 1px 3px rgb(0 0 0 / 0.25);
  }
  .ba .frame {
    box-shadow: inset 0 0 0 calc(var(--size) * 0.035) #e5a50a, 0 0 0 2px var(--el), 0 0 10px rgb(229 165 10 / 0.55);
  }
  img {
    position: absolute;
    inset: calc(var(--size) * 0.035);
    width: calc(100% - var(--size) * 0.07);
    height: calc(100% - var(--size) * 0.07);
    object-fit: cover;
    border-radius: calc(var(--size) * 0.07);
  }
  .fallback {
    font-family: var(--font-cond);
    font-weight: 700;
    font-size: calc(var(--size) * 0.34);
    color: color-mix(in srgb, var(--el) 70%, white);
  }
  /* Element gem, top-left, as on the game's cards. */
  .gem {
    position: absolute;
    top: calc(var(--size) * 0.07);
    left: calc(var(--size) * 0.07);
    width: calc(var(--size) * 0.14);
    height: calc(var(--size) * 0.14);
    transform: rotate(45deg);
    border-radius: 2px;
    background: var(--el);
    box-shadow: 0 0 0 1.5px rgb(255 255 255 / 0.85);
  }
  .stars {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: calc(var(--size) * 0.12) 0 calc(var(--size) * 0.05);
    background: linear-gradient(transparent, rgb(0 0 0 / 0.75));
    color: #ffc93c;
    font-size: max(9px, calc(var(--size) * 0.115));
    letter-spacing: -0.05em;
    line-height: 1;
    text-align: center;
    text-shadow: 0 1px 1px rgb(0 0 0 / 0.8);
  }
  .badges {
    position: absolute;
    top: calc(var(--size) * 0.05);
    right: calc(var(--size) * 0.05);
    display: flex;
    gap: 2px;
  }
  .lv {
    margin-top: calc(var(--size) * -0.09);
    position: relative;
    padding: 0 0.4rem;
    border-radius: 999px;
    font-size: max(10px, calc(var(--size) * 0.11));
    font-weight: 700;
    line-height: 1.5;
    background: var(--ink);
    color: var(--paper);
    white-space: nowrap;
  }
  .name, .title {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
  }
  .name { font-family: var(--font-cond); font-weight: 700; font-size: max(0.78rem, calc(var(--size) * 0.14)); line-height: 1.15; }
  .title { font-size: 0.72rem; color: var(--muted); line-height: 1.15; margin-top: -0.1rem; }
  .dim img, .dim .fallback { filter: grayscale(1); opacity: 0.5; }
  .dim .frame { box-shadow: inset 0 0 0 calc(var(--size) * 0.035) var(--line-strong); }
  .fallback.hidden { visibility: hidden; }
</style>
