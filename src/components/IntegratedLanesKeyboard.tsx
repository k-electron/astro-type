import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { FallingNote, TrailColorTheme, FingerZone } from '../types/game';
import { FINGER_LANES, KEY_FINGER_MAP, FINGER_COLOR_MAP } from '../data/curriculum';
import { Sparkles, Flame, Award, Hand } from 'lucide-react';
import { SmallHandVisualizer } from './SmallHandVisualizer';

interface IntegratedLanesKeyboardProps {
  notes: FallingNote[];
  hyperspaceActive: boolean;
  multiplier: number;
  currentStreak: number;
  activeLaneIndex: number | null;
  targetLaneIndex: number | null;
  timingFeedback: 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS' | null;
  timingFeedbackKey: number;
  trailTheme: TrailColorTheme;
  activeChar: string | null;
  previousChar?: string | null;
  nextChar?: string | null;
  lastPressedKey: string | null;
  keyboardVisible?: boolean;
  handsVisible?: boolean;
  onToggleHands?: () => void;
  initialHandEnabled?: boolean;
}

interface KeySpec {
  key: string;
  display: string;
  subDisplay?: string;
  finger: FingerZone;
  lane: number;
  units: number; // Mechanical standard units (1u = 1.0)
  isBump?: boolean;
}

