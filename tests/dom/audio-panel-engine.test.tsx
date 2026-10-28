import { fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { engineSound } from '../../src/audio/engineSound';
import { STAGE_ID } from '../../src/game/testHelpers';
import { OWNS_RETRO_AUDIO_CORE } from '../shared/saves';
import { voiceName } from '../shared/screens';
import { renderGame, screen } from './harness';
import {
  OPEN_AUDIO_PANEL,
  muteAllLabel,
  laserSfxLabel,
  rhythmBeatsLabel,
} from '../../src/screens/audioLabels';

// What the sound engine ends up set to: the Synthesizer Voice, the beat theme,
// both volumes and their on/off, and mute. A Save's settings must reach it at
// the start of a Run, and a click in the header's audio panel must change it,
// whoever does the pushing (the app, the game). The engine needs an
// AudioContext, so a stand-in keeps the last thing it was told for each
// setting; only where it ends up is asserted, not how often it was told.
// Which settings the recording sound adapter can't see is why this exists.

const engine = vi.hoisted(() => ({ last: new Map<string, unknown>() }));

vi.mock('../../src/audio/soundEngine', () => ({
  soundEngine: new Proxy(
    {},
    {
      get:
        (_target, method: string) =>
        (...args: unknown[]) => {
          engine.last.set(method, args[0]);
        },
    },
  ),
}));

/** The settings the engine holds now. */
const engineSettings = () => ({
  muted: engine.last.get('setGlobalMute'),
  laserSounds: engine.last.get('setSoundEnabled'),
  laserVolume: engine.last.get('setSoundVolume'),
  beats: engine.last.get('setMusicEnabled'),
  beatsVolume: engine.last.get('setMusicVolume'),
  beatTheme: engine.last.get('setBeatTheme'),
  voice: engine.last.get('setCore'),
});

const slider = (which: 'laser' | 'beats', value: number) =>
  fireEvent.change(screen.getAllByRole('slider')[which === 'laser' ? 0 : 1], {
    target: { value: String(value) },
  });

/** A Save with the 8-Bit Retro voice equipped and the other settings off their defaults. */
const CUSTOM_SAVE = {
  ...OWNS_RETRO_AUDIO_CORE,
  upgrades: {
    unlockedAudioCores: ['CYBER_SYNTH', 'RETRO_8BIT'],
    equippedAudioCore: 'RETRO_8BIT',
  },
  beatTheme: 'COSMIC_LOFI',
  soundVolume: 0.3,
  musicVolume: 0.7,
};

it('a Save with its own voice, theme and volumes reaches the engine when a Run starts', () => {
  const player = renderGame({ profile: CUSTOM_SAVE, sound: engineSound });

  player.startStage(STAGE_ID);

  expect(engineSettings()).toEqual({
    muted: false,
    laserSounds: true,
    laserVolume: 0.3,
    beats: true,
    beatsVolume: 0.7,
    beatTheme: 'COSMIC_LOFI',
    voice: 'RETRO_8BIT',
  });
});

it('a muted Save reaches the engine muted when a Run starts', () => {
  const player = renderGame({
    profile: { ...CUSTOM_SAVE, globalMuted: true },
    sound: engineSound,
  });

  player.startStage(STAGE_ID);

  expect(engineSettings().muted).toBe(true);
});

it('each control in the panel sets the engine', () => {
  const player = renderGame({
    profile: OWNS_RETRO_AUDIO_CORE,
    sound: engineSound,
  });
  player.startStage(STAGE_ID);
  player.click(OPEN_AUDIO_PANEL);

  player.click(voiceName('RETRO_8BIT'));
  expect(engineSettings().voice, 'voice').toBe('RETRO_8BIT');

  player.click(/Cyber Pulse/);
  expect(engineSettings().beatTheme, 'beat theme').toBe('CYBER_PULSE');

  slider('laser', 0.2);
  expect(engineSettings().laserVolume, 'laser volume').toBe(0.2);
  slider('beats', 0.9);
  expect(engineSettings().beatsVolume, 'beats volume').toBe(0.9);

  player.click(laserSfxLabel(true));
  expect(engineSettings().laserSounds, 'laser sounds off').toBe(false);
  player.click(laserSfxLabel(false));
  expect(engineSettings().laserSounds, 'laser sounds on').toBe(true);

  player.click(rhythmBeatsLabel(true));
  expect(engineSettings().beats, 'beats off').toBe(false);
  player.click(rhythmBeatsLabel(false));
  expect(engineSettings().beats, 'beats on').toBe(true);

  player.click(muteAllLabel(false));
  expect(engineSettings().muted, 'muted').toBe(true);
  player.click(muteAllLabel(true));
  expect(engineSettings().muted, 'unmuted').toBe(false);
});
