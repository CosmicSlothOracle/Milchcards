import React, { useRef, useEffect, useCallback } from 'react';
import { useVisualEffects, useVisualEffectsSafe } from '../context/VisualEffectsContext';
import { GameState, Card, PoliticianCard, Player, Lane } from '../types/game';
import { LAYOUT, getZone, computeSlotRects, getUiTransform, getLaneCapacity, getPublicRects, getGovernmentRects, getSofortRect } from '../ui/layout';
import { drawCardImage, sortHandCards } from '../utils/gameUtils';
import { getNetApCost } from '../utils/ap';
import { getCardImagePath } from '../data/gameData';
import influenceIconUrl from '../assets/icons/influence.svg';
import publicSymbolUrl from '../assets/icons/public_symbol.png';
import sofortSymbolUrl from '../assets/icons/sofort_initiative_symbol.png';
import dauerhaftSymbolUrl from '../assets/icons/dauerhaft_initative.png';
import governmentSymbolUrl from '../assets/icons/government_symbol.png';
import interventionSymbolUrl from '../assets/icons/intervention_symbol.png';
import govPlaceGifUrl from '../assets/effect_gif/place_card_gov_256x256.gif';
import govPlaceSpritesheetUrl from '../ui/sprites/playcard_gov_256x256_14.png';
import instantSpritesheetUrl from '../ui/sprites/activate_trap_hit_target_256x256_16x2.png';
import hitSpritesheetUrl from '../ui/sprites/activate_inititive_hit_target_256x256_16_2rows.png';

interface GameCanvasProps {
  gameState: GameState;
  selectedHandIndex: number | null;
  onCardClick: (data: any) => void;
  onCardHover: (data: any) => void;
  devMode?: boolean; // 🔧 DEV MODE: Show P2 hand when true
}

// Helper: is corruption target selection active
function isCorruptionSelection(state: GameState, player: Player) {
  const sel: any = (state as any).pendingAbilitySelect;
  return sel && sel.type === 'corruption_steal' && sel.actorPlayer === player;
}

// Helper: is maulwurf corruption active
function isMaulwurfCorruption(state: GameState, player: Player) {
  const sel: any = (state as any).pendingAbilitySelect;
  return sel && sel.type === 'maulwurf_steal' && sel.actorPlayer === player;
}