// Mechanically balanced ANSI keyboard: EVERY row is exactly 15.0 units!
const KEYBOARD_ROWS: KeySpec[][] = [
  // Row 0: Numbers & Symbols (Total = 15.0 units)
  [
    { key: '`', display: '`', subDisplay: '~', finger: 'LEFT_PINKY', lane: 0, units: 1.0 },
    { key: '1', display: '1', subDisplay: '!', finger: 'LEFT_PINKY', lane: 0, units: 1.0 },
    { key: '2', display: '2', subDisplay: '@', finger: 'LEFT_RING', lane: 1, units: 1.0 },
    { key: '3', display: '3', subDisplay: '#', finger: 'LEFT_MIDDLE', lane: 2, units: 1.0 },
    { key: '4', display: '4', subDisplay: '$', finger: 'LEFT_INDEX', lane: 3, units: 1.0 },
    { key: '5', display: '5', subDisplay: '%', finger: 'LEFT_INDEX', lane: 3, units: 1.0 },
    { key: '6', display: '6', subDisplay: '^', finger: 'RIGHT_INDEX', lane: 5, units: 1.0 },
    { key: '7', display: '7', subDisplay: '&', finger: 'RIGHT_INDEX', lane: 5, units: 1.0 },
    { key: '8', display: '8', subDisplay: '*', finger: 'RIGHT_MIDDLE', lane: 6, units: 1.0 },
    { key: '9', display: '9', subDisplay: '(', finger: 'RIGHT_RING', lane: 7, units: 1.0 },
    { key: '0', display: '0', subDisplay: ')', finger: 'RIGHT_PINKY', lane: 8, units: 1.0 },
    { key: '-', display: '-', subDisplay: '_', finger: 'RIGHT_PINKY', lane: 8, units: 1.0 },
    { key: '=', display: '=', subDisplay: '+', finger: 'RIGHT_PINKY', lane: 8, units: 1.0 },
    { key: 'Backspace', display: '⌫ BACK', finger: 'RIGHT_PINKY', lane: 8, units: 2.0 },
  ],
  // Row 1: Top Row (Total = 15.0 units)
  [
    { key: 'Tab', display: 'TAB ⇥', finger: 'LEFT_PINKY', lane: 0, units: 1.5 },
    { key: 'q', display: 'Q', finger: 'LEFT_PINKY', lane: 0, units: 1.0 },
    { key: 'w', display: 'W', finger: 'LEFT_RING', lane: 1, units: 1.0 },
    { key: 'e', display: 'E', finger: 'LEFT_MIDDLE', lane: 2, units: 1.0 },
    { key: 'r', display: 'R', finger: 'LEFT_INDEX', lane: 3, units: 1.0 },
    { key: 't', display: 'T', finger: 'LEFT_INDEX', lane: 3, units: 1.0 },
    { key: 'y', display: 'Y', finger: 'RIGHT_INDEX', lane: 5, units: 1.0 },
    { key: 'u', display: 'U', finger: 'RIGHT_INDEX', lane: 5, units: 1.0 },
    { key: 'i', display: 'I', finger: 'RIGHT_MIDDLE', lane: 6, units: 1.0 },
    { key: 'o', display: 'O', finger: 'RIGHT_RING', lane: 7, units: 1.0 },
    { key: 'p', display: 'P', finger: 'RIGHT_PINKY', lane: 8, units: 1.0 },
    { key: '[', display: '[', subDisplay: '{', finger: 'RIGHT_PINKY', lane: 8, units: 1.0 },
    { key: ']', display: ']', subDisplay: '}', finger: 'RIGHT_PINKY', lane: 8, units: 1.0 },
    { key: '\\', display: '\\', subDisplay: '|', finger: 'RIGHT_PINKY', lane: 8, units: 1.5 },
  ],
  // Row 2: Home Row (Total = 15.0 units)
  [
    { key: 'CapsLock', display: 'CAPS ⇪', finger: 'LEFT_PINKY', lane: 0, units: 1.75 },
    { key: 'a', display: 'A', finger: 'LEFT_PINKY', lane: 0, units: 1.0 },
    { key: 's', display: 'S', finger: 'LEFT_RING', lane: 1, units: 1.0 },
    { key: 'd', display: 'D', finger: 'LEFT_MIDDLE', lane: 2, units: 1.0 },
    { key: 'f', display: 'F', finger: 'LEFT_INDEX', lane: 3, units: 1.0, isBump: true },
    { key: 'g', display: 'G', finger: 'LEFT_INDEX', lane: 3, units: 1.0 },
    { key: 'h', display: 'H', finger: 'RIGHT_INDEX', lane: 5, units: 1.0 },
    { key: 'j', display: 'J', finger: 'RIGHT_INDEX', lane: 5, units: 1.0, isBump: true },
    { key: 'k', display: 'K', finger: 'RIGHT_MIDDLE', lane: 6, units: 1.0 },
    { key: 'l', display: 'L', finger: 'RIGHT_RING', lane: 7, units: 1.0 },
    { key: ';', display: ';', subDisplay: ':', finger: 'RIGHT_PINKY', lane: 8, units: 1.0 },
    { key: "'", display: "'", subDisplay: '"', finger: 'RIGHT_PINKY', lane: 8, units: 1.0 },
    { key: 'Enter', display: 'ENTER ⏎', finger: 'RIGHT_PINKY', lane: 8, units: 2.25 },
  ],
  // Row 3: Bottom Row (Total = 15.0 units)
  [
    { key: 'ShiftLeft', display: '⇧ SHIFT', finger: 'LEFT_PINKY', lane: 0, units: 2.25 },
    { key: 'z', display: 'Z', finger: 'LEFT_PINKY', lane: 0, units: 1.0 },
    { key: 'x', display: 'X', finger: 'LEFT_RING', lane: 1, units: 1.0 },
    { key: 'c', display: 'C', finger: 'LEFT_MIDDLE', lane: 2, units: 1.0 },
    { key: 'v', display: 'V', finger: 'LEFT_INDEX', lane: 3, units: 1.0 },
    { key: 'b', display: 'B', finger: 'LEFT_INDEX', lane: 3, units: 1.0 },
    { key: 'n', display: 'N', finger: 'RIGHT_INDEX', lane: 5, units: 1.0 },
    { key: 'm', display: 'M', finger: 'RIGHT_INDEX', lane: 5, units: 1.0 },
    { key: ',', display: ',', subDisplay: '<', finger: 'RIGHT_MIDDLE', lane: 6, units: 1.0 },
    { key: '.', display: '.', subDisplay: '>', finger: 'RIGHT_RING', lane: 7, units: 1.0 },
    { key: '/', display: '/', subDisplay: '?', finger: 'RIGHT_PINKY', lane: 8, units: 1.0 },
    { key: 'ShiftRight', display: 'SHIFT ⇧', finger: 'RIGHT_PINKY', lane: 8, units: 2.75 },
  ],
  // Row 4: Space Bar Row (Total = 15.0 units)
  [
    { key: 'ControlLeft', display: 'CTRL', finger: 'LEFT_PINKY', lane: 0, units: 1.5 },
    { key: 'AltLeft', display: 'ALT', finger: 'LEFT_RING', lane: 1, units: 1.25 },
    { key: 'MetaLeft', display: 'CMD', finger: 'THUMB', lane: 4, units: 1.25 },
    { key: ' ', display: 'SPACE', finger: 'THUMB', lane: 4, units: 6.25 },
    { key: 'MetaRight', display: 'CMD', finger: 'THUMB', lane: 4, units: 1.25 },
    { key: 'AltRight', display: 'ALT', finger: 'RIGHT_RING', lane: 7, units: 1.25 },
    { key: 'ControlRight', display: 'CTRL', finger: 'RIGHT_PINKY', lane: 8, units: 2.25 },
  ],
];

const KEY_SPEC_LOOKUP: Record<string, KeySpec> = {};
KEYBOARD_ROWS.forEach((row) => {
  row.forEach((k) => {
    KEY_SPEC_LOOKUP[k.key.toLowerCase()] = k;
  });
});

const THEME_ACCENTS: Record<TrailColorTheme, string> = {
  CYAN: '#06b6d4',
  AMBER: '#f59e0b',
  EMERALD: '#10b981',
  VIOLET: '#8b5cf6',
  SUPERNOVA: '#f43f5e',
};

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

interface FeedbackPopup {
  text: string;
  color: string;
  x: number;
  y: number;
  vy: number;
  alpha: number;
  scale: number;
  life: number;
  maxLife: number;
}

