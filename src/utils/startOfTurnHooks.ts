import { GameState, Player } from '../types/game';

function other(p: Player): Player { return p === 1 ? 2 : 1; }

export function startOfTurn(state: GameState, p: Player) {
  // Standard-Refresh: 2 AP pro Zug
  state.actionPoints[p] = 2;
  state.actionsUsed[p] = 0;

  // Reset pro Runde
  state.effectFlags[p].initiativeDiscount = 0;
  state.effectFlags[p].initiativeRefund = 0;
  state.effectFlags[p].govRefundAvailable = false;
  state.effectFlags[p].markZuckerbergUsed = false;

  // Cluster-3: temporäre Auren (namensbasiert, gelten für Sofort-Initiativen)
  // +1 Einfluss bei Sofort-Initiativen (eigener Spieler):
  const publicNames = state.board[p].innen.map(c => c.name);
  const oppPublic   = state.board[other(p)].innen.map(c => c.name);

  // Jennifer Doudna / Anthony Fauci  → +1 kumulativ pro Karte
  const plusSources = ['Jennifer Doudna', 'Anthony Fauci'];
  const plusCount   = publicNames.filter(n => plusSources.includes(n)).length;
  state.effectFlags[p].initiativeInfluenceBonus = plusCount; // 0..2

  // Noam Chomsky → Gegner bekommt -1 (wir speichern beim Besitzer)
  state.effectFlags[p].initiativeInfluencePenaltyForOpponent =
    publicNames.includes('Noam Chomsky') ? 1 : 0;

  // Ai Weiwei → Bei Sofort-Initiative: +1 Karte +1 AP
  state.effectFlags[p].initiativeOnPlayDraw1Ap1 =
    publicNames.includes('Ai Weiwei');

  // Bewegung (Greta/Malala) → Government-Refund einmalig
  const movement = ['Greta Thunberg', 'Malala Yousafzai'];
  if (publicNames.some(n => movement.includes(n))) {
    state.effectFlags[p].govRefundAvailable = true;
  }

  // Fertig geloggt
  state.log.push(`🔄 Start Zug P${p}: Auren gesetzt (+${plusCount} | Gegner-Penalty=${state.effectFlags[p].initiativeInfluencePenaltyForOpponent})`);
}

// Legacy compatibility
export function applyStartOfTurnFlags(state: GameState, player: Player, log: (m: string) => void) {
  startOfTurn(state, player);
}

export function applyStartOfTurnHooks(state: GameState, player: Player, log: (m: string) => void) {
  applyStartOfTurnFlags(state, player, log);
}