/**
 * Leader slot: champion promoted from deck (never on board).
 * Passive = style passive; active = 1×/match for 1 AP.
 */

import {
  ChampionActiveId,
  ChampionDef,
  getChampionForPreset,
  LEADERSHIP_STYLES,
  LeadershipStyleId,
  PRESET_CHAMPIONS,
} from '../data/leadershipStyles';
import { Pols, Specials } from '../data/gameData';
import { Card, GameState, Player, PoliticianCard } from '../types/game';
import {
  activeGovs,
  applyCorruptionDelta,
  getCorruption,
  mostCorruptGov,
  strongestOwnGov,
} from './corruption';

export interface LeaderSlot {
  styleId: LeadershipStyleId;
  championName: string;
  activeId: ChampionActiveId;
  activeName: string;
  activeDescription: string;
  /** Portrait card instance (removed from deck) */
  card: Card;
  activeUsed: boolean;
  /** Preset name if from premade */
  presetName?: string;
}

export function createLeaderFromChampion(def: ChampionDef, card: Card, presetName?: string): LeaderSlot {
  return {
    styleId: def.styleId,
    championName: def.cardName,
    activeId: def.activeId,
    activeName: def.activeName,
    activeDescription: def.activeDescription,
    card,
    activeUsed: false,
    presetName,
  };
}

/**
 * Promote champion card from a built deck into the leader slot.
 * Removes first matching card by name from the deck array (mutates).
 */
export function promoteChampionFromDeck(
  deck: Card[],
  presetName: string
): LeaderSlot | null {
  const def = getChampionForPreset(presetName);
  if (!def) return null;
  const idx = deck.findIndex(c => c.name === def.cardName);
  if (idx === -1) {
    // Known preset but card missing — resolve catalog identity so art/kind are real.
    const pol = Pols.find(p => p.name === def.cardName);
    const spec = Specials.find(s => s.name === def.cardName);
    const card: Card = pol
      ? { id: pol.id, key: pol.key, name: pol.name, kind: 'pol', baseId: pol.id, uid: -(pol.id + 10_000) } as Card
      : spec
        ? { id: spec.id, key: spec.key, name: spec.name, kind: 'spec', baseId: spec.id, uid: -(spec.id + 20_000) } as Card
        : {
            id: -1,
            key: `leader_${def.cardName}`,
            name: def.cardName,
            kind: 'spec',
            baseId: -1,
            uid: -Math.abs(def.cardName.length * 1000 + presetName.length),
          } as Card;
    if (typeof console !== 'undefined') {
      console.warn(`[leadership] Champion "${def.cardName}" missing from deck for preset "${presetName}" — using catalog stub.`);
    }
    return createLeaderFromChampion(def, card, presetName);
  }
  const [card] = deck.splice(idx, 1);
  return createLeaderFromChampion(def, card, presetName);
}

/** Infer champion from deck card names when preset name unknown (custom decks — phase 2 stub). */
export function inferChampionFromCardNames(names: string[]): ChampionDef | null {
  for (const def of Object.values(PRESET_CHAMPIONS)) {
    if (names.includes(def.cardName)) return def;
  }
  return null;
}

export function getLeader(state: GameState, player: Player): LeaderSlot | null {
  return (state as any).leaders?.[player] ?? null;
}

export function getStyleId(state: GameState, player: Player): LeadershipStyleId | null {
  return getLeader(state, player)?.styleId ?? null;
}

export function canActivateLeader(state: GameState, player: Player): { ok: boolean; reason?: string } {
  const leader = getLeader(state, player);
  if (!leader) return { ok: false, reason: 'Kein Anführer.' };
  if (leader.activeUsed) return { ok: false, reason: 'Anführer-Aktiv bereits genutzt.' };
  if (state.current !== player) return { ok: false, reason: 'Nicht am Zug.' };
  if ((state.actionPoints[player] || 0) < 1) return { ok: false, reason: '1 AP nötig.' };
  if (state.passed[player]) return { ok: false, reason: 'Bereits gepasst.' };
  return { ok: true };
}

export type LeaderActiveResult =
  | { ok: true; needsTarget?: 'own_gov' | 'enemy_gov'; pendingActiveId?: ChampionActiveId }
  | { ok: false; reason: string };

/**
 * Spend 1 AP and fire champion active. Some actives need a follow-up target
 * (stored on state.pendingAbilitySelect).
 */
