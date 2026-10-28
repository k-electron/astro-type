import type React from 'react';
import {
  Shield,
  Zap,
  Sparkles,
  Volume2,
  Palette,
  Check,
  type LucideIcon,
} from 'lucide-react';
import {
  OverlayCloseButton,
  OverlayFlightDeckButton,
  OverlayShell,
} from './OverlayShell';
import {
  entriesOf,
  type UpgradeEntry,
  type UpgradeIcon,
  type UpgradeTone,
} from '../game/catalog';
import { useGame } from './useGame';
import { useGameState } from './useGameState';

const UPGRADE_ICONS: Record<UpgradeIcon, LucideIcon> = {
  shield: Shield,
  zap: Zap,
  sparkles: Sparkles,
};

// Whole class names, so Tailwind finds them.
const UPGRADE_TONES: Record<
  UpgradeTone,
  { text: string; bar: string; buy: string; border: string; wash: string }
> = {
  cyan: {
    text: 'text-cyan-400',
    bar: 'bg-cyan-500',
    buy: 'bg-cyan-500 hover:bg-cyan-400',
    border: 'border-cyan-500/30',
    wash: 'bg-cyan-950/20',
  },
  amber: {
    text: 'text-amber-400',
    bar: 'bg-amber-500',
    buy: 'bg-amber-500 hover:bg-amber-400',
    border: 'border-amber-500/30',
    wash: 'bg-amber-950/20',
  },
  emerald: {
    text: 'text-emerald-400',
    bar: 'bg-emerald-500',
    buy: 'bg-emerald-500 hover:bg-emerald-400',
    border: 'border-emerald-500/30',
    wash: 'bg-emerald-950/20',
  },
};

/** One Upgrade's card: its level, and the button for the next level at its catalog price. */
const UpgradeCard: React.FC<{
  entry: UpgradeEntry;
  level: number;
  totalCredits: number;
  onBuy: () => void;
}> = ({ entry, level, totalCredits, onBuy }) => {
  const Icon = UPGRADE_ICONS[entry.icon];
  const tone = UPGRADE_TONES[entry.tone];
  const nextPrice = entry.prices[level];
  const levels = entry.prices.length;

  return (
    <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className={`flex items-center gap-2 ${tone.text}`}>
            <Icon className="w-4 h-4" />
            <span className="font-bold text-sm text-white">{entry.name}</span>
          </div>
          <span className={`text-xs font-mono ${tone.text}`}>
            Tier {level}/{levels}
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-3">{entry.description}</p>
        <div className="flex items-center gap-1.5 mb-4">
          {entry.prices.map((_, index) => {
            const tier = index + 1;
            return (
              <div
                key={tier}
                className={`h-2 flex-1 rounded ${
                  tier <= level ? tone.bar : 'bg-slate-800'
                }`}
              />
            );
          })}
        </div>
      </div>

      {nextPrice !== undefined ? (
        <button
          type="button"
          disabled={totalCredits < nextPrice}
          onClick={onBuy}
          className={`w-full py-2 px-3 rounded-lg text-xs font-medium font-mono flex items-center justify-between transition-colors ${
            totalCredits >= nextPrice
              ? `${tone.buy} text-slate-950 font-bold`
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <span>Upgrade Tier {level + 1}</span>
          <span>{nextPrice} Cr</span>
        </button>
      ) : (
        <div
          className={`w-full py-2 text-center text-xs font-mono ${tone.text} border ${tone.border} rounded-lg ${tone.wash}`}
        >
          Max Tier Installed
        </div>
      )}
    </div>
  );
};

export const Hangar: React.FC = () => {
  const { buy } = useGame();
  const { upgrades, totalCredits } = useGameState((state) => ({
    upgrades: state.profile.upgrades,
    totalCredits: state.profile.totalCredits,
  }));

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
            Starship Hangar Upgrades
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

      {/* Upgrade Cards Container */}
      <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-6">
        {/* Functional Ship Modules */}
        <div>
          <h3 className="text-sm font-semibold uppercase font-mono tracking-wider text-slate-400 mb-3">
            Ship Performance Systems
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {entriesOf('upgrade').map((entry) => (
              <UpgradeCard
                key={entry.id}
                entry={entry}
                level={upgrades[entry.field]}
                totalCredits={totalCredits}
                onBuy={() => buy(entry.id)}
              />
            ))}
          </div>
        </div>

        {/* Cosmetics: Photon Trail Themes */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold uppercase font-mono tracking-wider text-slate-400">
              Photon Highway Laser Themes
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {entriesOf('trail').map((theme) => {
              const isUnlocked = upgrades.unlockedThemes.includes(theme.id);
              const isEquipped = upgrades.equippedTrailTheme === theme.id;

              return (
                <div
                  key={theme.id}
                  className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                    isEquipped
                      ? 'border-cyan-400 bg-slate-950 shadow-md shadow-cyan-950/50'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: theme.color }}
                      />
                      {isEquipped && (
                        <span className="text-[10px] font-mono font-bold text-cyan-400 flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> EQUIPPED
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-xs text-slate-200 block mb-2">
                      {theme.name}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={!isUnlocked && totalCredits < theme.price}
                    onClick={() => buy(theme.id)}
                    className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-mono transition-colors ${
                      isEquipped
                        ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800 cursor-default'
                        : isUnlocked
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          : totalCredits >= theme.price
                            ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold'
                            : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {isEquipped
                      ? 'Active'
                      : isUnlocked
                        ? 'Equip'
                        : `${theme.price} Cr`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Soundscapes: Audio Synthesizer Cores */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold uppercase font-mono tracking-wider text-slate-400">
              Audio Synthesizer Engine Cores
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {entriesOf('core').map((core) => {
              const isUnlocked = upgrades.unlockedAudioCores.includes(core.id);
              const isEquipped = upgrades.equippedAudioCore === core.id;

              return (
                <div
                  key={core.id}
                  className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                    isEquipped
                      ? 'border-cyan-400 bg-slate-950 shadow-md shadow-cyan-950/50'
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-white">
                        {core.name}
                      </span>
                      {isEquipped && (
                        <span className="text-[10px] font-mono font-bold text-cyan-400">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mb-3">
                      {core.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={!isUnlocked && totalCredits < core.price}
                    onClick={() => buy(core.id)}
                    className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-mono transition-colors ${
                      isEquipped
                        ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800 cursor-default'
                        : isUnlocked
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          : totalCredits >= core.price
                            ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold'
                            : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    {isEquipped
                      ? 'Active'
                      : isUnlocked
                        ? 'Equip'
                        : `${core.price} Cr`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </OverlayShell>
  );
};
