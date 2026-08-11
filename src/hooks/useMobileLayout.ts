import { useCallback, useEffect, useState } from 'react';

export type MobileLayout = {
  /** Short edge under 768px (typical phone / small tablet). */
  isMobile: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  /** Primary touch device (no fine hover). */
  isTouch: boolean;
  width: number;
  height: number;
};

function readLayout(): MobileLayout {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const shortSide = Math.min(width, height);
  return {
    isMobile: shortSide < 768,
    isPortrait: height > width,
    isLandscape: width >= height,
    isTouch: window.matchMedia('(hover: none) and (pointer: coarse)').matches,
    width,
    height,
  };
}

/** Tracks viewport + orientation for mobile-first game layout. */
export function useMobileLayout(): MobileLayout {
  const [layout, setLayout] = useState<MobileLayout>(() => readLayout());

  const refresh = useCallback(() => {
    setLayout(readLayout());
  }, []);

  useEffect(() => {
    window.addEventListener('resize', refresh);
    window.addEventListener('orientationchange', refresh);
    const mq = window.matchMedia('(hover: none) and (pointer: coarse)');
    mq.addEventListener?.('change', refresh);
    return () => {
      window.removeEventListener('resize', refresh);
      window.removeEventListener('orientationchange', refresh);
      mq.removeEventListener?.('change', refresh);
    };
  }, [refresh]);

  return layout;
}

/** Vertical space reserved for the compact fixed HUD bars on mobile (px). */
export const MOBILE_HUD_TOP = 48;
/** Bottom bar must fit Anführer portrait (72) + caption + Zug-beenden + padding. */
export const MOBILE_HUD_BOTTOM = 148;
