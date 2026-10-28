import type { FrameEnvironment } from '../game/frameLoop';

/** The browser's frame environment. */
export function browserFrameEnvironment(): FrameEnvironment {
  return {
    now: () => performance.now(),
    request: (callback) => requestAnimationFrame(callback),
    cancel: (handle) => cancelAnimationFrame(handle),
  };
}
