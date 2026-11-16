import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 60_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173/FartoviyWeb/',
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    locale: 'en-US',
    screenshot: 'only-on-failure'
  },
  webServer: {
    command: 'node scripts/serve-dist.mjs',
    url: 'http://127.0.0.1:4173/FartoviyWeb/',
    reuseExistingServer: !process.env.CI,
    timeout: 20_000
  }
});
