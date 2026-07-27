import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Em produção no GitHub Pages o site vive em /<repo>/; localmente fica na raiz.
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        crm: resolve(__dirname, 'crm/index.html'),
      },
    },
  },
});
