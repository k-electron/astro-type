import type React from 'react';
import { Check, Music, Volume2, VolumeX } from 'lucide-react';
import type { AudioSynthCore, BeatTheme } from '../types/game';
import { useGame } from '../store/gameContext';
import { useGameState } from '../store/useGameState';

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

/**
 * The audio settings: master mute, volume for the laser sounds and for the
 * rhythm beats (each with its own mute), the Synthesizer core and the beat
 * theme. It renders no frame of its own, only its sections, so whatever hosts
 * it (today the header's popover) owns the box and the place on the page.
 */
export const AudioPanel: React.FC = () => {
  const game = useGame();
  const {
    toggleGlobalMute: onToggleGlobalMute,
    toggleSound: onToggleSound,
    toggleMusic: onToggleMusic,
    setSoundVolume: onSetSoundVolume,
    setMusicVolume: onSetMusicVolume,
    setBeatTheme: onSetBeatTheme,
    unlockOrEquipAudio,
  } = game.profileActions;
  const {
    isMuted,
    soundEnabled,
    musicEnabled,
    soundVolume,
    musicVolume,
    beatTheme,
    audioCore,
  } = useGameState((state) => ({
    isMuted: Boolean(state.profile.globalMuted),
    soundEnabled: state.profile.soundEnabled,
    musicEnabled: state.profile.musicEnabled !== false,
    soundVolume: state.profile.soundVolume,
    musicVolume: state.profile.musicVolume ?? 0.4,
    beatTheme: state.profile.beatTheme || 'NEON_SYNTHWAVE',
    audioCore: state.profile.upgrades.equippedAudioCore ?? 'CYBER_SYNTH',
  }));

  return (
    <>
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
          <span>Global Mute is active. All audio output is silenced.</span>
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
              title={soundEnabled ? 'Mute Laser SFX' : 'Enable Laser SFX'}
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
            {soundEnabled && !isMuted ? Math.round(soundVolume * 100) : 0}%
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
            onChange={(e) => onSetSoundVolume(parseFloat(e.target.value))}
            className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 disabled:cursor-not-allowed"
          />
        </div>

        {/* Quick Synthesizer Core Selector */}
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
                  onClick={() => unlockOrEquipAudio(c.id, 0)}
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
              title={musicEnabled ? 'Mute Rhythm Beats' : 'Enable Rhythm Beats'}
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
            {musicEnabled && !isMuted ? Math.round(musicVolume * 100) : 0}%
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
            onChange={(e) => onSetMusicVolume(parseFloat(e.target.value))}
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
    </>
  );
};
