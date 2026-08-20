/**
 * Korruptionspegel (KP) / Korruptionslast (KL) / W10 Abwiegephase
 *
 * At round end (both players pass):
 *  1. KP += 1
 *  2. Freeze R = KL − KP for every government card
 *  3. Players choose Accept / Cover (−2 R, 1 PK) / Sacrifice (remove card, KP −1 next)
 *  4. Simultaneous W10 rolls for cards with effective R > 0
 *  5. Removals, then influence scoring
 */

import { GameState, Player, PoliticianCard, WeighingCardSnapshot, WeighingDecision, PendingWeighing } from '../types/game';
import { AUTOCRAT_START_3 } from './corruption';
import { getGlobalRNG, RNG } from '../services/rng';

export const PK_BASE_MAX = 3;
export const KP_MIN = 0;

/** Derive default KL from lore/tier/influence (override via base.kl). */
export function getDefaultKl(name: string, tier: number, influence: number): number {
  if (AUTOCRAT_START_3.includes(name) || influence >= 10) return 6;
  if (tier >= 2 && influence >= 9) return 5;
  if (tier >= 2) return 4;
  if (influence >= 6) return 3;
  if (influence >= 4) return 2;
  return 1;
}

export function getKl(card: PoliticianCard): number {
  const kl = Number(card.kl);
  if (Number.isFinite(kl) && kl >= 1) return Math.min(6, Math.max(1, Math.floor(kl)));
  return getDefaultKl(card.name || '', card.T || 1, card.influence || 0);
}

export function computeR(kl: number, kp: number): number {
  return kl - kp;
}

/**
 * W10 removal threshold: roll 1..threshold removes the card.
 * R1→2 (20%), R2→4, R3→6, R4→8, R≥5→9 (90%, never 100%).
 */
export function removalThreshold(r: number): number {
  if (r <= 0) return 0;
  if (r === 1) return 2;
  if (r === 2) return 4;
  if (r === 3) return 6;
  if (r === 4) return 8;
  return 9;
}

export function removalProbability(r: number): number {
  return removalThreshold(r) / 10;
}

export type RiskColor = 'green' | 'yellow' | 'orange' | 'red';

export function riskColorForR(r: number): RiskColor {
  if (r <= 0) return 'green';
  if (r <= 2) return 'yellow';
  if (r === 3) return 'orange';
  return 'red';
}

export function changeKp(state: GameState, delta: number, log?: (msg: string) => void): number {
  const before = Number(state.korruptionsPegel ?? 1);
  const after = Math.max(KP_MIN, before + delta);
  state.korruptionsPegel = after;
  if (log && before !== after) {
    log(`🌡️ Korruptionspegel: ${before} → ${after} (${delta >= 0 ? '+' : ''}${delta})`);
  }
  return after - before;
}

export function hasLobbyist(state: GameState, player: Player): boolean {
  return (state.board[player]?.aussen || []).some(
    (c) =>
      c.kind === 'pol' &&
      !(c as any).deactivated &&
      ((c as PoliticianCard).effectKey === 'gov.lobbyist.pk_max' || c.name === 'Lobbyist')
  );
}

export function getPkMax(state: GameState, player: Player): number {
  return PK_BASE_MAX + (hasLobbyist(state, player) ? 1 : 0);
}

export function addPoliticalCapital(state: GameState, player: Player, amount: number, log?: (msg: string) => void): number {
  if (!state.politicalCapital) state.politicalCapital = { 1: 0, 2: 0 };
  const max = getPkMax(state, player);
  const before = Number(state.politicalCapital[player] || 0);
  const after = Math.max(0, Math.min(max, before + amount));
  state.politicalCapital[player] = after;
  if (log && after !== before) {
    log(`💼 Politisches Kapital P${player}: ${before} → ${after} (max ${max})`);
  }
  return after - before;
}

function cardInfluence(card: PoliticianCard): number {
  return (card.influence || 0) + (card.tempBuffs || 0) - (card.tempDebuffs || 0);
}

function activeGovCards(state: GameState, p: Player): PoliticianCard[] {
  return (state.board[p]?.aussen || []).filter(
    (c) => c.kind === 'pol' && !(c as any).deactivated
  ) as PoliticianCard[];
}

