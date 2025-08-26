import { GameState, Player, PoliticianCard, Card } from '../types/game';
import { EffectEvent } from '../types/effects';
import { getStrongestGovernment } from './targets';
import { AP_CAP, MAX_DISCOUNT, MAX_REFUND } from '../config/gameConstants';
import { registerTrap } from './traps';
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

      // Legacy cases - removed
      // SET_DISCOUNT and REFUND_NEXT_INITIATIVE are no longer supported
      // Use ADD_AP instead

      case 'GRANT_SHIELD': {
        if (!state.shields) state.shields = new Set();
        const targetUid = ev.targetUid || 0;
        state.shields.add(targetUid);
        logPush(state, logShield(targetUid));
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

      case 'REACTIVATE_CARD': {
        const card = findCardByUidOnBoard(state, ev.targetUid);
        if (card) {
          (card as any).deactivated = false;
          logPush(state, `🔄 ${card.name} wurde reaktiviert`);
        }
        break;
      }

      case 'RETURN_TO_HAND': {
        const card = findCardByUidOnBoard(state, ev.targetUid);
        if (card) {
          // Remove from board
          for (const p of [1, 2] as const) {
            for (const lane of ['innen', 'aussen', 'sofort'] as const) {
              const idx = state.board[p][lane].findIndex(c => c.uid === ev.targetUid);
              if (idx !== -1) {
                state.board[p][lane].splice(idx, 1);
                // Add to hand
                state.hands[ev.player].push(card);
                logPush(state, `🔄 ${card.name} wurde zur Hand zurückgegeben`);
                break;
              }
            }
          }
        }
        break;
      }

      case 'CANCEL_CARD': {
        const card = findCardByUidOnBoard(state, ev.targetUid);
        if (card) {
          // Remove from board and add to discard
          for (const p of [1, 2] as const) {
            for (const lane of ['innen', 'aussen', 'sofort'] as const) {
              const idx = state.board[p][lane].findIndex(c => c.uid === ev.targetUid);
              if (idx !== -1) {
                state.board[p][lane].splice(idx, 1);
                state.discard.push(card);
                logPush(state, `❌ ${card.name} wurde annulliert`);
                break;
              }
            }
          }
        }
        break;
      }

      case 'REGISTER_TRAP': {
        registerTrap(state, ev.player, (ev as any).key);
        logPush(state, `Trap registered: ${(ev as any).key} (P${ev.player})`);
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
        const flags = state.effectFlags[p] || {};

        if (flags.zuckOnceAp && !flags.zuckSpent) {
          events.unshift({ type: 'ADD_AP', player: p, amount: 1 } as EffectEvent);
          flags.zuckSpent = true;
          logPush(state, 'Mark Zuckerberg: +1 AP on activation (once per turn).');
        }

        if (flags.aiWeiweiOnActivate) {
          events.unshift({ type: 'DRAW_CARDS', player: p, amount: 1 } as EffectEvent);
          events.unshift({ type: 'ADD_AP', player: p, amount: 1 } as EffectEvent);
          logPush(state, 'Ai Weiwei: +1 card & +1 AP on activation.');
        }

        state.effectFlags[p] = flags;
        break;
      }



    }
  }
}