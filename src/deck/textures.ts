import { Sprite, Texture } from 'pixi.js';

/**
 * The few textures the effects are made from. Each is painted once on a 2D
 * canvas, white on transparent, and given its colour with a tint, so the
 * explosions are batches of sprites rather than shapes redrawn every frame.
 * Textures own GPU memory, so they are dropped with the renderer.
 */

const cache = new Map<string, Texture>();

function canvasTexture(
  width: number,
  height: number,
  paint: (ctx: CanvasRenderingContext2D) => void,
): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) paint(ctx);
  return Texture.from(canvas);
}

function cached(key: string, make: () => Texture): Texture {
  let texture = cache.get(key);
  if (!texture) {
    texture = make();
    cache.set(key, texture);
  }
  return texture;
}

/** Drop every texture (hot reload, or the renderer going away). */
export function resetTextures(): void {
  for (const texture of cache.values()) texture.destroy(true);
  cache.clear();
  for (const entry of glows.values()) entry.texture.destroy(true);
  glows.clear();
}

/** Radius, in texture pixels, of the shapes below. Sprites scale from it. */
export const DOT_RADIUS = 16;

/** A solid white disc of radius `DOT_RADIUS`. */
export function dotTexture(): Texture {
  return cached('dot', () =>
    canvasTexture(DOT_RADIUS * 2, DOT_RADIUS * 2, (ctx) => {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(DOT_RADIUS, DOT_RADIUS, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }),
  );
}

/**
 * The hull shard that debris is made of: the DOM deck's four-point polygon at
 * size 1, drawn here at `SHARD_SIZE` pixels so a sprite scales by size / SHARD_SIZE.
 */
export const SHARD_SIZE = 16;
export function shardTexture(): Texture {
  const s = SHARD_SIZE;
  return cached('shard', () =>
    canvasTexture(s * 3, s * 3, (ctx) => {
      ctx.translate(s * 1.5, s * 1.5);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(-s, -s * 0.6);
      ctx.lineTo(s * 0.8, -s * 0.4);
      ctx.lineTo(s * 0.5, s * 0.8);
      ctx.lineTo(-s * 0.7, s * 0.5);
      ctx.closePath();
      ctx.fill();
    }),
  );
}

/** An energy crystal: a diamond of half-height `CRYSTAL_SIZE`. */
export const CRYSTAL_SIZE = 16;
export function diamondTexture(): Texture {
  const s = CRYSTAL_SIZE;
  return cached('diamond', () =>
    canvasTexture(s * 2, s * 2, (ctx) => {
      ctx.translate(s, s);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.7, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.7, 0);
      ctx.closePath();
      ctx.fill();
    }),
  );
}

/**
 * A soft disc: solid to 40 % of its radius, then fading out to nothing. Used
 * tinted for the glow around crystals and the heads of laser bolts.
 */
export const SOFT_RADIUS = 32;
export function softDotTexture(): Texture {
  return cached('soft', () =>
    canvasTexture(SOFT_RADIUS * 2, SOFT_RADIUS * 2, (ctx) => {
      const gradient = ctx.createRadialGradient(
        SOFT_RADIUS,
        SOFT_RADIUS,
        0,
        SOFT_RADIUS,
        SOFT_RADIUS,
        SOFT_RADIUS,
      );
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.4, 'rgba(255,255,255,1)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, SOFT_RADIUS * 2, SOFT_RADIUS * 2);
    }),
  );
}

/** The detonation flash: white at the middle, warm at 40 %, gone at the edge. */
export const FLASH_RADIUS = 64;
export function flashTexture(): Texture {
  return cached('flash', () =>
    canvasTexture(FLASH_RADIUS * 2, FLASH_RADIUS * 2, (ctx) => {
      const gradient = ctx.createRadialGradient(
        FLASH_RADIUS,
        FLASH_RADIUS,
        0,
        FLASH_RADIUS,
        FLASH_RADIUS,
        FLASH_RADIUS,
      );
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.4, 'rgba(255,240,180,0.75)');
      gradient.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, FLASH_RADIUS * 2, FLASH_RADIUS * 2);
    }),
  );
}

/** A soft box glow around a `w` by `h` rounded rectangle, in a texture padded to hold the blur. */
export interface BoxGlow {
  texture: Texture;
  /** How far the texture extends past the box on every side. */
  pad: number;
}

/**
 * A box glow in the cache. A glow whose size follows the layout (a keycap's, a
 * Drone's, the keyboard's shadow, the beam's) is held by the `GlowSprite`
 * showing it, and `holders` counts them. One made by `boxGlow` for a fixed
 * size is `pinned`: it stays until `resetTextures`.
 */
interface GlowEntry extends BoxGlow {
  holders: number;
  pinned: boolean;
  /** The layout generation that last used it. */
  generation: number;
}

const glows = new Map<string, GlowEntry>();
/** Counts layout changes: a glow from an earlier one is dropped once nothing holds it. */
let generation = 0;

const glowKey = (w: number, h: number, radius: number, blur: number) =>
  `glow|${w}|${h}|${radius}|${blur}`;

function glowEntry(
  w: number,
  h: number,
  radius: number,
  blur: number,
): { key: string; entry: GlowEntry } {
  const width = Math.max(1, Math.round(w));
  const height = Math.max(1, Math.round(h));
  const key = glowKey(width, height, radius, blur);
  let entry = glows.get(key);
  if (!entry) {
    const pad = Math.ceil(blur * 1.5);
    // The shape is drawn far off to one side; only its shadow lands on the canvas.
    const away = 4000;
    const texture = canvasTexture(width + pad * 2, height + pad * 2, (ctx) => {
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = blur;
      ctx.shadowOffsetX = away;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.roundRect(pad - away, pad, width, height, radius);
      ctx.fill();
    });
    entry = { texture, pad, holders: 0, pinned: false, generation };
    glows.set(key, entry);
  }
  entry.generation = generation;
  return { key, entry };
}

