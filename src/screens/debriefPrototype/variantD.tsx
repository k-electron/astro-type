/**
 * PROTOTYPE (#147). D · Together: A's information, B's keyboard and C's text,
 * linked so each one points at the others.
 *
 * 1. The Run's text, letter by letter (C), shaded by time, Misses underlined.
 * 2. A's four strips on one time axis, under the text. Hovering a strip puts
 *    a cursor on every strip and on the letter typed at that moment;
 *    hovering a letter puts the cursor on the strips.
 * 3. B's keyboard beside A's three lists. Hovering (or clicking, to pin) a
 *    key, in the keyboard or a list, lights up every place it was typed in
 *    the text and dims the rest.
 *
 * Speed and accuracy are rolling (last 10 hits, last 20 characters), as the
 * beginner recording showed the whole-Run lines are meaningless early on.
 */
import type React from 'react';
import { useMemo, useState } from 'react';
import { KEYBOARD_ROWS } from '../../curriculum/keyboardLayout';
import { LineChart, type Line } from './charts';
import {
  type CharReplay,
  keyAccuracies,
  keyName,
  keySpeeds,
  leastAccurate,
  MIN_CLEAN_HITS,
  mixUps,
  type Point,
  type ProtoKeystroke,
  replayOf,
  runMeanMs,
  seriesOf,
  slowest,
} from './flightLog';

const STEP_S = 1 / 60;
const ROLLING_CHARS = 20;

const card = 'w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3';
const heading =
  'text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-2 text-left';

function toneFor(ms: number | null, mean: number): string {
  if (ms === null || mean === 0) return '';
  const ratio = ms / mean;
  if (ratio < 0.8) return 'bg-emerald-500/25';
  if (ratio < 1.2) return '';
  if (ratio < 1.6) return 'bg-amber-500/30';
  return 'bg-rose-500/40';
}

/** Accuracy over the last 20 characters reached, after each Keystroke. */
function rollingAccuracy(log: ProtoKeystroke[], t0: number): Point[] {
  const missedAt = new Set<number>();
  return log.map((k) => {
    if (k.expected !== k.pressed) missedAt.add(k.index);
    const reached = k.index + 1;
    const from = Math.max(0, reached - ROLLING_CHARS);
    let marks = 0;
    for (const i of missedAt) if (i >= from) marks++;
    const window = reached - from;
    return {
      x: (k.step - t0) * STEP_S,
      y: ((window - marks) * 100) / window,
    };
  });
}

/** The y of a series at time x: its last point at or before x. */
function valueAt(points: Point[], x: number): number | null {
  let value: number | null = null;
  for (const p of points) {
    if (p.x > x) break;
    value = p.y;
  }
  return value;
}

const LETTER_ROWS = KEYBOARD_ROWS.map((row) =>
  row.map((k) => k.key).filter((k) => /^[a-z;,.]$/.test(k)),
).filter((row) => row.length > 0);

