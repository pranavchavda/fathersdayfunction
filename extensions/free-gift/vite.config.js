import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: './src/run.js',
      formats: ['es'],
      fileName: 'function'
    },
    rollupOptions: {
      external: []
    },
    target: 'esnext',
    outDir: 'dist'
  }
});
