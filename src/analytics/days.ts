/**
 * A day is the player's local calendar date as `YYYY-MM-DD`, passed in by
 * whoever owns the clock: this module reads none (ADR-0004). Differences are
 * worked out on the calendar dates themselves, never on timestamps, so a
 * daylight-saving change can't make a day 23 or 25 hours long.
 */

/** A local calendar date, `YYYY-MM-DD`. */
export type Day = string;

/** How many local days the Logbook keeps the detail of: today and the 55 before it (8 weeks). */
export const WINDOW_DAYS = 56;

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;

const dayNumber = (day: Day): number => {
  const [year, month, date] = day.split('-').map(Number);
  return Date.UTC(year, month - 1, date) / MS_PER_DAY;
};

/** Whether the text is a real calendar date written as `YYYY-MM-DD`. */
export function isDay(value: unknown): value is Day {
  if (typeof value !== 'string' || !DAY_PATTERN.test(value)) return false;
  return new Date(dayNumber(value) * MS_PER_DAY)
    .toISOString()
    .startsWith(value);
}

/** How many days `to` is after `from` (negative when it is before). */
export function daysBetween(from: Day, to: Day): number {
  return dayNumber(to) - dayNumber(from);
}

/** `day` moved on by `count` days (back when negative). */
export function addDays(day: Day, count: number): Day {
  return new Date((dayNumber(day) + count) * MS_PER_DAY)
    .toISOString()
    .slice(0, 10);
}

/** Whether `day` is one of the 56 days ending `today`, or later. Older detail has faded. */
export function isInWindow(day: Day, today: Day): boolean {
  return daysBetween(day, today) < WINDOW_DAYS;
}
