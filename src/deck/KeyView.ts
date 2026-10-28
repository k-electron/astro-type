import { Container, Graphics, Rectangle, type Text } from 'pixi.js';
import { FINGER_LANES } from '../curriculum/curriculum';
import type { KeySpec } from '../curriculum/keyboardLayout';
import { bounceLift, pulseOpacity } from './animation';
import { dashedRoundRect, keycapGradient, makeText } from './draw';
import type { KeyRect } from './layout';
import { GlowSprite } from './textures';

/** The HOLD SHIFT badge: its height, and where its centre rests (8 px above the keycap's top edge, plus half its height). */
const HOLD_H = 12.7;
const HOLD_REST_Y = (keyH: number) => -keyH / 2 - 8 + HOLD_H / 2;

/** What a keycap looks like right now. */
export interface KeyState {
  /** The next character to type is on this key. */
  target: boolean;
  /** Shift is needed for the next character and this is the Shift key to use. */
  modifier: boolean;
  /** The player is holding this key down. */
  pressed: boolean;
  /** Keyboard guides are off: show dots instead of legends. */
  blind: boolean;
  /** The Keyboard guides setting. */
  keyboardVisible: boolean;
  /** Which thumb the Space key recommends. */
  smartThumb: 'left' | 'right';
}

/** The name a screen reader hears for a keycap, such as "F key" or "Left Shift key". */
export function keycapLabel(spec: KeySpec): string {
  switch (spec.key) {
    case ' ':
      return 'Space key';
    case 'Backspace':
      return 'Backspace key';
    case 'Tab':
      return 'Tab key';
    case 'CapsLock':
      return 'Caps Lock key';
    case 'Enter':
      return 'Enter key';
    case 'ShiftLeft':
      return 'Left Shift key';
    case 'ShiftRight':
      return 'Right Shift key';
    case 'ControlLeft':
      return 'Left Ctrl key';
    case 'ControlRight':
      return 'Right Ctrl key';
    case 'AltLeft':
      return 'Left Alt key';
    case 'AltRight':
      return 'Right Alt key';
    case 'MetaLeft':
      return 'Left Cmd key';
    case 'MetaRight':
      return 'Right Cmd key';
    default:
      return `${spec.display} key`;
  }
}

// Gradients own GPU textures, so they are made once the renderer exists and
// dropped with it.
let keyGradient: ReturnType<typeof keycapGradient> | null = null;
let keyGradientAmber: ReturnType<typeof keycapGradient> | null = null;
function gradients() {
  keyGradient ??= keycapGradient('#1e293b');
  keyGradientAmber ??= keycapGradient('#451a03');
  return { keyGradient, keyGradientAmber };
}
export function resetKeyGradients() {
  keyGradient = keyGradientAmber = null;
}

/**
 * One keycap. The outer container never moves or scales, so the accessibility
 * layer's button stays where the keycap rests; the looks (scale, press dip)
 * live on the inner `visual` container.
 */
export class KeyView {
  readonly root = new Container();
  private readonly visual = new Container();
  /** The box-shadow glow of a lit keycap. */
  private readonly glow = new GlowSprite();
  private readonly bg = new Graphics();
  /** Blind touch-typing: the dot that marks the next key, pulsing. */
  private readonly dot = new Graphics();
  private pulsing = false;
  private readonly main: Text | null = null;
  private readonly sub: Text | null = null;
  private readonly spaceLabel: Text | null = null;
  private readonly thumbLeft: Text | null = null;
  private readonly thumbRight: Text | null = null;
  private readonly hold = new Container();
  private signature = '';
  readonly laneColor: string;
  rect: KeyRect;

