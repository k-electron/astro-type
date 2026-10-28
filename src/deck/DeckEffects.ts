import { Container, Graphics, Rectangle, Sprite, Text } from 'pixi.js';
import type { Grade } from '../game/rules';
import { hitPopupLabel, hitPopupsToPrepare, hitPopupStems } from './hitPopups';
import { Pool } from './pool';
import {
  CRYSTAL_SIZE,
  DOT_RADIUS,
  diamondTexture,
  dotTexture,
  FLASH_RADIUS,
  flashTexture,
  GlowSprite,
  SHARD_SIZE,
  SOFT_RADIUS,
  shardTexture,
  softDotTexture,
} from './textures';

/**
 * What the Action Deck does when a Judgement lands: the laser, the lock on the
 * Drone, the explosion, the popup. Ported from the DOM deck's canvas effects
 * with the same numbers, with three differences in how they run:
 *
 * - They answer a Judgement event, handed in by `fireHit` and `fireMiss`.
 * - They advance by `d`, a length of time in steps of 1/60 s taken from the Run
 *   clock, not by one per drawn frame. At 60 Hz that is exactly the DOM deck's
 *   per-frame constants; at 120 Hz an effect still lasts the same real time,
 *   and with `d` at zero (a pause) nothing moves.
 * - Sparks, debris, crystals, flashes, shockwaves and bolts live in pools made
 *   once, and the particles are batched sprites, so a hit allocates nothing.
 *
 * Nothing here reads the game: the scene tells it where things are, and what
 * the hit scored.
 */

/** A Drone has been hit and the laser is on its way. */
export interface HitShot {
  /** Where the locked Drone is held: its lane and its top edge. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Where the cannons fire from. */
  originY: number;
  isSpace: boolean;
  grade: Grade;
  /** The points the hit scored, and whether Overdrive doubled them. */
  points: number;
  overdrive: boolean;
  /** What is printed on the Drone. */
  display: string;
  /** The lane's colour. */
  laneColor: string;
  /** The Judgement's colour. */
  hitColor: string;
}

/** The wrong key was struck. */
export interface MissShot {
  fromX: number;
  fromY: number;
  /** Where the red laser lands: the keycap that was pressed. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** The perpendicular unit vector across the twin barrels. */
  normalX: number;
  normalY: number;
  distance: number;
  /** What the popup names: the key struck. */
  keyName: string;
}

interface Bolt {
  /** The two barrels' start and end points. */
  sx1: number;
  sy1: number;
  sx2: number;
  sy2: number;
  tx1: number;
  ty1: number;
  tx2: number;
  ty2: number;
  /** Where it lands, and the size of the thing it lands on. */
  tx: number;
  ty: number;
  w: number;
  h: number;
  cx1: number;
  cy1: number;
  cx2: number;
  cy2: number;
  distance: number;
  traveled: number;
  speed: number;
  color: string;
  hitColor: string;
  isSpace: boolean;
  /** Hit grade, or null for the red laser of a wrong key. */
  grade: Grade | null;
  /** What the hit scored, for its popup, and whether Overdrive doubled it. */
  points: number;
  overdrive: boolean;
  keyName: string;
  /** The locked Drone drawn at the target while the laser flies. */
  locked: { display: string; color: string } | null;
  glyph: Text | null;
  life: number;
  maxLife: number;
  /** Time since the last trail spark. */
  trail: number;
  detonated: boolean;
  /** Drawn one last time on the frame it lands, then dropped. */
  done: boolean;
  heads: [Sprite, Sprite];
  cores: [Sprite, Sprite];
}

interface Spark {
  sprite: Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
}

interface Shard extends Spark {
  rotation: number;
  spin: number;
}

