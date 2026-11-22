import type { RunPhase } from './machine';
import type { SoundKit, BeatTheme, PlayerProfile } from './schemas';
import type { LivePerformance } from './rules';
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
  /** The Sound Kit. */
  soundKit: SoundKit;
  /** The beat plays only while a Run is running, and only when music can be heard. */
  beat: boolean;
  /** The beat's Overdrive layer. It follows Overdrive in a running Run, heard or not. */
  overdrive: boolean;
}

/** What a hit sounds like: a letter, a space, or the finish of a clean word (the biggest). */
export type HitKind = 'letter' | 'space' | 'clean';

/** A one-shot sound. */
export type Cue =
  | { type: 'hit'; lane: number; kind: HitKind }
  /** The chime of a clean word's finish (tier 1) or of a Streak milestone: tier 1 at x2, 2 at x3, 3 from x4. */
  | { type: 'chime'; tier: 1 | 2 | 3 }
  | { type: 'miss' }
  | { type: 'ignition' }
  | { type: 'cleared' }
  /** The chimes for the Stars earned, played a beat after the fanfare. */
  | { type: 'stars'; count: number }
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
type RunSound = Pick<LivePerformance, 'overdriveActive'>;

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
    soundKit: profile.cosmetics.soundKit.equipped,
    beat: running && musicHeard,
    overdrive: running && run.overdriveActive,
  };
}

export function sameSound(a: SoundState, b: SoundState): boolean {
  return (Object.keys(a) as (keyof SoundState)[]).every((k) => a[k] === b[k]);
}

/** The cues for a moment, in the order they play. */
export function cueFor(moment: Moment): Cue[] {
  switch (moment.type) {
    case 'hit': {
      const kind: HitKind = moment.cleanWord
        ? 'clean'
        : moment.key === ' '
          ? 'space'
          : 'letter';
      const cues: Cue[] = [{ type: 'hit', lane: moment.lane, kind }];
      // A milestone's chime takes the place of the clean word's.
      if (moment.milestone) {
        cues.push({ type: 'chime', tier: milestoneTier(moment.multiplier) });
      } else if (moment.cleanWord) {
        cues.push({ type: 'chime', tier: 1 });
      }
      return cues;
    }
    case 'miss':
    case 'ignition':
      return [{ type: moment.type }];
    case 'launched':
      // The beat starts from the state (a Run is running), not from a cue.
      return [];
    case 'cleared':
      return [{ type: 'cleared' }, { type: 'stars', count: moment.stars }];
    case 'equip':
      return [{ type: 'equip' }];
  }
}

/** The chime tier of a Streak milestone: x2 is tier 1, x3 tier 2, x4 and beyond tier 3. */
export function milestoneTier(multiplier: number): 1 | 2 | 3 {
  return Math.min(3, Math.max(1, multiplier - 1)) as 1 | 2 | 3;
}