function removeGovFromBoard(state: GameState, p: Player, card: PoliticianCard): void {
  const idx = state.board[p].aussen.findIndex((c) => c.uid === card.uid);
  if (idx !== -1) {
    state.board[p].aussen.splice(idx, 1);
    state.discard.push(card);
  }
}

function findGov(state: GameState, player: Player, uid: number): PoliticianCard | null {
  const card = state.board[player].aussen.find((c) => c.uid === uid);
  return card && card.kind === 'pol' ? (card as PoliticianCard) : null;
}

function isKronzeuge(card: PoliticianCard): boolean {
  return card.effectKey === 'gov.kronzeuge.reaction' || card.name === 'Kronzeuge';
}

/**
 * Start Abwiegephase: KP +1, snapshot all gov cards with frozen base R.
 * Returns true if the UI must wait for player decisions (always when any gov is out,
 * or always pause so KP rise is shown — we pause whenever there is at least one card OR always).
 */
export function beginWeighing(state: GameState, log: (msg: string) => void): boolean {
  if (state.pendingWeighing) return true;

  if (state.korruptionsPegel == null) state.korruptionsPegel = 1;
  if (!state.politicalCapital) state.politicalCapital = { 1: 0, 2: 0 };

  const kpBefore = Number(state.korruptionsPegel);
  changeKp(state, 1, log);
  const kpAfterRise = Number(state.korruptionsPegel);

  const cards: WeighingCardSnapshot[] = [];
  for (const p of [1, 2] as const) {
    for (const card of activeGovCards(state, p)) {
      const kl = getKl(card);
      const baseR = computeR(kl, kpAfterRise);
      cards.push({
        player: p,
        uid: card.uid,
        name: card.name,
        kl,
        baseR,
        influence: cardInfluence(card),
        decision: 'accept',
        effectiveR: baseR,
      });
    }
  }

  log(
    `⚖ Abwiegephase: KP ${kpBefore} → ${kpAfterRise}. ${cards.length} Regierungskarte(n) werden geprüft.`
  );

  state.pendingWeighing = {
    kpBefore,
    kpAfterRise,
    cards,
    confirmed: { 1: false, 2: false },
    phase: 'decide',
  };

  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('pc:weighing_start', {
          detail: { kpBefore, kpAfterRise, count: cards.length },
        })
      );
    } catch {
      /* UI only */
    }
  }

  // Always pause so players see KP rise / can confirm even with empty boards
  return true;
}

export function setWeighingDecisionOnState(
  state: GameState,
  player: Player,
  uid: number,
  decision: WeighingDecision,
  log: (msg: string) => void
): boolean {
  const pending = state.pendingWeighing;
  if (!pending || pending.phase !== 'decide') return false;
  if (pending.confirmed[player]) return false;

  const snap = pending.cards.find((c) => c.uid === uid && c.player === player);
  if (!snap) return false;

  const pk = Number(state.politicalCapital?.[player] || 0);
  const coverCount = pending.cards.filter(
    (c) => c.player === player && c.decision === 'cover' && c.uid !== uid
  ).length;

  if (decision === 'cover') {
    if (coverCount + 1 > pk) {
      log(`⚠️ Vertuschen: P${player} hat nicht genug Politisches Kapital (${pk}).`);
      return false;
    }
  }

  snap.decision = decision;
  if (decision === 'cover') snap.effectiveR = snap.baseR - 2;
  else snap.effectiveR = snap.baseR;

  log(
    `⚖ P${player}: ${snap.name} → ${
      decision === 'accept' ? 'Akzeptieren' : decision === 'cover' ? 'Vertuschen' : 'Opfern'
    } (R ${snap.baseR}${decision === 'cover' ? ` → ${snap.effectiveR}` : ''})`
  );
  return true;
}

export function confirmWeighingOnState(state: GameState, player: Player, log: (msg: string) => void): boolean {
  const pending = state.pendingWeighing;
  if (!pending || pending.phase !== 'decide') return false;
  if (pending.confirmed[player]) return true;

  // Validate PK for cover decisions
  const covers = pending.cards.filter((c) => c.player === player && c.decision === 'cover').length;
  const pk = Number(state.politicalCapital?.[player] || 0);
  if (covers > pk) {
    log(`⚠️ P${player}: Zu viele Vertuschungen (${covers}) für PK ${pk}.`);
    return false;
  }

  pending.confirmed[player] = true;
  log(`⚖ P${player} bestätigt die Abwiegephase.`);
  return true;
}

