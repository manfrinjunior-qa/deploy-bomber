import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5173, host: true, open: true },
  build: { chunkSizeWarningLimit: 2000 },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
} as any);
