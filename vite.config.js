import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: 'assets',
  server: {
    host: true,
    port: 5173,
    open: false
  },
  build: {
    target: 'esnext'
  }
});
