// PROTOTYPE: the walkthrough videos for #189. Each video is a list of Runs;
// each Run is a generated Detour Stage played by the typist at the skill a
// player would have at that point on the Path.
import { readFileSync } from 'node:fs';
import '../generator.js';
import { typist } from './typist.mjs';

const G = globalThis.Generator;
const D = JSON.parse(readFileSync(new URL('../data.json', import.meta.url)));
D.wordListVersion = 'SCOWL 2020.12.07, sizes 10–35 (prototype stand-in)';
const W = (n) => D.waypoints.find((w) => w.n === n);
const K = (...keys) => ({ type: 'keys', keys });

// Where a player is on the Path, and how they type there. Speeds follow the
// path's pace (letters by about day 10, capitals 14, numbers 23) and the
// benchmarks research (20–25 WPM after a month; Cruise 40 sits near 36).
export const PHASES = {
  p1: { day: 'Day 1', wpm: 6, miss: 1.1 },
  p4: { day: 'Day 2', wpm: 8, miss: 1.0 },
  p6: { day: 'Day 3', wpm: 9, miss: 1.0 },
  p8: { day: 'Day 4', wpm: 10, miss: 1.0 },
  p12: { day: 'Day 6', wpm: 11, miss: 0.95 },
  p13: { day: 'Day 7', wpm: 12, miss: 0.95 },
  p20: { day: 'Day 10', wpm: 13, miss: 0.9 },
  p21: { day: 'Day 11', wpm: 14, miss: 0.9 },
  p24: { day: 'Day 13', wpm: 15, miss: 0.85 },
  p29: { day: 'Day 15', wpm: 16, miss: 0.85 },
  p40: { day: 'Day 21', wpm: 18, miss: 0.8 },
  p49: { day: 'Day 28', wpm: 36, miss: 0.6 },
};

export function makeRun({ wp, target, run, seed = 1, options, phase, weak, mixup, weakMiss = 2.5, label }) {
  const w = W(wp);
  const g = G.generate({ waypoint: w, target, run, seed, options }, D);
  if (g.error) throw new Error(g.error);
  const ph = PHASES[phase];
  const play = typist(g.stage.text, {
    wpm: ph.wpm, miss: ph.miss, weak: weak ?? g.focus, weakMiss, weakSlow: 1.5, mixup,
    allowed: w.known, focus: weak ?? g.focus, seed: 1000 + wp * 10 + run, shiftOpposite: 0.75,
  });
  return { label, waypoint: `${w.n}. ${w.name}`, sector: w.sectorName, day: ph.day, wpm: ph.wpm, run, kind: g.stage.kind,
    target: g.stage.target, text: g.stage.text, focus: g.focus, notes: g.notes, play };
}
