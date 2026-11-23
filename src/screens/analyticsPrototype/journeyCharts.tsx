/**
 * PROTOTYPE (#148). The journey's charts, drawn with visx: strips over the
 * calendar days with the Sectors as bands behind them, days away shaded,
 * and one cursor shared by every strip. Also a small trend chart for one key.
 */
import { AxisBottom } from '@visx/axis';
import { curveMonotoneX } from '@visx/curve';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { scaleLinear } from '@visx/scale';
import { AreaClosed, Bar, LinePath } from '@visx/shape';
import type React from 'react';
import { CURRICULUM_SECTORS } from '../../curriculum/curriculum';
import { type DayPoint, dateOf, type Journey } from './journey';

export const SECTOR_TINTS = [
  '#22d3ee',
  '#a78bfa',
  '#34d399',
  '#fbbf24',
  '#f472b6',
  '#60a5fa',
  '#fb923c',
];

const sectorIndex = (id: string | null) =>
  id === null ? -1 : CURRICULUM_SECTORS.findIndex((s) => s.id === id);

/** The furthest Sector the player had reached by each calendar day. */
export function furthestByDay(days: DayPoint[]): number[] {
  let furthest = 0;
  return days.map((d) => {
    for (const s of d.firstVisitTo)
      furthest = Math.max(furthest, sectorIndex(s.sectorId));
    return furthest;
  });
}

export const shortDate = (day: number) =>
  dateOf(day).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

export interface StripSpec {
  label: string;
  color: string;
  value: (d: DayPoint) => number | null;
  yMin: number;
  yMax: number;
  unit: string;
  guides?: number[];
  hint: string;
}

const LEFT = 92;
const RIGHT = 12;

