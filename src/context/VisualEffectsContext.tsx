import React, { createContext, useContext, useRef, ReactNode, useMemo, useState } from 'react';
import { getUiTransform, UI_BASE } from '../ui/layout';

type Particle = { start: number; life: number; x: number; y: number; vx: number; vy: number; size?: number; color?: string; gravity?: number };
type Pop = { uid: number | string; started: number; duration: number };
type Ripple = { cx: number; cy: number; started: number; duration: number; radius: number; showAp?: boolean; apX?: number; apY?: number; _apSpawned?: boolean };
type ApLabel = { x: number; y: number; started: number; duration: number; text: string; color?: string; size?: number; scale?: number };
type VisualEffect = { id: string; x: number; y: number; started: number; duration: number; type: 'ap_gain' | 'influence_buff' | 'card_play'; amount?: number; text?: string; color?: string; size?: number };

interface VisualEffectsContextType {
  particlesRef: React.MutableRefObject<Particle[]>;
  popsRef: React.MutableRefObject<Pop[]>;
  ripplesRef: React.MutableRefObject<Ripple[]>;
  apLabelsRef: React.MutableRefObject<ApLabel[]>;
  visualEffectsRef: React.MutableRefObject<VisualEffect[]>;
  reducedMotion: boolean;
  spawnParticles: (cx: number, cy: number, count?: number) => void;
  spawnPop: (uid: number | string) => void;
  spawnRipple: (cx: number, cy: number, opts?: { radius?: number; showAp?: boolean; apX?: number; apY?: number }) => void;
  spawnVisualEffect: (opts: { type: 'ap_gain' | 'influence_buff' | 'card_play'; x: number; y: number; amount?: number; text?: string; color?: string; size?: number; duration?: number }) => void;
  // New: gif overlays and per-card play animations
  gifOverlaysRef: React.MutableRefObject<Array<{ id: string | number; cx: number; cy: number; w: number; h: number; src: string; started: number; duration: number }>>;
  playAnimsRef: React.MutableRefObject<Array<{ uid: string | number; started: number; duration: number }>>;
  spawnGifOverlay: (opts: { id?: string | number; cx: number; cy: number; w: number; h: number; src: string; duration?: number }) => void;
  // spawn overlay by UI canvas coordinates (untransformed). The context will convert
  // to screen coords using the active canvas bounding rect and ui transform. This
  // ensures overlays align exactly with canvas-drawn elements.
  spawnGifOverlayUi: (opts: { id?: string | number; cx: number; cy: number; w?: number; h?: number; src: string; duration?: number }) => void;
}

const VisualEffectsContext = createContext<VisualEffectsContextType | undefined>(undefined);

export function VisualEffectsProvider({ children }: { children: ReactNode }) {
  const particlesRef = useRef<Particle[]>([]);
  const popsRef = useRef<Pop[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const apLabelsRef = useRef<ApLabel[]>([]);
  const visualEffectsRef = useRef<VisualEffect[]>([]);
  const gifOverlaysRef = useRef<Array<{ id: string | number; cx: number; cy: number; w: number; h: number; src: string; started: number; duration: number }>>([]);
  const spawnedGifIdsRef = useRef<Set<string|number>>(new Set());
  const playAnimsRef = useRef<Array<{ uid: string | number; started: number; duration: number }>>([]);

  const reducedMotion = (typeof window !== 'undefined' && (window as any).matchMedia && (window as any).matchMedia('(prefers-reduced-motion: reduce)').matches) || !!(window as any).__pc_reduced_motion;

  const spawnParticles = (cx: number, cy: number, count = 12) => {
    if (reducedMotion) return;
    const now = performance.now();
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({ start: now, life: 600 + Math.random() * 500, x: cx + (Math.random() - 0.5) * 48, y: cy + (Math.random() - 0.5) * 48, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 6, size: 3 + Math.random() * 6, color: ['#ffd166', '#ff6b6b', '#4ade80'][Math.floor(Math.random() * 3)], gravity: 0.12 });
    }
  };

  const spawnPop = (uid: number | string) => {
    popsRef.current.push({ uid, started: performance.now(), duration: 420 });
  };

  const spawnRipple = (cx: number, cy: number, opts?: { radius?: number; showAp?: boolean; apX?: number; apY?: number }) => {
    if (reducedMotion) return;
    ripplesRef.current.push({ cx, cy, started: performance.now(), duration: opts?.radius ? 700 : 700, radius: opts?.radius ?? 480, showAp: !!opts?.showAp, apX: opts?.apX, apY: opts?.apY });
    if (opts?.showAp) {
      apLabelsRef.current.push({ x: opts.apX ?? cx, y: opts.apY ?? cy, started: performance.now(), duration: 900, text: '+1' });
    }
  };

  const spawnVisualEffect = (opts: { type: 'ap_gain' | 'influence_buff' | 'card_play'; x: number; y: number; amount?: number; text?: string; color?: string; size?: number; duration?: number }) => {
    if (reducedMotion) return;
    const id = `visual_${opts.type}_${Date.now()}_${Math.random()}`;
    const effect: VisualEffect = {
      id,
      x: opts.x,
      y: opts.y,
      started: performance.now(),
      duration: opts.duration ?? 1200,
      type: opts.type,
      amount: opts.amount,
      text: opts.text,
      color: opts.color,
      size: opts.size
    };
    visualEffectsRef.current.push(effect);
  };

  const spawnGifOverlay = (opts: { id?: string | number; cx: number; cy: number; w: number; h: number; src: string; duration?: number }) => {
    return; // overlay disabled
  };

  const spawnGifOverlayUi = (opts: { id?: string | number; cx: number; cy: number; w?: number; h?: number; src: string; duration?: number }) => {
    // no-op, only push playAnimsRef for sprite fade-in
    try { playAnimsRef.current.push({ uid: opts.id ?? performance.now(), started: performance.now(), duration: 420 }); } catch (e) {}
  };

  const value = useMemo(() => ({ particlesRef, popsRef, ripplesRef, apLabelsRef, visualEffectsRef, reducedMotion, spawnParticles, spawnPop, spawnRipple, spawnVisualEffect, gifOverlaysRef, playAnimsRef, spawnGifOverlay, spawnGifOverlayUi }), []);
  // Expose value for non-hook callsites (fallback)
  React.useEffect(() => {
    try {
      (window as any).__pc_visual_effects = value;
      // also expose non-underscored alias for easier console testing
      try { (window as any).pc_visual_effects = value; } catch (e) {}
    } catch (e) {}
    return () => { try { (window as any).__pc_visual_effects = undefined; } catch (e) {} };
  }, [value]);

  return <VisualEffectsContext.Provider value={value}>
    {children}
    {/* GIF overlays disabled */}
  </VisualEffectsContext.Provider>;
}

export function useVisualEffects() {
  const ctx = useContext(VisualEffectsContext);
  if (!ctx) throw new Error('useVisualEffects must be used within VisualEffectsProvider');
  return ctx;
}

// Safe variant that returns null when no provider is present. Use this when a caller
// cannot guarantee being rendered inside the provider (avoids rules-of-hooks errors
// when attempting to call hooks conditionally).
export function useVisualEffectsSafe() {
  return useContext(VisualEffectsContext) || null;
}

export default VisualEffectsContext;


