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
import { logger } from '../debug/logger';
import {
  consumeProtection,
  findActivePublicCard,
  isMediaLikeCard,
  isNgoCard,
  isOligarchCard,
  isPlatformCard,
  isUsGovernmentCard,
  strongestActiveGov,
} from './cardClassification';
import { enqueuePublicApStealsOnInitiative } from './publicApSteal';
import {
  activeGovs,
  applyCorruptionDelta,
  getCorruption,
  mostCorruptGov,
  strongestOwnGov,
} from './corruption';
// Helper to find strongest government uid for new intents
function strongestGovernmentUid(state: GameState, p: Player): number | null {
  const govRow = state.board[p]?.aussen as PoliticianCard[];
  if (!govRow || govRow.length === 0) return null;
  const alive = govRow.filter(g => !(g as any).deactivated);
  if (!alive.length) return null;
  const sorted = alive.slice().sort((a,b) => {
    const aInfluence = a.influence + (a.tempBuffs||0) - (a.tempDebuffs||0);
    const bInfluence = b.influence + (b.tempBuffs||0) - (b.tempDebuffs||0);
    if (bInfluence !== aInfluence) return bInfluence - aInfluence;
    return b.uid - a.uid; // Tie-break: higher UID (last played)
  });
  return sorted[0].uid;
}

function other(p: Player): Player { return p === 1 ? 2 : 1; }
function logPush(state: GameState, msg: string) { state.log.push(msg); }

