import React, { useEffect, useRef } from 'react';
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { FallingNote, TrailColorTheme } from '../types/game';
import { FINGER_LANES } from '../data/curriculum';

interface HighwayCanvasProps {
  notes: FallingNote[];
  hyperspaceActive: boolean;
  multiplier: number;
  currentStreak: number;
  activeLaneIndex: number | null;
  targetLaneIndex: number | null;
  timingFeedback: 'PERFECT' | 'GREAT' | 'GOOD' | 'MISS' | null;
  timingFeedbackKey: number;
  trailTheme: TrailColorTheme;
  compactHighway?: boolean;
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

const THEME_ACCENTS: Record<TrailColorTheme, string> = {
  CYAN: '#06b6d4',
  AMBER: '#f59e0b',
  EMERALD: '#10b981',
  VIOLET: '#8b5cf6',
  SUPERNOVA: '#f43f5e',
};

export const HighwayCanvas: React.FC<HighwayCanvasProps> = ({
  notes,
  hyperspaceActive,
  multiplier,
  currentStreak,
  activeLaneIndex,
  targetLaneIndex,
  timingFeedback,
  timingFeedbackKey,
  trailTheme,
  compactHighway = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const appRef = useRef<Application | null>(null);

  // Store game state in refs so the Pixi ticker always accesses fresh state at 60+ FPS
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
  ]);

  // Particle & FX systems
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const starsRef = useRef<Star[]>([]);
  const feedbacksRef = useRef<FeedbackPopup[]>([]);
  const laneFlashesRef = useRef<number[]>(new Array(9).fill(0));
  const lastFeedbackKeyRef = useRef<number>(timingFeedbackKey);
  const fretScrollRef = useRef<number>(0);
  const reticleAngleRef = useRef<number>(0);

