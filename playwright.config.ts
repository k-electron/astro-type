/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

// BASE_URL points the tests at a deployed site (the post-deploy smoke check).
// Without it they run against the production build served by `vite preview`.
const baseURL = process.env.BASE_URL;
const previewPort = 4173;

export default defineConfig({
  testDir: 'tests/browser',
  forbidOnly: Boolean(process.env.CI),
  // A flaky test is a bug: fix it or delete it, never retry it.
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: baseURL ?? `http://localhost:${previewPort}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: baseURL
    ? undefined
    : {
        command: `pnpm preview --port ${previewPort} --strictPort`,
        url: `http://localhost:${previewPort}`,
        reuseExistingServer: !process.env.CI,
      },
});
