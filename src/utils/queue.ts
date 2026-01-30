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

        // Opportunist AP-Spiegelung (falls aktiv beim Gegner)
        if (state.effectFlags[other(ev.player)]?.opportunistActive && ev.amount > 0) {
          const mirror = { type: 'ADD_AP', player: other(ev.player), amount: ev.amount } as EffectEvent;
          events.unshift(mirror);
          logPush(state, `Opportunist: AP +${ev.amount} gespiegelt.`);
        }

        logPush(state, logAP(ev.player, cur, next));
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
        const oligarchNames = ['Elon Musk', 'Bill Gates', 'George Soros', 'Warren Buffett', 'Mukesh Ambani', 'Jeff Bezos', 'Alisher Usmanov', 'Gautam Adani', 'Jack Ma', 'Zhang Yiming', 'Roman Abramovich'];
        let removedCount = 0;

        // Durchsuche alle Spieler und alle Lanes nach Oligarchen (außer Jeff Bezos selbst)
        for (const p of [1, 2] as const) {
          for (const lane of ['innen', 'aussen', 'sofort'] as const) {
            const cards = state.board[p][lane];
            for (let i = cards.length - 1; i >= 0; i--) {
              const card = cards[i];
              if (oligarchNames.includes(card.name) && card.name !== 'Jeff Bezos') {
                // Entferne die Karte vom Spielfeld
                const removedCard = cards.splice(i, 1)[0];
                state.discard.push(removedCard);
                removedCount++;
                logPush(state, `🗑️ ${removedCard.name} wurde von Jeff Bezos entfernt`);
              }
            }
          }
        }

        if (removedCount > 0) {
          logPush(state, `🔥 Jeff Bezos hat ${removedCount} Oligarchen vom Spielfeld entfernt`);
        } else {
          logPush(state, `ℹ️ Jeff Bezos: Keine anderen Oligarchen auf dem Spielfeld gefunden`);
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
        if (tgt && amount !== 0) {
          if (amount >= 0) {
            (tgt as PoliticianCard).tempBuffs = ((tgt as PoliticianCard).tempBuffs || 0) + amount;
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

          // Opportunist-Spiegelung (falls aktiv beim Gegner)
          if (state.effectFlags[other(player)]?.opportunistActive && amount > 0) {
            const mirror = { type: 'BUFF_STRONGEST_GOV', player: other(player), amount } as EffectEvent;
            events.unshift(mirror);
            logPush(state, logOpportunist(other(player), amount));
          }
        }
        break;
      }

      case 'DEBUFF_CARD': {
        const card = findCardByUidOnBoard(state, ev.targetUid);
        if (card && card.kind === 'pol') {
          const tgt = card as any;
          tgt.tempDebuffs = (tgt.tempDebuffs || 0) + Math.abs((ev as any).amount);
          logPush(state, `🔻 ${tgt.name}: -${Math.abs((ev as any).amount)} Influence`);
        }
        break;
      }

      // ===== New intent event handlers =====

      case 'DEACTIVATE_STRONGEST_ENEMY_GOV': {
        const opp: Player = ev.player === 1 ? 2 : 1;
        const uid = strongestGovernmentUid(state, opp);
        if (uid !== null) {
          events.unshift({ type: 'DEACTIVATE_CARD', player: opp, targetUid: uid });
          events.unshift({ type: 'LOG', msg: 'Party Offensive: strongest enemy Government deactivated.' });
        } else {
          events.unshift({ type: 'LOG', msg: 'Party Offensive: no enemy Government to deactivate.' });
        }
        break;
      }

      case 'LOCK_OPPONENT_INITIATIVES_EOT': {
        const opp: Player = ev.player === 1 ? 2 : 1;
        state.effectFlags[opp].initiativesLocked = true;
        events.unshift({ type: 'LOG', msg: 'Opposition Blockade: opponent initiatives locked until end of turn.' });
        break;
      }

      case 'SET_DOUBLE_PUBLIC_AURA': {
        state.effectFlags[ev.player].doublePublicAura = true;
        events.unshift({ type: 'LOG', msg: 'Influencer Campaign: next Public aura will be doubled.' });
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

        // Oligarch bonus (existing) + special Gautam Adani rule
        const pubCards = state.board[actor as Player].innen || [];
        const oligarchList = pubCards.filter((c: any) => {
          const sub = (require('../data/cardDetails') as any).getCardDetails?.(c.name)?.subcategories as string[] | undefined;
          const hasNewTag = Array.isArray(sub) && sub.includes('Oligarch');
          const legacy = (c as any).tag === 'Oligarch';
          return hasNewTag || legacy;
        });
        const oligarchCount = oligarchList.length;

        // Adani special: if the actor has exactly one oligarch and it's Gautam Adani, grant +1 to the corruption roll
        let adaniBonus = 0;
        if (oligarchCount === 1 && oligarchList[0] && (oligarchList[0] as any).name === 'Gautam Adani' && !(oligarchList[0] as any).deactivated) {
          adaniBonus = 1;
          events.unshift({ type: 'LOG', msg: 'Gautam Adani: sole oligarch -> +1 corruption bonus applied.' });
        }

        // Apply oligarchCount as existing bonus and Adani bonus (Adani stacks with count to allow future designs)
        const total = roll + oligarchCount + adaniBonus;
        const targetInfluence = target.influence + (target.tempBuffs||0) - (target.tempDebuffs||0);

        // Dispatch the calculated roll to UI for 3D dice display (send raw roll without modifiers for visual fidelity)
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
        events.unshift({ type: 'LOG', msg: `Bribery Scandal 2.0: Roll ${roll} +${oligarchCount}${adaniBonus ? ' +Adani' : ''} = ${total} vs ${targetInfluence} (${target.name}).` });

        // Navalny defensive effect: if victim has Alexei Navalny on board, subtract 1 from total (applies before comparison)
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
          } else {
            state.board[victim].aussen.splice(targetIdx,1);
            state.discard.push(target as any);
            events.unshift({ type: 'LOG', msg: `Bribery Scandal 2.0: Erfolg, aber kein Slot frei – ${target.name} entfernt.` });
            transferOutcome = 'discarded';
          }
          corruptionSuccess = true;
        } else {
          events.unshift({ type: 'LOG', msg: 'Bribery Scandal 2.0: Wurf zu niedrig – keine Übernahme.' });
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

        // Calculate required roll: base 2 + number of opponent government cards
        const requiredRoll = 2 + oppGovCards.length;

        // Signal UI that player must roll dice for the automatically selected target
        (state as any).pendingAbilitySelect = {
          type: 'maulwurf_steal',
          actorPlayer: actor,
          targetUid: weakestCard.uid,
          requiredRoll: requiredRoll
        } as any;

        console.log('🔥 SET pendingAbilitySelect for Maulwurf:', (state as any).pendingAbilitySelect);
        events.unshift({ type: 'LOG', msg: `Maulwurf: Schwächste Regierungskarte ${weakestCard.name} (Einfluss ${weakestCard.influence}) automatisch gewählt.` });
        events.unshift({ type: 'LOG', msg: `Maulwurf: Würfle mindestens ${requiredRoll} (2 + ${oppGovCards.length} Regierungskarten).` });

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
        const { player: actor, targetUid } = ev as any;
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

        // Calculate required roll: base 2 + number of opponent government cards
        const oppGovCards = state.board[victim].aussen.filter(c => c.kind === 'pol') as any[];
        const requiredRoll = 2 + oppGovCards.length;

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
        let transferOutcome: 'stolen' | 'discarded' | 'none' = 'none';

        if (roll >= requiredRoll) {
          const maxSlots = 5; // Government slots
          if (state.board[actor as Player].aussen.length < maxSlots) {
            // Transfer card
            state.board[victim].aussen.splice(targetIdx,1);
            state.board[actor as Player].aussen.push(target as any);
            events.unshift({ type: 'LOG', msg: `Maulwurf: Erfolg! ${target.name} übernommen.` });
            transferOutcome = 'stolen';
          } else {
            // No space - remove card
            state.board[victim].aussen.splice(targetIdx,1);
            state.discard.push(target as any);
            events.unshift({ type: 'LOG', msg: `Maulwurf: Erfolg, aber kein Slot frei – ${target.name} entfernt.` });
            transferOutcome = 'discarded';
          }
          corruptionSuccess = true;
        } else {
          events.unshift({ type: 'LOG', msg: 'Maulwurf: Wurf zu niedrig – keine Übernahme.' });
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
          } catch (e) {
            console.error('🎲 ENGINE: Error dispatching maulwurf resolved', e);
          }
        }

        // Clear pending selection
        (state as any).pendingAbilitySelect = undefined;
        break;
      }

      // === TUNNELVISION: Government Card Probe System ===
      case 'TUNNELVISION_GOV_PROBE_START': {
        const { player: actor, targetUid, influence } = ev as any;
        const requiredRoll = influence >= 9 ? 5 : 4;

        // Signal UI that player must roll dice for government card probe
        (state as any).pendingAbilitySelect = {
          type: 'tunnelvision_probe',
          actorPlayer: actor,
          targetUid: targetUid,
          requiredRoll: requiredRoll,
          influence: influence
        } as any;

        events.unshift({ type: 'LOG', msg: `Tunnelvision: Regierungskarte benötigt Probe. W6 ≥${requiredRoll} (${influence >= 9 ? 'Einfluss 9+' : 'Standard'}).` });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('pc:tunnelvision_probe_start', {
            detail: {
              player: actor,
              targetUid: targetUid,
              requiredRoll: requiredRoll,
              influence: influence
            }
          }));
        }
        break;
      }

      case 'TUNNELVISION_GOV_PROBE_RESOLVE': {
        const { player: actor, targetUid, roll, requiredRoll, influence } = ev as any;

        // Dispatch the roll to UI for 3D dice display
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('pc:engine_dice_result', {
              detail: { roll, player: actor, targetUid }
            }));
          } catch(e) {
            console.error('🎲 ENGINE: Error dispatching dice result for Tunnelvision:', e);
          }
        }

        events.unshift({ type: 'LOG', msg: `Tunnelvision: Roll ${roll} vs benötigt ${requiredRoll} (Einfluss ${influence}).` });

        if (roll >= requiredRoll) {
          // Success: Card can be played normally
          events.unshift({ type: 'LOG', msg: 'Tunnelvision: Probe bestanden - Regierungskarte kann gespielt werden.' });

          // Add the card to the government board
          const hand = state.hands[actor as Player];
          const cardIndex = hand.findIndex(c => c.uid === targetUid);
          if (cardIndex !== -1) {
            const card = hand[cardIndex];
            hand.splice(cardIndex, 1);
            state.board[actor as Player].aussen.push(card as any);
            events.unshift({ type: 'LOG', msg: `Tunnelvision: ${card.name} erfolgreich in Regierung platziert.` });
          }
        } else {
          // Failure: Different outcomes based on roll
          if (roll === 1) {
            // Critical failure: Remove card from game permanently
            events.unshift({ type: 'LOG', msg: 'Tunnelvision: Kritischer Misserfolg! Regierungskarte wird dauerhaft aus dem Spiel entfernt.' });

            // Remove card from hand and add to discard
            const hand = state.hands[actor as Player];
            const cardIndex = hand.findIndex(c => c.uid === targetUid);
            if (cardIndex !== -1) {
              const card = hand[cardIndex];
              hand.splice(cardIndex, 1);
              state.discard.push(card as any);
              events.unshift({ type: 'LOG', msg: `Tunnelvision: ${card.name} dauerhaft aus dem Spiel entfernt.` });
            }
          } else {
            // Normal failure: Card stays in hand
            events.unshift({ type: 'LOG', msg: 'Tunnelvision: Probe misslungen - Regierungskarte bleibt in der Hand.' });
          }
        }

        // Always deduct 1 AP regardless of outcome (this is the cost for the probe)
        state.actionPoints[actor as Player] = Math.max(0, state.actionPoints[actor as Player] - 1);
        events.unshift({ type: 'LOG', msg: 'Tunnelvision: 1 AP abgezogen für Probe.' });

        // Clear pending selection
        (state as any).pendingAbilitySelect = undefined;
        break;
      }

      case 'INITIATIVE_ACTIVATED': {
        // Initiative activation event - trigger reactions from public cards
        logPush(state, 'Initiative activated.');

        // Check for public cards that react to initiative activation
        const publicCards = state.board[ev.player]?.innen || [];

        // Shadow Lobbying: +1 influence per own Oligarch-tag on board (max +3)
        // Detect if the activating initiative was Shadow Lobbying by checking the last played instant in slot
        const instantSlot = state.board[ev.player]?.sofort || [];
        const lastInstant = instantSlot[0] as any;
        if (lastInstant && (lastInstant.effectKey === 'init.shadow_lobbying.per_oligarch' || lastInstant.name === 'Shadow Lobbying')) {
          const ownBoard = [
            ...state.board[ev.player].innen,
            ...state.board[ev.player].aussen,
          ];
          const oligarchCount = ownBoard.filter(c => {
            const details = (c as any).name ? require('../data/cardDetails') as any : null;
            // Fallback: try BaseSpecial tag if available
            const sub = (require('../data/cardDetails') as any).getCardDetails?.((c as any).name)?.subcategories as string[] | undefined;
            const hasNewTag = Array.isArray(sub) && sub.includes('Oligarch');
            const legacyTag = (c as any).tag === 'Oligarch';
            return hasNewTag || legacyTag;
          }).length;
          const amt = Math.min(oligarchCount, 3);
          if (amt > 0) {
            events.unshift({ type: 'BUFF_STRONGEST_GOV', player: ev.player, amount: amt });
            events.unshift({ type: 'LOG', msg: `Shadow Lobbying: stärkste Regierung +${amt} Einfluss (pro Oligarch, max 3).` });
          } else {
            events.unshift({ type: 'LOG', msg: `Shadow Lobbying: Keine Oligarchen – kein Einfluss-Buff.` });
          }
        }

        // Elon Musk: +1 AP on initiative activation
        const elonMusk = publicCards.find(card =>
          card.kind === 'spec' && (card as any).name === 'Elon Musk'
        );
        if (elonMusk) {
          events.unshift({ type: 'ADD_AP', player: ev.player, amount: 1 });
          events.unshift({ type: 'LOG', msg: 'Elon Musk: +1 AP on initiative activation.' });
        }

        // Mark Zuckerberg: +1 AP on initiative activation (once per turn)
        const markZuckerberg = publicCards.find(card =>
          card.kind === 'spec' && (card as any).name === 'Mark Zuckerberg'
        );
        if (markZuckerberg && !state.effectFlags[ev.player]?.markZuckerbergUsed) {
          events.unshift({ type: 'ADD_AP', player: ev.player, amount: 1 });
          events.unshift({ type: 'LOG', msg: 'Mark Zuckerberg: +1 AP on initiative activation.' });
          if (!state.effectFlags[ev.player]) {
            state.effectFlags[ev.player] = { markZuckerbergUsed: false };
          }
          state.effectFlags[ev.player].markZuckerbergUsed = true;
        }

        // Ai Weiwei: +1 card +1 AP on initiative activation
        const aiWeiwei = publicCards.find(card =>
          card.kind === 'spec' && (card as any).name === 'Ai Weiwei'
        );
        if (aiWeiwei) {
          events.unshift({ type: 'DRAW_CARDS', player: ev.player, amount: 1 });
          events.unshift({ type: 'ADD_AP', player: ev.player, amount: 1 });
          events.unshift({ type: 'LOG', msg: 'Ai Weiwei: +1 card +1 AP on initiative activation.' });
        }

        // Sam Altman: +1 card +1 AP on AI-related initiative activation
        const samAltman = publicCards.find(card =>
          card.kind === 'spec' && (card as any).name === 'Sam Altman'
        );
        if (samAltman) {
          // Check if the activated initiative is AI-related (would need to be passed as context)
          // For now, this is handled via the initiative card's tag check in the activation flow
          events.unshift({ type: 'LOG', msg: 'Sam Altman: AI initiative detected - bonus ready.' });
        }

        // Digitaler Wahlkampf: draw 1 card per own Media-tag on board
        if (lastInstant && (lastInstant.effectKey === 'init.digital_campaign.per_media' || lastInstant.name === 'Digitaler Wahlkampf')) {
          const ownBoard = [
            ...state.board[ev.player].innen,
            ...state.board[ev.player].aussen,
          ];
          const mediaCount = ownBoard.filter(c => {
            const sub = (require('../data/cardDetails') as any).getCardDetails?.((c as any).name)?.subcategories as string[] | undefined;
            const legacy = (c as any).tag === 'Medien' || (c as any).tag === 'Media';
            return (Array.isArray(sub) && sub.includes('Medien')) || legacy || (Array.isArray(sub) && sub.includes('Medien')) || (Array.isArray(sub) && sub.includes('Medien'));
          }).length;
          if (mediaCount > 0) {
            events.unshift({ type: 'DRAW_CARDS', player: ev.player, amount: mediaCount });
            events.unshift({ type: 'LOG', msg: `Digitaler Wahlkampf: ziehe ${mediaCount} Karte(n) (pro Medien-Karte).` });
          } else {
            events.unshift({ type: 'LOG', msg: `Digitaler Wahlkampf: Keine Medien-Karten auf dem Feld.` });
          }
        }

        // After handling public reactions, enqueue a UI-only event to trigger hit animation on opponent's effected slots
        // We'll compute effected slots conservatively: all opponent's government and public slots that are occupied.
        try {
          const opp: Player = ev.player === 1 ? 2 : 1;
          const effectedSlots: Array<{ player: Player; lane: string; index: number } > = [];
          (state.board[opp].aussen || []).forEach((c, idx) => { if (c) effectedSlots.push({ player: opp, lane: 'aussen', index: idx }); });
          (state.board[opp].innen || []).forEach((c, idx) => { if (c) effectedSlots.push({ player: opp, lane: 'innen', index: idx }); });

          // enqueue one LOG and one UI_TRIGGER per slot (UI_TRIGGER is handled by the frontend canvas to play hit animation)
          effectedSlots.forEach(s => {
            events.unshift({ type: 'UI_TRIGGER_HIT_ANIM', player: s.player, lane: s.lane, index: s.index } as any);
          });
        } catch (e) {
          // ignore UI enqueue failures
        }

        break;
      }

      // ONCE_AP_ON_ACTIVATION removed - use standard ADD_AP events instead

      // ON_ACTIVATE_DRAW_AP removed - use standard ADD_AP and DRAW_CARDS events instead

      // Simplified AP system: No initiative-specific bonuses
      // All AP bonuses are now immediate ADD_AP events

      case 'KOALITIONSZWANG_CALCULATE_BONUS': {
        const player = ev.player;
        const opponent = other(player);

        // Get all government cards for both players
        const ownGov = state.board[player].innen.filter(c => c.kind === 'pol') as PoliticianCard[];
        const oppGov = state.board[opponent].innen.filter(c => c.kind === 'pol') as PoliticianCard[];

        // Get public slots for activist/denker cards
        const ownPublic = state.board[player].aussen;
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

        // Apply bonus to strongest government card
        if (totalBonus > 0) {
          const strongestGov = getStrongestGovernment(state, player);
          if (strongestGov) {
            (strongestGov as PoliticianCard).tempBuffs = ((strongestGov as PoliticianCard).tempBuffs || 0) + totalBonus;
            events.unshift({
              type: 'LOG',
              msg: `Koalitionszwang: +${totalBonus} Einfluss (${bonusDetails.join(', ')})`
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
