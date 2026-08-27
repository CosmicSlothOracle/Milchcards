/**
 * Corruption system — second economy on government cards.
 *
 * - Every government card carries `corruption` (0–6) with a lore floor (`corruptionStart`).
 * - Corruption grants influence (turn-start temp buff) and unlocks active abilities (≥3).
 * - Round-end impact is handled by the KP/KL Abwiegephase in `weighing.ts`
 *   (deterministic bands + Vertuschen as full protection; no W10).
 * - Unspent AP at pass converts to Politisches Kapital (PK) for Vertuschen.
 */

import { GameState, Player, PoliticianCard, Card } from '../types/game';
import { EffectEvent } from '../types/effects';
import { consumeProtection, findActivePublicCard } from './cardClassification';

function other(p: Player): Player { return p === 1 ? 2 : 1; }

// ============================================================
// Starting corruption (lore-based)
// ============================================================

/** Autocrats / oppressors: powerful and already dirty (start 3). */
export const AUTOCRAT_START_3 = [
  'Vladimir Putin',
  'Xi Jinping',
  'Donald Trump',
  'Recep Tayyip Erdoğan',
  'Mohammed bin Salman',
  'Benjamin Netanyahu',
  'Ebrahim Raisi',
  'Giorgia Meloni',
];

export const CORRUPTION_MAX = 6;

/**
 * Lore rule: autocrats start 3, other Tier-2 leaders start 2, Tier-1 starts 1.
 */
export function getCorruptionStart(name: string, tier: number): number {
  if (AUTOCRAT_START_3.includes(name)) return 3;
  if (tier >= 2) return 2;
  return 1;
}

/** Initialize corruption fields on a freshly created politician instance. */
export function initCorruptionFields(card: PoliticianCard): void {
  const start = getCorruptionStart(card.name, card.T);
  card.corruptionStart = start;
  card.corruption = start;
  card.corruptionAbilityUsed = 0;
}

export function getCorruption(card: Card): number {
  const c = card as PoliticianCard;
  // Fall back to lore start if the runtime field was never seeded
  if (c.corruption == null) {
    const start = Number(c.corruptionStart ?? getCorruptionStart(c.name || '', c.T || 1));
    c.corruption = start;
    c.corruptionStart = c.corruptionStart ?? start;
  }
  return Math.max(0, Number(c.corruption ?? 0));
}

// ============================================================
// Corruption ladder (threshold states)
// ============================================================

export type CorruptionState = 'sauber' | 'verstrickt' | 'kompromittiert' | 'kleptokrat' | 'absolut_korrupt';

export function getCorruptionState(corruption: number): CorruptionState {
  if (corruption <= 0) return 'sauber';
  if (corruption <= 2) return 'verstrickt';
  if (corruption <= 4) return 'kompromittiert';
  if (corruption === 5) return 'kleptokrat';
  return 'absolut_korrupt';
}

export const CORRUPTION_STATE_LABEL: Record<CorruptionState, string> = {
  sauber: 'Sauber',
  verstrickt: 'Verstrickt',
  kompromittiert: 'Kompromittiert',
  kleptokrat: 'Kleptokrat',
  absolut_korrupt: 'Absolut korrupt',
};

/** Influence bonus from corruption (applied as temp buff at turn start). */
export function getCorruptionInfluenceBonus(corruption: number): number {
  if (corruption >= 6) return 4;
  if (corruption >= 4) return 3;
  if (corruption === 3) return 2;
  if (corruption === 2) return 1;
  return 0;
}

/** Active ability unlock threshold. */
export const ABILITY_UNLOCK_CORRUPTION = 3;

/**
 * Max active-ability uses per round: 1 normally, 2 at Kleptokrat (corruption 5+).
 * Elon Musk on the owner's board lowers the double-use threshold to corruption 4.
 */
export function getMaxAbilityUses(state: GameState, owner: Player, card: PoliticianCard): number {
  const corruption = getCorruption(card);
  const muskActive = !!findActivePublicCard(state.board[owner]?.innen || [], 'Elon Musk');
  const doubleAt = muskActive ? 4 : 5;
  return corruption >= doubleAt ? 2 : 1;
}

// ============================================================
// Board helpers
// ============================================================

function hasPermanent(state: GameState, p: Player, name: string): boolean {
  const slots = state.permanentSlots?.[p];
  if (!slots) return false;
  return [slots.government, slots.public, slots.initiativePermanent]
    .some(c => c && c.name === name && !(c as any).deactivated);
}

