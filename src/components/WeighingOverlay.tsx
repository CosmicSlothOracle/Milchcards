import React, { useState } from 'react';
import { GameState, Player, WeighingDecision } from '../types/game';
import { getCardImagePath, Pols } from '../data/gameData';
import {
  effectiveRForDecision,
  getPkMax,
  outcomeForR,
  riskColorForR,
} from '../utils/weighing';

interface WeighingOverlayProps {
  gameState: GameState;
  localPlayer: Player;
  onDecision: (uid: number, decision: WeighingDecision) => void;
  onConfirm: () => void;
  onRollCard?: (uid: number) => void;
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

interface OutcomePreview {
  icon: string;
  text: string;
  color: string;
}

/** Plain-language preview of what happens to a card with the current decision. */
function previewForDecision(
  snap: { baseR: number; influence: number; scandalScore?: number },
  decision: WeighingDecision
): OutcomePreview {
  if (decision === 'sacrifice') {
    return {
      icon: '💣',
      text: `Wird geopfert: Karte kommt weg, dafür sinkt der Pegel um 1.`,
      color: '#94a3b8',
    };
  }
  if (decision === 'cover') {
    return {
      icon: '🛡️',
      text: `Vertuscht: Karte ist komplett sicher und zählt volle ${snap.influence} Einfluss.`,
      color: '#22c55e',
    };
  }
  const band = outcomeForR(snap.baseR);
  if (band === 'safe') {
    return {
      icon: '✅',
      text: `Sicher: Karte bleibt und zählt volle ${snap.influence} Einfluss.`,
      color: '#22c55e',
    };
  }
  if (band === 'scandal') {
    const reduced = snap.scandalScore ?? Math.max(0, snap.influence - 2);
    return {
      icon: '📰',
      text: `Skandal: Karte bleibt, zählt aber nur ${reduced} statt ${snap.influence} Einfluss.`,
      color: '#eab308',
    };
  }
  return {
    icon: '❌',
    text: `Fliegt auf: Karte wird entfernt und zählt 0 Einfluss.`,
    color: '#ef4444',
  };
}

const FINAL_OUTCOME_LABEL: Record<string, string> = {
  removed: '❌ Entfernt — zählt nicht',
  safe: '✅ Sicher — zählt voll',
  scandal: '📰 Skandal — zählt reduziert',
  sacrificed: '💣 Geopfert — Pegel −1',
  kronzeuge: '🎤 Kronzeuge — Pegel −3',
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
}) => {
  const pending = gameState.pendingWeighing;
  const [showHelp, setShowHelp] = useState(false);

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
    const effR = effectiveRForDecision(snap.baseR, snap.decision);
    const color = snap.decision === 'sacrifice' ? 'green' : riskColorForR(effR);
    const outcome = snap.outcome;
    const alreadySafe = outcomeForR(snap.baseR) === 'safe';
    const preview = previewForDecision(snap, snap.decision);
    return (
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          padding: '10px 12px',
          borderRadius: 10,
          background: RISK_BG[color],
          border: `2px solid ${RISK_BORDER[color]}`,
          marginBottom: 8,
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
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 14 }}>{snap.name}</span>
            <span
              title="Risiko = Korruptionslast der Karte minus aktueller Pegel"
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(0,0,0,0.35)',
                whiteSpace: 'nowrap',
              }}
            >
              Last {snap.kl} − Pegel {kp} = <strong>Risiko {snap.baseR}</strong>
              {snap.decision === 'cover' ? ' → 0' : ''}
            </span>
          </div>
          <div
            style={{
              fontSize: 12.5,
              marginTop: 4,
              fontWeight: 600,
              color: preview.color,
            }}
          >
            {outcome
              ? FINAL_OUTCOME_LABEL[outcome] ?? outcome.toUpperCase()
              : `${preview.icon} ${preview.text}`}
          </div>
          {interactive && pending.phase === 'decide' && !confirmed && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {(
                [
                  ['accept', 'Akzeptieren', 'Ergebnis so hinnehmen'],
                  ['cover', 'Vertuschen · 1 PK', 'Karte wird komplett sicher'],
                  ['sacrifice', 'Opfern · Pegel −1', 'Karte abwerfen, Untersuchungen werden künftig schärfer'],
                ] as const
              ).map(([id, label, hint]) => {
                const selected = snap.decision === id;
                const coverDisabled =
                  id === 'cover' && !selected && (pkLeft <= 0 || alreadySafe);
                const title = coverDisabled
                  ? alreadySafe
                    ? 'Karte ist bereits sicher — Vertuschen unnötig'
                    : 'Kein Politisches Kapital mehr übrig'
                  : hint;
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={coverDisabled}
                    title={title}
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
                    {selected ? '✔ ' : ''}{label}
                  </button>
                );
              })}
            </div>
          )}
          {!interactive && pending.phase === 'decide' && (
            <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>
              Gegnerkarte — der Gegner entscheidet selbst
            </div>
          )}
        </div>
      </div>
    );
  };

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
            Untersuchung vorbereiten
          </h2>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            Der Korruptionspegel ist von {pending.kpBefore} auf <strong>{kp}</strong> gestiegen.
            Jetzt wird geprüft, welche Regierungskarten ihre Korruption noch verbergen können.
          </div>
          {pending.phase === 'decide' && (
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
              Dein Politisches Kapital: <strong>{pkLeft}/{pkMax}</strong>
              {pending.confirmed[localPlayer === 1 ? 2 : 1]
                ? ' · Gegner ist bereit'
                : ' · Gegner überlegt noch…'}
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              flexWrap: 'wrap',
              marginTop: 8,
              fontSize: 11.5,
            }}
          >
            <span style={{ padding: '3px 9px', borderRadius: 999, background: RISK_BG.green, border: `1px solid ${RISK_BORDER.green}` }}>
              🟢 Last ≤ Pegel: sicher
            </span>
            <span style={{ padding: '3px 9px', borderRadius: 999, background: RISK_BG.yellow, border: `1px solid ${RISK_BORDER.yellow}` }}>
              🟡 1–2 drüber: Skandal, weniger Einfluss
            </span>
            <span style={{ padding: '3px 9px', borderRadius: 999, background: RISK_BG.red, border: `1px solid ${RISK_BORDER.red}` }}>
              🔴 3+ drüber: Karte entfernt
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            style={{
              marginTop: 8,
              fontSize: 12,
              padding: '4px 12px',
              borderRadius: 999,
              border: '1px solid var(--border-default, #334)',
              background: 'transparent',
              color: 'var(--content-primary, #f5f5f5)',
              cursor: 'pointer',
              opacity: 0.85,
            }}
          >
            {showHelp ? 'Erklärung ausblenden ▲' : 'Wie funktioniert das? ▼'}
          </button>
          {showHelp && (
            <div
              style={{
                margin: '10px auto 0',
                maxWidth: 640,
                textAlign: 'left',
                fontSize: 12.5,
                lineHeight: 1.55,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-default, #334)',
                borderRadius: 10,
                padding: '10px 14px',
              }}
            >
              <div style={{ marginBottom: 6 }}>
                <strong>1. Pegel steigt.</strong> Am Ende jeder Runde steigt der Korruptionspegel um 1 —
                je höher er ist, desto mehr Korruption geht ungestraft durch.
              </div>
              <div style={{ marginBottom: 6 }}>
                <strong>2. Karten werden geprüft.</strong> Jede Regierungskarte trägt eine Korruptionslast.
                Liegt sie über dem Pegel, gibt es Ärger: 1–2 drüber → Skandal (Karte bleibt, zählt weniger
                Einfluss), 3 oder mehr drüber → Karte wird entfernt.
              </div>
              <div style={{ marginBottom: 6 }}>
                <strong>3. Du entscheidest pro Karte.</strong>{' '}
                <em>Akzeptieren</em> nimmt das Ergebnis hin. <em>Vertuschen</em> kostet 1 Politisches
                Kapital und macht die Karte komplett sicher. <em>Opfern</em> wirft die Karte freiwillig ab
                und senkt den Pegel um 1 — dadurch werden alle belasteten Karten (auch die des Gegners) in
                den nächsten Runden strenger geprüft.
              </div>
              <div style={{ opacity: 0.85 }}>
                <strong>Tipp:</strong> Politisches Kapital (PK) bekommst du für übrige Aktionspunkte beim
                Passen. Spare es dir auf, um deine wichtigsten Karten zu vertuschen.
              </div>
            </div>
          )}
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
