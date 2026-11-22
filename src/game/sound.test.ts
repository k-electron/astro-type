import { describe, expect, it } from 'vitest';
import { createRecordingSound } from '../../tests/shared/recordingSound';
import { RETURNING_PLAYER } from '../../tests/shared/saves';
import {
  FLAT_TEXT,
  hit,
  loadGame,
  miss,
  SAMPLE_TEXT,
  STAGE_ID,
  startFreeFlight,
  startStage,
  typeText,
  typeTextWithMissMarks,
} from '../../tests/shared/testHelpers';

/**
 * What the player hears, moment by moment through one scripted Run: whether
 * the beat and its Overdrive layer are sounding, and which one-shot cue just
 * fired. The recording sound adapter stands in for the speakers; the Run is
 * driven through the `Game` and nothing else is read.
 *
 * Mute and music volume are changed with the `Game`'s `changeSettings`, as
 * the Settings buttons do, and nothing is read back from the store.
 */

/** A hit cue of any kind: a letter, a space or a clean word's finish (the kinds are told apart below). */
const isHit = (cue: string) => cue.startsWith('hit:');
/** A chime of any tier. */
const isChime = (cue: string) => cue.startsWith('chime:');

it('sounds right at every moment of a Run', () => {
  const sound = createRecordingSound();
  const { game } = loadGame(RETURNING_PLAYER, sound.effects);

  /**
   * Assert the moment: is the beat sounding, is the Overdrive layer on, how many
   * hit cues just fired, and which other cues. Which kind of hit cue and which
   * chime a key makes depends on the text it falls in, so the one that checks
   * that is below, on short texts; here a hit is one cue and the chimes are left out.
   */
  const heard = (
    moment: string,
    expected: {
      beat: boolean;
      overdrive: boolean;
      hits?: number;
      cues?: string[];
    },
  ) => {
    expect(sound.heard(), `${moment}: beat and Overdrive layer`).toEqual({
      beat: expected.beat,
      overdrive: expected.overdrive,
    });
    const cues = sound.takeCues();
    expect(cues.filter(isHit), `${moment}: hit cues`).toHaveLength(
      expected.hits ?? 0,
    );
    expect(
      cues.filter((cue) => !isHit(cue) && !isChime(cue)),
      `${moment}: cues`,
    ).toEqual(expected.cues ?? []);
  };

  /** Hit one key at a time until Overdrive catches fire. Quiet until then. */
  const hitUntilOverdrive = (moment: string) => {
    const budget =
      SAMPLE_TEXT.length - game.getState().run.currentCharIndex - 2;
    for (let i = 0; i < budget; i++) {
      hit(game, 1);
      if (sound.heard().overdrive) {
        heard(`${moment}: Overdrive ignites`, {
          beat: true,
          overdrive: true,
          hits: 1,
          cues: ['ignition'],
        });
        return;
      }
      heard(`${moment}: hit ${i + 1} before Overdrive`, {
        beat: true,
        overdrive: false,
        hits: 1,
      });
    }
    throw new Error(`${moment}: Overdrive never ignited`);
  };

  // On the menu: no beat.
  heard('menu', { beat: false, overdrive: false });
  game.changeSettings({ globalMuted: true });
  game.changeSettings({ globalMuted: false });
  heard('menu, muted and unmuted', { beat: false, overdrive: false });

  // Start: the beat comes in, Overdrive off.
  startStage(game, STAGE_ID);
  heard('Run started', { beat: true, overdrive: false });

  // Misses at the start: a cue each, the beat plays on.
  miss(game);
  heard('first Miss', { beat: true, overdrive: false, cues: ['miss'] });
  miss(game, 2);
  heard('two more Misses', {
    beat: true,
    overdrive: false,
    cues: ['miss', 'miss'],
  });

  // Overdrive: the layer joins the beat after the hit that earned it.
  hitUntilOverdrive('first climb');

  // A Miss ends Overdrive; the beat carries on.
  miss(game);
  heard('Miss during Overdrive', {
    beat: true,
    overdrive: false,
    cues: ['miss'],
  });
  hitUntilOverdrive('second climb');

  // Pause: both go quiet, whatever Overdrive was doing.
  game.send({ type: 'PRESS_ESC' });
  heard('paused', { beat: false, overdrive: false });

  // Settings changed while paused do not start the beat.
  game.changeSettings({ musicVolume: 0.6 });
  heard('paused, music volume changed', { beat: false, overdrive: false });

  // Resume: the beat is back, with the Overdrive that was running.
  game.send({ type: 'PRESS_RESUME' });
  heard('resumed', { beat: true, overdrive: true });

  // Mute in the Run silences the beat; unmute brings it back.
  game.changeSettings({ globalMuted: true });
  heard('muted', { beat: false, overdrive: true });
  game.changeSettings({ globalMuted: false });
  heard('unmuted', { beat: true, overdrive: true });

  // Music volume 0 silences the beat; raising it brings it back.
  game.changeSettings({ musicVolume: 0 });
  heard('music volume 0', { beat: false, overdrive: true });
  game.changeSettings({ musicVolume: 0.6 });
  heard('music volume raised', { beat: true, overdrive: true });

  // Resuming while muted stays quiet until unmuted.
  game.send({ type: 'PRESS_ESC' });
  game.changeSettings({ globalMuted: true });
  game.send({ type: 'PRESS_RESUME' });
  heard('resumed while muted', { beat: false, overdrive: true });
  game.changeSettings({ globalMuted: false });
  heard('unmuted after resuming', { beat: true, overdrive: true });

  // Typing on to the last character: a hit cue each, nothing else.
  const left = SAMPLE_TEXT.length - 1 - game.getState().run.currentCharIndex;
  hit(game, left);
  heard('typed on to the last character', {
    beat: true,
    overdrive: true,
    hits: left,
  });

  // Clearing the Stage: the last hit, the fanfare, then the chimes for the
  // Stars the Debrief shows. Beat and Overdrive layer go. (The last hit
  // finishes the last word, which is clean here, so it also sounds a clean
  // word's chime, with the fanfare.)
  hit(game, 1);
  const debrief = game.getState().debrief;
  expect(debrief, 'Debrief after the clear').not.toBeNull();
  heard('Stage cleared', {
    beat: false,
    overdrive: false,
    hits: 1,
    cues: ['cleared', `stars:${debrief?.starsEarned}`],
  });
});