export interface WeighingResult {
  removed: WeighingCardSnapshot[];
  survived: WeighingCardSnapshot[];
  sacrificed: WeighingCardSnapshot[];
}

export function collectWeighingResult(state: GameState): WeighingResult {
  const pending = state.pendingWeighing;
  const empty: WeighingResult = { removed: [], survived: [], sacrificed: [] };
  if (!pending) return empty;
  const removed: WeighingCardSnapshot[] = [];
  const survived: WeighingCardSnapshot[] = [];
  const sacrificed: WeighingCardSnapshot[] = [];
  for (const snap of pending.cards) {
    if (snap.outcome === 'removed') removed.push(snap);
    else if (snap.outcome === 'sacrificed' || snap.outcome === 'kronzeuge') sacrificed.push(snap);
    else if (snap.outcome === 'safe') survived.push(snap);
  }
  return { removed, survived, sacrificed };
}

export function currentWeighingRollTarget(state: GameState): WeighingCardSnapshot | null {
  const pending = state.pendingWeighing;
  if (!pending || pending.phase !== 'rolling') return null;
  const queue = pending.rollQueue || [];
  const idx = pending.rollIndex ?? 0;
  if (idx >= queue.length) return null;
  return pending.cards.find((c) => c.uid === queue[idx]) ?? null;
}

export function isWeighingRollsComplete(state: GameState): boolean {
  const pending = state.pendingWeighing;
  if (!pending) return true;
  if (pending.phase === 'done') return true;
  if (pending.phase !== 'rolling') return false;
  const queue = pending.rollQueue || [];
  return (pending.rollIndex ?? 0) >= queue.length;
}

function finalizeWeighingPhase(state: GameState, log: (msg: string) => void): WeighingResult {
  const pending = state.pendingWeighing;
  const result = collectWeighingResult(state);
  if (pending) {
    pending.phase = 'done';
    pending.results = [...result.sacrificed, ...result.removed, ...result.survived];
  }
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(
        new CustomEvent('pc:weighing_done', {
          detail: {
            removed: result.removed.map(summarizeSnap),
            survived: result.survived.map(summarizeSnap),
            sacrificed: result.sacrificed.map(summarizeSnap),
            kp: state.korruptionsPegel,
          },
        })
      );
    } catch {
      /* UI only */
    }
  }
  log(
    `⚖ Untersuchung abgeschlossen: ${result.removed.length} entfernt, ${result.sacrificed.length} geopfert/Kronzeuge, ${result.survived.length} sicher.`
  );
  return result;
}

/**
 * After both players confirm: spend PK, apply sacrifices, auto-safe R≤0,
 * build player roll queue for R>0 cards. Returns true if waiting for player rolls.
 */
