import { type Day, daysBetween } from './days';

/**
 * The Sector a player had reached by a day, for the band behind the
 * Journey's timeline. Analytics never looks a Sector up in the curriculum: a
 * Sector is the id and name its Runs brought, and "later" means first reached
 * later, never further along the curriculum, so a player sent back by a Star
 * gate stays on the furthest Sector they reached (ADR-0004).
 */

/** A Sector as its Runs copied it, and the first day one of them was flown there (kept for good). */
export interface ReachedSector {
  id: string;
  name: string;
  firstDay: Day;
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
