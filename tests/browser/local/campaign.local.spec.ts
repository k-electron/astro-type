import { expect, test } from '@playwright/test';
import { GALAXY_MAP } from '../../shared/screens';
import { clearFirstStage, debrief, startFirstStage } from '../helpers';

// LOCAL ONLY (run by `pnpm verify`, not in CI; docs/agents/testing.md): one full
// Stage played for real. The Stage is 77 keys on a real clock with a real
// deck, which took about 50 s on CI's runner. What the Debrief and the screens
// around it do is checked in the DOM tests (tests/dom/debrief.test.tsx,
// profile.test.tsx, names.test.tsx) and the rules in the unit tests
// (stars.test.ts, sector-unlock.test.ts); this plays the first Stage typed
// through the real page, from a fresh Save to its Debrief, and checks that the
// Stars it earned are still there after a reload.

test.skip(
  Boolean(process.env.CI),
  'Local-only: pnpm verify runs it, CI does not',
);

test('the first Stage played for real from a fresh Save: its Debrief, and the Stars kept after a reload', async ({
  page,
}) => {
  await startFirstStage(page);
  await expect(
    page.getByRole('button', { name: '0 ★', exact: true }),
  ).toBeVisible();
  await clearFirstStage(page);
  const result = debrief(page);

  await test.step('the Debrief shows the Stage, its Speed and the Stars it earned', async () => {
    await expect
      .soft(
        result.getByRole('heading', { name: 'The Tactile Anchors', level: 2 }),
      )
      .toBeVisible();
    await expect.soft(result).toContainText(/Speed\s*[1-9]\d*\s*WPM/i);
    await expect.soft(result).toContainText(/\+3\s*new/i);
    await expect
      .soft(page.getByRole('button', { name: '3 ★', exact: true }))
      .toBeVisible();
  });

  await test.step('the Save outlives the page: the Stars are still there after a reload', async () => {
    await page.reload();
    await expect(
      page.getByRole('button', { name: '3 ★', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('navigation')
      .getByRole('button', { name: GALAXY_MAP, exact: true })
      .click();
    await expect(
      page.getByRole('button', { name: /Orion Belt/ }),
    ).toContainText('3/12');
  });
});
