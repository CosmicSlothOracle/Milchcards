import { GameState, Player, Card } from '../types/game';
import { isInstantInitiative } from '../utils/tags';

// Helper: Spieler wechseln
const other = (p: Player): Player => (p === 1 ? 2 : 1) as Player;

export function recomputeAuraFlags(state: GameState) {
  // Legacy aura flags removed - auras are now calculated on-demand via Board-Check
  // No more direct flag mutations - everything is event-driven

  // Government refund is now handled via events in the card activation flow
  // No need to pre-compute flags
}

/**
 * Wendet Einfluss-Modifikationen für Sofort-Initiativen an
 * Nur für Sofort-Initiativen, keine Topics/Tags
 */
export function applyInstantInitiativeInfluenceMods(
  state: GameState,
  player: Player,
  baseInfluence: number,
  card: Card
): { influence: number; reasons: string[] } {
  let influence = baseInfluence;
  const reasons: string[] = [];

  // Nur für Sofort-Initiativen
  if (!isInstantInitiative(card)) {
    return { influence, reasons };
  }

  // Aura effects are now calculated on-demand via Board-Check
  // No more flag-based aura calculations - everything is event-driven

  const publicCards = state.board[player]?.innen || [];

  // Jennifer Doudna: +1 Einfluss (on-demand check)
  const jenniferDoudna = publicCards.find(card =>
    card.kind === 'spec' && (card as any).name === 'Jennifer Doudna' && !(card as any).deactivated
  );
  if (jenniferDoudna) {
    influence += 1;
    reasons.push('Jennifer Doudna: +1 Einfluss');
  }

  // Anthony Fauci: +1 Einfluss (on-demand check)
  const anthonyFauci = publicCards.find(card =>
    card.kind === 'spec' && (card as any).name === 'Anthony Fauci' && !(card as any).deactivated
  );
  if (anthonyFauci) {
    influence += 1;
    reasons.push('Anthony Fauci: +1 Einfluss');
  }

  // Noam Chomsky: -1 Einfluss (on-demand check for opponent)
  const opponent = player === 1 ? 2 : 1;
  const opponentCards = state.board[opponent]?.innen || [];
  const noamChomsky = opponentCards.find(card =>
    card.kind === 'spec' && (card as any).name === 'Noam Chomsky' && !(card as any).deactivated
  );
  if (noamChomsky) {
    influence -= 1;
    reasons.push('Noam Chomsky: −1 Einfluss');
  }

  return { influence, reasons };
}

/**
 * Ai Weiwei: +1 Karte +1 AP bei jeder Sofort-Initiative (AP cap bei 4)
 * DEPRECATED: This function is no longer used - Ai Weiwei effects are now handled via INITIATIVE_ACTIVATED events
 */
export function maybeApplyAiWeiweiInstantBonus(
  state: GameState,
  player: Player,
  card: Card,
  log: (s: string) => void
): void {
  // This function is deprecated - Ai Weiwei effects are now handled via INITIATIVE_ACTIVATED events
  // No more direct state mutations - everything is event-driven
  log('DEPRECATED: Ai Weiwei effect now handled via INITIATIVE_ACTIVATED events');
}

