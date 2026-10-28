import { describe, expect, it } from 'vitest';
import { RETURNING_PLAYER } from '../../tests/shared/saves';
import { KEYBOARD_ROWS } from '../curriculum/keyboardLayout';
import {
  type Game,
  hitPerfect,
  loadGame,
  miss,
  newGame,
  SAMPLE_TEXT,
  startedGame,
  targetKey,
} from './testHelpers';

/**
 * Moments (#70): one stream says what just happened. A keystroke that counts
 * is a hit, a Miss or a shield; Overdrive starting is an ignition; the last
 * hit of a Run is followed by the clear; a purchase is an upgrade or an equip.
 * The sound and the deck both listen to it, so a moment carries everything
 * they need and neither looks up the key table: the hit names its Drone, lane
 * and finger itself.
 */

type Moment = Parameters<Parameters<Game['onMoment']>[0]>[0];
type Hit = Extract<Moment, { type: 'hit' }>;

/** Collects every Moment the game announces from now on. */
function listen(game: Game): Moment[] {
  const moments: Moment[] = [];
  game.onMoment((moment) => moments.push(moment));
  return moments;
}

const typesOf = (moments: Moment[]) => moments.map((moment) => moment.type);

/** Where the keyboard puts a key: the lane and finger its hit should carry. */
function keyOnTheKeyboard(key: string) {
  const spec = KEYBOARD_ROWS.flat().find((cap) => cap.key === key);
  if (!spec) throw new Error(`The keyboard has no key "${key}"`);
  return { lane: spec.lane, finger: spec.finger };
}

describe('a hit', () => {
  it('names the Drone that was hit, and the lane and finger of the key pressed', () => {
    const game = startedGame();
    const moments = listen(game);
    const droneIds: string[] = [];

    // The first characters are "f", a space and "j": three lanes, two fingers.
    for (const key of [...SAMPLE_TEXT].slice(0, 6)) {
      game.step(30);
      const lead = game.getState().run.drones[0];
      expect(lead.char, 'the lead Drone is the one to hit').toBe(key);
      moments.length = 0;

      game.pressKey(key);

      expect(moments).toHaveLength(1);
      const [hit] = moments as [Hit];
      expect(hit).toMatchObject({
        type: 'hit',
        key,
        droneId: lead.id,
        ...keyOnTheKeyboard(key),
      });
      // The same lane and finger the Drone itself is drawn in.
      expect([hit.lane, hit.finger]).toEqual([lead.lane, lead.finger]);
      droneIds.push(hit.droneId);
    }
    expect(new Set(droneIds).size, 'each hit is a different Drone').toBe(6);
  });

  it('still carries the grade, the points and the Overdrive flag', () => {
    const game = startedGame();
    const moments = listen(game);

    game.step(30);
    game.pressKey(targetKey(game));

    expect(moments).toMatchObject([
      { type: 'hit', grade: 'perfect', points: 100, overdrive: false },
    ]);
  });
});

describe('a Miss and a shield', () => {
  it('a wrong key is a Miss moment naming the key', () => {
    const game = startedGame();
    const moments = listen(game);

    game.pressKey('x');

    expect(moments).toEqual([{ type: 'miss', key: 'x' }]);
  });

  it('a shield takes the first wrong key, then a Miss follows', () => {
    const game = startedGame({ deflectorShields: 1 });
    const moments = listen(game);

    game.pressKey('x');
    game.pressKey('y');

    expect(moments).toEqual([
      { type: 'shield', key: 'x' },
      { type: 'miss', key: 'y' },
    ]);
  });

  it('there are none when no Run is running', () => {
    const game = newGame();
    const moments = listen(game);

    game.pressKey('f');
    game.pressKey('x');

    expect(moments).toEqual([]);
  });
});

