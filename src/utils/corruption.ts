/**
 * Corruption system — second economy on government cards, resolved at the pass button.
 *
 * - Every government card carries `corruption` (0–6) with a lore floor (`corruptionStart`).
 * - Corruption grants influence (turn-start temp buff) and unlocks active abilities (≥3).
 * - When both players pass, every corrupt government is audited deterministically
 *   (no W6) before round scoring. Audit stage = corruption + tier ± modifiers.
 *   Outcomes: 0–2 safe · 3–4 scandal (lose bonus, −1 influence) · 5–6 removal
 *   (stage 5 avertible by shield or hush money → scandal; stage 6 by shield → scandal).
 * - AP stays a separate economy (soft coupling): unspent AP at pass time acts as
 *   "hush money" (audit stage −1 each, max 2) but corruption never generates AP.
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
// Deterministic audit (replaces W6 purge)
// ============================================================

export type AuditOutcome = 'safe' | 'scandal' | 'remove';

export interface AuditStageInfo {
  /** Final audit stage 0–6 after modifiers */
  stage: number;
  /** Pre-clamp raw stage (for UI / debugging) */
  rawStage: number;
  autoFail: boolean;
  details: string[];
  outcome: AuditOutcome;
}

/** Cap for hush money AP → audit reduction. Diplomacy style raises this to 3. */
export function getHushMoneyCap(state: GameState, owner: Player): number {
  const style = (state as any).leaders?.[owner]?.styleId as string | undefined;
  if (style === 'diplomatie') return 3;
  return 2;
}

/** Bewegung style cannot spend hush money. */
export function isHushMoneyAllowed(state: GameState, owner: Player): boolean {
  const style = (state as any).leaders?.[owner]?.styleId as string | undefined;
  return style !== 'bewegung';
}

/**
 * Compute deterministic audit stage for a government card.
 * Former roll bonuses are inverted into stage modifiers (Fauci −1 stage, Navalny +1, …).
 */
