/**
 * PROTOTYPE (issue #9) - throwaway. Do not merge to main.
 *
 * Question: can a PixiJS Action Deck match today's look and feel?
 *
 * A plain (non-React) scene that draws the Action Deck stage with PixiJS:
 * lanes/keyboard, falling Drones, hands, ship + guidance beam, lasers and
 * explosions. It reads game state straight from the Zustand store each frame
 * (no React props) and computes its own layout from the stage size instead of
 * measuring DOM keycaps. Layout constants are the `sm:` (desktop) values of
 * IntegratedLanesKeyboard.tsx; phone/tablet is out of scope for v1.
 */
import {
  type Application,
  BlurFilter,
  Container,
  FillGradient,
  Graphics,
  GraphicsPath,
  Rectangle,
  Text,
  type TextStyleOptions,
} from 'pixi.js';
import {
  FINGER_COLOR_MAP,
  FINGER_LANES,
  KEY_FINGER_MAP,
  getNoteLaneAndFinger,
} from '../../data/curriculum';
import { useGameStore } from '../../store/useGameStore';
import type {
  FallingNote,
  FingerZone,
  TrailColorTheme,
} from '../../types/game';
import { KEYBOARD_ROWS, type KeySpec } from '../IntegratedLanesKeyboard';

type GameStoreState = ReturnType<typeof useGameStore.getState>;

const FONT = '"JetBrains Mono", ui-monospace, monospace';
const THEME_ACCENTS: Record<TrailColorTheme, string> = {
  CYAN: '#06b6d4',
  AMBER: '#f59e0b',
  EMERALD: '#10b981',
  VIOLET: '#8b5cf6',
  SUPERNOVA: '#f43f5e',
};

// ---- layout constants (Tailwind `sm:` values from the DOM deck) ----
const KEY_H = 36;
const KEY_GAP = 6;
const DECK_PAD = 12;
const DECK_BORDER = 2;
const HAND_W = 112;
const HAND_H = 186;
const ROW_GAP = 12;
const WRAP_PX = 12;
const DECK_MAX = 896;
const DECK_MIN = 580;
const ROW_MAX = 1152;
const WRAPPER_PB = 16;
const TRENCH_BLOCK = 36; // pb-2 (8) + h-7 (28)
const TRENCH_H = 28;

interface KeyRect {
  spec: KeySpec;
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
}

interface Layout {
  W: number;
  H: number;
  hands: boolean;
  deckX: number;
  deckY: number;
  deckW: number;
  deckH: number;
  handL: { x: number; y: number };
  handR: { x: number; y: number };
  trench: { x: number; y: number; w: number };
  keys: Map<string, KeyRect>;
}

const keyId = (k: string) => (k === ' ' ? ' ' : k.toLowerCase());

