/// <reference types="node" />
import { readFile } from 'node:fs/promises';
import { expect, type Page, test } from '@playwright/test';

// A Backup is the Profile exported to a file and imported again (ticket #25).
// Export and import live in the Analytics screen, under "Offline LocalStorage
// Storage". These journeys start from a returning player's Save, then export,
// wipe and import through the screen the way a player would.

const SAVE_KEY = 'astrotype_profile_v1';

/** A returning player's Stage progress: Stage 1 with 3 Stars, Stage 2 with 2. */
const progress = (stageId: string, starsEarned: number) => ({
  stageId,
  completed: true,
  starsEarned,
  highScore: 22150,
  bestWpm: 31,
  bestAccuracy: 100,
  bestStreak: 40,
  timesPlayed: 2,
  lastPlayedAt: 1792904921385,
});

/** 5 Stars in all, and 1,234 Credits. Fields left out take their defaults. */
const returningPlayer = {
  totalCredits: 1234,
  stagesProgress: {
    's1-l1': progress('s1-l1', 3),
    's1-l2': progress('s1-l2', 2),
  },
};

/** Puts the Save in localStorage before the game loads, once. */
async function seedSave(page: Page, save: unknown) {
  await page.addInitScript(
    ({ key, value }) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', 'yes');
      localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: JSON.stringify(save) },
  );
}

const stars = (page: Page, count: number) =>
  page.getByRole('button', { name: `${count} ★`, exact: true });

const credits = (page: Page, text: string) =>
  page.getByRole('button', { name: `${text} Cr`, exact: true });

/** The short message a refused Backup leaves near the import control. */
const refusal = (page: Page) =>
  page.getByRole('alert').or(page.getByRole('status'));

/** The file chooser behind the "Import Backup" label. */
const importControl = (page: Page) =>
  page.getByLabel('Import Backup', { exact: true });

