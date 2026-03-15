import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/pdf-kit/',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3001,
    open: true,
  },
});