function computeLayout(W: number, H: number, hands: boolean): Layout {
  const avail = Math.min(ROW_MAX, W - 2 * WRAP_PX);
  const sideW = hands ? HAND_W + ROW_GAP : 0;
  const deckW = Math.min(DECK_MAX, Math.max(DECK_MIN, avail - 2 * sideW));
  const total = deckW + 2 * sideW;
  const left = (W - total) / 2;
  const deckX = left + sideW;
  const deckH =
    2 * DECK_BORDER +
    2 * DECK_PAD +
    KEYBOARD_ROWS.length * KEY_H +
    (KEYBOARD_ROWS.length - 1) * KEY_GAP;
  const deckY = H - TRENCH_BLOCK - WRAPPER_PB - deckH;
  const innerX = deckX + DECK_BORDER + DECK_PAD;
  const innerW = deckW - 2 * (DECK_BORDER + DECK_PAD);

  const keys = new Map<string, KeyRect>();
  KEYBOARD_ROWS.forEach((row, r) => {
    const y = deckY + DECK_BORDER + DECK_PAD + r * (KEY_H + KEY_GAP);
    const sum = row.reduce((s, k) => s + k.units, 0);
    // flex: u u 0% with border-box: every key keeps its 2px of borders as base
    // size, the rest of the row is shared by units.
    const free = innerW - KEY_GAP * (row.length - 1) - 2 * row.length;
    let x = innerX;
    for (const spec of row) {
      const w = 2 + (free * spec.units) / sum;
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

  const tw = Math.min(DECK_MAX, Math.max(DECK_MIN, W - 2 * WRAP_PX));
  return {
    W,
    H,
    hands,
    deckX,
    deckY,
    deckW,
    deckH,
    handL: { x: deckX - ROW_GAP - HAND_W, y: deckY + deckH - HAND_H },
    handR: { x: deckX + deckW + ROW_GAP, y: deckY + deckH - HAND_H },
    trench: { x: (W - tw) / 2, y: H - TRENCH_BLOCK, w: tw },
    keys,
  };
}

// ---- small helpers ----
function rgba(hex: string, a: number): string {
  const n = Number.parseInt(hex.slice(1, 7), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function mkText(
  str: string,
  size: number,
  weight: string,
  fill: string,
  res: number,
  extra: Partial<TextStyleOptions> = {},
): Text {
  const t = new Text({
    text: str,
    style: {
      fontFamily: FONT,
      fontSize: size,
      fontWeight: weight as TextStyleOptions['fontWeight'],
      fill,
      ...extra,
    },
    resolution: res,
  });
  t.anchor.set(0.5);
  return t;
}

/** Pixi v8 has no dashed strokes: fake them along a rounded rect's straight edges. */
function dashedRect(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  dash: number,
  gap: number,
  stroke: { width: number; color: string; alpha?: number },
) {
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const dx = (x2 - x1) / len;
    const dy = (y2 - y1) / len;
    for (let d = 0; d < len; d += dash + gap) {
      const e = Math.min(len, d + dash);
      g.moveTo(x1 + dx * d, y1 + dy * d).lineTo(x1 + dx * e, y1 + dy * e);
    }
  };
  line(x, y, x + w, y);
  line(x + w, y, x + w, y + h);
  line(x + w, y + h, x, y + h);
  line(x, y + h, x, y);
  g.stroke(stroke);
}

// ---- keycap ----
// Gradients own GPU textures, so they live per scene (a module-level one would
// be destroyed with the first app and then reused by the next).
let keyGradient: FillGradient | null = null;
let keyGradientAmber: FillGradient | null = null;
function keyGradients() {
  const mk = (top: string) =>
    new FillGradient({
      type: 'linear',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: top },
        { offset: 1, color: '#0f172a' },
      ],
      textureSpace: 'local',
    });
  keyGradient ??= mk('#1e293b');
  keyGradientAmber ??= mk('#451a03');
  return { keyGradient, keyGradientAmber };
}
function resetGradients() {
  keyGradient = keyGradientAmber = null;
  PLUME_CACHE.clear();
}

interface KeyDrawState {
  target: boolean;
  mod: boolean;
  pressed: boolean;
  hover: boolean;
  blind: boolean;
  smartThumb: 'left' | 'right';
}

class KeyView {
  root = new Container();
  bg = new Graphics();
  main: Text | null = null;
  sub: Text | null = null;
  thumbL: Text | null = null;
  thumbR: Text | null = null;
  spaceLabel: Text | null = null;
  hold = new Container();
  holdBg = new Graphics();
  sig = '';
  laneColor: string;
  hover = false;
  down = false;

  constructor(
    readonly r: KeyRect,
    res: number,
    onClick: (k: KeySpec) => void,
    onChange: () => void,
  ) {
    const { spec } = r;
    this.laneColor = FINGER_LANES[spec.lane]?.color || '#06b6d4';
    this.root.addChild(this.bg);
    this.root.position.set(r.cx, r.cy);
    this.root.eventMode = 'static';
    this.root.cursor = 'pointer';
    this.root.hitArea = new Rectangle(-r.w / 2, -r.h / 2, r.w, r.h);
    this.root.on('pointertap', () => onClick(spec));
    this.root.on('pointerdown', () => {
      this.down = true;
      onChange();
    });
    for (const ev of ['pointerup', 'pointerupoutside'] as const) {
      this.root.on(ev, () => {
        this.down = false;
        onChange();
      });
    }
    this.root.on('pointerover', () => {
      this.hover = true;
      onChange();
    });
    this.root.on('pointerout', () => {
      this.hover = false;
      this.down = false;
      onChange();
    });

    const len = spec.display.length;
    const mainSize = len > 3 ? 12 : len > 1 ? 14 : 18;
    if (spec.key === ' ') {
      this.spaceLabel = mkText('␣ SPACE', 16, '700', '#ffffff', res);
      this.thumbL = mkText('', 9, '700', '#10b981', res);
      this.thumbR = mkText('', 9, '700', '#10b981', res);
      this.thumbL.anchor.set(0, 0.5);
      this.thumbR.anchor.set(1, 0.5);
      this.thumbL.position.set(-r.w / 2 + 12, 0);
      this.thumbR.position.set(r.w / 2 - 12, 0);
      this.root.addChild(this.spaceLabel, this.thumbL, this.thumbR);
    } else {
      this.main = mkText(spec.display, mainSize, '700', '#f1f5f9', res);
      this.root.addChild(this.main);
      if (spec.subDisplay) {
        this.sub = mkText(spec.subDisplay, 12, '700', '#cbd5e1', res);
        this.root.addChild(this.sub);
      }
    }
    if (spec.key.startsWith('Shift')) {
      this.holdBg
        .roundRect(-38, -7, 76, 14, 3)
        .fill('#fbbf24')
        .stroke({ width: 1, color: '#fcd34d' });
      const t = mkText('·· HOLD SHIFT ··', 8, '700', '#020617', res);
      this.hold.addChild(this.holdBg, t);
      this.hold.visible = false;
      this.hold.position.set(0, -r.h / 2 - 7);
      this.root.addChild(this.hold);
    }
  }

  draw(s: KeyDrawState, keyboardVisible: boolean, t: number) {
    const { r, laneColor } = this;
    const pressed = s.pressed || this.down;
    const sig = `${s.target}|${s.mod}|${pressed}|${s.hover || this.hover}|${s.blind}|${s.smartThumb}|${keyboardVisible}`;
    if (this.hold.visible !== s.mod) this.hold.visible = s.mod;
    if (s.mod) {
      // animate-bounce: 1s, translateY(-25%) -> 0
      const p = (t % 1000) / 1000;
      const ease = Math.abs(Math.sin(p * Math.PI));
      this.hold.y = -r.h / 2 - 7 - ease * 3.5;
    }
    if (sig === this.sig) return;
    this.sig = sig;

    const w = r.w;
    const h = r.h;
    const g = this.bg;
    g.clear();
    const hl = s.hover || this.hover;
    const hi = s.target || s.mod || pressed;
    this.root.scale.set(s.target || s.mod ? 1.02 : pressed ? 0.98 : 1);
    this.root.position.y = r.cy + (pressed && !s.target ? 2 : 0);
    this.root.zIndex = s.target || s.mod ? 20 : 1;

    // bottom lip (0 3px 0 #020617)
    g.roundRect(-w / 2, -h / 2 + (pressed ? 1 : 3), w, h, 6).fill('#020617');
    // body
    const kg = keyGradients();
    g.roundRect(-w / 2, -h / 2, w, h, 6).fill(
      s.mod ? kg.keyGradientAmber : kg.keyGradient,
    );
    // inset bottom band in lane colour (inset 0 -3px 0 laneColor45)
    if (!hi) {
      g.roundRect(-w / 2 + 1, h / 2 - 4, w - 2, 3, 2).fill({
        color: laneColor,
        alpha: 0.27,
      });
    }
    // border
    if (s.mod) {
      dashedRect(g, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 4, 3, {
        width: 2,
        color: '#fbbf24',
      });
    } else if (hi) {
      g.roundRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 5).stroke({
        width: 2,
        color: laneColor,
      });
    } else {
      g.roundRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1, 6).stroke({
        width: 1,
        color: hl ? '#64748b' : '#334155',
        alpha: hl ? 1 : 0.8,
      });
    }
    // top specular (inset 0 1px 1px white/10..40)
    g.moveTo(-w / 2 + 6, -h / 2 + 1.5)
      .lineTo(w / 2 - 6, -h / 2 + 1.5)
      .stroke({ width: 1, color: '#ffffff', alpha: hi ? 0.4 : 0.1 });
    // finger accent stripe
    const sh = s.target || s.mod ? 4 : 2.5;
    g.roundRect(-w / 2 + 4, h / 2 - sh, w - 8, sh, sh / 2).fill({
      color: s.mod ? '#fbbf24' : laneColor,
      alpha: s.target || s.mod ? 1 : 0.75,
    });
    // F / J bump
    if (r.spec.isBump) {
      g.roundRect(-5, h / 2 - 6, 10, 2, 1).fill(
        s.target ? '#ffffff' : laneColor,
      );
    }

    // legends
    const mainFill = hi ? '#ffffff' : '#f1f5f9';
    const isSpaceKey = Boolean(this.spaceLabel);
    if (this.spaceLabel && this.thumbL && this.thumbR) {
      this.thumbL.visible = this.thumbR.visible = s.target;
      this.spaceLabel.visible = s.target || !s.blind;
      this.spaceLabel.text = s.target ? '␣ SPACE' : 'SPACE';
      this.spaceLabel.style.fontSize = s.target ? 16 : 12;
      const rec = s.smartThumb;
      this.thumbL.text = rec === 'left' ? '◀ L. THUMB [REC]' : 'L. Thumb (Alt)';
      this.thumbR.text =
        rec === 'right' ? 'R. THUMB [REC] ▶' : 'R. Thumb (Alt)';
      this.thumbL.style.fill =
        rec === 'left' ? '#6ee7b7' : 'rgba(16,185,129,0.5)';
      this.thumbR.style.fill =
        rec === 'right' ? '#6ee7b7' : 'rgba(16,185,129,0.5)';
      this.thumbL.style.fontSize = rec === 'left' ? 10 : 9;
      this.thumbR.style.fontSize = rec === 'right' ? 10 : 9;
    }
    if (this.main) this.main.visible = !s.blind;
    if (this.sub) this.sub.visible = !s.blind && keyboardVisible;
    if (s.blind && !(isSpaceKey && s.target)) {
      // Blind touch-typing mode: a dot instead of a legend
      if (s.target) {
        g.circle(0, 0, 5).fill(laneColor);
      } else if (s.mod) {
        g.circle(0, 0, 4)
          .fill({ color: '#fbbf24', alpha: 0.4 })
          .stroke({ width: 1, color: '#fbbf24' });
      } else if (r.spec.isBump) {
        g.roundRect(-5, -2, 10, 4, 2).fill(laneColor);
      } else {
        g.circle(0, 0, 3).fill({ color: laneColor, alpha: 0.6 });
      }
    }
    if (this.main && !s.blind) {
      this.main.style.fill = mainFill;
      if (this.sub) {
        this.sub.style.fill = s.target
          ? laneColor
          : s.mod
            ? '#fcd34d'
            : '#cbd5e1';
        this.sub.position.set(0, -10);
        this.main.position.set(0, 7);
      } else {
        this.main.position.set(0, 0);
      }
    }
  }
}