interface Crystal extends Spark {
  root: Container;
  glow: Sprite;
  body: Sprite;
  glint: Sprite;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

interface Flash {
  sprite: Sprite;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

/** The hull of a destroyed Drone, vaporising in white light. */
interface Ghost {
  glow: GlowSprite;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  life: number;
  maxLife: number;
}

interface Popup {
  text: Text;
  key: string;
  vy: number;
  life: number;
  maxLife: number;
}

const POPUP_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

/** An area that Pixi sizes things by but never counts as hit. */
class Untouchable extends Rectangle {
  override contains(): boolean {
    return false;
  }
}

/** One of the items at random; with only one to pick, no random number is drawn. */
const pick = <T>(items: readonly T[]): T =>
  items.length === 1
    ? items[0]
    : items[Math.floor(Math.random() * items.length)];

export interface DeckEffectsOptions {
  resolution: number;
}

export class DeckEffects {
  /** Everything the effects draw, to sit above the rest of the deck. */
  readonly root = new Container();
  private readonly lockGraphics = new Graphics();
  private readonly glyphLayer = new Container();
  private readonly boltGraphics = new Graphics();
  private readonly boltSprites = new Container();
  private readonly flashLayer = new Container();
  private readonly ghostLayer = new Container();
  private readonly ghostGraphics = new Graphics();
  private readonly shardLayer = new Container();
  private readonly sparkLayer = new Container();
  private readonly waveGraphics = new Graphics();
  private readonly crystalLayer = new Container();
  private readonly popupLayer = new Container();

  private readonly bolts = new Pool<Bolt>(() => this.makeBolt(), 8);
  private readonly sparks = new Pool<Spark>(
    () => this.makeSpark(this.sparkLayer),
    1500,
  );
  private readonly shards = new Pool<Shard>(() => this.makeShard(), 700);
  private readonly crystals = new Pool<Crystal>(() => this.makeCrystal(), 80);
  private readonly waves = new Pool<Shockwave>(
    () => ({
      x: 0,
      y: 0,
      radius: 0,
      maxRadius: 0,
      color: '#fff',
      alpha: 0,
    }),
    80,
  );
  private readonly flashes = new Pool<Flash>(() => this.makeFlash(), 24);
  private readonly ghosts = new Pool<Ghost>(() => this.makeGhost(), 24);
  private readonly popups = new Pool<Popup>(
    () => ({
      text: null as unknown as Text,
      key: '',
      vy: 0,
      life: 0,
      maxLife: 0,
    }),
    40,
  );
  /** Rasterised text kept for reuse, by label and colour. */
  private readonly spareText = new Map<string, Text[]>();
  private readonly resolution: number;
  private drawnEmpty = true;

  constructor(options: DeckEffectsOptions) {
    this.resolution = options.resolution;
    // Nothing in here is something a screen reader should read, but the hit
    // popups, so the walk skips every layer except the popups.
    for (const layer of [
      this.glyphLayer,
      this.boltSprites,
      this.flashLayer,
      this.ghostLayer,
      this.shardLayer,
      this.sparkLayer,
      this.crystalLayer,
      this.popupLayer,
    ]) {
      layer.accessibleChildren = false;
    }
    this.popupLayer.accessibleChildren = true;
    this.root.addChild(
      this.lockGraphics,
      this.glyphLayer,
      this.boltGraphics,
      this.boltSprites,
      this.flashLayer,
      this.ghostLayer,
      this.ghostGraphics,
      this.shardLayer,
      this.sparkLayer,
      this.waveGraphics,
      this.crystalLayer,
      this.popupLayer,
    );
    // Prepare every hit popup up front, so the first hit costs no more than the rest.
    for (const { label, color } of hitPopupsToPrepare()) {
      this.giveText(
        `${label}|${color}`,
        this.makePopupText(label, color, true),
      );
    }
  }

  // ---- Making things ----

  private makeBolt(): Bolt {
    const head = () => {
      const sprite = new Sprite(softDotTexture());
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.boltSprites.addChild(sprite);
      return sprite;
    };
    const core = () => {
      const sprite = new Sprite(dotTexture());
      sprite.anchor.set(0.5);
      sprite.visible = false;
      this.boltSprites.addChild(sprite);
      return sprite;
    };
    return {
      sx1: 0,
      sy1: 0,
      sx2: 0,
      sy2: 0,
      tx1: 0,
      ty1: 0,
      tx2: 0,
      ty2: 0,
      tx: 0,
      ty: 0,
      w: 0,
      h: 0,
      cx1: 0,
      cy1: 0,
      cx2: 0,
      cy2: 0,
      distance: 1,
      traveled: 0,
      speed: 0,
      color: '#fff',
      hitColor: '#fff',
      isSpace: false,
      grade: null,
      points: 0,
      overdrive: false,
      keyName: '',
      locked: null,
      glyph: null,
      life: 0,
      maxLife: 0,
      trail: 0,
      detonated: false,
      done: false,
      heads: [head(), head()],
      cores: [core(), core()],
    };
  }

