import type { Browser } from '@playwright/test';

// Pixel questions for the local-only cosmetics journeys, asked in a blank page
// of their own so they never touch the game's page or its stopped clock.
// Captures go in once and come back as ids; the questions are about regions of
// them. (effects.local.spec.ts has its own, smaller copy of the same idea.)

export type Rect = { x: number; y: number; width: number; height: number };

/** A picture that was loaded: an id into the page's list. */
export type Picture = number;

/** The most a pixel's three channels may differ and still count as unchanged. */
const CHANGED = 30;

export type Pixels = {
  load(png: Buffer): Promise<Picture>;
  /**
   * How many pixels differ noticeably between two pictures: by more than
   * `limit` summed over the three channels (30 by default; the pictures of one
   * run on a stopped clock are identical, so a faint layer may ask for less).
   */
  changed(
    a: Picture,
    b: Picture,
    region?: Rect,
    limit?: number,
  ): Promise<number>;
  /**
   * How many pixels are lit in a colour (`#rrggbb`): the same mix of red,
   * green and blue as the colour, and bright, so the glow that only tints the
   * dark deck doesn't count.
   */
  lit(a: Picture, colour: string, region?: Rect): Promise<number>;
  /** How many pixels are saturated, bright and within `tolerance` degrees of a hue. */
  hue(
    a: Picture,
    hue: number,
    tolerance: number,
    region?: Rect,
  ): Promise<number>;
  /**
   * Of the pixels of `a` that differ noticeably from `reference` and are
   * saturated and bright: how many there are, and how many of those lie within
   * `tolerance` degrees of a hue. What a Cosmetic drew, and in which colour.
   */
  drawnHue(
    a: Picture,
    reference: Picture,
    hue: number,
    tolerance: number,
    region?: Rect,
  ): Promise<{ drawn: number; inHue: number }>;
  /**
   * The hue (degrees, in bins of 20) that most of the saturated, bright pixels
   * which differ from `reference` have, leaving out the hues within 30 degrees
   * of any in `exclude`.
   */
  dominantDrawnHue(
    a: Picture,
    reference: Picture,
    exclude: number[],
    region?: Rect,
  ): Promise<number>;
  /** The box around the pixels lit in a colour, or null when there are none. */
  litExtent(a: Picture, colour: string, region?: Rect): Promise<Rect | null>;
  /** How many pixels are almost white (the letter on a Drone). */
  white(a: Picture, region?: Rect): Promise<number>;
  /** Mean luminance, and its 10th, 50th, 95th and 99th percentiles (0 to 255). */
  luminance(
    a: Picture,
    region?: Rect,
  ): Promise<{
    mean: number;
    p10: number;
    p50: number;
    p95: number;
    p99: number;
  }>;
};

type Window = { imgs: ImageData[] };

