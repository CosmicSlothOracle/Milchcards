import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Card, GameState } from '../types/game';
import { getCardImagePath } from '../data/gameData';
import { LAYOUT, UI_BASE, computeSlotRects, getGovernmentRects, getPublicRects, getSofortRect, getUiTransform, getZone, setMobileBoardLayout } from '../ui/layout';
import { sortHandCards } from '../utils/gameUtils';
import { MOBILE_HUD_BOTTOM, MOBILE_HUD_TOP, useMobileLayout } from '../hooks/useMobileLayout';

interface GameBoardProps {
  gameState: GameState;
  selectedHandIndex: number | null;
  onCardClick: (data: any) => void;
  onCardHover: (data: any) => void;
  devMode?: boolean;
  /** Which player this client controls (1 = host/solo, 2 = PvP guest). */
  localPlayer?: 1 | 2;
}

const useBoardSize = () => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setSize({ width: rect.width, height: rect.height });
    };

    update();

    const observer = new ResizeObserver(() => update());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
};

const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  selectedHandIndex,
  onCardClick,
  onCardHover,
  devMode = false,
  localPlayer = 1,
}) => {
  const isMyTurn = gameState.current === localPlayer;
  const { ref: boardRef, size } = useBoardSize();
  const mobile = useMobileLayout();
  const useCompactHud = mobile.isMobile && mobile.isLandscape;
  const useHandStrips = useCompactHud;

  setMobileBoardLayout(useHandStrips);
  useEffect(() => () => setMobileBoardLayout(false), []);

  const transform = useMemo(() => {
    const hudTop = useCompactHud ? MOBILE_HUD_TOP : 0;
    const hudBottom = useCompactHud ? MOBILE_HUD_BOTTOM : 0;
    const playHeight = Math.max(180, size.height - hudTop - hudBottom);
    const t = getUiTransform(size.width, playHeight);
    if (useCompactHud) {
      return { ...t, offsetY: t.offsetY + hudTop };
    }
    return t;
  }, [size.height, size.width, useCompactHud]);
  const pendingAbility = (gameState as any).pendingAbilitySelect;
  const corruptionActive = pendingAbility?.type === 'corruption_steal';
  const corruptionPending = pendingAbility?.type === 'corruption_steal' ? pendingAbility : null;
  const corruptionTargetUid = corruptionPending?.targetUid ?? null;
  const maulwurfPending = pendingAbility?.type === 'maulwurf_steal' ? pendingAbility : null;
  const maulwurfTargetUid = maulwurfPending?.targetUid ?? null;
  const maulwurfRequiredRoll = maulwurfPending?.requiredRoll ?? null;
  const corruptionTargetPlayer = gameState.current === 1 ? 2 : 1;

  const maulwurfTargetName = useMemo(() => {
    if (!maulwurfTargetUid || !maulwurfPending) return null;
    const victim: 1 | 2 = maulwurfPending.actorPlayer === 1 ? 2 : 1;
    return gameState.board[victim].aussen.find((c) => c.uid === maulwurfTargetUid)?.name ?? null;
  }, [gameState.board, maulwurfPending, maulwurfTargetUid]);

  const corruptionTargetName = useMemo(() => {
    if (!corruptionTargetUid || !corruptionPending) return null;
    const victim: 1 | 2 = corruptionPending.actorPlayer === 1 ? 2 : 1;
    return gameState.board[victim].aussen.find((c) => c.uid === corruptionTargetUid)?.name ?? null;
  }, [gameState.board, corruptionPending, corruptionTargetUid]);

  const requestMaulwurfRoll = useCallback(() => {
    if (!maulwurfPending) return;
    window.dispatchEvent(new CustomEvent('pc:maulwurf_request_roll', {
      detail: { player: maulwurfPending.actorPlayer, targetUid: maulwurfPending.targetUid },
    }));
  }, [maulwurfPending]);

  const cancelMaulwurf = useCallback(() => {
    window.dispatchEvent(new CustomEvent('pc:maulwurf_cancel'));
  }, []);

  const requestCorruptionRoll = useCallback(() => {
    if (!corruptionPending?.targetUid) return;
    window.dispatchEvent(new CustomEvent('pc:corruption_request_roll', {
      detail: { player: corruptionPending.actorPlayer, targetUid: corruptionPending.targetUid },
    }));
  }, [corruptionPending]);

  const cancelCorruption = useCallback(() => {
    window.dispatchEvent(new CustomEvent('pc:corruption_cancel'));
  }, []);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Set<number>>(new Set());
  const previousBoardUids = useRef<Set<number>>(new Set());
  const removalTimers = useRef<Map<number, number>>(new Map());
  const [corruptionHold, setCorruptionHold] = useState<{ player: 1 | 2 | null }>({ player: null });
  const corruptionHoldTimer = useRef<number | null>(null);
  const [corruptionSuccessUids, setCorruptionSuccessUids] = useState<Set<number>>(new Set());
  const [corruptionFailUids, setCorruptionFailUids] = useState<Set<number>>(new Set());
  const corruptionResultTimers = useRef<Map<number, number>>(new Map());
  const [isLogOpen, setIsLogOpen] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLogOpen && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [gameState.log, isLogOpen]);

  useEffect(() => {
    const currentUids = new Set<number>();
    const addCard = (card?: Card | null) => {
      if (card) currentUids.add(card.uid);
    };

    ([1, 2] as const).forEach((player) => {
      gameState.board[player].innen.forEach(addCard);
      gameState.board[player].aussen.forEach(addCard);
      addCard(gameState.board[player].sofort[0]);
      addCard((gameState.traps[player] || [])[0]);
      addCard(gameState.permanentSlots[player].government);
      addCard(gameState.permanentSlots[player].public);
    });

    const newUids: number[] = [];
    currentUids.forEach((uid) => {
      if (!previousBoardUids.current.has(uid)) {
        newUids.push(uid);
      }
    });

    if (newUids.length) {
      setRecentlyPlayed((prev) => {
        const next = new Set(prev);
        newUids.forEach((uid) => next.add(uid));
        return next;
      });

      newUids.forEach((uid) => {
        const existingTimer = removalTimers.current.get(uid);
        if (existingTimer) window.clearTimeout(existingTimer);
        const timer = window.setTimeout(() => {
          setRecentlyPlayed((prev) => {
            const next = new Set(prev);
            next.delete(uid);
            return next;
          });
          removalTimers.current.delete(uid);
        }, 1200);
        removalTimers.current.set(uid, timer);
      });
    }

    previousBoardUids.current = currentUids;
  }, [gameState]);

  useEffect(() => (
    () => {
      removalTimers.current.forEach((timer) => window.clearTimeout(timer));
      removalTimers.current.clear();
    }
  ), []);

  useEffect(() => {
    const handleCorruptionRoll = (event: Event) => {
      const detail = (event as CustomEvent).detail as { victim?: 1 | 2 };
      if (!detail?.victim) return;
      setCorruptionHold({ player: detail.victim });
      if (corruptionHoldTimer.current) {
        window.clearTimeout(corruptionHoldTimer.current);
      }
      corruptionHoldTimer.current = window.setTimeout(() => {
        setCorruptionHold({ player: null });
        corruptionHoldTimer.current = null;
      }, 1200);
    };

    const handleCorruptionResolved = (event: Event) => {
      const detail = (event as CustomEvent).detail as { targetUid?: number; success?: boolean };
      if (!detail?.targetUid) return;
      const targetUid = detail.targetUid;
      const isSuccess = Boolean(detail.success);
      const setResult = isSuccess ? setCorruptionSuccessUids : setCorruptionFailUids;
      setResult((prev) => {
        const next = new Set(prev);
        next.add(targetUid);
        return next;
      });

      const existingTimer = corruptionResultTimers.current.get(targetUid);
      if (existingTimer) window.clearTimeout(existingTimer);
      const timer = window.setTimeout(() => {
        setResult((prev) => {
          const next = new Set(prev);
          next.delete(targetUid);
          return next;
        });
        corruptionResultTimers.current.delete(targetUid);
      }, 1400);
      corruptionResultTimers.current.set(targetUid, timer);
    };

    window.addEventListener('pc:corruption_roll_started', handleCorruptionRoll as EventListener);
    window.addEventListener('pc:corruption_resolved', handleCorruptionResolved as EventListener);
    return () => {
      window.removeEventListener('pc:corruption_roll_started', handleCorruptionRoll as EventListener);
      window.removeEventListener('pc:corruption_resolved', handleCorruptionResolved as EventListener);
    };
  }, []);

  useEffect(() => (
    () => {
      if (corruptionHoldTimer.current) {
        window.clearTimeout(corruptionHoldTimer.current);
      }
      corruptionResultTimers.current.forEach((timer) => window.clearTimeout(timer));
      corruptionResultTimers.current.clear();
    }
  ), []);

  const handleHover = useCallback(
    (card: Card | null, event?: React.MouseEvent) => {
      if (mobile.isTouch) return;
      if (!card || !event) {
        onCardHover(null);
        return;
      }
      onCardHover({ card, x: event.clientX, y: event.clientY });
    },
    [onCardHover, mobile.isTouch],
  );

  const renderCard = (
    card: Card,
    style: React.CSSProperties,
    data: any,
    options?: { selected?: boolean; showActivate?: boolean; onActivate?: () => void; highlight?: boolean }
  ) => (
    <div
      key={card.uid}
      className={`game-board__card${ options?.selected ? ' game-board__card--selected' : '' }${ options?.highlight ? ' game-board__card--corruption' : '' }`}
      style={style}
      onClick={() => onCardClick(data)}
      onMouseEnter={(event) => handleHover(card, event)}
      onMouseMove={(event) => handleHover(card, event)}
      onMouseLeave={() => handleHover(null)}
    >
      <img src={getCardImagePath(card, 'ui')} alt={card.name} />
      {options?.showActivate && options.onActivate && (
        <button
          type="button"
          className="game-board__activate"
          onClick={(event) => {
            event.stopPropagation();
            options.onActivate?.();
          }}
        >
          Aktivieren
        </button>
      )}
    </div>
  );

  const renderSlot = (
    key: string,
    style: React.CSSProperties,
    label: string,
    onClick?: () => void,
    highlight?: boolean,
    variant?: 'government' | 'public' | 'permanent' | 'instant' | 'intervention',
  ) => (
    <button
      key={key}
      type="button"
      className={`game-board__slot${ variant ? ` game-board__slot--${ variant }` : '' }${ highlight ? ' game-board__slot--corruption' : '' }`}
      style={style}
      onClick={onClick}
      onMouseLeave={() => onCardHover(null)}
    >
      <span>{label}</span>
    </button>
  );

  const renderRow = (
    player: 1 | 2,
    lane: 'aussen' | 'innen',
    label: string,
  ) => {
    const shouldHighlightCorruption = Boolean(
      lane === 'aussen'
      && (
        (corruptionActive && player === corruptionTargetPlayer)
        || (corruptionHold.player && player === corruptionHold.player)
      ),
    );
    const rects = lane === 'aussen'
      ? getGovernmentRects(player === 1 ? 'player' : 'opponent')
      : getPublicRects(player === 1 ? 'player' : 'opponent');
    const cards = gameState.board[player][lane] || [];

    return rects.map((rect, index) => {
      const style = { left: rect.x, top: rect.y, width: rect.w, height: rect.h } as React.CSSProperties;
      const card = cards[index];
      if (!card) {
        return renderSlot(
          `${ player }-${ lane }-${ index }`,
          style,
          label,
          () => onCardClick({ type: 'row_slot', player, lane, index }),
          shouldHighlightCorruption,
          lane === 'aussen' ? 'government' : 'public',
        );
      }
      return renderCard(
        card,
        style,
        { type: 'board_card', player, lane, index, card },
        {
          highlight: shouldHighlightCorruption || (maulwurfTargetUid != null && card.uid === maulwurfTargetUid),
        },
      );
    });
  };

  // Open-hand game: both hands are rendered face-up in mirrored side columns
  // (player left, opponent right) so a future 1v1 PvP mode shares one board view.
  const renderHand = (player: 1 | 2) => {
    const zone = getZone(player === 1 ? 'hand.player' : 'hand.opponent');
    const rects = computeSlotRects(zone);
    const sortedHand = sortHandCards(gameState.hands[player]);
    const isCurrent = gameState.current === player;

    return rects.map((rect, index) => {
      const card = sortedHand[index];
      if (!card) return null;

      const style = { left: rect.x, top: rect.y, width: rect.w, height: rect.h } as React.CSSProperties;
      const originalIndex = gameState.hands[player].findIndex((c) => c.uid === card.uid);
      const selected = isCurrent && selectedHandIndex !== null && originalIndex === selectedHandIndex;

      return renderCard(
        card,
        style,
        { type: player === 1 ? 'hand_p1' : 'hand_p2', index: originalIndex, card },
        { selected },
      );
    });
  };

  const renderPermanentSlot = (
    player: 1 | 2,
    type: 'government' | 'public',
    label: string,
  ) => {
    const zone = getZone(`slot.permanent.${ type }.${ player === 1 ? 'player' : 'opponent' }`);
    const rect = computeSlotRects(zone)[0];
    const style = { left: rect.x, top: rect.y, width: rect.w, height: rect.h } as React.CSSProperties;
    const card = type === 'government' ? gameState.permanentSlots[player].government : gameState.permanentSlots[player].public;
    const slotType = type === 'government' ? 'permanent_government' : 'permanent_public';

    if (!card) {
      return renderSlot(
        `${ player }-permanent-${ type }`,
        style,
        label,
        () => onCardClick({ type: 'empty_slot', slot: slotType, player }),
        false,
        'permanent',
      );
    }
    return renderCard(card, style, { type: 'slot_card', slot: slotType, player, card });
  };

  const renderInstantSlot = (player: 1 | 2) => {
    const rect = getSofortRect(player === 1 ? 'player' : 'opponent');
    const style = { left: rect.x, top: rect.y, width: rect.w, height: rect.h } as React.CSSProperties;
    const card = gameState.board[player].sofort[0];

    if (!card) {
      return renderSlot(
        `${ player }-instant`,
        style,
        'Sofort',
        () => onCardClick({ type: 'empty_slot', slot: 'instant', player }),
        false,
        'instant',
      );
    }
    return renderCard(
      card,
      style,
      { type: 'slot_card', slot: 'instant', player, card },
      {
        showActivate: player === gameState.current || devMode,
        onActivate: () => onCardClick({ type: 'activate_instant', player, card }),
      },
    );
  };

  const renderInterventionSlot = (player: 1 | 2) => {
    const zone = getZone(`interventions.${ player === 1 ? 'player' : 'opponent' }`);
    const rect = computeSlotRects(zone)[0];
    const style = { left: rect.x, top: rect.y, width: rect.w, height: rect.h } as React.CSSProperties;
    const card = (gameState.traps[player] || [])[0];

    if (!card) {
      return renderSlot(
        `${ player }-intervention`,
        style,
        'Intervention',
        undefined,
        false,
        'intervention',
      );
    }
    return renderCard(card, style, { type: player === 1 ? 'trap_p1' : 'trap_p2', index: 0, card });
  };

  const calculatePlayerInfluence = useCallback((player: 1 | 2): number => {
    let totalInfluence = 0;
    const playerBoard = gameState.board[player];

    // Board cards
    [...playerBoard.innen, ...playerBoard.aussen].forEach(card => {
      if (card && card.kind === 'pol') {
        const base = (card as any).influence || 0;
        const buffs = (card as any).tempBuffs || 0;
        const debuffs = (card as any).tempDebuffs || 0;
        totalInfluence += base + buffs - debuffs;
      }
    });

    // Permanent slots
    const permanentSlots = gameState.permanentSlots[player];
    if (permanentSlots.government && permanentSlots.government.kind === 'pol') {
      const c = permanentSlots.government as any;
      totalInfluence += (c.influence || 0) + (c.tempBuffs || 0) - (c.tempDebuffs || 0);
    }
    if (permanentSlots.public && permanentSlots.public.kind === 'pol') {
      const c = permanentSlots.public as any;
      totalInfluence += (c.influence || 0) + (c.tempBuffs || 0) - (c.tempDebuffs || 0);
    }

    return totalInfluence;
  }, [gameState]);

  const p1Influence = calculatePlayerInfluence(1);
  const p2Influence = calculatePlayerInfluence(2);

  return (
    <div className={`game-board${ useCompactHud ? ' game-board--mobile-landscape' : '' }${ useHandStrips ? ' game-board--mobile-strips' : '' }`} ref={boardRef}>
      {/* Top HUD Bar */}
      <div className={`game-board__hud game-board__hud--top${ useCompactHud ? ' game-board__hud--compact' : '' }`} style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.8) 100%)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 30px',
        zIndex: 100,
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}>
        {/* Rounds won */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', letterSpacing: '1px' }}>RUNDENSPEICHER</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: gameState.roundsWon[1] >= 1 ? '#10b981' : '#334155',
              boxShadow: gameState.roundsWon[1] >= 1 ? '0 0 10px rgba(16, 185, 129, 0.6)' : 'none',
              border: '1px solid rgba(255,255,255,0.1)',
            }} />
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: gameState.roundsWon[1] >= 2 ? '#10b981' : '#334155',
              boxShadow: gameState.roundsWon[1] >= 2 ? '0 0 10px rgba(16, 185, 129, 0.6)' : 'none',
              border: '1px solid rgba(255,255,255,0.1)',
            }} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', margin: '0 4px' }}>vs</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: gameState.roundsWon[2] >= 1 ? '#ef4444' : '#334155',
              boxShadow: gameState.roundsWon[2] >= 1 ? '0 0 10px rgba(239, 68, 68, 0.6)' : 'none',
              border: '1px solid rgba(255,255,255,0.1)',
            }} />
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: gameState.roundsWon[2] >= 2 ? '#ef4444' : '#334155',
              boxShadow: gameState.roundsWon[2] >= 2 ? '0 0 10px rgba(239, 68, 68, 0.6)' : 'none',
              border: '1px solid rgba(255,255,255,0.1)',
            }} />
          </div>
        </div>

        {/* Central scoreboard */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 700, letterSpacing: '1px' }}>{localPlayer === 1 ? 'SPIELER 1 (DU)' : 'SPIELER 1 (GEGNER)'}</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#f8fafc', textShadow: '0 0 10px rgba(16, 185, 129, 0.3)' }}>{p1Influence}</div>
          </div>
          <div style={{
            fontSize: '11px',
            fontWeight: 800,
            background: 'rgba(51, 65, 85, 0.5)',
            padding: '4px 10px',
            borderRadius: '4px',
            color: '#94a3b8',
            border: '1px solid rgba(148, 163, 184, 0.1)',
            letterSpacing: '1px',
          }}>
            EINFLUSS
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700, letterSpacing: '1px' }}>{localPlayer === 2 ? 'SPIELER 2 (DU)' : 'SPIELER 2 (GEGNER)'}</div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: '#f8fafc', textShadow: '0 0 10px rgba(239, 68, 68, 0.3)' }}>{p2Influence}</div>
          </div>
        </div>

        {/* AP display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            padding: '6px 12px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981', letterSpacing: '0.5px' }}>P1 AP</span>
            <strong style={{ fontSize: '14px', fontWeight: 800, color: '#10b981' }}>{gameState.actionPoints[1]}</strong>
          </div>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            padding: '6px 12px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', letterSpacing: '0.5px' }}>P2 AP</span>
            <strong style={{ fontSize: '14px', fontWeight: 800, color: '#ef4444' }}>{gameState.actionPoints[2]}</strong>
          </div>
        </div>
      </div>

      {/* Main Board Surface */}
      <div
        className="game-board__surface"
        style={{
          width: UI_BASE.width,
          height: UI_BASE.height,
          transform: `translate(${ transform.offsetX }px, ${ transform.offsetY }px) scale(${ transform.scale })`,
        }}
        onMouseLeave={() => onCardHover(null)}
      >
        <div
          className="game-board__background"
          style={{ backgroundImage: LAYOUT.background?.src ? `url(${ LAYOUT.background.src })` : undefined }}
        />

        {/* Side hand columns (desktop); mobile uses horizontal strips + labels below */}
        {!useHandStrips && (
          <>
            <div className="game-board__hand-panel" style={{ left: 0, top: 0, width: 224, height: 1080 }}>
              <span>{localPlayer === 1 ? 'DEINE HAND' : 'GEGNER HAND'}</span>
            </div>
            <div className="game-board__hand-panel game-board__hand-panel--opponent" style={{ left: 1696, top: 0, width: 224, height: 1080 }}>
              <span>{localPlayer === 2 ? 'DEINE HAND' : 'GEGNER HAND'}</span>
            </div>
          </>
        )}
        {useHandStrips && (
          <>
            <div className="game-board__hand-strip-label game-board__hand-strip-label--opp">
              {localPlayer === 2 ? 'DEINE HAND' : 'GEGNER HAND'}
            </div>
            <div className="game-board__hand-strip-label game-board__hand-strip-label--player">
              {localPlayer === 1 ? 'DEINE HAND' : 'GEGNER HAND'}
            </div>
          </>
        )}

        {renderRow(2, 'innen', 'Öffentlichkeit')}
        {renderRow(2, 'aussen', 'Regierung')}
        {renderPermanentSlot(2, 'government', 'Dauerhaft')}
        {renderPermanentSlot(2, 'public', 'Dauerhaft')}
        {renderInstantSlot(2)}
        {renderInterventionSlot(2)}
        {renderRow(1, 'innen', 'Öffentlichkeit')}
        {renderRow(1, 'aussen', 'Regierung')}
        {renderPermanentSlot(1, 'government', 'Dauerhaft')}
        {renderPermanentSlot(1, 'public', 'Dauerhaft')}
        {renderInstantSlot(1)}
        {renderInterventionSlot(1)}
        {renderHand(1)}
        {renderHand(2)}
      </div>

      {/* Bottom HUD Bar */}
      <div className={`game-board__hud game-board__hud--bottom${ useCompactHud ? ' game-board__hud--compact' : '' }`} style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '70px',
        background: 'linear-gradient(0deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.8) 100%)',
        borderTop: '1px solid rgba(148, 163, 184, 0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 30px',
        zIndex: 100,
        backdropFilter: 'blur(10px)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
      }}>
        {/* Turn indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: isMyTurn ? '#10b981' : '#ef4444',
            boxShadow: isMyTurn ? '0 0 10px #10b981' : '0 0 10px #ef4444',
          }} />
          <span style={{
            fontSize: '14px',
            fontWeight: 800,
            letterSpacing: '1px',
            color: isMyTurn ? '#10b981' : '#fca5a5',
            textTransform: 'uppercase',
          }}>
            {isMyTurn ? '🟢 DEIN ZUG' : '🔴 GEGNER AM ZUG'}
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => onCardClick({ type: 'button_pass_turn' })}
            disabled={!isMyTurn || gameState.passed[localPlayer]}
            style={{
              background: gameState.passed[localPlayer] ? 'rgba(51, 65, 85, 0.4)' : (isMyTurn ? 'rgba(245, 158, 11, 0.2)' : 'rgba(51, 65, 85, 0.2)'),
              color: gameState.passed[localPlayer] ? '#64748b' : (isMyTurn ? '#f59e0b' : '#94a3b8'),
              border: gameState.passed[localPlayer] ? '1px solid rgba(51, 65, 85, 0.3)' : (isMyTurn ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(148, 163, 184, 0.1)'),
              padding: '10px 24px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: (isMyTurn && !gameState.passed[localPlayer]) ? 'pointer' : 'not-allowed',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (isMyTurn && !gameState.passed[localPlayer]) {
                e.currentTarget.style.background = 'rgba(245, 158, 11, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (isMyTurn && !gameState.passed[localPlayer]) {
                e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)';
              }
            }}
          >
            {gameState.passed[localPlayer] ? 'Gepasst ✓' : 'Passen'}
          </button>

          <button
            onClick={() => onCardClick({ type: 'button_end_turn' })}
            disabled={!isMyTurn}
            style={{
              background: isMyTurn ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(51, 65, 85, 0.2)',
              color: isMyTurn ? 'white' : '#64748b',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isMyTurn ? 'pointer' : 'not-allowed',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: isMyTurn ? '0 4px 12px rgba(59, 130, 246, 0.25)' : 'none',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (isMyTurn) {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (isMyTurn) {
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            Zug beenden
          </button>
        </div>
      </div>

      {/* Collapsible Intelligence Feed — hidden on mobile (use action hint instead) */}
      <div className={`game-board__log-panel${ isLogOpen ? ' game-board__log-panel--open' : '' }`} style={{
        position: 'absolute',
        top: '80px',
        left: isLogOpen ? '0' : '-320px',
        bottom: '90px',
        width: '320px',
        background: 'rgba(15, 23, 42, 0.95)',
        borderRight: '1px solid rgba(148, 163, 184, 0.15)',
        boxShadow: '4px 0 20px rgba(0,0,0,0.5)',
        zIndex: 150,
        display: 'flex',
        flexDirection: 'column',
        transition: 'left 0.3s cubic-bezier(0.19, 1, 0.22, 1)',
        backdropFilter: 'blur(15px)',
      }}>
        {/* Toggle Tab */}
        <button
          onClick={() => setIsLogOpen(!isLogOpen)}
          style={{
            position: 'absolute',
            top: '40px',
            right: '-42px',
            width: '42px',
            height: '140px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(148, 163, 184, 0.15)',
            borderLeft: 'none',
            borderRadius: '0 8px 8px 0',
            color: '#3b82f6',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 0',
            boxShadow: '4px 0 10px rgba(0,0,0,0.2)',
            zIndex: 140,
          }}
        >
          <span style={{
            writingMode: 'vertical-lr',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            fontSize: '11px',
            fontWeight: 800,
            transform: 'rotate(180deg)',
          }}>
            {isLogOpen ? 'Schließen ◀' : 'Tactical Feed ▶'}
          </span>
        </button>

        {/* Feed Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '1px',
            color: '#e2e8f0',
            textTransform: 'uppercase',
          }}>
            📡 Intelligence Feed
          </span>
          <span style={{
            fontSize: '10px',
            background: 'rgba(59, 130, 246, 0.15)',
            color: '#3b82f6',
            padding: '2px 8px',
            borderRadius: '10px',
            fontWeight: 700,
          }}>
            LIVE
          </span>
        </div>

        {/* Feed Messages */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          fontSize: '12px',
          fontFamily: '"Courier New", Courier, monospace',
          lineHeight: '1.4',
        }}>
          {gameState.log && gameState.log.length > 0 ? (
            gameState.log.map((entry, index) => {
              // Highlight errors and warnings
              let color = '#94a3b8';
              if (entry.includes('❌') || entry.includes('ERROR')) color = '#fca5a5';
              else if (entry.includes('🟢') || entry.includes('✓') || entry.includes('gelungen')) color = '#a7f3d0';
              else if (entry.includes('🎯') || entry.includes('UI:')) color = '#cbd5e1';
              else if (entry.includes('🤖')) color = '#93c5fd';

              return (
                <div key={index} style={{
                  color,
                  borderBottom: '1px solid rgba(148, 163, 184, 0.05)',
                  paddingBottom: '8px',
                  wordBreak: 'break-word'
                }}>
                  {entry}
                </div>
              );
            })
          ) : (
            <div style={{ color: '#475569', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>
              Keine Logdaten vorhanden.
            </div>
          )}
          <div ref={logEndRef} />
        </div>
      </div>

      {corruptionPending && corruptionTargetUid && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            top: '38%',
            transform: 'translate(-50%, -50%)',
            padding: '16px 20px',
            background: 'rgba(6,10,15,0.95)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px',
            zIndex: 2000,
            color: '#e5e7eb',
            fontFamily: 'monospace',
            fontSize: '14px',
            minWidth: '300px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>Bestechungsskandal 2.0 — Ziel gewählt</div>
          <div style={{ marginBottom: '6px' }}>
            Ziel: <strong>{corruptionTargetName ?? 'Unbekannt'}</strong>
          </div>
          <div style={{ marginBottom: '12px', color: '#94a3b8' }}>
            Probe: W6 ≥ Einfluss der Karte (inkl. Oligarch-Bonus)
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={requestCorruptionRoll}
              style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Würfeln
            </button>
            <button
              type="button"
              onClick={cancelCorruption}
              style={{
                background: '#374151',
                color: 'white',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {maulwurfPending && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            top: '38%',
            transform: 'translate(-50%, -50%)',
            padding: '16px 20px',
            background: 'rgba(6,10,15,0.95)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '10px',
            zIndex: 2000,
            color: '#e5e7eb',
            fontFamily: 'monospace',
            fontSize: '14px',
            minWidth: '300px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>Maulwurf — Ziel gewählt</div>
          <div style={{ marginBottom: '6px' }}>
            Schwächste Regierungskarte: <strong>{maulwurfTargetName ?? 'Unbekannt'}</strong>
          </div>
          <div style={{ marginBottom: '12px', color: '#94a3b8' }}>
            Benötigter Wurf: W6 ≥ {maulwurfRequiredRoll ?? '?'} (2 + Anzahl gegnerischer Regierungskarten)
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={requestMaulwurfRoll}
              style={{
                background: '#2563eb',
                color: 'white',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Würfeln
            </button>
            <button
              type="button"
              onClick={cancelMaulwurf}
              style={{
                background: '#374151',
                color: 'white',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
