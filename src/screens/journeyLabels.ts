import type { JourneySentence } from '../analytics/journeySentence';
import { STEPS_PER_SECOND } from '../analytics/keys';
import { MIN_DAY_LETTER_HITS } from '../analytics/lifetime';
import { fingerWords, keyLabel } from './debriefLabels';
import { roundDown } from './roundDown';

/**
 * The words of Analytics' totals row: what the player has done in all, kept
 * for good. A test imports them from here (or from `tests/shared/screens.ts`).
 */
export const DAYS_PLAYED_LABEL = 'Days Played';
export const PRACTICE_TIME_LABEL = 'Practice Time';
export const WORDS_TYPED_LABEL = 'Words Typed';
export const BEST_DAY_LABEL = 'Best Day';

/** What the best day reads before any day has had enough letters to count. */
export const NO_BEST_DAY = '–';

/** Practice time in whole minutes, as hours and minutes ("1h 5m", "12m"). */
export function practiceTimeText(steps: number): string {
  const totalMinutes = Math.floor(steps / STEPS_PER_SECOND / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
}

/** The best day's speed, rounded down so a 37.9 reads 37. */
export function bestDaySpeedText(letterWpm: number): string {
  return `${roundDown(letterWpm)}`;
}

/** A day (`YYYY-MM-DD`) as the player reads it, in their own language: "Nov 12". */
export function dayText(day: string): string {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

// ---- The plain sentence Analytics opens with ---------------------------------

/** What the page says before the first cleared Run: nothing to show, and an invitation. */
export const NOTHING_TO_SHOW_YET =
  'There is nothing to show yet. Clear a Stage or a Free Flight and your journey starts here.';

/** How long a returning player has been away, as the sentence says it. */
const awayText = (away: { days: number; atLeast: boolean }): string =>
  away.atLeast
    ? 'more than 8 weeks'
    : `${away.days} ${away.days === 1 ? 'day' : 'days'}`;

const REBUILD = 'A few days of play will rebuild the picture of how you type.';

/**
 * The plain sentence on top of Analytics. The report picks which of three
 * things there is to say and gives its facts; this words it.
 */
export function journeySentence(sentence: JourneySentence): string {
  switch (sentence.kind) {
    case 'empty':
      return NOTHING_TO_SHOW_YET;
    case 'rebuilding':
      return sentence.away === null
        ? `Your journey has just begun. ${REBUILD}`
        : `Welcome back! You have been away for ${awayText(sentence.away)}. ${REBUILD}`;
    case 'journey': {
      const { startingLetterWpm: from, nowLetterWpm: to } = sentence;
      const speed =
        from === null || to === null
          ? null
          : Math.round(from) === Math.round(to)
            ? `held your speed at about ${Math.round(to)} WPM`
            : `went from about ${Math.round(from)} to ${Math.round(to)} WPM`;
      const progress = [
        speed,
        sentence.furthestSector === null
          ? null
          : `reached ${sentence.furthestSector}`,
      ].filter((part) => part !== null);
      const days = `In ${sentence.daysPlayed} ${sentence.daysPlayed === 1 ? 'day' : 'days'} of play`;
      const key = sentence.trickiestKey;
      const trickiest =
        key === null
          ? ''
          : ` Your trickiest key now is ${keyLabel(key.character)}${key.finger === null ? '' : `, your ${fingerWords(key.finger)}`}.`;
      return `${days} you ${progress.length === 0 ? 'kept practising' : progress.join(' and ')}.${trickiest}`;
    }
  }
}

// ---- The timeline of the last 8 weeks ----------------------------------------

export const TIMELINE_HEADING = 'Your last 8 weeks';
export const TIMELINE_HINT =
  'Hover a day to read it. Each dot is a day you played. Shaded days are days away: nothing is lost while you are away.';
export const AWAY_MARK = 'nothing is lost while you are away';
export const TIMELINE_REBUILDING =
  'The timeline is rebuilding. A few days of play will draw it.';
export const TIMELINE_EMPTY = 'No dot yet';

/** The timeline's strips, in the order they are drawn. */
export const LETTER_SPEED_STRIP = 'Letter speed';
export const SHIFT_HAND_STRIP = 'Shift hand';
export const LETTER_SPEED_OVER = 'letters only';
export const DAILY_OVER = 'a day';
export const SHIFT_HAND_OVER = 'other-hand Shift';

/** The share of capitals and symbols typed with the opposite hand's Shift that the guide marks. */
export const OPPOSITE_SHIFT_GUIDE = 90;

/** What a strip reads for a day that has no number, and why. */
export const DAY_AWAY = 'away';
export const DAY_NOT_PLAYED = 'not played';

/** What the Letter speed strip says of itself on hover. */
export const letterSpeedExplanation = (): string =>
  `Letter speed counts letters only, so a day of number drills doesn't pull it down. A day needs ${MIN_DAY_LETTER_HITS} letters typed cleanly to get a dot.`;

/** What the Accuracy strip says of itself on hover; `bars` are the Star accuracy bars. */
export const dailyAccuracyExplanation = (bars: readonly number[]): string =>
  `Accuracy is how many letters you got right first time on the day. The dashed lines are the Star bars: ${bars.join('%, ')}%.`;

/** What the Rhythm strip says of itself on hover; `floors` are where the bands start. */
export const dailyRhythmExplanation = (floors: {
  Steady: number;
  Paced: number;
}): string =>
  `Rhythm is how evenly your keys were spaced on the day, as the HUD shows it: Steady from ${floors.Steady}%, Paced from ${floors.Paced}%, Uneven below.`;

/** What the Shift hand strip says of itself on hover. */
export const shiftHandExplanation = (): string =>
  `Shift hand is the share of your capitals and symbols typed with the Shift key on the other side from the key, as touch typists do. The dashed line is ${OPPOSITE_SHIFT_GUIDE}%.`;
