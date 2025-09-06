import { GameState, Card, Player } from '../types/game';
import { sumRow, getCardActionPointCost } from '../utils/gameUtils';
import { buildDeckFromEntries } from '../utils/gameUtils';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type AIAction =
  | { type: 'pass' }
  | { type: 'play'; index: number; lane?: 'innen' | 'aussen' };

// Basic AI player module with three difficulty presets.
// takeTurn applies a state update via setGameState(prev => newState).
export function takeTurn(
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  difficulty: Difficulty,
  log: (msg: string) => void
) {
  setGameState(prev => {
    const aiEnabled = prev.aiEnabled?.[2] ?? false;
    if (!aiEnabled || prev.current !== 2) return prev;

    const hand = prev.hands[2];
    const playerBoard = prev.board[1];
    const aiBoard = prev.board[2];
    const aiAP = prev.actionPoints[2];

    log(`🤖 AI(${difficulty}) Analyse: P=${sumRow([...playerBoard.aussen])} vs AI=${sumRow([...aiBoard.aussen])}`);

    if (aiAP <= 0) {
      log('🤖 AI passt - keine AP mehr.');
      return { ...prev, passed: { ...prev.passed, 2: true } };
    }

    // Use the centralized decision helper so tests and takeTurn share logic
    const action = decideBestAction(prev, 2, difficulty);
    if (action.type === 'pass') {
      log('🤖 AI passt - keine guten Aktionen.');
      return { ...prev, passed: { ...prev.passed, 2: true } };
    }

    // Execute chosen play
    const playIndex = action.type === 'play' ? action.index : -1;
    const chosenCard = prev.hands[2][playIndex];
    if (!chosenCard) {
      log('🤖 AI Fehler: Ungültiger Kartenindex, passe.');
      return { ...prev, passed: { ...prev.passed, 2: true } };
    }

    const apCost = getCardActionPointCost(chosenCard, prev, 2);

    function detectLaneForCard(card: any): 'innen' | 'aussen' {
      // Government cards (politicians) go to 'aussen' (government lane)
      if (card.kind === 'pol') return 'aussen';

      // Public cards (specials with type 'Öffentlichkeitskarte') go to 'innen' (public lane)
      if (card.kind === 'spec' && card.type === 'Öffentlichkeitskarte') return 'innen';

      // Legacy fallback for old card format
      if (card.T && card.T >= 2) return 'aussen';
      if (card.tag && ['Staatsoberhaupt', 'Regierungschef', 'Diplomat'].includes(card.tag)) return 'aussen';

      // Default to public lane for special cards
      return 'innen';
    }

    if (chosenCard.kind === 'pol') {
      const lane = action.lane ?? detectLaneForCard(chosenCard);
      const newP2Hand = [...prev.hands[2]];
      const [played] = newP2Hand.splice(playIndex, 1);
      const newP2Lane = [...prev.board[2][lane], played];
      const newP2Board = { ...prev.board[2], [lane]: newP2Lane };
      const newBoard = { ...prev.board, 2: newP2Board };
      const newActionPoints = { ...prev.actionPoints, 2: prev.actionPoints[2] - apCost };

      const laneName = lane === 'aussen' ? 'Regierungsreihe' : 'Öffentlichkeitsreihe';
      const power = (played as any).influence ?? 0;
      log(`🤖 AI spielt ${played.name} (${power} Einfluss) nach ${laneName}.`);

      return {
        ...prev,
        hands: { ...prev.hands, 2: newP2Hand },
        board: newBoard,
        actionPoints: newActionPoints
      };
    }

    // spec cards
    const newP2Hand = [...prev.hands[2]];
    const [playedSpec] = newP2Hand.splice(playIndex, 1);
    const newActionPoints = { ...prev.actionPoints, 2: prev.actionPoints[2] - apCost };

    if ((playedSpec as any).type === 'Dauerhaft-Initiative') {
      const slotType = (playedSpec as any).slot === 'Öffentlichkeit' ? 'public' : 'government';
      if (slotType === 'government' && !prev.permanentSlots[2].government) {
        const newPermanentSlots = { ...prev.permanentSlots, 2: { ...prev.permanentSlots[2], government: playedSpec } };
        log(`🤖 AI legt ${playedSpec.name} in Regierung Spezial-Slot.`);
        return { ...prev, hands: { ...prev.hands, 2: newP2Hand }, permanentSlots: newPermanentSlots, actionPoints: newActionPoints };
      } else if (slotType === 'public' && !prev.permanentSlots[2].public) {
        const newPermanentSlots = { ...prev.permanentSlots, 2: { ...prev.permanentSlots[2], public: playedSpec } };
        log(`🤖 AI legt ${playedSpec.name} in Öffentlichkeit Spezial-Slot.`);
        return { ...prev, hands: { ...prev.hands, 2: newP2Hand }, permanentSlots: newPermanentSlots, actionPoints: newActionPoints };
      }
    }

    log(`🤖 AI spielt Spezialkarte ${playedSpec.name}.`);
    return { ...prev, hands: { ...prev.hands, 2: newP2Hand }, actionPoints: newActionPoints };
  });
}

