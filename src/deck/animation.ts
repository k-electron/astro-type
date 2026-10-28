/**
 * The DOM deck's looping decoration is Tailwind's `animate-pulse`,
 * `animate-ping` and `animate-bounce`, which run on the wall clock. On the
 * PixiJS deck they run on effect time instead, so a paused deck holds them
 * where they were. These are those three animations, keyframe for keyframe,
 * as functions of time in milliseconds.
 */

/** A CSS `cubic-bezier(x1, y1, x2, y2)` timing function. */
function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): (x: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const error = sampleX(t) - x;
      if (Math.abs(error) < 1e-5) return sampleY(t);
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= error / slope;
    }
    let lo = 0;
    let hi = 1;
    t = x;
    while (lo < hi) {
      const value = sampleX(t);
      if (Math.abs(value - x) < 1e-5) break;
      if (x > value) lo = t;
      else hi = t;
      t = (hi + lo) / 2;
      if (hi - lo < 1e-6) break;
    }
    return sampleY(t);
  };
}

const pulseEase = cubicBezier(0.4, 0, 0.6, 1);
const pingEase = cubicBezier(0, 0, 0.2, 1);
const bounceIn = cubicBezier(0.8, 0, 1, 1);
const bounceOut = cubicBezier(0, 0, 0.2, 1);

/** `animate-pulse`: opacity from 1 down to 0.5 and back every 2 s. */
export function pulseOpacity(ms: number): number {
  const phase = (((ms % 2000) + 2000) % 2000) / 2000;
  return phase < 0.5
    ? 1 - 0.5 * pulseEase(phase * 2)
    : 0.5 + 0.5 * pulseEase((phase - 0.5) * 2);
}

/** `animate-ping`: scale from 1 to 2 while fading out, every 1 s, then rests. */
export function ping(ms: number): { scale: number; opacity: number } {
  const phase = (((ms % 1000) + 1000) % 1000) / 1000;
  const eased = pingEase(Math.min(1, phase / 0.75));
  return { scale: 1 + eased, opacity: 1 - eased };
}

/** `animate-bounce`: how far up a badge is, 0 (at rest) to 1 (a quarter of its height up). */
export function bounceLift(ms: number): number {
  const phase = (((ms % 1000) + 1000) % 1000) / 1000;
  // 0% and 100% are up, 50% is at rest.
  return phase < 0.5 ? 1 - bounceIn(phase * 2) : bounceOut((phase - 0.5) * 2);
}