function dropGlow(key: string, entry: GlowEntry): void {
  entry.texture.destroy(true);
  glows.delete(key);
}

/**
 * The layout changed size (the window was dragged, or the hands came or went).
 * Every glow nothing holds goes now, and one held by a sprite of the old layout
 * goes when that sprite lets it go, so the glows of sizes that are gone don't
 * pile up.
 */
export function sweepBoxGlows(): void {
  generation++;
  for (const [key, entry] of glows) {
    if (entry.holders === 0 && !entry.pinned) dropGlow(key, entry);
  }
}

/**
 * A sprite that shows a box glow whose size follows the layout. It holds the
 * glow it shows, takes a new one before letting the old one go, and lets go of
 * it when it is destroyed or told to. A glow nobody holds stays in the cache
 * for the next sprite that asks for its size (a keycap lights again on every
 * key, and must not be painted again each time) until the layout changes.
 */
export class GlowSprite extends Sprite {
  private heldKey: string | null = null;

  /** Show the glow of a `w` by `h` box; the same size as before changes nothing. */
  show(w: number, h: number, radius: number, blur: number): void {
    const { key, entry } = glowEntry(w, h, radius, blur);
    if (key === this.heldKey) return;
    entry.holders++;
    const previous = this.heldKey;
    this.heldKey = key;
    this.texture = entry.texture;
    if (previous) letGo(previous);
  }

  /** Stop showing a glow (the sprite is hidden, or done with its size). */
  release(): void {
    const previous = this.heldKey;
    if (!previous) return;
    this.heldKey = null;
    this.texture = Texture.EMPTY;
    letGo(previous);
  }

  override destroy(options?: Parameters<Sprite['destroy']>[0]): void {
    this.release();
    super.destroy(options);
  }
}

function letGo(key: string): void {
  const entry = glows.get(key);
  if (!entry) return;
  entry.holders--;
  if (entry.holders === 0 && !entry.pinned && entry.generation < generation) {
    dropGlow(key, entry);
  }
}

/**
 * The glow a CSS `box-shadow: 0 0 <blur>px <colour>` casts, white and ready to
 * tint. Painted by the canvas's own shadow blur, the same Gaussian the browser
 * uses for the DOM deck, so the glow around keycaps and Drones matches. This is
 * for a size that never changes (the hands, a Drone's thruster plumes and eye):
 * it is made once and kept. A size that follows the layout goes through a
 * `GlowSprite`.
 */
export function boxGlow(
  w: number,
  h: number,
  radius: number,
  blur: number,
): BoxGlow {
  const { entry } = glowEntry(w, h, radius, blur);
  entry.pinned = true;
  return { texture: entry.texture, pad: entry.pad };
}

/**
 * The guidance beam's soft aura: a 24 px column blurred by 4 px sideways, with
 * the DOM deck's lengthwise ramp (clear at the ends, strongest at the middle).
 */
export const BEAM_AURA_WIDTH = 40;
export const BEAM_AURA_HEIGHT = 256;
export function beamAuraTexture(): Texture {
  return cached('beam-aura', () => {
    const w = BEAM_AURA_WIDTH;
    const h = BEAM_AURA_HEIGHT;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const image = ctx.createImageData(w, h);
      const sigma = 4;
      const erf = (x: number) => {
        // Abramowitz and Stegun 7.1.26.
        const sign = x < 0 ? -1 : 1;
        const t = 1 / (1 + 0.3275911 * Math.abs(x));
        const y =
          1 -
          ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t -
            0.284496736) *
            t +
            0.254829592) *
            t *
            Math.exp(-x * x);
        return sign * y;
      };
      const phi = (x: number) => 0.5 * (1 + erf(x / Math.SQRT2));
      for (let x = 0; x < w; x++) {
        const dx = x + 0.5 - w / 2;
        const across = phi((dx + 12) / sigma) - phi((dx - 12) / sigma);
        for (let y = 0; y < h; y++) {
          const p = (y + 0.5) / h;
          // transparent 0 %, 8 % at 15 %, 27 % at 50 %, 8 % at 85 %, transparent 100 %
          const along =
            p < 0.15
              ? (p / 0.15) * 0.082
              : p < 0.5
                ? 0.082 + ((p - 0.15) / 0.35) * (0.27 - 0.082)
                : p < 0.85
                  ? 0.27 - ((p - 0.5) / 0.35) * (0.27 - 0.082)
                  : ((1 - p) / 0.15) * 0.082;
          const i = (y * w + x) * 4;
          image.data[i] = 255;
          image.data[i + 1] = 255;
          image.data[i + 2] = 255;
          image.data[i + 3] = Math.round(255 * across * along);
        }
      }
      ctx.putImageData(image, 0, 0);
    }
    return Texture.from(canvas);
  });
}

/** The beam's 2 px core, as a column whose height is stretched to the beam. */
export const BEAM_CORE_HEIGHT = 256;
export function beamCoreTexture(): Texture {
  return cached('beam-core', () =>
    canvasTexture(2, BEAM_CORE_HEIGHT, (ctx) => {
      const gradient = ctx.createLinearGradient(0, 0, 0, BEAM_CORE_HEIGHT);
      // transparent, 25 % at 12 %, solid at 50 %, 25 % at 88 %, transparent
      gradient.addColorStop(0, 'rgba(255,255,255,0)');
      gradient.addColorStop(0.12, 'rgba(255,255,255,0.25)');
      gradient.addColorStop(0.5, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.88, 'rgba(255,255,255,0.25)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 2, BEAM_CORE_HEIGHT);
    }),
  );
}
