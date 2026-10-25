import { describe, expect, it } from 'vitest';
import { RefusedMoveError } from './createGame';
import {
  clearStage,
  type Game,
  hitPerfect,
  newGame,
  STAGE_ID,
  startedGame,
  targetKey,
} from './testHelpers';

/**
 * The machine's promises from #10 and ticket #19, tested through the headless
 * game by sending what a player does. They are promises about where the player
 * ends up and what happens to the Run, never a copy of the transition table.
 */

type PlayerEvent = Parameters<Game['send']>[0];
type Screen = ReturnType<Game['getScreen']>;
type Opener = 'galaxy-map' | 'hangar' | 'analytics' | 'free-flight';

const OPENERS: Opener[] = ['galaxy-map', 'hangar', 'analytics', 'free-flight'];

/** The header's four screen buttons. */
const OPEN: Record<Opener, PlayerEvent> = {
  'galaxy-map': { type: 'OPEN_GALAXY_MAP' },
  hangar: { type: 'OPEN_HANGAR' },
  analytics: { type: 'OPEN_ANALYTICS' },
  'free-flight': { type: 'OPEN_FREE_FLIGHT' },
};
const CLOSE: PlayerEvent = { type: 'PRESS_CLOSE' };
const PAUSE: PlayerEvent = { type: 'PRESS_PAUSE' };
const RESUME: PlayerEvent = { type: 'PRESS_RESUME' };
const PLAY: PlayerEvent = { type: 'PRESS_PLAY' };
const HOME: PlayerEvent = { type: 'PRESS_HOME' };
const REPLAY: PlayerEvent = { type: 'PRESS_REPLAY' };
const NEXT_STAGE: PlayerEvent = { type: 'PRESS_NEXT_STAGE' };
const ESC: PlayerEvent = { type: 'PRESS_ESC' };
const LOST_FOCUS: PlayerEvent = { type: 'LOST_FOCUS' };
const pickStage = (stageId: string): PlayerEvent => ({
  type: 'PICK_STAGE',
  stageId,
});

const FREE_FLIGHT_ID = 'custom-practice';

/** A Free Flight Stage: Stage 1's shape with the player's own short text. */
function freeFlightLaunch(): PlayerEvent {
  const template = startedGame().getRun().currentStage;
  return {
    type: 'LAUNCH_FREE_FLIGHT',
    stage: {
      ...template,
      id: FREE_FLIGHT_ID,
      title: 'Free Flight Drill',
      sampleText: 'ab ba',
      targetKeys: ['a', 'b', ' '],
    },
  };
}

/** The events that end the Run in progress and begin another (or none). */
const ABANDONING = new Set([
  'PRESS_HOME',
  'PICK_STAGE',
  'LAUNCH_FREE_FLIGHT',
  'PRESS_REPLAY',
  'PRESS_NEXT_STAGE',
]);

// ---------------------------------------------------------------------------
// What each screen offers the player, read off the running game. Each line is a
// button (or key, or window event) a player can use there. The header offers
// Home and the four screens everywhere, so they are listed once.
//
// To adjust: change a line here. No test below depends on one line.
// ---------------------------------------------------------------------------
const HEADER: PlayerEvent[] = [HOME, ...OPENERS.map((screen) => OPEN[screen])];

