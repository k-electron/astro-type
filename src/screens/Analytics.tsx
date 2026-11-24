import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { journeyReport } from '../analytics/logbook';
import { useGame } from '../app/useGame';
import { useGameState } from '../app/useGameState';
import {
  OverlayCloseButton,
  OverlayConfirm,
  OverlayFlightDeckButton,
  OverlayShell,
} from './OverlayShell';
import {
  CURRICULUM_SECTORS,
  keyForCharacter,
  FINGER_COLOR_MAP,
  FINGER_DISPLAY_NAMES,
  maxStarsOf,
} from '../curriculum/curriculum';
import { KEYBOARD_ROWS } from '../curriculum/keyboardLayout';
import { exportBackup, NOT_A_BACKUP_MESSAGE } from '../game/save';
import { clearedStagesOf } from '../game/schemas';
import {
  FACTORY_RESET_MESSAGE,
  FACTORY_RESET_TITLE,
  WIPE_STARS_TITLE,
  wipeStarsMessage,
} from './confirmLabels';
import { Download, Upload, RotateCcw } from 'lucide-react';
import { DISMISS_NOTICE_LABEL } from './dismissLabel';
import {
  BEST_DAY_LABEL,
  bestDaySpeedText,
  DAYS_PLAYED_LABEL,
  dayText,
  NO_BEST_DAY,
  journeySentence,
  PRACTICE_TIME_LABEL,
  practiceTimeText,
  WORDS_TYPED_LABEL,
} from './journeyLabels';
import { JourneyTimeline } from './JourneyTimeline';
import { roundDown } from './roundDown';
import { type EntryJump, SectorEntries } from './SectorEntries';

/** How long a entry stays ringed after the timeline sent the player to it. */
const RING_MS = 3000;

/**
 * The keyboard's keys for the heatmap, row by row: the letters, the digits and
 * the three punctuation keys ; , . (the other punctuation keys are not shown).
 */
const HEATMAP_KEY = /^[a-z0-9;,.]$/;
const KEYBOARD_HEATMAP_ROWS = KEYBOARD_ROWS.map((row) =>
  row.map(({ key }) => key).filter((key) => HEATMAP_KEY.test(key)),
).filter((row) => row.length > 0);

/**
 * `part` of `whole` as a whole percentage, rounded down so a shown 90% is at
 * least 90%, or null when there is no `whole`. The multiplication comes first
 * so a share that is mathematically whole comes out whole.
 */
function shareOf(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return roundDown(Math.max(0, Math.min(100, (part * 100) / whole)));
}

