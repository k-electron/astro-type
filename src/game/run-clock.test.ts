import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearStage,
  type Game,
  hitPerfect,
  miss,
  newGame,
  STAGE_ID,
  startedGame,
  targetKey,
} from './testHelpers';

/**
 * The Run clock: Run Time is the time a Run has spent running, pauses left
 * out. It drives the HUD timer, live and final WPM, Stars and cadence. The
 * tests step the clock by hand, 60 steps a second.
 */

const STEP_MS = 1000 / 60;
/** Ten minutes of steps: stepping this long outside a running Run must do nothing. */
const TEN_MINUTES_OF_STEPS = 10 * 60 * 60;

/** Pause the Run, let a long time go by, and carry on. */
function pauseFor(game: Game, steps = TEN_MINUTES_OF_STEPS): void {
  game.send({ type: 'PRESS_PAUSE' });
  game.step(steps);
  game.send({ type: 'PRESS_RESUME' });
}

/** What the HUD shows (Speed, Accuracy), and the cadence reading, all measured in Run Time. */
function readings(game: Game) {
  const run = game.getState().run;
  return {
    netWpm: run.netWpm,
    accuracy: run.accuracy,
    cadenceConsistency: run.cadenceConsistency,
  };
}

const droneHeights = (game: Game) =>
  game.getState().run.drones.map((drone) => drone.yPercent);

afterEach(() => {
  vi.useRealTimers();
});

describe('Run Time', () => {
  it('starts at 0 with the Run and counts the steps taken while it runs', () => {
    const game = startedGame();
    expect(game.getRunTime()).toBe(0);

    game.step(60);
    expect(game.getRunTime()).toBeCloseTo(1000, 3);

    game.step(30);
    expect(game.getRunTime()).toBeCloseTo(1500, 3);
    expect(game.getRunTime()).toBeCloseTo(90 * STEP_MS, 3);
  });

  it('stands still during a pause and carries on after it', () => {
    const game = startedGame();
    game.step(60);

    game.send({ type: 'PRESS_PAUSE' });
    expect(game.getPhase()).toBe('paused');
    game.step(TEN_MINUTES_OF_STEPS);
    expect(game.getRunTime()).toBeCloseTo(1000, 3);

    game.send({ type: 'PRESS_RESUME' });
    game.step(60);
    expect(game.getRunTime()).toBeCloseTo(2000, 3);
  });

  it.each([
    'OPEN_GALAXY_MAP',
    'OPEN_HANGAR',
    'OPEN_ANALYTICS',
    'OPEN_FREE_FLIGHT',
  ] as const)(
    'stands still behind a menu opened from the Flight Deck (%s)',
    (menu) => {
      const game = startedGame();
      game.step(60);

      game.send({ type: menu });
      expect(game.getPhase()).toBe('paused');
      game.step(600);
      expect(game.getRunTime()).toBeCloseTo(1000, 3);

      // Closing back onto the Pause Menu: still paused, still standing still.
      game.send({ type: 'PRESS_CLOSE' });
      expect(game.getScreen()).toBe('pause-menu');
      game.step(600);
      expect(game.getRunTime()).toBeCloseTo(1000, 3);
    },
  );

  it('stands still once the Stage is cleared, on the Debrief', () => {
    const game = startedGame();
    clearStage(game, { seconds: 60 });
    expect(game.getScreen()).toBe('debrief');
    expect(game.getRunTime()).toBeCloseTo(60_000, 1);

    game.step(600);
    expect(game.getRunTime()).toBeCloseTo(60_000, 1);
  });

  it('does not move before a Run has started', () => {
    const game = newGame();
    game.step(600);
    expect(game.getRunTime()).toBe(0);
  });

  it('starts again from 0 with the next Run', () => {
    const game = startedGame();
    clearStage(game, { seconds: 60 });

    game.send({ type: 'PRESS_REPLAY' });
    expect(game.getPhase()).toBe('running');
    expect(game.getRunTime()).toBe(0);
    game.step(30);
    expect(game.getRunTime()).toBeCloseTo(500, 3);
  });

  it('is not moved by keystrokes, only by steps', () => {
    const game = startedGame();
    game.step(30);
    game.pressKey(targetKey(game));
    game.pressKey('x');
    expect(game.getRunTime()).toBeCloseTo(500, 3);
  });

  it('is not the wall clock: time passing outside the steps changes nothing', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    const game = startedGame();
    game.step(60);

    vi.setSystemTime(new Date('2026-01-01T12:10:00Z'));
    expect(game.getRunTime()).toBeCloseTo(1000, 3);

    // The whole Run is judged on its 60 steps a second, not on what the
    // wall clock says: 77 keys in a minute of Run Time is 15 WPM.
    clearStage(game, { seconds: 60 });
    vi.setSystemTime(new Date('2026-01-01T12:20:00Z'));
    expect(game.getState().debrief?.wpm).toBe(15);
  });
});

