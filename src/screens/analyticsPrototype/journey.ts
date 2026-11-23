/**
 * PROTOTYPE (#148, "What Analytics shows of the journey"). Throwaway: lives
 * on branch prototype/debrief-flight-log only.
 *
 * A made-up month of a beginner's play through the real curriculum, typed
 * by the beginner model in `debriefPrototype/beginner.ts`, and the views
 * Analytics would draw from it. Every Run is kept whole here; what the Save
 * really keeps is the next ticket's question.
 */
import {
  CURRICULUM_SECTORS,
  FINGER_DISPLAY_NAMES,
  keyForCharacter,
  type SectorStage,
} from '../../curriculum/curriculum';
import { starBars } from '../../game/rules';
import { beginnerPresses } from '../debriefPrototype/beginner';
import {
  keyAccuracies,
  keySpeeds,
  logFromPresses,
  type ProtoKeystroke,
} from '../debriefPrototype/flightLog';

const STEP_MS = 1000 / 60;
const START = new Date('2026-10-19T00:00:00');
/** Calendar days (from the start) the player didn't play. */
const AWAY_DAYS = new Set([
  8, 9, 16, 22, 23, 24, 25, 31, 38, 39, 47, 52, 53, 58,
]);
const CALENDAR_DAYS = 56;
const DAILY_RUN_TIME_S = 15 * 60;

export interface KeyTally {
  attempts: number;
  misses: number;
  cleanN: number;
  cleanSumMs: number;
}

export interface JourneyRun {
  day: number;
  stage: SectorStage;
  wpm: number;
  accuracy: number;
  rhythm: number;
  stars: number;
  runTimeS: number;
  keys: Map<string, KeyTally>;
  mixUps: Map<string, number>; // "e>r"
  pairs: Map<string, { n: number; cleanN: number; cleanSumMs: number }>;
  shift: { opposite: number; same: number; none: number };
}

const isHit = (k: ProtoKeystroke) => k.expected === k.pressed;

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const PROBLEM_KEYS: Record<string, number> = {
  b: 1.35,
  y: 1.25,
  p: 1.2,
  x: 1.3,
  q: 1.2,
  z: 1.3,
};

/** The whole month, played Run by Run. */
export function simulateJourney(): JourneyRun[] {
  const r = rng(42);
  const stages = CURRICULUM_SECTORS.flatMap((s) => s.stages);
  const best = new Map<string, number>(); // stage id -> Stars
  const tries = new Map<string, number>();
  const seen = new Map<string, number>(); // key -> times typed
  let shiftedSeen = 0;
  let practiceMin = 0;
  let furthest = 0;
  let lastPlayed = -1;
  let seed = 1;
  const runs: JourneyRun[] = [];
  const totalStars = () => [...best.values()].reduce((a, b) => a + b, 0);
  const unlocked = (stage: SectorStage) =>
    totalStars() >=
    (CURRICULUM_SECTORS.find((s) => s.id === stage.sectorId)
      ?.requiredStarsToUnlock ?? 0);

  /** The furthest Stage until it has 2 Stars (or 1 after 4 tries), then the next; at a Sector gate, the weakest Stage for more Stars. */
  const pick = (): SectorStage => {
    const s = stages[furthest];
    const stars = best.get(s.id) ?? 0;
    const done = stars >= 2 || ((tries.get(s.id) ?? 0) >= 4 && stars >= 1);
    if (!done) return s;
    if (furthest + 1 < stages.length && unlocked(stages[furthest + 1])) {
      furthest += 1;
      return stages[furthest];
    }
    const weakest = stages
      .slice(0, furthest + 1)
      .filter((x) => (best.get(x.id) ?? 0) < 3)
      .sort((x, y) => (best.get(x.id) ?? 0) - (best.get(y.id) ?? 0))[0];
    return weakest ?? s;
  };

  for (let day = 0; day < CALENDAR_DAYS; day++) {
    if (AWAY_DAYS.has(day)) continue;
    const away = lastPlayed >= 0 ? day - lastPlayed - 1 : 0;
    lastPlayed = day;
    let budget = DAILY_RUN_TIME_S * (0.8 + r() * 0.5);
    let firstOfDay = true;
    while (budget > 0) {
      const stage = pick();
      const pace =
        (0.48 + 0.9 * Math.exp(-practiceMin / 230)) *
        (away >= 3 && firstOfDay ? 1.15 : 1);
      const missFactor = 0.3 + 1.1 * Math.exp(-practiceMin / 180);
      const presses = beginnerPresses(stage.sampleText, seed++, {
        pace,
        miss: missFactor,
        keyFactor: (c) =>
          (1 + 0.9 * Math.exp(-(seen.get(c) ?? 0) / 60)) *
          (PROBLEM_KEYS[c] ?? 1) ** Math.exp(-practiceMin / 900),
        shiftOpposite: 0.35 + 0.55 * (1 - Math.exp(-shiftedSeen / 80)),
      });
      firstOfDay = false;
      const log = logFromPresses(stage.sampleText, presses);
      const run = summarise(day, stage, log, presses);
      runs.push(run);
      budget -= run.runTimeS + 8;
      practiceMin += run.runTimeS / 60;
      for (const c of stage.sampleText.toLowerCase())
        seen.set(c, (seen.get(c) ?? 0) + 1);
      shiftedSeen += run.shift.opposite + run.shift.same + run.shift.none;

      best.set(stage.id, Math.max(best.get(stage.id) ?? 0, run.stars));
      tries.set(stage.id, (tries.get(stage.id) ?? 0) + 1);
    }
  }
  return runs;
}

