/**
 * PROTOTYPE (#147, "What the Debrief shows of a Run"). Three structurally
 * different takes on the Run's story, switched with `?variant=` and the
 * floating bar. Throwaway: lives on branch prototype/debrief-flight-log only.
 *
 *   A  Flight recorder: four stacked strips sharing one time axis, then
 *      three lists (slowest, least accurate, Mix-ups), under today's Debrief.
 *   B  Cockpit: the Debrief goes two columns; one big chart with metric
 *      tabs, and a keyboard tinted by each key's speed and Misses.
 *   C  Replay: one combined chart, then the Run's own text with each
 *      character shaded by how long it took and Miss marks on it.
 */
import type React from 'react';
import { useState } from 'react';
import { KEYBOARD_ROWS } from '../../curriculum/keyboardLayout';
import { LineChart } from './charts';
import {
  type CharReplay,
  keyAccuracies,
  keyName,
  keySpeeds,
  leastAccurate,
  MIN_CLEAN_HITS,
  MIN_FIRST_ATTEMPTS,
  mixUps,
  type ProtoKeystroke,
  ROLLING_HITS,
  replayOf,
  runMeanMs,
  seriesOf,
  slowest,
} from './flightLog';

export const VARIANTS = [
  { key: 'A', name: 'Flight recorder' },
  { key: 'B', name: 'Cockpit' },
  { key: 'C', name: 'Replay' },
] as const;
export type VariantKey = (typeof VARIANTS)[number]['key'];

const card = 'w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3';
const heading =
  'text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-2 text-left';

const maxOf = (xs: number[], floor: number) =>
  Math.max(floor, ...xs.map((x) => Math.ceil(x / 5) * 5));

/** A keycap-looking chip for one key. */
const Cap: React.FC<{ k: string; tone?: string }> = ({ k, tone }) => (
  <span
    className={`inline-flex min-w-7 h-7 px-1.5 items-center justify-center rounded-md border font-mono text-sm font-bold ${
      tone ?? 'border-slate-600 bg-slate-800 text-white'
    }`}
  >
    {keyName(k)}
  </span>
);

/** How slow a time is against the Run's own mean. */
function toneFor(ms: number | null, mean: number): string {
  if (ms === null || mean === 0) return 'bg-transparent';
  const ratio = ms / mean;
  if (ratio < 0.8) return 'bg-emerald-500/25';
  if (ratio < 1.2) return 'bg-transparent';
  if (ratio < 1.6) return 'bg-amber-500/30';
  return 'bg-rose-500/40';
}

const EmptyNote: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] text-slate-500 text-left">{children}</p>
);

// ---- The three lists, shared by A and C ------------------------------------