const OFFERED: Record<Screen, (game: Game) => PlayerEvent[]> = {
  // Header Start Mission; Begin Home Row Mission; View Galaxy Sectors.
  'academy-home': () => [PLAY, pickStage(STAGE_ID), ...HEADER],
  // Pause (HUD and header); Esc pauses; the window can lose focus.
  'flight-deck': () => [PAUSE, ESC, LOST_FOCUS, ...HEADER],
  // Resume Flight; Restart Mission; Exit to Galaxy Map; Exit to Academy Home
  // (Home is in HEADER); header Start Mission; Esc resumes.
  'pause-menu': () => [
    RESUME,
    PLAY,
    REPLAY,
    OPEN['galaxy-map'],
    ESC,
    ...HEADER,
  ],
  // Close; Hangar Upgrades; Report; Enter Flight Deck / Resume Flight;
  // Launch Mission (Sector 1 only, the rest are locked); Menu is Home.
  'galaxy-map': () => [
    CLOSE,
    ESC,
    OPEN.hangar,
    OPEN.analytics,
    PLAY,
    pickStage(STAGE_ID),
    pickStage('s1-l2'),
    ...HEADER,
  ],
  // Close; Enter Flight Deck / Resume Flight.
  hangar: () => [CLOSE, ESC, PLAY, ...HEADER],
  analytics: () => [CLOSE, ESC, PLAY, ...HEADER],
  // Cancel; Launch Custom Flight.
  'free-flight': () => [CLOSE, ESC, freeFlightLaunch(), ...HEADER],
  // Replay; Galaxy Map; Main Menu; Next Mission (a curriculum Stage only: the
  // Free Flight Debrief has no such button). No Esc, no Play.
  debrief: (game) => [
    REPLAY,
    OPEN['galaxy-map'],
    ...(game.getRun().currentStage.id === FREE_FLIGHT_ID ? [] : [NEXT_STAGE]),
    ...HEADER,
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function play(game: Game, event: PlayerEvent): void {
  expect(game.canSend(event), `${event.type} on ${game.getScreen()}`).toBe(
    true,
  );
  game.send(event);
}

/** A Run on Stage 1 with five characters typed. */
function runningGame(): Game {
  const game = startedGame();
  hitPerfect(game, 5);
  return game;
}

function pausedGame(): Game {
  const game = runningGame();
  play(game, PAUSE);
  return game;
}

/** A cleared Run: the Debrief is showing. */
function clearedGame(): Game {
  const game = startedGame();
  clearStage(game, { seconds: 8 });
  return game;
}

/** Hit `count` more characters, stopping short of clearing the Run. */
function hitKeys(game: Game, count: number): void {
  for (let i = 0; i < count; i++) {
    const run = game.getRun();
    if (run.currentCharIndex >= run.currentStage.sampleText.length - 1) return;
    game.step(30);
    game.pressKey(run.currentStage.sampleText[run.currentCharIndex]);
  }
}

/** Type every remaining character: the last one clears the Run. */
function finishRun(game: Game): void {
  const { currentStage, currentCharIndex } = game.getRun();
  for (let i = currentCharIndex; i < currentStage.sampleText.length; i++) {
    game.step(30);
    game.pressKey(currentStage.sampleText[i]);
  }
}

const progress = (game: Game) => {
  const run = game.getRun();
  return { index: run.currentCharIndex, score: run.score };
};

/** Seeded, so a failing walk can be replayed from its seed. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Close returns to whatever opened it
// ---------------------------------------------------------------------------

/** Every chain of 1 to 3 distinct screens opened one after another. */
function chainsOfOpenedScreens(): Opener[][] {
  const chains: Opener[][] = [];
  const extend = (chain: Opener[]) => {
    if (chain.length > 0) chains.push(chain);
    if (chain.length === 3) return;
    for (const screen of OPENERS) {
      if (!chain.includes(screen)) extend([...chain, screen]);
    }
  };
  extend([]);
  return chains;
}

describe('every chain of opened screens unwinds back to its start, one Close at a time', () => {
  const starts: {
    name: string;
    make: () => Game;
    start: Screen;
    /** Where the last Close lands. */
    landing: Screen;
  }[] = [
    {
      name: 'Academy Home',
      make: newGame,
      start: 'academy-home',
      landing: 'academy-home',
    },
    {
      name: 'the Flight Deck mid-Run',
      make: runningGame,
      start: 'flight-deck',
      // The Run was paused on the way out, so Close lands on the Pause Menu.
      landing: 'pause-menu',
    },
    {
      name: 'the Pause Menu',
      make: pausedGame,
      start: 'pause-menu',
      landing: 'pause-menu',
    },
    {
      name: 'the Debrief',
      make: clearedGame,
      start: 'debrief',
      landing: 'debrief',
    },
  ];

  for (const { name, make, start, landing } of starts) {
    it(`starting from ${name}`, () => {
      for (const chain of chainsOfOpenedScreens()) {
        const label = `${start} > ${chain.join(' > ')}`;
        const game = make();
        expect(game.getScreen(), label).toBe(start);
        const before = progress(game);
        const result = game.getDebrief();

        for (const screen of chain) {
          play(game, OPEN[screen]);
          expect(game.getScreen(), `${label}: opening ${screen}`).toBe(screen);
        }

        for (let depth = chain.length - 1; depth >= 0; depth--) {
          play(game, CLOSE);
          const expected = depth === 0 ? landing : chain[depth - 1];
          expect(game.getScreen(), `${label}: Close back to ${expected}`).toBe(
            expected,
          );
        }

        // Nothing was lost on the way: the same Run, the same Debrief.
        expect(progress(game), label).toEqual(before);
        expect(game.getDebrief(), label).toEqual(result);
      }
    });
  }
});

describe('Close onto a paused Run lands on the Pause Menu', () => {
  for (const screen of OPENERS) {
    it(`after ${screen} was opened mid-Run`, () => {
      const game = runningGame();
      const before = progress(game);

      play(game, OPEN[screen]);
      expect(game.getScreen()).toBe(screen);
      expect(game.getPhase()).toBe('paused');

      play(game, CLOSE);
      expect(game.getScreen()).toBe('pause-menu');
      expect(game.getPhase()).toBe('paused');

      // The player chooses when to carry on, and it is the same Run.
      play(game, RESUME);
      expect(game.getScreen()).toBe('flight-deck');
      expect(game.getPhase()).toBe('running');
      expect(progress(game)).toEqual(before);
    });
  }

  it('after a chain that began at the Pause Menu', () => {
    const game = pausedGame();
    play(game, OPEN.hangar);
    play(game, CLOSE);
    expect(game.getScreen()).toBe('pause-menu');
  });
});

describe('Play, Resume and Go to Flight Deck resume a paused Run straight away', () => {
  it('Resume on the Pause Menu', () => {
    const game = pausedGame();
    const before = progress(game);
    play(game, RESUME);
    expect(game.getScreen()).toBe('flight-deck');
    expect(game.getPhase()).toBe('running');
    expect(progress(game)).toEqual(before);
  });

  for (const screen of ['galaxy-map', 'hangar', 'analytics'] as const) {
    it(`Play from the ${screen} opened mid-Run`, () => {
      const game = runningGame();
      const before = progress(game);
      play(game, OPEN[screen]);
      play(game, PLAY);
      expect(game.getScreen()).toBe('flight-deck');
      expect(game.getPhase()).toBe('running');
      expect(progress(game)).toEqual(before);
      // Carry on from the same character.
      game.step(30);
      game.pressKey(game.getRun().currentStage.sampleText[before.index]);
      expect(game.getRun().currentCharIndex).toBe(before.index + 1);
    });
  }

  it('Play on the Pause Menu', () => {
    const game = pausedGame();
    play(game, PLAY);
    expect(game.getScreen()).toBe('flight-deck');
    expect(game.getPhase()).toBe('running');
  });
});

// ---------------------------------------------------------------------------
// The header buttons work on every screen
// ---------------------------------------------------------------------------

describe('every header button works on every screen', () => {
  const screens: { name: string; make: () => Game; screen: Screen }[] = [
    { name: 'Academy Home', make: newGame, screen: 'academy-home' },
    { name: 'the Flight Deck', make: runningGame, screen: 'flight-deck' },
    { name: 'the Pause Menu', make: pausedGame, screen: 'pause-menu' },
    { name: 'the Debrief', make: clearedGame, screen: 'debrief' },
    ...OPENERS.flatMap((opener) => [
      {
        name: `the ${opener} (opened from Academy Home)`,
        make: () => {
          const game = newGame();
          play(game, OPEN[opener]);
          return game;
        },
        screen: opener,
      },
      {
        name: `the ${opener} (opened mid-Run)`,
        make: () => {
          const game = runningGame();
          play(game, OPEN[opener]);
          return game;
        },
        screen: opener,
      },
    ]),
  ];

  for (const { name, make, screen } of screens) {
    it(`on ${name}`, () => {
      for (const target of OPENERS) {
        const game = make();
        expect(game.getScreen()).toBe(screen);
        play(game, OPEN[target]);
        expect(game.getScreen(), `${screen} > ${target}`).toBe(target);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Only Academy Home and starting a Stage abandon a Run
// ---------------------------------------------------------------------------

describe('only going to Academy Home and starting a Stage abandon a Run', () => {
  it('Academy Home abandons the Run, from the Flight Deck, the Pause Menu and a menu', () => {
    const fromMenu = () => {
      const game = runningGame();
      play(game, OPEN['galaxy-map']);
      return game;
    };
    for (const make of [runningGame, pausedGame, fromMenu]) {
      const game = make();
      play(game, HOME);
      expect(game.getScreen()).toBe('academy-home');
      expect(game.getPhase()).toBe('abandoned');
    }
  });

  const freshRun = (game: Game) => {
    expect(game.getScreen()).toBe('flight-deck');
    expect(game.getPhase()).toBe('running');
    const run = game.getRun();
    expect(run.currentCharIndex).toBe(0);
    expect(run.score).toBe(0);
    expect(run.currentStreak).toBe(0);
    expect(run.multiplier).toBe(1);
  };

  it('picking a Stage on the Galaxy Map starts a fresh Run', () => {
    const game = runningGame();
    play(game, OPEN['galaxy-map']);
    play(game, pickStage('s1-l2'));
    freshRun(game);
    expect(game.getRun().currentStage.id).toBe('s1-l2');
  });

  it('launching Free Flight starts a fresh Run on the player’s text', () => {
    const game = runningGame();
    play(game, OPEN['free-flight']);
    play(game, freeFlightLaunch());
    freshRun(game);
    expect(game.getRun().currentStage.sampleText).toBe('ab ba');
  });

  it('Replay on the Pause Menu starts a fresh Run of the same Stage', () => {
    const game = pausedGame();
    play(game, REPLAY);
    freshRun(game);
    expect(game.getRun().currentStage.id).toBe(STAGE_ID);
  });

  it('Replay on the Debrief starts a fresh Run of the same Stage', () => {
    const game = clearedGame();
    play(game, REPLAY);
    freshRun(game);
    expect(game.getRun().currentStage.id).toBe(STAGE_ID);
  });

  it('Next Stage on the Debrief starts a fresh Run of the next Stage', () => {
    const game = clearedGame();
    play(game, NEXT_STAGE);
    freshRun(game);
    expect(game.getRun().currentStage.id).not.toBe(STAGE_ID);
  });

  it('nothing else the player can do on a Run in progress abandons it', () => {
    const keepsTheRun = (event: PlayerEvent) => !ABANDONING.has(event.type);
    for (let seed = 1; seed <= 30; seed++) {
      const random = mulberry32(seed);
      const game = runningGame();
      const before = progress(game);
      const log: string[] = [];
      for (let n = 0; n < 40; n++) {
        const screen = game.getScreen();
        const offered = OFFERED[screen](game).filter(keepsTheRun);
        const event = offered[Math.floor(random() * offered.length)];
        log.push(`${screen}:${event.type}`);
        play(game, event);
        if (random() < 0.3) game.step(1 + Math.floor(random() * 40));
        const where = `seed ${seed}: ${log.join(' > ')}`;
        expect(['running', 'paused'], where).toContain(game.getPhase());
        expect(progress(game), where).toEqual(before);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Play with no Run starts the current Stage fresh
// ---------------------------------------------------------------------------

describe('Play with no Run starts the current Stage fresh', () => {
  const startsFresh = (game: Game) => {
    play(game, PLAY);
    expect(game.getScreen()).toBe('flight-deck');
    expect(game.getPhase()).toBe('running');
    expect(game.getRun().currentStage.id).toBe(STAGE_ID);
    expect(progress(game)).toEqual({ index: 0, score: 0 });
    // A live Run, not an empty frozen deck: the Stage's first key counts.
    game.step(30);
    game.pressKey(targetKey(game));
    expect(game.getRun().currentCharIndex).toBe(1);
    expect(game.getRun().score).toBeGreaterThan(0);
  };

  it('on a fresh game', () => {
    startsFresh(newGame());
  });

  it('after going Home from a Run, it does not bring that Run back', () => {
    const game = runningGame();
    play(game, HOME);
    startsFresh(game);
  });

  it('after a Run was cleared and the player went Home', () => {
    const game = clearedGame();
    play(game, HOME);
    startsFresh(game);
  });
});

// ---------------------------------------------------------------------------
// A pause keeps the Streak, Multiplier and Overdrive
// ---------------------------------------------------------------------------

describe('a pause keeps the Streak, Multiplier and Overdrive exactly as they were', () => {
  const meters = (game: Game) => {
    const run = game.getRun();
    return {
      streak: run.currentStreak,
      multiplier: run.multiplier,
      overdriveOn: run.hyperspaceActive,
      overdriveMeter: run.hyperspaceEnergy,
      shields: run.shieldsRemaining,
    };
  };

  const ways: { name: string; pause: (game: Game) => void }[] = [
    { name: 'the Pause button', pause: (game) => play(game, PAUSE) },
    {
      name: 'the window losing focus',
      pause: (game) => play(game, LOST_FOCUS),
    },
    { name: 'opening the Hangar', pause: (game) => play(game, OPEN.hangar) },
  ];

  const builds = [
    // 12 hits in a row: a Streak, a Multiplier above x1, a part-filled meter.
    { name: 'a Streak and Multiplier', hits: 12, overdrive: false },
    // 30 hits in a row: the meter is full and Overdrive is on.
    { name: 'Overdrive', hits: 30, overdrive: true },
  ];

  for (const { name, hits, overdrive } of builds) {
    for (const way of ways) {
      it(`${name} survive ${way.name}`, () => {
        const game = startedGame();
        hitPerfect(game, hits);
        const before = meters(game);
        expect(before.streak).toBe(hits);
        expect(before.multiplier).toBeGreaterThan(1);
        expect(before.overdriveMeter).toBeGreaterThan(0);
        expect(before.overdriveOn).toBe(overdrive);

        way.pause(game);
        expect(game.getPhase()).toBe('paused');
        expect(meters(game)).toEqual(before);

        // Keys pressed behind the menu count for nothing.
        game.pressKey(targetKey(game));
        game.pressKey('x');
        expect(meters(game)).toEqual(before);

        // Back in the Run, the Streak carries on from where it was.
        if (game.getScreen() !== 'pause-menu') play(game, CLOSE);
        play(game, RESUME);
        expect(meters(game)).toEqual(before);
        hitPerfect(game, 1);
        expect(game.getRun().currentStreak).toBe(hits + 1);
      });
    }
  }
});

// ---------------------------------------------------------------------------
// The Debrief shows the Run just cleared
// ---------------------------------------------------------------------------

describe('the Debrief shows the result of the Run just cleared', () => {
  it('opens at once with the result, and the Profile has recorded it', () => {
    const game = startedGame();
    clearStage(game, { seconds: 8 });

    expect(game.getScreen()).toBe('debrief');
    expect(game.getPhase()).toBe('cleared');
    const result = game.getDebrief();
    expect(result).not.toBeNull();
    expect(result?.starsEarned).toBe(3);
    expect(game.getProfile().totalStars).toBe(3);
  });

  it('a replayed Run’s Debrief shows its own result, not the previous one', () => {
    const game = startedGame();
    clearStage(game, { seconds: 8 });
    const first = game.getDebrief();
    expect(first?.accuracy).toBe(100);

    play(game, REPLAY);
    clearStage(game, { seconds: 60, missesFirst: 4 });

    expect(game.getScreen()).toBe('debrief');
    const second = game.getDebrief();
    expect(second).not.toEqual(first);
    // 77 right keys and 4 wrong ones.
    expect(second?.accuracy).toBeLessThan(100);
    expect(second?.wpm).toBeLessThan(first?.wpm ?? 0);
  });

  it('is the same after a menu is opened over it and closed', () => {
    const game = clearedGame();
    const result = game.getDebrief();
    play(game, OPEN.hangar);
    play(game, OPEN.analytics);
    play(game, CLOSE);
    play(game, CLOSE);
    expect(game.getScreen()).toBe('debrief');
    expect(game.getDebrief()).toEqual(result);
  });
});

// ---------------------------------------------------------------------------
// A refused move
// ---------------------------------------------------------------------------

describe('a refused move changes nothing and fails the test that triggers it', () => {
  it('Next Stage with no Debrief showing', () => {
    const game = newGame();
    expect(game.canSend(NEXT_STAGE)).toBe(false);
    expect(() => game.send(NEXT_STAGE)).toThrow(RefusedMoveError);
    expect(game.getScreen()).toBe('academy-home');
    expect(game.getPhase()).toBe('none');
  });

  it('Close with nothing open, mid-Run', () => {
    const game = runningGame();
    const before = progress(game);
    expect(game.canSend(CLOSE)).toBe(false);
    expect(() => game.send(CLOSE)).toThrow(RefusedMoveError);
    expect(game.getScreen()).toBe('flight-deck');
    expect(game.getPhase()).toBe('running');
    expect(progress(game)).toEqual(before);
  });
});

// ---------------------------------------------------------------------------
// No player event sequence the UI can offer triggers a refused move
// ---------------------------------------------------------------------------

describe('no sequence of the events a screen offers triggers a refused move', () => {
  const SEEDS = 40;
  const STEPS = 60;

  it(`${SEEDS} seeded walks of ${STEPS} moves through every screen`, () => {
    const screensSeen = new Set<Screen>();

    for (let seed = 1; seed <= SEEDS; seed++) {
      const random = mulberry32(seed);
      const game = newGame();
      const log: string[] = [];
      let lastResult: ReturnType<Game['getDebrief']> = null;
      let before: { index: number; score: number } | null = null;

      const where = () => `seed ${seed}: ${log.join(' > ')}`;
      const checkScreen = () => {
        const screen = game.getScreen();
        screensSeen.add(screen);
        switch (screen) {
          case 'flight-deck':
            expect(game.getPhase(), where()).toBe('running');
            break;
          case 'pause-menu':
            expect(game.getPhase(), where()).toBe('paused');
            break;
          case 'debrief':
            expect(game.getPhase(), where()).toBe('cleared');
            // The Debrief is never empty or stale.
            expect(lastResult, where()).not.toBeNull();
            expect(game.getDebrief(), where()).toEqual(lastResult);
            break;
        }
      };

      for (let n = 0; n < STEPS; n++) {
        const screen = game.getScreen();
        const phase = game.getPhase();
        const alive = phase === 'running' || phase === 'paused';
        const roll = random();

        if (screen === 'flight-deck' && roll < 0.3) {
          log.push('hit keys');
          hitKeys(game, 1 + Math.floor(random() * 4));
          before = progress(game);
        } else if (screen === 'flight-deck' && roll < 0.37) {
          log.push('finish the Run');
          finishRun(game);
          lastResult = game.getDebrief();
          before = null;
          expect(game.getScreen(), where()).toBe('debrief');
        } else {
          const offered = OFFERED[screen](game);
          const event = offered[Math.floor(random() * offered.length)];
          log.push(`${screen}:${event.type}`);
          expect(game.canSend(event), where()).toBe(true);
          expect(() => game.send(event), where()).not.toThrow();

          if (ABANDONING.has(event.type) || !alive) {
            // A Run was ended or began: this is the new baseline.
            const now = game.getPhase();
            before =
              now === 'running' || now === 'paused' ? progress(game) : null;
          } else if (before) {
            // Nothing but Home or a Stage start touches a Run in progress.
            expect(progress(game), where()).toEqual(before);
          }
        }
        checkScreen();
      }
    }

    // The walks went everywhere, or they proved little.
    for (const screen of Object.keys(OFFERED)) {
      expect(screensSeen.has(screen as Screen), `never reached ${screen}`).toBe(
        true,
      );
    }
  });
});
