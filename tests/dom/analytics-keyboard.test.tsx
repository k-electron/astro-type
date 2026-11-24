import { describe, expect, it } from 'vitest';
import { addDays } from '../../src/analytics/days';
import { KEYBOARD_ROWS } from '../../src/curriculum/keyboardLayout';
import {
  EXPORT_BACKUP_LABEL,
  FACTORY_RESET_LABEL,
  IMPORT_BACKUP_LABEL,
  TECHNIQUES_HEADING,
  WIPE_STARS_LABEL,
} from '../../src/screens/analyticsLabels';
import {
  KEYBOARD_HEADING,
  keyboardRebuilding,
  OFTEN_MISSED,
} from '../../src/screens/journeyLabels';
import { fullLogbook, keysByDay, RETURNING_PLAYER } from '../shared/saves';
import { TEST_DAY } from '../shared/testHelpers';
import { renderGame, screen, within } from './harness';

// Analytics' keyboard: each key as it was on the day under the timeline's
// cursor, from the last 8 weeks' Run summaries. Moving the cursor needs a drawn
// timeline, which a DOM has none of, so what the keyboard shows as the cursor
// moves is for the play-check in a real Chromium; the numbers it shows for a
// day are tested in src/analytics/keyboard.test.ts. What is here is what the
// player reads with no cursor: the latest day.

const KEYBOARD = () => screen.getByRole('region', { name: KEYBOARD_HEADING });
const keyNamed = (name: string) =>
  within(KEYBOARD()).getByRole('button', { name }) as HTMLButtonElement;

/** The same key's day, three days running. */
const threeDays = (
  perDay: Record<string, [hits: number, misses: number]>,
): Record<string, [number, number]>[] => [perDay, perDay, perDay];

describe("Analytics' keyboard and what stays on the page", () => {
  it('has the keyboard, the technique tips, Backup and both wipes for a player with a journey', () => {
    const player = renderGame({ profile: { logbook: fullLogbook() } });
    player.openHeader('Analytics');

    expect(within(KEYBOARD()).getAllByRole('button')).toHaveLength(
      KEYBOARD_ROWS.flat().length,
    );
    expect(screen.getByText(TECHNIQUES_HEADING)).toBeTruthy();
    for (const name of [
      EXPORT_BACKUP_LABEL,
      IMPORT_BACKUP_LABEL,
      WIPE_STARS_LABEL,
      FACTORY_RESET_LABEL,
    ]) {
      expect(screen.getByText(name), name).toBeTruthy();
    }
  });

  it('no longer has the heatmap, the hand balance or the struggling reaches', () => {
    // These three were removed on purpose (ticket #158): the per-key accuracy,
    // the hand split and the trouble-key list were read from the lifetime
    // totals of the old Save. The keys are now the keyboard here and the
    // Debrief's lists; the hand split has no replacement (the Shift hand strip
    // is the habit). The test stays so none of them quietly comes back.
    const player = renderGame({ profile: { logbook: fullLogbook() } });
    player.openHeader('Analytics');

    expect(screen.queryByText(/heatmap/i)).toBeNull();
    expect(screen.queryByText(/hand accuracy/i)).toBeNull();
    expect(screen.queryByText(/struggling reaches/i)).toBeNull();
  });

  it('has no keyboard before any Run is cleared', () => {
    const player = renderGame({ profile: RETURNING_PLAYER });
    player.openHeader('Analytics');

    expect(screen.queryByRole('region', { name: KEYBOARD_HEADING })).toBeNull();
  });

  it('is rebuilding, with no old numbers, for a player who has been away', () => {
    const player = renderGame({
      profile: { logbook: fullLogbook() },
      today: addDays(TEST_DAY, 100),
    });
    player.openHeader('Analytics');

    expect(within(KEYBOARD()).getByText(keyboardRebuilding(true))).toBeTruthy();
    expect(within(KEYBOARD()).queryAllByRole('button')).toHaveLength(0);
  });

  it("is rebuilding on a player's second day, too: fewer than 3 days played", () => {
    const player = renderGame({
      profile: keysByDay([{ f: [20, 0] }, { f: [20, 0] }]),
    });
    player.openHeader('Analytics');

    expect(
      within(KEYBOARD()).getByText(keyboardRebuilding(false)),
    ).toBeTruthy();
  });
});

