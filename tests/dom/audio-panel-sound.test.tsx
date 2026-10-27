import { fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { STAGE_ID } from '../../src/game/testHelpers';
import { createRecordingSound } from '../shared/recordingSound';
import { RETURNING_PLAYER } from '../shared/saves';
import { renderGame, screen } from './harness';

// What the header's audio controls do to the sound the player hears: the
// panel is the player's way to change mute and the rhythm beats, so a click
// there must reach the speakers. `audio-panel.test.tsx` covers what the panel
// shows; the recording sound adapter stands in for the speakers here and says
// whether the beat is sounding. (`audio-panel-engine.test.tsx` covers the
// settings it can't see.)

const OPEN_PANEL = 'Open Audio Flight Deck Settings';
const NO_BEAT = { beat: false, overdrive: false };
const BEAT = { beat: true, overdrive: false };

/** The rhythm beats' volume slider: the second of the panel's two. */
const setMusicVolume = (value: number) => {
  fireEvent.change(screen.getAllByRole('slider')[1], {
    target: { value: String(value) },
  });
};

/** A Run in progress with the audio panel open over it. */
const flyWith = (profile: Record<string, unknown> = RETURNING_PLAYER) => {
  const sound = createRecordingSound();
  const player = renderGame({ profile, effects: sound.effects });
  player.startStage(STAGE_ID);
  player.click(OPEN_PANEL);
  return { player, sound };
};

describe('in a Run, the audio panel changes what is heard', () => {
  it('Mute All Audio silences the beat and Unmute brings it back', () => {
    const { player, sound } = flyWith();
    expect(sound.heard(), 'Run started').toEqual(BEAT);

    player.click('Mute All Audio');
    expect(sound.heard(), 'muted').toEqual(NO_BEAT);

    player.click('Unmute All Audio');
    expect(sound.heard(), 'unmuted').toEqual(BEAT);
  });

  it('the rhythm beats button silences the beat and brings it back', () => {
    const { player, sound } = flyWith();

    player.click('Mute Rhythm Beats');
    expect(sound.heard(), 'beats off').toEqual(NO_BEAT);

    player.click('Enable Rhythm Beats');
    expect(sound.heard(), 'beats on').toEqual(BEAT);
  });

  it('the beats volume slider at 0 silences the beat and raising it brings it back', () => {
    const { sound } = flyWith();

    setMusicVolume(0);
    expect(sound.heard(), 'volume 0').toEqual(NO_BEAT);

    setMusicVolume(0.5);
    expect(sound.heard(), 'volume raised').toEqual(BEAT);
  });
});