// ---- hands ----
interface FingerCfg {
  id: FingerZone;
  home: string;
  x: number;
  tipY: number;
  baseY: number;
  w: number;
  isThumb?: boolean;
  isBump?: boolean;
}
const LEFT_FINGERS: FingerCfg[] = [
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
const RIGHT_FINGERS: FingerCfg[] = [
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
const PALM_L =
  'M 24 148 C 22 134, 12 108, 12 84 C 12 78, 18 76, 24 78 L 73 78 C 79 78, 82 82, 82 90 C 82 100, 93 106, 93 116 C 93 133, 76 146, 68 148 Z';
const PALM_R =
  'M 92 148 C 94 134, 104 108, 104 84 C 104 78, 98 76, 92 78 L 43 78 C 37 78, 34 82, 34 90 C 34 100, 23 106, 23 116 C 23 133, 40 146, 48 148 Z';
const HAND_SCALE = 88 / 116;
const SVG_X = 12;
const SVG_Y = 31.5;

interface HandState {
  activeFinger: FingerZone | null;
  activeKeyDisplay: string | null;
  modifierFinger: FingerZone | null;
  modifierLabel: string | null;
  thumbRole: 'primary' | 'secondary' | null;
}

class HandView {
  root = new Container();
  panel = new Graphics();
  artC: Container | null = null;
  texts = new Container();
  sig = '';
  constructor(
    readonly hand: 'left' | 'right',
    readonly res: number,
  ) {
    this.root.addChild(this.panel, this.texts);
  }

  private t(
    str: string,
    x: number,
    y: number,
    size: number,
    weight: string,
    fill: string,
    anchorX = 0.5,
  ) {
    const t = mkText(str, size, weight, fill, this.res);
    t.anchor.set(anchorX, 0.5);
    t.position.set(x, y);
    this.texts.addChild(t);
    return t;
  }

  draw(s: HandState) {
    const sig = JSON.stringify(s);
    if (sig === this.sig) return;
    this.sig = sig;
    const isLeft = this.hand === 'left';
    const fingers = isLeft ? LEFT_FINGERS : RIGHT_FINGERS;
    const p = this.panel;
    p.clear();
    for (const c of this.texts.removeChildren()) c.destroy();

    p.roundRect(0, 0, HAND_W, HAND_H, 16)
      .fill({ color: '#020617', alpha: 0.95 })
      .stroke({ width: 2, color: '#1e293b', alignment: 1 });

    // header
    this.t(isLeft ? 'L. HAND' : 'R. HAND', 12, 19.75, 10, '700', '#94a3b8', 0);
    const isThumbActive = s.activeFinger === 'THUMB';
    const primary = isThumbActive && s.thumbRole === 'primary';
    const secondary = isThumbActive && s.thumbRole === 'secondary';
    const right = HAND_W - 12;
    const badge = (
      txt: string,
      fill: string,
      bg: string,
      border: string,
      dashed = false,
    ) => {
      const tx = this.t(txt, right, 19.75, 9, '700', fill, 1);
      const bw = tx.width + 10;
      if (dashed) {
        dashedRect(p, right - bw + 2, 12.5, bw, 15, 3, 2, {
          width: 1,
          color: border,
        });
      } else {
        p.roundRect(right - bw + 2, 12.5, bw, 15, 3)
          .fill({ color: bg, alpha: 0.3 })
          .stroke({ width: 1, color: border, alpha: 0.7 });
      }
      tx.x = right - 3;
    };
    if (primary) badge('SPACE', '#6ee7b7', '#10b981', '#34d399');
    else if (secondary)
      badge('ALT ␣', 'rgba(52,211,153,0.7)', '#064e3b', '#10b981');
    else if (s.activeFinger) {
      const col = FINGER_COLOR_MAP[s.activeFinger];
      badge(
        s.activeKeyDisplay === ' '
          ? 'SPACE'
          : (s.activeKeyDisplay ?? 'ACTIVE').toUpperCase(),
        col,
        col,
        col,
      );
    } else if (s.modifierFinger)
      badge(s.modifierLabel || 'SHIFT', '#fcd34d', '#f59e0b', '#fbbf24', true);
    else this.t('REST', right - 3, 19.75, 9, '400', '#475569', 1);

    // art in viewBox space -> panel space
    const sx = (x: number) => SVG_X + x * HAND_SCALE;
    const sy = (y: number) => SVG_Y + y * HAND_SCALE;
    const sc = HAND_SCALE;
    const palm = new GraphicsPath(isLeft ? PALM_L : PALM_R);
    const art = new Container();
    art.position.set(SVG_X, SVG_Y);
    art.scale.set(sc);
    const gp = new Graphics();
    gp.path(palm).fill('#0b1120').stroke({ width: 1.5, color: '#1e293b' });
    gp.path(
      new GraphicsPath(
        isLeft
          ? 'M 28 98 C 42 108, 60 106, 75 92'
          : 'M 88 98 C 74 108, 56 106, 41 92',
      ),
    ).stroke({ width: 1, color: '#1e293b' });
    gp.moveTo(isLeft ? 24 : 48, 148)
      .lineTo(isLeft ? 68 : 92, 148)
      .stroke({ width: 2, color: '#334155', cap: 'round' });
    art.addChild(gp);
    this.root.addChild(art);
    // keep `art` container last-but-texts: re-add texts on top
    this.root.addChild(this.texts);
    this.artC?.destroy({ children: true });
    this.artC = art;

    for (const f of fingers) {
      const main = s.activeFinger === f.id;
      const mod = s.modifierFinger === f.id;
      const sec = f.isThumb && main && secondary;
      const col = FINGER_COLOR_MAP[f.id];
      const fc = new Container();
      fc.position.set(f.x, f.baseY);
      if (f.isThumb) fc.rotation = ((isLeft ? 22 : -22) * Math.PI) / 180;
      const fg = new Graphics();
      const hgt = f.baseY - f.tipY;
      const rx = f.w / 2;
      let stroke = '#334155';
      let sw = 1.2;
      let fill: string | { color: string; alpha: number } = '#1e293b';
      if (sec) {
        stroke = 'rgba(16,185,129,0.55)';
        sw = 1.8;
        fill = { color: '#10b981', alpha: 0.14 };
      } else if (main) {
        stroke = col;
        sw = 2.5;
        fill = { color: col, alpha: 0.21 };
      } else if (mod) {
        stroke = '#fbbf24';
        sw = 2.5;
        fill = { color: '#fbbf24', alpha: 0.15 };
      }
      const lx = -f.w / 2;
      const ly = f.tipY - f.baseY;
      if (main && !sec) {
        fg.roundRect(lx - 2, ly - 2, f.w + 4, hgt + 10, rx + 2).stroke({
          width: 1,
          color: col,
          alpha: 0.5,
        });
        fg.roundRect(lx - 3, ly - 3, f.w + 6, hgt + 12, rx + 3).fill({
          color: col,
          alpha: 0.12,
        });
      }
      if (mod) {
        dashedRect(fg, lx - 2.5, ly - 2.5, f.w + 5, hgt + 11, 3, 3, {
          width: 1.2,
          color: '#fbbf24',
          alpha: 0.8,
        });
      }
      fg.roundRect(lx, ly, f.w, hgt + 6, rx).fill(fill);
      if (mod)
        dashedRect(fg, lx, ly, f.w, hgt + 6, 4, 3, {
          width: sw,
          color: stroke,
        });
      else
        fg.roundRect(lx, ly, f.w, hgt + 6, rx).stroke({
          width: sw,
          color: stroke,
        });
      // fingertip
      const tipFill = sec
        ? { color: '#10b981', alpha: 0.25 }
        : main
          ? col
          : mod
            ? '#fbbf24'
            : { color: col, alpha: 0.13 };
      const tipStroke = sec
        ? 'rgba(16,185,129,0.6)'
        : main
          ? '#ffffff'
          : mod
            ? '#fbbf24'
            : col;
      fg.circle(0, ly + rx, rx - 1.2)
        .fill(tipFill)
        .stroke({
          width: main ? 1.5 : 1.2,
          color: tipStroke,
          alpha: main ? 1 : 0.85,
        });
      if (f.isBump && !main && !mod)
        fg.roundRect(-2, ly + rx + 6, 4, 1, 0.5).fill('#64748b');
      fg.circle(0, 0, 1.8).fill({
        color: col,
        alpha: sec ? 0.6 : main ? 1 : 0.5,
      });
      fc.addChild(fg);
      art.addChild(fc);

      // fingertip label, placed in panel space (text is not scaled)
      const rot = f.isThumb ? ((isLeft ? 22 : -22) * Math.PI) / 180 : 0;
      const ox = 0;
      const oy = ly + rx + 3;
      const px = f.x + ox * Math.cos(rot) - oy * Math.sin(rot);
      const py = f.baseY + ox * Math.sin(rot) + oy * Math.cos(rot);
      const lbl =
        main && s.activeKeyDisplay
          ? s.activeKeyDisplay === ' '
            ? '␣'
            : s.activeKeyDisplay.toUpperCase()
          : mod
            ? s.modifierLabel === 'SHIFT'
              ? '⇧'
              : (s.modifierLabel ?? 'MOD')
            : f.home;
      const big = main && s.activeKeyDisplay && s.activeKeyDisplay.length > 1;
      const tx = this.t(
        lbl,
        sx(px),
        sy(py) - 0.5,
        (big ? 6.5 : 8) * sc,
        '700',
        sec ? '#6ee7b7' : main || mod ? '#020617' : col,
      );
      tx.rotation = rot;
    }

    // footer legend
    p.moveTo(2, 155.9)
      .lineTo(HAND_W - 2, 155.9)
      .stroke({ width: 1, color: '#1e293b', alpha: 0.8 });
    const legend = fingers.filter((f) => !f.isThumb);
    const cellW = 20;
    const start = HAND_W / 2 - (legend.length * cellW) / 2;
    legend.forEach((f, i) => {
      const x = start + i * cellW + 4;
      p.circle(x, 165, 3).fill(FINGER_COLOR_MAP[f.id]);
      this.t(
        f.home,
        x + 8,
        165,
        9,
        '700',
        s.activeFinger === f.id ? FINGER_COLOR_MAP[f.id] : '#94a3b8',
      );
    });
  }
}

// ---- drones ----
const PLUME_CACHE = new Map<string, FillGradient>();
function plumeGradient(color: string): FillGradient {
  let g = PLUME_CACHE.get(color);
  if (!g) {
    g = new FillGradient({
      type: 'linear',
      start: { x: 0, y: 1 },
      end: { x: 0, y: 0 },
      colorStops: [
        { offset: 0, color: '#ffffff' },
        { offset: 0.5, color },
        { offset: 1, color: rgba(color, 0) },
      ],
      textureSpace: 'local',
    });
    PLUME_CACHE.set(color, g);
  }
  return g;
}

class DroneView {
  root = new Container();
  body = new Graphics();
  plumes = new Graphics();
  tags = new Container();
  live = new Graphics();
  main: Text;
  sub: Text | null = null;
  tag: Text | null = null;
  sig = '';
  constructor(
    readonly note: FallingNote,
    res: number,
    readonly display: string,
    readonly subDisplay: string | undefined,
  ) {
    this.root.addChild(this.plumes, this.body, this.live, this.tags);
    const isSpace = note.char === ' ';
    this.main = mkText(
      isSpace ? '␣ SPACE' : display,
      18,
      '700',
      '#ffffff',
      res,
    );
    this.root.addChild(this.main);
    if (subDisplay && !isSpace) {
      this.sub = mkText(subDisplay, 12, '700', '#cbd5e1', res);
      this.root.addChild(this.sub);
    }
  }

  update(w: number, h: number, idx: number, laneColor: string, t: number) {
    const isSpace = this.note.char === ' ';
    const first = idx === 0;
    const sig = `${w}|${h}|${first}|${laneColor}`;
    if (sig !== this.sig) {
      this.sig = sig;
      const g = this.body;
      g.clear();
      const col = isSpace ? '#10b981' : laneColor;
      // 0 4px 0 #020617 lip + glow ring
      g.roundRect(-w / 2, -h / 2 + (first ? 4 : 3), w, h, 8).fill('#020617');
      if (first) {
        g.roundRect(-w / 2 - 6, -h / 2 - 6, w + 12, h + 12, 14).fill({
          color: col,
          alpha: 0.1,
        });
        g.roundRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 11).fill({
          color: col,
          alpha: 0.12,
        });
      }
      g.roundRect(-w / 2, -h / 2, w, h, 8)
        .fill({
          color: first ? '#020617' : '#0f172a',
          alpha: first ? 0.95 : 0.9,
        })
        .stroke({
          width: first ? 2 : 1,
          color: first ? laneColor : rgba(laneColor, 0.5),
          alignment: 1,
        });
      g.moveTo(-w / 2 + 6, -h / 2 + 1.5)
        .lineTo(w / 2 - 6, -h / 2 + 1.5)
        .stroke({ width: 1, color: '#fff', alpha: first ? 0.4 : 0.1 });
      // wings
      const ww = isSpace ? 16 : 14;
      const wh = isSpace ? 24 : 20;
      for (const side of [-1, 1]) {
        const x0 = side < 0 ? -w / 2 - ww : w / 2;
        g.roundRect(x0, -wh / 2, ww, wh, 6)
          .fill('#020617')
          .stroke({ width: 2, color: isSpace ? '#10b981' : laneColor });
      }
      // accent bar
      g.roundRect(
        -w / 2 + 4,
        h / 2 - (first ? 4 : 2),
        w - 8,
        first ? 4 : 2,
        2,
      ).fill({ color: laneColor, alpha: first ? 1 : 0.75 });
      this.main.style.fill = first ? '#ffffff' : '#f1f5f9';
      this.main.style.fontSize = isSpace
        ? first
          ? 18
          : 16
        : this.display.length > 3
          ? 12
          : this.display.length > 1
            ? 14
            : first
              ? 24
              : 18;
      if (this.sub) {
        this.sub.style.fill = first ? laneColor : '#cbd5e1';
        this.sub.position.set(0, -12);
        this.main.position.set(0, 7);
      } else {
        this.main.position.set(0, 1);
      }
      for (const c of this.tags.removeChildren()) c.destroy();
      if (isSpace && first) {
        // "HOSTILE FLAGSHIP  ␣ SPACE  LOCK" command-bridge row
        const left = mkText(
          'HOSTILE FLAGSHIP',
          9,
          '700',
          '#34d399',
          this.main.resolution,
          { letterSpacing: 1.8 },
        );
        const right = mkText(
          'LOCK',
          9,
          '700',
          '#34d399',
          this.main.resolution,
          { letterSpacing: 1.8 },
        );
        const pad = 6;
        const gap = 8;
        const wl = left.width + pad * 2;
        const wr = right.width + pad * 2;
        const wm = this.main.width;
        let x = -(wl + gap + wm + gap + wr) / 2;
        const pg = new Graphics();
        for (const [px, pw] of [
          [x, wl],
          [x + wl + gap + wm + gap, wr],
        ]) {
          pg.roundRect(px, -8, pw, 16, 3)
            .fill({ color: '#022c22', alpha: 0.8 })
            .stroke({ width: 1, color: '#10b981', alpha: 0.4 });
        }
        left.position.set(x + wl / 2, 0);
        this.main.position.set(x + wl + gap + wm / 2, 1);
        right.position.set(x + wl + gap + wm + gap + wr / 2, 0);
        x = 0;
        this.tags.addChild(pg, left, right);
      }
    }
    // live (animated) layer: thrusters, ping lights, lock brackets
    const g = this.live;
    g.clear();
    const pulse = 0.75 + 0.25 * Math.cos(((t % 2000) / 2000) * Math.PI * 2);
    const ping = (t % 1000) / 1000;
    const col = isSpace ? '#10b981' : laneColor;
    // Plume positions follow the Tailwind layout (inset-x-2 + px-1 / inset-x-8 + justify-around).
    const pw = isSpace ? 10 : 8;
    const thr: number[] = [];
    if (isSpace) {
      const free = w - 68 - 40;
      for (let i = 0; i < 4; i++)
        thr.push(-w / 2 + 34 + (free / 4) * (i + 0.5) + 10 * i + 5);
    } else {
      thr.push(-w / 2 + 18, w / 2 - 18);
    }
    const bt = first ? 2 : 1; // border width: plume bottom sits on the padding box
    this.plumes.clear();
    for (const x of thr) {
      this.plumes
        .roundRect(x - pw / 2, -h / 2 + bt - 14, pw, 14, pw / 2)
        .fill(plumeGradient(col));
    }
    this.plumes.alpha = pulse;
    for (const side of [-1, 1]) {
      const cx =
        side < 0 ? -w / 2 - (isSpace ? 8 : 7) : w / 2 + (isSpace ? 8 : 7);
      g.circle(cx, 0, 2).fill('#f43f5e');
      g.circle(cx, 0, 2 + ping * 3).fill({
        color: '#f43f5e',
        alpha: 0.75 * (1 - ping),
      });
    }
    if (!isSpace) {
      g.ellipse(0, h / 2 + 1, 5, 2).fill(
        first
          ? { color: '#f43f5e', alpha: pulse }
          : { color: '#fbbf24', alpha: 0.7 },
      );
    }
    if (first) {
      const L = 10;
      const o = 4;
      const a = pulse;
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const) {
        const x = sx * (w / 2 + o);
        const y = sy * (h / 2 + o);
        g.moveTo(x, y - sy * L)
          .lineTo(x, y)
          .lineTo(x - sx * L, y)
          .stroke({ width: 2, color: laneColor, alpha: a });
      }
    }
  }
}

