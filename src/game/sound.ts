import { getNoteLaneAndFinger } from '../data/curriculum';
import type {
  AudioSynthCore,
  BeatTheme,
  LivePerformance,
  PlayerProfile,
  RunPhase,
} from '../types/game';
import type { Judgement } from './rules';

/**
 * Sound is state plus cues. The state is everything continuous the player
 * hears, worked out from the Profile and the Run; the game hands it to the
 * sound port whenever it changes. A cue is a one-shot: something just
 * happened. Nothing here imports the sound engine or the browser, so the
 * rules and the tests run without it.
 */

type Grade = Extract<Judgement, { type: 'hit' }>['grade'];

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

/**
 * What just happened that has a sound of its own. The game's moments will
 * replace this (#70); until then it is the Judgement, Overdrive catching fire,
 * a Stage clear and a purchase.
 */
export type JustHappened =
  | { type: 'judgement'; judgement: Judgement }
  | { type: 'ignition' }
  | { type: 'clear'; stars: number }
  | { type: 'purchase'; kind: 'upgrade' | 'trail' | 'core' };

/** The cues for what just happened, in the order they play. */
export function cueFor(happened: JustHappened): Cue[] {
  switch (happened.type) {
    case 'judgement': {
      const { judgement } = happened;
      if (judgement.type === 'hit') {
        return [
          {
            type: 'hit',
            lane: getNoteLaneAndFinger(judgement.key).lane,
            grade: judgement.grade,
            space: judgement.key === ' ',
          },
        ];
      }
      return [{ type: judgement.type }];
    }
    case 'ignition':
      return [{ type: 'ignition' }];
    case 'clear':
      return [{ type: 'victory' }, { type: 'stars', count: happened.stars }];
    case 'purchase':
      // A Synthesizer Voice is sound state, not a cue: it just starts sounding.
      if (happened.kind === 'upgrade') return [{ type: 'upgrade' }];
      if (happened.kind === 'trail') return [{ type: 'equip' }];
      return [];
  }
}
