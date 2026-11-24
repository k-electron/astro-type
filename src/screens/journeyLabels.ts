import { STEPS_PER_SECOND } from '../analytics/keys';
import { roundDown } from './roundDown';

/**
 * The words of Analytics' totals row: what the player has done in all, kept
 * for good. A test imports them from here (or from `tests/shared/screens.ts`).
 */
export const DAYS_PLAYED_LABEL = 'Days Played';
export const PRACTICE_TIME_LABEL = 'Practice Time';
export const WORDS_TYPED_LABEL = 'Words Typed';
export const BEST_DAY_LABEL = 'Best Day';

/** What the best day reads before any day has had enough letters to count. */
export const NO_BEST_DAY = '–';

/** Practice time in whole minutes, as hours and minutes ("1h 5m", "12m"). */
export function practiceTimeText(steps: number): string {
  const totalMinutes = Math.floor(steps / STEPS_PER_SECOND / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
}

/** The best day's speed, rounded down so a 37.9 reads 37. */
export function bestDaySpeedText(letterWpm: number): string {
  return `${roundDown(letterWpm)}`;
}

/** A day (`YYYY-MM-DD`) as the player reads it, in their own language: "Nov 12". */
export function dayText(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}