export function startWeighingRolls(state: GameState, log: (msg: string) => void): boolean {
  const pending = state.pendingWeighing;
  if (!pending) return false;
  if (pending.phase === 'rolling') return !isWeighingRollsComplete(state);
  if (pending.phase === 'done') return false;

  pending.phase = 'rolling';

  // Spend PK for Vertuschen
  for (const p of [1, 2] as const) {
    const covers = pending.cards.filter((c) => c.player === p && c.decision === 'cover').length;
    if (covers > 0) {
      addPoliticalCapital(state, p, -covers, log);
    }
  }

  // Sacrifices first
  for (const snap of pending.cards) {
    if (snap.decision !== 'sacrifice') continue;
    const card = findGov(state, snap.player, snap.uid);
    if (card) {
      removeGovFromBoard(state, snap.player, card);
      changeKp(state, -1, log);
      snap.outcome = 'sacrificed';
      snap.roll = null;
      snap.effectiveR = snap.baseR;
      log(`💣 Opfern: ${snap.name} (P${snap.player}) — KP −1.`);
      dispatchWeighingVisual(snap.player, snap.uid, snap.name, null, snap.baseR, 'sacrificed');
    }
  }

  const rollQueue: number[] = [];
  for (const snap of pending.cards) {
    if (snap.decision === 'sacrifice') continue;
    const card = findGov(state, snap.player, snap.uid);
    if (!card) continue;

    const effectiveR = snap.decision === 'cover' ? snap.baseR - 2 : snap.baseR;
    snap.effectiveR = effectiveR;

    if (effectiveR <= 0) {
      snap.outcome = 'safe';
      snap.roll = null;
      dispatchWeighingVisual(snap.player, snap.uid, snap.name, null, effectiveR, 'safe');
      log(`✅ ${snap.name}: R≤0 — sicher (kein Wurf).`);
      continue;
    }

    rollQueue.push(snap.uid);
  }

  pending.rollQueue = rollQueue;
  pending.rollIndex = 0;

  if (rollQueue.length === 0) {
    finalizeWeighingPhase(state, log);
    return false;
  }

  const first = pending.cards.find((c) => c.uid === rollQueue[0]);
  if (first) {
    const thr = removalThreshold(first.effectiveR ?? first.baseR);
    log(
      `🎲 Untersuchung: ${first.name} (P${first.player}) — W10 würfeln (Entfernung bei 1–${thr}).`
    );
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('pc:weighing_await_roll', {
            detail: {
              uid: first.uid,
              player: first.player,
              name: first.name,
              r: first.effectiveR ?? first.baseR,
              threshold: thr,
            },
          })
        );
      } catch {
        /* UI only */
      }
    }
  }
  return true;
}

/**
 * Apply a player W10 roll for the current queue card (or matching uid).
 * Returns 'await_next' | 'done'.
 */
export function applyWeighingRoll(
  state: GameState,
  uid: number,
  roll: number,
  log: (msg: string) => void
): 'await_next' | 'done' | 'ignored' {
  const pending = state.pendingWeighing;
  if (!pending || pending.phase !== 'rolling') return 'ignored';

  const queue = pending.rollQueue || [];
  const idx = pending.rollIndex ?? 0;
  if (idx >= queue.length) return 'done';
  if (queue[idx] !== uid) return 'ignored';

  const snap = pending.cards.find((c) => c.uid === uid);
  if (!snap) {
    pending.rollIndex = idx + 1;
    return isWeighingRollsComplete(state) ? 'done' : 'await_next';
  }

  const card = findGov(state, snap.player, snap.uid);
  const effectiveR = snap.effectiveR ?? (snap.decision === 'cover' ? snap.baseR - 2 : snap.baseR);
  snap.effectiveR = effectiveR;
  const clampedRoll = Math.max(1, Math.min(10, Math.floor(roll)));
  snap.roll = clampedRoll;

  if (!card) {
    snap.outcome = 'safe';
    pending.rollIndex = idx + 1;
    return advanceOrFinish(state, log);
  }

  const threshold = removalThreshold(effectiveR);
  const fails = clampedRoll <= threshold;

  if (fails) {
    if (isKronzeuge(card)) {
      removeGovFromBoard(state, snap.player, card);
      changeKp(state, -3, log);
      snap.outcome = 'kronzeuge';
      log(`🎤 Kronzeuge: ${snap.name} fällt durch (W10=${clampedRoll}≤${threshold}) — abgeworfen, KP −3.`);
      dispatchWeighingVisual(snap.player, snap.uid, snap.name, clampedRoll, effectiveR, 'kronzeuge');
    } else {
      removeGovFromBoard(state, snap.player, card);
      snap.outcome = 'removed';
      log(`❌ Untersuchung: ${snap.name} (R=${effectiveR}) W10=${clampedRoll} ≤ ${threshold} — ENTFERNT.`);
      dispatchWeighingVisual(snap.player, snap.uid, snap.name, clampedRoll, effectiveR, 'removed');
    }
  } else {
    snap.outcome = 'safe';
    log(`✅ Untersuchung: ${snap.name} (R=${effectiveR}) W10=${clampedRoll} > ${threshold} — sicher.`);
    dispatchWeighingVisual(snap.player, snap.uid, snap.name, clampedRoll, effectiveR, 'safe');
  }

  pending.rollIndex = idx + 1;
  return advanceOrFinish(state, log);
}

