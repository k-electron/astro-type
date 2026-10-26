/// <reference types="node" />
import { readFile } from 'node:fs/promises';
import { expect, type Page, test } from '@playwright/test';
import { launchFreeFlight, typeText } from './helpers';

// J5: the Save in real localStorage, across reloads. Whether a Save is read
// and written the right way is for the unit tests (save.test.ts,
// backup.test.ts); what only a browser shows is that the page's localStorage
// outlives a reload, that a Backup really downloads as a file and imports from
// one, and that a Save the game cannot read is kept in the browser.
//
// A returning player's Save is put in localStorage before the page loads, once,
// so a reload sees whatever the game left behind.

const SAVE_KEY = 'astrotype_profile_v1';
const UNREADABLE_KEY = 'astrotype_profile_v1_unreadable';
const NOTICE =
  "Your saved progress couldn't be read, so you're starting fresh.";

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

/** 5 Stars in all (Stage 1 with 3, Stage 2 with 2) and 1,234 Credits. */
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

const notice = (page: Page) => page.getByText(NOTICE, { exact: true });

/** The Stars the header shows, whatever they are. */
async function headerStars(page: Page): Promise<number> {
  const button = page.getByRole('button', { name: /^\d+ ★$/ });
  await expect(button).toBeVisible();
  return Number.parseInt((await button.textContent()) ?? '', 10);
}

/** The Credits the header shows, like "1,234 Cr". */
async function headerCredits(page: Page): Promise<string> {
  const button = page.getByRole('button', { name: /^[\d,]+ Cr$/ });
  await expect(button).toBeVisible();
  return (await button.textContent()) ?? '';
}

const readStored = (page: Page, key: string) =>
  page.evaluate((k) => localStorage.getItem(k), key);

test('the Save outlives a reload: Stars, a Backup round trip, a new clear, and an unreadable Save', async ({
  page,
  browser,
}) => {
  await seedSave(page, returningPlayer);
  await page.goto('/');

  await test.step('a returning player’s Save loads: the header shows their Stars and Credits', async () => {
    await expect(stars(page, 5)).toBeVisible();
    await expect.soft(credits(page, '1,234')).toBeVisible();
    await expect.soft(notice(page)).toHaveCount(0);
  });

  let backupPath = '';
  await test.step('Export Backup downloads a file that says which version it is', async () => {
    await page.getByRole('button', { name: 'Analytics', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Typing Analytics & Heatmap' }),
    ).toBeVisible();

    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Backup' }).click();
    backupPath = await (await download).path();
    const backup = JSON.parse(await readFile(backupPath, 'utf8'));
    expect.soft(backup.version).toBe(1);
    expect.soft(backup.totalCredits).toBe(1234);
  });

  await test.step('Factory Reset wipes the Stars, and importing the downloaded file brings them back, through a reload', async () => {
    await page.getByRole('button', { name: 'Factory Reset' }).click();
    await page.getByRole('button', { name: 'Confirm Reset' }).click();
    await expect(stars(page, 0)).toBeVisible();
    await expect.soft(credits(page, '0')).toBeVisible();

    await page
      .getByLabel('Import Backup', { exact: true })
      .setInputFiles(backupPath);
    await expect(stars(page, 5)).toBeVisible();
    await expect.soft(credits(page, '1,234')).toBeVisible();

    await page.reload();
    await expect(stars(page, 5)).toBeVisible();
    await expect.soft(credits(page, '1,234')).toBeVisible();
  });

  await test.step('clearing a Free Flight earns Stars, and they are kept after a reload', async () => {
    await launchFreeFlight(page, 'ab');
    await typeText(page, 'ab');
    await expect(page.getByText(/Mission Debriefing/)).toBeVisible();
    const after = await headerStars(page);
    expect(after, 'the clear added Stars to the fleet').toBeGreaterThan(5);
    const creditsAfter = await headerCredits(page);

    await page.reload();
    await expect(stars(page, after)).toBeVisible();
    expect.soft(await headerCredits(page)).toBe(creditsAfter);
  });

  await test.step('a Save the game cannot read starts fresh with a notice, and the bad Save is kept, even after a reload', async () => {
    // A second browser context has localStorage of its own.
    const context = await browser.newContext({
      baseURL: test.info().project.use.baseURL,
    });
    try {
      const second = await context.newPage();
      const bad = { ...returningPlayer, totalCredits: 'lots' };
      await seedSave(second, bad);
      await second.goto('/');

      await expect(notice(second)).toBeVisible();
      await expect.soft(stars(second, 0)).toBeVisible();
      await expect.soft(credits(second, '0')).toBeVisible();
      const kept = await readStored(second, UNREADABLE_KEY);
      expect.soft(JSON.parse(kept ?? 'null')).toEqual(bad);

      await second.reload();
      await expect(stars(second, 0)).toBeVisible();
      const keptAfterReload = await readStored(second, UNREADABLE_KEY);
      expect.soft(JSON.parse(keptAfterReload ?? 'null')).toEqual(bad);
    } finally {
      await context.close();
    }
  });
});
