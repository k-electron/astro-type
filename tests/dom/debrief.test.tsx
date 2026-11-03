import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  CURRICULUM_SECTORS,
  FREE_FLIGHT_SUBTITLE,
  FREE_FLIGHT_TITLE,
} from '../../src/curriculum/curriculum';
import { closeLabel } from '../../src/screens/closeLabel';
import {
  clearedStages,
  EVERY_STAGE_CLEARED,
  RETURNING_PLAYER,
} from '../shared/saves';
import {
  ACADEMY_HOME,
  ACADEMY_HOME_HEADING,
  DEBRIEF_TITLE,
  GALAXY_MAP,
  HUD_NAME,
  MENU_HEADINGS,
  NEXT_STAGE,
  PAUSE_FLIGHT,
  START_FREE_FLIGHT,
  START_STAGE,
  YOUR_TEXT,
} from '../shared/screens';
import { type Player, renderGame, screen, within } from './harness';

/** The card the Debrief shows over the Flight Deck. */
function debriefCard(): HTMLElement {
  const card = screen.getByText(DEBRIEF_TITLE).parentElement;
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
  screen.getByRole('region', { name: HUD_NAME }).textContent ?? '';
/** The HUD of a Run that has scored nothing yet. */
const FRESH_SCORE = /Score\s*0\s*x1/;
const progress = () =>
  screen.getByRole('progressbar', { name: 'Progress' }).textContent;

/** The most Stars the Galaxy Map can show: three on every Stage of every Sector. */
const mostStars =
  3 *
  CURRICULUM_SECTORS.reduce((count, sector) => count + sector.stages.length, 0);

const BANNER = 'New Sector Unlocked! Find it on the Galaxy Map.';

/** Start Stage 1 from Academy Home and type it to the end. */
function clearStageOne(player: Player) {
  player.click(START_STAGE);
  player.typePrompt();
}

describe('the Debrief of Stage 1', () => {
  it('shows the Stage, Speed and new Stars, and the header and map count them', () => {
    const player = renderGame();
    player.click(START_STAGE);
    expect(stars(0)).toBeTruthy();

    player.typePrompt();

    expect(
      within(debriefCard()).getByRole('heading', { level: 2 }).textContent,
    ).toBe('The Tactile Anchors');
    expect(debriefCard().textContent).toMatch(/Speed\s*[1-9]\d*\s*WPM/);
    expect(debriefCard().textContent).toMatch(/\+3\s*new/);
    expect(stars(3)).toBeTruthy();

    player.openHeader('Galaxy Map');
    expect(
      screen.getByRole('button', { name: /Sector 01/ }).textContent,
    ).toContain('3/12');
  });
});

describe('Replay and Next Stage', () => {
  it('Replay starts a fresh Run of the same Stage', () => {
    const player = renderGame();
    clearStageOne(player);
    expect(hudText()).not.toMatch(FRESH_SCORE);

    player.click('Replay');

    expect(screen.queryByText(DEBRIEF_TITLE)).toBeNull();
    expect(screen.getByRole('main').textContent).toContain(
      'The Tactile Anchors',
    );
    expect(hudText()).toMatch(FRESH_SCORE);
    expect(progress()).toBe('0%');
    // And it is a live Run: the Stage's first key is "f".
    player.type('f');
    expect(progress()).not.toBe('0%');
  });

  it('Next Stage starts a fresh Run of the next Stage', () => {
    const player = renderGame();
    clearStageOne(player);

    player.click(NEXT_STAGE);

    expect(screen.queryByText(DEBRIEF_TITLE)).toBeNull();
    expect(screen.getByRole('main').textContent).toContain(
      'Middle Finger Expansion',
    );
    expect(hudText()).toMatch(FRESH_SCORE);
    expect(progress()).toBe('0%');
    expect(screen.getByRole('button', { name: PAUSE_FLIGHT })).toBeTruthy();
  });
});

describe('the Debrief buttons', () => {
  const sectorOneEnd = CURRICULUM_SECTORS[0].stages.at(-1)?.id ?? '';
  const lastStage =
    CURRICULUM_SECTORS[CURRICULUM_SECTORS.length - 1].stages.at(-1)?.id ?? '';

  it.each([
    {
      when: 'on the last Stage',
      profile: EVERY_STAGE_CLEARED,
      stageId: lastStage,
    },
    {
      // A fresh Save has too few Stars for Sector 02, which follows.
      when: 'on the last Stage before a locked Sector',
      profile: undefined,
      stageId: sectorOneEnd,
    },
  ])(
    '$when, a Galaxy Map button takes the place of Next Stage and opens the Galaxy Map, and Close returns to the Debrief',
    ({ profile, stageId }) => {
      const player = renderGame({ profile });
      // The whole Save loaded: a refused Save would leave a fresh Profile.
      expect(screen.queryByRole('status')).toBeNull();
      player.startStage(stageId);

      player.typePrompt();

      expect(screen.queryAllByRole('button', { name: NEXT_STAGE })).toEqual([]);
      expect(
        debriefButtons().filter((name) => name === GALAXY_MAP),
      ).toHaveLength(1);
      expect(
        screen.queryByRole('button', { name: closeLabel('galaxy-map') }),
      ).toBeNull();

      player.click(GALAXY_MAP);

      expect(
        screen.getByRole('heading', { name: MENU_HEADINGS['Galaxy Map'] }),
      ).toBeTruthy();

      player.click(closeLabel('debrief'));

      expect(
        screen.queryByRole('heading', { name: MENU_HEADINGS['Galaxy Map'] }),
      ).toBeNull();
      expect(screen.getByText(DEBRIEF_TITLE)).toBeTruthy();
    },
  );

  it('before a Sector the clear itself opens, Next Stage is offered and starts its first Stage', () => {
    // 5 Stars so far: clearing the last Stage of Sector 01 takes the fleet to 6 or more.
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.startStage(sectorOneEnd);

    player.typePrompt();

    expect(screen.getByText(BANNER)).toBeTruthy();
    player.click(NEXT_STAGE);

    expect(screen.queryByText(DEBRIEF_TITLE)).toBeNull();
    expect(screen.getByRole('main').textContent).toContain(
      CURRICULUM_SECTORS[1].stages[0].title,
    );
  });

  it('on any other Stage, Next Stage comes last, after Galaxy Map and Academy Home', () => {
    const player = renderGame();
    clearStageOne(player);

    expect(debriefButtons()).toEqual([
      'Replay',
      GALAXY_MAP,
      ACADEMY_HOME,
      NEXT_STAGE,
    ]);
  });

  it('after a Free Flight there is no Next Stage and no second Galaxy Map button', () => {
    const player = renderGame({ text: 'f j f j' });

    player.typePrompt();

    expect(debriefButtons()).toEqual(['Replay', GALAXY_MAP, ACADEMY_HOME]);
  });

  it('Academy Home leaves the Debrief for Academy Home', () => {
    const player = renderGame();
    clearStageOne(player);

    player.click(ACADEMY_HOME);

    expect(screen.queryByText(DEBRIEF_TITLE)).toBeNull();
    expect(
      screen.getByRole('heading', { name: ACADEMY_HOME_HEADING }),
    ).toBeTruthy();
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
    // The Flight Deck names the Stage the way Free Flight does.
    expect(screen.getByRole('main').textContent).toContain(FREE_FLIGHT_TITLE);
    expect(screen.getByRole('main').textContent).toContain(
      FREE_FLIGHT_SUBTITLE,
    );

    player.typePrompt();

    const card = debriefCard();
    expect(within(card).getByRole('heading', { level: 2 }).textContent).toBe(
      FREE_FLIGHT_TITLE,
    );
    expect(card.textContent).toMatch(/Speed\s*[1-9]\d*\s*WPM/);
    expect(card.textContent).toMatch(/Accuracy\s*100%/);
  });

  it('is headed Free Flight, not by an id of its own', () => {
    renderGame({ text: 'f j f j' }).typePrompt();

    const title = screen.getByText(DEBRIEF_TITLE).textContent ?? '';
    expect(title).toMatch(new RegExp(`·\\s*${FREE_FLIGHT_TITLE}`, 'i'));
    expect(title).not.toMatch(/custom/i);
  });

  it('shows no Star rating and no new-Stars line, as a Sector Stage does', () => {
    renderGame({ text: 'f j f j' }).typePrompt();

    // The rating's stars, the fleet's total, its "(+N new)" and its New Best.
    expect(debriefCard().textContent).not.toMatch(
      /★|Total Fleet Stars|\+\d+\s*new|New Best/,
    );
  });

  it('shows the Credits it paid, and the header counts them', () => {
    const player = renderGame({ profile: RETURNING_PLAYER, text: 'f j f j' });
    player.typePrompt();

    const paid = Number(
      /Credits\s*\+([\d,]+)/
        .exec(debriefCard().textContent ?? '')?.[1]
        .replace(/,/g, ''),
    );
    expect(paid).toBeGreaterThan(0);
    expect(paid).toBeLessThan(100);
    expect(
      screen.getByRole('button', {
        name: new RegExp(
          `^${(RETURNING_PLAYER.totalCredits + paid).toLocaleString('en-US')}\\s*Cr$`,
        ),
      }),
    ).toBeTruthy();
  });

  it('flown twice leaves the Stars where they were and never shows New Best', () => {
    // 5 Stars so far, and the same text typed twice (Replay is the second).
    const player = renderGame({ profile: RETURNING_PLAYER, text: 'f j f j' });

    for (const flight of [1, 2]) {
      if (flight === 2) {
        player.click('Replay');
        expect(screen.queryByText(DEBRIEF_TITLE)).toBeNull();
      }
      player.typePrompt();

      expect(screen.getByText(DEBRIEF_TITLE), `flight ${flight}`).toBeTruthy();
      expect(debriefCard().textContent).not.toMatch(/New Best|\+\d+\s*new/);
      expect(stars(5), `flight ${flight}`).toBeTruthy();
    }

    player.openHeader('Galaxy Map');
    expect(document.body.textContent).toMatch(
      new RegExp(`5\\s*/\\s*${mostStars} Stars`),
    );
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
    ).toBe(FREE_FLIGHT_TITLE);
    expect(debriefCard().textContent).toMatch(/Accuracy\s*100%/);
  });

  it('asks for Your Text', () => {
    const player = renderGame();

    player.openHeader('Free Flight');

    expect(screen.getByRole('textbox', { name: YOUR_TEXT })).toBeTruthy();
  });

  it('does not clear the Run one character short', () => {
    const player = renderGame({ text: 'ff jj' });

    player.type('ff j');

    expect(screen.queryByText(DEBRIEF_TITLE)).toBeNull();
    expect(screen.getByRole('button', { name: PAUSE_FLIGHT })).toBeTruthy();
  });

  it('offers no choice of Drone speed: every Run moves at one speed', () => {
    const player = renderGame();
    player.openHeader('Free Flight');

    // The Free Flight screen is the panel that holds the text box and Launch.
    let panel: HTMLElement | null = screen.getByRole('textbox');
    while (
      panel &&
      !within(panel).queryByRole('button', { name: START_FREE_FLIGHT })
    ) {
      panel = panel.parentElement;
    }
    if (!panel) throw new Error('The Free Flight screen has no panel');

    expect(
      within(panel)
        .queryAllByRole('button', { name: /^(slow|normal|fast|hyper)$/i })
        .map((button) => button.textContent),
    ).toEqual([]);
    expect(panel.textContent).not.toMatch(/note speed/i);
    // What stays: the text and the Target WPM slider are still set here.
    expect(within(panel).getByRole('slider')).toBeTruthy();
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
          name: START_FREE_FLIGHT,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    // The message names the character; the textbox's own value doesn't count.
    expect(screen.getByRole('alert').textContent).toContain('\u{1F680}');
  });
});
