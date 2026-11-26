import { AxisBottom, AxisLeft } from '@visx/axis';
import { curveLinear, curveStepAfter } from '@visx/curve';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { scaleLinear } from '@visx/scale';
import { AreaClosed, LinePath } from '@visx/shape';
import type React from 'react';

/** One line on a strip: its points, colour and shape. */
export interface StripSeries {
  points: readonly { x: number; y: number }[];
  color: string;
  /** Draw as steps, for a number that jumps (the Streak). */
  stepped?: boolean;
  /** Fill down to the foot of the strip. */
  area?: boolean;
  /** Draw each point as a dot (the Journey's days), and the cursor marks only a point it sits on. */
  dots?: boolean;
  /** Don't join two points further apart than this on x (a day away is a gap, not a slope). */
  breakAbove?: number;
}

/** A shaded stretch of x behind the lines, with an optional name in its top corner. */
export interface StripBand {
  from: number;
  to: number;
  fill: string;
  opacity?: number;
  /** Written at the band's top: the first of these that fits the band's width. */
  labels?: readonly string[];
  /** Which line of labels it is written on (0 is the top), so two bands' names don't overlap. */
  labelLine?: number;
}

/** A dashed line across the strip at a value of the game's rules, named at its right end. */
export interface StripGuide {
  y: number;
  label: string;
}

export interface StripChartProps {
  /** The pixel height of the whole strip, axis included. ParentSize fills its parent, so this is the parent's explicit height. */
  height: number;
  /** What the strip is, for its accessible name. */
  label: string;
  series: readonly StripSeries[];
  xDomain: readonly [number, number];
  yDomain: readonly [number, number];
  /** The y values to label down the left edge. */
  yTicks: readonly number[];
  guides?: readonly StripGuide[];
  /** Shaded stretches behind the lines. */
  bands?: readonly StripBand[];
  /** Short ticks along the foot of the strip, at these x values. */
  ticks?: readonly number[];
  /** Where the cursor sits on x, or null. */
  cursor: number | null;
  /** The pointer is at this x, or it has left (null). */
  onCursor: (x: number | null) => void;
  /** The strip was clicked at this x. A strip with no use for a click leaves it out. */
  onSelect?: (x: number) => void;
  /** Draw an x axis under the strip, labelling x with this. */
  xAxis?: { format: (x: number) => string; tickValues: readonly number[] };
  /** Said over the strip when it has no points. */
  empty: string;
}

/**
 * A row of strips: the strip's name, value and window in a column of this
 * width, then the strip. The Debrief and Analytics share it, so their strips
 * line up the same; 120px keeps "other-hand Shift" on one line.
 */
export const STRIP_ROW = 'grid grid-cols-[120px_1fr] items-center gap-2';

/**
 * The heading over a set of strips, with what the cursor reads beside it
 * (the moment or the day it is on) as a 12px caption. The row is held at the
 * caption's height and the reading stays on one line, so the strips don't
 * move when the cursor comes and goes.
 */
export const StripsHeading: React.FC<{
  heading: string;
  reading: React.ReactNode;
}> = ({ heading, reading }) => (
  <div className="mb-2 flex h-4 items-baseline gap-2">
    <h3 className="shrink-0 type-label text-slate-400">{heading}</h3>
    {reading !== null && (
      <p className="min-w-0 truncate type-caption text-slate-300">{reading}</p>
    )}
  </div>
);

/** The chart's numbers and names: the 11px label minimum, in the game's monospace. */
const FONT_SIZE = 11;
/** About how wide one character of it is drawn. */
const CHAR_WIDTH = FONT_SIZE * 0.6;
/** Lowers a label onto the line it names: about half a digit's height. */
const CENTRE = 4;
/** The space between a guide's line (or the label before it) and its label. */
const GUIDE_LABEL_PAD = 4;

/**
 * The right margin holds the guide labels: one column wide enough for
 * "Steady", or two columns of a three-character label ("98%  95%") side by
 * side, the most a strip staggers.
 */
const MARGIN = { top: 8, right: 48, bottom: 8, left: 34 } as const;
const AXIS_HEIGHT = 22;

/**
 * Guides closer than this many pixels share one name (the upper one's): any
 * closer and a name can't say which line it is on. It is what the 9px labels
 * used, so no guide loses a name it had before.
 */
const NAME_GAP = 7.5;
/**
 * Two labels in one column need this many pixels between their lines, about
 * the height of the 11px text, or they overlap. Rhythm's Steady and Paced are
 * 10.1px apart on a 70px strip, so they clear it, just.
 */
const LABEL_GAP = 10;

/** A band's name: its first line's baseline below the strip's top edge, and the step to the next line. */
const BAND_LABEL_TOP = 10;
const BAND_LINE_HEIGHT = 12;

