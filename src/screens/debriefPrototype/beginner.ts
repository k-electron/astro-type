/**
 * PROTOTYPE (#147). A made-up beginner touch typist, a few weeks in: about
 * 12–15 WPM and about 90% accuracy. Self-contained (no imports), so the
 * recording script can run it with Node as well as the sample Run in the app.
 *
 * - Each finger has its own pace; pinkies and rings are slowest, the thumb fastest.
 * - Reaching off the home row costs time; the top row less than the bottom.
 * - The first letter of a word is slower (planning the word).
 * - Times vary a lot (log-normal), and now and then the player stops to look.
 * - Misses are more likely on ring and pinky keys and off the home row. A Miss
 *   is usually the key next to the right one on its row, sometimes the mirror
 *   key on the other hand, sometimes the key above or below.
 * - After a Miss the player pauses before trying again, and sometimes misses again.
 * - They warm up a little over the Run.
 */

export interface Press {
  /** The key pressed (a character; ' ' is Space). */
  key: string;
  /** How long after the previous press, in ms. */
  afterMs: number;
  /** For a character that needs Shift: which Shift the player used. */
  shift?: 'opposite' | 'same' | 'none';
}

/** How a player has come along (for the Analytics journey): all optional. */
export interface Tuning {
  /** Multiplies every time: below 1 is faster. */
  pace?: number;
  /** Multiplies every chance of a Miss. */
  miss?: number;
  /** An extra time factor for one key, e.g. a key still new to the player. */
  keyFactor?: (c: string) => number;
  /** The chance a shifted character uses the opposite-hand Shift. */
  shiftOpposite?: number;
}

const ROWS = ['qwertyuiop', 'asdfghjkl;', 'zxcvbnm,./', '1234567890'];
const SHIFTED = '!@#$%^&*()';
const SHIFT_BASE: Record<string, string> = { ':': ';', '<': ',', '>': '.', '?': '/', '"': ';' };
const FINGER_MS = [860, 760, 640, 560, 560, 560, 560, 640, 760, 860];
const ROW_FACTOR = [1.2, 1.0, 1.3, 1.3];
const THUMB_MS = 430;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function place(c: string): { row: number; col: number } | null {
  const shiftedDigit = SHIFTED.indexOf(c);
  const lower =
    shiftedDigit >= 0
      ? ROWS[3][shiftedDigit]
      : (SHIFT_BASE[c] ?? c.toLowerCase());
  for (let row = 0; row < ROWS.length; row++) {
    const col = ROWS[row].indexOf(lower);
    if (col >= 0) return { row, col };
  }
  return null;
}

function wrongKeyFor(c: string, r: () => number): string {
  const p = place(c);
  if (!p) return 'x';
  const roll = r();
  if (roll < 0.6) {
    const dir = r() < 0.5 ? -1 : 1;
    let col = p.col + dir;
    if (col < 0 || col > 9) col = p.col - dir;
    if (p.row === 3) return ROWS[3][col];
    return ROWS[p.row][col];
  }
  if (roll < 0.8) return ROWS[p.row][9 - p.col];
  const row = p.row === 1 ? (r() < 0.5 ? 0 : 2) : p.row === 3 ? 0 : 1;
  return ROWS[row][p.col];
}

export function beginnerPresses(
  text: string,
  seed: number,
  tuning: Tuning = {},
): Press[] {
  const { pace = 1, miss = 1, keyFactor, shiftOpposite = 0.5 } = tuning;
  const r = rng(seed);
  const gauss = () =>
    Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
  const presses: Press[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const p = place(c);
    const warmUp = 1.1 - 0.15 * (i / text.length);
    let ms = c === ' ' || !p ? THUMB_MS : FINGER_MS[p.col] * ROW_FACTOR[p.row];
    if (i > 0 && text[i - 1] === ' ') ms *= 1.4;
    ms *= warmUp * pace * (keyFactor?.(c.toLowerCase()) ?? 1);
    const needsShift = c !== c.toLowerCase() || SHIFTED.includes(c) || c in SHIFT_BASE;
    if (needsShift) ms *= 1.5;
    ms *= Math.exp(0.35 * gauss());
    if (r() < 0.05) ms += 1200 + r() * 1400;
    const outer = p !== null && (p.col <= 1 || p.col >= 8);
    const missChance =
      c === ' '
        ? 0.015
        : (0.05 + (outer ? 0.03 : 0) + (p && p.row !== 1 ? 0.03 : 0)) *
          miss;
    const shift: Press['shift'] = needsShift
      ? r() < shiftOpposite
        ? 'opposite'
        : r() < 0.85
          ? 'same'
          : 'none'
      : undefined;
    let after = Math.max(90, ms);
    let tries = 0;
    while (c !== ' ' && r() < (tries === 0 ? missChance : 0.2)) {
      presses.push({ key: wrongKeyFor(c, r), afterMs: after, shift });
      after = 500 + r() * 600;
      tries++;
    }
    presses.push({ key: c, afterMs: after, shift });
  }
  return presses;
}
