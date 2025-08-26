import { GameState, Player, Card, PoliticianCard } from '../types/game';
import { EffectEvent } from '../types/effects';

// Type guard for politician cards
const isPol = (c: Card): c is PoliticianCard => c && c.kind === 'pol';

// Trap type predicates
export const isBoycottTrap = (c: Card) =>
  c.kind === 'spec' && ((c as any).key === 'boykott_kampagne' || c.name === 'Boykott-Kampagne');

export const isSystemrelevant = (c: Card) =>
  c.kind === 'spec' && ((c as any).key === 'systemrelevant' || c.name === 'Systemrelevant');

// Trap trigger predicates - return true if trap should trigger
export type TrapTriggerPredicate = (target: Card) => boolean;

export const TRAP_TRIGGERS: Record<string, TrapTriggerPredicate> = {
  'boykott_kampagne': (target) => 
    target.kind === 'spec' && 
    ((target as any).type?.toLowerCase().includes('ngo') || 
     (target as any).type?.toLowerCase().includes('plattform')),
  
  'systemrelevant': (target) => 
    target.kind === 'pol' && 
    (target as PoliticianCard).influence >= 3
};

// Grant one-time protection to a card
export function grantOneTimeProtection(target: Card, log: (msg: string) => void) {
  if (isPol(target)) {
    (target as PoliticianCard).protected = true;
    log(`🛡️ ${target.name} erhält einmaligen Schutz.`);
  }
}

// Register a trap card for a player
export function registerTrap(state: GameState, p: Player, trapCard: Card, log: (msg: string) => void) {
  state.traps[p].push(trapCard);
  log(`🪤 ${trapCard.name} wird verdeckt vorbereitet.`);
}

// Check if any traps should trigger when a card is played
export function checkTraps(state: GameState, owner: Player, targetCard: Card): EffectEvent[] {
  const events: EffectEvent[] = [];
  const traps = state.traps[owner];
  if (!traps || traps.length === 0) return events;

  // Find matching traps for this target
  for (let i = 0; i < traps.length; i++) {
    const trap = traps[i];
    const trapKey = (trap as any).key || trap.name.toLowerCase().replace(/[- ]/g, '_');
    const predicate = TRAP_TRIGGERS[trapKey];
    
    if (predicate && predicate(targetCard)) {
      // Trap triggered!
      events.push({ 
        type: 'TRAP_TRIGGERED', 
        player: owner, 
        trapId: trap.uid, 
        targetId: targetCard.uid 
      });
      
      // Shield check
      if (state.shields && state.shields.has(targetCard.uid)) {
        state.shields.delete(targetCard.uid);
        events.push({ type: 'LOG', msg: `🛡️ Schutz hat ${trap.name} verhindert: ${targetCard.name}.` });
      } else {
        events.push({ type: 'DEACTIVATE_CARD', targetUid: targetCard.uid });
        events.push({ type: 'LOG', msg: `⛔ ${trap.name} deaktiviert: ${targetCard.name}.` });
      }
      
      // Remove used trap
      traps.splice(i, 1);
      i--; // Adjust index after removal
    }
  }
  
  return events;
}

// Legacy compatibility function
export function checkTrapsOnOpponentPlay(
  state: GameState, 
  owner: Player, 
  playedCardUid: number, 
  isTargetNGOorPlatform: boolean, 
  log: (m: string) => void
) {
  const traps = state.traps[owner];
  if (!traps || traps.length === 0) return;

  const targetAll = [
    ...state.board[1].innen, ...state.board[1].aussen, ...state.board[1].sofort,
    ...state.board[2].innen, ...state.board[2].aussen, ...state.board[2].sofort,
  ];
  const target = targetAll.find(c => c.uid === playedCardUid);
  if (!target) return;

  if (isTargetNGOorPlatform) {
    if (state.shields && state.shields.has(target.uid)) {
      state.shields.delete(target.uid);
      log(`🛡️ Schutz hat Boykott verhindert: ${target.name}.`);
    } else {
      if (!state._effectQueue) state._effectQueue = [];
      state._effectQueue.push({ type: 'DEACTIVATE_CARD', targetUid: target.uid });
      log(`⛔ Boykott deaktiviert: ${target.name}.`);
    }
    traps.shift();
  }
}