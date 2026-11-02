import type { Cue, Sound } from '../game/sound';
import { soundEngine } from './soundEngine';

/** The pause after the fanfare, then between chimes, in milliseconds. */
const CHIME_AT_MS = [300, 700, 1100] as const;

/**
 * The engine's sound for each cue. A cue type with no entry fails the build,
 * so a forgotten cue can't compile and then play nothing.
 */
const PLAYING: {
  [Type in Cue['type']]: (cue: Extract<Cue, { type: Type }>) => void;
} = {
  hit: (cue) => soundEngine.playLaneHit(cue.lane, cue.grade, cue.space),
  shield: () => soundEngine.playShieldAbsorb(),
  miss: () => soundEngine.playMiss(),
  ignition: () => soundEngine.playOverdriveIgnition(),
  cleared: () => soundEngine.playStageCleared(),
  // One chime per Star, a beat after the fanfare.
  stars: (cue) => {
    CHIME_AT_MS.forEach((delay, i) => {
      if (cue.count > i) {
        setTimeout(
          () => soundEngine.playStarChime((i + 1) as 1 | 2 | 3),
          delay,
        );
      }
    });
  },
  upgrade: () => soundEngine.playShieldUpgrade(),
  equip: () => soundEngine.playEquipCosmetic(),
};

/**
 * Plays the game's sound through the sound engine. The app attaches this.
 * `sync` makes the engine match the state; `play` turns a cue into the
 * engine's own sound.
 */
export const engineSound: Sound = {
  sync(state) {
    // Settings first, so that the beat sees the mute and the volumes it needs.
    soundEngine.setGlobalMute(state.muted);
    soundEngine.setSoundEnabled(state.sfxOn);
    soundEngine.setSoundVolume(state.sfxVolume);
    soundEngine.setMusicEnabled(state.musicOn);
    soundEngine.setMusicVolume(state.musicVolume);
    soundEngine.setBeatTheme(state.theme);
    soundEngine.setCore(state.core);
    soundEngine.setOverdrive(state.overdrive);
    if (state.beat) soundEngine.startBeat();
    else soundEngine.stopBeat();
  },

  play(cue) {
    // `PLAYING` has a sound for every cue type; the cast only joins the two.
    (PLAYING[cue.type] as (cue: Cue) => void)(cue);
  },
};