  private makeSpark(layer: Container): Spark {
    const sprite = new Sprite(dotTexture());
    sprite.anchor.set(0.5);
    sprite.visible = false;
    layer.addChild(sprite);
    return {
      sprite,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 0,
      life: 0,
      maxLife: 1,
    };
  }

  private makeShard(): Shard {
    const sprite = new Sprite(shardTexture());
    sprite.anchor.set(0.5);
    sprite.visible = false;
    this.shardLayer.addChild(sprite);
    return {
      sprite,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 0,
      life: 0,
      maxLife: 1,
      rotation: 0,
      spin: 0,
    };
  }

  private makeCrystal(): Crystal {
    const root = new Container();
    root.visible = false;
    root.accessibleChildren = false;
    const glow = new Sprite(softDotTexture());
    const body = new Sprite(diamondTexture());
    const glint = new Sprite(dotTexture());
    for (const part of [glow, body, glint]) part.anchor.set(0.5);
    glint.tint = '#ffffff';
    root.addChild(glow, body, glint);
    this.crystalLayer.addChild(root);
    return {
      sprite: body,
      root,
      glow,
      body,
      glint,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 0,
      life: 0,
      maxLife: 1,
    };
  }

  private makeFlash(): Flash {
    const sprite = new Sprite(flashTexture());
    sprite.anchor.set(0.5);
    sprite.visible = false;
    this.flashLayer.addChild(sprite);
    return { sprite, x: 0, y: 0, radius: 0, maxRadius: 0, alpha: 0 };
  }

  private makeGhost(): Ghost {
    const glow = new GlowSprite();
    glow.anchor.set(0.5);
    glow.visible = false;
    this.ghostLayer.addChild(glow);
    return { glow, x: 0, y: 0, w: 0, h: 0, color: '#fff', life: 0, maxLife: 0 };
  }

  private makePopupText(label: string, color: string, named: boolean): Text {
    const text = new Text({
      text: label,
      style: {
        fontFamily: POPUP_FONT,
        fontSize: 16,
        fontWeight: '900',
        fill: color,
        dropShadow: { color: '#000000', alpha: 1, blur: 10, distance: 0 },
      },
      resolution: this.resolution,
    });
    text.anchor.set(0.5, 0.8);
    text.visible = false;
    if (named) this.nameForAccessibility(text, label);
    return text;
  }

  /**
   * Accessibility layer: a hit popup's whole text, like "Drone F" for a Drone,
   * so it ends with the points the hit scored.
   * The name is there only while the popup is in the tree and visible, so it
   * goes when the popup fades. Not a tab stop and never in the way of a click.
   */
  private nameForAccessibility(text: Text, label: string): void {
    text.accessible = true;
    text.accessibleType = 'div';
    text.accessibleHint = label;
    text.accessibleText = label;
    text.accessiblePointerEvents = 'none';
    text.eventMode = 'static';
    // Pixi sizes the layer's element by the hit area: as big as the text, but
    // nothing counts as a hit, so a tap goes through to the keycap beneath.
    const { x, y, width, height } = text.getLocalBounds().rectangle;
    text.hitArea = new Untouchable(x, y, width, height);
    text.tabIndex = -1;
  }

  private takeText(key: string, make: () => Text): Text {
    return this.spareText.get(key)?.pop() ?? make();
  }

  private giveText(key: string, text: Text): void {
    text.visible = false;
    let list = this.spareText.get(key);
    if (!list) {
      list = [];
      this.spareText.set(key, list);
    }
    list.push(text);
  }

  // ---- Firing ----

