import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { FallingNote, TrailColorTheme, FingerZone } from '../types/game';
import {
  FINGER_LANES,
  KEY_FINGER_MAP,
  FINGER_COLOR_MAP,
} from '../data/curriculum';
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
  lastHitDrone?: {
    id?: string;
    char: string;
    yPercent: number;
    lane: number;
  } | null;
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
    {
      key: '`',
      display: '`',
      subDisplay: '~',
      finger: 'LEFT_PINKY',
      lane: 0,
      units: 1.0,
    },
    {
      key: '1',
      display: '1',
      subDisplay: '!',
      finger: 'LEFT_PINKY',
      lane: 0,
      units: 1.0,
    },
    {
      key: '2',
      display: '2',
      subDisplay: '@',
      finger: 'LEFT_RING',
      lane: 1,
      units: 1.0,
    },
    {
      key: '3',
      display: '3',
      subDisplay: '#',
      finger: 'LEFT_MIDDLE',
      lane: 2,
      units: 1.0,
    },
    {
      key: '4',
      display: '4',
      subDisplay: '$',
      finger: 'LEFT_INDEX',
      lane: 3,
      units: 1.0,
    },
    {
      key: '5',
      display: '5',
      subDisplay: '%',
      finger: 'LEFT_INDEX',
      lane: 3,
      units: 1.0,
    },
    {
      key: '6',
      display: '6',
      subDisplay: '^',
      finger: 'RIGHT_INDEX',
      lane: 5,
      units: 1.0,
    },
    {
      key: '7',
      display: '7',
      subDisplay: '&',
      finger: 'RIGHT_INDEX',
      lane: 5,
      units: 1.0,
    },
    {
      key: '8',
      display: '8',
      subDisplay: '*',
      finger: 'RIGHT_MIDDLE',
      lane: 6,
      units: 1.0,
    },
    {
      key: '9',
      display: '9',
      subDisplay: '(',
      finger: 'RIGHT_RING',
      lane: 7,
      units: 1.0,
    },
    {
      key: '0',
      display: '0',
      subDisplay: ')',
      finger: 'RIGHT_PINKY',
      lane: 8,
      units: 1.0,
    },
    {
      key: '-',
      display: '-',
      subDisplay: '_',
      finger: 'RIGHT_PINKY',
      lane: 8,
      units: 1.0,
    },
    {
      key: '=',
      display: '=',
      subDisplay: '+',
      finger: 'RIGHT_PINKY',
      lane: 8,
      units: 1.0,
    },
    {
      key: 'Backspace',
      display: '⌫ BACK',
      finger: 'RIGHT_PINKY',
      lane: 8,
      units: 2.0,
    },
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
    {
      key: '[',
      display: '[',
      subDisplay: '{',
      finger: 'RIGHT_PINKY',
      lane: 8,
      units: 1.0,
    },
    {
      key: ']',
      display: ']',
      subDisplay: '}',
      finger: 'RIGHT_PINKY',
      lane: 8,
      units: 1.0,
    },
    {
      key: '\\',
      display: '\\',
      subDisplay: '|',
      finger: 'RIGHT_PINKY',
      lane: 8,
      units: 1.5,
    },
  ],
  // Row 2: Home Row (Total = 15.0 units)
  [
    {
      key: 'CapsLock',
      display: 'CAPS ⇪',
      finger: 'LEFT_PINKY',
      lane: 0,
      units: 1.75,
    },
    { key: 'a', display: 'A', finger: 'LEFT_PINKY', lane: 0, units: 1.0 },
    { key: 's', display: 'S', finger: 'LEFT_RING', lane: 1, units: 1.0 },
    { key: 'd', display: 'D', finger: 'LEFT_MIDDLE', lane: 2, units: 1.0 },
    {
      key: 'f',
      display: 'F',
      finger: 'LEFT_INDEX',
      lane: 3,
      units: 1.0,
      isBump: true,
    },
    { key: 'g', display: 'G', finger: 'LEFT_INDEX', lane: 3, units: 1.0 },
    { key: 'h', display: 'H', finger: 'RIGHT_INDEX', lane: 5, units: 1.0 },
    {
      key: 'j',
      display: 'J',
      finger: 'RIGHT_INDEX',
      lane: 5,
      units: 1.0,
      isBump: true,
    },
    { key: 'k', display: 'K', finger: 'RIGHT_MIDDLE', lane: 6, units: 1.0 },
    { key: 'l', display: 'L', finger: 'RIGHT_RING', lane: 7, units: 1.0 },
    {
      key: ';',
      display: ';',
      subDisplay: ':',
      finger: 'RIGHT_PINKY',
      lane: 8,
      units: 1.0,
    },
    {
      key: "'",
      display: "'",
      subDisplay: '"',
      finger: 'RIGHT_PINKY',
      lane: 8,
      units: 1.0,
    },
    {
      key: 'Enter',
      display: 'ENTER ⏎',
      finger: 'RIGHT_PINKY',
      lane: 8,
      units: 2.25,
    },
  ],
  // Row 3: Bottom Row (Total = 15.0 units)
  [
    {
      key: 'ShiftLeft',
      display: '⇧ SHIFT',
      finger: 'LEFT_PINKY',
      lane: 0,
      units: 2.25,
    },
    { key: 'z', display: 'Z', finger: 'LEFT_PINKY', lane: 0, units: 1.0 },
    { key: 'x', display: 'X', finger: 'LEFT_RING', lane: 1, units: 1.0 },
    { key: 'c', display: 'C', finger: 'LEFT_MIDDLE', lane: 2, units: 1.0 },
    { key: 'v', display: 'V', finger: 'LEFT_INDEX', lane: 3, units: 1.0 },
    { key: 'b', display: 'B', finger: 'LEFT_INDEX', lane: 3, units: 1.0 },
    { key: 'n', display: 'N', finger: 'RIGHT_INDEX', lane: 5, units: 1.0 },
    { key: 'm', display: 'M', finger: 'RIGHT_INDEX', lane: 5, units: 1.0 },
    {
      key: ',',
      display: ',',
      subDisplay: '<',
      finger: 'RIGHT_MIDDLE',
      lane: 6,
      units: 1.0,
    },
    {
      key: '.',
      display: '.',
      subDisplay: '>',
      finger: 'RIGHT_RING',
      lane: 7,
      units: 1.0,
    },
    {
      key: '/',
      display: '/',
      subDisplay: '?',
      finger: 'RIGHT_PINKY',
      lane: 8,
      units: 1.0,
    },
    {
      key: 'ShiftRight',
      display: 'SHIFT ⇧',
      finger: 'RIGHT_PINKY',
      lane: 8,
      units: 2.75,
    },
  ],
  // Row 4: Space Bar Row (Total = 15.0 units)
  [
    {
      key: 'ControlLeft',
      display: 'CTRL',
      finger: 'LEFT_PINKY',
      lane: 0,
      units: 1.5,
    },
    {
      key: 'AltLeft',
      display: 'ALT',
      finger: 'LEFT_RING',
      lane: 1,
      units: 1.25,
    },
    { key: 'MetaLeft', display: 'CMD', finger: 'THUMB', lane: 4, units: 1.25 },
    { key: ' ', display: 'SPACE', finger: 'THUMB', lane: 4, units: 6.25 },
    { key: 'MetaRight', display: 'CMD', finger: 'THUMB', lane: 4, units: 1.25 },
    {
      key: 'AltRight',
      display: 'ALT',
      finger: 'RIGHT_RING',
      lane: 7,
      units: 1.25,
    },
    {
      key: 'ControlRight',
      display: 'CTRL',
      finger: 'RIGHT_PINKY',
      lane: 8,
      units: 2.25,
    },
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

interface LaserBeam {
  x: number;
  startY: number;
  targetY: number;
  color: string;
  width: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface DebrisFragment {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface CrystalScrap {
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

interface BlasterBolt {
  startX1: number;
  startY1: number;
  startX2: number;
  startY2: number;
  targetX1: number;
  targetY1: number;
  targetX2: number;
  targetY2: number;
  targetX: number;
  targetY: number;
  currentX1: number;
  currentY1: number;
  currentX2: number;
  currentY2: number;
  distance: number;
  traveled: number;
  targetWidth: number;
  targetHeight: number;
  color: string;
  hitColor: string;
  isSpace: boolean;
  feedback: 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS' | null;
  missedKeyDisplay?: string;
  targetDrone?: {
    char: string;
    display: string;
    subDisplay?: string;
    isSpace: boolean;
    color: string;
    width: number;
    height: number;
  };
  speed: number;
  life: number;
  maxLife: number;
  hasDetonated: boolean;
}

interface NuclearFlash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
}

interface ExplodingDrone {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  char: string;
  isSpace: boolean;
  life: number;
  maxLife: number;
}

export const IntegratedLanesKeyboard: React.FC<
  IntegratedLanesKeyboardProps
> = ({
  notes,
  hyperspaceActive,
  multiplier,
  currentStreak,
  activeLaneIndex,
  targetLaneIndex,
  timingFeedback,
  timingFeedbackKey,
  lastHitDrone,
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
  const [localHandsVisible, setLocalHandsVisible] =
    useState<boolean>(initialHandEnabled);
  const handsVisible =
    controlledHandsVisible !== undefined
      ? controlledHandsVisible
      : localHandsVisible;
  const toggleHandsGuide =
    onToggleHands || (() => setLocalHandsVisible((prev) => !prev));

  // Active target character info
  const activeCharInfo = useMemo(() => {
    if (!activeChar) return null;
    return (
      KEY_FINGER_MAP[activeChar] ||
      KEY_FINGER_MAP[activeChar.toLowerCase()] ||
      null
    );
  }, [activeChar]);

  const targetKeyLower = activeChar
    ? activeChar === ' '
      ? ' '
      : activeChar.toLowerCase()
    : null;
  const isShiftNeeded = activeCharInfo?.shiftRequired || false;
  const recommendedShift = activeCharInfo?.recommendedShiftHand || null;
  const isSpaceActive = activeChar === ' ';

  // Main key target finger, hand, and key display
  const mainKeyFinger: FingerZone | null = activeCharInfo?.finger || null;
  const mainKeyHand: 'left' | 'right' | 'thumb' | null =
    activeCharInfo?.hand || null;
  const targetKeyDisplay = activeChar
    ? activeChar === ' '
      ? '␣'
      : activeChar
    : null;

  // Smart ergonomic thumb allocation based on cognitive and motor load:
  // If the preceding keystroke was struck with the LEFT hand -> Left hand muscles are contracted/loaded,
  // so the RIGHT thumb is completely free with lesser cognitive load!
  // If the preceding keystroke was struck with the RIGHT hand -> Left thumb is completely free with lesser cognitive load!
  const smartThumbHand: 'left' | 'right' = useMemo(() => {
    // 1. Evaluate preceding key in the typing stream
    const prev =
      previousChar ||
      (lastPressedKey && lastPressedKey.length === 1 ? lastPressedKey : null);
    if (prev && prev !== ' ') {
      const prevInfo =
        KEY_FINGER_MAP[prev] || KEY_FINGER_MAP[prev.toLowerCase()];
      if (prevInfo) {
        if (prevInfo.hand === 'left') return 'right';
        if (prevInfo.hand === 'right') return 'left';
      }
    }

    // 2. If previous character was space or unavailable, evaluate upcoming next character
    if (nextChar && nextChar !== ' ') {
      const nextInfo =
        KEY_FINGER_MAP[nextChar] || KEY_FINGER_MAP[nextChar.toLowerCase()];
      if (nextInfo) {
        if (nextInfo.hand === 'left') return 'right';
        if (nextInfo.hand === 'right') return 'left';
      }
    }

    // Default touch typing anchor
    return 'right';
  }, [previousChar, nextChar, lastPressedKey]);

  // Modifier combo resolution (Shift, Ctrl, etc.)
  const modifierHand: 'left' | 'right' | null = isShiftNeeded
    ? recommendedShift
    : null;
  const modifierFinger: FingerZone | null = isShiftNeeded
    ? recommendedShift === 'left'
      ? 'LEFT_PINKY'
      : 'RIGHT_PINKY'
    : null;
  const modifierLabel: string | null = isShiftNeeded ? 'SHIFT' : null;

  // Track key positions and keyboard deck position in real-time
  const [keyPositions, setKeyPositions] = useState<
    Record<string, { x: number; y: number; width: number; height: number }>
  >({});
  const [keyboardTopY, setKeyboardTopY] = useState<number>(180);
  const [keyboardBottomY, setKeyboardBottomY] = useState<number>(440);
  const [containerHeight, setContainerHeight] = useState<number>(500);

  const updateKeyPositions = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const cRect = container.getBoundingClientRect();
    setContainerHeight(cRect.height);

    // Measure keyboard deck top and bottom position
    if (keyboardDeckRef.current) {
      const deckRect = keyboardDeckRef.current.getBoundingClientRect();
      setKeyboardTopY(deckRect.top - cRect.top);
      setKeyboardBottomY(deckRect.bottom - cRect.top);
    }

    const newPositions: Record<
      string,
      { x: number; y: number; width: number; height: number }
    > = {};
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

  // Active target key position and lane color
  const activeKeyPos = targetKeyLower ? keyPositions[targetKeyLower] : null;
  const activeLaneColor =
    (targetLaneIndex !== null && FINGER_LANES[targetLaneIndex]?.color) ||
    THEME_ACCENTS[trailTheme] ||
    '#06b6d4';
  const shipY = Math.max(keyboardBottomY + 6, containerHeight - 34);

  // Particle & FX systems on 2D Canvas (Laser Cannons, Debris Shatter, Sparks, Shockwaves, Crystals, Combat Popups)
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const feedbacksRef = useRef<FeedbackPopup[]>([]);
  const blasterBoltsRef = useRef<BlasterBolt[]>([]);
  const nuclearFlashesRef = useRef<NuclearFlash[]>([]);
  const explodingDronesRef = useRef<ExplodingDrone[]>([]);
  const debrisRef = useRef<DebrisFragment[]>([]);
  const crystalsRef = useRef<CrystalScrap[]>([]);
  const lastHitKeyRef = useRef<number>(timingFeedbackKey);
  const activeDronePosRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
    char: string;
    display?: string;
    subDisplay?: string;
  } | null>(null);
  const liveDronesMapRef = useRef<
    Map<
      string,
      {
        id: string;
        char: string;
        x: number;
        y: number;
        width: number;
        height: number;
        isSpace: boolean;
        laneColor: string;
        display: string;
        subDisplay?: string;
      }
    >
  >(new Map());
  const liveDronesByCharRef = useRef<
    Map<
      string,
      {
        id: string;
        char: string;
        x: number;
        y: number;
        width: number;
        height: number;
        isSpace: boolean;
        laneColor: string;
        display: string;
        subDisplay?: string;
      }
    >
  >(new Map());
  const [muzzleFlashActive, setMuzzleFlashActive] = useState<number>(0);
  const [shotAimAngle, setShotAimAngle] = useState<number>(0);

  // Trigger Orbital Interceptor burst effects on keystroke hit
  useEffect(() => {
    if (timingFeedbackKey !== lastHitKeyRef.current) {
      lastHitKeyRef.current = timingFeedbackKey;

      const isMiss = timingFeedback === 'MISS';

      // 1. Expected active key position (where the ship is currently mounted underneath)
      const expectedChar = activeChar;
      const expectedLookup =
        expectedChar === ' '
          ? ' '
          : expectedChar
            ? expectedChar.toLowerCase()
            : null;
      const expectedPos = expectedLookup ? keyPositions[expectedLookup] : null;

      const currentShipY = Math.max(keyboardBottomY + 6, containerHeight - 34);
      const cannonOriginY = currentShipY - 14;
      const shipX = activeKeyPos
        ? activeKeyPos.x
        : expectedPos
          ? expectedPos.x
          : 0;

      if (!isMiss) {
        // SUCCESSFUL HIT: Destroy the incoming enemy drone straight up the corridor!
        const hitChar = lastHitDrone?.char || previousChar || activeChar;
        if (!hitChar) return;
        const lookupKey = hitChar === ' ' ? ' ' : hitChar.toLowerCase();
        const pos = keyPositions[lookupKey] || expectedPos;
        if (!pos) return;

        const isSpace = hitChar === ' ';
        const fingerInfo =
          KEY_FINGER_MAP[hitChar] || KEY_FINGER_MAP[hitChar.toLowerCase()];
        const laneColor = fingerInfo
          ? FINGER_COLOR_MAP[fingerInfo.finger]
          : '#38bdf8';

        const hitColor =
          timingFeedback === 'PERFECT'
            ? isSpace
              ? '#34d399'
              : '#38bdf8'
            : timingFeedback === 'GREAT'
              ? '#4ade80'
              : '#facc15';

        // Retrieve the exact live drone record
        const skyCeilingY = 18;
        const defensePerimeterY = Math.max(skyCeilingY + 36, keyboardTopY - 38);
        const calculatedAltitudeY = lastHitDrone
          ? skyCeilingY +
            (defensePerimeterY - skyCeilingY) *
              Math.min(1.0, Math.max(0, lastHitDrone.yPercent / 84))
          : defensePerimeterY;

        const liveDrone =
          (lastHitDrone?.id
            ? liveDronesMapRef.current.get(lastHitDrone.id)
            : null) ||
          liveDronesByCharRef.current.get(lookupKey) ||
          (activeDronePosRef.current?.char.toLowerCase() === lookupKey
            ? activeDronePosRef.current
            : null);

        const targetX = liveDrone ? liveDrone.x : pos.x;
        // The laser MUST fly directly to that specific drone's actual live Y height!
        const targetY = liveDrone ? liveDrone.y : calculatedAltitudeY;
        const targetWidth = liveDrone ? liveDrone.width : pos.width;
        const targetHeight = liveDrone ? liveDrone.height : pos.height;

        setShotAimAngle(0);
        setMuzzleFlashActive(Date.now() + 160);

        // Twin cannon launch straight up towards that specific drone's altitude
        const barrelSpacing = isSpace ? 14 : 7;
        const startX1 = targetX - barrelSpacing;
        const startX2 = targetX + barrelSpacing;
        const dist = Math.max(1, cannonOriginY - targetY);

        blasterBoltsRef.current.push({
          startX1,
          startY1: cannonOriginY,
          startX2,
          startY2: cannonOriginY,
          targetX1: startX1,
          targetY1: targetY,
          targetX2: startX2,
          targetY2: targetY,
          targetX,
          targetY,
          currentX1: startX1,
          currentY1: cannonOriginY,
          currentX2: startX2,
          currentY2: cannonOriginY,
          distance: dist,
          traveled: 0,
          speed: 46,
          targetWidth,
          targetHeight,
          color: isSpace ? '#10b981' : laneColor,
          hitColor,
          isSpace,
          feedback: timingFeedback || 'PERFECT',
          targetDrone: {
            char: hitChar,
            display:
              liveDrone?.display ||
              (hitChar === ' ' ? 'SPACE' : hitChar.toUpperCase()),
            subDisplay: liveDrone?.subDisplay,
            isSpace,
            color: laneColor,
            width: targetWidth,
            height: targetHeight,
          },
          life: 0,
          maxLife: 24,
          hasDetonated: false,
        });
      } else {
        // MISFIRE / WRONG KEY PRESSED:
        // The user clicked/typed the wrong key!
        // The ship visibly fires an angled laser directly to the key that was pressed, making the mistake unmistakable!
        const pressedChar = lastPressedKey;
        const pressedLookup =
          pressedChar === ' '
            ? ' '
            : pressedChar
              ? pressedChar.toLowerCase()
              : null;
        const pressedPos = pressedLookup ? keyPositions[pressedLookup] : null;

        const targetX = pressedPos
          ? pressedPos.x
          : shipX + (Math.random() > 0.5 ? 90 : -90);
        const targetY = pressedPos ? pressedPos.y : keyboardTopY + 30;
        const targetWidth = pressedPos ? pressedPos.width : 40;
        const targetHeight = pressedPos ? pressedPos.height : 36;
        const missedKeyDisplay =
          pressedLookup === ' '
            ? 'SPACE'
            : pressedChar
              ? pressedChar.toUpperCase()
              : 'WRONG KEY';

        // Calculate aim angle from ship to the pressed key
        const dx = targetX - shipX;
        const dy = targetY - cannonOriginY;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const angleDeg = Math.max(
          -48,
          Math.min(48, Math.atan2(dx, -dy) * (180 / Math.PI)),
        );

        setShotAimAngle(angleDeg);
        setMuzzleFlashActive(Date.now() + 180);
        setTimeout(() => setShotAimAngle(0), 220);

        // Perpendicular barrel offset for angled twin cannons
        const nx = -dy / dist;
        const ny = dx / dist;
        const barrelSpacing = 6;

        const startX1 = shipX + nx * barrelSpacing;
        const startY1 = cannonOriginY + ny * barrelSpacing;
        const startX2 = shipX - nx * barrelSpacing;
        const startY2 = cannonOriginY - ny * barrelSpacing;

        const targetX1 = targetX + nx * 4;
        const targetY1 = targetY + ny * 4;
        const targetX2 = targetX - nx * 4;
        const targetY2 = targetY - ny * 4;

        blasterBoltsRef.current.push({
          startX1,
          startY1,
          startX2,
          startY2,
          targetX1,
          targetY1,
          targetX2,
          targetY2,
          targetX,
          targetY,
          currentX1: startX1,
          currentY1: startY1,
          currentX2: startX2,
          currentY2: startY2,
          distance: dist,
          traveled: 0,
          speed: 40,
          targetWidth,
          targetHeight,
          color: '#f43f5e', // Crimson warning laser
          hitColor: '#ef4444',
          isSpace: false,
          feedback: 'MISS',
          missedKeyDisplay,
          life: 0,
          maxLife: 24,
          hasDetonated: false,
        });
      }
    }
  }, [
    timingFeedbackKey,
    timingFeedback,
    activeChar,
    previousChar,
    lastPressedKey,
    keyPositions,
    hyperspaceActive,
    keyboardTopY,
    keyboardBottomY,
    containerHeight,
    activeKeyPos,
  ]);

  // Canvas VFX Loop for Laser Cannons, Debris Shatter, Sparks, Shockwaves, and Rating Popups
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

      // 1. UPDATE & DRAW HIGH-SPEED BLASTER BOLTS (Visible laser projectiles with 2D trajectory)
      blasterBoltsRef.current = blasterBoltsRef.current.filter((bolt) => {
        bolt.traveled += bolt.speed;
        bolt.life += 1;
        const t = Math.min(1.0, bolt.traveled / bolt.distance);

        bolt.currentX1 = bolt.startX1 + (bolt.targetX1 - bolt.startX1) * t;
        bolt.currentY1 = bolt.startY1 + (bolt.targetY1 - bolt.startY1) * t;

        bolt.currentX2 = bolt.startX2 + (bolt.targetX2 - bolt.startX2) * t;
        bolt.currentY2 = bolt.startY2 + (bolt.targetY2 - bolt.startY2) * t;

        // While the laser bolt is traveling towards the target drone, keep the target drone locked and rendered at (bolt.targetX, bolt.targetY)!
        if (
          bolt.feedback !== 'MISS' &&
          bolt.targetDrone &&
          !bolt.hasDetonated
        ) {
          const td = bolt.targetDrone;
          ctx.save();
          ctx.translate(bolt.targetX, bolt.targetY);

          // Sci-fi tactical target lock-on brackets
          ctx.strokeStyle = bolt.color;
          ctx.lineWidth = 1.8;
          ctx.shadowColor = bolt.color;
          ctx.shadowBlur = 10;

          const hw = td.width / 2;
          const hh = td.height / 2;
          const cLen = 7;

          ctx.beginPath();
          // Top-left bracket
          ctx.moveTo(-hw - 4, -hh + cLen - 4);
          ctx.lineTo(-hw - 4, -hh - 4);
          ctx.lineTo(-hw + cLen - 4, -hh - 4);
          // Top-right bracket
          ctx.moveTo(hw - cLen + 4, -hh - 4);
          ctx.lineTo(hw + 4, -hh - 4);
          ctx.lineTo(hw + 4, -hh + cLen - 4);
          // Bottom-left bracket
          ctx.moveTo(-hw - 4, hh - cLen + 4);
          ctx.lineTo(-hw - 4, hh + 4);
          ctx.lineTo(-hw + cLen - 4, hh + 4);
          // Bottom-right bracket
          ctx.moveTo(hw - cLen + 4, hh + 4);
          ctx.lineTo(hw + 4, hh + 4);
          ctx.lineTo(hw + 4, hh - cLen + 4);
          ctx.stroke();

          // Hostile drone hull
          ctx.fillStyle = '#020617';
          ctx.strokeStyle = td.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-hw, -hh, td.width, td.height, 6);
          ctx.fill();
          ctx.stroke();

          // Ion thruster plumes on top
          ctx.fillStyle = td.color;
          ctx.beginPath();
          ctx.arc(-hw + 8, -hh - 2, 2.5, 0, Math.PI * 2);
          ctx.arc(hw - 8, -hh - 2, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Letter glyph in crisp white (Enlarged for high-speed legibility)
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 20px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(td.display, 0, 1);

          ctx.restore();
        }

        const boltWidth = bolt.isSpace ? 5 : 3.5;

        // Draw twin high-energy laser beams connecting cannons to the projectile tip
        ctx.save();
        // Outer glowing plasma sheath
        ctx.strokeStyle = bolt.color;
        ctx.lineWidth = boltWidth * 2.8;
        ctx.globalAlpha = 0.55;
        ctx.shadowColor = bolt.color;
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.moveTo(bolt.startX1, bolt.startY1);
        ctx.lineTo(bolt.currentX1, bolt.currentY1);
        ctx.moveTo(bolt.startX2, bolt.startY2);
        ctx.lineTo(bolt.currentX2, bolt.currentY2);
        ctx.stroke();

        // White-hot core laser beam
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = boltWidth;
        ctx.globalAlpha = 0.95;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(bolt.startX1, bolt.startY1);
        ctx.lineTo(bolt.currentX1, bolt.currentY1);
        ctx.moveTo(bolt.startX2, bolt.startY2);
        ctx.lineTo(bolt.currentX2, bolt.currentY2);
        ctx.stroke();

        // Twin blazing projectile torpedo heads
        [
          { x: bolt.currentX1, y: bolt.currentY1 },
          { x: bolt.currentX2, y: bolt.currentY2 },
        ].forEach((pt) => {
          const grad = ctx.createRadialGradient(
            pt.x,
            pt.y,
            1,
            pt.x,
            pt.y,
            boltWidth * 3.5,
          );
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.4, bolt.color);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, boltWidth * 3.5, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();

        // Trailing ion sparks behind the projectile
        [
          { x: bolt.currentX1, y: bolt.currentY1 },
          { x: bolt.currentX2, y: bolt.currentY2 },
        ].forEach((pt) => {
          if (Math.random() > 0.35) {
            particlesRef.current.push({
              x: pt.x + (Math.random() - 0.5) * 4,
              y: pt.y + (Math.random() - 0.5) * 4,
              vx: (Math.random() - 0.5) * 1.5,
              vy: (Math.random() - 0.5) * 1.5,
              color: Math.random() > 0.5 ? '#ffffff' : bolt.color,
              size: 2.0 + Math.random() * 2.5,
              alpha: 1.0,
              life: 0,
              maxLife: 10 + Math.random() * 8,
            });
          }
        });

        // 2. CHECK IMPACT: When bolt reaches or passes target destination
        if (t >= 1.0 && !bolt.hasDetonated) {
          bolt.hasDetonated = true;
          const impactX = bolt.targetX;
          const impactY = bolt.targetY;
          const isSpace = bolt.isSpace;
          const hitColor = bolt.hitColor;
          const laneColor = bolt.color;

          if (bolt.feedback !== 'MISS') {
            // A. Trigger Drone Vaporization Ghost right at impact
            explodingDronesRef.current.push({
              x: impactX,
              y: impactY,
              width: bolt.targetWidth,
              height: bolt.targetHeight,
              color: laneColor,
              char: bolt.targetDrone?.char || '',
              isSpace: isSpace,
              life: 0,
              maxLife: 15,
            });

            // B. NUCLEAR WHITE CORE FLASH
            nuclearFlashesRef.current.push({
              x: impactX,
              y: impactY,
              radius: 12,
              maxRadius: isSpace ? 85 : 60,
              color: '#ffffff',
              alpha: 1.0,
            });

            // B. SHATTERING DRONE DEBRIS: 16 to 30 spinning hull armor shards
            const debrisCount =
              bolt.feedback === 'PERFECT' ? (isSpace ? 30 : 22) : 15;
            for (let i = 0; i < debrisCount; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 4.0 + Math.random() * 9.0;
              debrisRef.current.push({
                x: impactX + (Math.random() - 0.5) * (bolt.targetWidth * 0.5),
                y: impactY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2.8,
                rotation: Math.random() * Math.PI * 2,
                vRot: (Math.random() - 0.5) * 0.5,
                size: 4.5 + Math.random() * 6.5,
                color:
                  i % 2 === 0 ? laneColor : i % 3 === 0 ? '#ffffff' : '#334155',
                alpha: 1.0,
                life: 0,
                maxLife: 32 + Math.random() * 18,
              });
            }

            // C. COMBUSTION FIREBALL SPARKS: 28 to 55 plasma embers
            const sparkCount =
              bolt.feedback === 'PERFECT' ? (isSpace ? 55 : 40) : 26;
            for (let i = 0; i < sparkCount; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 4.5 + Math.random() * 9.5;
              particlesRef.current.push({
                x: impactX + (Math.random() - 0.5) * (bolt.targetWidth * 0.4),
                y: impactY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.5,
                color:
                  i % 3 === 0 ? '#ffffff' : i % 2 === 0 ? hitColor : '#f97316',
                size: 3.0 + Math.random() * 4.5,
                alpha: 1.0,
                life: 0,
                maxLife: 28 + Math.random() * 20,
              });
            }

            // D. ARCADE ENERGY CRYSTALS: 2 to 4 glittering diamonds
            const crystalCount =
              bolt.feedback === 'PERFECT' ? (isSpace ? 4 : 3) : 2;
            for (let i = 0; i < crystalCount; i++) {
              crystalsRef.current.push({
                x: impactX + (Math.random() - 0.5) * 24,
                y: impactY,
                vx: (Math.random() - 0.5) * 5.5,
                vy: -(5.0 + Math.random() * 4.0),
                color: isSpace ? '#34d399' : i === 0 ? '#38bdf8' : '#fbbf24',
                size: 6.0 + Math.random() * 3.5,
                alpha: 1.0,
                life: 0,
                maxLife: 42 + Math.random() * 12,
              });
            }

            // E. EXPANDING SHOCKWAVES
            shockwavesRef.current.push({
              x: impactX,
              y: impactY,
              radius: 12,
              maxRadius: isSpace
                ? bolt.targetWidth * 1.6
                : bolt.targetWidth * 2.2,
              color: hitColor,
              alpha: 1.0,
            });
            shockwavesRef.current.push({
              x: impactX,
              y: impactY,
              radius: 6,
              maxRadius: isSpace
                ? bolt.targetWidth * 2.2
                : bolt.targetWidth * 2.8,
              color: '#ffffff',
              alpha: 0.9,
            });

            // F. COMBAT RATING POPUP LABELS (Bold, high-impact arcade text right at blast coordinate!)
            let textLabel = '+50 GOOD';
            if (bolt.feedback === 'PERFECT') {
              if (isSpace) {
                textLabel = '💥 FLAGSHIP OBLITERATED! +100';
              } else if (hyperspaceActive) {
                textLabel = '⚡ WARP STRIKE! +400';
              } else {
                const labels = [
                  '💥 VAPORIZED! +100',
                  '🎯 CRITICAL HIT! +100',
                  '⚡ DRONE DESTROYED! +100',
                  '🔥 DIRECT HIT! +100',
                ];
                textLabel = labels[Math.floor(Math.random() * labels.length)];
              }
            } else if (bolt.feedback === 'GREAT') {
              if (isSpace) {
                textLabel = '🚀 DREADNOUGHT DOWN! +75';
              } else {
                const labels = [
                  '⚡ SHATTERED! +75',
                  '🎯 INTERCEPTED! +75',
                  '💥 TARGET DOWN! +75',
                ];
                textLabel = labels[Math.floor(Math.random() * labels.length)];
              }
            } else {
              const labels = [
                '✨ GRAZED! +50',
                '🛡️ DEFUSED! +50',
                '⚡ CONTACT! +50',
              ];
              textLabel = labels[Math.floor(Math.random() * labels.length)];
            }

            feedbacksRef.current.push({
              text: textLabel,
              color: hitColor,
              x: impactX,
              y: impactY - 26,
              vy: -2.6,
              alpha: 1.0,
              scale: bolt.feedback === 'PERFECT' ? 1.5 : 1.3,
              life: 0,
              maxLife: 40,
            });
          } else {
            // MISS / WRONG KEY STRUCK:
            // Laser strikes the wrong physical keycap on the keyboard!
            shockwavesRef.current.push({
              x: impactX,
              y: impactY,
              radius: 8,
              maxRadius: bolt.targetWidth * 1.3,
              color: '#ef4444',
              alpha: 1.0,
            });
            for (let i = 0; i < 24; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 2.5 + Math.random() * 6.5;
              particlesRef.current.push({
                x: impactX,
                y: impactY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.0,
                color: i % 2 === 0 ? '#ef4444' : '#fca5a5',
                size: 2.5 + Math.random() * 3.5,
                alpha: 1.0,
                life: 0,
                maxLife: 22 + Math.random() * 10,
              });
            }
            feedbacksRef.current.push({
              text: `❌ WRONG KEY: [${bolt.missedKeyDisplay || 'MISFIRE'}]`,
              color: '#ef4444',
              x: impactX,
              y: impactY - 22,
              vy: -2.0,
              alpha: 1.0,
              scale: 1.3,
              life: 0,
              maxLife: 38,
            });
          }
        }

        // Keep bolt alive until it detonates or completes trajectory
        return t < 1.0 && !bolt.hasDetonated && bolt.life < bolt.maxLife;
      });

      // 2. DRAW NUCLEAR DETONATION FLASHES
      nuclearFlashesRef.current = nuclearFlashesRef.current.filter((nf) => {
        nf.radius += (nf.maxRadius - nf.radius) * 0.35;
        nf.alpha -= 0.12;
        if (nf.alpha > 0) {
          ctx.save();
          const grad = ctx.createRadialGradient(
            nf.x,
            nf.y,
            0,
            nf.x,
            nf.y,
            nf.radius,
          );
          grad.addColorStop(0, `rgba(255, 255, 255, ${nf.alpha})`);
          grad.addColorStop(0.4, `rgba(255, 240, 180, ${nf.alpha * 0.75})`);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(nf.x, nf.y, nf.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          return true;
        }
        return false;
      });

      // 3. DRAW EXPLODING DRONE VAPORIZATION GHOSTS (Fracturing hull silhouette dissolving in white light)
      explodingDronesRef.current = explodingDronesRef.current.filter((ed) => {
        ed.life += 1;
        const progress = ed.life / ed.maxLife;
        const alpha = Math.max(0, 1 - progress);
        if (alpha > 0) {
          ctx.save();
          ctx.translate(ed.x, ed.y);
          ctx.globalAlpha = alpha;
          const scale = 1 + progress * 0.25;
          ctx.scale(scale, scale);

          // White-hot fracturing drone boundary
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.shadowColor = ed.color;
          ctx.shadowBlur = 20;
          ctx.strokeRect(-ed.width / 2, -ed.height / 2, ed.width, ed.height);

          // Fiery plasma fill
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
          ctx.fillRect(-ed.width / 2, -ed.height / 2, ed.width, ed.height);
          ctx.restore();
          return true;
        }
        return false;
      });

      // 4. DRAW SHATTERING DEBRIS (Spinning Rock & Drone Voxel Shards)
      debrisRef.current = debrisRef.current.filter((df) => {
        df.x += df.vx;
        df.y += df.vy;
        df.vy += 0.28; // Gravity
        df.rotation += df.vRot;
        df.life += 1;
        df.alpha = Math.max(0, 1 - df.life / df.maxLife);

        if (df.alpha > 0) {
          ctx.save();
          ctx.translate(df.x, df.y);
          ctx.rotate(df.rotation);
          ctx.fillStyle = df.color;
          ctx.globalAlpha = df.alpha;
          ctx.beginPath();
          ctx.moveTo(-df.size, -df.size * 0.6);
          ctx.lineTo(df.size * 0.8, -df.size * 0.4);
          ctx.lineTo(df.size * 0.5, df.size * 0.8);
          ctx.lineTo(-df.size * 0.7, df.size * 0.5);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          return true;
        }
        return false;
      });

      // 5. DRAW SPARKS (Combustion Plasma Particles)
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

      // 6. DRAW EXPANDING SHOCKWAVES
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

      // 7. DRAW ARCADE ENERGY CRYSTALS (Floating Diamonds with Glints)
      crystalsRef.current = crystalsRef.current.filter((cs) => {
        cs.x += cs.vx;
        cs.y += cs.vy;
        cs.vy += 0.12; // gentle float gravity
        cs.life += 1;
        cs.alpha = Math.max(0, 1 - cs.life / cs.maxLife);

        if (cs.alpha > 0) {
          ctx.save();
          ctx.translate(cs.x, cs.y);
          ctx.fillStyle = cs.color;
          ctx.shadowColor = cs.color;
          ctx.shadowBlur = 8;
          ctx.globalAlpha = cs.alpha;
          ctx.beginPath();
          ctx.moveTo(0, -cs.size);
          ctx.lineTo(cs.size * 0.7, 0);
          ctx.lineTo(0, cs.size);
          ctx.lineTo(-cs.size * 0.7, 0);
          ctx.closePath();
          ctx.fill();

          // White center specular glint
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, cs.size * 0.35, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          return true;
        }
        return false;
      });

      // 8. DRAW FLOATING SCORE RATING POPUPS
      feedbacksRef.current = feedbacksRef.current.filter((fb) => {
        fb.y += fb.vy;
        fb.life += 1;
        fb.scale = Math.max(1.0, fb.scale - 0.015);
        fb.alpha = Math.max(0, 1 - fb.life / fb.maxLife);

        if (fb.alpha > 0) {
          ctx.save();
          ctx.font =
            '900 16px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
          ctx.textAlign = 'center';
          ctx.fillStyle = fb.color;
          ctx.globalAlpha = fb.alpha;
          ctx.shadowColor = 'rgba(0, 0, 0, 1)';
          ctx.shadowBlur = 10;
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

  // Handle direct click/touch on a virtual keycap
  const handleVirtualKeyClick = (k: KeySpec) => {
    let charToSend = k.key;
    if (k.key === 'Backspace') charToSend = 'Backspace';
    else if (k.key === 'Enter') charToSend = 'Enter';
    else if (k.key === 'Tab') charToSend = 'Tab';
    else if (k.key === 'ShiftLeft' || k.key === 'ShiftRight') return;
    else if (
      k.key === 'CapsLock' ||
      k.key === 'ControlLeft' ||
      k.key === 'ControlRight' ||
      k.key === 'AltLeft' ||
      k.key === 'AltRight' ||
      k.key === 'MetaLeft' ||
      k.key === 'MetaRight'
    )
      return;

    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: charToSend,
        bubbles: true,
      }),
    );

    setTimeout(() => {
      window.dispatchEvent(
        new KeyboardEvent('keyup', {
          key: charToSend,
          bubbles: true,
        }),
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
            style={{
              color: FINGER_COLOR_MAP.LEFT_INDEX,
              borderColor: `${FINGER_COLOR_MAP.LEFT_INDEX}60`,
            }}
            title="Left Index Finger Home Anchor [F]"
          >
            [F]
          </span>
          <span
            className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-800 font-bold border"
            style={{
              color: FINGER_COLOR_MAP.RIGHT_INDEX,
              borderColor: `${FINGER_COLOR_MAP.RIGHT_INDEX}60`,
            }}
            title="Right Index Finger Home Anchor [J]"
          >
            [J]
          </span>
        </div>
      </div>

      {/* FLIGHT STAGE: Integrated Drop Highway + Mechanical Receptor Deck + Under-Keyboard Defense Trench */}
      {/* Vertically taller container (h-[620px] sm:h-[700px]) to render more of the falling roadmap without altering key dimensions */}
      <div
        ref={containerRef}
        className="relative w-full h-[620px] sm:h-[700px] bg-transparent overflow-hidden flex flex-col justify-between select-none"
      >
        {/* Canvas for Hit Sparks, Shockwaves, and Combat Rating Popups (Layer z-40: IN FRONT OF EVERYTHING for un-occluded VFX) */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-40 block"
        />

        {/* 1. LASER GUIDANCE MARKER (Layer z-5: Single diffused center line with ramp up and down glow, spanning from top to ship) */}
        {activeKeyPos && (
          <div
            className="absolute top-0 -translate-x-1/2 pointer-events-none transition-all duration-100 ease-out z-5 flex items-center justify-center"
            style={{
              left: `${activeKeyPos.x}px`,
              width: '24px',
              height: `${Math.max(20, shipY - 14)}px`,
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

        {/* 1.5. PLAYER ASTRO-INTERCEPTOR DEFENSE STARFIGHTER (Mounted UNDERNEATH the keyboard, tracking active key and firing UPWARD) */}
        {activeKeyPos && (
          <div
            className="absolute pointer-events-none transition-all duration-100 ease-out z-35 flex flex-col items-center"
            style={{
              left: `${activeKeyPos.x}px`,
              top: `${shipY - 26}px`,
              transform: `translateX(-50%) rotate(${shotAimAngle}deg)`,
              transformOrigin: '50% 85%',
            }}
          >
            {/* Starfighter Craft with visceral recoil and twin muzzle flares */}
            <div
              className={`relative transition-transform duration-75 ${muzzleFlashActive > Date.now() ? 'translate-y-1.5 scale-90' : ''}`}
            >
              {/* Twin High-Intensity Muzzle Flash Flares when firing */}
              <span
                className={`absolute -top-3.5 left-0.5 w-2.5 h-5 rounded-full pointer-events-none transition-all duration-75 ${
                  muzzleFlashActive > Date.now()
                    ? 'opacity-100 scale-125'
                    : 'opacity-0 scale-50'
                }`}
                style={{
                  background:
                    timingFeedback === 'MISS'
                      ? 'radial-gradient(circle, #ffffff 40%, #ef4444 80%, transparent)'
                      : 'radial-gradient(circle, #ffffff 40%, #facc15 80%, transparent)',
                  boxShadow:
                    timingFeedback === 'MISS'
                      ? '0 0 16px #ef4444, 0 0 24px #f43f5e'
                      : `0 0 16px ${activeLaneColor}, 0 0 24px #facc15`,
                }}
              />
              <span
                className={`absolute -top-3.5 right-0.5 w-2.5 h-5 rounded-full pointer-events-none transition-all duration-75 ${
                  muzzleFlashActive > Date.now()
                    ? 'opacity-100 scale-125'
                    : 'opacity-0 scale-50'
                }`}
                style={{
                  background:
                    timingFeedback === 'MISS'
                      ? 'radial-gradient(circle, #ffffff 40%, #ef4444 80%, transparent)'
                      : 'radial-gradient(circle, #ffffff 40%, #facc15 80%, transparent)',
                  boxShadow:
                    timingFeedback === 'MISS'
                      ? '0 0 16px #ef4444, 0 0 24px #f43f5e'
                      : `0 0 16px ${activeLaneColor}, 0 0 24px #facc15`,
                }}
              />

              {/* Starfighter Craft Silhouette (Cannons pointing UP) */}
              <svg
                width="42"
                height="28"
                viewBox="0 0 42 28"
                fill="none"
                className="drop-shadow-[0_4px_14px_rgba(0,0,0,0.95)]"
              >
                {/* Rear ion engine glow pointing downward */}
                <ellipse
                  cx="21"
                  cy="24"
                  rx="5.5"
                  ry="3"
                  fill={activeLaneColor}
                  opacity="0.9"
                  className="animate-pulse"
                />
                <ellipse cx="21" cy="25" rx="3" ry="1.5" fill="#ffffff" />
                {/* Starfighter Armor Hull & Swept Cannons */}
                <polygon
                  points="21,2 25,11 38,17 41,23 30,21 24,24 21,21 18,24 12,21 1,23 4,17 17,11"
                  fill="#090d16"
                  stroke={activeLaneColor}
                  strokeWidth="1.6"
                />
                {/* Cockpit Canopy Glass */}
                <polygon
                  points="21,6 23.5,14 21,17 18.5,14"
                  fill="#38bdf8"
                  opacity="0.95"
                />
                {/* Twin Heavy Blaster Cannons pointing UP */}
                <rect
                  x="13"
                  y="2"
                  width="2.5"
                  height="9"
                  rx="1"
                  fill="#f8fafc"
                  stroke="#334155"
                  strokeWidth="0.5"
                />
                <rect
                  x="26.5"
                  y="2"
                  width="2.5"
                  height="9"
                  rx="1"
                  fill="#f8fafc"
                  stroke="#334155"
                  strokeWidth="0.5"
                />
              </svg>
            </div>
          </div>
        )}

        {/* 2. INCOMING ALIEN DRONES & HOSTILE STAGING SQUADRON (Layer z-30: In front of keyboard) */}
        <div className="absolute inset-0 pointer-events-none z-30">
          {notes.map((note, noteIdx) => {
            if (note.status === 'PROCESSED') return null;

            const lookupKey = note.char === ' ' ? ' ' : note.char.toLowerCase();
            const pos = keyPositions[lookupKey];
            if (!pos) return null;

            const laneMatch = FINGER_LANES[note.lane];
            const laneColor = laneMatch?.color || '#06b6d4';
            const isSpace = note.char === ' ';
            // Sky ceiling and defense perimeter line strictly above keyboard deck
            const skyCeilingY = 20;
            const defensePerimeterY = Math.max(
              skyCeilingY + 48,
              keyboardTopY - 42,
            );

            let topPx = 0;
            if (noteIdx === 0) {
              // The NEXT TARGET DRONE: Smoothly flies down the flight corridor
              const progress = Math.min(1.0, Math.max(0, note.yPercent / 84));
              topPx =
                skyCeilingY + (defensePerimeterY - skyCeilingY) * progress;
            } else {
              // QUEUED SQUADRON: Stationed in echelon formation in orbit (Expanded spacing for taller roadmap view)
              const echelonSlotY = Math.max(
                skyCeilingY,
                defensePerimeterY - noteIdx * 62,
              );
              const travelProgress = Math.min(1.0, note.yPercent / 35);
              topPx =
                skyCeilingY + (echelonSlotY - skyCeilingY) * travelProgress;
            }

            const noteWidth = pos.width;
            const noteHeight = pos.height;
            const kSpec = KEY_SPEC_LOOKUP[lookupKey];

            // Register live drone in active registry for laser aiming
            const droneRecord = {
              id: note.id,
              char: note.char,
              x: pos.x,
              y: topPx,
              width: noteWidth,
              height: noteHeight,
              isSpace,
              laneColor,
              display: kSpec?.display || note.displayChar,
              subDisplay: kSpec?.subDisplay,
            };
            liveDronesMapRef.current.set(note.id, droneRecord);
            liveDronesByCharRef.current.set(lookupKey, droneRecord);
            if (noteIdx === 0) {
              activeDronePosRef.current = droneRecord;
            }

            return (
              <div
                key={note.id}
                className={`absolute -translate-x-1/2 flex items-center justify-center rounded-lg font-mono transition-transform duration-75 select-none ${
                  noteIdx === 0
                    ? isSpace
                      ? 'bg-slate-950/90 border-2 text-white z-30'
                      : 'bg-slate-950/95 border-2 text-white z-30'
                    : isSpace
                      ? 'bg-slate-900/80 border text-slate-300 opacity-90 z-20'
                      : 'bg-slate-900/90 border text-slate-300 opacity-90 z-20'
                }`}
                style={{
                  left: `${pos.x}px`,
                  top: `${topPx}px`,
                  width: `${noteWidth}px`,
                  height: `${noteHeight}px`,
                  borderColor: noteIdx === 0 ? laneColor : `${laneColor}80`,
                  boxShadow:
                    noteIdx === 0
                      ? `0 4px 0 #020617, 0 0 24px ${laneColor}90, inset 0 1px 1px rgba(255,255,255,0.4)`
                      : `0 3px 0 #020617, 0 4px 10px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1)`,
                }}
              >
                {/* HOSTILE CRAFT HULL DETAILS */}
                {isSpace ? (
                  /* ALIEN HEAVY DREADNOUGHT / FLAGSHIP CRUISER */
                  <div className="relative w-full h-full flex items-center justify-center">
                    {/* Quad Plasma Thrusters on Top (Propelling the dreadnought down) */}
                    <div className="absolute -top-3.5 inset-x-8 flex justify-around items-end pointer-events-none">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className="w-2.5 h-3.5 rounded-full animate-pulse shadow-lg"
                          style={{
                            background:
                              'linear-gradient(to top, #ffffff, #10b981, transparent)',
                            boxShadow: '0 0 10px #10b981',
                          }}
                        />
                      ))}
                    </div>

                    {/* Port & Starboard Heavy Outboard Weapon Wings */}
                    <div
                      className="absolute top-1/2 -left-4 -translate-y-1/2 w-4 h-6 border-l-2 border-t-2 border-b-2 rounded-l-md pointer-events-none flex items-center justify-center bg-slate-950 shadow-md"
                      style={{ borderColor: '#10b981' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    </div>
                    <div
                      className="absolute top-1/2 -right-4 -translate-y-1/2 w-4 h-6 border-r-2 border-t-2 border-b-2 rounded-r-md pointer-events-none flex items-center justify-center bg-slate-950 shadow-md"
                      style={{ borderColor: '#10b981' }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    </div>

                    {/* Center Command Bridge */}
                    <div className="flex items-center justify-center gap-2 z-10 pointer-events-none">
                      {noteIdx === 0 && (
                        <span className="text-[9px] font-black tracking-widest text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/40 animate-pulse">
                          HOSTILE FLAGSHIP
                        </span>
                      )}
                      <span
                        className={`truncate font-mono font-black tracking-wider select-none ${
                          noteIdx === 0
                            ? 'text-white drop-shadow-[0_0_10px_rgba(16,185,129,0.95)] text-base sm:text-lg'
                            : 'text-slate-200 text-sm sm:text-base'
                        }`}
                      >
                        ␣ SPACE
                      </span>
                      {noteIdx === 0 && (
                        <span className="text-[9px] font-black tracking-widest text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/40 animate-pulse">
                          LOCK
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ALIEN ATTACK DRONE / SCOUT FIGHTER */
                  <div className="relative w-full h-full flex items-center justify-center">
                    {/* Twin Ion Thruster Plumes on Top (Firing upward) */}
                    <div className="absolute -top-3.5 inset-x-2 flex justify-between items-end pointer-events-none px-1">
                      <span
                        className="w-2 h-3.5 rounded-full animate-pulse shadow-md"
                        style={{
                          background: `linear-gradient(to top, #ffffff, ${laneColor}, transparent)`,
                          boxShadow: `0 0 8px ${laneColor}`,
                        }}
                      />
                      <span
                        className="w-2 h-3.5 rounded-full animate-pulse shadow-md"
                        style={{
                          background: `linear-gradient(to top, #ffffff, ${laneColor}, transparent)`,
                          boxShadow: `0 0 8px ${laneColor}`,
                        }}
                      />
                    </div>

                    {/* Outboard Alien Fighter Wings (Left & Right) */}
                    <div
                      className="absolute top-1/2 -left-3.5 -translate-y-1/2 w-3.5 h-5 border-l-2 border-t-2 border-b-2 rounded-l-md pointer-events-none flex items-center justify-center bg-slate-950 shadow-md"
                      style={{ borderColor: laneColor }}
                    >
                      <span className="w-1 h-1 rounded-full bg-rose-500 animate-ping" />
                    </div>
                    <div
                      className="absolute top-1/2 -right-3.5 -translate-y-1/2 w-3.5 h-5 border-r-2 border-t-2 border-b-2 rounded-r-md pointer-events-none flex items-center justify-center bg-slate-950 shadow-md"
                      style={{ borderColor: laneColor }}
                    >
                      <span className="w-1 h-1 rounded-full bg-rose-500 animate-ping" />
                    </div>

                    {/* Forward Hostile Optical Sensor Eye (Pointing down toward player) */}
                    <div className="absolute -bottom-1 inset-x-0 flex justify-center pointer-events-none">
                      <span
                        className={`w-2.5 h-1 rounded-full ${
                          noteIdx === 0
                            ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse'
                            : 'bg-amber-400 opacity-70'
                        }`}
                      />
                    </div>

                    {/* Reinforced Cockpit Core (Letter glyph in crisp, pristine high-contrast, enlarged for visibility) */}
                    <div className="flex flex-col items-center justify-center leading-none pointer-events-none select-none z-10">
                      {kSpec?.subDisplay && (
                        <span
                          className={`text-[10px] sm:text-xs leading-none mb-0.5 font-black ${
                            noteIdx === 0 ? 'text-white' : 'text-slate-300'
                          }`}
                          style={{
                            color: noteIdx === 0 ? laneColor : undefined,
                          }}
                        >
                          {kSpec.subDisplay}
                        </span>
                      )}
                      <span
                        className={`truncate font-mono leading-none ${
                          noteIdx === 0
                            ? 'text-white font-black drop-shadow-[0_0_12px_rgba(255,255,255,0.95)]'
                            : 'text-slate-100 font-extrabold'
                        } ${
                          (kSpec?.display || note.displayChar).length > 2
                            ? 'text-xs sm:text-sm font-bold'
                            : noteIdx === 0
                              ? 'text-xl sm:text-2xl font-black'
                              : 'text-base sm:text-lg font-bold'
                        }`}
                      >
                        {kSpec?.display || note.displayChar}
                      </span>
                    </div>
                  </div>
                )}

                {/* Finger color accent bar at bottom of drone chassis */}
                <span
                  className={`absolute bottom-0 inset-x-1 rounded-full ${
                    noteIdx === 0
                      ? 'h-1 opacity-100 shadow-[0_0_8px_currentColor]'
                      : 'h-[2px] opacity-75'
                  }`}
                  style={{ backgroundColor: laneColor, color: laneColor }}
                />

                {/* Sci-Fi Tactical Lock-On Corner Brackets for Active Target */}
                {noteIdx === 0 && (
                  <>
                    <span
                      className="absolute -top-[4px] -left-[4px] w-2.5 h-2.5 border-t-2 border-l-2 pointer-events-none rounded-tl-sm animate-pulse"
                      style={{ borderColor: laneColor }}
                    />
                    <span
                      className="absolute -top-[4px] -right-[4px] w-2.5 h-2.5 border-t-2 border-r-2 pointer-events-none rounded-tr-sm animate-pulse"
                      style={{ borderColor: laneColor }}
                    />
                    <span
                      className="absolute -bottom-[4px] -left-[4px] w-2.5 h-2.5 border-b-2 border-l-2 pointer-events-none rounded-bl-sm animate-pulse"
                      style={{ borderColor: laneColor }}
                    />
                    <span
                      className="absolute -bottom-[4px] -right-[4px] w-2.5 h-2.5 border-b-2 border-r-2 pointer-events-none rounded-br-sm animate-pulse"
                      style={{ borderColor: laneColor }}
                    />
                  </>
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
                activeFinger={
                  mainKeyHand === 'left'
                    ? mainKeyFinger
                    : isSpaceActive
                      ? 'THUMB'
                      : null
                }
                activeKeyDisplay={
                  mainKeyHand === 'left'
                    ? targetKeyDisplay
                    : isSpaceActive
                      ? ' '
                      : null
                }
                modifierFinger={modifierHand === 'left' ? modifierFinger : null}
                modifierLabel={modifierHand === 'left' ? modifierLabel : null}
                lastPressedKey={lastPressedKey}
                thumbRole={
                  isSpaceActive
                    ? smartThumbHand === 'left'
                      ? 'primary'
                      : 'secondary'
                    : null
                }
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
                        (recommendedShift === 'right' &&
                          k.key === 'ShiftRight'));

                    const isTargetModifier = isTargetShift;
                    const isCurrentlyPressed = Boolean(
                      lastPressedKey &&
                        lastPressedKey.toLowerCase() === k.key.toLowerCase(),
                    );
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
                            backgroundColor: isTargetModifier
                              ? '#fbbf24'
                              : laneColor,
                            color: laneColor,
                          }}
                        />

                        {/* Tactile bump marker for standard touch typing (F & J) */}
                        {k.isBump && (
                          <span
                            className="absolute bottom-1 w-2.5 h-0.5 rounded-full"
                            style={{
                              backgroundColor: isTargetKey
                                ? '#ffffff'
                                : laneColor,
                            }}
                          />
                        )}

                        {/* Modifier Dotted Highlight Badge */}
                        {isTargetModifier && (
                          <span className="absolute -top-2.5 px-1.5 py-0.2 rounded text-[8px] font-black bg-amber-400 text-slate-950 tracking-tighter shadow-md animate-bounce border border-dashed border-amber-300">
                            ·· HOLD{' '}
                            {k.key.includes('Control') ? 'CTRL' : 'SHIFT'} ··
                          </span>
                        )}

                        {/* Key Legend (Sub-display for shift symbols) */}
                        {k.subDisplay && keyboardVisible && (
                          <span
                            className={`text-[10px] sm:text-xs leading-none mb-0.5 font-black ${
                              isTargetKey
                                ? 'text-white'
                                : isTargetModifier
                                  ? 'text-amber-300'
                                  : 'text-slate-300'
                            }`}
                            style={{
                              color: isTargetKey ? laneColor : undefined,
                            }}
                          >
                            {k.subDisplay}
                          </span>
                        )}

                        {/* Character label: 100% Vector Sharp, or Blind Touch Dot when deck guides are hidden */}
                        {k.key === ' ' && isTargetKey ? (
                          <div className="flex items-center justify-between w-full px-2 sm:px-3 text-[10px] font-mono pointer-events-none">
                            <span
                              className={`transition-all ${
                                smartThumbHand === 'left'
                                  ? 'text-emerald-300 font-black drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                                  : 'text-emerald-500/50 font-semibold text-[9px]'
                              }`}
                            >
                              {smartThumbHand === 'left'
                                ? '◀ L. THUMB [REC]'
                                : 'L. Thumb (Alt)'}
                            </span>
                            <span className="truncate font-mono font-black text-sm sm:text-base text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] flex items-center gap-1.5">
                              <span>␣</span>
                              <span>SPACE</span>
                            </span>
                            <span
                              className={`transition-all ${
                                smartThumbHand === 'right'
                                  ? 'text-emerald-300 font-black drop-shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                                  : 'text-emerald-500/50 font-semibold text-[9px]'
                              }`}
                            >
                              {smartThumbHand === 'right'
                                ? 'R. THUMB [REC] ▶'
                                : 'R. Thumb (Alt)'}
                            </span>
                          </div>
                        ) : !keyboardVisible ? (
                          /* Blind Touch-Typing Mode: Hide letter print so user relies on finger memory */
                          <div className="flex items-center justify-center pointer-events-none">
                            {isTargetKey ? (
                              <span
                                className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor] animate-pulse"
                                style={{
                                  backgroundColor: laneColor,
                                  color: laneColor,
                                }}
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
                                ? 'text-white font-black drop-shadow-[0_1px_2px_rgba(0,0,0,1)]'
                                : isTargetModifier
                                  ? 'text-amber-200 font-bold'
                                  : isCurrentlyPressed
                                    ? 'text-white font-black drop-shadow-[0_0_8px_currentColor]'
                                    : 'text-slate-100 font-extrabold'
                            } ${
                              k.display.length > 3
                                ? 'text-[10px] sm:text-xs font-bold'
                                : k.display.length > 1
                                  ? 'text-xs sm:text-sm font-bold'
                                  : isTargetKey
                                    ? 'text-base sm:text-lg font-black'
                                    : 'text-base sm:text-lg font-extrabold'
                            }`}
                            style={{
                              color: isCurrentlyPressed ? '#ffffff' : undefined,
                            }}
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
                activeFinger={
                  mainKeyHand === 'right'
                    ? mainKeyFinger
                    : isSpaceActive
                      ? 'THUMB'
                      : null
                }
                activeKeyDisplay={
                  mainKeyHand === 'right'
                    ? targetKeyDisplay
                    : isSpaceActive
                      ? ' '
                      : null
                }
                modifierFinger={
                  modifierHand === 'right' ? modifierFinger : null
                }
                modifierLabel={modifierHand === 'right' ? modifierLabel : null}
                lastPressedKey={lastPressedKey}
                thumbRole={
                  isSpaceActive
                    ? smartThumbHand === 'right'
                      ? 'primary'
                      : 'secondary'
                    : null
                }
              />
            )}
          </div>
        </div>

        {/* 4. DEFENSE LAUNCH TRENCH (Mounted directly underneath the mechanical keyboard) */}
        <div className="relative z-20 pb-2 px-1 sm:px-3 overflow-hidden select-none">
          <div className="max-w-4xl min-w-[580px] mx-auto h-7 rounded-xl bg-slate-950/90 border border-slate-800/80 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-between px-3.5 relative overflow-hidden">
            {/* Mag-Lev Track Guide Line */}
            <div className="absolute inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
            <span className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase select-none flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              INTERCEPTOR DEFENSE RAIL // ACTIVE KEY VECTOR
            </span>
            <span className="text-[8px] font-mono text-cyan-400 font-bold uppercase select-none flex items-center gap-1">
              <span>BATTERY ARMED</span>
              <span className="text-[10px]">▲</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