export const VariantD: React.FC<{ log: ProtoKeystroke[] }> = ({ log }) => {
  const s = useMemo(() => seriesOf(log), [log]);
  const replay = useMemo(() => replayOf(log), [log]);
  const t0 = log[0]?.step ?? 0;
  const accuracy = useMemo(() => rollingAccuracy(log, t0), [log, t0]);
  const mean = runMeanMs(log);
  const speeds = new Map(keySpeeds(log).map((k) => [k.key, k]));
  const accs = new Map(keyAccuracies(log).map((a) => [a.key, a]));
  const slow = slowest(log, 4);
  const bad = leastAccurate(log, 4);
  const mixes = mixUps(log, 4);

  // When each character was finally typed (its hit), in seconds.
  const typedAt = useMemo(() => {
    const at = new Map<number, number>();
    for (const k of log) {
      if (k.expected === k.pressed) at.set(k.index, (k.step - t0) * STEP_S);
    }
    return at;
  }, [log, t0]);

  const [cursorX, setCursorX] = useState<number | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);
  const focusKey = hoverKey ?? pinnedKey;

  // The character typed at the cursor: the last one typed at or before it.
  const cursorIndex = useMemo(() => {
    if (cursorX === null) return null;
    let found: number | null = null;
    for (const [index, x] of typedAt) if (x <= cursorX) found = index;
    return found;
  }, [cursorX, typedAt]);

  const wpmMax = Math.max(
    20,
    ...s.wpmRolling.map((p) => Math.ceil(p.y / 5) * 5),
  );
  const streakMax = Math.max(
    10,
    ...s.streak.map((p) => Math.ceil(p.y / 5) * 5),
  );
  const at = (points: Point[], fallback: number) =>
    Math.round(
      valueAt(points, cursorX ?? s.durationS) ?? points.at(-1)?.y ?? fallback,
    );

  const strip = (
    label: string,
    value: string,
    tone: string,
    lines: Line[],
    opts: {
      yMin: number;
      yMax: number;
      guides?: number[];
      yLabels: [string, string];
      xAxis?: boolean;
    },
  ) => (
    <div className="grid grid-cols-[80px_1fr] items-center gap-3">
      <div className="text-left">
        <div className="text-[10px] uppercase font-mono text-slate-500">
          {label}
        </div>
        <div className={`font-mono font-bold text-sm ${tone}`}>{value}</div>
      </div>
      <div className="pl-6">
        <LineChart
          height={40}
          xMax={s.durationS}
          misses={s.misses}
          cursorX={cursorX}
          onHoverX={setCursorX}
          lines={lines}
          {...opts}
        />
      </div>
    </div>
  );

  const keyHandlers = (k: string) => ({
    onMouseEnter: () => setHoverKey(k),
    onMouseLeave: () => setHoverKey(null),
    onClick: () => setPinnedKey((p) => (p === k ? null : k)),
  });

  const charClass = (c: CharReplay) => {
    const dimmed = focusKey !== null && c.char !== focusKey;
    const lit = focusKey !== null && c.char === focusKey;
    return [
      'relative font-mono text-[15px] leading-7 rounded-sm px-[1px] transition-opacity',
      c.char === ' ' ? '' : toneFor(c.ms, mean),
      c.missed
        ? 'text-rose-300 underline decoration-rose-500 decoration-2 underline-offset-4'
        : 'text-slate-100',
      dimmed ? 'opacity-25' : '',
      lit ? 'ring-2 ring-cyan-300' : '',
      cursorIndex === c.index ? 'outline outline-2 outline-white' : '',
    ].join(' ');
  };

  const words: CharReplay[][] = [[]];
  for (const c of replay) {
    words[words.length - 1].push(c);
    if (c.char === ' ') words.push([]);
  }

  return (
    <div className="w-full mb-5 space-y-3 text-left">
      <div className={`${card} space-y-3 pb-6`}>
        <div className={heading}>
          Your Run, letter by letter · hover the text or the strips
        </div>
        <div className="flex flex-wrap">
          {words
            .filter((w) => w.length > 0)
            .map((word) => (
              <span key={word[0].index} className="whitespace-nowrap">
                {word.map((c) => (
                  // biome-ignore lint/a11y/noStaticElementInteractions: prototype
                  <span
                    key={c.index}
                    className={charClass(c)}
                    title={`${keyName(c.char)}: ${c.ms === null ? 'not timed' : `${Math.round(c.ms)} ms`}${c.missed ? `, typed as ${c.wrongKeys.map(keyName).join(', ')} first` : ''}`}
                    onMouseEnter={() =>
                      setCursorX(typedAt.get(c.index) ?? null)
                    }
                    onMouseLeave={() => setCursorX(null)}
                  >
                    {c.char === ' ' ? ' ' : c.char}
                  </span>
                ))}
              </span>
            ))}
        </div>
        <div className="flex flex-wrap gap-3 text-[10px] font-mono text-slate-500">
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
          <span>against your average, {Math.round(mean)} ms a key</span>
        </div>
        <div className="border-t border-slate-800 pt-3 space-y-2.5">
          {strip(
            'Speed',
            `${at(s.wpmRolling, 0)} WPM`,
            'text-cyan-400',
            [{ points: s.wpmRolling, color: '#22d3ee', area: true }],
            {
              yMin: 0,
              yMax: wpmMax,
              yLabels: [`${wpmMax}`, '0'],
            },
          )}
          {strip(
            'Accuracy',
            `${at(accuracy, 100)}%`,
            'text-emerald-400',
            [{ points: accuracy, color: '#34d399' }],
            {
              yMin: 50,
              yMax: 100,
              guides: [90, 95, 98],
              yLabels: ['100', '50'],
            },
          )}
          {strip(
            'Rhythm',
            `${at(s.rhythm, 100)}%`,
            'text-violet-300',
            [{ points: s.rhythm, color: '#a78bfa' }],
            {
              yMin: 0,
              yMax: 100,
              guides: [70, 85],
              yLabels: ['100', '0'],
            },
          )}
          {strip(
            'Streak',
            cursorX === null
              ? `best ${Math.max(0, ...s.streak.map((p) => p.y))}`
              : `${at(s.streak, 0)}`,
            'text-amber-300',
            [{ points: s.streak, color: '#fbbf24', stepped: true, area: true }],
            {
              yMin: 0,
              yMax: streakMax,
              guides: [10, 20, 30].filter((g) => g < streakMax),
              yLabels: [`${streakMax}`, '0'],
              xAxis: true,
            },
          )}
        </div>
        <p className="text-[10px] font-mono text-slate-500 pt-3">
          Speed over your last 10 hits, accuracy over your last 20 letters. Red
          ticks are Misses. Guides: Star accuracy bars, Rhythm bands, Multiplier
          steps.
        </p>
      </div>

      <div className="grid md:grid-cols-[1.25fr_1fr] gap-3">
        <div className={card}>
          <div className={heading}>
            Your keys · hover or click one to find it in the text
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
                    <button
                      type="button"
                      key={k}
                      disabled={!used}
                      {...keyHandlers(k)}
                      title={
                        used
                          ? `${k}: ${sp ? `${Math.round(sp.meanMs)} ms` : `fewer than ${MIN_CLEAN_HITS} Clean hits`}, ${ac?.misses ?? 0} of ${ac?.firstAttempts ?? 0} missed`
                          : `${k}: not in this Run`
                      }
                      className={`relative w-8 h-8 rounded-md border flex items-center justify-center font-mono text-xs ${
                        used
                          ? `border-slate-600 text-white cursor-pointer ${toneFor(sp?.meanMs ?? null, mean)}`
                          : 'border-slate-800 text-slate-700'
                      } ${missed ? 'ring-2 ring-rose-500/80' : ''} ${
                        focusKey === k
                          ? 'outline outline-2 outline-cyan-300'
                          : ''
                      }`}
                    >
                      {k.toUpperCase()}
                      {missed && (
                        <span className="absolute -top-1.5 -right-1.5 text-[9px] px-1 rounded bg-rose-600 text-white">
                          {ac?.misses}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className={`${card} space-y-3`}>
          <div>
            <div className={heading}>Slowest</div>
            <div className="flex flex-wrap gap-1.5">
              {slow.map((k) => (
                <button
                  type="button"
                  key={k.key}
                  {...keyHandlers(k.key)}
                  className="px-2 py-0.5 rounded-md border border-amber-500/40 bg-amber-950/30 font-mono text-xs text-amber-200 cursor-pointer"
                >
                  {keyName(k.key)}{' '}
                  <span className="text-amber-400/70">
                    {Math.round(k.meanMs)} ms
                  </span>
                </button>
              ))}
              {slow.length === 0 && (
                <span className="text-[11px] text-slate-500">
                  Too few Clean hits yet.
                </span>
              )}
            </div>
          </div>
          <div>
            <div className={heading}>Least accurate</div>
            <div className="flex flex-wrap gap-1.5">
              {bad.map((a) => (
                <button
                  type="button"
                  key={a.key}
                  {...keyHandlers(a.key)}
                  className="px-2 py-0.5 rounded-md border border-rose-500/40 bg-rose-950/30 font-mono text-xs text-rose-200 cursor-pointer"
                >
                  {keyName(a.key)}{' '}
                  <span className="text-rose-300/70">
                    {a.misses} of {a.firstAttempts}
                  </span>
                </button>
              ))}
              {bad.length === 0 && (
                <span className="text-[11px] text-slate-500">
                  No key missed more than once in three.
                </span>
              )}
            </div>
          </div>
          <div>
            <div className={heading}>Mix-ups</div>
            <div className="flex flex-wrap gap-1.5">
              {mixes.map((m) => (
                <button
                  type="button"
                  key={`${m.expected}${m.pressed}`}
                  {...keyHandlers(m.expected)}
                  className="px-2 py-0.5 rounded-md border border-slate-700 bg-slate-900 font-mono text-xs text-slate-200 cursor-pointer"
                >
                  {keyName(m.expected)}{' '}
                  <span className="text-slate-500">as</span>{' '}
                  <span className="text-rose-300">{keyName(m.pressed)}</span>
                  {m.count > 1 && (
                    <span className="text-slate-500"> ×{m.count}</span>
                  )}
                </button>
              ))}
              {mixes.length === 0 && (
                <span className="text-[11px] text-slate-500">
                  No Mix-ups this Run.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
