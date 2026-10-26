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
  Music,
  Check,
} from 'lucide-react';
import type { BeatTheme, AudioSynthCore } from '../types/game';

interface HeaderNavProps {
  totalStars: number;
  totalCredits: number;
  isMuted: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
  beatTheme: BeatTheme;
  audioCore?: AudioSynthCore;
  onToggleGlobalMute: () => void;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onSetSoundVolume: (vol: number) => void;
  onSetMusicVolume: (vol: number) => void;
  onSetBeatTheme: (theme: BeatTheme) => void;
  onSetAudioCore?: (core: AudioSynthCore) => void;
  onGoHome: () => void;
  onOpenStages: () => void;
  onOpenHangar: () => void;
  onOpenAnalytics: () => void;
  onOpenCustom: () => void;
  onQuickPlay: () => void;
  isPlaying: boolean;
}

const BEAT_OPTIONS: { id: BeatTheme; name: string; bpm: number }[] = [
  { id: 'NEON_SYNTHWAVE', name: 'Synthwave', bpm: 106 },
  { id: 'CYBER_PULSE', name: 'Cyber Pulse', bpm: 122 },
  { id: 'COSMIC_LOFI', name: 'Cosmic Lo-Fi', bpm: 84 },
];

const CORE_OPTIONS: { id: AudioSynthCore; name: string; desc: string }[] = [
  { id: 'CYBER_SYNTH', name: 'Cyber Synth', desc: 'Sine Chime' },
  { id: 'RETRO_8BIT', name: 'Retro 8-Bit', desc: 'Arcade Pulse' },
  { id: 'DEEP_SPACE', name: 'Deep Space', desc: 'Warm Sub' },
  { id: 'NEO_ACOUSTIC', name: 'Neo Acoustic', desc: 'Kalimba' },
];

