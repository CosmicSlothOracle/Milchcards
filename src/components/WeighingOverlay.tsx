import React, { useCallback, useEffect, useState } from 'react';
import { GameState, Player, WeighingDecision } from '../types/game';
import { getCardImagePath, Pols } from '../data/gameData';
import {
  currentWeighingRollTarget,
  getPkMax,
  removalProbability,
  removalThreshold,
  riskColorForR,
} from '../utils/weighing';

interface WeighingOverlayProps {
  gameState: GameState;
  localPlayer: Player;
  onDecision: (uid: number, decision: WeighingDecision) => void;
  onConfirm: () => void;
  onRollCard: (uid: number) => void;
}

const RISK_BG: Record<string, string> = {
  green: 'rgba(34, 197, 94, 0.25)',
  yellow: 'rgba(234, 179, 8, 0.3)',
  orange: 'rgba(249, 115, 22, 0.35)',
  red: 'rgba(239, 68, 68, 0.35)',
};

const RISK_BORDER: Record<string, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
};

function kpBarColor(kp: number): string {
  const t = Math.min(1, Math.max(0, kp / 8));
  const r = Math.round(34 + t * (220 - 34));
  const g = Math.round(197 - t * (197 - 38));
  const b = Math.round(94 - t * 94);
  return `rgb(${r},${g},${b})`;
}

