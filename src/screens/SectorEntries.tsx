import type React from 'react';
import { useEffect, useRef } from 'react';
import type { SectorSummary } from '../analytics/sectors';
import { keyLabel, keycapLabel } from './debriefLabels';
import {
  ENTRY_ACCURACY,
  ENTRY_KEYS,
  ENTRY_SPARKLINE,
  ENTRY_SPEED,
  entryDates,
  entryDays,
  entryRuns,
  entryStars,
  fromTo,
  LOGBOOK_HEADING,
  LOGBOOK_HINT,
  NO_KEYS_BROUGHT_IN,
  openKeyStoryTitle,
} from './journeyLabels';
import { roundDown } from './roundDown';

/** A Sector's Stars as they stand now. */
export interface EntryStars {
  earned: number;
  most: number;
}

/** A click that sent the player here: the Sector, and which click it was (so the same Sector twice still scrolls). */
export interface EntryJump {
  id: string;
  count: number;
}

interface SectorEntriesProps {
  entries: readonly SectorSummary[];
  /**
   * An entry's Stars, read live from Stage progress; null for a Sector that
   * is no longer in the game, which shows none.
   */
  starsOf: (sectorId: string) => EntryStars | null;
  /** The entry to ring and scroll to, or null. */
  jump: EntryJump | null;
  /** The keycap whose story is open. */
  selected: string | null;
  /** A key was clicked: open its story. */
  onPickKey: (keycap: string) => void;
}

const SPARK_WIDTH = 120;
const SPARK_HEIGHT = 28;

/** The sparkline: a Sector's Run speeds as one line, scaled to its own highest and lowest. */
const Sparkline: React.FC<{ speeds: readonly number[] }> = ({ speeds }) => {
  if (speeds.length === 0) return null;
  const low = Math.min(...speeds);
  const span = Math.max(...speeds) - low || 1;
  const points = speeds.map((speed, at) => {
    const x =
      speeds.length === 1
        ? SPARK_WIDTH / 2
        : (at * SPARK_WIDTH) / (speeds.length - 1);
    const y = SPARK_HEIGHT - 2 - ((speed - low) / span) * (SPARK_HEIGHT - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg
      role="img"
      aria-label={ENTRY_SPARKLINE}
      width={SPARK_WIDTH}
      height={SPARK_HEIGHT}
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
    >
      <title>
        {`${ENTRY_SPARKLINE}: ${roundDown(speeds[0])} to ${roundDown(speeds[speeds.length - 1])} WPM`}
      </title>
      {speeds.length === 1 ? (
        // One Run draws no line: a dot says where it is.
        <circle
          cx={SPARK_WIDTH / 2}
          cy={SPARK_HEIGHT / 2}
          r={2.5}
          fill="#22d3ee"
        />
      ) : (
        <polyline
          points={points.join(' ')}
          fill="none"
          stroke="#22d3ee"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
};

/**
 * The logbook: one entry for each Sector the player has flown, in the order
 * they first reached them, with its dates, days, Runs, Stars, speed and
 * accuracy from its start to its end, a sparkline and the keys it brought in.
 * The Journey's timeline jumps here: a click rings the entry of the Sector
 * it was on.
 */
export const SectorEntries: React.FC<SectorEntriesProps> = ({
  entries,
  starsOf,
  jump,
  selected,
  onPickKey,
}) => {
  const elements = useRef(new Map<string, HTMLElement>());
  useEffect(() => {
    if (jump) {
      elements.current
        .get(jump.id)
        ?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    }
  }, [jump]);

  return (
    <section
      aria-label={LOGBOOK_HEADING}
      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-left"
    >
      <h3 className="type-label text-slate-400 mb-1">{LOGBOOK_HEADING}</h3>
      <p className="type-sentence text-slate-400 mb-3">{LOGBOOK_HINT}</p>
      <div className="flex flex-col gap-2.5">
        {entries.map((entry) => {
          const stars = starsOf(entry.id);
          const rung = jump?.id === entry.id;
          return (
            <article
              key={entry.id}
              aria-labelledby={`entry-${entry.id}`}
              ref={(element) => {
                if (element) elements.current.set(entry.id, element);
                else elements.current.delete(entry.id);
              }}
              className={`p-3 rounded-lg border bg-slate-900/60 transition-shadow ${
                rung
                  ? 'border-cyan-400 ring-2 ring-cyan-400/70'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <h4
                  id={`entry-${entry.id}`}
                  className="text-sm font-bold font-display text-white"
                >
                  {entry.name}
                </h4>
                <span className="type-caption font-mono text-slate-400">
                  {entryDates(entry.firstDay, entry.lastDay)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-slate-300">
                <span>{entryDays(entry.days)}</span>
                <span>{entryRuns(entry.runs)}</span>
                {stars && (
                  <span className="text-amber-300">
                    {entryStars(stars.earned, stars.most)}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
                <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-xs font-mono">
                  <dt className="text-slate-500">{ENTRY_SPEED}</dt>
                  <dd className="text-cyan-300">
                    {fromTo(entry.start.letterWpm, entry.end.letterWpm, ' WPM')}
                  </dd>
                  <dt className="text-slate-500">{ENTRY_ACCURACY}</dt>
                  <dd className="text-emerald-300">
                    {fromTo(entry.start.accuracy, entry.end.accuracy, '%')}
                  </dd>
                </dl>
                <Sparkline speeds={entry.sparkline} />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="type-label text-slate-500">{ENTRY_KEYS}</span>
                {entry.keysBroughtIn.length === 0 ? (
                  <span className="text-xs text-slate-500">
                    {NO_KEYS_BROUGHT_IN}
                  </span>
                ) : (
                  entry.keysBroughtIn.map((keycap) => (
                    <button
                      type="button"
                      key={keycap}
                      aria-label={`${keycapLabel(keycap)} key`}
                      aria-pressed={selected === keycap}
                      title={openKeyStoryTitle(keycap)}
                      onClick={() => onPickKey(keycap)}
                      className={`px-1.5 py-0.5 rounded bg-slate-800 border type-caption font-mono text-slate-200 hover:text-white cursor-pointer ${
                        selected === keycap
                          ? 'border-cyan-300'
                          : 'border-slate-700'
                      }`}
                    >
                      {keyLabel(keycap)}
                    </button>
                  ))
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