  // Spawn visual feedback & particles when hits occur
  useEffect(() => {
    if (timingFeedbackKey !== lastFeedbackKeyRef.current) {
      lastFeedbackKeyRef.current = timingFeedbackKey;

      if (activeLaneIndex !== null && activeLaneIndex >= 0 && activeLaneIndex < 9) {
        laneFlashesRef.current[activeLaneIndex] = 1.0;
      }

      if (timingFeedback && activeLaneIndex !== null && appRef.current) {
        const app = appRef.current;
        const width = app.screen.width;
        const height = app.screen.height;
        const strikeY = height * 0.82;

        const bottomWidth = width * 0.90;
        const bottomStartX = (width - bottomWidth) / 2;
        const bottomLaneWidth = bottomWidth / 9;
        const hitX = bottomStartX + (activeLaneIndex + 0.5) * bottomLaneWidth;
        const laneColor = FINGER_LANES[activeLaneIndex]?.color || '#06b6d4';

        if (timingFeedback !== 'MISS') {
          // 1. Shockwave ring
          shockwavesRef.current.push({
            x: hitX,
            y: strikeY,
            rx: bottomLaneWidth * 0.35,
            ry: 8,
            maxRx: bottomLaneWidth * 1.5,
            maxRy: 24,
            color: timingFeedback === 'PERFECT' ? '#fbbf24' : laneColor,
            alpha: 1.0,
          });

          // 2. High-speed Sparkle particles
          const count = timingFeedback === 'PERFECT' ? 32 : timingFeedback === 'GREAT' ? 22 : 14;
          for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (Math.random() * 5 + 2) * (timingFeedback === 'PERFECT' ? 1.3 : 1.0);
            particlesRef.current.push({
              x: hitX,
              y: strikeY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 1.8,
              color: timingFeedback === 'PERFECT' && Math.random() > 0.4 ? '#fef08a' : laneColor,
              size: Math.random() * 3.5 + 1.5,
              alpha: 1.0,
              life: 0,
              maxLife: Math.random() * 20 + 20,
            });
          }
        }

        // 3. Floating Judgement Popup
        let text = 'GOOD';
        let color = '#fbbf24';
        if (timingFeedback === 'PERFECT') {
          text = 'PERFECT!';
          color = '#38bdf8';
        } else if (timingFeedback === 'GREAT') {
          text = 'GREAT!';
          color = '#34d399';
        } else if (timingFeedback === 'MISS') {
          text = 'MISS';
          color = '#f87171';
        }

        feedbacksRef.current.push({
          text,
          color,
          x: width / 2,
          y: strikeY - 32,
          vy: -1.4,
          scale: 1.35,
          alpha: 1.0,
          life: 0,
          maxLife: 38,
        });
      }
    }
  }, [timingFeedbackKey, activeLaneIndex, timingFeedback]);

  // Main PixiJS Application Setup
  useEffect(() => {
    let isMounted = true;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Seed stars
    const stars: Star[] = [];
    for (let i = 0; i < 140; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        z: Math.random() * 0.8 + 0.2,
        speed: Math.random() * 0.0016 + 0.0006,
        size: Math.random() * 1.8 + 0.6,
      });
    }
    starsRef.current = stars;

    const app = new Application();
    appRef.current = app;

    const initPixi = async () => {
      const rect = container.getBoundingClientRect();
      const initialWidth = Math.max(300, Math.floor(rect.width || container.clientWidth || 800));
      const initialHeight = Math.max(200, Math.floor(rect.height || container.clientHeight || 280));

      await app.init({
        canvas,
        width: initialWidth,
        height: initialHeight,
        resizeTo: container,
        backgroundColor: 0x030712,
        backgroundAlpha: 1,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
      });

      if (!isMounted) {
        app.destroy(true, { children: true });
        return;
      }

      // Layer Containers
      const bgLayer = new Container();
      const highwayLayer = new Container();
      const strikeLayer = new Container();
      const notesLayer = new Container();
      const fxLayer = new Container();
      const hudLayer = new Container();

      app.stage.addChild(bgLayer);
      app.stage.addChild(highwayLayer);
      app.stage.addChild(strikeLayer);
      app.stage.addChild(notesLayer);
      app.stage.addChild(fxLayer);
      app.stage.addChild(hudLayer);

      // Graphics elements
      const bgGraphics = new Graphics();
      bgLayer.addChild(bgGraphics);

      const highwayGraphics = new Graphics();
      highwayLayer.addChild(highwayGraphics);

      const strikeGraphics = new Graphics();
      strikeLayer.addChild(strikeGraphics);

      const notesGraphics = new Graphics();
      notesLayer.addChild(notesGraphics);

      const fxGraphics = new Graphics();
      fxLayer.addChild(fxGraphics);

      // Reusable text sprite pool for notes (up to 12 notes visible)
      const noteTexts: Text[] = [];
      const noteBadges: Text[] = [];
      for (let i = 0; i < 12; i++) {
        const t = new Text({
          text: '',
          style: new TextStyle({
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 14,
            fontWeight: 'bold',
            fill: '#ffffff',
            align: 'center',
          }),
        });
        t.anchor.set(0.5);
        t.visible = false;
        notesLayer.addChild(t);
        noteTexts.push(t);

        const badge = new Text({
          text: 'PRESS NOW',
          style: new TextStyle({
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 9,
            fontWeight: 'bold',
            fill: '#ffffff',
            dropShadow: {
              color: '#000000',
              alpha: 0.8,
              blur: 4,
              distance: 1,
            },
          }),
        });
        badge.anchor.set(0.5);
        badge.visible = false;
        notesLayer.addChild(badge);
        noteBadges.push(badge);
      }

      // Reusable lane finger labels at bottom of highway (9 lanes)
      const laneLabels: Text[] = [];
      for (let i = 0; i < 9; i++) {
        const lane = FINGER_LANES[i];
        const lbl = new Text({
          text: lane.label,
          style: new TextStyle({
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: 10,
            fontWeight: 'bold',
            fill: '#94a3b8',
            align: 'center',
          }),
        });
        lbl.anchor.set(0.5);
        hudLayer.addChild(lbl);
        laneLabels.push(lbl);
      }

      // Strike Line Indicators
      const strikeLeftTag = new Text({
        text: 'STRIKE ZONE ▶',
        style: new TextStyle({
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
          fontWeight: 'bold',
          fill: '#38bdf8',
          dropShadow: { color: '#0284c7', alpha: 0.8, blur: 4, distance: 0 },
        }),
      });
      strikeLeftTag.anchor.set(1, 0.5);
      hudLayer.addChild(strikeLeftTag);

      const strikeRightTag = new Text({
        text: '◀ HIT NOW',
        style: new TextStyle({
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 10,
          fontWeight: 'bold',
          fill: '#38bdf8',
          dropShadow: { color: '#0284c7', alpha: 0.8, blur: 4, distance: 0 },
        }),
      });
      strikeRightTag.anchor.set(0, 0.5);
      hudLayer.addChild(strikeRightTag);

      // Feedback popup text objects pool
      const feedbackTexts: Text[] = [];
      for (let i = 0; i < 4; i++) {
        const ft = new Text({
          text: '',
          style: new TextStyle({
            fontFamily: '"Outfit", sans-serif',
            fontSize: 22,
            fontWeight: 'bold',
            fill: '#38bdf8',
            dropShadow: {
              color: '#000000',
              alpha: 0.9,
              blur: 8,
              distance: 2,
            },
          }),
        });
        ft.anchor.set(0.5);
        ft.visible = false;
        hudLayer.addChild(ft);
        feedbackTexts.push(ft);
      }

      // 60+ FPS Hardware-Accelerated PixiJS Render Loop
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
        } = stateRef.current;

        const themeColor = THEME_ACCENTS[curTheme] || '#06b6d4';
        const warpSpeed = isHyperspace ? 4.5 : currentMultiplier > 1 ? 1.0 + (currentMultiplier - 1) * 0.35 : 1.0;

        // Animate scroll & targeting HUD rotation
        fretScrollRef.current = (fretScrollRef.current + 0.012 * warpSpeed * delta) % 1;
        reticleAngleRef.current += 0.05 * delta;

        // 1. CLEAR GRAPHICS
        bgGraphics.clear();
        highwayGraphics.clear();
        strikeGraphics.clear();
        notesGraphics.clear();
        fxGraphics.clear();

        // 2. BACKGROUND COSMIC STARFIELD & NEBULA
        // Cosmic Deep Space
        bgGraphics.rect(0, 0, width, height);
        bgGraphics.fill({ color: '#030712', alpha: 1 });

        // Cosmic Nebula Glow
        const nebulaColor = isHyperspace ? '#ec4899' : themeColor;
        bgGraphics.ellipse(width / 2, height * 0.42, width * 0.45, height * 0.32);
        bgGraphics.fill({ color: nebulaColor, alpha: isHyperspace ? 0.14 : 0.06 });

        // Starfield rendering with warp velocity stretch
        starsRef.current.forEach((star) => {
          star.y += star.speed * warpSpeed * delta;
          if (star.y > 1) {
            star.y = 0;
            star.x = Math.random();
          }

          const sx = star.x * width;
          const sy = star.y * height;
          const starAlpha = star.z * (isHyperspace ? 0.95 : 0.65);

          if (isHyperspace || currentMultiplier >= 4) {
            // Relativistic warp streak lines
            const tailLen = star.speed * 900 * warpSpeed;
            bgGraphics.moveTo(sx, sy);
            bgGraphics.lineTo(sx, sy - tailLen);
            bgGraphics.stroke({ width: star.size * 1.3, color: '#bae6fd', alpha: starAlpha });
          } else {
            bgGraphics.rect(sx, sy, star.size, star.size);
            bgGraphics.fill({ color: '#ffffff', alpha: starAlpha });
          }
        });

        // 3. PERSPECTIVE HIGHWAY GEOMETRY
        const topY = height * 0.05;
        const strikeY = height * 0.82;
        const bottomY = height * 0.98;

        const topWidth = width * 0.44;
        const topStartX = (width - topWidth) / 2;
        const topLaneWidth = topWidth / 9;

        const bottomWidth = width * 0.90;
        const bottomStartX = (width - bottomWidth) / 2;
        const bottomLaneWidth = bottomWidth / 9;

        // Highway Bed Surface
        highwayGraphics.moveTo(topStartX, topY);
        highwayGraphics.lineTo(topStartX + topWidth, topY);
        highwayGraphics.lineTo(bottomStartX + bottomWidth, bottomY);
        highwayGraphics.lineTo(bottomStartX, bottomY);
        highwayGraphics.closePath();
        highwayGraphics.fill({ color: '#080e1a', alpha: 0.94 });

        // Target Lane Laser Guidance Beam
        if (curTargetLane !== null && curTargetLane >= 0 && curTargetLane < 9) {
          const tTopX1 = topStartX + curTargetLane * topLaneWidth;
          const tTopX2 = topStartX + (curTargetLane + 1) * topLaneWidth;
          const tBotX1 = bottomStartX + curTargetLane * bottomLaneWidth;
          const tBotX2 = bottomStartX + (curTargetLane + 1) * bottomLaneWidth;
          const laneColor = FINGER_LANES[curTargetLane]?.color || '#06b6d4';

          highwayGraphics.moveTo(tTopX1, topY);
          highwayGraphics.lineTo(tTopX2, topY);
          highwayGraphics.lineTo(tBotX2, bottomY);
          highwayGraphics.lineTo(tBotX1, bottomY);
          highwayGraphics.closePath();
          highwayGraphics.fill({ color: laneColor, alpha: 0.12 });

          // Glowing laser guide borders
          highwayGraphics.moveTo(tTopX1, topY);
          highwayGraphics.lineTo(tBotX1, bottomY);
          highwayGraphics.stroke({ width: 1.5, color: laneColor, alpha: 0.4 });

          highwayGraphics.moveTo(tTopX2, topY);
          highwayGraphics.lineTo(tBotX2, bottomY);
          highwayGraphics.stroke({ width: 1.5, color: laneColor, alpha: 0.4 });
        }

        // Active Lane Flash Surges
        for (let i = 0; i < 9; i++) {
          const flash = laneFlashesRef.current[i];
          if (flash > 0) {
            const fTopX1 = topStartX + i * topLaneWidth;
            const fTopX2 = topStartX + (i + 1) * topLaneWidth;
            const fBotX1 = bottomStartX + i * bottomLaneWidth;
            const fBotX2 = bottomStartX + (i + 1) * bottomLaneWidth;
            const laneColor = FINGER_LANES[i]?.color || '#06b6d4';

            highwayGraphics.moveTo(fTopX1, topY);
            highwayGraphics.lineTo(fTopX2, topY);
            highwayGraphics.lineTo(fBotX2, bottomY);
            highwayGraphics.lineTo(fBotX1, bottomY);
            highwayGraphics.closePath();
            highwayGraphics.fill({ color: laneColor, alpha: flash * 0.45 });

            laneFlashesRef.current[i] = Math.max(0, flash - 0.07 * delta);
          }
        }

        // Highway Lane Dividers
        for (let i = 0; i <= 9; i++) {
          const lxTop = topStartX + i * topLaneWidth;
          const lxBottom = bottomStartX + i * bottomLaneWidth;

          highwayGraphics.moveTo(lxTop, topY);
          highwayGraphics.lineTo(lxBottom, bottomY);
          highwayGraphics.stroke({ width: 1, color: '#334155', alpha: 0.35 });
        }

        // Animated Perspective Frets (Beat Grid Lines)
        for (let f = 0; f < 8; f++) {
          const fretProgress = (f + fretScrollRef.current) / 8;
          const t = Math.pow(fretProgress, 2.1);
          const fy = topY + (bottomY - topY) * t;
          const fx1 = topStartX + (bottomStartX - topStartX) * t;
          const fx2 = (topStartX + topWidth) + ((bottomStartX + bottomWidth) - (topStartX + topWidth)) * t;

          highwayGraphics.moveTo(fx1, fy);
          highwayGraphics.lineTo(fx2, fy);
          highwayGraphics.stroke({
            width: 1 + t * 1.5,
            color: isHyperspace ? '#fbbf24' : '#64748b',
            alpha: 0.15 + t * 0.25,
          });
        }

        // Outer Neon Rails with Multi-Layer Glow
        const railColor = isHyperspace ? '#fbbf24' : themeColor;
        // Wide outer halo
        highwayGraphics.moveTo(topStartX, topY);
        highwayGraphics.lineTo(bottomStartX, bottomY);
        highwayGraphics.stroke({ width: 7, color: railColor, alpha: 0.25 });

        highwayGraphics.moveTo(topStartX + topWidth, topY);
        highwayGraphics.lineTo(bottomStartX + bottomWidth, bottomY);
        highwayGraphics.stroke({ width: 7, color: railColor, alpha: 0.25 });

        // Crisp inner core rail
        highwayGraphics.moveTo(topStartX, topY);
        highwayGraphics.lineTo(bottomStartX, bottomY);
        highwayGraphics.stroke({ width: 2.5, color: '#ffffff', alpha: 0.95 });

        highwayGraphics.moveTo(topStartX + topWidth, topY);
        highwayGraphics.lineTo(bottomStartX + bottomWidth, bottomY);
        highwayGraphics.stroke({ width: 2.5, color: '#ffffff', alpha: 0.95 });

        // 4. STRIKE LINE & RECEPTOR PADS
        const strikeProgress = (strikeY - topY) / (bottomY - topY);
        const strikeX1 = topStartX + (bottomStartX - topStartX) * strikeProgress;
        const strikeX2 = (topStartX + topWidth) + ((bottomStartX + bottomWidth) - (topStartX + topWidth)) * strikeProgress;
        const strikeLaneWidth = (strikeX2 - strikeX1) / 9;

        // Strike laser bar glow
        const strikeColor = isHyperspace ? '#fbbf24' : '#38bdf8';
        strikeGraphics.moveTo(strikeX1, strikeY);
        strikeGraphics.lineTo(strikeX2, strikeY);
        strikeGraphics.stroke({ width: 6, color: strikeColor, alpha: 0.35 });

        strikeGraphics.moveTo(strikeX1, strikeY);
        strikeGraphics.lineTo(strikeX2, strikeY);
        strikeGraphics.stroke({ width: 2.5, color: '#ffffff', alpha: 0.95 });

        // Update Strike tags position & style
        strikeLeftTag.position.set(strikeX1 - 10, strikeY);
        strikeLeftTag.style.fill = strikeColor;
        strikeRightTag.position.set(strikeX2 + 10, strikeY);
        strikeRightTag.style.fill = strikeColor;

        // 9 Holographic Receptor Pads
        for (let i = 0; i < 9; i++) {
          const rx = strikeX1 + (i + 0.5) * strikeLaneWidth;
          const laneInfo = FINGER_LANES[i];
          const isLaneActive = curActiveLane === i;
          const isTarget = curTargetLane === i;
          const padRadiusX = strikeLaneWidth * 0.38;
          const padRadiusY = 7.5;

          // Target outer glowing halo
          if (isTarget) {
            const pulse = (Math.sin(Date.now() / 150) + 1) / 2;
            strikeGraphics.ellipse(rx, strikeY, padRadiusX * (1.2 + pulse * 0.25), padRadiusY * (1.2 + pulse * 0.25));
            strikeGraphics.stroke({ width: 2, color: laneInfo.color, alpha: 0.7 + pulse * 0.3 });
          }

          // Pad base ellipse
          strikeGraphics.ellipse(rx, strikeY, padRadiusX, padRadiusY);
          strikeGraphics.fill({
            color: isLaneActive ? laneInfo.color : isTarget ? laneInfo.color : '#0f172a',
            alpha: isLaneActive ? 0.9 : isTarget ? 0.38 : 0.8,
          });
          strikeGraphics.stroke({
            width: isTarget || isLaneActive ? 2.5 : 1.5,
            color: isTarget ? '#ffffff' : laneInfo.color,
            alpha: isTarget ? 1.0 : 0.8,
          });

          // Home-row homing marker dots for Index fingers (F and J lanes: indices 3 and 5)
          if (i === 3 || i === 5) {
            strikeGraphics.circle(rx, strikeY, 2);
            strikeGraphics.fill({ color: '#ffffff', alpha: 0.85 });
          }
        }

        // 5. DRAW FALLING NOTES (High-Performance Arcade Pucks)
        let noteTextIdx = 0;
        currentNotes.forEach((note) => {
          if (note.status === 'PROCESSED') return;

          const normProgress = note.yPercent / 84;
          const curY = topY + (strikeY - topY) * normProgress;
          if (curY < topY - 20 || curY > bottomY + 20) return;

          const roadProgress = (curY - topY) / (bottomY - topY);
          const curLeftX = topStartX + (bottomStartX - topStartX) * roadProgress;
          const curRightX = (topStartX + topWidth) + ((bottomStartX + bottomWidth) - (topStartX + topWidth)) * roadProgress;
          const curLaneWidth = (curRightX - curLeftX) / 9;
          const noteX = curLeftX + (note.lane + 0.5) * curLaneWidth;

          const tScale = Math.max(0.2, Math.min(1.2, roadProgress));
          const noteRadiusX = curLaneWidth * (0.28 + tScale * 0.12);
          const noteRadiusY = 5 + tScale * 4.0;

          const laneInfo = FINGER_LANES[note.lane] || FINGER_LANES[4];
          const isMissed = note.status === 'MISS';
          const isTargetLocked = Boolean(note.isTargetLocked || (note.yPercent >= 83.5 && !isMissed));

          // Target Locked HUD Crosshairs & Animated Reticle
          if (isTargetLocked) {
            const pulse = (Math.sin(Date.now() / 140) + 1) / 2;

            // Pulsing target halo
            notesGraphics.ellipse(noteX, curY, noteRadiusX * (1.35 + pulse * 0.35), noteRadiusY * (1.35 + pulse * 0.35));
            notesGraphics.stroke({ width: 2, color: '#ffffff', alpha: 0.5 + pulse * 0.5 });

            // Rotating 4-corner brackets
            const angle = reticleAngleRef.current;
            const dist = noteRadiusX * 1.45;
            for (let b = 0; b < 4; b++) {
              const bAngle = angle + (b * Math.PI) / 2;
              const bx = noteX + Math.cos(bAngle) * dist;
              const by = curY + Math.sin(bAngle) * (dist * 0.65);
              notesGraphics.circle(bx, by, 2.5);
              notesGraphics.fill({ color: '#38bdf8', alpha: 0.9 });
            }

            // Laser target crosshair ticks
            notesGraphics.moveTo(noteX - noteRadiusX * 1.6, curY);
            notesGraphics.lineTo(noteX - noteRadiusX * 1.15, curY);
            notesGraphics.stroke({ width: 2.5, color: '#ffffff', alpha: 1.0 });

            notesGraphics.moveTo(noteX + noteRadiusX * 1.15, curY);
            notesGraphics.lineTo(noteX + noteRadiusX * 1.6, curY);
            notesGraphics.stroke({ width: 2.5, color: '#ffffff', alpha: 1.0 });
          }

          // Outer Glow
          notesGraphics.ellipse(noteX, curY, noteRadiusX + 3, noteRadiusY + 3);
          notesGraphics.stroke({
            width: 3,
            color: isMissed ? '#ef4444' : laneInfo.color,
            alpha: 0.35 + tScale * 0.35,
          });

          // Note Puck Body
          notesGraphics.ellipse(noteX, curY, noteRadiusX, noteRadiusY);
          notesGraphics.fill({
            color: isMissed ? '#ef4444' : isTargetLocked ? '#ffffff' : laneInfo.color,
            alpha: isMissed ? 0.75 : 1.0,
          });
          notesGraphics.stroke({
            width: isTargetLocked ? 3 : 1.5,
            color: isTargetLocked ? laneInfo.color : '#ffffff',
            alpha: 1.0,
          });

          // Note Character Text from pool
          if (noteTextIdx < noteTexts.length && tScale > 0.22) {
            const t = noteTexts[noteTextIdx];
            t.text = note.displayChar;
            t.position.set(noteX, curY);
            const fontSize = Math.max(11, Math.round(12 + tScale * 6));
            t.style.fontSize = fontSize;
            t.style.fill = isTargetLocked ? '#030712' : '#030712';
            t.visible = true;

            // PRESS NOW badge for target locked note
            const badge = noteBadges[noteTextIdx];
            if (isTargetLocked) {
              badge.position.set(noteX, curY - noteRadiusY - 10);
              badge.visible = true;
            } else {
              badge.visible = false;
            }

            noteTextIdx++;
          }
        });

        // Hide unused note texts
        for (let i = noteTextIdx; i < noteTexts.length; i++) {
          noteTexts[i].visible = false;
          noteBadges[i].visible = false;
        }

        // 6. UPDATE & DRAW SHOCKWAVES
        for (let sIdx = shockwavesRef.current.length - 1; sIdx >= 0; sIdx--) {
          const sw = shockwavesRef.current[sIdx];
          sw.rx += (sw.maxRx - sw.rx) * 0.18 * delta;
          sw.ry += (sw.maxRy - sw.ry) * 0.18 * delta;
          sw.alpha -= 0.045 * delta;

          fxGraphics.ellipse(sw.x, sw.y, sw.rx, sw.ry);
          fxGraphics.stroke({ width: 2.5, color: sw.color, alpha: Math.max(0, sw.alpha) });

          if (sw.alpha <= 0) {
            shockwavesRef.current.splice(sIdx, 1);
          }
        }

        // 7. UPDATE & DRAW PARTICLES
        for (let pIdx = particlesRef.current.length - 1; pIdx >= 0; pIdx--) {
          const p = particlesRef.current[pIdx];
          p.x += p.vx * delta;
          p.y += p.vy * delta;
          p.vy += 0.12 * delta; // gravity
          p.life += delta;
          p.alpha = Math.max(0, 1 - p.life / p.maxLife);

          fxGraphics.circle(p.x, p.y, p.size);
          fxGraphics.fill({ color: p.color, alpha: p.alpha });

          if (p.life >= p.maxLife) {
            particlesRef.current.splice(pIdx, 1);
          }
        }

        // 8. UPDATE FLOATING FEEDBACK POPUPS
        let fbIdx = 0;
        for (let fIdx = feedbacksRef.current.length - 1; fIdx >= 0; fIdx--) {
          const fb = feedbacksRef.current[fIdx];
          fb.y += fb.vy * delta;
          fb.scale = Math.max(1.0, fb.scale - 0.02 * delta);
          fb.life += delta;
          fb.alpha = Math.max(0, 1 - fb.life / fb.maxLife);

          if (fbIdx < feedbackTexts.length) {
            const ft = feedbackTexts[fbIdx];
            ft.text = fb.text;
            ft.style.fill = fb.color;
            ft.position.set(fb.x, fb.y);
            ft.scale.set(fb.scale);
            ft.alpha = fb.alpha;
            ft.visible = true;
            fbIdx++;
          }

          if (fb.life >= fb.maxLife) {
            feedbacksRef.current.splice(fIdx, 1);
          }
        }
        for (let i = fbIdx; i < feedbackTexts.length; i++) {
          feedbackTexts[i].visible = false;
        }

        // 9. UPDATE LANE FINGER LABELS AT BOTTOM
        const labelY = height * 0.94;
        for (let i = 0; i < 9; i++) {
          const lx = bottomStartX + (i + 0.5) * bottomLaneWidth;
          const lane = FINGER_LANES[i];
          const isTarget = curTargetLane === i;
          const isActive = curActiveLane === i;
          const lbl = laneLabels[i];

          lbl.position.set(lx, labelY);
          if (isTarget) {
            lbl.style.fill = lane.color;
            lbl.style.fontSize = 11;
            lbl.style.fontWeight = 'bold';
            lbl.alpha = 1.0;
          } else {
            lbl.style.fill = isActive ? '#ffffff' : '#64748b';
            lbl.style.fontSize = 10;
            lbl.style.fontWeight = '500';
            lbl.alpha = isActive ? 1.0 : 0.7;
          }
        }
      });
    };

    initPixi();

    // Clean Resize Handling with ResizeObserver
    const handleResize = () => {
      const app = appRef.current;
      const cont = containerRef.current;
      if (!app || !app.renderer || !cont) return;

      const rect = cont.getBoundingClientRect();
      const newWidth = Math.max(300, Math.floor(rect.width || cont.clientWidth || 800));
      const newHeight = Math.max(200, Math.floor(rect.height || cont.clientHeight || 280));

      app.renderer.resize(newWidth, newHeight);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, [compactHighway]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-xl border border-slate-800/80 bg-slate-950 shadow-2xl shrink-0 ${
        compactHighway ? 'h-56 sm:h-64' : 'h-64 sm:h-72'
      }`}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-default select-none pointer-events-none"
      />
      {/* Subtle top neon flare accent */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent pointer-events-none" />
    </div>
  );
};
