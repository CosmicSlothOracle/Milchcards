import React, { useEffect, useState } from 'react';
import { GameState } from '../types/game';

interface VictoryOverlayProps {
  gameState: GameState;
  localPlayer?: 1 | 2;
  onBackToMenu: () => void;
  onPlayAgain?: () => void;
}

interface RoundResult {
  winner: 1 | 2;
  p1Influence: number;
  p2Influence: number;
  roundsWon: { 1: number; 2: number };
  round: number;
  matchOver: boolean;
  korruptionsPegel?: number;
  purge?: {
    removed: { player: number; name: string; roll: number | null; target: number; outcome?: string }[];
    survived: { player: number; name: string; roll: number | null; target: number; outcome?: string }[];
    sacrificed?: { player: number; name: string; roll: number | null; target: number; outcome?: string }[];
    lines: string[];
  };
}

function auditLineLabel(outcome?: string): string {
  if (outcome === 'remove' || outcome === 'removed') return 'ENTFERNT';
  if (outcome === 'sacrificed') return 'GEOPFERT';
  if (outcome === 'kronzeuge') return 'KRONZEUGE';
  if (outcome === 'scandal') return 'SKANDAL';
  return 'SICHER';
}

export const VictoryOverlay: React.FC<VictoryOverlayProps> = ({
  gameState,
  localPlayer = 1,
  onBackToMenu,
  onPlayAgain,
}) => {
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);

  useEffect(() => {
    let clearTimer: number | null = null;
    const onRound = (event: Event) => {
      const detail = (event as CustomEvent<RoundResult>).detail;
      if (!detail || detail.matchOver) return;
      setRoundResult(detail);
      if (clearTimer) window.clearTimeout(clearTimer);
      // Longer if purge results need reading
      const hold = detail.purge && (detail.purge.removed.length + detail.purge.survived.length) > 0 ? 5200 : 3400;
      clearTimer = window.setTimeout(() => setRoundResult(null), hold);
    };
    window.addEventListener('pc:round_resolved', onRound as EventListener);
    return () => {
      window.removeEventListener('pc:round_resolved', onRound as EventListener);
      if (clearTimer) window.clearTimeout(clearTimer);
    };
  }, []);

  // Clear sticky round banner when match ends
  useEffect(() => {
    if (gameState.gameWinner) setRoundResult(null);
  }, [gameState.gameWinner]);

  const winner = gameState.gameWinner;
  if (winner) {
    const youWon = winner === localPlayer;
    return (
      <div className="victory-overlay" role="dialog" aria-modal="true" aria-labelledby="victory-title">
        <div className={`victory-overlay__card${ youWon ? ' victory-overlay__card--win' : ' victory-overlay__card--loss' }`}>
          <div className="victory-overlay__eyebrow">{youWon ? 'Sieg' : 'Niederlage'}</div>
          <h1 id="victory-title" className="victory-overlay__title">
            {youWon ? 'Du hast gewonnen' : `Spieler ${ winner } gewinnt`}
          </h1>
          <p className="victory-overlay__sub">
            Endstand {gameState.roundsWon[1]} : {gameState.roundsWon[2]} · Best of 3
          </p>
          <div className="victory-overlay__actions">
            {onPlayAgain && (
              <button type="button" className="victory-overlay__btn victory-overlay__btn--primary" onClick={onPlayAgain}>
                Nochmal spielen
              </button>
            )}
            <button type="button" className="victory-overlay__btn" onClick={onBackToMenu}>
              Hauptmenü
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!roundResult) return null;

  const youWonRound = roundResult.winner === localPlayer;
  return (
    <div className="round-banner" role="status">
      <div className={`round-banner__card${ youWonRound ? ' round-banner__card--win' : ' round-banner__card--loss' }`}>
        <div className="round-banner__eyebrow">Runde {roundResult.round}</div>
        <div className="round-banner__title">
          {youWonRound ? 'Runde gewonnen' : 'Runde verloren'}
        </div>
        <div className="round-banner__score">
          {roundResult.p1Influence} : {roundResult.p2Influence} Einfluss
        </div>
        <div className="round-banner__sub">
          Spielstand {roundResult.roundsWon[1]} : {roundResult.roundsWon[2]}
        </div>
        {roundResult.purge && (roundResult.purge.removed.length + roundResult.purge.survived.length + (roundResult.purge.sacrificed?.length || 0)) > 0 && (
          <div className="round-banner__sub" style={{ marginTop: 8, textAlign: 'left', fontSize: 12, lineHeight: 1.35 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              Untersuchung{roundResult.korruptionsPegel != null ? ` · KP ${roundResult.korruptionsPegel}` : ''}
            </div>
            {(roundResult.purge.sacrificed || []).map((r, i) => (
              <div key={`sac-${i}`} style={{ color: '#fb923c' }}>
                💣 {r.name} — {auditLineLabel(r.outcome)}
              </div>
            ))}
            {roundResult.purge.removed.map((r, i) => (
              <div key={`rm-${i}`} style={{ color: '#f87171' }}>
                ✗ {r.name} — R {r.target} · {auditLineLabel(r.outcome ?? 'remove')}
              </div>
            ))}
            {roundResult.purge.survived.map((r, i) => (
              <div key={`ok-${i}`} style={{ color: '#86efac' }}>
                ✓ {r.name} — R {r.target} · {auditLineLabel(r.outcome)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