  /** A hit: twin lasers fly up the lane to the locked Drone. */
  fireHit(shot: HitShot): void {
    const spacing = shot.isSpace ? 14 : 7;
    const bolt = this.bolts.acquire();
    if (!bolt) {
      // Every laser is in flight (a burst of hits before a frame is drawn):
      // the hit still names the points it scored.
      this.hitPopup(shot, shot.hitColor, shot.x, shot.y);
      return;
    }
    const x1 = shot.x - spacing;
    const x2 = shot.x + spacing;
    bolt.sx1 = x1;
    bolt.sy1 = shot.originY;
    bolt.sx2 = x2;
    bolt.sy2 = shot.originY;
    bolt.tx1 = x1;
    bolt.ty1 = shot.y;
    bolt.tx2 = x2;
    bolt.ty2 = shot.y;
    bolt.tx = shot.x;
    bolt.ty = shot.y;
    bolt.w = shot.w;
    bolt.h = shot.h;
    bolt.distance = Math.max(1, shot.originY - shot.y);
    bolt.speed = 46;
    bolt.color = shot.isSpace ? '#10b981' : shot.laneColor;
    bolt.hitColor = shot.hitColor;
    bolt.isSpace = shot.isSpace;
    bolt.grade = shot.grade;
    bolt.points = shot.points;
    bolt.overdrive = shot.overdrive;
    bolt.keyName = '';
    bolt.locked = { display: shot.display, color: shot.laneColor };
    const key = `glyph|${shot.display}`;
    bolt.glyph = this.takeText(key, () => {
      const glyph = new Text({
        text: shot.display,
        style: {
          fontFamily: 'monospace',
          fontSize: 20,
          fontWeight: '700',
          fill: '#ffffff',
        },
        resolution: this.resolution,
      });
      glyph.anchor.set(0.5);
      return glyph;
    });
    bolt.glyph.visible = true;
    this.glyphLayer.addChild(bolt.glyph);
    this.resetBolt(bolt);
  }

  /** A wrong key: a red laser flies from the ship to the key that was struck. */
  fireMiss(shot: MissShot): void {
    const bolt = this.bolts.acquire();
    if (!bolt) return;
    const { normalX: nx, normalY: ny } = shot;
    bolt.sx1 = shot.fromX + nx * 6;
    bolt.sy1 = shot.fromY + ny * 6;
    bolt.sx2 = shot.fromX - nx * 6;
    bolt.sy2 = shot.fromY - ny * 6;
    bolt.tx1 = shot.x + nx * 4;
    bolt.ty1 = shot.y + ny * 4;
    bolt.tx2 = shot.x - nx * 4;
    bolt.ty2 = shot.y - ny * 4;
    bolt.tx = shot.x;
    bolt.ty = shot.y;
    bolt.w = shot.w;
    bolt.h = shot.h;
    bolt.distance = shot.distance;
    bolt.speed = 40;
    bolt.color = '#f43f5e';
    bolt.hitColor = '#ef4444';
    bolt.isSpace = false;
    bolt.grade = null;
    bolt.keyName = shot.keyName;
    bolt.locked = null;
    bolt.glyph = null;
    this.resetBolt(bolt);
  }

  private resetBolt(bolt: Bolt): void {
    bolt.traveled = 0;
    bolt.life = 0;
    bolt.maxLife = 24;
    bolt.trail = 0;
    bolt.detonated = false;
    bolt.done = false;
    bolt.cx1 = bolt.sx1;
    bolt.cy1 = bolt.sy1;
    bolt.cx2 = bolt.sx2;
    bolt.cy2 = bolt.sy2;
    this.placeBoltSprites(bolt);
  }

  private placeBoltSprites(bolt: Bolt): void {
    const width = bolt.isSpace ? 5 : 3.5;
    const points: [number, number][] = [
      [bolt.cx1, bolt.cy1],
      [bolt.cx2, bolt.cy2],
    ];
    for (let i = 0; i < 2; i++) {
      const [x, y] = points[i];
      const head = bolt.heads[i];
      head.visible = true;
      head.position.set(x, y);
      head.tint = bolt.color;
      head.scale.set((width * 3.5) / SOFT_RADIUS);
      const core = bolt.cores[i];
      core.visible = true;
      core.position.set(x, y);
      core.tint = '#ffffff';
      core.scale.set((width * 1.2) / DOT_RADIUS);
    }
  }

  // ---- Time ----

  /** Is anything playing? */
  get active(): boolean {
    return (
      this.bolts.active.length > 0 ||
      this.sparks.active.length > 0 ||
      this.shards.active.length > 0 ||
      this.crystals.active.length > 0 ||
      this.waves.active.length > 0 ||
      this.flashes.active.length > 0 ||
      this.ghosts.active.length > 0 ||
      this.popups.active.length > 0
    );
  }