export function activateLeaderAbility(
  state: GameState,
  player: Player,
  opts?: { targetUid?: number }
): LeaderActiveResult {
  const gate = canActivateLeader(state, player);
  if (!gate.ok) return { ok: false, reason: gate.reason || 'Gesperrt.' };

  const leader = getLeader(state, player)!;
  const log = (m: string) => state.log.push(m);
  const other: Player = player === 1 ? 2 : 1;

  // Auto-pick defaults for single-target actives when no uid provided
  if (opts?.targetUid == null) {
    if (leader.activeId === 'snowden_mark') {
      const enemy = strongestOwnGov(state, other);
      if (!enemy) return { ok: false, reason: 'Kein gegnerisches Gov.' };
      opts = { targetUid: enemy.uid };
    } else if (
      leader.activeId === 'jack_ma_draw_corrupt' ||
      leader.activeId === 'koehler_audit_relief' ||
      leader.activeId === 'buffett_cleanse'
    ) {
      const own = strongestOwnGov(state, player);
      if (!own && leader.activeId !== 'jack_ma_draw_corrupt') {
        return { ok: false, reason: 'Kein eigenes Gov.' };
      }
      if (own) opts = { targetUid: own.uid };
    }
  }

  state.actionPoints[player] = Math.max(0, (state.actionPoints[player] || 0) - 1);
  leader.activeUsed = true;

  switch (leader.activeId) {
    case 'jack_ma_draw_corrupt': {
      const top = state.decks[player].shift();
      if (top) {
        state.hands[player].push(top);
        log(`👑 ${leader.championName}: zieht ${top.name}.`);
      }
      const gov = opts?.targetUid
        ? activeGovs(state, player).find(g => g.uid === opts!.targetUid)
        : mostCorruptGov(state, player) || strongestOwnGov(state, player);
      if (gov) {
        applyCorruptionDelta(state, gov, player, 1, { source: `${leader.championName} (Plattform-Deal)`, log });
      }
      break;
    }
    case 'zuckerberg_aura_tax': {
      (state.effectFlags[other] as any).auraTaxThisTurn = 1;
      log(`👑 ${leader.championName}: gegnerische Auren diesen Zug −1.`);
      break;
    }
    case 'schmidt_veto_intervention': {
      (state.effectFlags[player] as any).vetoNextEnemyIntervention = true;
      log(`👑 ${leader.championName}: nächste gegnerische Intervention wird annuliert.`);
      break;
    }
    case 'koehler_audit_relief': {
      const gov = opts?.targetUid
        ? activeGovs(state, player).find(g => g.uid === opts!.targetUid)
        : strongestOwnGov(state, player);
      if (gov) {
        (gov as any)._auditStageDelta = ((gov as any)._auditStageDelta || 0) - 2;
        log(`👑 ${leader.championName}: ${gov.name} Audit-Stufe −2 diese Runde.`);
      }
      break;
    }
    case 'lagarde_shift_corruption': {
      const own = mostCorruptGov(state, player, { minCorruption: 1 }) || strongestOwnGov(state, player);
      const enemy = strongestOwnGov(state, other);
      if (!own || !enemy) {
        // refund
        leader.activeUsed = false;
        state.actionPoints[player] += 1;
        return { ok: false, reason: 'Beide Seiten brauchen ein Gov.' };
      }
      applyCorruptionDelta(state, own, player, -1, {
        source: `${leader.championName}`,
        log,
        allowBelowStart: true,
      });
      applyCorruptionDelta(state, enemy, other, 1, {
        source: `${leader.championName} (Verschiebung)`,
        enemySourcePlayer: player,
        log,
      });
      break;
    }
    case 'zelenskyy_influence_surge': {
      for (const gov of activeGovs(state, player)) {
        gov.tempBuffs = (gov.tempBuffs || 0) + 1;
      }
      log(`👑 ${leader.championName}: alle eigenen Govs +1 Einfluss.`);
      break;
    }
    case 'greta_clean_bonus': {
      let n = 0;
      for (const gov of activeGovs(state, player)) {
        if (getCorruption(gov) === 0) {
          gov.tempBuffs = (gov.tempBuffs || 0) + 1;
          n++;
        }
      }
      log(`👑 ${leader.championName}: ${n} saubere Gov(s) +1 Einfluss.`);
      break;
    }
    case 'macron_ap': {
      state.actionPoints[player] = (state.actionPoints[player] || 0) + 1;
      log(`👑 ${leader.championName}: +1 AP.`);
      break;
    }
    case 'buffett_cleanse': {
      const gov = opts?.targetUid
        ? activeGovs(state, player).find(g => g.uid === opts!.targetUid)
        : mostCorruptGov(state, player, { minCorruption: 1 });
      if (gov) {
        applyCorruptionDelta(state, gov, player, -1, {
          source: `${leader.championName}`,
          log,
          allowBelowStart: true,
        });
      }
      break;
    }
    case 'merz_vetting': {
      (state.effectFlags[player] as any).nextGovCorruptionMinus1 = true;
      log(`👑 ${leader.championName}: nächstes Gov −1 Korruption beim Eintritt.`);
      break;
    }
    case 'powell_shield': {
      const gov = strongestOwnGov(state, player);
      if (gov) {
        gov.protectedOnce = true;
        if (state.shields) state.shields.add(gov.uid);
        log(`👑 ${leader.championName}: ${gov.name} einmalig geschützt.`);
      }
      break;
    }
    case 'snowden_mark': {
      const enemy = opts?.targetUid
        ? activeGovs(state, other).find(g => g.uid === opts!.targetUid)
        : strongestOwnGov(state, other);
      if (enemy) {
        enemy.purgeMarked = true;
        log(`👑 ${leader.championName}: ${enemy.name} markiert (Audit +1).`);
      }
      break;
    }
    case 'adani_power_deal': {
      const gov = strongestOwnGov(state, player);
      if (gov) {
        gov.tempBuffs = (gov.tempBuffs || 0) + 2;
        applyCorruptionDelta(state, gov, player, 1, {
          source: `${leader.championName} (Infrastruktur-Deal)`,
          log,
        });
        log(`👑 ${leader.championName}: ${gov.name} +2 Einfluss, +1 Korruption.`);
      }
      break;
    }
    default:
      leader.activeUsed = false;
      state.actionPoints[player] += 1;
      return { ok: false, reason: 'Unbekannte Anführer-Aktiv.' };
  }

  log(`👑 Anführer-Aktiv von ${leader.championName} eingesetzt (1 AP).`);
  return { ok: true };
}

