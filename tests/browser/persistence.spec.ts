/// <reference types="node" />
import { readFile } from 'node:fs/promises';
import { expect, type Page, test } from '@playwright/test';
import { UNREADABLE_SAVE_NOTICE } from '../../src/game/save';
import { DISMISS_NOTICE_LABEL } from '../../src/screens/dismissLabel';
import { RETURNING_PLAYER } from '../shared/saves';
import { DEBRIEF_TITLE } from '../shared/screens';
import { launchFreeFlight, seedSave, typeText } from './helpers';

// J5: the Save in real localStorage, across reloads. Whether a Save is read
// and written the right way is for the unit tests (save.test.ts,
// backup.test.ts, storage.test.ts); what only a browser shows is that the
// page's localStorage outlives a reload, that a Backup really downloads as a
// file and imports from one, and that a Save the game cannot read starts the
// player fresh with a notice, across a reload.
//
// A returning player's Save (5 Stars, 1,234 Credits) is put in localStorage
// before the page loads, once, so a reload sees whatever the game left behind.

const stars = (page: Page, count: number) =>
  page.getByRole('button', { name: `${count} ★`, exact: true });

const credits = (page: Page, text: string) =>
  page.getByRole('button', { name: `${text} Cr`, exact: true });

const notice = (page: Page) =>
  page.getByText(UNREADABLE_SAVE_NOTICE, { exact: true });

async function headerStars(page: Page): Promise<number> {
  const button = page.getByRole('button', { name: /^\d+ ★$/ });
  await expect(button).toBeVisible();
  return Number.parseInt((await button.textContent()) ?? '', 10);
}

async function headerCredits(page: Page): Promise<string> {
  const button = page.getByRole('button', { name: /^[\d,]+ Cr$/ });
  await expect(button).toBeVisible();
  return (await button.textContent()) ?? '';
}

test('the Save outlives a reload: Stars, a Backup round trip, a Free Flight, and an unreadable Save', async ({
  page,
  browser,
}) => {
  await seedSave(page, RETURNING_PLAYER);
  await page.goto('/');

  await test.step('a returning player’s Save loads: the header shows their Stars and Credits', async () => {
    await expect(stars(page, 5)).toBeVisible();
    await expect.soft(credits(page, '1,234')).toBeVisible();
    await expect.soft(notice(page)).toHaveCount(0);
  });

  await test.step('the Stars button draws no ★ after the count: the icon is the only star', async () => {
    // The default window is 1280px wide, where the header once added a "★" of
    // its own. The button's name still ends in one ("5 ★", read above), so
    // the glyph may stay in the page for a screen reader, but it may take no
    // room: a DOM test can't tell, because it has no CSS.
    const glyph = stars(page, 5).getByText('★', { exact: true });
    const box = (await glyph.count()) > 0 ? await glyph.boundingBox() : null;
    expect
      .soft(box === null || box.width <= 1, 'the ★ after the count takes room')
      .toBe(true);
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

  await test.step('clearing a Free Flight earns no Stars, and what it paid is kept after a reload', async () => {
    await launchFreeFlight(page, 'ab');
    await typeText(page, 'ab');
    await expect(page.getByText(DEBRIEF_TITLE)).toBeVisible();
    expect(await headerStars(page), 'a Free Flight adds no Stars').toBe(5);
    const creditsAfter = await headerCredits(page);

    await page.reload();
    await expect(stars(page, 5)).toBeVisible();
    expect.soft(await headerCredits(page)).toBe(creditsAfter);
  });

  await test.step('a Save the game cannot read starts fresh with a notice, which stays through reloads until it is dismissed', async () => {
    // A second browser context has localStorage of its own.
    const context = await browser.newContext({
      baseURL: test.info().project.use.baseURL,
    });
    try {
      const second = await context.newPage();
      // A version this game does not know: the whole Save is set aside.
      await seedSave(second, { ...RETURNING_PLAYER, version: 2 });
      await second.goto('/');

      await expect(notice(second)).toBeVisible();
      await expect.soft(stars(second, 0)).toBeVisible();
      await expect.soft(credits(second, '0')).toBeVisible();

      await second.reload();
      await expect(stars(second, 0)).toBeVisible();
      await expect.soft(notice(second)).toBeVisible();

      await second
        .getByRole('button', { name: DISMISS_NOTICE_LABEL, exact: true })
        .click();
      await expect(notice(second)).toHaveCount(0);

      await second.reload();
      await expect(stars(second, 0)).toBeVisible();
      await expect.soft(notice(second)).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
});
