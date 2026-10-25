/**
 * The rules of a Run, as plain functions: Judgement, scoring, Streak,
 * Multiplier, Overdrive, shields, Drone movement, telemetry, Stars and
 * Credits. No React, PixiJS, DOM or sound in here.
 *
 * Every number and window is the one the game has always used.
 */
import { getNoteLaneAndFinger } from '../data/curriculum';
import type {
  FallingNote,
  LivePerformance,
  PlayerProfile,
  Stage,
} from '../types/game';

export type Rating = 'PERFECT' | 'GREAT' | 'GOOD';
export type HighwaySpeed = PlayerProfile['highwaySpeed'];

/** Where a Drone waits for the player, as a percentage down the Action Deck. */
export const STRIKE_LINE_Y = 84;

/**
 * What judging one keystroke produced. Exactly one per keystroke that counts.
 * `key` is the key the player pressed.
 */
export type Judgement =
  | { type: 'hit'; grade: 'perfect' | 'great' | 'good'; key: string }
  | { type: 'miss'; key: string }
  | { type: 'shield'; key: string };

/**
 * Whether a keydown can be a hit or a Miss: only a key that types one
 * character (a letter, digit, symbol or Space). Escape, Backspace, Enter, the
 * arrows, function keys, Tab, CapsLock and modifiers have longer names and
 * never count, and an auto-repeat keydown is dropped before it is judged.
 */
export function countsAsKeystroke(key: string, repeat = false): boolean {
  return !repeat && Array.from(key).length === 1;
}

export function freshPerformance(shields: number): LivePerformance {
  return {
    score: 0,
    currentStreak: 0,
    maxStreak: 0,
    multiplier: 1,
    hyperspaceActive: false,
    hyperspaceEnergy: 0,
    shieldsRemaining: shields,
    correctKeystrokes: 0,
    incorrectKeystrokes: 0,
    totalKeystrokes: 0,
    grossWpm: 0,
    netWpm: 0,
    accuracy: 100,
    currentCharIndex: 0,
    timeElapsedSeconds: 0,
    cadenceConsistency: 100,
  };
}

// ---- Drones -------------------------------------------------------------

function makeDrone(
  char: string,
  index: number,
  now: number,
  yPercent: number,
  isTargetLocked: boolean,
): FallingNote {
  const { lane, finger } = getNoteLaneAndFinger(char);
  return {
    id: `note-${index}-${char}-${now}`,
    char,
    displayChar: char === ' ' ? '␣' : char,
    lane,
    finger,
    yPercent,
    status: 'PENDING',
    isTargetLocked,
  };
}

/** The first seven Drones of a Run. */
export function seedDrones(stage: Stage, now: number): FallingNote[] {
  const text = stage.sampleText.slice(0, 7);
  const drones: FallingNote[] = [];
  for (let i = 0; i < text.length; i++) {
    const isTarget = i === 0;
    drones.push(
      makeDrone(
        text[i],
        i,
        now,
        isTarget ? 62 : Math.max(6, 62 - i * 14),
        isTarget,
      ),
    );
  }
  return drones;
}

/**
 * The Drones after the lead one is hit: the hit Drone leaves, a new one
 * enters at the top for the character six ahead, and the new lead is locked.
 */
export function advanceDroneQueue(
  drones: FallingNote[],
  hit: FallingNote | undefined,
  nextCharIndex: number,
  text: string,
  now: number,
): FallingNote[] {
  const remaining = drones.filter(
    (n) => n.id !== hit?.id && n.status !== 'PROCESSED',
  );
  const upcomingIdx = nextCharIndex + 6;
  if (upcomingIdx < text.length) {
    remaining.push(makeDrone(text[upcomingIdx], upcomingIdx, now, 0, false));
  }
  return remaining.map((n, idx) =>
    idx === 0 ? { ...n, isTargetLocked: true } : n,
  );
}

/** One 60 Hz step of Drone movement. */
export function moveDrones(
  drones: FallingNote[],
  speed: HighwaySpeed,
): FallingNote[] {
  const speedStep =
    speed === 'SLOW'
      ? 0.9
      : speed === 'FAST'
        ? 2.2
        : speed === 'HYPER'
          ? 3.4
          : 1.5;
  const speedFactor =
    speed === 'SLOW'
      ? 0.1
      : speed === 'FAST'
        ? 0.22
        : speed === 'HYPER'
          ? 0.32
          : 0.16;

  return drones.map((note, idx) => {
    if (note.status === 'PROCESSED') return note;

    if (idx === 0) {
      if (note.yPercent >= 83.5) {
        return { ...note, yPercent: STRIKE_LINE_Y, isTargetLocked: true };
      }
      const nextY = Math.min(STRIKE_LINE_Y, note.yPercent + speedStep);
      return {
        ...note,
        yPercent: nextY,
        isTargetLocked: nextY >= 83.5,
      };
    }

    const slotY = Math.max(6, STRIKE_LINE_Y - idx * 16);
    const nextY = note.yPercent + (slotY - note.yPercent) * speedFactor;
    return {
      ...note,
      yPercent: nextY,
      isTargetLocked: false,
    };
  });
}

// ---- Judgement, scoring, Streak, Multiplier, Overdrive ------------------

/**
 * Perfect, Great or Good by distance from the Strike Line. Precision sensor
 * Upgrades widen the windows. With no Drone to measure, a hit is Great.
 */
