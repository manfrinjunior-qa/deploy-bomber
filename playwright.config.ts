import { defineConfig } from '@playwright/test';

// Usa o Chrome instalado no sistema (sem baixar navegadores do Playwright).
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:5174', channel: 'chrome', viewport: { width: 1280, height: 800 } },
  webServer: { command: 'npx vite --port 5174 --strictPort', url: 'http://localhost:5174', reuseExistingServer: true },
});
