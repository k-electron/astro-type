import type { BackdropId } from '../game/schemas';

/**
 * What each Backdrop adds behind the drifting stars. It is only the space the
 * game sits in: it is drawn first, faint and slow, and never touches the text
 * prompt, the Drones or the keyboard, which are drawn above it.
 */
export interface BackdropStyle {
  /** How many stars drift, and how bright they are against the Backdrop. */
  stars: number;
  starAlpha: number;
  /** Paint the Backdrop's own layer for this frame. `speed` is the stars' speed. */
  ambient:
    | ((
        ctx: CanvasRenderingContext2D,
        width: number,
        height: number,
        frame: number,
        speed: number,
      ) => void)
    | null;
}

/** A soft round cloud of one colour that fades to nothing at its edge. */
function cloud(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rgb: string,
  alpha: number,
): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(${rgb}, ${alpha})`);
  gradient.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

const CLOUDS: {
  x: number;
  y: number;
  r: number;
  rgb: string;
  drift: number;
}[] = [
  { x: 0.2, y: 0.3, r: 0.45, rgb: '99, 102, 241', drift: 0.0011 },
  { x: 0.75, y: 0.25, r: 0.4, rgb: '168, 85, 247', drift: 0.0014 },
  { x: 0.55, y: 0.75, r: 0.5, rgb: '14, 165, 233', drift: 0.0009 },
  { x: 0.1, y: 0.85, r: 0.35, rgb: '236, 72, 153', drift: 0.0017 },
];

/** Four big, dim clouds of colour that drift slowly. */
const nebula: BackdropStyle['ambient'] = (ctx, width, height, frame) => {
  for (const [i, c] of CLOUDS.entries()) {
    const dx = Math.sin(frame * c.drift + i) * 0.06;
    const dy = Math.cos(frame * c.drift * 0.8 + i * 2) * 0.05;
    cloud(
      ctx,
      (c.x + dx) * width,
      (c.y + dy) * height,
      c.r * Math.max(width, height),
      c.rgb,
      0.16,
    );
  }
};

/** Slow, wavering ribbons of green and teal light across the top of the sky. */
const aurora: BackdropStyle['ambient'] = (ctx, width, height, frame) => {
  const ribbons = [
    { rgb: '52, 211, 153', y: 0.16, phase: 0 },
    { rgb: '45, 212, 191', y: 0.24, phase: 2 },
    { rgb: '129, 140, 248', y: 0.32, phase: 4 },
  ];
  for (const ribbon of ribbons) {
    const baseY = ribbon.y * height;
    const gradient = ctx.createLinearGradient(0, baseY - 90, 0, baseY + 130);
    gradient.addColorStop(0, `rgba(${ribbon.rgb}, 0)`);
    gradient.addColorStop(0.35, `rgba(${ribbon.rgb}, 0.12)`);
    gradient.addColorStop(1, `rgba(${ribbon.rgb}, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, baseY + 130);
    for (let x = 0; x <= width; x += 24) {
      const y =
        baseY +
        Math.sin(x * 0.004 + frame * 0.006 + ribbon.phase) * 38 +
        Math.sin(x * 0.011 + frame * 0.009 + ribbon.phase) * 14;
      ctx.lineTo(x, y - 60);
    }
    ctx.lineTo(width, baseY + 130);
    ctx.closePath();
    ctx.fill();
  }
};

/** A dark vignette closing in from the edges and one faint violet glow far below, breathing slowly. */
const deepVoid: BackdropStyle['ambient'] = (ctx, width, height, frame) => {
  const reach = Math.hypot(width, height) / 2;
  const vignette = ctx.createRadialGradient(
    width / 2,
    height / 2,
    reach * 0.45,
    width / 2,
    height / 2,
    reach,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  cloud(
    ctx,
    width * 0.5,
    height * 1.05,
    Math.max(width, height) * 0.55,
    '109, 40, 217',
    0.1 + Math.sin(frame * 0.01) * 0.03,
  );
};

export const BACKDROPS: Record<BackdropId, BackdropStyle> = {
  // The stars as they have always drifted.
  STARFIELD: { stars: 180, starAlpha: 1, ambient: null },
  NEBULA: { stars: 150, starAlpha: 0.9, ambient: nebula },
  AURORA: { stars: 120, starAlpha: 0.85, ambient: aurora },
  // Almost nothing: a few dim, far stars in the dark.
  DEEP_VOID: { stars: 40, starAlpha: 0.6, ambient: deepVoid },
};
