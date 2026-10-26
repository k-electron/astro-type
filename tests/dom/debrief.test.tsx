import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CURRICULUM_SECTORS } from '../../src/data/curriculum';
import { type Player, renderGame, screen, within } from './harness';
import { clearedStages } from './saves';

/** The card the Debrief shows over the Flight Deck. */
function debriefCard(): HTMLElement {
  const card = screen.getByText(/Mission Debriefing/).parentElement;
  if (!card) throw new Error('The Debrief has no card');
  return card;
}

/** The names of the Debrief's buttons, in the order they are laid out. */
function debriefButtons(): string[] {
  return within(debriefCard())
    .getAllByRole('button')
    .map((button) => button.textContent?.trim() ?? '');
}

const stars = (count: number) =>
  screen.getByRole('button', { name: new RegExp(`^${count}\\s*★$`) });

const hudText = () =>
  screen.getByRole('region', { name: 'HUD' }).textContent ?? '';
/** The HUD of a Run that has scored nothing yet. */
const FRESH_SCORE = /Score\s*0\s*x1/;
const progress = () =>
  screen.getByRole('progressbar', { name: 'Progress' }).textContent;

const BANNER = 'New Sector Unlocked! Find it on the Galaxy Map.';

/** Start Stage 1 from Academy Home and type it to the end. */
function clearStageOne(player: Player) {
  player.click('Start Mission');
  player.typePrompt();
}

describe('the Debrief of Stage 1', () => {
  it('shows the Stage, Speed and new Stars, and the header and map count them', () => {
    const player = renderGame();
    player.click('Start Mission');
    expect(stars(0)).toBeTruthy();

    player.typePrompt();

    expect(
      within(debriefCard()).getByRole('heading', { level: 2 }).textContent,
    ).toBe('The Tactile Anchors');
    expect(debriefCard().textContent).toMatch(/Speed\s*[1-9]\d*\s*WPM/);
    expect(debriefCard().textContent).toMatch(/\+3\s*new/);
    expect(stars(3)).toBeTruthy();

    player.openHeader('Sectors');
    expect(
      screen.getByRole('button', { name: /Sector 01/ }).textContent,
    ).toContain('3/12');
  });
});

describe('Replay and Next Mission', () => {
  it('Replay starts a fresh Run of the same Stage', () => {
    const player = renderGame();
    clearStageOne(player);
    expect(hudText()).not.toMatch(FRESH_SCORE);

    player.click('Replay');

    expect(screen.queryByText(/Mission Debriefing/)).toBeNull();
    expect(screen.getByRole('main').textContent).toContain(
      'The Tactile Anchors',
    );
    expect(hudText()).toMatch(FRESH_SCORE);
    expect(progress()).toBe('0%');
    // And it is a live Run: the Stage's first key is "f".
    player.type('f');
    expect(progress()).not.toBe('0%');
  });

  it('Next Mission starts a fresh Run of the next Stage', () => {
    const player = renderGame();
    clearStageOne(player);

    player.click('Next Mission');

    expect(screen.queryByText(/Mission Debriefing/)).toBeNull();
    expect(screen.getByRole('main').textContent).toContain(
      'Middle Finger Expansion',
    );
    expect(hudText()).toMatch(FRESH_SCORE);
    expect(progress()).toBe('0%');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
  });
});

