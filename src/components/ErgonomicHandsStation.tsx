import React, { useMemo } from 'react';
import { FingerZone } from '../types/game';
import { FINGER_LANES, KEY_FINGER_MAP } from '../data/curriculum';
import { ShieldAlert, Zap } from 'lucide-react';

interface ErgonomicHandsStationProps {
  activeChar: string | null;
  lastPressedKey: string | null;
}

interface FingerInfo {
  id: string; // Unique React ID
  zone: FingerZone;
  name: string;
  shortName: string;
  homeKey: string;
  color: string;
  assignedKeys: string;
}

const LEFT_FINGERS: FingerInfo[] = [
  { id: 'left-pinky', zone: 'LEFT_PINKY', name: 'Pinky', shortName: 'L.Pinky', homeKey: 'A', color: '#ec4899', assignedKeys: 'Q, A, Z, 1, Tab, Caps, Shift' },
  { id: 'left-ring', zone: 'LEFT_RING', name: 'Ring', shortName: 'L.Ring', homeKey: 'S', color: '#a855f7', assignedKeys: 'W, S, X, 2' },
  { id: 'left-middle', zone: 'LEFT_MIDDLE', name: 'Middle', shortName: 'L.Mid', homeKey: 'D', color: '#3b82f6', assignedKeys: 'E, D, C, 3' },
  { id: 'left-index', zone: 'LEFT_INDEX', name: 'Index', shortName: 'L.Index', homeKey: 'F', color: '#06b6d4', assignedKeys: 'R, T, F, G, V, B, 4, 5' },
  { id: 'left-thumb', zone: 'THUMB', name: 'Thumb', shortName: 'L.Thumb', homeKey: 'Space', color: '#10b981', assignedKeys: 'Spacebar' },
];

const RIGHT_FINGERS: FingerInfo[] = [
  { id: 'right-thumb', zone: 'THUMB', name: 'Thumb', shortName: 'R.Thumb', homeKey: 'Space', color: '#10b981', assignedKeys: 'Spacebar' },
  { id: 'right-index', zone: 'RIGHT_INDEX', name: 'Index', shortName: 'R.Index', homeKey: 'J', color: '#f59e0b', assignedKeys: 'Y, U, H, J, N, M, 6, 7' },
  { id: 'right-middle', zone: 'RIGHT_MIDDLE', name: 'Middle', shortName: 'R.Mid', homeKey: 'K', color: '#f97316', assignedKeys: 'I, K, <, 8' },
  { id: 'right-ring', zone: 'RIGHT_RING', name: 'Ring', shortName: 'R.Ring', homeKey: 'L', color: '#f43f5e', assignedKeys: 'O, L, >, 9' },
  { id: 'right-pinky', zone: 'RIGHT_PINKY', name: 'Pinky', shortName: 'R.Pinky', homeKey: ';', color: '#8b5cf6', assignedKeys: 'P, [, ], ;, \', Enter, ?' },
];

function getReachDescription(char: string): string {
  if (char === ' ') return 'Rest right thumb on Spacebar';
  const c = char.toLowerCase();
  if ('asdfjkl;'.includes(c)) return 'Resting on Home Row';
  if ('gh'.includes(c)) return 'Inward center reach on Home Row';
  if ('qwertyuiop[]'.includes(c)) return 'Reach UP to Top Row';
  if ('zxcvbnm,./'.includes(c)) return 'Reach DOWN to Bottom Row';
  if ('`1234567890-='.includes(c)) return 'Reach UP to Number Row';
  return 'Symbol combination reach';
}