export function getAuditStage(state: GameState, card: PoliticianCard, owner: Player): AuditStageInfo {
  const corruption = getCorruption(card);
  const details: string[] = [];
  let stage = corruption + (card.T || 1);
  details.push(`Korruption ${corruption} + Tier ${card.T || 1}`);

  const flags = state.effectFlags[owner] as any;
  const leader = (state as any).leaders?.[owner];
  const styleId = leader?.styleId as string | undefined;

  // Pass-context modifiers
  const handSize = Number(flags?.passHandSize ?? -1);
  if (handSize > 0 && !card._ignoreGreedyPass) {
    stage += 1;
    details.push('gieriger Pass +1');
  } else if (handSize === 0) {
    stage -= 1;
    details.push('leere Hand −1');
  } else if (card._ignoreGreedyPass) {
    details.push('Alternative Wahrheit: gieriger Pass ignoriert');
  }

  if (card._corruptionTainted) {
    stage += 1;
    details.push('korruptions-gebufft +1');
  }
  if (card.purgeMarked) {
    stage += 1;
    details.push('Snowden-Markierung +1');
  }
  if (hasPermanent(state, owner, 'Milchglas Transparenz')) {
    stage -= 1;
    details.push('Milchglas Transparenz −1');
  }
  if (hasPermanent(state, owner, 'Napoleon Komplex') && card.T === 1 && !(card as any).deactivated) {
    const t1 = activeGovs(state, owner).filter(c => c.T === 1);
    if (t1.length > 0) {
      const strongest = t1.reduce((best, c) => {
        const score = (c.influence || 0) + ((c as any).tempBuffs || 0) - ((c as any).tempDebuffs || 0);
        const bestScore = (best.influence || 0) + ((best as any).tempBuffs || 0) - ((best as any).tempDebuffs || 0);
        return score > bestScore ? c : best;
      });
      if (strongest.uid === card.uid) {
        stage += 1;
        details.push('Napoleon Komplex (Hybris) +1');
      }
    }
  }

  const hushCap = getHushMoneyCap(state, owner);
  const hushAllowed = isHushMoneyAllowed(state, owner);
  const hush = hushAllowed ? Math.min(hushCap, Number(flags?.hushMoneySpent || 0)) : 0;
  if (hush > 0) {
    stage -= hush;
    details.push(`Schweigegeld −${hush}`);
  } else if (!hushAllowed && Number(flags?.hushMoneySpent || 0) > 0) {
    details.push('Bewegung: Schweigegeld unwirksam');
  }

  const delta = Number(flags?.purgeTargetDelta || 0);
  if (delta > 0) {
    stage -= delta;
    details.push(`Verzögerungsverfahren −${delta}`);
  }
  if (card.T === 2 && hasPermanent(state, owner, 'Koalitionszwang')) {
    const t2Count = activeGovs(state, owner).filter(c => c.T === 2).length;
    if (t2Count >= 2) {
      stage -= 1;
      details.push('Koalitionszwang −1');
    }
  }
  if (oligarchTrioCount(state, owner) >= 2) {
    stage += 1;
    details.push('Oligarchen-Trio +1');
  }

  // Former roll bonuses → stage reduction (same net effect as old W6 +bonus)
  if (hasActivePublic(state, owner, 'Anthony Fauci')) {
    stage -= 1;
    details.push('Fauci: Stufe −1');
  }
  if (hasActivePublic(state, other(owner), 'Alexei Navalny')) {
    stage += 1;
    details.push('Navalny (Gegner): Stufe +1');
  }
  if (hasPermanent(state, owner, 'Zivilgesellschaft') && corruption <= 1) {
    stage -= 1;
    details.push('Zivilgesellschaft: Stufe −1 (sauber)');
  }
  const flatRollBonus = Number(flags?.purgeRollBonus || 0);
  if (flatRollBonus !== 0) {
    stage -= flatRollBonus;
    details.push(`Audit-Bonus ${flatRollBonus > 0 ? '−' : '+'}${Math.abs(flatRollBonus)}`);
  }

  // Autokratie weakness: strongest own gov +1 audit
  if (styleId === 'autokratie') {
    const strongest = strongestOwnGov(state, owner);
    if (strongest && strongest.uid === card.uid) {
      stage += 1;
      details.push('Autokratie (Hybris): Stufe +1');
    }
  }

  // Schattenstaat weakness: own helpful audit modifiers are −1 weaker
  // (applied as +1 if any own-side stage reduction was present beyond hush)
  if (styleId === 'schattenstaat') {
    const helpful = details.some(d =>
      d.includes('Milchglas') || d.includes('Verzögerungsverfahren') ||
      d.includes('Koalitionszwang') || d.includes('Fauci') || d.includes('Zivilgesellschaft') ||
      d.includes('Audit-Bonus −')
    );
    if (helpful) {
      stage += 1;
      details.push('Schattenstaat: eigene Audit-Hilfe −1 schwächer');
    }
  }

  // Champion active: Horst Köhler — per-card audit −2 this round
  if ((card as any)._auditStageDelta) {
    const d = Number((card as any)._auditStageDelta);
    stage += d;
    details.push(`Anführer-Effekt: Stufe ${d > 0 ? '+' : ''}${d}`);
  }

  const rawStage = stage;
  const clamped = Math.max(0, Math.min(CORRUPTION_MAX, stage));
  const autoFail = corruption >= CORRUPTION_MAX;

  let outcome: AuditOutcome = 'safe';
  if (autoFail || clamped >= 5) outcome = 'remove';
  else if (clamped >= 3) outcome = 'scandal';

  return { stage: clamped, rawStage, autoFail, details, outcome };
}

/**
 * Compatibility shim: former purge "target" maps to audit stage.
 * `rollBonus` is always 0 (no W6). `target` === stage for UI/tests.
 */
export interface PurgeTargetInfo {
  target: number;
  rollBonus: number;
  autoFail: boolean;
  details: string[];
}

export function getPurgeTarget(state: GameState, card: PoliticianCard, owner: Player): PurgeTargetInfo {
  const info = getAuditStage(state, card, owner);
  return {
    target: info.stage,
    rollBonus: 0,
    autoFail: info.autoFail,
    details: info.details,
  };
}

export interface PurgeResult {
  removed: { player: Player; card: PoliticianCard; roll: number | null; target: number; outcome?: AuditOutcome }[];
  survived: { player: Player; card: PoliticianCard; roll: number | null; target: number; outcome?: AuditOutcome }[];
}

