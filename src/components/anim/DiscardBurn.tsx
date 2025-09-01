import React, { useEffect, useRef } from 'react';

type Rect = { x: number; y: number; width: number; height: number };

export type DiscardBurnProps = {
  cardTexture?: HTMLImageElement | string | null; // image or URL
  startRect: Rect;
  endRect?: Rect; // where the card "lands" in discard pile
  maxDurationMs?: number;
  particleCount?: number;
  onFinish?: () => void;
  reducedMotion?: boolean;
};

const DEFAULT_DURATION = 600;

function createCanvasLayer() {
  const layer = document.getElementById('ui-anim-layer') || (function() {
    const l = document.createElement('div');
    l.id = 'ui-anim-layer';
    l.style.position = 'fixed';
    l.style.left = '0';
    l.style.top = '0';
    l.style.width = '100%';
    l.style.height = '100%';
    l.style.pointerEvents = 'none';
    l.style.zIndex = '9999';
    document.body.appendChild(l);
    return l;
  })();
  return layer;
}

function makeParticle(x: number, y: number, vx: number, vy: number, life: number) {
  return { x, y, vx, vy, life, age: 0, size: Math.random() * 3 + 1, alpha: 1 };
}

export const DiscardBurn: React.FC<DiscardBurnProps> = ({ cardTexture, startRect, endRect, maxDurationMs = DEFAULT_DURATION, particleCount = 30, onFinish, reducedMotion }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const layer = createCanvasLayer();
    const canvas = document.createElement('canvas');
    canvasRef.current = canvas;
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.pointerEvents = 'none';
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    layer.appendChild(canvas);

    const ctx = canvas.getContext('2d')!;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const particles: Array<any> = [];
    const startX = startRect.x + startRect.width / 2;
    const startY = startRect.y + startRect.height / 2;

    const effectiveCount = reducedMotion ? Math.max(6, Math.floor(particleCount / 4)) : particleCount;

    for (let i = 0; i < effectiveCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 0.5;
      particles.push(makeParticle(startX, startY, Math.cos(angle) * speed, Math.sin(angle) * speed - 1, Math.random() * 400 + 300));
    }

    const startTime = performance.now();
    const duration = Math.min(maxDurationMs, DEFAULT_DURATION);
    const effectiveDuration = reducedMotion ? Math.min(duration, 300) : duration;

    function drawCardBase(x: number, y: number, w: number, h: number, t: number) {
      // t in [0,1]
      const progress = Math.min(1, Math.max(0, t));
      const scale = 1 - progress * 0.6;
      ctx.save();
      ctx.translate(x - w / 2, y - h / 2);
      ctx.globalAlpha = Math.max(0, 1 - progress);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w * scale, h * scale);
      ctx.restore();
    }

    function renderFrame(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / effectiveDuration);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // draw dissolving card base
      const x = startX;
      const y = startY;
      drawCardBase(x, y, startRect.width, startRect.height, t);

      // update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.vy += 0.06; // gravity
        p.x += p.vx;
        p.y += p.vy;
        p.age += 16.666;
        p.alpha = 1 - p.age / p.life;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = 'rgba(80,80,80,1)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (particles.length > 0) {
        rafRef.current = requestAnimationFrame(renderFrame);
      } else {
        // finish
        try { if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas); } catch (e) {}
        if (onFinish) onFinish();
      }
    }

    rafRef.current = requestAnimationFrame(renderFrame);

    // safety timeout
    timeoutRef.current = window.setTimeout(() => {
      try { if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas); } catch (e) {}
      if (onFinish) onFinish();
    }, effectiveDuration + 200);

    const onResize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth * devicePixelRatio;
      canvas.height = window.innerHeight * devicePixelRatio;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(devicePixelRatio, devicePixelRatio);
    };
    window.addEventListener('resize', onResize);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current != null) clearTimeout(timeoutRef.current);
      try { if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas); } catch (e) {}
      window.removeEventListener('resize', onResize);
    };
  }, [cardTexture, startRect.x, startRect.y, startRect.width, startRect.height, endRect?.x, endRect?.y, maxDurationMs, particleCount, onFinish, reducedMotion]);

  return null;
};

export default DiscardBurn;


