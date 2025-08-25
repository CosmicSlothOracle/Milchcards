import { Card, GameState, Player } from '../types/game';

// Simplified AP system (2025-08-25)
// ------------------------------------------------------------
// Rules:
// 1. Each card costs exactly 1 AP to play.
// 2. Players start every turn with 2 AP (handled in game logic).
// 3. AP effects simply ADD to the current AP via queued ADD_AP events.
// 4. There is **no upper AP cap**. Values may exceed previous MAX_AP of 4.

export const START_AP = 2;
export const MAX_AP = Number.MAX_SAFE_INTEGER; // unlimited cap used for legacy code
export const BASE_AP_COST = 1; // fixed cost for every card

// Cache for AP calculations to prevent redundant calls
const apCache = new Map<string, { cost: number; refund: number; net: number; reasons: string[] }>();

function getCacheKey(state: GameState, player: Player, card: Card, lane?: string): string {
  const flags = state.effectFlags[player];
  return `${player}-${card.uid}-${lane}-${flags?.initiativeDiscount}-${flags?.initiativeRefund}-${flags?.govRefundAvailable}`;
}

function clearApCache(): void {
  apCache.clear();
}

function isInitiative(card: Card): boolean {
  const typeStr = (card as any).type ?? '';
  return card.kind === 'spec' && /Sofort-?Initiative/i.test(typeStr);
}

function isGovernment(card: Card): boolean {
  return card.kind === 'pol';
}

/**
 * Returns the (fixed) AP cost for playing a card.
 * The new simplified system ignores all discounts – those abilities should now
 * enqueue an ADD_AP event instead. We still keep the signature to avoid large
 * refactors elsewhere.
 */
export function getCardActionPointCost(
  _state: GameState,
  _player: Player,
  _card: Card,
  _lane?: 'innen' | 'aussen' | 'sofort'
): { cost: number; reasons: string[] } {
  return { cost: BASE_AP_COST, reasons: [] };
}

export function getNetApCost(
  state: GameState,
  player: Player,
  card: Card,
  lane?: 'innen' | 'aussen' | 'sofort'
): { cost: number; refund: number; net: number; reasons: string[] } {
  // The net cost is always equal to the fixed cost. Refund-style abilities
  // should enqueue ADD_AP events separately; therefore refund is **always 0**
  // here.

  const cost = BASE_AP_COST;
  const refund = 0;
  const net = cost; // always 1

  return { cost, refund, net, reasons: [] };
}

// Clear cache when game state changes significantly
export function clearApCacheOnStateChange(): void {
  clearApCache();
}

export function wouldBeNetZero(
  state: GameState,
  player: Player,
  card: Card,
  lane?: 'innen' | 'aussen' | 'sofort'
): boolean {
  return getNetApCost(state, player, card, lane).net <= 0;
}

export const isInitiativeCard = isInitiative;
export const isGovernmentCard = isGovernment;
export const isNetZeroMove = wouldBeNetZero;
export const canPlayCard = (state: GameState, p: Player, card: Card): boolean => {
  // In the simplified AP system we only check that the player still has AP.
  return state.actionPoints[p] > 0;
};

export const hasGretaOnBoard = (state: GameState, p: Player) =>
  state.board[p].innen.some(
    (c) => (c as any)?.kind === 'pol' && (c as any)?.name === 'Greta Thunberg' && !(c as any)?.deactivated
  );
export const hasAnyZeroApPlay = (state: GameState, p: Player) =>
  (state.hands[p] ?? []).some((c) => wouldBeNetZero(state, p, c));
export function resetTurnApRefundFlags(state: GameState, p: Player) {}
export function applyApRefundsAfterPlay(_state: GameState, _p: Player, _card: Card) {}