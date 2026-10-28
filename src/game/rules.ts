/**
 * The rules of a Run, as plain functions: Judgement, scoring, Streak,
 * Multiplier, Overdrive, shields, Drone movement, telemetry, Stars and
 * Credits. No React, PixiJS, DOM or sound in here.
 *
 * The whole keystroke is one function, `strike`, and the whole step is
 * another, `tick`, both over one `RunState`. The Run module applies their
 * results; everything else in this file is a helper of those two, Stars and
 * Credits, or something the HUD and the deck read.
 *
 * The numbers and windows are the original game's, except that every Run now
 * falls at one Drone speed (`DRONE_SPEED`).
 */
import { getNoteLaneAndFinger, type Stage } from '../curriculum/curriculum';
import type { FingerZone } from '../curriculum/keyboardLayout';
import { STEP_MS } from './clock';
import type { Moment } from './moments';
import type { Loadout } from './profile';

/** How close to the Strike Line a hit landed: Perfect, Great or Good. */
export type Grade = 'perfect' | 'great' | 'good';

/** A Drone: one character of the Stage's text, falling down its lane. */
export interface FallingNote {
  id: string;
  char: string;
  displayChar: string; // e.g. "␣" for space
  lane: number; // 0 to 8
  finger: FingerZone;
  yPercent: number; // 0 to 100 on canvas
  isTargetLocked?: boolean;
}

/** The live numbers of a Run: score, Streak, Overdrive, keystroke counts, WPM, Accuracy. */
export interface LivePerformance {
  score: number;
  currentStreak: number;
  maxStreak: number;
  multiplier: number; // 1, 2, 3, 4
  hyperspaceActive: boolean;
  hyperspaceEnergy: number; // 0 to 100
  shieldsRemaining: number;
  correctKeystrokes: number;
  incorrectKeystrokes: number;
  totalKeystrokes: number;
  grossWpm: number;
  netWpm: number;
  accuracy: number;
  /** The typed position: the index in the Stage's text of the character to type next. */
  currentCharIndex: number;
  timeElapsedSeconds: number;
  cadenceConsistency: number; // 0 to 100% rhythm regularity between keystrokes
}

/** Where a Drone waits for the player, as a percentage down the Action Deck. */
export const STRIKE_LINE_Y = 84;

/**
 * What judging one keystroke produced. Exactly one per keystroke that counts.
 * `key` is the key the player pressed. A hit also says the points it scored
 * and whether Overdrive doubled them, the same numbers the score was given.
 */
export type Judgement =
  | {
      type: 'hit';
      grade: Grade;
      key: string;
      points: number;
      overdrive: boolean;
    }
  | { type: 'miss'; key: string }
  | { type: 'shield'; key: string };

/** What a keydown says besides its key: how it was pressed. */
export interface KeyOptions {
  /** An auto-repeat keydown, as when a key is held. */
  repeat?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

/**
 * Whether a keydown can be a hit or a Miss: only a key that types one
 * character (a letter, digit, symbol or Space). Escape, Backspace, Enter, the
 * arrows, function keys, Tab, CapsLock and modifiers have longer names and
 * never count, and an auto-repeat keydown is dropped before it is judged.
 * Neither does a shortcut such as Cmd+R or Ctrl+Z, which types nothing. (Ctrl
 * with Alt is how some layouts type AltGr characters, so that pair counts.)
 */
export function countsAsKeystroke(
  key: string,
  { repeat, ctrlKey, metaKey, altKey }: KeyOptions = {},
): boolean {
  if (repeat || metaKey || (ctrlKey && !altKey)) return false;
  return Array.from(key).length === 1;
}

// ---- The Run's state ----------------------------------------------------

/** What the rules read of the Run's key stats: how often a character was hit or missed. */
export type KeyStats = Record<string, { hits: number; misses: number }>;

/**
 * Everything a Run is, as one value: the live numbers, the Drones, the Stage,
 * the typed position (`performance.currentCharIndex`), the per-key stats, the
 * last ten keystroke times and the Miss marks. `strike` and `tick` take one
 * and give the next; nothing in it is changed in place.
 */
export interface RunState {
  performance: LivePerformance;
  /** The lead Drone is first; the Strike Line is y=84. */
  drones: FallingNote[];
  stage: Stage;
  /** The positions in the text where a wrong key was pressed: the Miss marks. */
  errorIndices: ReadonlySet<number>;
  keyStats: KeyStats;
  /** Run Time (ms) of the last ten hits, for cadence. */
  recentKeystrokeTimes: number[];
  /** The key the player has down, or null. */
  lastPressedKey: string | null;
}

/** When a rule runs: the Run's step count, and the wall clock for a Drone's id. */
export interface RunTime {
  /** Steps of 1/60 s the Run has run for, this one included. */
  steps: number;
  /** Milliseconds on the wall clock. Only names Drones. */
  now: number;
}

/** A Run with nothing in flight: no Drones, no marks, the numbers at their start. */
export function idleRun(stage: Stage, loadout: Loadout): RunState {
  return {
    performance: freshPerformance(loadout.shields),
    drones: [],
    stage,
    errorIndices: new Set<number>(),
    keyStats: {},
    recentKeystrokeTimes: [],
    lastPressedKey: null,
  };
}

/** A fresh Run of `stage`, with its first Drones seeded. */
export function startRun(
  stage: Stage,
  loadout: Loadout,
  now: number,
): RunState {
  return { ...idleRun(stage, loadout), drones: seedDrones(stage, now) };
}

function freshPerformance(shields: number): LivePerformance {
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
    isTargetLocked,
  };
}

