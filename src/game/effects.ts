import type { AudioSynthCore, BeatTheme } from '../types/game';

/**
 * What the game asks the outside world to do. Sound is attached from outside
 * through this port, so the rules never import the sound engine and tests run
 * without it.
 */
export interface GameEffects {
  init(): void;
  startBeat(): void;
  stopBeat(): void;
  setOverdrive(active: boolean): void;
  playLaneHit(
    lane: number,
    rating: 'PERFECT' | 'GREAT' | 'GOOD',
    isSpace: boolean,
  ): void;
  playHyperspaceIgnition(): void;
  playShieldAbsorb(): void;
  playMiss(): void;
  playStageVictory(): void;
  /** The chimes for the Stars earned, played a beat after the fanfare. */
  playStarChimes(stars: number): void;
  playShieldUpgrade(): void;
  playEquipCosmetic(): void;
  setGlobalMute(muted: boolean): void;
  setSoundEnabled(enabled: boolean): void;
  setSoundVolume(volume: number): void;
  setMusicEnabled(enabled: boolean): void;
  setMusicVolume(volume: number): void;
  setBeatTheme(theme: BeatTheme): void;
  setCore(core: AudioSynthCore): void;
}

const noop = () => {};

/** Does nothing. The default, and what tests get. */
export const silentEffects: GameEffects = {
  init: noop,
  startBeat: noop,
  stopBeat: noop,
  setOverdrive: noop,
  playLaneHit: noop,
  playHyperspaceIgnition: noop,
  playShieldAbsorb: noop,
  playMiss: noop,
  playStageVictory: noop,
  playStarChimes: noop,
  playShieldUpgrade: noop,
  playEquipCosmetic: noop,
  setGlobalMute: noop,
  setSoundEnabled: noop,
  setSoundVolume: noop,
  setMusicEnabled: noop,
  setMusicVolume: noop,
  setBeatTheme: noop,
  setCore: noop,
};
