import { GameState, Player, Card } from '../types/game';
import { isInstantInitiative } from '../utils/tags';

// Helper: Spieler wechseln
const other = (p: Player): Player => (p === 1 ? 2 : 1) as Player;

export function recomputeAuraFlags(state: GameState) {
  for (const p of [1, 2] as const) {
    const f = state.effectFlags[p];
    f.scienceInitiativeBonus    = false; // Jennifer Doudna: +1 influence on instant initiatives
    f.healthInitiativeBonus     = false; // Anthony Fauci: +1 influence on instant initiatives
    f.cultureInitiativeBonus    = false; // Ai Weiwei: +1 card +1 AP on instant initiatives
    f.militaryInitiativePenalty = false; // Noam Chomsky: -1 influence on opponent instant initiatives
    // Movement refund is per turn; leave whatever your start-of-turn sets
    // f.govRefundAvailable is managed at turn start
  }

  for (const p of [1, 2] as const) {
    const pub = state.board[p].innen;

    const has = (name: string) =>
      pub.some(c => (c as any).name === name && !(c as any).deactivated);

    if (has('Jennifer Doudna')) state.effectFlags[p].scienceInitiativeBonus = true;
    if (has('Anthony Fauci'))   state.effectFlags[p].healthInitiativeBonus  = true;
    if (has('Ai Weiwei'))       state.effectFlags[p].cultureInitiativeBonus = true;
    if (has('Noam Chomsky'))    state.effectFlags[p === 1 ? 2 : 1].militaryInitiativePenalty = true;

    if (pub.some(c => ['Greta Thunberg','Malala Yousafzai','Ai Weiwei','Alexei Navalny']
        .includes((c as any).name) && !(c as any).deactivated)) {
      state.effectFlags[p].govRefundAvailable = true; // movement → first gov card refund
    }
  }
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

  // Jennifer Doudna: +1 Einfluss
  if (state.effectFlags[player]?.scienceInitiativeBonus) {
    influence += 1;
    reasons.push('Jennifer Doudna: +1 Einfluss');
  }

  // Anthony Fauci: +1 Einfluss
  if (state.effectFlags[player]?.healthInitiativeBonus) {
    influence += 1;
    reasons.push('Anthony Fauci: +1 Einfluss');
  }

  // Noam Chomsky: -1 Einfluss (für den Spieler mit der Aura)
  if (state.effectFlags[player]?.militaryInitiativePenalty) {
    influence -= 1;
    reasons.push('Noam Chomsky: −1 Einfluss');
  }

  return { influence, reasons };
}

/**
 * Ai Weiwei: +1 Karte +1 AP bei jeder Sofort-Initiative (AP cap bei 4)
 */
export function maybeApplyAiWeiweiInstantBonus(
  state: GameState,
  player: Player,
  card: Card,
  log: (s: string) => void
): void {
  // Nur für Sofort-Initiativen
  if (!isInstantInitiative(card)) return;

  // Nur wenn Ai Weiwei in der Öffentlichkeit ist
  if (!state.effectFlags[player]?.cultureInitiativeBonus) return;

  // +1 Karte ziehen (falls Deck nicht leer)
  const drawn = state.decks[player].shift();
  if (drawn) {
    state.hands[player].push(drawn);
    log(`🔥 Ai Weiwei: +1 Karte gezogen (${drawn.name})`);
  }

  // +1 AP (mit Cap bei 4)
  const before = state.actionPoints[player];
  state.actionPoints[player] = before + 1;

  if (before !== state.actionPoints[player]) {
    log(`🔥 Ai Weiwei: +1 AP (${before}→${state.actionPoints[player]})`);
  }
}