async function openAnalytics(page: Page) {
  await page.getByRole('button', { name: 'Analytics', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Typing Analytics & Heatmap' }),
  ).toBeVisible();
}

/** Closes Analytics and opens the Galaxy Map; the Sector shows its Stars. */
async function expectFiveStarsOnGalaxyMap(page: Page) {
  await page.getByRole('button', { name: 'Back to Academy' }).click();
  await page.getByRole('button', { name: 'Sectors', exact: true }).click();
  await expect(page.getByRole('button', { name: /Orion Belt/ })).toContainText(
    '5/12',
  );
}

test('an exported Backup restores the Stars after the progress is wiped', async ({
  page,
}) => {
  await seedSave(page, returningPlayer);
  await page.goto('/');
  await expect(stars(page, 5)).toBeVisible();
  await openAnalytics(page);

  // Export: the Backup downloads as a file that says which version it is.
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Backup' }).click();
  const backupPath = await (await download).path();
  const backup = JSON.parse(await readFile(backupPath, 'utf8'));
  expect(backup.version).toBe(1);

  // Wipe everything.
  await page.getByRole('button', { name: 'Factory Reset' }).click();
  await page.getByRole('button', { name: 'Confirm Reset' }).click();
  await expect(stars(page, 0)).toBeVisible();
  await expect(credits(page, '0')).toBeVisible();

  // Import the Backup: the Profile is back.
  await importControl(page).setInputFiles(backupPath);
  await expect(stars(page, 5)).toBeVisible();
  await expect(credits(page, '1,234')).toBeVisible();
  await expect(refusal(page)).toHaveCount(0);
  await expectFiveStarsOnGalaxyMap(page);
});

const BAD_BACKUPS: Array<[string, string]> = [
  ['a file that is not JSON', 'this is not a Backup at all'],
  [
    'a field of the wrong kind',
    JSON.stringify({ version: 1, ...returningPlayer, totalCredits: 'lots' }),
  ],
  [
    'a version the game does not know',
    JSON.stringify({ ...returningPlayer, version: 2 }),
  ],
];

for (const [what, contents] of BAD_BACKUPS) {
  test(`importing ${what} is refused with a message, and the Profile is unchanged`, async ({
    page,
  }) => {
    await seedSave(page, returningPlayer);
    await page.goto('/');
    await expect(stars(page, 5)).toBeVisible();
    await openAnalytics(page);
    await expect(refusal(page)).toHaveCount(0);

    await importControl(page).setInputFiles({
      name: 'astrotype_backup.json',
      mimeType: 'application/json',
      buffer: Buffer.from(contents),
    });

    // A short message says the file was refused.
    await expect(refusal(page)).toBeVisible();
    await expect(refusal(page)).toHaveText(/\S/);

    // Nothing of the Profile changed.
    await expect(stars(page, 5)).toBeVisible();
    await expect(credits(page, '1,234')).toBeVisible();
    await expectFiveStarsOnGalaxyMap(page);
  });
}

// ---------------------------------------------------------------------------
// A Backup with no version. Backups exported before versions existed have none
// and must still import; but a file with no version has to hold real Profile
// content, or a wrong file would quietly reset the Profile to its defaults.
// ---------------------------------------------------------------------------

/**
 * A Backup exactly as the live game exported it before versions existed: the
 * file from Analytics after clearing Stage 1 with 3 Stars (trimmed). No
 * `version`, and a stored `totalStars` the game now works out itself.
 */
const OLD_LIVE_EXPORT = {
  totalCredits: 491,
  totalStars: 3,
  totalKeystrokes: 77,
  totalErrors: 0,
  totalWordsTyped: 15,
  totalPracticeSeconds: 11,
  highestWpmAllTime: 82,
  stagesProgress: {
    's1-l1': {
      stageId: 's1-l1',
      completed: true,
      starsEarned: 3,
      highScore: 33275,
      bestWpm: 82,
      bestAccuracy: 100,
      bestStreak: 77,
      timesPlayed: 1,
      lastPlayedAt: 1792937667247,
    },
  },
  keyAnalytics: { f: { hits: 24, misses: 0 }, ' ': { hits: 29, misses: 0 } },
  upgrades: {
    deflectorShields: 0,
    hyperdriveReactor: 0,
    precisionSensors: 0,
    equippedTrailTheme: 'CYAN',
    equippedAudioCore: 'CYBER_SYNTH',
    unlockedThemes: ['CYAN'],
    unlockedAudioCores: ['CYBER_SYNTH'],
  },
  soundEnabled: true,
  soundVolume: 0.7,
  ambientMusicVolume: 0.25,
  highwaySpeed: 'NORMAL',
  keyboardVisible: true,
  handsVisible: true,
  musicEnabled: true,
  musicVolume: 0.4,
  beatTheme: 'NEON_SYNTHWAVE',
  globalMuted: false,
};

const REFUSAL_MESSAGE =
  /That file isn.t a Backup this game can read, so your progress was left as it was\./;

const importFile = (page: Page, contents: string) =>
  importControl(page).setInputFiles({
    name: 'astrotype_backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(contents),
  });

test('a Backup exported before versions existed still imports, and stays after a reload', async ({
  page,
}) => {
  await seedSave(page, returningPlayer);
  await page.goto('/');
  await expect(stars(page, 5)).toBeVisible();
  await openAnalytics(page);

  await importFile(page, JSON.stringify(OLD_LIVE_EXPORT));

  // The old Profile replaced this one: its 3 Stars and 491 Credits.
  await expect(stars(page, 3)).toBeVisible();
  await expect(credits(page, '491')).toBeVisible();
  await expect(refusal(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to Academy' }).click();
  await page.getByRole('button', { name: 'Sectors', exact: true }).click();
  await expect(page.getByRole('button', { name: /Orion Belt/ })).toContainText(
    '3/12',
  );

  // It was saved, not just shown.
  await page.reload();
  await expect(stars(page, 3)).toBeVisible();
  await expect(credits(page, '491')).toBeVisible();
});

test('a Backup exported before versions existed imports into a fresh Profile', async ({
  page,
}) => {
  await page.goto('/');
  await expect(stars(page, 0)).toBeVisible();
  await openAnalytics(page);

  await importFile(page, JSON.stringify(OLD_LIVE_EXPORT));

  await expect(stars(page, 3)).toBeVisible();
  await expect(credits(page, '491')).toBeVisible();
  await expect(refusal(page)).toHaveCount(0);
});

const NO_PROFILE_CONTENT: Array<[string, string]> = [
  ['an empty object', '{}'],
  ['an empty list', '[]'],
  ['an object with only unknown keys', '{"foo":1,"hello":"world"}'],
  [
    "some other program's JSON",
    '{"name":"my-app","private":true,"dependencies":{"react":"^19.0.0"}}',
  ],
];

for (const [what, contents] of NO_PROFILE_CONTENT) {
  test(`importing ${what} is refused: the Stars, Credits and Galaxy Map stay, even after a reload`, async ({
    page,
  }) => {
    await seedSave(page, returningPlayer);
    await page.goto('/');
    await expect(stars(page, 5)).toBeVisible();
    await openAnalytics(page);

    await importFile(page, contents);

    await expect(refusal(page)).toBeVisible();
    await expect(refusal(page)).toHaveText(REFUSAL_MESSAGE);
    await expect(stars(page, 5)).toBeVisible();
    await expect(credits(page, '1,234')).toBeVisible();
    await expectFiveStarsOnGalaxyMap(page);

    // What is kept is the saved Profile, not just what is on screen.
    await page.reload();
    await expect(stars(page, 5)).toBeVisible();
    await expect(credits(page, '1,234')).toBeVisible();
  });
}
