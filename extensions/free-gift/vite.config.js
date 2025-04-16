// vite.config.js
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  build: {
    target: 'es2020',
    lib: {
      entry: './src/run.js',
      formats: ['es'],
      fileName: () => 'function.wasm' // Force the output filename to be function.wasm
    },
    rollupOptions: {
      output: {
        entryFileNames: 'function.wasm' // Explicitly set the output filename
      }
    },
    outDir: 'dist',
    emptyOutDir: true
  },
  plugins: [wasm()]
});
