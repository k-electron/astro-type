/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test';

// BASE_URL points the tests at a deployed site (the post-deploy smoke check).
// Without it they run against the production build served by `vite preview`.
const baseURL = process.env.BASE_URL;
const previewPort = 4173;

export default defineConfig({
  testDir: 'tests/browser',
  // The Action Deck is drawn with WebGL, in software on a machine with no GPU,
  // and a test that moves a stopped clock draws every frame it steps over.
  timeout: 60_000,
  // The screenshot checks' baselines (tests/browser/screenshots.spec.ts-snapshots)
  // are made in CI's Playwright image and only ever written on purpose, by
  // `pnpm screenshots:update` (see scripts/screenshots.mjs).
  updateSnapshots: 'none',
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
