import { fireEvent } from '@testing-library/react';
import { KEYBOARD_ROWS } from '../../src/curriculum/keyboardLayout';
import { describe, expect, it } from 'vitest';
import {
  beginnerPresses,
  playPresses,
  type TypesPresses,
} from '../shared/beginnerTypist';
import {
  KEYS_HEADING,
  LEAST_ACCURATE_KEYS_HEADING,
  litLettersCaption,
  MISSED,
  MIX_UPS_HEADING,
  mixUpLabel,
  NO_SPEED_TO_SHOW,
  NO_MISSED_KEYS,
  NO_MIX_UPS,
  RUN_TEXT_HEADING,
  SLOW,
  SLOWEST_KEYS_HEADING,
  workOnSentence,
} from '../shared/screens';
import { WRONG_KEY } from '../shared/testHelpers';
import { debriefCard, type Player, renderGame, within } from './harness';

/** The player as something the beginner typist can type on. */
const onScreen = (player: Player): TypesPresses => ({
  step: (steps) => player.step(steps),
  press: (key) => player.press(key),
});

/** Press keys after `steps` of Run Time each: `[key, steps]`. */
function typeAt(player: Player, presses: [string, number][]): void {
  for (const [key, steps] of presses) {
    player.step(steps);
    player.press(key);
  }
}

/**
 * A Free Flight in which "f" is missed on its first and third turns, then
 * typed at 10 steps a key, and "j" is typed slower, at 30.
 */
function flyWithRepeatedMisses(): Player {
  const player = renderGame({ text: 'ffffffffjjjj' });
  typeAt(player, [
    [WRONG_KEY, 10],
    ['f', 10],
    ['f', 10],
    [WRONG_KEY, 10],
    ...[...'ffffff'].map((key): [string, number] => [key, 10]),
    ...[...'jjjj'].map((key): [string, number] => [key, 30]),
  ]);
  return player;
}

const card = () => within(debriefCard());
const textOfRun = () => card().getByRole('region', { name: RUN_TEXT_HEADING });

describe('the Debrief says what to work on', () => {
  it('names the key missed twice, with its finger, in place of the technique card', () => {
    flyWithRepeatedMisses();

    expect(
      card().getByText(
        workOnSentence({
          kind: 'missed key',
          character: 'f',
          misses: 2,
          firstAttempts: 8,
          finger: 'LEFT_INDEX',
        }),
      ),
    ).toBeTruthy();
    expect(card().queryByText(/Technique Assessment/i)).toBeNull();
  });

  it('keeps the Rhythm the Run ended on', () => {
    flyWithRepeatedMisses();

    expect(debriefCard().textContent).toMatch(/Rhythm:\s*\d+%/);
  });

  it('praises a clean, even Run', () => {
    const player = renderGame({ text: 'ffjjffjj' });
    typeAt(
      player,
      [...'ffjjffjj'].map((key): [string, number] => [key, 20]),
    );

    expect(
      card().getByText(workOnSentence({ kind: 'even run', misses: 0 })),
    ).toBeTruthy();
  });
});

describe('the Run text on the Debrief', () => {
  it('shows what was typed, with the Misses marked and the slow letters named', () => {
    flyWithRepeatedMisses();

    expect(textOfRun().textContent).toContain('ffffffffjjjj');
    expect(within(textOfRun()).getAllByTitle(new RegExp(MISSED))).toHaveLength(
      2,
    );
    // The four "j" were typed 30 steps apart against 10 for the clean "f".
    expect(
      within(textOfRun()).getAllByTitle(new RegExp(`, ${SLOW}$`)),
    ).toHaveLength(4);
  });
});

