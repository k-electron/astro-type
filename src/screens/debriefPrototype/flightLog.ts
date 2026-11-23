/**
 * PROTOTYPE (#147, "What the Debrief shows of a Run"). Throwaway: lives on
 * branch prototype/debrief-flight-log only. Rough stand-ins for what
 * `runReport` would work out from a Flight log, plus a recorded-looking
 * sample Run so the Debrief can be judged on more than one short Stage.
 */
import { keyForCharacter } from '../../curriculum/curriculum';
import { KEYBOARD_ROWS } from '../../curriculum/keyboardLayout';
import type { ProtoKeystroke } from '../../game/rules';

export type { ProtoKeystroke };

const STEP_MS = 1000 / 60;
const isHit = (k: ProtoKeystroke) => k.expected === k.pressed;

export const keyName = (c: string) => (c === ' ' ? 'Space' : c);

// ---- Series over the Run ---------------------------------------------------

export interface Point {
  x: number; // seconds since the first Keystroke
  y: number;
}

export interface RunSeries {
  durationS: number;
  /** The HUD's WPM after each Keystroke (from the first to here). */
  wpmSoFar: Point[];
  /** WPM over the last ROLLING_HITS hits: how fast the player was going right then. */
  wpmRolling: Point[];
  accuracy: Point[];
  rhythm: Point[];
  streak: Point[];
  /** When each Miss happened, in seconds. */
  misses: number[];
}

export const ROLLING_HITS = 10;

export function seriesOf(log: ProtoKeystroke[]): RunSeries {
  if (log.length === 0) {
    return {
      durationS: 0,
      wpmSoFar: [],
      wpmRolling: [],
      accuracy: [],
      rhythm: [],
      streak: [],
      misses: [],
    };
  }
  const t0 = log[0].step;
  const sec = (k: ProtoKeystroke) => ((k.step - t0) * STEP_MS) / 1000;
  const hits = log.filter(isHit);
  const wpmRolling: Point[] = [];
  for (let j = ROLLING_HITS; j < hits.length; j++) {
    const steps = hits[j].step - hits[j - ROLLING_HITS].step;
    if (steps > 0) {
      wpmRolling.push({
        x: sec(hits[j]),
        y: ((ROLLING_HITS / 5) * 3600) / steps,
      });
    }
  }
  return {
    durationS: sec(log[log.length - 1]),
    wpmSoFar: log
      .filter((k) => k.wpm !== null)
      .map((k) => ({ x: sec(k), y: k.wpm ?? 0 })),
    wpmRolling,
    accuracy: log.map((k) => ({ x: sec(k), y: k.accuracy })),
    rhythm: log.map((k) => ({ x: sec(k), y: k.rhythm })),
    streak: log.map((k) => ({ x: sec(k), y: k.streak })),
    misses: log.filter((k) => !isHit(k)).map(sec),
  };
}

// ---- Keys and Mix-ups ------------------------------------------------------------

export const MIN_CLEAN_HITS = 3;
export const MIN_FIRST_ATTEMPTS = 3;

export interface KeySpeed {
  key: string;
  meanMs: number;
  cleanHits: number;
}

/** Each key's mean Clean-hit time (gaps of 1 step to 5 s), fewest-samples keys left out. */
export function keySpeeds(log: ProtoKeystroke[]): KeySpeed[] {
  const sums = new Map<string, { total: number; n: number }>();
  for (let i = 1; i < log.length; i++) {
    const k = log[i];
    const prev = log[i - 1];
    const clean =
      k.firstAttempt &&
      isHit(k) &&
      prev.firstAttempt &&
      isHit(prev) &&
      prev.index === k.index - 1;
    const gap = k.step - prev.step;
    if (!clean || gap < 1 || gap * STEP_MS > 5000) continue;
    const s = sums.get(k.expected) ?? { total: 0, n: 0 };
    s.total += gap * STEP_MS;
    s.n += 1;
    sums.set(k.expected, s);
  }
  return [...sums.entries()]
    .map(([key, s]) => ({ key, meanMs: s.total / s.n, cleanHits: s.n }))
    .filter((s) => s.cleanHits >= MIN_CLEAN_HITS);
}

