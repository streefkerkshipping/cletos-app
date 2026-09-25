import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:4173', viewport: { width: 390, height: 844 }, ...devices['iPhone 14'], browserName: 'chromium' },
  webServer: { command: 'node tests/dev-server.mjs', url: 'http://127.0.0.1:4173/mock/status', reuseExistingServer: false, env: { KRING_OPSLAG: 'mock', KRING_NU: '2026-09-24T12:00:00+02:00' } },
});
