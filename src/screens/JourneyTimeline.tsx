import type React from 'react';
import { useState } from 'react';
import type { Day } from '../analytics/days';
import type { JourneyReport } from '../analytics/logbook';
import type { TimelineDay } from '../analytics/timeline';
import { RHYTHM_BAND_FLOORS, STAR_ACCURACY_BARS } from '../game/rules';
import { ACCURACY_STRIP, RHYTHM_STRIP } from './debriefLabels';
import { NO_SPEED } from './hudLabels';
import {
  AWAY_MARK,
  DAILY_OVER,
  DAY_AWAY,
  DAY_NOT_PLAYED,
  isReturning,
  dailyAccuracyExplanation,
  dailyRhythmExplanation,
  dayText,
  LETTER_SPEED_OVER,
  LETTER_SPEED_STRIP,
  letterSpeedExplanation,
  letterSpeedText,
  OPPOSITE_SHIFT_GUIDE,
  SHIFT_HAND_OVER,
  SHIFT_HAND_STRIP,
  shiftHandExplanation,
  TIMELINE_EMPTY,
  TIMELINE_HEADING,
  TIMELINE_HINT,
  timelineRebuilding,
} from './journeyLabels';
import { roundDown } from './roundDown';
import {
  STRIP_ROW,
  StripChart,
  StripsHeading,
  type StripBand,
  type StripGuide,
  type StripSeries,
} from './StripChart';

interface JourneyTimelineProps {
  report: JourneyReport;
  /** The day the cursor is on, or null for none. Page state: the keyboard and the key story read it too. */
  cursor: Day | null;
  /** The pointer moved over a day. The cursor is held when it leaves a strip; the page lets it go when the pointer leaves the whole block. */
  onCursor: (day: Day) => void;
  /** A band or a day was clicked: the day, and the Sector the player had reached by then (null before any). */
  onSelectDay: (day: Day, sectorId: string | null) => void;
}

const STRIP_HEIGHT = 70;
const AXIS_EXTRA = 22;

/** A day takes one unit of x, so a dot sits in the middle of its day. */
const HALF_DAY = 0.5;

/** Sector bands cycle through these tints, in the order the Sectors were reached. */
const SECTOR_TINTS = [
  '#22d3ee',
  '#a78bfa',
  '#fbbf24',
  '#34d399',
  '#f472b6',
  '#fb923c',
];
const AWAY_TINT = '#94a3b8';

/** The lowest Rhythm the game gives (it never falls under 25%), so the strip starts just under it. */
const RHYTHM_FLOOR = 20;

/** Days between the labels of the date axis. */
const AXIS_GAP_DAYS = 14;

const roundUpTo = (value: number, unit: number) =>
  Math.ceil(value / unit) * unit;

/** A strip as laid out: its name and value, how it explains itself, and what it draws. */
interface Row {
  name: string;
  over: string;
  /** The strip's number on a day, or null for none. */
  value: (day: TimelineDay) => number | null;
  format: (value: number) => string;
  tone: string;
  color: string;
  explanation: string;
  yDomain: readonly [number, number];
  guides?: readonly StripGuide[];
  /** The band names (Sectors, days away) are written on this strip, the top one. */
  named?: boolean;
  xAxis?: boolean;
}

/** A stretch of consecutive days that share one group, in days from the first. */
interface Stretch {
  group: string;
  first: number;
  last: number;
  /** The group's name as the first day reads it. */
  name: string;
}

/** The stretches of consecutive days that `groupOf` puts in one group; a day with no group breaks one. */
function stretchesOf(
  days: readonly TimelineDay[],
  groupOf: (day: TimelineDay) => { id: string; name: string } | null,
): Stretch[] {
  const stretches: Stretch[] = [];
  days.forEach((day, at) => {
    const group = groupOf(day);
    if (group === null) return;
    const last = stretches.at(-1);
    if (last && last.last === at - 1 && last.group === group.id) {
      last.last = at;
    } else {
      stretches.push({
        group: group.id,
        first: at,
        last: at,
        name: group.name,
      });
    }
  });
  return stretches;
}