function summarise(
  day: number,
  stage: SectorStage,
  log: ProtoKeystroke[],
  presses: { shift?: 'opposite' | 'same' | 'none' }[],
): JourneyRun {
  const last = log[log.length - 1];
  const accuracy = last.accuracy;
  const wpm = last.wpm ?? 0;
  const bars = starBars(stage);
  let stars = 0;
  for (const bar of bars) {
    if (accuracy >= bar.accuracy && (bar.wpm === null || wpm >= bar.wpm))
      stars = bar.star;
  }
  const keys = new Map<string, KeyTally>();
  for (const a of keyAccuracies(log)) {
    keys.set(a.key, {
      attempts: a.firstAttempts,
      misses: a.misses,
      cleanN: 0,
      cleanSumMs: 0,
    });
  }
  // keySpeeds drops keys under 3 Clean hits; tally every Clean hit here.
  const pairs = new Map<
    string,
    { n: number; cleanN: number; cleanSumMs: number }
  >();
  for (let i = 1; i < log.length; i++) {
    const k = log[i];
    const prev = log[i - 1];
    if (!isHit(k) || !k.firstAttempt) continue;
    const pair = `${prev.expected}${k.expected}`;
    if (prev.index !== k.index - 1) continue;
    const p = pairs.get(pair) ?? { n: 0, cleanN: 0, cleanSumMs: 0 };
    p.n += 1;
    const gap = (k.step - prev.step) * STEP_MS;
    const clean = prev.firstAttempt && isHit(prev) && gap > 0 && gap <= 5000;
    if (clean) {
      p.cleanN += 1;
      p.cleanSumMs += gap;
      const t = keys.get(k.expected);
      if (t) {
        t.cleanN += 1;
        t.cleanSumMs += gap;
      }
    }
    pairs.set(pair, p);
  }
  void keySpeeds;
  const mixUps = new Map<string, number>();
  for (const k of log) {
    if (!k.firstAttempt || isHit(k)) continue;
    const id = `${k.expected}>${k.pressed}`;
    mixUps.set(id, (mixUps.get(id) ?? 0) + 1);
  }
  const shift = { opposite: 0, same: 0, none: 0 };
  // One count per shifted character, on its first press.
  let index = 0;
  for (let i = 0; i < log.length; i++) {
    if (log[i].index !== index) continue;
    if (log[i].firstAttempt && presses[i]?.shift)
      shift[presses[i].shift as 'opposite'] += 1;
    if (isHit(log[i])) index += 1;
  }
  return {
    day,
    stage,
    wpm,
    accuracy,
    rhythm: last.rhythm,
    stars,
    runTimeS: ((last.step - log[0].step) * STEP_MS) / 1000 + 2,
    keys,
    mixUps,
    pairs,
    shift,
  };
}

// ---- What Analytics draws --------------------------------------------------

export interface DayPoint {
  day: number;
  date: Date;
  played: boolean;
  runs: number;
  minutes: number;
  wpm: number | null;
  /** Speed on letters only, from Clean hits: drills of numbers and symbols don't move it. */
  letterWpm: number | null;
  accuracy: number | null;
  rhythm: number | null;
  opposite: number | null; // share of shifted characters with the opposite Shift
  sectorId: string | null; // furthest Sector played that day
  clears: { stage: SectorStage; stars: number }[];
  firstVisitTo: SectorStage[];
}

export interface KeyState {
  key: string;
  finger: string;
  firstDay: number;
  /** Over the last 5 days played with this key. */
  nowMs: number | null;
  nowAccuracy: number | null;
  /** Over its first 3 days. */
  thenMs: number | null;
  thenAccuracy: number | null;
  attempts: number;
  daily: { day: number; ms: number | null; accuracy: number | null }[];
  /** The trend as drawn: each point is the last 5 days with at least 10 tries. */
  smoothed: { day: number; ms: number | null; accuracy: number | null }[];
  mixUps: { pressed: string; count: number }[];
}