describe('ignition', () => {
  it('fires once, right after the hit that starts Overdrive, and not on later hits', () => {
    const game = startedGame();
    hitPerfect(game, 28);
    const moments = listen(game);
    expect(game.getState().run.hyperspaceActive).toBe(false);

    hitPerfect(game, 1); // the 29th hit starts Overdrive
    expect(game.getState().run.hyperspaceActive).toBe(true);
    expect(typesOf(moments)).toEqual(['hit', 'ignition']);

    hitPerfect(game, 6); // on in Overdrive: only hits
    expect(typesOf(moments).filter((type) => type === 'ignition')).toHaveLength(
      1,
    );
    expect(typesOf(moments)).toEqual([
      'hit',
      'ignition',
      ...Array(6).fill('hit'),
    ]);
  });

  it('is not fired by a hit before Overdrive', () => {
    const game = startedGame();
    const moments = listen(game);

    hitPerfect(game, 28);

    expect(typesOf(moments)).toEqual(Array(28).fill('hit'));
  });

  it('fires again when a Miss has ended Overdrive and the Streak climbs back to it', () => {
    const game = startedGame();
    hitPerfect(game, 29);
    const moments = listen(game);
    miss(game);
    expect(game.getState().run.hyperspaceActive).toBe(false);

    // Hit on, stopping short of the last character, until it catches again.
    const budget =
      SAMPLE_TEXT.length - game.getState().run.currentCharIndex - 1;
    for (let i = 0; i < budget && !typesOf(moments).includes('ignition'); i++) {
      hitPerfect(game, 1);
    }

    const types = typesOf(moments);
    expect(types[0]).toBe('miss');
    expect(types.filter((type) => type === 'ignition')).toHaveLength(1);
    expect(types.at(-1)).toBe('ignition');
    expect(game.getState().run.hyperspaceActive).toBe(true);
  });
});

describe('clearing the Stage', () => {
  it('fires once, after the last hit, with the Stars the Debrief shows', () => {
    const game = startedGame();
    hitPerfect(game, SAMPLE_TEXT.length - 1);
    const moments = listen(game);

    hitPerfect(game, 1);

    const { debrief } = game.getState();
    expect(debrief).not.toBeNull();
    expect(typesOf(moments)).toEqual(['hit', 'cleared']);
    expect(moments[1]).toMatchObject({
      type: 'cleared',
      stars: debrief?.starsEarned,
    });
  });

  it('is heard with the game already on the Debrief', () => {
    const game = startedGame();
    hitPerfect(game, SAMPLE_TEXT.length - 1);
    const heard: { state?: ReturnType<Game['getState']> } = {};
    game.onMoment((moment) => {
      if (moment.type === 'cleared') heard.state = game.getState();
    });

    hitPerfect(game, 1);

    expect(heard.state?.screen).toBe('debrief');
    expect(heard.state?.debrief).not.toBeNull();
    expect(heard.state?.debrief?.starsEarned).toBe(
      game.getState().debrief?.starsEarned,
    );
  });

  it('does not fire for a Run that is not cleared, or again for keys after the clear', () => {
    const game = startedGame();
    const moments = listen(game);
    hitPerfect(game, SAMPLE_TEXT.length - 1);
    expect(typesOf(moments)).not.toContain('cleared');

    hitPerfect(game, 1);
    game.pressKey('f');
    game.pressKey('x');

    expect(typesOf(moments).filter((type) => type === 'cleared')).toHaveLength(
      1,
    );
    expect(typesOf(moments).at(-1)).toBe('cleared');
  });
});

describe('a purchase', () => {
  it('buying an Upgrade is an upgrade moment', () => {
    const { game } = loadGame(RETURNING_PLAYER);
    const moments = listen(game);

    expect(game.buy('shields')).toBe(true);

    expect(typesOf(moments)).toEqual(['upgrade']);
  });

  it('buying a trail colour, and equipping one already owned, are equip moments', () => {
    const { game } = loadGame(RETURNING_PLAYER);
    const moments = listen(game);

    expect(game.buy('AMBER')).toBe(true);
    expect(typesOf(moments)).toEqual(['equip']);

    // CYAN is the colour every player starts with: equipping it again is free.
    expect(game.buy('CYAN')).toBe(true);
    expect(typesOf(moments)).toEqual(['equip', 'equip']);
  });

  it('a buy that changes nothing makes no moment', () => {
    const { game } = loadGame({ totalCredits: 0 });
    const moments = listen(game);

    expect(game.buy('shields')).toBe(false);
    expect(game.buy('AMBER')).toBe(false);

    expect(moments).toEqual([]);
  });
});

describe('listening', () => {
  it('stops when the listener is unsubscribed, and only that listener', () => {
    const game = startedGame();
    const heardByBoth: Moment[] = [];
    const heardByOne: Moment[] = [];
    const stop = game.onMoment((moment) => heardByOne.push(moment));
    game.onMoment((moment) => heardByBoth.push(moment));

    game.pressKey('x');
    stop();
    game.pressKey('y');

    expect(heardByOne).toHaveLength(1);
    expect(heardByBoth).toHaveLength(2);
  });
});
