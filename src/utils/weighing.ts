/**
 * Korruptionspegel (KP) / Korruptionslast (KL) / Abwiegephase
 *
 * At round end (both players pass):
 *  1. KP += 1
 *  2. Freeze R = KL − KP for every government card
 *  3. Players choose Accept / Cover (1 PK → fully safe) / Sacrifice (remove card, KP −1)
 *  4. Deterministic bands (no W10):
 *       R ≤ 0  → Sicher (full influence)
 *       R 1–2  → Skandal (stays, scores with reduced influence)
 *       R ≥ 3  → Entfernt (does not score)
 *  5. Influence scoring
 *
 * Vertuschen is the control lever: spend leftover AP→PK during the round,
 * then buy safety instead of gambling the round on a probe.
 */

import { GameState, Player, PoliticianCard, WeighingCardSnapshot, WeighingDecision, PendingWeighing } from '../types/game';
import {
  AUTOCRAT_START_3,
  applyAuditScandal,
  getCorruption,
  getCorruptionInfluenceBonus,
} from './corruption';
import type { RNG } from '../services/rng';

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

export type WeighingBand = 'safe' | 'scandal' | 'remove';

/** Deterministic outcome for an accepted (uncovered) risk value. */
export function outcomeForR(r: number): WeighingBand {
  if (r <= 0) return 'safe';
  if (r <= 2) return 'scandal';
  return 'remove';
}

export function bandLabel(band: WeighingBand): string {
  if (band === 'safe') return 'Sicher';
  if (band === 'scandal') return 'Skandal';
  return 'Entfernt';
}

/** Vertuschen zeros risk — the card is fully protected. */
export function effectiveRForDecision(baseR: number, decision: WeighingDecision): number {
  if (decision === 'cover') return 0;
  return baseR;
}

/**
 * Kept for UI/legacy callers. Maps bands to a display "chance" so old
 * percentage widgets don't explode: safe 0, scandal 0 (not removed), remove 1.
 */
export function removalThreshold(r: number): number {
  return outcomeForR(r) === 'remove' ? 10 : 0;
}

export function removalProbability(r: number): number {
  return outcomeForR(r) === 'remove' ? 1 : 0;
}

export type RiskColor = 'green' | 'yellow' | 'orange' | 'red';

export function riskColorForR(r: number): RiskColor {
  const band = outcomeForR(r);
  if (band === 'safe') return 'green';
  if (band === 'scandal') return 'yellow';
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

function scandalScoreOf(card: PoliticianCard): number {
  const inf = cardInfluence(card);
  const bonus = getCorruptionInfluenceBonus(getCorruption(card));
  return Math.max(0, inf - bonus - 1);
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
 * Returns true so the UI can collect Accept / Cover / Sacrifice choices.
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
      const influence = cardInfluence(card);
      cards.push({
        player: p,
        uid: card.uid,
        name: card.name,
        kl,
        baseR,
        influence,
        scandalScore: scandalScoreOf(card),
        decision: 'accept',
        effectiveR: baseR,
      });
    }
  }

  log(
    `⚖ Abwiegephase: KP ${kpBefore} → ${kpAfterRise}. ${cards.length} Regierungskarte(n) — R≤0 sicher, R1–2 Skandal, R≥3 entfernt. Vertuschen (1 PK) schützt vollständig.`
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
    if (outcomeForR(snap.baseR) === 'safe') {
      log(`ℹ️ Vertuschen: ${snap.name} ist bereits sicher (R≤0).`);
      return false;
    }
    if (coverCount + 1 > pk) {
      log(`⚠️ Vertuschen: P${player} hat nicht genug Politisches Kapital (${pk}).`);
      return false;
    }
  }

  snap.decision = decision;
  snap.effectiveR = effectiveRForDecision(snap.baseR, decision);

  const preview = decision === 'sacrifice'
    ? 'Opfern'
    : bandLabel(outcomeForR(snap.effectiveR ?? snap.baseR));
  log(
    `⚖ P${player}: ${snap.name} → ${
      decision === 'accept' ? 'Akzeptieren' : decision === 'cover' ? 'Vertuschen' : 'Opfern'
    } (R ${snap.baseR}${decision === 'cover' ? ' → 0' : ''} · ${preview})`
  );
  return true;
}

export function confirmWeighingOnState(state: GameState, player: Player, log: (msg: string) => void): boolean {
  const pending = state.pendingWeighing;
  if (!pending || pending.phase !== 'decide') return false;
  if (pending.confirmed[player]) return true;

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
    else if (snap.outcome === 'safe' || snap.outcome === 'scandal') survived.push(snap);
  }
  return { removed, survived, sacrificed };
}

export function currentWeighingRollTarget(_state: GameState): WeighingCardSnapshot | null {
  return null;
}

export function isWeighingRollsComplete(state: GameState): boolean {
  const pending = state.pendingWeighing;
  if (!pending) return true;
  return pending.phase === 'done';
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
  const scandalN = result.survived.filter((s) => s.outcome === 'scandal').length;
  log(
    `⚖ Untersuchung abgeschlossen: ${result.removed.length} entfernt, ${result.sacrificed.length} geopfert/Kronzeuge, ${scandalN} Skandal, ${result.survived.length - scandalN} sicher.`
  );
  return result;
}