export const ErgonomicHandsStation: React.FC<ErgonomicHandsStationProps> = ({
  activeChar,
  lastPressedKey,
}) => {
  const activeCharInfo = useMemo(() => {
    if (!activeChar) return null;
    return KEY_FINGER_MAP[activeChar] || KEY_FINGER_MAP[activeChar.toLowerCase()] || null;
  }, [activeChar]);

  const targetFinger: FingerZone | null = activeCharInfo ? activeCharInfo.finger : null;
  const isShiftNeeded = activeCharInfo?.shiftRequired || false;
  const recommendedShift = activeCharInfo?.recommendedShiftHand || null;

  // Strict 1-finger target resolution (ensures only ONE finger lights up!)
  const activeFingerId: string | null = useMemo(() => {
    if (!activeChar) return null;
    const info = KEY_FINGER_MAP[activeChar] || KEY_FINGER_MAP[activeChar.toLowerCase()];
    if (!info) return null;

    if (info.finger === 'THUMB') {
      return 'right-thumb'; // Standard touch-typing: Space is pressed by the Right Thumb
    }

    if (info.hand === 'left') {
      if (info.finger === 'LEFT_PINKY') return 'left-pinky';
      if (info.finger === 'LEFT_RING') return 'left-ring';
      if (info.finger === 'LEFT_MIDDLE') return 'left-middle';
      if (info.finger === 'LEFT_INDEX') return 'left-index';
    } else if (info.hand === 'right') {
      if (info.finger === 'RIGHT_INDEX') return 'right-index';
      if (info.finger === 'RIGHT_MIDDLE') return 'right-middle';
      if (info.finger === 'RIGHT_RING') return 'right-ring';
      if (info.finger === 'RIGHT_PINKY') return 'right-pinky';
    }
    return null;
  }, [activeChar]);

  // Designated Shift finger (ONLY when Shift is explicitly required)
  const shiftFingerId = useMemo(() => {
    if (!isShiftNeeded || !recommendedShift) return null;
    return recommendedShift === 'left' ? 'left-pinky' : 'right-pinky';
  }, [isShiftNeeded, recommendedShift]);

  const targetLaneInfo = useMemo(() => {
    if (!targetFinger) return null;
    return FINGER_LANES.find((l) => l.finger === targetFinger) || null;
  }, [targetFinger]);

  // Determine last pressed finger for instantaneous registration
  const lastPressedFingerId: string | null = useMemo(() => {
    if (!lastPressedKey) return null;
    const info = KEY_FINGER_MAP[lastPressedKey] || KEY_FINGER_MAP[lastPressedKey.toLowerCase()];
    if (!info) return null;
    if (info.finger === 'THUMB') return 'right-thumb';
    if (info.hand === 'left') {
      if (info.finger === 'LEFT_PINKY') return 'left-pinky';
      if (info.finger === 'LEFT_RING') return 'left-ring';
      if (info.finger === 'LEFT_MIDDLE') return 'left-middle';
      if (info.finger === 'LEFT_INDEX') return 'left-index';
    } else {
      if (info.finger === 'RIGHT_INDEX') return 'right-index';
      if (info.finger === 'RIGHT_MIDDLE') return 'right-middle';
      if (info.finger === 'RIGHT_RING') return 'right-ring';
      if (info.finger === 'RIGHT_PINKY') return 'right-pinky';
    }
    return null;
  }, [lastPressedKey]);

  const reachDesc = activeChar ? getReachDescription(activeChar) : 'Rest hands on Home Row (A S D F & J K L ;)';

  const isLeftHandActive = activeFingerId?.startsWith('left') || shiftFingerId === 'left-pinky';
  const isRightHandActive = activeFingerId?.startsWith('right') || shiftFingerId === 'right-pinky';

  return (
    <div className="w-full flex flex-col gap-3 p-3 sm:p-4 rounded-2xl border border-slate-800/90 bg-slate-900/95 shadow-2xl backdrop-blur-md">
      {/* Ergonomic Directives Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 rounded-xl border border-slate-800 bg-slate-950/80">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ergonomic Finger Placement Guide</span>
          </div>

          <span className="text-xs text-slate-400 font-mono truncate hidden sm:inline">
            {reachDesc}
          </span>
        </div>

        {/* Current Active Finger Badge */}
        {targetFinger && (
          <div className="flex items-center gap-2">
            {isShiftNeeded && recommendedShift && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-300 bg-amber-950/90 px-2 py-0.5 rounded border border-amber-500">
                <ShieldAlert className="w-3 h-3 text-amber-400" />
                HOLD {recommendedShift.toUpperCase()} SHIFT
              </span>
            )}
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-mono font-extrabold uppercase border shadow-md flex items-center gap-1.5"
              style={{
                backgroundColor: `${targetLaneInfo?.color || '#06b6d4'}20`,
                borderColor: targetLaneInfo?.color || '#06b6d4',
                color: targetLaneInfo?.color || '#38bdf8',
                boxShadow: `0 0 12px ${targetLaneInfo?.color || '#06b6d4'}40`,
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: targetLaneInfo?.color || '#38bdf8' }} />
              {activeFingerId?.startsWith('left') ? 'Left' : 'Right'} {targetLaneInfo?.label || 'Finger'} → [{activeChar === ' ' ? 'SPACE' : activeChar}]
            </span>
          </div>
        )}
      </div>

      {/* DUAL HANDS STATIONS: Anatomical Left Hand & Right Hand */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* ================= LEFT HAND STATION ================= */}
        <div
          className={`p-3.5 rounded-xl border transition-all duration-200 flex flex-col gap-3 ${
            isLeftHandActive
              ? 'border-cyan-500/50 bg-cyan-950/20 shadow-[0_0_24px_rgba(6,182,212,0.15)]'
              : 'border-slate-800 bg-slate-950/70'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono tracking-wider uppercase text-cyan-400">
                Left Hand
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Anchors: A S D F</span>
            </div>
            {activeFingerId?.startsWith('left') && (
              <span className="text-[10px] font-mono font-extrabold text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/60">
                ACTIVE TYPING HAND
              </span>
            )}
            {shiftFingerId === 'left-pinky' && (
              <span className="text-[10px] font-mono font-extrabold text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-500 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-amber-400" />
                HOLD SHIFT
              </span>
            )}
          </div>

          {/* Anatomical Left Hand Illustration (SVG) */}
          <div className="relative w-full h-32 flex items-center justify-center bg-slate-900/60 rounded-lg border border-slate-800/80 p-2 overflow-hidden">
            <svg viewBox="0 0 280 140" className="w-full h-full max-w-[280px]">
              {/* Palm Silhouette */}
              <path
                d="M 50 125 C 50 95, 70 80, 110 80 C 150 80, 175 90, 185 125 Z"
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="1.5"
              />
              <circle cx="115" cy="105" r="22" fill="#06b6d4" fillOpacity="0.04" />

              {/* 1. Pinky (A) */}
              {(() => {
                const isTarget = activeFingerId === 'left-pinky';
                const isShift = shiftFingerId === 'left-pinky';
                const isPressed = lastPressedFingerId === 'left-pinky';
                const strokeColor = isShift ? '#fbbf24' : isTarget ? '#ec4899' : '#475569';
                const fillColor = isShift ? '#fbbf24' : isTarget ? '#ec4899' : isPressed ? '#ec4899' : '#1e293b';

                return (
                  <g>
                    <rect x="42" y="42" width="18" height="52" rx="9" fill={fillColor} fillOpacity={isTarget || isShift ? 0.95 : 0.6} stroke={strokeColor} strokeWidth={isTarget || isShift ? 2.5 : 1.2} />
                    {/* Fingertip Solid Highlight Cap */}
                    <circle cx="51" cy="42" r={isTarget || isShift ? 9 : 7} fill={isShift ? '#fbbf24' : '#ec4899'} stroke={isTarget || isShift ? '#ffffff' : 'none'} strokeWidth="1.5" />
                    <text x="51" y="45" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#ffffff" fontFamily="monospace">A</text>
                  </g>
                );
              })()}

              {/* 2. Ring (S) */}
              {(() => {
                const isTarget = activeFingerId === 'left-ring';
                const isPressed = lastPressedFingerId === 'left-ring';
                const strokeColor = isTarget ? '#a855f7' : '#475569';
                const fillColor = isTarget ? '#a855f7' : isPressed ? '#a855f7' : '#1e293b';

                return (
                  <g>
                    <rect x="74" y="22" width="20" height="70" rx="10" fill={fillColor} fillOpacity={isTarget ? 0.95 : 0.6} stroke={strokeColor} strokeWidth={isTarget ? 2.5 : 1.2} />
                    <circle cx="84" cy="22" r={isTarget ? 9.5 : 7.5} fill="#a855f7" stroke={isTarget ? '#ffffff' : 'none'} strokeWidth="1.5" />
                    <text x="84" y="25" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#ffffff" fontFamily="monospace">S</text>
                  </g>
                );
              })()}

              {/* 3. Middle (D) */}
              {(() => {
                const isTarget = activeFingerId === 'left-middle';
                const isPressed = lastPressedFingerId === 'left-middle';
                const strokeColor = isTarget ? '#3b82f6' : '#475569';
                const fillColor = isTarget ? '#3b82f6' : isPressed ? '#3b82f6' : '#1e293b';

                return (
                  <g>
                    <rect x="108" y="12" width="22" height="80" rx="11" fill={fillColor} fillOpacity={isTarget ? 0.95 : 0.6} stroke={strokeColor} strokeWidth={isTarget ? 2.5 : 1.2} />
                    <circle cx="119" cy="12" r={isTarget ? 10 : 8} fill="#3b82f6" stroke={isTarget ? '#ffffff' : 'none'} strokeWidth="1.5" />
                    <text x="119" y="15" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#ffffff" fontFamily="monospace">D</text>
                  </g>
                );
              })()}

              {/* 4. Index (F) */}
              {(() => {
                const isTarget = activeFingerId === 'left-index';
                const isPressed = lastPressedFingerId === 'left-index';
                const strokeColor = isTarget ? '#06b6d4' : '#475569';
                const fillColor = isTarget ? '#06b6d4' : isPressed ? '#06b6d4' : '#1e293b';

                return (
                  <g>
                    <rect x="144" y="26" width="22" height="66" rx="11" fill={fillColor} fillOpacity={isTarget ? 0.95 : 0.6} stroke={strokeColor} strokeWidth={isTarget ? 2.5 : 1.2} />
                    <circle cx="155" cy="26" r={isTarget ? 10 : 8} fill="#06b6d4" stroke={isTarget ? '#ffffff' : 'none'} strokeWidth="1.5" />
                    <text x="155" y="29" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#030712" fontFamily="monospace">F</text>
                  </g>
                );
              })()}

              {/* 5. Left Thumb */}
              {(() => {
                const isTarget = activeFingerId === 'left-thumb';
                const isPressed = lastPressedFingerId === 'left-thumb';
                const strokeColor = isTarget ? '#10b981' : '#475569';
                const fillColor = isTarget ? '#10b981' : isPressed ? '#10b981' : '#1e293b';

                return (
                  <g>
                    <path
                      d="M 174 88 C 190 76, 215 78, 222 92 C 228 104, 215 116, 185 110 Z"
                      fill={fillColor}
                      fillOpacity={isTarget ? 0.95 : 0.6}
                      stroke={strokeColor}
                      strokeWidth={isTarget ? 2.5 : 1.2}
                    />
                    <circle cx="215" cy="94" r={isTarget ? 8.5 : 6.5} fill="#10b981" stroke={isTarget ? '#ffffff' : 'none'} strokeWidth="1.5" />
                    <text x="215" y="97" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#030712" fontFamily="monospace">␣</text>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* 5 Left Finger Reference Cards */}
          <div className="grid grid-cols-5 gap-1.5">
            {LEFT_FINGERS.map((f) => {
              const isTarget = activeFingerId === f.id;
              const isShiftFinger = shiftFingerId === f.id;
              const isHighlight = isTarget || isShiftFinger;

              return (
                <div
                  key={f.id}
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
                  <div
                    className={`w-3.5 h-4 rounded-t-full mb-1 border transition-all ${
                      isHighlight ? 'scale-110' : 'opacity-40'
                    }`}
                    style={{
                      backgroundColor: isShiftFinger ? '#fbbf24' : f.color,
                      borderColor: isHighlight ? '#ffffff' : f.color,
                      boxShadow: isHighlight ? `0 0 10px ${isShiftFinger ? '#fbbf24' : f.color}` : undefined,
                    }}
                  />
                  <span className={`text-[10px] font-bold leading-tight ${isHighlight ? 'text-white' : 'text-slate-400'}`}>
                    {f.name}
                  </span>
                  <span
                    className="text-[9px] font-mono mt-0.5 px-1 rounded font-bold"
                    style={{ backgroundColor: `${f.color}25`, color: f.color }}
                  >
                    [{f.homeKey}]
                  </span>
                  {isTarget && (
                    <span
                      className="mt-1 text-[8px] font-mono font-extrabold uppercase px-1 rounded text-slate-950"
                      style={{ backgroundColor: f.color }}
                    >
                      PRESS
                    </span>
                  )}
                  {isShiftFinger && (
                    <span className="mt-1 text-[8px] font-mono font-extrabold uppercase px-1 rounded bg-amber-400 text-amber-950">
                      SHIFT
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ================= RIGHT HAND STATION ================= */}
        <div
          className={`p-3.5 rounded-xl border transition-all duration-200 flex flex-col gap-3 ${
            isRightHandActive
              ? 'border-amber-500/50 bg-amber-950/20 shadow-[0_0_24px_rgba(245,158,11,0.15)]'
              : 'border-slate-800 bg-slate-950/70'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-mono tracking-wider uppercase text-amber-400">
                Right Hand
              </span>
              <span className="text-[11px] text-slate-500 font-mono">Anchors: J K L ;</span>
            </div>
            {activeFingerId?.startsWith('right') && (
              <span className="text-[10px] font-mono font-extrabold text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-500/60">
                ACTIVE TYPING HAND
              </span>
            )}
            {shiftFingerId === 'right-pinky' && (
              <span className="text-[10px] font-mono font-extrabold text-amber-300 bg-amber-950 px-2 py-0.5 rounded border border-amber-500 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-amber-400" />
                HOLD SHIFT
              </span>
            )}
          </div>

          {/* Anatomical Right Hand Illustration (SVG) */}
          <div className="relative w-full h-32 flex items-center justify-center bg-slate-900/60 rounded-lg border border-slate-800/80 p-2 overflow-hidden">
            <svg viewBox="0 0 280 140" className="w-full h-full max-w-[280px]">
              {/* Palm Silhouette */}
              <path
                d="M 95 125 C 105 90, 130 80, 170 80 C 210 80, 230 95, 230 125 Z"
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="1.5"
              />
              <circle cx="165" cy="105" r="22" fill="#f59e0b" fillOpacity="0.04" />

              {/* 1. Right Thumb (Space) */}
              {(() => {
                const isTarget = activeFingerId === 'right-thumb';
                const isPressed = lastPressedFingerId === 'right-thumb';
                const strokeColor = isTarget ? '#10b981' : '#475569';
                const fillColor = isTarget ? '#10b981' : isPressed ? '#10b981' : '#1e293b';

                return (
                  <g>
                    <path
                      d="M 106 88 C 90 76, 65 78, 58 92 C 52 104, 65 116, 95 110 Z"
                      fill={fillColor}
                      fillOpacity={isTarget ? 0.95 : 0.6}
                      stroke={strokeColor}
                      strokeWidth={isTarget ? 2.5 : 1.2}
                    />
                    <circle cx="65" cy="94" r={isTarget ? 8.5 : 6.5} fill="#10b981" stroke={isTarget ? '#ffffff' : 'none'} strokeWidth="1.5" />
                    <text x="65" y="97" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#030712" fontFamily="monospace">␣</text>
                  </g>
                );
              })()}

              {/* 2. Index (J) */}
              {(() => {
                const isTarget = activeFingerId === 'right-index';
                const isPressed = lastPressedFingerId === 'right-index';
                const strokeColor = isTarget ? '#f59e0b' : '#475569';
                const fillColor = isTarget ? '#f59e0b' : isPressed ? '#f59e0b' : '#1e293b';

                return (
                  <g>
                    <rect x="114" y="26" width="22" height="66" rx="11" fill={fillColor} fillOpacity={isTarget ? 0.95 : 0.6} stroke={strokeColor} strokeWidth={isTarget ? 2.5 : 1.2} />
                    <circle cx="125" cy="26" r={isTarget ? 10 : 8} fill="#f59e0b" stroke={isTarget ? '#ffffff' : 'none'} strokeWidth="1.5" />
                    <text x="125" y="29" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#030712" fontFamily="monospace">J</text>
                  </g>
                );
              })()}

              {/* 3. Middle (K) */}
              {(() => {
                const isTarget = activeFingerId === 'right-middle';
                const isPressed = lastPressedFingerId === 'right-middle';
                const strokeColor = isTarget ? '#f97316' : '#475569';
                const fillColor = isTarget ? '#f97316' : isPressed ? '#f97316' : '#1e293b';

                return (
                  <g>
                    <rect x="150" y="12" width="22" height="80" rx="11" fill={fillColor} fillOpacity={isTarget ? 0.95 : 0.6} stroke={strokeColor} strokeWidth={isTarget ? 2.5 : 1.2} />
                    <circle cx="161" cy="12" r={isTarget ? 10 : 8} fill="#f97316" stroke={isTarget ? '#ffffff' : 'none'} strokeWidth="1.5" />
                    <text x="161" y="15" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#ffffff" fontFamily="monospace">K</text>
                  </g>
                );
              })()}

              {/* 4. Ring (L) */}
              {(() => {
                const isTarget = activeFingerId === 'right-ring';
                const isPressed = lastPressedFingerId === 'right-ring';
                const strokeColor = isTarget ? '#f43f5e' : '#475569';
                const fillColor = isTarget ? '#f43f5e' : isPressed ? '#f43f5e' : '#1e293b';

                return (
                  <g>
                    <rect x="186" y="22" width="20" height="70" rx="10" fill={fillColor} fillOpacity={isTarget ? 0.95 : 0.6} stroke={strokeColor} strokeWidth={isTarget ? 2.5 : 1.2} />
                    <circle cx="196" cy="22" r={isTarget ? 9.5 : 7.5} fill="#f43f5e" stroke={isTarget ? '#ffffff' : 'none'} strokeWidth="1.5" />
                    <text x="196" y="25" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#ffffff" fontFamily="monospace">L</text>
                  </g>
                );
              })()}

              {/* 5. Pinky (;) */}
              {(() => {
                const isTarget = activeFingerId === 'right-pinky';
                const isShift = shiftFingerId === 'right-pinky';
                const isPressed = lastPressedFingerId === 'right-pinky';
                const strokeColor = isShift ? '#fbbf24' : isTarget ? '#8b5cf6' : '#475569';
                const fillColor = isShift ? '#fbbf24' : isTarget ? '#8b5cf6' : isPressed ? '#8b5cf6' : '#1e293b';

                return (
                  <g>
                    <rect x="220" y="42" width="18" height="52" rx="9" fill={fillColor} fillOpacity={isTarget || isShift ? 0.95 : 0.6} stroke={strokeColor} strokeWidth={isTarget || isShift ? 2.5 : 1.2} />
                    <circle cx="229" cy="42" r={isTarget || isShift ? 9 : 7} fill={isShift ? '#fbbf24' : '#8b5cf6'} stroke={isTarget || isShift ? '#ffffff' : 'none'} strokeWidth="1.5" />
                    <text x="229" y="45" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#ffffff" fontFamily="monospace">;</text>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* 5 Right Finger Reference Cards */}
          <div className="grid grid-cols-5 gap-1.5">
            {RIGHT_FINGERS.map((f) => {
              const isTarget = activeFingerId === f.id;
              const isShiftFinger = shiftFingerId === f.id;
              const isHighlight = isTarget || isShiftFinger;

              return (
                <div
                  key={f.id}
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
                  <div
                    className={`w-3.5 h-4 rounded-t-full mb-1 border transition-all ${
                      isHighlight ? 'scale-110' : 'opacity-40'
                    }`}
                    style={{
                      backgroundColor: isShiftFinger ? '#fbbf24' : f.color,
                      borderColor: isHighlight ? '#ffffff' : f.color,
                      boxShadow: isHighlight ? `0 0 10px ${isShiftFinger ? '#fbbf24' : f.color}` : undefined,
                    }}
                  />
                  <span className={`text-[10px] font-bold leading-tight ${isHighlight ? 'text-white' : 'text-slate-400'}`}>
                    {f.name}
                  </span>
                  <span
                    className="text-[9px] font-mono mt-0.5 px-1 rounded font-bold"
                    style={{ backgroundColor: `${f.color}25`, color: f.color }}
                  >
                    [{f.homeKey}]
                  </span>
                  {isTarget && (
                    <span
                      className="mt-1 text-[8px] font-mono font-extrabold uppercase px-1 rounded text-slate-950"
                      style={{ backgroundColor: f.color }}
                    >
                      PRESS
                    </span>
                  )}
                  {isShiftFinger && (
                    <span className="mt-1 text-[8px] font-mono font-extrabold uppercase px-1 rounded bg-amber-400 text-amber-950">
                      SHIFT
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
