/**
 * PROTOTYPE (#147). Hand-made SVG charts, no chart library: one line chart
 * that stretches to its box, with Miss ticks and optional area fill.
 */
import type React from 'react';
import type { Point } from './flightLog';

export interface Line {
  points: Point[];
  color: string;
  dashed?: boolean;
  area?: boolean;
  width?: number;
  /** Draw as steps (the Streak), not a slope. */
  stepped?: boolean;
}

interface LineChartProps {
  lines: Line[];
  xMax: number;
  yMin: number;
  yMax: number;
  height: number;
  misses?: number[];
  /** Horizontal guide lines, at these y values. */
  guides?: number[];
  /** The y labels at the top and bottom of the box. */
  yLabels?: [string, string];
  /** Show a seconds axis underneath. */
  xAxis?: boolean;
}

const W = 600;

export const LineChart: React.FC<LineChartProps> = ({
  lines,
  xMax,
  yMin,
  yMax,
  height,
  misses = [],
  guides = [],
  yLabels,
  xAxis,
}) => {
  const H = 100;
  const sx = (x: number) => (xMax <= 0 ? 0 : (x / xMax) * W);
  const sy = (y: number) =>
    H - ((Math.min(yMax, Math.max(yMin, y)) - yMin) / (yMax - yMin || 1)) * H;
  const pathOf = (line: Line) => {
    let d = '';
    line.points.forEach((p, i) => {
      if (i === 0) d += `M${sx(p.x)},${sy(p.y)}`;
      else if (line.stepped) d += `H${sx(p.x)}V${sy(p.y)}`;
      else d += `L${sx(p.x)},${sy(p.y)}`;
    });
    return d;
  };
  return (
    <div className="relative w-full" style={{ height }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full overflow-visible"
        role="img"
        aria-hidden
      >
        {guides.map((g) => (
          <line
            key={g}
            x1={0}
            x2={W}
            y1={sy(g)}
            y2={sy(g)}
            stroke="#334155"
            strokeDasharray="3 4"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {misses.map((m, i) => (
          <line
            // biome-ignore lint/suspicious/noArrayIndexKey: prototype
            key={i}
            x1={sx(m)}
            x2={sx(m)}
            y1={0}
            y2={H}
            stroke="#f43f5e"
            strokeOpacity={0.35}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {lines.map((line, i) => {
          const d = pathOf(line);
          if (!d) return null;
          const last = line.points[line.points.length - 1];
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: prototype
            <g key={i}>
              {line.area && (
                <path
                  d={`${d}L${sx(last.x)},${H}L${sx(line.points[0].x)},${H}Z`}
                  fill={line.color}
                  fillOpacity={0.15}
                />
              )}
              <path
                d={d}
                fill="none"
                stroke={line.color}
                strokeWidth={line.width ?? 2}
                strokeDasharray={line.dashed ? '5 4' : undefined}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          );
        })}
      </svg>
      {yLabels && (
        <>
          <span className="absolute -left-1 top-0 -translate-x-full pr-1 text-[9px] font-mono text-slate-500">
            {yLabels[0]}
          </span>
          <span className="absolute -left-1 bottom-0 -translate-x-full pr-1 text-[9px] font-mono text-slate-500">
            {yLabels[1]}
          </span>
        </>
      )}
      {xAxis && (
        <div className="absolute left-0 right-0 -bottom-4 flex justify-between text-[9px] font-mono text-slate-500">
          <span>0s</span>
          <span>{Math.round(xMax / 2)}s</span>
          <span>{Math.round(xMax)}s</span>
        </div>
      )}
    </div>
  );
};