  /** Stop everything at once: a new Run, or the Run abandoned. */
  clear(): void {
    this.bolts.clear((bolt) => this.hideBolt(bolt));
    this.sparks.clear((p) => {
      p.sprite.visible = false;
    });
    this.shards.clear((p) => {
      p.sprite.visible = false;
    });
    this.crystals.clear((p) => {
      p.root.visible = false;
    });
    this.waves.clear();
    this.flashes.clear((f) => {
      f.sprite.visible = false;
    });
    this.ghosts.clear((g) => {
      g.glow.visible = false;
      g.glow.release();
    });
    this.popups.clear((p) => this.giveText(p.key, p.text));
    this.draw();
  }

  private hideBolt(bolt: Bolt): void {
    for (const sprite of [...bolt.heads, ...bolt.cores]) sprite.visible = false;
    if (bolt.glyph) {
      this.giveText(`glyph|${bolt.locked?.display ?? ''}`, bolt.glyph);
      bolt.glyph = null;
    }
  }

  /**
   * Move everything on by `d` steps of 1/60 s. Call only with `d` above zero:
   * this is where new sparks are born, and a paused deck makes none.
   */
  advance(d: number): void {
    for (let i = this.bolts.active.length - 1; i >= 0; i--) {
      const bolt = this.bolts.active[i];
      if (bolt.done) {
        this.hideBolt(bolt);
        this.bolts.releaseAt(i);
      }
    }
    for (const bolt of this.bolts.active) this.advanceBolt(bolt, d);

    for (let i = this.flashes.active.length - 1; i >= 0; i--) {
      const f = this.flashes.active[i];
      f.radius += (f.maxRadius - f.radius) * (1 - 0.65 ** d);
      f.alpha -= 0.12 * d;
      if (f.alpha <= 0) {
        f.sprite.visible = false;
        this.flashes.releaseAt(i);
        continue;
      }
      f.sprite.position.set(f.x, f.y);
      f.sprite.scale.set(f.radius / FLASH_RADIUS);
      f.sprite.alpha = f.alpha;
    }

    for (let i = this.ghosts.active.length - 1; i >= 0; i--) {
      const g = this.ghosts.active[i];
      g.life += d;
      if (g.life >= g.maxLife) {
        g.glow.visible = false;
        g.glow.release();
        this.ghosts.releaseAt(i);
        continue;
      }
      const progress = g.life / g.maxLife;
      g.glow.scale.set(1 + progress * 0.25);
      g.glow.alpha = (1 - progress) * 0.8;
    }

    for (let i = this.shards.active.length - 1; i >= 0; i--) {
      const p = this.shards.active[i];
      p.x += p.vx * d;
      p.y += p.vy * d;
      p.vy += 0.28 * d;
      p.rotation += p.spin * d;
      p.life += d;
      const a = 1 - p.life / p.maxLife;
      if (a <= 0) {
        p.sprite.visible = false;
        this.shards.releaseAt(i);
        continue;
      }
      p.sprite.position.set(p.x, p.y);
      p.sprite.rotation = p.rotation;
      p.sprite.alpha = a;
    }

    for (let i = this.sparks.active.length - 1; i >= 0; i--) {
      const p = this.sparks.active[i];
      p.x += p.vx * d;
      p.y += p.vy * d;
      p.vy += 0.24 * d;
      p.life += d;
      const a = 1 - p.life / p.maxLife;
      if (a <= 0) {
        p.sprite.visible = false;
        this.sparks.releaseAt(i);
        continue;
      }
      p.sprite.position.set(p.x, p.y);
      p.sprite.scale.set(Math.max(0.01, (p.size * a) / DOT_RADIUS));
      p.sprite.alpha = a;
    }

    for (let i = this.waves.active.length - 1; i >= 0; i--) {
      const w = this.waves.active[i];
      w.radius += (w.maxRadius - w.radius) * (1 - 0.82 ** d);
      w.alpha -= 0.042 * d;
      if (w.alpha <= 0) this.waves.releaseAt(i);
    }

    for (let i = this.crystals.active.length - 1; i >= 0; i--) {
      const c = this.crystals.active[i];
      c.x += c.vx * d;
      c.y += c.vy * d;
      c.vy += 0.12 * d;
      c.life += d;
      const a = 1 - c.life / c.maxLife;
      if (a <= 0) {
        c.root.visible = false;
        this.crystals.releaseAt(i);
        continue;
      }
      c.root.position.set(c.x, c.y);
      c.root.alpha = a;
    }

    for (let i = this.popups.active.length - 1; i >= 0; i--) {
      const p = this.popups.active[i];
      p.text.y += p.vy * d;
      p.life += d;
      const a = 1 - p.life / p.maxLife;
      if (a <= 0) {
        this.popupLayer.removeChild(p.text);
        this.giveText(p.key, p.text);
        this.popups.releaseAt(i);
        continue;
      }
      p.text.alpha = a;
    }
  }

