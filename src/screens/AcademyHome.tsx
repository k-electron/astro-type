import type React from 'react';
import { Play } from 'lucide-react';
import {
  CURRICULUM_SECTORS,
  CURRICULUM_TOTALS,
} from '../curriculum/curriculum';
import { useGame } from './useGame';
import { useGameState } from './useGameState';

/** The title screen: the Academy briefing, with a way into the curriculum. */
export const AcademyHome: React.FC = () => {
  const { send } = useGame();
  const { profile, loadNotice } = useGameState((state) => ({
    profile: state.profile,
    loadNotice: state.loadNotice,
  }));

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-12 max-w-3xl mx-auto my-auto">
      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
        <span className="w-6 h-6 rounded-full bg-cyan-400 shadow-[0_0_12px_#38bdf8]" />
      </div>

      <span className="text-xs uppercase font-mono tracking-widest text-cyan-400 mb-2">
        Deep Space Flight Academy
      </span>
      <h1 className="text-3xl sm:text-5xl font-extrabold font-display text-white tracking-tight mb-4">
        AstroType: Cosmic Touch Typing
      </h1>
      <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-8 max-w-xl">
        Master touch typing with a comprehensive structured curriculum. Guide
        falling laser notes down the cosmic rhythm highway, unlock interstellar
        sectors with 3-star ratings, and upgrade your starship shields.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
        <button
          type="button"
          onClick={() =>
            send({
              type: 'PICK_STAGE',
              stageId: CURRICULUM_SECTORS[0].stages[0].id,
            })
          }
          className="px-6 py-3.5 rounded-xl text-sm sm:text-base flex items-center gap-2 font-bold transition-all cursor-pointer bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-xl shadow-cyan-950"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Begin Home Row Mission</span>
        </button>

        <button
          type="button"
          onClick={() => send({ type: 'OPEN_GALAXY_MAP' })}
          className="px-6 py-3.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-medium text-sm sm:text-base transition-colors cursor-pointer"
        >
          {`View Galaxy Sectors (${CURRICULUM_TOTALS.sectors} Sectors)`}
        </button>
      </div>

      {(profile.totalStars > 0 ||
        Object.keys(profile.stagesProgress).length > 0) && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-400">
          <span className="text-amber-400 font-bold">
            ★ {profile.totalStars} Stars Earned
          </span>
          <span>·</span>
          <span className="text-slate-400">Curriculum updated?</span>
          <button
            type="button"
            onClick={() => send({ type: 'OPEN_GALAXY_MAP' })}
            className="text-rose-400 hover:text-rose-300 font-bold underline cursor-pointer ml-1"
          >
            Wipe Achievements & Replay
          </button>
        </div>
      )}

      {loadNotice && (
        <p role="status" className="mb-8 text-xs text-slate-500">
          {loadNotice}
        </p>
      )}

      {/* Feature Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full text-left">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-xs font-mono font-bold text-cyan-400 block mb-1">
            Structured Curriculum
          </span>
          <p className="text-xs text-slate-400">
            Home row anchor tactile alignment, top & bottom reaches, 100 common
            words, numbers, and code syntax.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-xs font-mono font-bold text-amber-400 block mb-1">
            Rhythm Space Highway
          </span>
          <p className="text-xs text-slate-400">
            9-lane falling keystroke notes, PERFECT strike timing, Streak
            Multipliers, and Overdrive.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-xs font-mono font-bold text-emerald-400 block mb-1">
            Sector Fleet Progression
          </span>
          <p className="text-xs text-slate-400">
            Earn 3 stars per stage, unlock gated sectors, install Deflector
            Shields, and equip custom audio synths.
          </p>
        </div>
      </div>
    </div>
  );
};