function hasActivePublic(state: GameState, p: Player, name: string): boolean {
  return !!findActivePublicCard(state.board[p]?.innen || [], name);
}

export function activeGovs(state: GameState, p: Player): PoliticianCard[] {
  return (state.board[p]?.aussen || [])
    .filter(c => c.kind === 'pol' && !(c as any).deactivated) as PoliticianCard[];
}

export function mostCorruptGov(state: GameState, p: Player, opts?: { minCorruption?: number; excludeUid?: number }): PoliticianCard | null {
  const min = opts?.minCorruption ?? 0;
  const candidates = activeGovs(state, p)
    .filter(c => getCorruption(c) >= min && c.uid !== opts?.excludeUid);
  if (!candidates.length) return null;
  return candidates.slice().sort((a, b) => {
    const d = getCorruption(b) - getCorruption(a);
    if (d !== 0) return d;
    return (b.influence || 0) - (a.influence || 0);
  })[0];
}

export function strongestOwnGov(state: GameState, p: Player): PoliticianCard | null {
  const candidates = activeGovs(state, p);
  if (!candidates.length) return null;
  return candidates.slice().sort((a, b) => {
    const ai = a.influence + (a.tempBuffs || 0) - (a.tempDebuffs || 0);
    const bi = b.influence + (b.tempBuffs || 0) - (b.tempDebuffs || 0);
    if (bi !== ai) return bi - ai;
    return b.uid - a.uid;
  })[0];
}

const OLIGARCH_TRIO = ['Gautam Adani', 'Alisher Usmanov', 'Roman Abramovich'];

export function oligarchTrioCount(state: GameState, p: Player): number {
  return (state.board[p]?.innen || [])
    .filter(c => OLIGARCH_TRIO.includes(c.name) && !(c as any).deactivated).length;
}

/** Oligarch trio aura: +1 influence per 2 total board corruption (max +3) while ≥2 trio members active. */
export function getOligarchTrioInfluenceBonus(state: GameState, p: Player): number {
  if (oligarchTrioCount(state, p) < 2) return 0;
  const totalCorruption = activeGovs(state, p).reduce((a, c) => a + getCorruption(c), 0);
  return Math.min(3, Math.floor(totalCorruption / 2));
}

// ============================================================
// Corruption delta application (single choke point)
// ============================================================

export interface CorruptionDeltaOpts {
  source?: string;
  /** player whose effect caused the change, if it was NOT the card owner */
  enemySourcePlayer?: Player;
  /** change came from an initiative (Doudna dampens gains) */
  fromInitiative?: boolean;
  /** allow the value to drop below corruptionStart (clean-sweep entry only) */
  allowBelowStart?: boolean;
  log?: (msg: string) => void;
  enqueue?: (e: EffectEvent) => void;
}

/**
 * Apply a corruption change to a government card. Returns actual delta applied.
 * Respects floor (corruptionStart), cap (6), and all dampening auras:
 * Milchglas Transparenz, Alternative Fakten, Jennifer Doudna, Lavrov "Njet",
 * Oppositionsblockade (reduction block) and Noam Chomsky (reduction AP tax).
 */
