/// <reference types="node" />
import { readdirSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// BASE_URL points the tests at a deployed site (the post-deploy smoke check).
// Without it they run against a fresh production build served by `vite preview`
// (see webServer below), on a port of their own: not Vite's default 4173, which
// a leftover `vite preview` could be holding.
const baseURL = process.env.BASE_URL;
const previewPort = 4318;

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
  // A test gives the same result on any machine, idle or busy: a busy one only
  // takes longer. So nothing else waits with a limit of its own: an assertion,
  // a poll or a `toPass` waits until the page is right (0 is no limit), and
  // an action already waits until it can act. The test timeout is the one
  // hang guard, far above any test's time on a busy machine; a test that
  // reaches it has a page that never got there. (The Action Deck is drawn
  // with WebGL, in software with no GPU, and a stopped clock's frames are all
  // drawn when it moves, so a test can take minutes under load.)
  timeout: 10 * 60_000,
  expect: { timeout: 0 },
  // The same number of browsers here and on CI's runner (4 vCPUs, where
  // Playwright's default of half the cores was 2 already), so a test meets
  // the same competition for the CPU in both places.
  workers: 2,
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
      // The local-only suite (tests/browser/local) has a project of its own.
      testIgnore: /\.local\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: lavapipeInstalled() ? softwareVulkan : [] },
      },
    },
    // The local-only suite: real-browser tests too heavy for CI's runner, run
    // by `pnpm verify`. The project does not exist when CI is set, and each
    // file skips itself there too.
    ...(process.env.CI
      ? []
      : [
          {
            name: 'local',
            testMatch: /\.local\.spec\.ts$/,
            use: {
              ...devices['Desktop Chrome'],
              viewport: { width: 1280, height: 1200 },
              launchOptions: {
                args: lavapipeInstalled() ? softwareVulkan : [],
              },
            },
          },
        ]),
  ],
  webServer: baseURL
    ? undefined
    : {
        // Every run builds and serves fresh, so no test can run against a stale
        // dist/ or someone else's server: the one build `pnpm verify` does is
        // this one. A taken port fails the run (--strictPort,
        // reuseExistingServer: false) instead of testing whatever answers there.
        command: `pnpm build && pnpm exec vite preview --port ${previewPort} --strictPort`,
        url: `http://localhost:${previewPort}`,
        reuseExistingServer: false,
        // The build and the server start; the CI runner is slow.
        timeout: 180_000,
      },
});