  constructor(
    rect: KeyRect,
    resolution: number,
    label: string,
    onPress: (key: KeySpec) => void,
  ) {
    this.rect = rect;
    const { spec } = rect;
    this.laneColor = FINGER_LANES[spec.lane]?.color || '#06b6d4';

    this.root.addChild(this.visual);
    this.visual.accessibleChildren = false;
    this.glow.anchor.set(0.5);
    this.glow.visible = false;
    this.visual.addChild(this.glow, this.bg, this.dot);
    this.root.zIndex = 1;

    this.root.eventMode = 'static';
    this.root.cursor = 'pointer';
    // `pointertap` is what the accessibility layer's button sends on a click,
    // and what the canvas sends if a click ever reaches it.
    this.root.on('pointertap', () => onPress(spec));

    // Accessibility layer: a button named after the keycap. Not a tab stop:
    // the player is typing, and Tab must not walk into 60 keycaps.
    this.root.accessible = true;
    this.root.accessibleType = 'button';
    this.root.accessibleHint = label;
    this.root.accessibleText = label;
    this.root.tabIndex = -1;

    const len = spec.display.length;
    const mainSize = len > 3 ? 12 : len > 1 ? 14 : 18;
    if (spec.key === ' ') {
      this.spaceLabel = makeText('␣ SPACE', 16, '700', '#ffffff', resolution);
      this.thumbLeft = makeText('', 9, '700', '#10b981', resolution);
      this.thumbRight = makeText('', 9, '700', '#10b981', resolution);
      this.thumbLeft.anchor.set(0, 0.5);
      this.thumbRight.anchor.set(1, 0.5);
      this.visual.addChild(this.spaceLabel, this.thumbLeft, this.thumbRight);
    } else {
      this.main = makeText(
        spec.display,
        mainSize,
        '700',
        '#f1f5f9',
        resolution,
      );
      this.visual.addChild(this.main);
      if (spec.subDisplay) {
        this.sub = makeText(spec.subDisplay, 12, '700', '#cbd5e1', resolution);
        this.visual.addChild(this.sub);
      }
    }
    if (spec.key.startsWith('Shift')) {
      // `text-[8px] tracking-tighter` in a 1 px border and 6 px padding: 12.7 px tall, 84 px wide.
      const label = makeText(
        '·· HOLD SHIFT ··',
        8,
        '700',
        '#020617',
        resolution,
        {
          letterSpacing: -0.4,
        },
      );
      const badgeW = label.width + 14;
      const badge = new Graphics()
        .roundRect(-badgeW / 2, -HOLD_H / 2, badgeW, HOLD_H, 4)
        .fill('#fbbf24')
        .stroke({ width: 1, color: '#fcd34d', alignment: 1 });
      this.hold.addChild(badge, label);
      this.hold.visible = false;
      this.hold.position.set(0, HOLD_REST_Y(rect.h));
      this.visual.addChild(this.hold);
    }
    this.place(rect);
  }

