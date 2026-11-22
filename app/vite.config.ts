import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact({ prerender: { enabled: false } })],
  build: {
    target: 'es2022',
    // Keep the CSP at script-src 'self': no inline preload polyfill.
    modulePreload: { polyfill: false },
    assetsInlineLimit: 0,
    sourcemap: false,
    // A few fonts (e.g. "Big Mono 12") are ~1 MB raw; they're lazy chunks, never in the main bundle.
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        // Font names contain spaces and apostrophes; keep asset URLs plain.
        chunkFileNames: (chunk) => `assets/${chunk.name.replace(/[^A-Za-z0-9_-]+/g, '_')}-[hash].js`,
      },
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
