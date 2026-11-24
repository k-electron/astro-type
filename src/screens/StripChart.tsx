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
  /** Draw an x axis under the strip, labelling x with this. */
  xAxis?: { format: (x: number) => string; tickValues: readonly number[] };
  /** Said over the strip when it has no points. */
  empty: string;
}

const MARGIN = { top: 8, right: 40, bottom: 8, left: 34 } as const;
const AXIS_HEIGHT = 22;

/** Guides closer than this many pixels share one label, so their names never overlap. */
const LABEL_GAP = 7.5;

const GRID = '#334155';
const TICK = '#f43f5e';
const CURSOR = '#f8fafc';
const TEXT = { fill: '#64748b', fontSize: 9, fontFamily: 'monospace' } as const;

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
  // Walk the guides from the top, naming one only when it clears the last named.
  const labelled = new Set<number>();
  let lastLabelY = Number.NEGATIVE_INFINITY;
  [...guides.keys()]
    .sort((a, b) => yScale(guides[a].y) - yScale(guides[b].y))
    .forEach((position) => {
      const y = yScale(guides[position].y);
      if (y - lastLabelY >= LABEL_GAP) {
        labelled.add(position);
        lastLabelY = y;
      }
    });
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
          tickLabelProps={{ ...TEXT, textAnchor: 'end', dx: -4, dy: 3 }}
        />
        {bands.map((band) => {
          const width = xScale(band.to) - xScale(band.from);
          const name = band.labels?.find(
            (candidate) => candidate.length * 5.5 + 6 <= width,
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
                  y={9 + 10 * (band.labelLine ?? 0)}
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
          guides.map((guide, position) => (
            <g key={`${guide.y}${guide.label}`}>
              <line
                x1={0}
                x2={innerWidth}
                y1={yScale(guide.y)}
                y2={yScale(guide.y)}
                stroke={GRID}
                strokeDasharray="3 4"
              />
              {labelled.has(position) && (
                <text
                  x={innerWidth + 4}
                  y={yScale(guide.y)}
                  dy={3}
                  {...TEXT}
                  fill="#94a3b8"
                >
                  {guide.label}
                </text>
              )}
            </g>
          ))}
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
            dy={3}
            textAnchor="middle"
            {...TEXT}
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
        {/* biome-ignore lint/a11y/noStaticElementInteractions: the strip is a pointer-only way to scrub the Run; the same moments are in the text, the lists and the keyboard around it */}
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
        />
      </Group>
    </svg>
  );
};
