import { type Rating, scoreForHit } from '../../game/rules';

/**
 * What the deck's popup for a hit says: a few words, then "+" and the points
 * that hit scored. The words are picked at random from the grade's stems; the
 * points come from the hit's Judgement. No pixi in here, so the rules around
 * the texts can be tested.
 */

/** How a hit was judged, as far as its popup goes. */
export interface HitKind {
  grade: 'perfect' | 'great' | 'good';
  isSpace: boolean;
  /** Overdrive doubled the hit. The hit that ignites Overdrive is not doubled. */
  overdrive: boolean;
}

/** The words of the popups a hit can show, per grade, as the DOM deck worded them. */
const STEMS = {
  perfectSpace: ['💥 FLAGSHIP OBLITERATED!'],
  overdriveStrike: ['⚡ OVERDRIVE STRIKE!'],
  perfect: [
    '💥 VAPORIZED!',
    '🎯 CRITICAL HIT!',
    '⚡ DRONE DESTROYED!',
    '🔥 DIRECT HIT!',
  ],
  greatSpace: ['🚀 DREADNOUGHT DOWN!'],
  great: ['⚡ SHATTERED!', '🎯 INTERCEPTED!', '💥 TARGET DOWN!'],
  good: ['✨ GRAZED!', '🛡️ DEFUSED!', '⚡ CONTACT!'],
} as const;

/** The words a hit of this kind can show. */
export function hitPopupStems({
  grade,
  isSpace,
  overdrive,
}: HitKind): readonly string[] {
  if (grade === 'perfect') {
    if (isSpace) return STEMS.perfectSpace;
    return overdrive ? STEMS.overdriveStrike : STEMS.perfect;
  }
  if (grade === 'great') return isSpace ? STEMS.greatSpace : STEMS.great;
  return STEMS.good;
}

/** The whole text of a popup. */
export const hitPopupLabel = (stem: string, points: number) =>
  `${stem} +${points}`;

/** The colour of a hit's laser, explosion and popup. */
export function hitPopupColor({ grade, isSpace }: HitKind): string {
  if (grade === 'perfect') return isSpace ? '#34d399' : '#38bdf8';
  return grade === 'great' ? '#4ade80' : '#facc15';
}

const RATING: Record<HitKind['grade'], Rating> = {
  perfect: 'PERFECT',
  great: 'GREAT',
  good: 'GOOD',
};

/** The Multipliers a hit can score at: x1, then x2, x3 and x4 as the Streak grows. */
const MULTIPLIERS = [1, 2, 3, 4];

/**
 * Every popup a hit can show, each with the one colour it is drawn in: the
 * words of each kind of hit, at each number of points the rules can give it.
 * The deck prepares these when it starts, so the first hit of a kind costs no
 * more than the others.
 */
export function hitPopupsToPrepare(): { label: string; color: string }[] {
  const prepared = new Map<string, { label: string; color: string }>();
  for (const grade of ['perfect', 'great', 'good'] as const) {
    for (const isSpace of [false, true]) {
      for (const overdrive of [false, true]) {
        const kind: HitKind = { grade, isSpace, overdrive };
        const color = hitPopupColor(kind);
        for (const multiplier of MULTIPLIERS) {
          const points = scoreForHit(RATING[grade], multiplier, overdrive);
          for (const stem of hitPopupStems(kind)) {
            const label = hitPopupLabel(stem, points);
            prepared.set(`${label}|${color}`, { label, color });
          }
        }
      }
    }
  }
  return [...prepared.values()];
}
