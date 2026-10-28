import type { RunPhase } from '../store/gameMachine';
import { MAX_CATCH_UP_MS, STEP_MS } from './clock';

/** What the frame loop needs from the browser. Injected so it can be driven by hand. */
export interface FrameEnvironment {
  /** Milliseconds, monotonic. */
  now(): number;
  /** Ask for `callback` on the next frame. Returns a handle for `cancel`. */
  request(callback: () => void): number;
  cancel(handle: number): void;
}

/** Hear every frame of the loop, with how far it is into the next step. Returns the way to stop. */
export type OnFrame = (listener: (stepFraction: number) => void) => () => void;

/**
 * The Run's frame loop, outside React and PixiJS. Each frame it works out how
 * much real time has passed since the last frame it ran, caps that at
 * `MAX_CATCH_UP_MS` so a stall can't make Drones jump, and takes as many fixed
 * steps as the time calls for. It takes no time at all while the Run isn't
 * running, and the first frame after a resume only starts the count.
 *
 * `onFrame`, when given, is called at the end of every frame, running or not,
 * with how far the frame has got into the next step (0 up to, not including,
 * 1). A drawing loop uses it to draw on the Run clock and to interpolate
 * between steps. Outside a running Run the fraction is 0.
 *
 * Returns the function that stops the loop.
 */
export function startFrameLoop(
  game: { step(count: number): void; getState(): { phase: RunPhase } },
  env: FrameEnvironment,
  onFrame?: (stepFraction: number) => void,
): () => void {
  let lastFrame: number | null = null;
  let owed = 0;
  let handle = 0;
  let stopped = false;

  const frame = () => {
    if (stopped) return;
    handle = env.request(frame);

    if (game.getState().phase !== 'running') {
      lastFrame = null;
      owed = 0;
      onFrame?.(0);
      return;
    }
    const now = env.now();
    if (lastFrame === null) {
      lastFrame = now;
      onFrame?.(0);
      return;
    }
    owed += Math.min(Math.max(0, now - lastFrame), MAX_CATCH_UP_MS);
    lastFrame = now;
    const steps = Math.floor(owed / STEP_MS);
    if (steps > 0) {
      owed -= steps * STEP_MS;
      // One step at a time, so a listener drawing between steps (the Action
      // Deck's glide) sees each step the Run clock took, not only the last.
      for (let i = 0; i < steps; i++) game.step(1);
    }
    onFrame?.(owed / STEP_MS);
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