export interface Journey {
  runs: JourneyRun[];
  days: DayPoint[];
  keys: Map<string, KeyState>;
  meanNowMs: number;
  mixUps: { expected: string; pressed: string; count: number }[];
  pairs: { pair: string; n: number; ms: number }[];
  pairMeanMs: number;
  shift: { opposite: number; same: number; none: number };
  sectors: { id: string; name: string; firstDay: number; lastDay: number }[];
  headline: string;
}

export const dateOf = (day: number) =>
  new Date(START.getTime() + day * 86_400_000);

const ms = (t: { cleanN: number; cleanSumMs: number }) =>
  t.cleanN >= 3 ? t.cleanSumMs / t.cleanN : null;

export function journeyOf(runs: JourneyRun[]): Journey {
  const days: DayPoint[] = [];
  const visited = new Set<string>();
  for (let day = 0; day < CALENDAR_DAYS; day++) {
    const todays = runs.filter((r) => r.day === day);
    const chars = todays.reduce((s, r) => s + r.stage.sampleText.length, 0);
    let opp = 0;
    let shifted = 0;
    for (const r of todays) {
      opp += r.shift.opposite;
      shifted += r.shift.opposite + r.shift.same + r.shift.none;
    }
    const firstVisitTo: SectorStage[] = [];
    for (const r of todays) {
      if (!visited.has(r.stage.id)) {
        visited.add(r.stage.id);
        firstVisitTo.push(r.stage);
      }
    }
    days.push({
      day,
      date: dateOf(day),
      played: todays.length > 0,
      runs: todays.length,
      minutes: todays.reduce((s, r) => s + r.runTimeS, 0) / 60,
      letterWpm: (() => {
        let n = 0;
        let sum = 0;
        for (const r of todays)
          for (const [k, t] of r.keys)
            if (/^[a-z]$/.test(k)) {
              n += t.cleanN;
              sum += t.cleanSumMs;
            }
        return n >= 50 ? 12000 / (sum / n) : null;
      })(),
      wpm: todays.length
        ? todays.reduce((s, r) => s + r.wpm * r.stage.sampleText.length, 0) /
          chars
        : null,
      accuracy: todays.length
        ? todays.reduce(
            (s, r) => s + r.accuracy * r.stage.sampleText.length,
            0,
          ) / chars
        : null,
      rhythm: todays.length
        ? todays.reduce((s, r) => s + r.rhythm, 0) / todays.length
        : null,
      opposite: shifted >= 5 ? (opp * 100) / shifted : null,
      sectorId: todays.length ? (todays.at(-1)?.stage.sectorId ?? null) : null,
      clears: todays.map((r) => ({ stage: r.stage, stars: r.stars })),
      firstVisitTo,
    });
  }

  // Per key, per day.
  const keyDays = new Map<string, Map<number, KeyTally>>();
  const keyMix = new Map<string, Map<string, number>>();
  for (const run of runs) {
    for (const [k, t] of run.keys) {
      const byDay = keyDays.get(k) ?? new Map<number, KeyTally>();
      const d = byDay.get(run.day) ?? {
        attempts: 0,
        misses: 0,
        cleanN: 0,
        cleanSumMs: 0,
      };
      d.attempts += t.attempts;
      d.misses += t.misses;
      d.cleanN += t.cleanN;
      d.cleanSumMs += t.cleanSumMs;
      byDay.set(run.day, d);
      keyDays.set(k, byDay);
    }
    for (const [id, n] of run.mixUps) {
      const [e, p] = id.split('>');
      const m = keyMix.get(e) ?? new Map<string, number>();
      m.set(p, (m.get(p) ?? 0) + n);
      keyMix.set(e, m);
    }
  }
  const sum = (ts: KeyTally[]) =>
    ts.reduce(
      (a, t) => ({
        attempts: a.attempts + t.attempts,
        misses: a.misses + t.misses,
        cleanN: a.cleanN + t.cleanN,
        cleanSumMs: a.cleanSumMs + t.cleanSumMs,
      }),
      { attempts: 0, misses: 0, cleanN: 0, cleanSumMs: 0 },
    );
  const keys = new Map<string, KeyState>();
  for (const [k, byDay] of keyDays) {
    const ordered = [...byDay.entries()].sort((a, b) => a[0] - b[0]);
    const then = sum(ordered.slice(0, 3).map((e) => e[1]));
    const now = sum(ordered.slice(-5).map((e) => e[1]));
    const total = sum(ordered.map((e) => e[1]));
    const info = keyForCharacter(k);
    keys.set(k, {
      key: k,
      finger: info ? FINGER_DISPLAY_NAMES[info.finger] : '',
      firstDay: ordered[0][0],
      nowMs: ms(now),
      nowAccuracy: now.attempts
        ? ((now.attempts - now.misses) * 100) / now.attempts
        : null,
      thenMs: ms(then),
      thenAccuracy: then.attempts
        ? ((then.attempts - then.misses) * 100) / then.attempts
        : null,
      attempts: total.attempts,
      smoothed: (() => {
        const enough = ordered.filter(([, t]) => t.attempts >= 10);
        return enough.map(([day], i) => {
          const w = sum(
            enough.slice(Math.max(0, i - 4), i + 1).map((e) => e[1]),
          );
          return {
            day,
            ms: ms(w),
            accuracy: w.attempts
              ? ((w.attempts - w.misses) * 100) / w.attempts
              : null,
          };
        });
      })(),
      daily: ordered.map(([day, t]) => ({
        day,
        ms: ms(t),
        accuracy: t.attempts
          ? ((t.attempts - t.misses) * 100) / t.attempts
          : null,
      })),
      mixUps: [...(keyMix.get(k) ?? new Map()).entries()]
        .map(([pressed, count]) => ({ pressed, count }))
        .sort((a, b) => b.count - a.count),
    });
  }
  const nows = [...keys.values()].filter(
    (k) => k.nowMs !== null && k.key !== ' ',
  );
  const meanNowMs =
    nows.reduce((s, k) => s + (k.nowMs ?? 0), 0) / (nows.length || 1);

  const mixUps = [...keyMix.entries()]
    .flatMap(([expected, m]) =>
      [...m.entries()].map(([pressed, count]) => ({
        expected,
        pressed,
        count,
      })),
    )
    .sort((a, b) => b.count - a.count);

  const pairTotals = new Map<
    string,
    { n: number; cleanN: number; cleanSumMs: number }
  >();
  // Only the last 10 days played, so a pair shows how it is now.
  const recentDays = [...new Set(runs.map((r) => r.day))].slice(-10);
  for (const run of runs) {
    if (!recentDays.includes(run.day)) continue;
    for (const [pair, p] of run.pairs) {
      if (pair.includes(' ')) continue;
      const t = pairTotals.get(pair) ?? { n: 0, cleanN: 0, cleanSumMs: 0 };
      t.n += p.n;
      t.cleanN += p.cleanN;
      t.cleanSumMs += p.cleanSumMs;
      pairTotals.set(pair, t);
    }
  }
  const pairs = [...pairTotals.entries()]
    .filter(([, t]) => t.cleanN >= 5)
    .map(([pair, t]) => ({ pair, n: t.n, ms: t.cleanSumMs / t.cleanN }));
  const pairMeanMs =
    pairs.reduce((s, p) => s + p.ms * p.n, 0) /
    (pairs.reduce((s, p) => s + p.n, 0) || 1);

  const shift = { opposite: 0, same: 0, none: 0 };
  for (const r of runs) {
    shift.opposite += r.shift.opposite;
    shift.same += r.shift.same;
    shift.none += r.shift.none;
  }

  const sectors = CURRICULUM_SECTORS.flatMap((s) => {
    const played = runs.filter((r) => r.stage.sectorId === s.id);
    if (!played.length) return [];
    return [
      {
        id: s.id,
        name: s.name,
        firstDay: played[0].day,
        lastDay: played.at(-1)?.day ?? played[0].day,
      },
    ];
  });

  const playedDays = days.filter((d) => d.played);
  const firstWeek = playedDays.slice(0, 3);
  const lastWeek = playedDays.slice(-3);
  const avg = (ds: DayPoint[]) =>
    ds.reduce((s, d) => s + (d.wpm ?? 0), 0) / (ds.length || 1);
  const worst = [...keys.values()]
    .filter((k) => k.nowAccuracy !== null && k.attempts >= 20 && k.key !== ' ')
    .sort((a, b) => (a.nowAccuracy ?? 100) - (b.nowAccuracy ?? 100))[0];
  const furthest = sectors.at(-1);
  const headline = `In ${playedDays.length} days of play you went from about ${Math.round(avg(firstWeek))} to ${Math.round(avg(lastWeek))} WPM and reached ${furthest?.name ?? 'the first Sector'}. Your trickiest key now is ${worst ? `${worst.key.toUpperCase()} (${worst.finger.toLowerCase()})` : 'none'}.`;

  return {
    runs,
    days,
    keys,
    meanNowMs,
    mixUps,
    pairs,
    pairMeanMs,
    shift,
    sectors,
    headline,
  };
}

let cached: Journey | null = null;
/** The sample journey, worked out once. */
export function sampleJourney(): Journey {
  cached ??= journeyOf(simulateJourney());
  return cached;
}
