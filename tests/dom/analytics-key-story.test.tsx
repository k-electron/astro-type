import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { addDays } from '../../src/analytics/days';
import {
  EMPTY_LOGBOOK,
  type FoldFacts,
  foldRun,
  type Logbook,
} from '../../src/analytics/logbook';
import { fingerWords } from '../../src/screens/debriefLabels';
import {
  KEY_NOT_TIMED,
  KEY_NOW,
  KEY_REBUILDING,
  KEY_STORY_HEADING,
  KEY_STORY_PROMPT,
  KEYBOARD_HEADING,
  keyInsteadText,
  keyStoryTitle,
  LOGBOOK_HEADING,
  VERY_SLOW_MARK,
  VERY_SLOW_MARK_LABEL,
  VERY_SLOW_WORDS,
} from '../../src/screens/journeyLabels';
import { logOf } from '../shared/flightLog';
import { BANNED_NAME } from '../shared/names';
import { TEST_DAY } from '../shared/testHelpers';
import { renderGame, screen, within } from './harness';

// One key's story on Analytics: it starts on the trickiest key, and a click on
// a key (on the keyboard, or in a logbook entry) opens that key's. What a story
// says is worked out in src/analytics/key-story.test.ts; what is here is that
// the page wires it up. The trend's drawn line and the cursor's hold need a
// real layout: the play-check covers them.

const FACTS: FoldFacts = {
  where: {
    sector: { id: 'sector-test', name: 'Test Sector' },
    stage: { id: 'test-1', name: 'Test One' },
  },
  runSteps: 1200,
  wpm: 20,
  accuracy: 90,
  rhythm: 90,
};

/** `text` typed 12 steps a key (200 ms), the keys at `instead` first mistyped as the key given. */
const typedWith = (text: string, instead: Record<number, string> = {}) =>
  logOf(
    text,
    [...text].flatMap((key, at): [string, number][] =>
      instead[at] === undefined
        ? [[key, 12]]
        : [
            [instead[at], 12],
            [key, 12],
          ],
    ),
  );

/** The Logbook after the same Run on each of the last `days` days. */
const everyDay = (days: number, log: ReturnType<typeof typedWith>): Logbook =>
  Array.from({ length: days }, (_, at) =>
    addDays(TEST_DAY, at + 1 - days),
  ).reduce((logbook, day) => foldRun(logbook, log, FACTS, day), EMPTY_LOGBOOK);

// F is missed on 4 of its 10 tries a day (as G), J on 2 of 10 (as H).
const TEXT = `${'f'.repeat(10)}${'j'.repeat(10)}`;
const LOG = typedWith(TEXT, {
  0: 'g',
  1: 'g',
  2: 'g',
  3: 'g',
  10: 'h',
  11: 'h',
});

const STORY = () => screen.getByRole('region', { name: KEY_STORY_HEADING });
const KEYBOARD = () => screen.getByRole('region', { name: KEYBOARD_HEADING });
const LOGBOOK = () => screen.getByRole('region', { name: LOGBOOK_HEADING });

