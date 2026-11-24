import { afterEach, describe, expect, it, vi } from 'vitest';
import { STEPS_PER_SECOND } from '../analytics/keys';
import {
  clearStage,
  clearStageTypingSteps,
  expectedWpm,
  type Game,
  hit,
  miss,
  newGame,
  STAGE_ID,
  startedGame,
  targetKey,
} from '../../tests/shared/testHelpers';

/**
 * The Run clock: Run Time is the time a Run has spent running, pauses left
 * out. It drives the HUD timer, live and final WPM (which is measured over
 * Typing Time, the part of Run Time from the first keystroke), Stars, practice
 * time and Rhythm. The tests step the clock by hand, 60 steps a second.
 */

const STEP_MS = 1000 / 60;
/** Ten minutes of steps: stepping this long outside a running Run must do nothing. */
const TEN_MINUTES_OF_STEPS = 10 * 60 * 60;

/** Pause the Run, let a long time go by, and carry on. */
function pauseFor(game: Game, steps = TEN_MINUTES_OF_STEPS): void {
  game.send({ type: 'PRESS_ESC' });
  game.step(steps);
  game.send({ type: 'PRESS_RESUME' });
}

/** The WPM of a Stage 1 clear of `seconds` (77 characters over its Typing Time). */
const clearWpm = (seconds: number) =>
  expectedWpm(77, clearStageTypingSteps({ seconds }));

/** What the HUD shows (Speed, Accuracy), and the Rhythm reading, all measured in Run Time. */
function readings(game: Game) {
  const run = game.getState().run;
  return {
    wpm: run.wpm,
    accuracy: run.accuracy,
    rhythm: run.rhythm,
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
    expect(game.getState().runTime).toBe(0);

    game.step(60);
    expect(game.getState().runTime).toBeCloseTo(1000, 3);

    game.step(30);
    expect(game.getState().runTime).toBeCloseTo(1500, 3);
    expect(game.getState().runTime).toBeCloseTo(90 * STEP_MS, 3);
  });

  it('stands still during a pause and carries on after it', () => {
    const game = startedGame();
    game.step(60);

    game.send({ type: 'PRESS_ESC' });
    expect(game.getState().phase).toBe('paused');
    game.step(TEN_MINUTES_OF_STEPS);
    expect(game.getState().runTime).toBeCloseTo(1000, 3);

    game.send({ type: 'PRESS_RESUME' });
    game.step(60);
    expect(game.getState().runTime).toBeCloseTo(2000, 3);
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
      expect(game.getState().phase).toBe('paused');
      game.step(600);
      expect(game.getState().runTime).toBeCloseTo(1000, 3);

      // Closing back onto the Pause Menu: still paused, still standing still.
      game.send({ type: 'PRESS_CLOSE' });
      expect(game.getState().screen).toBe('pause-menu');
      game.step(600);
      expect(game.getState().runTime).toBeCloseTo(1000, 3);
    },
  );

  it('stands still once the Stage is cleared, on the Debrief', () => {
    const game = startedGame();
    clearStage(game, { seconds: 60 });
    expect(game.getState().screen).toBe('debrief');
    expect(game.getState().runTime).toBeCloseTo(60_000, 1);

    game.step(600);
    expect(game.getState().runTime).toBeCloseTo(60_000, 1);
  });

  it('does not move before a Run has started', () => {
    const game = newGame();
    game.step(600);
    expect(game.getState().runTime).toBe(0);
  });

  it('starts again from 0 with the next Run', () => {
    const game = startedGame();
    clearStage(game, { seconds: 60 });

    game.send({ type: 'PRESS_REPLAY' });
    expect(game.getState().phase).toBe('running');
    expect(game.getState().runTime).toBe(0);
    game.step(30);
    expect(game.getState().runTime).toBeCloseTo(500, 3);
  });

  it('is not moved by keystrokes, only by steps', () => {
    const game = startedGame();
    game.step(30);
    game.pressKey(targetKey(game));
    game.pressKey('x');
    expect(game.getState().runTime).toBeCloseTo(500, 3);
  });

  it('is not the wall clock: time passing outside the steps changes nothing', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    const game = startedGame();
    game.step(60);

    vi.setSystemTime(new Date('2026-01-01T12:10:00Z'));
    expect(game.getState().runTime).toBeCloseTo(1000, 3);

    // The whole Run is judged on its 60 steps a second, not on what the
    // wall clock says: 77 keys in a minute of Run Time is 15.3 WPM.
    clearStage(game, { seconds: 60 });
    vi.setSystemTime(new Date('2026-01-01T12:20:00Z'));
    expect(game.getState().debrief?.wpm).toBeCloseTo(clearWpm(60), 6);
  });
});

