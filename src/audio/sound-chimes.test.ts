import { afterEach, expect, it, vi } from 'vitest';
import { RETURNING_PLAYER } from '../../tests/shared/saves';
import { engineSound } from './engineSound';
import {
  clearStage,
  loadGame,
  STAGE_ID,
  startStage,
} from '../game/testHelpers';

/**
 * Clearing a Stage plays the victory fanfare and then one chime per Star, one
 * after the other. The pause between them is real wall-clock time in the
 * sound adapter (a setTimeout per chime) and nothing else in the code runs on
 * it, so this is the one test that uses fake timers. It plays the real
 * adapter against a stand-in for the sound engine, which needs an
 * AudioContext, and reads what the engine was asked to play.
 */

const engine = vi.hoisted(() => ({ played: [] as string[] }));

vi.mock('./soundEngine', () => ({
  soundEngine: new Proxy(
    {},
    {
      get:
        (_target, method: string) =>
        (...args: unknown[]) => {
          if (method === 'playStageVictory') engine.played.push('victory');
          if (method === 'playStarChime')
            engine.played.push(`chime:${args[0]}`);
        },
    },
  ),
}));

afterEach(() => {
  vi.useRealTimers();
  engine.played.length = 0;
});

// A fast clean clear is 3 Stars; Misses before the first correct key take Stars off.
it.each([
  { stars: 3, missesFirst: 0 },
  { stars: 2, missesFirst: 4 },
  { stars: 1, missesFirst: 14 },
  { stars: 0, missesFirst: 15 },
])(
  'plays the fanfare, then $stars chime(s) one after the other',
  ({ stars, missesFirst }) => {
    vi.useFakeTimers();
    const { game } = loadGame(RETURNING_PLAYER, engineSound);
    startStage(game, STAGE_ID);

    clearStage(game, { seconds: 60, missesFirst });

    expect(
      game.getState().debrief?.starsEarned,
      'Stars the Debrief shows',
    ).toBe(stars);
    expect(engine.played, 'right at the clear: the fanfare alone').toEqual([
      'victory',
    ]);

    // Two seconds in 50 ms slices, so the order the chimes fire in is seen.
    for (let i = 0; i < 40; i++) vi.advanceTimersByTime(50);
    const chimes = Array.from({ length: stars }, (_, i) => `chime:${i + 1}`);
    expect(engine.played, 'fanfare first, then the chimes in order').toEqual([
      'victory',
      ...chimes,
    ]);
  },
);
