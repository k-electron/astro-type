import { expect, type Page, test } from '@playwright/test';

// The Save is the player's Profile as stored in this browser (ticket #24).
// These journeys seed a Save the way a returning player would already have
// one, load the game, and check what the player sees.

const SAVE_KEY = 'astrotype_profile_v1';
const UNREADABLE_KEY = 'astrotype_profile_v1_unreadable';
const NOTICE =
  "Your saved progress couldn't be read, so you're starting fresh.";

/**
 * A returning player's Save in today's format (no `version`): Stage 1 cleared
 * with 3 Stars and Stage 2 with 2, so 5 Stars in all, and 1,234 Credits.
 */
function returningPlayerSave() {
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
  return {
    totalCredits: 1234,
    totalStars: 5,
    totalKeystrokes: 154,
    totalErrors: 3,
    totalWordsTyped: 30,
    totalPracticeSeconds: 120,
    highestWpmAllTime: 31,
    stagesProgress: {
      's1-l1': progress('s1-l1', 3),
      's1-l2': progress('s1-l2', 2),
    },
    keyAnalytics: {
      f: { hits: 48, misses: 1 },
      j: { hits: 48, misses: 2 },
      ' ': { hits: 58, misses: 0 },
    },
    upgrades: {
      deflectorShields: 1,
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
}

/**
 * Puts a Save in localStorage before the game loads, as if the player had
 * played here before. `save` is stored as written: an object is stored as its
 * JSON, a string is stored as is (for a Save that is not even JSON).
 * It is stored once, so a reload sees whatever the game left behind.
 */
async function seedSave(page: Page, save: unknown) {
  const stored = typeof save === 'string' ? save : JSON.stringify(save);
  await page.addInitScript(
    ({ key, value }) => {
      if (sessionStorage.getItem('seeded')) return;
      sessionStorage.setItem('seeded', 'yes');
      localStorage.setItem(key, value);
    },
    { key: SAVE_KEY, value: stored },
  );
}

const readStored = (page: Page, key: string) =>
  page.evaluate((k) => localStorage.getItem(k), key);

const stars = (page: Page, count: number) =>
  page.getByRole('button', { name: `${count} ★`, exact: true });

const credits = (page: Page, text: string) =>
  page.getByRole('button', { name: `${text} Cr`, exact: true });

const notice = (page: Page) => page.getByText(NOTICE, { exact: true });

/** Opens the Galaxy Map (the header's Sectors button). */
async function openGalaxyMap(page: Page) {
  await page.getByRole('button', { name: 'Sectors', exact: true }).click();
}

test('a returning player’s Save in today’s format loads with their Stars and Credits', async ({
  page,
}) => {
  await seedSave(page, returningPlayerSave());
  await page.goto('/');

  await expect(stars(page, 5)).toBeVisible();
  await expect(credits(page, '1,234')).toBeVisible();
  await expect(notice(page)).toHaveCount(0);

  await openGalaxyMap(page);
  await expect(page.getByRole('button', { name: /Orion Belt/ })).toContainText(
    '5/12',
  );
});

test('a Save that already says version 1 loads the same way', async ({
  page,
}) => {
  await seedSave(page, { ...returningPlayerSave(), version: 1 });
  await page.goto('/');

  await expect(stars(page, 5)).toBeVisible();
  await expect(credits(page, '1,234')).toBeVisible();
  await expect(notice(page)).toHaveCount(0);
});

test('a first visit with no Save starts fresh without a notice', async ({
  page,
}) => {
  await page.goto('/');

  await expect(stars(page, 0)).toBeVisible();
  await expect(credits(page, '0')).toBeVisible();
  await expect(notice(page)).toHaveCount(0);
  expect(await readStored(page, UNREADABLE_KEY)).toBeNull();
});

test('Stars come from the Stage progress, so a Save that claims more cannot unlock a Sector', async ({
  page,
}) => {
  await seedSave(page, { ...returningPlayerSave(), totalStars: 40 });
  await page.goto('/');

  await expect(stars(page, 5)).toBeVisible();
  await openGalaxyMap(page);
  // Sector 2 needs 6 Stars; the Save's claim of 40 does not count.
  await expect(
    page.getByRole('button', { name: /Sector 02.*Needs 6★/ }),
  ).toBeVisible();
});

type ReturningSave = ReturnType<typeof returningPlayerSave>;

const WRONG_FIELDS: Array<[string, (save: ReturningSave) => unknown]> = [
  ['Credits written as text', (save) => ({ ...save, totalCredits: 'lots' })],
  [
    'a Stage with 7 Stars',
    (save) => ({
      ...save,
      stagesProgress: {
        ...save.stagesProgress,
        's1-l1': { ...save.stagesProgress['s1-l1'], starsEarned: 7 },
      },
    }),
  ],
  [
    'a shield Upgrade past level 3',
    (save) => ({
      ...save,
      upgrades: { ...save.upgrades, deflectorShields: 4 },
    }),
  ],
  [
    'a speed setting the game does not have',
    (save) => ({ ...save, highwaySpeed: 'WARP' }),
  ],
];

for (const [what, breakIt] of WRONG_FIELDS) {
  test(`a Save with ${what} starts fresh with a notice, and the bad Save is kept`, async ({
    page,
  }) => {
    const bad = breakIt(returningPlayerSave());
    await seedSave(page, bad);
    await page.goto('/');

    // Academy Home says what happened, and the Profile is fresh.
    await expect(notice(page)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /AstroType/, level: 1 }),
    ).toBeVisible();
    await expect(stars(page, 0)).toBeVisible();
    await expect(credits(page, '0')).toBeVisible();

    // The bad Save was moved aside, not deleted.
    const keptRaw = await readStored(page, UNREADABLE_KEY);
    expect(keptRaw).not.toBeNull();
    expect(JSON.parse(keptRaw as string)).toEqual(bad);

    // The game still works from a fresh start.
    await page.getByRole('button', { name: /begin home row mission/i }).click();
    await expect(
      page.getByRole('button', { name: 'Pause', exact: true }),
    ).toBeVisible();
  });
}

