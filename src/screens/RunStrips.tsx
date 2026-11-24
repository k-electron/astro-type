import type React from 'react';
import { useState } from 'react';
import { STEPS_PER_SECOND } from '../analytics/keys';
import {
  momentAt,
  type RunStrips as RunStripsReport,
  type StripPoint,
  valueAt,
} from '../analytics/strips';
import {
  MULTIPLIER_STEPS,
  RHYTHM_BAND_FLOORS,
  rhythmBand,
  STAR_ACCURACY_BARS,
} from '../game/rules';
import {
  ACCURACY_OVER,
  ACCURACY_STRIP,
  accuracyExplanation,
  accuracyValue,
  RHYTHM_OVER,
  RHYTHM_STRIP,
  rhythmExplanation,
  rhythmValue,
  SPEED_OVER,
  SPEED_STRIP,
  speedExplanation,
  speedValue,
  STREAK_OVER,
  STREAK_STRIP,
  STRIPS_HEADING,
  STRIPS_HINT,
  STRIP_EMPTY,
  streakExplanation,
  streakValue,
  stripTime,
} from './debriefLabels';
import { StripChart, type StripGuide, type StripSeries } from './StripChart';

/** The moment under the pointer, or standing for a letter: a step of Run Time and the letter typed then. */
export interface RunCursor {
  step: number;
  /** Which character of the text was being typed. */
  index: number;
}

interface RunStripsProps {
  strips: RunStripsReport;
  cursor: RunCursor | null;
  onCursor: (cursor: RunCursor | null) => void;
}

const STRIP_HEIGHT = 70;
const AXIS_EXTRA = 22;

/** A strip as laid out: its name and the value beside it, how it explains itself, and what it draws. */
interface Row {
  name: string;
  /** What the value is measured over, under it. */
  over: string;
  value: string;
  tone: string;
  explanation: string;
  series: StripSeries;
  yDomain: readonly [number, number];
  guides?: readonly StripGuide[];
  xAxis?: boolean;
}

/** The lowest Rhythm the game gives (it never falls under 25%), so the strip starts just under it. */
const RHYTHM_FLOOR = 20;

/** Whole-second gaps between the time axis's labels, the smallest that keeps it to about six. */
const TICK_GAPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];

/** The seconds to label on the time axis. */
function timeTicks(seconds: number): number[] {
  const gap = TICK_GAPS.find((each) => seconds / each <= 6) ?? 600;
  return Array.from(
    { length: Math.floor(seconds / gap) + 1 },
    (_, at) => at * gap,
  );
}

const roundUpTo = (value: number, unit: number) =>
  Math.ceil(value / unit) * unit;

/**
 * The Run's four strips on one Run Time axis: speed, accuracy, Rhythm and
 * Streak, with the Misses ticked on each and the game's own bars drawn as
 * guides. Hovering a strip moves one cursor over all four and says which
 * letter was being typed; it explains itself in the line under them.
 */
