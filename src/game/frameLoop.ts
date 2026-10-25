import type { RunPhase } from '../types/game';
import { MAX_CATCH_UP_MS, STEP_MS } from './clock';

/** What the frame loop needs from the browser. Injected so it can be driven by hand. */
export interface FrameEnvironment {
  /** Milliseconds, monotonic. */
  now(): number;
  /** Ask for `callback` on the next frame. Returns a handle for `cancel`. */
  request(callback: () => void): number;
  cancel(handle: number): void;
}

/**
 * The Run's frame loop, outside React and PixiJS. Each frame it works out how
 * much real time has passed since the last frame it ran, caps that at
 * `MAX_CATCH_UP_MS` so a stall can't make Drones jump, and takes as many fixed
 * steps as the time calls for. It takes no time at all while the Run isn't
 * running, and the first frame after a resume only starts the count.
 *
 * Returns the function that stops the loop.
 */
export function startFrameLoop(
  game: { step(count: number): void; getPhase(): RunPhase },
  env: FrameEnvironment,
): () => void {
  let lastFrame: number | null = null;
  let owed = 0;
  let handle = 0;
  let stopped = false;

  const frame = () => {
    if (stopped) return;
    handle = env.request(frame);

    if (game.getPhase() !== 'running') {
      lastFrame = null;
      owed = 0;
      return;
    }
    const now = env.now();
    if (lastFrame === null) {
      lastFrame = now;
      return;
    }
    owed += Math.min(Math.max(0, now - lastFrame), MAX_CATCH_UP_MS);
    lastFrame = now;
    const steps = Math.floor(owed / STEP_MS);
    if (steps > 0) {
      owed -= steps * STEP_MS;
      game.step(steps);
    }
  };

  handle = env.request(frame);
  return () => {
    stopped = true;
    env.cancel(handle);
  };
}

/** The browser's frame environment. */
export function browserFrameEnvironment(): FrameEnvironment {
  return {
    now: () => performance.now(),
    request: (callback) => requestAnimationFrame(callback),
    cancel: (handle) => cancelAnimationFrame(handle),
  };
}