const GRID = '#334155';
const TICK = '#f43f5e';
const CURSOR = '#f8fafc';
/** The numbers and names, in the game's monospace (the theme's `font-mono`). */
const TEXT = {
  fill: '#64748b',
  fontSize: FONT_SIZE,
  className: 'font-mono',
} as const;
/** What an empty strip says is a sentence: the shared 12px caption, in Inter. */
const EMPTY_TEXT = {
  fill: TEXT.fill,
  className: 'type-caption font-sans',
} as const;

/** Which column of the right margin a guide's label goes in, or null for none. */
type LabelColumn = 0 | 1 | null;

/**
 * Where each guide is named. Walking from the top, a guide is named when it
 * is at least `NAME_GAP` below the last one named. A label goes in the first
 * column, or in the second when it would overlap the one above it there.
 * Named guides two apart are at least twice `NAME_GAP` apart, which clears
 * `LABEL_GAP`, so the second column always has room.
 */
function labelColumns(
  guides: readonly StripGuide[],
  yOf: (guide: StripGuide) => number,
): LabelColumn[] {
  const columns: LabelColumn[] = guides.map(() => null);
  let lastNamed = Number.NEGATIVE_INFINITY;
  let lastInFirst = Number.NEGATIVE_INFINITY;
  [...guides.keys()]
    .sort((a, b) => yOf(guides[a]) - yOf(guides[b]))
    .forEach((position) => {
      const y = yOf(guides[position]);
      if (y - lastNamed < NAME_GAP) return;
      lastNamed = y;
      if (y - lastInFirst >= LABEL_GAP) {
        columns[position] = 0;
        lastInFirst = y;
      } else {
        columns[position] = 1;
      }
    });
  return columns;
}

/**
 * One strip of a linked chart: lines over a shared x, dashed guides, a tick
 * for each event, and a cursor that every strip on the screen draws at the
 * same x. Written to be reused by any chart that lines up by x (the Debrief's
 * Run Time; the Journey's days). ParentSize fills its parent, so the parent
 * gets an explicit height from `height`.
 */
export const StripChart: React.FC<StripChartProps> = (props) => (
  <div style={{ height: props.height }} className="w-full">
    <ParentSize debounceTime={0}>
      {({ width, height }) =>
        width > 0 && height > 0 ? (
          <Strip {...props} width={width} height={height} />
        ) : null
      }
    </ParentSize>
  </div>
);

/**
 * The point of a series at or before `x`, for the cursor's dot, or, when
 * `exact`, only a point that is at `x` (a day with no dot has none to mark).
 */
function pointAt(series: StripSeries, x: number, exact: boolean) {
  let found: { x: number; y: number } | null = null;
  for (const point of series.points) {
    if (point.x > x) break;
    found = point;
  }
  return exact && found?.x !== x ? null : found;
}

/** The runs of a series' points that are joined: split wherever two are further apart than `breakAbove`. */
function joinedRuns(series: StripSeries) {
  const runs: { x: number; y: number }[][] = [];
  for (const point of series.points) {
    const run = runs.at(-1);
    const last = run?.at(-1);
    if (run && last && point.x - last.x <= (series.breakAbove ?? Infinity)) {
      run.push(point);
    } else {
      runs.push([point]);
    }
  }
  return runs;
}

