import {
  FillGradient,
  type Graphics,
  Text,
  type TextStyleOptions,
} from 'pixi.js';

export const FONT = '"JetBrains Mono", ui-monospace, monospace';

/**
 * The weight to ask PixiJS for when the DOM deck asked for `weight`. Canvas
 * text comes out heavier than the same weight in the page, so the deck's bold
 * (the DOM's 700, which is all of "extrabold" and "black" too, as only 400 to
 * 700 are loaded) is drawn at 500 and matches it side by side.
 */
export function deckWeight(
  weight: string,
): NonNullable<TextStyleOptions['fontWeight']> {
  return (weight === '700' ? '500' : weight) as NonNullable<
    TextStyleOptions['fontWeight']
  >;
}

export function rgba(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/** A centred piece of text in the deck's font. */
export function makeText(
  text: string,
  size: number,
  weight: string,
  fill: string,
  resolution: number,
  extra: Partial<TextStyleOptions> = {},
): Text {
  const t = new Text({
    text,
    style: {
      fontFamily: FONT,
      fontSize: size,
      fontWeight: deckWeight(weight),
      fill,
      ...extra,
    },
    resolution,
  });
  t.anchor.set(0.5);
  return t;
}

/** A vertical keycap gradient from `top` down to the deck's slate. */
export function keycapGradient(top: string): FillGradient {
  return new FillGradient({
    type: 'linear',
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
    colorStops: [
      { offset: 0, color: top },
      { offset: 1, color: '#0f172a' },
    ],
    textureSpace: 'local',
  });
}

/** PixiJS v8 has no dashed strokes, so they are cut by hand. Walk a polyline, drawing for `dash` and skipping for `gap`, and stroke it. */
function dashAlong(
  g: Graphics,
  points: [number, number][],
  dash: number,
  gap: number,
  stroke: { width: number; color: string; alpha?: number },
): void {
  let drawing = true;
  let left = dash;
  g.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    let [px, py] = points[i - 1];
    const [qx, qy] = points[i];
    let seg = Math.hypot(qx - px, qy - py);
    while (seg > 0) {
      const take = Math.min(seg, left);
      const f = take / seg;
      px += (qx - px) * f;
      py += (qy - py) * f;
      if (drawing) g.lineTo(px, py);
      else g.moveTo(px, py);
      seg -= take;
      left -= take;
      if (left <= 1e-9) {
        drawing = !drawing;
        left = drawing ? dash : gap;
      }
    }
  }
  g.stroke(stroke);
}

/** A dashed cubic Bezier curve (`M x0 y0 C x1 y1, x2 y2, x3 y3`), cut into dashes along its length. */
export function dashedCubic(
  g: Graphics,
  [x0, y0, x1, y1, x2, y2, x3, y3]: number[],
  dash: number,
  gap: number,
  stroke: { width: number; color: string; alpha?: number },
): void {
  const steps = 64;
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    points.push([
      u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
      u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
    ]);
  }
  dashAlong(g, points, dash, gap, stroke);
}

/**
 * A dashed rounded rectangle, the way an SVG rect with `rx` and a dash array
 * draws: from the top edge's start, clockwise, with the corners curved.
 */
export function dashedRoundRect(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  dash: number,
  gap: number,
  stroke: { width: number; color: string; alpha?: number },
): void {
  const r = Math.min(radius, w / 2, h / 2);
  const points: [number, number][] = [[x + r, y]];
  const arc = (cx: number, cy: number, from: number) => {
    const steps = 8;
    for (let i = 0; i <= steps; i++) {
      const a = from + ((Math.PI / 2) * i) / steps;
      points.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    }
  };
  points.push([x + w - r, y]);
  arc(x + w - r, y + r, -Math.PI / 2);
  points.push([x + w, y + h - r]);
  arc(x + w - r, y + h - r, 0);
  points.push([x + r, y + h]);
  arc(x + r, y + h - r, Math.PI / 2);
  points.push([x, y + r]);
  arc(x + r, y + r, Math.PI);
  dashAlong(g, points, dash, gap, stroke);
}
