import {
  type JourneySentence,
  MIN_DAYS_FOR_PICTURE,
} from '../analytics/journeySentence';
import { STEPS_PER_SECOND } from '../analytics/keys';
import { MIN_DAY_LETTER_HITS } from '../analytics/lifetime';
import type { KeyOnDay } from '../analytics/keyboardDays';
import type { Reading } from '../analytics/keyDays';
import type { MixUpCause } from '../analytics/mixUps';
import { MIN_PAIR_COUNT } from '../analytics/pairs';
import type { ShiftTally } from '../analytics/shift';
import type { KeyStory } from '../analytics/keyStory';
import {
  fingerWords,
  keyLabel,
  keycapLabel,
  typedLabel,
} from './debriefLabels';
import { NO_SPEED } from './hudLabels';
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

/** A letter speed as every screen of the Journey reads it: rounded down, so a day says the same everywhere. */
export const letterSpeedText = (letterWpm: number): string =>
  `${roundDown(letterWpm)} WPM`;

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
    ? away.days >= 56
      ? 'at least 8 weeks'
      : `at least ${away.days} days`
    : `${away.days} ${away.days === 1 ? 'day' : 'days'}`;

/**
 * Where the picture of how the player types now is not drawn yet, a player
 * who has been away has it rebuilt, and a new player has it built up: the
 * screens say "rebuilding" only to the first.
 */
export const isReturning = (sentence: JourneySentence): boolean =>
  sentence.kind === 'rebuilding' && sentence.away !== null;

const BUILDS_UP = `builds up after ${MIN_DAYS_FOR_PICTURE} days of play`;

const REBUILD = 'A few days of play will rebuild the picture of how you type.';
const BUILD = `The picture of how you type ${BUILDS_UP}.`;

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
        ? `Your journey has just begun. ${BUILD}`
        : `Welcome back! You have been away for ${awayText(sentence.away)}. ${REBUILD}`;
    case 'journey': {
      const { startingLetterWpm: from, nowLetterWpm: to } = sentence;
      const speed =
        from === null || to === null
          ? null
          : roundDown(from) === roundDown(to)
            ? `held your speed at about ${roundDown(to)} WPM`
            : `went from about ${roundDown(from)} to ${roundDown(to)} WPM`;
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
          : ` Your trickiest key now is the ${keyLabel(key.character)} key${key.finger === null ? '' : `, your ${fingerWords(key.finger)}`}.`;
      return `${days} you ${progress.length === 0 ? 'kept practising' : progress.join(' and ')}.${trickiest}`;
    }
  }
}

// ---- The timeline of the last 8 weeks ----------------------------------------

export const TIMELINE_HEADING = 'Your last 8 weeks';
export const TIMELINE_HINT =
  'Hover a day to read it. Click a day or a Sector band to hold that day on the keyboard below and to jump to its Sector entry; click it again to let go. Each dot is a day you played. Shaded days are days away: nothing is lost while you are away.';
export const AWAY_MARK = 'nothing is lost while you are away';
/** What the timeline says in place of its strips: `returning` is a player who has been away. */
export const timelineRebuilding = (returning: boolean): string =>
  returning
    ? 'The timeline is rebuilding. A few days of play will draw it.'
    : `The timeline ${BUILDS_UP}.`;
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
  `Accuracy is the share of characters you typed right first time on the day, the figure the Debrief gives each Run. The dashed lines are the Star bars: ${bars.join('%, ')}%.`;

/** What the Rhythm strip says of itself on hover; `floors` are where the bands start. */
export const dailyRhythmExplanation = (floors: {
  Steady: number;
  Paced: number;
}): string =>
  `Rhythm is how evenly your keys were spaced on the day, as the HUD shows it: Steady from ${floors.Steady}%, Paced from ${floors.Paced}%, Uneven below.`;

/** What the Shift hand strip says of itself on hover. */
export const shiftHandExplanation = (): string =>
  `Shift hand is the share of your capitals and symbols typed with the Shift key on the other side from the key, as touch typists do. The dashed line is ${OPPOSITE_SHIFT_GUIDE}%.`;

// ---- The keyboard as it was on a day ----------------------------------------

export const KEYBOARD_HEADING = 'Your keys over time';
export const KEYBOARD_HINT =
  'Move along the timeline to see each key as it was on that day, and click a day to hold it. Green is quick, amber is slow, a red key marked !! is very slow, a red ring means often missed, a dashed outline means not typed often enough lately to tell and a dark key is not typed yet. Click a key to read its story.';
/** The mark in the corner of a very slow key, so it is told from a slow one by more than its colour. */
export const VERY_SLOW_MARK = '!!';
/** The button that lets go of a day the player clicked, and the line saying one is held. */
export const BACK_TO_LATEST = 'Back to latest';
export const keyboardHeld = (day: string): string => `Holding ${dayText(day)}`;
/** What a key's tooltip adds when it is ringed red: it is missed often. */
export const OFTEN_MISSED = 'often missed';
export const keyboardRebuilding = (returning: boolean): string =>
  returning
    ? 'Your keys are rebuilding. A few days of play will show how each key is going now.'
    : `Your keys build up after ${MIN_DAYS_FOR_PICTURE} days of play.`;

