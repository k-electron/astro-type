import React from 'react';
import { FingerZone } from '../types/game';

interface SmallHandVisualizerProps {
  hand: 'left' | 'right';
  activeFinger: FingerZone | null;
  activeKeyDisplay: string | null;
  modifierFinger: FingerZone | null;
  modifierLabel: string | null;
  lastPressedKey?: string | null;
  thumbRole?: 'primary' | 'secondary' | null;
}

interface FingerConfig {
  id: FingerZone;
  name: string;
  home: string;
  x: number;
  tipY: number;
  baseY: number;
  w: number;
  color: string;
  isThumb?: boolean;
  isBump?: boolean;
}

const LEFT_FINGERS: FingerConfig[] = [
  { id: 'LEFT_PINKY', name: 'Pinky', home: 'A', x: 18, tipY: 44, baseY: 80, w: 12, color: '#ec4899' },
  { id: 'LEFT_RING', name: 'Ring', home: 'S', x: 35, tipY: 28, baseY: 76, w: 13, color: '#a855f7' },
  { id: 'LEFT_MIDDLE', name: 'Middle', home: 'D', x: 53, tipY: 18, baseY: 74, w: 13.5, color: '#3b82f6' },
  { id: 'LEFT_INDEX', name: 'Index', home: 'F', x: 71, tipY: 30, baseY: 77, w: 13.5, color: '#06b6d4', isBump: true },
  { id: 'THUMB', name: 'Thumb', home: '␣', x: 91, tipY: 66, baseY: 100, w: 14, color: '#10b981', isThumb: true },
];

const RIGHT_FINGERS: FingerConfig[] = [
  { id: 'THUMB', name: 'Thumb', home: '␣', x: 25, tipY: 66, baseY: 100, w: 14, color: '#10b981', isThumb: true },
  { id: 'RIGHT_INDEX', name: 'Index', home: 'J', x: 45, tipY: 30, baseY: 77, w: 13.5, color: '#f59e0b', isBump: true },
  { id: 'RIGHT_MIDDLE', name: 'Middle', home: 'K', x: 63, tipY: 18, baseY: 74, w: 13.5, color: '#f97316' },
  { id: 'RIGHT_RING', name: 'Ring', home: 'L', x: 81, tipY: 28, baseY: 76, w: 13, color: '#f43f5e' },
  { id: 'RIGHT_PINKY', name: 'Pinky', home: ';', x: 98, tipY: 44, baseY: 80, w: 12, color: '#8b5cf6' },
];

