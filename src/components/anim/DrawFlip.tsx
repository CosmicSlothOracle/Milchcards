import React, { useEffect, useRef } from 'react';

type Rect = { x: number; y: number; width: number; height: number };

export type DrawFlipProps = {
  cardNode?: HTMLElement | null; // optional DOM node to clone for visual fidelity
  fromRect: Rect;
  toRect: Rect;
  maxDurationMs?: number;
  onFinish?: () => void;
  reducedMotion?: boolean;
};

const DEFAULT_DURATION = 500;

function createSnapshotImage(node: HTMLElement): HTMLImageElement | null {
  try {
    // Lightweight fallback: use clone + inline styles. For heavy DOM, caller may provide an image.
    const clone = node.cloneNode(true) as HTMLElement;
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);
    const rect = clone.getBoundingClientRect();
    // Not doing full html2canvas here to avoid dependency; return null to fallback to simple box.
    document.body.removeChild(wrapper);
    return null;
  } catch (e) {
    return null;
  }
}

export const DrawFlip: React.FC<DrawFlipProps> = ({ cardNode, fromRect, toRect, maxDurationMs = DEFAULT_DURATION, onFinish, reducedMotion }) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const animationId = useRef<number | null>(null);

  useEffect(() => {
    const layer = document.getElementById('ui-anim-layer') || createAnimLayer();
    const root = document.createElement('div');
    root.className = 'drawflip-root';
    root.style.position = 'absolute';
    root.style.left = '0';
    root.style.top = '0';
    root.style.pointerEvents = 'none';
    layer.appendChild(root);
    rootRef.current = root;

    // Create visual card surface
    const surface = document.createElement('div');
    surface.className = 'drawflip-surface';
    surface.style.position = 'absolute';
    surface.style.willChange = 'transform, opacity';
    surface.style.backfaceVisibility = 'hidden';
    surface.style.boxShadow = '0 6px 18px rgba(0,0,0,0.35)';
    surface.style.borderRadius = '6px';
    surface.style.overflow = 'hidden';
    // Use a lightweight style fallback
    surface.style.background = '#fff';
    surface.style.border = '1px solid rgba(0,0,0,0.08)';

    // If a node is provided, try to use a shallow clone for fidelity
    if (cardNode) {
      try {
        const clone = cardNode.cloneNode(true) as HTMLElement;
        // Remove ids to avoid duplicates
        clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        clone.style.pointerEvents = 'none';
        clone.style.width = '100%';
        clone.style.height = '100%';
        surface.appendChild(clone);
      } catch (e) {
        // ignore clone errors
      }
    }

    const trail = document.createElement('div');
    trail.className = 'drawflip-trail';
    trail.style.position = 'absolute';
    trail.style.filter = 'blur(12px)';
    trail.style.background = 'rgba(0,0,0,0.18)';
    trail.style.borderRadius = '8px';
    trail.style.opacity = '0.5';
    trail.style.pointerEvents = 'none';
    trail.style.willChange = 'transform, opacity';

    root.appendChild(trail);
    root.appendChild(surface);

    // Set initial geometry
    const fromCenterX = fromRect.x + fromRect.width / 2;
    const fromCenterY = fromRect.y + fromRect.height / 2;
    const toCenterX = toRect.x + toRect.width / 2;
    const toCenterY = toRect.y + toRect.height / 2;

    const initialWidth = fromRect.width;
    const initialHeight = fromRect.height;
    surface.style.width = `${initialWidth}px`;
    surface.style.height = `${initialHeight}px`;
    surface.style.transformOrigin = 'center center';
    surface.style.left = `${fromCenterX - initialWidth / 2}px`;
    surface.style.top = `${fromCenterY - initialHeight / 2}px`;

    trail.style.width = `${initialWidth * 0.9}px`;
    trail.style.height = `${initialHeight * 0.5}px`;
    trail.style.left = `${fromCenterX - (initialWidth * 0.9) / 2}px`;
    trail.style.top = `${fromCenterY - (initialHeight * 0.5) / 2}px`;

    const duration = Math.min(maxDurationMs, DEFAULT_DURATION);
    const effectiveDuration = reducedMotion ? Math.min(duration, 200) : duration;

    // Use CSS transitions for simplicity
    requestAnimationFrame(() => {
      surface.style.transition = `transform ${effectiveDuration}ms cubic-bezier(.22,.9,.29,1), opacity ${effectiveDuration}ms ease`;
      trail.style.transition = `transform ${effectiveDuration}ms cubic-bezier(.22,.9,.29,1), opacity ${Math.round(effectiveDuration * 0.6)}ms linear`;

      const scaleX = toRect.width / fromRect.width;
      const scaleY = toRect.height / fromRect.height;
      const translateX = toCenterX - fromCenterX;
      const translateY = toCenterY - fromCenterY;

      surface.style.transform = `translate(${translateX}px, ${translateY}px) rotateY(180deg) scale(${scaleX}, ${scaleY})`;
      trail.style.transform = `translate(${translateX * 0.7}px, ${translateY * 0.7}px) scale(${Math.max(0.5, scaleX)})`;
      trail.style.opacity = '0';
    });

    // Cleanup after animation
    const tidy = () => {
      if (animationId.current != null) {
        window.clearTimeout(animationId.current);
        animationId.current = null;
      }
      try { layer.removeChild(root); } catch (e) {}
      if (onFinish) onFinish();
    };

    animationId.current = window.setTimeout(() => {
      tidy();
    }, effectiveDuration + 50);

    return () => {
      if (animationId.current != null) clearTimeout(animationId.current);
      try { if (root && root.parentNode) root.parentNode.removeChild(root); } catch (e) {}
    };
  }, [cardNode, fromRect.x, fromRect.y, fromRect.width, fromRect.height, toRect.x, toRect.y, toRect.width, toRect.height, maxDurationMs, onFinish, reducedMotion]);

  return null;
};

function createAnimLayer() {
  const layer = document.createElement('div');
  layer.id = 'ui-anim-layer';
  layer.style.position = 'fixed';
  layer.style.left = '0';
  layer.style.top = '0';
  layer.style.width = '100%';
  layer.style.height = '100%';
  layer.style.pointerEvents = 'none';
  layer.style.zIndex = '9999';
  document.body.appendChild(layer);
  return layer;
}

export default DrawFlip;


