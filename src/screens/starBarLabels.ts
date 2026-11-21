import type { StarBar } from '../game/rules';
import { roundDown } from './roundDown';

/** What a bar asks for: its accuracy as a whole percentage, then its WPM rounded down when it has one. */
const asks = (bar: StarBar): string =>
  bar.wpm === null
    ? `${roundDown(bar.accuracy)}%`
    : `${roundDown(bar.accuracy)}% · ${roundDown(bar.wpm)} WPM`;

/** A Star bar as every screen words it: "★ 90%", "★★ 95% · 18 WPM". */
export const starBarLabel = (bar: StarBar): string =>
  `${'★'.repeat(bar.star)} ${asks(bar)}`;

/** The Galaxy Map's name for a bar the Stage's best Run has met: lit on screen, spoken as earned. */
export const starBarEarnedLabel = (bar: StarBar): string =>
  `${starBarLabel(bar)} (earned)`;

/** The Run header's one goal: the next Star the player hasn't earned on the Stage. */
export const nextStarLabel = (bar: StarBar): string =>
  `Next ${'★'.repeat(bar.star)}: ${asks(bar)}`;
