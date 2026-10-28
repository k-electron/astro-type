import { expect, it } from 'vitest';
import { HUD_NAME } from '../shared/screens';
import { renderGame, screen } from './harness';

// HUD Accuracy is the share of the Run's keystrokes that were right, worked
// out on every keystroke. Speed is a different readout: it keeps refreshing on
// the Run clock's own tick, twice a second.

// Six different letters; "z" is never a target.
const TEXT = 'abcdef';

const hudText = () =>
  screen.getByRole('region', { name: HUD_NAME }).textContent ?? '';

/** The HUD's Accuracy readout, as the player reads it: "75%". */
const accuracy = () => /Accuracy\s*(\d+%)/.exec(hudText())?.[1];

/** The HUD's Speed readout, as the player reads it: "36WPM". */
const speed = () => /Speed\s*(\d+)\s*WPM/.exec(hudText())?.[1];

it('shows Accuracy as correct over all keystrokes after every keystroke, a Miss or a hit, with no time passing', () => {
  const player = renderGame({ text: TEXT });
  player.type('abc');
  expect(accuracy()).toBe('100%');

  // 3 right keys of 4.
  player.press('z');
  expect(accuracy()).toBe('75%');

  // 3 of 5.
  player.press('z');
  expect(accuracy()).toBe('60%');

  // 4 of 6: a right key brings it up straight away.
  player.press('d');
  expect(accuracy()).toBe('67%');

  // 4 of 7.
  player.press('z');
  expect(accuracy()).toBe('57%');
});

it('keeps Speed to its own refresh: a keystroke does not change it, the next tick does', () => {
  const player = renderGame({ text: TEXT });
  player.type('abc');
  const before = speed();
  expect(before).toBeDefined();

  // A right key and a wrong one, with no time between them.
  player.press('d');
  player.press('z');
  expect(speed()).toBe(before);

  player.step(30);
  expect(speed()).not.toBe(before);
});
