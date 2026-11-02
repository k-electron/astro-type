import { expect, test } from '@playwright/test';
import {
  FREE_FLIGHT_PRESETS,
  getStageById,
} from '../../../src/curriculum/curriculum';
import { drone, launchFreeFlight } from '../helpers';
import { expectStreak } from '../journey-helpers';

// LOCAL ONLY (run by `pnpm verify`, not in CI; docs/agents/testing.md): every
// symbol that needs Shift in the texts that have them is a Drone the player can
// see and hit. The CI journey (deck.spec.ts) checks two of them over their keys;
// this one goes through them all, including the ones on odd keys (", {, |, :,
// _, +), on the real clock with real key presses.

test.skip(
  Boolean(process.env.CI),
  'Local-only: pnpm verify runs it, CI does not',
);

test.use({ viewport: { width: 1280, height: 1100 } });
test.setTimeout(120_000);

/** Characters that need Shift and are not letters (the US layout, the oracle). */
const SHIFTED_SYMBOL = /[~!@#$%^&*()_+{}|:"<>?]/;

/** The Stages and presets whose text has such characters, as the ticket lists them. */
const STAGE_IDS = ['s6-l2', 's6-l3', 's6-l4', 's7-l4'];
const PRESET_NAMES = ['JavaScript', 'Pangram'];

function textOf(stageId: string): string {
  const stage = getStageById(stageId);
  if (!stage) throw new Error(`No Stage has the id ${stageId}`);
  return stage.sampleText;
}

const texts = [
  ...STAGE_IDS.map(textOf),
  ...FREE_FLIGHT_PRESETS.filter((preset) =>
    PRESET_NAMES.some((name) => preset.name.includes(name)),
  ).map((preset) => preset.text),
];

/** Each such character once, in the order the texts first use it. */
const SYMBOLS = [
  ...new Set(
    texts.flatMap((text) => [...text]).filter((c) => SHIFTED_SYMBOL.test(c)),
  ),
].join('');

test('every symbol that needs Shift in the Stages and presets has a Drone, and hitting it clears it', async ({
  page,
}) => {
  expect(SYMBOLS.length, 'the texts have shifted symbols').toBeGreaterThan(10);
  await launchFreeFlight(page, SYMBOLS);

  let streak = 0;
  for (const symbol of SYMBOLS) {
    await test.step(`"${symbol}" has a Drone, and a hit on it takes it away`, async () => {
      await expect.soft(drone(page, symbol)).toBeVisible();
      await page.keyboard.press(symbol);
      streak += 1;
      // The last hit clears the Run, and the Debrief takes the HUD's place.
      if (streak < SYMBOLS.length) await expectStreak(page, streak);
      await expect.soft(drone(page, symbol)).toHaveCount(0);
    });
  }
});
