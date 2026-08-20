import { GameState, Card, Player } from '../types/game';
import { sumRow, getCardActionPointCost } from '../utils/gameUtils';

export { chooseAiWeighingDecisions } from '../utils/weighing';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type AIAction =
  | { type: 'pass' }
  | { type: 'play'; index: number; lane?: 'innen' | 'aussen' };

export interface AIActionHandlers {
  playCard: (player: Player, handIndex: number, lane?: 'innen' | 'aussen') => void;
  passTurn: (player: Player) => void;
}

/**
 * Execute one AI decision through the real playCard/passTurn pipeline so all
 * card effects, traps and auras fire exactly as they do for a human player.
 *
 * Abwiegephase decisions are handled separately via chooseAiWeighingDecisions
 * in utils/weighing.ts (auto-run from useGameActions when pendingWeighing is open).
 */
export function takeTurn(
  state: GameState,
  difficulty: Difficulty,
  log: (msg: string) => void,
  handlers: AIActionHandlers
) {
  const aiEnabled = state.aiEnabled?.[2] ?? false;
  if (!aiEnabled || state.current !== 2) return;

  const playerBoard = state.board[1];
  const aiBoard = state.board[2];
  const aiAP = state.actionPoints[2];

  log(`🤖 AI(${difficulty}) Analyse: P=${sumRow([...playerBoard.aussen])} vs AI=${sumRow([...aiBoard.aussen])}`);

  if (aiAP <= 0) {
    log('🤖 AI passt - keine AP mehr.');
    handlers.passTurn(2);
    return;
  }

  const action = decideBestAction(state, 2, difficulty);
  if (action.type === 'pass') {
    log('🤖 AI passt - keine guten Aktionen.');
    handlers.passTurn(2);
    return;
  }

  const chosenCard = state.hands[2][action.index];
  if (!chosenCard) {
    log('🤖 AI Fehler: Ungültiger Kartenindex, passe.');
    handlers.passTurn(2);
    return;
  }

  const apCost = getCardActionPointCost(chosenCard, state, 2);
  const prevAp = state.actionPoints[2];
  const cardName = (chosenCard as any).name || 'Unknown Card';
  const cardType = chosenCard.kind === 'pol' ? 'Government' : 'Special';
  log(`🤖 AP Counter: ${cardName} (${cardType}) kostet ${apCost} AP | Vorher: ${prevAp} AP`);

  if (chosenCard.kind === 'pol') {
    const lane = action.lane ?? 'aussen';
    const power = (chosenCard as any).influence ?? 0;
    log(`🤖 AI spielt ${chosenCard.name} (${power} Einfluss) via Engine.`);
    handlers.playCard(2, action.index, lane);
    return;
  }

  log(`🤖 AI spielt Spezialkarte ${chosenCard.name} via Engine.`);
  handlers.playCard(2, action.index, action.lane);
}