  /** Move to a new rectangle after a resize or the hands being toggled. */
  place(rect: KeyRect): void {
    this.rect = rect;
    this.root.position.set(rect.cx, rect.cy);
    this.root.hitArea = new Rectangle(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
    if (this.thumbLeft && this.thumbRight) {
      this.thumbLeft.position.set(-rect.w / 2 + 12, 0);
      this.thumbRight.position.set(rect.w / 2 - 12, 0);
    }
    this.hold.position.set(0, HOLD_REST_Y(rect.h));
    this.signature = '';
  }

  /** The glow a lit keycap casts: its lane colour for the next key and a pressed key, amber for Shift. */
  private drawGlow(target: boolean, modifier: boolean, pressed: boolean): void {
    if (!(target || modifier || pressed)) {
      this.glow.visible = false;
      this.glow.release();
      return;
    }
    const { w, h } = this.rect;
    // target 0 0 24px lane @ 52 %, modifier 0 0 20px amber @ 65 %, pressed 0 0 20px lane @ 56 %
    const blur = target ? 24 : 20;
    this.glow.show(w, h, 6, blur);
    this.glow.tint = modifier && !target ? '#fbbf24' : this.laneColor;
    this.glow.alpha = target ? 0.52 : modifier ? 0.65 : 0.565;
    this.glow.visible = true;
  }

  /** Move the animated parts (the bouncing HOLD SHIFT badge, the blind-mode dot) to `timeMs` of effect time. */
  animate(timeMs: number): void {
    if (this.hold.visible) {
      this.hold.position.y =
        HOLD_REST_Y(this.rect.h) - HOLD_H * 0.25 * bounceLift(timeMs);
    }
    if (this.pulsing) this.dot.alpha = pulseOpacity(timeMs);
  }

  draw(state: KeyState): void {
    const { modifier, target, blind } = state;
    this.hold.visible = modifier;
    const signature = `${target}|${modifier}|${state.pressed}|${blind}|${state.smartThumb}|${state.keyboardVisible}`;
    if (signature === this.signature) return;
    this.signature = signature;

    const { rect, laneColor } = this;
    const { pressed } = state;
    const w = rect.w;
    const h = rect.h;
    const g = this.bg;
    g.clear();
    this.dot.clear();
    const lit = target || modifier || pressed;
    this.drawGlow(target, modifier, pressed);
    this.visual.scale.set(target || modifier ? 1.02 : pressed ? 0.98 : 1);
    this.visual.position.y = pressed && !target ? 2 : 0;
    this.root.zIndex = target || modifier ? 20 : 1;

    // The lip under the cap (0 3px 0 #020617).
    g.roundRect(-w / 2, -h / 2 + (pressed ? 1 : 3), w, h, 6).fill('#020617');
    const gradient = gradients();
    g.roundRect(-w / 2, -h / 2, w, h, 6).fill(
      modifier ? gradient.keyGradientAmber : gradient.keyGradient,
    );
    // The border is 2 px when lit and 1 px otherwise; the finger-coloured band
    // (inset 0 -3px 0) and the accent stripe both sit inside it.
    const bt = lit ? 2 : 1;
    if (!lit) {
      g.roundRect(-w / 2 + bt, h / 2 - bt - 3, w - 2 * bt, 3, 2).fill({
        color: laneColor,
        alpha: 0.27,
      });
    }
    if (modifier) {
      dashedRoundRect(g, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 5, 4, 3, {
        width: 2,
        color: '#fbbf24',
      });
    } else if (lit) {
      g.roundRect(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 5).stroke({
        width: 2,
        color: laneColor,
      });
    } else {
      g.roundRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1, 6).stroke({
        width: 1,
        color: '#334155',
        alpha: 0.8,
      });
    }
    // The top highlight (inset 0 1px 1px).
    g.moveTo(-w / 2 + 6, -h / 2 + 1.5)
      .lineTo(w / 2 - 6, -h / 2 + 1.5)
      .stroke({ width: 1, color: '#ffffff', alpha: lit ? 0.4 : 0.1 });
    // Finger accent stripe.
    const stripe = target || modifier ? 4 : 2.5;
    g.roundRect(
      -w / 2 + bt + 4,
      h / 2 - bt - stripe,
      w - 2 * bt - 8,
      stripe,
      stripe / 2,
    ).fill({
      color: modifier ? '#fbbf24' : laneColor,
      alpha: target || modifier ? 1 : 0.75,
    });
    // The tactile bump on F and J.
    if (rect.spec.isBump) {
      g.roundRect(-5, h / 2 - 6, 10, 2, 1).fill(target ? '#ffffff' : laneColor);
    }

    if (this.spaceLabel && this.thumbLeft && this.thumbRight) {
      this.thumbLeft.visible = this.thumbRight.visible = target;
      this.spaceLabel.visible = target || !blind;
      this.spaceLabel.text = target ? '␣ SPACE' : 'SPACE';
      this.spaceLabel.style.fontSize = target ? 16 : 12;
      const rec = state.smartThumb;
      this.thumbLeft.text =
        rec === 'left' ? '◀ L. THUMB [REC]' : 'L. Thumb (Alt)';
      this.thumbRight.text =
        rec === 'right' ? 'R. THUMB [REC] ▶' : 'R. Thumb (Alt)';
      this.thumbLeft.style.fill =
        rec === 'left' ? '#6ee7b7' : 'rgba(16,185,129,0.5)';
      this.thumbRight.style.fill =
        rec === 'right' ? '#6ee7b7' : 'rgba(16,185,129,0.5)';
      this.thumbLeft.style.fontSize = rec === 'left' ? 10 : 9;
      this.thumbRight.style.fontSize = rec === 'right' ? 10 : 9;
    }
    if (this.main) this.main.visible = !blind;
    if (this.sub) this.sub.visible = !blind && state.keyboardVisible;
    const isSpaceKey = Boolean(this.spaceLabel);
    if (blind && !(isSpaceKey && target)) {
      // Blind touch-typing: a dot instead of a legend.
      if (target) {
        // A glowing dot (0 0 10px in the lane colour) that pulses.
        this.dot.circle(0, 0, 9).fill({ color: laneColor, alpha: 0.12 });
        this.dot.circle(0, 0, 7).fill({ color: laneColor, alpha: 0.2 });
        this.dot.circle(0, 0, 5).fill(laneColor);
      } else if (modifier) {
        g.circle(0, 0, 4)
          .fill({ color: '#fbbf24', alpha: 0.4 })
          .stroke({ width: 1, color: '#fbbf24' });
      } else if (rect.spec.isBump) {
        g.roundRect(-5, -2, 10, 4, 2).fill(laneColor);
      } else {
        g.circle(0, 0, 3).fill({ color: laneColor, alpha: 0.6 });
      }
    }
    this.pulsing = blind && target && !isSpaceKey;
    if (!this.pulsing) this.dot.alpha = 1;
    if (this.main && !blind) {
      this.main.style.fill = lit ? '#ffffff' : '#f1f5f9';
      if (this.sub) {
        this.sub.style.fill = target
          ? laneColor
          : modifier
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
