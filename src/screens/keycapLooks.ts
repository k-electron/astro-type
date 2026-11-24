import type { Pace } from '../analytics/letters';
import type { KeySpec } from '../curriculum/keyboardLayout';
import { keycapLabel } from './debriefLabels';

/** The tint of a keycap, by how long the key took against an average (the Run's, or the day's). */
export const TINT: Record<Pace, string> = {
  quick: 'bg-emerald-500/25',
  steady: '',
  slow: 'bg-amber-500/30',
  'very slow': 'bg-rose-500/40',
};

/** The accessible name of a keycap: a character's key ("F key") or a modifier's own name ("Left Shift"). */
export function keycapName(spec: KeySpec): string {
  return spec.key.length === 1
    ? `${keycapLabel(spec.key)} key`
    : keycapLabel(spec.key);
}