// ---- FX types (ported from the 2D-canvas implementation) ----
interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}
interface Debris extends Spark {
  rot: number;
  vRot: number;
}
interface Wave {
  x: number;
  y: number;
  r: number;
  max: number;
  color: string;
  alpha: number;
}
interface Flash {
  x: number;
  y: number;
  r: number;
  max: number;
  alpha: number;
}
interface Ghost {
  view: Container;
  w: number;
  h: number;
  x: number;
  y: number;
  life: number;
  maxLife: number;
}
interface Popup {
  text: Text;
  vy: number;
  life: number;
  maxLife: number;
  scale: number;
}
interface Bolt {
  sx1: number;
  sy1: number;
  sx2: number;
  sy2: number;
  tx1: number;
  ty1: number;
  tx2: number;
  ty2: number;
  tx: number;
  ty: number;
  dist: number;
  traveled: number;
  speed: number;
  w: number;
  h: number;
  color: string;
  hit: string;
  isSpace: boolean;
  feedback: 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS';
  missed?: string;
  ghost?: DroneView;
  det: boolean;
  life: number;
  maxLife: number;
}

export interface Probe {
  frames: number;
  fps: number;
  frameMs: number;
  worstFrameMs: number;
  drones: { id: string; x: number; y: number }[];
  keys: { id: string; x: number; y: number; w: number; h: number }[];
  hands: { left: { x: number; y: number }; right: { x: number; y: number } };
  shipX: number;
  bolts: number;
  clicks: number;
  renderer: string;
}