  private advanceBolt(bolt: Bolt, d: number): void {
    bolt.traveled += bolt.speed * d;
    bolt.life += d;
    const t = Math.min(1, bolt.traveled / bolt.distance);
    bolt.cx1 = bolt.sx1 + (bolt.tx1 - bolt.sx1) * t;
    bolt.cy1 = bolt.sy1 + (bolt.ty1 - bolt.sy1) * t;
    bolt.cx2 = bolt.sx2 + (bolt.tx2 - bolt.sx2) * t;
    bolt.cy2 = bolt.sy2 + (bolt.ty2 - bolt.sy2) * t;
    this.placeBoltSprites(bolt);

    // The DOM deck leaves a trail of ion sparks every frame; here, every step.
    bolt.trail += d;
    while (bolt.trail >= 1) {
      bolt.trail -= 1;
      for (const [x, y] of [
        [bolt.cx1, bolt.cy1],
        [bolt.cx2, bolt.cy2],
      ]) {
        if (Math.random() > 0.35) {
          this.spark(
            x + (Math.random() - 0.5) * 4,
            y + (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 1.5,
            (Math.random() - 0.5) * 1.5,
            Math.random() > 0.5 ? '#ffffff' : bolt.color,
            2 + Math.random() * 2.5,
            10 + Math.random() * 8,
          );
        }
      }
    }

    if (t >= 1 && !bolt.detonated) {
      bolt.detonated = true;
      this.detonate(bolt);
    }
    if (bolt.detonated || bolt.life >= bolt.maxLife) bolt.done = true;
  }

  // ---- Explosions ----

  private spark(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: string,
    size: number,
    maxLife: number,
  ): void {
    const p = this.sparks.acquire();
    if (!p) return;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.size = size;
    p.life = 0;
    p.maxLife = maxLife;
    p.sprite.tint = color;
    p.sprite.visible = true;
    p.sprite.position.set(x, y);
    p.sprite.scale.set(size / DOT_RADIUS);
    p.sprite.alpha = 1;
  }

  private shockwave(
    x: number,
    y: number,
    radius: number,
    maxRadius: number,
    color: string,
    alpha: number,
  ): void {
    const w = this.waves.acquire();
    if (!w) return;
    w.x = x;
    w.y = y;
    w.radius = radius;
    w.maxRadius = maxRadius;
    w.color = color;
    w.alpha = alpha;
  }

  private popup(
    label: string,
    color: string,
    x: number,
    y: number,
    maxLife: number,
    vy: number,
    named: boolean,
  ): void {
    const slot = this.popups.acquire();
    if (!slot) return;
    const key = `${label}|${color}`;
    const text = this.takeText(key, () =>
      this.makePopupText(label, color, named),
    );
    text.position.set(x, y);
    text.alpha = 1;
    text.visible = true;
    this.popupLayer.addChild(text);
    slot.text = text;
    slot.key = key;
    slot.vy = vy;
    slot.life = 0;
    slot.maxLife = maxLife;
  }

  /** The popup of a hit: a few words, then the points that hit scored. */
  private hitPopup(
    hit: Pick<HitShot, 'isSpace' | 'points' | 'overdrive'> & {
      grade: Grade | null;
    },
    color: string,
    x: number,
    y: number,
  ): void {
    if (!hit.grade) return;
    const stems = hitPopupStems({
      grade: hit.grade,
      isSpace: hit.isSpace,
      overdrive: hit.overdrive,
    });
    this.popup(
      hitPopupLabel(pick(stems), hit.points),
      color,
      x,
      y - 26,
      40,
      -2.6,
      true,
    );
  }

  private detonate(bolt: Bolt): void {
    const { tx: x, ty: y, w, isSpace, hitColor, color } = bolt;
    if (bolt.grade) {
      const perfect = bolt.grade === 'perfect';
      // The Drone's hull vaporises where it was held.
      const ghost = this.ghosts.acquire();
      if (ghost) {
        ghost.x = x;
        ghost.y = y;
        ghost.w = w;
        ghost.h = bolt.h;
        ghost.color = color;
        ghost.life = 0;
        ghost.maxLife = 15;
        ghost.glow.show(w, bolt.h, 0, 20);
        ghost.glow.tint = color;
        ghost.glow.position.set(x, y);
        ghost.glow.scale.set(1);
        ghost.glow.alpha = 0.8;
        ghost.glow.visible = true;
      }

      const flash = this.flashes.acquire();
      if (flash) {
        flash.x = x;
        flash.y = y;
        flash.radius = 12;
        flash.maxRadius = isSpace ? 85 : 60;
        flash.alpha = 1;
        flash.sprite.visible = true;
        flash.sprite.position.set(x, y);
        flash.sprite.scale.set(12 / FLASH_RADIUS);
        flash.sprite.alpha = 1;
      }

      const debrisCount = perfect ? (isSpace ? 30 : 22) : 15;
      for (let i = 0; i < debrisCount; i++) {
        const p = this.shards.acquire();
        if (!p) break;
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 9;
        p.x = x + (Math.random() - 0.5) * (w * 0.5);
        p.y = y;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed - 2.8;
        p.rotation = Math.random() * Math.PI * 2;
        p.spin = (Math.random() - 0.5) * 0.5;
        p.size = 4.5 + Math.random() * 6.5;
        p.life = 0;
        p.maxLife = 32 + Math.random() * 18;
        p.sprite.tint =
          i % 2 === 0 ? color : i % 3 === 0 ? '#ffffff' : '#334155';
        p.sprite.visible = true;
        p.sprite.position.set(p.x, p.y);
        p.sprite.rotation = p.rotation;
        p.sprite.scale.set(p.size / SHARD_SIZE);
        p.sprite.alpha = 1;
      }

      const sparkCount = perfect ? (isSpace ? 55 : 40) : 26;
      for (let i = 0; i < sparkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4.5 + Math.random() * 9.5;
        this.spark(
          x + (Math.random() - 0.5) * (w * 0.4),
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed - 1.5,
          i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? hitColor : '#f97316',
          3 + Math.random() * 4.5,
          28 + Math.random() * 20,
        );
      }

      const crystalCount = perfect ? (isSpace ? 4 : 3) : 2;
      for (let i = 0; i < crystalCount; i++) {
        const c = this.crystals.acquire();
        if (!c) break;
        const crystalColor = isSpace
          ? '#34d399'
          : i === 0
            ? '#38bdf8'
            : '#fbbf24';
        c.x = x + (Math.random() - 0.5) * 24;
        c.y = y;
        c.vx = (Math.random() - 0.5) * 5.5;
        c.vy = -(5 + Math.random() * 4);
        c.size = 6 + Math.random() * 3.5;
        c.life = 0;
        c.maxLife = 42 + Math.random() * 12;
        c.body.tint = crystalColor;
        c.glow.tint = crystalColor;
        c.glow.alpha = 0.5;
        c.glow.scale.set((c.size * 1.8) / SOFT_RADIUS);
        c.body.scale.set(c.size / CRYSTAL_SIZE);
        c.glint.scale.set((c.size * 0.35) / DOT_RADIUS);
        c.root.position.set(c.x, c.y);
        c.root.alpha = 1;
        c.root.visible = true;
      }

      this.shockwave(x, y, 12, isSpace ? w * 1.6 : w * 2.2, hitColor, 1);
      this.shockwave(x, y, 6, isSpace ? w * 2.2 : w * 2.8, '#ffffff', 0.9);

      this.hitPopup(bolt, hitColor, x, y);
    } else {
      this.shockwave(x, y, 8, w * 1.3, '#ef4444', 1);
      for (let i = 0; i < 24; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2.5 + Math.random() * 6.5;
        this.spark(
          x,
          y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed - 1,
          i % 2 === 0 ? '#ef4444' : '#fca5a5',
          2.5 + Math.random() * 3.5,
          22 + Math.random() * 10,
        );
      }
      this.popup(
        `❌ WRONG KEY: [${bolt.keyName || 'MISFIRE'}]`,
        '#ef4444',
        x,
        y - 22,
        38,
        -2,
        false,
      );
    }
  }

  // ---- Drawing ----

  /**
   * Redraw the shapes that are not sprites: the lasers, the locked Drone, the
   * vaporising hulls and the shockwave rings. Draws the same picture for the
   * same state, so a paused deck can redraw freely.
   */
  draw(): void {
    const empty =
      this.bolts.active.length === 0 &&
      this.ghosts.active.length === 0 &&
      this.waves.active.length === 0;
    if (empty && this.drawnEmpty) return;
    this.drawnEmpty = empty;

    const lock = this.lockGraphics;
    lock.clear();
    const beams = this.boltGraphics;
    beams.clear();
    for (const bolt of this.bolts.active) {
      this.drawLockedDrone(lock, bolt);
      this.drawBeams(beams, bolt);
    }

    const g = this.ghostGraphics;
    g.clear();
    for (const ghost of this.ghosts.active) {
      const progress = ghost.life / ghost.maxLife;
      const a = Math.max(0, 1 - progress);
      const scale = 1 + progress * 0.25;
      const w = ghost.w * scale;
      const h = ghost.h * scale;
      // The fill is drawn with the whole hull's alpha on top of its own.
      g.rect(ghost.x - w / 2, ghost.y - h / 2, w, h).stroke({
        width: 3 * scale,
        color: '#ffffff',
        alpha: a,
      });
      g.rect(ghost.x - w / 2, ghost.y - h / 2, w, h).fill({
        color: '#ffffff',
        alpha: a * a * 0.85,
      });
    }

    const rings = this.waveGraphics;
    rings.clear();
    for (const wave of this.waves.active) {
      rings.circle(wave.x, wave.y, wave.radius).stroke({
        width: 2.5,
        color: wave.color,
        alpha: Math.max(0, wave.alpha),
      });
    }
  }

  /** The Drone the laser is locked on, held where it was hit, with its lock-on brackets. */
  private drawLockedDrone(g: Graphics, bolt: Bolt): void {
    const show = Boolean(bolt.locked) && !bolt.detonated;
    if (bolt.glyph) bolt.glyph.visible = show;
    if (!bolt.locked || !show) return;
    const { color } = bolt.locked;
    const hw = bolt.w / 2;
    const hh = bolt.h / 2;
    const len = 7;
    const x = bolt.tx;
    const y = bolt.ty;
    // The brackets, with the soft edge of their glow.
    for (const [width, alpha] of [
      [5, 0.18],
      [1.8, 1],
    ] as const) {
      g.moveTo(x - hw - 4, y - hh + len - 4)
        .lineTo(x - hw - 4, y - hh - 4)
        .lineTo(x - hw + len - 4, y - hh - 4);
      g.moveTo(x + hw - len + 4, y - hh - 4)
        .lineTo(x + hw + 4, y - hh - 4)
        .lineTo(x + hw + 4, y - hh + len - 4);
      g.moveTo(x - hw - 4, y + hh - len + 4)
        .lineTo(x - hw - 4, y + hh + 4)
        .lineTo(x - hw + len - 4, y + hh + 4);
      g.moveTo(x + hw - len + 4, y + hh + 4)
        .lineTo(x + hw + 4, y + hh + 4)
        .lineTo(x + hw + 4, y + hh - len + 4);
      g.stroke({ width, color: bolt.color, alpha });
    }
    // The hostile hull, as the laser sees it.
    g.roundRect(x - hw, y - hh, bolt.w, bolt.h, 6)
      .fill('#020617')
      .stroke({ width: 2, color });
    g.circle(x - hw + 8, y - hh - 2, 2.5).fill(color);
    g.circle(x + hw - 8, y - hh - 2, 2.5).fill(color);
    if (bolt.glyph) bolt.glyph.position.set(x, y + 1);
  }

  private drawBeams(g: Graphics, bolt: Bolt): void {
    const width = bolt.isSpace ? 5 : 3.5;
    const lines = () => {
      g.moveTo(bolt.sx1, bolt.sy1)
        .lineTo(bolt.cx1, bolt.cy1)
        .moveTo(bolt.sx2, bolt.sy2)
        .lineTo(bolt.cx2, bolt.cy2);
    };
    // The plasma sheath and its glow, then the white-hot core.
    for (const [extra, alpha] of [
      [14, 0.08],
      [7, 0.14],
      [0, 0.55],
    ] as const) {
      lines();
      g.stroke({ width: width * 2.8 + extra, color: bolt.color, alpha });
    }
    lines();
    g.stroke({ width, color: '#ffffff', alpha: 0.95 });
  }
}
