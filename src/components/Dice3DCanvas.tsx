import React, { useRef, useEffect, useCallback } from 'react';

type Dice3DCanvasProps = {
  size?: number; // canvas size in px
  rollDuration?: number; // ms
  onRoll?: (face: number) => void;
  className?: string;
};

export default function Dice3DCanvas({ size = 160, rollDuration = 1200, onRoll, className }: Dice3DCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({
    angle: 0,
    tilt: 0,
    rolling: false,
    targetFace: 1,
    startTime: 0,
    animationFrame: 0,
  });

  const drawFace = useCallback((ctx: CanvasRenderingContext2D, face: number, s: number) => {
    // draw square face background
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.strokeRect(-s / 2, -s / 2, s, s);

    // draw pips for faces 1..6
    const drawPip = (x: number, y: number) => {
      ctx.beginPath();
      ctx.fillStyle = '#111';
      ctx.arc(x, y, Math.max(2, s * 0.04), 0, Math.PI * 2);
      ctx.fill();
    };

    const gap = s * 0.22;
    const pipPositions: Record<number, Array<[number, number]>> = {
      1: [[0, 0]],
      2: [[-gap, -gap], [gap, gap]],
      3: [[-gap, -gap], [0, 0], [gap, gap]],
      4: [[-gap, -gap], [gap, -gap], [-gap, gap], [gap, gap]],
      5: [[-gap, -gap], [gap, -gap], [0, 0], [-gap, gap], [gap, gap]],
      6: [[-gap, -gap], [gap, -gap], [-gap, 0], [gap, 0], [-gap, gap], [gap, gap]],
    };

    const positions = pipPositions[face] || pipPositions[1];
    for (const [x, y] of positions) drawPip(x, y);
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { angle, tilt, rolling, targetFace } = stateRef.current;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);

    // simple pseudo-3D: scale and tilt
    const scale = 1 + Math.sin(angle) * 0.06 + (rolling ? 0.06 : 0);
    ctx.scale(scale, scale);
    ctx.rotate(tilt);

    // decide which face to draw: when rolling show randomized flicker
    let faceToShow = targetFace;
    if (rolling) {
      // flicker random faces for visual roll
      faceToShow = 1 + Math.floor(Math.random() * 6);
    }

    // draw the front face
    drawFace(ctx as CanvasRenderingContext2D, faceToShow, Math.min(w, h) * 0.6);

    ctx.restore();
  }, [drawFace]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = size * ratio;
    canvas.height = size * ratio;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(ratio, ratio);

    let raf = 0;

    function step(ts: number) {
      const s = stateRef.current;
      // simple physics for rotation
      if (s.rolling) {
        const elapsed = ts - s.startTime;
        const t = Math.min(1, elapsed / rollDuration);
        // ease out
        const ease = 1 - Math.pow(1 - t, 3);
        s.angle += 0.6 + ease * 1.8;
        s.tilt += 0.05 * (1 - ease);

        if (t >= 1) {
          s.rolling = false;
          // finalize with deterministic face
          const final = Math.max(1, Math.min(6, Math.round(s.targetFace)));
          s.targetFace = final;
          try { onRoll && onRoll(final); } catch (e) {}
        }
      } else {
        // idle subtle motion
        s.angle *= 0.98;
        s.tilt *= 0.98;
      }

      render();
      raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);

    return () => cancelAnimationFrame(raf);
  }, [render, size, rollDuration, onRoll]);

  // roll handler: sets target face randomly and starts animation
  const roll = useCallback(() => {
    const s = stateRef.current;
    if (s.rolling) return;
    s.rolling = true;
    s.startTime = performance.now();
    // random target face 1..6
    s.targetFace = 1 + Math.floor(Math.random() * 6);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener('click', roll);
    return () => canvas.removeEventListener('click', roll);
  }, [roll]);

  return <canvas ref={canvasRef} className={className} style={{ cursor: 'pointer' }} />;
}


