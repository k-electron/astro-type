import { Container, Graphics, GraphicsPath, Sprite, type Text } from 'pixi.js';
import { FINGER_COLOR_MAP } from '../curriculum/curriculum';
import type { FingerZone } from '../curriculum/keyboardLayout';
import { pulseOpacity } from './animation';
import { dashedCubic, dashedRoundRect, deckWeight, makeText } from './draw';
import { boxGlow } from './textures';
import { HAND_H, HAND_W } from './layout';

// The hand panel beside the keyboard, a port of the DOM deck's SVG hand visualizer.
// Everything in it is built once; a change of state only redraws shapes and
// edits the few labels whose text or colour changed.

interface FingerConfig {
  id: FingerZone;
  home: string;
  x: number;
  tipY: number;
  baseY: number;
  w: number;
  isThumb?: boolean;
  isBump?: boolean;
}

const LEFT_FINGERS: FingerConfig[] = [
  { id: 'LEFT_PINKY', home: 'A', x: 18, tipY: 44, baseY: 80, w: 12 },
  { id: 'LEFT_RING', home: 'S', x: 35, tipY: 28, baseY: 76, w: 13 },
  { id: 'LEFT_MIDDLE', home: 'D', x: 53, tipY: 18, baseY: 74, w: 13.5 },
  {
    id: 'LEFT_INDEX',
    home: 'F',
    x: 71,
    tipY: 30,
    baseY: 77,
    w: 13.5,
    isBump: true,
  },
  { id: 'THUMB', home: '␣', x: 91, tipY: 66, baseY: 100, w: 14, isThumb: true },
];
const RIGHT_FINGERS: FingerConfig[] = [
  { id: 'THUMB', home: '␣', x: 25, tipY: 66, baseY: 100, w: 14, isThumb: true },
  {
    id: 'RIGHT_INDEX',
    home: 'J',
    x: 45,
    tipY: 30,
    baseY: 77,
    w: 13.5,
    isBump: true,
  },
  { id: 'RIGHT_MIDDLE', home: 'K', x: 63, tipY: 18, baseY: 74, w: 13.5 },
  { id: 'RIGHT_RING', home: 'L', x: 81, tipY: 28, baseY: 76, w: 13 },
  { id: 'RIGHT_PINKY', home: ';', x: 98, tipY: 44, baseY: 80, w: 12 },
];
const PALM_LEFT =
  'M 24 148 C 22 134, 12 108, 12 84 C 12 78, 18 76, 24 78 L 73 78 C 79 78, 82 82, 82 90 C 82 100, 93 106, 93 116 C 93 133, 76 146, 68 148 Z';
const PALM_RIGHT =
  'M 92 148 C 94 134, 104 108, 104 84 C 104 78, 98 76, 92 78 L 43 78 C 37 78, 34 82, 34 90 C 34 100, 23 106, 23 116 C 23 133, 40 146, 48 148 Z';
// The SVG art is drawn in a 116-unit box and shown 88 px wide.
const ART_SCALE = 88 / 116;
const ART_X = 12;
const ART_Y = 31.5;
const THUMB_TILT = (22 * Math.PI) / 180;

export interface HandState {
  activeFinger: FingerZone | null;
  activeKeyDisplay: string | null;
  modifierFinger: FingerZone | null;
  modifierLabel: string | null;
  thumbRole: 'primary' | 'secondary' | null;
}

export class HandView {
  readonly root = new Container();
  /** The panel's drop shadow (0 8px 24px, 80 % black). */
  private readonly shadow = new Sprite();
  private readonly panel = new Graphics();
  private readonly art = new Container();
  private readonly palm = new Graphics();
  /** The pulsing halo rings, one under each finger. */
  private readonly halos: Graphics[] = [];
  private readonly fingerShapes: Graphics[] = [];
  private readonly fingerLabels: Text[] = [];
  private readonly legendDots = new Graphics();
  private readonly legendLabels: Text[] = [];
  private readonly badge: Text;
  private readonly fingers: FingerConfig[];
  private signature = '';

