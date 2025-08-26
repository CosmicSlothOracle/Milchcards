import { GameState, Player } from '../types/game';

function other(p: Player): Player { return p === 1 ? 2 : 1; }

export function startOfTurn(state: GameState, p: Player) {
  // AP reset
  state.actionPoints[p] = 2;

  // Flags reset
  const f = state.effectFlags[p];
  f.zuckOnceAp = false;
  f.zuckSpent = false;
  f.aiWeiweiOnActivate = false;
  f.auraScience = 0;
  f.auraHealth = 0;
  f.auraMilitaryPenalty = 0;

  // Auren/Boardscan
  const pubNames = (state.board[p]?.aussen ?? []).map(c => c.name);
  if (pubNames.includes('Jennifer Doudna')) f.auraScience! += 1;
  if (pubNames.includes('Anthony Fauci')) f.auraHealth! += 1;
  if (pubNames.includes('Noam Chomsky')) f.auraMilitaryPenalty! += 1;

  // einmalige Aktivierungsboni
  if (pubNames.includes('Mark Zuckerberg')) f.zuckOnceAp = true;
  if (pubNames.includes('Ai Weiwei')) f.aiWeiweiOnActivate = true;
}

// Legacy compatibility
export function applyStartOfTurnFlags(state: GameState, player: Player, log: (m: string) => void) {
  startOfTurn(state, player);
}

export function applyStartOfTurnHooks(state: GameState, player: Player, log: (m: string) => void) {
  applyStartOfTurnFlags(state, player, log);
}