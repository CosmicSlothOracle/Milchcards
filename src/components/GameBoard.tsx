import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Card, GameState, PoliticianCard } from '../types/game';
import { getCardImagePath } from '../data/gameData';
import { LEADERSHIP_STYLES } from '../data/leadershipStyles';
import { LAYOUT, UI_BASE, computeSlotRects, getGovernmentRects, getPublicRects, getSofortRect, getUiTransform, getZone } from '../ui/layout';
import { sortHandCards } from '../utils/gameUtils';
import { getCorruption } from '../utils/corruption';
import { getKl, riskColorForR, computeR } from '../utils/weighing';
import { getLeaderImageSrc } from '../utils/leaderArt';
import { canActivateLeader } from '../utils/leadership';
import { MOBILE_HUD_BOTTOM, MOBILE_HUD_TOP, useMobileLayout } from '../hooks/useMobileLayout';
import { LiveCastFeed } from './LiveCastFeed';

interface GameBoardProps {
  gameState: GameState;
  selectedHandIndex: number | null;
  onCardClick: (data: any) => void;
  onCardHover: (data: any) => void;
  devMode?: boolean;
  /** Which player this client controls (1 = host/solo, 2 = PvP guest). */
  localPlayer?: 1 | 2;
  /** Exit to main menu (rendered subtly in the bottom bar). */
  onExitToMenu?: () => void;
  /** Contextual guidance shown in the local player's live-cast. */
  guidanceHint?: { title: string; body: string } | null;
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
  onExitToMenu,
  guidanceHint = null,
}) => {
  const isMyTurn = gameState.current === localPlayer;
  const { ref: boardRef, size } = useBoardSize();
  const mobile = useMobileLayout();
  const useCompactHud = mobile.isMobile && mobile.isLandscape;
  const LIVE_CAST_GUTTER = 220;

  const leaderSelf = gameState.leaders?.[localPlayer] ?? null;
  const leaderOpp = gameState.leaders?.[localPlayer === 1 ? 2 : 1] ?? null;
  const styleSelf = leaderSelf ? LEADERSHIP_STYLES[leaderSelf.styleId] : null;
  const styleOpp = leaderOpp ? LEADERSHIP_STYLES[leaderOpp.styleId] : null;

  const leaderGate = useMemo(
    () => (leaderSelf ? canActivateLeader(gameState, localPlayer) : { ok: false as const, reason: 'Kein Anführer.' }),
    [gameState, localPlayer, leaderSelf]
  );

  const leaderImageSrc = useMemo(() => getLeaderImageSrc(leaderSelf), [leaderSelf]);
  const leaderOppImageSrc = useMemo(() => getLeaderImageSrc(leaderOpp), [leaderOpp]);

  const leaderState = useMemo(() => {
    if (!leaderSelf) return null;
    if (leaderSelf.activeUsed) return 'spent' as const;
    if (leaderGate.ok) return 'ready' as const;
    return 'wait' as const;
  }, [leaderSelf, leaderGate.ok]);

  /** Bottom HUD grows when Anführer is present so the portrait does not crush the bar. */
  const bottomHudHeight = useCompactHud
    ? (leaderSelf ? MOBILE_HUD_BOTTOM : 56)
    : (leaderSelf ? 210 : 70);

  const auditExposure = useMemo(() => {
    const kp = Number(gameState.korruptionsPegel ?? 1);
    const govs = (gameState.board[localPlayer]?.aussen || []).filter(
      c => c.kind === 'pol' && !(c as any).deactivated
    ) as PoliticianCard[];
    return govs.reduce((sum, g) => sum + Math.max(0, computeR(getKl(g), kp)), 0);
  }, [gameState, localPlayer]);

  const styleVars = useMemo(() => ({
    ['--style-p1-accent' as string]: styleSelf?.accent ?? 'var(--teal-600)',
    ['--style-p1-subtle' as string]: styleSelf?.accentSubtle ?? 'var(--teal-400)',
    ['--style-p2-accent' as string]: styleOpp?.accent ?? 'var(--mauve-600)',
    ['--style-p2-subtle' as string]: styleOpp?.accentSubtle ?? 'var(--mauve-400)',
    ['--style-accent' as string]: styleSelf?.accent ?? 'var(--teal-600)',
    ['--style-accent-subtle' as string]: styleSelf?.accentSubtle ?? 'var(--teal-400)',
  }), [styleSelf, styleOpp]);

  const transform = useMemo(() => {
    // Reserve the top HUD strip on desktop too (60px) so the board never
    // slides underneath the scoreboard — this was the main composition bug.
    const hudTop = useCompactHud ? MOBILE_HUD_TOP : 60;
    // Desktop: reserve space so Anführer stack does not cover board slots
    const hudBottom = useCompactHud
      ? MOBILE_HUD_BOTTOM
      : (gameState.leaders?.[localPlayer] ? 210 : 70);
    const playHeight = Math.max(180, size.height - hudTop - hudBottom);
    // Desktop: reserve side rails between screen edge and hand columns for live-cast
    const t = getUiTransform(size.width, playHeight, {
      sideGutter: useCompactHud ? 0 : LIVE_CAST_GUTTER,
    });
    return { ...t, offsetY: t.offsetY + hudTop };
  }, [size.height, size.width, useCompactHud, gameState.leaders, localPlayer]);
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
  const [purgeFocusUid, setPurgeFocusUid] = useState<number | null>(null);

  const pendingPurgeUid = useMemo(() => {
    // Legacy focus uid — weighing uses overlay instead of stamp sequence
    return purgeFocusUid;
  }, [purgeFocusUid]);

  /** Effective influence of a government card incl. temp buffs/debuffs. */
  const effectiveInfluence = (card: Card): number => {
    const pol = card as PoliticianCard as any;
    return (pol.influence || 0) + (pol.tempBuffs || 0) - (pol.tempDebuffs || 0);
  };

  // Per-card influence change flash (gain = surge, loss = shake)
  const prevCardInfluence = useRef<Map<number, number>>(new Map());
  const [influenceFlash, setInfluenceFlash] = useState<Map<number, 'gain' | 'loss'>>(new Map());
  const influenceFlashTimers = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    const current = new Map<number, number>();
    ([1, 2] as const).forEach((player) => {
      const slots = gameState.permanentSlots[player];
      [...gameState.board[player].aussen, ...gameState.board[player].innen, slots.government, slots.public]
        .forEach((card) => {
          if (card && card.kind === 'pol') current.set(card.uid, effectiveInfluence(card));
        });
    });

    const changed: Array<[number, 'gain' | 'loss']> = [];
    current.forEach((value, uid) => {
      const prev = prevCardInfluence.current.get(uid);
      if (prev != null && prev !== value) changed.push([uid, value > prev ? 'gain' : 'loss']);
    });

    if (changed.length) {
      setInfluenceFlash((prev) => {
        const next = new Map(prev);
        changed.forEach(([uid, dir]) => next.set(uid, dir));
        return next;
      });
      changed.forEach(([uid]) => {
        const existing = influenceFlashTimers.current.get(uid);
        if (existing) window.clearTimeout(existing);
        influenceFlashTimers.current.set(uid, window.setTimeout(() => {
          setInfluenceFlash((prev) => {
            const next = new Map(prev);
            next.delete(uid);
            return next;
          });
          influenceFlashTimers.current.delete(uid);
        }, 1300));
      });
    }
    prevCardInfluence.current = current;
  }, [gameState]);

  useEffect(() => (
    () => {
      influenceFlashTimers.current.forEach((timer) => window.clearTimeout(timer));
      influenceFlashTimers.current.clear();
    }
  ), []);

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

    const handlePurgeFocus = (event: Event) => {
      const detail = (event as CustomEvent).detail as { targetUid?: number };
      if (detail?.targetUid == null) return;
      setPurgeFocusUid(detail.targetUid);
    };
    const handlePurgeDone = () => setPurgeFocusUid(null);

    window.addEventListener('pc:purge_probe_focus', handlePurgeFocus as EventListener);
    window.addEventListener('pc:purge_sequence_done', handlePurgeDone as EventListener);
    return () => {
      window.removeEventListener('pc:corruption_roll_started', handleCorruptionRoll as EventListener);
      window.removeEventListener('pc:corruption_resolved', handleCorruptionResolved as EventListener);
      window.removeEventListener('pc:purge_probe_focus', handlePurgeFocus as EventListener);
      window.removeEventListener('pc:purge_sequence_done', handlePurgeDone as EventListener);
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
    options?: {
      selected?: boolean;
      showActivate?: boolean;
      onActivate?: () => void;
      highlight?: boolean;
      owner?: 1 | 2;
      handAccent?: boolean;
    }
  ) => {
    const spawn = recentlyPlayed.has(card.uid);
    const corrOk = corruptionSuccessUids.has(card.uid);
    const corrFail = corruptionFailUids.has(card.uid);
    const purgeFocus = pendingPurgeUid === card.uid;
    const owner = options?.owner ?? localPlayer;
    const ownerStyle = gameState.leaders?.[owner]
      ? LEADERSHIP_STYLES[gameState.leaders[owner]!.styleId]
      : null;
    const corr = card.kind === 'pol' ? getCorruption(card as PoliticianCard) : 0;
    const kl = card.kind === 'pol' ? getKl(card as PoliticianCard) : 0;
    const kp = Number(gameState.korruptionsPegel ?? 1);
    const weighingSnap = gameState.pendingWeighing?.cards.find((c) => c.uid === card.uid);
    const displayR = weighingSnap
      ? (weighingSnap.decision === 'cover' ? weighingSnap.baseR - 2 : weighingSnap.baseR)
      : card.kind === 'pol'
        ? computeR(kl, kp)
        : 0;
    const risk = card.kind === 'pol' ? riskColorForR(displayR) : 'green';
    const corrClass =
      card.kind === 'pol'
        ? corr <= 0
          ? 'game-board__card--corr-sauber'
          : corr <= 2
            ? 'game-board__card--corr-verstrickt'
            : corr <= 4
              ? 'game-board__card--corr-kompromittiert'
              : corr === 5
                ? 'game-board__card--corr-kleptokrat'
                : 'game-board__card--corr-absolut'
        : '';
    const handAccentShadow = options?.handAccent && ownerStyle
      ? `inset 3px 0 0 0 ${ownerStyle.accent}`
      : null;
    return (
      <div
        key={card.uid}
        className={[
          'game-board__card',
          options?.selected ? 'game-board__card--selected' : '',
          options?.highlight ? 'game-board__card--corruption' : '',
          spawn ? 'game-board__card--spawn' : '',
          corrOk ? 'game-board__card--corruption-success' : '',
          corrFail ? 'game-board__card--corruption-fail' : '',
          purgeFocus ? 'game-board__card--purge-focus' : '',
          options?.handAccent ? 'game-board__card--hand' : '',
          corrClass,
        ].filter(Boolean).join(' ')}
        style={{
          ...style,
          boxShadow: [
            handAccentShadow,
            card.kind === 'pol' && displayR > 0
              ? `0 6px 16px color-mix(in srgb, ${risk === 'red' ? '#ef4444' : risk === 'orange' ? '#f97316' : '#eab308'} 35%, transparent)`
              : null,
            style.boxShadow,
          ].filter(Boolean).join(', ') || undefined,
        }}
        onClick={() => onCardClick(data)}
        onMouseEnter={(event) => handleHover(card, event)}
        onMouseMove={(event) => handleHover(card, event)}
        onMouseLeave={() => handleHover(null)}
      >
        <img src={getCardImagePath(card, 'ui')} alt={card.name} />
        {card.kind === 'pol' && !options?.handAccent && (() => {
          const pol = card as PoliticianCard as any;
          const base = pol.influence || 0;
          const eff = effectiveInfluence(card);
          const delta = eff - base;
          const flash = influenceFlash.get(card.uid);
          const deactivated = Boolean(pol.deactivated);
          return (
            <span
              className={[
                'game-board__inf-pill',
                deactivated ? 'game-board__inf-pill--dead' : '',
                delta > 0 ? 'game-board__inf-pill--buffed' : delta < 0 ? 'game-board__inf-pill--debuffed' : '',
                flash === 'gain' ? 'game-board__inf-pill--gain' : flash === 'loss' ? 'game-board__inf-pill--loss' : '',
              ].filter(Boolean).join(' ')}
              title={deactivated
                ? `${card.name}: deaktiviert (0 Einfluss)`
                : delta !== 0
                  ? `Basis ${base} ${delta > 0 ? '+' : ''}${delta} durch Effekte`
                  : `Einfluss ${base}`}
            >
              {deactivated ? 0 : eff}
              {!deactivated && delta !== 0 && (
                <em>{delta > 0 ? `+${delta}` : delta}</em>
              )}
            </span>
          );
        })()}
        {card.kind === 'pol' && (
          <span
            className="game-board__audit-pill"
            style={{
              background:
                risk === 'green' ? 'rgba(34,197,94,0.85)'
                  : risk === 'yellow' ? 'rgba(234,179,8,0.9)'
                    : risk === 'orange' ? 'rgba(249,115,22,0.9)'
                      : 'rgba(239,68,68,0.9)',
            }}
            title={`Korruptionslast ${kl} · Risiko R=${displayR} (KP ${kp})`}
          >
            {gameState.pendingWeighing ? `R${displayR}` : `KL${kl}`}
          </span>
        )}
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
  };

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
        { selected, owner: player, handAccent: true },
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
    let card = (gameState.traps[player] || [])[0];
    // Schattenstaat: opponent does not see the trap (viewer-dependent)
    if (card && player !== localPlayer) {
      const ownerStyle = gameState.leaders?.[player]?.styleId;
      if (ownerStyle === 'schattenstaat') card = undefined as any;
    }

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
  const leadPlayer: 0 | 1 | 2 =
    p1Influence === p2Influence ? 0 : (p1Influence > p2Influence ? 1 : 2);
  const prevLeadRef = useRef<0 | 1 | 2>(0);
  const [leadPulse, setLeadPulse] = useState<1 | 2 | null>(null);

  useEffect(() => {
    const prev = prevLeadRef.current;
    if (leadPlayer !== 0 && leadPlayer !== prev && (p1Influence > 0 || p2Influence > 0)) {
      setLeadPulse(leadPlayer);
      try {
        const { feedbackLead } = require('../utils/feedback');
        const you = leadPlayer === localPlayer;
        feedbackLead(
          you ? 'Du führst' : `Spieler ${leadPlayer} führt`,
          `${p1Influence} : ${p2Influence} Einfluss`,
        );
      } catch { /* ignore */ }
      const t = window.setTimeout(() => setLeadPulse(null), 1600);
      prevLeadRef.current = leadPlayer;
      return () => window.clearTimeout(t);
    }
    prevLeadRef.current = leadPlayer;
  }, [leadPlayer, p1Influence, p2Influence, localPlayer]);

  // Scoreboard gain/loss animation: pulse+surge on gain, shake on loss,
  // floating delta label; big swings (|Δ| >= 3) get a lightning surge flash.
  type ScoreFx = { dir: 'gain' | 'loss'; delta: number; surge: boolean; key: number };
  const prevScoreRef = useRef<{ 1: number; 2: number } | null>(null);
  const [scoreFx, setScoreFx] = useState<{ 1: ScoreFx | null; 2: ScoreFx | null }>({ 1: null, 2: null });
  const scoreFxTimers = useRef<{ 1: number | null; 2: number | null }>({ 1: null, 2: null });

  useEffect(() => {
    const prev = prevScoreRef.current;
    prevScoreRef.current = { 1: p1Influence, 2: p2Influence };
    if (!prev) return;
    ([1, 2] as const).forEach((player) => {
      const value = player === 1 ? p1Influence : p2Influence;
      const delta = value - prev[player];
      if (delta === 0) return;
      setScoreFx((cur) => ({
        ...cur,
        [player]: {
          dir: delta > 0 ? 'gain' : 'loss',
          delta,
          surge: Math.abs(delta) >= 3,
          key: Date.now() + player,
        },
      }));
      const existing = scoreFxTimers.current[player];
      if (existing) window.clearTimeout(existing);
      scoreFxTimers.current[player] = window.setTimeout(() => {
        setScoreFx((cur) => ({ ...cur, [player]: null }));
        scoreFxTimers.current[player] = null;
      }, 1500);
    });
  }, [p1Influence, p2Influence]);

  useEffect(() => (
    () => {
      ([1, 2] as const).forEach((player) => {
        const timer = scoreFxTimers.current[player];
        if (timer) window.clearTimeout(timer);
      });
    }
  ), []);

  // Abwiegephase / both passed
  const auditDramaActive = !gameState.gameWinner && (
    gameState.pendingWeighing != null
    || (Boolean(gameState.passed[1]) && Boolean(gameState.passed[2]))
  );

  const tunnelvisionPending =
    pendingAbility?.type === 'tunnelvision_choice' || pendingAbility?.type === 'tunnelvision_probe'
      ? pendingAbility
      : null;

  const resolveTunnelvisionChoice = useCallback((choice: 'ap' | 'corruption') => {
    if (!tunnelvisionPending) return;
    window.dispatchEvent(new CustomEvent('pc:tunnelvision_choice', {
      detail: {
        player: tunnelvisionPending.actorPlayer,
        targetUid: tunnelvisionPending.targetUid,
        choice,
      },
    }));
  }, [tunnelvisionPending]);

  return (
    <div
      className={`game-board${ useCompactHud ? ' game-board--mobile-landscape' : '' }${ isMyTurn ? ' game-board--turn-active' : '' }${ gameState.passed[localPlayer] ? ' game-board--passed' : '' }`}
      ref={boardRef}
      style={styleVars as React.CSSProperties}
    >
      {/* Top HUD Bar */}
      <div className={`game-board__hud game-board__hud--top${ useCompactHud ? ' game-board__hud--compact' : '' }`} style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'linear-gradient(180deg, var(--surface-panel) 0%, var(--surface-raised) 100%)',
        borderBottom: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 30px',
        zIndex: 100,
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 20px color-mix(in srgb, var(--ink-900) 28%, transparent)',
      }}>
        {/* Rounds won + KP / PK */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--content-muted)', letterSpacing: '1px' }}>RUNDENSPEICHER</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: gameState.roundsWon[1] >= 1 ? 'var(--player-strong)' : 'var(--sand-300)',
              boxShadow: 'none',
              border: '1px solid var(--border-default)',
            }} />
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: gameState.roundsWon[1] >= 2 ? 'var(--player-strong)' : 'var(--sand-300)',
              boxShadow: 'none',
              border: '1px solid var(--border-default)',
            }} />
          </div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--content-muted)', margin: '0 4px' }}>vs</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: gameState.roundsWon[2] >= 1 ? 'var(--opponent)' : 'var(--sand-300)',
              boxShadow: 'none',
              border: '1px solid var(--border-default)',
            }} />
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: gameState.roundsWon[2] >= 2 ? 'var(--opponent)' : 'var(--sand-300)',
              boxShadow: 'none',
              border: '1px solid var(--border-default)',
            }} />
          </div>
          <div
            title="Korruptionspegel (global)"
            style={{
              marginLeft: 10,
              padding: '4px 10px',
              borderRadius: 8,
              background: 'rgba(220,38,38,0.15)',
              border: '1px solid rgba(220,38,38,0.4)',
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            KP {gameState.korruptionsPegel ?? 1}
          </div>
          <div
            title="Politisches Kapital (dein Vorrat)"
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.4)',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            PK {gameState.politicalCapital?.[localPlayer] ?? 0}
          </div>
        </div>

        {/* Central scoreboard — the focal element of the HUD */}
        <div className={`game-board__scoreboard${scoreFx[1]?.surge || scoreFx[2]?.surge ? ' game-board__scoreboard--surge' : ''}`}>
          {([1, 2] as const).map((player) => {
            const value = player === 1 ? p1Influence : p2Influence;
            const fx = scoreFx[player];
            const you = localPlayer === player;
            const accent = player === 1 ? 'var(--player-strong)' : 'var(--opponent)';
            const isLead = leadPlayer === player;
            const column = (
              <div
                key={player}
                style={{ textAlign: player === 1 ? 'right' : 'left', position: 'relative' }}
                className={leadPulse === player ? 'score-lead-pulse' : undefined}
              >
                <div style={{ fontSize: '10px', color: accent, fontWeight: 700, letterSpacing: '1px' }}>
                  {`SPIELER ${player} ${you ? '(DU)' : '(GEGNER)'}`}
                </div>
                <div
                  className={[
                    'game-board__score-value',
                    isLead ? 'game-board__score-value--lead' : '',
                    fx ? `game-board__score-value--${fx.dir}` : '',
                  ].filter(Boolean).join(' ')}
                  style={{ color: isLead ? accent : 'var(--content-primary)' }}
                >
                  {value}
                </div>
                {fx && (
                  <span
                    key={fx.key}
                    className={`game-board__score-delta game-board__score-delta--${fx.dir}`}
                    aria-hidden
                  >
                    {fx.delta > 0 ? `+${fx.delta}` : fx.delta}
                  </span>
                )}
              </div>
            );
            return player === 1
              ? [column, (
                <div key="label" style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  background: 'var(--surface-muted)',
                  padding: '4px 10px',
                  borderRadius: '4px',
                  color: 'var(--content-muted)',
                  border: '1px solid var(--border-subtle)',
                  letterSpacing: '1px',
                }}>
                  EINFLUSS
                </div>
              )]
              : column;
          })}
        </div>

        {/* AP display + opponent Anführer (read-only identity through mauve veil) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            background: 'color-mix(in srgb, var(--sage-500) 16%, transparent)',
            border: '1px solid color-mix(in srgb, var(--sage-500) 25%, transparent)',
            padding: '6px 12px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--player-strong)', letterSpacing: '0.5px' }}>P1 AP</span>
            <span className="game-board__ap-lamps" style={{ ['--lamp-color' as string]: 'var(--player-strong)' }} aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`game-board__ap-lamp${i < Math.min(gameState.actionPoints[1], 4) ? ' game-board__ap-lamp--on' : ''}`} />
              ))}
            </span>
            <strong style={{ fontSize: '14px', fontWeight: 800, color: 'var(--player-strong)' }}>{gameState.actionPoints[1]}</strong>
          </div>
          <div style={{
            background: 'var(--feedback-negative-subtle)',
            border: '1px solid var(--feedback-negative-subtle)',
            padding: '6px 12px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--feedback-negative)', letterSpacing: '0.5px' }}>P2 AP</span>
            <span className="game-board__ap-lamps" style={{ ['--lamp-color' as string]: 'var(--feedback-negative)' }} aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`game-board__ap-lamp${i < Math.min(gameState.actionPoints[2], 4) ? ' game-board__ap-lamp--on' : ''}`} />
              ))}
            </span>
            <strong style={{ fontSize: '14px', fontWeight: 800, color: 'var(--feedback-negative)' }}>{gameState.actionPoints[2]}</strong>
          </div>
          {leaderOpp && (
            <div
              className="game-board__leader game-board__leader--opponent"
              title={`Gegner: ${leaderOpp.championName} — ${LEADERSHIP_STYLES[leaderOpp.styleId]?.doctrine || ''}`}
            >
              <div
                className="game-board__leader-frame game-board__leader-frame--opponent"
                style={{ borderColor: styleOpp?.accent ?? 'var(--mauve-600)' }}
              >
                {leaderOppImageSrc ? (
                  <img className="game-board__leader-art" src={leaderOppImageSrc} alt={leaderOpp.championName} draggable={false} />
                ) : (
                  <div className="game-board__leader-fallback">{leaderOpp.championName.slice(0, 2)}</div>
                )}
                <span className={`game-board__leader-badge ${leaderOpp.activeUsed ? 'game-board__leader-badge--spent' : 'game-board__leader-badge--wait'}`}>
                  {leaderOpp.activeUsed ? 'VERBRAUCHT' : 'GEGNER'}
                </span>
              </div>
              <span className="game-board__leader-caption">{leaderOpp.championName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Board Surface */}
      <div
        className={`game-board__surface${ pendingPurgeUid ? ' game-board__surface--purge-focus' : '' }`}
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

        {/* Mirrored hand columns (player left, opponent right) — style accent per owner */}
        <div
          className="game-board__hand-panel"
          style={{
            left: 0,
            top: 0,
            width: 224,
            height: 1080,
            ['--style-accent' as string]: localPlayer === 1
              ? (styleSelf?.accent ?? 'var(--teal-600)')
              : (styleOpp?.accent ?? 'var(--mauve-600)'),
          }}
        >
          <span>{localPlayer === 1 ? 'DEINE HAND' : 'GEGNER HAND'}</span>
        </div>
        <div
          className="game-board__hand-panel game-board__hand-panel--opponent"
          style={{
            left: 1696,
            top: 0,
            width: 224,
            height: 1080,
            ['--style-accent' as string]: localPlayer === 2
              ? (styleSelf?.accent ?? 'var(--teal-600)')
              : (styleOpp?.accent ?? 'var(--mauve-600)'),
          }}
        >
          <span>{localPlayer === 2 ? 'DEINE HAND' : 'GEGNER HAND'}</span>
        </div>

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

      {!useCompactHud && !gameState.gameWinner && (() => {
        const gutterPad = 8;
        const leftW = Math.max(0, transform.offsetX - gutterPad * 2);
        const rightEdge = transform.offsetX + UI_BASE.width * transform.scale;
        const rightW = Math.max(0, size.width - rightEdge - gutterPad * 2);
        const top = transform.offsetY + 52 * transform.scale;
        const maxH = Math.max(120, UI_BASE.height * transform.scale - 100);
        // Only render rails when there is real room between screen edge and hands
        if (leftW < 96 && rightW < 96) return null;
        return (
          <>
            {leftW >= 96 && (
              <div
                className="game-board__live-cast game-board__live-cast--rail game-board__live-cast--left"
                style={{
                  left: gutterPad,
                  width: leftW,
                  top,
                  maxHeight: maxH,
                }}
              >
                <LiveCastFeed
                  side="left"
                  player={1}
                  log={gameState.log}
                  guidance={localPlayer === 1 ? guidanceHint : null}
                />
              </div>
            )}
            {rightW >= 96 && (
              <div
                className="game-board__live-cast game-board__live-cast--rail game-board__live-cast--right"
                style={{
                  left: rightEdge + gutterPad,
                  width: rightW,
                  top,
                  maxHeight: maxH,
                }}
              >
                <LiveCastFeed
                  side="right"
                  player={2}
                  log={gameState.log}
                  guidance={localPlayer === 2 ? guidanceHint : null}
                />
              </div>
            )}
          </>
        );
      })()}

      {useCompactHud && !gameState.gameWinner && (
        <div className="game-board__live-cast game-board__live-cast--mobile">
          <LiveCastFeed
            side="combined"
            player={localPlayer}
            log={gameState.log}
            guidance={guidanceHint}
            maxLines={6}
          />
        </div>
      )}

      {/* Bottom HUD Bar — taller when Anführer portrait is present */}
      <div className={`game-board__hud game-board__hud--bottom${ useCompactHud ? ' game-board__hud--compact' : '' }${ leaderSelf ? ' game-board__hud--bottom-with-leader' : '' }`} style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: bottomHudHeight,
        background: 'linear-gradient(0deg, var(--surface-panel) 0%, var(--surface-raised) 100%)',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        padding: '8px 30px 10px',
        zIndex: 100,
        backdropFilter: 'blur(10px)',
        boxShadow: '0 -4px 20px color-mix(in srgb, var(--ink-900) 28%, transparent)',
        overflow: 'visible',
      }}>
        {/* Exit + turn indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', alignSelf: 'center' }}>
          {onExitToMenu && (
            <button
              type="button"
              className="game-board__exit"
              onClick={() => {
                if (window.confirm('Möchtest du das Spiel wirklich beenden und zum Hauptmenü zurückkehren?')) {
                  onExitToMenu();
                }
              }}
            >
              Spiel beenden
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: isMyTurn ? 'var(--player-strong)' : 'var(--opponent)',
              boxShadow: 'none',
            }} />
            <span style={{
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: '1px',
              color: isMyTurn ? 'var(--player-strong)' : 'var(--opponent)',
              textTransform: 'uppercase',
            }}>
              {isMyTurn ? 'Dein Zug' : 'Gegner am Zug'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <button
            onClick={() => onCardClick({ type: 'button_pass_turn' })}
            disabled={!isMyTurn || gameState.passed[localPlayer]}
            className="game-board__pass"
            style={{
              position: 'relative',
              background: gameState.passed[localPlayer] ? 'var(--action-primary-disabled)' : (isMyTurn ? 'color-mix(in srgb, var(--amber-500) 22%, transparent)' : 'var(--surface-muted)'),
              color: gameState.passed[localPlayer] ? 'var(--content-muted)' : (isMyTurn ? 'var(--amber-700)' : 'var(--content-muted)'),
              border: gameState.passed[localPlayer] ? '1px solid var(--border-subtle)' : (isMyTurn ? '1px solid color-mix(in srgb, var(--amber-500) 40%, transparent)' : '1px solid var(--border-subtle)'),
              padding: '10px 24px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: (isMyTurn && !gameState.passed[localPlayer]) ? 'pointer' : 'not-allowed',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              transition: 'all 0.2s',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              if (isMyTurn && !gameState.passed[localPlayer]) {
                e.currentTarget.style.background = 'color-mix(in srgb, var(--amber-500) 32%, transparent)';
              }
            }}
            onMouseLeave={(e) => {
              if (isMyTurn && !gameState.passed[localPlayer]) {
                e.currentTarget.style.background = 'color-mix(in srgb, var(--amber-500) 22%, transparent)';
              }
            }}
          >
            {gameState.passed[localPlayer] ? 'Gepasst ✓' : 'Passen'}
            {/* Ambient audit exposure underline — length = board debt.
                Keyed on exposure so every change (e.g. Schweigegeld relief)
                replays the pulse animation while the width glides. */}
            {!gameState.passed[localPlayer] && auditExposure > 0 && (
              <span
                key={auditExposure}
                aria-hidden
                className="game-board__audit-underline"
                style={{ width: `${Math.min(80, 12 + auditExposure * 8)}%` }}
              />
            )}
          </button>

          {/* Anführer portrait stacked directly above Zug beenden — card asset + state cue */}
          <div className="game-board__leader-stack">
            {leaderSelf && (
              <button
                type="button"
                title={`${leaderSelf.championName}: ${leaderSelf.activeDescription}${leaderGate.ok ? '' : ` (${leaderGate.reason})`}`}
                disabled={!leaderGate.ok}
                onClick={() => onCardClick({ type: 'activate_leader', player: localPlayer })}
                className={[
                  'game-board__leader',
                  leaderState === 'spent' ? 'game-board__leader--spent' : '',
                  leaderState === 'ready' ? 'game-board__leader--ready' : '',
                  leaderState === 'wait' ? 'game-board__leader--wait' : '',
                ].filter(Boolean).join(' ')}
                aria-label={`Anführer ${leaderSelf.championName}, ${
                  leaderState === 'ready' ? 'Aktiv bereit' : leaderState === 'spent' ? 'Aktiv verbraucht' : 'Wartet'
                }`}
              >
                <div className="game-board__leader-frame">
                  {leaderImageSrc ? (
                    <img
                      className="game-board__leader-art"
                      src={leaderImageSrc}
                      alt={leaderSelf.championName}
                      draggable={false}
                    />
                  ) : (
                    <div className="game-board__leader-fallback">{leaderSelf.championName.slice(0, 2)}</div>
                  )}
                  <span className={`game-board__leader-badge game-board__leader-badge--${leaderState}`}>
                    {leaderState === 'ready' ? 'BEREIT' : leaderState === 'spent' ? 'VERBRAUCHT' : 'WARTE'}
                  </span>
                </div>
                <span className="game-board__leader-caption">{leaderSelf.championName}</span>
              </button>
            )}
            <button
              onClick={() => onCardClick({ type: 'button_end_turn' })}
              disabled={!isMyTurn}
              className="game-board__end-turn"
              style={{
                background: isMyTurn ? 'var(--action-primary)' : 'var(--surface-muted)',
                color: isMyTurn ? 'var(--content-on-action)' : 'var(--content-muted)',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isMyTurn ? 'pointer' : 'not-allowed',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                boxShadow: isMyTurn ? '0 4px 12px color-mix(in srgb, var(--teal-500) 28%, transparent)' : 'none',
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
      </div>

      {/* Intelligence Feed replaced by side LiveCast panels */}

      {corruptionPending && corruptionTargetUid && (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            top: '38%',
            transform: 'translate(-50%, -50%)',
            padding: '16px 20px',
            background: 'var(--surface-panel)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            zIndex: 2000,
            color: 'var(--content-primary)',
            fontFamily: 'monospace',
            fontSize: '14px',
            minWidth: '300px',
            boxShadow: '0 12px 40px color-mix(in srgb, var(--ink-900) 28%, transparent)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>Bestechungsskandal 2.0 — Ziel gewählt</div>
          <div style={{ marginBottom: '6px' }}>
            Ziel: <strong>{corruptionTargetName ?? 'Unbekannt'}</strong>
          </div>
          <div style={{ marginBottom: '12px', color: 'var(--content-muted)' }}>
            Probe: W6 ≥ Einfluss der Karte
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={requestCorruptionRoll}
              style={{
                background: 'var(--action-primary)',
                color: 'var(--content-on-action)',
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
                background: 'var(--border-default)',
                color: 'var(--content-on-action)',
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
            background: 'var(--surface-panel)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            zIndex: 2000,
            color: 'var(--content-primary)',
            fontFamily: 'monospace',
            fontSize: '14px',
            minWidth: '300px',
            boxShadow: '0 12px 40px color-mix(in srgb, var(--ink-900) 28%, transparent)',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: '8px' }}>Maulwurf — Ziel gewählt</div>
          <div style={{ marginBottom: '6px' }}>
            Schwächste Regierungskarte: <strong>{maulwurfTargetName ?? 'Unbekannt'}</strong>
          </div>
          <div style={{ marginBottom: '12px', color: 'var(--content-muted)' }}>
            Benötigter Wurf: W6 ≥ {maulwurfRequiredRoll ?? '?'} (3 + Anzahl gegnerischer Regierungskarten)
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={requestMaulwurfRoll}
              style={{
                background: 'var(--action-primary)',
                color: 'var(--content-on-action)',
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
                background: 'var(--border-default)',
                color: 'var(--content-on-action)',
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

      {/* Audit drama — full-screen focus once both players pass: the round is decided NOW */}
      {auditDramaActive && (
        <div className="game-board__audit-drama" aria-hidden>
          <div className="game-board__audit-drama-vignette" />
          <div className="game-board__audit-drama-flash" />
          <div className="game-board__audit-drama-banner">
            <span className="game-board__audit-drama-kicker">⚖ ABWIEGEPHASE</span>
            <span className="game-board__audit-drama-title">JETZT ENTSCHEIDET SICH DIE RUNDE</span>
            <div className="game-board__audit-drama-scores">
              <span className={`game-board__audit-drama-score${leadPlayer === 1 ? ' game-board__audit-drama-score--lead' : ''}`} style={{ color: 'var(--player-strong)' }}>
                {p1Influence}
              </span>
              <span className="game-board__audit-drama-vs">:</span>
              <span className={`game-board__audit-drama-score${leadPlayer === 2 ? ' game-board__audit-drama-score--lead' : ''}`} style={{ color: 'var(--opponent)' }}>
                {p2Influence}
              </span>
            </div>
            <span className="game-board__audit-drama-sub">
              {gameState.pendingWeighing
                ? `KP ${gameState.pendingWeighing.kpAfterRise} — Akzeptieren, Vertuschen oder Opfern`
                : leadPlayer === 0
                  ? 'Gleichstand — jede Untersuchung zählt.'
                  : `Spieler ${leadPlayer} führt — die Abwiegephase kann alles drehen.`}
            </span>
          </div>
        </div>
      )}

      {tunnelvisionPending && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--surface-overlay)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
          }}
        >
          <div
            style={{
              background: 'var(--surface-panel)',
              border: '1px solid var(--border-default)',
              borderRadius: '12px',
              padding: '18px 20px',
              color: 'var(--content-primary)',
              fontSize: '14px',
              minWidth: '320px',
              boxShadow: '0 12px 40px color-mix(in srgb, var(--ink-900) 28%, transparent)',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>Tunnelvision — Freigabe</div>
            <div style={{ marginBottom: '6px' }}>
              Einfluss: <strong>{tunnelvisionPending.influence ?? '?'}</strong>
            </div>
            <div style={{ marginBottom: '12px', color: 'var(--content-muted)' }}>
              Wähle den Preis — kein Würfel.
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => resolveTunnelvisionChoice('corruption')}
                style={{
                  background: 'var(--feedback-warning-subtle)',
                  color: 'var(--feedback-warning)',
                  border: '1px solid var(--feedback-warning)',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                +1 Korruption
              </button>
              <button
                type="button"
                onClick={() => resolveTunnelvisionChoice('ap')}
                style={{
                  background: 'var(--action-primary)',
                  color: 'var(--content-on-action)',
                  border: 'none',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                +1 AP zahlen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