/** Apply scandal: strip corruption influence bonus for scoring + −1 influence. */
export function applyAuditScandal(card: PoliticianCard, log: (msg: string) => void): void {
  const corr = getCorruption(card);
  const bonus = getCorruptionInfluenceBonus(corr);
  if (bonus > 0) {
    card.tempBuffs = Math.max(0, (card.tempBuffs || 0) - bonus);
  }
  card.tempDebuffs = (card.tempDebuffs || 0) + 1;
  (card as any)._auditScandal = true;
  log(`📰 Skandal: ${card.name} verliert Korruptionsbonus (−${bonus}) und −1 Einfluss für die Wertung.`);
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

export function collectPurgeQueue(state: GameState): { player: Player; uid: number }[] {
  const queue: { player: Player; uid: number }[] = [];
  for (const p of [1, 2] as const) {
    for (const c of state.board[p].aussen) {
      if (c.kind !== 'pol' || (c as any).deactivated) continue;
      if (getCorruption(c as PoliticianCard) < 1) continue;
      queue.push({ player: p, uid: c.uid });
    }
  }
  return queue;
}

function findPurgeCard(state: GameState, player: Player, uid: number): PoliticianCard | null {
  const card = state.board[player].aussen.find(c => c.uid === uid);
  return card && card.kind === 'pol' ? (card as PoliticianCard) : null;
}

/** Emit focus events for the current audit stamp. Never waits for a W6. */
export function presentPurgeProbe(state: GameState, log: (msg: string) => void): boolean {
  const pending = state.pendingPurge;
  if (!pending || pending.index >= pending.queue.length) return false;
  const entry = pending.queue[pending.index];
  const card = findPurgeCard(state, entry.player, entry.uid);
  if (!card) {
    pending.index += 1;
    return presentPurgeProbe(state, log);
  }
  const info = getAuditStage(state, card, entry.player);
  const corr = getCorruption(card);
  log(`🎯 Audit: ${card.name} (P${entry.player}, K${corr}) — Stufe ${info.stage} [${info.outcome}].`);

  pending.awaitingRoll = false; // deterministic — auto-stamp advances via timer

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('pc:purge_probe_focus', {
        detail: {
          player: entry.player,
          targetUid: card.uid,
          name: card.name,
          target: info.stage,
          stage: info.stage,
          outcome: info.outcome,
          autoFail: info.autoFail,
          corruption: corr,
        },
      }));
      window.dispatchEvent(new CustomEvent('pc:audit_preview_changed', {
        detail: {
          player: entry.player,
          targetUid: card.uid,
          stage: info.stage,
          outcome: info.outcome,
          details: info.details,
        },
      }));
    } catch { /* UI only */ }
  }
  return false;
}

/**
 * Resolve the current audit stamp deterministically (no W6).
 * `opts.rawRoll` is ignored — kept for call-site compatibility.
 * Returns 'await_next' | 'done'.
 */
export function resolveCurrentPurgeProbe(
  state: GameState,
  log: (msg: string) => void,
  _opts?: { rawRoll?: number }
): 'await_next' | 'done' {
  const pending = state.pendingPurge;
  if (!pending || pending.index >= pending.queue.length) {
    return 'done';
  }
  const entry = pending.queue[pending.index];
  const card = findPurgeCard(state, entry.player, entry.uid);
  pending.awaitingRoll = false;

  if (!card) {
    pending.index += 1;
    return pending.index >= pending.queue.length ? 'done' : 'await_next';
  }

  const info = getAuditStage(state, card, entry.player);
  const corr = getCorruption(card);
  const p = entry.player;
  const hushSpent = Number((state.effectFlags[p] as any)?.hushMoneySpent || 0);

  let outcome = info.outcome;

  // Stage 5–6 removal can be averted → scandal
  if (outcome === 'remove') {
    const shielded = consumeProtection(card, state.shields as Set<number> | undefined);
    const hushSaves = info.stage === 5 && hushSpent > 0 && isHushMoneyAllowed(state, p);
    if (shielded || hushSaves) {
      const reason = shielded ? 'Schutz verbraucht' : 'Schweigegeld mildert';
      log(`🛡️ Audit: ${card.name} (Stufe ${info.stage}) — ${reason}, Skandal statt Entfernung.`);
      outcome = 'scandal';
    }
  }

  log(
    `📋 Audit P${p}: ${card.name} (K${corr}, Tier ${card.T}) — ` +
    `Stufe ${info.stage} [${info.details.join(', ')}] → ` +
    `${outcome === 'safe' ? 'GEPRÜFT' : outcome === 'scandal' ? 'SKANDAL' : 'ENTFERNT'}.`
  );

  if (outcome === 'remove') {
    removeFromBoard(state, p, card);
    pending.removed.push({ player: p, card, roll: null, target: info.stage, outcome });
    dispatchPurgeVisual(p, card, null, info.stage, false, 'audit-remove');
  } else if (outcome === 'scandal') {
    applyAuditScandal(card, log);
    pending.survived.push({ player: p, card, roll: null, target: info.stage, outcome });
    dispatchPurgeVisual(p, card, null, info.stage, true, 'audit-scandal');
  } else {
    pending.survived.push({ player: p, card, roll: null, target: info.stage, outcome });
    dispatchPurgeVisual(p, card, null, info.stage, true, 'audit-safe');
  }

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('pc:audit_applied', {
        detail: {
          player: p,
          targetUid: card.uid,
          name: card.name,
          stage: info.stage,
          outcome,
        },
      }));
    } catch { /* UI only */ }
  }

  pending.index += 1;
  if (pending.index >= pending.queue.length) {
    finalizePurgeLog(state, pending, log);
    return 'done';
  }
  return 'await_next';
}