describe('the cue a hit makes', () => {
  /** A new Free Flight of `text` with the recording sound adapter listening. */
  function flightOf(text: string) {
    const sound = createRecordingSound();
    const { game } = loadGame(undefined, sound.effects);
    startFreeFlight(game, text);
    sound.takeCues();
    return { game, sound };
  }

  it('is a letter, a space, or a clean word’s finish, and a clean word’s finish chimes once', () => {
    // A Miss on the first "a", so "ab" is not clean: its space is a plain
    // space. "cd" is clean: its space finishes it. The second space of a run of
    // spaces holds no word.
    const { game, sound } = flightOf('ab cd  ef');

    typeTextWithMissMarks(game, 'ab cd  e', [0]);

    expect(sound.takeCues()).toEqual([
      'miss',
      'hit:LETTER',
      'hit:LETTER',
      'hit:SPACE',
      'hit:LETTER',
      'hit:LETTER',
      'hit:CLEAN',
      'chime:1',
      'hit:SPACE',
      'hit:LETTER',
    ]);
  });

  it('is the clean word’s cue on the last character of the text, which finishes its word', () => {
    const { game, sound } = flightOf('ab');

    typeText(game, 'a');
    expect(sound.takeCues()).toEqual(['hit:LETTER']);
    typeText(game, 'b');

    expect(sound.takeCues().slice(0, 2)).toEqual(['hit:CLEAN', 'chime:1']);
  });

  it('chimes at Streak 10, 20 and 30, by the Multiplier it reaches, and every 25 after 30', () => {
    const { game, sound } = flightOf(FLAT_TEXT);
    const cuesOfKey: string[][] = [];

    for (let key = 1; key <= 56; key++) {
      typeText(game, 'f');
      cuesOfKey[key] = sound.takeCues();
    }

    expect(cuesOfKey[9]).toEqual(['hit:LETTER']);
    expect(cuesOfKey[10]).toEqual(['hit:LETTER', 'chime:1']); // x2
    expect(cuesOfKey[11]).toEqual(['hit:LETTER']);
    expect(cuesOfKey[20]).toEqual(['hit:LETTER', 'chime:2']); // x3
    expect(cuesOfKey[30]).toEqual(['hit:LETTER', 'chime:3']); // x4
    expect(cuesOfKey[40]).toEqual(['hit:LETTER']);
    expect(cuesOfKey[54]).toEqual(['hit:LETTER']);
    expect(cuesOfKey[55]).toEqual(['hit:LETTER', 'chime:3']);
    expect(cuesOfKey[56]).toEqual(['hit:LETTER']);
  });

  it('is one chime, the milestone’s, when a milestone lands on a clean word’s finish', () => {
    // The 20th key is the space that finishes a clean 19-letter word, at Streak 20 (x3).
    const { game, sound } = flightOf(`${'f'.repeat(19)} ff`);

    typeText(game, 'f'.repeat(19));
    sound.takeCues();
    typeText(game, ' ');

    expect(sound.takeCues()).toEqual(['hit:CLEAN', 'chime:2']);
  });

  it('lights Overdrive after the hit that earned it', () => {
    const { game, sound } = flightOf(FLAT_TEXT);

    typeText(game, 'f'.repeat(28));
    sound.takeCues();
    typeText(game, 'f');

    expect(sound.takeCues()).toEqual(['hit:LETTER', 'ignition']);
  });
});