/** The first seven Drones of a Run. */
function seedDrones(stage: Stage, now: number): FallingNote[] {
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
function advanceDroneQueue(
  drones: FallingNote[],
  hit: FallingNote | undefined,
  nextCharIndex: number,
  text: string,
  now: number,
): FallingNote[] {
  const remaining = drones.filter((n) => n.id !== hit?.id);
  const upcomingIdx = nextCharIndex + 6;
  if (upcomingIdx < text.length) {
    remaining.push(makeDrone(text[upcomingIdx], upcomingIdx, now, 0, false));
  }
  return remaining.map((n, idx) =>
    idx === 0 ? { ...n, isTargetLocked: true } : n,
  );
}

/**
 * The one Drone speed, FAST, for every Run: the lead Drone falls `leadStep`
 * (a percentage of the Action Deck) every 1/60 s, and each Drone behind it
 * closes `followerEasing` of its way to its slot.
 */
const DRONE_SPEED = { leadStep: 2.2, followerEasing: 0.22 } as const;

/** One 60 Hz step of Drone movement. */
function moveDrones(drones: FallingNote[]): FallingNote[] {
  const { leadStep, followerEasing } = DRONE_SPEED;

  return drones.map((note, idx) => {
    if (idx === 0) {
      if (note.yPercent >= 83.5) {
        return { ...note, yPercent: STRIKE_LINE_Y, isTargetLocked: true };
      }
      const nextY = Math.min(STRIKE_LINE_Y, note.yPercent + leadStep);
      return {
        ...note,
        yPercent: nextY,
        isTargetLocked: nextY >= 83.5,
      };
    }

    const slotY = Math.max(6, STRIKE_LINE_Y - idx * 16);
    const nextY = note.yPercent + (slotY - note.yPercent) * followerEasing;
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
function judge(droneY: number | undefined, precisionSensors: number): Grade {
  if (droneY === undefined) return 'great';
  const sensorBonus = precisionSensors * 3.5;
  const diff = Math.abs(droneY - STRIKE_LINE_Y);
  if (diff <= 8 + sensorBonus) return 'perfect';
  if (diff <= 16 + sensorBonus) return 'great';
  return 'good';
}

function multiplierForStreak(streak: number): number {
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
  grade: Grade,
  multiplier: number,
  overdrive: boolean,
): number {
  const base = grade === 'perfect' ? 100 : grade === 'great' ? 75 : 50;
  return base * (overdrive ? overdriveScoreFactor(multiplier) : multiplier);
}

/** Overdrive energy after a hit, and whether this hit ignites it. */
function chargeOverdrive(
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
function cadenceAfterHit(times: number[], previous: number): number {
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

function cadenceAfterMiss(previous: number): number {
  return Math.max(25, previous - 15);
}

/** The Run's numbers after a Miss: shields absorb it, otherwise the Streak breaks. */
function applyMiss(
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

// ---- The keystroke and the step -----------------------------------------

/** What striking a key did. */
export interface StrikeResult {
  run: RunState;
  /** What judging it produced, or null when there was nothing to judge (no character left to type). */
  judgement: Judgement | null;
  /** What happened, in order: the Judgement with its Drone, then Overdrive catching fire. */
  moments: Moment[];
  /** The last character was typed. */
  cleared: boolean;
}

/**
 * The whole keystroke: the player strikes `key` against the character the Run
 * is on. `key` is one that counts (see `countsAsKeystroke`). A right key is
 * judged against the lead Drone for the character, scored, adds to the Streak
 * and Overdrive's charge and moves the Run on; a wrong key is a Miss, which a
 * shield absorbs or else breaks the Streak. The loadout is what the player's
 * Upgrades give the Run: Sensors widen the windows, the Reactor charges
 * Overdrive faster, and the shields were counted when the Run began.
 */
export function strike(
  run: RunState,
  key: string,
  loadout: Loadout,
  time: RunTime,
): StrikeResult {
  const { performance, stage } = run;
  const index = performance.currentCharIndex;
  const target = stage.sampleText[index];
  if (!target) {
    return {
      run: { ...run, lastPressedKey: key },
      judgement: null,
      moments: [],
      cleared: false,
    };
  }

  const stats = run.keyStats[target] ?? { hits: 0, misses: 0 };

  if (key !== target) {
    const { perf, shielded } = applyMiss(
      performance,
      cadenceAfterMiss(performance.cadenceConsistency),
    );
    const judgement = { type: shielded ? 'shield' : 'miss', key } as const;
    return {
      run: {
        ...run,
        performance: withAccuracy(perf),
        errorIndices: new Set(run.errorIndices).add(index),
        keyStats: {
          ...run.keyStats,
          [target]: { ...stats, misses: stats.misses + 1 },
        },
        lastPressedKey: key,
      },
      judgement,
      moments: [judgement],
      cleared: false,
    };
  }

  // Judge the Strike against the lead Drone for this character.
  const drone = run.drones.find((d) => d.char === target);
  // A Run that is running always has a Drone for the character to type.
  if (!drone) throw new Error(`No Drone for "${target}" in a running Run`);
  const grade = judge(drone.yPercent, loadout.sensors);
  const streak = performance.currentStreak + 1;
  const multiplier = multiplierForStreak(streak);
  const points = scoreForHit(grade, multiplier, performance.hyperspaceActive);
  const charge = chargeOverdrive(
    performance.hyperspaceEnergy,
    performance.hyperspaceActive,
    loadout.reactor,
  );
  const nextIndex = index + 1;

  // Inter-keystroke intervals, for steady cadence and rhythm scoring.
  const keystrokeTimes = [
    ...run.recentKeystrokeTimes,
    time.steps * STEP_MS,
  ].slice(-10);

  const judgement: Judgement = {
    type: 'hit',
    grade,
    key,
    points,
    overdrive: performance.hyperspaceActive,
  };
  // The Drone carries its lane and finger.
  const moments: Moment[] = [
    {
      ...judgement,
      droneId: drone.id,
      lane: drone.lane,
      finger: drone.finger,
    },
  ];
  // Overdrive catching fire comes right after the hit that lit it.
  if (charge.ignites) moments.push({ type: 'ignition' });

  return {
    run: {
      ...run,
      performance: withAccuracy({
        ...performance,
        score: performance.score + points,
        currentStreak: streak,
        maxStreak: Math.max(performance.maxStreak, streak),
        multiplier,
        hyperspaceActive: charge.ignites ? true : performance.hyperspaceActive,
        hyperspaceEnergy: charge.energy,
        correctKeystrokes: performance.correctKeystrokes + 1,
        totalKeystrokes: performance.totalKeystrokes + 1,
        currentCharIndex: nextIndex,
        cadenceConsistency: cadenceAfterHit(
          keystrokeTimes,
          performance.cadenceConsistency,
        ),
      }),
      drones: advanceDroneQueue(
        run.drones,
        drone,
        nextIndex,
        stage.sampleText,
        time.now,
      ),
      keyStats: {
        ...run.keyStats,
        [target]: { ...stats, hits: stats.hits + 1 },
      },
      recentKeystrokeTimes: keystrokeTimes,
      lastPressedKey: key,
    },
    judgement,
    moments,
    cleared: nextIndex >= stage.sampleText.length,
  };
}

/** The telemetry tick: every 30 steps, which is 500 ms at 60 steps a second. */
const TELEMETRY_EVERY_STEPS = 30;

/**
 * The whole step: the Drones move one step of 1/60 s, and every 30th step of
 * Run Time WPM and elapsed time refresh. Accuracy is not on this cadence: a
 * keystroke refreshes it. `steps` is the Run's step count, this step included,
 * so a pause doesn't shift the rhythm.
 */
export function tick(run: RunState, steps: number): RunState {
  const moved = { ...run, drones: moveDrones(run.drones) };
  if (steps % TELEMETRY_EVERY_STEPS !== 0) return moved;
  const elapsedSeconds = Math.max(1, (steps * STEP_MS) / 1000);
  return {
    ...moved,
    performance: telemetry(run.performance, elapsedSeconds),
  };
}

/** The Run's numbers once it is cleared: the Streak, Multiplier and Overdrive are over. */
export function clearedPerformance(perf: LivePerformance): LivePerformance {
  return {
    ...perf,
    hyperspaceActive: false,
    hyperspaceEnergy: 0,
    multiplier: 1,
    currentStreak: 0,
  };
}

// ---- Telemetry, Stars and Credits ---------------------------------------

/** Accuracy follows every keystroke: it is worked out from the Run's counts each time. */
function withAccuracy(perf: LivePerformance): LivePerformance {
  return { ...perf, accuracy: accuracyOf(perf) };
}

function accuracyOf(perf: LivePerformance): number {
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

/** Live WPM and elapsed time for the HUD. Accuracy follows every keystroke instead (see `strike`). */
function telemetry(
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
