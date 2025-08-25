import { useCallback, useState } from 'react';
import { GameState, Card, Player } from '../types/game';
import { PRESET_DECKS } from '../data/gameData';
import { sumRow, getCardActionPointCost } from '../utils/gameUtils';

export function useGameAI(
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  log: (msg: string) => void
) {
  const aiEnabled = gameState.aiEnabled?.[2] ?? false;
  const [aiPreset, setAiPreset] = useState<keyof typeof PRESET_DECKS>('AUTORITAERER_REALIST');

  // Debug logging for AI state changes (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 DEBUG: useGameAI state - aiEnabled:', aiEnabled, 'aiPreset:', aiPreset);
  }

  // AI enabled state - controlled by game logic
  // const forceAIEnabled = true; // Removed force-enable hack

  // Enhanced setAiEnabled with logging
  const setAiEnabledWithLog = useCallback((enabled: boolean) => {
    setGameState(prev => ({
      ...prev,
      aiEnabled: {
        1: prev.aiEnabled?.[1] ?? false,
        2: enabled
      }
    }));

    // Only set preset when AI is enabled
    if (enabled) {
      setAiPreset('AUTORITAERER_REALIST');
    }
  }, [setGameState]);

  // Enhanced setAiPreset with logging - only when AI is enabled
  const setAiPresetWithLog = useCallback((preset: keyof typeof PRESET_DECKS) => {
    if (aiEnabled) {
      console.log('🔧 DEBUG: setAiPreset called with:', preset);
      setAiPreset(preset);
    } else {
      console.log('🔧 DEBUG: setAiPreset ignored - AI not enabled');
    }
  }, [aiEnabled]);

  const runAITurn = useCallback(() => {
    console.log('🔧 DEBUG: runAITurn called - aiEnabled:', aiEnabled, 'current player:', gameState.current);

    setGameState(prev => {
      // Check if AI is enabled and it's AI's turn
      if (!aiEnabled || prev.current !== 2) {
        console.log('🔧 DEBUG: AI not enabled or not AI turn - aiEnabled:', aiEnabled, 'current:', prev.current);
        console.log('🔧 DEBUG: Full AI state check - aiEnabled:', aiEnabled, 'current:', prev.current, 'aiPreset:', aiPreset);
        console.log('🔧 DEBUG: AI state check failed - returning early');
        return prev;
      }

      console.log('🔧 DEBUG: AI turn starting - analyzing hand and board...');
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 DEBUG: AI hand size:', prev.hands[2].length);
        console.log('🔧 DEBUG: AI AP:', prev.actionPoints[2], 'Actions used:', prev.actionsUsed[2]);
        console.log('🔧 DEBUG: AI hand cards:', prev.hands[2].map(c => c.name));
      }

      const hand = prev.hands[2];
      const playerBoard = prev.board[1]; // Player Board for analysis
      const aiBoard = prev.board[2]; // AI Board for analysis
      const aiAP = prev.actionPoints[2];
      const aiActionsUsed = prev.actionsUsed[2];

      // Strategy Analysis
      const playerInfluence = sumRow([...playerBoard.aussen]);
      const aiInfluence = sumRow([...aiBoard.aussen]);
      const influenceDiff = playerInfluence - aiInfluence;

      log(`🤖 KI-Analyse: Spieler ${playerInfluence} vs KI ${aiInfluence} (Diff: ${influenceDiff})`);

      // Check if AI should pass
      if (aiAP <= 0) {
        log('🤖 KI passt - keine AP mehr.');
        return { ...prev, passed: { ...prev.passed, 2: true } };
      }

      // AI Strategy: Prioritize based on situation
      const candidates: Array<{
        index: number;
        card: Card;
        priority: number;
        reason: string;
        apCost: number;
      }> = [];

      hand.forEach((card, idx) => {
        const apCost = getCardActionPointCost(card, prev, 2);

        // Debug logging for card analysis
        console.log(`🔧 DEBUG: AI card analysis - ${card.name}: AP cost ${apCost}, AI AP ${aiAP}, playable: ${apCost <= aiAP}`);

        // Skip if not enough AP
        if (apCost > aiAP) return;

        if (card.kind === 'pol') {
          const polCard = card as any;
          const lane = polCard.tag === 'Staatsoberhaupt' || polCard.tag === 'Regierungschef' || polCard.tag === 'Diplomat' ? 'aussen' : 'innen';

          if (prev.board[2][lane].length < 5) {
            let priority = 0;
            let reason = '';

            // High priority for strong government cards when behind
            if (lane === 'aussen' && influenceDiff > 5) {
              priority = 100 + polCard.influence;
              reason = 'Einfluss-Aufholjagd';
            }
            // High priority for Leadership/Diplomat synergy
            else if (polCard.tag === 'Leadership' || polCard.tag === 'Diplomat') {
              priority = 80 + polCard.influence;
              reason = 'Fähigkeiten-Synergie';
            }
            // Medium priority for government building
            else if (lane === 'aussen') {
              priority = 60 + polCard.influence;
              reason = 'Regierungsaufbau';
            }
            // Lower priority for public cards
            else {
              priority = 30 + polCard.influence;
              reason = 'Öffentlichkeits-Unterstützung';
            }

            candidates.push({ index: idx, card, priority, reason, apCost });
          }
        }
        else if (card.kind === 'spec') {
          const specCard = card as any;

          // Initiatives
          if (specCard.type === 'Sofort-Initiative' || specCard.type === 'Dauerhaft-Initiative') {
            let priority = 0;
            let reason = '';

            // High priority for opponent weakening
            if (specCard.name.includes('Offensive') || specCard.name.includes('Skandal')) {
              priority = 90;
              reason = 'Gegner-Schwächung';
            }
            // High priority for influence boost
            else if (specCard.name.includes('Wirtschaftlicher Druck') || specCard.name.includes('Koalitionszwang')) {
              if (influenceDiff > 3) {
                priority = 85;
                reason = 'Einfluss-Verstärkung';
              } else {
                priority = 40;
                reason = 'Defensiver Boost';
              }
            }
            // Medium priority for other initiatives
            else {
              priority = 50;
              reason = 'Allgemeine Initiative';
            }

            candidates.push({ index: idx, card, priority, reason, apCost });
          }

          // Interventions (Traps)
          else if (specCard.type === 'Intervention') {
            let priority = 0;
            let reason = '';

            // High priority for media opponents
            if (specCard.name === 'Fake News-Kampagne' &&
                playerBoard.innen.some(c => c.name.includes('Oprah') || c.name.includes('Zuckerberg'))) {
              priority = 95;
              reason = 'Medien-Gegner bekämpfen';
            }
            // High priority for strong opponents
            else if (specCard.name === 'Whistleblower' &&
                     playerBoard.aussen.some(c => (c as any).T === 2)) {
              priority = 90;
              reason = 'Tier-2-Gegner schwächen';
            }
            // High priority for movement/NGO opponents
            else if (specCard.name === 'Boykott-Kampagne' &&
                     playerBoard.innen.some(c => ['Greta Thunberg', 'Malala Yousafzai', 'Bill Gates', 'George Soros'].includes(c.name))) {
              priority = 85;
              reason = 'Bewegung/NGO-Gegner bekämpfen';
            }
            // Medium priority for general interventions
            else {
              priority = 40;
              reason = 'Präventive Falle';
            }

            candidates.push({ index: idx, card, priority, reason, apCost });
          }
        }
      });

      if (candidates.length === 0) {
        // Pass if no playable card
        log('🤖 KI passt - keine spielbaren Karten verfügbar.');
        return { ...prev, passed: { ...prev.passed, 2: true } };
      }

      // Sort by priority (highest first)
      candidates.sort((a, b) => b.priority - a.priority);

      // Debug logging of top candidates
      log(`🤖 KI-Kandidaten (Top 3): ${candidates.slice(0, 3).map(c => `${c.card.name} (${c.priority} - ${c.reason})`).join(', ')}`);

      const choice = candidates[0];

      // Execute the chosen action
      if (choice.card.kind === 'pol') {
        const polChoice = choice.card as any;
        const lane = polChoice.tag === 'Staatsoberhaupt' || polChoice.tag === 'Regierungschef' || polChoice.tag === 'Diplomat' ? 'aussen' : 'innen';

        // Hand update
        const newP2Hand = [...prev.hands[2]];
        const [played] = newP2Hand.splice(choice.index, 1);

        // Board update
        const newP2Lane = [...prev.board[2][lane], played];
        const newP2Board = { ...prev.board[2], [lane]: newP2Lane };
        const newBoard = { ...prev.board, 2: newP2Board };

        // AP update
        const newActionPoints = { ...prev.actionPoints, 2: prev.actionPoints[2] - choice.apCost };
        const newActionsUsed = { ...prev.actionsUsed, 2: prev.actionsUsed[2] + 1 };

        const laneName = lane === 'aussen' ? 'Regierungsreihe' : 'Öffentlichkeitsreihe';
        const power = (played as any).influence ?? 0;
        log(`🤖 KI spielt ${played.name} (${power} Einfluss) nach ${laneName}. (${choice.reason})`);

        return {
          ...prev,
          hands: { ...prev.hands, 2: newP2Hand },
          board: newBoard,
          actionPoints: newActionPoints,
          actionsUsed: newActionsUsed
        };
      }

      else if (choice.card.kind === 'spec') {
        const newP2Hand = [...prev.hands[2]];
        const [played] = newP2Hand.splice(choice.index, 1);

        // AP update
        const newActionPoints = { ...prev.actionPoints, 2: prev.actionPoints[2] - choice.apCost };
        const newActionsUsed = { ...prev.actionsUsed, 2: prev.actionsUsed[2] + 1 };

        // Permanent initiatives go to slots
        if ((played as any).type === 'Dauerhaft-Initiative') {
          const slotType = (played as any).slot === 'Öffentlichkeit' ? 'public' : 'government';

          if (slotType === 'government' && !prev.permanentSlots[2].government) {
            const newPermanentSlots = {
              ...prev.permanentSlots,
              2: { ...prev.permanentSlots[2], government: played }
            };
            log(`🤖 KI legt ${played.name} in Regierung Spezial-Slot. (${choice.reason})`);

            return {
              ...prev,
              hands: { ...prev.hands, 2: newP2Hand },
              permanentSlots: newPermanentSlots,
              actionPoints: newActionPoints,
              actionsUsed: newActionsUsed
            };
          }
          else if (slotType === 'public' && !prev.permanentSlots[2].public) {
            const newPermanentSlots = {
              ...prev.permanentSlots,
              2: { ...prev.permanentSlots[2], public: played }
            };
            log(`🤖 KI legt ${played.name} in Öffentlichkeit Spezial-Slot. (${choice.reason})`);

            return {
              ...prev,
              hands: { ...prev.hands, 2: newP2Hand },
              permanentSlots: newPermanentSlots,
              actionPoints: newActionPoints,
              actionsUsed: newActionsUsed
            };
          }
        }

        // Execute immediate initiatives
        log(`🤖 KI spielt Initiative ${played.name}. (${choice.reason})`);
        return {
          ...prev,
          hands: { ...prev.hands, 2: newP2Hand },
          actionPoints: newActionPoints,
          actionsUsed: newActionsUsed
        };
      }

      return prev;
    });

    // Auto-advance turn after AI action if needed
    setTimeout(() => {
      setGameState(currentState => {
        if (currentState.current === 2 && currentState.actionPoints[2] <= 0) {
          // Trigger turn advancement
          const newCurrent: Player = 1;
          const newActionPoints = { ...currentState.actionPoints };
          const newActionsUsed = { ...currentState.actionsUsed };
          newActionPoints[newCurrent] = 2;
          newActionsUsed[newCurrent] = 0;

          log(`🤖 KI-Zug beendet - Spieler ${newCurrent} ist am Zug (2 AP verfügbar)`);

          return {
            ...currentState,
            current: newCurrent,
            actionPoints: newActionPoints,
            actionsUsed: newActionsUsed
          };
        }
        return currentState;
      });
    }, 100);
  }, [aiEnabled, log, gameState.current]);

  const canUsePutinDoubleIntervention = useCallback((player: Player): boolean => {
    const board = gameState.board[player];
    const allCards = [...board.innen, ...board.aussen].filter(c => c.kind === 'pol') as any[];
    const putin = allCards.find(c => c.name === 'Vladimir Putin');

    if (!putin || putin.deactivated || putin._activeUsed) return false;

    const interventions = gameState.hands[player].filter(c => c.kind === 'spec');
    return interventions.length >= 2;
  }, [gameState]);

  const executePutinDoubleIntervention = useCallback((interventionCardIds: number[]) => {
    setGameState(prev => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const player = prev.current;
      // Putin special ability implementation would go here
      log(`🤖 Putin setzt doppelte Intervention ein`);
      return prev;
    });
  }, [log]);

  return {
    runAITurn,
    canUsePutinDoubleIntervention,
    executePutinDoubleIntervention,
    aiEnabled,
    setAiEnabled: setAiEnabledWithLog,
    aiPreset,
    setAiPreset: setAiPreset, // Use original function temporarily
  };
}