  constructor(
    private readonly side: 'left' | 'right',
    resolution: number,
  ) {
    const isLeft = side === 'left';
    this.fingers = isLeft ? LEFT_FINGERS : RIGHT_FINGERS;
    // Nothing in a hand is read out by the accessibility layer.
    this.root.accessibleChildren = false;
    this.shadow.anchor.set(0.5);
    const glow = boxGlow(HAND_W, HAND_H, 16, 24);
    this.shadow.texture = glow.texture;
    this.shadow.tint = '#000000';
    this.shadow.alpha = 0.8;
    this.shadow.position.set(HAND_W / 2, HAND_H / 2 + 8);
    this.root.addChild(this.shadow, this.panel, this.art, this.legendDots);

    // `tracking-wider`: 0.05 em between letters.
    this.label(
      isLeft ? 'L. HAND' : 'R. HAND',
      14,
      19.75,
      10,
      '#94a3b8',
      0,
      resolution,
      0.5,
    );
    this.badge = this.label('REST', 0, 19.75, 9, '#475569', 1, resolution);

    this.art.position.set(ART_X, ART_Y);
    this.art.scale.set(ART_SCALE);
    this.palm
      .path(new GraphicsPath(isLeft ? PALM_LEFT : PALM_RIGHT))
      .fill('#0b1120')
      .stroke({ width: 1.5, color: '#1e293b' });
    // The palm crease is dashed (2 on, 3 off).
    dashedCubic(
      this.palm,
      isLeft
        ? [28, 98, 42, 108, 60, 106, 75, 92]
        : [88, 98, 74, 108, 56, 106, 41, 92],
      2,
      3,
      { width: 1, color: '#1e293b' },
    );
    this.palm
      .moveTo(isLeft ? 24 : 48, 148)
      .lineTo(isLeft ? 68 : 92, 148)
      .stroke({ width: 2, color: '#334155', cap: 'round' });
    this.art.addChild(this.palm);

    for (const f of this.fingers) {
      const halo = new Graphics();
      const shape = new Graphics();
      for (const part of [halo, shape]) {
        part.position.set(f.x, f.baseY);
        if (f.isThumb) part.rotation = isLeft ? THUMB_TILT : -THUMB_TILT;
        this.art.addChild(part);
      }
      this.halos.push(halo);
      this.fingerShapes.push(shape);
    }

    for (const f of this.fingers) {
      // Fingertip labels sit in panel space (text is not scaled with the art).
      const text = makeText(f.home, 8, '700', '#ffffff', resolution);
      if (f.isThumb) text.rotation = isLeft ? THUMB_TILT : -THUMB_TILT;
      this.root.addChild(text);
      this.fingerLabels.push(text);
    }
    // The legend: four items of a 6 px dot, 2 px, and a 5.4 px letter, 6 px apart, centred.
    const legend = this.fingers.filter((f) => !f.isThumb);
    const itemW = 6 + 2 + 5.4;
    const pitch = itemW + 6;
    const start =
      HAND_W / 2 - (legend.length * itemW + (legend.length - 1) * 6) / 2;
    legend.forEach((f, i) => {
      const left = start + i * pitch;
      this.legendDots.circle(left + 3, 165, 3).fill(FINGER_COLOR_MAP[f.id]);
      this.legendLabels.push(
        this.label(f.home, left + 8 + 2.7, 165, 9, '#94a3b8', 0.5, resolution),
      );
    });
  }

  private label(
    text: string,
    x: number,
    y: number,
    size: number,
    fill: string,
    anchorX: number,
    resolution: number,
    letterSpacing = 0,
  ): Text {
    const t = makeText(text, size, '700', fill, resolution, { letterSpacing });
    t.anchor.set(anchorX, 0.5);
    t.position.set(x, y);
    this.root.addChild(t);
    return t;
  }

  setPosition(x: number, y: number): void {
    this.root.position.set(x, y);
  }

  /** Move the pulsing halos to `timeMs` of effect time: `animate-pulse`, 1 to 0.5 and back every 2 s. */
  animate(timeMs: number): void {
    const alpha = pulseOpacity(timeMs);
    for (const halo of this.halos) halo.alpha = alpha;
  }

