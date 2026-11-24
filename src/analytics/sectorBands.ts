import { type Day, daysBetween } from './days';
import type { RunSummary } from './runs';

/**
 * The Sector a player had reached by a day, for the band behind the
 * Journey's timeline. Analytics never looks a Sector up in the curriculum: a
 * Sector is the id and name its Runs brought, and "later" means first reached
 * later, never further along the curriculum, so a player sent back by a Star
 * gate stays on the furthest Sector they reached (ADR-0004).
 */

/** A Sector as the Runs copied it, and the first day one of them was flown there. */
export interface ReachedSector {
  id: string;
  name: string;
  firstDay: Day;
}

/**
 * The Sectors the given Runs were flown in, in the order they were first
 * reached. Free Flights are in no Sector. A Sector's name is the latest copy
 * its Runs brought, so a renamed Sector reads by its newest name.
 */
export function sectorsReached(runs: readonly RunSummary[]): ReachedSector[] {
  // The sort is stable, so Runs flown on one day stay in the order they were cleared.
  const chronological = [...runs].sort((a, b) => a.day.localeCompare(b.day));
  const reached = new Map<string, ReachedSector>();
  for (const { day, where } of chronological) {
    if (where === null) continue;
    const { id, name } = where.sector;
    reached.set(id, { id, name, firstDay: reached.get(id)?.firstDay ?? day });
  }
  return [...reached.values()];
}

/**
 * The latest new Sector reached by `day`: the last of `reached` (in the order
 * first reached) whose first day is on or before it, or null before any.
 */
export function sectorOn(
  reached: readonly ReachedSector[],
  day: Day,
): ReachedSector | null {
  let found: ReachedSector | null = null;
  for (const sector of reached) {
    if (daysBetween(sector.firstDay, day) >= 0) found = sector;
  }
  return found;
}
