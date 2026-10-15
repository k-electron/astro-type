import React from 'react';
import { Star, Sparkles, Play } from 'lucide-react';

interface HeaderNavProps {
  totalStars: number;
  totalCredits: number;
  onOpenStages: () => void;
  onOpenHangar: () => void;
  onOpenAnalytics: () => void;
  onOpenCustom: () => void;
  onQuickPlay: () => void;
  isPlaying: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  totalStars,
  totalCredits,
  onOpenStages,
  onOpenHangar,
  onOpenAnalytics,
  onOpenCustom,
  onQuickPlay,
  isPlaying,
}) => {
  return (
    <header className="w-full flex items-center justify-between gap-8 px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Brand Wordmark (single text element) */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenStages}
          className="text-lg sm:text-xl font-bold font-display tracking-tight text-white hover:text-cyan-400 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
          <span>AstroType</span>
        </button>

        {/* Clean unboxed metadata separator */}
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-400 ml-2">
          <span className="text-amber-400 flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <strong className="text-white">{totalStars}</strong>★
          </span>
          <span aria-hidden="true">·</span>
          <span className="text-cyan-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <strong className="text-white">{totalCredits.toLocaleString()}</strong> Cr
          </span>
        </div>
      </div>

      {/* Zone 2: 4-5 concise single-line nav links */}
      <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-medium text-slate-400">
        <button
          onClick={onOpenStages}
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Sectors
        </button>
        <button
          onClick={onOpenHangar}
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Hangar
        </button>
        <button
          onClick={onOpenAnalytics}
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Analytics
        </button>
        <button
          onClick={onOpenCustom}
          className="hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Free Flight
        </button>
      </nav>

      {/* Zone 3: 1 Primary Action */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onQuickPlay}
          className="px-4 py-2 text-xs font-bold text-slate-950 bg-cyan-400 rounded-lg hover:bg-cyan-300 shadow-md shadow-cyan-950 transition-all whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>{isPlaying ? 'Mission Active' : 'Start Mission'}</span>
        </button>
      </div>
    </header>
  );
};
