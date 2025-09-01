import { GameState, Card, Player } from '../types/game';
import { sumRow, getCardActionPointCost } from '../utils/gameUtils';

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

    const candidates: Array<{ index: number; card: Card; priority: number; reason: string; apCost: number }> = [];

    hand.forEach((card, idx) => {
      const apCost = getCardActionPointCost(card, prev, 2);
      if (apCost > aiAP) return;

      let priority = 0;
      let reason = '';

      if (card.kind === 'pol') {
        const polCard = card as any;
        const lane = polCard.tag === 'Staatsoberhaupt' || polCard.tag === 'Regierungschef' || polCard.tag === 'Diplomat' ? 'aussen' : 'innen';
        if (prev.board[2][lane].length < 5) {
          // simple heuristics
          priority = (polCard.influence || 0) + (lane === 'aussen' ? 50 : 20);
          reason = lane === 'aussen' ? 'Regierungsaufbau' : 'Öffentlichkeit';
        }
      }
      else if (card.kind === 'spec') {
        const specCard = card as any;
        if (specCard.type === 'Sofort-Initiative' || specCard.type === 'Dauerhaft-Initiative') {
          priority = specCard.bp ? 40 + specCard.bp * 5 : 50;
          reason = 'Initiative';
        } else if (specCard.type === 'Intervention') {
          priority = 45;
          reason = 'Intervention';
        } else {
          priority = 30;
          reason = 'Sonstiges';
        }
      }

      if (priority > 0) {
        // difficulty adjustments
        if (difficulty === 'medium') {
          // small randomness
          priority += Math.floor(Math.random() * 10) - 5;
        } else if (difficulty === 'hard') {
          // bias toward higher-impact plays
          priority += 10;
        }

        candidates.push({ index: idx, card, priority, reason, apCost });
      }
    });

    if (candidates.length === 0) {
      log('🤖 AI passt - keine spielbaren Karten verfügbar.');
      return { ...prev, passed: { ...prev.passed, 2: true } };
    }

    candidates.sort((a, b) => b.priority - a.priority);
    const choice = candidates[0];

    if (choice.card.kind === 'pol') {
      const polChoice = choice.card as any;
      const lane = polChoice.tag === 'Staatsoberhaupt' || polChoice.tag === 'Regierungschef' || polChoice.tag === 'Diplomat' ? 'aussen' : 'innen';

      const newP2Hand = [...prev.hands[2]];
      const [played] = newP2Hand.splice(choice.index, 1);
      const newP2Lane = [...prev.board[2][lane], played];
      const newP2Board = { ...prev.board[2], [lane]: newP2Lane };
      const newBoard = { ...prev.board, 2: newP2Board };
      const newActionPoints = { ...prev.actionPoints, 2: prev.actionPoints[2] - choice.apCost };

      const laneName = lane === 'aussen' ? 'Regierungsreihe' : 'Öffentlichkeitsreihe';
      const power = (played as any).influence ?? 0;
      log(`🤖 AI spielt ${played.name} (${power} Einfluss) nach ${laneName}. (${choice.reason})`);

      return {
        ...prev,
        hands: { ...prev.hands, 2: newP2Hand },
        board: newBoard,
        actionPoints: newActionPoints
      };
    }

    // spec cards
    const newP2Hand = [...prev.hands[2]];
    const [played] = newP2Hand.splice(choice.index, 1);
    const newActionPoints = { ...prev.actionPoints, 2: prev.actionPoints[2] - choice.apCost };

    // Permanent initiatives try to occupy slots
    if ((played as any).type === 'Dauerhaft-Initiative') {
      const slotType = (played as any).slot === 'Öffentlichkeit' ? 'public' : 'government';
      if (slotType === 'government' && !prev.permanentSlots[2].government) {
        const newPermanentSlots = { ...prev.permanentSlots, 2: { ...prev.permanentSlots[2], government: played } };
        log(`🤖 AI legt ${played.name} in Regierung Spezial-Slot. (${choice.reason})`);
        return { ...prev, hands: { ...prev.hands, 2: newP2Hand }, permanentSlots: newPermanentSlots, actionPoints: newActionPoints };
      } else if (slotType === 'public' && !prev.permanentSlots[2].public) {
        const newPermanentSlots = { ...prev.permanentSlots, 2: { ...prev.permanentSlots[2], public: played } };
        log(`🤖 AI legt ${played.name} in Öffentlichkeit Spezial-Slot. (${choice.reason})`);
        return { ...prev, hands: { ...prev.hands, 2: newP2Hand }, permanentSlots: newPermanentSlots, actionPoints: newActionPoints };
      }
    }

    log(`🤖 AI spielt Spezialkarte ${played.name}. (${choice.reason})`);
    return { ...prev, hands: { ...prev.hands, 2: newP2Hand }, actionPoints: newActionPoints };
  });
}

// Expose a light-weight decision helper for tests
export function decideBestAction(state: GameState, player: Player, difficulty: Difficulty = 'easy'): AIAction {
  // reuse takeTurn logic but without mutating state: produce an action suggestions
  const hand = state.hands[player];
  const aiAP = state.actionPoints[player];
  if (aiAP <= 0) return { type: 'pass' };

  const candidates: Array<{ index: number; card: Card; priority: number }> = [];
  hand.forEach((card, idx) => {
    const apCost = getCardActionPointCost(card, state, player);
    if (apCost > aiAP) return;
    let priority = 0;
    if (card.kind === 'pol') priority = (card as any).influence + 50;
    else priority = 40;
    if (difficulty === 'medium') priority += Math.floor(Math.random() * 10) - 5;
    if (difficulty === 'hard') priority += 10;
    candidates.push({ index: idx, card, priority });
  });
  if (candidates.length === 0) return { type: 'pass' };
  candidates.sort((a, b) => b.priority - a.priority);
  return { type: 'play', index: candidates[0].index };
}



