import { Card, PoliticianCard, SpecialCard, GameState, Player, Lane, EffectQueue, EffectQueueItem, ActiveAbility, AbilitySelect } from '../types/game';
import { adjustInfluence } from './cardUtils';

export function getStrongestGovCardUid(state: GameState, player: Player): number | null {
  const row = state.board[player].aussen as PoliticianCard[];
  if (!row || row.length === 0) return null;
  const alive = row.filter(c => !c.deactivated);
  if (alive.length === 0) return null;
  const sorted = [...alive].sort((a, b) => (b.influence ?? 0) - (a.influence ?? 0));
  return sorted[0]?.uid ?? null;
}

// Effect application utilities
export function tryApplyNegativeEffect(
  target: PoliticianCard,
  effect: () => void,
  currentRound: number,
  source?: string
): boolean {
  // Check if card is protected
  if (target.protected) {
    if (target.protectedUntil === null || (target.protectedUntil ?? 0) >= currentRound) {
      console.log(`${target.name} ist geschützt vor negativen Effekten${source ? ` von ${source}` : ''}`);
      return false;
    }
  }

  // Apply the effect
  effect();
  console.log(`Negativer Effekt angewendet auf ${target.name}${source ? ` von ${source}` : ''}`);
  return true;
}

// Effect Queue Management
export class EffectQueueManager {
  private static getPriority(type: EffectQueueItem['type']): number {
    switch (type) {
      case 'intervention': return 1; // Höchste Priorität
      case 'sofort': return 2;
      case 'passiv': return 3;
      case 'aktiv': return 4; // Niedrigste Priorität
      default: return 5;
    }
  }

  static initializeQueue(): EffectQueue {
    return {
      items: [],
      processing: false,
      nextId: 1
    };
  }

  static addEffect(
    queue: EffectQueue,
    type: EffectQueueItem['type'],
    source: Card,
    effect: () => void,
    description: string,
    player: Player,
    round: number,
    target?: Card
  ): EffectQueue {
    const item: EffectQueueItem = {
      id: `effect_${queue.nextId}`,
      type,
      priority: this.getPriority(type),
      source,
      target,
      effect,
      description,
      player,
      round
    };

    const newItems = [...queue.items, item].sort((a, b) => a.priority - b.priority);

    return {
      ...queue,
      items: newItems,
      nextId: queue.nextId + 1
    };
  }

  static processQueue(
    queue: EffectQueue,
    state: GameState,
    log: (msg: string) => void
  ): [EffectQueue, GameState] {
    if (queue.processing || queue.items.length === 0) {
      return [queue, state];
    }

    const newQueue = { ...queue, processing: true };
    let newState = { ...state };

    // Process all effects in priority order
    newQueue.items.forEach(item => {
      try {
        log(`Effekt ausgeführt: ${item.description}`);
        item.effect();
      } catch (error) {
        console.error(`Fehler bei Effekt-Ausführung: ${item.description}`, error);
      }
    });

    // Clear processed effects
    const finalQueue = {
      ...newQueue,
      items: [],
      processing: false
    };

    return [finalQueue, newState];
  }
}

// Active Abilities Management
export class ActiveAbilitiesManager {
  static getAvailableAbilities(player: Player, state: GameState): ActiveAbility[] {
    const abilities: ActiveAbility[] = [];
    const board = state.board[player];
    const allCards = [...board.innen, ...board.aussen].filter(c => c.kind === 'pol') as PoliticianCard[];

    allCards.forEach(card => {
      if (card.deactivated || card._activeUsed) return;

      // Hardliner ability (Leadership cards)
      if (card.tag === 'Leadership' && !card._activeUsed) {
        abilities.push({
          id: `hardliner_${card.uid}`,
          name: 'Hardliner',
          description: 'Reduziere Einfluss einer gegnerischen Karte um 2',
          cardName: card.name,
          cooldown: 1,
          usedThisRound: card._activeUsed,
          type: 'hardliner',
          cost: 1
        });
      }

      // Oligarch influence boost
      const oligarchNames = ['Elon Musk', 'Bill Gates', 'George Soros', 'Warren Buffett', 'Mukesh Ambani', 'Jeff Bezos'];
      if (oligarchNames.includes(card.name) && !card._activeUsed) {
        abilities.push({
          id: `oligarch_${card.uid}`,
          name: 'Oligarchen-Einfluss',
          description: 'Erhöhe Einfluss einer eigenen Regierungskarte um 2',
          cardName: card.name,
          cooldown: 1,
          usedThisRound: card._activeUsed,
          type: 'oligarch_influence',
          cost: 1
        });
      }

      // Putin double intervention
      if (card.name === 'Vladimir Putin' && !card._activeUsed) {
        abilities.push({
          id: `putin_double_${card.uid}`,
          name: 'Doppelte Intervention',
          description: 'Spiele 2 Interventionen gleichzeitig',
          cardName: card.name,
          cooldown: 1,
          usedThisRound: card._activeUsed,
          type: 'putin_double_intervention',
          cost: 2
        });
      }

      // Diplomat influence transfer
      if (card.tag === 'Diplomat' && !card._activeUsed) {
        abilities.push({
          id: `diplomat_transfer_${card.uid}`,
          name: 'Einfluss-Transfer',
          description: 'Transferiere Einfluss zwischen eigenen Regierungskarten',
          cardName: card.name,
          cooldown: 1,
          usedThisRound: card._activeUsed,
          type: 'diplomat_transfer',
          cost: 0
        });
      }
    });

    return abilities;
  }

