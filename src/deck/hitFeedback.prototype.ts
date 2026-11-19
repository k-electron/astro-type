/**
 * PROTOTYPE, throw away: "Hit feedback without grades" (issue #129, map #123).
 *
 * Three ways a hit can look and sound once Perfect, Great and Good are gone,
 * picked with `?hits=` on the URL. With no `?hits=`, the game is exactly as it
 * is today. The rules still judge grades underneath; only what the player sees
 * and hears changes here.
 *
 * - `?hits=steady`: every hit is a full hit. Today's Perfect look and sound on
 *   every keystroke, whatever the timing.
 * - `?hits=streak`: the Streak builds the show. Each hit grows with the
 *   Multiplier (x1 small, up to x4 huge, a colour per step), and banners mark
 *   x2, x3, x4 and every 25 after. Breaking a Streak of 10 or more says so.
 * - `?hits=words`: words land. Letters are quiet; the space that finishes a
 *   word with no Miss mark sets off the big explosion, a "CLEAN" banner with
 *   the word, and a chime.
 * - `?hits=mix`: the recommended combination. Letters get a solid mid-size hit
 *   coloured by the Multiplier tier; a clean word gets the big explosion and a
 *   chime (with a "CLEAN" banner only for the first three in a Run); the x2,
 *   x3, x4 banners stay; nothing announces a broken Streak.
 */
import type { Grade, Run } from '../game/rules';

export type HitsVariant = 'steady' | 'streak' | 'words' | 'mix';

export const HITS_VARIANTS: readonly HitsVariant[] = [
  'steady',
  'streak',
  'words',
  'mix',
];

export const HITS_VARIANT_NAMES: Record<HitsVariant, string> = {
  steady: 'Every hit is a full hit',
  streak: 'The Streak builds the show',
  words: 'Words land',
  mix: 'Recommended mix',
};

function readVariant(): HitsVariant | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('hits');
  return HITS_VARIANTS.find((v) => v === value) ?? null;
}

/** The variant this page was loaded with, or null for today's feedback. */
export const hitsVariant: HitsVariant | null = readVariant();

/** A big line of text across the deck. */
export interface Banner {
  label: string;
  color: string;
}

/** How one hit looks and sounds in the variant. */
export interface HitFeedback {
  /** How big the explosion and the sound are: perfect is biggest. */
  size: Grade;
  color: string;
  /** The popup over the Drone. */
  label: string;
  banner: Banner | null;
  /** A Star chime on top of the hit sound. */
  chime: 1 | 2 | 3 | null;
}

const TIER_COLOR: Record<number, string> = {
  1: '#38bdf8',
  2: '#4ade80',
  3: '#fbbf24',
  4: '#e879f9',
};

const TIER_SIZE: Record<number, Grade> = {
  1: 'good',
  2: 'great',
  3: 'perfect',
  4: 'perfect',
};

const FULL_STEMS = [
  '💥 VAPORIZED!',
  '🎯 CRITICAL HIT!',
  '⚡ DRONE DESTROYED!',
  '🔥 DIRECT HIT!',
];

const pick = <T>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)];

/** The word the hit at `index` finished, and whether it has no Miss mark, or null mid-word. */
function finishedWord(
  run: Run,
  index: number,
): { word: string; clean: boolean } | null {
  const text = run.stage.sampleText;
  const isLast = index === text.length - 1;
  if (text[index] !== ' ' && !isLast) return null;
  const end = text[index] === ' ' ? index - 1 : index;
  let start = end;
  while (start > 0 && text[start - 1] !== ' ') start--;
  if (end < start) return null;
  let clean = true;
  for (let i = start; i <= index; i++) {
    if (run.errorIndices.has(i)) clean = false;
  }
  return { word: text.slice(start, end + 1), clean };
}

/**
 * The feedback for a hit, read from the Run as it is just after the hit (the
 * game emits the hit after it has moved the Run on). Null without a variant.
 */
