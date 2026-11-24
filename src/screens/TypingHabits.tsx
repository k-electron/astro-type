import type React from 'react';
import type { JourneyReport } from '../analytics/logbook';
import { keycapLabel, typedLabel } from './debriefLabels';
import {
  COMMON_PAIRS_HEADING,
  habitsRebuilding,
  LETTER_PAIRS_SECTION,
  LETTER_PAIRS_SECTION_HINT,
  MIX_UP_CAUSES,
  MIX_UPS_AS,
  MIX_UPS_SECTION,
  MIX_UPS_SECTION_HINT,
  KEY_MIX_UPS_NONE,
  NO_PAIR_TIME,
  NO_SLOW_PAIRS,
  openKeyStoryTitle,
  pairAverage,
  pairTimeText,
  pairTitle,
  SHIFT_HAND_NONE,
  SHIFT_HAND_SECTION,
  SHIFT_HAND_SECTION_HINT,
  SHIFT_WAYS,
  shiftHandTotal,
  SLOWEST_PAIRS,
} from './journeyLabels';
import { roundDown } from './roundDown';

interface HabitProps {
  report: JourneyReport;
}

const Section: React.FC<{
  heading: string;
  hint: string;
  children: React.ReactNode;
}> = ({ heading, hint, children }) => (
  <section
    aria-label={heading}
    className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-left"
  >
    <h3 className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
      {heading}
    </h3>
    <p className="text-[11px] text-slate-500 mt-1 mb-2">{hint}</p>
    {children}
  </section>
);

interface MixUpsProps extends HabitProps {
  /** Open a key's story. */
  onPickKey: (keycap: string) => void;
}

/**
 * The most common Mix-ups of the last 8 weeks, each with its likely cause. A
 * key with a story opens it when clicked; one that was never wanted by a
 * text (so has no story to read) is shown, not offered.
 */
export const MixUps: React.FC<MixUpsProps> = ({ report, onPickKey }) => {
  const key = (character: string, keycap: string | null) =>
    keycap !== null && keycap in report.keyStories ? (
      <button
        type="button"
        aria-label={`${keycapLabel(keycap)} key`}
        title={openKeyStoryTitle(keycap)}
        onClick={() => onPickKey(keycap)}
        className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-white hover:border-cyan-300 cursor-pointer"
      >
        {typedLabel(character)}
      </button>
    ) : (
      <span className="px-1.5 py-0.5 text-white">{typedLabel(character)}</span>
    );
  return (
    <Section heading={MIX_UPS_SECTION} hint={MIX_UPS_SECTION_HINT}>
      {report.rebuilding ? (
        <p className="text-xs text-slate-400">{habitsRebuilding('Mix-ups')}</p>
      ) : report.mixUps.length === 0 ? (
        <p className="text-xs text-slate-400">{KEY_MIX_UPS_NONE}</p>
      ) : (
        <ul className="space-y-1">
          {report.mixUps.map((mixUp) => (
            <li
              key={`${mixUp.expected}${mixUp.pressed}`}
              className="flex flex-wrap items-center gap-2 text-xs font-mono"
            >
              {key(mixUp.expected, mixUp.expectedKeycap)}
              <span className="text-slate-500">{MIX_UPS_AS}</span>
              {key(mixUp.pressed, mixUp.pressedKeycap)}
              {mixUp.cause !== null && (
                <span className="text-slate-400">
                  {MIX_UP_CAUSES[mixUp.cause]}
                </span>
              )}
              <span className="ml-auto text-slate-400">×{mixUp.count}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
};

/** How capitals and symbols were typed, by the Shift held, as a share of them. */
export const ShiftHand: React.FC<HabitProps> = ({ report }) => {
  const { shiftHand } = report;
  return (
    <Section heading={SHIFT_HAND_SECTION} hint={SHIFT_HAND_SECTION_HINT}>
      {report.rebuilding ? (
        <p className="text-xs text-slate-400">
          {habitsRebuilding('Shift habits')}
        </p>
      ) : shiftHand.total === 0 ? (
        <p className="text-xs text-slate-400">{SHIFT_HAND_NONE}</p>
      ) : (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs font-mono">
            {SHIFT_WAYS.filter(
              ({ field, always }) => always || shiftHand.counts[field] > 0,
            ).map(({ field, label }) => (
              <div key={field} className="contents">
                <dt className="text-slate-500">{label}</dt>
                <dd className="text-slate-200">
                  {roundDown(shiftHand.shares[field])}%
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-[11px] text-slate-500 mt-2">
            {shiftHandTotal(shiftHand.total)}
          </p>
        </>
      )}
    </Section>
  );
};

/** The slowest Letter pairs, and the player's time on the most common English ones. */
export const LetterPairs: React.FC<HabitProps> = ({ report }) => {
  const { pairs } = report;
  return (
    <Section heading={LETTER_PAIRS_SECTION} hint={LETTER_PAIRS_SECTION_HINT}>
      {report.rebuilding ? (
        <p className="text-xs text-slate-400">
          {habitsRebuilding('Letter pairs')}
        </p>
      ) : (
        <>
          {pairs.averageMs !== null && (
            <p className="text-[11px] text-slate-400 mb-2">
              {pairAverage(pairs.averageMs)}
            </p>
          )}
          <h4 className="text-[10px] uppercase font-mono text-slate-500">
            {SLOWEST_PAIRS}
          </h4>
          {pairs.slowest.length === 0 ? (
            <p className="text-xs text-slate-400">{NO_SLOW_PAIRS}</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5 mt-1 mb-3">
              {pairs.slowest.map(({ pair, ms, count }) => (
                <li
                  key={pair}
                  title={pairTitle(pair, ms, count)}
                  className="px-2 py-0.5 rounded-md border border-amber-500/40 bg-amber-950/30 font-mono text-xs text-amber-200"
                >
                  {pair}{' '}
                  <span className="text-amber-400/70">{pairTimeText(ms)}</span>
                </li>
              ))}
            </ul>
          )}
          <h4 className="text-[10px] uppercase font-mono text-slate-500">
            {COMMON_PAIRS_HEADING}
          </h4>
          <ul className="flex flex-wrap gap-1.5 mt-1">
            {pairs.common.map(({ pair, ms, count }) => (
              <li
                key={pair}
                title={ms === null ? NO_PAIR_TIME : pairTitle(pair, ms, count)}
                className="px-2 py-0.5 rounded-md border border-slate-700 font-mono text-xs text-slate-300"
              >
                {pair}{' '}
                <span className="text-slate-500">
                  {ms === null ? '–' : pairTimeText(ms)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
};