export class DeckScene {
  private res: number;
  private layout: Layout | null = null;
  private keyViews = new Map<string, KeyView>();
  private drones = new Map<string, DroneView>();
  private hands: { l: HandView; r: HandView };
  private root = new Container();
  private beamLayer = new Container();
  private beamAura = new Graphics();
  private beamCore = new Graphics();
  private chassis = new Graphics();
  private keyLayer = new Container();
  private glow = new Graphics(); // key glows (blurred, additive)
  private trenchG = new Graphics();
  private trenchT = new Container();
  private droneLayer = new Container();
  private shipC = new Container();
  private shipG = new Graphics();
  private flareG = new Graphics();
  private fxGlow = new Graphics();
  private fxG = new Graphics();
  private fxText = new Container();
  private ghostLayer = new Container();

  private sparks: Spark[] = [];
  private debris: Debris[] = [];
  private crystals: Spark[] = [];
  private waves: Wave[] = [];
  private flashes: Flash[] = [];
  private ghosts: Ghost[] = [];
  private bolts: Bolt[] = [];
  private popups: Popup[] = [];
  private popupPool: Text[] = [];

  private shipX = 0;
  private shipInit = false;
  private aim = 0;
  private aimResetAt = 0;
  private muzzleUntil = 0;
  private lastMiss = false;
  private beamColor = '';
  private t = 0;
  private unsub: () => void;
  private sig = '';
  probe: Probe;
  private fpsAcc = 0;
  private fpsN = 0;

  constructor(private app: Application) {
    this.res = app.renderer.resolution;
    this.hands = {
      l: new HandView('left', this.res),
      r: new HandView('right', this.res),
    };
    this.beamAura.filters = [new BlurFilter({ strength: 4 })];
    this.beamLayer.addChild(this.beamAura, this.beamCore);
    this.glow.filters = [new BlurFilter({ strength: 8 })];
    this.glow.blendMode = 'add';
    this.fxGlow.filters = [new BlurFilter({ strength: 6 })];
    this.fxGlow.blendMode = 'add';
    this.keyLayer.sortableChildren = true;
    this.shipC.addChild(this.shipG, this.flareG);
    this.root.addChild(
      this.beamLayer,
      this.chassis,
      this.hands.l.root,
      this.hands.r.root,
      this.glow,
      this.keyLayer,
      this.trenchG,
      this.trenchT,
      this.droneLayer,
      this.shipC,
      this.ghostLayer,
      this.fxGlow,
      this.fxG,
      this.fxText,
    );
    app.stage.addChild(this.root);
    this.probe = {
      frames: 0,
      fps: 0,
      frameMs: 0,
      worstFrameMs: 0,
      drones: [],
      keys: [],
      hands: { left: { x: 0, y: 0 }, right: { x: 0, y: 0 } },
      shipX: 0,
      bolts: 0,
      clicks: 0,
      renderer: app.renderer.name,
    };
    // Hits are event-driven: subscribe to the store so we see the exact state
    // (pressed key, outgoing notes) at the moment the hit happens, not a frame later.
    this.unsub = useGameStore.subscribe((s, prev) => {
      if (
        s.performance.timingFeedbackKey !==
          prev.performance.timingFeedbackKey &&
        s.gameState === 'PLAYING'
      ) {
        this.onFeedback(s, prev);
      }
    });
    this.resize(app.screen.width, app.screen.height);
    app.ticker.add(this.onTick);
    (window as unknown as { __pixiProbe: Probe }).__pixiProbe = this.probe;
  }

  private onTick = (tk: { deltaMS: number; deltaTime: number }) =>
    this.tick(tk.deltaMS, tk.deltaTime);

  destroy() {
    resetGradients();
    this.unsub();
    this.app.ticker.remove(this.onTick);
  }

  resize(W: number, H: number) {
    this.rebuild(W, H, useGameStore.getState().profile.handsVisible);
  }

  private rebuild(W: number, H: number, handsVisible: boolean) {
    const L = computeLayout(W, H, handsVisible);
    this.layout = L;
    for (const v of this.keyViews.values()) v.root.destroy({ children: true });
    this.keyViews.clear();
    const res = this.res;
    for (const [id, r] of L.keys) {
      const v = new KeyView(
        r,
        res,
        (k) => this.clickKey(k),
        () => (this.sig = ''),
      );
      this.keyViews.set(id, v);
      this.keyLayer.addChild(v.root);
    }
    const c = this.chassis;
    c.clear();
    // keyboard deck chassis
    c.roundRect(L.deckX, L.deckY, L.deckW, L.deckH, 16)
      .fill({ color: '#020617', alpha: 0.95 })
      .stroke({ width: 2, color: '#1e293b', alignment: 1 });
    c.moveTo(L.deckX + 16, L.deckY + 1)
      .lineTo(L.deckX + L.deckW - 16, L.deckY + 1)
      .stroke({ width: 1.5, color: '#475569', alpha: 0.4 });
    this.hands.l.root.position.set(L.handL.x, L.handL.y);
    this.hands.r.root.position.set(L.handR.x, L.handR.y);
    this.hands.l.root.visible = this.hands.r.root.visible = handsVisible;
    this.hands.l.sig = this.hands.r.sig = '';
    // trench
    const tg = this.trenchG;
    tg.clear();
    tg.roundRect(L.trench.x, L.trench.y, L.trench.w, TRENCH_H, 12)
      .fill({ color: '#020617', alpha: 0.9 })
      .stroke({ width: 1, color: '#1e293b', alpha: 0.8, alignment: 1 });
    tg.moveTo(L.trench.x, L.trench.y + TRENCH_H / 2)
      .lineTo(L.trench.x + L.trench.w, L.trench.y + TRENCH_H / 2)
      .stroke({ width: 1.5, color: '#06b6d4', alpha: 0.3 });
    for (const c2 of this.trenchT.removeChildren()) c2.destroy();
    const lt = mkText(
      'INTERCEPTOR DEFENSE RAIL // ACTIVE KEY VECTOR',
      8,
      '700',
      '#64748b',
      res,
      { letterSpacing: 0.8 },
    );
    lt.anchor.set(0, 0.5);
    lt.position.set(L.trench.x + 14 + 6 + 6, L.trench.y + TRENCH_H / 2);
    tg.circle(L.trench.x + 14 + 3, L.trench.y + TRENCH_H / 2, 3).fill(
      '#22d3ee',
    );
    const rt = mkText('BATTERY ARMED ▲', 8, '700', '#22d3ee', res, {
      letterSpacing: 0.8,
    });
    rt.anchor.set(1, 0.5);
    rt.position.set(L.trench.x + L.trench.w - 14, L.trench.y + TRENCH_H / 2);
    this.trenchT.addChild(lt, rt);
    this.sig = '';
    this.shipInit = false;
  }

