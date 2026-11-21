import type { Graphics } from 'pixi.js';
import type { ShipId } from '../game/schemas';

/**
 * The Ships, each drawn inside the same 42 by 28 box with its nose up and its
 * engines at the tail. A Ship is only a shape: the finger colour of the next
 * character edges it and lights its engines, whatever it is, and the Ship
 * view keeps the movement, the recoil, the beam and the muzzle flares.
 */
export interface ShipStyle {
  /** The engine glow under the tail, in the finger colour. */
  engine: (g: Graphics, color: string) => void;
  /** The body and what sits on it, edged in the finger colour. */
  body: (g: Graphics, color: string) => void;
  /** Where the two guns are along the ship, where the muzzle flares sit. */
  guns: readonly [number, number];
}

const BODY_FILL = '#090d16';
const CANOPY = '#38bdf8';

/** A one-engine glow at the tail's middle. */
const singleEngine = (g: Graphics, color: string): void => {
  g.ellipse(21, 24, 5.5, 3).fill(color);
};

/** A white barrel on a wing: 2.5 by 9. */
const gun = (g: Graphics, x: number): void => {
  g.roundRect(x - 1.25, 2, 2.5, 9, 1)
    .fill('#f8fafc')
    .stroke({ width: 0.5, color: '#334155' });
};

/** The edged body from a flat list of corners. */
const body = (g: Graphics, color: string, points: number[]): void => {
  g.poly(points).fill(BODY_FILL).stroke({ width: 1.6, color });
};

export const SHIPS: Record<ShipId, ShipStyle> = {
  // The ship as it has always been.
  INTERCEPTOR: {
    engine: singleEngine,
    guns: [7, 35],
    body: (g, color) => {
      g.ellipse(21, 25, 3, 1.5).fill('#ffffff');
      body(
        g,
        color,
        [
          21, 2, 25, 11, 38, 17, 41, 23, 30, 21, 24, 24, 21, 21, 18, 24, 12, 21,
          1, 23, 4, 17, 17, 11,
        ],
      );
      g.poly([21, 6, 23.5, 14, 21, 17, 18.5, 14]).fill({
        color: CANOPY,
        alpha: 0.95,
      });
      gun(g, 14.25);
      gun(g, 27.75);
    },
  },
  // Slim and swept back, a single needle of a cockpit.
  DART: {
    engine: singleEngine,
    guns: [12, 30],
    body: (g, color) => {
      g.ellipse(21, 25, 2.5, 1.5).fill('#ffffff');
      body(
        g,
        color,
        [
          21, 1, 24, 10, 29, 15, 41, 25, 30, 22, 25, 26, 21, 22, 17, 26, 12, 22,
          1, 25, 13, 15, 18, 10,
        ],
      );
      g.poly([21, 5, 22.6, 13, 21, 16, 19.4, 13]).fill({
        color: CANOPY,
        alpha: 0.95,
      });
      gun(g, 12);
      gun(g, 30);
    },
  },
  // Wide and flat, gliding on broad wings.
  MANTA: {
    engine: singleEngine,
    guns: [6, 36],
    body: (g, color) => {
      g.ellipse(21, 25, 3, 1.5).fill('#ffffff');
      body(
        g,
        color,
        [
          21, 4, 28, 8, 40, 12, 41, 19, 32, 23, 25, 21, 21, 26, 17, 21, 10, 23,
          1, 19, 2, 12, 14, 8,
        ],
      );
      g.ellipse(21, 13, 3.4, 5).fill({ color: CANOPY, alpha: 0.95 });
      gun(g, 6);
      gun(g, 36);
    },
  },
  // Two narrow hulls joined by a bridge, an engine under each.
  CORVETTE: {
    engine: (g, color) => {
      g.ellipse(9, 25, 3.6, 2.6).fill(color);
      g.ellipse(33, 25, 3.6, 2.6).fill(color);
    },
    guns: [9, 33],
    body: (g, color) => {
      body(g, color, [6, 3, 12, 3, 14, 10, 14, 24, 4, 24, 4, 10]);
      body(g, color, [30, 3, 36, 3, 38, 10, 38, 24, 28, 24, 28, 10]);
      g.roundRect(13, 14, 16, 8, 2)
        .fill(BODY_FILL)
        .stroke({ width: 1.6, color });
      g.roundRect(17, 15.5, 8, 5, 1.5).fill({ color: CANOPY, alpha: 0.95 });
      gun(g, 9);
      gun(g, 33);
    },
  },
};
