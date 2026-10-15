import React, { useState } from 'react';
import { FingerZone } from '../types/game';
import { FINGER_LANES, KEY_FINGER_MAP } from '../data/curriculum';
import { Sparkles, Hand, Keyboard, ArrowDown, ShieldAlert } from 'lucide-react';

interface MasterKeyboardGuideProps {
  activeChar: string | null;
  lastPressedKey: string | null;
}

interface KeyConfig {
  key: string;
  display: string;
  finger: FingerZone;
  width?: string;
  isBump?: boolean;
  row: number;
  col: number;
}

const KEYBOARD_LAYOUT: KeyConfig[][] = [
  // Row 0: Numbers & Symbols
  [
    { key: '`', display: '~ `', finger: 'LEFT_PINKY', row: 0, col: 0 },
    { key: '1', display: '! 1', finger: 'LEFT_PINKY', row: 0, col: 1 },
    { key: '2', display: '@ 2', finger: 'LEFT_RING', row: 0, col: 2 },
    { key: '3', display: '# 3', finger: 'LEFT_MIDDLE', row: 0, col: 3 },
    { key: '4', display: '$ 4', finger: 'LEFT_INDEX', row: 0, col: 4 },
    { key: '5', display: '% 5', finger: 'LEFT_INDEX', row: 0, col: 5 },
    { key: '6', display: '^ 6', finger: 'RIGHT_INDEX', row: 0, col: 6 },
    { key: '7', display: '& 7', finger: 'RIGHT_INDEX', row: 0, col: 7 },
    { key: '8', display: '* 8', finger: 'RIGHT_MIDDLE', row: 0, col: 8 },
    { key: '9', display: '( 9', finger: 'RIGHT_RING', row: 0, col: 9 },
    { key: '0', display: ') 0', finger: 'RIGHT_PINKY', row: 0, col: 10 },
    { key: '-', display: '_ -', finger: 'RIGHT_PINKY', row: 0, col: 11 },
    { key: '=', display: '+ =', finger: 'RIGHT_PINKY', row: 0, col: 12 },
    { key: 'Backspace', display: 'Bksp', finger: 'RIGHT_PINKY', width: 'w-12 sm:w-14', row: 0, col: 13 },
  ],
  // Row 1: Top Row
  [
    { key: 'Tab', display: 'Tab', finger: 'LEFT_PINKY', width: 'w-10 sm:w-12', row: 1, col: 0 },
    { key: 'q', display: 'Q', finger: 'LEFT_PINKY', row: 1, col: 1 },
    { key: 'w', display: 'W', finger: 'LEFT_RING', row: 1, col: 2 },
    { key: 'e', display: 'E', finger: 'LEFT_MIDDLE', row: 1, col: 3 },
    { key: 'r', display: 'R', finger: 'LEFT_INDEX', row: 1, col: 4 },
    { key: 't', display: 'T', finger: 'LEFT_INDEX', row: 1, col: 5 },
    { key: 'y', display: 'Y', finger: 'RIGHT_INDEX', row: 1, col: 6 },
    { key: 'u', display: 'U', finger: 'RIGHT_INDEX', row: 1, col: 7 },
    { key: 'i', display: 'I', finger: 'RIGHT_MIDDLE', row: 1, col: 8 },
    { key: 'o', display: 'O', finger: 'RIGHT_RING', row: 1, col: 9 },
    { key: 'p', display: 'P', finger: 'RIGHT_PINKY', row: 1, col: 10 },
    { key: '[', display: '{ [', finger: 'RIGHT_PINKY', row: 1, col: 11 },
    { key: ']', display: '} ]', finger: 'RIGHT_PINKY', row: 1, col: 12 },
    { key: '\\', display: '| \\', finger: 'RIGHT_PINKY', width: 'w-9 sm:w-10', row: 1, col: 13 },
  ],
  // Row 2: Home Row
  [
    { key: 'CapsLock', display: 'Caps', finger: 'LEFT_PINKY', width: 'w-12 sm:w-14', row: 2, col: 0 },
    { key: 'a', display: 'A', finger: 'LEFT_PINKY', row: 2, col: 1 },
    { key: 's', display: 'S', finger: 'LEFT_RING', row: 2, col: 2 },
    { key: 'd', display: 'D', finger: 'LEFT_MIDDLE', row: 2, col: 3 },
    { key: 'f', display: 'F', finger: 'LEFT_INDEX', isBump: true, row: 2, col: 4 },
    { key: 'g', display: 'G', finger: 'LEFT_INDEX', row: 2, col: 5 },
    { key: 'h', display: 'H', finger: 'RIGHT_INDEX', row: 2, col: 6 },
    { key: 'j', display: 'J', finger: 'RIGHT_INDEX', isBump: true, row: 2, col: 7 },
    { key: 'k', display: 'K', finger: 'RIGHT_MIDDLE', row: 2, col: 8 },
    { key: 'l', display: 'L', finger: 'RIGHT_RING', row: 2, col: 9 },
    { key: ';', display: ': ;', finger: 'RIGHT_PINKY', row: 2, col: 10 },
    { key: "'", display: '" \'', finger: 'RIGHT_PINKY', row: 2, col: 11 },
    { key: 'Enter', display: 'Enter', finger: 'RIGHT_PINKY', width: 'w-14 sm:w-16', row: 2, col: 12 },
  ],
  // Row 3: Bottom Row
  [
    { key: 'ShiftLeft', display: 'Shift', finger: 'LEFT_PINKY', width: 'w-14 sm:w-16', row: 3, col: 0 },
    { key: 'z', display: 'Z', finger: 'LEFT_PINKY', row: 3, col: 1 },
    { key: 'x', display: 'X', finger: 'LEFT_RING', row: 3, col: 2 },
    { key: 'c', display: 'C', finger: 'LEFT_MIDDLE', row: 3, col: 3 },
    { key: 'v', display: 'V', finger: 'LEFT_INDEX', row: 3, col: 4 },
    { key: 'b', display: 'B', finger: 'LEFT_INDEX', row: 3, col: 5 },
    { key: 'n', display: 'N', finger: 'RIGHT_INDEX', row: 3, col: 6 },
    { key: 'm', display: 'M', finger: 'RIGHT_INDEX', row: 3, col: 7 },
    { key: ',', display: '< ,', finger: 'RIGHT_MIDDLE', row: 3, col: 8 },
    { key: '.', display: '> .', finger: 'RIGHT_RING', row: 3, col: 9 },
    { key: '/', display: '? /', finger: 'RIGHT_PINKY', row: 3, col: 10 },
    { key: 'ShiftRight', display: 'Shift', finger: 'RIGHT_PINKY', width: 'w-16 sm:w-20', row: 3, col: 11 },
  ],
  // Row 4: Space Bar Row
  [
    { key: 'ControlLeft', display: 'Ctrl', finger: 'LEFT_PINKY', width: 'w-10 sm:w-12', row: 4, col: 0 },
    { key: 'AltLeft', display: 'Alt', finger: 'LEFT_RING', width: 'w-10 sm:w-12', row: 4, col: 1 },
    { key: ' ', display: 'SPACEBAR', finger: 'THUMB', width: 'w-56 sm:w-80', row: 4, col: 2 },
    { key: 'AltRight', display: 'Alt', finger: 'RIGHT_RING', width: 'w-10 sm:w-12', row: 4, col: 3 },
    { key: 'ControlRight', display: 'Ctrl', finger: 'RIGHT_PINKY', width: 'w-10 sm:w-12', row: 4, col: 4 },
  ],
];