/** Light-weight decision helper for tests and takeTurn. */
export function decideBestAction(state: GameState, player: Player, difficulty: Difficulty = 'easy'): AIAction {
  const hand = state.hands[player];
  const aiAP = state.actionPoints[player];
  if (aiAP <= 0) return { type: 'pass' };

  const candidates: Array<{ index: number; card: Card; score: number; lane?: 'innen' | 'aussen' }> = [];
  const myInf = sumRow([...state.board[player].aussen]);
  const opponent = player === 1 ? 2 : 1;
  const oppInf = sumRow([...state.board[opponent].aussen]);
  const currentLead = myInf - oppInf;

  const totalCardsPlayed = state.board[player].aussen.length + state.board[player].innen.length;
  if (currentLead >= 20 && totalCardsPlayed >= 4) {
    return { type: 'pass' };
  }

  const opponentPassed = state.passed[opponent];

  if (opponentPassed && aiAP >= 1) {
    const governmentCards = hand.filter(card => card.kind === 'pol');
    if (governmentCards.length > 0) {
      const bestGovCard = governmentCards.reduce((best, card) => {
        const cardIdx = hand.findIndex(c => c === card);
        const influence = (card as any).influence || 0;
        const apCost = getCardActionPointCost(card, state, player);
        const score = influence / Math.max(1, apCost);
        return score > best.score ? { index: cardIdx, card, score } : best;
      }, { index: -1, card: null as Card | null, score: 0 });

      if (bestGovCard.index >= 0) {
        return { type: 'play', index: bestGovCard.index, lane: 'aussen' };
      }
    }
  }

  const governmentCards = hand.filter(card => card.kind === 'pol');
  if (governmentCards.length === 0) {
    const drawEffectCards = hand.filter(card => {
      if (card.kind === 'spec') {
        const spec = card as any;
        const effect = spec.effect || '';
        const effectKey = spec.effectKey || '';
        return effect.toLowerCase().includes('draw') ||
               effect.toLowerCase().includes('karte') ||
               effectKey.toLowerCase().includes('draw');
      }
      return false;
    });

    if (drawEffectCards.length > 0) {
      const bestDrawCard = drawEffectCards.reduce((best, card) => {
        const cardIdx = hand.findIndex(c => c === card);
        const apCost = getCardActionPointCost(card, state, player);
        const score = 100 / Math.max(1, apCost);
        return score > best.score ? { index: cardIdx, card, score } : best;
      }, { index: -1, card: null as Card | null, score: 0 });

      if (bestDrawCard.index >= 0) {
        return { type: 'play', index: bestDrawCard.index };
      }
    }
  }

  if (currentLead >= 10) return { type: 'pass' };

  hand.forEach((card, idx) => {
    const apCost = getCardActionPointCost(card, state, player);
    if (apCost > aiAP) return;

    let score = 0;
    let suggestedLane: 'innen' | 'aussen' | undefined = undefined;

    if (card.kind === 'pol') {
      const pol = card as any;
      suggestedLane = 'aussen';
      const influence = pol.influence || 0;
      score = influence / Math.max(1, apCost) * 100;
      score += 15;
    } else if (card.kind === 'spec') {
      const spec = card as any;
      if (spec.type === 'Intervention') score = 30;
      else score = 20 + (spec.bp || 0) * 2;
    }

    if (difficulty === 'medium') score += Math.floor(Math.random() * 6) - 2;
    if (difficulty === 'hard') score += 4;

    candidates.push({ index: idx, card, score, lane: suggestedLane });
  });

  if (candidates.length === 0) return { type: 'pass' };

  candidates.sort((a, b) => b.score - a.score);
  if (difficulty === 'hard') {
    const top = candidates.slice(0, Math.min(4, candidates.length));
    const rolloutScores: Map<number, number> = new Map();

    const simulate = (stateSnapshot: GameState, playIndex: number, lane?: 'innen' | 'aussen') => {
      const simState = JSON.parse(JSON.stringify(stateSnapshot)) as GameState;
      const card = simState.hands[player][playIndex];
      const apCost = getCardActionPointCost(card, simState, player);

      simState.actionPoints[player] = Math.max(0, simState.actionPoints[player] - apCost);
      simState.hands[player].splice(playIndex, 1);
      if (card.kind === 'pol') {
        const targetLane = lane ?? 'aussen';
        (simState.board[player] as any)[targetLane].push(card);
      } else if (card.kind === 'spec' && (card as any).type === 'Intervention') {
        simState.traps[player].push(card);
      }

      const myInfSim = sumRow([...simState.board[player].aussen]);
      const opp = player === 1 ? 2 : 1;
      const oppInfSim = sumRow([...simState.board[opp].aussen]);
      return myInfSim - oppInfSim;
    };

    for (const c of top) {
      let acc = 0;
      const trials = 6;
      for (let t = 0; t < trials; t++) {
        acc += simulate(state, c.index, c.lane);
      }
      rolloutScores.set(c.index, acc / trials + c.score);
    }

    let bestIdx = top[0].index;
    let bestScore = rolloutScores.get(bestIdx) ?? top[0].score;
    for (const c of top) {
      const s = rolloutScores.get(c.index) ?? c.score;
      if (s > bestScore) {
        bestScore = s;
        bestIdx = c.index;
      }
    }

    const chosen = candidates.find(x => x.index === bestIdx)!;
    return { type: 'play', index: chosen.index, lane: chosen.lane };
  }

  const best = candidates[0];
  return { type: 'play', index: best.index, lane: best.lane };
}
