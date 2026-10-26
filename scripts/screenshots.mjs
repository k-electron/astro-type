// Runs the screenshot checks (tests/browser/screenshots.spec.ts) in the
// official Playwright Docker image, the one place their pictures are compared.
//
//   pnpm screenshots           compare against the baselines (what CI runs)
//   pnpm screenshots:update    redraw the baselines on purpose, then commit them
//
// Pixels depend on the OS, its fonts and the GL backend, so the baselines are
// made for one environment: `mcr.microsoft.com/playwright:v<version>-noble`,
// where <version> is the installed @playwright/test, always as linux/amd64 (the
// platform CI runs on, so an Apple Silicon laptop draws the same pictures).
//
// The checks run in a clean copy of the working tree (tracked and untracked
// files, no node_modules, no dist) with a fresh `pnpm install` and a fresh
// build, using Node from .node-version and pnpm from `packageManager`. Nothing
// from the host's node_modules ever goes in.
//
// Results come out in ./screenshot-results (never in ./test-results): for a
// failing comparison, the expected, actual and diff images are under
// screenshot-results/test-results, and the report in screenshot-results/playwright-report.
//
// A Playwright upgrade (a Dependabot bump) changes both the image and the
// browser in it, which invalidates every baseline. The baselines carry the
// Playwright version they were made with, and this script stops with a clear
// message when it doesn't match, instead of showing a wall of image diffs.

import { spawn, spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const update = process.argv.includes('--update');
const baselines = join(root, 'tests/browser/screenshots.spec.ts-snapshots');
const stamp = join(baselines, 'playwright-version.txt');
const results = join(root, 'screenshot-results');

const fail = (message) => {
  console.error(`\nscreenshots: ${message}\n`);
  process.exit(1);
};

const readJson = (file) => JSON.parse(readFileSync(join(root, file), 'utf8'));

/** The exact @playwright/test the repo installs: it names the image. */
function playwrightVersion() {
  const installed = join(root, 'node_modules/@playwright/test/package.json');
  if (existsSync(installed))
    return JSON.parse(readFileSync(installed, 'utf8')).version;
  const range = readJson('package.json').devDependencies['@playwright/test'];
  return range.replace(/^[^0-9]*/, '');
}

const version = playwrightVersion();
const nodeVersion = readFileSync(join(root, '.node-version'), 'utf8').trim();
const pnpmVersion =
  readJson('package.json').packageManager.match(/^pnpm@([^+]+)/)?.[1];
if (!pnpmVersion) fail('package.json has no "packageManager": "pnpm@x.y.z".');
const image = `mcr.microsoft.com/playwright:v${version}-noble`;

if (!update) {
  const made = existsSync(stamp) ? readFileSync(stamp, 'utf8').trim() : null;
  if (made !== version) {
    fail(
      made
        ? `The baselines were made with Playwright ${made}, and this is Playwright ${version}.\n` +
            'A new Playwright draws slightly different pictures, so run `pnpm screenshots:update`,\n' +
            'look at the new baselines, and commit them with the upgrade.'
        : 'There are no baselines yet. Run `pnpm screenshots:update` and commit the pictures.',
    );
  }
}

if (spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0) {
  fail(
    'Docker is not running. The screenshot checks run in the Playwright Docker image.',
  );
}

// What goes into the container: every tracked or untracked-but-not-ignored
// file that exists on disk (so uncommitted edits are checked, and deleted
// files are not).
const listed = spawnSync(
  'git',
  ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
  {
    cwd: root,
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
  },
);
if (listed.status !== 0) fail('git ls-files failed.');
const files = [
  ...new Set(listed.stdout.toString('utf8').split('\0').filter(Boolean)),
].filter((file) => existsSync(join(root, file)));
const scratch = mkdtempSync(join(tmpdir(), 'screenshots-'));
writeFileSync(join(scratch, 'files.txt'), `${files.join('\n')}\n`);

rmSync(results, { recursive: true, force: true });
mkdirSync(results, { recursive: true });

// Runs inside the container, as root, in /work.
const inside = `
set -eu
mkdir -p /work && cd /work && tar -xf - --exclude='._*'
curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz" | tar -xz -C /opt
export PATH="/opt/node-v$NODE_VERSION-linux-x64/bin:$PATH"
npm install --global --silent "pnpm@$PNPM_VERSION"
echo "[$(date +%T)] installing"
pnpm install --frozen-lockfile
echo "in the container: node $(node -v), pnpm $(pnpm -v), $(pnpm exec playwright --version)"
echo "[$(date +%T)] building"
pnpm build
echo "[$(date +%T)] running the checks"
status=0
if [ "$UPDATE" = 1 ]; then
  pnpm exec playwright test screenshots --update-snapshots=all || status=$?
else
  pnpm exec playwright test screenshots || status=$?
fi
cp -R test-results playwright-report /out/ 2>/dev/null || true
if [ "$UPDATE" = 1 ] && [ -d tests/browser/screenshots.spec.ts-snapshots ]; then cp -R tests/browser/screenshots.spec.ts-snapshots /out/; fi
exit $status
`;

console.log(
  `screenshots: ${update ? 'updating baselines' : 'comparing'} in ${image} (linux/amd64), Node ${nodeVersion}, pnpm ${pnpmVersion}`,
);

const tar = spawn('tar', ['-cf', '-', '-T', join(scratch, 'files.txt')], {
  cwd: root,
  stdio: ['ignore', 'pipe', 'inherit'],
  // macOS's tar would add `._name` files for extended attributes.
  env: { ...process.env, COPYFILE_DISABLE: '1' },
});
const docker = spawn(
  'docker',
  [
    'run',
    '--rm',
    '-i',
    '--init',
    '--ipc=host',
    '--platform=linux/amd64',
    '-e',
    'CI=1',
    '-e',
    'PW_SCREENSHOTS=1',
    '-e',
    `NODE_VERSION=${nodeVersion}`,
    '-e',
    `PNPM_VERSION=${pnpmVersion}`,
    '-e',
    `UPDATE=${update ? 1 : 0}`,
    '-v',
    `${results}:/out`,
    image,
    'sh',
    '-c',
    inside,
  ],
  { stdio: ['pipe', 'inherit', 'inherit'] },
);
tar.stdout.pipe(docker.stdin);
docker.stdin.on('error', () => {});

docker.on('exit', (code) => {
  rmSync(scratch, { recursive: true, force: true });
  if (update) {
    const made = join(results, 'screenshots.spec.ts-snapshots');
    if (code === 0 && existsSync(made)) {
      rmSync(baselines, { recursive: true, force: true });
      cpSync(made, baselines, { recursive: true });
      writeFileSync(stamp, `${version}\n`);
      rmSync(made, { recursive: true, force: true });
      console.log(
        `\nscreenshots: baselines updated in tests/browser/screenshots.spec.ts-snapshots (Playwright ${version}). Look at them, then commit.`,
      );
    } else {
      fail('The update did not finish; the baselines are unchanged.');
    }
  } else if (code !== 0) {
    console.error(
      '\nscreenshots: a picture changed. For each, screenshot-results/test-results has the\n' +
        'expected (before), actual (after) and diff images; the report is in\n' +
        'screenshot-results/playwright-report. If the change is on purpose, run\n' +
        '`pnpm screenshots:update` and commit the new baselines.',
    );
  }
  process.exit(code ?? 1);
});