  static canUseAbility(ability: ActiveAbility, player: Player, state: GameState): boolean {
    // Check if player has enough AP
    if ((ability.cost || 0) > state.actionPoints[player]) return false;

    // Check if ability was already used this round
    if (ability.usedThisRound) return false;

    // Check if the source card is still available and not deactivated
    const board = state.board[player];
    const allCards = [...board.innen, ...board.aussen].filter(c => c.kind === 'pol') as PoliticianCard[];
    const sourceCard = allCards.find(c => ability.id.includes(c.uid.toString()));

    if (!sourceCard || sourceCard.deactivated || sourceCard._activeUsed) return false;

    return true;
  }

  static executeAbility(ability: ActiveAbility, select: AbilitySelect, state: GameState): GameState {
    const newState = { ...state };

    switch (ability.type) {
      case 'hardliner':
        if (select.targetCard) {
          tryApplyNegativeEffect(
            select.targetCard,
            () => adjustInfluence(select.targetCard!, -2, 'Hardliner'),
            state.round,
            'Hardliner'
          );
        }
        break;

      case 'oligarch_influence':
        if (select.targetCard) {
          adjustInfluence(select.targetCard, 2, 'Oligarchen-Einfluss');
        }
        break;

      case 'diplomat_transfer':
        // Handled separately in useGameEffects
        break;

      case 'putin_double_intervention':
        // Handled by executePutinDoubleIntervention
        break;
    }

    // Mark ability as used
    select.actorCard._activeUsed = true;

    // Deduct AP cost
    newState.actionPoints[select.actorPlayer] -= (ability.cost || 0);

    return newState;
  }

  static executePutinDoubleIntervention(
    state: GameState,
    player: Player,
    interventionCardIds: number[],
    log: (msg: string) => void
  ): GameState {
    const newState = { ...state };

    // Find Putin card
    const board = newState.board[player];
    const allCards = [...board.innen, ...board.aussen].filter(c => c.kind === 'pol') as PoliticianCard[];
    const putin = allCards.find(c => c.name === 'Vladimir Putin');

    if (!putin || putin.deactivated || putin._activeUsed) {
      return state;
    }

    // Find intervention cards in hand
    const hand = [...newState.hands[player]];
    const interventions = interventionCardIds.map(id =>
      hand.find(c => c.uid === id && c.kind === 'spec')
    ).filter(c => c !== undefined) as SpecialCard[];

    if (interventions.length < 2) {
      return state;
    }

    // Play both interventions to traps
    const newHand = hand.filter(c => !interventionCardIds.includes(c.uid));
    const newTraps = [...newState.traps[player], ...interventions];

    newState.hands[player] = newHand;
    newState.traps[player] = newTraps;

    // Mark Putin as used and deduct AP
    putin._activeUsed = true;
    newState.actionPoints[player] -= 2;

    log(`Putin setzt doppelte Intervention: ${interventions.map(i => i.name).join(' & ')}`);

    return newState;
  }
}

// Effect condition checking
export function hasLeadershipCard(player: Player, state: GameState): boolean {
  const gov = state.board[player].aussen;
  const names = ['Justin Trudeau'];
  return gov.some(c => c.kind === 'pol' && names.includes(c.name) && !(c as PoliticianCard).deactivated);
}

export function hasMovementCard(player: Player, state: GameState): boolean {
  const pub = state.board[player].innen;
  const names = ['Greta Thunberg', 'Malala Yousafzai', 'Ai Weiwei', 'Alexei Navalny'];
  return pub.some(c => c.kind === 'pol' && names.includes(c.name) && !(c as PoliticianCard).deactivated);
}

export function hasPlatformCard(player: Player, state: GameState): boolean {
  const pub = state.board[player].innen;
  const names = ['Mark Zuckerberg', 'Tim Cook', 'Jack Ma', 'Zhang Yiming'];
  return pub.some(c => c.kind === 'pol' && names.includes(c.name) && !(c as PoliticianCard).deactivated);
}

export function hasDiplomatCard(player: Player, state: GameState): boolean {
  const gov = state.board[player].aussen;
  const names = ['Joschka Fischer', 'Sergey Lavrov', 'Ursula von der Leyen', 'Jens Stoltenberg'];
  return gov.some(c => c.kind === 'pol' && names.includes(c.name) && !(c as PoliticianCard).deactivated);
}

export function hasInfluenceTransferBlock(player: Player, state: GameState): boolean {
  const govSlot = state.permanentSlots[player].government;
  if (!govSlot || govSlot.kind !== 'spec') return false;
  const spec = govSlot as SpecialCard;
  return ['Koalitionszwang', 'Napoleon Komplex'].includes(spec.name);
}
