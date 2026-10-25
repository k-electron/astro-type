import {
  FillGradient,
  type Graphics,
  Text,
  type TextStyleOptions,
} from 'pixi.js';

export const FONT = '"JetBrains Mono", ui-monospace, monospace';

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
      fontWeight: weight as TextStyleOptions['fontWeight'],
      fill,
      ...extra,
    },
    resolution,
  });
  t.anchor.set(0.5);
  return t;
}

/** PixiJS v8 has no dashed strokes, so draw them along a rectangle's straight edges. */
export function dashedRect(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  dash: number,
  gap: number,
  stroke: { width: number; color: string; alpha?: number },
): void {
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const dx = (x2 - x1) / len;
    const dy = (y2 - y1) / len;
    for (let d = 0; d < len; d += dash + gap) {
      const end = Math.min(len, d + dash);
      g.moveTo(x1 + dx * d, y1 + dy * d).lineTo(x1 + dx * end, y1 + dy * end);
    }
  };
  line(x, y, x + w, y);
  line(x + w, y, x + w, y + h);
  line(x + w, y + h, x, y + h);
  line(x, y + h, x, y);
  g.stroke(stroke);
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
  // Walk the curve, drawing for `dash` and skipping for `gap`.
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
