import { defineConfig } from 'vite';

// `base` is '/' for local dev and is set to '/<repo>/' by the Pages workflow
// (VITE_BASE) so asset URLs and the model fetch resolve under the project path.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  build: {
    outDir: 'dist',
  },
});
