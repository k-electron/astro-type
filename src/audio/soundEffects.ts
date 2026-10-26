import type { GameEffects } from '../game/effects';
import { soundEngine } from './soundEngine';

/** Plays the game's effects through the sound engine. The app attaches this. */
export const soundEffects: GameEffects = {
  init: () => soundEngine.init(),
  startBeat: () => soundEngine.startBeat(),
  stopBeat: () => soundEngine.stopBeat(),
  setOverdrive: (active) => soundEngine.setOverdrive(active),
  playLaneHit: (lane, rating, isSpace) =>
    soundEngine.playLaneHit(lane, rating, isSpace),
  playHyperspaceIgnition: () => soundEngine.playHyperspaceIgnition(),
  playShieldAbsorb: () => soundEngine.playShieldAbsorb(),
  playMiss: () => soundEngine.playMiss(),
  playStageVictory: () => soundEngine.playStageVictory(),
  playStarChimes: (stars) => {
    if (stars >= 1) setTimeout(() => soundEngine.playStarChime(1), 300);
    if (stars >= 2) setTimeout(() => soundEngine.playStarChime(2), 700);
    if (stars >= 3) setTimeout(() => soundEngine.playStarChime(3), 1100);
  },
  playShieldUpgrade: () => soundEngine.playShieldUpgrade(),
  playEquipCosmetic: () => soundEngine.playEquipCosmetic(),
  setGlobalMute: (muted) => soundEngine.setGlobalMute(muted),
  setSoundEnabled: (enabled) => soundEngine.setSoundEnabled(enabled),
  setSoundVolume: (volume) => soundEngine.setSoundVolume(volume),
  setMusicEnabled: (enabled) => soundEngine.setMusicEnabled(enabled),
  setMusicVolume: (volume) => soundEngine.setMusicVolume(volume),
  setBeatTheme: (theme) => soundEngine.setBeatTheme(theme),
  setCore: (core) => soundEngine.setCore(core),
};
