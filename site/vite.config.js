import { defineConfig } from 'vite';
import { resolve } from 'path';

const root = import.meta.dirname;

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        airlock: resolve(root, 'mvp-airlock.html'),
        ledger: resolve(root, 'mvp-ledger.html'),
        conformance: resolve(root, 'conformance.html'),
        leakhunter: resolve(root, 'leakhunter.html'),
        deploy: resolve(root, 'deploy.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
});
