/**
 * Reactive Öffentlichkeitskarten: while on board, steal 1 AP from the opponent
 * when they play a matching card / activate a matching initiative.
 *
 * Each public card steals at most once per its owner's turn cycle
 * (flag cleared at start of that owner's turn) to avoid AP engines.
 */

import { Card, GameState, Player } from '../types/game';
import { EffectEvent } from '../types/effects';
import {
  findActivePublicCard,
  isAiRelatedInitiativeName,
  isMediaLikeCard,
  isNgoCard,
  isOligarchCard,
  isPlatformCard,
} from './cardClassification';

function other(p: Player): Player {
  return p === 1 ? 2 : 1;
}

function ensureStealMap(state: GameState, owner: Player): Record<string, boolean> {
  const flags = state.effectFlags[owner] as any;
  if (!flags.publicApStealUsed || typeof flags.publicApStealUsed !== 'object') {
    flags.publicApStealUsed = {};
  }
  return flags.publicApStealUsed as Record<string, boolean>;
}

function canSteal(state: GameState, owner: Player, cardName: string): boolean {
  const used = ensureStealMap(state, owner);
  return !used[cardName];
}

function markStolen(state: GameState, owner: Player, cardName: string) {
  ensureStealMap(state, owner)[cardName] = true;
}

function enqueueSteal(
  enqueue: (e: EffectEvent) => void,
  from: Player,
  to: Player,
  cardName: string,
  reason: string
) {
  enqueue({
    type: 'STEAL_AP',
    from,
    to,
    amount: 1,
    source: cardName,
    reason,
  } as EffectEvent);
}

function ownerHas(state: GameState, owner: Player, name: string): boolean {
  return !!findActivePublicCard(state.board[owner]?.innen || [], name);
}

/**
 * When `actor` plays `played`, queue steals for the opponent's public auras.
 */
export function enqueuePublicApStealsOnPlay(
  state: GameState,
  actor: Player,
  played: Card,
  enqueue: (e: EffectEvent) => void
): void {
  const owner = other(actor); // public-card owner reacts to opponent plays
  const publicRow = state.board[owner]?.innen || [];
  if (!publicRow.length) return;

  const influence = played.kind === 'pol' ? Number((played as any).influence || 0) : 0;
  const typeStr = String((played as any).type || '').toLowerCase();
  const isGov = played.kind === 'pol';
  const isPublic =
    typeStr.includes('öffentlich') ||
    typeStr.includes('oeffentlich') ||
    typeStr === 'public';

  // George Soros — opponent plays Regierung with Einfluss ≥ 7
  if (isGov && influence >= 7 && ownerHas(state, owner, 'George Soros') && canSteal(state, owner, 'George Soros')) {
    markStolen(state, owner, 'George Soros');
    enqueueSteal(enqueue, actor, owner, 'George Soros', `Gegner spielt ${played.name} (Einfluss ${influence}≥7)`);
  }

  // Elon Musk — opponent plays Oligarch OR Regierung with Einfluss ≥ 7
  if (
    ownerHas(state, owner, 'Elon Musk') &&
    canSteal(state, owner, 'Elon Musk') &&
    ((isGov && influence >= 7) || (isPublic && isOligarchCard(played)))
  ) {
    markStolen(state, owner, 'Elon Musk');
    enqueueSteal(
      enqueue,
      actor,
      owner,
      'Elon Musk',
      isGov
        ? `Gegner spielt schwere Regierung (${played.name}, ${influence})`
        : `Gegner spielt Oligarch (${played.name})`
    );
  }

  // Greta Thunberg — opponent's first Regierung this turn; exposure also +1 corruption
  if (isGov && ownerHas(state, owner, 'Greta Thunberg') && canSteal(state, owner, 'Greta Thunberg')) {
    const actorFlags = state.effectFlags[actor] as any;
    if (!actorFlags.govPlayedThisTurn) {
      markStolen(state, owner, 'Greta Thunberg');
      enqueueSteal(enqueue, actor, owner, 'Greta Thunberg', `Gegner spielt erste Regierung (${played.name})`);
      enqueue({
        type: 'CHANGE_CORRUPTION',
        targetUid: (played as any).uid,
        amount: 1,
        source: 'Greta Thunberg (Exposure)',
        enemySourcePlayer: owner,
      } as EffectEvent);
    }
  }

  // Tim Cook — opponent plays Platform
  if (isPublic && isPlatformCard(played) && ownerHas(state, owner, 'Tim Cook') && canSteal(state, owner, 'Tim Cook')) {
    markStolen(state, owner, 'Tim Cook');
    enqueueSteal(enqueue, actor, owner, 'Tim Cook', `Gegner spielt Plattform (${played.name})`);
  }

  // Zhang Yiming — opponent plays Media/Platform
  if (
    isPublic &&
    (isPlatformCard(played) || isMediaLikeCard(played)) &&
    ownerHas(state, owner, 'Zhang Yiming') &&
    canSteal(state, owner, 'Zhang Yiming')
  ) {
    markStolen(state, owner, 'Zhang Yiming');
    enqueueSteal(enqueue, actor, owner, 'Zhang Yiming', `Gegner spielt Medien/Plattform (${played.name})`);
  }

  // Bill Gates — opponent plays NGO/Think-Tank (public) or Think-tank initiative
  if (
    ownerHas(state, owner, 'Bill Gates') &&
    canSteal(state, owner, 'Bill Gates') &&
    (isNgoCard(played) || played.name === 'Think-tank')
  ) {
    markStolen(state, owner, 'Bill Gates');
    enqueueSteal(enqueue, actor, owner, 'Bill Gates', `Gegner spielt NGO/Think-Tank (${played.name})`);
  }

  // Yuval Noah Harari — opponent plays Platform
  if (
    isPublic &&
    isPlatformCard(played) &&
    ownerHas(state, owner, 'Yuval Noah Harari') &&
    canSteal(state, owner, 'Yuval Noah Harari')
  ) {
    markStolen(state, owner, 'Yuval Noah Harari');
    enqueueSteal(enqueue, actor, owner, 'Yuval Noah Harari', `Gegner spielt Plattform (${played.name})`);
  }

  // Track first gov of actor's turn (for Greta gate + Buffett compatibility)
  if (isGov) {
    (state.effectFlags[actor] as any).govPlayedThisTurn = true;
  }
}

