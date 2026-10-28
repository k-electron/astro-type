import {
  Container,
  FillGradient,
  Graphics,
  Rectangle,
  Sprite,
  type Text,
} from 'pixi.js';
import type { KeySpec } from '../curriculum/keyboardLayout';
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
 * Share out a row that is too long the way CSS flex-shrink does: each item
 * gives up length in proportion to its size, none below its floor. `basis` are
 * the natural sizes, `floor` the smallest each can be, `room` what the row has.
 */
function shrinkToFit(basis: number[], floor: number[], room: number): number[] {
  const sizes = [...basis];
  const frozen = basis.map((size, i) => size <= floor[i]);
  for (let pass = 0; pass < basis.length; pass++) {
    const over = sizes.reduce((sum, size) => sum + size, 0) - room;
    if (over <= 0) break;
    const weight = basis.reduce(
      (sum, size, i) => sum + (frozen[i] ? 0 : size),
      0,
    );
    if (weight <= 0) break;
    let clamped = false;
    basis.forEach((size, i) => {
      if (frozen[i]) return;
      sizes[i] = sizes[i] - (over * size) / weight;
      if (sizes[i] < floor[i]) {
        sizes[i] = floor[i];
        frozen[i] = true;
        clamped = true;
      }
    });
    if (!clamped) break;
  }
  return sizes;
}

/** `text` cut short with "…" until it is no wider than `room`, as CSS `text-overflow: ellipsis` does. */
function fitText(label: Text, text: string, room: number): string {
  label.text = text;
  if (label.width <= room) return text;
  let end = text.length;
  while (end > 0) {
    end -= 1;
    label.text = `${text.slice(0, end).trimEnd()}…`;
    if (label.width <= room) break;
  }
  return label.text;
}

/**
 * A wing: a `width` by `height` box standing out from the hull, filled dark,
 * with a 2 px border on its top, bottom and outer edge only and the outer
 * corners rounded (Tailwind's `rounded-l-md`). `edge` is where the open side
 * sits; `side` is -1 for the left wing and 1 for the right.
 */