const KeyLists: React.FC<{ log: ProtoKeystroke[]; columns?: boolean }> = ({
  log,
  columns = true,
}) => {
  const slow = slowest(log);
  const inaccurate = leastAccurate(log);
  const mixes = mixUps(log);
  const mean = runMeanMs(log);
  return (
    <div
      className={`w-full grid gap-3 ${columns ? 'sm:grid-cols-3' : 'grid-cols-1'}`}
    >
      <div className={card}>
        <div className={heading}>Slowest keys</div>
        {slow.length === 0 ? (
          <EmptyNote>No key had {MIN_CLEAN_HITS} Clean hits yet.</EmptyNote>
        ) : (
          <ul className="space-y-1.5">
            {slow.map((s) => (
              <li key={s.key} className="flex items-center gap-2 text-xs">
                <Cap k={s.key} />
                <div className="flex-1 h-1.5 rounded bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-400"
                    style={{
                      width: `${Math.min(100, (s.meanMs / (slow[0].meanMs || 1)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="font-mono text-slate-300 w-16 text-right">
                  {Math.round(s.meanMs)} ms
                </span>
              </li>
            ))}
          </ul>
        )}
        {mean > 0 && (
          <p className="mt-2 text-[10px] font-mono text-slate-500 text-left">
            Your Run's average: {Math.round(mean)} ms a key
          </p>
        )}
      </div>
      <div className={card}>
        <div className={heading}>Least accurate</div>
        {inaccurate.length === 0 ? (
          <EmptyNote>
            No key with {MIN_FIRST_ATTEMPTS}+ tries was missed. Clean!
          </EmptyNote>
        ) : (
          <ul className="space-y-1.5">
            {inaccurate.map((a) => (
              <li key={a.key} className="flex items-center gap-2 text-xs">
                <Cap
                  k={a.key}
                  tone="border-rose-500/60 bg-rose-950/50 text-rose-200"
                />
                <span className="text-slate-300 text-left flex-1">
                  {a.misses} of {a.firstAttempts} missed
                </span>
                <span className="font-mono text-rose-300">
                  {Math.round(a.rate * 100)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className={card}>
        <div className={heading}>Mix-ups</div>
        {mixes.length === 0 ? (
          <EmptyNote>No Mix-ups this Run.</EmptyNote>
        ) : (
          <ul className="space-y-1.5">
            {mixes.map((m) => (
              <li
                key={`${m.expected}${m.pressed}`}
                className="flex items-center gap-1.5 text-xs text-slate-300"
              >
                <Cap k={m.expected} />
                <span className="text-slate-500">as</span>
                <Cap
                  k={m.pressed}
                  tone="border-rose-500/60 bg-rose-950/50 text-rose-200"
                />
                <span className="ml-auto font-mono text-slate-400">
                  ×{m.count}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

// ---- A: Flight recorder ----------------------------------------------------

export const VariantA: React.FC<{ log: ProtoKeystroke[] }> = ({ log }) => {
  const s = seriesOf(log);
  const wpmMax = maxOf(
    [...s.wpmRolling, ...s.wpmSoFar].map((p) => p.y),
    20,
  );
  const accMin = Math.min(85, ...s.accuracy.map((p) => Math.floor(p.y)));
  const streakMax = maxOf(
    s.streak.map((p) => p.y),
    10,
  );
  const last = <T extends { y: number }>(xs: T[]) =>
    xs.length ? Math.round(xs[xs.length - 1].y) : 0;
  const strip = (
    label: string,
    value: string,
    tone: string,
    chart: React.ReactNode,
  ) => (
    <div className="grid grid-cols-[72px_1fr] items-center gap-3">
      <div className="text-left">
        <div className="text-[10px] uppercase font-mono text-slate-500">
          {label}
        </div>
        <div className={`font-mono font-bold text-sm ${tone}`}>{value}</div>
      </div>
      <div className="pl-6">{chart}</div>
    </div>
  );
  return (
    <div className="w-full mb-5 space-y-3">
      <div className={`${card} space-y-3 pb-6`}>
        <div className={heading}>How the Run went · red ticks are Misses</div>
        {strip(
          'Speed',
          `${last(s.wpmRolling)} WPM`,
          'text-cyan-400',
          <LineChart
            height={52}
            xMax={s.durationS}
            yMin={0}
            yMax={wpmMax}
            yLabels={[`${wpmMax}`, '0']}
            misses={s.misses}
            lines={[
              { points: s.wpmSoFar, color: '#64748b', dashed: true },
              { points: s.wpmRolling, color: '#22d3ee' },
            ]}
          />,
        )}
        {strip(
          'Accuracy',
          `${Math.floor(s.accuracy.at(-1)?.y ?? 100)}%`,
          'text-emerald-400',
          <LineChart
            height={44}
            xMax={s.durationS}
            yMin={accMin}
            yMax={100}
            guides={[90, 95, 98].filter((g) => g > accMin)}
            yLabels={['100', `${accMin}`]}
            misses={s.misses}
            lines={[{ points: s.accuracy, color: '#34d399' }]}
          />,
        )}
        {strip(
          'Rhythm',
          `${last(s.rhythm)}%`,
          'text-violet-300',
          <LineChart
            height={44}
            xMax={s.durationS}
            yMin={0}
            yMax={100}
            guides={[70, 85]}
            yLabels={['100', '0']}
            misses={s.misses}
            lines={[{ points: s.rhythm, color: '#a78bfa' }]}
          />,
        )}
        {strip(
          'Streak',
          `best ${Math.max(0, ...s.streak.map((p) => p.y))}`,
          'text-amber-300',
          <LineChart
            height={44}
            xMax={s.durationS}
            yMin={0}
            yMax={streakMax}
            guides={[10, 20, 30].filter((g) => g < streakMax)}
            yLabels={[`${streakMax}`, '0']}
            misses={s.misses}
            xAxis
            lines={[
              { points: s.streak, color: '#fbbf24', stepped: true, area: true },
            ]}
          />,
        )}
        <p className="text-[10px] font-mono text-slate-500 text-left pt-3">
          Speed: solid = over your last {ROLLING_HITS} hits, dashed = whole Run
          so far (the HUD's). Guides: Star accuracy bars, Rhythm bands,
          Multiplier steps.
        </p>
      </div>
      <KeyLists log={log} />
    </div>
  );
};

// ---- B: Cockpit ------------------------------------------------------------

type Metric = 'speed' | 'accuracy' | 'rhythm' | 'streak';
const METRICS: { id: Metric; label: string; color: string }[] = [
  { id: 'speed', label: 'Speed', color: '#22d3ee' },
  { id: 'accuracy', label: 'Accuracy', color: '#34d399' },
  { id: 'rhythm', label: 'Rhythm', color: '#a78bfa' },
  { id: 'streak', label: 'Streak', color: '#fbbf24' },
];

const LETTER_ROWS = KEYBOARD_ROWS.map((row) =>
  row.map((k) => k.key).filter((k) => /^[a-z;,.]$/.test(k)),
).filter((row) => row.length > 0);

export const VariantB: React.FC<{ log: ProtoKeystroke[] }> = ({ log }) => {
  const [metric, setMetric] = useState<Metric>('speed');
  const s = seriesOf(log);
  const speeds = new Map(keySpeeds(log).map((k) => [k.key, k]));
  const accs = new Map(keyAccuracies(log).map((a) => [a.key, a]));
  const mean = runMeanMs(log);
  const mixes = mixUps(log, 6);
  const chart = (() => {
    const common = {
      height: 170,
      xMax: s.durationS,
      misses: s.misses,
      xAxis: true,
    };
    switch (metric) {
      case 'speed': {
        const max = maxOf(
          [...s.wpmRolling, ...s.wpmSoFar].map((p) => p.y),
          20,
        );
        return (
          <LineChart
            {...common}
            yMin={0}
            yMax={max}
            yLabels={[`${max} wpm`, '0']}
            lines={[
              { points: s.wpmSoFar, color: '#64748b', dashed: true },
              { points: s.wpmRolling, color: '#22d3ee', area: true },
            ]}
          />
        );
      }
      case 'accuracy': {
        const min = Math.min(85, ...s.accuracy.map((p) => Math.floor(p.y)));
        return (
          <LineChart
            {...common}
            yMin={min}
            yMax={100}
            guides={[90, 95, 98].filter((g) => g > min)}
            yLabels={['100%', `${min}%`]}
            lines={[{ points: s.accuracy, color: '#34d399', area: true }]}
          />
        );
      }
      case 'rhythm':
        return (
          <LineChart
            {...common}
            yMin={0}
            yMax={100}
            guides={[70, 85]}
            yLabels={['100%', '0']}
            lines={[{ points: s.rhythm, color: '#a78bfa', area: true }]}
          />
        );
      case 'streak': {
        const max = maxOf(
          s.streak.map((p) => p.y),
          10,
        );
        return (
          <LineChart
            {...common}
            yMin={0}
            yMax={max}
            guides={[10, 20, 30].filter((g) => g < max)}
            yLabels={[`${max}`, '0']}
            lines={[
              { points: s.streak, color: '#fbbf24', stepped: true, area: true },
            ]}
          />
        );
      }
    }
  })();
  return (
    <div className="w-full space-y-3 text-left">
      <div className={`${card} pb-7`}>
        <div className="flex gap-1.5 mb-3">
          {METRICS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMetric(m.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border cursor-pointer ${
                metric === m.id
                  ? 'border-slate-500 bg-slate-800 text-white'
                  : 'border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              style={metric === m.id ? { color: m.color } : undefined}
            >
              {m.label}
            </button>
          ))}
          <span className="ml-auto text-[10px] font-mono text-rose-400/80 self-center">
            | = Miss
          </span>
        </div>
        <div className="pl-10">{chart}</div>
      </div>
      <div className={card}>
        <div className={heading}>
          Your keys this Run · tint = speed, red ring = missed
        </div>
        <div className="flex flex-col items-center gap-1">
          {LETTER_ROWS.map((row, r) => (
            <div
              key={row.join('')}
              className="flex gap-1"
              style={{ marginLeft: r * 14 }}
            >
              {row.map((k) => {
                const sp = speeds.get(k);
                const ac = accs.get(k);
                const used = ac !== undefined;
                const missed = (ac?.misses ?? 0) > 0;
                return (
                  <div
                    key={k}
                    title={
                      used
                        ? `${k}: ${sp ? `${Math.round(sp.meanMs)} ms` : 'too few Clean hits'}, ${ac?.misses ?? 0} of ${ac?.firstAttempts ?? 0} missed`
                        : `${k}: not in this Run`
                    }
                    className={`relative w-8 h-8 rounded-md border flex items-center justify-center font-mono text-xs ${
                      used
                        ? `border-slate-600 text-white ${toneFor(sp?.meanMs ?? null, mean)}`
                        : 'border-slate-800 text-slate-700'
                    } ${missed ? 'ring-2 ring-rose-500/80' : ''}`}
                  >
                    {k.toUpperCase()}
                    {missed && (
                      <span className="absolute -top-1.5 -right-1.5 text-[9px] px-1 rounded bg-rose-600 text-white">
                        {ac?.misses}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex justify-center gap-3 mt-2 text-[10px] font-mono text-slate-500">
          <span>
            <span className="inline-block w-2 h-2 bg-emerald-500/60 mr-1" />
            quicker
          </span>
          <span>
            <span className="inline-block w-2 h-2 bg-amber-500/60 mr-1" />
            slower
          </span>
          <span>
            <span className="inline-block w-2 h-2 bg-rose-500/70 mr-1" />
            slowest
          </span>
          <span>vs your average {Math.round(mean)} ms</span>
        </div>
      </div>
      <div className={card}>
        <div className={heading}>Mix-ups</div>
        {mixes.length === 0 ? (
          <EmptyNote>No Mix-ups this Run.</EmptyNote>
        ) : (
          <div className="flex flex-wrap gap-2">
            {mixes.map((m) => (
              <span
                key={`${m.expected}${m.pressed}`}
                className="px-2 py-1 rounded-lg border border-slate-700 bg-slate-900 font-mono text-xs text-slate-200"
              >
                {keyName(m.expected)} <span className="text-rose-400">→</span>{' '}
                {keyName(m.pressed)}{' '}
                <span className="text-slate-500">×{m.count}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ---- C: Replay -------------------------------------------------------------

/** The replay's characters in words, each ending with its space, so lines wrap between words. */
function wordsOf(replay: CharReplay[]): CharReplay[][] {
  const words: CharReplay[][] = [[]];
  for (const c of replay) {
    words[words.length - 1].push(c);
    if (c.char === ' ') words.push([]);
  }
  return words.filter((w) => w.length > 0);
}

const ReplayChar: React.FC<{ c: CharReplay; mean: number }> = ({ c, mean }) => (
  <span
    title={`${keyName(c.char)}: ${c.ms === null ? 'not timed' : `${Math.round(c.ms)} ms`}${c.missed ? `, typed as ${c.wrongKeys.map(keyName).join(', ')} first` : ''}`}
    className={`relative font-mono text-[15px] leading-7 rounded-sm px-[1px] ${c.char === ' ' ? '' : toneFor(c.ms, mean)} ${
      c.missed
        ? 'text-rose-300 underline decoration-rose-500 decoration-2 underline-offset-4'
        : 'text-slate-100'
    }`}
  >
    {c.char === ' ' ? ' ' : c.char}
  </span>
);

export const VariantC: React.FC<{ log: ProtoKeystroke[] }> = ({ log }) => {
  const s = seriesOf(log);
  const replay = replayOf(log);
  const mean = runMeanMs(log);
  const wpmMax = maxOf(
    s.wpmRolling.map((p) => p.y),
    20,
  );
  const streakMax = maxOf(
    s.streak.map((p) => p.y),
    10,
  );
  // The Streak drawn on the speed chart's own scale, as a backdrop.
  const streakScaled = s.streak.map((p) => ({
    x: p.x,
    y: (p.y / streakMax) * wpmMax,
  }));
  const slow = slowest(log, 3);
  const bad = leastAccurate(log, 3);
  const mixes = mixUps(log, 3);
  return (
    <div className="w-full mb-5 space-y-3 text-left">
      <div className={`${card} pb-7`}>
        <div className={heading}>
          Speed <span className="text-cyan-400">—</span> with your Streak{' '}
          <span className="text-amber-300">▮</span> behind it · Misses{' '}
          <span className="text-rose-400">|</span>
        </div>
        <div className="pl-10">
          <LineChart
            height={110}
            xMax={s.durationS}
            yMin={0}
            yMax={wpmMax}
            yLabels={[`${wpmMax} wpm`, '0']}
            misses={s.misses}
            xAxis
            lines={[
              {
                points: streakScaled,
                color: '#fbbf24',
                stepped: true,
                area: true,
                width: 1,
              },
              { points: s.wpmRolling, color: '#22d3ee', width: 2.5 },
            ]}
          />
        </div>
      </div>
      <div className={card}>
        <div className={heading}>
          Your Run, letter by letter · hover a letter
        </div>
        <div className="flex flex-wrap">
          {wordsOf(replay).map((word) => (
            <span key={word[0].index} className="whitespace-nowrap">
              {word.map((c) => (
                <ReplayChar key={c.index} c={c} mean={mean} />
              ))}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 mt-2 text-[10px] font-mono text-slate-500">
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
          <span className="text-rose-300 underline decoration-rose-500">
            missed
          </span>
          <span>unshaded = about your average ({Math.round(mean)} ms)</span>
        </div>
      </div>
      <div className={`${card} text-xs text-slate-300 space-y-1`}>
        <p>
          <span className="text-slate-500">Slowest:</span>{' '}
          {slow.length
            ? slow
                .map((k) => `${keyName(k.key)} (${Math.round(k.meanMs)} ms)`)
                .join(', ')
            : '—'}
        </p>
        <p>
          <span className="text-slate-500">Least accurate:</span>{' '}
          {bad.length
            ? bad
                .map(
                  (a) =>
                    `${keyName(a.key)} (${a.misses} of ${a.firstAttempts})`,
                )
                .join(', ')
            : 'none'}
        </p>
        <p>
          <span className="text-slate-500">Mix-ups:</span>{' '}
          {mixes.length
            ? mixes
                .map(
                  (m) =>
                    `${keyName(m.expected)} typed as ${keyName(m.pressed)}${m.count > 1 ? ` ×${m.count}` : ''}`,
                )
                .join(', ')
            : 'none'}
        </p>
      </div>
    </div>
  );
};