function applyBandToCard(
  state: GameState,
  snap: WeighingCardSnapshot,
  log: (msg: string) => void
): void {
  const card = findGov(state, snap.player, snap.uid);
  const effectiveR = snap.effectiveR ?? effectiveRForDecision(snap.baseR, snap.decision);
  snap.effectiveR = effectiveR;
  snap.roll = null;

  if (!card) {
    snap.outcome = 'safe';
    return;
  }

  const band = outcomeForR(effectiveR);

  if (band === 'safe') {
    snap.outcome = 'safe';
    dispatchWeighingVisual(snap.player, snap.uid, snap.name, null, effectiveR, 'safe');
    log(`✅ ${snap.name}: ${snap.decision === 'cover' ? 'vertuscht — ' : ''}R≤0 — sicher.`);
    return;
  }

  if (band === 'scandal') {
    applyAuditScandal(card, log);
    snap.outcome = 'scandal';
    dispatchWeighingVisual(snap.player, snap.uid, snap.name, null, effectiveR, 'scandal');
    log(
      `📰 Skandal: ${snap.name} (R=${effectiveR}) bleibt, wertet aber mit reduziertem Einfluss (${snap.scandalScore ?? '?'}).`
    );
    return;
  }

  if (isKronzeuge(card)) {
    removeGovFromBoard(state, snap.player, card);
    changeKp(state, -3, log);
    snap.outcome = 'kronzeuge';
    log(`🎤 Kronzeuge: ${snap.name} fliegt auf (R=${effectiveR}) — abgeworfen, KP −3.`);
    dispatchWeighingVisual(snap.player, snap.uid, snap.name, null, effectiveR, 'kronzeuge');
    return;
  }

  removeGovFromBoard(state, snap.player, card);
  snap.outcome = 'removed';
  log(`❌ Untersuchung: ${snap.name} (R=${effectiveR}) — ENTFERNT (kein Wurf).`);
  dispatchWeighingVisual(snap.player, snap.uid, snap.name, null, effectiveR, 'removed');
}

/**
 * After both players confirm: spend PK, apply sacrifices, resolve bands.
 * Always finishes immediately (no dice queue). Returns false = not waiting.
 */
export function resolveWeighingDecisions(state: GameState, log: (msg: string) => void): WeighingResult {
  const pending = state.pendingWeighing;
  const empty: WeighingResult = { removed: [], survived: [], sacrificed: [] };
  if (!pending) return empty;
  if (pending.phase === 'done') return collectWeighingResult(state);

  pending.phase = 'rolling';

  for (const p of [1, 2] as const) {
    const covers = pending.cards.filter((c) => c.player === p && c.decision === 'cover').length;
    if (covers > 0) {
      addPoliticalCapital(state, p, -covers, log);
    }
  }

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

  for (const snap of pending.cards) {
    if (snap.decision === 'sacrifice') continue;
    applyBandToCard(state, snap, log);
  }

  return finalizeWeighingPhase(state, log);
}

/** Alias used by live play after both confirms. Never waits for a roll. */
export function startWeighingRolls(state: GameState, log: (msg: string) => void): boolean {
  resolveWeighingDecisions(state, log);
  return false;
}

/** Dice queue removed — leftover PvP `weighing_roll` actions are ignored. */
export function applyWeighingRoll(
  _state: GameState,
  _uid: number,
  _roll: number,
  _log: (msg: string) => void
): 'await_next' | 'done' | 'ignored' {
  return 'ignored';
}

/**
 * Apply decisions and resolve bands (tests / sync helpers).
 */
export function resolveWeighing(state: GameState, log: (msg: string) => void, _rng?: RNG): WeighingResult {
  return resolveWeighingDecisions(state, log);
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
  } catch {
    /* UI only */
  }
}

function expectedScore(snap: WeighingCardSnapshot, decision: WeighingDecision): number {
  if (decision === 'sacrifice') return 0;
  const r = effectiveRForDecision(snap.baseR, decision);
  const band = outcomeForR(r);
  if (band === 'safe') return snap.influence;
  if (band === 'scandal') return snap.scandalScore ?? Math.max(0, snap.influence - 2);
  return 0;
}

/** Heuristic AI decisions for Abwiegephase — deterministic, PK-first. */
export function chooseAiWeighingDecisions(state: GameState, player: Player): void {
  const pending = state.pendingWeighing;
  if (!pending || pending.phase !== 'decide') return;

  const own = pending.cards.filter((c) => c.player === player);
  let pk = Number(state.politicalCapital?.[player] || 0);

  const coverIfWorth = (snap: WeighingCardSnapshot) => {
    if (pk <= 0) return;
    if (outcomeForR(snap.baseR) === 'safe') return;
    const gain = expectedScore(snap, 'cover') - expectedScore(snap, 'accept');
    if (gain <= 0) return;
    snap.decision = 'cover';
    snap.effectiveR = 0;
    pk -= 1;
  };

  // Protect removals first (highest influence), then expensive scandals.
  [...own]
    .filter((c) => outcomeForR(c.baseR) === 'remove')
    .sort((a, b) => b.influence - a.influence)
    .forEach(coverIfWorth);

  [...own]
    .filter((c) => c.decision === 'accept' && outcomeForR(c.baseR) === 'scandal')
    .sort((a, b) => (b.influence - (b.scandalScore ?? b.influence)) - (a.influence - (a.scandalScore ?? a.influence)))
    .forEach(coverIfWorth);

  // Uncovered removal on a weak card → sacrifice for next-round KP instead of a free loss.
  const doomedWeak = own
    .filter((c) => c.decision === 'accept' && outcomeForR(c.baseR) === 'remove' && c.influence <= 5)
    .sort((a, b) => a.influence - b.influence)[0];
  if (doomedWeak) {
    doomedWeak.decision = 'sacrifice';
    doomedWeak.effectiveR = doomedWeak.baseR;
  }
}

export function bothWeighingConfirmed(pending: PendingWeighing): boolean {
  return pending.confirmed[1] && pending.confirmed[2];
}
