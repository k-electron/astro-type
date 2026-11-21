import type { BurstId } from '../game/schemas';

/**
 * What a Burst can ask the effects for. It is how the explosion on a hit
 * scatters its particles: their shapes, their spread and how they fade. Where
 * they come from, how big the hit is (`perfect`, `isSpace`) and the colour it
 * takes (`hitColor`, the game's by Multiplier tier) are given, never chosen:
 * no Burst changes what the player reads from the hit.
 */
export interface BurstPainter {
  /** One round spark, from the pool the effects already own. */
  spark(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string,
    size: number,
    maxLife: number,
  ): void;
  /** One square pixel, from the same pool. */
  pixel(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string,
    size: number,
    maxLife: number,
  ): void;
  /** One expanding ring. */
  ring(
    x: number,
    y: number,
    radius: number,
    maxRadius: number,
    color: string,
    alpha: number,
  ): void;
}

/** A hit's size and colour, and where it lands: what a Burst is drawn from. */
export type BurstFn = (
  paint: BurstPainter,
  x: number,
  y: number,
  w: number,
  isSpace: boolean,
  perfect: boolean,
  hitColor: string,
) => void;

/** Sparks flying every way: the Burst the game has always had. */
const sparks: BurstFn = (paint, x, y, w, isSpace, perfect, hitColor) => {
  const count = perfect ? (isSpace ? 55 : 40) : 26;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 4.5 + Math.random() * 9.5;
    paint.spark(
      x + (Math.random() - 0.5) * (w * 0.4),
      y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 1.5,
      i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? hitColor : '#f97316',
      3 + Math.random() * 4.5,
      28 + Math.random() * 20,
    );
  }
};

/** Sparks in eight tight streaks, like petals, that fade slowly. */
const starflower: BurstFn = (paint, x, y, _w, isSpace, perfect, hitColor) => {
  const petals = 8;
  const perPetal = perfect ? (isSpace ? 8 : 6) : 4;
  for (let petal = 0; petal < petals; petal++) {
    const angle = (petal / petals) * Math.PI * 2 - Math.PI / 2;
    for (let i = 0; i < perPetal; i++) {
      const spread = (Math.random() - 0.5) * 0.08;
      const speed = 3 + (i / perPetal) * 9;
      paint.spark(
        x,
        y,
        Math.cos(angle + spread) * speed,
        Math.sin(angle + spread) * speed,
        i % 3 === 0 ? '#ffffff' : hitColor,
        4.5 + Math.random() * 2.5,
        40 + Math.random() * 12,
      );
    }
  }
};

/** Square pixels that fly only along the eight compass lines. */
const pixelShards: BurstFn = (paint, x, y, w, isSpace, perfect, hitColor) => {
  const count = perfect ? (isSpace ? 44 : 32) : 20;
  for (let i = 0; i < count; i++) {
    const direction = Math.floor(Math.random() * 8);
    const angle = (direction * Math.PI) / 4;
    const speed = 4 + Math.floor(Math.random() * 4) * 2.5;
    paint.pixel(
      x + (Math.random() - 0.5) * (w * 0.4),
      y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 1.5,
      i % 3 === 0 ? '#ffffff' : hitColor,
      3 + Math.floor(Math.random() * 3) * 1.5,
      30 + Math.random() * 14,
    );
  }
};

/** A few sparks inside three rings that roll outward one after another. */
const shockwaveRings: BurstFn = (
  paint,
  x,
  y,
  w,
  isSpace,
  perfect,
  hitColor,
) => {
  const count = perfect ? (isSpace ? 16 : 12) : 8;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 5;
    paint.spark(
      x,
      y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 1,
      i % 2 === 0 ? '#ffffff' : hitColor,
      2.5 + Math.random() * 3,
      24 + Math.random() * 10,
    );
  }
  const reach = isSpace ? w * 2.6 : w * 3.4;
  paint.ring(x, y, 10, reach * 0.7, hitColor, 0.9);
  paint.ring(x, y, 8, reach * 0.9, hitColor, 0.7);
  paint.ring(x, y, 6, reach, '#ffffff', 0.55);
};

export const BURSTS: Record<BurstId, BurstFn> = {
  SPARKS: sparks,
  STARFLOWER: starflower,
  PIXEL_SHARDS: pixelShards,
  SHOCKWAVE: shockwaveRings,
};
