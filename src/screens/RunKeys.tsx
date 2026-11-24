import type React from 'react';
import { useMemo } from 'react';
import {
  keycapOf,
  keycapTallies,
  MIN_CLEAN_HITS,
  stepsToMs,
} from '../analytics/keys';
import { paceOf, type Pace } from '../analytics/letters';
import type { RunReport } from '../analytics/runReport';
import type { KeySpec } from '../curriculum/keyboardLayout';
import {
  inaccurateKeyLabel,
  KEYS_HEADING,
  KEYS_HINT,
  keycapTitle,
  keyLabel,
  LEAST_ACCURATE_KEYS_HEADING,
  MIX_UPS_HEADING,
  mixUpLabel,
  NO_MISSED_KEYS,
  NO_MIX_UPS,
  NO_SLOW_KEYS,
  slowKeyLabel,
  SLOWEST_KEYS_HEADING,
} from './debriefLabels';
import { Keyboard, type KeyView } from './Keyboard';

/** The tint of a keycap, by how long the key took against the Run's average. */
const TINT: Record<Pace, string> = {
  quick: 'bg-emerald-500/25',
  steady: '',
  slow: 'bg-amber-500/30',
  'very slow': 'bg-rose-500/40',
};

/** How a key in a list or on the keyboard reaches the Debrief's linking. */
export interface KeyLinking {
  /** The keycap that is lit or pinned, or null. */
  lit: string | null;
  /** The keycap a letter under the pointer is typed on, or null. */
  letter: string | null;
  /** The pointer or focus is on a key, or has left it. */
  onHover: (keycap: string | null) => void;
  /** Pin the key, or let it go if it is the pinned one. */
  onPin: (keycap: string) => void;
  /** The pinned keycap, or null. */
  pinned: string | null;
}

interface RunKeysProps {
  report: RunReport;
  linking: KeyLinking;
}

/** The accessible name of a keycap: the key's own name, or what a modifier is printed with. */
function keycapName(spec: KeySpec): string {
  return spec.key.length === 1
    ? `${keyLabel(spec.key)} key`
    : spec.display.replace(/[^\w ]/gu, '').trim();
}

const ENTRY =
  'px-2 py-0.5 rounded-md border font-mono text-xs cursor-pointer aria-pressed:outline aria-pressed:outline-2 aria-pressed:outline-cyan-300';

/**
 * The whole keyboard, each key shaded by how it went in this Run and dimmed
 * when the Run never used it, beside the three short lists of slowest keys,
 * least accurate keys and Mix-ups. A key or a list entry lights its letters
 * in the text when hovered and holds them when clicked.
 */
export const RunKeys: React.FC<RunKeysProps> = ({ report, linking }) => {
  const tallies = useMemo(() => keycapTallies(report.keys), [report.keys]);
  const { averageMs } = report;
  const entryHandlers = (character: string) => {
    const keycap = keycapOf(character);
    return {
      onMouseEnter: () => linking.onHover(keycap),
      onMouseLeave: () => linking.onHover(null),
      onFocus: () => linking.onHover(keycap),
      onBlur: () => linking.onHover(null),
      onClick: () => linking.onPin(keycap),
      'aria-pressed': linking.pinned === keycap,
    };
  };

  const keyView = (spec: KeySpec): KeyView => {
    const tally = tallies[spec.key];
    const title = keycapTitle(spec.key, tally);
    if (!tally) {
      return {
        title,
        disabled: true,
        'aria-label': keycapName(spec),
        className: 'border-slate-800 text-slate-700',
      };
    }
    const tint =
      averageMs !== null && tally.cleanHits >= MIN_CLEAN_HITS
        ? TINT[paceOf(stepsToMs(tally.cleanSteps / tally.cleanHits), averageMs)]
        : '';
    return {
      title,
      'aria-label': keycapName(spec),
      'aria-pressed': linking.pinned === spec.key,
      badge: tally.misses > 0 ? tally.misses : undefined,
      className: [
        'border-slate-600 text-white cursor-pointer',
        tint,
        tally.misses > 0 ? 'ring-2 ring-rose-500/80' : '',
        linking.lit === spec.key ? 'outline outline-2 outline-cyan-300' : '',
        linking.letter === spec.key ? 'outline outline-2 outline-white' : '',
      ].join(' '),
      onMouseEnter: () => linking.onHover(spec.key),
      onMouseLeave: () => linking.onHover(null),
      onFocus: () => linking.onHover(spec.key),
      onBlur: () => linking.onHover(null),
      onClick: () => linking.onPin(spec.key),
    };
  };

  const list = (heading: string, empty: string, entries: React.ReactNode[]) => (
    <div>
      <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-2 text-left">
        {heading}
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {entries.length > 0 ? (
          entries
        ) : (
          <span className="text-[11px] text-slate-500">{empty}</span>
        )}
      </div>
    </div>
  );

  return (
    <div className="grid md:grid-cols-[1.6fr_1fr] gap-3 text-left">
      <section
        aria-label={KEYS_HEADING}
        className="bg-slate-950/60 border border-slate-800 rounded-xl p-3"
      >
        <h3 className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-2">
          {KEYS_HEADING} · {KEYS_HINT}
        </h3>
        <Keyboard keyView={keyView} label={KEYS_HEADING} />
      </section>
      <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-3">
        {list(
          SLOWEST_KEYS_HEADING,
          NO_SLOW_KEYS,
          report.slowestKeys.map((key) => (
            <button
              type="button"
              key={key.character}
              {...entryHandlers(key.character)}
              className={`${ENTRY} border-amber-500/40 bg-amber-950/30 text-amber-200`}
            >
              {slowKeyLabel(key)}
            </button>
          )),
        )}
        {list(
          LEAST_ACCURATE_KEYS_HEADING,
          NO_MISSED_KEYS,
          report.leastAccurateKeys.map((key) => (
            <button
              type="button"
              key={key.character}
              {...entryHandlers(key.character)}
              className={`${ENTRY} border-rose-500/40 bg-rose-950/30 text-rose-200`}
            >
              {inaccurateKeyLabel(key)}
            </button>
          )),
        )}
        {list(
          MIX_UPS_HEADING,
          NO_MIX_UPS,
          report.mixUps.map((mixUp) => (
            <button
              type="button"
              key={`${mixUp.expected}\u0000${mixUp.pressed}`}
              {...entryHandlers(mixUp.expected)}
              className={`${ENTRY} border-slate-700 bg-slate-900 text-slate-200`}
            >
              {mixUpLabel(mixUp)}
            </button>
          )),
        )}
      </div>
    </div>
  );
};