/**
 * When `actor` activates an initiative, queue steals for opponent public auras.
 */
export function enqueuePublicApStealsOnInitiative(
  state: GameState,
  actor: Player,
  initiativeName: string | undefined,
  enqueue: (e: EffectEvent) => void
): void {
  const owner = other(actor);
  const publicRow = state.board[owner]?.innen || [];
  if (!publicRow.length) return;

  // Mark Zuckerberg — opponent activates any Sofort-Initiative (once)
  if (ownerHas(state, owner, 'Mark Zuckerberg') && canSteal(state, owner, 'Mark Zuckerberg')) {
    // Soft gate: any initiative activation counts (Dauerhaft + Sofort)
    markStolen(state, owner, 'Mark Zuckerberg');
    enqueueSteal(
      enqueue,
      actor,
      owner,
      'Mark Zuckerberg',
      `Gegner aktiviert Initiative (${initiativeName || 'Initiative'})`
    );
  }

  // Ai Weiwei — opponent activates any initiative (once)
  if (ownerHas(state, owner, 'Ai Weiwei') && canSteal(state, owner, 'Ai Weiwei')) {
    markStolen(state, owner, 'Ai Weiwei');
    enqueueSteal(
      enqueue,
      actor,
      owner,
      'Ai Weiwei',
      `Gegner aktiviert Initiative (${initiativeName || 'Initiative'})`
    );
  }

  // Sam Altman — opponent activates AI-related initiative
  if (
    ownerHas(state, owner, 'Sam Altman') &&
    canSteal(state, owner, 'Sam Altman') &&
    isAiRelatedInitiativeName(initiativeName)
  ) {
    markStolen(state, owner, 'Sam Altman');
    enqueueSteal(
      enqueue,
      actor,
      owner,
      'Sam Altman',
      `Gegner aktiviert KI-Initiative (${initiativeName})`
    );
  }

  // Bill Gates — Think-tank often activates from Sofort slot (not as NGO public)
  if (
    ownerHas(state, owner, 'Bill Gates') &&
    canSteal(state, owner, 'Bill Gates') &&
    initiativeName === 'Think-tank'
  ) {
    markStolen(state, owner, 'Bill Gates');
    enqueueSteal(enqueue, actor, owner, 'Bill Gates', 'Gegner aktiviert Think-tank');
  }
}
