/// <reference types="vitest/config" />
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// `base: './'` makes the build work on GitHub Pages whatever the repository name is.
export default defineConfig({
  base: './',
  plugins: [svelte()],
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
})
