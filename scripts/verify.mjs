// `pnpm verify`: everything CI runs, plus the local-only suite, before a push.
//
//   pnpm verify                   every layer, screenshots last
//   pnpm verify --no-screenshots  CI's checks job only: its screenshots run in
//                                 a job of their own, in parallel
//
// In order:
//   1. Docker is there (unless --no-screenshots), so a machine that can't run
//      the screenshots fails in seconds, not after the long steps.
//   2. `pnpm check`: typecheck, Biome, unit and DOM tests.
//   3. One Playwright run: the CI journeys and, off CI, the local-only suite.
//      Playwright's webServer owns the one build (playwright.config.ts), so a
//      browser test can never run against a stale dist/.
//   4. The screenshots, in Docker (scripts/screenshots.mjs), last, so they
//      don't compete with the browser tests for the CPU.
//
// Under `CI` the local suite doesn't exist (playwright.config.ts), so CI's run
// is a strict subset of a local verify.
//
// When every file the push would change is Markdown, only step 2 runs, and
// verify says so. The changed files are the commits on HEAD that origin/main
// doesn't have (after a `git fetch origin`), staged and unstaged changes, and
// untracked files that aren't ignored. Under `CI`, when nothing has changed,
// or when git can't tell (the fetch fails), every step runs.

import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const withScreenshots = !process.argv.includes('--no-screenshots');

const fail = (message) => {
  console.error(`\nverify: ${message}\n`);
  process.exit(1);
};

const run = (label, command, args) => {
  const started = Date.now();
  console.log(`\nverify: ${label}`);
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error) fail(`${label} could not start: ${result.error.message}`);
  if (result.status !== 0) {
    fail(
      `${label} failed${result.signal ? ` (${result.signal})` : ''}. Nothing after it ran.`,
    );
  }
  const seconds = Math.round((Date.now() - started) / 1000);
  console.log(`verify: ${label} passed in ${seconds}s`);
};

const check = () =>
  run('check (typecheck, Biome, unit and DOM tests)', 'pnpm', ['check']);

/**
 * Every file this push would change, or null when git can't tell. Deletions
 * and both sides of a rename count, so a code file renamed to `.md` is code.
 */
const changedFiles = () => {
  const git = (...args) => {
    const result = spawnSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    return result.status === 0 ? result.stdout : null;
  };
  if (git('fetch', '--quiet', 'origin') === null) {
    console.log('verify: `git fetch origin` failed, so every step runs');
    return null;
  }
  const base = git('merge-base', 'HEAD', 'origin/main')?.trim();
  if (!base) return null;
  // The commits (merge-base to HEAD), what isn't committed yet (HEAD to the
  // working tree, staged and unstaged), and untracked files. Each on its own:
  // a commit that a later edit undoes in the working tree is still pushed.
  const lists = [
    git('diff', '--name-only', '--no-renames', '-z', base, 'HEAD'),
    git('diff', '--name-only', '--no-renames', '-z', 'HEAD'),
    git('ls-files', '--others', '--exclude-standard', '-z'),
  ];
  if (lists.includes(null)) return null;
  return [...new Set(lists.join('\0').split('\0').filter(Boolean))];
};

const changed = process.env.CI ? null : changedFiles();
if (changed?.length && changed.every((file) => file.endsWith('.md'))) {
  console.log(
    '\nverify: only Markdown changed since origin/main, so only check runs',
  );
  check();
  console.log('\nverify: all green (check only: only Markdown changed)');
  process.exit(0);
}

if (withScreenshots) {
  // Fails early, with the screenshots script's own message, when Docker isn't
  // running or the baselines don't match the installed Playwright.
  const preflight = spawnSync(
    'node',
    ['scripts/screenshots.mjs', '--preflight'],
    { cwd: root, stdio: 'inherit' },
  );
  if (preflight.status !== 0) {
    fail(
      'the screenshot checks are part of verify and cannot run, so verify stops here.\n' +
        'Fix what is reported above (Docker must be running) and run `pnpm verify` again.',
    );
  }
}

check();
run(
  'build and browser tests (CI journeys, and the local-only suite off CI)',
  'pnpm',
  ['exec', 'playwright', 'test'],
);
if (withScreenshots) {
  run('screenshots (Docker)', 'node', ['scripts/screenshots.mjs']);
} else {
  console.log('\nverify: screenshots skipped (--no-screenshots)');
}
console.log('\nverify: all green');