export const WeighingOverlay: React.FC<WeighingOverlayProps> = ({
  gameState,
  localPlayer,
  onDecision,
  onConfirm,
  onRollCard,
}) => {
  const pending = gameState.pendingWeighing;
  const [animFace, setAnimFace] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const rollTarget = pending?.phase === 'rolling' ? currentWeighingRollTarget(gameState) : null;

  // Animate when engine announces a card result with a roll
  useEffect(() => {
    const onResult = (ev: Event) => {
      const detail = (ev as CustomEvent).detail as { roll?: number | null; uid?: number };
      if (typeof detail?.roll !== 'number') return;
      setIsAnimating(true);
      let tick = 0;
      const interval = window.setInterval(() => {
        setAnimFace(1 + Math.floor(Math.random() * 10));
        tick += 1;
        if (tick >= 10) {
          window.clearInterval(interval);
          setAnimFace(detail.roll!);
          setIsAnimating(false);
        }
      }, 60);
    };
    window.addEventListener('pc:weighing_card_result', onResult as EventListener);
    return () => window.removeEventListener('pc:weighing_card_result', onResult as EventListener);
  }, []);

  const handleRollClick = useCallback(() => {
    if (!rollTarget || isAnimating) return;
    if (rollTarget.player !== localPlayer) return;
    onRollCard(rollTarget.uid);
  }, [rollTarget, isAnimating, localPlayer, onRollCard]);

  if (!pending || pending.phase === 'done') return null;

  const kp = pending.kpAfterRise;
  const pk = gameState.politicalCapital?.[localPlayer] ?? 0;
  const pkMax = getPkMax(gameState, localPlayer);
  const confirmed = pending.confirmed[localPlayer];
  const coversUsed = pending.cards.filter(
    (c) => c.player === localPlayer && c.decision === 'cover'
  ).length;
  const pkLeft = Math.max(0, pk - coversUsed);

  const ownCards = pending.cards.filter((c) => c.player === localPlayer);
  const oppCards = pending.cards.filter((c) => c.player !== localPlayer);

  const resolveImage = (name: string) => {
    const base = Pols.find((p) => p.name === name);
    if (!base) return '';
    return getCardImagePath({ kind: 'pol', baseId: base.id }, 'ui');
  };

  const CardRow = ({
    snap,
    interactive,
  }: {
    snap: (typeof pending.cards)[0];
    interactive: boolean;
  }) => {
    const effR =
      snap.decision === 'cover' ? snap.baseR - 2 : snap.baseR;
    const color = riskColorForR(snap.effectiveR ?? effR);
    const pct = Math.round(removalProbability(snap.effectiveR ?? effR) * 100);
    const isCurrent = rollTarget?.uid === snap.uid;
    const outcome = snap.outcome;
    return (
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          padding: '10px 12px',
          borderRadius: 10,
          background: RISK_BG[color],
          border: `2px solid ${isCurrent ? '#fff' : RISK_BORDER[color]}`,
          marginBottom: 8,
          boxShadow: isCurrent ? '0 0 0 2px #dc2626' : undefined,
        }}
      >
        <img
          src={resolveImage(snap.name)}
          alt={snap.name}
          style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{snap.name}</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            KL {snap.kl} · R {snap.baseR}
            {snap.decision === 'cover' ? ` → ${effR}` : ''} · Einfluss {snap.influence}
            {(snap.effectiveR ?? effR) > 0 ? ` · Risiko ${pct}%` : ' · Sicher'}
            {snap.roll != null ? ` · W10=${snap.roll}` : ''}
            {outcome ? ` · ${outcome === 'removed' ? 'ENTFERNT' : outcome === 'safe' ? 'SICHER' : outcome.toUpperCase()}` : ''}
          </div>
          {interactive && pending.phase === 'decide' && !confirmed && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {(
                [
                  ['accept', 'Akzeptieren'],
                  ['cover', 'Vertuschen (−2 R, 1 PK)'],
                  ['sacrifice', 'Opfern (KP −1)'],
                ] as const
              ).map(([id, label]) => {
                const selected = snap.decision === id;
                const coverDisabled = id === 'cover' && !selected && pkLeft <= 0;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={coverDisabled}
                    onClick={() => onDecision(snap.uid, id)}
                    style={{
                      fontSize: 11,
                      padding: '5px 8px',
                      borderRadius: 6,
                      cursor: coverDisabled ? 'not-allowed' : 'pointer',
                      opacity: coverDisabled ? 0.4 : 1,
                      border: selected ? '2px solid var(--content-primary)' : '1px solid var(--border-default)',
                      background: selected ? 'var(--surface-raised)' : 'var(--surface-panel)',
                      color: 'var(--content-primary)',
                      fontWeight: selected ? 700 : 500,
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
          {!interactive && pending.phase === 'decide' && (
            <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>Gegnerkarte</div>
          )}
        </div>
      </div>
    );
  };

  const thr = rollTarget
    ? removalThreshold(rollTarget.effectiveR ?? rollTarget.baseR)
    : 0;
  const myTurnToRoll = Boolean(rollTarget && rollTarget.player === localPlayer);

  return (
    <div
      className="weighing-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="weighing-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1400,
        background: 'rgba(8, 10, 16, 0.82)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: 'min(920px, 100%)',
          maxHeight: '92vh',
          overflow: 'auto',
          background: 'var(--surface-panel, #1a1f2e)',
          border: '1px solid var(--border-default, #334)',
          borderRadius: 14,
          padding: '18px 20px 20px',
          color: 'var(--content-primary, #f5f5f5)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 12, letterSpacing: 2, opacity: 0.7 }}>ABWIEGEPHASE</div>
          <h2 id="weighing-title" style={{ margin: '4px 0 8px', fontSize: 22 }}>
            {pending.phase === 'rolling' ? 'Untersuchung — W10 pro Karte' : 'Untersuchung vorbereiten'}
          </h2>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            KP {pending.kpBefore} → <strong>{kp}</strong>
            {pending.phase === 'decide' && (
              <>
                {' '}· Dein PK: {pkLeft}/{pkMax}
                {pending.confirmed[localPlayer === 1 ? 2 : 1] ? ' · Gegner bereit' : ' · Warte auf Gegner…'}
              </>
            )}
          </div>
          <div
            style={{
              margin: '10px auto 0',
              height: 14,
              width: '80%',
              maxWidth: 360,
              borderRadius: 8,
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, (kp / 8) * 100)}%`,
                background: kpBarColor(kp),
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {pending.phase === 'rolling' && rollTarget && (
          <div
            style={{
              marginBottom: 16,
              padding: '16px 18px',
              borderRadius: 12,
              border: '1px solid rgba(220,38,38,0.5)',
              background: 'rgba(220,38,38,0.12)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>Aktuelle Prüfung</div>
            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{rollTarget.name}</div>
            <div style={{ fontSize: 13, marginBottom: 12 }}>
              R {rollTarget.effectiveR ?? rollTarget.baseR} · Entfernung bei W10{' '}
              <strong>1–{thr}</strong> ({Math.round((thr / 10) * 100)}%)
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 72,
                height: 72,
                borderRadius: 14,
                background: 'rgba(0,0,0,0.35)',
                border: '2px solid rgba(255,255,255,0.25)',
                fontSize: 28,
                fontWeight: 900,
                marginBottom: 12,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {animFace ?? 'W10'}
            </div>
            <div>
              {myTurnToRoll ? (
                <button
                  type="button"
                  disabled={isAnimating}
                  onClick={handleRollClick}
                  style={{
                    padding: '12px 28px',
                    fontSize: 15,
                    fontWeight: 800,
                    borderRadius: 10,
                    border: 'none',
                    cursor: isAnimating ? 'wait' : 'pointer',
                    background: '#dc2626',
                    color: '#fff',
                  }}
                >
                  {isAnimating ? 'Würfelt…' : 'W10 würfeln'}
                </button>
              ) : (
                <div style={{ fontSize: 14, opacity: 0.85 }}>
                  Gegner würfelt für {rollTarget.name}…
                </div>
              )}
            </div>
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Deine Karten</div>
            {ownCards.length === 0 && (
              <div style={{ opacity: 0.6, fontSize: 13 }}>Keine Regierungskarten</div>
            )}
            {ownCards.map((c) => (
              <CardRow key={c.uid} snap={c} interactive />
            ))}
          </div>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Gegner</div>
            {oppCards.length === 0 && (
              <div style={{ opacity: 0.6, fontSize: 13 }}>Keine Regierungskarten</div>
            )}
            {oppCards.map((c) => (
              <CardRow key={c.uid} snap={c} interactive={false} />
            ))}
          </div>
        </div>

        {pending.phase === 'decide' && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <button
              type="button"
              disabled={confirmed}
              onClick={onConfirm}
              style={{
                padding: '12px 28px',
                fontSize: 15,
                fontWeight: 800,
                borderRadius: 10,
                border: 'none',
                cursor: confirmed ? 'default' : 'pointer',
                background: confirmed ? '#475569' : '#dc2626',
                color: '#fff',
                letterSpacing: 0.5,
              }}
            >
              {confirmed ? 'Warte auf Gegner…' : 'Untersuchung einleiten'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeighingOverlay;