describe('the keys and the lists on the Debrief', () => {
  it('draws the whole keyboard, dims the keys the Run never used and leaves the others to click', () => {
    flyWithRepeatedMisses();

    const keyboard = card().getByRole('group', { name: KEYS_HEADING });
    const key = (name: string) =>
      within(keyboard).getByRole('button', { name }) as HTMLButtonElement;

    expect(key('F key').disabled).toBe(false);
    expect(key('J key').disabled).toBe(false);
    expect(key('Q key').disabled).toBe(true);
    expect(key('Space key').disabled).toBe(true);
    // Not only letters: the modifiers and the number row are there too.
    expect(key('1 key')).toBeTruthy();
    expect(within(keyboard).getAllByRole('button')).toHaveLength(
      KEYBOARD_ROWS.flat().length,
    );
  });

  it('lists the slowest keys, the least accurate keys and the Mix-ups of the Run', () => {
    flyWithRepeatedMisses();

    const list = (heading: string) =>
      within(
        card().getByRole('heading', { name: heading }).parentElement ??
          debriefCard(),
      );
    expect(
      list(SLOWEST_KEYS_HEADING).getByRole('button', { name: /^J \d+ ms$/ }),
    ).toBeTruthy();
    expect(
      list(LEAST_ACCURATE_KEYS_HEADING).getByRole('button', {
        name: 'F 2 of 8',
      }),
    ).toBeTruthy();
    expect(
      list(MIX_UPS_HEADING).getByRole('button', {
        name: mixUpLabel({
          expected: 'f',
          pressed: WRONG_KEY,
          count: 2,
        }),
      }),
    ).toBeTruthy();
  });

  it('says so, in the lists, for a Run with nothing to list', () => {
    const player = renderGame({ text: 'ffjjffjj' });
    typeAt(
      player,
      [...'ffjjffjj'].map((key): [string, number] => [key, 20]),
    );

    expect(card().getByText(NO_MISSED_KEYS)).toBeTruthy();
    expect(card().getByText(NO_MIX_UPS)).toBeTruthy();
  });
});