// Descriptive touch-typing reach motion guidance
function getReachDescription(char: string): string {
  if (char === ' ') return 'Rest thumbs on Spacebar';
  const c = char.toLowerCase();
  if ('asdfjkl;'.includes(c)) return 'Resting on Home Row';
  if ('gh'.includes(c)) return 'Inward center reach on Home Row';
  if ('qwertyuiop[]'.includes(c)) return 'Reach UP to Top Row';
  if ('zxcvbnm,./'.includes(c)) return 'Reach DOWN to Bottom Row';
  if ('`1234567890-='.includes(c)) return 'Reach UP to Number Row';
  return 'Symbol combination reach';
}

const FINGER_DISPLAY_NAMES: Record<FingerZone, string> = {
  LEFT_PINKY: 'Left Pinky',
  LEFT_RING: 'Left Ring Finger',
  LEFT_MIDDLE: 'Left Middle Finger',
  LEFT_INDEX: 'Left Index Finger',
  THUMB: 'Thumb (Spacebar)',
  RIGHT_INDEX: 'Right Index Finger',
  RIGHT_MIDDLE: 'Right Middle Finger',
  RIGHT_RING: 'Right Ring Finger',
  RIGHT_PINKY: 'Right Pinky',
};

// Finger definitions for Left & Right Hands
const LEFT_HAND_FINGERS: Array<{
  zone: FingerZone;
  name: string;
  shortName: string;
  homeKey: string;
  color: string;
  keys: string;
}> = [
  { zone: 'LEFT_PINKY', name: 'Pinky', shortName: 'L.Pinky', homeKey: 'A', color: '#ec4899', keys: 'Q, A, Z, 1, Tab, Caps, Shift' },
  { zone: 'LEFT_RING', name: 'Ring', shortName: 'L.Ring', homeKey: 'S', color: '#a855f7', keys: 'W, S, X, 2' },
  { zone: 'LEFT_MIDDLE', name: 'Middle', shortName: 'L.Mid', homeKey: 'D', color: '#3b82f6', keys: 'E, D, C, 3' },
  { zone: 'LEFT_INDEX', name: 'Index', shortName: 'L.Index', homeKey: 'F', color: '#06b6d4', keys: 'R, T, F, G, V, B, 4, 5' },
  { zone: 'THUMB', name: 'Thumb', shortName: 'Thumb', homeKey: 'Space', color: '#10b981', keys: 'Spacebar' },
];

