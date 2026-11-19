import { expect, it } from 'vitest';
import { HUD_NAME } from '../shared/screens';
import { renderGame, screen } from './harness';

// HUD Accuracy is the share of the characters reached that carry no Miss mark,
// worked out on every keystroke and shown rounded down. Speed is a different
// readout: it keeps refreshing on the Run clock's own tick, twice a second.

// Six different letters; "z" is never a target.
const TEXT = 'abcdef';

const hudText = () =>
  screen.getByRole('region', { name: HUD_NAME }).textContent ?? '';

/** The HUD's Accuracy readout, as the player reads it: "75%". */
const accuracy = () => /Accuracy\s*(\d+%)/.exec(hudText())?.[1];

/** The HUD's Speed readout, as the player reads it: "36WPM". */
const speed = () => /Speed\s*(\d+)\s*WPM/.exec(hudText())?.[1];

it('shows 100% before the first key, and keeps it while every character reached is clean', () => {
  const player = renderGame({ text: TEXT });
  expect(accuracy()).toBe('100%');

  player.type('abc');
  expect(accuracy()).toBe('100%');
});

it('drops at a wrong key before the character is typed, and shows the share rounded down, with no time passing', () => {
  const player = renderGame({ text: TEXT });
  player.type('ab');

  // 2 clean of 3 reached is 66.7%: shown as 66%, not 67%.
  player.press('z');
  expect(accuracy()).toBe('66%');

  // More wrong keys on the same character change nothing.
  player.press('z');
  player.press('z');
  expect(accuracy()).toBe('66%');

  // Typing the marked character leaves its mark.
  player.press('c');
  expect(accuracy()).toBe('66%');

  // 3 clean of 4 reached.
  player.press('d');
  expect(accuracy()).toBe('75%');

  // 3 of 5.
  player.press('z');
  expect(accuracy()).toBe('60%');

  // Typing the marked character leaves 3 of 5.
  player.press('e');
  expect(accuracy()).toBe('60%');
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
