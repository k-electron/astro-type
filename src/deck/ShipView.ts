import { Container, Graphics, Sprite } from 'pixi.js';
import { pulseOpacity } from './animation';
import { STEP_MS } from '../game/clock';
import {
  BEAM_AURA_WIDTH,
  beamAuraTexture,
  beamCoreTexture,
  GlowSprite,
  SOFT_RADIUS,
  softDotTexture,
} from './textures';

/** The ship and the beam are 100 ms away from where they are going, as with the DOM deck's `transition-all duration-100`. */
const FOLLOW_MS = 45;
/** The recoil and the muzzle flares come and go in 75 ms. */
const SNAP_MS = 30;

/** How long the muzzle flashes after a hit and after a wrong key, and how long the ship stays turned. */
const FLASH_HIT_MS = 160;
const FLASH_MISS_MS = 180;
const AIM_HOLD_MS = 220;

/** The three glows the beam's box-shadow casts, widest last. */
const BEAM_GLOW_BLURS = [6, 14, 24];

/** The most the ship turns toward a wrong key. */
const MAX_AIM_DEG = 48;

export interface ShipFrame {
  /** The target keycap's centre, or null when there is nothing to aim at. */
  targetX: number | null;
  /** The lane colour of the target. */
  color: string;
  shipY: number;
  /** How long this frame lasts, in steps of 1/60 s. */
  d: number;
}

/**
 * The guidance beam and the player's starfighter. The ship sits under the
 * keyboard, tracks the key to type next, recoils and flares when it fires and
 * turns toward a wrong key. They run on effect time: a paused deck holds the
 * ship exactly where it was, mid-recoil included.
 */
export class ShipView {
  /** The beam, drawn behind the keyboard. */
  readonly beam = new Container();
  /** The ship, drawn above the Drones. */
  readonly ship = new Container();

  private readonly aura = new Sprite(beamAuraTexture());
  private readonly core = new Sprite(beamCoreTexture());
  private readonly shadows: GlowSprite[] = [];
  private readonly inner = new Container();
  private readonly engine = new Graphics();
  private readonly hull = new Graphics();
  private readonly flares: { root: Container; glow: Sprite; ring: Graphics }[] =
    [];
  private shipX = 0;
  private visibleBefore = false;
  private drawnColor = '';
  private drawnBeamHeight = -1;
  private aim = 0;
  private aimTarget = 0;
  private aimResetAt = Number.POSITIVE_INFINITY;
  private flashUntil = 0;
  private flashIsMiss = false;
  private recoil = 0;
  private flare = 0;
  private time = 0;

  constructor() {
    this.beam.accessibleChildren = false;
    this.ship.accessibleChildren = false;
    this.aura.anchor.set(0.5, 0);
    this.core.anchor.set(0.5, 0);
    for (const alpha of [1, 0.5, 0.21]) {
      const shadow = new GlowSprite();
      shadow.alpha = alpha;
      this.shadows.push(shadow);
    }
    this.beam.addChild(this.aura, ...this.shadows, this.core);

    this.inner.addChild(this.engine, this.hull);
    for (const x of [7, 35]) {
      const root = new Container();
      const glow = new Sprite(softDotTexture());
      glow.anchor.set(0.5);
      // Each flare is a 10 by 20 capsule: a ring in the shot's colour around a white heart.
      glow.scale.set(15 / SOFT_RADIUS);
      glow.alpha = 0.5;
      const ring = new Graphics().ellipse(0, 0, 5, 10).fill('#ffffff');
      const heart = new Graphics().circle(0, 0, 4.2).fill('#ffffff');
      root.addChild(glow, ring, heart);
      root.position.set(x, -4);
      this.flares.push({ root, glow, ring });
      this.inner.addChild(root);
    }
    this.ship.addChild(this.inner);
    // The ship's own picture is 42 by 28; it turns about a point near its tail.
    this.ship.pivot.set(21, 23.8);
    this.inner.pivot.set(21, 14);
    this.beam.visible = this.ship.visible = false;
  }

  /** Where the ship is, left to right. */
  get x(): number {
    return this.shipX;
  }

  /** The ship fires. A wrong key turns it toward the key and flares red. */
  fire(miss: boolean, aimDeg: number): void {
    this.flashUntil = this.time + (miss ? FLASH_MISS_MS : FLASH_HIT_MS);
    this.flashIsMiss = miss;
    this.aimTarget = Math.max(-MAX_AIM_DEG, Math.min(MAX_AIM_DEG, aimDeg));
    this.aimResetAt = miss ? this.time + AIM_HOLD_MS : Number.POSITIVE_INFINITY;
    if (!miss) this.aimTarget = 0;
  }

