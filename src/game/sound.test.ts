import { expect, it } from 'vitest';
import { createRecordingSound } from '../../tests/shared/recordingSound';
import { createGame, createMemoryStorage } from './createGame';
import { hitPerfect, miss, SAMPLE_TEXT, STAGE_ID } from './testHelpers';

/**
 * What the player hears, moment by moment through one scripted Run: whether
 * the beat and its Overdrive layer are sounding, and which one-shot cue just
 * fired. The recording sound adapter stands in for the speakers; the Run is
 * driven through the `Game` and nothing else is read.
 *
 * Mute and music volume have no method on the `Game` yet. They are the
 * Settings buttons' own Profile commands, so the script presses those, and
 * reads nothing back from the store.
 */

const HIT = 'hit:PERFECT';
const hits = (count: number) => Array.from({ length: count }, () => HIT);

it('sounds right at every moment of a Run', () => {
  const sound = createRecordingSound();
  const game = createGame({
    storage: createMemoryStorage({ totalCredits: 5000 }),
    effects: sound.effects,
  });
  const settings = () => game.store.getState();

  /** Assert the moment: is the beat sounding, is the Overdrive layer on, and which cues just fired. */
  const heard = (
    moment: string,
    expected: { beat: boolean; overdrive: boolean; cues?: string[] },
  ) => {
    expect(sound.heard(), `${moment}: beat and Overdrive layer`).toEqual({
      beat: expected.beat,
      overdrive: expected.overdrive,
    });
    expect(sound.takeCues(), `${moment}: cues`).toEqual(expected.cues ?? []);
  };

  /** Hit Perfects one at a time until Overdrive catches fire. Quiet until then. */
  const hitUntilOverdrive = (moment: string) => {
    const budget = SAMPLE_TEXT.length - game.getRun().currentCharIndex - 2;
    for (let i = 0; i < budget; i++) {
      hitPerfect(game, 1);
      if (sound.heard().overdrive) {
        heard(`${moment}: Overdrive ignites`, {
          beat: true,
          overdrive: true,
          cues: [HIT, 'ignition'],
        });
        return;
      }
      heard(`${moment}: hit ${i + 1} before Overdrive`, {
        beat: true,
        overdrive: false,
        cues: [HIT],
      });
    }
    throw new Error(`${moment}: Overdrive never ignited`);
  };

  // On the menu: no beat.
  heard('menu', { beat: false, overdrive: false });
  settings().toggleGlobalMute();
  settings().toggleGlobalMute();
  heard('menu, muted and unmuted', { beat: false, overdrive: false });

  // Start: the beat comes in, Overdrive off.
  game.startStage(STAGE_ID);
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
  game.send({ type: 'PRESS_PAUSE' });
  heard('paused', { beat: false, overdrive: false });

  // Settings changed while paused do not start the beat.
  settings().setMusicVolume(0.6);
  heard('paused, music volume changed', { beat: false, overdrive: false });

  // Resume: the beat is back, with the Overdrive that was running.
  game.send({ type: 'PRESS_RESUME' });
  heard('resumed', { beat: true, overdrive: true });

  // Mute in the Run silences the beat; unmute brings it back.
  settings().toggleGlobalMute();
  heard('muted', { beat: false, overdrive: true });
  settings().toggleGlobalMute();
  heard('unmuted', { beat: true, overdrive: true });

  // Music volume 0 silences the beat; raising it brings it back.
  settings().setMusicVolume(0);
  heard('music volume 0', { beat: false, overdrive: true });
  settings().setMusicVolume(0.6);
  heard('music volume raised', { beat: true, overdrive: true });

  // Resuming while muted stays quiet until unmuted.
  game.send({ type: 'PRESS_PAUSE' });
  settings().toggleGlobalMute();
  game.send({ type: 'PRESS_RESUME' });
  heard('resumed while muted', { beat: false, overdrive: true });
  settings().toggleGlobalMute();
  heard('unmuted after resuming', { beat: true, overdrive: true });

  // Typing on to the last character: a hit cue each, nothing else.
  const left = SAMPLE_TEXT.length - 1 - game.getRun().currentCharIndex;
  hitPerfect(game, left);
  heard('typed on to the last character', {
    beat: true,
    overdrive: true,
    cues: hits(left),
  });

  // Clearing the Stage: the last hit, the fanfare, then the chimes for the
  // Stars the Debrief shows. Beat and Overdrive layer go.
  hitPerfect(game, 1);
  const debrief = game.getDebrief();
  expect(debrief, 'Debrief after the clear').not.toBeNull();
  heard('Stage cleared', {
    beat: false,
    overdrive: false,
    cues: [HIT, 'victory', `stars:${debrief?.starsEarned}`],
  });

  // Buying an Upgrade in the Debrief: its own cue, and the music stays off.
  expect(game.buyUpgrade('shields'), 'the Upgrade is bought').toBe(true);
  heard('Upgrade bought', { beat: false, overdrive: false, cues: ['upgrade'] });
});
