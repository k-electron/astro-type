import { fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { soundEffects } from '../../src/audio/soundEffects';
import { STAGE_ID } from '../../src/game/testHelpers';
import { OWNS_RETRO_AUDIO_CORE } from '../shared/saves';
import { renderGame, screen } from './harness';

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

const OPEN_PANEL = 'Open Audio Flight Deck Settings';

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
  const player = renderGame({ profile: CUSTOM_SAVE, effects: soundEffects });

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
    effects: soundEffects,
  });

  player.startStage(STAGE_ID);

  expect(engineSettings().muted).toBe(true);
});

it('each control in the panel sets the engine', () => {
  const player = renderGame({
    profile: OWNS_RETRO_AUDIO_CORE,
    effects: soundEffects,
  });
  player.startStage(STAGE_ID);
  player.click(OPEN_PANEL);

  player.click(/Retro 8-Bit/);
  expect(engineSettings().voice, 'voice').toBe('RETRO_8BIT');

  player.click(/Cyber Pulse/);
  expect(engineSettings().beatTheme, 'beat theme').toBe('CYBER_PULSE');

  slider('laser', 0.2);
  expect(engineSettings().laserVolume, 'laser volume').toBe(0.2);
  slider('beats', 0.9);
  expect(engineSettings().beatsVolume, 'beats volume').toBe(0.9);

  player.click('Mute Laser SFX');
  expect(engineSettings().laserSounds, 'laser sounds off').toBe(false);
  player.click('Enable Laser SFX');
  expect(engineSettings().laserSounds, 'laser sounds on').toBe(true);

  player.click('Mute Rhythm Beats');
  expect(engineSettings().beats, 'beats off').toBe(false);
  player.click('Enable Rhythm Beats');
  expect(engineSettings().beats, 'beats on').toBe(true);

  player.click('Mute All Audio');
  expect(engineSettings().muted, 'muted').toBe(true);
  player.click('Unmute All Audio');
  expect(engineSettings().muted, 'unmuted').toBe(false);
});
