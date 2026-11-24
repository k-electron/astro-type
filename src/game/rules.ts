/**
 * The rules of a Run, as plain functions: Judgement, scoring, clean words,
 * Streak, Multiplier, Overdrive, Drone movement, live WPM, Stars and
 * Credits. No React, PixiJS, DOM or sound in here.
 *
 * The whole keystroke is one function, `strike`, and the whole step is
 * another, `tick`, both over one `Run`. The Run module applies their
 * results; everything else in this file is a helper of those two, Stars and
 * Credits, or something the HUD and the deck read.
 *
 * Every Run falls at one Drone speed (`DRONE_SPEED`). A hit is a hit wherever
 * its Drone was: nothing here grades timing.
 */
import {
  keyForCharacter,
  type SectorStage,
  type Stage,
} from '../curriculum/curriculum';
import type { FingerZone } from '../curriculum/keyboardLayout';
import {
  type FlightLog,
  type Keystroke,
  recordKeystroke,
  type ShiftSide,
} from '../analytics/keystroke';
import { STEP_MS } from './clock';
import type { Moment } from './moments';
import type { StageResult } from './profile';

/** A Drone: one character of the Stage's text, falling down its lane. */
export interface Drone {
  id: string;
  char: string;
  lane: number; // 0 to 8
  finger: FingerZone;
  yPercent: number; // 0 to 100 on canvas
}

/** The live numbers of a Run: score, Streak, Overdrive, keystroke counts, WPM, Accuracy. */
export interface LivePerformance {
  score: number;
  currentStreak: number;
  maxStreak: number;
  multiplier: number; // 1, 2, 3, 4
  overdriveActive: boolean;
  overdriveEnergy: number; // 0 to 100
  correctKeystrokes: number;
  incorrectKeystrokes: number;
  totalKeystrokes: number;
  /** How many clean words the Run has finished so far. */
  cleanWords: number;
  /** Gross WPM over Typing Time so far, exact; null until there is one (see `grossWpm`). */
  wpm: number | null;
  accuracy: number;
  /** The typed position: the index in the Stage's text of the character to type next. */
  currentCharIndex: number;
  rhythm: number; // 0 to 100% rhythm regularity between keystrokes
}

/** Where a Drone waits for the player, as a percentage down the Action Deck. */
export const STRIKE_LINE_Y = 84;

/** A word typed with no Miss mark, finished by the hit that carries it. */
export interface CleanWord {
  /** The word's characters, without the space that finished it. */
  word: string;
  /** The bonus the word paid, on top of the hit's points. */
  bonus: number;
}

/**
 * What judging one keystroke produced. Exactly one per keystroke that counts:
 * a hit for the right key, or a Miss for a wrong one. `key` is the key the
 * player pressed. A hit says the points it scored and whether Overdrive
 * doubled them, the same numbers the score was given; the Streak and
 * Multiplier it made; and, when it finished a clean word, the word and its
 * bonus (which is not in `points`) and how many clean words the Run has
 * finished so far, this one included.
 */
export type Judgement =
  | {
      type: 'hit';
      key: string;
      points: number;
      overdrive: boolean;
      /** The Streak after this hit, and its Multiplier. */
      streak: number;
      multiplier: number;
      /** This hit's Streak is a milestone (see `isStreakMilestone`). */
      milestone: boolean;
      cleanWord: CleanWord | null;
      cleanWords: number;
    }
  | { type: 'miss'; key: string };

