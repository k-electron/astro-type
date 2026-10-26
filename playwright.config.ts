/// <reference types="node" />
import { readdirSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// BASE_URL points the tests at a deployed site (the post-deploy smoke check).
// Without it they run against the production build served by `vite preview`.
const baseURL = process.env.BASE_URL;
const previewPort = 4173;

/**
 * Whether Mesa's lavapipe (a software Vulkan driver) is installed, as CI
 * installs it. On a machine with no GPU, headless Chromium draws WebGL with its
 * own SwiftShader, which on Linux x64 is several times slower than lavapipe:
 * on CI it made each Action Deck frame take about 270 ms, which held up every
 * key press and every frame a `page.clock` test steps over. The screenshot
 * checks (`PW_SCREENSHOTS`) keep the GL their baselines were drawn with.
 */
function lavapipeInstalled(): boolean {
  if (process.platform !== 'linux' || process.env.PW_SCREENSHOTS) return false;
  try {
    return readdirSync('/usr/share/vulkan/icd.d').some((file) =>
      file.startsWith('lvp_icd'),
    );
  } catch {
    return false;
  }
}

// WebGL on lavapipe; the page itself is still composited in software, which
// measured faster on CI than compositing on lavapipe too.
const softwareVulkan = [
  '--use-angle=vulkan',
  '--enable-features=Vulkan',
  '--ignore-gpu-blocklist',
  '--disable-gpu-compositing',
];

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
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: lavapipeInstalled() ? softwareVulkan : [] },
      },
    },
  ],
  webServer: baseURL
    ? undefined
    : {
        command: `pnpm preview --port ${previewPort} --strictPort`,
        url: `http://localhost:${previewPort}`,
        reuseExistingServer: !process.env.CI,
      },
});