export const HeaderNav: React.FC<HeaderNavProps> = ({
  totalStars,
  totalCredits,
  isMuted,
  soundEnabled,
  musicEnabled,
  soundVolume,
  musicVolume,
  beatTheme,
  audioCore = 'CYBER_SYNTH',
  onToggleGlobalMute,
  onToggleSound,
  onToggleMusic,
  onSetSoundVolume,
  onSetMusicVolume,
  onSetBeatTheme,
  onSetAudioCore,
  onGoHome,
  onOpenStages,
  onOpenHangar,
  onOpenAnalytics,
  onOpenCustom,
  onQuickPlay,
  isPlaying,
}) => {
  const [isAudioMenuOpen, setIsAudioMenuOpen] = useState(false);
  const audioMenuRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Screens that cover the page start below the header, so its buttons stay
  // clickable on every screen. They read the header's height from here.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const publish = () =>
      document.documentElement.style.setProperty(
        '--header-height',
        `${header.offsetHeight}px`,
      );
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

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
      ref={headerRef}
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
              {/* Popover Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 block font-semibold">
                    Flight Audio Station
                  </span>
                  <h4 className="text-sm font-bold font-display text-white">
                    Master Sound & Music
                  </h4>
                </div>

                {/* Master Audio Toggle Switch */}
                <button
                  type="button"
                  onClick={onToggleGlobalMute}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium border transition-all cursor-pointer ${
                    isMuted
                      ? 'border-rose-500/60 bg-rose-950/70 text-rose-300 shadow-sm'
                      : 'border-cyan-500/50 bg-cyan-950/50 text-cyan-300 hover:border-cyan-400'
                  }`}
                >
                  {isMuted ? (
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  )}
                  <span>{isMuted ? 'Muted' : 'Active'}</span>
                </button>
              </div>

              {/* Master Mute Active Notice */}
              {isMuted && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                  <span>
                    Global Mute is active. All audio output is silenced.
                  </span>
                  <button
                    type="button"
                    onClick={onToggleGlobalMute}
                    className="underline text-xs font-bold hover:text-rose-200 cursor-pointer ml-2 shrink-0"
                  >
                    Unmute
                  </button>
                </div>
              )}

              {/* Channel 1: Interactive Keystroke & Laser SFX */}
              <div
                className={`flex flex-col gap-2 p-3 rounded-xl border border-slate-800 bg-slate-950/60 transition-opacity ${isMuted ? 'opacity-40' : 'opacity-100'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isMuted}
                      onClick={onToggleSound}
                      title={
                        soundEnabled ? 'Mute Laser SFX' : 'Enable Laser SFX'
                      }
                      className="p-1 rounded hover:bg-slate-800 text-cyan-400 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {soundEnabled ? (
                        <Volume2 className="w-4 h-4" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Keystroke Laser SFX
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Tactile hits, Streak alarms & shield absorbs
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-cyan-300 tabular-nums">
                    {soundEnabled && !isMuted
                      ? Math.round(soundVolume * 100)
                      : 0}
                    %
                  </span>
                </div>

                {/* SFX Volume Slider */}
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    disabled={isMuted}
                    value={soundEnabled && !isMuted ? soundVolume : 0}
                    onChange={(e) =>
                      onSetSoundVolume(parseFloat(e.target.value))
                    }
                    className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Quick Synthesizer Core Selector */}
                {onSetAudioCore && (
                  <div className="pt-2 border-t border-slate-800/80 mt-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
                      Synthesizer Voice
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {CORE_OPTIONS.map((c) => {
                        const isEquipped = audioCore === c.id;
                        return (
                          <button
                            type="button"
                            key={c.id}
                            disabled={isMuted || !soundEnabled}
                            onClick={() => onSetAudioCore(c.id)}
                            className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                              isEquipped && !isMuted && soundEnabled
                                ? 'border-cyan-500/60 bg-cyan-950/50 text-cyan-200'
                                : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold block truncate">
                                {c.name}
                              </span>
                              {isEquipped && (
                                <Check className="w-3 h-3 text-cyan-400 shrink-0" />
                              )}
                            </div>
                            <span className="text-[9px] font-mono text-slate-500 block truncate">
                              {c.desc}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Channel 2: Background Rhythm Beats */}
              <div
                className={`flex flex-col gap-2.5 p-3 rounded-xl border border-slate-800 bg-slate-950/60 transition-opacity ${isMuted ? 'opacity-40' : 'opacity-100'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isMuted}
                      onClick={onToggleMusic}
                      title={
                        musicEnabled
                          ? 'Mute Rhythm Beats'
                          : 'Enable Rhythm Beats'
                      }
                      className="p-1 rounded hover:bg-slate-800 text-fuchsia-400 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {musicEnabled ? (
                        <Music className="w-4 h-4" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Cosmic Rhythm Beats
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Tempo drum machine, synth arpeggios & bass
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-fuchsia-300 tabular-nums">
                    {musicEnabled && !isMuted
                      ? Math.round(musicVolume * 100)
                      : 0}
                    %
                  </span>
                </div>

                {/* Music Volume Slider */}
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    disabled={isMuted}
                    value={musicEnabled && !isMuted ? musicVolume : 0}
                    onChange={(e) =>
                      onSetMusicVolume(parseFloat(e.target.value))
                    }
                    className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-400 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Beat Theme Style Selector */}
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5">
                    Beat Rhythm & BPM
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {BEAT_OPTIONS.map((opt) => {
                      const isSelected = beatTheme === opt.id;
                      return (
                        <button
                          type="button"
                          key={opt.id}
                          disabled={isMuted || !musicEnabled}
                          onClick={() => onSetBeatTheme(opt.id)}
                          className={`p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                            isSelected && !isMuted && musicEnabled
                              ? 'border-fuchsia-500/60 bg-fuchsia-950/50 text-fuchsia-200 shadow-sm'
                              : 'border-slate-800/80 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold block truncate">
                              {opt.name}
                            </span>
                            {isSelected && (
                              <Check className="w-3 h-3 text-fuchsia-400 shrink-0" />
                            )}
                          </div>
                          <span className="text-[9px] font-mono text-slate-500 block">
                            {opt.bpm} BPM
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
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
