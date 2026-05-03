import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.BASE_PATH || '/',
  server: { port: 5173, open: true },
  build: { target: 'es2020' }
});