const RIGHT_HAND_FINGERS: Array<{
  zone: FingerZone;
  name: string;
  shortName: string;
  homeKey: string;
  color: string;
  keys: string;
}> = [
  { zone: 'THUMB', name: 'Thumb', shortName: 'Thumb', homeKey: 'Space', color: '#10b981', keys: 'Spacebar' },
  { zone: 'RIGHT_INDEX', name: 'Index', shortName: 'R.Index', homeKey: 'J', color: '#f59e0b', keys: 'Y, U, H, J, N, M, 6, 7' },
  { zone: 'RIGHT_MIDDLE', name: 'Middle', shortName: 'R.Mid', homeKey: 'K', color: '#f97316', keys: 'I, K, <, 8' },
  { zone: 'RIGHT_RING', name: 'Ring', shortName: 'R.Ring', homeKey: 'L', color: '#f43f5e', keys: 'O, L, >, 9' },
  { zone: 'RIGHT_PINKY', name: 'Pinky', shortName: 'R.Pinky', homeKey: ';', color: '#8b5cf6', keys: 'P, [, ], ;, \', Enter, ?' },
];

export const MasterKeyboardGuide: React.FC<MasterKeyboardGuideProps> = ({
  activeChar,
  lastPressedKey,
}) => {
  const [viewMode, setViewMode] = useState<'BOTH' | 'KEYBOARD' | 'HANDS'>('BOTH');

  const activeCharInfo = activeChar
    ? KEY_FINGER_MAP[activeChar] || KEY_FINGER_MAP[activeChar.toLowerCase()]
    : null;

  const targetFinger: FingerZone | null = activeCharInfo ? activeCharInfo.finger : null;
  const isShiftNeeded = activeCharInfo?.shiftRequired || false;
  const recommendedShift = activeCharInfo?.recommendedShiftHand;
  const targetKeyLower = activeChar ? (activeChar === ' ' ? ' ' : activeChar.toLowerCase()) : null;

  const getFingerLane = (zone: FingerZone) => FINGER_LANES.find((l) => l.finger === zone);
  const activeLane = targetFinger ? getFingerLane(targetFinger) : null;
  const reachDesc = activeChar ? getReachDescription(activeChar) : 'Position hands on home row (A S D F & J K L ;)';

  return (
    <div className="w-full flex flex-col gap-3 p-3 sm:p-4 rounded-2xl border border-slate-800 bg-slate-900/95 shadow-2xl backdrop-blur-md">
      {/* 1. Master Guidance Command Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 sm:px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-950/80">
        {/* Left: Active Key & Direct Instruction */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Key badge */}
          <div
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl border-2 flex items-center justify-center font-mono font-black text-lg sm:text-xl shadow-lg shrink-0 transition-all duration-150"
            style={{
              backgroundColor: activeLane ? `${activeLane.color}25` : 'rgba(6, 182, 212, 0.2)',
              borderColor: activeLane?.color || '#06b6d4',
              color: activeLane?.color || '#38bdf8',
              boxShadow: activeLane ? `0 0 16px ${activeLane.color}60` : undefined,
            }}
          >
            {activeChar === ' ' ? '␣' : activeChar || '—'}
          </div>

          <div className="flex flex-col min-w-0">
            {/* Primary Action Banner */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase font-mono tracking-wider text-slate-400">
                Action:
              </span>
              <span className="text-sm sm:text-base font-extrabold text-white leading-tight">
                {targetFinger ? (
                  <>
                    Press <span style={{ color: activeLane?.color || '#38bdf8' }}>[{activeChar === ' ' ? 'SPACE' : activeChar}]</span> with{' '}
                    <span className="underline decoration-2 underline-offset-2" style={{ textDecorationColor: activeLane?.color }}>
                      {FINGER_DISPLAY_NAMES[targetFinger]}
                    </span>
                  </>
                ) : (
                  'Rest hands on Home Row (A S D F · J K L ;)'
                )}
              </span>

              {/* Shift Guidance Pill */}
              {isShiftNeeded && recommendedShift && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-300 bg-amber-950/90 px-2 py-0.5 rounded border border-amber-500 shadow-sm animate-pulse">
                  <ShieldAlert className="w-3 h-3 text-amber-400" />
                  HOLD {recommendedShift.toUpperCase()} SHIFT
                </span>
              )}
            </div>

            {/* Reach instruction & Timing status */}
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
              <span className="text-cyan-400 font-medium">{reachDesc}</span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                STRIKE ZONE LOCKED — PRESS NOW
              </span>
            </div>
          </div>
        </div>

        {/* Right: View Mode Selector */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 shrink-0">
          <button
            onClick={() => setViewMode('BOTH')}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-colors flex items-center gap-1.5 ${
              viewMode === 'BOTH'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Hands + Keys</span>
          </button>
          <button
            onClick={() => setViewMode('KEYBOARD')}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-colors flex items-center gap-1.5 ${
              viewMode === 'KEYBOARD'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Keys Only</span>
          </button>
          <button
            onClick={() => setViewMode('HANDS')}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-colors flex items-center gap-1.5 ${
              viewMode === 'HANDS'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Hands Only</span>
          </button>
        </div>
      </div>

      {/* 2. Anatomical Dual-Hands Guidance Station (Left Hand & Right Hand) */}
      {(viewMode === 'BOTH' || viewMode === 'HANDS') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-1">
          {/* LEFT HAND STATION */}
          <div
            className={`p-3 rounded-xl border transition-all duration-200 ${
              activeCharInfo?.hand === 'left' || (isShiftNeeded && recommendedShift === 'left')
                ? 'border-cyan-500/60 bg-cyan-950/20 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                : 'border-slate-800 bg-slate-950/60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono tracking-wider uppercase text-cyan-400">
                  Left Hand
                </span>
                <span className="text-[11px] text-slate-500 font-mono">Home Row: A S D F</span>
              </div>
              {activeCharInfo?.hand === 'left' && (
                <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-500/60 animate-pulse">
                  TYPING HAND
                </span>
              )}
              {isShiftNeeded && recommendedShift === 'left' && (
                <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-500 animate-pulse">
                  HOLD SHIFT HAND
                </span>
              )}
            </div>

            {/* 5 Finger Cards for Left Hand */}
            <div className="grid grid-cols-5 gap-1.5">
              {LEFT_HAND_FINGERS.map((f) => {
                const isTarget = targetFinger === f.zone && activeCharInfo?.hand !== 'right';
                const isShiftFinger = isShiftNeeded && recommendedShift === 'left' && f.zone === 'LEFT_PINKY';
                const isHighlight = isTarget || isShiftFinger;

                return (
                  <div
                    key={f.zone}
                    className={`flex flex-col items-center p-2 rounded-lg border text-center transition-all duration-150 ${
                      isTarget
                        ? 'border-white bg-slate-900 text-white shadow-lg scale-105 z-10'
                        : isShiftFinger
                        ? 'border-amber-400 bg-amber-950/80 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-105 z-10'
                        : 'border-slate-800/80 bg-slate-900/60 text-slate-400'
                    }`}
                    style={{
                      borderColor: isTarget ? f.color : isShiftFinger ? '#fbbf24' : undefined,
                      boxShadow: isTarget ? `0 0 16px ${f.color}80` : undefined,
                    }}
                  >
                    {/* Visual Finger Tip Indicator */}
                    <div
                      className={`w-4 h-5 rounded-t-full mb-1 border transition-all ${
                        isHighlight ? 'scale-110' : 'opacity-40'
                      }`}
                      style={{
                        backgroundColor: isShiftFinger ? '#fbbf24' : f.color,
                        borderColor: isHighlight ? '#ffffff' : f.color,
                        boxShadow: isHighlight ? `0 0 10px ${isShiftFinger ? '#fbbf24' : f.color}` : undefined,
                      }}
                    />

                    {/* Finger Name */}
                    <span className={`text-[11px] font-bold leading-tight ${isHighlight ? 'text-white' : 'text-slate-400'}`}>
                      {f.name}
                    </span>

                    {/* Resting Home Key */}
                    <span
                      className="text-[10px] font-mono mt-0.5 px-1 rounded font-bold"
                      style={{
                        backgroundColor: `${f.color}25`,
                        color: f.color,
                      }}
                    >
                      [{f.homeKey}]
                    </span>

                    {/* Status Pill */}
                    {isTarget && (
                      <span
                        className="mt-1 text-[9px] font-mono font-extrabold uppercase px-1 rounded text-slate-950"
                        style={{ backgroundColor: f.color }}
                      >
                        HIT [{activeChar === ' ' ? 'SPACE' : activeChar}]
                      </span>
                    )}
                    {isShiftFinger && (
                      <span className="mt-1 text-[9px] font-mono font-extrabold uppercase px-1 rounded bg-amber-400 text-amber-950">
                        SHIFT
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT HAND STATION */}
          <div
            className={`p-3 rounded-xl border transition-all duration-200 ${
              activeCharInfo?.hand === 'right' || (isShiftNeeded && recommendedShift === 'right')
                ? 'border-amber-500/60 bg-amber-950/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                : 'border-slate-800 bg-slate-950/60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono tracking-wider uppercase text-amber-400">
                  Right Hand
                </span>
                <span className="text-[11px] text-slate-500 font-mono">Home Row: J K L ;</span>
              </div>
              {activeCharInfo?.hand === 'right' && (
                <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-500/60 animate-pulse">
                  TYPING HAND
                </span>
              )}
              {isShiftNeeded && recommendedShift === 'right' && (
                <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950 px-2 py-0.5 rounded-full border border-amber-500 animate-pulse">
                  HOLD SHIFT HAND
                </span>
              )}
            </div>

            {/* 5 Finger Cards for Right Hand */}
            <div className="grid grid-cols-5 gap-1.5">
              {RIGHT_HAND_FINGERS.map((f) => {
                const isTarget = targetFinger === f.zone && activeCharInfo?.hand !== 'left';
                const isShiftFinger = isShiftNeeded && recommendedShift === 'right' && f.zone === 'RIGHT_PINKY';
                const isHighlight = isTarget || isShiftFinger;

                return (
                  <div
                    key={f.zone}
                    className={`flex flex-col items-center p-2 rounded-lg border text-center transition-all duration-150 ${
                      isTarget
                        ? 'border-white bg-slate-900 text-white shadow-lg scale-105 z-10'
                        : isShiftFinger
                        ? 'border-amber-400 bg-amber-950/80 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-105 z-10'
                        : 'border-slate-800/80 bg-slate-900/60 text-slate-400'
                    }`}
                    style={{
                      borderColor: isTarget ? f.color : isShiftFinger ? '#fbbf24' : undefined,
                      boxShadow: isTarget ? `0 0 16px ${f.color}80` : undefined,
                    }}
                  >
                    {/* Visual Finger Tip Indicator */}
                    <div
                      className={`w-4 h-5 rounded-t-full mb-1 border transition-all ${
                        isHighlight ? 'scale-110' : 'opacity-40'
                      }`}
                      style={{
                        backgroundColor: isShiftFinger ? '#fbbf24' : f.color,
                        borderColor: isHighlight ? '#ffffff' : f.color,
                        boxShadow: isHighlight ? `0 0 10px ${isShiftFinger ? '#fbbf24' : f.color}` : undefined,
                      }}
                    />

                    {/* Finger Name */}
                    <span className={`text-[11px] font-bold leading-tight ${isHighlight ? 'text-white' : 'text-slate-400'}`}>
                      {f.name}
                    </span>

                    {/* Resting Home Key */}
                    <span
                      className="text-[10px] font-mono mt-0.5 px-1 rounded font-bold"
                      style={{
                        backgroundColor: `${f.color}25`,
                        color: f.color,
                      }}
                    >
                      [{f.homeKey}]
                    </span>

                    {/* Status Pill */}
                    {isTarget && (
                      <span
                        className="mt-1 text-[9px] font-mono font-extrabold uppercase px-1 rounded text-slate-950"
                        style={{ backgroundColor: f.color }}
                      >
                        HIT [{activeChar === ' ' ? 'SPACE' : activeChar}]
                      </span>
                    )}
                    {isShiftFinger && (
                      <span className="mt-1 text-[9px] font-mono font-extrabold uppercase px-1 rounded bg-amber-400 text-amber-950">
                        SHIFT
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. Physical Keyboard Grid with Direct 100% Mathematically Aligned On-Key Indicators */}
      {(viewMode === 'BOTH' || viewMode === 'KEYBOARD') && (
        <div className="relative w-full max-w-4xl mx-auto select-none rounded-xl bg-slate-950/90 border border-slate-800/90 p-2 sm:p-3 overflow-x-auto">
          <div className="flex flex-col gap-1 sm:gap-1.5 min-w-[620px] relative">
            {KEYBOARD_LAYOUT.map((row, rowIdx) => (
              <div key={rowIdx} className="flex justify-center gap-1 sm:gap-1.5">
                {row.map((k) => {
                  const laneMatch = FINGER_LANES.find((l) => l.finger === k.finger);
                  const isTargetKey = targetKeyLower === k.key;
                  const isTargetShift =
                    isShiftNeeded &&
                    ((recommendedShift === 'left' && k.key === 'ShiftLeft') ||
                      (recommendedShift === 'right' && k.key === 'ShiftRight'));

                  const isRecentlyPressed = lastPressedKey?.toLowerCase() === k.key.toLowerCase();
                  const laneColor = laneMatch?.color || '#06b6d4';

                  return (
                    <div
                      key={k.key}
                      className={`relative flex items-center justify-center h-8 sm:h-10 rounded-md border text-[11px] sm:text-xs font-mono transition-all duration-100 ${
                        k.width || 'w-7 sm:w-9'
                      } ${
                        isTargetKey
                          ? 'border-white font-extrabold z-30 scale-105 shadow-xl'
                          : isTargetShift
                          ? 'border-amber-400 bg-amber-500/30 text-amber-200 font-bold z-20 scale-105 shadow-[0_0_14px_rgba(245,158,11,0.6)]'
                          : isRecentlyPressed
                          ? 'border-cyan-400 bg-cyan-950/60 text-white'
                          : 'border-slate-800 bg-slate-900/90 text-slate-300 hover:border-slate-700'
                      }`}
                      style={{
                        backgroundColor: isTargetKey ? laneColor : undefined,
                        boxShadow: isTargetKey ? `0 0 18px ${laneColor}` : undefined,
                        color: isTargetKey ? '#030712' : undefined,
                      }}
                    >
                      {/* Direct On-Key Targeting Reticle & Finger Label (Guaranteed 100% Aligned to Key DOM element) */}
                      {isTargetKey && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-mono font-extrabold uppercase bg-slate-950 text-white border border-white shadow-xl flex items-center gap-1 z-40 pointer-events-none animate-bounce">
                          <span>{laneMatch?.label || 'HIT'}</span>
                          <ArrowDown className="w-2.5 h-2.5 text-cyan-400" />
                        </div>
                      )}

                      {/* Direct On-Key Shift Reticle */}
                      {isTargetShift && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded text-[9px] font-mono font-extrabold uppercase bg-amber-950 text-amber-200 border border-amber-400 shadow-xl flex items-center gap-1 z-40 pointer-events-none animate-bounce">
                          <span>HOLD SHIFT</span>
                          <ArrowDown className="w-2.5 h-2.5 text-amber-400" />
                        </div>
                      )}

                      {/* Finger color accent bar at key bottom */}
                      <span
                        className="absolute bottom-0 inset-x-1 h-[2px] rounded-full opacity-60"
                        style={{ backgroundColor: laneColor }}
                      />

                      {/* Tactile F / J tactile bump bar */}
                      {k.isBump && (
                        <span
                          className={`absolute bottom-1 w-2.5 h-0.5 rounded-full ${
                            isTargetKey ? 'bg-slate-950' : 'bg-slate-300'
                          }`}
                        />
                      )}

                      <span className="truncate font-semibold">{k.display}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Finger Lane Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 pt-1 text-[11px] font-mono text-slate-400">
        <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Finger Legend:</span>
        {FINGER_LANES.map((lane) => (
          <div key={lane.laneIndex} className="flex items-center gap-1">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: lane.color }}
            />
            <span className={targetFinger === lane.finger ? 'text-white font-bold' : ''}>
              {lane.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
