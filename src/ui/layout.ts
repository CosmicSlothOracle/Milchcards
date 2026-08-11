// src/ui/layout.ts
import baseLayout from './ui_layout_1920x1080.json';
import mobileLayout from './ui_layout_mobile_landscape.json';

export const UI_BASE = { width: 1920, height: 1080 } as const;

type Dir = 'horizontal' | 'vertical';
type Align = 'left' | 'center' | 'right';

type FixedSlots = {
  type: 'fixedSlots';
  slots: number;
  slotSize: [number, number];
  gap: number;
  alignment: Align;
  direction: Dir;
};

type SingleSlot = {
  type: 'singleSlot';
  slotSize: [number, number];
};

type ZoneLayout = FixedSlots | SingleSlot;

export type UiZone = {
  id: string;
  rectPx: [number, number, number, number];
  layout?: ZoneLayout;
  z?: number;
};

export type UiLayout = {
  version: number;
  canvas: { width: number; height: number; aspect: string };
  scaling: { mode: 'fit' | 'fill' | 'stretch'; letterbox: boolean };
  zones: UiZone[];
  background?: { enabled: boolean; src?: string };
};

// Background image disabled: the painted slot artwork no longer matches the
// symmetric v5 layout. Slots are styled via CSS instead (see App.css).
export const LAYOUT: UiLayout = {
  ...(baseLayout as UiLayout),
  background: { enabled: false }
};

const MOBILE_LAYOUT: UiLayout = {
  ...(mobileLayout as UiLayout),
  background: { enabled: false }
};

/** When true, getZone() reads from the mobile-landscape layout (horizontal hand strips). */
let mobileBoardLayoutActive = false;

export function setMobileBoardLayout(active: boolean): void {
  mobileBoardLayoutActive = active;
}

export function isMobileBoardLayout(): boolean {
  return mobileBoardLayoutActive;
}

function activeLayout(): UiLayout {
  return mobileBoardLayoutActive ? MOBILE_LAYOUT : LAYOUT;
}

// ---------- helpers ----------

export function getZone(id: string): UiZone {
  const z = activeLayout().zones.find(z => z.id === id);
  if (!z) throw new Error(`UI zone not found: ${ id }`);
  return z;
}

export function getUiTransform(
  canvasW: number,
  canvasH: number,
  opts?: { sideGutter?: number }
) {
  const sideGutter = Math.max(0, opts?.sideGutter ?? 0);
  const usableW = Math.max(320, canvasW - sideGutter * 2);
  const sx = usableW / UI_BASE.width;
  const sy = canvasH / UI_BASE.height;
  // Allow upscaling on large displays (was capped at 1, which left the board
  // floating tiny in empty space). 1.6 keeps 256px card art acceptably sharp.
  const scale = Math.min(sx, sy, 1.6);
  const offsetX = Math.floor((canvasW - UI_BASE.width * scale) / 2);
  const offsetY = Math.floor((canvasH - UI_BASE.height * scale) / 2);
  return { scale, offsetX, offsetY };
}

type Rect = { x: number; y: number; w: number; h: number };

export function computeSlotRects(zone: UiZone): Rect[] {
  const [x, y, w, h] = zone.rectPx;
  if (!zone.layout) return [{ x, y, w, h }];
  if (zone.layout.type === 'singleSlot') {
    const [sw, sh] = zone.layout.slotSize;
    return [{ x: x + Math.floor((w - sw) / 2), y: y + Math.floor((h - sh) / 2), w: sw, h: sh }];
  }
  // fixedSlots
  const { slots, slotSize, gap, direction, alignment } = zone.layout;
  const [sw, sh] = slotSize;
  const rects: Rect[] = [];
  if (direction === 'horizontal') {
    const totalW = sw * slots + gap * (slots - 1);
    let startX = x;
    if (alignment === 'center') startX = x + Math.floor((w - totalW) / 2);
    if (alignment === 'right') startX = x + (w - totalW);
    for (let i = 0; i < slots; i++) {
      rects.push({ x: startX + i * (sw + gap), y, w: sw, h: sh });
    }
  } else {
    const totalH = sh * slots + gap * (slots - 1);
    let startY = y;
    if (alignment === 'center') startY = y + Math.floor((h - totalH) / 2);
    if (alignment === 'right') startY = y + (h - totalH); // 'right' used as bottom for vertical
    for (let i = 0; i < slots; i++) {
      rects.push({ x, y: startY + i * (sh + gap), w: sw, h: sh });
    }
  }
  return rects;
}

// Hands
export function computeHandRects(side: 'player' | 'opponent'): Rect[] {
  const id = side === 'player' ? 'hand.player' : 'hand.opponent';
  return computeSlotRects(getZone(id));
}

// Rows
export function getGovernmentRects(side: 'player' | 'opponent'): Rect[] {
  const id = side === 'player' ? 'row.government.player' : 'row.government.opponent';
  return computeSlotRects(getZone(id));
}

export function getPublicRects(side: 'player' | 'opponent'): Rect[] {
  const id = side === 'player' ? 'row.public.player' : 'row.public.opponent';
  return computeSlotRects(getZone(id));
}

// Instant initiative single slot
export function getSofortRect(side: 'player' | 'opponent'): Rect {
  const id = side === 'player' ? 'slot.instant.player' : 'slot.instant.opponent';
  return computeSlotRects(getZone(id))[0];
}

// Interventions single slot (kept for draw code)
export function getInterventionsRect(side: 'player' | 'opponent'): Rect {
  const id = side === 'player' ? 'interventions.player' : 'interventions.opponent';
  return computeSlotRects(getZone(id))[0];
}

// capacities used by canvas/utils
export function getLaneCapacity(lane: 'public' | 'government'): number {
  return lane === 'government' ? 5 : 3;
}
