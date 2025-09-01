// src/state/instantRuntime.ts
import { GameState, Player } from '../types/game';
import { isInstantInitiative, cap } from '../utils/initiative';

// influence mods for instant initiatives (Doudna/Fauci/Chomsky)
// DEPRECATED: This function is no longer used - aura effects are now calculated on-demand
export function applyInstantInfluenceMods(state: GameState, player: Player, base: number) {
  // This function is deprecated - aura effects are now calculated on-demand via Board-Check
  // No more flag-based aura calculations - everything is event-driven
  return { influence: base, reasons: [] };
}

// Ai Weiwei: +1 card +1 AP on instant initiative
// DEPRECATED: This function is no longer used - Ai Weiwei effects are now handled via INITIATIVE_ACTIVATED events
export function maybeAiWeiweiBonus(state: GameState, player: Player, log: (s: string)=>void) {
  // This function is deprecated - Ai Weiwei effects are now handled via INITIATIVE_ACTIVATED events
  // No more direct state mutations - everything is event-driven
  log('DEPRECATED: Ai Weiwei effect now handled via INITIATIVE_ACTIVATED events');
}

// activate & resolve the card that currently sits in the player's instant slot
export function activateInstantInitiative(state: GameState, player: Player, log: (s: string)=>void) {
  const slot = state.board[player].sofort; // adjust if your slot key differs
  const card = slot?.[0];
  if (!card || !isInstantInitiative(card)) return false;

  // Example: apply mods to card's base influence if you use it somewhere
  const baseInf = (card as any).influence ?? 0;
  const mod = applyInstantInfluenceMods(state, player, baseInf);
  if (mod.reasons.length) log(`Sofort-Initiative: ${mod.reasons.join(' | ')}`);

  // card-specific outcomes (example: Verzögerungsverfahren = +1 AP)
  if ((card as any).name === 'Verzögerungsverfahren') {
    const b = state.actionPoints[player];
    state.actionPoints[player] = cap(b + 1, 0, 4);
    log(`Verzögerungsverfahren: +1 AP (${b}→${state.actionPoints[player]})`);
  }

  // Ai Weiwei generic bonus on any instant initiative
  maybeAiWeiweiBonus(state, player, log);

  // discard the instant card after resolving
  state.discard.push(card);
  state.board[player].sofort = []; // clear slot
  log(`Sofort-Initiative "${card.name}" wurde aktiviert und abgelegt.`);

  return true;
}
