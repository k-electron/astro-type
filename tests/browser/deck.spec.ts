import { expect, type Locator, test } from '@playwright/test';
import {
  clickWhereDrawn,
  drone,
  flightDeck,
  keycap,
  launchFreeFlight,
  promptProgress,
} from './helpers';
import { DEBRIEF_TITLE } from '../shared/screens';
import { bottomEdge } from './journey-helpers';

/** How far the middle of an element is from the middle of another, sideways. */
async function sidewaysGap(a: Locator, b: Locator): Promise<number> {
  const [first, second] = await Promise.all([
    a.boundingBox({ timeout: 2000 }),
    b.boundingBox({ timeout: 2000 }),
  ]);
  if (!first || !second) return Number.POSITIVE_INFINITY;
  return Math.abs(first.x + first.width / 2 - (second.x + second.width / 2));
}

// J1: the Action Deck and its accessibility layer, on the real clock, with real
// key presses and mouse clicks. The Drones and keycaps live in a canvas, so
// this reads them the only way a screen reader can: through PixiJS's
// accessibility layer, which labels each Drone "Drone X" and each keycap
// "X key" at its drawn position.
//
// One launch. A check the next step depends on (the key was typed, so the
// progress moved) is hard; the rest are soft, so one run reports every broken
// fact.

// Six different characters, so each Drone and each keycap is easy to tell
// apart. A symbol that needs Shift ("!", "(") is drawn like a capital ("E"):
// its Drone falls on the key it is typed on. No spaces: after a click, a
// focused button could take Space.
const TEXT = '!bcd(E';

// The keycap each character is typed on (the US layout, held here as the oracle
// for where a Drone should fall): a symbol on its number key, a capital on its
// letter's key.
const KEY_OF: Record<string, string> = { '!': '1', '(': '9', E: 'e' };
const keyOf = (character: string): string => KEY_OF[character] ?? character;
const SHIFTED = ['!', '(', 'E'];

// Tall enough that the Drones, the Strike Line and the keyboard are all on
// screen at once, so a click lands where the keycap is drawn.
test.use({ viewport: { width: 1280, height: 1100 } });

test('the Action Deck draws, moves and answers keys and clicks', async ({
  page,
}) => {
  await launchFreeFlight(page, TEXT);
  const deck = flightDeck(page);

  await test.step('a Drone and a keycap are drawn for each character of the text', async () => {
    for (const character of TEXT) {
      await expect.soft(drone(page, character)).toBeVisible();
      await expect.soft(keycap(page, keyOf(character))).toBeVisible();
    }
  });

  await test.step('a symbol that needs Shift, like a capital, has its Drone over the key it is typed on', async () => {
    // How far a plain letter's Drone sits from its own key is the yardstick:
    // a symbol's Drone has to be no further off than that, give or take half a
    // keycap, and a wrong key would be a whole keycap or more away.
    const plain = ['b', 'c', 'd'];
    const gaps = await Promise.all(
      plain.map((letter) =>
        sidewaysGap(drone(page, letter), keycap(page, letter)),
      ),
    );
    const keycapBox = await keycap(page, 'b').boundingBox();
    const allowed = Math.max(...gaps) + (keycapBox?.width ?? 0) / 2;
    expect.soft(keycapBox, 'the b keycap is drawn').not.toBeNull();

    for (const character of SHIFTED) {
      const gap = await sidewaysGap(
        drone(page, character),
        keycap(page, keyOf(character)),
      );
      expect
        .soft(gap, `Drone ${character} falls over the ${keyOf(character)} key`)
        .toBeLessThanOrEqual(allowed);
    }
  });

  await test.step('the right key destroys the lead Drone, and the Drone behind it comes down and takes its place', async () => {
    await expect(drone(page, 'b')).toBeVisible();
    const before = await bottomEdge(drone(page, 'b'));
    expect.soft(before).toBeGreaterThan(0);

    // The lead Drone is "!": typed, as a player does, by the character itself.
    await page.keyboard.press('!');
    await expect(promptProgress(page)).toHaveText('17%');

    await expect.soft(drone(page, '!')).toHaveCount(0);
    await expect.soft(drone(page, 'b')).toBeVisible();
    await expect.soft(deck).toContainText(/Streak\s*1(?!\d)/i);
    // A Drone visibly falls: the next one comes down to the Strike Line.
    await expect.soft
      .poll(() => bottomEdge(drone(page, 'b')), {
        message: 'Drone b comes down at least 20 px',
      })
      .toBeGreaterThan(before + 20);
  });

  await test.step('a wrong key is a Miss: the Streak resets and the Drone stays to be typed', async () => {
    // "z" is not the next character ("b"), nor anywhere in the text.
    await page.keyboard.press('z');

    await expect.soft(deck).toContainText(/Streak\s*0(?!\d)/i);
    await expect.soft(drone(page, 'b')).toBeVisible();
    await expect.soft(promptProgress(page)).toHaveText('17%');
  });

  await test.step('clicking the "b" keycap counts as typing that key', async () => {
    await clickWhereDrawn(page, keycap(page, 'b'));

    await expect(promptProgress(page)).toHaveText('33%');
    await expect.soft(drone(page, 'b')).toHaveCount(0);
    await expect.soft(drone(page, 'c')).toBeVisible();
    await expect.soft(deck).toContainText(/Streak\s*1(?!\d)/i);
  });

  await test.step('clicking the wrong keycap is a Miss, like pressing the wrong key', async () => {
    await clickWhereDrawn(page, keycap(page, 'z'));

    await expect.soft(deck).toContainText(/Streak\s*0(?!\d)/i);
    await expect.soft(promptProgress(page)).toHaveText('33%');
    await expect.soft(drone(page, 'c')).toBeVisible();
  });

  await test.step('keys and clicks mix: the next key can be typed either way', async () => {
    await page.keyboard.press('c');
    await expect.soft(promptProgress(page)).toHaveText('50%');
    await expect.soft(drone(page, 'c')).toHaveCount(0);
    await expect.soft(drone(page, 'd')).toBeVisible();
  });

  await test.step('a symbol that needs Shift and a capital are hit by the character itself, and the last hit clears the Run', async () => {
    await page.keyboard.press('d');
    await expect(promptProgress(page)).toHaveText('67%');

    await expect.soft(drone(page, '(')).toBeVisible();
    await page.keyboard.press('(');
    await expect(promptProgress(page)).toHaveText('83%');
    await expect.soft(drone(page, '(')).toHaveCount(0);
    await expect.soft(drone(page, 'E')).toBeVisible();

    await page.keyboard.press('E');
    await expect(page.getByText(DEBRIEF_TITLE)).toBeVisible();
  });
});