/** Style passives applied at scoring (before influence sum). */
export function applyStyleScoringPassives(state: GameState, player: Player): void {
  const style = getStyleId(state, player);
  if (!style) return;
  const log = (m: string) => state.log.push(m);

  if (style === 'autokratie') {
    const dirty = mostCorruptGov(state, player, { minCorruption: 1 });
    if (dirty) {
      dirty.tempBuffs = (dirty.tempBuffs || 0) + 1;
      log(`⚜️ Autokratie: ${dirty.name} (höchste Korruption) +1 Einfluss bei der Wertung.`);
    }
  }

  if (style === 'bewegung') {
    // Stacks with Greta as "higher wins" — Greta already +1 on K0 at purge start.
    // Style grants +1 on K0 if not already scandal-taxed; skip if Greta is on board (avoid double).
    const hasGreta = (state.board[player]?.innen || []).some(
      c => c.name === 'Greta Thunberg' && !(c as any).deactivated
    );
    if (!hasGreta) {
      for (const gov of activeGovs(state, player)) {
        if (getCorruption(gov) === 0 && !(gov as any)._auditScandal) {
          gov.tempBuffs = (gov.tempBuffs || 0) + 1;
          log(`⚜️ Bewegung: ${gov.name} (sauber) +1 Einfluss bei der Wertung.`);
        }
      }
    }
  }
}

/** Technocracy: first sofort initiative of the round gets +1 on numeric buffs. */
export function consumeTechnocracyInitiativeBonus(state: GameState, player: Player): number {
  if (getStyleId(state, player) !== 'technokratie') return 0;
  const flags = state.effectFlags[player] as any;
  if (flags.technocracyInitiativeUsed) return 0;
  flags.technocracyInitiativeUsed = true;
  return 1;
}

export function styleDisplayName(styleId: LeadershipStyleId): string {
  return LEADERSHIP_STYLES[styleId]?.name ?? styleId;
}

/** Hide opponent traps for Schattenstaat viewers (render helper). */
export function shouldHideTrapFromViewer(
  state: GameState,
  trapOwner: Player,
  viewer: Player
): boolean {
  if (trapOwner === viewer) return false;
  return getStyleId(state, trapOwner) === 'schattenstaat';
}