describe('the Debrief buttons', () => {
  /** A Save that has cleared every Stage in the game. */
  const everyStageCleared = clearedStages(
    Object.fromEntries(
      CURRICULUM_SECTORS.flatMap((sector) =>
        sector.stages.map((stage) => [stage.id, 3]),
      ),
    ),
  );

  it('on the last Stage, Back to Galaxy Map takes the place of Next Mission and opens the Galaxy Map', () => {
    const player = renderGame({ profile: everyStageCleared });
    // The whole Save loaded: a refused Save would leave a fresh Profile.
    expect(screen.queryByRole('status')).toBeNull();
    const lastSector = CURRICULUM_SECTORS[CURRICULUM_SECTORS.length - 1];
    player.startStage(lastSector.stages[lastSector.stages.length - 1].id);

    player.typePrompt();

    expect(debriefButtons()).toEqual([
      'Replay',
      'Galaxy Map',
      'Main Menu',
      'Back to Galaxy Map',
    ]);
    expect(screen.queryByRole('button', { name: 'Next Mission' })).toBeNull();

    player.click('Back to Galaxy Map');

    expect(
      screen.getByRole('heading', { name: 'Flight Sectors & Missions' }),
    ).toBeTruthy();
  });

  it('on any other Stage, Next Mission comes last', () => {
    const player = renderGame();
    clearStageOne(player);

    expect(debriefButtons()).toEqual([
      'Replay',
      'Galaxy Map',
      'Main Menu',
      'Next Mission',
    ]);
  });

  it('after a Free Flight there is no Next Mission and no Back to Galaxy Map', () => {
    const player = renderGame({ text: 'f j f j' });

    player.typePrompt();

    expect(debriefButtons()).toEqual(['Replay', 'Galaxy Map', 'Main Menu']);
  });
});

describe('the Sector unlock banner', () => {
  it('shows when the Run just cleared opened a Sector, and the header counts the Stars', () => {
    // 3 Stars so far: clearing Stage 1 for 3 more takes the fleet to 6.
    const player = renderGame({ profile: clearedStages({ 's1-l2': 3 }) });

    clearStageOne(player);

    expect(debriefButtons()).toContain('Replay');
    expect(screen.getByText(BANNER)).toBeTruthy();
    expect(stars(6)).toBeTruthy();
  });

  it('is absent once the Debrief is drawn, when Sector 02 is still locked', () => {
    // A fresh Profile: 3 Stars is short of the 6 that open Sector 02.
    const player = renderGame();

    clearStageOne(player);

    expect(debriefButtons()).toContain('Replay');
    expect(screen.queryByText(/New Sector Unlocked/)).toBeNull();
  });
});

describe('Free Flight', () => {
  it('plays a short text of your own through to a Debrief with Speed and 100% Accuracy', () => {
    const player = renderGame({ text: 'the quick fox' });
    expect(screen.getByRole('main').textContent).toContain('the␣quick␣fox');

    player.typePrompt();

    const card = debriefCard();
    expect(within(card).getByRole('heading', { level: 2 }).textContent).toBe(
      'Free Flight Drill',
    );
    expect(card.textContent).toMatch(/Speed\s*[1-9]\d*\s*WPM/);
    expect(card.textContent).toMatch(/Accuracy\s*100%/);
  });

  it('turns pasted curly quotes, a long dash and line breaks into plain keys, and plays through on them', () => {
    // As text pasted from a web page or a word processor would carry them.
    const pasted = 'Don’t stop — “go”\nnow\tfast';
    const typed = 'Don\'t stop - "go" now fast';
    const player = renderGame({ text: pasted });

    // The prompt shows the plain keys the player will actually press.
    expect(screen.getByRole('main').textContent).toContain(
      typed.replaceAll(' ', '␣'),
    );

    player.type(typed);

    expect(
      within(debriefCard()).getByRole('heading', { level: 2 }).textContent,
    ).toBe('Free Flight Drill');
    expect(debriefCard().textContent).toMatch(/Accuracy\s*100%/);
  });

  it('disables Launch for a character that has no key, and names it', () => {
    const player = renderGame();
    player.openHeader('Free Flight');

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'ready \u{1F680} launch' },
    });

    expect(
      (
        screen.getByRole('button', {
          name: 'Launch Custom Flight',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    // The message lists the character; the textbox's own value doesn't count.
    expect(screen.getAllByText(/\u{1F680}/u).length).toBeGreaterThan(0);
  });
});
