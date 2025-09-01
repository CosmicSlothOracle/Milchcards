import { GameState, Player } from '../types/game';

function other(p: Player): Player { return p === 1 ? 2 : 1; }

export function startOfTurn(state: GameState, p: Player) {
  // AP reset
  state.actionPoints[p] = 2;

  // Flags reset
  const f = state.effectFlags[p];
  // Flags reset
  const prevZuck = f.zuckSpent;
  f.zuckOnceAp = false;
  f.zuckSpent = false;
  f.aiWeiweiOnActivate = false;
  f.elonOnceAp = false;
  f.elonOnActivate = false;
  f.auraScience = 0;
  f.auraHealth = 0;
  f.auraMilitaryPenalty = 0;
  // Oppositionsblockade ends at start of player's turn
  f.initiativesLocked = false;
  // Simplified AP system: No initiative-specific bonuses

  // Helper to consume double aura flag once
  const consumeDouble = (): boolean => {
    if (f.doublePublicAura) {
      f.doublePublicAura = false;
      if (!state._effectQueue) state._effectQueue = [];
      state._effectQueue.push({ type: 'LOG', msg: 'Double Public Aura consumed.' } as any);
      return true;
    }
    return false;
  };

  // Determine active public cards (inner lane)
  const pubNames: string[] = (state.board[p]?.innen ?? []).map(c => c.name);

  // Apply auras via events instead of direct state mutation
  if (pubNames.includes('Jennifer Doudna')) {
    const doubled = consumeDouble();
    if (!state._effectQueue) state._effectQueue = [];
    state._effectQueue.push({ type: 'LOG', msg: `Jennifer Doudna: Science aura ${doubled ? '+2' : '+1'} activated.` } as any);
  }
  if (pubNames.includes('Anthony Fauci')) {
    const doubled = consumeDouble();
    if (!state._effectQueue) state._effectQueue = [];
    state._effectQueue.push({ type: 'LOG', msg: `Anthony Fauci: Health aura ${doubled ? '+2' : '+1'} activated.` } as any);
  }
  if (pubNames.includes('Noam Chomsky')) {
    const doubled = consumeDouble();
    if (!state._effectQueue) state._effectQueue = [];
    state._effectQueue.push({ type: 'LOG', msg: `Noam Chomsky: Military penalty aura ${doubled ? '+2' : '+1'} activated.` } as any);
  }

  // Activation bonuses via events
  if (pubNames.includes('Mark Zuckerberg')) {
    if (!state._effectQueue) state._effectQueue = [];
    state._effectQueue.push({ type: 'LOG', msg: 'Mark Zuckerberg: +1 AP on next initiative activation.' } as any);
  }
  if (pubNames.includes('Ai Weiwei')) {
    if (!state._effectQueue) state._effectQueue = [];
    state._effectQueue.push({ type: 'LOG', msg: 'Ai Weiwei: +1 card +1 AP on next initiative activation.' } as any);
  }

  // Leadership effect: +1 AP immediately
  const govNames: string[] = (state.board[p]?.aussen ?? []).map((c: any) => c.name);
  if (govNames.some(name => ['Justin Trudeau', 'Volodymyr Zelenskyy', 'Ursula von der Leyen', 'Donald Trump', 'Mohammed bin Salman', 'Benjamin Netanyahu', 'Helmut Schmidt'].includes(name))) {
    // Simplified AP system: Leadership gives +1 AP immediately
    state.actionPoints[p] += 1;
  }
}

// Legacy compatibility
export function applyStartOfTurnFlags(state: GameState, player: Player, log: (m: string) => void) {
  startOfTurn(state, player);
}

export function applyStartOfTurnHooks(state: GameState, player: Player, log: (m: string) => void) {
  applyStartOfTurnFlags(state, player, log);
}