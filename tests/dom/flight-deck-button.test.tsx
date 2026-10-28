import { describe, expect, it } from 'vitest';
import { flightDeckLabel } from '../../src/screens/closeLabel';
import { PAUSE_FLIGHT, PAUSE_MENU_NAME, START_STAGE } from '../shared/screens';
import { type Player, renderGame, screen, within } from './harness';

// The header carries one button that pauses a running Run ("Pause Flight"),
// resumes a paused one ("Resume Flight") and starts a Stage otherwise ("Start
// Stage"). These check that it does the right thing on each screen it can be
// pressed on.
const RESUME_FLIGHT = flightDeckLabel(true);

const pauseMenu = () => screen.queryByRole('dialog', { name: PAUSE_MENU_NAME });
const progress = () =>
  screen
    .getByRole('progressbar', { name: 'Progress' })
    .getAttribute('aria-valuetext');
/** Whether the header has this button: a paused Run's Pause Menu has its own Resume Flight too. */
const hasButton = (name: string) =>
  within(screen.getByRole('banner')).queryByRole('button', { name }) !== null;

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
    expect(hasButton(START_STAGE)).toBe(false);
    expect(hasButton(RESUME_FLIGHT)).toBe(false);

    player.click(PAUSE_FLIGHT);
    expect(pauseMenu()).not.toBeNull();
    expect(progress()).toBe('50%');
    expect(hasButton(PAUSE_FLIGHT)).toBe(false);
    // A Run is paused, so the header resumes it rather than starting a Stage.
    expect(hasButton(RESUME_FLIGHT)).toBe(true);
    expect(hasButton(START_STAGE)).toBe(false);

    player.clickHeader(RESUME_FLIGHT);
    expect(pauseMenu()).toBeNull();
    expect(hasButton(PAUSE_FLIGHT)).toBe(true);
    expect(progress()).toBe('50%');
    player.type('d');
    expect(progress()).toBe('67%');
  });

  it.each(['Hangar', 'Galaxy Map', 'Analytics', 'Free Flight'] as const)(
    'resumes the Run straight away from the %s opened over it',
    (menu) => {
      const player = halfwayThroughARun();
      player.openHeader(menu);
      expect(hasButton(RESUME_FLIGHT)).toBe(true);

      player.clickHeader(RESUME_FLIGHT);

      expect(screen.queryByRole('button', { name: /^Back to / })).toBeNull();
      expect(pauseMenu()).toBeNull();
      expect(hasButton(PAUSE_FLIGHT)).toBe(true);
      expect(progress()).toBe('50%');
      player.type('d');
      expect(progress()).toBe('67%');
    },
  );

  it('starts a fresh Run of the same Stage from the Debrief', () => {
    const player = renderGame({ text: 'ab' });
    player.type('ab');
    expect(hasButton(START_STAGE)).toBe(true);
    expect(hasButton(RESUME_FLIGHT)).toBe(false);

    player.clickHeader(START_STAGE);

    expect(hasButton(PAUSE_FLIGHT)).toBe(true);
    expect(progress()).toBe('0%');
    player.type('a');
    expect(progress()).toBe('50%');
  });
});

describe('the tooltip of the Flight Deck button', () => {
  it('says Pause Flight on a running Run', () => {
    halfwayThroughARun();

    expect(
      within(screen.getByRole('banner'))
        .getByRole('button', { name: PAUSE_FLIGHT })
        .getAttribute('title'),
    ).toBe(PAUSE_FLIGHT);
  });
});