function wingBracket(
  g: Graphics,
  side: -1 | 1,
  edge: number,
  width: number,
  height: number,
  color: string,
): void {
  const r = 6;
  const bw = 2;
  const outer = edge + side * width;
  const top = -height / 2;
  const bottom = height / 2;
  // The fill covers the whole box, with its outer corners rounded.
  g.moveTo(edge, top)
    .lineTo(outer - side * r, top)
    .arcTo(outer, top, outer, top + r, r)
    .lineTo(outer, bottom - r)
    .arcTo(outer, bottom, outer - side * r, bottom, r)
    .lineTo(edge, bottom)
    .closePath()
    .fill('#020617');
  // The border runs along the centre of its 2 px, inside the box.
  const c = bw / 2;
  const cr = r - c;
  const o = outer - side * c;
  g.moveTo(edge, top + c)
    .lineTo(o - side * cr, top + c)
    .arcTo(o, top + c, o, top + c + cr, cr)
    .lineTo(o, bottom - c - cr)
    .arcTo(o, bottom - c, o - side * cr, bottom - c, cr)
    .lineTo(edge, bottom - c)
    .stroke({ width: bw, color });
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

    // Queued Drones are `opacity-90` as a whole.
    this.visual.alpha = first ? 1 : 0.9;
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
    // The wings: brackets that open onto the hull. Their open side sits on
    // the hull's inner edge, so the hull's own border closes each one and the
    // wing looks tucked behind the body.
    const wingW = isSpace ? 16 : 14;
    const wingH = isSpace ? 24 : 20;
    const hull = first ? 2 : 1;
    for (const side of [-1, 1] as const) {
      wingBracket(
        g,
        side,
        side * (w / 2 - hull),
        wingW,
        wingH,
        isSpace ? '#10b981' : laneColor,
      );
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
    // The flagship's name is `tracking-wider`: 0.05 em between letters.
    if (isSpace) this.main.style.letterSpacing = first ? 0.9 : 0.8;
    if (this.sub) {
      this.sub.style.fill = first ? laneColor : '#cbd5e1';
      this.sub.position.set(0, -12);
      this.main.position.set(0, 7);
    } else {
      this.main.position.set(0, 1);
    }

    for (const child of this.tags.removeChildren()) child.destroy();
    if (isSpace) this.layoutBridge(w, hull, first);

    this.decorate(w, h, first, laneColor);

    // The a11y layer positions its element from this rectangle.
    this.root.hitArea = new Rectangle(-w / 2, -h / 2, w, h);
  }

  /**
   * The flagship's command bridge: "HOSTILE FLAGSHIP", "␣ SPACE" and "LOCK" in
   * a row, laid out the way the DOM deck's flex row does. When the hull is too
   * narrow for all three, they shrink in proportion to their size: the tags
   * can't go narrower than their longest word (so "HOSTILE FLAGSHIP" wraps to
   * two lines), "LOCK" can't shrink, and the name is cut short with "…".
   */
  private layoutBridge(w: number, hull: number, first: boolean): void {
    const name = '␣ SPACE';
    const gap = 8;
    const avail = w - 2 * hull;
    const main = this.main;
    main.text = name;
    const nameW = main.width;
    if (!first) {
      main.text = fitText(main, name, avail);
      main.position.set(0, 1);
      return;
    }
    const tag = (text: string) =>
      makeText(text, 9, '700', '#34d399', this.resolution, {
        letterSpacing: 0.9,
      });
    // A tag has a 1 px border and 6 px of padding either side, and 2 px above and below.
    const tagPadX = 7;
    const lineH = 14.5;
    const tagPadY = 3;
    const measure = tag('HOSTILE FLAGSHIP');
    const longestWord = Math.max(
      ...['HOSTILE', 'FLAGSHIP'].map((word) => {
        measure.text = word;
        return measure.width;
      }),
    );
    measure.text = 'HOSTILE FLAGSHIP';
    const lock = tag('LOCK');
    const basis = [
      measure.width + 2 * tagPadX,
      nameW,
      lock.width + 2 * tagPadX,
    ];
    const floor = [longestWord + 2 * tagPadX, 0, basis[2]];
    const sizes = shrinkToFit(basis, floor, avail - 2 * gap);
    const wrapped = sizes[0] < basis[0] - 0.01;
    const total = sizes[0] + sizes[1] + sizes[2] + 2 * gap;
    const x0 = -total / 2;
    const xs = [x0, x0 + sizes[0] + gap, x0 + sizes[0] + sizes[1] + 2 * gap];

    const plates = new Graphics();
    const plate = (x: number, width: number, height: number) =>
      plates
        .roundRect(x, -height / 2, width, height, 4)
        .fill({ color: '#022c22', alpha: 0.8 })
        .stroke({ width: 1, color: '#10b981', alpha: 0.4, alignment: 1 });
    plate(xs[0], sizes[0], (wrapped ? 2 : 1) * lineH + tagPadY * 2);
    plate(xs[2], sizes[2], lineH + tagPadY * 2);
    this.tags.addChild(plates);

    const place = (text: Text, x: number, y: number) => {
      text.anchor.set(0, 0.5);
      text.position.set(x, y);
      this.tags.addChild(text);
    };
    if (wrapped) {
      // Wrapped, the tag's words stack on two lines, left-aligned.
      measure.text = 'HOSTILE';
      place(measure, xs[0] + tagPadX, -lineH / 2);
      const second = tag('FLAGSHIP');
      place(second, xs[0] + tagPadX, lineH / 2);
    } else {
      place(measure, xs[0] + tagPadX, 0);
    }
    place(lock, xs[2] + tagPadX, 0);
    main.text = fitText(main, name, sizes[1]);
    main.position.set(xs[1] + main.width / 2, 1);
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

    // The wings' ping lights, in the middle of each bracket's inside.
    const lightX = w / 2 - border + (isSpace ? 7 : 6);
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