export const JourneyStrips: React.FC<{
  journey: Journey;
  strips: StripSpec[];
  stripHeight?: number;
  cursorDay: number | null;
  onCursorDay: (day: number | null) => void;
  showSectorNames?: boolean;
  /** Told the Sector (its index) of a band or a day the player clicks. */
  onPickSector?: (sector: number) => void;
}> = ({
  journey,
  strips,
  stripHeight = 54,
  cursorDay,
  onCursorDay,
  showSectorNames = true,
  onPickSector,
}) => {
  const { days } = journey;
  const lastDay = days.length - 1;
  const bands = furthestByDay(days);
  const headH = showSectorNames ? 18 : 0;
  const gap = 10;
  const height = headH + strips.length * (stripHeight + gap) + 22;
  return (
    // visx's ParentSize fills its parent, so the parent needs a height.
    <div style={{ height }}>
      <ParentSize debounceTime={50}>
        {({ width }) => {
          if (width < 10) return null;
          const innerW = width - LEFT - RIGHT;
          const x = scaleLinear<number>({
            domain: [-0.5, lastDay + 0.5],
            range: [0, innerW],
          });
          const dayW = innerW / days.length;
          const onMove = (e: React.MouseEvent<SVGRectElement>) => {
            const box = e.currentTarget.getBoundingClientRect();
            const day = Math.round(x.invert(e.clientX - box.left));
            onCursorDay(Math.max(0, Math.min(lastDay, day)));
          };
          // The Sector bands: runs of days with the same furthest Sector.
          const runs: { from: number; to: number; sector: number }[] = [];
          bands.forEach((s, day) => {
            const last = runs.at(-1);
            if (last && last.sector === s) last.to = day;
            else runs.push({ from: day, to: day, sector: s });
          });
          return (
            <svg width={width} height={height} role="img" aria-label="Journey">
              <Group left={LEFT} top={headH}>
                {showSectorNames &&
                  runs.map((r) => {
                    const w = x(r.to + 0.5) - x(r.from - 0.5);
                    const name = CURRICULUM_SECTORS[r.sector]?.name ?? '';
                    return (
                      <text
                        key={`n${r.from}`}
                        x={x(r.from - 0.5) + 4}
                        y={-6}
                        fontSize={10}
                        fontFamily="ui-monospace, monospace"
                        fill={SECTOR_TINTS[r.sector]}
                        style={{ cursor: onPickSector ? 'pointer' : undefined }}
                        onClick={() => onPickSector?.(r.sector)}
                      >
                        {w > name.length * 6.2
                          ? name
                          : w > 28
                            ? `S${r.sector + 1}`
                            : ''}
                      </text>
                    );
                  })}
                {strips.map((strip, i) => {
                  const top = i * (stripHeight + gap);
                  const y = scaleLinear<number>({
                    domain: [strip.yMin, strip.yMax],
                    range: [stripHeight, 0],
                    clamp: true,
                  });
                  const cursor =
                    cursorDay !== null ? strip.value(days[cursorDay]) : null;
                  const latest = [...days].reverse().find((d) => d.played);
                  const shown =
                    cursor ?? (latest ? strip.value(latest) : null) ?? null;
                  return (
                    <Group key={strip.label} top={top}>
                      <text
                        x={-LEFT}
                        y={12}
                        fontSize={10}
                        fill="#94a3b8"
                        fontFamily="ui-monospace, monospace"
                      >
                        {strip.label.toUpperCase()}
                      </text>
                      <text
                        x={-LEFT}
                        y={30}
                        fontSize={14}
                        fontWeight={700}
                        fill={strip.color}
                        fontFamily="ui-monospace, monospace"
                      >
                        {shown === null
                          ? '–'
                          : `${Math.round(shown)}${strip.unit}`}
                      </text>
                      <text
                        x={-LEFT}
                        y={44}
                        fontSize={9}
                        fill="#64748b"
                        fontFamily="ui-monospace, monospace"
                      >
                        {cursorDay !== null ? shortDate(cursorDay) : 'latest'}
                      </text>
                      {runs.map((r) => (
                        <rect
                          key={`b${r.from}`}
                          x={x(r.from - 0.5)}
                          width={x(r.to + 0.5) - x(r.from - 0.5)}
                          y={0}
                          height={stripHeight}
                          fill={SECTOR_TINTS[r.sector]}
                          fillOpacity={0.07}
                        />
                      ))}
                      {days.map((d) =>
                        d.played ? null : (
                          <rect
                            key={`a${d.day}`}
                            x={x(d.day - 0.5)}
                            width={dayW}
                            y={0}
                            height={stripHeight}
                            fill="#0b1120"
                            fillOpacity={0.85}
                          />
                        ),
                      )}
                      {(strip.guides ?? []).map((g) => (
                        <line
                          key={g}
                          x1={0}
                          x2={innerW}
                          y1={y(g)}
                          y2={y(g)}
                          stroke="#334155"
                          strokeDasharray="3 4"
                        />
                      ))}
                      <AreaClosed<DayPoint>
                        data={days}
                        x={(d) => x(d.day)}
                        y={(d) => y(strip.value(d) ?? strip.yMin)}
                        yScale={y}
                        defined={(d) => strip.value(d) !== null}
                        curve={curveMonotoneX}
                        fill={strip.color}
                        fillOpacity={0.12}
                      />
                      <LinePath<DayPoint>
                        data={days}
                        x={(d) => x(d.day)}
                        y={(d) => y(strip.value(d) ?? strip.yMin)}
                        defined={(d) => strip.value(d) !== null}
                        curve={curveMonotoneX}
                        stroke={strip.color}
                        strokeWidth={2}
                      />
                      {days.map((d) => {
                        const v = strip.value(d);
                        return v === null ? null : (
                          <circle
                            key={`p${d.day}`}
                            cx={x(d.day)}
                            cy={y(v)}
                            r={cursorDay === d.day ? 4 : 1.8}
                            fill={strip.color}
                          />
                        );
                      })}
                      <text
                        x={-6}
                        y={8}
                        fontSize={9}
                        textAnchor="end"
                        fill="#64748b"
                      >
                        {strip.yMax}
                      </text>
                      <text
                        x={-6}
                        y={stripHeight}
                        fontSize={9}
                        textAnchor="end"
                        fill="#64748b"
                      >
                        {strip.yMin}
                      </text>
                      <title>{strip.hint}</title>
                    </Group>
                  );
                })}
                {cursorDay !== null && (
                  <line
                    x1={x(cursorDay)}
                    x2={x(cursorDay)}
                    y1={0}
                    y2={strips.length * (stripHeight + gap) - gap}
                    stroke="#f8fafc"
                    strokeWidth={1.5}
                  />
                )}
                <AxisBottom
                  top={strips.length * (stripHeight + gap) - gap}
                  scale={x}
                  numTicks={Math.min(8, Math.floor(innerW / 80))}
                  tickFormat={(v) => shortDate(Number(v))}
                  stroke="#334155"
                  tickStroke="#334155"
                  tickLabelProps={{
                    fill: '#64748b',
                    fontSize: 10,
                    textAnchor: 'middle',
                  }}
                />
                <Bar
                  x={0}
                  y={0}
                  width={innerW}
                  height={strips.length * (stripHeight + gap)}
                  fill="transparent"
                  onMouseMove={onMove}
                  onMouseLeave={() => onCursorDay(null)}
                  onClick={(e) => {
                    if (!onPickSector) return;
                    const box = e.currentTarget.getBoundingClientRect();
                    const day = Math.round(x.invert(e.clientX - box.left));
                    onPickSector(bands[Math.max(0, Math.min(lastDay, day))]);
                  }}
                  style={{ cursor: onPickSector ? 'pointer' : undefined }}
                />
              </Group>
            </svg>
          );
        }}
      </ParentSize>
    </div>
  );
};

