import type React from 'react';
import type { ReactNode } from 'react';
import {
  Sparkles,
  Volume2,
  Palette,
  Check,
  Rocket,
  Hexagon,
  Moon,
  type LucideIcon,
} from 'lucide-react';
import {
  OverlayCloseButton,
  OverlayFlightDeckButton,
  OverlayShell,
} from './OverlayShell';
import {
  type CosmeticEntry,
  type CosmeticKind,
  entriesOf,
} from '../game/catalog';
import { type CosmeticStatus, cosmeticStatus } from '../game/profile';
import { useGame } from '../app/useGame';
import { COSMETIC_GROUP_HEADINGS, EQUIP, EQUIPPED } from './hangarLabels';
import { useGameState } from '../app/useGameState';

/** The kinds of Cosmetic in the order the Hangar lists them, each with its icon. */
const COSMETIC_ICONS: Record<CosmeticKind, LucideIcon> = {
  trail: Palette,
  soundKit: Volume2,
  burst: Sparkles,
  backdrop: Moon,
  ship: Rocket,
  hull: Hexagon,
};
const COSMETIC_KINDS = Object.keys(COSMETIC_ICONS) as CosmeticKind[];

/**
 * One Cosmetic's card: its own heading (`children`), and the button that
 * buys it, equips it or says it is Equipped.
 */
const CosmeticCard: React.FC<{
  entry: CosmeticEntry;
  status: CosmeticStatus;
  onBuy: () => void;
  children: ReactNode;
}> = ({ entry, status, onBuy, children }) => {
  const { owned, equipped, affordable } = status;

  return (
    <div
      className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
        equipped
          ? 'border-cyan-400 bg-slate-950 shadow-md shadow-cyan-950/50'
          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
      }`}
    >
      <div>{children}</div>

      <button
        type="button"
        disabled={equipped || (!owned && !affordable)}
        onClick={onBuy}
        className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-mono transition-colors ${
          equipped
            ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800 cursor-default'
            : owned
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              : affordable
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold'
                : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
        }`}
      >
        {equipped ? EQUIPPED : owned ? EQUIP : `${entry.price} Cr`}
      </button>
    </div>
  );
};

export const Hangar: React.FC = () => {
  const { buy } = useGame();
  const profile = useGameState((state) => state.profile);
  const { totalCredits } = profile;

  return (
    <OverlayShell variant="window" width="4xl" labelledBy="hangar-title">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6 border-b border-slate-800 bg-slate-950/70">
        <div>
          <span className="block text-xs uppercase font-mono text-cyan-400">
            Starship Engineering Bay
          </span>
          <h2
            id="hangar-title"
            className="text-xl sm:text-2xl font-bold font-display text-white"
          >
            Starship Hangar
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-lg font-bold text-cyan-300 tabular-nums">
                {totalCredits.toLocaleString()}
              </span>
              <span className="text-xs text-cyan-500">Credits</span>
            </div>
          </div>

          {/* Always reliable: resumes flight or launches the flight deck */}
          <OverlayFlightDeckButton />

          {/* Context-Aware Return Button */}
          <OverlayCloseButton />
        </div>
      </div>

      <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-6">
        {/* Cosmetics: one group for each kind, in the order of COSMETIC_KINDS */}
        {COSMETIC_KINDS.map((kind) => {
          const Icon = COSMETIC_ICONS[kind];
          return (
            <div key={kind}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-semibold uppercase font-mono tracking-wider text-slate-400">
                  {COSMETIC_GROUP_HEADINGS[kind]}
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {entriesOf(kind).map((entry) => {
                  const status = cosmeticStatus(profile, entry);
                  return (
                    <CosmeticCard
                      key={entry.id}
                      entry={entry}
                      status={status}
                      onBuy={() => buy(entry.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="flex items-center gap-2 font-semibold text-xs text-white">
                          {entry.kind === 'trail' && (
                            <span
                              aria-hidden="true"
                              className="w-3.5 h-3.5 rounded-full shrink-0"
                              style={{ backgroundColor: entry.color }}
                            />
                          )}
                          {entry.name}
                        </span>
                        {status.equipped && (
                          <span className="text-[10px] font-mono font-bold uppercase text-cyan-400 flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> {EQUIPPED}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mb-3">
                        {entry.description}
                      </p>
                    </CosmeticCard>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </OverlayShell>
  );
};
