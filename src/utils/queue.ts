import { GameState, Player, EffectEvent, PoliticianCard, Card } from '../types/game';
import { getStrongestGovernment } from './targets';
import { AP_CAP, MAX_DISCOUNT, MAX_REFUND } from '../config/gameConstants';
import {
  logAP, logDiscount, logRefund, logDraw, logDiscardRandom,
  logDeactivateRandom, logBuffStrongest, logShield, logDeactivateCard,
  logInitiativeAura, logAiWeiwei, logPlattformBonus, logOpportunist
} from './logs';
import { getGlobalRNG } from '../services/rng';

function other(p: Player): Player { return p === 1 ? 2 : 1; }
function logPush(state: GameState, msg: string) { state.log.push(msg); }

function strongestGov(state: GameState, p: Player): PoliticianCard | null {
  const row = state.board[p].aussen as PoliticianCard[];
  if (!row.length) return null;
  const alive = row.filter(c => !c.deactivated);
  if (alive.length === 0) return null;
  return alive.slice().sort((a,b) => (b.influence + (b.tempBuffs||0) - (b.tempDebuffs||0)) - (a.influence + (a.tempBuffs||0) - (a.tempDebuffs||0)))[0];
}

function publicNames(state: GameState, p: Player): string[] {
  return state.board[p].innen.map(c => c.name);
}

function hasPublic(state: GameState, p: Player, name: string): boolean {
  return publicNames(state, p).includes(name);
}

function findCardByUidOnBoard(state: GameState, uid: number): Card | null {
  for (const p of [1,2] as const) {
    for (const lane of ['innen','aussen','sofort'] as const) {
      const arr = state.board[p][lane];
      const hit = arr.find(c => c.uid === uid);
      if (hit) return hit;
    }
  }
  return null;
}

export function resolveQueue(state: GameState, events: EffectEvent[]) {
  const rng = getGlobalRNG();

  // Single pass FIFO
  while (events.length) {
    const ev = events.shift()!;

    switch (ev.type) {
      case 'LOG': {
        logPush(state, ev.msg);
        break;
      }

      case 'ADD_AP': {
        const cur = state.actionPoints[ev.player];
        const next = Math.max(0, cur + ev.amount);
        state.actionPoints[ev.player] = next;
        logPush(state, logAP(ev.player, cur, next));
        break;
      }

      case 'DRAW_CARDS': {
        for (let i = 0; i < ev.amount; i++) {
          const top = state.decks[ev.player].shift();
          if (top) {
            state.hands[ev.player].push(top);
            logPush(state, logDraw(ev.player, top.name));
          }
        }
        break;
      }

      case 'DISCARD_RANDOM_FROM_HAND': {
        const hand = state.hands[ev.player];
        for (let i = 0; i < ev.amount && hand.length > 0; i++) {
          const idx = rng.randomInt(hand.length);
          const [card] = hand.splice(idx, 1);
          state.discard.push(card);
          logPush(state, logDiscardRandom(ev.player, card.name));
        }
        break;
      }

      case 'DEACTIVATE_RANDOM_HAND': {
        // Deaktivieren von Handkarten (nicht entfernen)
        const hand = state.hands[ev.player];
        const activeCards = hand.filter(c => !(c as any).deactivated);
        for (let i = 0; i < ev.amount && activeCards.length > 0; i++) {
          const card = rng.pick(activeCards);
          if (card) {
            (card as any).deactivated = true;
            logPush(state, logDeactivateRandom(ev.player, card.name));
            // Entferne aus activeCards für nächste Iteration
            const idx = activeCards.indexOf(card);
            if (idx > -1) activeCards.splice(idx, 1);
          }
        }
        break;
      }

      case 'SET_DISCOUNT': {
        // No-op: Discounts are simplified to direct AP in new system
        logPush(state, `[DEPRECATED] SET_DISCOUNT ignored - use ADD_AP instead`);
        break;
      }

      case 'REFUND_NEXT_INITIATIVE': {
        // No-op: Refunds are simplified to direct AP in new system
        logPush(state, `[DEPRECATED] REFUND_NEXT_INITIATIVE ignored - use ADD_AP instead`);
        break;
      }

      case 'GRANT_SHIELD': {
        if (!state.shields) state.shields = new Set();
        state.shields.add(ev.targetUid);
        logPush(state, logShield(ev.targetUid));
        break;
      }

      case 'DEACTIVATE_CARD': {
        const card = findCardByUidOnBoard(state, ev.targetUid);
        if (card) {
          (card as any).deactivated = true;
          logPush(state, logDeactivateCard(card.name));
        }
        break;
      }

      case 'BUFF_STRONGEST_GOV':
      case 'ADJUST_INFLUENCE': { // Alias auf BUFF_STRONGEST_GOV
        const player = ev.player;
        const amount = (ev as any).amount;
        const tgt = getStrongestGovernment(state, player);
        if (tgt) {
          if (amount >= 0) {
            (tgt as PoliticianCard).tempBuffs = ((tgt as PoliticianCard).tempBuffs || 0) + amount;
          } else {
            (tgt as PoliticianCard).tempDebuffs = ((tgt as PoliticianCard).tempDebuffs || 0) + Math.abs(amount);
          }
          logPush(state, logBuffStrongest(player, tgt.name, amount));

          // Opportunist-Spiegelung (falls aktiv beim Gegner)
          if (state.effectFlags[other(player)]?.opportunistActive && amount > 0) {
            const mirror = { type: 'BUFF_STRONGEST_GOV', player: other(player), amount } as EffectEvent;
            events.unshift(mirror);
            logPush(state, logOpportunist(other(player), amount));
          }
        }
        break;
      }

      case 'INITIATIVE_ACTIVATED': {
        const p = ev.player;
        const opp = other(p);

        // Cluster-3: temporäre Auren für Sofort-Initiativen (namenbasiert, keine Tags)
        let delta = 0;
        delta += state.effectFlags[p].initiativeInfluenceBonus || 0;                 // z.B. +1 (Doudna/Fauci)
        delta -= state.effectFlags[opp].initiativeInfluencePenaltyForOpponent || 0;  // z.B. -1 (Chomsky)

        if (delta !== 0) {
          events.unshift({ type: 'BUFF_STRONGEST_GOV', player: p, amount: delta });
          logPush(state, logInitiativeAura(p, delta));
        }

        if (state.effectFlags[p].initiativeOnPlayDraw1Ap1) {
          events.unshift({ type: 'ADD_AP', player: p, amount: 1 });
          events.unshift({ type: 'DRAW_CARDS', player: p, amount: 1 });
          logPush(state, logAiWeiwei());
        }

        // Plattform: Einmal pro Runde nach Initiative +1 AP, wenn Mark Zuckerberg liegt und nicht verbraucht
        if (hasPublic(state, p, 'Mark Zuckerberg') && !state.effectFlags[p].markZuckerbergUsed) {
          state.effectFlags[p].markZuckerbergUsed = true;
          events.unshift({ type: 'ADD_AP', player: p, amount: 1 });
          logPush(state, logPlattformBonus());
        }
        break;
      }


    }
  }
}