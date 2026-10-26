import type { Stage } from '../types/game';
import { createGame, createMemoryStorage } from './createGame';

/** Stage 1 of Sector 1. Its Stars thresholds: 85% / 10 WPM + 92% / 14 WPM + 97% + Streak 14. */
export const STAGE_ID = 's1-l1';

/** The Stage's sample text (77 characters). The tests type it key by key. */
export const SAMPLE_TEXT =
  'f j f j ff jj fff jjj fj jf f j f j ff jj fj jf f f j j f j fj jf ff jj fj jf';

/** A key that is never a target on this Stage, so pressing it is always a Miss. */
export const WRONG_KEY = 'x';

/**
 * Steps (1/60 s each) that are enough for the lead Drone to reach the Strike Line
 * from wherever it starts, at the default speed. Pressing after this many steps is
 * always a Perfect.
 */
const STEPS_TO_REACH_LINE = 30;

export type Game = ReturnType<typeof createGame>;
type SaveSeed = Parameters<typeof createMemoryStorage>[0];

export interface Upgrades {
  deflectorShields?: number;
  hyperdriveReactor?: number;
  precisionSensors?: number;
}

/** A fresh game over an in-memory Save, optionally seeded (merged over a fresh Profile). */
export function newGame(seed?: Record<string, unknown>): Game {
  return createGame({ storage: createMemoryStorage(seed as SaveSeed) });
}

/** A fresh game with the given Upgrade levels, with Stage 1 started. */
export function startedGame(
  upgrades: Upgrades = {},
  extraSave: Record<string, unknown> = {},
): Game {
  const game = newGame({ ...extraSave, upgrades });
  game.startStage(STAGE_ID);
  return game;
}

/** The character the player has to type next. */
export function targetKey(game: Game): string {
  return SAMPLE_TEXT[game.getRun().currentCharIndex];
}

/** Press the target key `count` times, each time after the lead Drone has reached the Strike Line. */
export function hitPerfect(game: Game, count: number): void {
  for (let i = 0; i < count; i++) {
    game.step(STEPS_TO_REACH_LINE);
    game.pressKey(targetKey(game));
  }
}

export function miss(game: Game, times = 1): void {
  for (let i = 0; i < times; i++) game.pressKey(WRONG_KEY);
}

/**
 * Clear Stage 1 by typing the whole sample text with every correct key a Perfect,
 * so the Run takes exactly `seconds` of Run Time.
 *
 * - `missesFirst`: wrong keys pressed before the first correct key (Streak is 0 then,
 *   so they cost accuracy and nothing else).
 * - `missBeforeLast`: one wrong key just before the last character, ending the Streak.
 */
export function clearStage(
  game: Game,
  opts: { seconds: number; missesFirst?: number; missBeforeLast?: boolean },
): void {
  const { seconds, missesFirst = 0, missBeforeLast = false } = opts;
  const total = seconds * 60;
  const lastIndex = SAMPLE_TEXT.length - 1;
  miss(game, missesFirst);
  hitPerfect(game, lastIndex);
  game.step(total - lastIndex * STEPS_TO_REACH_LINE);
  if (missBeforeLast) miss(game);
  game.pressKey(targetKey(game));
}

/**
 * A Free Flight Stage of the player's own text. Its literals ('Free Flight
 * Drill', 'sector-custom') are copied from `handleLaunch` in
 * `CustomPracticeModal.tsx`, which builds the real one inline in a click
 * handler, so there is no constructor to import. Change both together.
 */
export function freeFlightStage(text: string): Stage {
  return {
    id: 'custom-test',
    sectorId: 'sector-custom',
    stageNumber: 0,
    title: 'Free Flight Drill',
    subtitle: 'Custom Practice Mission',
    description: 'Player tailored free-form typing session.',
    targetKeys: Array.from(new Set(text.toLowerCase().split(''))),
    sampleText: text,
    difficulty: 'Intermediate',
    targetWpm: 20,
    starThresholds: {
      oneStarAccuracy: 75,
      twoStarWpm: 20,
      twoStarAccuracy: 90,
      threeStarWpm: 26,
      threeStarAccuracy: 96,
      threeStarMinStreak: 20,
    },
  };
}

/** Type `text` key by key, each key after the lead Drone has reached the Strike Line. */
export function typeText(game: Game, text: string): void {
  for (const key of Array.from(text)) {
    game.step(STEPS_TO_REACH_LINE);
    game.pressKey(key);
  }
}