describe("Analytics' keys as of the latest day", () => {
  it('shows a key not yet typed dark, and a typed one with how it is going', () => {
    const player = renderGame({
      profile: keysByDay(threeDays({ f: [10, 0] })),
    });
    player.openHeader('Analytics');

    expect(keyNamed('Z key').disabled).toBe(true);
    expect(keyNamed('Z key').title).toMatch(/not typed yet/);
    expect(keyNamed('F key').disabled).toBe(false);
    expect(keyNamed('F key').title).toMatch(/100% right/);
  });

  it('counts a capital, and a symbol, for the key it is typed on', () => {
    // "!" is typed on the "1" key and "B" on the "b" key, as on the keyboard.
    const player = renderGame({
      profile: keysByDay(threeDays({ '!': [10, 0], B: [10, 0] })),
    });
    player.openHeader('Analytics');

    expect(keyNamed('1 key').disabled).toBe(false);
    expect(keyNamed('B key').disabled).toBe(false);
    expect(keyNamed('2 key').disabled).toBe(true);
  });

  it.each([
    // [tries over the 3 days (hits, misses a day), the share shown]
    [
      '48 of 49 right reads 97%, not 98%',
      [
        [16, 0],
        [16, 0],
        [16, 1],
      ],
      97,
    ],
    [
      '2 hits to 1 miss reads 66%, not 67%',
      [
        [20, 10],
        [20, 10],
        [20, 10],
      ],
      66,
    ],
    [
      '57 of 100 right reads 57%, whole',
      [
        [19, 14],
        [19, 14],
        [19, 15],
      ],
      57,
    ],
  ] as const)('shows accuracy rounded down: %s', (_, days, shown) => {
    const player = renderGame({
      profile: keysByDay(days.map(([hits, misses]) => ({ f: [hits, misses] }))),
    });
    player.openHeader('Analytics');

    expect(keyNamed('F key').title).toContain(`${shown}% right`);
  });

  it.each([
    // The first Star bar is 90%: a key right less often than that is often missed.
    [
      '89 of 100 right',
      [
        [30, 4],
        [30, 4],
        [29, 3],
      ],
      true,
    ],
    [
      '90 of 100 right',
      [
        [30, 3],
        [30, 3],
        [30, 4],
      ],
      false,
    ],
  ] as const)(
    'marks a key as often missed below the first Star bar: %s',
    (_, days, marked) => {
      const player = renderGame({
        profile: keysByDay(
          days.map(([hits, misses]) => ({ f: [hits, misses] })),
        ),
      });
      player.openHeader('Analytics');

      expect(keyNamed('F key').title.includes(OFTEN_MISSED)).toBe(marked);
    },
  );

  it('says a key typed too few times a day has too few tries to tell, not 100%', () => {
    const player = renderGame({
      profile: keysByDay(threeDays({ f: [9, 0], j: [10, 0] })),
    });
    player.openHeader('Analytics');

    expect(keyNamed('F key').title).toMatch(/not typed often enough/);
    expect(keyNamed('J key').title).toMatch(/100% right/);
  });

  it('shows the keys of Runs just cleared, on the day they were cleared', () => {
    // The wiring from a cleared Run to the keyboard: three days of a Free
    // Flight, a Miss on the last (29 of 30 right, shown as 96%).
    const text = 'f'.repeat(10);
    const player = renderGame({ today: addDays(TEST_DAY, -2) });
    player.launchFreeFlight(text);
    player.type(text);
    player.setToday(addDays(TEST_DAY, -1));
    player.launchFreeFlight(text);
    player.type(text);
    player.setToday(TEST_DAY);
    player.launchFreeFlight(text);
    player.press('x');
    player.type(text);

    player.clickHeader(/Analytics/);

    expect(keyNamed('F key').title).toContain('96% right');
    expect(keyNamed('G key').disabled).toBe(true);
  });
});
