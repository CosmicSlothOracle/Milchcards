import React from 'react';
import { Player } from '../types/game';

export type StartDuelPhase = 'await_p1' | 'await_p2' | 'tie' | 'winner';

export interface StartDuelView {
  phase: StartDuelPhase;
  p1Roll: number | null;
  p2Roll: number | null;
  winner: Player | null;
  mode: 'ai' | 'pvp';
  rematch: number;
}

interface StartDuelOverlayProps {
  duel: StartDuelView;
  localPlayer?: Player;
}

function statusText(duel: StartDuelView, localPlayer: Player): string {
  switch (duel.phase) {
    case 'await_p1':
      return localPlayer === 1 ? 'Du bist dran — würfle mit dem Dice.' : 'Warte auf Spieler 1…';
    case 'await_p2':
      if (duel.mode === 'ai') return 'Gegner (KI) würfelt…';
      return localPlayer === 2 ? 'Du bist dran — würfle mit dem Dice.' : 'Warte auf Spieler 2…';
    case 'tie':
      return 'Unentschieden — nochmal würfeln!';
    case 'winner':
      return duel.winner === localPlayer
        ? 'Du beginnst die Partie!'
        : `Spieler ${duel.winner} beginnt.`;
    default:
      return '';
  }
}

export const StartDuelOverlay: React.FC<StartDuelOverlayProps> = ({
  duel,
  localPlayer = 1,
}) => {
  return (
    <div className="start-duel-overlay" role="dialog" aria-modal="true" aria-labelledby="start-duel-title">
      <div className="start-duel-overlay__card">
        <div className="start-duel-overlay__eyebrow">Spielstart</div>
        <h1 id="start-duel-title" className="start-duel-overlay__title">Startduell</h1>
        <p className="start-duel-overlay__instructions">
          Wer die höhere W6 würfelt, beginnt. Bei Gleichstand wird neu geworfen —
          bis eine Seite gewinnt. Achte auf den hervorgehobenen Würfel unten links.
        </p>

        <div className="start-duel-overlay__rolls" aria-live="polite">
          <div className={`start-duel-overlay__roll${ duel.phase === 'await_p1' ? ' start-duel-overlay__roll--active' : '' }`}>
            <span className="start-duel-overlay__roll-label">P1</span>
            <span className="start-duel-overlay__roll-face">{duel.p1Roll ?? '—'}</span>
          </div>
          <div className="start-duel-overlay__vs">vs</div>
          <div className={`start-duel-overlay__roll${ duel.phase === 'await_p2' ? ' start-duel-overlay__roll--active' : '' }`}>
            <span className="start-duel-overlay__roll-label">P2</span>
            <span className="start-duel-overlay__roll-face">{duel.p2Roll ?? '—'}</span>
          </div>
        </div>

        <p className="start-duel-overlay__status">{statusText(duel, localPlayer)}</p>
        {duel.rematch > 0 && duel.phase !== 'winner' && (
          <p className="start-duel-overlay__rematch">Unentschieden #{duel.rematch} — weiter würfeln</p>
        )}
      </div>
    </div>
  );
};
