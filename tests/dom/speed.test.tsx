import { expect, it } from 'vitest';
import { HUD_NAME, NO_SPEED } from '../shared/screens';
import { renderGame, screen } from './harness';

// The HUD's Speed is the Run's WPM over Typing Time, shown rounded down. It
// reads a dash until the second character is typed, refreshes every 30 steps
// of Run Time and sinks between keystrokes. The numbers are the headless
// tests' (wpm.test.ts); this is what the screen shows of them.

// Six different letters.
const TEXT = 'abcdef';

const hudText = () =>
  screen.getByRole('region', { name: HUD_NAME }).textContent ?? '';

/** The HUD's Speed readout as the player reads it: "12", or the dash. */
const speed = () => /Speed\s*(\d+|\D)/.exec(hudText())?.[1];

it('shows a dash for Speed before any key, and after one character', () => {
  const player = renderGame({ text: TEXT });
  expect(speed()).toBe(NO_SPEED);

  // One character is typed 30 steps in; the next refreshes have seen only that one.
  player.type('a');
  player.step(60);
  expect(speed()).toBe(NO_SPEED);
});

it('shows a number from the second character on, once Speed has refreshed', () => {
  const player = renderGame({ text: TEXT });
  player.type('a'); // 30 steps in
  player.step(30);
  player.press('b'); // 60 steps in: a keystroke does not refresh Speed
  expect(speed()).toBe(NO_SPEED);

  // Two characters over 60 steps of Typing Time: 12 WPM.
  player.step(30);
  expect(speed()).toBe('12');
});

it('sinks while no key is typed, and shows the exact WPM rounded down', () => {
  const player = renderGame({ text: TEXT });
  player.type('ab'); // keys at 30 and 60 steps
  player.step(30);
  expect(speed()).toBe('12');

  // 150 steps of Typing Time is 4.8 WPM: shown as 4, not 5.
  player.step(90);
  expect(speed()).toBe('4');
});