describe('the Run clock steps only while the Run is running', () => {
  it('leaves the Drones where they are during a pause and behind menus', () => {
    const game = startedGame();
    game.step(5);
    const inFlight = droneHeights(game);

    game.send({ type: 'PRESS_ESC' });
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

  it('leaves the live WPM where it was during a pause', () => {
    const game = startedGame();
    hit(game, 2); // keys at 30 and 60 steps
    game.step(30);
    // 2 characters over 60 steps of Typing Time: 12 WPM.
    expect(game.getState().run.wpm).toBeCloseTo(expectedWpm(2, 60), 6);

    game.send({ type: 'PRESS_ESC' });
    game.step(600);
    expect(game.getState().run.wpm).toBeCloseTo(expectedWpm(2, 60), 6);

    // The Typing Time carries on from where it stopped: 90 steps, not 690.
    game.send({ type: 'PRESS_RESUME' });
    game.step(30);
    expect(game.getState().run.wpm).toBeCloseTo(expectedWpm(2, 90), 6);
  });

  it('refreshes the live WPM every 30 steps, which is 500 ms', () => {
    const game = startedGame();
    hit(game, 2); // keys at 30 and 60 steps
    expect(game.getState().run.wpm).toBeNull();

    game.step(29);
    expect(game.getState().run.wpm).toBeNull();
    game.step(1);
    expect(game.getState().run.wpm).toBeCloseTo(expectedWpm(2, 60), 6);

    // A third key at 90 steps is not shown until the refresh at 120.
    game.pressKey(targetKey(game));
    game.step(29);
    expect(game.getState().run.wpm).toBeCloseTo(expectedWpm(2, 60), 6);
    game.step(1);
    expect(game.getState().run.wpm).toBeCloseTo(expectedWpm(3, 90), 6);
  });
});

describe('a pause in the middle of a Run leaves WPM, accuracy and Rhythm unchanged', () => {
  /** 3 hits, a gap, 3 more hits and 2 wrong keys on the next character: 4 s of Run Time, in 3 stretches of whole half seconds. */
  function play(game: Game, pauseInTheMiddle: boolean): void {
    hit(game, 3);
    if (pauseInTheMiddle) pauseFor(game);
    hit(game, 3);
    miss(game, 2);
    game.step(60);
  }

  it('shows the same live WPM, accuracy, Rhythm and HUD timer as the same Run without the pause', () => {
    const straight = startedGame();
    play(straight, false);
    const paused = startedGame();
    play(paused, true);

    // 6 characters over 210 steps of Typing Time (the first key is at step
    // 30 of 240): 5 / 5 / (210 / 3600) = 17.1. The 2 wrong keys take nothing off.
    // Accuracy: 7 characters reached, 1 of them marked.
    // Each wrong key costs the Rhythm 15.
    expect(readings(straight)).toEqual({
      wpm: expect.closeTo(expectedWpm(6, 210), 6),
      accuracy: expect.closeTo(600 / 7),
      rhythm: 70,
    });
    expect(readings(paused)).toEqual(readings(straight));
    expect(paused.getState().runTime).toBeCloseTo(
      straight.getState().runTime,
      3,
    );
  });

  it('gives the same final WPM, accuracy, Stars and Credits on the Debrief', () => {
    /** 77 keys in 60 s of Run Time (15.3 WPM, 3 Stars), with or without a pause on the way. */
    function clear(pauseInTheMiddle: boolean) {
      const game = startedGame();
      hit(game, 40);
      if (pauseInTheMiddle) pauseFor(game);
      hit(game, 36);
      game.step(60 * 60 - 76 * 30);
      game.pressKey(targetKey(game));
      expect(game.getState().screen).toBe('debrief');
      return game.getState().debrief;
    }

    const straight = clear(false);
    const paused = clear(true);

    expect(straight?.wpm).toBeCloseTo(clearWpm(60), 6);
    expect(straight?.starsEarned).toBe(3);
    expect(paused).toEqual(straight);
  });

  it('does not cost a Star when the pause would have pushed the WPM under a threshold', () => {
    // 77 keys in 60 s is 15.3 WPM, over the Stage's 3-Star WPM. Counting
    // ten minutes of pause it would be about 1 WPM and no second Star.
    // The wall clock moving on during the pause must not matter either.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    const game = startedGame();
    hit(game, 40);
    game.send({ type: 'PRESS_ESC' });
    vi.setSystemTime(new Date('2026-01-01T12:10:00Z'));
    game.step(TEN_MINUTES_OF_STEPS);
    game.send({ type: 'PRESS_RESUME' });
    hit(game, 36);
    game.step(60 * 60 - 76 * 30);
    game.pressKey(targetKey(game));

    const debrief = game.getState().debrief;
    expect(debrief?.wpm).toBeCloseTo(clearWpm(60), 6);
    expect(debrief?.starsEarned).toBe(3);
    expect(
      game.getState().profile.stagesProgress[STAGE_ID]?.bestWpm,
    ).toBeCloseTo(clearWpm(60), 6);
  });

  it('leaves a pause out of Typing Time, however long it is', () => {
    const game = startedGame();
    hit(game, 5); // keys at 30 to 150 steps
    pauseFor(game);
    game.step(30);

    // 5 characters over 150 steps of Typing Time (the first key at 30 to the
    // refresh at 180), not over the ten minutes of the pause.
    expect(game.getState().run.wpm).toBeCloseTo(expectedWpm(5, 150), 6);
  });

  it('counts an idle gap in Typing Time in full, with no cap, though a pause of the same length is left out', () => {
    const game = startedGame();
    hit(game, 5); // keys at 30 to 150 steps
    game.step(TEN_MINUTES_OF_STEPS);

    // The same ten minutes with the Run running: Typing Time is the 120 steps
    // of typing and the gap, up to the refresh at the end of it.
    expect(game.getState().run.wpm).toBeCloseTo(
      expectedWpm(5, 120 + TEN_MINUTES_OF_STEPS),
      6,
    );
  });

  it('counts the time between keystrokes in Run Time, so a pause is not one slow keystroke', () => {
    const game = startedGame();
    hit(game, 5);
    pauseFor(game);
    hit(game, 5);

    // Ten keystrokes 30 steps apart: perfectly even typing.
    expect(game.getState().run.rhythm).toBe(100);
  });

  it('measures the same Rhythm for uneven typing with or without a pause between keystrokes', () => {
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

    const straight = unevenTyping(null).getState().run.rhythm;
    // Steady typing is 100; this alternates 4:1, so it reads well under.
    expect(straight).toBeLessThan(100);
    expect(straight).toBeGreaterThanOrEqual(30);

    expect(unevenTyping(5).getState().run.rhythm).toBe(straight);
    expect(unevenTyping(6).getState().run.rhythm).toBe(straight);
  });
});

describe('the steps a second the analytics count in', () => {
  it("are the Run clock's own: 60 steps are a second of Run Time", () => {
    expect(STEPS_PER_SECOND * STEP_MS).toBeCloseTo(1000);
  });
});