function advanceOrFinish(state: GameState, log: (msg: string) => void): 'await_next' | 'done' {
  if (isWeighingRollsComplete(state)) {
    finalizeWeighingPhase(state, log);
    return 'done';
  }
  const next = currentWeighingRollTarget(state);
  if (next) {
    const thr = removalThreshold(next.effectiveR ?? next.baseR);
    log(`🎲 Als Nächstes: ${next.name} (P${next.player}) — W10 (1–${thr} entfernt).`);
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('pc:weighing_await_roll', {
            detail: {
              uid: next.uid,
              player: next.player,
              name: next.name,
              r: next.effectiveR ?? next.baseR,
              threshold: thr,
            },
          })
        );
      } catch {
        /* UI only */
      }
    }
  }
  return 'await_next';
}

/**
 * Apply decisions + auto W10 rolls (tests / sync helpers).
 * Live play uses startWeighingRolls + applyWeighingRoll per card.
 */
export function resolveWeighing(state: GameState, log: (msg: string) => void, rng?: RNG): WeighingResult {
  const pending = state.pendingWeighing;
  const empty: WeighingResult = { removed: [], survived: [], sacrificed: [] };
  if (!pending) return empty;

  const dice = rng ?? getGlobalRNG();
  const needsRolls = startWeighingRolls(state, log);
  if (!needsRolls) {
    return collectWeighingResult(state);
  }

  while (!isWeighingRollsComplete(state)) {
    const target = currentWeighingRollTarget(state);
    if (!target) break;
    const roll = 1 + dice.randomInt(10);
    applyWeighingRoll(state, target.uid, roll, log);
  }

  return collectWeighingResult(state);
}

function summarizeSnap(s: WeighingCardSnapshot) {
  return {
    player: s.player,
    name: s.name,
    uid: s.uid,
    roll: s.roll ?? null,
    r: s.effectiveR ?? s.baseR,
    outcome: s.outcome,
  };
}

function dispatchWeighingVisual(
  player: Player,
  uid: number,
  name: string,
  roll: number | null,
  r: number,
  outcome: string
): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent('pc:weighing_card_result', {
        detail: { player, uid, name, roll, r, outcome },
      })
    );
    if (roll != null) {
      window.dispatchEvent(
        new CustomEvent('pc:engine_dice_result', {
          detail: { roll, sides: 10, player, targetUid: uid },
        })
      );
    }
  } catch {
    /* UI only */
  }
}

/** Heuristic AI decisions for Abwiegephase. */
export function chooseAiWeighingDecisions(state: GameState, player: Player): void {
  const pending = state.pendingWeighing;
  if (!pending || pending.phase !== 'decide') return;

  const own = pending.cards.filter((c) => c.player === player);
  const opp = player === 1 ? 2 : 1;
  const oppCards = pending.cards.filter((c) => c.player === opp);

  let pk = Number(state.politicalCapital?.[player] || 0);

  // Expected influence loss if accepted
  const scored = own
    .map((c) => {
      const r = c.baseR;
      const pRemove = removalProbability(r);
      return { snap: c, expectedLoss: c.influence * pRemove, r };
    })
    .sort((a, b) => b.expectedLoss - a.expectedLoss);

  for (const { snap, r } of scored) {
    if (pk <= 0) break;
    if (r <= 0) continue;
    // Cover high-EV cards
    if (snap.influence * removalProbability(r) >= 2) {
      snap.decision = 'cover';
      snap.effectiveR = snap.baseR - 2;
      pk -= 1;
    }
  }

  // Sacrifice a weak card if opponent has much more at-risk influence
  const ownAtRisk = own
    .filter((c) => c.decision !== 'sacrifice')
    .reduce((a, c) => a + c.influence * removalProbability(c.decision === 'cover' ? c.baseR - 2 : c.baseR), 0);
  const oppAtRisk = oppCards.reduce((a, c) => a + c.influence * removalProbability(c.baseR), 0);

  if (oppAtRisk > ownAtRisk + 4) {
    const weak = own
      .filter((c) => c.decision === 'accept' && c.influence <= 5)
      .sort((a, b) => a.influence - b.influence)[0];
    if (weak && weak.baseR <= 2) {
      weak.decision = 'sacrifice';
      weak.effectiveR = weak.baseR;
    }
  }
}

export function bothWeighingConfirmed(pending: PendingWeighing): boolean {
  return pending.confirmed[1] && pending.confirmed[2];
}
