import { GameState, Player, Card } from '../types/game';
import { isInstantInitiative } from '../utils/tags';

const other = (p: Player): Player => (p === 1 ? 2 : 1) as Player;

/**
 * Scan public boards and refresh aura flags used by hooks/UI.
 * Influence mods themselves prefer on-demand board checks.
 */
export function recomputeAuraFlags(state: GameState) {
  for (const p of [1, 2] as Player[]) {
    const flags = state.effectFlags[p];
    if (!flags) continue;
    flags.scienceInitiativeBonus = false;
    flags.healthInitiativeBonus = false;
    flags.cultureInitiativeBonus = false;
    flags.militaryInitiativePenalty = false;
    flags.auraScience = 0;
    flags.auraHealth = 0;
    flags.auraMilitaryPenalty = 0;
    flags.aiWeiweiOnActivate = false;
    flags.zuckOnceAp = false;
    flags.elonOnceAp = false;
  }

  for (const p of [1, 2] as Player[]) {
    const publicCards = state.board[p]?.innen || [];
    const active = (name: string) =>
      publicCards.some(c => c.kind === 'spec' && (c as any).name === name && !(c as any).deactivated);

    const flags = state.effectFlags[p];
    if (!flags) continue;

    if (active('Jennifer Doudna')) {
      flags.scienceInitiativeBonus = true;
      flags.auraScience = 1;
    }
    if (active('Anthony Fauci')) {
      flags.healthInitiativeBonus = true;
      flags.auraHealth = 1;
    }
    if (active('Ai Weiwei')) {
      flags.cultureInitiativeBonus = true;
      flags.aiWeiweiOnActivate = true;
    }
    if (active('Mark Zuckerberg') && !flags.markZuckerbergUsed) {
      flags.zuckOnceAp = true;
    }
    if (active('Elon Musk') && !(flags as any).elonInitiativeApUsed) {
      flags.elonOnceAp = true;
    }
    // Chomsky penalizes the OPPONENT's initiatives
    if (active('Noam Chomsky')) {
      const oppFlags = state.effectFlags[other(p)];
      if (oppFlags) {
        oppFlags.militaryInitiativePenalty = true;
        oppFlags.auraMilitaryPenalty = 1;
      }
    }
  }
}

/**
 * Wendet Einfluss-Modifikationen für Sofort-Initiativen an
 * (on-demand Board-Check, keine Flag-Abhängigkeit)
 */
export function applyInstantInitiativeInfluenceMods(
  state: GameState,
  player: Player,
  baseInfluence: number,
  card: Card
): { influence: number; reasons: string[] } {
  let influence = baseInfluence;
  const reasons: string[] = [];

  if (!isInstantInitiative(card)) {
    return { influence, reasons };
  }

  const publicCards = state.board[player]?.innen || [];

  if (publicCards.some(c => c.kind === 'spec' && (c as any).name === 'Jennifer Doudna' && !(c as any).deactivated)) {
    influence += 1;
    reasons.push('Jennifer Doudna: +1 Einfluss');
  }

  if (publicCards.some(c => c.kind === 'spec' && (c as any).name === 'Anthony Fauci' && !(c as any).deactivated)) {
    influence += 1;
    reasons.push('Anthony Fauci: +1 Einfluss');
  }

  const opponentCards = state.board[other(player)]?.innen || [];
  if (opponentCards.some(c => c.kind === 'spec' && (c as any).name === 'Noam Chomsky' && !(c as any).deactivated)) {
    influence -= 1;
    reasons.push('Noam Chomsky: −1 Einfluss');
  }

  return { influence, reasons };
}

/**
 * DEPRECATED — Ai Weiwei is handled via INITIATIVE_ACTIVATED in the queue.
 * Kept as a no-op for call-site compatibility.
 */
export function maybeApplyAiWeiweiInstantBonus(
  _state: GameState,
  _player: Player,
  _card: Card,
  _log: (s: string) => void
): void {
  // no-op
}