  /** Same synthetic key events the DOM keycaps send. */
  private clickKey(k: KeySpec) {
    const skip = [
      'ShiftLeft',
      'ShiftRight',
      'CapsLock',
      'ControlLeft',
      'ControlRight',
      'AltLeft',
      'AltRight',
      'MetaLeft',
      'MetaRight',
    ];
    if (skip.includes(k.key)) return;
    this.probe.clicks++;
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: k.key, bubbles: true }),
    );
    setTimeout(
      () =>
        window.dispatchEvent(
          new KeyboardEvent('keyup', { key: k.key, bubbles: true }),
        ),
      100,
    );
  }

  // ---- derived state ----
  private derive(s: GameStoreState) {
    const text = s.currentStage.sampleText;
    const i = s.performance.currentCharIndex;
    const activeChar = text[i] || null;
    const prevChar = i > 0 ? text[i - 1] : null;
    const nextChar = i + 1 < text.length ? text[i + 1] : null;
    const info = activeChar
      ? KEY_FINGER_MAP[activeChar] ||
        KEY_FINGER_MAP[activeChar.toLowerCase()] ||
        null
      : null;
    const lane = activeChar ? getNoteLaneAndFinger(activeChar).lane : null;
    let smartThumb: 'left' | 'right' = 'right';
    const prev =
      prevChar ||
      (s.lastPressedKey && s.lastPressedKey.length === 1
        ? s.lastPressedKey
        : null);
    const pick = (c: string | null) => {
      if (!c || c === ' ') return null;
      const inf = KEY_FINGER_MAP[c] || KEY_FINGER_MAP[c.toLowerCase()];
      if (!inf) return null;
      return inf.hand === 'left'
        ? 'right'
        : inf.hand === 'right'
          ? 'left'
          : null;
    };
    smartThumb = pick(prev) || pick(nextChar) || 'right';
    return { activeChar, prevChar, nextChar, info, lane, smartThumb };
  }

  // ---- hits (event-driven) ----
  private onFeedback(s: GameStoreState, prev: GameStoreState) {
    const L = this.layout;
    if (!L) return;
    const perf = s.performance;
    const fb = perf.timingFeedback;
    if (!fb) return;
    const d = this.derive(s);
    const shipY = Math.max(L.deckY + L.deckH + 6, L.H - 34);
    const origin = shipY - 14;
    const now = performance.now();
    if (fb !== 'MISS') {
      const hitChar = prev.fallingNotes[0]?.char ?? d.prevChar ?? d.activeChar;
      if (!hitChar) return;
      const kr = L.keys.get(keyId(hitChar));
      if (!kr) return;
      const isSpace = hitChar === ' ';
      const info =
        KEY_FINGER_MAP[hitChar] || KEY_FINGER_MAP[hitChar.toLowerCase()];
      const laneColor = info ? FINGER_COLOR_MAP[info.finger] : '#38bdf8';
      const hit =
        fb === 'PERFECT'
          ? isSpace
            ? '#34d399'
            : '#38bdf8'
          : fb === 'GREAT'
            ? '#4ade80'
            : '#facc15';
      const note =
        prev.fallingNotes.find(
          (n) => n.status === 'PENDING' && n.char === hitChar,
        ) ?? prev.fallingNotes[0];
      const view = note ? this.drones.get(note.id) : undefined;
      const droneTop = view
        ? view.root.y - kr.h / 2
        : this.droneTop(0, prev.fallingNotes[0]?.yPercent ?? 84, L);
      const tx = kr.cx;
      const ty = droneTop;
      const sp = isSpace ? 14 : 7;
      this.aim = 0;
      this.muzzleUntil = now + 160;
      if (view && note) {
        this.drones.delete(note.id);
        view.root.visible = false; // the bolt draws its own locked ghost
      }
      this.bolts.push({
        sx1: tx - sp,
        sy1: origin,
        sx2: tx + sp,
        sy2: origin,
        tx1: tx - sp,
        ty1: ty,
        tx2: tx + sp,
        ty2: ty,
        tx,
        ty,
        dist: Math.max(1, origin - ty),
        traveled: 0,
        speed: 46,
        w: kr.w,
        h: kr.h,
        color: isSpace ? '#10b981' : laneColor,
        hit,
        isSpace,
        feedback: fb,
        ghost: view,
        det: false,
        life: 0,
        maxLife: 24,
      });
      if (view) {
        this.ghostLayer.addChild(view.root);
        view.root.visible = true;
        view.root.position.set(tx, ty);
      }
    } else {
      const pressed = s.lastPressedKey;
      const pk = pressed ? L.keys.get(keyId(pressed)) : undefined;
      const exp = d.activeChar ? L.keys.get(keyId(d.activeChar)) : undefined;
      const shipX = exp ? exp.cx : this.shipX;
      const tx = pk ? pk.cx : shipX + (Math.random() > 0.5 ? 90 : -90);
      const ty = pk ? pk.cy : L.deckY + 30;
      const dx = tx - shipX;
      const dy = ty - origin;
      const dist = Math.max(1, Math.hypot(dx, dy));
      const angle = Math.max(
        -48,
        Math.min(48, Math.atan2(dx, -dy) * (180 / Math.PI)),
      );
      this.aim = angle;
      this.aimResetAt = now + 220;
      this.muzzleUntil = now + 180;
      const nx = -dy / dist;
      const ny = dx / dist;
      this.bolts.push({
        sx1: shipX + nx * 6,
        sy1: origin + ny * 6,
        sx2: shipX - nx * 6,
        sy2: origin - ny * 6,
        tx1: tx + nx * 4,
        ty1: ty + ny * 4,
        tx2: tx - nx * 4,
        ty2: ty - ny * 4,
        tx,
        ty,
        dist,
        traveled: 0,
        speed: 40,
        w: pk ? pk.w : 40,
        h: pk ? pk.h : 36,
        color: '#f43f5e',
        hit: '#ef4444',
        isSpace: false,
        feedback: 'MISS',
        missed:
          pressed === ' '
            ? 'SPACE'
            : pressed
              ? pressed.toUpperCase()
              : 'WRONG KEY',
        det: false,
        life: 0,
        maxLife: 24,
      });
    }
    this.lastMiss = fb === 'MISS';
  }

  private droneTop(idx: number, yPercent: number, L: Layout) {
    const sky = 20;
    const perim = Math.max(sky + 48, L.deckY - 42);
    if (idx === 0)
      return sky + (perim - sky) * Math.min(1, Math.max(0, yPercent / 84));
    const slot = Math.max(sky, perim - idx * 62);
    return sky + (slot - sky) * Math.min(1, yPercent / 35);
  }

  private popup(
    str: string,
    color: string,
    x: number,
    y: number,
    scale: number,
    maxLife: number,
    vy: number,
  ) {
    const t =
      this.popupPool.pop() ??
      mkText('', 16, '700', '#fff', this.res, {
        dropShadow: { color: '#000000', blur: 6, distance: 0, alpha: 1 },
      });
    t.text = str;
    t.style.fill = color;
    t.position.set(x, y);
    t.alpha = 1;
    t.scale.set(scale);
    t.visible = true;
    this.fxText.addChild(t);
    this.popups.push({ text: t, vy, life: 0, maxLife, scale });
  }

  private detonate(b: Bolt, hyper: boolean) {
    const { tx: x, ty: y, w, isSpace, hit, color } = b;
    if (b.feedback !== 'MISS') {
      this.flashes.push({ x, y, r: 12, max: isSpace ? 85 : 60, alpha: 1 });
      const dn = b.feedback === 'PERFECT' ? (isSpace ? 30 : 22) : 15;
      for (let i = 0; i < dn; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 4 + Math.random() * 9;
        this.debris.push({
          x: x + (Math.random() - 0.5) * w * 0.5,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 2.8,
          rot: Math.random() * 6.28,
          vRot: (Math.random() - 0.5) * 0.5,
          size: 4.5 + Math.random() * 6.5,
          color: i % 2 === 0 ? color : i % 3 === 0 ? '#ffffff' : '#334155',
          life: 0,
          maxLife: 32 + Math.random() * 18,
        });
      }
      const sn = b.feedback === 'PERFECT' ? (isSpace ? 55 : 40) : 26;
      for (let i = 0; i < sn; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 4.5 + Math.random() * 9.5;
        this.sparks.push({
          x: x + (Math.random() - 0.5) * w * 0.4,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 1.5,
          color: i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? hit : '#f97316',
          size: 3 + Math.random() * 4.5,
          life: 0,
          maxLife: 28 + Math.random() * 20,
        });
      }
      const cn = b.feedback === 'PERFECT' ? (isSpace ? 4 : 3) : 2;
      for (let i = 0; i < cn; i++) {
        this.crystals.push({
          x: x + (Math.random() - 0.5) * 24,
          y,
          vx: (Math.random() - 0.5) * 5.5,
          vy: -(5 + Math.random() * 4),
          color: isSpace ? '#34d399' : i === 0 ? '#38bdf8' : '#fbbf24',
          size: 6 + Math.random() * 3.5,
          life: 0,
          maxLife: 42 + Math.random() * 12,
        });
      }
      this.waves.push({
        x,
        y,
        r: 12,
        max: isSpace ? w * 1.6 : w * 2.2,
        color: hit,
        alpha: 1,
      });
      this.waves.push({
        x,
        y,
        r: 6,
        max: isSpace ? w * 2.2 : w * 2.8,
        color: '#ffffff',
        alpha: 0.9,
      });
      let label = '+50 GOOD';
      const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];
      if (b.feedback === 'PERFECT')
        label = isSpace
          ? '💥 FLAGSHIP OBLITERATED! +100'
          : hyper
            ? '⚡ WARP STRIKE! +400'
            : pick([
                '💥 VAPORIZED! +100',
                '🎯 CRITICAL HIT! +100',
                '⚡ DRONE DESTROYED! +100',
                '🔥 DIRECT HIT! +100',
              ]);
      else if (b.feedback === 'GREAT')
        label = isSpace
          ? '🚀 DREADNOUGHT DOWN! +75'
          : pick([
              '⚡ SHATTERED! +75',
              '🎯 INTERCEPTED! +75',
              '💥 TARGET DOWN! +75',
            ]);
      else
        label = pick(['✨ GRAZED! +50', '🛡️ DEFUSED! +50', '⚡ CONTACT! +50']);
      this.popup(
        label,
        hit,
        x,
        y - 26,
        b.feedback === 'PERFECT' ? 1.5 : 1.3,
        40,
        -2.6,
      );
    } else {
      this.waves.push({ x, y, r: 8, max: w * 1.3, color: '#ef4444', alpha: 1 });
      for (let i = 0; i < 24; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 2.5 + Math.random() * 6.5;
        this.sparks.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 1,
          color: i % 2 === 0 ? '#ef4444' : '#fca5a5',
          size: 2.5 + Math.random() * 3.5,
          life: 0,
          maxLife: 22 + Math.random() * 10,
        });
      }
      this.popup(
        `❌ WRONG KEY: [${b.missed || 'MISFIRE'}]`,
        '#ef4444',
        x,
        y - 22,
        1.3,
        38,
        -2.0,
      );
    }
  }

  // ---- frame ----
  private tick(deltaMS: number, deltaTime: number) {
    const L = this.layout;
    if (!L) return;
    const s = useGameStore.getState();
    const playing =
      s.gameState === 'PLAYING' ||
      s.gameState === 'PAUSED' ||
      s.gameState === 'VICTORY' ||
      s.gameState === 'STAGE_SELECT' ||
      s.gameState === 'HANGAR' ||
      s.gameState === 'ANALYTICS' ||
      s.gameState === 'CUSTOM_PRACTICE';
    this.root.visible = playing;
    const d = Math.min(deltaTime, 3); // frame units @60Hz
    this.t += deltaMS;
    const now = performance.now();

    // hands toggled -> layout depends on it
    if (s.profile.handsVisible !== L.hands) {
      this.rebuild(
        this.app.screen.width,
        this.app.screen.height,
        s.profile.handsVisible,
      );
      return;
    }
    if (this.aimResetAt && now > this.aimResetAt) {
      this.aim = 0;
      this.aimResetAt = 0;
    }

    const der = this.derive(s);
    const blind = !s.profile.keyboardVisible;
    const theme = s.profile.upgrades.equippedTrailTheme;
    const laneColor =
      (der.lane !== null && FINGER_LANES[der.lane]?.color) ||
      THEME_ACCENTS[theme] ||
      '#06b6d4';
    const targetId = der.activeChar ? keyId(der.activeChar) : null;
    const shift = der.info?.shiftRequired ?? false;
    const shiftHand = der.info?.recommendedShiftHand ?? null;
    const pressedId = s.lastPressedKey ? keyId(s.lastPressedKey) : null;

    // keys
    this.glow.clear();
    for (const [id, v] of this.keyViews) {
      const k = v.r.spec.key;
      const target = targetId === id;
      const mod =
        shift &&
        ((shiftHand === 'left' && k === 'ShiftLeft') ||
          (shiftHand === 'right' && k === 'ShiftRight'));
      const pressed = pressedId === id;
      v.draw(
        {
          target,
          mod,
          pressed,
          hover: false,
          blind,
          smartThumb: der.smartThumb,
        },
        s.profile.keyboardVisible,
        this.t,
      );
      if (target || mod || pressed) {
        const c = mod ? '#fbbf24' : v.laneColor;
        this.glow
          .roundRect(v.r.x - 2, v.r.y - 2, v.r.w + 4, v.r.h + 4, 8)
          .fill({ color: c, alpha: target || mod ? 0.55 : 0.4 });
      }
    }

    // hands
    if (L.hands) {
      const mainHand = der.info?.hand ?? null;
      const space = der.activeChar === ' ';
      const mk = (side: 'left' | 'right'): HandState => ({
        activeFinger:
          mainHand === side
            ? (der.info?.finger ?? null)
            : space
              ? 'THUMB'
              : null,
        activeKeyDisplay:
          mainHand === side
            ? der.activeChar === ' '
              ? '␣'
              : der.activeChar
            : space
              ? ' '
              : null,
        modifierFinger:
          shift && shiftHand === side
            ? side === 'left'
              ? 'LEFT_PINKY'
              : 'RIGHT_PINKY'
            : null,
        modifierLabel: shift && shiftHand === side ? 'SHIFT' : null,
        thumbRole: space
          ? der.smartThumb === side
            ? 'primary'
            : 'secondary'
          : null,
      });
      this.hands.l.draw(mk('left'));
      this.hands.r.draw(mk('right'));
    }

    // beam + ship (eased like `transition-all duration-100 ease-out`)
    const tk = targetId ? L.keys.get(targetId) : null;
    const shipY = Math.max(L.deckY + L.deckH + 6, L.H - 34);
    this.beamLayer.visible = this.shipC.visible = Boolean(tk) && playing;
    if (tk) {
      if (!this.shipInit) {
        this.shipX = tk.cx;
        this.shipInit = true;
      } else {
        this.shipX += (tk.cx - this.shipX) * (1 - Math.exp(-deltaMS / 45));
      }
      const bh = Math.max(20, shipY - 14);
      if (this.beamColor !== laneColor) {
        this.beamColor = laneColor;
      }
      this.beamAura.clear();
      this.beamCore.clear();
      const steps = 20;
      for (let i = 0; i < steps; i++) {
        const a0 = i / steps;
        const a1 = (i + 1) / steps;
        const am = (a0 + a1) / 2;
        const prof = am < 0.15 ? am / 0.15 : am > 0.85 ? (1 - am) / 0.15 : 1;
        const hump = 0.08 + 0.17 * (1 - Math.abs(am - 0.5) * 2);
        this.beamAura
          .rect(this.shipX - 12, a0 * bh, 24, bh / steps + 0.5)
          .fill({ color: laneColor, alpha: hump * Math.min(1, prof * 1.2) });
        this.beamCore
          .rect(this.shipX - 1, a0 * bh, 2, bh / steps + 0.5)
          .fill({
            color: laneColor,
            alpha: 0.25 + 0.75 * (1 - Math.abs(am - 0.5) * 2),
          });
      }
      // ship
      const firing = this.muzzleUntil > now;
      const sg = this.shipG;
      sg.clear();
      sg.ellipse(21, 24, 5.5, 3).fill({
        color: laneColor,
        alpha: 0.6 + 0.3 * Math.cos(((this.t % 2000) / 2000) * 6.28),
      });
      sg.ellipse(21, 25, 3, 1.5).fill('#ffffff');
      sg.poly([
        21, 2, 25, 11, 38, 17, 41, 23, 30, 21, 24, 24, 21, 21, 18, 24, 12, 21,
        1, 23, 4, 17, 17, 11,
      ])
        .fill('#090d16')
        .stroke({ width: 1.6, color: laneColor });
      sg.poly([21, 6, 23.5, 14, 21, 17, 18.5, 14]).fill({
        color: '#38bdf8',
        alpha: 0.95,
      });
      sg.roundRect(13, 2, 2.5, 9, 1)
        .fill('#f8fafc')
        .stroke({ width: 0.5, color: '#334155' });
      sg.roundRect(26.5, 2, 2.5, 9, 1)
        .fill('#f8fafc')
        .stroke({ width: 0.5, color: '#334155' });
      const fg = this.flareG;
      fg.clear();
      if (firing) {
        const fc = this.lastMiss ? '#ef4444' : '#facc15';
        for (const x of [2, 30]) {
          fg.ellipse(x + 5, -14 + 10, 6.5, 12).fill({ color: fc, alpha: 0.5 });
          fg.ellipse(x + 5, -14 + 10, 3.5, 8).fill('#ffffff');
        }
      }
      this.shipC.pivot.set(21, 23.8);
      this.shipC.position.set(this.shipX, shipY - 26 + 23.8 + (firing ? 6 : 0));
      this.shipC.scale.set(firing ? 0.9 : 1);
      this.shipC.rotation = (this.aim * Math.PI) / 180;
    }

    // drones
    const seen = new Set<string>();
    s.fallingNotes.forEach((n, idx) => {
      if (n.status === 'PROCESSED') return;
      const kr = L.keys.get(keyId(n.char));
      if (!kr) return;
      let v = this.drones.get(n.id);
      if (!v) {
        v = new DroneView(n, this.res, kr.spec.display, kr.spec.subDisplay);
        this.drones.set(n.id, v);
        this.droneLayer.addChild(v.root);
      }
      seen.add(n.id);
      const top = this.droneTop(idx, n.yPercent, L);
      v.root.position.set(kr.cx, top + kr.h / 2);
      v.root.zIndex = idx === 0 ? 30 : 20;
      v.update(
        kr.w,
        kr.h,
        idx,
        FINGER_LANES[n.lane]?.color || '#06b6d4',
        this.t,
      );
    });
    for (const [id, v] of this.drones) {
      if (!seen.has(id)) {
        v.root.destroy({ children: true });
        this.drones.delete(id);
      }
    }
    this.droneLayer.sortableChildren = true;
    this.droneLayer.visible = playing;

    this.stepFx(d, s.performance.hyperspaceActive);

    // probe
    const p = this.probe;
    p.frames++;
    p.frameMs = deltaMS;
    p.worstFrameMs = Math.max(p.worstFrameMs, deltaMS);
    this.fpsAcc += deltaMS;
    this.fpsN++;
    if (this.fpsAcc >= 1000) {
      p.fps = (this.fpsN * 1000) / this.fpsAcc;
      this.fpsAcc = 0;
      this.fpsN = 0;
    }
    p.drones = [...this.drones].map(([id, v]) => ({
      id,
      x: v.root.x,
      y: v.root.y,
    }));
    p.shipX = this.shipX;
    p.bolts = this.bolts.length;
    p.hands = { left: { ...L.handL }, right: { ...L.handR } };
    if (p.keys.length !== this.keyViews.size) {
      p.keys = [...this.keyViews].map(([id, v]) => ({
        id,
        x: v.r.x,
        y: v.r.y,
        w: v.r.w,
        h: v.r.h,
      }));
    }
  }

  private stepFx(d: number, hyper: boolean) {
    const g = this.fxG;
    const gl = this.fxGlow;
    g.clear();
    gl.clear();

    // bolts
    this.bolts = this.bolts.filter((b) => {
      b.traveled += b.speed * d;
      b.life += d;
      const t = Math.min(1, b.traveled / b.dist);
      const cx1 = b.sx1 + (b.tx1 - b.sx1) * t;
      const cy1 = b.sy1 + (b.ty1 - b.sy1) * t;
      const cx2 = b.sx2 + (b.tx2 - b.sx2) * t;
      const cy2 = b.sy2 + (b.ty2 - b.sy2) * t;
      if (b.feedback !== 'MISS' && b.ghost && !b.det) {
        // lock-on brackets drawn around the locked ghost
        const hw = b.w / 2;
        const hh = b.h / 2;
        const c = 7;
        const x0 = b.tx;
        const y0 = b.ty;
        g.moveTo(x0 - hw - 4, y0 - hh + c - 4)
          .lineTo(x0 - hw - 4, y0 - hh - 4)
          .lineTo(x0 - hw + c - 4, y0 - hh - 4);
        g.moveTo(x0 + hw - c + 4, y0 - hh - 4)
          .lineTo(x0 + hw + 4, y0 - hh - 4)
          .lineTo(x0 + hw + 4, y0 - hh + c - 4);
        g.moveTo(x0 - hw - 4, y0 + hh - c + 4)
          .lineTo(x0 - hw - 4, y0 + hh + 4)
          .lineTo(x0 - hw + c - 4, y0 + hh + 4);
        g.moveTo(x0 + hw - c + 4, y0 + hh + 4)
          .lineTo(x0 + hw + 4, y0 + hh + 4)
          .lineTo(x0 + hw + 4, y0 + hh - c + 4);
        g.stroke({ width: 1.8, color: b.color });
      }
      const bw = b.isSpace ? 5 : 3.5;
      gl.moveTo(b.sx1, b.sy1)
        .lineTo(cx1, cy1)
        .moveTo(b.sx2, b.sy2)
        .lineTo(cx2, cy2)
        .stroke({ width: bw * 2.8, color: b.color, alpha: 0.7 });
      g.moveTo(b.sx1, b.sy1)
        .lineTo(cx1, cy1)
        .moveTo(b.sx2, b.sy2)
        .lineTo(cx2, cy2)
        .stroke({ width: bw, color: '#ffffff', alpha: 0.95 });
      for (const [x, y] of [
        [cx1, cy1],
        [cx2, cy2],
      ]) {
        gl.circle(x, y, bw * 3.5).fill({ color: b.color, alpha: 0.5 });
        g.circle(x, y, bw * 1.2).fill('#ffffff');
        if (Math.random() > 0.35) {
          this.sparks.push({
            x: x + (Math.random() - 0.5) * 4,
            y: y + (Math.random() - 0.5) * 4,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5,
            color: Math.random() > 0.5 ? '#ffffff' : b.color,
            size: 2 + Math.random() * 2.5,
            life: 0,
            maxLife: 10 + Math.random() * 8,
          });
        }
      }
      if (t >= 1 && !b.det) {
        b.det = true;
        this.detonate(b, hyper);
        if (b.ghost) {
          this.ghosts.push({
            view: b.ghost.root,
            w: b.w,
            h: b.h,
            x: b.tx,
            y: b.ty,
            life: 0,
            maxLife: 15,
          });
        }
      }
      return t < 1 && !b.det && b.life < b.maxLife;
    });

    // vaporising ghosts (the locked drone dissolves in white light)
    this.ghosts = this.ghosts.filter((gh) => {
      gh.life += d;
      const pr = gh.life / gh.maxLife;
      const a = Math.max(0, 1 - pr);
      if (a <= 0) {
        gh.view.destroy({ children: true });
        return false;
      }
      gh.view.visible = false;
      const sc = 1 + pr * 0.25;
      gl.roundRect(
        gh.x - (gh.w * sc) / 2,
        gh.y - (gh.h * sc) / 2,
        gh.w * sc,
        gh.h * sc,
        4,
      )
        .fill({ color: '#ffffff', alpha: a * 0.85 })
        .stroke({ width: 3, color: '#ffffff', alpha: a });
      return true;
    });

    // nuclear flashes
    this.flashes = this.flashes.filter((f) => {
      f.r += (f.max - f.r) * (1 - 0.65 ** d);
      f.alpha -= 0.12 * d;
      if (f.alpha <= 0) return false;
      gl.circle(f.x, f.y, f.r).fill({
        color: '#fff0b4',
        alpha: f.alpha * 0.55,
      });
      gl.circle(f.x, f.y, f.r * 0.5).fill({ color: '#ffffff', alpha: f.alpha });
      return true;
    });

    // debris
    this.debris = this.debris.filter((p) => {
      p.x += p.vx * d;
      p.y += p.vy * d;
      p.vy += 0.28 * d;
      p.rot += p.vRot * d;
      p.life += d;
      const a = Math.max(0, 1 - p.life / p.maxLife);
      if (a <= 0) return false;
      const c = Math.cos(p.rot);
      const sn = Math.sin(p.rot);
      const pts = [
        [-p.size, -p.size * 0.6],
        [p.size * 0.8, -p.size * 0.4],
        [p.size * 0.5, p.size * 0.8],
        [-p.size * 0.7, p.size * 0.5],
      ].flatMap(([x, y]) => [p.x + x * c - y * sn, p.y + x * sn + y * c]);
      g.poly(pts).fill({ color: p.color, alpha: a });
      return true;
    });

    // sparks
    this.sparks = this.sparks.filter((p) => {
      p.x += p.vx * d;
      p.y += p.vy * d;
      p.vy += 0.24 * d;
      p.life += d;
      const a = Math.max(0, 1 - p.life / p.maxLife);
      if (a <= 0) return false;
      g.circle(p.x, p.y, Math.max(0.3, p.size * a)).fill({
        color: p.color,
        alpha: a,
      });
      return true;
    });

    // shockwaves
    this.waves = this.waves.filter((w) => {
      w.r += (w.max - w.r) * (1 - 0.82 ** d);
      w.alpha -= 0.042 * d;
      if (w.alpha <= 0) return false;
      g.circle(w.x, w.y, w.r).stroke({
        width: 2.5,
        color: w.color,
        alpha: w.alpha,
      });
      return true;
    });

    // crystals
    this.crystals = this.crystals.filter((c) => {
      c.x += c.vx * d;
      c.y += c.vy * d;
      c.vy += 0.12 * d;
      c.life += d;
      const a = Math.max(0, 1 - c.life / c.maxLife);
      if (a <= 0) return false;
      g.poly([
        c.x,
        c.y - c.size,
        c.x + c.size * 0.7,
        c.y,
        c.x,
        c.y + c.size,
        c.x - c.size * 0.7,
        c.y,
      ]).fill({ color: c.color, alpha: a });
      g.circle(c.x, c.y, c.size * 0.35).fill({ color: '#ffffff', alpha: a });
      return true;
    });

    // popups
    this.popups = this.popups.filter((p) => {
      p.text.y += p.vy * d;
      p.life += d;
      p.scale = Math.max(1, p.scale - 0.015 * d);
      p.text.scale.set(p.scale);
      p.text.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.text.alpha <= 0) {
        p.text.visible = false;
        this.fxText.removeChild(p.text);
        this.popupPool.push(p.text);
        return false;
      }
      return true;
    });
  }
}