export interface KeyAccuracy {
  key: string;
  firstAttempts: number;
  misses: number;
  rate: number; // share of First attempts that were Misses
}

export function keyAccuracies(log: ProtoKeystroke[]): KeyAccuracy[] {
  const counts = new Map<string, { n: number; miss: number }>();
  for (const k of log) {
    if (!k.firstAttempt) continue;
    const c = counts.get(k.expected) ?? { n: 0, miss: 0 };
    c.n += 1;
    if (!isHit(k)) c.miss += 1;
    counts.set(k.expected, c);
  }
  return [...counts.entries()].map(([key, c]) => ({
    key,
    firstAttempts: c.n,
    misses: c.miss,
    rate: c.miss / c.n,
  }));
}

export function leastAccurate(log: ProtoKeystroke[], top = 5): KeyAccuracy[] {
  return keyAccuracies(log)
    .filter((a) => a.firstAttempts >= MIN_FIRST_ATTEMPTS && a.misses > 0)
    .sort((a, b) => b.rate - a.rate || b.misses - a.misses)
    .slice(0, top);
}

export function slowest(log: ProtoKeystroke[], top = 5): KeySpeed[] {
  return keySpeeds(log)
    .sort((a, b) => b.meanMs - a.meanMs)
    .slice(0, top);
}

export interface MixUp {
  expected: string;
  pressed: string;
  count: number;
}

/** First-attempt Misses as (expected, pressed) pairs, most frequent first. */
export function mixUps(log: ProtoKeystroke[], top = 5): MixUp[] {
  const counts = new Map<string, MixUp>();
  for (const k of log) {
    if (!k.firstAttempt || isHit(k)) continue;
    const id = `${k.expected}\u0000${k.pressed}`;
    const m = counts.get(id) ?? {
      expected: k.expected,
      pressed: k.pressed,
      count: 0,
    };
    m.count += 1;
    counts.set(id, m);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, top);
}

/** The Run's mean Clean-hit time over every key, to say "slow" against. */
export function runMeanMs(log: ProtoKeystroke[]): number {
  const all = keySpeeds(log);
  const n = all.reduce((s, k) => s + k.cleanHits, 0);
  if (n === 0) return 0;
  return all.reduce((s, k) => s + k.meanMs * k.cleanHits, 0) / n;
}

/** Each character of the text, with how it went: for the text replay. */
export interface CharReplay {
  index: number;
  char: string;
  /** The Clean-hit gap that typed it, or null (first key, after a Miss, extreme). */
  ms: number | null;
  missed: boolean;
  wrongKeys: string[];
}

export function replayOf(log: ProtoKeystroke[]): CharReplay[] {
  const chars = new Map<number, CharReplay>();
  for (let i = 0; i < log.length; i++) {
    const k = log[i];
    const c = chars.get(k.index) ?? {
      index: k.index,
      char: k.expected,
      ms: null,
      missed: false,
      wrongKeys: [],
    };
    if (!isHit(k)) {
      c.missed = true;
      c.wrongKeys.push(k.pressed);
    } else if (i > 0) {
      const prev = log[i - 1];
      const gap = (k.step - prev.step) * STEP_MS;
      const clean =
        k.firstAttempt &&
        prev.firstAttempt &&
        isHit(prev) &&
        prev.index === k.index - 1;
      if (clean && gap > 0 && gap <= 5000) c.ms = gap;
    }
    chars.set(k.index, c);
  }
  return [...chars.values()].sort((a, b) => a.index - b.index);
}

// ---- A sample Run ------------------------------------------------------------

/** A word Stage's worth of text, longer than Sector 1's, for the sample Run. */
export const SAMPLE_TEXT =
  'the quiet fox jumps over a lazy dog and the brave pilot flies past bright stars while the crew sings softly in the hold as the ship drifts home through the dark between two worlds';