function strongestGov(state: GameState, p: Player): PoliticianCard | null {
  const row = state.board[p].aussen as PoliticianCard[];
  if (!row.length) return null;
  const alive = row.filter(c => !c.deactivated);
  if (alive.length === 0) return null;
  return alive.slice().sort((a,b) => {
    const aInfluence = a.influence + (a.tempBuffs||0) - (a.tempDebuffs||0);
    const bInfluence = b.influence + (b.tempBuffs||0) - (b.tempDebuffs||0);
    if (bInfluence !== aInfluence) return bInfluence - aInfluence;
    return b.uid - a.uid; // Tie-break: higher UID (last played)
  })[0];
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

// Find the slot location for a card uid on the board
function findCardSlotByUid(state: GameState, uid: number): { player: Player; lane: string; index: number } | null {
  for (const p of [1,2] as const) {
    for (const lane of ['innen','aussen','sofort'] as const) {
      const arr = state.board[p][lane];
      const idx = arr.findIndex(c => c.uid === uid);
      if (idx !== -1) return { player: p, lane, index: idx };
    }
  }
  // check permanent slots
  const permGov = state.permanentSlots[1].government as any;
  if (permGov && permGov.uid === uid) return { player: 1, lane: 'permanent.government', index: 0 };
  const permPub = state.permanentSlots[1].public as any;
  if (permPub && permPub.uid === uid) return { player: 1, lane: 'permanent.public', index: 0 };
  const permGov2 = state.permanentSlots[2].government as any;
  if (permGov2 && permGov2.uid === uid) return { player: 2, lane: 'permanent.government', index: 0 };
  const permPub2 = state.permanentSlots[2].public as any;
  if (permPub2 && permPub2.uid === uid) return { player: 2, lane: 'permanent.public', index: 0 };
  return null;
}

export function resolveQueue(state: GameState, events: EffectEvent[]) {
  const rng = getGlobalRNG();

  // Single pass FIFO
  while (events.length) {
    const ev = events.shift()!;
    logger.dbg(`DQ ${ev.type}`, ev);
    // Capture small snapshot for delta calc
    const beforeAP = { ...state.actionPoints };

    switch (ev.type) {
      case 'LOG': {
        logPush(state, ev.msg);
        break;
      }

      case 'ADD_AP': {
        const cur = state.actionPoints[ev.player];
        const next = Math.max(0, cur + ev.amount);
        state.actionPoints[ev.player] = next;
        logger.dbg(`ADD_AP before=${cur} amount=${ev.amount} after=${state.actionPoints[ev.player]}`);

        // Trigger visual effect for AP gain
        if (ev.amount > 0) {
          events.unshift({
            type: 'VISUAL_AP_GAIN',
            player: ev.player,
            amount: ev.amount,
            color: '#ffd700', // Gelblich
            size: 24
          } as EffectEvent);
        }

        // Opportunist AP-Spiegelung (einmalig; mirrored tag verhindert Ping-Pong-Loops)
        if (
          state.effectFlags[other(ev.player)]?.opportunistActive &&
          ev.amount > 0 &&
          !(ev as any).mirrored
        ) {
          const mirror = {
            type: 'ADD_AP',
            player: other(ev.player),
            amount: ev.amount,
            mirrored: true,
          } as EffectEvent;
          events.unshift(mirror);
          logPush(state, `Opportunist: AP +${ev.amount} gespiegelt.`);
        }

        logPush(state, logAP(ev.player, cur, next));
        break;
      }

      case 'STEAL_AP': {
        const from = (ev as any).from as Player;
        const to = (ev as any).to as Player;
        const amount = Math.max(0, Number((ev as any).amount || 0));
        const avail = state.actionPoints[from] || 0;
        const stolen = Math.min(amount, avail);
        const source = (ev as any).source || 'Öffentlichkeit';
        const reason = (ev as any).reason || '';
        if (stolen <= 0) {
          logPush(state, `${source}: kein AP zum Stehlen${reason ? ` (${reason})` : ''}.`);
          break;
        }
        const toBefore = state.actionPoints[to] || 0;
        state.actionPoints[from] = avail - stolen;
        state.actionPoints[to] = toBefore + stolen;
        events.unshift({
          type: 'VISUAL_AP_GAIN',
          player: to,
          amount: stolen,
          color: '#c45c26',
          size: 26,
        } as EffectEvent);
        logPush(
          state,
          `${source}: stiehlt ${stolen} AP von P${from} → P${to}${reason ? ` — ${reason}` : ''}.`
        );
        logPush(state, logAP(from, avail, avail - stolen));
        logPush(state, logAP(to, toBefore, toBefore + stolen));
        break;
      }

      case 'DRAW_CARDS': {
        const handBefore = state.hands[ev.player].length;
        for (let i = 0; i < ev.amount; i++) {
          const top = state.decks[ev.player].shift();
          if (top) {
            state.hands[ev.player].push(top);
            logPush(state, logDraw(ev.player, top.name));
          }
        }
        const handAfter = state.hands[ev.player].length;
        logger.dbg(`DRAW_CARDS player=${ev.player} before=${handBefore} after=${handAfter}`);
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
        logger.dbg(`DEACTIVATE_RANDOM_HAND: P${ev.player} handSize=${hand.length} activeCandidates=${activeCards.length}`);
        if (activeCards.length === 0) {
          logPush(state, `Oprah: no active hand cards to deactivate for P${ev.player}`);
          break;
        }
        for (let i = 0; i < ev.amount && activeCards.length > 0; i++) {
          const card = rng.pick(activeCards);
          logger.dbg(`DEACTIVATE_RANDOM_HAND: picked=${card ? card.name : 'undefined'} for P${ev.player}`);
          if (card) {
            (card as any).deactivated = true;
            (card as any)._deactivatedBy = 'OPRAH';
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
        // Wenn kein spezifischer targetUid angegeben ist, verwende Platzhalter pro Spieler (-1 oder -2)
        const uid = ev.targetUid !== undefined ? ev.targetUid : (ev.player === 1 ? -1 : -2);
        state.shields.add(uid);
        logPush(state, logShield(uid));
        break;
      }

      case 'DEACTIVATE_CARD': {
        const card = findCardByUidOnBoard(state, ev.targetUid);
        if (card) {
          if (consumeProtection(card, state.shields as Set<number> | undefined)) {
            logPush(state, `🛡️ ${card.name} war geschützt – Deaktivierung verhindert (Schutz verbraucht).`);
            break;
          }
          (card as any).deactivated = true;
          logPush(state, logDeactivateCard(card.name));

          // Falls die Karte eine Shield-Aura ist, entferne Spielerschilde
          if ((card as any).effectKey === 'init.intelligence_liaison.shield_aura') {
            if (state.shields) {
              const placeholder = ev.player === 1 ? -1 : -2;
              state.shields.delete(placeholder);
            }
          }
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

      case 'REMOVE_OTHER_OLIGARCHS': {
        // Balance: only remove opponent oligarchs (not both boards / self)
        const actor = (ev as any).player as Player;
        const victim = other(actor);
        const oligarchNames = ['Elon Musk', 'Bill Gates', 'George Soros', 'Warren Buffett', 'Mukesh Ambani', 'Jeff Bezos', 'Alisher Usmanov', 'Gautam Adani', 'Jack Ma', 'Zhang Yiming', 'Roman Abramovich'];
        let removedCount = 0;

        for (const lane of ['innen', 'aussen', 'sofort'] as const) {
          const cards = state.board[victim][lane];
          for (let i = cards.length - 1; i >= 0; i--) {
            const card = cards[i];
            if (oligarchNames.includes(card.name) && card.name !== 'Jeff Bezos') {
              const removedCard = cards.splice(i, 1)[0];
              state.discard.push(removedCard);
              removedCount++;
              logPush(state, `🗑️ ${removedCard.name} wurde von Jeff Bezos entfernt`);
            }
          }
        }

        if (removedCount > 0) {
          logPush(state, `🔥 Jeff Bezos hat ${removedCount} gegnerische Oligarchen entfernt`);
          // Fallout: victim's strongest gov +1 corruption per removed oligarch (capped at +2)
          const fallout = Math.min(2, removedCount);
          const strong = strongestOwnGov(state, victim);
          if (strong) {
            events.unshift({
              type: 'CHANGE_CORRUPTION',
              targetUid: strong.uid,
              amount: fallout,
              source: 'Jeff Bezos (Oligarchen-Fallout)',
              enemySourcePlayer: actor,
            } as EffectEvent);
          }
        } else {
          logPush(state, `ℹ️ Jeff Bezos: Keine gegnerischen Oligarchen auf dem Spielfeld gefunden`);
        }
        break;
      }

      case 'REGISTER_TRAP': {
        registerTrap(state, ev.player, (ev as any).key);
        logPush(state, `Trap registered: ${(ev as any).key} (P${ev.player})`);
        break;
      }

      // UI-only event: instruct frontend to play hit animation on a specific slot
      case 'UI_TRIGGER_HIT_ANIM': {
        // UI signal: play hit animation on the given slot. Do not mutate game state.
        // Preferred local handling: push into VisualEffectsContext.playAnimsRef so the canvas picks it up.
        try {
          const ply = ev.player as Player;
          const lane = (ev as any).lane as string;
          const index = (ev as any).index as number;
          const key = `hit:${ply}.${lane}.${index}`;
          if (typeof window !== 'undefined' && (window as any).__pc_visual_effects && (window as any).__pc_visual_effects.playAnimsRef) {
            const now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
            try { (window as any).__pc_visual_effects.playAnimsRef.current.push({ uid: key, started: now, duration: 25 * 30 }); } catch (e) {}
          } else if (typeof window !== 'undefined' && (window as any).dispatchEvent) {
            // fallback: dispatch DOM event for legacy listeners
            const detail = { player: ply, lane, index };
            try { window.dispatchEvent(new CustomEvent('pc:ui_trigger_hit_anim', { detail })); } catch (e) {}
          }
        } catch (e) {}
        break;
      }

      case 'BUFF_STRONGEST_GOV':
      case 'ADJUST_INFLUENCE': { // Alias auf BUFF_STRONGEST_GOV
        const player = ev.player;
        let amount = (ev as any).amount;
        const reason = (ev as any).reason as string | undefined;

        // Special intent: Oprah media buff - compute amount based on media cards on own board
        if (reason === 'OPRAH_MEDIA_BUFF_INTENT') {
          const ownBoard = [
            ...state.board[player].innen,
            ...state.board[player].aussen,
          ];
          const cd = require('../data/cardDetails') as any;
          const mediaNames = ['Oprah Winfrey', 'Mark Zuckerberg', 'Tim Cook', 'Sam Altman'];
          const mediaCount = ownBoard.filter(c => {
            const sub = cd.getCardDetails?.(c.name)?.subcategories as string[] | undefined;
            const legacy = (c as any).tag === 'Media' || (c as any).tag === 'Medien';
            return (Array.isArray(sub) && sub.includes('Medien')) || legacy || mediaNames.includes(c.name);
          }).length;
          amount = Math.min(mediaCount, 3);
          if (amount > 0) {
            events.unshift({ type: 'LOG', msg: `Oprah Winfrey: Media buff calculated +${amount} (max 3).` });
          } else {
            events.unshift({ type: 'LOG', msg: `Oprah Winfrey: No media cards on board - no buff.` });
          }
        }

        const tgt = getStrongestGovernment(state, player);
        // Spin Doctor: dirty leaders (corr ≥3) get +2 instead of +1
        if (reason === 'SPIN_DOCTOR' && tgt && getCorruption(tgt as PoliticianCard) >= 3) {
          amount = 2;
          events.unshift({ type: 'LOG', msg: `Spin Doctor: ${tgt.name} ist kompromittiert → +2 Einfluss.` });
        }
        // Technokratie: first sofort numeric +1 (consumed once)
        const techBonus = Number((state.effectFlags[player] as any)?.technocracyNumericBonus || 0);
        if (techBonus > 0 && amount > 0) {
          amount += techBonus;
          (state.effectFlags[player] as any).technocracyNumericBonus = 0;
          events.unshift({ type: 'LOG', msg: `⚜️ Technokratie: numerischer Effekt +${techBonus}.` });
        }
        // Zuckerberg champion: enemy aura tax this turn (−1 on positive buffs)
        const auraTax = Number((state.effectFlags[player] as any)?.auraTaxThisTurn || 0);
        if (auraTax > 0 && amount > 0) {
          amount = Math.max(0, amount - auraTax);
          events.unshift({ type: 'LOG', msg: `👑 Algorithmus-Drossel: Aura/Buff −${auraTax}.` });
        }
        if (tgt && amount !== 0) {
          if (amount >= 0) {
            (tgt as PoliticianCard).tempBuffs = ((tgt as PoliticianCard).tempBuffs || 0) + amount;
            // Corruption win-more tax: +3 or more accumulated buffs in a round → +1 corruption (once)
            const pc = tgt as PoliticianCard;
            if ((pc.tempBuffs || 0) >= 3 && !pc._corruptionBuffTaxed) {
              pc._corruptionBuffTaxed = true;
              events.unshift({
                type: 'CHANGE_CORRUPTION',
                targetUid: pc.uid,
                amount: 1,
                source: 'Machtrausch (≥3 Buffs in einer Runde)',
              } as EffectEvent);
            }

            // Aufsichtsmandat: when strongest gains ≥2 from temps this turn, opp trap fires once
            if (amount > 0) {
              const flags = state.effectFlags[player];
              const buffGain = (flags.strongestGovBuffGainThisTurn || 0) + amount;
              flags.strongestGovBuffGainThisTurn = buffGain;
              if (
                buffGain >= 2 &&
                !flags.aufsichtFiredThisTurn
              ) {
                const opp = other(player);
                const traps = ((state.traps as any)?.[opp] || []) as Array<{ owner: Player; key: string }>;
                const trapIdx = traps.findIndex(t => t.key === 'trap.aufsichtsmandat.counter_stack');
                if (trapIdx >= 0) {
                  flags.aufsichtFiredThisTurn = true;
                  (tgt as PoliticianCard).tempDebuffs = ((tgt as PoliticianCard).tempDebuffs || 0) + 1;
                  events.unshift({
                    type: 'CHANGE_CORRUPTION',
                    targetUid: tgt.uid,
                    amount: 1,
                    source: 'Aufsichtsmandat',
                    enemySourcePlayer: opp,
                  } as EffectEvent);
                  events.unshift({
                    type: 'LOG',
                    msg: `Aufsichtsmandat: ${tgt.name} −1 Einfluss und +1 Korruption (Stack ≥2).`,
                  });
                  traps.splice(trapIdx, 1);
                }
              }
            }
          } else {
            (tgt as PoliticianCard).tempDebuffs = ((tgt as PoliticianCard).tempDebuffs || 0) + Math.abs(amount);
          }
          logPush(state, logBuffStrongest(player, tgt.name, amount));

          // Trigger visual effect for influence buff
          if (amount > 0) {
            events.unshift({
              type: 'VISUAL_INFLUENCE_BUFF',
              player,
              amount,
              targetUid: tgt.uid,
              color: '#4ade80' // Default green for influence buffs
            } as EffectEvent);
          }

          // Opportunist-Spiegelung (einmalig; mirrored verhindert Ping-Pong)
          if (
            state.effectFlags[other(player)]?.opportunistActive &&
            amount > 0 &&
            !(ev as any).mirrored
          ) {
            const mirror = {
              type: 'BUFF_STRONGEST_GOV',
              player: other(player),
              amount,
              mirrored: true,
            } as EffectEvent;
            events.unshift(mirror);
            logPush(state, logOpportunist(other(player), amount));
          }
        }
        break;
      }

      case 'DEBUFF_CARD': {
        const card = findCardByUidOnBoard(state, ev.targetUid);
        if (card && card.kind === 'pol') {
          if (consumeProtection(card, state.shields as Set<number> | undefined)) {
            logPush(state, `🛡️ ${card.name} war geschützt – Debuff verhindert (Schutz verbraucht).`);
            break;
          }
          let magnitude = Math.abs((ev as any).amount);
          // Alternative Fakten: enemy interventions have -1 effect (min 0).
          // Ambivalence: when spin fully nullifies a hit, draw 1 (narrative victory).
          if ((ev as any).fromIntervention) {
            const slot = findCardSlotByUid(state, ev.targetUid);
            if (slot) {
              const owner = slot.player;
              const perm = state.permanentSlots?.[owner];
              const hasAltFakten = perm?.public?.name === 'Alternative Fakten' || perm?.government?.name === 'Alternative Fakten';
              if (hasAltFakten && magnitude > 0) {
                magnitude -= 1;
                logPush(state, `🪧 Alternative Fakten: Interventions-Wirkung um 1 reduziert (${magnitude}).`);
                if (magnitude <= 0) {
                  events.unshift({ type: 'DRAW_CARDS', player: owner, amount: 1 });
                  events.unshift({ type: 'LOG', msg: 'Alternative Fakten: Intervention wirkungslos → +1 Karte (Spin).' });
                }
              }
            }
          }
          if (magnitude <= 0) break;
          const tgt = card as any;
          tgt.tempDebuffs = (tgt.tempDebuffs || 0) + magnitude;
          logPush(state, `🔻 ${tgt.name}: -${magnitude} Influence`);
        }
        break;
      }

      // === Dynamic, board-dependent effects ===

      case 'SHADOW_LOBBYING_BUFF': {
        const p = ev.player;
        const ownBoard = [...state.board[p].innen, ...state.board[p].aussen];
        const oligarchCount = ownBoard.filter(c => isOligarchCard(c) && !(c as any).deactivated).length;
        const amt = Math.min(oligarchCount, 3);
        if (amt > 0) {
          events.unshift({ type: 'BUFF_STRONGEST_GOV', player: p, amount: amt });
          events.unshift({ type: 'LOG', msg: `Shadow Lobbying: stärkste Regierung +${amt} Einfluss (pro Oligarch, max 3).` });
          // Corruption rider: dirty money — +1 corruption per 2 influence granted, target is tainted
          const target = strongestOwnGov(state, p);
          if (target) {
            (target as any)._corruptionTainted = true;
            const gain = Math.floor(amt / 2);
            if (gain > 0) {
              events.unshift({
                type: 'CHANGE_CORRUPTION',
                targetUid: target.uid,
                amount: gain,
                source: 'Shadow Lobbying (schmutziges Geld)',
                fromInitiative: true,
              } as EffectEvent);
            }
          }
        } else {
          events.unshift({ type: 'LOG', msg: 'Shadow Lobbying: Keine Oligarchen – kein Einfluss-Buff.' });
        }
        break;
      }

      case 'DIGITAL_CAMPAIGN_DRAW': {
        const p = ev.player;
        const ownBoard = [...state.board[p].innen, ...state.board[p].aussen];
        const mediaCount = ownBoard.filter(c => isMediaLikeCard(c) && !(c as any).deactivated).length;
        const draws = Math.min(2, mediaCount); // Balance: hard cap at 2
        if (draws > 0) {
          events.unshift({ type: 'DRAW_CARDS', player: p, amount: draws });
          events.unshift({ type: 'LOG', msg: `Digitaler Wahlkampf: ziehe ${draws} Karte(n) (pro Medien-/Plattform-Karte, max 2).` });
        } else {
          events.unshift({ type: 'LOG', msg: 'Digitaler Wahlkampf: Keine Medien-Karten auf dem Feld – keine Karten gezogen.' });
        }
        // Narrative control: ≥2 media/platform → most corrupt own gov −1
        if (mediaCount >= 2) {
          const dirty = mostCorruptGov(state, p, { minCorruption: 1 });
          if (dirty) {
            events.unshift({
              type: 'CHANGE_CORRUPTION',
              targetUid: dirty.uid,
              amount: -1,
              source: 'Digitaler Wahlkampf (Narrativkontrolle)',
              fromInitiative: true,
            } as EffectEvent);
          }
        }
        break;
      }

      case 'ALGO_DISCOURSE_DEBUFF': {
        const p = ev.player;
        const opp = other(p);
        const oppPublic = state.board[opp].innen || [];
        const platformCount = oppPublic.filter(c =>
          !(c as any).deactivated && (isPlatformCard(c) || c.name === 'Sam Altman')
        ).length;
        const amt = Math.min(platformCount, 3);
        if (amt > 0) {
          events.unshift({ type: 'BUFF_STRONGEST_GOV', player: opp, amount: -amt });
          events.unshift({ type: 'LOG', msg: `Algorithmischer Diskurs: gegnerische stärkste Regierung -${amt} Einfluss (pro Plattform/KI-Karte).` });
          // Feed radicalizes: also +1 corruption on the debuffed government
          const strong = strongestOwnGov(state, opp);
          if (strong) {
            events.unshift({
              type: 'CHANGE_CORRUPTION',
              targetUid: strong.uid,
              amount: 1,
              source: 'Algorithmischer Diskurs (Feed)',
              enemySourcePlayer: p,
              fromInitiative: true,
            } as EffectEvent);
          }
        } else {
          events.unshift({ type: 'LOG', msg: 'Algorithmischer Diskurs: Keine gegnerischen Plattform/KI-Karten – kein Malus.' });
        }
        break;
      }

      case 'WHATABOUTISM_REACTIVATE': {
        const p = ev.player;
        const own = [...state.board[p].aussen, ...state.board[p].innen];
        const deactivated = own.filter(c => (c as any).deactivated);
        // Prefer the strongest deactivated government card, otherwise any public card
        const target = (deactivated.filter(c => c.kind === 'pol') as PoliticianCard[])
          .sort((a, b) => (b.influence || 0) - (a.influence || 0))[0] || deactivated[0];
        if (target) {
          (target as any).deactivated = false;
          if (target.kind === 'pol') {
            (target as any).tempDebuffs = ((target as any).tempDebuffs || 0) + 2; // Balance: −2
            events.unshift({ type: 'LOG', msg: `Whataboutism: ${target.name} reaktiviert (-2 Einfluss).` });
            // Transfer 1 corruption from reactivated gov to a random enemy government
            if (getCorruption(target as PoliticianCard) > Number((target as PoliticianCard).corruptionStart ?? 0)) {
              const oppGovs = activeGovs(state, other(p));
              if (oppGovs.length) {
                const victim = oppGovs[rng.randomInt(oppGovs.length)];
                events.unshift({
                  type: 'CHANGE_CORRUPTION',
                  targetUid: (target as any).uid,
                  amount: -1,
                  source: 'Whataboutism (Abwälzen)',
                  fromInitiative: true,
                } as EffectEvent);
                events.unshift({
                  type: 'CHANGE_CORRUPTION',
                  targetUid: victim.uid,
                  amount: 1,
                  source: 'Whataboutism (Abwälzen)',
                  enemySourcePlayer: p,
                  fromInitiative: true,
                } as EffectEvent);
              }
            }
          } else {
            events.unshift({ type: 'LOG', msg: `Whataboutism: ${target.name} reaktiviert.` });
          }
        } else {
          events.unshift({ type: 'LOG', msg: 'Whataboutism: Keine deaktivierte eigene Karte gefunden – Effekt verpufft.' });
        }
        break;
      }

      case 'PROTECT_STRONGEST_GOV': {
        const p = ev.player;
        const target = strongestActiveGov(state.board[p].aussen);
        if (target) {
          (target as any).protectedOnce = true;
          events.unshift({ type: 'LOG', msg: `🛡️ ${target.name} ist einmalig vor Deaktivierung/Debuffs geschützt.` });
        } else {
          events.unshift({ type: 'LOG', msg: 'Schutz: Keine eigene Regierungskarte im Spiel – Effekt verpufft.' });
        }
        break;
      }

      case 'SET_NEXT_INITIATIVE_AP_BONUS': {
        const p = ev.player;
        const flags = state.effectFlags[p];
        flags.apBonusInitiativeNext = (flags.apBonusInitiativeNext || 0) + (ev as any).amount;
        events.unshift({ type: 'LOG', msg: `Nächste Initiative: +${(ev as any).amount} AP vorgemerkt.` });
        break;
      }

      case 'REVEAL_OPPONENT_HAND': {
        const opp = other(ev.player);
        const names = (state.hands[opp] || []).map(c => c.name).join(', ') || '(leer)';
        events.unshift({ type: 'LOG', msg: `🕵️ Gegnerische Hand aufgedeckt: ${names}` });
        break;
      }

      case 'DESTROY_CARD': {
        const card = findCardByUidOnBoard(state, ev.targetUid);
        if (card) {
          if (consumeProtection(card, state.shields as Set<number> | undefined)) {
            logPush(state, `🛡️ ${card.name} war geschützt – Zerstörung verhindert (Schutz verbraucht).`);
            break;
          }
          for (const p of [1, 2] as const) {
            for (const lane of ['innen', 'aussen', 'sofort'] as const) {
              const idx = state.board[p][lane].findIndex(c => c.uid === ev.targetUid);
              if (idx !== -1) {
                state.board[p][lane].splice(idx, 1);
                state.discard.push(card);
                logPush(state, `💥 ${card.name} wurde zerstört.`);
              }
            }
          }
        }
        break;
      }

      case 'SOROS_AP_CHECK': {
        // Legacy no-op: Soros now steals AP reactively when opponent plays Einfluss ≥7
        events.unshift({
          type: 'LOG',
          msg: 'George Soros: Aura aktiv – stiehlt 1 AP, wenn der Gegner eine Regierung mit Einfluss ≥7 spielt (1×/Zug).',
        });
        break;
      }

      case 'SNOWDEN_DEBUFF_US_GOV': {
        const opp = other(ev.player);
        const target = (state.board[opp].aussen || []).find(c => isUsGovernmentCard(c) && !(c as any).deactivated);
        if (target) {
          events.unshift({ type: 'DEBUFF_CARD', player: opp, targetUid: (target as any).uid, amount: 1 });
          events.unshift({ type: 'LOG', msg: `Edward Snowden: US-Regierungskarte ${target.name} -1 Einfluss.` });
        }
        // Corruption rider: reveal + mark the opponent's most corrupt gov (purge target +1)
        const dirty = mostCorruptGov(state, opp, { minCorruption: 1 });
        if (dirty) {
          (dirty as any).purgeMarked = true;
          events.unshift({ type: 'LOG', msg: `🕵️ Edward Snowden: ${dirty.name} enthüllt (Korruption ${getCorruption(dirty)}) — Säuberungsziel +1.` });
        }
        break;
      }

      case 'ASSANGE_DRAW': {
        const p = ev.player;
        const hasNgo = [...state.board[p].innen, ...state.board[p].aussen].some(c => isNgoCard(c) && !(c as any).deactivated);
        const ownDraw = hasNgo ? 2 : 1;
        events.unshift({ type: 'DRAW_CARDS', player: other(p), amount: 1 });
        events.unshift({ type: 'DRAW_CARDS', player: p, amount: ownDraw });
        events.unshift({ type: 'LOG', msg: `Julian Assange: ziehe ${ownDraw} Karte(n)${hasNgo ? ' (NGO-Bonus)' : ''}, Gegner zieht 1.` });
        // Corruption rider: leaks hurt everyone — both players' most corrupt gov +1
        for (const pl of [1, 2] as const) {
          const dirty = mostCorruptGov(state, pl, { minCorruption: 1 });
          if (dirty) {
            events.unshift({
              type: 'CHANGE_CORRUPTION',
              targetUid: dirty.uid,
              amount: 1,
              source: 'Julian Assange (Leak)',
            } as EffectEvent);
          }
        }
        break;
      }

      case 'HARARI_PLATFORM_AP': {
        // Legacy no-op: Harari now steals AP when opponent plays a Platform
        events.unshift({
          type: 'LOG',
          msg: 'Yuval Noah Harari: Aura aktiv – stiehlt 1 AP, wenn der Gegner eine Plattform spielt (1×/Zug).',
        });
        break;
      }

      case 'SET_NEXT_GOV_PLUS2': {
        state.effectFlags[ev.player].nextGovPlus2 = true;
        (state.effectFlags[ev.player] as any).nextGovCorruptionMinus1 = true;
        events.unshift({ type: 'LOG', msg: 'Think-tank: Nächste Regierungskarte erhält +2 Einfluss und −1 Start-Korruption.' });
        break;
      }

      case 'SET_DRAW_PENALTY': {
        state.effectFlags[ev.player].drawPenaltyNextDraw = true;
        events.unshift({ type: 'LOG', msg: `P${ev.player} zieht am Zugende 1 Karte weniger (Mukesh Ambani).` });
        break;
      }

      case 'SKANDALSPIRALE_TRIGGER': {
        // Deterministic: lower-influence side's strongest gov takes −2 (no W6).
        const sumGov = (p: Player) => (state.board[p].aussen || []).reduce((a, c) => {
          if (c.kind !== 'pol' || (c as any).deactivated) return a;
          const pc = c as PoliticianCard;
          return a + pc.influence + (pc.tempBuffs || 0) - (pc.tempDebuffs || 0);
        }, 0);
        const p1 = sumGov(1);
        const p2 = sumGov(2);
        const loser: Player = p1 <= p2 ? 1 : 2;
        events.unshift({ type: 'BUFF_STRONGEST_GOV', player: loser, amount: -2 });
        events.unshift({ type: 'LOG', msg: `Skandalspirale: P${loser} (weniger Einfluss) — stärkste Regierung −2 Einfluss.` });
        const loserStrongest = strongestOwnGov(state, loser);
        if (loserStrongest && getCorruption(loserStrongest) >= 2) {
          events.unshift({
            type: 'CHANGE_CORRUPTION',
            targetUid: loserStrongest.uid,
            amount: 1,
            source: 'Skandalspirale (kompromittiert)',
            fromInitiative: true,
          } as EffectEvent);
        }
        break;
      }

      // ===== New intent event handlers =====

      case 'DEACTIVATE_STRONGEST_ENEMY_GOV': {
        // Balance: −3 influence; −4 if target already has corruption ≥3
        const opp: Player = ev.player === 1 ? 2 : 1;
        const uid = strongestGovernmentUid(state, opp);
        if (uid !== null) {
          const target = findCardByUidOnBoard(state, uid) as PoliticianCard | null;
          const amt = target && getCorruption(target) >= 3 ? 4 : 3;
          events.unshift({ type: 'DEBUFF_CARD', player: opp, targetUid: uid, amount: amt });
          events.unshift({ type: 'LOG', msg: `Partei-Offensive: stärkste gegnerische Regierung −${amt} Einfluss.` });
        } else {
          events.unshift({ type: 'LOG', msg: 'Partei-Offensive: keine gegnerische Regierung gefunden.' });
        }
        break;
      }

      case 'LOCK_OPPONENT_INITIATIVES_EOT': {
        // Balance: lock Sofort-Initiativen only (not Dauerhaft / traps)
        const opp: Player = ev.player === 1 ? 2 : 1;
        state.effectFlags[opp].initiativesLocked = true;
        // Corruption rider: enemy cannot reduce corruption while blockade holds
        (state.effectFlags[opp] as any).corruptionReductionBlocked = true;
        events.unshift({ type: 'LOG', msg: 'Oppositionsblockade: Gegner kann keine Sofort-Initiativen spielen (bis zu seinem nächsten Zug).' });
        events.unshift({ type: 'LOG', msg: 'Oppositionsblockade: Gegner kann bis dahin keine Korruption abbauen.' });
        break;
      }

      case 'TIM_COOK_AP': {
        // Legacy no-op: Tim Cook now steals AP when opponent plays a Platform
        events.unshift({
          type: 'LOG',
          msg: 'Tim Cook: Aura aktiv – stiehlt 1 AP, wenn der Gegner eine Plattform spielt (1×/Zug).',
        });
        break;
      }

      case 'SET_DOUBLE_PUBLIC_AURA': {
        state.effectFlags[ev.player].doublePublicAura = true;
        events.unshift({ type: 'LOG', msg: 'Influencer Campaign: next Public aura will be doubled.' });
        // Paid reach is dirty money — strongest gov +1 corruption
        const strong = strongestOwnGov(state, ev.player);
        if (strong) {
          events.unshift({
            type: 'CHANGE_CORRUPTION',
            targetUid: strong.uid,
            amount: 1,
            source: 'Influencer-Kampagne (Paid Reach)',
            fromInitiative: true,
          } as EffectEvent);
        }
        break;
      }

      case 'SET_OPPORTUNIST_ACTIVE': {
        const { player, active } = ev as { type: 'SET_OPPORTUNIST_ACTIVE'; player: Player; active: boolean };
        state.effectFlags[player].opportunistActive = active;
        if (active) {
          events.unshift({ type: 'LOG', msg: 'Opportunist: AP effects will be mirrored until end of turn.' });
        }
        break;
      }

      // === CORRUPTION SYSTEM (pass-purge economy) ===
      // Note: CHANGE_CORRUPTION is deliberately NOT mirrored by Opportunist
      // (same precedent as STEAL_AP — no corruption ping-pong).
      case 'CHANGE_CORRUPTION': {
        const { targetUid, amount } = ev as any;
        const card = findCardByUidOnBoard(state, targetUid);
        if (!card || card.kind !== 'pol') {
          // Also allow corruption changes on hand cards (Tunnelvision mark)
          let handCard: Card | undefined;
          for (const p of [1, 2] as const) {
            handCard = state.hands[p].find(c => c.uid === targetUid && c.kind === 'pol');
            if (handCard) {
              applyCorruptionDelta(state, handCard as PoliticianCard, p, amount, {
                source: (ev as any).source,
                enemySourcePlayer: (ev as any).enemySourcePlayer,
                fromInitiative: (ev as any).fromInitiative,
                log: (m) => logPush(state, m),
                enqueue: (e) => events.unshift(e),
              });
              break;
            }
          }
          break;
        }
        const slot = findCardSlotByUid(state, targetUid);
        const owner = (slot?.player ?? 1) as Player;
        applyCorruptionDelta(state, card as PoliticianCard, owner, amount, {
          source: (ev as any).source,
          enemySourcePlayer: (ev as any).enemySourcePlayer,
          fromInitiative: (ev as any).fromInitiative,
          log: (m) => logPush(state, m),
          enqueue: (e) => events.unshift(e),
        });
        break;
      }

      case 'CHANGE_KP': {
        const amount = Number((ev as any).amount || 0);
        if (amount !== 0) {
          const before = Number((state as any).korruptionsPegel ?? 1);
          (state as any).korruptionsPegel = Math.max(0, before + amount);
          const after = (state as any).korruptionsPegel;
          const src = (ev as any).source || 'Effekt';
          logPush(state, `🌡️ ${src}: Korruptionspegel ${before} → ${after}`);
        }
        break;
      }

      case 'CORRUPTION_PURGE_CHECK': {
        // Legacy: round-end weighing is handled by beginWeighing in resolveRound.
        logPush(state, 'ℹ️ CORRUPTION_PURGE_CHECK ignoriert — Abwiegephase läuft am Rundenende.');
        break;
      }

      case 'VISUAL_PURGE_ROLL': {
        // UI-only: purge dice results are dispatched from runPurgeSequence;
        // this event exists for scripted tests / replay logs.
        const { targetUid, roll, target, survived } = ev as any;
        logPush(state, `🎲 Säuberungswurf (uid ${targetUid}): ${roll ?? 'auto'} vs Ziel ${target} → ${survived ? 'überlebt' : 'entfernt'}.`);
        break;
      }

      // === CORRUPTION: Bestechungsskandal 2.0 ===
      case 'CORRUPTION_STEAL_GOV_START': {
        console.log('🔥 PROCESSING CORRUPTION_STEAL_GOV_START - Player:', ev.player);
        // Signal UI that player must select opponent government card & roll dice
        (state as any).pendingAbilitySelect = {
          type: 'corruption_steal',
          actorPlayer: ev.player
        } as any;

        console.log('🔥 SET pendingAbilitySelect:', (state as any).pendingAbilitySelect);
        events.unshift({ type: 'LOG', msg: 'Bribery Scandal 2.0: Wähle eine gegnerische Regierungskarte und würfle einen W6.' });
        // Trigger UI hook to highlight targets
        if (typeof window !== 'undefined') {
          try {
            console.log('🔥 DISPATCHING pc:corruption_select_target event');
            window.dispatchEvent(new CustomEvent('pc:corruption_select_target', { detail: { player: ev.player } }));
          } catch(e) {
            console.error('🔥 ERROR dispatching corruption event:', e);
          }
        }
        break;
      }

      case 'CORRUPTION_STEAL_GOV_RESOLVE': {
        const { player: actor, targetUid } = ev as any;
        const victim: Player = actor === 1 ? 2 : 1;

        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('pc:corruption_roll_started', {
              detail: { actor, victim, targetUid, type: 'bribery' }
            }));
          } catch (e) {
            console.error('🎲 ENGINE: Error dispatching corruption roll start', e);
          }
        }

        // Calculate W6 roll first
        let roll = 1 + rng.randomInt(6);
        console.log('🎲 ENGINE: Calculated W6 roll:', roll);

        // Locate target card
        const targetIdx = state.board[victim].aussen.findIndex(c => c.uid === targetUid);
        if (targetIdx === -1) {
          events.unshift({ type: 'LOG', msg: 'Bribery Scandal 2.0: Zielkarte nicht gefunden.' });
          break;
        }
        const target = state.board[victim].aussen[targetIdx] as any;

        // Balance: raw W6 vs influence only (no oligarch/Adani stacking)
        const total = roll;
        const targetInfluence = target.influence + (target.tempBuffs||0) - (target.tempDebuffs||0);

        // Dispatch the calculated roll to UI for 3D dice display
        if (typeof window !== 'undefined') {
          try {
            console.log('🎲 ENGINE: Dispatching calculated roll to UI:', roll);
            window.dispatchEvent(new CustomEvent('pc:engine_dice_result', {
              detail: { roll, player: actor, targetUid }
            }));
          } catch(e) {
            console.error('🎲 ENGINE: Error dispatching dice result:', e);
          }
        }
        events.unshift({ type: 'LOG', msg: `Bribery Scandal 2.0: Roll ${roll} vs ${targetInfluence} (${target.name}).` });

        // Navalny defensive effect: if victim has Alexei Navalny on board, subtract 1 from total
        const victimPub = state.board[victim].innen || [];
        const hasNavalny = victimPub.some((c:any) => c.kind === 'spec' && c.name === 'Alexei Navalny' && !c.deactivated);
        let navalnyPenalty = 0;
        if (hasNavalny) {
          navalnyPenalty = 1;
          events.unshift({ type: 'LOG', msg: 'Alexei Navalny: defensive modifier -> -1 to opponent corruption roll.' });
        }

        const effectiveTotal = total - navalnyPenalty;

        let corruptionSuccess = false;
        let transferOutcome: 'stolen' | 'discarded' | 'none' = 'none';

        if (effectiveTotal >= targetInfluence) {
          const maxSlots = 3;
          if (state.board[actor as Player].aussen.length < maxSlots) {
            // Transfer card
            state.board[victim].aussen.splice(targetIdx,1);
            state.board[actor as Player].aussen.push(target as any);
            events.unshift({ type: 'LOG', msg: `Bribery Scandal 2.0: Erfolg! ${target.name} übernommen.` });
            transferOutcome = 'stolen';
            // Corruption rider: the scandal sticks to the stolen card
            events.unshift({
              type: 'CHANGE_CORRUPTION',
              targetUid: target.uid,
              amount: 1,
              source: 'Bestechungsskandal 2.0 (übernommen)',
              fromInitiative: true,
            } as EffectEvent);
          } else {
            state.board[victim].aussen.splice(targetIdx,1);
            state.discard.push(target as any);
            events.unshift({ type: 'LOG', msg: `Bribery Scandal 2.0: Erfolg, aber kein Slot frei – ${target.name} entfernt.` });
            transferOutcome = 'discarded';
          }
          corruptionSuccess = true;
        } else {
          events.unshift({ type: 'LOG', msg: 'Bribery Scandal 2.0: Wurf zu niedrig – keine Übernahme.' });
          // Corruption rider: failure — the scandal blows back on your strongest gov
          const backfire = strongestOwnGov(state, actor as Player);
          if (backfire) {
            events.unshift({
              type: 'CHANGE_CORRUPTION',
              targetUid: backfire.uid,
              amount: 1,
              source: 'Bestechungsskandal 2.0 (gescheitert)',
              fromInitiative: true,
            } as EffectEvent);
          }
        }

        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('pc:corruption_resolved', {
              detail: {
                actor,
                victim,
                targetUid,
                success: corruptionSuccess,
                outcome: transferOutcome,
                type: 'bribery'
              }
            }));
            try {
              const { feedbackSuccess, feedbackFail } = require('./feedback');
              if (corruptionSuccess) feedbackSuccess('Bestechung erfolgreich', 'Regierungskarte übernommen.');
              else feedbackFail('Bestechung gescheitert', 'Wurf zu niedrig.');
            } catch { /* ignore */ }
          } catch (e) {
            console.error('🎲 ENGINE: Error dispatching corruption resolved', e);
          }
        }

        // Clear pending selection
        (state as any).pendingAbilitySelect = undefined;
        break;
      }

      // === MAULWURF CORRUPTION ===
      case 'CORRUPTION_MOLE_STEAL_START': {
        console.log('🔥 PROCESSING CORRUPTION_MOLE_STEAL_START - Player:', ev.player);
        const actor: Player = ev.player;
        const victim: Player = actor === 1 ? 2 : 1;

        // Automatically find the weakest opponent government card
        const oppGovCards = state.board[victim].aussen.filter(c => c.kind === 'pol') as any[];
        if (oppGovCards.length === 0) {
          events.unshift({ type: 'LOG', msg: 'Maulwurf: Keine gegnerischen Regierungskarten gefunden.' });
          break;
        }

        // Find the weakest card (lowest influence)
        const weakestCard = oppGovCards.reduce((weakest, current) =>
          current.influence < weakest.influence ? current : weakest
        );

        // Balance: flat W6 ≥ 4 (no oligarch / count stacking)
        const requiredRoll = 4;

        // Signal UI that player must roll dice for the automatically selected target
        (state as any).pendingAbilitySelect = {
          type: 'maulwurf_steal',
          actorPlayer: actor,
          targetUid: weakestCard.uid,
          requiredRoll: requiredRoll
        } as any;

        console.log('🔥 SET pendingAbilitySelect for Maulwurf:', (state as any).pendingAbilitySelect);
        events.unshift({ type: 'LOG', msg: `Maulwurf: Schwächste Regierungskarte ${weakestCard.name} (Einfluss ${weakestCard.influence}) automatisch gewählt.` });
        events.unshift({ type: 'LOG', msg: `Maulwurf: Würfle mindestens ${requiredRoll} (W6 ≥ 4).` });

        // Trigger UI hook to show dice roll
        if (typeof window !== 'undefined') {
          try {
            console.log('🔥 DISPATCHING pc:maulwurf_select_target event');
            window.dispatchEvent(new CustomEvent('pc:maulwurf_select_target', {
              detail: {
                player: actor,
                targetUid: weakestCard.uid,
                requiredRoll: requiredRoll,
                targetName: weakestCard.name
              }
            }));
          } catch(e) {
            console.error('🔥 ERROR dispatching maulwurf event:', e);
          }
        }
        break;
      }

      case 'CORRUPTION_MOLE_STEAL_RESOLVE': {
        const actor = (ev as any).player as Player;
        const targetUid = (ev as any).targetUid as number;
        const victim: Player = actor === 1 ? 2 : 1;

        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('pc:corruption_roll_started', {
              detail: { actor, victim, targetUid, type: 'mole' }
            }));
          } catch (e) {
            console.error('🎲 ENGINE: Error dispatching maulwurf roll start', e);
          }
        }

        // Calculate W6 roll first
        const roll = 1 + rng.randomInt(6);
        console.log('🎲 ENGINE: Calculated W6 roll for Maulwurf:', roll);

        // Locate target card
        const targetIdx = state.board[victim].aussen.findIndex(c => c.uid === targetUid);
        if (targetIdx === -1) {
          events.unshift({ type: 'LOG', msg: 'Maulwurf: Zielkarte nicht gefunden.' });
          break;
        }
        const target = state.board[victim].aussen[targetIdx] as any;

        // Balance: flat W6 ≥ 4
        const requiredRoll = 4;

        // Dispatch the calculated roll to UI for 3D dice display
        if (typeof window !== 'undefined') {
          try {
            console.log('🎲 ENGINE: Dispatching calculated roll to UI for Maulwurf:', roll);
            window.dispatchEvent(new CustomEvent('pc:engine_dice_result', {
              detail: { roll, player: actor, targetUid }
            }));
          } catch(e) {
            console.error('🎲 ENGINE: Error dispatching dice result for Maulwurf:', e);
          }
        }

        events.unshift({ type: 'LOG', msg: `Maulwurf: Roll ${roll} vs benötigt ${requiredRoll} (${target.name}).` });

        let corruptionSuccess = false;
        let transferOutcome: 'stolen' | 'discarded' | 'none' | 'returned' = 'none';

        if (roll >= requiredRoll) {
          const maxSlots = 5; // Government slots
          if (state.board[actor as Player].aussen.length < maxSlots) {
            // Transfer card
            state.board[victim].aussen.splice(targetIdx,1);
            state.board[actor as Player].aussen.push(target as any);
            events.unshift({ type: 'LOG', msg: `Maulwurf: Erfolg! ${target.name} übernommen.` });
            transferOutcome = 'stolen';
            // Corruption rider: the mole brings its dirt along
            events.unshift({
              type: 'CHANGE_CORRUPTION',
              targetUid: target.uid,
              amount: 1,
              source: 'Maulwurf (eingeschleust)',
              fromInitiative: true,
            } as EffectEvent);
          } else {
            // No space - remove card
            state.board[victim].aussen.splice(targetIdx,1);
            state.discard.push(target as any);
            events.unshift({ type: 'LOG', msg: `Maulwurf: Erfolg, aber kein Slot frei – ${target.name} entfernt.` });
            transferOutcome = 'discarded';
          }
          corruptionSuccess = true;
        } else {
          // On fail: return Maulwurf from discard to hand (soft miss, not hard loss)
          const discIdx = (state.discard || []).findIndex(
            (c: any) => c && c.name === 'Maulwurf' && (c.uid == null || true)
          );
          if (discIdx >= 0) {
            const [mole] = state.discard.splice(discIdx, 1);
            state.hands[actor] = [...(state.hands[actor] || []), mole];
            events.unshift({ type: 'LOG', msg: 'Maulwurf: Wurf zu niedrig – Karte kehrt auf die Hand zurück.' });
            transferOutcome = 'returned';
          } else {
            events.unshift({ type: 'LOG', msg: 'Maulwurf: Wurf zu niedrig – keine Übernahme.' });
          }
        }

        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('pc:corruption_resolved', {
              detail: {
                actor,
                victim,
                targetUid,
                success: corruptionSuccess,
                outcome: transferOutcome,
                type: 'mole'
              }
            }));
            try {
              const { feedbackSuccess, feedbackFail } = require('./feedback');
              if (corruptionSuccess) feedbackSuccess('Maulwurf erfolgreich', 'Regierungskarte übernommen.');
              else feedbackFail('Maulwurf gescheitert', 'Wurf zu niedrig.');
            } catch { /* ignore */ }
          } catch (e) {
            console.error('🎲 ENGINE: Error dispatching maulwurf resolved', e);
          }
        }

        // Clear pending selection
        (state as any).pendingAbilitySelect = undefined;
        break;
      }

      // === TUNNELVISION: deterministic tax (no W6) — +1 AP or +1 corruption on entry ===
      case 'TUNNELVISION_GOV_PROBE_START': {
        const { player: actor, targetUid, influence } = ev as any;
        (state as any).pendingAbilitySelect = {
          type: 'tunnelvision_choice',
          actorPlayer: actor,
          targetUid,
          influence,
        } as any;

        events.unshift({
          type: 'LOG',
          msg: `Tunnelvision: ${influence}-Einfluss-Regierung braucht Freigabe — +1 AP zahlen oder +1 Korruption beim Eintritt.`,
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pc:tunnelvision_probe_start', {
            detail: { player: actor, targetUid, influence, mode: 'choice' },
          }));
        }
        break;
      }

      case 'TUNNELVISION_GOV_PROBE_RESOLVE': {
        const { player: actor, targetUid, choice } = ev as any;
        const mode: 'ap' | 'corruption' =
          choice === 'corruption' || choice === 'ap'
            ? choice
            : (state.actionPoints[actor as Player] >= 1 ? 'ap' : 'corruption');

        const hand = state.hands[actor as Player];
        const cardIndex = hand.findIndex(c => c.uid === targetUid);
        if (cardIndex === -1) {
          events.unshift({ type: 'LOG', msg: 'Tunnelvision: Karte nicht mehr in der Hand — Freigabe abgebrochen.' });
          (state as any).pendingAbilitySelect = undefined;
          break;
        }

        const card = hand[cardIndex] as PoliticianCard;
        hand.splice(cardIndex, 1);
        state.board[actor as Player].aussen.push(card as any);

        if (mode === 'ap') {
          if (state.actionPoints[actor as Player] >= 1) {
            state.actionPoints[actor as Player] -= 1;
            events.unshift({ type: 'LOG', msg: `Tunnelvision: ${card.name} freigegeben — +1 AP als Kontrollgebühr.` });
          } else {
            applyCorruptionDelta(state, card, actor as Player, 1, {
              source: 'Tunnelvision (keine AP — Korruption)',
              log: (m) => logPush(state, m),
            });
            events.unshift({ type: 'LOG', msg: `Tunnelvision: keine AP — ${card.name} kommt mit +1 Korruption.` });
          }
        } else {
          applyCorruptionDelta(state, card, actor as Player, 1, {
            source: 'Tunnelvision (Freigabe gegen Korruption)',
            log: (m) => logPush(state, m),
          });
          events.unshift({ type: 'LOG', msg: `Tunnelvision: ${card.name} freigegeben — +1 Korruption beim Eintritt.` });
        }

        if (typeof window !== 'undefined') {
          try {
            const { feedbackSuccess } = require('./feedback');
            feedbackSuccess('Tunnelvision', `${card.name} in der Regierung (${mode === 'ap' ? '+1 AP' : '+1 Korruption'}).`);
            window.dispatchEvent(new CustomEvent('pc:probe_resolved', {
              detail: { success: true, targetUid, type: 'tunnelvision', choice: mode },
            }));
          } catch { /* ignore */ }
        }

        (state as any).pendingAbilitySelect = undefined;
        break;
      }

      case 'INITIATIVE_ACTIVATED': {
        // Initiative activation event - trigger reactions from public cards & flags
        const p = ev.player;
        const flags = state.effectFlags[p];
        const publicCards = state.board[p]?.innen || [];
        const oppPublicCards = state.board[other(p)]?.innen || [];
        const initiativeName = (state as any)._lastActivatedInitiative as string | undefined;

        // Verzögerungsverfahren: bury the audit — own purge targets −1 this round
        if (initiativeName === 'Verzögerungsverfahren') {
          (flags as any).purgeTargetDelta = ((flags as any).purgeTargetDelta || 0) + 1;
          events.unshift({ type: 'LOG', msg: 'Verzögerungsverfahren: Säuberungsziele −1 diese Runde.' });
        }
        // Symbolpolitik: optics cleanse — strongest gov −1 corruption
        if (initiativeName === 'Symbolpolitik') {
          const strong = strongestOwnGov(state, p);
          if (strong) {
            events.unshift({
              type: 'CHANGE_CORRUPTION',
              targetUid: strong.uid,
              amount: -1,
              source: 'Symbolpolitik (Optik)',
              fromInitiative: true,
            } as EffectEvent);
          }
        }

        // Pre-registered AP bonus for the next initiative (legacy deferred bonuses)
        if (flags && (flags.apBonusInitiativeNext || 0) > 0) {
          const amt = flags.apBonusInitiativeNext!;
          flags.apBonusInitiativeNext = 0;
          events.unshift({ type: 'ADD_AP', player: p, amount: amt });
          events.unshift({ type: 'LOG', msg: `Vorgemerkter Initiative-Bonus eingelöst: +${amt} AP.` });
        }

        // Opponent public auras: steal AP when this player activates an initiative
        enqueuePublicApStealsOnInitiative(state, p, initiativeName, (e) => events.unshift(e));

        // Jennifer Doudna / Anthony Fauci: +1 influence on strongest gov per initiative
        if (findActivePublicCard(publicCards, 'Jennifer Doudna')) {
          events.unshift({ type: 'BUFF_STRONGEST_GOV', player: p, amount: 1 });
          events.unshift({ type: 'LOG', msg: 'Jennifer Doudna: stärkste Regierung +1 Einfluss (Initiative).' });
        }
        if (findActivePublicCard(publicCards, 'Anthony Fauci')) {
          events.unshift({ type: 'BUFF_STRONGEST_GOV', player: p, amount: 1 });
          events.unshift({ type: 'LOG', msg: 'Anthony Fauci: stärkste Regierung +1 Einfluss (Initiative).' });
        }

        // Noam Chomsky (opponent side): activator's strongest gov -1 per initiative
        if (findActivePublicCard(oppPublicCards, 'Noam Chomsky')) {
          events.unshift({ type: 'BUFF_STRONGEST_GOV', player: p, amount: -1 });
          events.unshift({ type: 'LOG', msg: 'Noam Chomsky (Gegner): stärkste Regierung -1 Einfluss (Initiative).' });
        }

        // Zivilgesellschaft (ongoing): active NGO grants +1 AP on initiative (once per turn).
        // Ambivalence: dirty strongest gov (≥3 Korruption) also takes +1 Korruption (civic scrutiny).
        const permPublic = (state.permanentSlots?.[p]?.public as any) || null;
        if (permPublic?.name === 'Zivilgesellschaft' && !(flags as any)?.zivilgesellschaftApUsed) {
          const hasNgo = [...state.board[p].innen, ...state.board[p].aussen]
            .some(c => isNgoCard(c) && !(c as any).deactivated);
          if (hasNgo) {
            (flags as any).zivilgesellschaftApUsed = true;
            events.unshift({ type: 'ADD_AP', player: p, amount: 1 });
            events.unshift({ type: 'LOG', msg: 'Zivilgesellschaft: NGO aktiv → +1 AP für Initiative.' });
            const strong = strongestOwnGov(state, p);
            if (strong && Number((strong as any).corruption ?? 0) >= 3) {
              events.unshift({
                type: 'CHANGE_CORRUPTION',
                targetUid: strong.uid,
                amount: 1,
                source: 'Zivilgesellschaft (Scrutiny)',
                fromInitiative: true,
              } as EffectEvent);
              events.unshift({ type: 'LOG', msg: `Zivilgesellschaft: ${strong.name} unter zivilem Druck → +1 Korruption.` });
            }
          }
        }
        break;
      }

      case 'AURA_SCIENCE': {
        state.effectFlags[ev.player].scienceInitiativeBonus = !!ev.active;
        state.effectFlags[ev.player].auraScience = ev.active ? 1 : 0;
        break;
      }
      case 'AURA_HEALTH': {
        state.effectFlags[ev.player].healthInitiativeBonus = !!ev.active;
        state.effectFlags[ev.player].auraHealth = ev.active ? 1 : 0;
        break;
      }
      case 'AURA_MILITARY_PENALTY': {
        state.effectFlags[ev.player].militaryInitiativePenalty = !!ev.active;
        state.effectFlags[ev.player].auraMilitaryPenalty = ev.active ? 1 : 0;
        break;
      }
      case 'ON_ACTIVATE_DRAW_AP': {
        // Marks Ai Weiwei aura as present; actual draw/AP fires on INITIATIVE_ACTIVATED
        state.effectFlags[ev.player].cultureInitiativeBonus = true;
        state.effectFlags[ev.player].aiWeiweiOnActivate = true;
        break;
      }

      case 'KOALITIONSZWANG_CALCULATE_BONUS': {
        const player = ev.player;
        const opponent = other(player);

        // Government cards live in aussen; public cards in innen
        const ownGov = state.board[player].aussen.filter(c => c.kind === 'pol') as PoliticianCard[];
        const oppGov = state.board[opponent].aussen.filter(c => c.kind === 'pol') as PoliticianCard[];

        // Get public slots for activist/denker cards
        const ownPublic = state.board[player].innen;
        const cd = require('../data/cardDetails') as any;

        let totalBonus = 0;
        let bonusDetails: string[] = [];

        // 1. For each own government card with same influence as opponent government card: +1
        for (const ownCard of ownGov) {
          const ownInfluence = ownCard.influence || 0;
          const hasMatchingOpponent = oppGov.some(oppCard => (oppCard.influence || 0) === ownInfluence);

          if (hasMatchingOpponent && ownInfluence > 0) {
            totalBonus += 1;
            bonusDetails.push(`${ownCard.name} (${ownInfluence}) matches opponent influence`);
          }
        }

        // 2. +1 for each activist/denker card in public slots
        let activistDenkerCount = 0;
        for (const publicCard of ownPublic) {
          const cardDetails = cd.getCardDetails?.(publicCard.name);
          const subcategories = cardDetails?.subcategories as string[] | undefined;

          if (Array.isArray(subcategories)) {
            const isActivist = subcategories.includes('Aktivist') || subcategories.includes('Aktivisten');
            const isDenker = subcategories.includes('Denker') || subcategories.includes('Thinker');

            if (isActivist || isDenker) {
              activistDenkerCount++;
              bonusDetails.push(`${publicCard.name} (${isActivist ? 'Aktivist' : 'Denker'})`);
            }
          }
        }
        totalBonus += activistDenkerCount;
        // Balance: hard cap total calculated bonus at +2
        if (totalBonus > 2) {
          events.unshift({ type: 'LOG', msg: `Koalitionszwang: Bonus auf +2 begrenzt (roh ${totalBonus}).` });
          totalBonus = 2;
        }

        // Apply bonus to strongest government card
        if (totalBonus > 0) {
          const strongestGov = getStrongestGovernment(state, player);
          if (strongestGov) {
            (strongestGov as PoliticianCard).tempBuffs = ((strongestGov as PoliticianCard).tempBuffs || 0) + totalBonus;
            // Anti double-dip: suppress T2 aura this turn after on-play fires
            state.effectFlags[player].koalitionOnPlayFiredThisTurn = true;
            events.unshift({
              type: 'LOG',
              msg: `Koalitionszwang: +${totalBonus} Einfluss (${bonusDetails.join(', ')}) — T2-Aura diese Runde pausiert.`
            });
          }
        } else {
          events.unshift({
            type: 'LOG',
            msg: 'Koalitionszwang: No bonus conditions met'
          });
        }
        break;
      }

      case 'REDAKTIONSKONFERENZ': {
        const player = ev.player as Player;
        const board = [
          ...(state.board[player].innen || []),
          ...(state.board[player].aussen || []),
        ];
        const { isMediaLikeCard, isPlatformCard } = require('./cardClassification');
        const hasMedia = board.some(
          (c: any) => c && !(c as any).deactivated && (isMediaLikeCard(c) || isPlatformCard(c))
        );
        if (hasMedia) {
          events.unshift({ type: 'BUFF_STRONGEST_GOV', player, amount: 2, reason: 'REDAKTIONSKONFERENZ' } as any);
          events.unshift({ type: 'LOG', msg: 'Redaktionskonferenz: Medien/Plattform kontrolliert → stärkste Regierung +2.' });
        } else {
          events.unshift({ type: 'DRAW_CARDS', player, amount: 1 });
          events.unshift({ type: 'LOG', msg: 'Redaktionskonferenz: keine Medien/Plattform → ziehe 1.' });
        }
        break;
      }

      // === VISUAL EFFECTS ===
      case 'VISUAL_AP_GAIN': {
        const { player, amount, x, y, color, size } = ev as any;

        // Calculate position based on player and board layout
        let effectX = x;
        let effectY = y;

        if (effectX === undefined || effectY === undefined) {
          // Default positions for each player's AP area
          if (player === 1) {
            effectX = 200; // Left side
            effectY = 100;
          } else {
            effectX = 1720; // Right side
            effectY = 100;
          }
        }

        // Trigger visual effect via VisualEffectsContext
        if (typeof window !== 'undefined' && (window as any).__pc_visual_effects) {
          try {
            (window as any).__pc_visual_effects.spawnVisualEffect({
              type: 'ap_gain',
              x: effectX,
              y: effectY,
              amount: amount,
              text: `+${amount}`,
              color: color || '#ffd700',
              size: size || 24,
              duration: 1200
            });
          } catch (e) {
            console.warn('Failed to spawn AP gain visual effect:', e);
          }
        }
        break;
      }

      case 'VISUAL_INFLUENCE_BUFF': {
        const { player, amount, targetUid, x, y, color } = ev as any;

        // Find target card position if targetUid provided
        let effectX = x;
        let effectY = y;

        if (targetUid && (effectX === undefined || effectY === undefined)) {
          const slot = findCardSlotByUid(state, targetUid);
          if (slot) {
            // Convert slot to screen coordinates (simplified)
            const baseX = slot.player === 1 ? 200 : 1200;
            const baseY = slot.lane === 'aussen' ? 200 : 400;
            effectX = baseX + (slot.index * 120);
            effectY = baseY;
          }
        }

        if (effectX === undefined || effectY === undefined) {
          // Fallback to player center
          effectX = player === 1 ? 400 : 1400;
          effectY = 300;
        }

        // Trigger visual effect
        if (typeof window !== 'undefined' && (window as any).__pc_visual_effects) {
          try {
            (window as any).__pc_visual_effects.spawnVisualEffect({
              type: 'influence_buff',
              x: effectX,
              y: effectY,
              amount: amount,
              text: `+${amount}`,
              color: color || '#4ade80', // Green for influence, or custom color
              size: 20,
              duration: 1000
            });
          } catch (e) {
            console.warn('Failed to spawn influence buff visual effect:', e);
          }
        }
        break;
      }

      case 'VISUAL_CARD_PLAY': {
        const { player, cardName, x, y, effectType } = ev as any;

        let effectX = x;
        let effectY = y;

        if (effectX === undefined || effectY === undefined) {
          // Default to player's hand area
          effectX = player === 1 ? 200 : 1400;
          effectY = 600;
        }

        // Trigger visual effect
        if (typeof window !== 'undefined' && (window as any).__pc_visual_effects) {
          try {
            (window as any).__pc_visual_effects.spawnVisualEffect({
              type: 'card_play',
              x: effectX,
              y: effectY,
              text: cardName,
              color: effectType === 'initiative' ? '#ff6b6b' : '#60a5fa',
              size: 16,
              duration: 800
            });
          } catch (e) {
            console.warn('Failed to spawn card play visual effect:', e);
          }
        }
        break;
      }

    }
    // generic after snapshot diff for AP
    if (state.actionPoints[1] !== beforeAP[1] || state.actionPoints[2] !== beforeAP[2]) {
      logger.dbg(`AP delta P1 ${beforeAP[1]}->${state.actionPoints[1]} | P2 ${beforeAP[2]}->${state.actionPoints[2]}`);
    }
  }
  // Ensure React viewers see mutated hand arrays by creating shallow copies
  try {
    state.hands = {
      1: state.hands[1] ? [...state.hands[1]] : [],
      2: state.hands[2] ? [...state.hands[2]] : []
    } as any;
    logger.dbg('resolveQueue: hand arrays shallow-copied to trigger UI updates');
  } catch (e) {
    logger.dbg('resolveQueue: failed to shallow-copy hands', e);
  }
}
