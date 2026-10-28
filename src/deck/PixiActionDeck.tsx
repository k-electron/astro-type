import { Award, Flame, Hand, Sparkles } from 'lucide-react';
import { memo, useLayoutEffect, useRef } from 'react';
import { useGame, useOnFrame } from '../screens/useGame';
import { FINGER_COLOR_MAP } from '../curriculum/curriculum';
import { overdriveScoreFactor } from '../game/rules';
import { useGameState } from '../screens/useGameState';
import { getDeckSession } from './deckSession';

/**
 * The Action Deck: a card with a header bar around a stage that the session's
 * PixiJS Application draws.
 *
 * React reads only what the header bar shows. The deck itself reads the
 * game's snapshot on the Run clock, so React never re-renders it per frame.
 */
export const PixiActionDeck = memo(function PixiActionDeck() {
  const game = useGame();
  const onFrame = useOnFrame();
  const { hyperspaceActive, multiplier, currentStreak, handsVisible } =
    useGameState((state) => ({
      hyperspaceActive: state.run.hyperspaceActive,
      multiplier: state.run.multiplier,
      currentStreak: state.run.currentStreak,
      handsVisible: state.profile.handsVisible,
    }));
  const onToggleHands = () =>
    game.changeSettings({ handsVisible: !handsVisible });
  const stageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const session = getDeckSession({ game, onFrame });
    session.attach(stage);
    return () => session.detach();
  }, [game, onFrame]);

  return (
    <div className="w-full flex flex-col rounded-2xl border border-slate-800 bg-slate-950/80 shadow-2xl overflow-hidden backdrop-blur-md relative">
      {/* Header bar: Sleek HUD indicators */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800/90 bg-slate-900/90 z-30 relative">
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tactile Rhythm Flight Deck</span>
          </div>
          {hyperspaceActive && (
            <span className="flex items-center gap-1 text-[11px] font-mono font-extrabold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)] animate-pulse">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-current" />
              OVERDRIVE x{overdriveScoreFactor(multiplier)}
            </span>
          )}
          {currentStreak >= 10 && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/40">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              {currentStreak} STREAK
            </span>
          )}
        </div>

        {/* Home Row Anchor Guidance & Hand Guide Mode Toggle */}
        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onToggleHands}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono transition-all border ${
              handsVisible
                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Hand Visualizer Guides"
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Hands: {handsVisible ? 'ON' : 'OFF'}</span>
          </button>

          <span className="hidden sm:inline text-slate-500">Home:</span>
          <span
            className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-800 font-bold border"
            style={{
              color: FINGER_COLOR_MAP.LEFT_INDEX,
              borderColor: `${FINGER_COLOR_MAP.LEFT_INDEX}60`,
            }}
            title="Left Index Finger Home Anchor [F]"
          >
            [F]
          </span>
          <span
            className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-800 font-bold border"
            style={{
              color: FINGER_COLOR_MAP.RIGHT_INDEX,
              borderColor: `${FINGER_COLOR_MAP.RIGHT_INDEX}60`,
            }}
            title="Right Index Finger Home Anchor [J]"
          >
            [J]
          </span>
        </div>
      </div>

      {/* The stage: the PixiJS canvas and its accessibility layer go in here. */}
      <div
        ref={stageRef}
        className="relative w-full h-[620px] sm:h-[700px] bg-transparent overflow-hidden select-none"
      />
    </div>
  );
});
