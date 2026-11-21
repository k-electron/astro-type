import type { Graphics } from 'pixi.js';
import type { HullId } from '../game/schemas';
import { rgba } from './draw';

/** What a Hull is drawn from: the Drone's box (its size never changes with the Hull) and its state. */
export interface HullSpec {
  /** The Drone's width and height, the keycap's. */
  w: number;
  h: number;
  /** The lead Drone is drawn bolder than the queued ones. */
  first: boolean;
  /** The Drone's finger colour: every Hull keeps it for its border. */
  laneColor: string;
}

/** The corners of a polygon outline, as the flat list Pixi's `poly` takes. */
type Outline = number[];

/**
 * A Hull draws the body's outline and what sits on it, inside the Drone's own
 * w by h box. The size, the key's place, the finger colour, the wings, the
 * thrusters and the lights belong to the Drone, so no Hull can change what the
 * player reads. `outline` is null for a rounded rectangle.
 */
interface HullStyle {
  outline: ((w: number, h: number) => Outline) | null;
  /** Corner radius when the outline is a rounded rectangle. */
  radius: number;
  /** Extra marks drawn over the body, away from the key in the middle. */
  detail?: (g: Graphics, spec: HullSpec) => void;
}

const HULLS: Record<HullId, HullStyle> = {
  // The Drone as it has always been.
  STANDARD: { outline: null, radius: 8 },
  // Six sides: the left and right ends come to a point.
  HEX: {
    outline: (w, h) => {
      const c = h * 0.3;
      return [
        -w / 2 + c,
        -h / 2,
        w / 2 - c,
        -h / 2,
        w / 2,
        0,
        w / 2 - c,
        h / 2,
        -w / 2 + c,
        h / 2,
        -w / 2,
        0,
      ];
    },
    radius: 0,
  },
  // A square-cornered body with an inset plate and a bolt in each corner.
  PLATED: {
    outline: null,
    radius: 3,
    detail: (g, { w, h, first, laneColor }) => {
      const inset = 4;
      g.roundRect(
        -w / 2 + inset,
        -h / 2 + inset,
        w - 2 * inset,
        h - 2 * inset,
        2,
      ).stroke({ width: 1, color: rgba(laneColor, first ? 0.45 : 0.25) });
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          g.circle(sx * (w / 2 - 6.5), sy * (h / 2 - 6.5), 1.4).fill({
            color: '#cbd5e1',
            alpha: first ? 0.8 : 0.5,
          });
        }
      }
    },
  },
  // Cut gems: bevelled corners, with a facet line across each.
  CRYSTAL: {
    outline: (w, h) => {
      const c = Math.min(10, h * 0.32);
      return [
        -w / 2 + c,
        -h / 2,
        w / 2 - c,
        -h / 2,
        w / 2,
        -h / 2 + c,
        w / 2,
        h / 2 - c,
        w / 2 - c,
        h / 2,
        -w / 2 + c,
        h / 2,
        -w / 2,
        h / 2 - c,
        -w / 2,
        -h / 2 + c,
      ];
    },
    radius: 0,
    detail: (g, { w, h, first }) => {
      const c = Math.min(10, h * 0.32);
      const alpha = first ? 0.35 : 0.15;
      for (const sx of [-1, 1]) {
        g.moveTo(sx * (w / 2 - c), -h / 2)
          .lineTo(sx * (w / 2 - c - 6), -h / 2 + c + 2)
          .stroke({ width: 1, color: '#ffffff', alpha });
        g.moveTo(sx * (w / 2 - c), h / 2)
          .lineTo(sx * (w / 2 - c - 6), h / 2 - c - 2)
          .stroke({ width: 1, color: '#ffffff', alpha });
      }
    },
  },
};

/** The Drone's body: the lip beneath it, the hull filled and edged in the finger colour, and its Hull's marks. */
export function drawHullBody(g: Graphics, hull: HullId, spec: HullSpec): void {
  const { w, h, first, laneColor } = spec;
  const style = HULLS[hull];
  const lip = first ? 4 : 3;
  const fill = {
    color: first ? '#020617' : '#0f172a',
    alpha: first ? 0.95 : 0.9,
  };
  const stroke = {
    width: first ? 2 : 1,
    color: first ? laneColor : rgba(laneColor, 0.5),
    alignment: 1,
  };

  if (style.outline) {
    const points = style.outline(w, h);
    // The lip under the hull (0 4px 0 #020617).
    g.poly(points.map((value, i) => (i % 2 === 1 ? value + lip : value))).fill(
      '#020617',
    );
    g.poly(points).fill(fill).stroke(stroke);
  } else {
    g.roundRect(-w / 2, -h / 2 + lip, w, h, style.radius).fill('#020617');
    g.roundRect(-w / 2, -h / 2, w, h, style.radius)
      .fill(fill)
      .stroke(stroke);
  }
  g.moveTo(-w / 2 + 6, -h / 2 + 1.5)
    .lineTo(w / 2 - 6, -h / 2 + 1.5)
    .stroke({ width: 1, color: '#ffffff', alpha: first ? 0.4 : 0.1 });
  style.detail?.(g, spec);
}
