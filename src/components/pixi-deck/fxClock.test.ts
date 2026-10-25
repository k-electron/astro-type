import { describe, expect, it } from 'vitest';
import { STEP_MS } from '../../game/clock';
import { FxClock } from './fxClock';

// The deck's effects run on the Run clock. Frames here are what the Run
// clock's frame loop reports: whole steps taken plus how far into the next.

/** Play a Run for `seconds` at `hz` frames a second; return how long the effects advanced, in steps. */
function playFor(seconds: number, hz: number): number {
  const clock = new FxClock();
  let total = 0;
  const frames = Math.round(seconds * hz);
  for (let i = 0; i <= frames; i++) {
    const runMs = (i * 1000) / hz;
    const steps = Math.floor(runMs / STEP_MS);
    total += clock.advance({
      phase: 'running',
      runSteps: steps,
      fraction: runMs / STEP_MS - steps,
      wallMs: runMs,
    }).d;
  }
  return total;
}

describe('the effect clock', () => {
  it('passes the same time on a 60 Hz and a 120 Hz display', () => {
    expect(playFor(2, 120)).toBeCloseTo(playFor(2, 60), 6);
    expect(playFor(2, 60)).toBeCloseTo(120, 6);
  });

  it('stands still while paused, and carries on from there after a resume', () => {
    const clock = new FxClock();
    const frame = (phase: 'running' | 'paused', steps: number, fraction = 0) =>
      clock.advance({ phase, runSteps: steps, fraction, wallMs: steps * 16 }).d;
    frame('running', 10);
    expect(frame('running', 12, 0.5)).toBeCloseTo(2.5, 6);
    // A long pause: the wall clock moves on, the effects do not.
    expect(
      clock.advance({
        phase: 'paused',
        runSteps: 12,
        fraction: 0,
        wallMs: 60_000,
      }).d,
    ).toBe(0);
    expect(
      clock.advance({
        phase: 'paused',
        runSteps: 12,
        fraction: 0,
        wallMs: 120_000,
      }).d,
    ).toBe(0);
    // The first frame after a resume only sets the mark; the next one is a normal frame.
    expect(
      clock.advance({
        phase: 'running',
        runSteps: 12,
        fraction: 0,
        wallMs: 120_016,
      }).d,
    ).toBe(0);
    expect(
      clock.advance({
        phase: 'running',
        runSteps: 13,
        fraction: 0.2,
        wallMs: 120_033,
      }).d,
    ).toBeCloseTo(1.2, 6);
  });

  it("lets a cleared Run's last explosion play out on the wall clock, with a cap on stalls", () => {
    const clock = new FxClock();
    clock.advance({ phase: 'running', runSteps: 100, fraction: 0, wallMs: 0 });
    clock.advance({
      phase: 'cleared',
      runSteps: 100,
      fraction: 0,
      wallMs: 1000,
    });
    const d = clock.advance({
      phase: 'cleared',
      runSteps: 100,
      fraction: 0,
      wallMs: 1000 + STEP_MS * 3,
    }).d;
    expect(d).toBeCloseTo(3, 6);
    // A stall of ten seconds counts as no more than six steps.
    expect(
      clock.advance({
        phase: 'cleared',
        runSteps: 100,
        fraction: 0,
        wallMs: 11_000,
      }).d,
    ).toBeCloseTo(6, 6);
  });

  it('says when a new Run has started', () => {
    const clock = new FxClock();
    clock.advance({ phase: 'running', runSteps: 500, fraction: 0, wallMs: 0 });
    const reading = clock.advance({
      phase: 'running',
      runSteps: 0,
      fraction: 0,
      wallMs: 16,
    });
    expect(reading).toEqual({ d: 0, newRun: true });
  });
});