export const RunStrips: React.FC<RunStripsProps> = ({
  strips,
  cursor,
  onCursor,
}) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const { firstStep, lastStep } = strips;
  const secondsOf = (step: number) => (step - firstStep) / STEPS_PER_SECOND;
  const plot = (points: readonly StripPoint[]) =>
    points.map((point) => ({ x: secondsOf(point.step), y: point.value }));
  const cursorX = cursor === null ? null : secondsOf(cursor.step);
  // Where the numbers are read: under the cursor, or at the Run's end.
  const step = cursor?.step ?? lastStep;
  const numbers = (value: number | null) => ({ seconds: cursorX, value });

  const speeds = strips.speed.map((point) => point.value);
  const speedNow = valueAt(strips.speed, step);
  const speedTop = Math.max(20, roundUpTo(Math.max(0, ...speeds), 10));
  const accuracyNow = valueAt(strips.accuracy, step);
  const accuracyFloor = Math.min(
    80,
    Math.floor(
      Math.min(100, ...strips.accuracy.map((point) => point.value)) / 10,
    ) * 10,
  );
  const rhythmNow = valueAt(strips.rhythm, step);
  const streakNow = valueAt(strips.streak, step);
  const longest = Math.max(0, ...strips.streak.map((point) => point.value));
  const streakTop = Math.max(10, roundUpTo(longest, 10));

  const rows: Row[] = [
    {
      name: SPEED_STRIP,
      over: SPEED_OVER,
      value: speedValue(speedNow),
      tone: 'text-cyan-400',
      explanation: speedExplanation(
        numbers(speedNow),
        speeds.length === 0
          ? null
          : { fastest: Math.max(...speeds), slowest: Math.min(...speeds) },
      ),
      series: { points: plot(strips.speed), color: '#22d3ee', area: true },
      yDomain: [0, speedTop],
    },
    {
      name: ACCURACY_STRIP,
      over: ACCURACY_OVER,
      value: accuracyValue(accuracyNow),
      tone: 'text-emerald-400',
      explanation: accuracyExplanation(
        numbers(accuracyNow),
        STAR_ACCURACY_BARS,
      ),
      series: { points: plot(strips.accuracy), color: '#34d399' },
      yDomain: [accuracyFloor, 100],
      guides: STAR_ACCURACY_BARS.map((bar) => ({ y: bar, label: `${bar}%` })),
    },
    {
      name: RHYTHM_STRIP,
      over: RHYTHM_OVER,
      value: rhythmValue(rhythmNow),
      tone: 'text-violet-300',
      explanation: rhythmExplanation(
        numbers(rhythmNow),
        rhythmNow === null ? null : rhythmBand(rhythmNow),
        RHYTHM_BAND_FLOORS,
      ),
      series: { points: plot(strips.rhythm), color: '#a78bfa' },
      yDomain: [RHYTHM_FLOOR, 100],
      guides: [
        { y: RHYTHM_BAND_FLOORS.Steady, label: 'Steady' },
        { y: RHYTHM_BAND_FLOORS.Paced, label: 'Paced' },
      ],
    },
    {
      name: STREAK_STRIP,
      over: STREAK_OVER,
      value: streakValue(streakNow),
      tone: 'text-amber-300',
      explanation: streakExplanation(
        numbers(streakNow),
        longest,
        MULTIPLIER_STEPS,
      ),
      series: {
        points: plot(strips.streak),
        color: '#fbbf24',
        stepped: true,
        area: true,
      },
      yDomain: [0, streakTop],
      guides: MULTIPLIER_STEPS.filter(
        (multiplier) => multiplier.streak > 0 && multiplier.streak <= streakTop,
      ).map((multiplier) => ({
        y: multiplier.streak,
        label: `x${multiplier.multiplier}`,
      })),
      xAxis: true,
    },
  ];

  const onPointer = (x: number | null) => {
    const pointerStep =
      x === null ? null : firstStep + Math.max(0, x) * STEPS_PER_SECOND;
    const moment =
      pointerStep === null ? null : momentAt(strips.moments, pointerStep);
    onCursor(
      pointerStep !== null && moment
        ? { step: pointerStep, index: moment.index }
        : null,
    );
  };

  const seconds = Math.max(1, secondsOf(lastStep));
  const misses = strips.misses.map(secondsOf);

  return (
    <section
      aria-label={STRIPS_HEADING}
      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-left"
    >
      <h3 className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-2">
        {STRIPS_HEADING}
        {cursorX !== null && (
          <span className="ml-2 text-slate-300 normal-case">
            {stripTime(cursorX)}
          </span>
        )}
      </h3>
      <div className="space-y-2.5">
        {rows.map((row) => (
          <section
            key={row.name}
            aria-label={row.name}
            onMouseEnter={() => setHovered(row.name)}
            onMouseLeave={() => setHovered(null)}
            className="grid grid-cols-[92px_1fr] items-center gap-2"
          >
            <div className="text-left">
              <h4 className="text-[10px] uppercase font-mono text-slate-500">
                {row.name}
              </h4>
              <div className={`font-mono font-bold text-sm ${row.tone}`}>
                {row.value}
              </div>
              <div className="text-[9px] font-mono text-slate-500">
                {row.over}
              </div>
            </div>
            <StripChart
              label={row.name}
              height={STRIP_HEIGHT + (row.xAxis ? AXIS_EXTRA : 0)}
              series={[row.series]}
              xDomain={[0, seconds]}
              yDomain={row.yDomain}
              yTicks={row.yDomain}
              guides={row.guides}
              ticks={misses}
              cursor={cursorX}
              onCursor={onPointer}
              xAxis={
                row.xAxis
                  ? { format: stripTime, tickValues: timeTicks(seconds) }
                  : undefined
              }
              empty={STRIP_EMPTY}
            />
          </section>
        ))}
      </div>
      <p className="mt-2 min-h-[3rem] text-[11px] leading-snug font-mono text-slate-400">
        {rows.find((row) => row.name === hovered)?.explanation ?? STRIPS_HINT}
      </p>
    </section>
  );
};
