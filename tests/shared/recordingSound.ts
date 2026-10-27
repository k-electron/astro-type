// A sound adapter for tests: it plays nothing and records what a player would
// hear. It imports from no test runner, so any layer of tests can use it.

import type { GameEffects } from '../../src/game/effects';

/** What is sounding right now. */
export interface Heard {
  /** The music beat is playing. */
  beat: boolean;
  /** The Overdrive layer of the beat is switched on. */
  overdrive: boolean;
}

export interface RecordingSound {
  /** Pass to `createGame({ effects })`. */
  effects: GameEffects;
  /** What is sounding now. */
  heard(): Heard;
  /** The one-shot cues since the last call, in the order they fired. Clears them. */
  takeCues(): string[];
}

/**
 * Today's port is a list of commands, so the adapter has to keep the little
 * state the sound engine keeps to turn them into what is audible: a beat
 * starts only when sound is allowed (not muted, music on, volume above 0), and
 * muting or turning music off stops it. Everything else is a plain record.
 */
export function createRecordingSound(): RecordingSound {
  let beat = false;
  let overdrive = false;
  let muted = false;
  let musicEnabled = true;
  let musicVolume = 0.4;
  let cues: string[] = [];
  const cue = (name: string) => cues.push(name);

  const effects: GameEffects = {
    init: () => {},
    startBeat: () => {
      if (!muted && musicEnabled && musicVolume > 0) beat = true;
    },
    stopBeat: () => {
      beat = false;
    },
    setOverdrive: (active) => {
      overdrive = active;
    },
    playLaneHit: (_lane, rating) => cue(`hit:${rating}`),
    playHyperspaceIgnition: () => cue('ignition'),
    playShieldAbsorb: () => cue('shield'),
    playMiss: () => cue('miss'),
    playStageVictory: () => cue('victory'),
    playStarChimes: (stars) => cue(`stars:${stars}`),
    playShieldUpgrade: () => cue('upgrade'),
    playEquipCosmetic: () => cue('equip'),
    setGlobalMute: (value) => {
      muted = value;
      if (value) beat = false;
    },
    setSoundEnabled: () => {},
    setSoundVolume: () => {},
    setMusicEnabled: (enabled) => {
      musicEnabled = enabled;
      if (!enabled) beat = false;
    },
    setMusicVolume: (volume) => {
      musicVolume = volume;
    },
    setBeatTheme: () => {},
    setCore: () => {},
  };

  return {
    effects,
    heard: () => ({ beat, overdrive }),
    takeCues: () => {
      const taken = cues;
      cues = [];
      return taken;
    },
  };
}
