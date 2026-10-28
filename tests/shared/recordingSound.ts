// A sound adapter for tests: it plays nothing and records what a player would
// hear. It imports from no test runner, so any layer of tests can use it.

import type { Cue, Sound, SoundState } from '../../src/game/sound';

/** What is sounding right now. */
export interface Heard {
  /** The music beat is playing. */
  beat: boolean;
  /** The Overdrive layer of the beat is switched on. */
  overdrive: boolean;
}

export interface RecordingSound {
  /** The sound adapter: pass to `createGame({ sound })`. */
  effects: Sound;
  /** What is sounding now. */
  heard(): Heard;
  /** The whole continuous sound the game last synced, or null before the first sync. */
  state(): SoundState | null;
  /** The one-shot cues since the last call, in the order they fired. Clears them. */
  takeCues(): string[];
}

/** A cue's name, as the tests read them. */
function nameOf(cue: Cue): string {
  switch (cue.type) {
    case 'hit':
      return `hit:${cue.grade.toUpperCase()}`;
    case 'stars':
      return `stars:${cue.count}`;
    default:
      return cue.type;
  }
}

/**
 * Records both halves of the sound port: the last state the game synced (what
 * is audible: the beat and its Overdrive layer) and the cues it played.
 */
export function createRecordingSound(): RecordingSound {
  let state: SoundState | null = null;
  let cues: string[] = [];

  const effects: Sound = {
    sync: (next) => {
      state = next;
    },
    play: (cue) => {
      cues.push(nameOf(cue));
    },
  };

  return {
    effects,
    heard: () => ({
      beat: state?.beat ?? false,
      overdrive: state?.overdrive ?? false,
    }),
    state: () => state,
    takeCues: () => {
      const taken = cues;
      cues = [];
      return taken;
    },
  };
}
