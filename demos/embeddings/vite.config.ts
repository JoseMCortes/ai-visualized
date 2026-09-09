import { defineConfig } from 'vite';

// `base` is '/' for local dev; the Pages workflow sets VITE_BASE to the
// project path so asset and data URLs resolve when hosted in a subdirectory.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  build: {
    outDir: 'dist',
  },
});
