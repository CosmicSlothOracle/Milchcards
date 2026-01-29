import { Card, GameState, Player } from '../types/game';
import { getCardActionPointCost as getCardActionPointCostFromDetails } from './cardUtils';

// AP system (2025-08-25)
// ------------------------------------------------------------
// Rules:
// 1. Base cost is 1 AP, higher tier cards may cost more (see cardDetails).
// 2. Players start every turn with 2 AP (handled in game logic).
// 3. AP effects simply ADD to the current AP via queued ADD_AP events.
// 4. There is **no upper AP cap**. Values may exceed previous MAX_AP of 4.

export const START_AP = 2;
export const MAX_AP = Number.MAX_SAFE_INTEGER; // unlimited cap used for legacy code
export const BASE_AP_COST = 1; // default cost before tier adjustments

// Cache for AP calculations to prevent redundant calls
const apCache = new Map<string, { cost: number; refund: number; net: number; reasons: string[] }>();

function getCacheKey(state: GameState, player: Player, card: Card, lane?: string): string {
  // Simplified AP system: no discounts/refunds, so cache key is simple
  return `${player}-${card.uid}-${lane}`;
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
  state: GameState,
  player: Player,
  card: Card,
  _lane?: 'innen' | 'aussen' | 'sofort'
): { cost: number; reasons: string[] } {
  const cost = getCardActionPointCostFromDetails(card, state, player);
  return { cost, reasons: [] };
}

export function getNetApCost(
  state: GameState,
  player: Player,
  card: Card,
  lane?: 'innen' | 'aussen' | 'sofort'
): { cost: number; refund: number; net: number; reasons: string[] } {
  const cost = getCardActionPointCostFromDetails(card, state, player);
  const refund = 0;
  const net = cost;

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
  // Simplified AP system: No free cards
  return false;
}

export const isInitiativeCard = isInitiative;
export const isGovernmentCard = isGovernment;
export const isNetZeroMove = wouldBeNetZero;
export const canPlayCard = (state: GameState, p: Player, card: Card): boolean => {
  // In the simplified AP system we only check that the player still has AP.
  const cost = getCardActionPointCostFromDetails(card, state, p);
  return state.actionPoints[p] >= cost;
};

export const hasGretaOnBoard = (state: GameState, p: Player) =>
  state.board[p].innen.some(
    (c) => (c as any)?.kind === 'pol' && (c as any)?.name === 'Greta Thunberg' && !(c as any)?.deactivated
  );
export const hasAnyZeroApPlay = (state: GameState, p: Player) => false; // Simplified AP system: No free cards
export function resetTurnApRefundFlags(state: GameState, p: Player) {} // Simplified AP system: No refunds
export function applyApRefundsAfterPlay(_state: GameState, _p: Player, _card: Card) {} // Simplified AP system: No refunds