describe("a key's story on Analytics", () => {
  it('starts on the trickiest key, with its finger and its Mix-ups', () => {
    const player = renderGame({ profile: { logbook: everyDay(3, LOG) } });
    player.openHeader('Analytics');

    const story = within(STORY());
    expect(story.getByText(keyStoryTitle('f'))).toBeTruthy();
    expect(
      story.getByText(`Typed with your ${fingerWords('LEFT_INDEX')}`),
    ).toBeTruthy();
    expect(story.getByText(keyInsteadText('g', 12))).toBeTruthy();
  });

  it('opens a key clicked on the keyboard', () => {
    const player = renderGame({ profile: { logbook: everyDay(3, LOG) } });
    player.openHeader('Analytics');

    fireEvent.click(within(KEYBOARD()).getByRole('button', { name: 'J key' }));

    const story = within(STORY());
    expect(story.getByText(keyStoryTitle('j'))).toBeTruthy();
    expect(
      story.getByText(`Typed with your ${fingerWords('RIGHT_INDEX')}`),
    ).toBeTruthy();
    expect(story.getByText(keyInsteadText('h', 6))).toBeTruthy();
    expect(story.queryByText(keyInsteadText('g', 12))).toBeNull();
  });

  it('opens a key clicked in a logbook entry, with its finger and Mix-ups', () => {
    const player = renderGame({ profile: { logbook: everyDay(3, LOG) } });
    player.openHeader('Analytics');

    fireEvent.click(within(LOGBOOK()).getByRole('button', { name: 'J key' }));

    const story = within(STORY());
    expect(story.getByText(keyStoryTitle('j'))).toBeTruthy();
    expect(
      story.getByText(`Typed with your ${fingerWords('RIGHT_INDEX')}`),
    ).toBeTruthy();
    expect(story.getByText(keyInsteadText('h', 6))).toBeTruthy();
  });

  it('reads its first days, still, when the picture is rebuilding', () => {
    // Two days played: fewer than 3, so "now", the trend and the Mix-ups wait.
    const player = renderGame({ profile: { logbook: everyDay(2, LOG) } });
    player.openHeader('Analytics');

    const story = within(STORY());
    expect(story.getByText(keyStoryTitle('f'))).toBeTruthy();
    expect(story.getByText(/200 ms a key.*its first 2 days/)).toBeTruthy();
    expect(story.getByText(KEY_NOW).nextElementSibling?.textContent).toBe(
      KEY_REBUILDING,
    );
    expect(story.queryByText(keyInsteadText('g', 8))).toBeNull();
  });

  it('has a story for a player back after a long break, from what is kept for good', () => {
    const player = renderGame({
      profile: { logbook: everyDay(3, LOG) },
      today: addDays(TEST_DAY, 100),
    });
    player.openHeader('Analytics');

    const story = within(STORY());
    expect(story.getByText(keyStoryTitle('f'))).toBeTruthy();
    expect(story.getByText(/first 3 days/)).toBeTruthy();
  });

  it('asks for a click when no key has been typed often enough to start on', () => {
    // A Run was cleared, but its Logbook has no keys: nothing to start on.
    const player = renderGame({
      profile: {
        logbook: {
          ...EMPTY_LOGBOOK,
          lifetime: { ...EMPTY_LOGBOOK.lifetime, runs: 1 },
        },
      },
    });
    player.openHeader('Analytics');

    expect(within(STORY()).getByText(KEY_STORY_PROMPT)).toBeTruthy();
  });

  it('marks a very slow key with more than its colour, and no other', () => {
    // K takes 60 steps a key against 12 for A: well over 1.6 times the average.
    const text = `${'a'.repeat(30)}${'k'.repeat(10)}`;
    const slow = logOf(
      text,
      [...text].map((key): [string, number] => [key, key === 'k' ? 60 : 12]),
    );
    const player = renderGame({ profile: { logbook: everyDay(3, slow) } });
    player.openHeader('Analytics');

    const keyboard = within(KEYBOARD());
    expect(
      keyboard.getByRole('button', { name: 'K key' }).textContent,
    ).toContain(VERY_SLOW_MARK);
    expect(
      keyboard.getByRole('button', { name: 'A key' }).textContent,
    ).not.toContain(VERY_SLOW_MARK);
  });

  it('says in words that a very slow key is very slow, in its tooltip and on its mark', () => {
    const text = `${'a'.repeat(30)}${'k'.repeat(10)}`;
    const slow = logOf(
      text,
      [...text].map((key): [string, number] => [key, key === 'k' ? 60 : 12]),
    );
    const player = renderGame({ profile: { logbook: everyDay(3, slow) } });
    player.openHeader('Analytics');

    const keyboard = within(KEYBOARD());
    const k = keyboard.getByRole('button', { name: 'K key' });
    expect(k.title).toContain(VERY_SLOW_WORDS);
    expect(within(k).getByLabelText(VERY_SLOW_MARK_LABEL)).toBeTruthy();
    expect(keyboard.getByRole('button', { name: 'A key' }).title).not.toContain(
      VERY_SLOW_WORDS,
    );
  });
});

describe('a key that was never timed', () => {
  it('says so without an internal term', () => {
    // Every A comes straight after a Miss on B, so no A is timed.
    const log = logOf(
      'ab'.repeat(10),
      [...'ab'.repeat(10)].flatMap((key): [string, number][] =>
        key === 'b'
          ? [
              ['x', 12],
              ['b', 12],
            ]
          : [['a', 12]],
      ),
    );
    const player = renderGame({ profile: { logbook: everyDay(3, log) } });
    player.openHeader('Analytics');

    fireEvent.click(within(KEYBOARD()).getByRole('button', { name: 'A key' }));

    const story = STORY();
    expect(
      within(story).getAllByText(new RegExp(KEY_NOT_TIMED)).length,
    ).toBeGreaterThan(0);
    expect(story.textContent).not.toMatch(BANNED_NAME);
  });
});
