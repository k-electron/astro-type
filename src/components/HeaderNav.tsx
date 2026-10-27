import type React from 'react';
import { useState, useRef, useEffect } from 'react';
import {
  Star,
  Sparkles,
  Play,
  Pause,
  Volume2,
  VolumeX,
  SlidersHorizontal,
} from 'lucide-react';
import { useGame } from '../store/gameContext';
import { useGameState } from '../store/useGameState';
import { AudioPanel } from './AudioPanel';

/**
 * `ref` is the header element itself. The layout that owns the header and the
 * screens over it measures it (see `useHeaderHeight`).
 */
export const HeaderNav: React.FC<{ ref?: React.Ref<HTMLElement> }> = ({
  ref,
}) => {
  const game = useGame();
  const { send } = game;
  const { toggleGlobalMute: onToggleGlobalMute } = game.profileActions;
  const { totalStars, totalCredits, isMuted, isPlaying } = useGameState(
    (state) => ({
      totalStars: state.profile.totalStars,
      totalCredits: state.profile.totalCredits,
      isMuted: Boolean(state.profile.globalMuted),
      isPlaying: state.screen === 'flight-deck',
    }),
  );
  const onGoHome = () => send({ type: 'PRESS_HOME' });
  const onOpenStages = () => send({ type: 'OPEN_GALAXY_MAP' });
  const onOpenHangar = () => send({ type: 'OPEN_HANGAR' });
  const onOpenAnalytics = () => send({ type: 'OPEN_ANALYTICS' });
  const onOpenCustom = () => send({ type: 'OPEN_FREE_FLIGHT' });
  const onQuickPlay = () =>
    send({ type: isPlaying ? 'PRESS_PAUSE' : 'PRESS_PLAY' });
  const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
  const audioMenuRef = useRef<HTMLDivElement>(null);

  // Close audio menu on outside click or escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        audioMenuRef.current &&
        !audioMenuRef.current.contains(e.target as Node)
      ) {
        setIsAudioMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // The dropdown takes this Esc; the game doesn't also see it.
        e.preventDefault();
        setIsAudioMenuOpen(false);
      }
    };

    if (isAudioMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAudioMenuOpen]);

  return (
    <header
      ref={ref}
      className="w-full flex items-center justify-between gap-3 sm:gap-6 px-3 sm:px-6 py-3 border-b border-slate-800 bg-slate-950/85 backdrop-blur-md sticky top-0 z-40"
    >
      {/* Zone 1: Brand Wordmark (Go Home) & Gamification Telemetry */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onGoHome}
          title="Return to Academy Home"
          className="text-lg sm:text-xl font-bold font-display tracking-tight text-white hover:text-cyan-400 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 group"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8] group-hover:scale-110 transition-transform" />
          <span>AstroType</span>
        </button>

        {/* Gamification Telemetry: Star Counter & Credits */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-mono ml-1 sm:ml-2">
          <button
            type="button"
            onClick={onOpenStages}
            title="Total Stars Earned across Galaxy Sectors (Click to view Sectors)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-500/40 hover:border-amber-400 text-amber-300 transition-all cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(245,158,11,0.25)]"
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
            <span className="font-bold tabular-nums text-sm text-amber-200">
              {totalStars}
            </span>
            <span className="text-[10px] text-amber-400/80 font-medium">★</span>
          </button>

          <button
            type="button"
            onClick={onOpenHangar}
            title="Starship Credits (Click to open Hangar)"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/40 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 transition-all cursor-pointer shadow-sm hover:shadow-[0_0_12px_rgba(6,182,212,0.25)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-bold tabular-nums text-sm text-cyan-200">
              {(totalCredits ?? 0).toLocaleString()}
            </span>
            <span className="text-[10px] text-cyan-400/80 font-medium">Cr</span>
          </button>
        </div>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-5 text-xs sm:text-sm font-medium text-slate-400">
        <button
          type="button"
          onClick={onGoHome}
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Home
        </button>
        <button
          type="button"
          onClick={onOpenStages}
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Sectors
        </button>
        <button
          type="button"
          onClick={onOpenHangar}
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Hangar
        </button>
        <button
          type="button"
          onClick={onOpenAnalytics}
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Analytics
        </button>
        <button
          type="button"
          onClick={onOpenCustom}
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Free Flight
        </button>
      </nav>

      {/* Zone 3: Holistic Single-Threaded Audio Control & Quick Action */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Unified Audio Station (Single authoritative hub for all sound & music) */}
        <div className="relative" ref={audioMenuRef}>
          <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/90 shadow-sm overflow-hidden">
            {/* 1-Click Fast Master Mute Button */}
            <button
              type="button"
              onClick={onToggleGlobalMute}
              title={
                isMuted
                  ? 'All Audio is MUTED (Click to unmute)'
                  : 'Click to mute all audio instantly'
              }
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-medium transition-colors cursor-pointer ${
                isMuted
                  ? 'bg-rose-950/70 text-rose-300 hover:bg-rose-900/70'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              aria-label={isMuted ? 'Unmute All Audio' : 'Mute All Audio'}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="font-bold text-[11px] text-rose-300 tracking-wide">
                    MUTED
                  </span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-[11px] text-slate-300 hidden lg:inline">
                    Audio
                  </span>
                </>
              )}
            </button>

            {/* Audio Panel Settings Flyout Button */}
            <button
              type="button"
              onClick={() => setIsAudioMenuOpen(!isAudioMenuOpen)}
              title="Open Audio Flight Deck (Volume sliders, Music beats, Synthesizer core)"
              className={`p-1.5 border-l border-slate-800/80 transition-colors cursor-pointer ${
                isAudioMenuOpen
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
              aria-label="Open Audio Flight Deck Settings"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Audio Flight Deck Popover Panel */}
          {isAudioMenuOpen && (
            <div className="absolute right-0 mt-2 w-84 sm:w-92 rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur-xl shadow-2xl p-4 text-slate-200 z-50 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-100">
              <AudioPanel />
            </div>
          )}
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={onQuickPlay}
          className="px-3.5 sm:px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 shadow-md shadow-cyan-950 transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
          title={
            isPlaying
              ? 'Pause active flight session'
              : 'Launch cockpit flight deck'
          }
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause Flight</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Mission</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