// Helper: is tunnelvision probe active
function isTunnelvisionProbe(state: GameState, player: Player) {
  const sel: any = (state as any).pendingAbilitySelect;
  return sel && sel.type === 'tunnelvision_probe' && sel.actorPlayer === player;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  selectedHandIndex,
  onCardClick,
  onCardHover,
  devMode = false,
}) => {
  // listen for dice roll requests from resolver and trigger Dice3D
  useEffect(() => {
    const handler = (ev: any) => {
      try {
        const player = ev.detail?.player;
        // find Dice3D canvas on page and trigger click (it rolls on click)
        const dice = document.querySelector('canvas') as HTMLCanvasElement | null;
        // better: dispatch global event so App-level Dice3D component can roll programmatically
        window.dispatchEvent(new CustomEvent('pc:ui_request_dice_roll', { detail: { player } }));
      } catch (e) {}
    };
    window.addEventListener('pc:request_dice_roll', handler as EventListener);
    return () => window.removeEventListener('pc:request_dice_roll', handler as EventListener);
  }, []);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visualEffects = useVisualEffectsSafe();
  const clickZonesRef = useRef<Array<{ x: number; y: number; w: number; h: number; data: any }>>([]);
  // Smooth vertical scroll for P1 hand when it has more than visible slots
  const handScrollTargetRef = useRef<number>(0);
  const handScrollCurrentRef = useRef<number>(0);
  const handScrollEnabledRef = useRef<boolean>(true);
  // Touch handling refs
  const touchStartYRef = useRef<number | null>(null);
  const lastTouchYRef = useRef<number | null>(null);
  const isTouchingRef = useRef<boolean>(false);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const influenceImgRef = useRef<HTMLImageElement | null>(null);
  // Animation state for visual influence changes: Map<uid, Array<Anim>>
  const influenceAnimRef = useRef<Map<string, Array<{ start: number; duration: number; amount: number; type: 'increase' | 'decrease' }>>>(new Map());
  // Previous per-card influence snapshot to detect increases
  const prevInfluencesRef = useRef<Record<string, number>>({});
  // Slot symbol images
  const slotSymbolImgsRef = useRef<Map<string, HTMLImageElement>>(new Map());
  // Map of canonical slot positions for animations: key -> {x,y,w,h,cx,cy}
  const slotPositionsRef = useRef<Record<string, { x: number; y: number; w: number; h: number; cx: number; cy: number }>>({});
  // Mapping between animation UIDs and slot keys to ensure one-shot playback
  const uidToKeyRef = useRef<Record<string, string>>({});
  const keyToUidRef = useRef<Record<string, string>>({});
  // Temporary test GIF for government slots
  const govGifRef = useRef<HTMLImageElement | null>(null);
  const govSpritesRef = useRef<HTMLImageElement | null>(null);
  // hit (target) spritesheet (25 frames)
  const hitSpritesRef = useRef<HTMLImageElement | null>(null);
  // sprite animation state keyed by slot-key (player.lane.index)
  const govSpriteStateRef = useRef<Record<string, { started: number; frameCount: number; frameDuration: number }>>({});
  const instantSpritesRef = useRef<HTMLImageElement | null>(null);
  const instantSpriteStateRef = useRef<Record<string, { started: number; frameCount: number; frameDuration: number }>>({});

  const hitSpriteStateRef = useRef<Record<string, { started: number; frameCount: number; frameDuration: number }>>({});

  // Flash animation state for influence changes: Map<uid, FlashAnim>
  const cardFlashRef = useRef<Map<string, { start: number; duration: number; type: 'buff' | 'debuff' }>>(new Map());

  // Helper function to calculate current influence including buffs/debuffs
  const getCurrentInfluence = (card: any): number => {
    if (card.kind !== 'pol') return 0;
    const baseInfluence = card.influence ?? 0;
    const tempBuffs = card.tempBuffs ?? 0;
    const tempDebuffs = card.tempDebuffs ?? 0;
    return baseInfluence + tempBuffs - tempDebuffs;
  };

  // Corruption (Bestechungsskandal) target selection mode
  const corruptionSelectActorRef = useRef<Player | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => {
    const onEnterCorruptionSelect = (ev: any) => {
      try {
        const actor = ev.detail?.player as Player | undefined;
        console.log('🔥 GAMECANVAS RECEIVED pc:corruption_select_target - Actor:', actor);
        corruptionSelectActorRef.current = actor ?? null;
        console.log('🔥 SET corruptionSelectActorRef.current:', corruptionSelectActorRef.current);
      } catch (e) {
        console.error('🔥 ERROR in corruption select handler:', e);
      }
    };
    window.addEventListener('pc:corruption_select_target', onEnterCorruptionSelect as EventListener);
    // Keyboard hotkeys 1-5 to choose opponent government slot when corruption select is active
    const onKeyDown = (ev: KeyboardEvent) => {
      try {
        const k = ev.key;
        if (!['1','2','3','4','5'].includes(k)) return;
        const actor = corruptionSelectActorRef.current;
        if (!actor) return;
        const victim = actor === 1 ? 2 : 1;
        const idx = Number(k) - 1; // map '1' -> slot 0
        const gs = gameStateRef.current as any;
        const card = gs?.board?.[victim]?.aussen?.[idx];
        console.debug('[CORR][KEY] pressed', k, 'actor', actor, 'victim', victim, 'idx', idx, 'card', card);
        if (!card) return;
        const uid = card.uid ?? card.id;
        if (!uid) return;
        console.debug('[CORR][KEY] dispatching pick_target for uid', uid);
        window.dispatchEvent(new CustomEvent('pc:corruption_pick_target', { detail: { player: actor, targetUid: uid } }));
        try {
          console.debug('[CORR][KEY] dispatching target_selected for uid', uid);
          window.dispatchEvent(new CustomEvent('pc:corruption_target_selected', { detail: { player: actor, targetUid: uid } }));
        } catch(e) { console.debug('[CORR][KEY] target_selected dispatch error', e); }
        ev.preventDefault();
      } catch(e) {}
    };
    window.addEventListener('keydown', onKeyDown as EventListener);
    return () => {
      window.removeEventListener('pc:corruption_select_target', onEnterCorruptionSelect as EventListener);
      window.removeEventListener('keydown', onKeyDown as EventListener);
    };
  }, []);

  // Maulwurf corruption target selection mode
  const maulwurfSelectActorRef = useRef<Player | null>(null);
  useEffect(() => {
    const onEnterMaulwurfSelect = (ev: any) => {
      try {
        const actor = ev.detail?.player as Player | undefined;
        const targetUid = ev.detail?.targetUid as number | undefined;
        const requiredRoll = ev.detail?.requiredRoll as number | undefined;
        const targetName = ev.detail?.targetName as string | undefined;
        console.log('🔥 GAMECANVAS RECEIVED pc:maulwurf_select_target - Actor:', actor, 'Target:', targetName, 'Required:', requiredRoll);
        maulwurfSelectActorRef.current = actor ?? null;

        // Show modal for dice roll
        const el = document.createElement('div');
        el.id = 'pc-maulwurf-modal';
        el.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:10000;';
        el.style.fontSize = '14px';
        document.body.appendChild(el);

        el.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;min-width:260px;">
          <div style="font-weight:700">Maulwurf — Ziel automatisch gewählt</div>
          <div>Gewähltes Ziel: <b>${targetName || 'Unbekannt'}</b></div>
          <div>Probe: W6 ≥ ${requiredRoll || 2} (2 + Anzahl Regierungskarten)</div>
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button id="pc-maulwurf-roll" style="background:#2563eb;color:white;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;">Würfeln</button>
            <button id="pc-maulwurf-cancel" style="background:#374151;color:white;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;">Abbrechen</button>
          </div>
        </div>`;

        // Event listeners for buttons
        const rollBtn = el.querySelector('#pc-maulwurf-roll');
        const cancelBtn = el.querySelector('#pc-maulwurf-cancel');

        if (rollBtn) {
          rollBtn.addEventListener('click', () => {
            try {
              window.dispatchEvent(new CustomEvent('pc:maulwurf_request_roll', {
                detail: { player: actor, targetUid }
              }));
              document.body.removeChild(el);
            } catch (e) {
              console.error('Maulwurf roll button error:', e);
            }
          });
        }

        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => {
            try {
              document.body.removeChild(el);
              // Clear pending selection
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('pc:clear_pending_selection'));
              }
            } catch (e) {
              console.error('Maulwurf cancel button error:', e);
            }
          });
        }
      } catch (e) {
        console.error('🔥 ERROR in maulwurf select handler:', e);
      }
    };

    window.addEventListener('pc:maulwurf_select_target', onEnterMaulwurfSelect as EventListener);

    return () => {
      window.removeEventListener('pc:maulwurf_select_target', onEnterMaulwurfSelect as EventListener);
    };
  }, []);

  // Tunnelvision probe mode
  const tunnelvisionProbeActorRef = useRef<Player | null>(null);
  useEffect(() => {
    const onEnterTunnelvisionProbe = (ev: any) => {
      try {
        const actor = ev.detail?.player as Player | undefined;
        const targetUid = ev.detail?.targetUid as number | undefined;
        const requiredRoll = ev.detail?.requiredRoll as number | undefined;
        const influence = ev.detail?.influence as number | undefined;
        console.log('🔥 GAMECANVAS RECEIVED pc:tunnelvision_probe_start - Actor:', actor, 'Target:', targetUid, 'Required:', requiredRoll, 'Influence:', influence);
        tunnelvisionProbeActorRef.current = actor ?? null;
        console.log('🔥 SET tunnelvisionProbeActorRef.current:', tunnelvisionProbeActorRef.current);

        // Create modal for tunnelvision probe
        const el = document.getElementById('pc-modal-root');
        if (!el) return;

        el.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;min-width:280px;">
          <div style="font-weight:700">Tunnelvision — Regierungskarte Probe</div>
          <div>Einfluss: <b>${influence || 'Unbekannt'}</b></div>
          <div>Probe: W6 ≥ ${requiredRoll || 4} ${(influence || 0) >= 9 ? '(Einfluss 9+)' : '(Standard)'}</div>
          <div style="font-size:12px;color:#666;">Bei Misserfolg: 2-3 Karte bleibt in Hand, 1 kritischer Misserfolg entfernt Karte dauerhaft</div>
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button id="pc-tunnelvision-roll" style="background:#2563eb;color:white;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;">Würfeln</button>
            <button id="pc-tunnelvision-cancel" style="background:#374151;color:white;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;">Abbrechen</button>
          </div>
        </div>`;

        // Add event listeners for buttons
        const rollBtn = document.getElementById('pc-tunnelvision-roll');
        const cancelBtn = document.getElementById('pc-tunnelvision-cancel');

        if (rollBtn) {
          rollBtn.onclick = () => {
            try {
              window.dispatchEvent(new CustomEvent('pc:tunnelvision_request_roll', {
                detail: { player: actor, targetUid, requiredRoll, influence }
              }));
              el.innerHTML = '';
            } catch (e) {
              console.error('Error dispatching tunnelvision request roll:', e);
            }
          };
        }

        if (cancelBtn) {
          cancelBtn.onclick = () => {
            el.innerHTML = '';
            // Cancel the probe - card stays in hand
            try {
              window.dispatchEvent(new CustomEvent('pc:tunnelvision_request_roll', {
                detail: { player: actor, targetUid, requiredRoll, influence, cancel: true }
              }));
            } catch (e) {
              console.error('Error canceling tunnelvision probe:', e);
            }
          };
        }
      } catch (e) {
        console.error('🔥 ERROR in tunnelvision probe handler:', e);
      }
    };

    window.addEventListener('pc:tunnelvision_probe_start', onEnterTunnelvisionProbe as EventListener);

    return () => {
      window.removeEventListener('pc:tunnelvision_probe_start', onEnterTunnelvisionProbe as EventListener);
    };
  }, []);

  // Helper: draw slot icons with uniform pulsing opacity and a light reflection
  const drawSlotIconWithPulse = useCallback((ctx: CanvasRenderingContext2D, img: HTMLImageElement | undefined, x: number, y: number, w: number, h: number, phase = 0) => {
    if (!img || !img.complete) return;
    try {
      const now = performance.now();
      const base = 0.10; // base opacity
      const pulseRange = 0.08; // pulse amplitude (-> up to base + pulseRange)
      const period = 700; // ms
      const pulse = base + pulseRange * (0.5 + 0.5 * Math.sin(now / period + phase));

      // draw icon with pulsing alpha
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.drawImage(img, x, y, w, h);

      // subtle reflection: gradient overlay on top half
      const grad = ctx.createLinearGradient(x, y, x, y + h * 0.5);
      grad.addColorStop(0, `rgba(255,255,255,${0.18 * pulse})`);
      grad.addColorStop(1, `rgba(255,255,255,0)`);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = grad as any;
      ctx.fillRect(x, y, w, h * 0.5);

      ctx.restore();
    } catch (e) {
      // silent fallback
    }
  }, []);

  // Load influence icon once
  useEffect(() => {
    const img = new Image();
    img.src = influenceIconUrl;
    influenceImgRef.current = img;
  }, []);


  const drawCardAt = useCallback((
    ctx: CanvasRenderingContext2D,
    card: Card,
    x: number,
    y: number,
    size: number,
    selected: boolean = false,
    showAPCost: boolean = false,
    player?: Player
  ) => {
    // Apply per-card fade-in if a play animation is active for this uid
    let extraAlpha = 1;
    try {
      const uid = (card as any).uid ?? (card as any).id;
      const list = (visualEffects && visualEffects.playAnimsRef && visualEffects.playAnimsRef.current) || (window as any).__pc_play_anims || [];
      const anim = list.find((a: any) => a.uid === uid);
      if (anim) {
        const p = Math.min(1, Math.max(0, (performance.now() - anim.started) / anim.duration));
        // ease-out
        extraAlpha = Math.pow(p, 2);
      }
    } catch (e) {}
    let dx = x, dy = y, s = size;
    if (selected) {
      s = Math.floor(size * 1.05);
      dx = x - Math.floor((s - size) / 2);
      dy = y - Math.floor((s - size) / 2);
    }

    // Note: pulse overlay is drawn at top layer after all cards are rendered

    // Draw card image with caching to prevent flicker in continuous loop
    const src = getCardImagePath(card, 'ui');
    const cached = imageCacheRef.current.get(src);
    ctx.save();
    ctx.globalAlpha = extraAlpha;
    if (cached && cached.complete && cached.naturalWidth > 0) {
      ctx.drawImage(cached, dx, dy, s, s);
    } else {
      const img = new Image();
      img.onload = () => {
        imageCacheRef.current.set(src, img);
        // Note: onload happens async; draw will occur on next frame
        // don't draw here into stale ctx
      };
      img.src = src;
      imageCacheRef.current.set(src, img);
    }

    ctx.restore();

    // Status-Indikatoren (für alle Board-Karten)
    // Einfluss-Wert dauerhaft anzeigen (oben links) – nur für Regierungskarten
    if ((card as any).kind === 'pol') {
      const barH = Math.max(20, Math.floor(s * 0.12) + 6);
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(dx, dy + s - barH, s, barH);

      // Einfluss-Aufschlüsselung für kleinere Anzeige
      const currentInfluence = getCurrentInfluence(card);
      const baseInfluence = (card as any).baseInfluence ?? (card as any).influence ?? 0;
      const tempBuffs = (card as any).tempBuffs ?? 0;
      const tempDebuffs = (card as any).tempDebuffs ?? 0;
      const isModified = currentInfluence !== baseInfluence;

      const fontSize = Math.floor(s * 0.1); // Etwas kleiner für mehr Platz
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      if (isModified) {
        // Zeige Aufschlüsselung: "10 +1" oder "10 -2"
        const textX = dx + 8;
        const textY = dy + s - barH / 2;

        // Basis-Einfluss (weiß)
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${baseInfluence}`, textX, textY);

        // Modifikationen (grün/rot)
        if (tempBuffs > 0) {
          ctx.fillStyle = '#2ecc71'; // Grün
          const buffText = ` +${tempBuffs}`;
          const baseWidth = ctx.measureText(`${baseInfluence}`).width;
          ctx.fillText(buffText, textX + baseWidth, textY);
        }

        if (tempDebuffs > 0) {
          ctx.fillStyle = '#e74c3c'; // Rot
          const debuffText = ` -${tempDebuffs}`;
          const baseWidth = ctx.measureText(`${baseInfluence}`).width;
          const buffWidth = tempBuffs > 0 ? ctx.measureText(` +${tempBuffs}`).width : 0;
          ctx.fillText(debuffText, textX + baseWidth + buffWidth, textY);
        }
      } else {
        // Keine Modifikationen - zeige nur Basis-Einfluss
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${baseInfluence}`, dx + 8, dy + s - barH / 2);
      }
    }
    // Schutz-Status (blauer Punkt)
    if ((card as any).protected || ((card as any).shield ?? 0) > 0) {
      ctx.fillStyle = '#1da1f2';
      ctx.fillRect(dx + s - 22, dy + 6, 16, 16);
    }
    // Deaktiviert-Status (roter Punkt)
    if ((card as any).deactivated) {
      ctx.fillStyle = '#b63838';
      ctx.fillRect(dx + s - 22, dy + 26, 16, 16);
    }

    // Einfluss-Badge für Handkarten oben rechts (nur Regierungskarten)
    if (showAPCost && player && (card as any).kind === 'pol') {
      const badgeHeight = Math.max(16, Math.floor(s * 0.12));
      const badgeWidth = badgeHeight * 2;
      const badgeX = dx + s - badgeWidth - 6;
      const badgeY = dy + 6;

      // Semi-transparent dunkler Hintergrund
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, badgeHeight / 2);
      ctx.fill();

      // Influence icon (90% opacity) links im Badge
      if (influenceImgRef.current && influenceImgRef.current.complete) {
        ctx.globalAlpha = 0.9;
        ctx.drawImage(influenceImgRef.current, badgeX + 2, badgeY + 2, badgeHeight - 4, badgeHeight - 4);
        ctx.globalAlpha = 1;
      }

      // Einfluss-Aufschlüsselung: Basis + Modifikationen
      const currentInfluence = getCurrentInfluence(card);
      const baseInfluence = (card as any).baseInfluence ?? (card as any).influence ?? 0;
      const tempBuffs = (card as any).tempBuffs ?? 0;
      const tempDebuffs = (card as any).tempDebuffs ?? 0;
      const isModified = currentInfluence !== baseInfluence;

      ctx.font = `bold ${Math.floor(badgeHeight * 0.4)}px sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      if (isModified) {
        // Zeige Aufschlüsselung: "10 +1" oder "10 -2"
        const textX = badgeX + badgeWidth - 4;
        const textY = badgeY + badgeHeight / 2;

        // Basis-Einfluss (weiß)
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${baseInfluence}`, textX, textY);

        // Modifikationen (grün/rot)
        if (tempBuffs > 0) {
          ctx.fillStyle = '#2ecc71'; // Grün
          const buffText = ` +${tempBuffs}`;
          const buffWidth = ctx.measureText(buffText).width;
          ctx.fillText(buffText, textX - ctx.measureText(`${baseInfluence}`).width, textY);
        }

        if (tempDebuffs > 0) {
          ctx.fillStyle = '#e74c3c'; // Rot
          const debuffText = ` -${tempDebuffs}`;
          const baseWidth = ctx.measureText(`${baseInfluence}`).width;
          const buffWidth = tempBuffs > 0 ? ctx.measureText(` +${tempBuffs}`).width : 0;
          ctx.fillText(debuffText, textX - baseWidth - buffWidth, textY);
        }
      } else {
        // Keine Modifikationen - zeige nur Basis-Einfluss
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${baseInfluence}`, badgeX + badgeWidth - 4, badgeY + badgeHeight / 2);
      }

      // Reset align
      ctx.textAlign = 'start';
      ctx.textBaseline = 'alphabetic';
    }

    // NOTE: influence overlays (pulse + labels) are drawn in a separate pass

    // Auswahl-Rahmen
    if (selected) {
      ctx.strokeStyle = '#61dafb';
      ctx.lineWidth = 3;
      ctx.strokeRect(dx + 1, dy + 1, s - 2, s - 2);
      ctx.lineWidth = 1;
    }

    // Return exact 256x256 click zone over the card
    // Since all cards are 256x256, the click zone should match exactly
    return { x: dx, y: dy, w: 256, h: 256 };
  }, [gameState]);







  // Slot-Benennungs-Funktion basierend auf Glossar
  const getSlotDisplayName = useCallback((zoneId: string, index: number, player: Player): string => {
    const slotNumber = index + 1;

    if (zoneId.includes('government')) {
      if (zoneId.includes('player')) {
        return `Regierungsreihe Slot ${slotNumber}`;
      } else {
        return `Gegner Regierung Slot ${slotNumber}`;
      }
    } else if (zoneId.includes('public')) {
      if (zoneId.includes('player')) {
        return `Öffentlichkeitsreihe Slot ${slotNumber}`;
      } else {
        return `Gegner Öffentlichkeit Slot ${slotNumber}`;
      }
    } else if (zoneId.includes('permanent.government')) {
      if (zoneId.includes('player')) {
        return 'Regierung Spezial-Slot';
      } else {
        return 'Gegner Regierung Spezial-Slot';
      }
    } else if (zoneId.includes('permanent.public')) {
      if (zoneId.includes('player')) {
        return 'Öffentlichkeit Spezial-Slot';
      } else {
        return 'Gegner Öffentlichkeit Spezial-Slot';
      }
    } else if (zoneId.includes('instant')) {
      if (zoneId.includes('player')) {
        return 'Sofort-Slot';
      } else {
        return 'Gegner Sofort-Slot';
      }
    } else if (zoneId.includes('hand')) {
      return 'Hand';
    } else if (zoneId.includes('interventions')) {
      return 'Interventionen';
    }

    return `Slot ${slotNumber}`;
  }, []);

  const drawLane = useCallback((
    ctx: CanvasRenderingContext2D,
    zoneId: string,
    player: Player,
    lane: Lane,
    clickable: boolean
  ) => {
    const zone = getZone(zoneId);
    if (!zone) return;

    const slots = computeSlotRects(zone);
    const arr = gameState.board[player][lane];

    slots.forEach((s, idx) => {
      const card = arr[idx];

      // Hintergrundfarbe nach Kategorie
      let bgColor = 'rgba(0,0,0,0.1)'; // Standard
      if (zoneId.includes('government')) {
        bgColor = 'rgba(255, 197, 0, 0.15)'; // Hellgelb für Regierung
      } else if (zoneId.includes('public')) {
        bgColor = 'rgba(0, 255, 0, 0.15)'; // Hellgrün für Öffentlichkeit
      }

      ctx.fillStyle = bgColor;
      ctx.fillRect(s.x, s.y, s.w, s.h);

      // Slot-Rahmen
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);

      if (card) {
        const isSelected = player === 1 && selectedHandIndex !== null && gameState.hands[1][selectedHandIndex] === card;
        const clickZone = drawCardAt(ctx, card, s.x, s.y, s.w, isSelected, false);

        // Kartenname unter dem Slot anzeigen
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        const textY = s.y + s.h + 16;
        ctx.fillText(card.name, s.x + s.w/2, textY);

        clickZonesRef.current.push({
          ...clickZone,
          data: { type: 'board_card', player, lane, index: idx, card }
        });
      } else if (clickable && gameState.current === player) {
        // Slot-Benennung anzeigen (für den aktuellen Spieler)
        const slotName = getSlotDisplayName(zoneId, idx, player);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        const textY = s.y + s.h/2;
        ctx.fillText(slotName, s.x + s.w/2, textY);

        clickZonesRef.current.push({
          x: s.x, y: s.y, w: s.w, h: s.h,
          data: { type: 'row_slot', lane, index: idx }
        });
      }
    });
  }, [gameState, selectedHandIndex, drawCardAt, getSlotDisplayName]);

  const drawHandP1 = useCallback((ctx: CanvasRenderingContext2D) => {
    const hand = sortHandCards(gameState.hands[1]);
    const zone = getZone('hand.player');
    if (!zone) return;

    const slots = computeSlotRects(zone);
    // Apply smooth offset (lerp towards target)
    const target = handScrollTargetRef.current;
    handScrollCurrentRef.current += (target - handScrollCurrentRef.current) * 0.15; // easing
    const offsetY = Math.round(handScrollCurrentRef.current);
    slots.forEach((s: { x: number; y: number; w: number; h: number }, i: number) => {
      const card = hand[i];
      if (!card) return;
      // Find original index in unsorted hand for click handling
      const originalIndex = gameState.hands[1].findIndex(c => c.uid === card.uid);
      const isSel = selectedHandIndex === originalIndex;
      // apply vertical offset
      const sx = s.x;
      const sy = s.y + offsetY;
      const clickZone = drawCardAt(ctx, card, sx, sy, s.w, isSel, true, 1); // Show AP cost for player 1 hand
      clickZonesRef.current.push({ ...clickZone, data: { type: 'hand_p1', index: originalIndex, card } });
    });
  }, [gameState.hands, selectedHandIndex, drawCardAt]);

      // 🔧 DEV MODE: Player 2 Hand (rechts unten, kompakter)
  const drawHandP2 = useCallback((ctx: CanvasRenderingContext2D) => {
    const hand = sortHandCards(gameState.hands[2]);
    const zone = getZone('hand.opponent');
    if (!zone) return;

    const slots = computeSlotRects(zone);

    // Hintergrund für P2 Hand
    const [x, y, w, h] = zone.rectPx;
    ctx.fillStyle = 'rgba(255, 100, 100, 0.15)'; // Rötlicher Hintergrund für P2
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.3)';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    // Label für P2 Hand
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Player 2 Hand', x + w/2, y - 8);

    slots.forEach((s: { x: number; y: number; w: number; h: number }, i: number) => {
      const card = hand[i];
      if (!card) return;
      // Find original index in unsorted hand for click handling
      const originalIndex = gameState.hands[2].findIndex(c => c.uid === card.uid);
      const isSel = gameState.current === 2 && selectedHandIndex === originalIndex;
      const clickZone = drawCardAt(ctx, card, s.x, s.y, s.w, isSel, true, 2); // Show AP cost for player 2 hand
      clickZonesRef.current.push({ ...clickZone, data: { type: 'hand_p2', index: originalIndex, card } });
    });
  }, [gameState, selectedHandIndex, drawCardAt]);
  // Interventions strip (player traps)
  const drawInterventionsP1 = useCallback((ctx: CanvasRenderingContext2D) => {
    const traps = gameState.traps[1] || [];
    const zone = getZone('interventions.player');
    if (!zone) return;

    // Single intervention slot
    const [zx, zy, zw, zh] = zone.rectPx;
    const card = traps[0]; // Only first trap

    // Hintergrund für Interventions-Slot
    ctx.fillStyle = 'rgba(200, 160, 255, 0.15)'; // Lavendelfarben für Interventionen
    ctx.fillRect(zx, zy, zw, zh);
    ctx.strokeStyle = 'rgba(200, 160, 255, 0.3)';
    ctx.strokeRect(zx + 0.5, zy + 0.5, zw - 1, zh - 1);

    // Slot-Benennung für Interventions-Slot
    ctx.fillStyle = 'rgba(200, 160, 255, 0.8)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Intervention', zx + 8, zy + zh - 6);

    if (card) {
      const clickZone = drawCardAt(ctx, card, zx, zy, zw, false, false);
      clickZonesRef.current.push({ ...clickZone, data: { type: 'trap_p1', index: 0, card } });
    }
  }, [gameState.traps, drawCardAt]);

  // Interventions strip (opponent traps)
  const drawInterventionsP2 = useCallback((ctx: CanvasRenderingContext2D) => {
    const traps = gameState.traps[2] || [];
    const zone = getZone('interventions.opponent');
    if (!zone) return;

    // Single intervention slot
    const [zx, zy, zw, zh] = zone.rectPx;
    const card = traps[0]; // Only first trap

    // Hintergrund für Interventions-Slot
    ctx.fillStyle = 'rgba(200, 160, 255, 0.15)'; // Lavendelfarben für Interventionen
    ctx.fillRect(zx, zy, zw, zh);
    ctx.strokeStyle = 'rgba(200, 160, 255, 0.3)';
    ctx.strokeRect(zx + 0.5, zy + 0.5, zw - 1, zh - 1);

    // Slot-Benennung für Interventions-Slot
    ctx.fillStyle = 'rgba(200, 160, 255, 0.8)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Intervention', zx + 8, zy + zh - 6);

    if (card) {
      const clickZone = drawCardAt(ctx, card, zx, zy, zw, false, false);
      clickZonesRef.current.push({ ...clickZone, data: { type: 'trap_p2', index: 0, card } });
    }
  }, [gameState.traps, drawCardAt]);

  // Single slot drawing function
  const drawSingleSlot = useCallback((
    ctx: CanvasRenderingContext2D,
    zoneId: string,
    card: Card | null,
    clickType: string,
    player: Player
  ) => {
    const zone = getZone(zoneId);
    if (!zone) return;
    const [x, y, w, h] = zone.rectPx;

    // Hintergrundfarbe nach Kategorie
    let bgColor = 'rgba(0,0,0,0.1)'; // Standard
    if (zoneId.includes('government')) {
      bgColor = 'rgba(255, 197, 0, 0.15)'; // Hellgelb für Regierung
    } else if (zoneId.includes('public')) {
      bgColor = 'rgba(0, 255, 0, 0.15)'; // Hellgrün für Öffentlichkeit
    } else if (zoneId.includes('instant')) {
      bgColor = 'rgba(127, 116, 91, 0.15)'; // Neutral für Sofort-Slots
    } else if (zoneId.includes('permanent')) {
      // Unterscheide zwischen government und public permanent slots
      if (zoneId.includes('government')) {
        bgColor = 'rgba(255, 197, 0, 0.15)';
      } else if (zoneId.includes('public')) {
        bgColor = 'rgba(0, 255, 0, 0.15)';
      }
    }

    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, w, h);

    // Draw slot border
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

    if (card) {
      const isSelected = player === 1 && selectedHandIndex !== null && gameState.hands[1][selectedHandIndex] === card;
      const clickZone = drawCardAt(ctx, card, x, y, w, isSelected, false);

      // Kartenname unter dem Slot anzeigen
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      const textY = y + h + 16;
      ctx.fillText(card.name, x + w/2, textY);

      // Register click zone for the card - always in dev mode, otherwise only for current player
      if (devMode || player === gameState.current) {
        clickZonesRef.current.push({ ...clickZone, data: { type: 'slot_card', slot: clickType, player, card } });
      }

      // 🔧 NEU: Sofort-Initiative-Slots sind immer klickbar für Aktivierung (handled by activateInstantInitiative)
      if (clickType === 'instant') {
        clickZonesRef.current.push({
          x, y, w, h,
          data: { type: 'activate_instant', player, card }
        });
      }
    } else if (gameState.current === player || devMode) {
      // Slot-Benennung für leere Slots anzeigen (für den aktuellen Spieler oder im Dev Mode)
      const slotName = getSlotDisplayName(zoneId, 0, player);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      const textY = y + h/2;
      ctx.fillText(slotName, x + w/2, textY);

      clickZonesRef.current.push({ x, y, w, h, data: { type: 'empty_slot', slot: clickType, player } });
    }
  }, [selectedHandIndex, gameState, drawCardAt, getSlotDisplayName, devMode]);

  // Small UI hook: show a lightweight corruption modal overlay when a target is selected
  useEffect(() => {
    const onTargetSelected = (ev: any) => {
      const { player, targetUid } = ev.detail || {};
      if (!player || !targetUid) return;
      // create transient overlay element if not present
      try {
        const id = 'pc-corruption-modal';
        let el = document.getElementById(id);
        if (!el) {
          el = document.createElement('div');
          el.id = id;
          el.style.position = 'fixed';
          el.style.left = '50%';
          el.style.top = '40%';
          el.style.transform = 'translate(-50%, -50%)';
          el.style.padding = '12px 16px';
          el.style.background = 'rgba(6,10,15,0.9)';
          el.style.border = '1px solid rgba(255,255,255,0.12)';
          el.style.borderRadius = '8px';
          el.style.zIndex = '3000';
          el.style.color = '#e5e7eb';
          el.style.fontFamily = 'monospace';
          el.style.fontSize = '14px';
          document.body.appendChild(el);
        }
        const card = (gameState as any).board?.[player === 1 ? 1 : 2]?.aussen?.find((c:any)=>c.uid===targetUid) || (gameState as any).board?.[player === 1 ? 2 : 1]?.aussen?.find((c:any)=>c.uid===targetUid);
        el.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;min-width:260px;">
          <div style="font-weight:700">Bestechungsskandal 2.0 — Ziel gewählt</div>
          <div>Gewähltes Ziel: <b>${card ? card.name : 'UID '+targetUid}</b></div>
          <div>Probe: W6 ≥ Einfluss (inkl. Oligarch-Bonus)</div>
          <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button id="pc-corruption-roll" style="background:#2563eb;color:white;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;">Würfeln</button>
            <button id="pc-corruption-cancel" style="background:#374151;color:white;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;">Abbrechen</button>
          </div>
        </div>`;

        const rollBtn = document.getElementById('pc-corruption-roll');
        const cancelBtn = document.getElementById('pc-corruption-cancel');
        if (rollBtn) {
          rollBtn.onclick = () => {
            try {
              console.log('🔥 CORRUPTION WÜRFELN CLICKED - triggering dice roll');
              // Trigger the dice component to roll
              window.dispatchEvent(new CustomEvent('pc:ui_request_dice_roll', { detail: { player, targetUid } }));
              window.dispatchEvent(new CustomEvent('pc:corruption_request_roll', { detail: { player, targetUid } }));
            } catch(e) {
              console.error('🔥 ERROR triggering dice roll:', e);
            }
            // disable until result
            (rollBtn as HTMLButtonElement).disabled = true;
            (rollBtn as HTMLButtonElement).innerText = 'Würfelt...';
          };
        }
        if (cancelBtn) {
          cancelBtn.onclick = () => {
            el!.remove();
          };
        }
      } catch (e) { console.debug('corruption modal create failed', e); }
    };

    window.addEventListener('pc:corruption_target_selected', onTargetSelected as EventListener);
    return () => window.removeEventListener('pc:corruption_target_selected', onTargetSelected as EventListener);
  }, [gameState]);

  // Draw permanent slots for player
  const drawPermanentSlotsP1 = useCallback((ctx: CanvasRenderingContext2D) => {
    drawSingleSlot(ctx, 'slot.permanent.government.player', gameState.permanentSlots[1].government, 'permanent_government', 1);
    drawSingleSlot(ctx, 'slot.permanent.public.player', gameState.permanentSlots[1].public, 'permanent_public', 1);
  }, [gameState.permanentSlots, drawSingleSlot]);

  // Draw permanent slots for opponent
  const drawPermanentSlotsP2 = useCallback((ctx: CanvasRenderingContext2D) => {
    drawSingleSlot(ctx, 'slot.permanent.government.opponent', gameState.permanentSlots[2].government, 'permanent_government', 2);
    drawSingleSlot(ctx, 'slot.permanent.public.opponent', gameState.permanentSlots[2].public, 'permanent_public', 2);
  }, [gameState.permanentSlots, drawSingleSlot]);

  // Draw instant slots
  const drawInstantSlots = useCallback((ctx: CanvasRenderingContext2D) => {
    // Sofort-Initiative-Slots aus dem Board zeichnen
    const sofortPlayerCard = gameState.board[1].sofort[0];
    const sofortOppCard = gameState.board[2].sofort[0];

    drawSingleSlot(ctx, 'slot.instant.player', sofortPlayerCard, 'instant', 1);
    drawSingleSlot(ctx, 'slot.instant.opponent', sofortOppCard, 'instant', 2);
  }, [gameState.board, drawSingleSlot]);

  // Aktive Schlüsselwörter und Unterkategorien ermitteln
  const getActiveKeywordsAndSubcategories = useCallback((player: Player) => {
    const board = gameState.board[player];
    const permanentSlots = gameState.permanentSlots[player];
    const allCards = [
      ...board.innen,
      ...board.aussen,
      permanentSlots.government,
      permanentSlots.public
    ].filter(c => c && c.kind === 'pol') as PoliticianCard[];

    const keywords = new Set<string>();
    const subcategories = new Set<string>();

    allCards.forEach(card => {
      if (!card.deactivated) {
        // Regierungskarten-Schlüsselwörter
        if (card.tag === 'Leadership') {
          keywords.add('Leadership');
        }
        if (card.tag === 'Diplomat') {
          keywords.add('Diplomat');
        }

        // Öffentlichkeits-Unterkategorien (für Karten in Öffentlichkeitsreihe)
        if (board.innen.includes(card)) {
          const publicCard = card as any;
          if (publicCard.tag) {
            // Oligarch
            const oligarchNames = ['Elon Musk', 'Bill Gates', 'George Soros', 'Warren Buffett', 'Mukesh Ambani', 'Jeff Bezos', 'Alisher Usmanov', 'Gautam Adani', 'Jack Ma', 'Zhang Yiming', 'Roman Abramovich'];
            if (oligarchNames.includes(publicCard.name)) {
              subcategories.add('Oligarch');
            }

            // Plattform
            const platformNames = ['Mark Zuckerberg', 'Tim Cook', 'Sam Altman', 'Jack Ma'];
            if (platformNames.includes(publicCard.name)) {
              subcategories.add('Plattform');
            }

            // Bewegung
            const movementNames = ['Greta Thunberg', 'Malala Yousafzai', 'Ai Weiwei', 'Alexei Navalny'];
            if (movementNames.includes(publicCard.name)) {
              subcategories.add('Bewegung');
            }

            // NGO/Think-Tank
            const ngoNames = ['Bill Gates', 'George Soros', 'Jennifer Doudna', 'Noam Chomsky', 'Anthony Fauci'];
            if (ngoNames.includes(publicCard.name)) {
              subcategories.add('NGO/Think-Tank');
            }

            // Intelligenz
            const intelligenceNames = ['Jennifer Doudna', 'Noam Chomsky', 'Edward Snowden', 'Julian Assange', 'Yuval Noah Harari', 'Ai Weiwei', 'Alexei Navalny', 'Anthony Fauci'];
            if (intelligenceNames.includes(publicCard.name)) {
              subcategories.add('Intelligenz');
            }

            // Medien
            const mediaNames = ['Oprah Winfrey'];
            if (mediaNames.includes(publicCard.name)) {
              subcategories.add('Medien');
            }
          }
        }
      }
    });

    return {
      keywords: Array.from(keywords),
      subcategories: Array.from(subcategories)
    };
  }, [gameState]);

  // Info-Panels zeichnen
  const drawInfoPanels = useCallback((ctx: CanvasRenderingContext2D) => {
    const { keywords, subcategories } = getActiveKeywordsAndSubcategories(1);

    // Panel für Regierungsschlüsselwörter (rechts neben Regierungsslots)
    const govPanelX = 1640 + 256 + 20; // Nach dem letzten permanenten Slot
    const govPanelY = 300; // Auf Höhe der Regierungsslots
    const govPanelW = 120;
    const govPanelH = 256;

    // Regierungspanel Hintergrund
    ctx.fillStyle = 'rgba(255, 197, 0, 0.15)';
    ctx.fillRect(govPanelX, govPanelY, govPanelW, govPanelH);
    ctx.strokeStyle = 'rgba(255, 197, 0, 0.3)';
    ctx.strokeRect(govPanelX + 0.5, govPanelY + 0.5, govPanelW - 1, govPanelH - 1);

    // Regierungspanel Titel
    ctx.fillStyle = 'rgba(255, 197, 0, 0.9)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Regierung', govPanelX + govPanelW/2, govPanelY + 16);

    // Schlüsselwörter auflisten
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    if (keywords.length > 0) {
      keywords.forEach((keyword, idx) => {
        ctx.fillText(`• ${keyword}`, govPanelX + 8, govPanelY + 36 + idx * 16);
      });
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText('Keine aktiven', govPanelX + 8, govPanelY + 36);
      ctx.fillText('Schlüsselwörter', govPanelX + 8, govPanelY + 52);
    }

    // Panel für Öffentlichkeits-Unterkategorien (rechts neben Öffentlichkeitsslots)
    const pubPanelX = 1640 + 256 + 20;
    const pubPanelY = 580; // Auf Höhe der Öffentlichkeitsslots
    const pubPanelW = 120;
    const pubPanelH = 256;

    // Öffentlichkeitspanel Hintergrund
    ctx.fillStyle = 'rgba(0, 255, 0, 0.15)';
    ctx.fillRect(pubPanelX, pubPanelY, pubPanelW, pubPanelH);
    ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
    ctx.strokeRect(pubPanelX + 0.5, pubPanelY + 0.5, pubPanelW - 1, pubPanelH - 1);

    // Öffentlichkeitspanel Titel
    ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Öffentlichkeit', pubPanelX + pubPanelW/2, pubPanelY + 16);

    // Unterkategorien auflisten
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    if (subcategories.length > 0) {
      subcategories.forEach((subcategory, idx) => {
        const displayName = subcategory.length > 12 ? subcategory.substring(0, 10) + '...' : subcategory;
        ctx.fillText(`• ${displayName}`, pubPanelX + 8, pubPanelY + 36 + idx * 16);
      });
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillText('Keine aktiven', pubPanelX + 8, pubPanelY + 36);
      ctx.fillText('Unterkategorien', pubPanelX + 8, pubPanelY + 52);
    }
  }, [getActiveKeywordsAndSubcategories]);

  // Move diagnostics to draw callback to ensure they run after canvas is actually rendered
  const runDiagnostics = useCallback(() => {
    try {
      const handZones = clickZonesRef.current.filter(z => z.data && z.data.type === 'hand_p1');
      const uiUIDs = handZones.map(z => (z.data.card && (z.data.card.uid ?? z.data.card.id)) ).filter(Boolean);
      const stateHand = gameState.hands && gameState.hands[1] ? gameState.hands[1] : [];
      const stateUIDs = stateHand.map((c: any) => c.uid ?? c.id).filter(Boolean);

      const missingInState = uiUIDs.filter((u: any) => !stateUIDs.includes(u));
      const missingInUI = stateUIDs.filter((u: any) => !uiUIDs.includes(u));

      // Only warn if there are cards in UI that don't exist in state (real error)
      // Don't warn about missing UI cards due to limited slot capacity
      if (missingInState.length > 0) {
        const mismatch = {
          ts: Date.now(),
          uiCount: uiUIDs.length,
          stateCount: stateUIDs.length,
          uiUIDs,
          stateUIDs,
          missingInState,
          missingInUI,
          stack: (new Error('mismatch-stack')).stack
        };
        (window as any).__politicardDebug = {
          ...(window as any).__politicardDebug,
          mismatch: [ ...(window as any).__politicardDebug?.mismatch || [] ].slice(-19).concat([mismatch])
        };
        // Clear, then log to console so user can copy/paste trace
        console.warn('POLITICARD DIAGNOSTIC: hand mismatch detected', mismatch);
      }
    } catch (e) {
      // swallow diagnostic errors to avoid breaking rendering
      console.error('Diagnostic error', e);
    }
  }, [gameState.hands]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Detect influence increases and start animations
    try {
      const currSnapshot: Record<string, number> = {};
      const collect = (c: any) => {
        if (!c) return;
        if ((c as any).kind !== 'pol') return;
        const uid = c.uid ?? (c.id != null ? String(c.id) : null);
        if (!uid) return;
        currSnapshot[uid] = getCurrentInfluence(c);
      };
      // board rows
      (gameState.board[1].aussen || []).forEach(collect);
      (gameState.board[2].aussen || []).forEach(collect);
      (gameState.board[1].innen || []).forEach(collect);
      (gameState.board[2].innen || []).forEach(collect);
      // permanent slots
      collect(gameState.permanentSlots[1].government as any);
      collect(gameState.permanentSlots[2].government as any);
      collect(gameState.permanentSlots[1].public as any);
      collect(gameState.permanentSlots[2].public as any);

      const now = performance.now();
      Object.keys(currSnapshot).forEach(uid => {
        const curr = currSnapshot[uid] ?? 0;
        const prev = prevInfluencesRef.current[uid] ?? curr;
        if (curr > prev) {
          // Einfluss erhöht - grüne Animation
          const delta = curr - prev;
          const list = influenceAnimRef.current.get(uid) || [];
          list.push({ start: now, duration: 900, amount: delta, type: 'increase' });
          influenceAnimRef.current.set(uid, list);

          // Flash-Animation für Buff
          cardFlashRef.current.set(uid, { start: now, duration: 600, type: 'buff' });
        } else if (curr < prev) {
          // Einfluss reduziert - rote Animation
          const delta = prev - curr;
          const list = influenceAnimRef.current.get(uid) || [];
          list.push({ start: now, duration: 900, amount: delta, type: 'decrease' });
          influenceAnimRef.current.set(uid, list);

          // Flash-Animation für Debuff
          cardFlashRef.current.set(uid, { start: now, duration: 600, type: 'debuff' });
        }
        prevInfluencesRef.current[uid] = curr;
      });
    } catch (e) {
      // ignore
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Clear click zones
    clickZonesRef.current = [];

    // Background: prefer PNG if configured
    if (LAYOUT.background?.enabled && LAYOUT.background?.src) {
      if (backgroundImageRef.current) {
        ctx.drawImage(backgroundImageRef.current, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#0c131b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    } else {
      ctx.fillStyle = '#0c131b';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Apply UI transform (new signature)
    const { scale, offsetX, offsetY } = getUiTransform(canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    // Draw opponent board (top rows) - clickable im Dev Mode
    // Draw opponent board using new layout system
    const opponentPublicRects = getPublicRects('opponent');
    const opponentGovRects = getGovernmentRects('opponent');

    // Draw opponent public slots
    opponentPublicRects.forEach((s: { x: number; y: number; w: number; h: number }, idx: number) => {
      const card = gameState.board[2].innen[idx];
      if (card) {
        const clickZone = drawCardAt(ctx, card, s.x, s.y, s.w, false, false, 2);
        // Register hover/click zone for opponent card (always) - include card for hover info
        clickZonesRef.current.push({
          ...clickZone,
          data: { type: 'board_card', player: 2, lane: 'innen', index: idx, card }
        });
      }
      else {
        // draw placeholder symbol for empty public slot
        const img = slotSymbolImgsRef.current.get('public');
        drawSlotIconWithPulse(ctx, img, s.x, s.y, s.w, s.h, 0.4);
        // Register empty slot click zone in dev mode
        if (devMode) {
          clickZonesRef.current.push({
            x: s.x, y: s.y, w: s.w, h: s.h,
            data: { type: 'row_slot', player: 2, lane: 'innen', index: idx }
          });
        }
      }
    });

    // Draw opponent government slots
    opponentGovRects.forEach((s: { x: number; y: number; w: number; h: number }, idx: number) => {
      const card = gameState.board[2].aussen[idx];
      const corrActive = !!((gameState as any).pendingAbilitySelect && (gameState as any).pendingAbilitySelect.type === 'corruption_steal');
      if (card) {
        const clickZone = drawCardAt(ctx, card, s.x, s.y, s.w, false, false, 2);
        // Register hover/click zone for opponent card (always) - include card for hover info
        clickZonesRef.current.push({
          ...clickZone,
          data: { type: 'board_card', player: 2, lane: 'aussen', index: idx, card }
        });
        // When corruption target selection is active, register exact slot rectangle for click detection
        if (corrActive) {
          clickZonesRef.current.push({
            x: s.x,
            y: s.y,
            w: s.w,
            h: s.h,
            data: { type: 'board_card', player: 2, lane: 'aussen', index: idx, card }
          });
        }
      }
      else {
        const img = slotSymbolImgsRef.current.get('government');
        drawSlotIconWithPulse(ctx, img, s.x, s.y, s.w, s.h, 0.1);
        // Register empty slot click zone only in dev mode
        if (devMode) {
          clickZonesRef.current.push({
            x: s.x, y: s.y, w: s.w, h: s.h,
            data: { type: 'row_slot', player: 2, lane: 'aussen', index: idx }
          });
        }
      }
    });

    // Draw opponent permanent slots (show icons even when not current)
    try {
      const permGovZoneOpp = getZone('slot.permanent.government.opponent');
      if (permGovZoneOpp) {
        const card = gameState.permanentSlots[2].government;
        const [ox, oy, ow, oh] = permGovZoneOpp.rectPx;
        if (card) {
          drawSingleSlot(ctx, 'slot.permanent.government.opponent', card, 'permanent_government', 2);
        } else {
          const img = slotSymbolImgsRef.current.get('dauerhaft');
          drawSlotIconWithPulse(ctx, img, ox, oy, ow, oh, 0.3);
          // Register empty slot click zone in dev mode
          if (devMode) {
            clickZonesRef.current.push({
              x: ox, y: oy, w: ow, h: oh,
              data: { type: 'empty_slot', slot: 'permanent_government', player: 2 }
            });
          }
        }
      }
    } catch (e) {}
    try {
      const permPubZoneOpp = getZone('slot.permanent.public.opponent');
      if (permPubZoneOpp) {
        const card = gameState.permanentSlots[2].public;
        const [ox2, oy2, ow2, oh2] = permPubZoneOpp.rectPx;
        if (card) {
          drawSingleSlot(ctx, 'slot.permanent.public.opponent', card, 'permanent_public', 2);
        } else {
          const img = slotSymbolImgsRef.current.get('dauerhaft');
          drawSlotIconWithPulse(ctx, img, ox2, oy2, ow2, oh2, 0.7);
          // Register empty slot click zone in dev mode
          if (devMode) {
            clickZonesRef.current.push({
              x: ox2, y: oy2, w: ow2, h: oh2,
              data: { type: 'empty_slot', slot: 'permanent_public', player: 2 }
            });
          }
        }
      }
    } catch (e) {}

    // Draw player board (middle rows)
    // Draw player board using new layout system
    const playerPublicRects = getPublicRects('player');
    const playerGovRects = getGovernmentRects('player');

    // Draw player public slots
    playerPublicRects.forEach((s: { x: number; y: number; w: number; h: number }, idx: number) => {
      const card = gameState.board[1].innen[idx];
      if (card) {
        const clickZone = drawCardAt(ctx, card, s.x, s.y, s.w, false, false, 1);
        // register card zone including card so hover panel can show details
        clickZonesRef.current.push({
          ...clickZone,
          data: { type: 'board_card', player: 1, lane: 'innen', index: idx, card }
        });
      } else {
        // Empty slot click zone and draw public symbol
        // Draw unified pulsing icon for empty public slot
        const img = slotSymbolImgsRef.current.get('public');
        drawSlotIconWithPulse(ctx, img, s.x, s.y, s.w, s.h, 0.4);
        clickZonesRef.current.push({
          x: s.x, y: s.y, w: s.w, h: s.h,
          data: { type: 'row_slot', player: 1, lane: 'innen', index: idx }
        });
      }
    });

    // Draw player government slots
    playerGovRects.forEach((s: { x: number; y: number; w: number; h: number }, idx: number) => {
      const card = gameState.board[1].aussen[idx];
      if (card) {
        const clickZone = drawCardAt(ctx, card, s.x, s.y, s.w, false, false, 1);
        clickZonesRef.current.push({
          ...clickZone,
          data: { type: 'board_card', player: 1, lane: 'aussen', index: idx, card }
        });
      } else {
        // Empty slot click zone and draw government symbol
        const img = slotSymbolImgsRef.current.get('government');
        drawSlotIconWithPulse(ctx, img, s.x, s.y, s.w, s.h, 0.1);
        clickZonesRef.current.push({
          x: s.x, y: s.y, w: s.w, h: s.h,
          data: { type: 'row_slot', player: 1, lane: 'aussen', index: idx }
        });
      }
    });

    // --- GOV PLACEMENT SPRITESHEET OVERLAY (frame-based) ---
    try {
      const sprites = govSpritesRef.current;
      const gif = govGifRef.current;
      const anims = (visualEffects && visualEffects.playAnimsRef && visualEffects.playAnimsRef.current) || [];

      // Start sprite animation when a playAnim for a gov-card is active and maps to a slot
      const now = performance.now();
      // Prefer mutating the source anim array so entries are consumed and don't retrigger repeatedly
      const animsArr: Array<{ uid: string | number; started: number; duration: number; lane?: string }> = (visualEffects && visualEffects.playAnimsRef && visualEffects.playAnimsRef.current) || ((window as any).__pc_play_anims = (window as any).__pc_play_anims || []);

      // Iterate backwards and consume processed animations to ensure one-shot playback
      for (let i = animsArr.length - 1; i >= 0; i--) {
        const a = animsArr[i];
        try {
          // handle specialized 'hit:' playAnims which indicate target-hit sprites by slot key
          if (typeof a.uid === 'string' && a.uid.indexOf('hit:') === 0) {
            const inner = a.uid.slice(4); // '1.aussen.0'
            if (!hitSpriteStateRef.current[inner]) {
              hitSpriteStateRef.current[inner] = { started: now, frameCount: 25, frameDuration: 30 };
              animsArr.splice(i, 1);
            }
            continue;
          }
        } catch (e) {}

        // find the zone/slot for this uid
        const zone = clickZonesRef.current.find(z => z.data && z.data.card && ((z.data.card.uid ?? String(z.data.card.id)) === a.uid));
        if (!zone) continue;

        // determine if gov slot or instant
        let isGov = false;
        let isInstant = false;
        try {
          const dt = zone.data || {};
          if (dt.type === 'row_slot' && dt.lane === 'aussen') isGov = true;
          if (dt.type === 'board_card' && dt.lane === 'aussen') isGov = true;
          if (dt.slot && typeof dt.slot === 'string' && dt.slot.includes('government')) isGov = true;
          if (dt.type === 'activate_instant' || (dt.slot && typeof dt.slot === 'string' && dt.slot.includes('instant'))) isInstant = true;
        } catch (e) {}
        if (!isGov && !isInstant) continue;

        const player = zone.data.player ?? 1;
        const lane = zone.data.lane ?? 'aussen';
        const idx = zone.data.index ?? 0;
        const key = `${player}.${lane}.${idx}`;

        // initialize sprite state if not present; consume the anim entry only when we actually start playback
        let startedThis = false;
        if (isGov) {
          if (!govSpriteStateRef.current[key]) {
            govSpriteStateRef.current[key] = { started: now, frameCount: 14, frameDuration: 40 }; // 14 frames @ ~40ms -> ~560ms
            startedThis = true;
          }
        }
        if (isInstant) {
          const instKey = `${player}.instant.${idx}`;
          if (!instantSpriteStateRef.current[instKey]) {
            instantSpriteStateRef.current[instKey] = { started: now, frameCount: 14, frameDuration: 40 };
            startedThis = true;
          }
        }
        if (startedThis) {
          animsArr.splice(i, 1);
        }
      }

      // draw running sprite animations per gov slot
      Object.keys(govSpriteStateRef.current).forEach(k => {
        const st = govSpriteStateRef.current[k];
        const elapsed = now - st.started;
        const total = st.frameCount * st.frameDuration;
        if (elapsed > total) {
          // animation finished; remove state
          delete govSpriteStateRef.current[k];
          return;
        }
        const frame = Math.floor(elapsed / st.frameDuration);

        // parse key -> player.lane.index
        const parts = k.split('.');
        const player = Number(parts[0]) || 1;
        const lane = parts[1] || 'aussen';
        const index = Number(parts[2] || 0);

        // compute slot rect for this gov slot (player or opponent board)
        const rect = player === 1 ? playerGovRects[index] : opponentGovRects[index];
        if (!rect) return;

        // spritesheet: frame N located at x = N*256, y = 0
        if (sprites && sprites.complete) {
          const sx = frame * 256;
          const sy = 0;
          const sw = 256;
          const sh = 256;
          // draw exactly matching the slot rect size to avoid scaling mismatches
          const dx = rect.x;
          const dy = rect.y;
          ctx.drawImage(sprites, sx, sy, sw, sh, dx, dy, rect.w, rect.h);
        } else if (gif && gif.complete) {
          // fallback to static gif if spritesheet missing
          ctx.drawImage(gif, rect.x, rect.y, rect.w, rect.h);
        }
      });
      // --- INSTANT INITIATIVE SPRITESHEET (draw on instant slot) ---
      try {
        const spritesI = instantSpritesRef.current;
        const nowI = performance.now();
        Object.keys(instantSpriteStateRef.current).forEach(k => {
          const st = instantSpriteStateRef.current[k];
          const elapsed = nowI - st.started;
          const total = st.frameCount * st.frameDuration;
          if (elapsed > total) { delete instantSpriteStateRef.current[k]; return; }
          const frame = Math.floor(elapsed / st.frameDuration);
          const parts = k.split('.');
          const player = Number(parts[0]) || 1;
          const index = Number(parts[2] || 0);
          const rects = getSofortRect(player ? 'player' : 'opponent');
          // getSofortRect returns one rect; map by player/context — fallback to zone
          const instantRect = getZone('slot.instant.player').rectPx;
          const [ix, iy, iw, ih] = instantRect;
          if (spritesI && spritesI.complete) {
            const sx = frame * 256; const sy = 0; const sw = 256; const sh = 256;
            ctx.drawImage(spritesI, sx, sy, sw, sh, ix, iy, iw, ih);
          }
        });
      } catch (e) {}
      // --- HIT / TARGET SPRITESHEET (draw as overlay on targeted slot) ---
      try {
        const spritesH = hitSpritesRef.current;
        const nowH = performance.now();
        Object.keys(hitSpriteStateRef.current).forEach(k => {
          const st = hitSpriteStateRef.current[k];
          const elapsed = nowH - st.started;
          const total = st.frameCount * st.frameDuration;
          if (elapsed > total) { delete hitSpriteStateRef.current[k]; return; }
          const frame = Math.floor(elapsed / st.frameDuration);

          // parse key -> player.lane.index
          const parts = k.split('.');
          const player = Number(parts[0]) || 1;
          const lane = parts[1] || 'aussen';
          const index = Number(parts[2] || 0);

          // compute slot rect for this gov slot (attempt gov then public)
          const rect = (player === 1 ? playerGovRects : opponentGovRects)[index] || (player === 1 ? playerPublicRects : opponentPublicRects)[index];
          if (!rect) return;

          if (spritesH && spritesH.complete) {
            const sx = frame * 256;
            const sy = 0;
            const sw = 256;
            const sh = 256;
            const dx = rect.x;
            const dy = rect.y;
            ctx.drawImage(spritesH, sx, sy, sw, sh, dx, dy, rect.w, rect.h);
          }
        });
      } catch (e) {}
    } catch (e) {}

    // --- FLASH ANIMATIONS FOR INFLUENCE CHANGES ---
    try {
      const nowFlash = performance.now();
      cardFlashRef.current.forEach((flash, uid) => {
        const elapsed = nowFlash - flash.start;
        const progress = Math.min(1, elapsed / flash.duration);

        if (progress >= 1) {
          // Animation finished; remove
          cardFlashRef.current.delete(uid);
          return;
        }

        // Find card position by scanning clickZones
        const zone = clickZonesRef.current.find(z => z.data && ((z.data.card && ((z.data.card.uid ?? String(z.data.card.id)) === uid)) || (z.data.card && z.data.card.uid === uid)));
        if (!zone) return;

        // Calculate flash alpha using sine wave for smooth fade in/out
        const flashAlpha = Math.sin(progress * Math.PI) * 0.3; // Max 30% opacity

        // Determine color based on flash type
        const color = flash.type === 'buff' ? '#2ecc71' : '#e74c3c'; // Grün oder Rot

        // Draw flash overlay
        ctx.save();
        ctx.globalAlpha = flashAlpha;
        ctx.fillStyle = color;
        ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
        ctx.restore();
      });
    } catch (e) {
      // ignore flash animation errors
    }

    // Draw player permanent slots (draw symbols if empty)
    // permanent government
    const permGovZone = getZone('slot.permanent.government.player');
    if (permGovZone) {
      const card = gameState.permanentSlots[1].government;
      const [x, y, w, h] = permGovZone.rectPx;
      if (card) {
        drawSingleSlot(ctx, 'slot.permanent.government.player', card, 'permanent_government', 1);
      } else {
        // Draw all slot icons using unified helper (so 'dauerhaft' used visually for empty permanent gov slot)
        const img = slotSymbolImgsRef.current.get('dauerhaft');
        drawSlotIconWithPulse(ctx, img, x, y, w, h, 0.2);
      }
    }
    // permanent public
    const permPubZone = getZone('slot.permanent.public.player');
    if (permPubZone) {
      const card = gameState.permanentSlots[1].public;
      const [x2, y2, w2, h2] = permPubZone.rectPx;
      if (card) {
        drawSingleSlot(ctx, 'slot.permanent.public.player', card, 'permanent_public', 1);
      } else {
        // Draw all slot icons using unified helper (so 'dauerhaft' used visually for empty permanent public slot)
        const img = slotSymbolImgsRef.current.get('dauerhaft');
        drawSlotIconWithPulse(ctx, img, x2, y2, w2, h2, 0.9);
      }
    }

    // Draw instant slots (both players) and placeholder if empty
    const instantPlayerZone = getZone('slot.instant.player');
    if (instantPlayerZone) {
      const card = gameState.board[1].sofort[0];
      const [x, y, w, h] = instantPlayerZone.rectPx;
      if (card) drawSingleSlot(ctx, 'slot.instant.player', card, 'instant', 1);
      else {
        // Use unified icon draw helper for instant slot
        const img = slotSymbolImgsRef.current.get('sofort');
        drawSlotIconWithPulse(ctx, img, x, y, w, h, 0.0);
      }
    }

    // Draw interventions strip (player)
    // We draw symbol if empty
    const interventionsZone = getZone('interventions.player');
    if (interventionsZone) {
      const [zx, zy, zw, zh] = interventionsZone.rectPx;
      const card = gameState.traps[1] && gameState.traps[1][0];
      if (card) drawInterventionsP1(ctx);
      else {
        const img = slotSymbolImgsRef.current.get('intervention');
        drawSlotIconWithPulse(ctx, img, zx, zy, zw, zh, 0.6);
      }
    }

    // Draw interventions strip (opponent) - nur im Dev Mode
    if (devMode) {
      drawInterventionsP2(ctx);
    }

    // Draw hand (P1)
    drawHandP1(ctx);

    // 🔧 DEV MODE: Draw hand (P2) - nur im Dev Mode
    if (devMode) {
      drawHandP2(ctx);
    }

    // Draw info panels
    drawInfoPanels(ctx);

    // Draw corruption mode indicator
    const corrActive = !!((gameState as any).pendingAbilitySelect && (gameState as any).pendingAbilitySelect.type === 'corruption_steal');
    if (corrActive) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔥 CORRUPTION TARGET SELECTION ACTIVE 🔥', 960, 100);

      ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('Click on opponent government card to target', 960, 140);
      ctx.restore();
    }

    // Draw maulwurf corruption mode indicator
    const maulwurfActive = !!((gameState as any).pendingAbilitySelect && (gameState as any).pendingAbilitySelect.type === 'maulwurf_steal');
    if (maulwurfActive) {
      ctx.save();
      ctx.fillStyle = 'rgba(139, 69, 19, 0.8)'; // Brown color for mole
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🕳️ MAULWURF CORRUPTION ACTIVE 🕳️', 960, 100);

      ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('Ziel automatisch gewählt - würfeln zum Stehlen', 960, 140);
      ctx.restore();
    }

    // Draw tunnelvision probe mode indicator
    const tunnelvisionActive = !!((gameState as any).pendingAbilitySelect && (gameState as any).pendingAbilitySelect.type === 'tunnelvision_probe');
    if (tunnelvisionActive) {
      ctx.save();
      ctx.fillStyle = 'rgba(75, 0, 130, 0.8)'; // Purple color for tunnelvision
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔮 TUNNELVISION PROBE ACTIVE 🔮', 960, 100);

      ctx.fillStyle = 'rgba(255, 255, 0, 0.9)';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('Regierungskarte Probe - würfeln zum Fortfahren', 960, 140);
      ctx.restore();
    }

    // --- VISUAL EFFECTS: Particle bursts, card pop scale, initiative ripple & AP pop ---
    try {
      const now = performance.now();
      const { particlesRef, popsRef, ripplesRef, apLabelsRef, visualEffectsRef, reducedMotion } = (visualEffects || {}) as any;

      const parts: any[] = particlesRef.current || [];
      if (!reducedMotion) {
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          const age = now - p.start;
          if (age > p.life) {
            parts.splice(i, 1);
            continue;
          }
          p.vy += (p.gravity || 0.09);
          p.x += p.vx;
          p.y += p.vy;
          const t = 1 - age / p.life;
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, t));
          ctx.fillStyle = p.color || '#ffd166';
          ctx.beginPath();
          ctx.arc(p.x, p.y, (p.size || 4) * t, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        particlesRef.current = parts;

        const pops: any[] = popsRef.current || [];
        pops.forEach((pop) => {
          const p = Math.min(1, Math.max(0, (now - pop.started) / pop.duration));
          const eased = 1 + 0.12 * (1 - Math.pow(1 - p, 3));
          const zone = clickZonesRef.current.find(z => z.data && z.data.card && ((z.data.card.uid ?? String(z.data.card.id)) === pop.uid));
          if (!zone) return;
          ctx.save();
          ctx.translate(zone.x + zone.w / 2, zone.y + zone.h / 2);
          ctx.scale(eased, eased);
          ctx.globalAlpha = 0.12 * (1 - p);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-zone.w / 2, -zone.h / 2, zone.w, zone.h);
          ctx.restore();
        });

        const ripples: any[] = ripplesRef.current || [];
        for (let i = ripples.length - 1; i >= 0; i--) {
          const r = ripples[i];
          const p = Math.min(1, Math.max(0, (now - r.started) / r.duration));
          if (p >= 1) { ripples.splice(i, 1); continue; }
          const radius = r.radius * (0.8 + 1.8 * p);
          ctx.save();
          const g = ctx.createRadialGradient(r.cx, r.cy, radius * 0.1, r.cx, r.cy, radius);
          g.addColorStop(0, `rgba(255,255,255,${0.12 * (1 - p)})`);
          g.addColorStop(1, `rgba(255,255,255,0)`);
          ctx.fillStyle = g as any;
          ctx.beginPath();
          ctx.arc(r.cx, r.cy, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          if (r.showAp && !r._apSpawned) {
            apLabelsRef.current = apLabelsRef.current || [];
            apLabelsRef.current.push({ x: r.apX, y: r.apY, started: now, duration: 800, text: '+1' });
            r._apSpawned = true;
          }
        }
        ripplesRef.current = ripples;

        const apl: any[] = apLabelsRef.current || [];
        for (let i = apl.length - 1; i >= 0; i--) {
          const l = apl[i];
          const p = Math.min(1, Math.max(0, (now - l.started) / l.duration));
          if (p >= 1) { apl.splice(i, 1); continue; }
          ctx.save();
          ctx.globalAlpha = 1 - p;
          ctx.fillStyle = '#ffdd57';
          ctx.font = 'bold 22px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(l.text, l.x, l.y - 20 * p);
          ctx.restore();
        }
        apLabelsRef.current = apl;
      } else {
        const apl: any[] = apLabelsRef.current || [];
        for (let i = apl.length - 1; i >= 0; i--) {
          const l = apl[i];
          const p = Math.min(1, Math.max(0, (now - l.started) / l.duration));
          if (p >= 1) { apl.splice(i, 1); continue; }
          ctx.save();
          ctx.globalAlpha = 1 - p;
          ctx.fillStyle = '#ffdd57';
          ctx.font = 'bold 18px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(l.text, l.x, l.y - 10 * p);
          ctx.restore();
        }
        apLabelsRef.current = apl;

        // --- NEW VISUAL EFFECTS ---
        const visualEffects: any[] = visualEffectsRef.current || [];
        for (let i = visualEffects.length - 1; i >= 0; i--) {
          const effect = visualEffects[i];
          const progress = Math.min(1, Math.max(0, (now - effect.started) / effect.duration));

          if (progress >= 1) {
            visualEffects.splice(i, 1);
            continue;
          }

          ctx.save();

          // Different effects based on type
          switch (effect.type) {
            case 'ap_gain':
              // Gelblicher +1 AP Effekt - groß startend, größer werdend, dann fade out
              const apScale = 0.8 + (progress * 0.4); // 0.8 -> 1.2
              const apAlpha = progress < 0.3 ? 0.9 : (1 - progress) * 1.2; // 90% opacity start, fade out
              const apY = effect.y - (progress * 60); // Move up

              ctx.globalAlpha = Math.max(0, apAlpha);
              ctx.fillStyle = effect.color || '#ffd700';
              ctx.font = `bold ${(effect.size || 24) * apScale}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(effect.text || '+1', effect.x, apY);
              break;

            case 'influence_buff':
              // Grüner Einfluss-Buff Effekt
              const infScale = 0.9 + (progress * 0.2);
              const infAlpha = (1 - progress) * 0.8;
              const infY = effect.y - (progress * 40);

              ctx.globalAlpha = Math.max(0, infAlpha);
              ctx.fillStyle = effect.color || '#4ade80';
              ctx.font = `bold ${(effect.size || 20) * infScale}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(effect.text || '+1', effect.x, infY);
              break;

            case 'card_play':
              // Karten-Spiel Effekt
              const cardScale = 0.8 + (progress * 0.3);
              const cardAlpha = (1 - progress) * 0.7;
              const cardY = effect.y - (progress * 30);

              ctx.globalAlpha = Math.max(0, cardAlpha);
              ctx.fillStyle = effect.color || '#60a5fa';
              ctx.font = `bold ${(effect.size || 16) * cardScale}px sans-serif`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(effect.text || 'Card', effect.x, cardY);
              break;
          }

          ctx.restore();
        }
        visualEffectsRef.current = visualEffects;
      }
    } catch (e) {}

    // --- Overlay pass: draw influence pulse ring and +N labels on top of all cards ---
    try {
      const now = performance.now();
      // iterate over stored anims
      influenceAnimRef.current.forEach((anims, uid) => {
        // find card position by scanning clickZones
        const zone = clickZonesRef.current.find(z => z.data && ((z.data.card && ((z.data.card.uid ?? String(z.data.card.id)) === uid)) || (z.data.card && z.data.card.uid === uid)) );
        if (!zone) return;
        const cx = zone.x + zone.w / 2;
        const cy = zone.y + zone.h / 2;
        // calculate aggregate pulse for this uid
        let maxPulse = 0;
        let totalIncrease = 0;
        let totalDecrease = 0;
        const remaining: Array<{ start: number; duration: number; amount: number; type: 'increase' | 'decrease' }> = [];
        anims.forEach(a => {
          const p = Math.min(1, Math.max(0, (now - a.start) / a.duration));
          const pulse = Math.pow(Math.max(0, 1 - p), 2);
          if (pulse > maxPulse) maxPulse = pulse;
          if (p < 1) {
            remaining.push(a);
            if (a.type === 'increase') {
              totalIncrease += a.amount;
            } else {
              totalDecrease += a.amount;
            }
          }
        });

        // update list
        if (remaining.length > 0) influenceAnimRef.current.set(uid, remaining);
        else influenceAnimRef.current.delete(uid);

        if (maxPulse > 0.001) {
          // draw a soft ring to the right-bottom of influence number
          const ringRadius = Math.max(8, zone.w * 0.08) * (1 + maxPulse * 0.6);
          const ringX = zone.x + zone.w - 28; // near bottom-right where influence text lives
          const ringY = zone.y + zone.h - 20;

          // Determine color based on animation type
          const isIncrease = totalIncrease > 0;
          const color = isIncrease ? 'rgba(46, 204, 113, 0.9)' : 'rgba(231, 76, 60, 0.9)'; // Grün oder Rot

          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = `${color}${maxPulse}`;
          ctx.lineWidth = Math.max(2, Math.ceil(6 * maxPulse));
          ctx.arc(ringX, ringY, ringRadius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Floating labels for both directions
        if (totalIncrease > 0) {
          // floating +N to the right of influence number
          const labelX = zone.x + zone.w - 12;
          const labelY = zone.y + zone.h - 32 - (Math.random() * 6); // slight jitter
          ctx.save();
          ctx.fillStyle = '#2ecc71'; // Grün
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(`+${totalIncrease}`, labelX, labelY);
          ctx.restore();
        }
        if (totalDecrease > 0) {
          // floating -N below the increase label
          const labelX = zone.x + zone.w - 12;
          const labelY = zone.y + zone.h - 16 - (Math.random() * 6); // slight jitter
          ctx.save();
          ctx.fillStyle = '#e74c3c'; // Rot
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(`-${totalDecrease}`, labelX, labelY);
          ctx.restore();
        }
      });
    } catch (e) {
      // ignore overlay errors
    }

    // --- Outline pass: draw a subtle, slightly pulsing 257x257 square around 256x256 slots ---
    try {
      const now2 = performance.now();
      clickZonesRef.current.forEach((z, i) => {
        if (!z) return;
        const w = z.w || 0;
        const h = z.h || 0;
        // only target 256x256 slot-sized zones (covers the icons)
        if (Math.abs(w - 256) > 0.1 || Math.abs(h - 256) > 0.1) return;
        const x = z.x;
        const y = z.y;

        // Color palette (rgb)
        const rgbTeal = '20,184,166';
        const rgbBurg = '127,29,29';
        const rgbPurple = '139,92,246';
        const rgbYellow = '250,204,21';
        const rgbOrange = '251,146,60';

        // Determine slot semantic
        let slotType: 'government' | 'public' | 'permanent' | 'instant' | 'intervention' | 'default' = 'default';
        try {
          const dt = z.data || {};
          if (dt.slot && typeof dt.slot === 'string') {
            if (dt.slot.includes('government')) slotType = 'government';
            else if (dt.slot.includes('public')) slotType = 'public';
            else if (dt.slot.includes('permanent')) slotType = 'permanent';
            else if (dt.slot.includes('instant')) slotType = 'instant';
          }
          if (dt.type === 'row_slot' && dt.lane === 'aussen') slotType = 'government';
          if (dt.type === 'row_slot' && dt.lane === 'innen') slotType = 'public';
          if (dt.type === 'trap_p1' || dt.type === 'trap_p2' || (dt.card && dt.card.kind === 'trap')) slotType = 'intervention';
          if (dt.type === 'activate_instant' || dt.slot === 'instant') slotType = 'instant';
          if (dt.slot === 'permanent_government' || dt.slot === 'permanent_public' || dt.slot === 'permanent') slotType = 'permanent';
        } catch (e) {}

        const pulse = 0.5 + 0.5 * Math.sin(now2 / 350 + i);
        const alpha = 0.06 + 0.12 * pulse; // subtle alpha
        const lw = 1 + 2 * pulse; // line width between 1 and 3

        // Create gradient based on slot type
        let grad: CanvasGradient | null = null;
        try {
          grad = ctx.createLinearGradient(x, y, x + w, y + h);
          if (slotType === 'government') {
            grad.addColorStop(0, `rgba(${rgbTeal},1)`);
            grad.addColorStop(1, `rgba(${rgbBurg},1)`);
          } else if (slotType === 'public') {
            grad.addColorStop(0, `rgba(${rgbBurg},1)`);
            grad.addColorStop(1, `rgba(${rgbTeal},1)`);
          } else if (slotType === 'permanent') {
            grad.addColorStop(0, `rgba(${rgbPurple},1)`);
            grad.addColorStop(1, `rgba(${rgbPurple},1)`);
          } else if (slotType === 'instant') {
            grad.addColorStop(0, `rgba(${rgbYellow},1)`);
            grad.addColorStop(1, `rgba(${rgbYellow},1)`);
          } else if (slotType === 'intervention') {
            grad.addColorStop(0, `rgba(${rgbOrange},1)`);
            grad.addColorStop(1, `rgba(${rgbOrange},1)`);
          } else {
            grad.addColorStop(0, `rgba(255,255,255,1)`);
            grad.addColorStop(1, `rgba(255,255,255,1)`);
          }
        } catch (e) {
          grad = null;
        }

        ctx.save();
        if (grad) ctx.strokeStyle = grad as any;
        else ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = lw;
        // draw 257x257 centered so that it encloses the 256 slot
        ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
        ctx.restore();
      });
    } catch (e) {
      // ignore outline errors
    }

    ctx.restore();

    // expose zones for debug snapshot
    (window as any).__politicardDebug = {
      uiTransform: getUiTransform(canvas.width, canvas.height),
      canvasSize: { width: canvas.width, height: canvas.height },
      zones: LAYOUT.zones,
      clickZones: clickZonesRef.current.slice(0, 1000)
    };

    // Build canonical slotPositions map for animations/debugging
    try {
      const map: Record<string, { x: number; y: number; w: number; h: number; cx: number; cy: number }> = {};
      clickZonesRef.current.forEach(z => {
        const d = z.data || {};
        // support row_slot, board_card, slot_card shapes
        if (d.type === 'row_slot' || d.type === 'board_card' || d.type === 'slot_card' || d.type === 'hand_p1' || d.type === 'hand_p2') {
          const player = d.player ?? (d.type === 'hand_p2' ? 2 : 1);
          const lane = d.lane ?? (typeof d.slot === 'string' ? d.slot : (d.type === 'hand_p2' ? 'hand' : 'unknown'));
          let index: number;
          if (d.index != null) {
            index = d.index;
          } else if (d.card) {
            // prefer explicit slotIndex, fallback to card.index, otherwise 0
            index = (d.card.slotIndex != null) ? d.card.slotIndex : ((d.card.index != null) ? d.card.index : 0);
          } else {
            index = 0;
          }
          const key = `${player}.${lane}.${index}`;
          map[key] = { x: z.x, y: z.y, w: z.w, h: z.h, cx: z.x + z.w / 2, cy: z.y + z.h / 2 };
        }
      });
      slotPositionsRef.current = map;
      (window as any).__politicardDebug = { ...(window as any).__politicardDebug, slotPositions: slotPositionsRef.current };
    } catch (e) {
      // don't let debug mapping break rendering
    }

    // Run diagnostics after canvas is fully rendered
    runDiagnostics();
  }, [drawLane, drawHandP1, drawHandP2, drawInterventionsP1, drawInterventionsP2, drawPermanentSlotsP1, drawPermanentSlotsP2, drawInstantSlots, drawInfoPanels, devMode, runDiagnostics]);

  const DRAW_LAYOUT_OVERLAY = false; // force off per new layout system

  // Load slot symbol images once
  useEffect(() => {
    const load = (key: string, src: string) => {
      const img = new Image();
      img.onload = () => { slotSymbolImgsRef.current.set(key, img); };
      img.onerror = () => { console.warn('Failed to load slot icon', src); };
      img.src = src;
    };
    // load all slot icons
    load('public', publicSymbolUrl);
    load('sofort', sofortSymbolUrl);
    load('dauerhaft', dauerhaftSymbolUrl);
    load('government', governmentSymbolUrl);
    load('intervention', interventionSymbolUrl);

    // load test GIF for gov overlay
    try {
      const img = new Image();
      img.onload = () => { govGifRef.current = img; };
      img.onerror = () => { console.warn('Failed to load gov overlay gif', govPlaceGifUrl); };
      img.src = govPlaceGifUrl;
    } catch (e) {}
    // load spritesheet for placement animation
    try {
      const s = new Image();
      s.onload = () => { govSpritesRef.current = s; };
      s.onerror = () => { console.warn('Failed to load gov spritesheet', govPlaceSpritesheetUrl); };
      s.src = govPlaceSpritesheetUrl;
    } catch (e) {}
    // load spritesheet for instant initiative activation
    try {
      const si = new Image();
      si.onload = () => { instantSpritesRef.current = si; };
      si.onerror = () => { console.warn('Failed to load instant spritesheet', instantSpritesheetUrl); };
      si.src = instantSpritesheetUrl;
    } catch (e) {}

    // load spritesheet for hit/target animation (25 frames)
    try {
      const h = new Image();
      h.onload = () => { hitSpritesRef.current = h; };
      h.onerror = () => { console.warn('Failed to load hit spritesheet', hitSpritesheetUrl); };
      h.src = hitSpritesheetUrl;
    } catch (e) {}

    // ensure first draw
    requestAnimationFrame(draw);
  }, [draw]);

  // Expose debug trigger to manually start gov sprite animation by slot-key or uid
  useEffect(() => {
    (window as any).__pc_triggerGovAnim = (id: any) => {
      try {
        const now = performance.now();
        // if id is slot key like '1.aussen.2'
        if (typeof id === 'string' && id.indexOf('.') >= 0) {
          govSpriteStateRef.current[id] = { started: now, frameCount: 14, frameDuration: 40 };
          return;
        }

        // otherwise try to resolve as uid/id to a clickZone
        const uid = id;
        const zone = clickZonesRef.current.find(z => z.data && (z.data.card && ((z.data.card.uid ?? String(z.data.card.id)) === uid || (z.data.card.id === uid))));
        if (!zone) {
          console.warn('pc_triggerGovAnim: no slot found for uid', uid);
          return;
        }
        const player = zone.data.player ?? 1;
        const lane = zone.data.lane ?? (zone.data.slot && typeof zone.data.slot === 'string' ? zone.data.slot : 'aussen');
        const index = zone.data.index ?? 0;
        const key = `${player}.${lane}.${index}`;
        govSpriteStateRef.current[key] = { started: now, frameCount: 14, frameDuration: 40 };
      } catch (e) {
        console.warn('pc_triggerGovAnim error', e);
      }
    };
    // expose easy alias
    try { (window as any).pc_triggerGovAnim = (window as any).__pc_triggerGovAnim; } catch (e) {}
    return () => { delete (window as any).__pc_triggerGovAnim; };
  }, []);

  // Expose debug trigger for hit animation (key: '1.aussen.0' or uid)
  useEffect(() => {
    (window as any).__pc_triggerHitAnim = (id: any) => {
      try {
        const now = performance.now();
        // if id is slot key like '1.aussen.2'
        if (typeof id === 'string' && id.indexOf('.') >= 0) {
          hitSpriteStateRef.current[id] = { started: now, frameCount: 25, frameDuration: 30 };
          return;
        }

        // otherwise try to resolve as uid/id to a clickZone
        const uid = id;
        const zone = clickZonesRef.current.find(z => z.data && (z.data.card && ((z.data.card.uid ?? String(z.data.card.id)) === uid || (z.data.card.id === uid))));
        if (!zone) {
          console.warn('pc_triggerHitAnim: no slot found for uid', uid);
          return;
        }
        const player = zone.data.player ?? 1;
        const lane = zone.data.lane ?? (zone.data.slot && typeof zone.data.slot === 'string' ? zone.data.slot : 'aussen');
        const index = zone.data.index ?? 0;
        const key = `${player}.${lane}.${index}`;
        hitSpriteStateRef.current[key] = { started: now, frameCount: 25, frameDuration: 30 };
      } catch (e) {
        console.warn('pc_triggerHitAnim error', e);
      }
    };
    try { (window as any).pc_triggerHitAnim = (window as any).__pc_triggerHitAnim; } catch (e) {}
    return () => { delete (window as any).__pc_triggerHitAnim; };
  }, []);

  // Redraw when game state or selection changes
  useEffect(() => {
    requestAnimationFrame(draw);
  }, [gameState, selectedHandIndex, draw]);

  // Continuous render loop to keep canvas updated without relying on external state refs
  useEffect(() => {
    let frame: number;
    const loop = () => {
      draw();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [draw]);

  const handleCardClick = useCallback((data: any) => {
    // Corruption target selection: intercept board card clicks for opponent government
    if (corruptionSelectActorRef.current && data && data.type === 'board_card') {
      try {
        const actor = corruptionSelectActorRef.current as Player;
        const victim = actor === 1 ? 2 : 1;
        if (data.player === victim && (data.lane === 'aussen' || data.lane === 'government')) {
          const uid = data.card?.uid ?? data.card?.id;
          if (uid != null) {
            corruptionSelectActorRef.current = null;
            try { window.dispatchEvent(new CustomEvent('pc:corruption_target_selected', { detail: { player: actor, targetUid: uid } })); } catch (e) {}
            return; // do not propagate
          }
        }
      } catch (e) {}
    }
    // Hand-Klick
    if (data.type === 'hand_p1') {
      const uid = data.card?.uid ?? data.card?.id;
      const stateHand = gameState.hands?.[1] || [];
      const idxInState = stateHand.findIndex((c: any) => (c.uid ?? c.id) === uid);
      onCardClick(data);
      return;
    }

    // Slot-Klick
    if (data.type === 'row_slot') {
      const lane: 'public' | 'government' = data.lane;
      const cap = getLaneCapacity(lane);

      // Hole aktuelle Row-Länge aus gameState
      const rowCards = lane === 'public'
        ? gameState.board?.[1]?.innen ?? []
        : gameState.board?.[1]?.aussen ?? [];

      if (rowCards.length >= cap) {
        // Optional: UI Feedback
        console.warn(`Row ${lane} is full (${rowCards.length}/${cap})`);
        return;
      }

      onCardClick(data);
      return;
    }

    // Andere Klicks (empty_slot, board_card, etc.)
    onCardClick(data);
  }, [gameState, onCardClick]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const { scale, offsetX, offsetY } = getUiTransform(canvas.width, canvas.height);
    const mx = (e.clientX - rect.left - offsetX) / scale;
    const my = (e.clientY - rect.top - offsetY) / scale;

    const hit = clickZonesRef.current.find(z => mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h);
    if (hit) {
      console.debug('[CanvasClick] mx,my,hit:', mx, my, hit.data);
      try {
        // If user clicked a drawn card in an instant slot, normalize to activate_instant
        const d = hit.data || {};
        if (d.type === 'slot_card' && d.slot === 'instant') {
          handleCardClick({ type: 'activate_instant', player: d.player || 1, card: d.card });
          return;
        }
        // Fallback: if there's an explicit activate_instant zone, pass through
        if (d.type === 'activate_instant') {
          handleCardClick(d);
          return;
        }
      } catch (err) {}
      handleCardClickInternal(hit.data);
    }
  }, [handleCardClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const { scale, offsetX, offsetY } = getUiTransform(canvas.width, canvas.height);
    const mx = (e.clientX - rect.left - offsetX) / scale;
    const my = (e.clientY - rect.top - offsetY) / scale;

    const hit = clickZonesRef.current.find(z => mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h);
    if (hit) {
      onCardHover({ ...hit.data, x: e.clientX, y: e.clientY });
    } else {
      onCardHover(null);
    }
  }, [onCardHover]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    // only enable when player1 has more slots than visible
    const handLen = (gameState.hands && gameState.hands[1]) ? gameState.hands[1].length : 0;
    const zone = getZone('hand.player');
    if (!zone) return;
    if (handLen <= 5) return; // nothing to scroll

    // Prevent page scrolling when over canvas
    e.preventDefault();

    // accumulate target offset (invert so wheel down moves cards up)
    // Each wheel step moves by 48px per delta unit
    const delta = Math.sign(e.deltaY) * 48;
    // compute slot height more robustly
    const slots = computeSlotRects(zone);
    const slotH = slots && slots.length > 0 ? slots[0].h : zone.rectPx[3] / 5;
    const visible = 5;
    const maxOffset = -(Math.max(0, handLen - visible) * slotH);
    handScrollTargetRef.current = Math.max(Math.min(handScrollTargetRef.current - delta, 0), maxOffset);
  }, [gameState.hands]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!e.touches || e.touches.length === 0) return;
    const handLen = (gameState.hands && gameState.hands[1]) ? gameState.hands[1].length : 0;
    if (handLen <= 5) return;
    isTouchingRef.current = true;
    const y = e.touches[0].clientY;
    touchStartYRef.current = y;
    lastTouchYRef.current = y;
    e.preventDefault();
  }, [gameState.hands]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isTouchingRef.current) return;
    if (!e.touches || e.touches.length === 0) return;
    const y = e.touches[0].clientY;
    const last = lastTouchYRef.current ?? y;
    const dy = y - last; // positive when moving down
    lastTouchYRef.current = y;

    // invert so dragging up moves cards up
    const delta = -dy;
    const handLen = (gameState.hands && gameState.hands[1]) ? gameState.hands[1].length : 0;
    const zone = getZone('hand.player');
    if (!zone) return;
    const slots = computeSlotRects(zone);
    const slotH = slots && slots.length > 0 ? slots[0].h : zone.rectPx[3] / 5;
    const visible = 5;
    const maxOffset = -(Math.max(0, handLen - visible) * slotH);
    handScrollTargetRef.current = Math.max(Math.min(handScrollTargetRef.current + delta, 0), maxOffset);
    e.preventDefault();
  }, [gameState.hands]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    isTouchingRef.current = false;
    touchStartYRef.current = null;
    lastTouchYRef.current = null;
  }, []);



  // Expose debug trigger to manually start instant sprite animation by slot-key or uid
  useEffect(() => {
    (window as any).__pc_triggerInstantAnim = (key: any) => {
      const now = performance.now();
      instantSpriteStateRef.current[key || '1.instant.0'] = { started: now, frameCount: 14, frameDuration: 40 };
    };
    // alias
    try { (window as any).pc_triggerInstantAnim = (window as any).__pc_triggerInstantAnim; } catch (e) {}
    return () => { delete (window as any).__pc_triggerGovAnim; delete (window as any).__pc_triggerInstantAnim; };
  }, []);

  // Expose debug trigger to manually start flash animation by uid
  useEffect(() => {
    (window as any).__pc_triggerFlashAnim = (uid: any, type: 'buff' | 'debuff' = 'buff') => {
      try {
        const now = performance.now();
        cardFlashRef.current.set(String(uid), { start: now, duration: 600, type });
        console.log(`🎨 Flash animation triggered for uid ${uid}, type: ${type}`);
      } catch (e) {
        console.warn('pc_triggerFlashAnim error', e);
      }
    };
    // alias
    try { (window as any).pc_triggerFlashAnim = (window as any).__pc_triggerFlashAnim; } catch (e) {}
    return () => { delete (window as any).__pc_triggerFlashAnim; };
  }, []);

  // Click handler wrapper for corruption selection
  const handleCardClickInternal = useCallback((data: any) => {
    const sel: any = (gameState as any).pendingAbilitySelect;
    if (sel && sel.type === 'corruption_steal') {
      // Accept clicks on either actual card sprites (with uid) or on empty row_slot hitboxes.
      if (data.player !== sel.actorPlayer && data.lane === 'aussen') {
        let targetUid = (data as any).uid;

        // If we got a row_slot hit (no uid), map index→uid from board state
        if (!targetUid && data.type === 'row_slot') {
          try {
            const p = data.player;
            const idx = data.index;
            const card = (gameState as any).board?.[p]?.aussen?.[idx];
            targetUid = card?.uid;
          } catch(e) {}
        }

        if (targetUid) {
          try {
            console.debug('[CORR] forwarding uid', targetUid, 'actorPlayer=', sel.actorPlayer);
            window.dispatchEvent(new CustomEvent('pc:corruption_pick_target', { detail: { player: sel.actorPlayer, targetUid } }));
            // Also open small confirmation overlay via DOM event for modal convenience
            try { window.dispatchEvent(new CustomEvent('pc:corruption_target_selected', { detail: { player: sel.actorPlayer, targetUid } })); } catch(e) {}
          } catch(e) {}
          return; // consume click
        }
      }
    }
    onCardClick(data);
  }, [gameState, onCardClick]);

  useEffect(() => {
    const onDiceResult = () => {
      // remove corruption modal if exists
      const el = document.getElementById('pc-corruption-modal');
      if (el) el.remove();
      corruptionSelectActorRef.current = null;
    };
    window.addEventListener('pc:dice_result', onDiceResult as EventListener);
    return () => window.removeEventListener('pc:dice_result', onDiceResult as EventListener);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={1920}
      height={1080}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        imageRendering: 'auto',
      }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
};