describe('the Run clock steps only while the Run is running', () => {
  it('leaves the Drones where they are during a pause and behind menus', () => {
    const game = startedGame();
    game.step(5);
    const inFlight = droneHeights(game);

    game.send({ type: 'PRESS_PAUSE' });
    game.step(600);
    expect(droneHeights(game)).toEqual(inFlight);

    game.send({ type: 'OPEN_HANGAR' });
    game.step(600);
    expect(droneHeights(game)).toEqual(inFlight);

    game.send({ type: 'PRESS_CLOSE' });
    game.send({ type: 'PRESS_RESUME' });
    expect(droneHeights(game)).toEqual(inFlight);

    // ...and they are free to fall again once the Run is running.
    game.step(1);
    expect(droneHeights(game)).not.toEqual(inFlight);
  });

  it('leaves the telemetry where it was during a pause', () => {
    const game = startedGame();
    game.pressKey(targetKey(game));
    game.send({ type: 'PRESS_PAUSE' });
    game.step(600);
    expect(game.getState().run.netWpm).toBe(0);

    game.send({ type: 'PRESS_RESUME' });
    game.step(30);
    expect(game.getState().run.netWpm).toBe(12);
  });

  it('refreshes the telemetry every 30 steps, which is 500 ms', () => {
    const game = startedGame();
    game.pressKey(targetKey(game));

    // One key in the first second of Run Time: 1 / 5 / (1 / 60) = 12 WPM.
    // A Run under a second long is read as one second.
    game.step(29);
    expect(game.getState().run.netWpm).toBe(0);
    game.step(1);
    expect(game.getState().run.netWpm).toBe(12);

    // A second key lands in the next half second: not shown until step 60.
    game.pressKey(targetKey(game));
    game.step(29);
    expect(game.getState().run.netWpm).toBe(12);
    game.step(1);
    expect(game.getState().run.netWpm).toBe(24);
  });
});

describe('a pause in the middle of a Run leaves WPM, accuracy and cadence unchanged', () => {
  /** 3 hits, a gap, 3 more hits and 2 wrong keys: 4 s of Run Time, in 3 stretches of whole half seconds. */
  function play(game: Game, pauseInTheMiddle: boolean): void {
    hitPerfect(game, 3);
    if (pauseInTheMiddle) pauseFor(game);
    hitPerfect(game, 3);
    miss(game, 2);
    game.step(60);
  }

  it('shows the same live WPM, accuracy, cadence and HUD timer as the same Run without the pause', () => {
    const straight = startedGame();
    play(straight, false);
    const paused = startedGame();
    play(paused, true);

    // 6 right and 2 wrong keys in 4 s: net (6 - 2) / 5 / (4 / 60) = 12.
    // Each wrong key costs the cadence 15.
    expect(readings(straight)).toEqual({
      netWpm: 12,
      accuracy: 75,
      cadenceConsistency: 70,
    });
    expect(readings(paused)).toEqual(readings(straight));
    expect(paused.getRunTime()).toBeCloseTo(straight.getRunTime(), 3);
  });

  it('gives the same final WPM, accuracy, Stars and Credits on the Debrief', () => {
    /** 77 keys in 60 s of Run Time (15 WPM, 3 Stars), with or without a pause on the way. */
    function clear(pauseInTheMiddle: boolean) {
      const game = startedGame();
      hitPerfect(game, 40);
      if (pauseInTheMiddle) pauseFor(game);
      hitPerfect(game, 36);
      game.step(60 * 60 - 76 * 30);
      game.pressKey(targetKey(game));
      expect(game.getScreen()).toBe('debrief');
      return game.getState().debrief;
    }

    const straight = clear(false);
    const paused = clear(true);

    expect(straight?.wpm).toBe(15);
    expect(straight?.starsEarned).toBe(3);
    expect(paused).toEqual(straight);
  });

  it('does not cost a Star when the pause would have pushed the WPM under a threshold', () => {
    // 77 keys in 60 s is 15 WPM, over the 14 WPM of the third Star. Counting
    // ten minutes of pause it would be about 1 WPM and no second Star.
    // The wall clock moving on during the pause must not matter either.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    const game = startedGame();
    hitPerfect(game, 40);
    game.send({ type: 'PRESS_PAUSE' });
    vi.setSystemTime(new Date('2026-01-01T12:10:00Z'));
    game.step(TEN_MINUTES_OF_STEPS);
    game.send({ type: 'PRESS_RESUME' });
    hitPerfect(game, 36);
    game.step(60 * 60 - 76 * 30);
    game.pressKey(targetKey(game));

    const debrief = game.getState().debrief;
    expect(debrief?.wpm).toBe(15);
    expect(debrief?.starsEarned).toBe(3);
    expect(game.getState().profile.stagesProgress[STAGE_ID]?.bestWpm).toBe(15);
  });

  it('counts the time between keystrokes in Run Time, so a pause is not one slow keystroke', () => {
    const game = startedGame();
    hitPerfect(game, 5);
    pauseFor(game);
    hitPerfect(game, 5);

    // Ten keystrokes 30 steps apart: perfectly even typing.
    expect(game.getState().run.cadenceConsistency).toBe(100);
  });

  it('measures the same cadence for uneven typing with or without a pause between keystrokes', () => {
    /** Keystrokes alternately 10 and 40 steps apart. */
    function unevenTyping(pauseBeforeKey: number | null): Game {
      const game = startedGame();
      for (let key = 0; key < 10; key++) {
        game.step(key % 2 === 0 ? 10 : 40);
        if (key === pauseBeforeKey) pauseFor(game);
        game.pressKey(targetKey(game));
      }
      return game;
    }

    const straight = unevenTyping(null).getState().run.cadenceConsistency;
    // Steady typing is 100; this alternates 4:1, so it reads well under.
    expect(straight).toBeLessThan(100);
    expect(straight).toBeGreaterThanOrEqual(30);

    expect(unevenTyping(5).getState().run.cadenceConsistency).toBe(straight);
    expect(unevenTyping(6).getState().run.cadenceConsistency).toBe(straight);
  });
});