  draw(state: HandState): void {
    const signature = `${state.activeFinger}|${state.activeKeyDisplay}|${state.modifierFinger}|${state.modifierLabel}|${state.thumbRole}`;
    if (signature === this.signature) return;
    this.signature = signature;

    const isLeft = this.side === 'left';
    const p = this.panel;
    p.clear();
    p.roundRect(0, 0, HAND_W, HAND_H, 16)
      .fill({ color: '#020617', alpha: 0.95 })
      .stroke({ width: 2, color: '#1e293b', alignment: 1 });

    const isThumbActive = state.activeFinger === 'THUMB';
    const primary = isThumbActive && state.thumbRole === 'primary';
    const secondary = isThumbActive && state.thumbRole === 'secondary';

    // The badge in the panel's top right corner: its right edge is 14 px in
    // (2 border, 10 padding, 2 for the header), its padding is `padX`, its
    // border 1 px, and it is 15 px tall.
    const right = HAND_W - 14;
    const setBadge = (
      text: string,
      fill: string,
      bg: string,
      border: string,
      {
        dashed = false,
        padX = 4,
        size = 9,
        bgAlpha = 0.2,
        borderAlpha = 1,
      } = {},
    ) => {
      this.badge.text = text;
      this.badge.style.fill = fill;
      this.badge.style.fontSize = size;
      this.badge.style.fontWeight = deckWeight('700');
      const bw = this.badge.width + 2 * padX + 2;
      p.roundRect(right - bw, 12.5, bw, 15, 4).fill({
        color: bg,
        alpha: bgAlpha,
      });
      if (dashed) {
        dashedRoundRect(p, right - bw + 0.5, 13, bw - 1, 14, 3.5, 3, 2, {
          width: 1,
          color: border,
        });
      } else {
        p.roundRect(right - bw + 0.5, 13, bw - 1, 14, 3.5).stroke({
          width: 1,
          color: border,
          alpha: borderAlpha,
        });
      }
      this.badge.x = right - padX - 1;
    };
    if (primary) {
      setBadge('SPACE', '#6ee7b7', '#10b981', '#34d399', {
        borderAlpha: 0.6,
      });
    } else if (secondary) {
      setBadge('ALT ␣', 'rgba(52,211,153,0.7)', '#022c22', '#10b981', {
        size: 8,
        bgAlpha: 0.4,
        borderAlpha: 0.3,
      });
    } else if (state.activeFinger) {
      const color = FINGER_COLOR_MAP[state.activeFinger];
      setBadge(
        state.activeKeyDisplay === ' '
          ? 'SPACE'
          : (state.activeKeyDisplay ?? 'ACTIVE').toUpperCase(),
        color,
        color,
        color,
        { padX: 6, bgAlpha: 0.145, borderAlpha: 0.5 },
      );
    } else if (state.modifierFinger) {
      setBadge(
        state.modifierLabel || 'SHIFT',
        '#fcd34d',
        '#f59e0b',
        '#fbbf24',
        { dashed: true },
      );
    } else {
      this.badge.text = 'REST';
      this.badge.style.fill = '#475569';
      this.badge.style.fontSize = 9;
      this.badge.style.fontWeight = '400';
      this.badge.x = right;
    }

    this.fingers.forEach((f, i) => {
      const main = state.activeFinger === f.id;
      const mod = state.modifierFinger === f.id;
      const sec = Boolean(f.isThumb) && main && secondary;
      const color = FINGER_COLOR_MAP[f.id];
      const fg = this.fingerShapes[i];
      fg.clear();
      const height = f.baseY - f.tipY;
      const rx = f.w / 2;
      let stroke = '#334155';
      let strokeWidth = 1.2;
      let fill: string | { color: string; alpha: number } = '#1e293b';
      if (sec) {
        stroke = 'rgba(16,185,129,0.55)';
        strokeWidth = 1.8;
        fill = { color: '#10b981', alpha: 0.14 };
      } else if (main) {
        stroke = color;
        strokeWidth = 2.5;
        fill = { color, alpha: 0.21 };
      } else if (mod) {
        stroke = '#fbbf24';
        strokeWidth = 2.5;
        fill = { color: '#fbbf24', alpha: 0.15 };
      }
      const lx = -f.w / 2;
      const ly = f.tipY - f.baseY;
      const halo = this.halos[i];
      halo.clear();
      if (main && !sec) {
        // The halo ring pulses (see `animate`); the soft glow around it does not.
        halo.roundRect(lx - 2, ly - 2, f.w + 4, height + 10, rx + 2).stroke({
          width: 1,
          color,
          alpha: 0.5,
        });
        fg.roundRect(lx - 3, ly - 3, f.w + 6, height + 12, rx + 3).fill({
          color,
          alpha: 0.12,
        });
      }
      if (mod) {
        dashedRoundRect(
          halo,
          lx - 2.5,
          ly - 2.5,
          f.w + 5,
          height + 11,
          rx + 2.5,
          3,
          3,
          { width: 1.2, color: '#fbbf24', alpha: 0.8 },
        );
      }
      fg.roundRect(lx, ly, f.w, height + 6, rx).fill(fill);
      if (mod) {
        dashedRoundRect(fg, lx, ly, f.w, height + 6, rx, 4, 3, {
          width: strokeWidth,
          color: stroke,
        });
      } else {
        fg.roundRect(lx, ly, f.w, height + 6, rx).stroke({
          width: strokeWidth,
          color: stroke,
        });
      }
      // The fingertip.
      const tipFill = sec
        ? { color: '#10b981', alpha: 0.25 }
        : main
          ? color
          : mod
            ? '#fbbf24'
            : { color, alpha: 0.13 };
      const tipStroke = sec
        ? 'rgba(16,185,129,0.6)'
        : main
          ? '#ffffff'
          : mod
            ? '#fbbf24'
            : color;
      fg.circle(0, ly + rx, rx - 1.2)
        .fill(tipFill)
        .stroke({
          width: main ? 1.5 : 1.2,
          color: tipStroke,
          alpha: main ? 1 : 0.85,
        });
      if (f.isBump && !main && !mod) {
        fg.roundRect(-2, ly + rx + 6, 4, 1, 0.5).fill('#64748b');
      }
      fg.circle(0, 0, 1.8).fill({
        color,
        alpha: sec ? 0.6 : main ? 1 : 0.5,
      });

      // The fingertip label, placed in panel space.
      const rot = f.isThumb ? (isLeft ? THUMB_TILT : -THUMB_TILT) : 0;
      // The SVG sets the text's baseline 3 units under the fingertip's centre, which
      // puts the middle of its capitals on the centre itself.
      const oy = ly + rx;
      const px = f.x - oy * Math.sin(rot);
      const py = f.baseY + oy * Math.cos(rot);
      const text =
        main && state.activeKeyDisplay
          ? state.activeKeyDisplay === ' '
            ? '␣'
            : state.activeKeyDisplay.toUpperCase()
          : mod
            ? state.modifierLabel === 'SHIFT'
              ? '⇧'
              : (state.modifierLabel ?? 'MOD')
            : f.home;
      const big =
        main && state.activeKeyDisplay && state.activeKeyDisplay.length > 1;
      const label = this.fingerLabels[i];
      label.text = text;
      label.style.fontSize = (big ? 6.5 : 8) * ART_SCALE;
      label.style.fill = sec ? '#6ee7b7' : main || mod ? '#020617' : color;
      label.position.set(ART_X + px * ART_SCALE, ART_Y + py * ART_SCALE);
    });

    // The footer legend.
    p.moveTo(14, 155.9)
      .lineTo(HAND_W - 14, 155.9)
      .stroke({ width: 1, color: '#1e293b', alpha: 0.8 });
    this.fingers
      .filter((f) => !f.isThumb)
      .forEach((f, i) => {
        this.legendLabels[i].style.fill =
          state.activeFinger === f.id ? FINGER_COLOR_MAP[f.id] : '#94a3b8';
      });
  }
}
