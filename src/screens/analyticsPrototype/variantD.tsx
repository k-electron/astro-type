/**
 * PROTOTYPE (#148). D · Together: everything from A, B and C on one page,
 * linked, with today's screen trimmed to what still matters.
 *
 * 1. One plain sentence, then one row of lifetime totals.
 * 2. A's timeline. Speed counts letters only. Clicking a Sector's
 *    name, or a day, jumps to that Sector's chapter in the logbook below.
 * 3. A's keyboard, which turns back in time with the cursor, and B's key
 *    detail beside it for the key clicked (the trickiest key to start).
 *    The key's trend is smoothed: the last 5 days with at least 10 tries.
 * 4. Mix-ups, Shift hand, Letter pairs.
 * 5. C's logbook, one chapter per Sector.
 */
import type React from 'react';
import { useMemo, useRef, useState } from 'react';
import { CURRICULUM_SECTORS } from '../../curriculum/curriculum';
import {
  card,
  heading,
  JourneyKeyboard,
  keyLabel,
  MixUpsPanel,
  PairsPanel,
  ShiftPanel,
  STRIPS,
  Sparkline,
  speedTone,
  capLabel,
} from './analyticsVariants';
import type { Journey, KeyState } from './journey';
import {
  JourneyStrips,
  KeyTrend,
  SECTOR_TINTS,
  shortDate,
  type StripSpec,
} from './journeyCharts';

const STRIPS_D: StripSpec[] = [
  {
    ...STRIPS[0],
    value: (d) => d.letterWpm,
    hint: 'Your speed on letters each day you played, so number and symbol drills never look like going backwards.',
  },
  ...STRIPS.slice(1),
];

function headlineOf(journey: Journey): string {
  const played = journey.days.filter((d) => d.letterWpm !== null);
  const avg = (ds: typeof played) =>
    ds.reduce((s, d) => s + (d.letterWpm ?? 0), 0) / (ds.length || 1);
  const worst = trickiest(journey);
  return `In ${journey.days.filter((d) => d.played).length} days of play you went from about ${Math.round(avg(played.slice(0, 3)))} to ${Math.round(avg(played.slice(-3)))} WPM and reached ${journey.sectors.at(-1)?.name}. ${worst ? `Your trickiest key now is ${capLabel(worst.key)}, your ${worst.finger.toLowerCase()}.` : ''}`;
}

function trickiest(journey: Journey): KeyState | undefined {
  return [...journey.keys.values()]
    .filter((k) => k.key !== ' ' && k.attempts >= 20 && k.nowAccuracy !== null)
    .sort((a, b) => (a.nowAccuracy ?? 100) - (b.nowAccuracy ?? 100))[0];
}

const TotalsRow: React.FC<{ journey: Journey }> = ({ journey }) => {
  const minutes = journey.runs.reduce((s, r) => s + r.runTimeS, 0) / 60;
  const words =
    journey.runs.reduce((s, r) => s + r.stage.sampleText.length, 0) / 5;
  const best = Math.max(...journey.days.map((d) => d.letterWpm ?? 0));
  const items = [
    ['Days played', `${journey.days.filter((d) => d.played).length}`],
    [
      'Practice time',
      `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`,
    ],
    ['Words typed', Math.round(words).toLocaleString()],
    ['Best day', `${Math.round(best)} WPM`],
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {items.map(([label, value]) => (
        <div
          key={label}
          className="px-3 py-2 rounded-lg border border-slate-800 bg-slate-950/40"
        >
          <div className="text-[10px] uppercase font-mono text-slate-500">
            {label}
          </div>
          <div className="font-mono text-white text-lg tabular-nums">
            {value}
          </div>
        </div>
      ))}
    </div>
  );
};