export function applyCorruptionDelta(
  state: GameState,
  card: PoliticianCard,
  owner: Player,
  amount: number,
  opts: CorruptionDeltaOpts = {}
): number {
  if (!card || card.kind !== 'pol' || amount === 0) return 0;
  const log = opts.log ?? ((m: string) => state.log.push(m));
  const source = opts.source || 'Korruption';
  const flags = state.effectFlags[owner] as any;

  let amt = amount;

  if (amt > 0) {
    // Lavrov "Njet": cancel one enemy-sourced gain entirely
    if (opts.enemySourcePlayer && opts.enemySourcePlayer !== owner && flags?.lavrovNjetAvailable) {
      flags.lavrovNjetAvailable = false;
      log(`🚫 Sergey Lavrov (Njet): Korruptionszuwachs auf ${card.name} annulliert (${source}).`);
      return 0;
    }
    // Milchglas Transparenz: own gains −1 (min 0) — frost obscures how dirty you get
    if (hasPermanent(state, owner, 'Milchglas Transparenz')) {
      amt = Math.max(0, amt - 1);
      if (amt < amount) log(`🪟 Milchglas Transparenz: Korruptionszuwachs um 1 gedämpft (${source}).`);
    }
    // Alternative Fakten: enemy-sourced changes −1
    if (opts.enemySourcePlayer && opts.enemySourcePlayer !== owner && hasPermanent(state, owner, 'Alternative Fakten')) {
      amt = Math.max(0, amt - 1);
      log(`🪧 Alternative Fakten: gegnerischer Korruptionseffekt um 1 gedämpft (${source}).`);
    }
    // Jennifer Doudna: initiative-driven gains −1 ("precision editing")
    if (opts.fromInitiative && hasActivePublic(state, owner, 'Jennifer Doudna')) {
      amt = Math.max(0, amt - 1);
      log(`🧬 Jennifer Doudna: Initiative-Korruption um 1 gedämpft (${source}).`);
    }
    if (amt <= 0) return 0;
  } else {
    // Milchglas ambivalence: cleansing is also fogged — reductions dampened by 1
    if (hasPermanent(state, owner, 'Milchglas Transparenz')) {
      const beforeDamp = amt;
      amt = Math.min(0, amt + 1);
      if (amt !== beforeDamp) log(`🪟 Milchglas Transparenz: Korruptionsabbau um 1 gedämpft (${source}).`);
      if (amt === 0) return 0;
    }
    // Oppositionsblockade: reductions blocked
    if (flags?.corruptionReductionBlocked) {
      log(`⛔ Oppositionsblockade: P${owner} kann Korruption nicht senken (${card.name}).`);
      return 0;
    }
    // Noam Chomsky (enemy side): reductions cost 1 AP extra — no AP, no cleanse
    if (hasActivePublic(state, other(owner), 'Noam Chomsky')) {
      const ap = state.actionPoints[owner] || 0;
      if (ap >= 1) {
        state.actionPoints[owner] = ap - 1;
        log(`🗞️ Noam Chomsky: Korruptionsabbau kostet P${owner} 1 AP extra (${ap} → ${ap - 1}).`);
      } else {
        log(`🗞️ Noam Chomsky: P${owner} kann Korruptionsabbau nicht bezahlen — ${card.name} bleibt schmutzig.`);
        return 0;
      }
    }
  }

  const before = getCorruption(card);
  const floor = opts.allowBelowStart ? 0 : Math.min(before, Math.max(0, Number(card.corruptionStart ?? 0)));
  const after = Math.max(amt < 0 ? floor : 0, Math.min(CORRUPTION_MAX, before + amt));
  if (after === before) {
    if (amt < 0) log(`ℹ️ ${card.name}: Korruption bereits am Lore-Minimum (${before}).`);
    return 0;
  }
  card.corruption = after;

  const arrow = after > before ? '📈' : '📉';
  log(`${arrow} ${source}: ${card.name} Korruption ${before} → ${after} (${CORRUPTION_STATE_LABEL[getCorruptionState(after)]}).`);

  // Visual intensification when corruption rises (GameCanvas listens)
  if (after > before && typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('pc:corruption_intensified', {
        detail: {
          targetUid: card.uid,
          name: card.name,
          before,
          after,
          delta: after - before,
          state: getCorruptionState(after),
          source,
        },
      }));
    } catch { /* UI only */ }
  }

  // Harari: once per round, when any government reaches corruption 5+, its observers draw 1
  if (after >= 5 && before < 5) {
    for (const p of [1, 2] as const) {
      const f = state.effectFlags[p] as any;
      if (hasActivePublic(state, p, 'Yuval Noah Harari') && !f.harariCorruptionDrawUsed) {
        f.harariCorruptionDrawUsed = true;
        if (opts.enqueue) {
          opts.enqueue({ type: 'DRAW_CARDS', player: p, amount: 1 });
          opts.enqueue({ type: 'LOG', msg: `📚 Yuval Noah Harari: ${card.name} erreicht Kleptokrat-Status — P${p} zieht 1 Karte.` });
        } else {
          const top = state.decks[p].shift();
          if (top) {
            state.hands[p].push(top);
            log(`📚 Yuval Noah Harari: ${card.name} erreicht Kleptokrat-Status — P${p} zieht 1 Karte.`);
          }
        }
      }
    }
  }

  return after - before;
}

// ============================================================
// Legacy audit API (replaced by KP/KL Abwiegephase in weighing.ts)
// Kept as thin stubs so older card-effect imports still compile.
// ============================================================