test('the bad Save is still kept after the page is reloaded', async ({
  page,
}) => {
  const bad = { ...returningPlayerSave(), totalCredits: 'lots' };
  await seedSave(page, bad);
  await page.goto('/');
  await expect(notice(page)).toBeVisible();

  await page.reload();

  await expect(stars(page, 0)).toBeVisible();
  const keptRaw = await readStored(page, UNREADABLE_KEY);
  expect(keptRaw).not.toBeNull();
  expect(JSON.parse(keptRaw as string)).toEqual(bad);
});

test('a Save from a version the game does not know starts fresh the same way', async ({
  page,
}) => {
  const future = { ...returningPlayerSave(), version: 2 };
  await seedSave(page, future);
  await page.goto('/');

  await expect(notice(page)).toBeVisible();
  await expect(stars(page, 0)).toBeVisible();
  await expect(credits(page, '0')).toBeVisible();
  const keptRaw = await readStored(page, UNREADABLE_KEY);
  expect(keptRaw).not.toBeNull();
  expect(JSON.parse(keptRaw as string)).toEqual(future);
});

test('a Save that is not even readable text starts fresh with a notice, and is kept as it was', async ({
  page,
}) => {
  const garbled = '{"totalCredits": 1234, "stagesProgress": {';
  await seedSave(page, garbled);
  await page.goto('/');

  await expect(notice(page)).toBeVisible();
  await expect(stars(page, 0)).toBeVisible();
  expect(await readStored(page, UNREADABLE_KEY)).toBe(garbled);
});

test('a Save missing a field loads, with that field at its default and no notice', async ({
  page,
}) => {
  const missing = [
    'totalCredits',
    'soundEnabled',
    'highwaySpeed',
    'keyAnalytics',
  ];
  const gappy = Object.fromEntries(
    Object.entries(returningPlayerSave()).filter(
      ([key]) => !missing.includes(key),
    ),
  );
  await seedSave(page, gappy);
  await page.goto('/');

  // The progress that was there is kept, and the missing Credits are 0.
  await expect(stars(page, 5)).toBeVisible();
  await expect(credits(page, '0')).toBeVisible();
  await expect(notice(page)).toHaveCount(0);
  expect(await readStored(page, UNREADABLE_KEY)).toBeNull();

  // Sound is on by default, so the header offers to mute it.
  await expect(
    page.getByRole('button', { name: 'Mute All Audio' }),
  ).toBeVisible();

  // And the game plays.
  await page.getByRole('button', { name: /begin home row mission/i }).click();
  await expect(
    page.getByRole('button', { name: 'Pause', exact: true }),
  ).toBeVisible();
});