export function hitFeedback(
  run: Run,
  points: number,
  overdrive: boolean,
): HitFeedback | null {
  if (!hitsVariant) return null;
  const index = run.currentCharIndex - 1;
  const isSpace = run.stage.sampleText[index] === ' ';

  if (hitsVariant === 'steady') {
    return {
      size: 'perfect',
      color: isSpace ? '#34d399' : '#38bdf8',
      label: `${
        isSpace
          ? '💥 FLAGSHIP OBLITERATED!'
          : overdrive
            ? '⚡ OVERDRIVE STRIKE!'
            : pick(FULL_STEMS)
      } +${points}`,
      banner: null,
      chime: null,
    };
  }

  if (hitsVariant === 'streak') {
    const tier = run.multiplier;
    const streak = run.currentStreak;
    let banner: Banner | null = null;
    let chime: HitFeedback['chime'] = null;
    if (streak === 10 || streak === 20 || streak === 30) {
      banner = {
        label: `x${tier} MULTIPLIER — STREAK ${streak}`,
        color: TIER_COLOR[tier],
      };
      chime = Math.min(3, tier - 1) as 1 | 2 | 3;
    } else if (streak > 30 && streak % 25 === 0) {
      banner = { label: `🔥 STREAK ${streak}!`, color: TIER_COLOR[4] };
      chime = 3;
    }
    return {
      size: overdrive ? 'perfect' : TIER_SIZE[tier],
      color: overdrive ? '#f97316' : TIER_COLOR[tier],
      label: tier > 1 ? `x${tier}  +${points}` : `+${points}`,
      banner,
      chime,
    };
  }

  if (hitsVariant === 'mix') return mixFeedback(run, index, points, overdrive);

  // words
  const word = finishedWord(run, index);
  if (word?.clean) {
    return {
      size: 'perfect',
      color: '#34d399',
      label: `+${points}`,
      banner: { label: `✨ CLEAN  ${word.word.trim()}`, color: '#34d399' },
      chime: 1,
    };
  }
  if (word) {
    return {
      size: 'great',
      color: '#94a3b8',
      label: `+${points}`,
      banner: null,
      chime: null,
    };
  }
  return {
    size: 'good',
    color: overdrive ? '#f97316' : '#38bdf8',
    label: `+${points}`,
    banner: null,
    chime: null,
  };
}

/** How many words up to and including the one ending at `index` were clean. */
function cleanWordsSoFar(run: Run, index: number): number {
  const text = run.stage.sampleText;
  let count = 0;
  let clean = true;
  let inWord = false;
  for (let i = 0; i <= index; i++) {
    if (text[i] !== ' ') inWord = true;
    if (run.errorIndices.has(i)) clean = false;
    const ends = text[i] === ' ' || i === text.length - 1;
    if (ends) {
      if (inWord && clean) count++;
      clean = true;
      inWord = false;
    }
  }
  return count;
}

function streakBanner(run: Run): Banner | null {
  const tier = run.multiplier;
  const streak = run.currentStreak;
  if (streak === 10 || streak === 20 || streak === 30) {
    return {
      label: `x${tier} MULTIPLIER — STREAK ${streak}`,
      color: TIER_COLOR[tier],
    };
  }
  if (streak > 30 && streak % 25 === 0) {
    return { label: `🔥 STREAK ${streak}!`, color: TIER_COLOR[4] };
  }
  return null;
}

function mixFeedback(
  run: Run,
  index: number,
  points: number,
  overdrive: boolean,
): HitFeedback {
  const tier = run.multiplier;
  const tierColor = overdrive ? '#f97316' : TIER_COLOR[tier];
  const label = tier > 1 ? `x${tier}  +${points}` : `+${points}`;
  const milestone = streakBanner(run);
  const milestoneChime = milestone
    ? (Math.min(3, Math.max(1, tier - 1)) as 1 | 2 | 3)
    : null;
  const word = finishedWord(run, index);
  if (word?.clean) {
    const cleanBanner =
      cleanWordsSoFar(run, index) <= 3
        ? { label: `✨ CLEAN  ${word.word.trim()}`, color: '#34d399' }
        : null;
    return {
      size: 'perfect',
      color: '#34d399',
      label,
      banner: milestone ?? cleanBanner,
      chime: milestoneChime ?? 1,
    };
  }
  return {
    size: 'great',
    color: tierColor,
    label,
    banner: milestone,
    chime: milestoneChime,
  };
}

let streakBeforeMiss = 0;

/** Remember the Streak after every hit, so a Miss can say what it broke. */
export function noteStreak(run: Run): void {
  streakBeforeMiss = run.currentStreak;
}

/** The banner for a Miss: only the Streak variant has one, for a Streak of 10 or more. */
export function missBanner(): Banner | null {
  const broken = streakBeforeMiss;
  streakBeforeMiss = 0;
  if (hitsVariant !== 'streak' || broken < 10) return null;
  return { label: `STREAK BROKEN AT ${broken}`, color: '#ef4444' };
}