/** The day the keyboard is showing: the one under the timeline's cursor, or the latest. */
export const keyboardAsOf = (day: string): string => `As of ${dayText(day)}`;

/** The words a very slow key's tooltip and corner mark say, beside its colour. */
export const VERY_SLOW_WORDS = 'very slow';
/** The accessible name of the corner mark on a very slow key. */
export const VERY_SLOW_MARK_LABEL = 'very slow';

/** The tooltip of a typed keycap, or of one that is not yet typed (`key` is undefined). */
export function keyOnDayTitle(
  keycap: string,
  key: KeyOnDay | undefined,
  oftenMissed = false,
): string {
  const name = keycapLabel(keycap);
  if (key === undefined) return `${name}: not typed yet`;
  if (key.accuracy === null) {
    return `${name}: not typed often enough lately to tell`;
  }
  const speed = key.ms === null ? '' : `${Math.round(key.ms)} ms a key, `;
  const days = key.days === 1 ? 'day' : `${key.days} days`;
  const missed = oftenMissed ? `, ${OFTEN_MISSED}` : '';
  const pace = key.pace === 'very slow' ? `${VERY_SLOW_WORDS}, ` : '';
  return `${name}: ${pace}${speed}${roundDown(key.accuracy)}% right, over its last ${days} played${missed}`;
}

// ---- One key's story ----------------------------------------------------------

export const KEY_STORY_HEADING = "One key's story";
export const KEY_STORY_PROMPT =
  'Click a key on the keyboard, or one in your logbook, to read its story.';
export const keyStoryTitle = (keycap: string): string =>
  `The ${keycapLabel(keycap)} key`;
export const keyStoryFinger = (story: KeyStory): string =>
  story.finger === null ? '' : `Typed with your ${fingerWords(story.finger)}`;
export const keyFirstTyped = (day: string): string =>
  `First typed ${dayText(day)}`;
export const keyTimesTyped = (count: number): string =>
  `Typed ${count.toLocaleString()} ${count === 1 ? 'time' : 'times'}`;

export const KEY_FIRST_DAYS = 'Its first days';
export const KEY_NOW = 'Now';
export const KEY_BEST = 'Your best';
export const keyRebuilding = (returning: boolean): string =>
  returning ? 'rebuilding' : BUILDS_UP;
export const KEY_NOT_ENOUGH_LATELY = 'not typed often enough lately to tell';
export const KEY_NOT_TIMED = 'too few timed hits';

/** A key's speed and accuracy as a line: "420 ms a key, 83% right". */
export function keyReadingText(reading: {
  ms: number | null;
  accuracy: number | null;
}): string {
  const speed =
    reading.ms === null ? KEY_NOT_TIMED : `${Math.round(reading.ms)} ms a key`;
  return reading.accuracy === null
    ? speed
    : `${speed}, ${roundDown(reading.accuracy)}% right`;
}

/** Its first days' line, with how many days they were. */
export const keyFirstDaysText = (first: Reading): string =>
  first.tries === 0
    ? KEY_NOT_ENOUGH_LATELY
    : `${keyReadingText(first)}, over ${first.days === 1 ? 'its first day' : `its first ${first.days} days`}`;

/** The best line: both numbers are the best over any run of days, so they may come from different ones. */
export const keyBestText = (best: KeyStory['best']): string | null =>
  best.ms === null && best.accuracy === null ? null : keyReadingText(best);

export const KEY_SPEED_TREND = 'Speed trend';
export const KEY_ACCURACY_TREND = 'Accuracy trend';
export const KEY_TREND_HINT =
  'Each point is the key over its last 5 days played with at least 10 tries. Higher is quicker, and higher is more accurate.';
export const KEY_NO_TREND = 'not enough days to draw yet';
export const keyTrendPointText = (day: string, value: string): string =>
  `${dayText(day)}: ${value}`;

export const KEY_MIX_UPS_NONE = 'No Mix-ups lately.';
/** A Mix-up of a key: what it was typed as, and how often. */
export const keyInsteadText = (pressed: string, count: number): string =>
  `${typedLabel(pressed)} ×${count}`;
export const KEY_MIX_UPS_HINT = 'Typed as, in the last 8 weeks:';

/** What a keycap in the logbook says it will do. */
export const openKeyStoryTitle = (keycap: string): string =>
  `Read the story of the ${keycapLabel(keycap)} key`;

// ---- The logbook: one entry for each Sector --------------------------------

export const LOGBOOK_HEADING = 'Your logbook';
export const LOGBOOK_HINT =
  'One entry for each Sector you have flown, in the order you reached them. They stay here even when the days behind them have faded.';

