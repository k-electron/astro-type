import type React from 'react';
import type { Day } from '../analytics/days';
import type { JourneyReport } from '../analytics/logbook';
import type { KeySpec } from '../curriculum/keyboardLayout';
import { STAR_ACCURACY_BARS } from '../game/rules';
import { Keyboard, type KeyView } from './Keyboard';
import { keycapName, TINT } from './keycapLooks';
import {
  KEYBOARD_HEADING,
  KEYBOARD_HINT,
  KEYBOARD_REBUILDING,
  keyboardAsOf,
  keyOnDayTitle,
} from './journeyLabels';

interface AnalyticsKeyboardProps {
  report: JourneyReport;
  /** The day under the timeline's cursor, or null for the latest day. */
  cursor: Day | null;
}

/** A key is often missed below the first Star bar: fewer than 90 of 100 tries right. */
const OFTEN_MISSED_BELOW = STAR_ACCURACY_BARS[0];

/**
 * The whole keyboard as it was on the day under the timeline's cursor (the
 * latest day without one): each key tinted for its speed, ringed red when it
 * is often missed and dark when it is not yet typed. A player who has played
 * fewer than 3 days in the last 8 weeks sees it rebuilding, not old numbers.
 */
export const AnalyticsKeyboard: React.FC<AnalyticsKeyboardProps> = ({
  report,
  cursor,
}) => {
  const latest = report.timeline.at(-1)?.day ?? null;
  const day = cursor !== null && cursor in report.keyboards ? cursor : latest;
  const keyboard = day === null ? undefined : report.keyboards[day];

  const keyView = (spec: KeySpec): KeyView => {
    // Shift, Tab and the other keys that type no character have no story.
    if (spec.key.length > 1) {
      return {
        title: keycapName(spec),
        disabled: true,
        'aria-label': keycapName(spec),
        className: 'border-slate-800 text-slate-500',
      };
    }
    const key = keyboard?.keys[spec.key];
    const title = keyOnDayTitle(spec.key, key);
    if (key === undefined) {
      return {
        title,
        disabled: true,
        'aria-label': keycapName(spec),
        className: 'border-slate-800 bg-slate-950 text-slate-700',
      };
    }
    const oftenMissed =
      key.accuracy !== null && key.accuracy < OFTEN_MISSED_BELOW;
    return {
      title,
      'aria-label': keycapName(spec),
      className: [
        'border-slate-600 text-white cursor-pointer',
        key.pace === null ? '' : TINT[key.pace],
        oftenMissed ? 'ring-2 ring-rose-500/80' : '',
      ].join(' '),
    };
  };

  return (
    <section
      aria-label={KEYBOARD_HEADING}
      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-left"
    >
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h3 className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
          {KEYBOARD_HEADING}
        </h3>
        {!report.rebuilding && day !== null && (
          <span className="text-[11px] font-mono text-slate-300">
            {keyboardAsOf(day)}
          </span>
        )}
      </div>
      {report.rebuilding ? (
        <p className="text-xs text-slate-400">{KEYBOARD_REBUILDING}</p>
      ) : (
        <>
          <Keyboard keyView={keyView} label={KEYBOARD_HEADING} />
          <p className="text-[11px] text-slate-500 mt-2">{KEYBOARD_HINT}</p>
        </>
      )}
    </section>
  );
};
