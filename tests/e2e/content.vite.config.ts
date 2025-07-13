import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [svelte()],
  build: {
    rollupOptions: {
      input: {
        background: resolve(process.cwd(), 'src/background/background.ts'),
        content: resolve(process.cwd(), 'src/content/content.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === 'background') return 'background/background.js';
          if (chunkInfo.name === 'content') return 'content/index.js';
          return '[name].js';
        },
        dir: 'public',
        format: 'iife',
      },
    },
    outDir: 'public',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
  },
});