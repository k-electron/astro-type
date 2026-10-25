import React, { useEffect, useRef } from 'react';

interface GlobalCosmicBackgroundProps {
  hyperspaceActive: boolean;
  multiplier: number;
}

interface CosmicStar {
  x: number;
  y: number;
  speed: number;
  size: number;
  alpha: number;
  baseAlpha: number;
  twinkleSpeed: number;
  color: string;
}

export const GlobalCosmicBackground: React.FC<GlobalCosmicBackgroundProps> = ({
  hyperspaceActive,
  multiplier,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const starsRef = useRef<CosmicStar[]>([]);
  const stateRef = useRef({ hyperspaceActive, multiplier });

  // Update live speed state without resetting star positions or re-triggering canvas mount
  useEffect(() => {
    stateRef.current = { hyperspaceActive, multiplier };
  }, [hyperspaceActive, multiplier]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    let animId: number;

    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    // Initialize 180 multi-spectral stars across the entire screen once
    const starColors = ['#ffffff', '#bae6fd', '#38bdf8', '#c4b5fd', '#fef08a'];
    const starCount = 180;
    starsRef.current = [];

    for (let i = 0; i < starCount; i++) {
      const baseAlpha = 0.25 + Math.random() * 0.65;
      starsRef.current.push({
        x: Math.random(),
        y: Math.random(), // full 0.0 to 1.0 vertical distribution across entire window
        speed: 0.0006 + Math.random() * 0.0025,
        size: 0.8 + Math.random() * 2.2,
        alpha: baseAlpha,
        baseAlpha,
        twinkleSpeed: 0.02 + Math.random() * 0.04,
        color: starColors[Math.floor(Math.random() * starColors.length)],
      });
    }

    let frame = 0;
    let currentSpeed = 1.0;

    const render = () => {
      if (!isRunning) return;
      animId = requestAnimationFrame(render);
      frame++;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const targetHyperspace = stateRef.current.hyperspaceActive;
      const targetMultiplier = stateRef.current.multiplier;

      const targetWarpSpeed = targetHyperspace
        ? 6.0
        : targetMultiplier > 1
          ? 1.0 + (targetMultiplier - 1) * 0.5
          : 1.0;

      // Smooth acceleration / deceleration
      currentSpeed += (targetWarpSpeed - currentSpeed) * 0.08;

      const isWarping =
        targetHyperspace || targetMultiplier >= 3 || currentSpeed > 2.0;

      // Draw all stars across the whole viewport
      starsRef.current.forEach((star) => {
        // Move downwards continuously
        star.y += star.speed * currentSpeed;
        if (star.y > 1.0) {
          star.y = 0;
          star.x = Math.random();
        }

        // Twinkle effect when not in hyperspace
        if (!isWarping) {
          star.alpha =
            star.baseAlpha + Math.sin(frame * star.twinkleSpeed) * 0.15;
        }

        const sx = star.x * width;
        const sy = star.y * height;

        if (isWarping) {
          // Hyperwarp light streak
          const streakLength = star.speed * height * 45 * currentSpeed;
          ctx.strokeStyle = star.color;
          ctx.lineWidth = Math.max(1, star.size * 0.85);
          ctx.globalAlpha = Math.min(1.0, star.alpha * 1.2);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx, Math.max(0, sy - streakLength));
          ctx.stroke();
        } else {
          // Crisp point star
          ctx.fillStyle = star.color;
          ctx.globalAlpha = Math.max(0.1, Math.min(1.0, star.alpha));
          ctx.fillRect(sx, sy, star.size, star.size);
        }
      });

      ctx.globalAlpha = 1.0;
    };

    render();

    return () => {
      isRunning = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', updateSize);
    };
  }, []); // Run setup once; live state tracked via stateRef

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 block bg-transparent"
    />
  );
};