/** Tiny seeded random numbers, so the sample is the same on every reload. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const FINGER_MS: Record<string, number> = {
  LEFT_INDEX: 300,
  RIGHT_INDEX: 300,
  LEFT_MIDDLE: 330,
  RIGHT_MIDDLE: 330,
  LEFT_RING: 390,
  RIGHT_RING: 390,
  LEFT_PINKY: 450,
  RIGHT_PINKY: 450,
  THUMB: 260,
};

/** The key next to this one on its row: a beginner's most common Mix-up. */
function neighbourOf(c: string, r: () => number): string {
  for (const row of KEYBOARD_ROWS) {
    const keys = row.map((k) => k.key).filter((k) => /^[a-z]$/.test(k));
    const i = keys.indexOf(c);
    if (i >= 0) {
      const j = r() < 0.5 ? i - 1 : i + 1;
      return keys[Math.max(0, Math.min(keys.length - 1, j))] === c
        ? keys[i === 0 ? 1 : i - 1]
        : keys[Math.max(0, Math.min(keys.length - 1, j))];
    }
  }
  return 'x';
}

/** The rules' Rhythm formula, copied for the sample only. */
function rhythmAfterHit(times: number[], previous: number): number {
  if (times.length < 4) return previous;
  const iv: number[] = [];
  for (let i = 1; i < times.length; i++) iv.push(times[i] - times[i - 1]);
  const mean = iv.reduce((a, b) => a + b, 0) / iv.length;
  if (mean <= 0) return previous;
  const variance = iv.reduce((s, v) => s + (v - mean) ** 2, 0) / iv.length;
  return Math.max(
    30,
    Math.min(100, Math.round(100 - (Math.sqrt(variance) / mean) * 65)),
  );
}

/**
 * A made-up beginner Run of SAMPLE_TEXT at about 18 WPM: pinkies slower, two
 * keys (b and y) much slower, Misses mostly on a neighbouring key, a little
 * faster as the Run goes on, and one stop to think in the middle.
 */
export function sampleFlightLog(): ProtoKeystroke[] {
  const r = rng(7);
  const log: ProtoKeystroke[] = [];
  let step = 600;
  let streak = 0;
  let rhythm = 100;
  const marks = new Set<number>();
  const times: number[] = [];
  const firstStep = step;
  const slowKeys = new Set(['b', 'y', 'p']);
  const shakyKeys = new Set(['e', 'o', 'w']);
  const text = SAMPLE_TEXT;
  const push = (
    index: number,
    expected: string,
    pressed: string,
    first: boolean,
  ) => {
    // As the rules count it: every character up to this one is reached.
    const accuracy = ((index + 1 - marks.size) * 100) / (index + 1);
    const typed = pressed === expected ? index + 1 : index;
    const typingSteps = step - firstStep;
    log.push({
      index,
      expected,
      pressed,
      firstAttempt: first,
      step,
      streak,
      accuracy,
      rhythm,
      wpm:
        typed < 2 || typingSteps <= 0
          ? null
          : ((typed - 1) * (3600 / 5)) / typingSteps,
    });
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const finger = keyForCharacter(c)?.finger ?? 'THUMB';
    const progress = i / text.length;
    let ms = FINGER_MS[finger] * (1.15 - 0.3 * progress);
    if (slowKeys.has(c)) ms *= 2.1;
    if (i > 0 && text[i - 1] === ' ') ms *= 1.35; // a word's first letter
    ms *= 0.7 + r() * 0.6;
    if (i === Math.floor(text.length * 0.55)) ms += 2600; // stopped to think
    step += Math.max(1, Math.round(ms / STEP_MS));
    const missChance = shakyKeys.has(c) ? 0.22 : c === ' ' ? 0.01 : 0.045;
    let first = true;
    while (r() < (first ? missChance : 0.15) && c !== ' ') {
      marks.add(i);
      streak = 0;
      rhythm = Math.max(25, rhythm - 15);
      push(i, c, neighbourOf(c, r), first);
      first = false;
      step += Math.round((450 + r() * 400) / STEP_MS);
    }
    streak += 1;
    times.push(step * STEP_MS);
    if (times.length > 10) times.shift();
    rhythm = rhythmAfterHit(times, rhythm);
    push(i, c, c, first);
  }
  return log;
}
