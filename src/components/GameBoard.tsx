import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Card, GameState } from '../types/game';
import { getCardImagePath } from '../data/gameData';
import { LAYOUT, UI_BASE, computeSlotRects, getGovernmentRects, getPublicRects, getSofortRect, getUiTransform, getZone } from '../ui/layout';
import { sortHandCards } from '../utils/gameUtils';

interface GameBoardProps {
  gameState: GameState;
  selectedHandIndex: number | null;
  onCardClick: (data: any) => void;
  onCardHover: (data: any) => void;
  devMode?: boolean;
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
}) => {
  const { ref: boardRef, size } = useBoardSize();
  const transform = useMemo(() => getUiTransform(size.width, size.height), [size.height, size.width]);
  const pendingAbility = (gameState as any).pendingAbilitySelect;
  const corruptionActive = pendingAbility?.type === 'corruption_steal';
  const maulwurfTargetUid = pendingAbility?.type === 'maulwurf_steal' ? pendingAbility?.targetUid : null;
  const corruptionTargetPlayer = gameState.current === 1 ? 2 : 1;
  const [recentlyPlayed, setRecentlyPlayed] = useState<Set<number>>(new Set());
  const previousBoardUids = useRef<Set<number>>(new Set());
  const removalTimers = useRef<Map<number, number>>(new Map());
  const [corruptionHold, setCorruptionHold] = useState<{ player: 1 | 2 | null }>({ player: null });
  const corruptionHoldTimer = useRef<number | null>(null);
  const [corruptionSuccessUids, setCorruptionSuccessUids] = useState<Set<number>>(new Set());
  const [corruptionFailUids, setCorruptionFailUids] = useState<Set<number>>(new Set());
  const corruptionResultTimers = useRef<Map<number, number>>(new Map());

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
      if (!card || !event) {
        onCardHover(null);
        return;
      }
      onCardHover({ card, x: event.clientX, y: event.clientY });
    },
    [onCardHover],
  );

  const renderCard = (
    card: Card,
    style: React.CSSProperties,
    data: any,
    options?: { selected?: boolean; showActivate?: boolean; onActivate?: () => void; highlight?: boolean }
  ) => (
    <div
      key={card.uid}
      className={`game-board__card${options?.selected ? ' game-board__card--selected' : ''}${options?.highlight ? ' game-board__card--corruption' : ''}${recentlyPlayed.has(card.uid) ? ' game-board__card--spawn' : ''}${corruptionSuccessUids.has(card.uid) ? ' game-board__card--corruption-success' : ''}${corruptionFailUids.has(card.uid) ? ' game-board__card--corruption-fail' : ''}`}
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
  ) => (
    <button
      key={key}
      type="button"
      className={`game-board__slot${highlight ? ' game-board__slot--corruption' : ''}`}
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
    const shouldHighlightCorruption = (
      lane === 'aussen'
      && (
        (corruptionActive && player === corruptionTargetPlayer)
        || (corruptionHold.player && player === corruptionHold.player)
      )
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
          `${player}-${lane}-${index}`,
          style,
          label,
          () => onCardClick({ type: 'row_slot', player, lane, index }),
          false,
        );
      }
      return renderCard(
        card,
        style,
        { type: 'board_card', player, lane, index, card },
        { highlight: shouldHighlightCorruption || (maulwurfTargetUid && card.uid === maulwurfTargetUid) },
      );
    });
  };

  const renderHand = (player: 1 | 2) => {
    const zone = getZone(player === 1 ? 'hand.player' : 'hand.opponent');
    const rects = computeSlotRects(zone);
    const sortedHand = sortHandCards(gameState.hands[player]);
    const isCurrent = gameState.current === player;

    return rects.map((rect, index) => {
      const style = { left: rect.x, top: rect.y, width: rect.w, height: rect.h } as React.CSSProperties;
      const card = sortedHand[index];
      if (!card) {
        return renderSlot(
          `${player}-hand-${index}`,
          style,
          player === 1 ? 'Hand' : 'Opponent',
        );
      }
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
    const zone = getZone(`slot.permanent.${type}.${player === 1 ? 'player' : 'opponent'}`);
    const rect = computeSlotRects(zone)[0];
    const style = { left: rect.x, top: rect.y, width: rect.w, height: rect.h } as React.CSSProperties;
    const card = type === 'government' ? gameState.permanentSlots[player].government : gameState.permanentSlots[player].public;
    const slotType = type === 'government' ? 'permanent_government' : 'permanent_public';

    if (!card) {
      return renderSlot(
        `${player}-permanent-${type}`,
        style,
        label,
        () => onCardClick({ type: 'empty_slot', slot: slotType, player }),
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
        `${player}-instant`,
        style,
        'Sofort',
        () => onCardClick({ type: 'empty_slot', slot: 'instant', player }),
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
    const zone = getZone(`interventions.${player === 1 ? 'player' : 'opponent'}`);
    const rect = computeSlotRects(zone)[0];
    const style = { left: rect.x, top: rect.y, width: rect.w, height: rect.h } as React.CSSProperties;
    const card = (gameState.traps[player] || [])[0];

    if (!card) {
      return renderSlot(
        `${player}-intervention`,
        style,
        'Intervention',
      );
    }
    return renderCard(card, style, { type: player === 1 ? 'trap_p1' : 'trap_p2', index: 0, card });
  };

  return (
    <div className="game-board" ref={boardRef}>
      <div
        className="game-board__surface"
        style={{
          width: UI_BASE.width,
          height: UI_BASE.height,
          transform: `translate(${transform.offsetX}px, ${transform.offsetY}px) scale(${transform.scale})`,
        }}
        onMouseLeave={() => onCardHover(null)}
      >
        <div
          className="game-board__background"
          style={{ backgroundImage: LAYOUT.background?.src ? `url(${LAYOUT.background.src})` : undefined }}
        />

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
    </div>
  );
};

export default GameBoard;
