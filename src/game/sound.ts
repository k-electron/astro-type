import type { RunPhase } from '../store/gameMachine';
import type {
  AudioSynthCore,
  BeatTheme,
  PlayerProfile,
} from '../store/schemas';
import type { Grade, LivePerformance } from './rules';
import type { Moment } from './moments';

/**
 * Sound is state plus cues. The state is everything continuous the player
 * hears, worked out from the Profile and the Run; the game hands it to the
 * sound port whenever it changes. A cue is a one-shot: something just
 * happened. Nothing here imports the sound engine or the browser, so the
 * rules and the tests run without it.
 */

/** Everything continuous the player hears, as one value. */
export interface SoundState {
  muted: boolean;
  /** Laser SFX switch and volume. */
  sfxOn: boolean;
  sfxVolume: number;
  /** Rhythm Beats switch and volume. */
  musicOn: boolean;
  musicVolume: number;
  theme: BeatTheme;
  /** The Synthesizer Voice. */
  core: AudioSynthCore;
  /** The beat plays only while a Run is running, and only when music can be heard. */
  beat: boolean;
  /** The beat's Overdrive layer. It follows Overdrive in a running Run, heard or not. */
  overdrive: boolean;
}

/** A one-shot sound. */
export type Cue =
  | { type: 'hit'; lane: number; grade: Grade; space: boolean }
  | { type: 'shield' }
  | { type: 'miss' }
  | { type: 'ignition' }
  | { type: 'victory' }
  /** The chimes for the Stars earned, played a beat after the fanfare. */
  | { type: 'stars'; count: number }
  | { type: 'upgrade' }
  | { type: 'equip' };

/** How sound is attached to the game. The app gives it the engine; tests get silence or a recorder. */
export interface Sound {
  /** Make the speakers match this state. Called when it changes, and once at the start. */
  sync(state: SoundState): void;
  /** Play a one-shot. */
  play(cue: Cue): void;
}

const noop = () => {};

/** Does nothing. The default, and what tests get. */
export const silentSound: Sound = { sync: noop, play: noop };

/**
 * The beat themes the player can pick from, by name, with the tempo each one
 * plays at. The audio panel lists them and the sound engine plays at their
 * tempo.
 */
export const BEAT_THEMES: Record<BeatTheme, { name: string; bpm: number }> = {
  NEON_SYNTHWAVE: { name: 'Synthwave', bpm: 106 },
  CYBER_PULSE: { name: 'Cyber Pulse', bpm: 122 },
  COSMIC_LOFI: { name: 'Cosmic Lo-Fi', bpm: 84 },
};

/** What the Run contributes to the sound: only whether Overdrive is on. */
type RunSound = Pick<LivePerformance, 'hyperspaceActive'>;

export function soundStateOf(
  profile: PlayerProfile,
  phase: RunPhase,
  run: RunSound,
): SoundState {
  const running = phase === 'running';
  const musicHeard =
    !profile.globalMuted && profile.musicEnabled && profile.musicVolume > 0;
  return {
    muted: profile.globalMuted,
    sfxOn: profile.soundEnabled,
    sfxVolume: profile.soundVolume,
    musicOn: profile.musicEnabled,
    musicVolume: profile.musicVolume,
    theme: profile.beatTheme,
    core: profile.upgrades.equippedAudioCore,
    beat: running && musicHeard,
    overdrive: running && run.hyperspaceActive,
  };
}

export function sameSound(a: SoundState, b: SoundState): boolean {
  return (Object.keys(a) as (keyof SoundState)[]).every((k) => a[k] === b[k]);
}

/** The cues for a moment, in the order they play. */
export function cueFor(moment: Moment): Cue[] {
  switch (moment.type) {
    case 'hit':
      return [
        {
          type: 'hit',
          lane: moment.lane,
          grade: moment.grade,
          space: moment.key === ' ',
        },
      ];
    case 'miss':
    case 'shield':
    case 'ignition':
      return [{ type: moment.type }];
    case 'cleared':
      return [{ type: 'victory' }, { type: 'stars', count: moment.stars }];
    case 'upgrade':
      return [{ type: 'upgrade' }];
    case 'equip':
      return [{ type: 'equip' }];
  }
}