// Expose a light-weight decision helper for tests
export function decideBestAction(state: GameState, player: Player, difficulty: Difficulty = 'easy'): AIAction {
  // reuse takeTurn logic but without mutating state: produce an action suggestions
  const hand = state.hands[player];
  const aiAP = state.actionPoints[player];
  if (aiAP <= 0) return { type: 'pass' };
  // Policy: maximize influence placed per round. If current lead is already durable, pass.
  const candidates: Array<{ index: number; card: Card; score: number; lane?: 'innen' | 'aussen' }> = [];
  const myInf = sumRow([...state.board[player].aussen]);
  const opponent = player === 1 ? 2 : 1;
  const oppInf = sumRow([...state.board[opponent].aussen]);

  // If already holding a durable lead, pass
  const currentLead = myInf - oppInf;
  if (currentLead >= 3) return { type: 'pass' };

  hand.forEach((card, idx) => {
    const apCost = getCardActionPointCost(card, state, player);
    if (apCost > aiAP) return;

    let score = 0;
    let suggestedLane: 'innen' | 'aussen' | undefined = undefined;

    if (card.kind === 'pol') {
      const pol = card as any;
      // All politician cards go to government lane (aussen)
      suggestedLane = 'aussen';
      const influence = pol.influence || 0;
      // Strong preference: influence per AP (primary objective)
      score = influence / Math.max(1, apCost) * 100;
      // Government cards get bonus for being in correct lane
      score += 15;
    } else if (card.kind === 'spec') {
      const spec = card as any;
      // Specs less prioritized; interventions get moderate score
      if (spec.type === 'Intervention') score = 30;
      else score = 20 + (spec.bp || 0) * 2;
    }

    // difficulty randomness
    if (difficulty === 'medium') score += Math.floor(Math.random() * 6) - 2;
    if (difficulty === 'hard') score += 4;

    candidates.push({ index: idx, card, score, lane: suggestedLane });
  });

  if (candidates.length === 0) return { type: 'pass' };

  candidates.sort((a, b) => b.score - a.score);
  // If hard difficulty, run light Monte Carlo rollouts from top candidates
  if (difficulty === 'hard') {
    const top = candidates.slice(0, Math.min(4, candidates.length));
    const rolloutScores: Map<number, number> = new Map();

    const simulate = (stateSnapshot: GameState, playIndex: number, lane?: 'innen' | 'aussen') => {
      // Very lightweight simulation: apply the play and evaluate immediate board influence difference
      const simState = JSON.parse(JSON.stringify(stateSnapshot)) as GameState;
      const card = simState.hands[player][playIndex];
      const apCost = getCardActionPointCost(card, simState, player);

      // apply simple play
      simState.actionPoints[player] = Math.max(0, simState.actionPoints[player] - apCost);
      simState.hands[player].splice(playIndex, 1);
      if (card.kind === 'pol') {
        const targetLane = lane ?? ((card as any).tag === 'Staatsoberhaupt' || (card as any).tag === 'Regierungschef' || (card as any).tag === 'Diplomat' ? 'aussen' : 'innen');
        (simState.board[player] as any)[targetLane].push(card);
      } else if (card.kind === 'spec' && (card as any).type === 'Intervention') {
        simState.traps[player].push(card);
      }

      // Quick eval: difference in government influence
      const myInf = sumRow([...simState.board[player].aussen]);
      const opp = player === 1 ? 2 : 1;
      const oppInf = sumRow([...simState.board[opp].aussen]);
      return myInf - oppInf;
    };

    for (const c of top) {
      let acc = 0;
      const trials = 6;
      for (let t = 0; t < trials; t++) {
        acc += simulate(state, c.index, c.lane);
      }
      rolloutScores.set(c.index, acc / trials + c.score);
    }

    // pick best by rollout-adjusted score
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