/** What a keydown says besides its key: how it was pressed. */
export interface KeyOptions {
  /** An auto-repeat keydown, as when a key is held. */
  repeat?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  /** Which Shift the player held, as the keyboard saw it. Left out, no Shift. */
  shift?: ShiftSide;
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

/**
 * Everything a Run is, as one value: the live numbers, the Drones, the Stage,
 * the typed position (`currentCharIndex`), the Flight log, the last ten
 * keystroke times and the Miss marks. `strike` and `tick` take one and give
 * the next; nothing in it is changed in place. It is also what the snapshot's
 * `run` is.
 */
export type Run = LivePerformance & {
  /** The lead Drone is first; the Strike Line is y=84. */
  drones: Drone[];
  stage: Stage;
  /** The positions in the text where a wrong key was pressed: the Miss marks. */
  errorIndices: ReadonlySet<number>;
  /** Every Keystroke judged so far, in order. */
  flightLog: FlightLog;
  /** Run Time (ms) of the last ten hits, for Rhythm. */
  recentKeystrokeTimes: number[];
  /** The key the player has down (the Action Deck's pressed keycap), or null. */
  lastPressedKey: string | null;
  /** The step of the Run's first keystroke, right or wrong, or null before it. Typing Time starts here. */
  firstKeystrokeStep: number | null;
  /** The step of the latest keystroke, right or wrong. At the clear it is the clearing one, where Typing Time ends. */
  lastKeystrokeStep: number | null;
};

/** When a rule runs: the Run's step count, and the wall clock for a Drone's id. */
export interface RunTime {
  /** Steps of 1/60 s the Run has run for, this one included. */
  steps: number;
  /** Milliseconds on the wall clock. Only names Drones. */
  now: number;
}

/** A Run with nothing in flight: no Drones, no marks, the numbers at their start. */
export function idleRun(stage: Stage): Run {
  return {
    ...freshPerformance(),
    drones: [],
    stage,
    errorIndices: new Set<number>(),
    flightLog: [],
    recentKeystrokeTimes: [],
    lastPressedKey: null,
    firstKeystrokeStep: null,
    lastKeystrokeStep: null,
  };
}

/** A fresh Run of `stage`, with its first Drones seeded. */
export function startRun(stage: Stage, now: number): Run {
  return { ...idleRun(stage), drones: seedDrones(stage, now) };
}

function freshPerformance(): LivePerformance {
  return {
    score: 0,
    currentStreak: 0,
    maxStreak: 0,
    multiplier: 1,
    overdriveActive: false,
    overdriveEnergy: 0,
    correctKeystrokes: 0,
    incorrectKeystrokes: 0,
    totalKeystrokes: 0,
    cleanWords: 0,
    wpm: null,
    accuracy: 100,
    currentCharIndex: 0,
    rhythm: 100,
  };
}

// ---- Drones -------------------------------------------------------------

function makeDrone(
  char: string,
  index: number,
  now: number,
  yPercent: number,
): Drone {
  // Every character of a Stage's text has a key: the curriculum's check and
  // Free Flight's text check see to that.
  const typed = keyForCharacter(char);
  if (!typed) throw new Error(`The keyboard can't type "${char}"`);
  const { lane, finger } = typed;
  return {
    id: `drone-${index}-${char}-${now}`,
    char,
    lane,
    finger,
    yPercent,
  };
}

/** The first seven Drones of a Run. */
function seedDrones(stage: Stage, now: number): Drone[] {
  const text = stage.sampleText.slice(0, 7);
  const drones: Drone[] = [];
  for (let i = 0; i < text.length; i++) {
    drones.push(makeDrone(text[i], i, now, Math.max(6, 62 - i * 14)));
  }
  return drones;
}

/**
 * The Drones after the lead one is hit: the hit Drone leaves, a new one
 * enters at the top for the character six ahead.
 */
function advanceDroneQueue(
  drones: Drone[],
  hit: Drone | undefined,
  nextCharIndex: number,
  text: string,
  now: number,
): Drone[] {
  const remaining = drones.filter((n) => n.id !== hit?.id);
  const upcomingIdx = nextCharIndex + 6;
  if (upcomingIdx < text.length) {
    remaining.push(makeDrone(text[upcomingIdx], upcomingIdx, now, 0));
  }
  return remaining;
}

/**
 * The one Drone speed, FAST, for every Run: the lead Drone falls `leadStep`
 * (a percentage of the Action Deck) every 1/60 s, and each Drone behind it
 * closes `followerEasing` of its way to its slot.
 */
const DRONE_SPEED = { leadStep: 2.2, followerEasing: 0.22 } as const;

/** One 60 Hz step of Drone movement. */
function moveDrones(drones: Drone[]): Drone[] {
  const { leadStep, followerEasing } = DRONE_SPEED;

  return drones.map((drone, idx) => {
    if (idx === 0) {
      if (drone.yPercent >= 83.5) {
        return { ...drone, yPercent: STRIKE_LINE_Y };
      }
      return {
        ...drone,
        yPercent: Math.min(STRIKE_LINE_Y, drone.yPercent + leadStep),
      };
    }

    const slotY = Math.max(6, STRIKE_LINE_Y - idx * 16);
    const nextY = drone.yPercent + (slotY - drone.yPercent) * followerEasing;
    return { ...drone, yPercent: nextY };
  });
}

// ---- Judgement, scoring, Streak, Multiplier, Overdrive ------------------

/**
 * The Multiplier at each Streak: x1 to start, then x2, x3 and x4 from the
 * Streak that is listed. The one place these steps are written.
 */
export const MULTIPLIER_STEPS = [
  { streak: 0, multiplier: 1 },
  { streak: 10, multiplier: 2 },
  { streak: 20, multiplier: 3 },
  { streak: 30, multiplier: 4 },
] as const;

/** The x2 step of the table, for the badges that start there. */
export const X2_STEP = MULTIPLIER_STEPS[1];
/** The x3 step of the table, for what lights up from there. */
export const X3_STEP = MULTIPLIER_STEPS[2];

function multiplierForStreak(streak: number): number {
  let multiplier = 1;
  for (const step of MULTIPLIER_STEPS) {
    if (streak >= step.streak) multiplier = step.multiplier;
  }
  return multiplier;
}

/** What Overdrive multiplies each hit's base points by. */
const OVERDRIVE_FACTOR = 2;

/** The number each hit's base points are multiplied by, as the Overdrive badges show it. */
export function overdriveScoreFactor(multiplier: number): number {
  return multiplier * OVERDRIVE_FACTOR;
}

/** What every hit scores before the Multiplier, wherever its Drone was. */
const HIT_POINTS = 100;

/** What a clean word pays for each of its characters before the Multiplier. */
const CLEAN_WORD_POINTS_PER_CHARACTER = 50;

/** The factor a hit's points are multiplied by: the Multiplier, and Overdrive doubles it. */
function scoreFactor(multiplier: number, overdrive: boolean): number {
  return overdrive ? overdriveScoreFactor(multiplier) : multiplier;
}

/** Points for one hit: 100 times the Multiplier. Overdrive doubles them. */
export function scoreForHit(multiplier: number, overdrive: boolean): number {
  return HIT_POINTS * scoreFactor(multiplier, overdrive);
}

/**
 * The bonus for a clean word of `characters` characters (the space that
 * finishes it not counted): 50 each, times the Multiplier, doubled by
 * Overdrive.
 */
export function cleanWordBonus(
  characters: number,
  multiplier: number,
  overdrive: boolean,
): number {
  return (
    CLEAN_WORD_POINTS_PER_CHARACTER *
    characters *
    scoreFactor(multiplier, overdrive)
  );
}

/**
 * Whether a Streak is a milestone: 10, 20 and 30 (x2, x3 and x4), then every
 * 25 after (55, 80, 105...). A milestone gets a banner and a chime.
 */
export function isStreakMilestone(streak: number): boolean {
  if (streak > 30) return (streak - 30) % 25 === 0;
  return MULTIPLIER_STEPS.some(
    (step) => step.streak > 0 && step.streak === streak,
  );
}

/**
 * The clean word the hit at `index` finishes, or null. A word is the run of
 * characters between spaces, punctuation included. It is finished by the space
 * after it, or by the Stage's last character. It is clean when none of its
 * characters, the finishing space included, carries a Miss mark. A run of
 * spaces holds no word.
 */
function finishedCleanWord(
  text: string,
  index: number,
  errorIndices: ReadonlySet<number>,
): string | null {
  const finishesWord = text[index] === ' ' || index === text.length - 1;
  if (!finishesWord) return null;
  const end = text[index] === ' ' ? index : index + 1;
  let start = end;
  while (start > 0 && text[start - 1] !== ' ') start--;
  if (start === end) return null;
  for (let i = start; i <= index; i++) {
    if (errorIndices.has(i)) return null;
  }
  return text.slice(start, end);
}

/** Overdrive energy after a hit, and whether this hit ignites it. */
function chargeOverdrive(
  energy: number,
  active: boolean,
): { energy: number; ignites: boolean } {
  const next = Math.min(100, energy + 3.5);
  const ignites = next >= 100 && !active;
  return { energy: ignites ? 100 : next, ignites };
}

/** Rhythm regularity from the last ten keystroke times. */
function rhythmAfterHit(times: number[], previous: number): number {
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

function rhythmAfterMiss(previous: number): number {
  return Math.max(25, previous - 15);
}

/** How even a Rhythm is, as the HUD and the Debrief name it. */
export type RhythmBand = 'Steady' | 'Paced' | 'Uneven';

/** Where the bands start: Steady from 85%, Paced from 70%, Uneven below. */
export const RHYTHM_BAND_FLOORS = { Steady: 85, Paced: 70 } as const;

/** The band a Rhythm falls in. */
export function rhythmBand(rhythm: number): RhythmBand {
  if (rhythm >= RHYTHM_BAND_FLOORS.Steady) return 'Steady';
  if (rhythm >= RHYTHM_BAND_FLOORS.Paced) return 'Paced';
  return 'Uneven';
}

/** The Run's numbers after a Miss: the Streak always breaks. */
function applyMiss(run: Run, rhythm: number): Run {
  return {
    ...run,
    currentStreak: 0,
    multiplier: 1,
    overdriveActive: false,
    overdriveEnergy: Math.max(0, run.overdriveEnergy - 25),
    incorrectKeystrokes: run.incorrectKeystrokes + 1,
    totalKeystrokes: run.totalKeystrokes + 1,
    rhythm,
  };
}

// ---- The keystroke and the step -----------------------------------------

/** What striking a key did. */
export interface StrikeResult {
  run: Run;
  /** What happened, in order: the Judgement with its Drone, then Overdrive catching fire. */
  moments: Moment[];
  /** The last character was typed. */
  cleared: boolean;
}

/**
 * The whole keystroke: the player strikes `key` against the character the Run
 * is on. `key` is one that counts (see `countsAsKeystroke`). A right key is
 * a hit, scored, adds to the Streak and Overdrive's charge and moves the Run
 * on, and the hit that finishes a clean word pays its bonus; a wrong key is a
 * Miss, which always breaks the Streak.
 */
export function strike(
  run: Run,
  key: string,
  time: RunTime,
  shift: ShiftSide = 'none',
): StrikeResult {
  const { stage } = run;
  const index = run.currentCharIndex;
  const target = stage.sampleText[index];
  if (!target) {
    return {
      run: { ...run, lastPressedKey: key },
      moments: [],
      cleared: false,
    };
  }

  // Only a Miss can come before a hit on the same character, so a character
  // with no Miss mark yet is getting its First attempt.
  const firstAttempt = !run.errorIndices.has(index);
  // The Keystroke carries the Run's numbers just after it, as the HUD shows
  // them (`wpm` is the HUD's own, which only `tick` refreshes).
  const stamped = (after: Run): Run => ({
    ...after,
    flightLog: recordKeystroke(after.flightLog, {
      index,
      expected: target,
      pressed: key,
      firstAttempt,
      step: time.steps,
      shift,
      streak: after.currentStreak,
      accuracy: after.accuracy,
      rhythm: after.rhythm,
      wpm: after.wpm,
    } satisfies Keystroke),
  });
  // Typing Time starts at the Run's first keystroke, right or wrong.
  const keystrokeSteps = {
    firstKeystrokeStep: run.firstKeystrokeStep ?? time.steps,
    lastKeystrokeStep: time.steps,
  };

  if (key !== target) {
    const missed = applyMiss(run, rhythmAfterMiss(run.rhythm));
    const judgement = { type: 'miss', key } as const;
    return {
      run: stamped({
        ...withAccuracy({
          ...missed,
          errorIndices: new Set(run.errorIndices).add(index),
        }),
        lastPressedKey: key,
        ...keystrokeSteps,
      }),
      moments: [judgement],
      cleared: false,
    };
  }

  // A right key is a hit, wherever its Drone is. The Drone is the one the
  // moment names, for the deck.
  const drone = run.drones.find((d) => d.char === target);
  // A Run that is running always has a Drone for the character to type.
  if (!drone) throw new Error(`No Drone for "${target}" in a running Run`);
  const streak = run.currentStreak + 1;
  const multiplier = multiplierForStreak(streak);
  const points = scoreForHit(multiplier, run.overdriveActive);
  const word = finishedCleanWord(stage.sampleText, index, run.errorIndices);
  const cleanWord: CleanWord | null =
    word === null
      ? null
      : {
          word,
          bonus: cleanWordBonus(word.length, multiplier, run.overdriveActive),
        };
  const cleanWords = run.cleanWords + (cleanWord ? 1 : 0);
  const charge = chargeOverdrive(run.overdriveEnergy, run.overdriveActive);
  const nextIndex = index + 1;

  // Inter-keystroke intervals, for rhythm scoring.
  const keystrokeTimes = [
    ...run.recentKeystrokeTimes,
    time.steps * STEP_MS,
  ].slice(-10);

  const judgement: Judgement = {
    type: 'hit',
    key,
    points,
    overdrive: run.overdriveActive,
    streak,
    multiplier,
    milestone: isStreakMilestone(streak),
    cleanWord,
    cleanWords,
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
    run: stamped(
      withAccuracy({
        ...run,
        score: run.score + points + (cleanWord?.bonus ?? 0),
        cleanWords,
        currentStreak: streak,
        maxStreak: Math.max(run.maxStreak, streak),
        multiplier,
        overdriveActive: charge.ignites ? true : run.overdriveActive,
        overdriveEnergy: charge.energy,
        correctKeystrokes: run.correctKeystrokes + 1,
        totalKeystrokes: run.totalKeystrokes + 1,
        currentCharIndex: nextIndex,
        rhythm: rhythmAfterHit(keystrokeTimes, run.rhythm),
        drones: advanceDroneQueue(
          run.drones,
          drone,
          nextIndex,
          stage.sampleText,
          time.now,
        ),
        recentKeystrokeTimes: keystrokeTimes,
        lastPressedKey: key,
        ...keystrokeSteps,
      }),
    ),
    moments,
    cleared: nextIndex >= stage.sampleText.length,
  };
}

/** The live WPM refresh: every 30 steps, which is 500 ms at 60 steps a second. */
const WPM_REFRESH_EVERY_STEPS = 30;

/**
 * The whole step: the Drones move one step of 1/60 s, and every 30th step of
 * Run Time WPM refreshes. Accuracy is not on this schedule: a keystroke
 * refreshes it. `steps` is the Run's step count, this step included,
 * so a pause doesn't shift the rhythm.
 */
export function tick(run: Run, steps: number): Run {
  const moved = { ...run, drones: moveDrones(run.drones) };
  if (steps % WPM_REFRESH_EVERY_STEPS !== 0) return moved;
  // Typing Time keeps running between keystrokes, so the live figure sinks.
  const typingSteps =
    run.firstKeystrokeStep === null ? 0 : steps - run.firstKeystrokeStep;
  return { ...moved, wpm: grossWpm(run.currentCharIndex, typingSteps) };
}

/** The Run's numbers once it is cleared: the Streak, Multiplier and Overdrive are over. */
export function clearedRun(run: Run): Run {
  return {
    ...run,
    overdriveActive: false,
    overdriveEnergy: 0,
    multiplier: 1,
    currentStreak: 0,
  };
}

// ---- Accuracy, WPM, Stars and Credits ---------------------------------------

/** Accuracy follows every keystroke: it is worked out from the Miss marks each time. */
function withAccuracy(run: Run): Run {
  return { ...run, accuracy: accuracyOf(run) };
}

/**
 * The share of the characters reached that carry no Miss mark, exact and
 * unrounded: screens round it down, and Stars compare it as it is. A
 * character is reached once it is typed or a wrong key has been pressed on it,
 * and however many wrong keys it got it carries one mark. The multiplication
 * comes first so a whole answer comes out whole.
 */
function accuracyOf(run: Run): number {
  const at = run.currentCharIndex;
  const reached = at + (run.errorIndices.has(at) ? 1 : 0);
  if (reached === 0) return 100;
  return ((reached - run.errorIndices.size) * 100) / reached;
}

/** Steps of 1/60 s in a minute. */
const STEPS_PER_MINUTE = 3600;

/**
 * Gross WPM: the characters typed less one, five to a word, over `typingSteps`
 * of Typing Time. No subtraction for wrong keystrokes. It is null below two
 * characters or with no Typing Time, where there is no WPM yet. The multiplication
 * comes first, on whole numbers, so a result that should be whole comes out
 * whole. The one place the formula is written.
 */
function grossWpm(characters: number, typingSteps: number): number | null {
  if (characters < 2 || typingSteps <= 0) return null;
  return ((characters - 1) * (STEPS_PER_MINUTE / 5)) / typingSteps;
}

/** Typing Time of a cleared Run, in steps: the first keystroke to the clearing one. */
function typingStepsOf(run: Run): number {
  if (run.firstKeystrokeStep === null || run.lastKeystrokeStep === null) {
    return 0;
  }
  return run.lastKeystrokeStep - run.firstKeystrokeStep;
}

/** The accuracy each Star asks for, the same on every Sector Stage: 90, 95 and 98%. */
export const STAR_ACCURACY_BARS: readonly [number, number, number] = [
  90, 95, 98,
];

/** One Star's bar on a Stage: the accuracy it asks for and, from the 2nd Star, the WPM. */
export interface StarBar {
  star: number;
  accuracy: number;
  wpm: number | null;
}

/**
 * The three Star bars of a Sector Stage, 1 Star first: the rules' accuracy
 * bars, and the Stage's own WPM for the 2nd and 3rd Star. The 1st Star has no
 * speed bar. The one place the bars are put together: scoring and every
 * screen that shows them read it.
 */
export function starBars(stage: SectorStage): readonly StarBar[] {
  const [one, two, three] = STAR_ACCURACY_BARS;
  return [
    { star: 1, accuracy: one, wpm: null },
    { star: 2, accuracy: two, wpm: stage.starThresholds.twoStarWpm },
    { star: 3, accuracy: three, wpm: stage.starThresholds.threeStarWpm },
  ];
}

/** Whether a result reaches a bar: the exact accuracy, and the WPM when the bar has one. */
const meetsBar = (bar: StarBar, accuracy: number, wpm: number): boolean =>
  accuracy >= bar.accuracy && (bar.wpm === null || wpm >= bar.wpm);

/** What scoring a cleared Run gives: the part of a Stage's result the rules work out. */
export type RunOutcome = Pick<
  StageResult,
  'wpm' | 'accuracy' | 'starsEarned' | 'creditsEarned'
>;

/**
 * WPM, accuracy, Stars and Credits for a cleared Run of `stage`. Stars
 * compare the exact WPM and accuracy. A cleared Run with no Typing Time (or a
 * text of one character) has a WPM of 0. A Free Flight is practice: no Stars,
 * and Credits for the score alone.
 */
export function scoreRun(run: Run, stage: Stage): RunOutcome {
  const wpm = grossWpm(run.currentCharIndex, typingStepsOf(run)) ?? 0;
  const accuracy = accuracyOf(run);
  const scoreCredits = Math.round(run.score / 200);

  if (stage.origin === 'free-flight') {
    return { wpm, accuracy, starsEarned: 0, creditsEarned: scoreCredits };
  }

  const [oneStar, twoStar, threeStar] = starBars(stage);
  let starsEarned = 0;
  if (accuracy >= oneStar.accuracy) starsEarned = 1;
  if (starsEarned >= 1 && meetsBar(twoStar, accuracy, wpm)) starsEarned = 2;
  if (starsEarned >= 2 && meetsBar(threeStar, accuracy, wpm)) starsEarned = 3;

  const creditsEarned = 100 + starsEarned * 75 + scoreCredits;
  return { wpm, accuracy, starsEarned, creditsEarned };
}
