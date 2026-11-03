import type React from 'react';
import { Play } from 'lucide-react';
import {
  CURRICULUM_TOTALS,
  FINGER_LANES,
  FIRST_STAGE,
  MAX_STARS_PER_STAGE,
} from '../curriculum/curriculum';
import { useGame } from '../app/useGame';
import { useGameState } from '../app/useGameState';
import { DISMISS_NOTICE_LABEL } from './dismissLabel';

/** The title screen: the Academy briefing, with a way into the curriculum. */
export const AcademyHome: React.FC = () => {
  const { send, dismissLoadNotice } = useGame();
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
        falling Drones down the Action Deck, earn Stars to unlock new Sectors,
        and upgrade your starship shields.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
        <button
          type="button"
          onClick={() =>
            send({
              type: 'PICK_STAGE',
              stageId: FIRST_STAGE.id,
            })
          }
          className="px-6 py-3.5 rounded-xl text-sm sm:text-base flex items-center gap-2 font-bold transition-all cursor-pointer bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-xl shadow-cyan-950"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Begin Home Row</span>
        </button>

        <button
          type="button"
          onClick={() => send({ type: 'OPEN_GALAXY_MAP' })}
          className="px-6 py-3.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-medium text-sm sm:text-base transition-colors cursor-pointer"
        >
          {`View Galaxy Map (${CURRICULUM_TOTALS.sectors} Sectors)`}
        </button>
      </div>

      {(profile.totalStars > 0 ||
        Object.keys(profile.stagesProgress).length > 0) && (
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 px-4 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono text-slate-400">
          <span className="text-amber-400 font-bold">
            ★ {profile.totalStars} Stars Earned
          </span>
        </div>
      )}

      {loadNotice && (
        <div className="mb-8 flex items-center gap-3 text-xs text-slate-500">
          <p role="status">{loadNotice}</p>
          <button
            type="button"
            onClick={dismissLoadNotice}
            className="px-2.5 py-1 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {DISMISS_NOTICE_LABEL}
          </button>
        </div>
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
            Action Deck
          </span>
          <p className="text-xs text-slate-400">
            {`${FINGER_LANES.length} lanes of falling Drones, Perfect timing at the Strike Line, Multipliers and Overdrive.`}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-xs font-mono font-bold text-emerald-400 block mb-1">
            Sector Fleet Progression
          </span>
          <p className="text-xs text-slate-400">
            {`Earn ${MAX_STARS_PER_STAGE} Stars per Stage, unlock gated Sectors, install Deflector Shields, and equip Sound Kits.`}
          </p>
        </div>
      </div>
    </div>
  );
};
