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