/** The days an entry covers: "Nov 3" for one day, "Nov 3 to Nov 20" for more. */
export const entryDates = (firstDay: string, lastDay: string): string =>
  firstDay === lastDay
    ? dayText(firstDay)
    : `${dayText(firstDay)} to ${dayText(lastDay)}`;

export const entryDays = (days: number): string =>
  `${days} ${days === 1 ? 'day' : 'days'}`;

export const entryRuns = (runs: number): string =>
  `${runs} ${runs === 1 ? 'Run' : 'Runs'}`;

/** An entry's Stars as they are now, read live; only for a Sector that still exists. */
export const entryStars = (earned: number, most: number): string =>
  `${earned} of ${most} Stars`;

/**
 * A number at the start of an entry and at its end: "12 to 23 WPM", or just
 * "23 WPM" when they read the same. Each is rounded down, as every screen does.
 */
export function fromTo(
  from: number | null,
  to: number | null,
  unit: string,
): string {
  const start = from === null ? null : roundDown(from);
  const end = to === null ? null : roundDown(to);
  if (start === null && end === null) return NO_SPEED;
  if (start === end) return `${end}${unit}`;
  return `${start ?? NO_SPEED} to ${end ?? NO_SPEED}${unit}`;
}

export const ENTRY_SPEED = 'Speed';
export const ENTRY_ACCURACY = 'Accuracy';
export const ENTRY_KEYS = 'Keys it brought in';
export const NO_KEYS_BROUGHT_IN = 'No new keys';
export const ENTRY_SPARKLINE = 'Run speeds';

// ---- Mix-ups, Shift hand and Letter pairs ------------------------------------

/** What each section says while the picture of how the player types now is rebuilding. */
export const habitsRebuilding = (what: string, returning: boolean): string =>
  returning
    ? `Your ${what} are rebuilding. A few days of play will show them.`
    : `Your ${what} build up after ${MIN_DAYS_FOR_PICTURE} days of play.`;

export const MIX_UPS_SECTION = 'Your Mix-ups';
export const MIX_UPS_SECTION_HINT =
  'The key you meant and the key you pressed instead, with why it probably happened. From the last 8 weeks; click a key to read its story.';
export const MIX_UPS_AS = 'as';

/** Why a Mix-up probably happened, as it reads next to the pair. */
export const MIX_UP_CAUSES: Record<MixUpCause, string> = {
  shift: 'right key, wrong Shift',
  'next door': 'the key next door',
  'same finger': 'the same finger',
  'other hand': 'the other hand',
  'same hand': 'the same hand, another finger',
};

export const SHIFT_HAND_SECTION = 'Your Shift hand';
export const SHIFT_HAND_SECTION_HINT =
  'How you held Shift for capitals and symbols in the last 8 weeks. Touch typists use the Shift on the other side from the key.';
export const SHIFT_HAND_NONE = 'No capitals or symbols typed lately.';
export const shiftHandTotal = (total: number): string =>
  `${total.toLocaleString()} capitals and symbols`;

/** The ways to hold Shift, in the order shown; the last two show only when there were some. */
export const SHIFT_WAYS: {
  field: keyof ShiftTally;
  label: string;
  always: boolean;
}[] = [
  { field: 'shiftOpposite', label: 'Other hand', always: true },
  { field: 'shiftSame', label: 'Same hand', always: true },
  { field: 'shiftNone', label: 'Caps Lock', always: true },
  { field: 'shiftBoth', label: 'Both Shift keys', always: false },
  { field: 'shiftUnknown', label: 'Not seen', always: false },
];

export const LETTER_PAIRS_SECTION = 'Your Letter pairs';
export const LETTER_PAIRS_SECTION_HINT =
  'How long the second letter takes after the first, from the last 8 weeks. A pair needs to be typed cleanly 8 times to count, pairs with a Space in them are left out, and the slowest are only those slower than your average.';
export const SLOWEST_PAIRS = 'Your slowest pairs';
export const COMMON_PAIRS_HEADING = 'The most common pairs in English';
export const NO_SLOW_PAIRS = 'No pair has been typed cleanly often enough yet.';
/** Said when pairs were typed often enough to rank, and none is slower than the average. */
export const NO_PAIR_SLOWER = 'None of your pairs is slower than your average.';
/** Beside a common pair with no time: it was not typed often enough to tell. */
export const COMMON_PAIRS_NO_TIME = `– = typed cleanly fewer than ${MIN_PAIR_COUNT} times`;
export const pairTimeText = (ms: number): string => `${Math.round(ms)} ms`;
export const NO_PAIR_TIME = 'not often enough to tell';
export const pairAverage = (ms: number): string =>
  `${Math.round(ms)} ms on average over your pairs`;
export const pairTitle = (pair: string, ms: number, count: number): string =>
  `${pair}: ${Math.round(ms)} ms, over ${count} times typed cleanly`;
