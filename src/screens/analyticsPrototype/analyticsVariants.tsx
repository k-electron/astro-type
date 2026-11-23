/**
 * PROTOTYPE (#148, "What Analytics shows of the journey"). Three
 * structurally different takes, switched with `?variant=`. Throwaway: lives
 * on branch prototype/debrief-flight-log only. Each opens with one plain
 * sentence, then pictures, then numbers (the map's every-level rule).
 *
 *   A  Timeline: four strips over the calendar (speed, accuracy, Rhythm,
 *      opposite-hand Shift) with Sector bands and days away, and a keyboard
 *      that shows the keys as they were on the day under the cursor.
 *   B  Keys first: a big keyboard; pick a key to see its trend, its Mix-ups
 *      and its slowest Letter pairs. The journey is one small strip.
 *   C  Logbook: the journey as chapters, one per Sector: when, how long,
 *      Stars, speed and accuracy from start to end, the keys it taught.
 */
import type React from 'react';
import { useMemo, useState } from 'react';
import {
  CURRICULUM_SECTORS,
  keyForCharacter,
} from '../../curriculum/curriculum';
import { KEYBOARD_ROWS } from '../../curriculum/keyboardLayout';
import type { DayPoint, Journey, KeyState } from './journey';
import {
  JourneyStrips,
  KeyTrend,
  SECTOR_TINTS,
  shortDate,
  type StripSpec,
} from './journeyCharts';

export const ANALYTICS_VARIANTS = [
  { key: 'A', name: 'Timeline' },
  { key: 'B', name: 'Keys first' },
  { key: 'C', name: 'Logbook' },
] as const;

const card = 'bg-slate-950/60 border border-slate-800 rounded-xl p-4';
const heading =
  'text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-2';
const keyLabel = (k: string) => (k === ' ' ? 'Space' : k);
const capLabel = (k: string) => (k === ' ' ? 'Space' : k.toUpperCase());

const STRIPS: StripSpec[] = [
  {
    label: 'Speed',
    color: '#22d3ee',
    value: (d) => d.wpm,
    yMin: 0,
    yMax: 30,
    unit: ' WPM',
    guides: [20, 25],
    hint: 'Your speed each day you played. The goal after a month is 20–25 WPM.',
  },
  {
    label: 'Accuracy',
    color: '#34d399',
    value: (d) => d.accuracy,
    yMin: 85,
    yMax: 100,
    unit: '%',
    guides: [90, 95, 98],
    hint: 'How many letters you typed right first time. The lines are the 1, 2 and 3 Star bars.',
  },
  {
    label: 'Rhythm',
    color: '#a78bfa',
    value: (d) => d.rhythm,
    yMin: 0,
    yMax: 100,
    unit: '%',
    guides: [70, 85],
    hint: 'How even your typing was. Above the top line is Steady.',
  },
  {
    label: 'Shift hand',
    color: '#f472b6',
    value: (d) => d.opposite,
    yMin: 0,
    yMax: 100,
    unit: '%',
    guides: [90],
    hint: 'Capitals and symbols typed with the Shift on the other hand, as touch typists do.',
  },
];

// ---- The keyboard, shared ---------------------------------------------------

/** A key's state over its last 5 days played, up to `asOf`. */
function stateAsOf(k: KeyState, asOf: number | null) {
  const days = k.daily.filter((d) => asOf === null || d.day <= asOf).slice(-5);
  if (days.length === 0) return null;
  const ms = days.filter((d) => d.ms !== null);
  const acc = days.filter((d) => d.accuracy !== null);
  return {
    ms: ms.length ? ms.reduce((s, d) => s + (d.ms ?? 0), 0) / ms.length : null,
    accuracy: acc.length
      ? acc.reduce((s, d) => s + (d.accuracy ?? 0), 0) / acc.length
      : null,
  };
}