/** One key's speed and accuracy over the days it was typed. */
export const KeyTrend: React.FC<{
  daily: { day: number; ms: number | null; accuracy: number | null }[];
  lastDay: number;
  height?: number;
}> = ({ daily, lastDay, height = 120 }) => (
  <div style={{ height }}>
    <ParentSize debounceTime={50}>
      {({ width }) => {
        if (width < 10) return null;
        const left = 34;
        const innerW = width - left - 30;
        const innerH = height - 30;
        const x = scaleLinear<number>({
          domain: [0, lastDay],
          range: [0, innerW],
        });
        const msMax = Math.max(
          600,
          ...daily.map((d) => Math.ceil((d.ms ?? 0) / 200) * 200),
        );
        const yMs = scaleLinear<number>({
          domain: [0, msMax],
          range: [innerH, 0],
        });
        const yAcc = scaleLinear<number>({
          domain: [70, 100],
          range: [innerH, 0],
          clamp: true,
        });
        return (
          <svg width={width} height={height} role="img" aria-label="Key trend">
            <Group left={left} top={4}>
              <LinePath
                data={daily}
                x={(d) => x(d.day)}
                y={(d) => yMs(d.ms ?? 0)}
                defined={(d) => d.ms !== null}
                curve={curveMonotoneX}
                stroke="#fbbf24"
                strokeWidth={2}
              />
              <LinePath
                data={daily}
                x={(d) => x(d.day)}
                y={(d) => yAcc(d.accuracy ?? 100)}
                defined={(d) => d.accuracy !== null}
                curve={curveMonotoneX}
                stroke="#34d399"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
              <text x={-4} y={8} fontSize={9} textAnchor="end" fill="#fbbf24">
                {msMax}
              </text>
              <text
                x={-4}
                y={innerH}
                fontSize={9}
                textAnchor="end"
                fill="#fbbf24"
              >
                0 ms
              </text>
              <text x={innerW + 4} y={8} fontSize={9} fill="#34d399">
                100%
              </text>
              <text x={innerW + 4} y={innerH} fontSize={9} fill="#34d399">
                70%
              </text>
              <AxisBottom
                top={innerH}
                scale={x}
                numTicks={3}
                tickFormat={(v) => shortDate(Number(v))}
                stroke="#334155"
                tickStroke="#334155"
                tickLabelProps={{
                  fill: '#64748b',
                  fontSize: 9,
                  textAnchor: 'middle',
                }}
              />
            </Group>
          </svg>
        );
      }}
    </ParentSize>
  </div>
);