export const IntegratedLanesKeyboard: React.FC<IntegratedLanesKeyboardProps> = ({
  notes,
  hyperspaceActive,
  multiplier,
  currentStreak,
  activeLaneIndex,
  targetLaneIndex,
  timingFeedback,
  timingFeedbackKey,
  trailTheme,
  activeChar,
  previousChar,
  nextChar,
  lastPressedKey,
  keyboardVisible = true,
  handsVisible: controlledHandsVisible,
  onToggleHands,
  initialHandEnabled = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keyboardDeckRef = useRef<HTMLDivElement | null>(null);
  const keyRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Hand visualizer guides mode (controlled or fallback local state)
  const [localHandsVisible, setLocalHandsVisible] = useState<boolean>(initialHandEnabled);
  const handsVisible = controlledHandsVisible !== undefined ? controlledHandsVisible : localHandsVisible;
  const toggleHandsGuide = onToggleHands || (() => setLocalHandsVisible((prev) => !prev));

  // Active target character info
  const activeCharInfo = useMemo(() => {
    if (!activeChar) return null;
    return KEY_FINGER_MAP[activeChar] || KEY_FINGER_MAP[activeChar.toLowerCase()] || null;
  }, [activeChar]);

  const targetKeyLower = activeChar ? (activeChar === ' ' ? ' ' : activeChar.toLowerCase()) : null;
  const isShiftNeeded = activeCharInfo?.shiftRequired || false;
  const recommendedShift = activeCharInfo?.recommendedShiftHand || null;
  const isSpaceActive = activeChar === ' ';

  // Main key target finger, hand, and key display
  const mainKeyFinger: FingerZone | null = activeCharInfo?.finger || null;
  const mainKeyHand: 'left' | 'right' | 'thumb' | null = activeCharInfo?.hand || null;
  const targetKeyDisplay = activeChar ? (activeChar === ' ' ? '␣' : activeChar) : null;

  // Smart ergonomic thumb allocation based on cognitive and motor load:
  // If the preceding keystroke was struck with the LEFT hand -> Left hand muscles are contracted/loaded,
  // so the RIGHT thumb is completely free with lesser cognitive load!
  // If the preceding keystroke was struck with the RIGHT hand -> Left thumb is completely free with lesser cognitive load!
  const smartThumbHand: 'left' | 'right' = useMemo(() => {
    // 1. Evaluate preceding key in the typing stream
    const prev = previousChar || (lastPressedKey && lastPressedKey.length === 1 ? lastPressedKey : null);
    if (prev && prev !== ' ') {
      const prevInfo = KEY_FINGER_MAP[prev] || KEY_FINGER_MAP[prev.toLowerCase()];
      if (prevInfo) {
        if (prevInfo.hand === 'left') return 'right';
        if (prevInfo.hand === 'right') return 'left';
      }
    }

    // 2. If previous character was space or unavailable, evaluate upcoming next character
    if (nextChar && nextChar !== ' ') {
      const nextInfo = KEY_FINGER_MAP[nextChar] || KEY_FINGER_MAP[nextChar.toLowerCase()];
      if (nextInfo) {
        if (nextInfo.hand === 'left') return 'right';
        if (nextInfo.hand === 'right') return 'left';
      }
    }

    // Default touch typing anchor
    return 'right';
  }, [previousChar, nextChar, lastPressedKey]);

  // Modifier combo resolution (Shift, Ctrl, etc.)
  const modifierHand: 'left' | 'right' | null = isShiftNeeded ? recommendedShift : null;
  const modifierFinger: FingerZone | null = isShiftNeeded
    ? recommendedShift === 'left'
      ? 'LEFT_PINKY'
      : 'RIGHT_PINKY'
    : null;
  const modifierLabel: string | null = isShiftNeeded ? 'SHIFT' : null;

  // Track key positions and keyboard deck position in real-time
  const [keyPositions, setKeyPositions] = useState<Record<string, { x: number; y: number; width: number; height: number }>>({});
  const [keyboardTopY, setKeyboardTopY] = useState<number>(180);

  const updateKeyPositions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();

    // Measure keyboard deck top position
    if (keyboardDeckRef.current) {
      const deckRect = keyboardDeckRef.current.getBoundingClientRect();
      setKeyboardTopY(deckRect.top - cRect.top);
    }

    const newPositions: Record<string, { x: number; y: number; width: number; height: number }> = {};
    Object.entries(keyRefs.current).forEach(([k, el]) => {
      if (el) {
        const kRect = el.getBoundingClientRect();
        if (kRect.width > 0) {
          newPositions[k] = {
            x: kRect.left - cRect.left + kRect.width / 2,
            y: kRect.top - cRect.top + kRect.height / 2,
            width: kRect.width,
            height: kRect.height,
          };
        }
      }
    });

    setKeyPositions(newPositions);
  }, []);

  useEffect(() => {
    updateKeyPositions();
    const handleResize = () => updateKeyPositions();
    window.addEventListener('resize', handleResize);

    let observer: ResizeObserver | null = null;
    if (containerRef.current && window.ResizeObserver) {
      observer = new ResizeObserver(() => updateKeyPositions());
      observer.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (observer) observer.disconnect();
    };
  }, [updateKeyPositions]);

  // Particle & FX systems on 2D Canvas (Sparks, Shockwaves, Combat Rating Popups)
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const feedbacksRef = useRef<FeedbackPopup[]>([]);
  const lastHitKeyRef = useRef<number>(timingFeedbackKey);

  // Trigger burst effects on keystroke hit
  useEffect(() => {
    if (timingFeedbackKey !== lastHitKeyRef.current) {
      lastHitKeyRef.current = timingFeedbackKey;

      if (activeChar) {
        const lookupKey = activeChar === ' ' ? ' ' : activeChar.toLowerCase();
        const pos = keyPositions[lookupKey];

        if (pos) {
          const hitColor =
            timingFeedback === 'PERFECT'
              ? '#38bdf8'
              : timingFeedback === 'GREAT'
              ? '#4ade80'
              : timingFeedback === 'GOOD'
              ? '#facc15'
              : '#f43f5e';

          // Spawn 36 high-velocity sparks erupting upward
          const count = timingFeedback === 'PERFECT' ? 36 : 22;
          for (let i = 0; i < count; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.4;
            const speed = 3.5 + Math.random() * 7.0;
            particlesRef.current.push({
              x: pos.x + (Math.random() - 0.5) * (pos.width * 0.4),
              y: pos.y - pos.height * 0.2,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              color: i % 3 === 0 ? '#ffffff' : hitColor,
              size: 2 + Math.random() * 3.5,
              alpha: 1.0,
              life: 0,
              maxLife: 26 + Math.random() * 18,
            });
          }

          // Expanding shockwave ring
          shockwavesRef.current.push({
            x: pos.x,
            y: pos.y,
            radius: pos.width * 0.35,
            maxRadius: pos.width * 1.8,
            color: hitColor,
            alpha: 0.95,
          });

          // Floating combat score feedback
          const textLabel =
            timingFeedback === 'PERFECT'
              ? '+100 PERFECT'
              : timingFeedback === 'GREAT'
              ? '+75 GREAT'
              : timingFeedback === 'GOOD'
              ? '+50 GOOD'
              : 'MISS';

          feedbacksRef.current.push({
            text: textLabel,
            color: hitColor,
            x: pos.x,
            y: pos.y - 25,
            vy: -2.0,
            alpha: 1.0,
            scale: 1.3,
            life: 0,
            maxLife: 32,
          });
        }
      }
    }
  }, [timingFeedbackKey, timingFeedback, activeChar, keyPositions]);

  // Canvas VFX Loop for Hit Sparks, Shockwaves, and Rating Popups
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let isRunning = true;
    let animId: number;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      if (!isRunning) return;
      animId = requestAnimationFrame(render);

      const width = container.clientWidth;
      const height = container.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        updateKeyPositions();
      }

      ctx.clearRect(0, 0, width, height);

      // 1. Draw Sparks (Particles)
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.24; // Gravity pulling sparks downwards
        p.life += 1;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        if (p.alpha > 0) {
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
          return true;
        }
        return false;
      });

      // 2. Draw Expanding Shockwaves
      shockwavesRef.current = shockwavesRef.current.filter((sw) => {
        sw.radius += (sw.maxRadius - sw.radius) * 0.18;
        sw.alpha -= 0.042;

        if (sw.alpha > 0) {
          ctx.strokeStyle = sw.color;
          ctx.lineWidth = 2.5;
          ctx.globalAlpha = Math.max(0, sw.alpha);
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1.0;
          return true;
        }
        return false;
      });

      // 3. Draw Floating Score Rating Popups
      feedbacksRef.current = feedbacksRef.current.filter((fb) => {
        fb.y += fb.vy;
        fb.life += 1;
        fb.scale = Math.max(1.0, fb.scale - 0.015);
        fb.alpha = Math.max(0, 1 - fb.life / fb.maxLife);

        if (fb.alpha > 0) {
          ctx.save();
          ctx.font = '900 13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = fb.color;
          ctx.globalAlpha = fb.alpha;
          ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
          ctx.shadowBlur = 8;
          ctx.fillText(fb.text, fb.x, fb.y);
          ctx.restore();
          return true;
        }
        return false;
      });
    };

    render();

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
    };
  }, [updateKeyPositions]);

  // Active target key position and lane color
  const activeKeyPos = targetKeyLower ? keyPositions[targetKeyLower] : null;
  const activeLaneColor =
    (targetLaneIndex !== null && FINGER_LANES[targetLaneIndex]?.color) || THEME_ACCENTS[trailTheme] || '#06b6d4';

  // Handle direct click/touch on a virtual keycap
  const handleVirtualKeyClick = (k: KeySpec) => {
    let charToSend = k.key;
    if (k.key === 'Backspace') charToSend = 'Backspace';
    else if (k.key === 'Enter') charToSend = 'Enter';
    else if (k.key === 'Tab') charToSend = 'Tab';
    else if (k.key === 'ShiftLeft' || k.key === 'ShiftRight') return;
    else if (k.key === 'CapsLock' || k.key === 'ControlLeft' || k.key === 'ControlRight' || k.key === 'AltLeft' || k.key === 'AltRight' || k.key === 'MetaLeft' || k.key === 'MetaRight') return;

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: charToSend,
        bubbles: true,
      })
    );

    setTimeout(() => {
      window.dispatchEvent(
        new KeyboardEvent('keyup', {
          key: charToSend,
          bubbles: true,
        })
      );
    }, 100);
  };

  return (
    <div className="w-full flex flex-col rounded-2xl border border-slate-800 bg-slate-950/80 shadow-2xl overflow-hidden backdrop-blur-md relative">
      {/* Header bar: Sleek HUD indicators */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800/90 bg-slate-900/90 z-30 relative">
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tactile Rhythm Flight Deck</span>
          </div>
          {hyperspaceActive && (
            <span className="flex items-center gap-1 text-[11px] font-mono font-extrabold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)] animate-pulse">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-current" />
              WARP x{multiplier}
            </span>
          )}
          {currentStreak >= 10 && (
            <span className="hidden sm:flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-500/40">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              {currentStreak} STREAK
            </span>
          )}
        </div>

        {/* Home Row Anchor Guidance & Hand Guide Mode Toggle */}
        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleHandsGuide}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono transition-all border ${
              handsVisible
                ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Hand Visualizer Guides"
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Hands: {handsVisible ? 'ON' : 'OFF'}</span>
          </button>

          <span className="hidden sm:inline text-slate-500">Home:</span>
          <span
            className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-800 font-bold border"
            style={{ color: FINGER_COLOR_MAP.LEFT_INDEX, borderColor: `${FINGER_COLOR_MAP.LEFT_INDEX}60` }}
            title="Left Index Finger Home Anchor [F]"
          >
            [F]
          </span>
          <span
            className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-800 font-bold border"
            style={{ color: FINGER_COLOR_MAP.RIGHT_INDEX, borderColor: `${FINGER_COLOR_MAP.RIGHT_INDEX}60` }}
            title="Right Index Finger Home Anchor [J]"
          >
            [J]
          </span>
        </div>
      </div>

      {/* FLIGHT STAGE: Integrated Drop Highway + Mechanical Receptor Deck */}
      <div
        ref={containerRef}
        className="relative w-full h-[440px] sm:h-[480px] bg-transparent overflow-hidden flex flex-col justify-between select-none"
      >
        {/* Canvas for Hit Sparks, Shockwaves, and Combat Rating Popups */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10 block" />

        {/* 1. LASER GUIDANCE MARKER (Layer z-5: Single diffused center line with ramp up and down glow) */}
        {activeKeyPos && (
          <div
            className="absolute top-0 -translate-x-1/2 pointer-events-none transition-all duration-100 ease-out z-5 flex items-center justify-center"
            style={{
              left: `${activeKeyPos.x}px`,
              width: '24px',
              height: `${Math.max(20, activeKeyPos.y)}px`,
            }}
          >
            {/* Outer diffused glow aura (constant width, soft Gaussian dispersion) */}
            <div
              className="absolute inset-y-0 w-full pointer-events-none"
              style={{
                background: `linear-gradient(to bottom, transparent 0%, ${activeLaneColor}15 15%, ${activeLaneColor}45 50%, ${activeLaneColor}15 85%, transparent 100%)`,
                filter: 'blur(4px)',
              }}
            />

            {/* Core diffused luminous beam (constant 2px width, vertical ramp-up and ramp-down) */}
            <div
              className="w-[2px] h-full mx-auto rounded-full pointer-events-none"
              style={{
                background: `linear-gradient(to bottom, transparent 0%, ${activeLaneColor}40 12%, ${activeLaneColor} 50%, ${activeLaneColor}40 88%, transparent 100%)`,
                boxShadow: `0 0 6px ${activeLaneColor}, 0 0 14px ${activeLaneColor}80, 0 0 24px ${activeLaneColor}35`,
              }}
            />
          </div>
        )}

        {/* 2. FALLING KEYS & STAGING QUEUE (Layer z-30: In front of keyboard so next key lands ON keycap, never behind!) */}
        <div className="absolute inset-0 pointer-events-none z-30">
          {notes.map((note, noteIdx) => {
            if (note.status === 'PROCESSED') return null;

            const lookupKey = note.char === ' ' ? ' ' : note.char.toLowerCase();
            const pos = keyPositions[lookupKey];
            if (!pos) return null;

            const laneMatch = FINGER_LANES[note.lane];
            const laneColor = laneMatch?.color || '#06b6d4';
            const isSpace = note.char === ' ';

            // Stop line is strictly above the keyboard deck
            // Queued notes (noteIdx > 0) MUST STOP above the keyboard!
            const stopLineY = Math.max(24, keyboardTopY - 44);

            let topPx = 0;
            if (noteIdx === 0) {
              // The NEXT KEY: Drops down from the staging zone and lands directly ON the target keycap!
              const normProgress = Math.min(1.0, note.yPercent / 84);
              const startY = 16;
              const targetY = pos.y - pos.height / 2;
              topPx = startY + (targetY - startY) * Math.pow(normProgress, 1.25);
            } else {
              // QUEUED NOTES: Stop above the keyboard, waiting in staging queue until it is their turn!
              const parkedY = Math.max(16, stopLineY - (noteIdx - 1) * 44);
              // Gradually travel down from the top to their parked staging position and STOP there
              const travelProgress = Math.min(1.0, note.yPercent / 35);
              topPx = 16 + (parkedY - 16) * Math.pow(travelProgress, 1.1);
            }

            // EXACT SAME SIZE & SHAPE as the corresponding physical key on the keyboard deck!
            const noteWidth = pos.width;
            const noteHeight = pos.height;
            const kSpec = KEY_SPEC_LOOKUP[lookupKey];

            return (
              <div
                key={note.id}
                className={`absolute -translate-x-1/2 flex items-center justify-center rounded-md font-mono transition-transform duration-75 shadow-lg select-none ${
                  noteIdx === 0
                    ? isSpace
                      ? 'bg-slate-900/60 border-2 text-white z-30'
                      : 'bg-slate-900/90 border-2 text-white z-30'
                    : isSpace
                    ? 'bg-slate-900/70 border text-slate-300 opacity-90 z-20'
                    : 'bg-slate-900/95 border text-slate-300 opacity-90 z-20'
                }`}
                style={{
                  left: `${pos.x}px`,
                  top: `${topPx}px`,
                  width: `${noteWidth}px`,
                  height: `${noteHeight}px`,
                  borderColor: noteIdx === 0 ? laneColor : `${laneColor}85`,
                  boxShadow:
                    noteIdx === 0
                      ? `0 3px 0 #020617, 0 0 24px ${laneColor}90, inset 0 1px 1px rgba(255,255,255,0.4)`
                      : `0 3px 0 #020617, 0 4px 10px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)`,
                }}
              >
                {/* Top frosted glass shine */}
                <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-md bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

                {/* Finger color accent bar at bottom of falling note (matches keyboard keycaps!) */}
                <span
                  className={`absolute bottom-0 inset-x-1 rounded-full ${
                    noteIdx === 0 ? 'h-1 opacity-100 shadow-[0_0_8px_currentColor]' : 'h-[2.5px] opacity-75'
                  }`}
                  style={{ backgroundColor: laneColor, color: laneColor }}
                />

                {/* Tactile bump marker on index keys (F & J) */}
                {kSpec?.isBump && (
                  <span
                    className="absolute bottom-1 w-2.5 h-0.5 rounded-full"
                    style={{ backgroundColor: noteIdx === 0 ? '#ffffff' : laneColor }}
                  />
                )}

                {/* Content: Clean, uncluttered falling keycap */}
                {isSpace ? (
                  <span
                    className={`truncate font-mono font-black text-xs tracking-wider select-none ${
                      noteIdx === 0
                        ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)]'
                        : 'text-slate-300'
                    }`}
                  >
                    SPACE
                  </span>
                ) : (
                  <div className="flex flex-col items-center justify-center leading-none pointer-events-none select-none">
                    {kSpec?.subDisplay && (
                      <span
                        className={`text-[8px] leading-none mb-0.5 font-bold ${
                          noteIdx === 0 ? 'text-white' : 'text-slate-400'
                        }`}
                        style={{ color: noteIdx === 0 ? laneColor : undefined }}
                      >
                        {kSpec.subDisplay}
                      </span>
                    )}
                    <span
                      className={`truncate font-mono leading-none ${
                        noteIdx === 0
                          ? 'text-white font-black text-xs sm:text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,1)]'
                          : 'text-slate-200 font-semibold text-xs'
                      }`}
                    >
                      {kSpec?.display || note.displayChar}
                    </span>
                  </div>
                )}

                {/* Energy tail behind active descending note */}
                {noteIdx === 0 && (
                  <div
                    className="absolute -top-4 inset-x-2 h-4 rounded-t-md opacity-60 pointer-events-none"
                    style={{
                      background: `linear-gradient(to top, ${laneColor}, transparent)`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* 3. KEYBOARD RECEPTOR MATRIX: Foreground Mechanical Deck Flanked by Hand Visualizers */}
        <div
          ref={keyboardDeckRef}
          className="relative z-20 pb-3 sm:pb-4 px-1 sm:px-3 overflow-x-auto select-none mt-auto"
        >
          <div className="flex items-center sm:items-end justify-center gap-2 sm:gap-3 max-w-6xl mx-auto">
            {/* Left Hand Visualizer */}
            {handsVisible && (
              <SmallHandVisualizer
                hand="left"
                activeFinger={mainKeyHand === 'left' ? mainKeyFinger : (isSpaceActive ? 'THUMB' : null)}
                activeKeyDisplay={mainKeyHand === 'left' ? targetKeyDisplay : (isSpaceActive ? ' ' : null)}
                modifierFinger={modifierHand === 'left' ? modifierFinger : null}
                modifierLabel={modifierHand === 'left' ? modifierLabel : null}
                lastPressedKey={lastPressedKey}
                thumbRole={isSpaceActive ? (smartThumbHand === 'left' ? 'primary' : 'secondary') : null}
              />
            )}

            {/* Main Mechanical Keyboard Deck */}
            <div className="flex flex-col gap-1.5 min-w-[580px] max-w-4xl flex-1 relative p-2.5 sm:p-3 rounded-2xl bg-slate-950/95 border-2 border-slate-800 shadow-[0_-8px_30px_rgba(0,0,0,0.8),0_10px_30px_rgba(0,0,0,0.9)] backdrop-blur-md">
              {/* Keyboard Deck Chassis Bevel Highlight */}
              <div className="absolute inset-x-0 top-0 h-[1.5px] rounded-t-2xl bg-gradient-to-r from-transparent via-slate-600/40 to-transparent pointer-events-none" />

              {KEYBOARD_ROWS.map((row, rowIdx) => (
                <div key={rowIdx} className="flex gap-1.5 w-full">
                  {row.map((k) => {
                    const laneMatch = FINGER_LANES[k.lane];
                    const isTargetKey = targetKeyLower === k.key;
                    const isTargetShift =
                      isShiftNeeded &&
                      ((recommendedShift === 'left' && k.key === 'ShiftLeft') ||
                        (recommendedShift === 'right' && k.key === 'ShiftRight'));

                    const isTargetModifier = isTargetShift;
                    const isCurrentlyPressed = Boolean(lastPressedKey && lastPressedKey.toLowerCase() === k.key.toLowerCase());
                    const laneColor = laneMatch?.color || '#06b6d4';

                    return (
                      <div
                        key={k.key}
                        ref={(el) => {
                          keyRefs.current[k.key.toLowerCase()] = el;
                        }}
                        onClick={() => handleVirtualKeyClick(k)}
                        style={{
                          flex: `${k.units} ${k.units} 0%`,
                          borderColor: isTargetKey
                            ? laneColor
                            : isTargetModifier
                            ? '#fbbf24'
                            : isCurrentlyPressed
                            ? laneColor
                            : undefined,
                          borderStyle: isTargetModifier ? 'dashed' : 'solid',
                          boxShadow: isTargetKey
                            ? `0 3px 0 #020617, 0 0 24px ${laneColor}85, inset 0 1px 1px rgba(255,255,255,0.4)`
                            : isTargetModifier
                            ? `0 3px 0 #020617, 0 0 20px rgba(251,191,36,0.65), inset 0 1px 1px rgba(255,255,255,0.4)`
                            : isCurrentlyPressed
                            ? `0 1px 0 #020617, 0 0 20px ${laneColor}90, inset 0 1px 1px rgba(255,255,255,0.4)`
                            : `0 3px 0 #020617, 0 4px 8px rgba(0,0,0,0.6), inset 0 -3px 0 ${laneColor}45, inset 0 1px 1px rgba(255,255,255,0.1)`,
                        }}
                        className={`relative flex flex-col items-center justify-center h-8 sm:h-9 rounded-md text-[11px] sm:text-xs font-mono transition-all duration-75 select-none cursor-pointer group ${
                          isTargetKey
                            ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-solid font-black z-20 scale-[1.02] text-white ring-2 ring-offset-1 ring-offset-slate-950'
                            : isTargetModifier
                            ? 'bg-gradient-to-b from-amber-950/80 to-slate-900 border-2 border-dashed border-amber-400 text-amber-200 font-bold z-10 scale-[1.02] ring-2 ring-amber-400/50 ring-offset-1 ring-offset-slate-950'
                            : isCurrentlyPressed
                            ? 'bg-gradient-to-b from-slate-700 to-slate-800 border-2 font-bold translate-y-[2px] text-white scale-[0.98]'
                            : 'bg-gradient-to-b from-slate-800/90 to-slate-900 border border-slate-700/80 text-slate-300 hover:border-slate-500 active:translate-y-[2px]'
                        }`}
                      >
                        {/* Finger lane accent stripe at bottom of keycap */}
                        <span
                          className={`absolute bottom-0 inset-x-1 rounded-full transition-all ${
                            isTargetKey
                              ? 'h-1 opacity-100 shadow-[0_0_8px_currentColor]'
                              : isTargetModifier
                              ? 'h-1 opacity-100 bg-amber-400'
                              : 'h-[2.5px] opacity-75 group-hover:opacity-100'
                          }`}
                          style={{
                            backgroundColor: isTargetModifier ? '#fbbf24' : laneColor,
                            color: laneColor,
                          }}
                        />

                        {/* Tactile bump marker for standard touch typing (F & J) */}
                        {k.isBump && (
                          <span
                            className="absolute bottom-1 w-2.5 h-0.5 rounded-full"
                            style={{ backgroundColor: isTargetKey ? '#ffffff' : laneColor }}
                          />
                        )}

                        {/* Modifier Dotted Highlight Badge */}
                        {isTargetModifier && (
                          <span className="absolute -top-2.5 px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-400 text-slate-950 tracking-tighter shadow-md animate-bounce border border-dashed border-amber-300">
                            ·· HOLD {k.key.includes('Control') ? 'CTRL' : 'SHIFT'} ··
                          </span>
                        )}

                        {/* Key Legend (Sub-display for shift symbols) */}
                        {k.subDisplay && keyboardVisible && (
                          <span
                            className={`text-[9px] leading-none mb-0.5 font-bold ${
                              isTargetKey ? 'text-white' : isTargetModifier ? 'text-amber-300' : 'text-slate-400'
                            }`}
                            style={{ color: isTargetKey ? laneColor : undefined }}
                          >
                            {k.subDisplay}
                          </span>
                        )}

                        {/* Character label: 100% Vector Sharp, or Blind Touch Dot when deck guides are hidden */}
                        {k.key === ' ' && isTargetKey ? (
                          <div className="flex items-center justify-between w-full px-2 sm:px-3 text-[9px] font-mono pointer-events-none">
                            <span
                              className={`transition-all ${
                                smartThumbHand === 'left'
                                  ? 'text-emerald-300 font-black drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                                  : 'text-emerald-500/50 font-semibold text-[8px]'
                              }`}
                            >
                              {smartThumbHand === 'left' ? '◀ L. THUMB [REC]' : 'L. Thumb (Alt)'}
                            </span>
                            <span className="truncate font-mono font-black text-xs text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                              SPACE
                            </span>
                            <span
                              className={`transition-all ${
                                smartThumbHand === 'right'
                                  ? 'text-emerald-300 font-black drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                                  : 'text-emerald-500/50 font-semibold text-[8px]'
                              }`}
                            >
                              {smartThumbHand === 'right' ? 'R. THUMB [REC] ▶' : 'R. Thumb (Alt)'}
                            </span>
                          </div>
                        ) : !keyboardVisible ? (
                          /* Blind Touch-Typing Mode: Hide letter print so user relies on finger memory */
                          <div className="flex items-center justify-center pointer-events-none">
                            {isTargetKey ? (
                              <span
                                className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor] animate-pulse"
                                style={{ backgroundColor: laneColor, color: laneColor }}
                              />
                            ) : isTargetModifier ? (
                              <span className="w-2 h-2 rounded-full border border-dashed border-amber-400 bg-amber-400/40" />
                            ) : k.isBump ? (
                              <span
                                className="w-2.5 h-1 rounded-full"
                                style={{ backgroundColor: laneColor }}
                              />
                            ) : (
                              <span
                                className="w-1.5 h-1.5 rounded-full opacity-60"
                                style={{ backgroundColor: laneColor }}
                              />
                            )}
                          </div>
                        ) : (
                          <span
                            className={`truncate font-mono leading-none ${
                              isTargetKey
                                ? 'text-white font-black text-xs sm:text-sm drop-shadow-[0_1px_2px_rgba(0,0,0,1)]'
                                : isTargetModifier
                                ? 'text-amber-200 font-bold text-xs'
                                : isCurrentlyPressed
                                ? 'text-white font-black text-xs drop-shadow-[0_0_8px_currentColor]'
                                : 'text-slate-200 font-semibold text-xs'
                            }`}
                            style={{ color: isCurrentlyPressed ? '#ffffff' : undefined }}
                          >
                            {k.display}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Right Hand Visualizer */}
            {handsVisible && (
              <SmallHandVisualizer
                hand="right"
                activeFinger={mainKeyHand === 'right' ? mainKeyFinger : (isSpaceActive ? 'THUMB' : null)}
                activeKeyDisplay={mainKeyHand === 'right' ? targetKeyDisplay : (isSpaceActive ? ' ' : null)}
                modifierFinger={modifierHand === 'right' ? modifierFinger : null}
                modifierLabel={modifierHand === 'right' ? modifierLabel : null}
                lastPressedKey={lastPressedKey}
                thumbRole={isSpaceActive ? (smartThumbHand === 'right' ? 'primary' : 'secondary') : null}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
