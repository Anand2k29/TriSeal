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
        app: resolve(root, 'app.html'),
        airlock: resolve(root, 'mvp-airlock.html'),
        ledger: resolve(root, 'mvp-ledger.html'),
        conformance: resolve(root, 'conformance.html'),
        leakhunter: resolve(root, 'leakhunter.html'),
        deploy: resolve(root, 'deploy.html'),
        notfound: resolve(root, '404.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
});
