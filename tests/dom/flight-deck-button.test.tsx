import { describe, expect, it } from 'vitest';
import { PAUSE_MENU_NAME } from '../shared/screens';
import { type Player, renderGame, screen } from './harness';

// The Action Deck's header carries one button that pauses a running Run and
// starts or resumes it otherwise ("Pause Flight" / "Start Mission"). These
// check that it does the right thing on each screen it can be pressed on.

const pauseMenu = () => screen.queryByRole('dialog', { name: PAUSE_MENU_NAME });
const progress = () =>
  screen
    .getByRole('progressbar', { name: 'Progress' })
    .getAttribute('aria-valuetext');
const hasButton = (name: string) =>
  screen.queryByRole('button', { name }) !== null;

/** Free Flight "abcdef", three characters in. */
function halfwayThroughARun(): Player {
  const player = renderGame({ text: 'abcdef' });
  player.type('abc');
  expect(progress()).toBe('50%');
  return player;
}

describe('the Flight Deck button in the header', () => {
  it('pauses a running Run, then resumes that same Run from the same character', () => {
    const player = halfwayThroughARun();
    expect(hasButton('Start Mission')).toBe(false);

    player.click('Pause Flight');
    expect(pauseMenu()).not.toBeNull();
    expect(progress()).toBe('50%');
    expect(hasButton('Pause Flight')).toBe(false);

    player.click('Start Mission');
    expect(pauseMenu()).toBeNull();
    expect(hasButton('Pause Flight')).toBe(true);
    expect(progress()).toBe('50%');
    player.type('d');
    expect(progress()).toBe('67%');
  });

  it.each(['Hangar', 'Sectors', 'Analytics', 'Free Flight'] as const)(
    'resumes the Run straight away from the %s opened over it',
    (menu) => {
      const player = halfwayThroughARun();
      player.openHeader(menu);
      expect(hasButton('Start Mission')).toBe(true);

      player.click('Start Mission');

      expect(screen.queryByRole('button', { name: /^Back to / })).toBeNull();
      expect(pauseMenu()).toBeNull();
      expect(hasButton('Pause Flight')).toBe(true);
      expect(progress()).toBe('50%');
      player.type('d');
      expect(progress()).toBe('67%');
    },
  );

  it('starts a fresh Run of the same Stage from the Debrief', () => {
    const player = renderGame({ text: 'ab' });
    player.type('ab');
    expect(hasButton('Start Mission')).toBe(true);

    player.click('Start Mission');

    expect(hasButton('Pause Flight')).toBe(true);
    expect(progress()).toBe('0%');
    player.type('a');
    expect(progress()).toBe('50%');
  });
});