export type AuditOutcome = 'safe' | 'scandal' | 'remove';

export interface AuditStageInfo {
  stage: number;
  rawStage: number;
  autoFail: boolean;
  details: string[];
  outcome: AuditOutcome;
}

export function getHushMoneyCap(_state: GameState, _owner: Player): number { return 2; }
export function isHushMoneyAllowed(_state: GameState, _owner: Player): boolean { return true; }

export function getAuditStage(_state: GameState, card: PoliticianCard, _owner: Player): AuditStageInfo {
  const corruption = getCorruption(card);
  return { stage: 0, rawStage: 0, autoFail: false, details: ['Abwiegephase ersetzt Audit'], outcome: 'safe' };
}

export interface PurgeTargetInfo {
  target: number;
  rollBonus: number;
  autoFail: boolean;
  details: string[];
}

export function getPurgeTarget(state: GameState, card: PoliticianCard, owner: Player): PurgeTargetInfo {
  const info = getAuditStage(state, card, owner);
  return { target: info.stage, rollBonus: 0, autoFail: info.autoFail, details: info.details };
}

export interface PurgeResult {
  removed: { player: Player; card: PoliticianCard; roll: number | null; target: number; outcome?: AuditOutcome }[];
  survived: { player: Player; card: PoliticianCard; roll: number | null; target: number; outcome?: AuditOutcome }[];
}

export function applyAuditScandal(card: PoliticianCard, log: (msg: string) => void): void {
  const corr = getCorruption(card);
  const bonus = getCorruptionInfluenceBonus(corr);
  if (bonus > 0) card.tempBuffs = Math.max(0, (card.tempBuffs || 0) - bonus);
  card.tempDebuffs = (card.tempDebuffs || 0) + 1;
  log(`📰 Skandal: ${card.name} verliert den Korruptionsbonus${bonus > 0 ? ` (−${bonus})` : ''} und −1 Einfluss.`);
}

export function applyPurgeGretaBonus(state: GameState, log: (msg: string) => void): void {
  for (const p of [1, 2] as const) {
    if (!hasActivePublic(state, p, 'Greta Thunberg')) continue;
    for (const gov of activeGovs(state, p)) {
      if (getCorruption(gov) === 0) {
        gov.tempBuffs = (gov.tempBuffs || 0) + 1;
        log(`🌱 Greta Thunberg: ${gov.name} (sauber) +1 Einfluss bei der Wertung.`);
      }
    }
  }
}

export function collectPurgeQueue(_state: GameState): { player: Player; uid: number }[] { return []; }
export function presentPurgeProbe(_state: GameState, _log: (msg: string) => void): boolean { return false; }
export function resolveCurrentPurgeProbe(_state: GameState, _log: (msg: string) => void, _opts?: { rawRoll?: number }): 'await_next' | 'done' {
  return 'done';
}
export function beginInteractivePurge(_state: GameState, log: (msg: string) => void): boolean {
  log('ℹ️ Legacy-Audit deaktiviert — Abwiegephase übernimmt die Rundenend-Prüfung.');
  return false;
}
export function runPurgeSequence(_state: GameState, log: (msg: string) => void): PurgeResult {
  log('ℹ️ runPurgeSequence no-op (Abwiegephase).');
  return { removed: [], survived: [] };
}

// ============================================================
// Once-per-round marks (survive per-turn flag resets)
// ============================================================

export function oncePerRound(state: GameState, p: Player, key: string): boolean {
  const s = state as any;
  if (!s._corruptionRoundMarks) s._corruptionRoundMarks = { 1: {}, 2: {} };
  const marks = s._corruptionRoundMarks[p] as Record<string, number>;
  if (marks[key] === state.round) return false;
  marks[key] = state.round;
  return true;
}

// ============================================================
// Turn-start integration (called from startOfTurnHooks)
// ============================================================

/**
 * Apply corruption influence bonus (+ oligarch trio aura) as temp buffs and
 * run turn-start corruption economy for player `p`. Runs AFTER temp buffs
 * were reset for the turn.
 */
