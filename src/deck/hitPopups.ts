import { type Judgement, MULTIPLIER_STEPS, scoreForHit } from '../game/rules';

/**
 * What the deck shows for a hit: how big its explosion is, the colour, the
 * popup over the Drone, and a banner across the deck when there is one. A hit
 * is a hit wherever its Drone was, so nothing here depends on timing: the size
 * says only whether the hit finished a clean word. No pixi in here, so the
 * rules around the texts can be tested.
 */

/** The parts of a hit's Judgement its feedback reads. */
export type HitInfo = Pick<
  Extract<Judgement, { type: 'hit' }>,
  | 'points'
  | 'overdrive'
  | 'streak'
  | 'multiplier'
  | 'milestone'
  | 'cleanWord'
  | 'cleanWords'
>;

/** A big line of text across the deck. */
export interface Banner {
  label: string;
  color: string;
}

/** How one hit looks. */
export interface HitFeedback {
  /** The biggest explosion: a clean word's finish. Every other hit is mid-size. */
  big: boolean;
  /** The explosion's and the popup's colour. */
  color: string;
  /** The popup over the Drone. */
  label: string;
  banner: Banner | null;
}

/** The colour of a hit at each Multiplier, x1 to x4. */
const TIER_COLOR: Record<number, string> = {
  1: '#38bdf8',
  2: '#4ade80',
  3: '#fbbf24',
  4: '#e879f9',
};

const OVERDRIVE_COLOR = '#f97316';
const CLEAN_COLOR = '#34d399';
/** The banner of a Streak past x4's milestone. */
const STREAK_COLOR = TIER_COLOR[4];

/** How many of a Run's first clean words get a banner. */
const CLEAN_BANNERS_PER_RUN = 3;

/** A letter hit's popup: the points, with the Multiplier when it is above x1. */
const letterLabel = (points: number, multiplier: number): string =>
  multiplier > 1 ? `x${multiplier}  +${points}` : `+${points}`;

/** The colour of a letter hit: its Multiplier's, or Overdrive's. */
const letterColor = (multiplier: number, overdrive: boolean): string =>
  overdrive ? OVERDRIVE_COLOR : TIER_COLOR[multiplier];

function milestoneBanner(streak: number, multiplier: number): Banner {
  // Streak 10, 20 and 30 are the Multiplier's steps; every 25 after is a Streak.
  if (MULTIPLIER_STEPS.some((step) => step.streak === streak)) {
    return {
      label: `x${multiplier} MULTIPLIER — STREAK ${streak}`,
      color: TIER_COLOR[multiplier],
    };
  }
  return { label: `🔥 STREAK ${streak}!`, color: STREAK_COLOR };
}

/**
 * The feedback for a hit. A clean word's finish is the big explosion in green
 * with "CLEAN +bonus"; any other hit is mid-size in its Multiplier's colour. A
 * Streak milestone has a banner, which wins over a clean word's: that banner
 * shows on a Run's first three clean words only.
 */
export function hitFeedback(hit: HitInfo): HitFeedback {
  const { cleanWord } = hit;
  const banner = hit.milestone
    ? milestoneBanner(hit.streak, hit.multiplier)
    : cleanWord && hit.cleanWords <= CLEAN_BANNERS_PER_RUN
      ? { label: `✨ CLEAN  ${cleanWord.word}`, color: CLEAN_COLOR }
      : null;
  if (cleanWord) {
    return {
      big: true,
      color: CLEAN_COLOR,
      label: `CLEAN +${cleanWord.bonus}`,
      banner,
    };
  }
  return {
    big: false,
    color: letterColor(hit.multiplier, hit.overdrive),
    label: letterLabel(hit.points, hit.multiplier),
    banner,
  };
}

/**
 * Every letter hit's popup, each with the one colour it is drawn in: at each
 * Multiplier, with and without Overdrive. The deck prepares these when it
 * starts, so the first hit costs no more than the others. A clean word's
 * popup carries its bonus, which depends on the word, so it is made when it is
 * needed.
 */
export function hitPopupsToPrepare(): { label: string; color: string }[] {
  const prepared = new Map<string, { label: string; color: string }>();
  for (const { multiplier } of MULTIPLIER_STEPS) {
    for (const overdrive of [false, true]) {
      const label = letterLabel(scoreForHit(multiplier, overdrive), multiplier);
      const color = letterColor(multiplier, overdrive);
      prepared.set(`${label}|${color}`, { label, color });
    }
  }
  return [...prepared.values()];
}