const bandOf = (stretch: Stretch) => ({
  from: stretch.first - HALF_DAY,
  to: stretch.last + HALF_DAY,
});

/**
 * The Journey's timeline: the last 56 days on one axis, with strips for
 * letter speed, accuracy, Rhythm and Shift hand, a dot for each day played,
 * days away shaded (never drawn as zero), and the Sector the player had
 * reached behind each day. Hovering moves one cursor, a whole day at a time,
 * over every strip.
 */
export const JourneyTimeline: React.FC<JourneyTimelineProps> = ({
  report,
  cursor,
  onCursor,
  onSelectDay,
}) => {
  const [hovered, setHovered] = useState<string | null>(null);
  if (report.rebuilding) {
    return (
      <section
        aria-label={TIMELINE_HEADING}
        className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-left"
      >
        <h3 className="type-label text-slate-400 mb-2">{TIMELINE_HEADING}</h3>
        <p className="type-sentence text-slate-400">
          {timelineRebuilding(isReturning(report.sentence))}
        </p>
      </section>
    );
  }

  const { timeline: days, sectors } = report;
  const cursorAt =
    cursor === null ? -1 : days.findIndex((d) => d.day === cursor);
  const shown = cursorAt >= 0 ? days[cursorAt] : null;
  // Without a cursor, the numbers are the latest day's that has one.
  const reading = (row: Row): string => {
    const day =
      shown ?? [...days].reverse().find((each) => row.value(each) !== null);
    if (!day) return NO_SPEED;
    const value = row.value(day);
    if (value !== null) return row.format(value);
    if (day.away) return DAY_AWAY;
    return day.played ? NO_SPEED : DAY_NOT_PLAYED;
  };

  const speeds = days.flatMap((day) => day.letterWpm ?? []);
  const accuracies = days.flatMap((day) => day.accuracy ?? []);
  const accuracyFloor = Math.min(
    80,
    Math.floor(Math.min(100, ...accuracies) / 10) * 10,
  );

  const rows: Row[] = [
    {
      name: LETTER_SPEED_STRIP,
      over: LETTER_SPEED_OVER,
      value: (day) => day.letterWpm,
      format: letterSpeedText,
      tone: 'text-cyan-400',
      color: '#22d3ee',
      explanation: letterSpeedExplanation(),
      yDomain: [0, Math.max(20, roundUpTo(Math.max(0, ...speeds), 10))],
      named: true,
    },
    {
      name: ACCURACY_STRIP,
      over: DAILY_OVER,
      value: (day) => day.accuracy,
      format: (value) => `${roundDown(value)}%`,
      tone: 'text-emerald-400',
      color: '#34d399',
      explanation: dailyAccuracyExplanation(STAR_ACCURACY_BARS),
      yDomain: [accuracyFloor, 100],
      guides: STAR_ACCURACY_BARS.map((bar) => ({ y: bar, label: `${bar}%` })),
    },
    {
      name: RHYTHM_STRIP,
      over: DAILY_OVER,
      value: (day) => day.rhythm,
      format: (value) => `${roundDown(value)}%`,
      tone: 'text-violet-300',
      color: '#a78bfa',
      explanation: dailyRhythmExplanation(RHYTHM_BAND_FLOORS),
      yDomain: [RHYTHM_FLOOR, 100],
      guides: [
        { y: RHYTHM_BAND_FLOORS.Steady, label: 'Steady' },
        { y: RHYTHM_BAND_FLOORS.Paced, label: 'Paced' },
      ],
    },
    {
      name: SHIFT_HAND_STRIP,
      over: SHIFT_HAND_OVER,
      value: (day) => day.oppositeShiftShare,
      format: (value) => `${roundDown(value)}%`,
      tone: 'text-amber-300',
      color: '#fbbf24',
      explanation: shiftHandExplanation(),
      yDomain: [0, 100],
      guides: [{ y: OPPOSITE_SHIFT_GUIDE, label: `${OPPOSITE_SHIFT_GUIDE}%` }],
      xAxis: true,
    },
  ];

  // A Sector's tint follows the order the Sectors were first reached.
  const tintOf = (id: string) =>
    SECTOR_TINTS[
      Math.max(
        0,
        sectors.findIndex((sector) => sector.id === id),
      ) % SECTOR_TINTS.length
    ];
  const sectorStretches = stretchesOf(days, (day) => day.sector);
  const sectorBands = (named: boolean): StripBand[] =>
    sectorStretches.map((stretch) => ({
      ...bandOf(stretch),
      fill: tintOf(stretch.group),
      opacity: 0.1,
      labels: named ? [stretch.name] : undefined,
    }));
  const awayBands = (named: boolean): StripBand[] =>
    stretchesOf(days, (day) =>
      day.away ? { id: 'away', name: AWAY_MARK } : null,
    ).map((stretch) => ({
      ...bandOf(stretch),
      fill: AWAY_TINT,
      opacity: 0.22,
      labels: named ? [AWAY_MARK, 'away'] : undefined,
      labelLine: 1,
    }));

  const axisDays = days
    .map((_, at) => at)
    .filter((at) => (days.length - 1 - at) % AXIS_GAP_DAYS === 0);
  const dayAt = (x: number) =>
    days[Math.min(days.length - 1, Math.max(0, Math.round(x)))];
  // A pointer that leaves a strip (into the gap between two, say) leaves the
  // cursor where it was: the page clears it when the pointer leaves the block.
  const onPointer = (x: number | null) => {
    if (x !== null) onCursor(dayAt(x).day);
  };
  const onSelect = (x: number) => {
    const day = dayAt(x);
    onSelectDay(day.day, day.sector?.id ?? null);
  };

  // The day and its Sector are names, in monospace; the note on a day away is a sentence.
  const dayReading = shown && (
    <>
      <span className="font-mono">
        {[dayText(shown.day), shown.sector?.name].filter(Boolean).join(' · ')}
      </span>
      {shown.away && ` · ${AWAY_MARK}`}
    </>
  );

  return (
    <section
      aria-label={TIMELINE_HEADING}
      className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-left"
    >
      <StripsHeading heading={TIMELINE_HEADING} reading={dayReading} />
      <div className="space-y-2.5">
        {rows.map((row) => {
          const series: StripSeries = {
            points: days.flatMap((day, at) => {
              const value = row.value(day);
              return value === null ? [] : [{ x: at, y: value }];
            }),
            color: row.color,
            dots: true,
            breakAbove: 1,
          };
          return (
            <section
              key={row.name}
              aria-label={row.name}
              onMouseEnter={() => setHovered(row.name)}
              onMouseLeave={() => setHovered(null)}
              className={STRIP_ROW}
            >
              <div className="text-left">
                <h4 className="type-label text-slate-500">{row.name}</h4>
                <div className={`font-mono font-bold text-sm ${row.tone}`}>
                  {reading(row)}
                </div>
                <div className="type-caption font-mono text-slate-500">
                  {row.over}
                </div>
              </div>
              <StripChart
                label={row.name}
                height={STRIP_HEIGHT + (row.xAxis ? AXIS_EXTRA : 0)}
                series={[series]}
                xDomain={[-HALF_DAY, days.length - 1 + HALF_DAY]}
                yDomain={row.yDomain}
                yTicks={row.yDomain}
                guides={row.guides}
                bands={[
                  ...sectorBands(row.named === true),
                  ...awayBands(row.named === true),
                ]}
                cursor={cursorAt >= 0 ? cursorAt : null}
                onCursor={onPointer}
                onSelect={onSelect}
                xAxis={
                  row.xAxis
                    ? {
                        format: (x) => dayText(days[Math.round(x)].day),
                        tickValues: axisDays,
                      }
                    : undefined
                }
                empty={TIMELINE_EMPTY}
              />
            </section>
          );
        })}
      </div>
      <p className="mt-2 min-h-[3rem] type-sentence text-slate-400">
        {rows.find((row) => row.name === hovered)?.explanation ?? TIMELINE_HINT}
      </p>
    </section>
  );
};
