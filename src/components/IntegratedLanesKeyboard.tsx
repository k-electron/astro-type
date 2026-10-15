import React, { useEffect, useRef, useMemo } from 'react';
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { FallingNote, TrailColorTheme, FingerZone } from '../types/game';
import { FINGER_LANES, KEY_FINGER_MAP } from '../data/curriculum';
import { Sparkles, Flame } from 'lucide-react';

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
  lastPressedKey: string | null;
}

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
  rx: number;
  ry: number;
  maxRx: number;
  maxRy: number;
  color: string;
  alpha: number;
}

interface Star {
  x: number;
  y: number;
  z: number;
  speed: number;
  size: number;
}

interface FeedbackPopup {
  text: string;
  color: string;
  x: number;
  y: number;
  vy: number;
  scale: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface KeyConfig {
  key: string;
  display: string;
  finger: FingerZone;
  lane: number;
  width?: string;
  isBump?: boolean;
}

const KEYBOARD_GRID: KeyConfig[][] = [
  // Row 0: Numbers
  [
    { key: '`', display: '~ `', finger: 'LEFT_PINKY', lane: 0 },
    { key: '1', display: '1', finger: 'LEFT_PINKY', lane: 0 },
    { key: '2', display: '2', finger: 'LEFT_RING', lane: 1 },
    { key: '3', display: '3', finger: 'LEFT_MIDDLE', lane: 2 },
    { key: '4', display: '4', finger: 'LEFT_INDEX', lane: 3 },
    { key: '5', display: '5', finger: 'LEFT_INDEX', lane: 3 },
    { key: '6', display: '6', finger: 'RIGHT_INDEX', lane: 5 },
    { key: '7', display: '7', finger: 'RIGHT_INDEX', lane: 5 },
    { key: '8', display: '8', finger: 'RIGHT_MIDDLE', lane: 6 },
    { key: '9', display: '9', finger: 'RIGHT_RING', lane: 7 },
    { key: '0', display: '0', finger: 'RIGHT_PINKY', lane: 8 },
    { key: '-', display: '_ -', finger: 'RIGHT_PINKY', lane: 8 },
    { key: '=', display: '+ =', finger: 'RIGHT_PINKY', lane: 8 },
    { key: 'Backspace', display: '⌫', finger: 'RIGHT_PINKY', lane: 8, width: 'w-10 sm:w-14' },
  ],
  // Row 1: Top Row
  [
    { key: 'Tab', display: 'Tab', finger: 'LEFT_PINKY', lane: 0, width: 'w-10 sm:w-12' },
    { key: 'q', display: 'Q', finger: 'LEFT_PINKY', lane: 0 },
    { key: 'w', display: 'W', finger: 'LEFT_RING', lane: 1 },
    { key: 'e', display: 'E', finger: 'LEFT_MIDDLE', lane: 2 },
    { key: 'r', display: 'R', finger: 'LEFT_INDEX', lane: 3 },
    { key: 't', display: 'T', finger: 'LEFT_INDEX', lane: 3 },
    { key: 'y', display: 'Y', finger: 'RIGHT_INDEX', lane: 5 },
    { key: 'u', display: 'U', finger: 'RIGHT_INDEX', lane: 5 },
    { key: 'i', display: 'I', finger: 'RIGHT_MIDDLE', lane: 6 },
    { key: 'o', display: 'O', finger: 'RIGHT_RING', lane: 7 },
    { key: 'p', display: 'P', finger: 'RIGHT_PINKY', lane: 8 },
    { key: '[', display: '{ [', finger: 'RIGHT_PINKY', lane: 8 },
    { key: ']', display: '} ]', finger: 'RIGHT_PINKY', lane: 8 },
    { key: '\\', display: '| \\', finger: 'RIGHT_PINKY', lane: 8, width: 'w-8 sm:w-10' },
  ],
  // Row 2: Home Row
  [
    { key: 'CapsLock', display: 'Caps', finger: 'LEFT_PINKY', lane: 0, width: 'w-12 sm:w-14' },
    { key: 'a', display: 'A', finger: 'LEFT_PINKY', lane: 0 },
    { key: 's', display: 'S', finger: 'LEFT_RING', lane: 1 },
    { key: 'd', display: 'D', finger: 'LEFT_MIDDLE', lane: 2 },
    { key: 'f', display: 'F', finger: 'LEFT_INDEX', lane: 3, isBump: true },
    { key: 'g', display: 'G', finger: 'LEFT_INDEX', lane: 3 },
    { key: 'h', display: 'H', finger: 'RIGHT_INDEX', lane: 5 },
    { key: 'j', display: 'J', finger: 'RIGHT_INDEX', lane: 5, isBump: true },
    { key: 'k', display: 'K', finger: 'RIGHT_MIDDLE', lane: 6 },
    { key: 'l', display: 'L', finger: 'RIGHT_RING', lane: 7 },
    { key: ';', display: ': ;', finger: 'RIGHT_PINKY', lane: 8 },
    { key: "'", display: '" \'', finger: 'RIGHT_PINKY', lane: 8 },
    { key: 'Enter', display: 'Enter', finger: 'RIGHT_PINKY', lane: 8, width: 'w-14 sm:w-16' },
  ],
  // Row 3: Bottom Row
  [
    { key: 'ShiftLeft', display: 'Shift', finger: 'LEFT_PINKY', lane: 0, width: 'w-14 sm:w-16' },
    { key: 'z', display: 'Z', finger: 'LEFT_PINKY', lane: 0 },
    { key: 'x', display: 'X', finger: 'LEFT_RING', lane: 1 },
    { key: 'c', display: 'C', finger: 'LEFT_MIDDLE', lane: 2 },
    { key: 'v', display: 'V', finger: 'LEFT_INDEX', lane: 3 },
    { key: 'b', display: 'B', finger: 'LEFT_INDEX', lane: 3 },
    { key: 'n', display: 'N', finger: 'RIGHT_INDEX', lane: 5 },
    { key: 'm', display: 'M', finger: 'RIGHT_INDEX', lane: 5 },
    { key: ',', display: '< ,', finger: 'RIGHT_MIDDLE', lane: 6 },
    { key: '.', display: '> .', finger: 'RIGHT_RING', lane: 7 },
    { key: '/', display: '? /', finger: 'RIGHT_PINKY', lane: 8 },
    { key: 'ShiftRight', display: 'Shift', finger: 'RIGHT_PINKY', lane: 8, width: 'w-16 sm:w-20' },
  ],
  // Row 4: Space Bar Row
  [
    { key: 'ControlLeft', display: 'Ctrl', finger: 'LEFT_PINKY', lane: 0, width: 'w-10 sm:w-12' },
    { key: 'AltLeft', display: 'Alt', finger: 'LEFT_RING', lane: 1, width: 'w-10 sm:w-12' },
    { key: ' ', display: 'SPACEBAR', finger: 'THUMB', lane: 4, width: 'w-48 sm:w-72' },
    { key: 'AltRight', display: 'Alt', finger: 'RIGHT_RING', lane: 7, width: 'w-10 sm:w-12' },
    { key: 'ControlRight', display: 'Ctrl', finger: 'RIGHT_PINKY', lane: 8, width: 'w-10 sm:w-12' },
  ],
];

const THEME_ACCENTS: Record<TrailColorTheme, string> = {
  CYAN: '#06b6d4',
  AMBER: '#f59e0b',
  EMERALD: '#10b981',
  VIOLET: '#8b5cf6',
  SUPERNOVA: '#f43f5e',
};

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
  lastPressedKey,
}) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const keyRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Helper to measure exact layout of a key on the visual keyboard
  const getKeyLayout = (char: string, screenWidth: number, screenHeight: number, laneIndex: number) => {
    const stage = stageRef.current;
    const lookupKey = char === ' ' ? ' ' : char.toLowerCase();
    const keyEl = keyRefs.current[lookupKey];

    if (stage && keyEl) {
      const sRect = stage.getBoundingClientRect();
      const kRect = keyEl.getBoundingClientRect();
      if (kRect.width > 0 && kRect.height > 0) {
        return {
          x: kRect.left - sRect.left + kRect.width / 2,
          y: kRect.top - sRect.top + kRect.height / 2,
          width: kRect.width,
          height: kRect.height,
          top: kRect.top - sRect.top,
        };
      }
    }

    // Proportional fallbacks if element not yet measured
    const bottomWidth = screenWidth * 0.92;
    const bottomStartX = (screenWidth - bottomWidth) / 2;
    const bottomLaneWidth = bottomWidth / 9;
    return {
      x: bottomStartX + (laneIndex + 0.5) * bottomLaneWidth,
      y: screenHeight - 60,
      width: char === ' ' ? 180 : 36,
      height: 34,
      top: screenHeight - 140,
    };
  };

  // Get top Y coordinate of the visual keyboard
  const getKeyboardTopY = (screenHeight: number): number => {
    const stage = stageRef.current;
    const sampleKey = keyRefs.current['`'] || keyRefs.current['1'] || keyRefs.current['q'];
    if (stage && sampleKey) {
      const sRect = stage.getBoundingClientRect();
      const kRect = sampleKey.getBoundingClientRect();
      if (kRect.top > 0) {
        return kRect.top - sRect.top;
      }
    }
    return screenHeight - 160;
  };

  // State ref for high-frequency 60+ FPS Pixi ticker
  const stateRef = useRef({
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
  });

  useEffect(() => {
    stateRef.current = {
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
    };
  }, [
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
  ]);

  // Particle & FX systems
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const starsRef = useRef<Star[]>([]);
  const feedbacksRef = useRef<FeedbackPopup[]>([]);
  const laneFlashesRef = useRef<number[]>(new Array(9).fill(0));
  const lastFeedbackKeyRef = useRef<number>(timingFeedbackKey);

  // Active target character info
  const activeCharInfo = useMemo(() => {
    if (!activeChar) return null;
    return KEY_FINGER_MAP[activeChar] || KEY_FINGER_MAP[activeChar.toLowerCase()] || null;
  }, [activeChar]);

  const targetKeyLower = activeChar ? (activeChar === ' ' ? ' ' : activeChar.toLowerCase()) : null;
  const isShiftNeeded = activeCharInfo?.shiftRequired || false;
  const recommendedShift = activeCharInfo?.recommendedShiftHand || null;

  // Spawning hit particles & shockwaves directly on the visual keyboard key
  useEffect(() => {
    if (timingFeedbackKey !== lastFeedbackKeyRef.current) {
      lastFeedbackKeyRef.current = timingFeedbackKey;

      if (activeLaneIndex !== null && activeLaneIndex >= 0 && activeLaneIndex < 9) {
        laneFlashesRef.current[activeLaneIndex] = 1.0;
      }

      if (timingFeedback && appRef.current) {
        const app = appRef.current;
        const width = app.screen.width;
        const height = app.screen.height;

        const keyLayout = activeChar
          ? getKeyLayout(activeChar, width, height, activeLaneIndex ?? 4)
          : { x: width / 2, y: height - 60, width: 36, height: 34, top: height - 80 };

        const laneColor =
          activeLaneIndex !== null && FINGER_LANES[activeLaneIndex]
            ? FINGER_LANES[activeLaneIndex].color
            : '#06b6d4';

        const hitColor =
          timingFeedback === 'PERFECT'
            ? '#38bdf8'
            : timingFeedback === 'GREAT'
            ? '#4ade80'
            : timingFeedback === 'GOOD'
            ? '#facc15'
            : '#f43f5e';

        // 1. Spawning Spark Particles right on the key cap
        const particleCount = timingFeedback === 'PERFECT' ? 24 : timingFeedback === 'GREAT' ? 16 : 10;
        for (let i = 0; i < particleCount; i++) {
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
          const speed = 2.0 + Math.random() * 5.0;
          particlesRef.current.push({
            x: keyLayout.x,
            y: keyLayout.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            color: i % 2 === 0 ? hitColor : laneColor,
            size: 2.5 + Math.random() * 3.5,
            alpha: 1.0,
            life: 0,
            maxLife: 20 + Math.random() * 18,
          });
        }

        // 2. Shockwave expanding right off the key cap
        shockwavesRef.current.push({
          x: keyLayout.x,
          y: keyLayout.y,
          rx: keyLayout.width * 0.4,
          ry: keyLayout.height * 0.4,
          maxRx: keyLayout.width * 1.2,
          maxRy: keyLayout.height * 0.9,
          color: hitColor,
          alpha: 1.0,
        });

        // 3. Floating Score / Rating Popup from the key cap
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
          x: keyLayout.x,
          y: keyLayout.y - 18,
          vy: -1.5,
          scale: 1.1,
          alpha: 1.0,
          life: 0,
          maxLife: 30,
        });
      }
    }
  }, [timingFeedbackKey, timingFeedback, activeLaneIndex, activeChar]);

  // PixiJS Setup & LifeCycle
  useEffect(() => {
    const canvas = canvasRef.current;
    const stageEl = stageRef.current;
    if (!canvas || !stageEl) return;

    let isDestroyed = false;
    const app = new Application();

    const initPixi = async () => {
      const rect = stageEl.getBoundingClientRect();
      const initialWidth = Math.max(300, Math.floor(rect.width || stageEl.clientWidth || 800));
      const initialHeight = Math.max(300, Math.floor(rect.height || stageEl.clientHeight || 420));

      await app.init({
        canvas,
        resizeTo: stageEl,
        backgroundAlpha: 0, // Transparent overlay: keyboard and clean cosmic drop zone show through
        antialias: true,
        autoDensity: true,
        resolution: Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1),
      });

      if (isDestroyed) {
        app.destroy(false, { children: true });
        return;
      }

      appRef.current = app;

      // Seed Starfield in upper drop zone
      starsRef.current = [];
      for (let i = 0; i < 60; i++) {
        starsRef.current.push({
          x: Math.random(),
          y: Math.random() * 0.55,
          z: 0.2 + Math.random() * 0.8,
          speed: 0.0015 + Math.random() * 0.005,
          size: 1 + Math.random() * 2,
        });
      }

      // Root Layers
      const stage = app.stage;
      const bgGraphics = new Graphics();
      const guideGraphics = new Graphics();
      const notesGraphics = new Graphics();
      const fxGraphics = new Graphics();

      stage.addChild(bgGraphics);
      stage.addChild(guideGraphics);
      stage.addChild(notesGraphics);
      stage.addChild(fxGraphics);

      // Note text pool
      const noteTextPool: Text[] = [];
      const noteStyle = new TextStyle({
        fontFamily: 'monospace',
        fontSize: 13,
        fontWeight: '900',
        fill: '#ffffff',
        align: 'center',
      });

      const noteTextContainer = new Container();
      stage.addChild(noteTextContainer);

      for (let i = 0; i < 16; i++) {
        const t = new Text({ text: '', style: noteStyle });
        t.anchor.set(0.5);
        t.visible = false;
        noteTextPool.push(t);
        noteTextContainer.addChild(t);
      }

      // Floating Feedback Pool
      const feedbackTextPool: Text[] = [];
      const feedbackStyle = new TextStyle({
        fontFamily: 'monospace',
        fontSize: 12,
        fontWeight: '900',
        fill: '#ffffff',
        align: 'center',
        stroke: { color: '#030712', width: 2 },
      });

      const feedbackContainer = new Container();
      stage.addChild(feedbackContainer);

      for (let i = 0; i < 8; i++) {
        const ft = new Text({ text: '', style: feedbackStyle });
        ft.anchor.set(0.5);
        ft.visible = false;
        feedbackTextPool.push(ft);
        feedbackContainer.addChild(ft);
      }

      // 60+ FPS Hardware-Accelerated Render Loop
      app.ticker.add((ticker) => {
        const width = app.screen.width;
        const height = app.screen.height;
        if (!width || !height || width < 10 || height < 10) return;
        const delta = ticker.deltaTime;

        const {
          notes: currentNotes,
          hyperspaceActive: isHyperspace,
          multiplier: currentMultiplier,
          activeLaneIndex: curActiveLane,
          targetLaneIndex: curTargetLane,
          trailTheme: curTheme,
          activeChar: curActiveChar,
        } = stateRef.current;

        const themeColor = THEME_ACCENTS[curTheme] || '#06b6d4';
        const warpSpeed = isHyperspace ? 4.0 : currentMultiplier > 1 ? 1.0 + (currentMultiplier - 1) * 0.3 : 1.0;

        // Clear graphics
        bgGraphics.clear();
        guideGraphics.clear();
        notesGraphics.clear();
        fxGraphics.clear();

        // Detect top row of keyboard
        const keyboardTopY = getKeyboardTopY(height);
        const topY = 16;

        // 1. CLEAN COSMIC AMBIENCE in upper drop stage
        const nebulaColor = isHyperspace ? '#ec4899' : themeColor;
        bgGraphics.ellipse(width / 2, keyboardTopY * 0.35, width * 0.45, keyboardTopY * 0.3);
        bgGraphics.fill({ color: nebulaColor, alpha: isHyperspace ? 0.12 : 0.05 });

        // Stars falling straight down
        starsRef.current.forEach((star) => {
          star.y += star.speed * warpSpeed * delta;
          if (star.y * height > keyboardTopY - 10) {
            star.y = 0;
            star.x = Math.random();
          }
          const sx = star.x * width;
          const sy = star.y * height;
          const starAlpha = star.z * (isHyperspace ? 0.9 : 0.55);

          if (isHyperspace || currentMultiplier >= 4) {
            const tailLen = star.speed * 400 * warpSpeed;
            bgGraphics.moveTo(sx, sy);
            bgGraphics.lineTo(sx, sy - tailLen);
            bgGraphics.stroke({ width: star.size * 1.2, color: '#bae6fd', alpha: starAlpha });
          } else {
            bgGraphics.rect(sx, sy, star.size, star.size);
            bgGraphics.fill({ color: '#ffffff', alpha: starAlpha });
          }
        });

        // 2. STRAIGHT VERTICAL DROP GUIDE: Exactly aligned with the active key (NO fake perspective lanes)
        if (curActiveChar) {
          const targetLayout = getKeyLayout(curActiveChar, width, height, curTargetLane ?? 4);
          const laneColor = (curTargetLane !== null && FINGER_LANES[curTargetLane]?.color) || themeColor;

          const colW = Math.max(26, targetLayout.width);
          const colX = targetLayout.x - colW / 2;
          const beamH = Math.max(10, targetLayout.top - topY);

          // Subtle vertical translucent guide channel
          guideGraphics.rect(colX, topY, colW, beamH);
          guideGraphics.fill({ color: laneColor, alpha: 0.06 });

          // Subtle vertical guide lines exactly on the edges of the key
          guideGraphics.moveTo(colX, topY);
          guideGraphics.lineTo(colX, targetLayout.top);
          guideGraphics.stroke({ width: 1, color: laneColor, alpha: 0.22 });

          guideGraphics.moveTo(colX + colW, topY);
          guideGraphics.lineTo(colX + colW, targetLayout.top);
          guideGraphics.stroke({ width: 1, color: laneColor, alpha: 0.22 });
        }

        // Active Lane Flash Beam on Keystroke (Straight Vertical)
        if (curActiveLane !== null && curActiveLane >= 0 && curActiveLane < 9) {
          const flash = laneFlashesRef.current[curActiveLane];
          if (flash > 0 && curActiveChar) {
            const layout = getKeyLayout(curActiveChar, width, height, curActiveLane);
            const flashColor = FINGER_LANES[curActiveLane]?.color || themeColor;

            const colW = Math.max(26, layout.width);
            const colX = layout.x - colW / 2;
            const beamH = Math.max(10, layout.top - topY);

            guideGraphics.rect(colX, topY, colW, beamH);
            guideGraphics.fill({ color: flashColor, alpha: flash * 0.22 });

            laneFlashesRef.current[curActiveLane] = Math.max(0, flash - 0.08 * delta);
          }
        }

        // 3. DRAW FALLING NOTES: RECTANGLES ALIGNED DIRECTLY TO KEYS
        let noteTextIdx = 0;

        currentNotes.forEach((note, noteIdx) => {
          if (note.status === 'PROCESSED') return;

          const keyLayout = getKeyLayout(note.char, width, height, note.lane);
          const laneColor = FINGER_LANES[note.lane]?.color || '#06b6d4';

          // DIRECT VERTICAL ALIGNMENT: noteX is ALWAYS identical to keyLayout.x!
          const noteX = keyLayout.x;
          let noteY: number;
          let normProgress = 0;

          if (noteIdx === 0) {
            // Active note descends straight down into its key
            normProgress = Math.min(1.0, note.yPercent / 84);
            const startY = 24;
            const targetY = keyLayout.y;
            noteY = startY + (targetY - startY) * Math.pow(normProgress, 1.25);
          } else {
            // Upcoming notes stay queued in the drop zone strictly above keyboardTopY!
            const maxQueueY = Math.max(24, keyboardTopY - 26);
            noteY = Math.max(24, maxQueueY - (noteIdx - 1) * 36);
          }

          if (noteY < topY - 10 || noteY > height + 20) return;

          const targetW = Math.max(28, keyLayout.width);
          const targetH = Math.max(26, keyLayout.height);
          const rectW = note.char === ' ' ? Math.max(120, targetW * 0.9) : targetW;
          const rectH = targetH;
          const cornerRadius = 6;
          const isLandingOnKey = noteIdx === 0 && normProgress >= 0.88;

          // Trail behind active falling note
          if (noteIdx === 0 && normProgress < 0.9) {
            const trailLen = 14 * (isHyperspace ? 2.0 : 1.0);
            notesGraphics.roundRect(noteX - rectW / 2 + 2, noteY - rectH / 2 - trailLen, rectW - 4, trailLen, 4);
            notesGraphics.fill({ color: laneColor, alpha: 0.2 });
          }

          // Rectangular Keycap Tile Body
          notesGraphics.roundRect(noteX - rectW / 2, noteY - rectH / 2, rectW, rectH, cornerRadius);
          notesGraphics.fill({
            color: noteIdx === 0 ? '#0f172a' : '#1e293b',
            alpha: noteIdx === 0 ? 0.92 : 0.75,
          });
          notesGraphics.stroke({
            width: noteIdx === 0 ? 2 : 1,
            color: laneColor,
            alpha: noteIdx === 0 ? 1.0 : 0.5,
          });

          // Landing pulse outline (ring outline only, NEVER solid opaque fill)
          if (isLandingOnKey) {
            const pulse = (Math.sin(Date.now() / 100) + 1) / 2;
            notesGraphics.roundRect(noteX - rectW / 2 - 2, noteY - rectH / 2 - 2, rectW + 4, rectH + 4, cornerRadius + 2);
            notesGraphics.stroke({ width: 2, color: laneColor, alpha: 0.5 + pulse * 0.5 });
          }

          // Character text on rectangular tile (Bright white and crystal clear)
          if (noteTextIdx < noteTextPool.length) {
            const txt = noteTextPool[noteTextIdx];
            txt.text = note.displayChar;
            txt.position.set(noteX, noteY);
            txt.scale.set(1.0);
            txt.style.fill = '#ffffff';
            txt.style.fontSize = 13;
            txt.style.fontWeight = '900';
            txt.visible = true;
            noteTextIdx++;
          }
        });

        // Hide unused note text objects
        for (let i = noteTextIdx; i < noteTextPool.length; i++) {
          noteTextPool[i].visible = false;
        }

        // 4. UPDATE PARTICLES & SHOCKWAVES
        particlesRef.current = particlesRef.current.filter((p) => {
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.life += delta;
          p.alpha = Math.max(0, 1 - p.life / p.maxLife);

          if (p.alpha > 0) {
            fxGraphics.circle(p.x, p.y, p.size * p.alpha);
            fxGraphics.fill({ color: p.color, alpha: p.alpha });
            return true;
          }
          return false;
        });

        shockwavesRef.current = shockwavesRef.current.filter((sw) => {
          sw.rx += (sw.maxRx - sw.rx) * 0.2 * delta;
          sw.ry += (sw.maxRy - sw.ry) * 0.2 * delta;
          sw.alpha -= 0.05 * delta;

          if (sw.alpha > 0) {
            fxGraphics.ellipse(sw.x, sw.y, sw.rx, sw.ry);
            fxGraphics.stroke({ width: 2, color: sw.color, alpha: sw.alpha });
            return true;
          }
          return false;
        });

        // 5. UPDATE FLOATING FEEDBACK TEXT
        let fbIdx = 0;
        feedbacksRef.current = feedbacksRef.current.filter((fb) => {
          fb.y += fb.vy * delta;
          fb.life += delta;
          fb.alpha = Math.max(0, 1 - fb.life / fb.maxLife);

          if (fb.alpha > 0 && fbIdx < feedbackTextPool.length) {
            const ft = feedbackTextPool[fbIdx];
            ft.text = fb.text;
            ft.position.set(fb.x, fb.y);
            ft.alpha = fb.alpha;
            ft.style.fill = fb.color;
            ft.visible = true;
            fbIdx++;
            return true;
          }
          return false;
        });

        for (let i = fbIdx; i < feedbackTextPool.length; i++) {
          feedbackTextPool[i].visible = false;
        }
      });
    };

    initPixi();

    const handleResize = () => {
      const stage = stageRef.current;
      if (!stage || !appRef.current) return;
      const rect = stage.getBoundingClientRect();
      const newWidth = Math.max(300, Math.floor(rect.width || stage.clientWidth || 800));
      const newHeight = Math.max(300, Math.floor(rect.height || stage.clientHeight || 420));
      appRef.current.renderer.resize(newWidth, newHeight);
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(stageEl);

    return () => {
      isDestroyed = true;
      resizeObserver.disconnect();
      if (appRef.current) {
        try {
          appRef.current.destroy(false, { children: true });
        } catch {
          // Cleanup exception ignored
        }
        appRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full flex flex-col rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Header bar: Clean product branding without internal nomenclature */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800/90 bg-slate-900/90 z-30 relative">
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Interactive Keyboard Deck</span>
          </div>
          {hyperspaceActive && (
            <span className="flex items-center gap-1 text-[11px] font-mono font-extrabold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-500 animate-pulse">
              <Flame className="w-3.5 h-3.5 text-amber-400 fill-current" />
              WARP x{multiplier}
            </span>
          )}
        </div>

        {/* Home Row Anchor Guidance */}
        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
          <span className="hidden sm:inline text-slate-500">Home Anchors:</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold border border-cyan-500/30">
            [F] Left Bump
          </span>
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-300 font-bold border border-amber-500/30">
            [J] Right Bump
          </span>
        </div>
      </div>

      {/* UNIFIED STAGE: Canvas runs over highway & keyboard so notes fall LITERALLY ONTO the keys */}
      <div
        ref={stageRef}
        className="relative w-full h-[410px] sm:h-[450px] bg-slate-950 overflow-hidden flex flex-col justify-between"
      >
        {/* Full-stage PixiJS Canvas Layer */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-10 block" />

        {/* Top Drop Stage Label */}
        <div className="relative z-0 pt-2 px-6 flex justify-between items-center opacity-40 text-[9px] font-mono text-slate-500 pointer-events-none">
          <span>FALLING TARGET STREAM</span>
          <span>KEYBOARD RECEPTOR MATRIX</span>
        </div>

        {/* BOTTOM: Physical Visual Keyboard Grid (The Strike Zone!) */}
        <div className="relative z-0 pb-3 sm:pb-4 px-2 sm:px-4 overflow-x-auto select-none">
          <div className="flex flex-col gap-1 sm:gap-1.5 min-w-[620px] max-w-4xl mx-auto relative">
            {KEYBOARD_GRID.map((row, rowIdx) => (
              <div key={rowIdx} className="flex justify-center gap-1 sm:gap-1.5">
                {row.map((k) => {
                  const laneMatch = FINGER_LANES[k.lane];
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
                      ref={(el) => {
                        keyRefs.current[k.key.toLowerCase()] = el;
                      }}
                      className={`relative flex items-center justify-center h-8 sm:h-9 rounded-md text-[11px] sm:text-xs font-mono transition-all duration-100 select-none ${
                        k.width || 'w-7 sm:w-9'
                      } ${
                        isTargetKey
                          ? 'bg-slate-900 border-2 font-black z-20 scale-105 ring-2 ring-offset-1 ring-offset-slate-950'
                          : isTargetShift
                          ? 'bg-amber-950/70 border-2 border-amber-400 text-amber-200 font-bold z-10 scale-105 ring-2 ring-amber-400/50 ring-offset-1 ring-offset-slate-950'
                          : isRecentlyPressed
                          ? 'bg-slate-800 border border-cyan-400 text-white'
                          : 'bg-slate-950/90 border border-slate-800/90 text-slate-300 hover:border-slate-700'
                      }`}
                      style={{
                        borderColor: isTargetKey ? laneColor : undefined,
                        boxShadow: isTargetKey ? `0 0 12px ${laneColor}40` : undefined,
                      }}
                    >
                      {/* Finger lane accent stripe at bottom of key */}
                      <span
                        className={`absolute bottom-0 inset-x-1 rounded-full transition-all ${
                          isTargetKey ? 'h-1 opacity-100' : 'h-[2px] opacity-40'
                        }`}
                        style={{ backgroundColor: laneColor }}
                      />

                      {/* Tactile bump marker for F & J */}
                      {k.isBump && (
                        <span
                          className={`absolute bottom-1.5 w-2.5 h-0.5 rounded-full ${
                            isTargetKey ? 'bg-cyan-300' : 'bg-slate-400'
                          }`}
                        />
                      )}

                      {/* Key Character: High contrast, bold, crystal clear white */}
                      <span
                        className={`truncate font-mono ${
                          isTargetKey
                            ? 'text-white font-black text-sm sm:text-base drop-shadow-[0_1px_2px_rgba(0,0,0,1)]'
                            : isTargetShift
                            ? 'text-amber-200 font-bold text-xs'
                            : 'text-slate-300 font-semibold text-xs'
                        }`}
                      >
                        {k.display}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