export const Analytics: React.FC = () => {
  const game = useGame();
  const { importBackup, wipeAchievements, resetProgress } = game;
  const profile = useGameState((state) => state.profile);
  const [confirmMode, setConfirmMode] = useState<
    'NONE' | 'WIPE_ACHIEVEMENTS' | 'FULL_RESET'
  >('NONE');
  // Why the last import was refused, shown beside the import control. A good
  // import clears it (the header's Stars and Credits are the player's proof),
  // and so does a Wipe Stars or a Factory Reset: they replace the Profile the
  // refusal said was left as it was.
  const [refusal, setRefusal] = useState<string | null>(null);
  // The Backup card is the last block of a scrolling panel, so a refusal that
  // appears inside it can land below the fold. Bring the whole card into view,
  // not just the message row, so its bottom padding and border show too
  // (scrolling only as far as needed, and not at all if it is all visible).
  const backupCardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (refusal) backupCardRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [refusal]);

  // The Journey as of today, worked out again only when the Logbook or the
  // day changes, so a settings change doesn't recompute it.
  const today = useGameState((state) => state.today);
  const journey = useMemo(
    () => journeyReport(profile.logbook, today),
    [profile.logbook, today],
  );
  const { totals } = journey;
  // The day under the timeline's cursor, kept here so the parts of the page
  // that follow it (the entries, the keyboard) can read it too.
  const [cursorDay, setCursorDay] = useState<string | null>(null);
  // The entry the timeline last sent the player to: it is scrolled to and
  // ringed for a moment.
  const [jump, setJump] = useState<EntryJump | null>(null);
  useEffect(() => {
    if (jump === null) return;
    const timer = setTimeout(() => setJump(null), RING_MS);
    return () => clearTimeout(timer);
  }, [jump]);
  const jumpToEntry = (id: string) =>
    setJump((last) => ({ id, count: (last?.count ?? 0) + 1 }));

  // A entry's Stars are read live from Stage progress, joined by id to the
  // Sectors the game has today: a Sector that has gone has none to show.
  const starsOf = (sectorId: string) => {
    const sector = CURRICULUM_SECTORS.find(({ id }) => id === sectorId);
    if (sector === undefined) return null;
    return {
      earned: sector.stages.reduce(
        (sum, { id }) => sum + (profile.stagesProgress[id]?.starsEarned ?? 0),
        0,
      ),
      most: maxStarsOf(sector),
    };
  };

  // Each key's First attempts by how they went, over the last 8 weeks.
  const keyAnalytics = Object.fromEntries(
    Object.entries(journey.keys).map(([character, tally]) => [
      character,
      { hits: tally.firstAttempts - tally.misses, misses: tally.misses },
    ]),
  );

  // Calculate Left vs Right hand accuracy
  let leftHits = 0;
  let leftMisses = 0;
  let rightHits = 0;
  let rightMisses = 0;

  Object.entries(keyAnalytics).forEach(([char, stats]) => {
    const info = keyForCharacter(char);
    if (info) {
      if (info.hand === 'left') {
        leftHits += stats.hits;
        leftMisses += stats.misses;
      } else if (info.hand === 'right') {
        rightHits += stats.hits;
        rightMisses += stats.misses;
      }
    }
  });

  const leftAcc = shareOf(leftHits, leftHits + leftMisses) ?? 100;
  const rightAcc = shareOf(rightHits, rightHits + rightMisses) ?? 100;

  // Trouble keys: typed at least 3 times, with more than 12% of them missed
  const troubleKeys = Object.entries(keyAnalytics)
    .filter(([_, stats]) => {
      const total = stats.hits + stats.misses;
      return total >= 3 && stats.misses / total > 0.12;
    })
    .sort(
      (a, b) =>
        b[1].misses / (b[1].hits + b[1].misses) -
        a[1].misses / (a[1].hits + a[1].misses),
    )
    .slice(0, 6);

  const handleExport = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(exportBackup(profile));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `astrotype_backup_${new Date().toISOString().slice(0, 10)}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];
    // Clear the pick, so choosing the same file again still counts as a change.
    input.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const outcome = importBackup(String(reader.result ?? ''));
      setRefusal(outcome.ok ? null : outcome.message);
    };
    reader.onerror = () => setRefusal(NOT_A_BACKUP_MESSAGE);
    reader.readAsText(file);
  };

  return (
    <OverlayShell variant="window" width="4xl" labelledBy="analytics-title">
      {/* The screen itself, out of reach while a confirm is open (the header
          stays reachable). `contents` keeps the panel's flex layout. */}
      <div className="contents" inert={confirmMode !== 'NONE'}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800 bg-slate-950/70">
          <div>
            <span className="block text-xs uppercase font-mono text-cyan-400">
              Touch Typing Diagnostic Center
            </span>
            <h2
              id="analytics-title"
              className="text-xl sm:text-2xl font-bold font-display text-white"
            >
              Typing Analytics & Heatmap
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <OverlayFlightDeckButton />

            <OverlayCloseButton />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-6">
          {/* The Journey in one plain sentence */}
          <p className="text-base sm:text-lg leading-snug text-slate-200">
            {journeySentence(journey.sentence)}
          </p>

          {/* The totals row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                {DAYS_PLAYED_LABEL}
              </span>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-2xl font-bold text-cyan-400 tabular-nums">
                  {totals.daysPlayed.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                {PRACTICE_TIME_LABEL}
              </span>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-2xl font-bold text-amber-400 tabular-nums">
                  {practiceTimeText(totals.practiceSteps)}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                {WORDS_TYPED_LABEL}
              </span>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-2xl font-bold text-white tabular-nums">
                  {totals.wordsTyped.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                {BEST_DAY_LABEL}
              </span>
              <div className="flex items-baseline gap-1 font-mono">
                {totals.bestDay ? (
                  <>
                    <span className="text-2xl font-bold text-emerald-400 tabular-nums">
                      {bestDaySpeedText(totals.bestDay.letterWpm)}
                    </span>
                    <span className="text-xs text-slate-500">WPM</span>
                    <span className="text-xs text-slate-500 ml-1">
                      {dayText(totals.bestDay.day)}
                    </span>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-emerald-400">
                    {NO_BEST_DAY}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* The last 8 weeks, day by day */}
          {journey.sentence.kind !== 'empty' && (
            <JourneyTimeline
              report={journey}
              cursor={cursorDay}
              onCursor={setCursorDay}
              onSelectSector={jumpToEntry}
            />
          )}

          {/* One entry for each Sector flown */}
          {journey.sectors.length > 0 && (
            <SectorEntries
              entries={journey.sectors}
              starsOf={starsOf}
              jump={jump}
            />
          )}

          {/* Hand Balance Breakdown */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
            <h3 className="text-xs uppercase font-mono tracking-wider text-slate-400 mb-3">
              Bilateral Hand Accuracy Balance
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                  <span>Left Hand (ASDF / QWER / ZXCV)</span>
                  <span className="text-cyan-400 font-bold">{leftAcc}%</span>
                </div>
                <div className="h-2 rounded bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-cyan-500"
                    style={{ width: `${leftAcc}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
                  <span>Right Hand (JKL; / UIOP / NM,.)</span>
                  <span className="text-amber-400 font-bold">{rightAcc}%</span>
                </div>
                <div className="h-2 rounded bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${rightAcc}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Keyboard Accuracy Heatmap */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs uppercase font-mono tracking-wider text-slate-400">
                Key Accuracy Heatmap
              </h3>
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />{' '}
                  95%+
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />{' '}
                  88-94%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />{' '}
                  80-87%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />{' '}
                  &lt;80%
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 items-center select-none overflow-x-auto py-2">
              {KEYBOARD_HEATMAP_ROWS.map((row) => (
                <div key={row.join('')} className="flex gap-1.5">
                  {row.map((k) => {
                    const stats = keyAnalytics[k] ||
                      keyAnalytics[k.toUpperCase()] || { hits: 0, misses: 0 };
                    const total = stats.hits + stats.misses;
                    const acc = shareOf(stats.hits, total);

                    let bgClass =
                      'bg-slate-900 border-slate-800 text-slate-500';
                    if (acc !== null) {
                      if (acc >= 95)
                        bgClass =
                          'bg-emerald-950/40 border-emerald-500/50 text-emerald-300';
                      else if (acc >= 88)
                        bgClass =
                          'bg-cyan-950/40 border-cyan-500/50 text-cyan-300';
                      else if (acc >= 80)
                        bgClass =
                          'bg-amber-950/40 border-amber-500/50 text-amber-300';
                      else
                        bgClass =
                          'bg-rose-950/50 border-rose-500/60 text-rose-300 font-bold';
                    }

                    return (
                      <div
                        key={k}
                        title={
                          acc !== null
                            ? `${k.toUpperCase()}: ${acc}% (${stats.hits} hit / ${stats.misses} miss)`
                            : `${k.toUpperCase()}: Not tested yet`
                        }
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-md border flex flex-col items-center justify-center font-mono text-xs transition-colors ${bgClass}`}
                      >
                        <span className="font-bold uppercase text-[11px]">
                          {k}
                        </span>
                        <span className="text-[9px] tabular-nums leading-none">
                          {acc !== null ? `${acc}%` : '-'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Trouble Keys & Pedagogical Tips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
              <h3 className="text-xs uppercase font-mono tracking-wider text-rose-400 mb-2">
                Struggling Reaches / High Error Rate
              </h3>
              {troubleKeys.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {troubleKeys.map(([char, stats]) => {
                    const total = stats.hits + stats.misses;
                    const missRate = Math.round((stats.misses / total) * 100);
                    const info = keyForCharacter(char);

                    return (
                      <div
                        key={char}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 font-bold border border-rose-900">
                            {char === ' ' ? 'SPACE' : char.toUpperCase()}
                          </span>
                          {info && (
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <span
                                className="w-2 h-2 rounded-full inline-block shadow-sm"
                                style={{
                                  backgroundColor:
                                    FINGER_COLOR_MAP[info.finger],
                                }}
                              />
                              <span>
                                {FINGER_DISPLAY_NAMES[info.finger] ||
                                  info.finger}
                              </span>
                            </span>
                          )}
                        </div>
                        <span className="text-rose-400 font-bold">
                          {missRate}% errors
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 py-3">
                  No critical error trends detected. Your finger reaches have
                  high consistency!
                </p>
              )}
            </div>

            {/* Touch Typing Pedagogical Guidance */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60">
              <h3 className="text-xs uppercase font-mono tracking-wider text-cyan-400 mb-2">
                Touch Typing Master Techniques
              </h3>
              <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
                <li>
                  <strong className="text-slate-200">Anchor to F and J:</strong>{' '}
                  Feel the physical tactile nubs with index fingers to re-center
                  without looking at keys.
                </li>
                <li>
                  <strong className="text-slate-200">
                    Opposite Shift Rule:
                  </strong>{' '}
                  When capitalizing with the left hand, press Right Shift with
                  your right pinky, and vice versa.
                </li>
                <li>
                  <strong className="text-slate-200">Smooth Rhythm:</strong>{' '}
                  Consistency is faster than erratic speed bursts. Strive for a
                  steady metronome rhythm.
                </li>
              </ul>
            </div>
          </div>

          {/* Data Backup & Offline Management */}
          <div
            ref={backupCardRef}
            className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="text-xs text-slate-400">
              <span className="font-semibold text-slate-200 block">
                Save & Backup
              </span>
              <span>
                All progress, Stage Stars, and records are safely cached in your
                browser.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Backup</span>
              </button>

              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Import Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={() => setConfirmMode('WIPE_ACHIEVEMENTS')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-900/60 bg-amber-950/40 text-xs font-medium text-amber-300 hover:bg-amber-900/50 hover:text-white transition-colors cursor-pointer"
                title="Wipe your Stars and Stage records"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Wipe Stars</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmMode('FULL_RESET')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-900/60 bg-rose-950/30 text-xs font-medium text-rose-300 hover:bg-rose-900/50 transition-colors cursor-pointer"
                title="Completely reset all starship stats, Credits and achievements"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Factory Reset</span>
              </button>
            </div>

            {refusal && (
              <div className="basis-full flex items-center gap-3">
                <p role="alert" className="text-xs font-medium text-rose-300">
                  {refusal}
                </p>
                <button
                  type="button"
                  onClick={() => setRefusal(null)}
                  className="px-2.5 py-1 rounded-md border border-slate-700 text-xs text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {DISMISS_NOTICE_LABEL}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal Overlay */}
      {confirmMode !== 'NONE' && (
        <OverlayConfirm
          title={
            confirmMode === 'WIPE_ACHIEVEMENTS'
              ? WIPE_STARS_TITLE
              : FACTORY_RESET_TITLE
          }
          message={
            confirmMode === 'WIPE_ACHIEVEMENTS'
              ? wipeStarsMessage(
                  profile.totalStars,
                  clearedStagesOf(profile.stagesProgress),
                )
              : FACTORY_RESET_MESSAGE
          }
          confirmLabel={
            confirmMode === 'WIPE_ACHIEVEMENTS'
              ? 'Confirm Wipe'
              : 'Confirm Reset'
          }
          onConfirm={() => {
            if (confirmMode === 'WIPE_ACHIEVEMENTS') {
              wipeAchievements();
            } else {
              resetProgress();
            }
            setRefusal(null);
            setConfirmMode('NONE');
          }}
          onCancel={() => setConfirmMode('NONE')}
        />
      )}
    </OverlayShell>
  );
};