/** Opens the blank page the questions are asked in; close the context when done. */
export async function openPixels(browser: Browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.evaluate(() => {
    (window as unknown as Window).imgs = [];
  });

  const ask = <T>(name: string, ...args: unknown[]): Promise<T> =>
    page.evaluate(
      async ([op, rest]) => {
        const imgs = (window as unknown as Window).imgs;
        const [a, b, region, extra] = rest as [
          number,
          number | undefined,
          Rect | undefined,
          Record<string, unknown> | undefined,
        ];
        const img = imgs[a];
        const r = region ?? {
          x: 0,
          y: 0,
          width: img.width,
          height: img.height,
        };
        const x0 = Math.max(0, Math.round(r.x));
        const y0 = Math.max(0, Math.round(r.y));
        const x1 = Math.min(img.width, Math.round(r.x + r.width));
        const y1 = Math.min(img.height, Math.round(r.y + r.height));
        const ref = b === undefined ? undefined : imgs[b];
        const px = (data: Uint8ClampedArray, i: number) =>
          [data[i], data[i + 1], data[i + 2]] as const;
        const hueOf = (red: number, green: number, blue: number) => {
          const max = Math.max(red, green, blue);
          const min = Math.min(red, green, blue);
          const delta = max - min;
          const saturation = max === 0 ? 0 : delta / max;
          let h = 0;
          if (delta > 0) {
            if (max === red) h = ((green - blue) / delta + 6) % 6;
            else if (max === green) h = (blue - red) / delta + 2;
            else h = (red - green) / delta + 4;
          }
          return { h: h * 60, saturation, value: max };
        };
        const apart = (x: number, y: number) => {
          const d = Math.abs(x - y) % 360;
          return Math.min(d, 360 - d);
        };
        const colourful = (red: number, green: number, blue: number) => {
          const o = hueOf(red, green, blue);
          return o.saturation > 0.45 && o.value > 140 ? o : null;
        };
        const hex = (extra?.colour as string | undefined) ?? '#000000';
        const want = [1, 3, 5].map((k) =>
          Number.parseInt(hex.slice(k, k + 2), 16),
        );
        const top = Math.max(...want);
        const isLit = (red: number, green: number, blue: number) => {
          const v = [red, green, blue];
          const max = Math.max(red, green, blue);
          return (
            max > 140 &&
            v.every((c, k) => Math.abs(c / max - want[k] / top) < 0.2)
          );
        };

        let n = 0;
        let drawn = 0;
        let inHue = 0;
        const bins = new Array(18).fill(0) as number[];
        const lums: number[] = [];
        let sum = 0;
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = -1;
        let maxY = -1;
        for (let y = y0; y < y1; y++) {
          for (let x = x0; x < x1; x++) {
            const i = (y * img.width + x) * 4;
            const [red, green, blue] = px(img.data, i);
            if (op === 'changed' && ref) {
              const [rr, rg, rb] = px(ref.data, i);
              if (
                Math.abs(red - rr) +
                  Math.abs(green - rg) +
                  Math.abs(blue - rb) >
                (extra?.limit as number)
              )
                n++;
            } else if (op === 'lit' || op === 'litExtent') {
              if (isLit(red, green, blue)) {
                n++;
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
              }
            } else if (op === 'hue') {
              const o = colourful(red, green, blue);
              if (
                o &&
                apart(o.h, extra?.hue as number) <= (extra?.tolerance as number)
              )
                n++;
            } else if (op === 'white') {
              if (Math.min(red, green, blue) > 200) n++;
            } else if (op === 'luminance') {
              const l = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
              lums.push(l);
              sum += l;
            } else if (
              (op === 'drawnHue' || op === 'dominantDrawnHue') &&
              ref
            ) {
              const [rr, rg, rb] = px(ref.data, i);
              const different =
                Math.abs(red - rr) +
                  Math.abs(green - rg) +
                  Math.abs(blue - rb) >
                (extra?.limit as number);
              const o = colourful(red, green, blue);
              if (different && o) {
                if (op === 'drawnHue') {
                  drawn++;
                  if (
                    apart(o.h, extra?.hue as number) <=
                    (extra?.tolerance as number)
                  )
                    inHue++;
                } else if (
                  !((extra?.exclude as number[] | undefined) ?? []).some(
                    (e) => apart(o.h, e) < 30,
                  )
                ) {
                  bins[Math.floor(o.h / 20) % 18]++;
                }
              }
            }
          }
        }
        if (op === 'drawnHue') return { drawn, inHue };
        if (op === 'dominantDrawnHue')
          return bins.indexOf(Math.max(...bins)) * 20 + 10;
        if (op === 'litExtent')
          return maxX < 0
            ? null
            : {
                x: minX,
                y: minY,
                width: maxX - minX + 1,
                height: maxY - minY + 1,
              };
        if (op === 'luminance') {
          lums.sort((p, q) => p - q);
          const at = (f: number) =>
            lums[Math.floor(f * (lums.length - 1))] ?? 0;
          return {
            mean: sum / Math.max(1, lums.length),
            p10: at(0.1),
            p50: at(0.5),
            p95: at(0.95),
            p99: at(0.99),
          };
        }
        return n;
      },
      [name, args] as const,
    ) as Promise<T>;

  const pixels: Pixels = {
    load: (png) =>
      page.evaluate(async (b64) => {
        const w = window as unknown as Window;
        const bitmap = await createImageBitmap(
          await (await fetch(`data:image/png;base64,${b64}`)).blob(),
        );
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const g = canvas.getContext('2d');
        if (!g) throw new Error('No 2D canvas to read pixels with');
        g.drawImage(bitmap, 0, 0);
        w.imgs.push(g.getImageData(0, 0, bitmap.width, bitmap.height));
        return w.imgs.length - 1;
      }, png.toString('base64')),
    changed: (a, b, region, limit = CHANGED) =>
      ask<number>('changed', a, b, region, { limit }),
    lit: (a, colour, region) =>
      ask<number>('lit', a, undefined, region, { colour }),
    hue: (a, hue, tolerance, region) =>
      ask<number>('hue', a, undefined, region, { hue, tolerance }),
    drawnHue: (a, reference, hue, tolerance, region) =>
      ask('drawnHue', a, reference, region, {
        hue,
        tolerance,
        limit: CHANGED,
      }),
    dominantDrawnHue: (a, reference, exclude, region) =>
      ask<number>('dominantDrawnHue', a, reference, region, {
        exclude,
        limit: CHANGED,
      }),
    litExtent: (a, colour, region) =>
      ask('litExtent', a, undefined, region, { colour }),
    white: (a, region) => ask<number>('white', a, undefined, region, {}),
    luminance: (a, region) => ask('luminance', a, undefined, region, {}),
  };
  return { pixels, close: () => context.close() };
}

/** The hue of a `#rrggbb` colour, in degrees. */
export function hueOfHex(colour: string): number {
  const [red, green, blue] = [1, 3, 5].map((k) =>
    Number.parseInt(colour.slice(k, k + 2), 16),
  );
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  if (delta === 0) return 0;
  let h: number;
  if (max === red) h = ((green - blue) / delta + 6) % 6;
  else if (max === green) h = (blue - red) / delta + 2;
  else h = (red - green) / delta + 4;
  return h * 60;
}
