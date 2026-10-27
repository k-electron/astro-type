import type React from 'react';
import { useState } from 'react';
import { useGame } from '../store/gameContext';
import { useGameState } from '../store/useGameState';
import { closeLabel, flightDeckLabel } from './closeLabel';
import {
  KEY_FINGER_MAP,
  FINGER_COLOR_MAP,
  FINGER_DISPLAY_NAMES,
} from '../data/curriculum';
import { exportBackup, REFUSED_BACKUP_MESSAGE } from '../game/save';
import { Download, Upload, RotateCcw, AlertTriangle, Play } from 'lucide-react';

export const AnalyticsModal: React.FC = () => {
  const game = useGame();
  const { send, importBackup, wipeAchievements, resetProgress } = game;
  const { profile, opener, runPaused } = useGameState((state) => ({
    profile: state.profile,
    opener: state.opener,
    // A paused Run is waiting, so the Flight Deck button resumes it.
    runPaused: state.phase === 'paused',
  }));
  const onClose = () => send({ type: 'PRESS_CLOSE' });
  const onGoToFlightDeck = () => send({ type: 'PRESS_PLAY' });
  const [confirmMode, setConfirmMode] = useState<
    'NONE' | 'WIPE_ACHIEVEMENTS' | 'FULL_RESET'
  >('NONE');
  // Why the last import was refused, shown beside the import control. A good
  // import clears it: the header's Stars and Credits are the player's proof.
  const [refusal, setRefusal] = useState<string | null>(null);

  const {
    totalPracticeSeconds,
    totalWordsTyped,
    totalKeystrokes,
    totalErrors,
    highestWpmAllTime,
    keyAnalytics,
  } = profile;

  const totalMinutes = Math.floor(totalPracticeSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const timeFormatted = `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;

  const overallAccuracy =
    totalKeystrokes > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(
              ((totalKeystrokes - totalErrors) / totalKeystrokes) * 100,
            ),
          ),
        )
      : 100;

  // Calculate Left vs Right hand accuracy
  let leftHits = 0;
  let leftMisses = 0;
  let rightHits = 0;
  let rightMisses = 0;

  Object.entries(keyAnalytics).forEach(([char, stats]) => {
    const info = KEY_FINGER_MAP[char] || KEY_FINGER_MAP[char.toLowerCase()];
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

  const leftAcc =
    leftHits + leftMisses > 0
      ? Math.round((leftHits / (leftHits + leftMisses)) * 100)
      : 100;
  const rightAcc =
    rightHits + rightMisses > 0
      ? Math.round((rightHits / (rightHits + rightMisses)) * 100)
      : 100;

  // Identify trouble keys (misses > 2 and accuracy < 85%)
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

  // Common keyboard keys for heatmap
  const keyboardHeatmapRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.'],
  ];

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
    reader.onerror = () => setRefusal(REFUSED_BACKUP_MESSAGE);
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--header-height,0px)] z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800 bg-slate-950/70">
          <div>
            <span className="block text-xs uppercase font-mono text-cyan-400">
              Touch Typing Diagnostic Center
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
              Typing Analytics & Heatmap
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onGoToFlightDeck}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-950/60"
              title="Launch directly into the cockpit flight deck"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{flightDeckLabel(runPaused)}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {closeLabel(opener)}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-6">
          {/* Lifetime Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                Highest Speed
              </span>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-2xl font-bold text-cyan-400 tabular-nums">
                  {highestWpmAllTime}
                </span>
                <span className="text-xs text-slate-500">WPM</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                Lifetime Accuracy
              </span>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-2xl font-bold text-emerald-400 tabular-nums">
                  {overallAccuracy}%
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                Words Typed
              </span>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-2xl font-bold text-white tabular-nums">
                  {(totalWordsTyped ?? 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <span className="text-[10px] uppercase font-mono text-slate-500 block mb-1">
                Practice Time
              </span>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-2xl font-bold text-amber-400 tabular-nums">
                  {timeFormatted}
                </span>
              </div>
            </div>
          </div>

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
                  &gt;95%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />{' '}
                  88-95%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />{' '}
                  80-88%
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />{' '}
                  &lt;80%
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 items-center select-none overflow-x-auto py-2">
              {keyboardHeatmapRows.map((row) => (
                <div key={row.join('')} className="flex gap-1.5">
                  {row.map((k) => {
                    const stats = keyAnalytics[k] ||
                      keyAnalytics[k.toUpperCase()] || { hits: 0, misses: 0 };
                    const total = stats.hits + stats.misses;
                    const acc =
                      total > 0 ? Math.round((stats.hits / total) * 100) : null;

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
                    const info =
                      KEY_FINGER_MAP[char] ||
                      KEY_FINGER_MAP[char.toLowerCase()];

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
                  <strong className="text-slate-200">Smooth Cadence:</strong>{' '}
                  Consistency is faster than erratic speed bursts. Strive for a
                  steady metronome rhythm.
                </li>
              </ul>
            </div>
          </div>

          {/* Data Backup & Offline Management */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              <span className="font-semibold text-slate-200 block">
                Offline LocalStorage Storage
              </span>
              <span>
                All progress, star ratings, and records are safely cached in
                your browser.
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
                title="Wipe curriculum stars and stage records for the new curriculum"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Wipe Stars</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmMode('FULL_RESET')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-900/60 bg-rose-950/30 text-xs font-medium text-rose-300 hover:bg-rose-900/50 transition-colors cursor-pointer"
                title="Completely reset all starship stats, credits, and achievements"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Factory Reset</span>
              </button>
            </div>

            {refusal && (
              <p
                role="alert"
                className="basis-full text-xs font-medium text-rose-300"
              >
                {refusal}
              </p>
            )}
          </div>
        </div>

        {/* Confirmation Modal Overlay */}
        {confirmMode !== 'NONE' && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <div className="w-full max-w-md rounded-2xl border border-rose-900/80 bg-slate-900 shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-xl bg-rose-950/60 border border-rose-500/50 flex items-center justify-center mx-auto mb-4 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold font-display text-white mb-2">
                {confirmMode === 'WIPE_ACHIEVEMENTS'
                  ? 'Wipe Curriculum Achievements?'
                  : 'Full Starship Factory Reset?'}
              </h3>

              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {confirmMode === 'WIPE_ACHIEVEMENTS'
                  ? `This will wipe all ${profile.totalStars} ★ stars earned and reset stage completions to 0 so you can experience the classical touch-typing curriculum from the beginning. Your credits and upgrades are preserved.`
                  : 'This will irreversibly wipe ALL starship progress: stars, credits, ship upgrades, accuracy key analytics, and custom themes.'}
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmMode('NONE')}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmMode === 'WIPE_ACHIEVEMENTS') {
                      wipeAchievements();
                    } else {
                      resetProgress();
                    }
                    setConfirmMode('NONE');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono transition-colors shadow-lg shadow-rose-950/50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>
                    {confirmMode === 'WIPE_ACHIEVEMENTS'
                      ? 'Confirm Wipe'
                      : 'Confirm Reset'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
