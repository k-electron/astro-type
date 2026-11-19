/**
 * A measure as a screen shows it: rounded down, so a shown 90% always means at
 * least 90%. The game keeps the exact number and Stars compare that one.
 */
export function roundDown(value: number): number {
  return Math.floor(value);
}
