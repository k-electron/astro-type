import { KEYBOARD_ROWS, type KeySpec } from '../curriculum/keyboardLayout';
import { STRIKE_LINE_Y } from '../game/rules';

/**
 * Where everything on the PixiJS Action Deck goes. Computed from the stage
 * size, never measured from the page, so a keycap that grows when it is the
 * target can't nudge its neighbours.
 *
 * The numbers are the desktop (Tailwind `sm:`) values of the DOM deck this
 * one replaced (the sizes its Tailwind classes gave). Phone and tablet layouts are out of scope for
 * v1. The stage is 700 px tall from 640 px wide up, which is how the DOM deck
 * sizes it.
 */
export const STAGE_HEIGHT = 700;

export const KEY_H = 36;
const KEY_GAP = 6;
const DECK_PAD = 12;
const DECK_BORDER = 2;
export const HAND_W = 112;
export const HAND_H = 186;
const ROW_GAP = 12;
const WRAP_PX = 12;
const DECK_MAX = 896;
const DECK_MIN = 580;
const ROW_MAX = 1152;
const WRAPPER_PB = 16;
/** The trench under the keyboard: pb-2 (8) + h-7 (28). */
const TRENCH_BLOCK = 36;
export const TRENCH_H = 28;

/** How far down the stage the sky starts, where a Drone enters. */
const SKY_CEILING = 20;

export interface KeyRect {
  spec: KeySpec;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Centre. */
  cx: number;
  cy: number;
}

export interface Layout {
  width: number;
  height: number;
  hands: boolean;
  deckX: number;
  deckY: number;
  deckW: number;
  deckH: number;
  handLeft: { x: number; y: number };
  handRight: { x: number; y: number };
  trench: { x: number; y: number; w: number };
  /** The top of the player's ship's row: 6 px under the keyboard's wrapper, never above 34 px from the bottom. */
  shipY: number;
  keys: Map<string, KeyRect>;
}

/** How the deck finds a keycap from a typed character. */
export const keyId = (key: string) => (key === ' ' ? ' ' : key.toLowerCase());

export function computeLayout(
  width: number,
  height: number,
  hands: boolean,
): Layout {
  const avail = Math.min(ROW_MAX, width - 2 * WRAP_PX);
  const sideW = hands ? HAND_W + ROW_GAP : 0;
  const deckW = Math.min(DECK_MAX, Math.max(DECK_MIN, avail - 2 * sideW));
  const total = deckW + 2 * sideW;
  const left = (width - total) / 2;
  const deckX = left + sideW;
  const deckH =
    2 * DECK_BORDER +
    2 * DECK_PAD +
    KEYBOARD_ROWS.length * KEY_H +
    (KEYBOARD_ROWS.length - 1) * KEY_GAP;
  const deckY = height - TRENCH_BLOCK - WRAPPER_PB - deckH;
  const innerX = deckX + DECK_BORDER + DECK_PAD;
  const innerW = deckW - 2 * (DECK_BORDER + DECK_PAD);

  const keys = new Map<string, KeyRect>();
  KEYBOARD_ROWS.forEach((row, r) => {
    const y = deckY + DECK_BORDER + DECK_PAD + r * (KEY_H + KEY_GAP);
    const units = row.reduce((sum, k) => sum + k.units, 0);
    // The DOM keys are `flex: u u 0%` with a border box, so each keeps its two
    // pixels of border as a base size and the rest of the row is shared by units.
    const free = innerW - KEY_GAP * (row.length - 1) - 2 * row.length;
    let x = innerX;
    for (const spec of row) {
      const w = 2 + (free * spec.units) / units;
      keys.set(keyId(spec.key), {
        spec,
        x,
        y,
        w,
        h: KEY_H,
        cx: x + w / 2,
        cy: y + KEY_H / 2,
      });
      x += w + KEY_GAP;
    }
  });

  const trenchW = Math.min(DECK_MAX, Math.max(DECK_MIN, width - 2 * WRAP_PX));
  return {
    width,
    height,
    hands,
    deckX,
    deckY,
    deckW,
    deckH,
    handLeft: { x: deckX - ROW_GAP - HAND_W, y: deckY + deckH - HAND_H },
    handRight: { x: deckX + deckW + ROW_GAP, y: deckY + deckH - HAND_H },
    trench: { x: (width - trenchW) / 2, y: height - TRENCH_BLOCK, w: trenchW },
    shipY: Math.max(deckY + deckH + WRAPPER_PB + 6, height - 34),
    keys,
  };
}

/**
 * The top edge of a Drone, in stage pixels, from the store's `yPercent` and its
 * place in the queue. This is the DOM deck's mapping: the lead Drone falls from
 * the sky to the Strike Line; the queued ones hold echelon slots behind it.
 */
export function droneTop(
  queueIndex: number,
  yPercent: number,
  deckY: number,
): number {
  const perimeter = Math.max(SKY_CEILING + 48, deckY - 42);
  if (queueIndex === 0) {
    const progress = Math.min(1, Math.max(0, yPercent / STRIKE_LINE_Y));
    return SKY_CEILING + (perimeter - SKY_CEILING) * progress;
  }
  const slot = Math.max(SKY_CEILING, perimeter - queueIndex * 62);
  const travel = Math.min(1, yPercent / 35);
  return SKY_CEILING + (slot - SKY_CEILING) * travel;
}
