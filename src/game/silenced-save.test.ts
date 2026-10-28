import { describe, expect, it } from 'vitest';
import { createRecordingSound } from '../../tests/shared/recordingSound';
import { RETURNING_PLAYER } from '../../tests/shared/saves';
import { loadGame, STAGE_ID, startStage } from './testHelpers';

/**
 * What `sound.test.ts` leaves open: a Save whose sound settings are already
 * off when the game loads (the Star chimes are in `sound-chimes.test.ts`). The
 * recording sound adapter stands in for the speakers.
 */

describe('a Save that starts with sound settings already off', () => {
  // Each Save is the returning player's with one setting off. Starting a Run
  // must not start the beat the player has silenced, and turning the setting
  // back on, in the Run, must start it.
  const SILENCED = [
    {
      name: 'muted',
      save: { globalMuted: true },
      turnOn: { globalMuted: false },
    },
    {
      name: 'music off',
      save: { musicEnabled: false },
      turnOn: { musicEnabled: true },
    },
    {
      name: 'music volume 0',
      save: { musicVolume: 0 },
      turnOn: { musicVolume: 0.6 },
    },
  ];

  it.each(SILENCED)(
    '$name: no beat at the start of a Run, the beat once it is turned on',
    ({ save, turnOn }) => {
      const sound = createRecordingSound();
      const { game } = loadGame(
        { ...RETURNING_PLAYER, ...save },
        sound.effects,
      );

      startStage(game, STAGE_ID);
      expect(sound.heard(), 'Run started').toEqual({
        beat: false,
        overdrive: false,
      });

      game.changeSettings(turnOn);
      expect(sound.heard(), 'turned on in the Run').toEqual({
        beat: true,
        overdrive: false,
      });
    },
  );

  it('muted: still no beat after a pause and resume, until unmuted', () => {
    const sound = createRecordingSound();
    const { game } = loadGame(
      { ...RETURNING_PLAYER, globalMuted: true },
      sound.effects,
    );
    startStage(game, STAGE_ID);

    game.send({ type: 'PRESS_PAUSE' });
    game.send({ type: 'PRESS_RESUME' });
    expect(sound.heard(), 'resumed').toEqual({ beat: false, overdrive: false });

    game.changeSettings({ globalMuted: false });
    expect(sound.heard(), 'unmuted').toEqual({ beat: true, overdrive: false });
  });

  it('muted and music off: unmuting alone leaves the beat off', () => {
    const sound = createRecordingSound();
    const { game } = loadGame(
      { ...RETURNING_PLAYER, globalMuted: true, musicEnabled: false },
      sound.effects,
    );
    startStage(game, STAGE_ID);

    game.changeSettings({ globalMuted: false });
    expect(sound.heard(), 'unmuted, music still off').toEqual({
      beat: false,
      overdrive: false,
    });

    game.changeSettings({ musicEnabled: true });
    expect(sound.heard(), 'music on').toEqual({ beat: true, overdrive: false });
  });
});