  /** Back to rest, for a new Run. */
  reset(): void {
    this.aim = this.aimTarget = 0;
    this.aimResetAt = Number.POSITIVE_INFINITY;
    this.flashUntil = 0;
    this.recoil = 0;
    this.flare = 0;
  }

  /** The ship's place needs working out again: the layout changed. */
  snap(): void {
    this.visibleBefore = false;
  }

  /** Bring the beam and ship up to date, `frame.d` steps on. */
  update(frame: ShipFrame): void {
    const { targetX, color, shipY, d } = frame;
    const dtMs = d * STEP_MS;
    this.time += dtMs;
    const show = targetX !== null;
    this.beam.visible = this.ship.visible = show;
    if (!show) {
      this.visibleBefore = false;
      return;
    }
    if (!this.visibleBefore) {
      this.shipX = targetX;
      this.visibleBefore = true;
    } else if (dtMs > 0) {
      this.shipX += (targetX - this.shipX) * (1 - Math.exp(-dtMs / FOLLOW_MS));
    }

    if (this.time >= this.aimResetAt) {
      this.aimTarget = 0;
      this.aimResetAt = Number.POSITIVE_INFINITY;
    }
    const firing = this.flashUntil > this.time;
    if (dtMs > 0) {
      this.aim +=
        (this.aimTarget - this.aim) * (1 - Math.exp(-dtMs / FOLLOW_MS));
      const snap = 1 - Math.exp(-dtMs / SNAP_MS);
      this.recoil += ((firing ? 1 : 0) - this.recoil) * snap;
      this.flare += ((firing ? 1 : 0) - this.flare) * snap;
    }

    this.drawBeam(color, shipY);
    this.drawShip(color);

    this.ship.position.set(this.shipX, shipY - 26 + 23.8);
    this.ship.rotation = (this.aim * Math.PI) / 180;
    this.inner.position.set(21, 14 + 6 * this.recoil);
    this.inner.scale.set(1 - 0.1 * this.recoil);
    this.engine.alpha = pulseOpacity(this.time);

    const flareColor = this.flashIsMiss ? '#ef4444' : '#facc15';
    for (const flare of this.flares) {
      flare.root.visible = this.flare > 0.01;
      flare.root.alpha = this.flare;
      flare.root.scale.set(0.5 + 0.75 * this.flare);
      flare.glow.tint = flareColor;
      flare.ring.tint = flareColor;
    }
  }

  private drawBeam(color: string, shipY: number): void {
    const height = Math.max(20, shipY - 14);
    const x = this.shipX;
    if (this.drawnBeamHeight !== height) {
      this.drawnBeamHeight = height;
      BEAM_GLOW_BLURS.forEach((blur, i) => {
        // The glow a 2 px wide box casts, as long as the beam.
        this.shadows[i].show(2, height, 1, blur);
      });
      // The aura and the core are authored at fixed sizes and stretched to fit.
      this.aura.width = BEAM_AURA_WIDTH;
      this.aura.height = height;
      this.core.width = 2;
      this.core.height = height;
    }
    this.shadows.forEach((shadow, i) => {
      const pad = Math.ceil(BEAM_GLOW_BLURS[i] * 1.5);
      shadow.position.set(x - 1 - pad, -pad);
      shadow.tint = color;
    });
    this.aura.position.set(x, 0);
    this.aura.tint = color;
    this.core.position.set(x, 0);
    this.core.tint = color;
  }

  private drawShip(color: string): void {
    if (this.drawnColor === color) return;
    this.drawnColor = color;
    const e = this.engine;
    e.clear();
    e.ellipse(21, 24, 5.5, 3).fill(color);
    const h = this.hull;
    h.clear();
    h.ellipse(21, 25, 3, 1.5).fill('#ffffff');
    h.poly([
      21, 2, 25, 11, 38, 17, 41, 23, 30, 21, 24, 24, 21, 21, 18, 24, 12, 21, 1,
      23, 4, 17, 17, 11,
    ])
      .fill('#090d16')
      .stroke({ width: 1.6, color });
    h.poly([21, 6, 23.5, 14, 21, 17, 18.5, 14]).fill({
      color: '#38bdf8',
      alpha: 0.95,
    });
    h.roundRect(13, 2, 2.5, 9, 1)
      .fill('#f8fafc')
      .stroke({ width: 0.5, color: '#334155' });
    h.roundRect(26.5, 2, 2.5, 9, 1)
      .fill('#f8fafc')
      .stroke({ width: 0.5, color: '#334155' });
  }
}