const KeyDetail: React.FC<{ k: KeyState; lastDay: number }> = ({
  k,
  lastDay,
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <span className="w-12 h-12 rounded-lg border border-cyan-400 bg-slate-800 flex items-center justify-center font-mono text-xl text-white">
        {capLabel(k.key)}
      </span>
      <div>
        <div className="text-white font-semibold">{k.finger || 'Thumb'}</div>
        <div className="text-[11px] text-slate-400">
          Learned {shortDate(k.firstDay)} · typed {k.attempts} times
        </div>
      </div>
    </div>
    <p className="text-sm text-slate-200">
      {k.thenMs && k.nowMs
        ? `${k.nowMs < k.thenMs ? 'Faster' : 'Slower'}: ${Math.round(k.thenMs)} → ${Math.round(k.nowMs)} ms a key. `
        : ''}
      {k.nowAccuracy !== null
        ? `Right first time ${Math.round(k.nowAccuracy)}% lately.`
        : ''}
    </p>
    <KeyTrend daily={k.smoothed} lastDay={lastDay} height={130} />
    <div className="text-[10px] font-mono text-slate-500">
      <span className="text-amber-300">—</span> time per key ·{' '}
      <span className="text-emerald-300">- -</span> right first time · each
      point is your last 5 days
    </div>
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-mono text-slate-500">
        Pressed instead:
      </span>
      {k.mixUps.slice(0, 4).map((m) => (
        <span
          key={m.pressed}
          className="px-2 py-0.5 rounded-md border border-slate-700 font-mono text-xs text-rose-200"
        >
          {keyLabel(m.pressed)}{' '}
          <span className="text-slate-500">×{m.count}</span>
        </span>
      ))}
      {k.mixUps.length === 0 && (
        <span className="text-[11px] text-slate-500">never</span>
      )}
    </div>
  </div>
);

function chaptersOf(journey: Journey) {
  return journey.sectors.map((s) => {
    const i = CURRICULUM_SECTORS.findIndex((x) => x.id === s.id);
    const runs = journey.runs.filter((r) => r.stage.sectorId === s.id);
    const avg = (rs: typeof runs, f: (r: (typeof runs)[number]) => number) =>
      rs.reduce((t, r) => t + f(r), 0) / (rs.length || 1);
    const sector = CURRICULUM_SECTORS[i];
    const earlier = new Set(
      CURRICULUM_SECTORS.slice(0, i).flatMap((x) =>
        x.stages.flatMap((st) => st.targetKeys),
      ),
    );
    return {
      ...s,
      i,
      runs: runs.length,
      playDays: new Set(runs.map((r) => r.day)).size,
      stars: sector.stages.reduce(
        (t, st) =>
          t +
          Math.max(
            0,
            ...runs.filter((r) => r.stage.id === st.id).map((r) => r.stars),
          ),
        0,
      ),
      maxStars: sector.stages.length * 3,
      wpmFrom: avg(runs.slice(0, 3), (r) => r.wpm),
      wpmTo: avg(runs.slice(-3), (r) => r.wpm),
      accFrom: avg(runs.slice(0, 3), (r) => r.accuracy),
      accTo: avg(runs.slice(-3), (r) => r.accuracy),
      taught: [...new Set(sector.stages.flatMap((st) => st.targetKeys))].filter(
        (key) => !earlier.has(key),
      ),
      sparkline: runs.map((r) => r.wpm),
    };
  });
}

export const AnalyticsD: React.FC<{ journey: Journey }> = ({ journey }) => {
  const [cursorDay, setCursorDay] = useState<number | null>(null);
  const [selected, setSelected] = useState<string>(
    () => trickiest(journey)?.key ?? 'f',
  );
  const [picked, setPicked] = useState<number | null>(null);
  const chapters = useMemo(() => chaptersOf(journey), [journey]);
  const chapterRefs = useRef(new Map<number, HTMLLIElement>());
  const k = journey.keys.get(selected);
  const lastDay = journey.days.length - 1;
  const day = cursorDay !== null ? journey.days[cursorDay] : null;
  const pickSector = (sector: number) => {
    setPicked(sector);
    chapterRefs.current
      .get(sector)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  return (
    <div className="flex flex-col gap-4">
      <p className="text-base sm:text-lg text-white font-display leading-snug">
        {headlineOf(journey)}
      </p>
      <TotalsRow journey={journey} />

      <div className={card}>
        <div className={heading}>
          Your journey · each dot is a day you played · hover to look back,
          click a Sector to open its chapter
        </div>
        <JourneyStrips
          journey={journey}
          strips={STRIPS_D}
          cursorDay={cursorDay}
          onCursorDay={setCursorDay}
          onPickSector={pickSector}
        />
        <div className="min-h-5 text-[11px] font-mono text-slate-400 mt-1">
          {day === null
            ? 'Speed counts letters only. Shaded days are days away: nothing is lost while you are away.'
            : !day.played
              ? `${shortDate(day.day)}: a day away.`
              : `${shortDate(day.day)}: ${day.runs} Runs in ${Math.round(day.minutes)} min${
                  day.firstVisitTo.length
                    ? `, first flights of ${day.firstVisitTo.map((s) => s.title).join(', ')}`
                    : ''
                }.`}
        </div>
      </div>

      <div className={`${card} grid md:grid-cols-[1.25fr_1fr] gap-5`}>
        <div>
          <div className={heading}>
            Your keys{' '}
            {cursorDay === null
              ? 'now · click one'
              : `as they were on ${shortDate(cursorDay)}`}
          </div>
          <JourneyKeyboard
            journey={journey}
            asOf={cursorDay}
            selected={selected}
            onSelect={setSelected}
          />
        </div>
        {k && <KeyDetail k={k} lastDay={lastDay} />}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <MixUpsPanel journey={journey} />
        <ShiftPanel journey={journey} />
        <PairsPanel journey={journey} />
      </div>

      <div>
        <div className={heading}>Your logbook · one chapter per Sector</div>
        <ol className="relative flex flex-col gap-3 pl-6 border-l border-slate-800 ml-2">
          {chapters.map((c) => (
            <li
              key={c.id}
              ref={(el) => {
                if (el) chapterRefs.current.set(c.i, el);
              }}
              className={`${card} relative transition-shadow ${
                picked === c.i ? 'ring-2 ring-cyan-300' : ''
              }`}
            >
              <span
                className="absolute -left-[33px] top-5 w-4 h-4 rounded-full border-2 border-slate-950"
                style={{ background: SECTOR_TINTS[c.i] }}
              />
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span
                  className="font-mono text-[11px] uppercase tracking-wider"
                  style={{ color: SECTOR_TINTS[c.i] }}
                >
                  Sector {c.i + 1}
                </span>
                <span className="text-white font-semibold font-display">
                  {c.name}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {shortDate(c.firstDay)} – {shortDate(c.lastDay)} ·{' '}
                  {c.playDays} days · {c.runs} Runs
                </span>
                <span className="ml-auto text-amber-300 font-mono text-sm">
                  ★ {c.stars}/{c.maxStars}
                </span>
              </div>
              <div className="grid sm:grid-cols-[1fr_auto] gap-4 mt-3 items-center">
                <div className="flex flex-col gap-2">
                  <div className="text-sm text-slate-200">
                    Speed{' '}
                    <span className="font-mono text-cyan-300">
                      {Math.round(c.wpmFrom)} → {Math.round(c.wpmTo)} WPM
                    </span>
                    , accuracy{' '}
                    <span className="font-mono text-emerald-300">
                      {Math.round(c.accFrom)} → {Math.round(c.accTo)}%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {c.taught.map((key) => {
                      const kk = journey.keys.get(key);
                      return (
                        <button
                          type="button"
                          key={key}
                          onClick={() => setSelected(key)}
                          title={`${capLabel(key)}: show this key above`}
                          className={`min-w-7 h-7 px-1 rounded-md border border-slate-600 font-mono text-xs text-white flex items-center justify-center cursor-pointer ${speedTone(kk?.nowMs ?? null, journey.meanNowMs)}`}
                        >
                          {capLabel(key)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Sparkline values={c.sparkline} color={SECTOR_TINTS[c.i]} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};