export const SmallHandVisualizer: React.FC<SmallHandVisualizerProps> = ({
  hand,
  activeFinger,
  activeKeyDisplay,
  modifierFinger,
  modifierLabel,
  thumbRole,
}) => {
  const isLeft = hand === 'left';
  const width = 116;
  const height = 164;
  const fingers = isLeft ? LEFT_FINGERS : RIGHT_FINGERS;

  // Check if anything on this hand is active
  const isMainActiveOnThisHand = Boolean(activeFinger);
  const isModActiveOnThisHand = Boolean(modifierFinger);
  const isThumbActive = activeFinger === 'THUMB';
  const isPrimaryThumb = isThumbActive && thumbRole === 'primary';
  const isSecondaryThumb = isThumbActive && thumbRole === 'secondary';

  // Smooth, ergonomic palm silhouette
  const palmPath = isLeft
    ? `M 24 148
       C 22 134, 12 108, 12 84
       C 12 78, 18 76, 24 78
       L 73 78
       C 79 78, 82 82, 82 90
       C 82 100, 93 106, 93 116
       C 93 133, 76 146, 68 148
       Z`
    : `M 92 148
       C 94 134, 104 108, 104 84
       C 104 78, 98 76, 92 78
       L 43 78
       C 37 78, 34 82, 34 90
       C 34 100, 23 106, 23 116
       C 23 133, 40 146, 48 148
       Z`;

  return (
    <div className="flex flex-col items-center justify-between p-2 sm:p-2.5 rounded-2xl bg-slate-950/95 border-2 border-slate-800 shadow-[0_8px_24px_rgba(0,0,0,0.8)] backdrop-blur-md shrink-0 w-24 sm:w-28 transition-all">
      {/* Header with Hand Name & Status */}
      <div className="w-full flex items-center justify-between mb-1 px-0.5">
        <span className="text-[10px] font-mono font-black tracking-wider text-slate-400">
          {isLeft ? 'L. HAND' : 'R. HAND'}
        </span>

        {/* Action Badge */}
        {isPrimaryThumb ? (
          <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
            SPACE
          </span>
        ) : isSecondaryThumb ? (
          <span className="text-[8px] font-mono font-medium px-1 py-0.2 rounded bg-emerald-950/40 text-emerald-400/70 border border-emerald-500/30">
            ALT ␣
          </span>
        ) : isMainActiveOnThisHand ? (
          <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
            {activeKeyDisplay ? activeKeyDisplay.toUpperCase() : 'ACTIVE'}
          </span>
        ) : isModActiveOnThisHand ? (
          <span className="text-[9px] font-mono font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-dashed border-amber-400">
            {modifierLabel || 'SHIFT'}
          </span>
        ) : (
          <span className="text-[9px] font-mono text-slate-600">REST</span>
        )}
      </div>

      {/* SVG Hand Graphic */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto max-h-[142px] select-none"
      >
        <defs>
          {/* Solid glow filter for regular main key highlight */}
          <filter id={`glow-main-${hand}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          {/* Dotted glow filter for modifier highlight */}
          <filter id={`glow-mod-${hand}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Subtle Palm Silhouette */}
        <path
          d={palmPath}
          fill="#0b1120"
          stroke="#1e293b"
          strokeWidth="1.5"
        />

        {/* Subtle Palm Crease / Alignment guideline */}
        <path
          d={
            isLeft
              ? 'M 28 98 C 42 108, 60 106, 75 92'
              : 'M 88 98 C 74 108, 56 106, 41 92'
          }
          fill="none"
          stroke="#1e293b"
          strokeWidth="1"
          strokeDasharray="2 3"
        />

        {/* Wrist Base Line */}
        <line
          x1={isLeft ? 24 : 48}
          y1="148"
          x2={isLeft ? 68 : 92}
          y2="148"
          stroke="#334155"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Fingers */}
        {fingers.map((f) => {
          const isMainTarget = activeFinger === f.id;
          const isModTarget = modifierFinger === f.id;
          const isSecondary = f.isThumb && isMainTarget && isSecondaryThumb;
          const isPrimary = f.isThumb && isMainTarget && isPrimaryThumb;
          const h = f.baseY - f.tipY;
          const rx = f.w / 2;

          // Thumb angled toward center spacebar
          const transform = f.isThumb
            ? `rotate(${isLeft ? 22 : -22} ${f.x} ${f.baseY})`
            : undefined;

          // Regular highlight for main key, Dotted highlight for modifier, Softer hue for secondary thumb
          let stroke = '#334155';
          let strokeWidth = '1.2';
          let fill = '#1e293b';
          let strokeDasharray = 'none';
          let filter = 'none';

          if (isSecondary) {
            // SOFTER HUE HIGHLIGHT FOR SECONDARY THUMB (ALTERNATE THUMB OPTION)
            stroke = 'rgba(16, 185, 129, 0.55)';
            strokeWidth = '1.8';
            fill = 'rgba(16, 185, 129, 0.14)';
            filter = 'none';
          } else if (isMainTarget) {
            // REGULAR (SOLID) HIGHLIGHT
            stroke = f.color;
            strokeWidth = '2.5';
            fill = `${f.color}35`;
            filter = `url(#glow-main-${hand})`;
          } else if (isModTarget) {
            // DOTTED HIGHLIGHT FOR MODIFIERS (Shift, Ctrl, etc.)
            stroke = '#fbbf24';
            strokeWidth = '2.5';
            strokeDasharray = '4 3'; // Distinct dotted highlight per user request!
            fill = '#fbbf2425';
            filter = `url(#glow-mod-${hand})`;
          }

          return (
            <g key={f.id} transform={transform}>
              {/* Outer halo ring for active keys */}
              {isMainTarget && !isSecondary && (
                <rect
                  x={f.x - f.w / 2 - 2}
                  y={f.tipY - 2}
                  width={f.w + 4}
                  height={h + 10}
                  rx={rx + 2}
                  fill="none"
                  stroke={f.color}
                  strokeWidth="1"
                  strokeOpacity="0.5"
                  className="animate-pulse"
                />
              )}

              {/* Softer subtle ring for secondary alternate thumb */}
              {isSecondary && (
                <rect
                  x={f.x - f.w / 2 - 1.5}
                  y={f.tipY - 1.5}
                  width={f.w + 3}
                  height={h + 9}
                  rx={rx + 1.5}
                  fill="none"
                  stroke="rgba(16, 185, 129, 0.4)"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              )}

              {isModTarget && (
                <rect
                  x={f.x - f.w / 2 - 2.5}
                  y={f.tipY - 2.5}
                  width={f.w + 5}
                  height={h + 11}
                  rx={rx + 2.5}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                  strokeOpacity="0.8"
                  className="animate-pulse"
                />
              )}

              {/* Finger Capsule Body */}
              <rect
                x={f.x - f.w / 2}
                y={f.tipY}
                width={f.w}
                height={h + 6}
                rx={rx}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                filter={filter}
                className="transition-colors duration-100"
              />

              {/* Fingertip Target / Home Row Anchor Keycap */}
              <circle
                cx={f.x}
                cy={f.tipY + rx}
                r={rx - 1.2}
                fill={
                  isSecondary
                    ? 'rgba(16, 185, 129, 0.25)'
                    : isMainTarget
                    ? f.color
                    : isModTarget
                    ? '#fbbf24'
                    : '#090d16'
                }
                stroke={
                  isSecondary
                    ? 'rgba(16, 185, 129, 0.5)'
                    : isModTarget
                    ? '#fbbf24'
                    : undefined
                }
                strokeWidth={isSecondary || isModTarget ? '1' : undefined}
                strokeDasharray={isModTarget ? '2 2' : undefined}
              />

              {/* Fingertip Character Label */}
              <text
                x={f.x}
                y={f.tipY + rx + 3}
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
                fontSize={isMainTarget && activeKeyDisplay && activeKeyDisplay.length > 1 ? '6.5' : '8'}
                fontWeight="900"
                fill={
                  isSecondary
                    ? '#6ee7b7'
                    : isMainTarget || isModTarget
                    ? '#020617'
                    : '#94a3b8'
                }
              >
                {isMainTarget && activeKeyDisplay
                  ? (activeKeyDisplay === ' ' ? '␣' : activeKeyDisplay.toUpperCase())
                  : isModTarget
                  ? (modifierLabel === 'SHIFT' ? '⇧' : modifierLabel || 'MOD')
                  : f.home}
              </text>

              {/* Tactile bump marker on index fingers (F & J) */}
              {f.isBump && !isMainTarget && !isModTarget && (
                <rect
                  x={f.x - 2}
                  y={f.tipY + rx + 6}
                  width="4"
                  height="1"
                  rx="0.5"
                  fill="#64748b"
                />
              )}

              {/* Base knuckle lane indicator */}
              <circle
                cx={f.x}
                cy={f.baseY}
                r="1.8"
                fill={f.color}
                opacity={isSecondary ? 0.6 : isMainTarget ? 1 : 0.4}
              />
            </g>
          );
        })}
      </svg>

      {/* Footer Finger Alignment Legend */}
      <div className="w-full text-center pt-1 border-t border-slate-800/80">
        <span className="text-[9px] font-mono text-slate-500 tracking-wider truncate block">
          {isPrimaryThumb ? 'THUMB · REC' : isSecondaryThumb ? 'THUMB · ALT' : isLeft ? 'A · S · D · F' : 'J · K · L · ;'}
        </span>
      </div>
    </div>
  );
};