function finalizePurgeLog(state: GameState, pending: NonNullable<GameState['pendingPurge']>, log: (msg: string) => void): void {
  if (pending.removed.length === 0 && pending.survived.length === 0) {
    log('✅ Audit: keine korrupten Karten auf dem Feld.');
  } else if (pending.removed.length === 0) {
    const scandals = pending.survived.filter(s => s.outcome === 'scandal').length;
    log(`✅ Audit: ${pending.survived.length} geprüft${scandals ? `, davon ${scandals} Skandal` : ''} — niemand entfernt.`);
  } else {
    const names = pending.removed.map(r => `${r.card.name} (P${r.player})`).join(', ');
    log(`🧹 Audit: ${pending.removed.length} entfernt — ${names}. ${pending.survived.length} bleiben.`);
  }
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('pc:purge_sequence_done', {
        detail: {
          removed: pending.removed.map(r => ({ player: r.player, name: r.card.name, roll: r.roll, target: r.target, outcome: r.outcome })),
          survived: pending.survived.map(r => ({ player: r.player, name: r.card.name, roll: r.roll, target: r.target, outcome: r.outcome })),
        },
      }));
    } catch { /* UI only */ }
  }
}

/**
 * Start interactive audit stamp sequence. Returns true if scoring must wait
 * for timed stamps. False means finished synchronously (no candidates).
 * Never waits for dice — awaitingRoll stays false so the UI timer advances.
 */
export function beginInteractivePurge(state: GameState, log: (msg: string) => void): boolean {
  applyPurgeGretaBonus(state, log);
  const queue = collectPurgeQueue(state);
  log('📋 AUDIT (Pass): Jede korrupte Regierungskarte wird deterministisch geprüft — vor der Punkteauswertung.');

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('pc:purge_sequence_start', { detail: { count: queue.length } }));
    } catch { /* UI only */ }
  }

  if (queue.length === 0) {
    log('✅ Audit: keine korrupten Karten auf dem Feld.');
    state.pendingPurge = undefined;
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(new CustomEvent('pc:purge_sequence_done', {
          detail: { removed: [], survived: [] },
        }));
      } catch { /* UI only */ }
    }
    return false;
  }

  for (const p of [1, 2] as const) {
    const has = queue.some(q => q.player === p);
    if (!has) log(`📋 Audit P${p}: keine korrupten Regierungskarten — übersprungen.`);
  }

  state.pendingPurge = {
    queue,
    index: 0,
    awaitingRoll: false,
    removed: [],
    survived: [],
  };
  presentPurgeProbe(state, log);
  return true;
}

/**
 * Run the full audit sequence synchronously (tests / AI / CORRUPTION_PURGE_CHECK).
 * Live play uses beginInteractivePurge + timed stamp advances.
 */
export function runPurgeSequence(state: GameState, log: (msg: string) => void): PurgeResult {
  const started = beginInteractivePurge(state, log);
  if (!started || !state.pendingPurge) {
    return { removed: [], survived: [] };
  }
  while (state.pendingPurge && state.pendingPurge.index < state.pendingPurge.queue.length) {
    const status = resolveCurrentPurgeProbe(state, log);
    if (status === 'done') break;
    presentPurgeProbe(state, log);
  }
  const pending = state.pendingPurge;
  const result: PurgeResult = {
    removed: pending?.removed ?? [],
    survived: pending?.survived ?? [],
  };
  state.pendingPurge = undefined;
  return result;
}

function dispatchPurgeVisual(
  player: Player,
  card: PoliticianCard,
  roll: number | null,
  target: number,
  survived: boolean,
  kind: string
): void {
  dispatchPurgeRoll(player, card.uid, roll, target, survived);
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('pc:corruption_resolved', {
      detail: {
        actor: player,
        targetUid: card.uid,
        success: survived,
        outcome: survived ? 'survived' : 'purged',
        type: 'purge',
        roll,
        target,
        name: card.name,
        kind,
      },
    }));
  } catch { /* UI only */ }
}

function removeFromBoard(state: GameState, p: Player, card: PoliticianCard): void {
  const idx = state.board[p].aussen.findIndex(c => c.uid === card.uid);
  if (idx !== -1) {
    state.board[p].aussen.splice(idx, 1);
    state.discard.push(card);
  }
}

function dispatchPurgeRoll(player: Player, targetUid: number, roll: number | null, target: number, survived: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('pc:purge_roll', {
      detail: { player, targetUid, roll, target, survived },
    }));
  } catch { /* UI only */ }
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