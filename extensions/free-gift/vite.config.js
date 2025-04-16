// vite.config.js
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  build: {
    target: 'es2020',
    lib: {
      entry: './src/run.js',
      formats: ['es'],
      fileName: 'function'
    },
    rollupOptions: {
      output: {
        entryFileNames: `[name].wasm`
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  },
  plugins: [wasm()]
});
