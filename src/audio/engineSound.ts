import type { Sound } from '../game/sound';
import { soundEngine } from './soundEngine';

/** The pause after the fanfare, then between chimes, in milliseconds. */
const CHIME_AT_MS = [300, 700, 1100] as const;

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
    switch (cue.type) {
      case 'hit':
        soundEngine.playLaneHit(cue.lane, cue.grade, cue.space);
        return;
      case 'shield':
        soundEngine.playShieldAbsorb();
        return;
      case 'miss':
        soundEngine.playMiss();
        return;
      case 'ignition':
        soundEngine.playOverdriveIgnition();
        return;
      case 'cleared':
        soundEngine.playStageCleared();
        return;
      case 'stars':
        // One chime per Star, a beat after the fanfare.
        CHIME_AT_MS.forEach((delay, i) => {
          if (cue.count > i) {
            setTimeout(
              () => soundEngine.playStarChime((i + 1) as 1 | 2 | 3),
              delay,
            );
          }
        });
        return;
      case 'upgrade':
        soundEngine.playShieldUpgrade();
        return;
      case 'equip':
        soundEngine.playEquipCosmetic();
        return;
    }
  },
};