export function applyCorruptionTurnStart(state: GameState, p: Player): void {
  const log = (m: string) => state.log.push(m);
  const flags = state.effectFlags[p] as any;

  // Reset per-turn corruption flags
  flags.harariCorruptionDrawUsed = false;
  flags.sorosCleanseUsed = false;
  flags.corruptionReductionBlocked = false;

  const trioBonus = getOligarchTrioInfluenceBonus(state, p);

  for (const gov of activeGovs(state, p)) {
    const bonus = getCorruptionInfluenceBonus(getCorruption(gov));
    if (bonus > 0) {
      gov.tempBuffs = (gov.tempBuffs || 0) + bonus;
      log(`🩸 Korruptionsbonus: ${gov.name} +${bonus} Einfluss (${CORRUPTION_STATE_LABEL[getCorruptionState(getCorruption(gov))]}).`);
    }
  }
  if (trioBonus > 0) {
    const strongest = strongestOwnGov(state, p);
    if (strongest) {
      strongest.tempBuffs = (strongest.tempBuffs || 0) + trioBonus;
      log(`💰 Oligarchen-Trio: ${strongest.name} +${trioBonus} Einfluss (Board-Korruption als Kapital).`);
    }
  }

  // Owning ≥2 oligarchs (any) at turn start: strongest gov +1 corruption (once per round)
  const oligarchNames = ['Elon Musk', 'Bill Gates', 'George Soros', 'Warren Buffett', 'Mukesh Ambani', 'Jeff Bezos', 'Alisher Usmanov', 'Gautam Adani', 'Jack Ma', 'Zhang Yiming', 'Roman Abramovich'];
  const oligarchCount = (state.board[p]?.innen || [])
    .filter(c => oligarchNames.includes(c.name) && !(c as any).deactivated).length;
  if (oligarchCount >= 2 && oncePerRound(state, p, 'oligarchPairGain')) {
    const strongest = strongestOwnGov(state, p);
    if (strongest) {
      applyCorruptionDelta(state, strongest, p, 1, { source: 'Oligarchen-Nähe', log });
    }
  }

  // George Soros foundation cleanse: pay 1 AP → −1 corruption on most corrupt own gov (auto, 1×/Zug)
  if (hasActivePublic(state, p, 'George Soros') && !flags.sorosCleanseUsed) {
    const dirty = mostCorruptGov(state, p, { minCorruption: 3 });
    if (dirty && (state.actionPoints[p] || 0) >= 1 && getCorruption(dirty) > Number(dirty.corruptionStart ?? 0)) {
      const applied = applyCorruptionDelta(state, dirty, p, -1, { source: 'George Soros (Stiftungsgelder)', log });
      if (applied !== 0) {
        state.actionPoints[p] = Math.max(0, (state.actionPoints[p] || 0) - 1);
        flags.sorosCleanseUsed = true;
        log(`💸 George Soros: 1 AP investiert — ${dirty.name} gewaschen.`);
      }
    }
  }

  // Warren Buffett rider: patient money is clean money (his aura gov also −1 corruption)
  // handled in startOfTurnHooks next to the existing Buffett aura.
}

/**
 * On-play corruption entry rules for a freshly played government card.
 * Called from useGameActions after the card lands in the aussen lane.
 */
export function applyCorruptionOnGovPlay(state: GameState, p: Player, card: PoliticianCard): void {
  const log = (m: string) => state.log.push(m);
  const flags = state.effectFlags[p] as any;

  // Clean-sweep bonus: enter with −1 below start (this round only)
  const sweep = (state as any)._cleanSweepBonus;
  if (sweep && sweep[p] === state.round) {
    const before = getCorruption(card);
    card.corruption = Math.max(0, Number(card.corruptionStart ?? 0) - 1);
    if (card.corruption !== before) {
      log(`🧼 Sauberer Sieg: ${card.name} startet mit Korruption ${card.corruption} (−1 unter Lore-Wert).`);
    }
  }

  // Think-tank vetting: next gov enters with −1 corruption
  if (flags?.nextGovCorruptionMinus1) {
    flags.nextGovCorruptionMinus1 = false;
    const before = getCorruption(card);
    card.corruption = Math.max(0, before - 1);
    if (card.corruption !== before) {
      log(`🔎 Think-tank (geprüfter Kandidat): ${card.name} startet mit Korruption ${card.corruption}.`);
    }
  }

  // Power corrupts: printed influence ≥7 gains +1 on entry
  if ((card.influence || 0) >= 7) {
    applyCorruptionDelta(state, card, p, 1, { source: 'Macht korrumpiert (Einfluss ≥7)', log });
  }
}