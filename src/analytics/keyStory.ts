import type { FingerZone } from '../curriculum/keyboardLayout';
import type { Day } from './days';
import {
  countedDays,
  type DayTally,
  dayTalliesByKeycap,
  MIN_DAY_TRIES,
  type Reading,
  readingOf,
} from './keyDays';
import { FIRST_DAYS, type KeyHistory } from './keyHistory';
import { fingerOf, keycapOf, LIST_LENGTH } from './keys';
import type { RunSummary } from './runs';

/**
 * One key's story, for the page on Analytics that opens when a key is
 * clicked: where it is on the hand, when it was first typed, how often, its
 * first days against now, a smoothed trend and what it gets typed as instead.
 * Keys are keycaps, as on the keyboard. The first day, the count, the first
 * days and the best are kept for good in the Logbook; "now", the trend and the
 * Mix-ups read the last 8 weeks of Run summaries.
 */

/** One point of a key's trend: its last 5 days played with 10 tries, as of a day it had 10 tries. */
export interface TrendPoint {
  day: Day;
  ms: number | null;
  accuracy: number | null;
  /** How many days were smoothed (up to 5). */
  days: number;
}

/** What a key gets typed as instead, and how often (First attempts, last 8 weeks). */
export interface InsteadOf {
  /** The key that was pressed, as typed ("s", "S", ";"). */
  pressed: string;
  count: number;
}

export interface KeyStory {
  keycap: string;
  /** The finger that types it, or null when the keyboard doesn't type it. */
  finger: FingerZone | null;
  /** The first day it was typed. */
  firstDay: Day;
  /** How many times it has been typed (First attempts), ever. */
  typed: number;
  /** Its first 3 days it was typed on, kept for good. */
  first: Reading;
  /** Its last 5 days played with 10 tries, up to the latest day; null when none counts lately. */
  now: Reading | null;
  /** One smoothed point for each day in the last 8 weeks that it had 10 tries. */
  trend: TrendPoint[];
  /** Its best smoothed speed (lowest ms) and accuracy, each kept for good. */
  best: { ms: number | null; accuracy: number | null };
  /** What it gets typed as instead, most often first. */
  mixUps: InsteadOf[];
}

/** The Mix-ups of the Runs for a keycap: the keys pressed on it, left out when they are the same keycap (a capital without Shift). */
function insteadOf(runs: readonly RunSummary[]): Map<string, InsteadOf[]> {
  const counts = new Map<string, Map<string, number>>();
  for (const run of runs) {
    for (const [expected, wrong] of Object.entries(run.mixUps)) {
      const keycap = keycapOf(expected);
      const pressed = counts.get(keycap) ?? new Map<string, number>();
      counts.set(keycap, pressed);
      for (const [key, count] of Object.entries(wrong)) {
        if (keycapOf(key) === keycap) continue;
        pressed.set(key, (pressed.get(key) ?? 0) + count);
      }
    }
  }
  return new Map(
    [...counts].map(([keycap, pressed]) => [
      keycap,
      [...pressed]
        .map(([key, count]) => ({ pressed: key, count }))
        .sort((a, b) => b.count - a.count || a.pressed.localeCompare(b.pressed))
        .slice(0, LIST_LENGTH),
    ]),
  );
}

/**
 * What the Logbook holds of a key for good. A key the Run summaries have but
 * the key part does not (a Logbook put together by hand) is read from the
 * summaries instead, as the keyboard does.
 */
function heldOf(
  held: KeyHistory[string] | undefined,
  tallies: readonly DayTally[],
) {
  if (held !== undefined) {
    return {
      firstDay: held.firstDay,
      typed: held.typed,
      first: {
        ...readingOf([
          {
            day: held.firstDays.lastDay ?? held.firstDay,
            firstAttempts: held.firstDays.firstAttempts,
            misses: held.firstDays.misses,
            cleanHits: held.firstDays.cleanHits,
            cleanSteps: held.firstDays.cleanSteps,
          },
        ]),
        days: held.firstDays.days,
      },
      best: held.best,
    };
  }
  return {
    firstDay: tallies[0].day,
    typed: tallies.reduce((total, tally) => total + tally.firstAttempts, 0),
    first: readingOf(tallies.slice(0, FIRST_DAYS)),
    best: { ms: null, accuracy: null },
  };
}

/**
 * Every typed key's story as of `today`: `runs` are the Run summaries still in
 * the window and `history` the key part of the Logbook, kept for good.
 */
export function keyStories(
  runs: readonly RunSummary[],
  history: KeyHistory,
  today: Day,
): Record<string, KeyStory> {
  const tallies = dayTalliesByKeycap(runs);
  const instead = insteadOf(runs);
  const stories: Record<string, KeyStory> = {};
  for (const keycap of new Set([...Object.keys(history), ...tallies.keys()])) {
    const days = tallies.get(keycap) ?? [];
    const held = heldOf(history[keycap], days);
    const now = readingOf(countedDays(days, today));
    stories[keycap] = {
      keycap,
      finger: fingerOf(keycap),
      ...held,
      now: now.days === 0 ? null : now,
      trend: days
        .filter((tally) => tally.firstAttempts >= MIN_DAY_TRIES)
        .map(({ day }) => {
          const {
            ms,
            accuracy,
            days: smoothed,
          } = readingOf(countedDays(days, day));
          return { day, ms, accuracy, days: smoothed };
        }),
      mixUps: instead.get(keycap) ?? [],
    };
  }
  return stories;
}

/** The most typed key, the story to open when no key stands out as tricky; a tie goes to the first keycap. */
export function mostTypedKey(stories: Record<string, KeyStory>): string | null {
  let best: KeyStory | null = null;
  for (const story of Object.values(stories)) {
    if (
      best === null ||
      story.typed > best.typed ||
      (story.typed === best.typed && story.keycap < best.keycap)
    ) {
      best = story;
    }
  }
  return best?.keycap ?? null;
}