function speedTone(ms: number | null, mean: number) {
  if (ms === null) return 'bg-slate-800/60';
  const r = ms / mean;
  if (r < 0.8) return 'bg-emerald-500/35';
  if (r < 1.2) return 'bg-slate-700/70';
  if (r < 1.6) return 'bg-amber-500/40';
  return 'bg-rose-500/50';
}

const TYPING_ROWS = KEYBOARD_ROWS.map((row) =>
  row.filter((k) => k.key.length === 1 && k.key !== ' '),
).filter((row) => row.length > 0);

export const JourneyKeyboard: React.FC<{
  journey: Journey;
  asOf?: number | null;
  selected?: string | null;
  onSelect?: (k: string) => void;
  size?: 'sm' | 'lg';
}> = ({ journey, asOf = null, selected = null, onSelect, size = 'sm' }) => {
  const cap = size === 'lg' ? 'w-11 h-11 text-sm' : 'w-8 h-8 text-xs';
  return (
    <div>
      <div className="flex flex-col items-center gap-1">
        {TYPING_ROWS.map((row, r) => (
          <div
            key={row.map((k) => k.key).join('')}
            className="flex gap-1"
            style={{ marginLeft: r * (size === 'lg' ? 18 : 12) }}
          >
            {row.map(({ key }) => {
              const k = journey.keys.get(key);
              const s = k ? stateAsOf(k, asOf) : null;
              const weak = s?.accuracy !== null && (s?.accuracy ?? 100) < 93;
              return (
                <button
                  type="button"
                  key={key}
                  disabled={!s}
                  onClick={() => onSelect?.(key)}
                  title={
                    s
                      ? `${keyLabel(key)} (${k?.finger.toLowerCase()}): ${s.ms === null ? 'not timed yet' : `${Math.round(s.ms)} ms`}, ${s.accuracy === null ? '' : `${Math.round(s.accuracy)}% right first time`}`
                      : `${keyLabel(key)}: not learned yet`
                  }
                  className={`${cap} relative rounded-md border font-mono flex items-center justify-center transition-colors ${
                    s
                      ? `border-slate-600 text-white cursor-pointer ${speedTone(s.ms, journey.meanNowMs)}`
                      : 'border-slate-800/70 text-slate-700'
                  } ${weak ? 'ring-2 ring-rose-500/80' : ''} ${
                    selected === key ? 'outline outline-2 outline-cyan-300' : ''
                  }`}
                >
                  {capLabel(key)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-2 text-[10px] font-mono text-slate-500">
        <span>
          <span className="inline-block w-2 h-2 bg-emerald-500/60 mr-1" />
          quick
        </span>
        <span>
          <span className="inline-block w-2 h-2 bg-amber-500/60 mr-1" />
          slow
        </span>
        <span>
          <span className="inline-block w-2 h-2 bg-rose-500/70 mr-1" />
          very slow
        </span>
        <span>
          <span className="inline-block w-2 h-2 ring-2 ring-rose-500 mr-1" />
          often missed
        </span>
        <span>dark = not learned yet</span>
      </div>
    </div>
  );
};

// ---- Shared panels -----------------------------------------------------------

const COMMON_ENGLISH = [
  'th',
  'he',
  'in',
  'er',
  'an',
  're',
  'on',
  'at',
  'en',
  'nd',
];

const PairsPanel: React.FC<{ journey: Journey; filter?: string }> = ({
  journey,
  filter,
}) => {
  const mine = journey.pairs.filter((p) => !filter || p.pair.includes(filter));
  const slow = [...mine]
    .filter((p) => p.n >= 8)
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 6);
  const common = journey.pairs.filter((p) => COMMON_ENGLISH.includes(p.pair));
  return (
    <div className={card}>
      <div className={heading}>
        Letter pairs{filter ? ` with ${keyLabel(filter)}` : ''} · last 10 days
      </div>
      <p className="text-[11px] text-slate-400 mb-2">
        How long the second letter takes after the first. Your average is{' '}
        {Math.round(journey.pairMeanMs)} ms.
      </p>
      <div className="text-[10px] font-mono text-slate-500 mb-1">
        Your slowest
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {slow.map((p) => (
          <span
            key={p.pair}
            className="px-2 py-0.5 rounded-md border border-amber-500/40 bg-amber-950/30 font-mono text-xs text-amber-200"
          >
            {p.pair}{' '}
            <span className="text-amber-400/70">{Math.round(p.ms)} ms</span>
          </span>
        ))}
        {slow.length === 0 && (
          <span className="text-[11px] text-slate-500">Not enough yet.</span>
        )}
      </div>
      {!filter && (
        <>
          <div className="text-[10px] font-mono text-slate-500 mb-1">
            The most common pairs in English
          </div>
          <div className="flex flex-wrap gap-1.5">
            {common.map((p) => (
              <span
                key={p.pair}
                className={`px-2 py-0.5 rounded-md border font-mono text-xs ${
                  p.ms > journey.pairMeanMs * 1.15
                    ? 'border-amber-500/40 text-amber-200'
                    : 'border-slate-700 text-slate-300'
                }`}
              >
                {p.pair}{' '}
                <span className="text-slate-500">{Math.round(p.ms)} ms</span>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const MixUpsPanel: React.FC<{ journey: Journey }> = ({ journey }) => (
  <div className={card}>
    <div className={heading}>Mix-ups · all time</div>
    <p className="text-[11px] text-slate-400 mb-2">
      The key you meant, and the one you pressed instead.
    </p>
    <ul className="space-y-1">
      {journey.mixUps.slice(0, 6).map((m) => {
        const a = keyForCharacter(m.expected);
        const b = keyForCharacter(m.pressed);
        const why =
          a && b && a.hand !== b.hand
            ? 'other hand'
            : a && b && a.finger === b.finger
              ? 'same finger'
              : 'next door';
        return (
          <li
            key={`${m.expected}${m.pressed}`}
            className="flex items-center gap-2 text-xs font-mono"
          >
            <span className="w-6 text-white">{keyLabel(m.expected)}</span>
            <span className="text-slate-500">as</span>
            <span className="w-6 text-rose-300">{keyLabel(m.pressed)}</span>
            <span className="text-slate-500 text-[10px]">{why}</span>
            <span className="ml-auto text-slate-400">×{m.count}</span>
          </li>
        );
      })}
    </ul>
  </div>
);

const ShiftPanel: React.FC<{ journey: Journey }> = ({ journey }) => {
  const { opposite, same, none } = journey.shift;
  const total = opposite + same + none;
  return (
    <div className={card}>
      <div className={heading}>Shift hand · all time</div>
      {total === 0 ? (
        <p className="text-[11px] text-slate-400">
          Capitals come in a later Sector.
        </p>
      ) : (
        <>
          <p className="text-[11px] text-slate-400 mb-2">
            Touch typists hold Shift with the other hand: right Shift for A,
            left Shift for P.
          </p>
          <div className="flex h-3 rounded overflow-hidden mb-1.5">
            <div
              className="bg-pink-400"
              style={{ width: `${(opposite * 100) / total}%` }}
            />
            <div
              className="bg-amber-400"
              style={{ width: `${(same * 100) / total}%` }}
            />
            <div
              className="bg-slate-500"
              style={{ width: `${(none * 100) / total}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-3 text-[10px] font-mono text-slate-400">
            <span className="text-pink-300">
              other hand {Math.round((opposite * 100) / total)}%
            </span>
            <span className="text-amber-300">
              same hand {Math.round((same * 100) / total)}%
            </span>
            <span>Caps Lock {Math.round((none * 100) / total)}%</span>
          </div>
        </>
      )}
    </div>
  );
};

const Headline: React.FC<{ journey: Journey }> = ({ journey }) => (
  <p className="text-base sm:text-lg text-white font-display leading-snug">
    {journey.headline}
  </p>
);

// ---- A: Timeline -------------------------------------------------------------

export const AnalyticsA: React.FC<{ journey: Journey }> = ({ journey }) => {
  const [cursorDay, setCursorDay] = useState<number | null>(null);
  const day = cursorDay !== null ? journey.days[cursorDay] : null;
  return (
    <div className="flex flex-col gap-4">
      <Headline journey={journey} />
      <div className={card}>
        <div className={heading}>
          Your journey · each dot is a day you played · hover to look back
        </div>
        <JourneyStrips
          journey={journey}
          strips={STRIPS}
          cursorDay={cursorDay}
          onCursorDay={setCursorDay}
        />
        <DayNote day={day} />
      </div>
      <div className="grid md:grid-cols-[1.3fr_1fr] gap-4">
        <div className={card}>
          <div className={heading}>
            Your keys{' '}
            {cursorDay === null
              ? 'now'
              : `as they were on ${shortDate(cursorDay)}`}
          </div>
          <JourneyKeyboard journey={journey} asOf={cursorDay} />
        </div>
        <div className="flex flex-col gap-4">
          <MixUpsPanel journey={journey} />
          <ShiftPanel journey={journey} />
        </div>
      </div>
      <PairsPanel journey={journey} />
    </div>
  );
};

const DayNote: React.FC<{ day: DayPoint | null }> = ({ day }) => (
  <div className="min-h-5 text-[11px] font-mono text-slate-400 mt-1">
    {day === null
      ? 'Shaded days are days away. Nothing is lost while you are away.'
      : !day.played
        ? `${shortDate(day.day)}: a day away.`
        : `${shortDate(day.day)}: ${day.runs} Runs in ${Math.round(day.minutes)} min${
            day.firstVisitTo.length
              ? `, first flights of ${day.firstVisitTo.map((s) => s.title).join(', ')}`
              : ''
          }.`}
  </div>
);

// ---- B: Keys first -----------------------------------------------------------

export const AnalyticsB: React.FC<{ journey: Journey }> = ({ journey }) => {
  const needsWork = useMemo(
    () =>
      [...journey.keys.values()]
        .filter((k) => k.key !== ' ' && k.attempts >= 20)
        .sort(
          (a, b) =>
            (a.nowAccuracy ?? 100) -
            (b.nowAccuracy ?? 100) +
            ((b.nowMs ?? 0) - (a.nowMs ?? 0)) / 100,
        ),
    [journey],
  );
  const improved = useMemo(
    () =>
      [...journey.keys.values()]
        .filter((k) => k.thenMs !== null && k.nowMs !== null)
        .sort(
          (a, b) =>
            (b.thenMs ?? 0) -
            (b.nowMs ?? 0) -
            ((a.thenMs ?? 0) - (a.nowMs ?? 0)),
        )
        .slice(0, 5),
    [journey],
  );
  const [selected, setSelected] = useState<string>(needsWork[0]?.key ?? 'f');
  const [cursorDay, setCursorDay] = useState<number | null>(null);
  const k = journey.keys.get(selected);
  const lastDay = journey.days.length - 1;
  return (
    <div className="flex flex-col gap-4">
      <Headline journey={journey} />
      <div className={card}>
        <JourneyStrips
          journey={journey}
          strips={[STRIPS[0]]}
          stripHeight={40}
          cursorDay={cursorDay}
          onCursorDay={setCursorDay}
        />
      </div>
      <div className="flex flex-col gap-4">
        <div className={card}>
          <div className={heading}>Your keys · click one</div>
          <JourneyKeyboard
            journey={journey}
            selected={selected}
            onSelect={setSelected}
            size="lg"
          />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <div className="text-[10px] font-mono text-slate-500 mb-1">
                Needs work
              </div>
              <div className="flex flex-wrap gap-1.5">
                {needsWork.slice(0, 5).map((n) => (
                  <button
                    type="button"
                    key={n.key}
                    onClick={() => setSelected(n.key)}
                    className="px-2 py-0.5 rounded-md border border-rose-500/40 bg-rose-950/30 font-mono text-xs text-rose-200 cursor-pointer"
                  >
                    {keyLabel(n.key)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono text-slate-500 mb-1">
                Most improved
              </div>
              <div className="flex flex-wrap gap-1.5">
                {improved.map((n) => (
                  <button
                    type="button"
                    key={n.key}
                    onClick={() => setSelected(n.key)}
                    className="px-2 py-0.5 rounded-md border border-emerald-500/40 bg-emerald-950/30 font-mono text-xs text-emerald-200 cursor-pointer"
                  >
                    {keyLabel(n.key)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {k && (
          <div className={`${card} grid md:grid-cols-[1fr_1.4fr] gap-4`}>
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline gap-3">
                <span className="w-12 h-12 rounded-lg border border-cyan-400 bg-slate-800 flex items-center justify-center font-mono text-xl text-white">
                  {keyLabel(k.key)}
                </span>
                <div>
                  <div className="text-white font-semibold">
                    {k.finger || 'Thumb'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Learned {shortDate(k.firstDay)} · typed {k.attempts} times
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-200">
                {k.thenMs && k.nowMs
                  ? `${k.nowMs < k.thenMs ? 'Faster' : 'Slower'}: ${Math.round(k.thenMs)} → ${Math.round(k.nowMs)} ms. `
                  : ''}
                {k.nowAccuracy !== null
                  ? `Right first time ${Math.round(k.nowAccuracy)}% lately.`
                  : ''}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <KeyTrend daily={k.daily} lastDay={lastDay} height={150} />
              <div className="text-[10px] font-mono text-slate-500">
                <span className="text-amber-300">—</span> time per key{'  '}
                <span className="text-emerald-300">- -</span> right first time
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-500 mb-1">
                  Pressed instead
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {k.mixUps.slice(0, 4).map((m) => (
                    <span
                      key={m.pressed}
                      className="px-2 py-0.5 rounded-md border border-slate-700 font-mono text-xs text-rose-200"
                    >
                      {keyLabel(m.pressed)}{' '}
                      <span className="text-slate-500">×{m.count}</span>
                    </span>
                  ))}
                  {k.mixUps.length === 0 && (
                    <span className="text-[11px] text-slate-500">Never.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <PairsPanel journey={journey} filter={selected} />
        <ShiftPanel journey={journey} />
      </div>
    </div>
  );
};

// ---- C: Logbook --------------------------------------------------------------

export const AnalyticsC: React.FC<{ journey: Journey }> = ({ journey }) => {
  const chapters = journey.sectors.map((s, i) => {
    const runs = journey.runs.filter((r) => r.stage.sectorId === s.id);
    const first = runs.slice(0, 3);
    const last = runs.slice(-3);
    const avg = (rs: typeof runs, f: (r: (typeof runs)[number]) => number) =>
      rs.reduce((t, r) => t + f(r), 0) / (rs.length || 1);
    const sector = CURRICULUM_SECTORS.find((x) => x.id === s.id);
    // The keys this Sector brought in: its Stages' keys not taught before it.
    const earlier = new Set(
      CURRICULUM_SECTORS.slice(0, i).flatMap((x) =>
        x.stages.flatMap((st) => st.targetKeys),
      ),
    );
    const taught = [
      ...new Set(sector?.stages.flatMap((st) => st.targetKeys) ?? []),
    ].filter((key) => !earlier.has(key));
    const stars = sector?.stages.reduce(
      (t, st) =>
        t +
        Math.max(
          0,
          ...runs.filter((r) => r.stage.id === st.id).map((r) => r.stars),
        ),
      0,
    );
    const playDays = new Set(runs.map((r) => r.day)).size;
    return {
      ...s,
      i,
      runs: runs.length,
      playDays,
      stars,
      maxStars: (sector?.stages.length ?? 0) * 3,
      wpmFrom: avg(first, (r) => r.wpm),
      wpmTo: avg(last, (r) => r.wpm),
      accFrom: avg(first, (r) => r.accuracy),
      accTo: avg(last, (r) => r.accuracy),
      taught,
      sparkline: runs.map((r) => r.wpm),
    };
  });
  const comeback = journey.days.find(
    (d, i) =>
      d.played &&
      i >= 3 &&
      journey.days.slice(i - 3, i).every((x) => !x.played),
  );
  return (
    <div className="flex flex-col gap-4">
      <Headline journey={journey} />
      <ol className="relative flex flex-col gap-3 pl-6 border-l border-slate-800 ml-2">
        {chapters.map((c) => (
          <li key={c.id} className={`${card} relative`}>
            <span
              className="absolute -left-[33px] top-5 w-4 h-4 rounded-full border-2 border-slate-950"
              style={{ background: SECTOR_TINTS[c.i] }}
            />
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span
                className="font-mono text-[11px] uppercase tracking-wider"
                style={{ color: SECTOR_TINTS[c.i] }}
              >
                Sector {c.i + 1}
              </span>
              <span className="text-white font-semibold font-display">
                {c.name}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {shortDate(c.firstDay)} – {shortDate(c.lastDay)} · {c.playDays}{' '}
                days · {c.runs} Runs
              </span>
              <span className="ml-auto text-amber-300 font-mono text-sm">
                ★ {c.stars}/{c.maxStars}
              </span>
            </div>
            <div className="grid sm:grid-cols-[1fr_auto] gap-4 mt-3 items-center">
              <div className="flex flex-col gap-2">
                <div className="text-sm text-slate-200">
                  Speed{' '}
                  <span className="font-mono text-cyan-300">
                    {Math.round(c.wpmFrom)} → {Math.round(c.wpmTo)} WPM
                  </span>
                  , accuracy{' '}
                  <span className="font-mono text-emerald-300">
                    {Math.round(c.accFrom)} → {Math.round(c.accTo)}%
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {c.taught.map((key) => {
                    const k = journey.keys.get(key);
                    return (
                      <span
                        key={key}
                        title={
                          k
                            ? `${keyLabel(key)}: ${k.nowMs ? `${Math.round(k.nowMs)} ms now` : ''}`
                            : ''
                        }
                        className={`min-w-7 h-7 px-1 rounded-md border border-slate-600 font-mono text-xs text-white flex items-center justify-center ${speedTone(k?.nowMs ?? null, journey.meanNowMs)}`}
                      >
                        {capLabel(key)}
                      </span>
                    );
                  })}
                </div>
              </div>
              <Sparkline values={c.sparkline} color={SECTOR_TINTS[c.i]} />
            </div>
          </li>
        ))}
      </ol>
      {comeback && (
        <p className="text-[12px] text-slate-400">
          You came back on {shortDate(comeback.day)} after a few days away and
          picked up where you left off.
        </p>
      )}
      <div className="grid md:grid-cols-3 gap-4">
        <MixUpsPanel journey={journey} />
        <ShiftPanel journey={journey} />
        <PairsPanel journey={journey} />
      </div>
    </div>
  );
};

const Sparkline: React.FC<{ values: number[]; color: string }> = ({
  values,
  color,
}) => {
  const w = 160;
  const h = 40;
  const max = Math.max(25, ...values);
  const pts = values
    .map(
      (v, i) =>
        `${(i / Math.max(1, values.length - 1)) * w},${h - (v / max) * h}`,
    )
    .join(' ');
  return (
    <svg width={w} height={h} role="img" aria-label="Speed in this Sector">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} />
    </svg>
  );
};