const Strip: React.FC<StripChartProps & { width: number }> = ({
  width,
  height,
  label,
  series,
  xDomain,
  yDomain,
  yTicks,
  guides = [],
  bands = [],
  ticks = [],
  cursor,
  onCursor,
  onSelect,
  xAxis,
  empty,
}) => {
  const innerWidth = Math.max(1, width - MARGIN.left - MARGIN.right);
  const innerHeight = Math.max(
    1,
    height - MARGIN.top - MARGIN.bottom - (xAxis ? AXIS_HEIGHT : 0),
  );
  const xScale = scaleLinear({
    domain: [...xDomain],
    range: [0, innerWidth],
    clamp: true,
  });
  const yScale = scaleLinear({
    domain: [...yDomain],
    range: [innerHeight, 0],
    clamp: true,
  });
  const columns = labelColumns(guides, (guide) => yScale(guide.y));
  // The second column starts past the widest label in the first.
  const firstColumnWidth = Math.max(
    0,
    ...guides.map((guide, position) =>
      columns[position] === 0 ? guide.label.length * CHAR_WIDTH : 0,
    ),
  );
  const labelX = (column: 0 | 1) =>
    innerWidth +
    GUIDE_LABEL_PAD +
    column * (firstColumnWidth + GUIDE_LABEL_PAD);
  const hasPoints = series.some((line) => line.points.length > 0);

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={label}
      style={{ overflow: 'visible' }}
    >
      <Group left={MARGIN.left} top={MARGIN.top}>
        <AxisLeft
          scale={yScale}
          tickValues={[...yTicks]}
          hideAxisLine
          hideTicks
          tickLabelProps={{ ...TEXT, textAnchor: 'end', dx: -4, dy: CENTRE }}
        />
        {bands.map((band) => {
          const width = xScale(band.to) - xScale(band.from);
          const name = band.labels?.find(
            (candidate) => candidate.length * CHAR_WIDTH + 6 <= width,
          );
          return (
            <g key={`${band.from}-${band.to}-${band.fill}`}>
              <rect
                x={xScale(band.from)}
                y={0}
                width={Math.max(0, xScale(band.to) - xScale(band.from))}
                height={innerHeight}
                fill={band.fill}
                fillOpacity={band.opacity ?? 0.12}
              />
              {name && (
                <text
                  x={xScale(band.from) + 3}
                  y={BAND_LABEL_TOP + BAND_LINE_HEIGHT * (band.labelLine ?? 0)}
                  {...TEXT}
                  fill="#cbd5e1"
                  pointerEvents="none"
                >
                  {name}
                </text>
              )}
            </g>
          );
        })}
        {hasPoints &&
          guides.map((guide, position) => {
            const column = columns[position];
            return (
              <g key={`${guide.y}${guide.label}`}>
                <line
                  x1={0}
                  x2={innerWidth}
                  y1={yScale(guide.y)}
                  y2={yScale(guide.y)}
                  stroke={GRID}
                  strokeDasharray="3 4"
                />
                {column !== null && (
                  <text
                    x={labelX(column)}
                    y={yScale(guide.y)}
                    dy={CENTRE}
                    {...TEXT}
                    fill="#94a3b8"
                  >
                    {guide.label}
                  </text>
                )}
              </g>
            );
          })}
        {hasPoints &&
          ticks.map((x) => (
            <g key={x}>
              <line
                x1={xScale(x)}
                x2={xScale(x)}
                y1={0}
                y2={innerHeight}
                stroke={TICK}
                strokeOpacity={0.25}
              />
              <line
                x1={xScale(x)}
                x2={xScale(x)}
                y1={innerHeight - 6}
                y2={innerHeight}
                stroke={TICK}
                strokeWidth={2}
              />
            </g>
          ))}
        {series.map((line) => {
          const curve = line.stepped ? curveStepAfter : curveLinear;
          return (
            <g key={line.color}>
              {line.area && (
                <AreaClosed
                  data={[...line.points]}
                  x={(point) => xScale(point.x)}
                  y={(point) => yScale(point.y)}
                  yScale={yScale}
                  curve={curve}
                  fill={line.color}
                  fillOpacity={0.15}
                />
              )}
              {joinedRuns(line).map((run) => (
                <LinePath
                  key={run[0].x}
                  data={run}
                  x={(point) => xScale(point.x)}
                  y={(point) => yScale(point.y)}
                  curve={curve}
                  stroke={line.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              ))}
              {line.dots &&
                line.points.map((point) => (
                  <circle
                    key={point.x}
                    cx={xScale(point.x)}
                    cy={yScale(point.y)}
                    r={2.5}
                    fill={line.color}
                  />
                ))}
            </g>
          );
        })}
        {!hasPoints && (
          <text
            x={innerWidth / 2}
            y={innerHeight / 2}
            dy={CENTRE}
            textAnchor="middle"
            {...EMPTY_TEXT}
          >
            {empty}
          </text>
        )}
        {hasPoints && cursor !== null && (
          <g pointerEvents="none">
            <line
              x1={xScale(cursor)}
              x2={xScale(cursor)}
              y1={0}
              y2={innerHeight}
              stroke={CURSOR}
              strokeWidth={1.5}
            />
            {series.map((line) => {
              const point = pointAt(line, cursor, line.dots === true);
              return point ? (
                <circle
                  key={line.color}
                  cx={xScale(point.x)}
                  cy={yScale(point.y)}
                  r={3}
                  fill={line.color}
                  stroke={CURSOR}
                />
              ) : null;
            })}
          </g>
        )}
        {xAxis && (
          <AxisBottom
            top={innerHeight + 2}
            scale={xScale}
            tickValues={[...xAxis.tickValues]}
            tickFormat={(value) => xAxis.format(Number(value))}
            stroke={GRID}
            tickStroke={GRID}
            tickLabelProps={{ ...TEXT, textAnchor: 'middle' }}
          />
        )}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: the strip is a pointer-only way to scrub the Run, or to jump to a Sector's entry in the logbook; the same moments are in the text, the lists and the keyboard around it, and the entries are on the page */}
        <rect
          width={innerWidth}
          height={innerHeight}
          fill="transparent"
          cursor="crosshair"
          onMouseMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            onCursor(xScale.invert(event.clientX - box.left));
          }}
          onMouseLeave={() => onCursor(null)}
          onClick={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            onSelect?.(xScale.invert(event.clientX - box.left));
          }}
        />
      </Group>
    </svg>
  );
};
