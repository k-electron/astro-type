import {
  Container,
  FillGradient,
  Graphics,
  Rectangle,
  Sprite,
  type Text,
} from 'pixi.js';
import type { KeySpec } from '../../data/keyboardLayout';
import { ping, pulseOpacity } from './animation';
import { makeText, rgba } from './draw';
import { boxGlow } from './textures';

/** The plume of an ion thruster: white at its root, the lane colour, then nothing. */
const plumeGradients = new Map<string, FillGradient>();
function plumeGradient(color: string): FillGradient {
  let gradient = plumeGradients.get(color);
  if (!gradient) {
    gradient = new FillGradient({
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
    plumeGradients.set(color, gradient);
  }
  return gradient;
}

/** Gradients own GPU textures: drop them with the renderer. */
export function resetPlumeGradients(): void {
  plumeGradients.clear();
}

/**
 * One Drone: the hull, its wings, the character on it and the accent bar, with
 * its thruster plumes, wing ping lights, sensor eye and (on the lead) lock-on
 * brackets.
 *
 * The position is set by the scene each frame. The shapes are redrawn only
 * when the Drone's size, its place in the queue or its lane colour changes;
 * `animate` then moves the pulsing and pinging parts on effect time.
 */
export class DroneView {
  readonly root = new Container();
  private readonly visual = new Container();
  private readonly glow = new Sprite();
  private readonly body = new Graphics();
  private readonly plumeGroup = new Container();
  private readonly lightGroup = new Container();
  private readonly lights: Graphics[] = [];
  private readonly eyeGroup = new Container();
  private readonly brackets = new Graphics();
  private first = false;
  private readonly tags = new Container();
  private readonly main: Text;
  private sub: Text | null = null;
  private signature = '';
  private readonly isSpace: boolean;

  constructor(
    readonly id: string,
    readonly char: string,
    private readonly keycap: KeySpec,
    private readonly resolution: number,
  ) {
    this.isSpace = char === ' ';
    this.visual.accessibleChildren = false;
    this.glow.anchor.set(0.5);
    this.glow.visible = false;
    for (let i = 0; i < 2; i++) {
      const light = new Graphics();
      this.lights.push(light);
      this.lightGroup.addChild(light);
    }
    this.visual.addChild(
      this.glow,
      this.body,
      this.plumeGroup,
      this.lightGroup,
      this.eyeGroup,
      this.tags,
      this.brackets,
    );
    this.root.addChild(this.visual);
    this.main = makeText(
      this.isSpace ? '␣ SPACE' : keycap.display,
      18,
      '700',
      '#ffffff',
      resolution,
    );
    this.visual.addChild(this.main);
    if (keycap.subDisplay && !this.isSpace) {
      this.sub = makeText(keycap.subDisplay, 12, '700', '#cbd5e1', resolution);
      this.visual.addChild(this.sub);
    }

    // Accessibility layer: "Drone F". A Drone is something to read, not press:
    // not a tab stop and never in the way of a click.
    const label = this.isSpace ? 'Drone Space' : `Drone ${keycap.display}`;
    this.root.accessible = true;
    this.root.accessibleType = 'div';
    this.root.accessibleHint = label;
    this.root.accessibleText = label;
    this.root.accessiblePointerEvents = 'none';
    this.root.eventMode = 'static';
    this.root.tabIndex = -1;
  }

  /** Match the keycap beneath it and the Drone's place in the queue. */
  update(w: number, h: number, queueIndex: number, laneColor: string): void {
    const first = queueIndex === 0;
    const signature = `${w}|${h}|${first}|${laneColor}`;
    if (signature === this.signature) return;
    this.signature = signature;

    const { isSpace } = this;
    const g = this.body;
    g.clear();
    // The lip under the hull (0 4px 0 #020617).
    g.roundRect(-w / 2, -h / 2 + (first ? 4 : 3), w, h, 8).fill('#020617');
    // The lead glows (0 0 24px in its lane colour).
    this.glow.visible = first;
    if (first) {
      this.glow.texture = boxGlow(w, h, 8, 24).texture;
      this.glow.tint = laneColor;
      this.glow.alpha = 0.56;
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
      .stroke({ width: 1, color: '#ffffff', alpha: first ? 0.4 : 0.1 });
    // The wings.
    const wingW = isSpace ? 16 : 14;
    const wingH = isSpace ? 24 : 20;
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? -w / 2 - wingW : w / 2;
      g.roundRect(x0, -wingH / 2, wingW, wingH, 6)
        .fill('#020617')
        .stroke({ width: 2, color: isSpace ? '#10b981' : laneColor });
    }
    // The accent bar along the bottom.
    g.roundRect(
      -w / 2 + 4,
      h / 2 - (first ? 4 : 2),
      w - 8,
      first ? 4 : 2,
      2,
    ).fill({ color: laneColor, alpha: first ? 1 : 0.75 });

    const display = this.keycap.display;
    this.main.style.fill = first ? '#ffffff' : '#f1f5f9';
    this.main.style.fontSize = isSpace
      ? first
        ? 18
        : 16
      : display.length > 3
        ? 12
        : display.length > 1
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

    for (const child of this.tags.removeChildren()) child.destroy();
    if (isSpace && first) {
      // "HOSTILE FLAGSHIP  ␣ SPACE  LOCK" across the command bridge.
      const left = makeText(
        'HOSTILE FLAGSHIP',
        9,
        '700',
        '#34d399',
        this.resolution,
        { letterSpacing: 1.8 },
      );
      const right = makeText('LOCK', 9, '700', '#34d399', this.resolution, {
        letterSpacing: 1.8,
      });
      const pad = 6;
      const gap = 8;
      const leftW = left.width + pad * 2;
      const rightW = right.width + pad * 2;
      const mainW = this.main.width;
      const x = -(leftW + gap + mainW + gap + rightW) / 2;
      const plates = new Graphics();
      for (const [px, pw] of [
        [x, leftW],
        [x + leftW + gap + mainW + gap, rightW],
      ]) {
        plates
          .roundRect(px, -8, pw, 16, 3)
          .fill({ color: '#022c22', alpha: 0.8 })
          .stroke({ width: 1, color: '#10b981', alpha: 0.4 });
      }
      left.position.set(x + leftW / 2, 0);
      this.main.position.set(x + leftW + gap + mainW / 2, 1);
      right.position.set(x + leftW + gap + mainW + gap + rightW / 2, 0);
      this.tags.addChild(plates, left, right);
    }

    this.decorate(w, h, first, laneColor);

    // The a11y layer positions its element from this rectangle.
    this.root.hitArea = new Rectangle(-w / 2, -h / 2, w, h);
  }

  /**
   * The parts that animate: thruster plumes, ping lights, the sensor eye and the
   * lead's lock-on brackets. Shapes are drawn here once; `animate` only changes
   * their opacity and scale.
   */
  private decorate(
    w: number,
    h: number,
    first: boolean,
    laneColor: string,
  ): void {
    this.first = first;
    const { isSpace } = this;
    const accent = isSpace ? '#10b981' : laneColor;
    // The border is the first thing a child is placed inside.
    const border = first ? 2 : 1;

    for (const child of this.plumeGroup.removeChildren()) child.destroy();
    const plumeW = isSpace ? 10 : 8;
    const centres: number[] = [];
    if (isSpace) {
      // Four plumes spread evenly between the flagship's outer 32 px.
      const free = w - 2 * border - 64 - 4 * plumeW;
      for (let i = 0; i < 4; i++) {
        centres.push(
          -w / 2 +
            border +
            32 +
            free / 8 +
            i * (free / 4 + plumeW) +
            plumeW / 2,
        );
      }
    } else {
      centres.push(-w / 2 + border + 8 + 4 + 4, w / 2 - border - 8 - 4 - 4);
    }
    const plumes = new Graphics();
    for (const x of centres) {
      const top = -h / 2 + border - 14;
      const glow = new Sprite(
        boxGlow(plumeW, 14, plumeW / 2, isSpace ? 10 : 8).texture,
      );
      glow.anchor.set(0.5);
      glow.tint = accent;
      glow.position.set(x, top + 7);
      this.plumeGroup.addChild(glow);
      plumes
        .roundRect(x - plumeW / 2, top, plumeW, 14, plumeW / 2)
        .fill(plumeGradient(accent));
    }
    this.plumeGroup.addChild(plumes);

    // The wings' ping lights.
    const lightX = w / 2 + (isSpace ? 8 : 7);
    const radius = isSpace ? 3 : 2;
    this.lights.forEach((light, i) => {
      light.clear();
      light.circle(0, 0, radius).fill('#f43f5e');
      light.position.set(i === 0 ? -lightX : lightX, 0);
    });

    // The forward sensor eye (flagships have none).
    for (const child of this.eyeGroup.removeChildren()) child.destroy();
    if (!isSpace) {
      const y = h / 2 - border + 2;
      if (first) {
        const glow = new Sprite(boxGlow(10, 4, 2, 8).texture);
        glow.anchor.set(0.5);
        glow.tint = '#f43f5e';
        glow.position.set(0, y);
        this.eyeGroup.addChild(glow);
      }
      this.eyeGroup.addChild(
        new Graphics().ellipse(0, y, 5, 2).fill({
          color: first ? '#f43f5e' : '#fbbf24',
          alpha: first ? 1 : 0.7,
        }),
      );
    }

    // The lead's lock-on corner brackets, 10 px squares just outside the hull.
    const b = this.brackets;
    b.clear();
    b.visible = first;
    if (first) {
      const out = -2;
      const arm = 10;
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ] as const) {
        const x = sx * (w / 2 - out - 1);
        const y = sy * (h / 2 - out - 1);
        b.moveTo(x, y - sy * (arm - 1))
          .lineTo(x, y)
          .lineTo(x - sx * (arm - 1), y);
      }
      b.stroke({ width: 2, color: laneColor });
    }
  }

  /** Move the animated parts to where `timeMs` of effect time puts them. */
  animate(timeMs: number): void {
    const pulse = pulseOpacity(timeMs);
    this.plumeGroup.alpha = pulse;
    const light = ping(timeMs);
    for (const dot of this.lights) {
      dot.scale.set(light.scale);
      dot.alpha = light.opacity;
    }
    if (this.first) {
      this.eyeGroup.alpha = pulse;
      this.brackets.alpha = pulse;
      this.tags.alpha = pulse;
    } else {
      this.eyeGroup.alpha = 1;
      this.tags.alpha = 1;
    }
  }
}
