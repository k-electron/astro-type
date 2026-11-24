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
import { CURRICULUM_SECTORS, maxStarsOf } from '../curriculum/curriculum';
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
import { AnalyticsKeyboard } from './AnalyticsKeyboard';
import { JourneyTimeline } from './JourneyTimeline';
import { KeyStoryPanel } from './KeyStoryPanel';
import { type EntryJump, SectorEntries } from './SectorEntries';

/** How long a entry stays ringed after the timeline sent the player to it. */
const RING_MS = 3000;

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
  // that follow it (the keyboard, the key story) can read it too. It is held
  // while the pointer is anywhere over the timeline, the keyboard and the key
  // story as one block, gaps between them included, and let go only when the
  // pointer leaves the whole block. A day the player clicked is held until
  // they click it again or ask for the latest.
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const [heldDay, setHeldDay] = useState<string | null>(null);
  const cursorDay = hoverDay ?? heldDay;
  // The key whose story is open: the one the player picked, else the one the
  // report starts on.
  const [pickedKey, setPickedKey] = useState<string | null>(null);
  const storyKey = pickedKey ?? journey.startKey;
  const storyRef = useRef<HTMLElement>(null);
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
  const selectDay = (day: string, sectorId: string | null) => {
    setHeldDay((held) => (held === day ? null : day));
    if (sectorId !== null) jumpToEntry(sectorId);
  };
  // A key in the logbook is far below its story, so bring the story into view.
  const pickFromLogbook = (keycap: string) => {
    setPickedKey(keycap);
    storyRef.current?.scrollIntoView?.({
      block: 'nearest',
      behavior: 'smooth',
    });
  };

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
              Typing Analytics
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

          {/* The last 8 weeks, the keyboard and one key's story: one block to
              hover, so the cursor day is held across the gaps between them */}
          {journey.sentence.kind !== 'empty' && (
            // biome-ignore lint/a11y/noStaticElementInteractions: the pointer leaving the block lets go of the day the timeline's cursor was on; it is a pointer-only convenience, and the day can also be held with a click
            <div
              className="flex flex-col gap-6"
              onMouseLeave={() => setHoverDay(null)}
            >
              <JourneyTimeline
                report={journey}
                cursor={cursorDay}
                onCursor={setHoverDay}
                onSelectDay={selectDay}
              />
              <AnalyticsKeyboard
                report={journey}
                cursor={cursorDay}
                held={heldDay}
                onLetGo={() => {
                  // The pointer is on the button, so the hover is let go too.
                  setHeldDay(null);
                  setHoverDay(null);
                }}
                selected={storyKey}
                onPick={setPickedKey}
              />
              <KeyStoryPanel
                panelRef={storyRef}
                story={
                  storyKey === null ? undefined : journey.keyStories[storyKey]
                }
                rebuilding={journey.rebuilding}
              />
            </div>
          )}

          {/* One entry for each Sector flown */}
          {journey.sectors.length > 0 && (
            <SectorEntries
              entries={journey.sectors}
              starsOf={starsOf}
              jump={jump}
              selected={storyKey}
              onPickKey={pickFromLogbook}
            />
          )}

          {/* Touch typing techniques */}
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
                <strong className="text-slate-200">Opposite Shift Rule:</strong>{' '}
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