describe('linking the keys to the text', () => {
  const entry = () =>
    within(
      card().getByRole('heading', { name: LEAST_ACCURATE_KEYS_HEADING })
        .parentElement ?? debriefCard(),
    ).getByRole('button', { name: 'F 2 of 8' });

  it('hovering a list entry lights every letter of that key and says how many', () => {
    flyWithRepeatedMisses();
    expect(within(textOfRun()).queryAllByRole('mark')).toHaveLength(0);

    fireEvent.mouseEnter(entry());

    expect(within(textOfRun()).getAllByRole('mark')).toHaveLength(8);
    expect(card().getByText(litLettersCaption('f', 8))).toBeTruthy();

    fireEvent.mouseLeave(entry());

    expect(within(textOfRun()).queryAllByRole('mark')).toHaveLength(0);
  });

  it('hovering a key on the keyboard lights its letters too', () => {
    flyWithRepeatedMisses();

    fireEvent.mouseEnter(
      card().getByRole('button', { name: 'J key' }) as HTMLElement,
    );

    expect(within(textOfRun()).getAllByRole('mark')).toHaveLength(4);
  });

  it('clicking pins the highlight until it is clicked again', () => {
    flyWithRepeatedMisses();

    fireEvent.click(entry());
    fireEvent.mouseLeave(entry());

    expect(within(textOfRun()).getAllByRole('mark')).toHaveLength(8);
    expect(entry().getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(entry());

    expect(within(textOfRun()).queryAllByRole('mark')).toHaveLength(0);
  });
});

describe('what the Mix-ups say was typed', () => {
  it('keeps the case: a lower-case d for a capital D reads "D as d"', () => {
    const player = renderGame({ text: 'Dfdf' });
    typeAt(player, [
      ['d', 20],
      ['D', 20],
      ...[...'fdf'].map((key): [string, number] => [key, 20]),
    ]);

    expect(
      within(
        card().getByRole('heading', { name: MIX_UPS_HEADING }).parentElement ??
          debriefCard(),
      ).getByRole('button', { name: 'D as d' }),
    ).toBeTruthy();
    expect(within(textOfRun()).getAllByTitle(/typed as d first/).length).toBe(
      1,
    );
  });
});

describe('the Shift keys on the Debrief keyboard', () => {
  /** Type "Df", the capital with `side` Shift held, or with no Shift at all. */
  function typeCapital(side: 'left' | 'right' | null) {
    const player = renderGame({ text: 'Df' });
    player.step(20);
    player.press('D', side ? { shift: side } : {});
    player.step(20);
    player.press('f');
  }
  const shiftKey = (name: string) =>
    within(card().getByRole('group', { name: KEYS_HEADING })).getByRole(
      'button',
      { name },
    ) as HTMLButtonElement;

  it('lights the side the Run held, and dims the other', () => {
    typeCapital('left');

    expect(shiftKey('Left Shift').disabled).toBe(false);
    expect(shiftKey('Right Shift').disabled).toBe(true);
  });

  it('lights the right side for a Run that held the right Shift', () => {
    typeCapital('right');

    expect(shiftKey('Left Shift').disabled).toBe(true);
    expect(shiftKey('Right Shift').disabled).toBe(false);
  });

  it('lights the Shift held only for a retry, after the capital was first typed as a lower-case letter', () => {
    const player = renderGame({ text: 'Df' });
    player.step(20);
    player.press('d');
    player.step(20);
    player.press('D', { shift: 'left' });
    player.step(20);
    player.press('f');

    expect(shiftKey('Left Shift').disabled).toBe(false);
    expect(shiftKey('Right Shift').disabled).toBe(true);
  });

  it('dims both for a Run that used no Shift, with their names in the tooltips', () => {
    typeCapital(null);

    expect(shiftKey('Left Shift').disabled).toBe(true);
    expect(shiftKey('Right Shift').disabled).toBe(true);
    expect(shiftKey('Left Shift').title).toMatch(/^Left Shift: /);
    expect(shiftKey('Right Shift').title).toMatch(/^Right Shift: /);
  });
});

describe('the tooltip of a letter with no speed', () => {
  it('says there is no speed to show', () => {
    flyWithRepeatedMisses();

    // The Run's first letter has no Clean-hit time.
    const first = within(textOfRun()).getAllByTitle(/^F: /)[0];
    expect(first.title).toContain(NO_SPEED_TO_SHOW);
  });
});

describe('a beginner typist Run', () => {
  const TEXT = 'the quiet fox jumps over a lazy dog and the brave pilot';

  it('shows the whole text, a sentence about it and lists no longer than five', () => {
    const player = renderGame({ text: TEXT });
    playPresses(onScreen(player), beginnerPresses(TEXT, 2));

    // Spaces are drawn as non-breaking ones, so a word never splits.
    expect(textOfRun().textContent?.replaceAll('\u00A0', ' ')).toContain(TEXT);
    const lists = [
      SLOWEST_KEYS_HEADING,
      LEAST_ACCURATE_KEYS_HEADING,
      MIX_UPS_HEADING,
    ].map(
      (heading) =>
        within(
          card().getByRole('heading', { name: heading }).parentElement ??
            debriefCard(),
        ).queryAllByRole('button').length,
    );
    for (const count of lists) expect(count).toBeLessThanOrEqual(5);
  });
});

describe('leaving the Debrief', () => {
  it('and starting a new Run shows only the new Run', () => {
    const player = flyWithRepeatedMisses();
    player.click('Academy Home');
    player.launchFreeFlight('dkdk');
    typeAt(
      player,
      [...'dkdk'].map((key): [string, number] => [key, 20]),
    );

    expect(textOfRun().textContent).toContain('dkdk');
    expect(textOfRun().textContent).not.toContain('ff');
    expect(card().getByText(NO_MIX_UPS)).toBeTruthy();
    const keyboard = card().getByRole('group', { name: KEYS_HEADING });
    expect(
      (
        within(keyboard).getByRole('button', {
          name: 'F key',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        within(keyboard).getByRole('button', {
          name: 'D key',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
});