export function judge(
  droneY: number | undefined,
  precisionSensors: number,
): Rating {
  if (droneY === undefined) return 'GREAT';
  const sensorBonus = precisionSensors * 3.5;
  const diff = Math.abs(droneY - STRIKE_LINE_Y);
  if (diff <= 8 + sensorBonus) return 'PERFECT';
  if (diff <= 16 + sensorBonus) return 'GREAT';
  return 'GOOD';
}

export function multiplierForStreak(streak: number): number {
  if (streak >= 30) return 4;
  if (streak >= 20) return 3;
  if (streak >= 10) return 2;
  return 1;
}

/** What Overdrive multiplies each hit's base points by. */
const OVERDRIVE_FACTOR = 2;

/** The number each hit's base points are multiplied by, as the Overdrive badges show it. */
export function overdriveScoreFactor(multiplier: number): number {
  return multiplier * OVERDRIVE_FACTOR;
}

/** Points for one hit. Overdrive doubles them. */
export function scoreForHit(
  rating: Rating,
  multiplier: number,
  overdrive: boolean,
): number {
  const base = rating === 'PERFECT' ? 100 : rating === 'GREAT' ? 75 : 50;
  return base * (overdrive ? overdriveScoreFactor(multiplier) : multiplier);
}

/** Overdrive energy after a hit, and whether this hit ignites it. */
export function chargeOverdrive(
  energy: number,
  active: boolean,
  reactorLevel: number,
): { energy: number; ignites: boolean } {
  const reactorBonus = 1 + reactorLevel * 0.2;
  const next = Math.min(100, energy + 3.5 * reactorBonus);
  const ignites = next >= 100 && !active;
  return { energy: ignites ? 100 : next, ignites };
}

/** Rhythm regularity from the last ten keystroke times. */
export function cadenceAfterHit(times: number[], previous: number): number {
  if (times.length < 4) return previous;
  const intervals: number[] = [];
  for (let i = 1; i < times.length; i++) {
    intervals.push(times[i] - times[i - 1]);
  }
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  if (mean > 0) {
    const variance =
      intervals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / intervals.length;
    const cv = Math.sqrt(variance) / mean;
    return Math.max(30, Math.min(100, Math.round(100 - cv * 65)));
  }
  return previous;
}

export function cadenceAfterMiss(previous: number): number {
  return Math.max(25, previous - 15);
}

/** The Run's numbers after a Miss: shields absorb it, otherwise the Streak breaks. */
export function applyMiss(
  perf: LivePerformance,
  cadence: number,
): { perf: LivePerformance; shielded: boolean } {
  const base = {
    incorrectKeystrokes: perf.incorrectKeystrokes + 1,
    totalKeystrokes: perf.totalKeystrokes + 1,
    cadenceConsistency: cadence,
  };
  if (perf.shieldsRemaining > 0) {
    return {
      shielded: true,
      perf: {
        ...perf,
        shieldsRemaining: perf.shieldsRemaining - 1,
        ...base,
      },
    };
  }
  return {
    shielded: false,
    perf: {
      ...perf,
      currentStreak: 0,
      multiplier: 1,
      hyperspaceActive: false,
      hyperspaceEnergy: Math.max(0, perf.hyperspaceEnergy - 25),
      ...base,
    },
  };
}

// ---- Telemetry, Stars and Credits ---------------------------------------

export function accuracyOf(perf: LivePerformance): number {
  return perf.totalKeystrokes > 0
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round((perf.correctKeystrokes / perf.totalKeystrokes) * 100),
        ),
      )
    : 100;
}

/** Live WPM and accuracy for the HUD. */
export function telemetry(
  prev: LivePerformance,
  elapsedSeconds: number,
): LivePerformance {
  const minutes = elapsedSeconds / 60;
  const grossWpm = Math.round(prev.totalKeystrokes / 5 / minutes) || 0;
  const netWpm =
    Math.max(
      0,
      Math.round(
        (prev.correctKeystrokes - prev.incorrectKeystrokes) / 5 / minutes,
      ),
    ) || 0;
  return {
    ...prev,
    timeElapsedSeconds: Math.round(elapsedSeconds),
    grossWpm,
    netWpm,
    accuracy: accuracyOf(prev),
  };
}

export interface RunOutcome {
  wpm: number;
  accuracy: number;
  starsEarned: number;
  creditsEarned: number;
}

/** WPM, accuracy, Stars and Credits for a cleared Run. */
export function scoreRun(
  perf: LivePerformance,
  elapsedSeconds: number,
  thresholds: Stage['starThresholds'],
): RunOutcome {
  const minutes = elapsedSeconds / 60;
  const wpm = Math.max(
    0,
    Math.round(
      (perf.correctKeystrokes - perf.incorrectKeystrokes) / 5 / minutes,
    ),
  );
  const accuracy = accuracyOf(perf);

  let starsEarned = 0;
  if (accuracy >= thresholds.oneStarAccuracy) starsEarned = 1;
  if (
    starsEarned >= 1 &&
    wpm >= thresholds.twoStarWpm &&
    accuracy >= thresholds.twoStarAccuracy
  ) {
    starsEarned = 2;
  }
  if (
    starsEarned >= 2 &&
    wpm >= thresholds.threeStarWpm &&
    accuracy >= thresholds.threeStarAccuracy &&
    perf.maxStreak >= thresholds.threeStarMinStreak
  ) {
    starsEarned = 3;
  }

  const creditsEarned = 100 + starsEarned * 75 + Math.round(perf.score / 200);
  return { wpm, accuracy, starsEarned, creditsEarned };
}
