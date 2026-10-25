import React from 'react';
import {
  Shield,
  Zap,
  Sparkles,
  Volume2,
  Palette,
  Check,
  Play,
} from 'lucide-react';
import {
  ShipUpgrades,
  TrailColorTheme,
  AudioSynthCore,
  Screen,
} from '../types/game';
import { closeLabel, flightDeckLabel } from './closeLabel';
import { UPGRADE_CATALOG } from '../game/profile';

interface HangarUpgradesModalProps {
  upgrades: ShipUpgrades;
  totalCredits: number;
  onUpgradeShields: () => void;
  onUpgradeReactor: () => void;
  onUpgradeSensors: () => void;
  onUnlockOrEquipTheme: (themeId: TrailColorTheme, cost: number) => void;
  onUnlockOrEquipAudio: (coreId: AudioSynthCore, cost: number) => void;
  onClose: () => void;
  onGoToFlightDeck: () => void;
  /** The screen Close returns to. */
  opener?: Screen | null;
  /** A paused Run is waiting, so the Flight Deck button resumes it. */
  runPaused?: boolean;
}

export const HangarUpgradesModal: React.FC<HangarUpgradesModalProps> = ({
  upgrades,
  totalCredits,
  onUpgradeShields,
  onUpgradeReactor,
  onUpgradeSensors,
  onUnlockOrEquipTheme,
  onUnlockOrEquipAudio,
  onClose,
  onGoToFlightDeck,
  opener = null,
  runPaused = false,
}) => {
  const nextShield =
    UPGRADE_CATALOG.deflectorShields[upgrades.deflectorShields];
  const nextReactor =
    UPGRADE_CATALOG.hyperdriveReactor[upgrades.hyperdriveReactor];
  const nextSensor =
    UPGRADE_CATALOG.precisionSensors[upgrades.precisionSensors];

  return (
    <div className="fixed inset-x-0 bottom-0 top-[var(--header-height,0px)] z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6 border-b border-slate-800 bg-slate-950/70">
          <div>
            <span className="block text-xs uppercase font-mono text-cyan-400">
              Starship Engineering Bay
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
              Starship Hangar Upgrades
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-lg font-bold text-cyan-300 tabular-nums">
                  {(totalCredits ?? 0).toLocaleString()}
                </span>
                <span className="text-xs text-cyan-500">Credits</span>
              </div>
            </div>

            {/* Direct Flight Deck Button (Always reliable: resumes flight or launches flight deck) */}
            <button
              onClick={onGoToFlightDeck}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-950/60"
              title="Launch directly into the cockpit flight deck"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{flightDeckLabel(runPaused)}</span>
            </button>

            {/* Context-Aware Return Button */}
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {closeLabel(opener)}
            </button>
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
              {/* Deflector Shields */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-cyan-400">
                      <Shield className="w-4 h-4" />
                      <span className="font-bold text-sm text-white">
                        Deflector Shields
                      </span>
                    </div>
                    <span className="text-xs font-mono text-cyan-400">
                      Tier {upgrades.deflectorShields}/3
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Absorbs typing error keystrokes without breaking your Streak
                    or Multiplier.
                  </p>
                  <div className="flex items-center gap-1.5 mb-4">
                    {[1, 2, 3].map((lvl) => (
                      <div
                        key={lvl}
                        className={`h-2 flex-1 rounded ${
                          lvl <= upgrades.deflectorShields
                            ? 'bg-cyan-500'
                            : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {nextShield ? (
                  <button
                    disabled={totalCredits < nextShield.cost}
                    onClick={() => onUpgradeShields()}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-medium font-mono flex items-center justify-between transition-colors ${
                      totalCredits >= nextShield.cost
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <span>Upgrade Tier {nextShield.level}</span>
                    <span>{nextShield.cost} Cr</span>
                  </button>
                ) : (
                  <div className="w-full py-2 text-center text-xs font-mono text-cyan-400 border border-cyan-500/30 rounded-lg bg-cyan-950/20">
                    Max Tier Installed
                  </div>
                )}
              </div>

              {/* Overdrive Reactor */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Zap className="w-4 h-4" />
                      <span className="font-bold text-sm text-white">
                        Overdrive Reactor
                      </span>
                    </div>
                    <span className="text-xs font-mono text-amber-400">
                      Tier {upgrades.hyperdriveReactor}/3
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Speeds up how fast the Overdrive meter fills, so Overdrive
                    starts sooner.
                  </p>
                  <div className="flex items-center gap-1.5 mb-4">
                    {[1, 2, 3].map((lvl) => (
                      <div
                        key={lvl}
                        className={`h-2 flex-1 rounded ${
                          lvl <= upgrades.hyperdriveReactor
                            ? 'bg-amber-500'
                            : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {nextReactor ? (
                  <button
                    disabled={totalCredits < nextReactor.cost}
                    onClick={() => onUpgradeReactor()}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-medium font-mono flex items-center justify-between transition-colors ${
                      totalCredits >= nextReactor.cost
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <span>Upgrade Tier {nextReactor.level}</span>
                    <span>{nextReactor.cost} Cr</span>
                  </button>
                ) : (
                  <div className="w-full py-2 text-center text-xs font-mono text-amber-400 border border-amber-500/30 rounded-lg bg-amber-950/20">
                    Max Tier Installed
                  </div>
                )}
              </div>

              {/* Precision Sensors */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Sparkles className="w-4 h-4" />
                      <span className="font-bold text-sm text-white">
                        Precision Sensors
                      </span>
                    </div>
                    <span className="text-xs font-mono text-emerald-400">
                      Tier {upgrades.precisionSensors}/3
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3">
                    Expands the rhythm highway strike timing window for PERFECT
                    score multipliers.
                  </p>
                  <div className="flex items-center gap-1.5 mb-4">
                    {[1, 2, 3].map((lvl) => (
                      <div
                        key={lvl}
                        className={`h-2 flex-1 rounded ${
                          lvl <= upgrades.precisionSensors
                            ? 'bg-emerald-500'
                            : 'bg-slate-800'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {nextSensor ? (
                  <button
                    disabled={totalCredits < nextSensor.cost}
                    onClick={() => onUpgradeSensors()}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-medium font-mono flex items-center justify-between transition-colors ${
                      totalCredits >= nextSensor.cost
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <span>Upgrade Tier {nextSensor.level}</span>
                    <span>{nextSensor.cost} Cr</span>
                  </button>
                ) : (
                  <div className="w-full py-2 text-center text-xs font-mono text-emerald-400 border border-emerald-500/30 rounded-lg bg-emerald-950/20">
                    Max Tier Installed
                  </div>
                )}
              </div>
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
              {UPGRADE_CATALOG.themes.map((theme) => {
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
                      disabled={!isUnlocked && totalCredits < theme.cost}
                      onClick={() => onUnlockOrEquipTheme(theme.id, theme.cost)}
                      className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-mono transition-colors ${
                        isEquipped
                          ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800 cursor-default'
                          : isUnlocked
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            : totalCredits >= theme.cost
                              ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold'
                              : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {isEquipped
                        ? 'Active'
                        : isUnlocked
                          ? 'Equip'
                          : `${theme.cost} Cr`}
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
              {UPGRADE_CATALOG.audioCores.map((core) => {
                const isUnlocked = upgrades.unlockedAudioCores.includes(
                  core.id,
                );
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
                        {core.desc}
                      </p>
                    </div>

                    <button
                      disabled={!isUnlocked && totalCredits < core.cost}
                      onClick={() => onUnlockOrEquipAudio(core.id, core.cost)}
                      className={`w-full py-1.5 px-2 rounded-lg text-[11px] font-mono transition-colors ${
                        isEquipped
                          ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800 cursor-default'
                          : isUnlocked
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            : totalCredits >= core.cost
                              ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold'
                              : 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      {isEquipped
                        ? 'Active'
                        : isUnlocked
                          ? 'Equip'
                          : `${core.cost} Cr`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
