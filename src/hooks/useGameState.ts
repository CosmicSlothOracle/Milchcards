import { useState, useCallback } from 'react';
import { GameState, Card, PoliticianCard, SpecialCard, Player, BuilderEntry, createDefaultEffectFlags } from '../types/game';
import { Pols, Specials, PRESET_DECKS } from '../data/gameData';
import {
  sumRow,
  shuffle,
  makePolInstance,
  makeSpecInstance,
  buildDeckFromEntries,
  drawCards,
  drawCardsAtRoundEnd,
  tryApplyNegativeEffect,
  adjustInfluence,
  findCardLocation,
  sumGovernmentInfluenceWithAuras,
  EffectQueueManager,
  ActiveAbilitiesManager
} from '../utils/gameUtils';
import { getCardDetails } from '../data/cardDetails';
import { useGameActions } from './useGameActions';
import { useGameAI } from './useGameAI';
import { useGameEffects } from './useGameEffects';
import { applyStartOfTurnHooks } from '../utils/startOfTurnHooks';
import { emptyBoard, emptyBoardSide, ensureSofortBoard } from '../state/board';

const initialGameState: GameState = {
  round: 1,
  current: 1,
  passed: { 1: false, 2: false },
  actionPoints: { 1: 2, 2: 2 },
  actionsUsed: { 1: 0, 2: 0 },
  decks: { 1: [], 2: [] },
  hands: { 1: [], 2: [] },
  traps: { 1: [], 2: [] },
  board: emptyBoard(),
  permanentSlots: {
    1: { government: null, public: null, initiativePermanent: null },
    2: { government: null, public: null, initiativePermanent: null },
  },
  discard: [],
  log: [],
  activeRefresh: { 1: 0, 2: 0 },
  roundsWon: { 1: 0, 2: 0 },
  gameWinner: null,
  effectFlags: {
    1: createDefaultEffectFlags(),
    2: createDefaultEffectFlags()
  },
  effectQueue: EffectQueueManager.initializeQueue(),
  activeAbilities: {
    1: [],
    2: []
  },
  pendingAbilitySelect: undefined,
  aiEnabled: { 1: false, 2: false },
};

export function useGameState() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);

  const log = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const logEntry = `[${timestamp}] ${msg}`;

    console.log(logEntry); // Also log to console for debugging

    setGameState(prev => ({
      ...prev,
      log: [...prev.log, logEntry]
    }));
  }, []);

  // Enhanced logging functions for different types of events
  const logUIInteraction = useCallback((action: string, details: string) => {
    log(`🎯 UI: ${action} - ${details}`);
  }, [log]);

  const logGameStateChange = useCallback((change: string, details: string) => {
    log(`🔄 STATE: ${change} - ${details}`);
  }, [log]);

  const logAIAction = useCallback((action: string, details: string) => {
    log(`🤖 KI: ${action} - ${details}`);
  }, [log]);

  const logCardEffect = useCallback((cardName: string, effect: string) => {
    log(`✨ EFFEKT: ${cardName} - ${effect}`);
  }, [log]);

  const logIntervention = useCallback((interventionName: string, trigger: string) => {
    log(`💥 INTERVENTION: ${interventionName} ausgelöst durch ${trigger}`);
  }, [log]);

  // New detailed logging functions for debugging
  const logFunctionCall = useCallback((functionName: string, params: any, context: string) => {
    const paramStr = typeof params === 'object' ? JSON.stringify(params, null, 2) : String(params);
    log(`🔧 CALL: ${functionName}(${paramStr}) - ${context}`);
  }, [log]);

  const logDataFlow = useCallback((from: string, to: string, data: any, action: string) => {
    const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
    log(`📊 FLOW: ${from} → ${to} | ${action} | Data: ${dataStr}`);
  }, [log]);

  const logConditionCheck = useCallback((condition: string, result: boolean, context: string) => {
    log(`🔍 CHECK: ${condition} = ${result} - ${context}`);
  }, [log]);

  const logError = useCallback((error: string, context: string) => {
    log(`❌ ERROR: ${error} - ${context}`);
  }, [log]);

  const logWarning = useCallback((warning: string, context: string) => {
    log(`⚠️ WARN: ${warning} - ${context}`);
  }, [log]);

  // Nach Queue-Auflösung: Hand-Arrays immutabel neu zuweisen → Canvas & UI bekommen die neuen UIDs
  const afterQueueResolved = useCallback(() => {
    setGameState(s => {
      const n = { ...s };
      n.hands = {
        1: [...s.hands[1]],
        2: [...s.hands[2]],
      } as any;
      // optional: version bump für Canvas
      (n as any)._version = ((s as any)._version ?? 0) + 1;
      return n;
    });
  }, []);

  // Import functionality from separated hooks
  const gameActions = useGameActions(gameState, setGameState, log, afterQueueResolved);
  const gameAI = useGameAI(gameState, setGameState, log);
  const gameEffects = useGameEffects(gameState, setGameState, log);

  const dealStartingHands = useCallback(() => {
    console.log('[DIAG] dealStartingHands called');
    function buildDeck(): Card[] {
      const polPool = [...Pols];
      const specPool = [...Specials];
      shuffle(polPool);
      shuffle(specPool);
      const deck: Card[] = [];
      polPool.slice(0, 14).forEach(p => deck.push(makePolInstance(p)));

      // prefer more useful/implemented specials
      const implFirst = ['media', 'pledge', 'pledge2', 'sanctions', 'dnc1', 'dnc2', 'dnc3', 'reshuffle', 'mission', 'trap_fakenews', 'trap_protest', 'trap_scandal'];
      const srt = specPool.slice().sort((a, b) => implFirst.indexOf(a.impl) - implFirst.indexOf(b.impl));
      srt.slice(0, 11).forEach(s => deck.push(makeSpecInstance(s)));
      return shuffle(deck).slice(0, 25);
    }

    const deck1 = buildDeck();
    const deck2 = buildDeck();

    console.log('[DIAG] built decks lengths', deck1.length, deck2.length);

    setGameState(prev => ({
      ...prev,
      decks: { 1: deck1, 2: deck2 },
      hands: {
        1: deck1.splice(0, 5),
        2: deck2.splice(0, 5)
      }
    }));
    console.log('[DIAG] setGameState after deal: hands[1].length', (deck1.length >= 5 ? 5 : deck1.length));
  }, []);

  const startNewGame = useCallback(() => {
    setGameState({
      ...initialGameState,
      round: 1,
      current: 1,
      passed: { 1: false, 2: false },
      actionPoints: { 1: 2, 2: 2 },
      actionsUsed: { 1: 0, 2: 0 },
      board: emptyBoard(),
      traps: { 1: [], 2: [] },
      permanentSlots: {
        1: { government: null, public: null, initiativePermanent: null },
        2: { government: null, public: null, initiativePermanent: null },
      },
      // instantSlot wird nicht mehr verwendet - Sofort-Initiativen gehen in board[player].sofort
      discard: [],
      log: [],
      activeRefresh: { 1: 0, 2: 0 },
    });
    dealStartingHands();
  }, [dealStartingHands]);

  const startMatchWithDecks = useCallback((p1DeckEntries: BuilderEntry[], p2DeckEntries: BuilderEntry[]) => {
    console.log('🔧 DEBUG: startMatchWithDecks called - activating AI for player 2');
    // Automatically enable AI for player 2 when starting with decks
    console.log('🔧 DEBUG: About to call gameAI.setAiEnabled(true)');
    gameAI.setAiEnabled(true);
    console.log('🔧 DEBUG: About to call gameAI.setAiPreset(AUTORITAERER_REALIST)');
    gameAI.setAiPreset('AUTORITAERER_REALIST');
    console.log('🔧 DEBUG: AI setup completed');

    console.log('[DIAG] startMatchWithDecks - p1DeckEntries', p1DeckEntries.length, 'p2DeckEntries', p2DeckEntries.length);
    console.log('[DIAG] startMatchWithDecks - sample entries:', p1DeckEntries.slice(0, 2), p2DeckEntries.slice(0, 2));

    const p1Cards = buildDeckFromEntries(p1DeckEntries);
    const p2Cards = buildDeckFromEntries(p2DeckEntries);

    const d1 = [...p1Cards];
    const d2 = [...p2Cards];
    const h1 = d1.splice(0, Math.min(5, d1.length));
    const h2 = d2.splice(0, Math.min(5, d2.length));

    console.log('[DIAG] startMatchWithDecks - p1Cards', p1Cards.length, 'p2Cards', p2Cards.length);
    console.log('[DIAG] startMatchWithDecks - h1', h1.length, 'h2', h2.length);
    console.log('[DIAG] startMatchWithDecks - sample cards:', p1Cards.slice(0, 2), p2Cards.slice(0, 2));

    setGameState({
      ...initialGameState,
      round: 1,
      current: 1,
      passed: { 1: false, 2: false },
      decks: { 1: d1, 2: d2 },
      hands: { 1: h1, 2: h2 },
      board: emptyBoard(),
      traps: { 1: [], 2: [] },
      permanentSlots: {
        1: { government: null, public: null, initiativePermanent: null },
        2: { government: null, public: null, initiativePermanent: null },
      },
      // instantSlot wird nicht mehr verwendet - Sofort-Initiativen gehen in board[player].sofort
      discard: [],
      log: [`Match gestartet. P1 und P2 erhalten je ${h1.length}/${h2.length} Startkarten.`],
      activeRefresh: { 1: 0, 2: 0 },
    });
    console.log('[DIAG] setGameState called in startMatchWithDecks');
  }, [gameAI]);

  const startMatchVsAI = useCallback((p1DeckEntries: BuilderEntry[], presetKey: keyof typeof PRESET_DECKS = 'AUTORITAERER_REALIST') => {
    const p2DeckEntries = PRESET_DECKS[presetKey] as BuilderEntry[];
    gameAI.setAiEnabled(true);
    gameAI.setAiPreset(presetKey);
    gameActions.startMatchWithDecks(p1DeckEntries, p2DeckEntries);
  }, [gameAI, gameActions]);

  // Prüfe ob der Zug automatisch gewechselt werden soll
  const shouldAdvanceTurn = useCallback((gameState: GameState, player: Player): boolean => {
    // Wenn Spieler gepasst hat
    if (gameState.passed[player]) return true;

    // Wenn keine AP mehr verfügbar sind
    if (gameState.actionPoints[player] <= 0) return true;

    // Wenn 2 Aktionen verwendet wurden
    // if (gameState.actionsUsed[player] >= 2) return true;

    return false;
  }, []);

  // Karten-Effekte implementieren
  const executeCardEffect = useCallback((
    card: Card,
    player: Player,
    state: GameState,
    logFunc: (msg: string) => void
  ): GameState => {
    let newState = { ...state };

    logFunctionCall('executeCardEffect', { card: card.name, player, type: card.kind }, 'Starting card effect execution');

    if (card.kind === 'spec') {
      const specCard = card as SpecialCard;

      // === SOFORT-INITIATIVEN ===
      if (specCard.name === 'Shadow Lobbying') {
        // Count own board cards with tag Oligarch
        const boardCards = [
          ...newState.board[player].innen,
          ...newState.board[player].aussen,
        ];
        const oligarchCount = boardCards.filter(c => {
          const details = getCardDetails(c.name);
          return details?.subcategories?.includes('Oligarch');
        }).length;

        const buffAmount = Math.min(oligarchCount, 3);

        if (buffAmount > 0) {
          const govCards = newState.board[player].aussen.filter(c => c.kind === 'pol') as PoliticianCard[];
          if (govCards.length) {
            const target = govCards[0];
            const oldInfl = target.influence;
            adjustInfluence(target, buffAmount, 'Shadow Lobbying');
            logCardEffect(specCard.name, `${target.name} erhält +${buffAmount} Einfluss ( ${oldInfl} → ${target.influence} )`);
          } else {
            logWarning('No government cards', 'Shadow Lobbying buff had no target');
          }
        } else {
          logCardEffect(specCard.name, 'Keine Oligarchen – kein Einfluss-Buff');
        }
      }
      else if (specCard.name === 'Spin Doctor') {
        const govCards = newState.board[player].aussen.filter(c => c.kind === 'pol') as PoliticianCard[];
        logDataFlow('board analysis', 'govCards', { count: govCards.length, cards: govCards.map(c => c.name) }, 'Finding government cards');

        if (govCards.length > 0) {
          const targetCard = govCards[0];
          const oldInfluence = targetCard.influence;
          adjustInfluence(targetCard, 2, 'Spin Doctor');
          const newInfluence = targetCard.influence;

          logCardEffect(specCard.name, `${targetCard.name} erhält +2 Einfluss (${oldInfluence} → ${newInfluence})`);
          logDataFlow('influence adjustment', 'targetCard', { card: targetCard.name, old: oldInfluence, new: newInfluence, change: 2 }, 'Spin Doctor effect applied');
        } else {
          logWarning('No government cards found', 'Spin Doctor effect has no target');
        }
      }
      else if (specCard.name === 'Digitaler Wahlkampf') {
        logCardEffect(specCard.name, 'Ziehe 2 Karten, nächste Initiative -1 AP');
        const { newHands, newDecks } = drawCards(player, 2, newState, logFunc);
        newState = { ...newState, hands: newHands, decks: newDecks };

        // Simplified AP system: No discounts
        logDataFlow('effectFlags', 'newState', { player }, 'Platform effect applied');
      }
      else if (specCard.name === 'Partei-Offensive') {
        const opponent: Player = player === 1 ? 2 : 1;
        const oppGovCards = newState.board[opponent].aussen.filter(c => c.kind === 'pol' && !(c as PoliticianCard).deactivated) as PoliticianCard[];
        logDataFlow('opponent analysis', 'oppGovCards', { opponent, count: oppGovCards.length, cards: oppGovCards.map(c => c.name) }, 'Finding active opponent government cards');

        if (oppGovCards.length > 0) {
          const targetCard = oppGovCards[0];
          targetCard.deactivated = true;
          logCardEffect(specCard.name, `${targetCard.name} wird deaktiviert (bis Rundenende)`);
          logDataFlow('card deactivation', 'targetCard', { card: targetCard.name, deactivated: true }, 'Partei-Offensive effect applied');
        } else {
          logWarning('No active opponent government cards found', 'Partei-Offensive effect has no target');
        }
      }
      else if (specCard.name === 'Oppositionsblockade') {
        const opponent: Player = player === 1 ? 2 : 1;
        const oppHand = newState.hands[opponent];
        logDataFlow('opponent hand', 'analysis', { opponent, handSize: oppHand.length, cards: oppHand.map(c => c.name) }, 'Analyzing opponent hand');

        if (oppHand.length > 0) {
          const discardedCard = oppHand[Math.floor(Math.random() * oppHand.length)];
          const newOppHand = oppHand.filter(c => c !== discardedCard);
          newState.hands = { ...newState.hands, [opponent]: newOppHand };

          logCardEffect(specCard.name, `Gegner verliert ${discardedCard.name} aus der Hand`);
          logDataFlow('card discard', 'opponent hand', { card: discardedCard.name, newHandSize: newOppHand.length }, 'Oppositionsblockade effect applied');
        } else {
          logWarning('Opponent hand is empty', 'Oppositionsblockade effect has no target');
        }
      }
      else if (specCard.name === 'Opportunist') {
        const opponent: Player = player === 1 ? 2 : 1;
        const oppBoard = newState.board[opponent];
        const totalOppInfluence = sumRow([...oppBoard.innen, ...oppBoard.aussen]);

        logDataFlow('opponent board analysis', 'influence calculation', {
          opponent,
          innen: oppBoard.innen.map(c => ({ name: c.name, influence: c.kind === 'pol' ? (c as any).influence : 0 })),
          aussen: oppBoard.aussen.map(c => ({ name: c.name, influence: c.kind === 'pol' ? (c as any).influence : 0 })),
          totalInfluence: totalOppInfluence
        }, 'Calculating opponent total influence');

        if (totalOppInfluence > 10) {
          const { newHands, newDecks } = drawCards(player, 1, newState, logFunc);
          newState = { ...newState, hands: newHands, decks: newDecks };
          logCardEffect(specCard.name, `Gegner hat ${totalOppInfluence} Einfluss (>10) - ziehe 1 Karte`);
        } else {
          logCardEffect(specCard.name, `Gegner hat ${totalOppInfluence} Einfluss (≤10) - kein Effekt`);
        }
      }
      else if (specCard.name === 'Think-tank') {
        const { newHands, newDecks } = drawCards(player, 1, newState, logFunc);
        newState = { ...newState, hands: newHands, decks: newDecks };
        logCardEffect(specCard.name, 'Ziehe 1 Karte');
      }
      else if (specCard.name === 'Influencer-Kampagne') {
        const publicCards = newState.board[player].innen.filter(c => c.kind === 'pol') as PoliticianCard[];
        logDataFlow('public cards analysis', 'influence boost', { count: publicCards.length, cards: publicCards.map(c => c.name) }, 'Finding public cards for influence boost');

        publicCards.forEach(card => {
          const oldInfluence = card.influence;
          adjustInfluence(card, 1, 'Influencer-Kampagne');
          const newInfluence = card.influence;
          logCardEffect(specCard.name, `${card.name} erhält +1 Einfluss (${oldInfluence} → ${newInfluence})`);
        });

        if (publicCards.length === 0) {
          logWarning('No public cards found', 'Influencer-Kampagne effect has no targets');
        }
      }
      else if (specCard.name === 'Systemrelevant') {
        const opponent: Player = player === 1 ? 2 : 1;
        const oppGovCards = newState.board[opponent].aussen.filter(c => c.kind === 'pol') as PoliticianCard[];
        logDataFlow('opponent government analysis', 'systemrelevant effect', { count: oppGovCards.length, cards: oppGovCards.map(c => c.name) }, 'Finding opponent government cards');

        if (oppGovCards.length > 0) {
          const targetCard = oppGovCards[0];
          const oldInfluence = targetCard.influence;
          adjustInfluence(targetCard, -2, 'Systemrelevant');
          const newInfluence = targetCard.influence;

          logCardEffect(specCard.name, `${targetCard.name} verliert 2 Einfluss (${oldInfluence} → ${newInfluence})`);
          logDataFlow('influence reduction', 'targetCard', { card: targetCard.name, old: oldInfluence, new: newInfluence, change: -2 }, 'Systemrelevant effect applied');
        } else {
          logWarning('No opponent government cards found', 'Systemrelevant effect has no target');
        }
      }
      else if (specCard.name === 'Symbolpolitik') {
        const { newHands, newDecks } = drawCards(player, 1, newState, logFunc);
        newState = { ...newState, hands: newHands, decks: newDecks };

        newState.actionPoints = {
          ...newState.actionPoints,
          [player]: Math.min(2, newState.actionPoints[player] + 1)
        };

        const oldAP = state.actionPoints[player];
        const newAP = newState.actionPoints[player];
        logCardEffect(specCard.name, `Ziehe 1 Karte, erhalte +1 AP (${oldAP} → ${newAP})`);
        logDataFlow('AP gain', 'player', { player, old: oldAP, new: newAP, change: 1 }, 'Symbolpolitik effect applied');
      }
      else if (specCard.name === 'Alexei Navalny') {
        logCardEffect(specCard.name, 'Ziehe 1 Karte');
        const { newHands, newDecks } = drawCards(player, 1, newState, logFunc);
        newState = { ...newState, hands: newHands, decks: newDecks };
      }
      else if (specCard.name === 'Mukesh Ambani') {
        logCardEffect(specCard.name, 'Ziehe 1 Karte');
        const { newHands, newDecks } = drawCards(player, 1, newState, logFunc);
        newState = { ...newState, hands: newHands, decks: newDecks };
      }

      // Oligarch-Effekte
      else if (['Elon Musk', 'Bill Gates', 'George Soros', 'Warren Buffett', 'Mukesh Ambani', 'Jeff Bezos', 'Alisher Usmanov', 'Gautam Adani', 'Jack Ma', 'Zhang Yiming', 'Roman Abramovich'].includes(specCard.name)) {
        logCardEffect(specCard.name, 'Ziehe 1 Karte (Oligarch-Effekt)');
        const { newHands, newDecks } = drawCards(player, 1, newState, logFunc);
        newState = { ...newState, hands: newHands, decks: newDecks };
      }
    }

    // === DAUERHAFTE INITIATIVEN ===
    if (card.kind === 'spec' && (card as SpecialCard).type === 'Dauerhaft-Initiative') {
      const specCard = card as SpecialCard;

      if (specCard.name === 'Algorithmischer Diskurs') {
        logCardEffect(specCard.name, 'Dauerhafte Initiative: Alle Medien-Karten geben +1 Einfluss');
        // This effect will be applied in applyStartOfTurnHooks
      }
      else if (specCard.name === 'Alternative Fakten') {
        logCardEffect(specCard.name, 'Dauerhafte Initiative: Alle Oligarchen geben +1 Einfluss');
        // This effect will be applied in applyStartOfTurnHooks
      }
    }

    // === POLITIKER-KARTEN ===
    else if (card.kind === 'pol') {
      const polCard = card as PoliticianCard;
      logCardEffect(polCard.name, `Politiker platziert - Basis-Einfluss: ${polCard.influence}`);
    }

    logDataFlow('executeCardEffect', 'newState', { card: card.name, effectsApplied: true }, 'Card effect execution completed');
    return newState;
  }, [logFunctionCall, logCardEffect, logDataFlow, logWarning]);

  const nextTurn = useCallback(() => {
    logFunctionCall('nextTurn', {}, 'Starting turn change');

    setGameState((prev): GameState => {
      logDataFlow('UI', 'nextTurn', { current: prev.current, passed: prev.passed }, 'Turn change request');

      // if both passed -> resolve round
      logConditionCheck('both players passed', prev.passed[1] && prev.passed[2], 'Round end check');
      if (prev.passed[1] && prev.passed[2]) {
        logFunctionCall('resolveRound', { round: prev.round }, 'Both players passed - resolving round');
        return resolveRound(prev);
      }

      const newCurrent: Player = prev.current === 1 ? 2 : 1;
      logDataFlow('turn change', 'newCurrent', { old: prev.current, new: newCurrent }, 'Player switch');

      // Reset AP for the new current player
      const newActionPoints = { ...prev.actionPoints };
      newActionPoints[newCurrent] = 2;

      logDataFlow('AP reset', 'newCurrent', {
        player: newCurrent,
        oldAP: prev.actionPoints[newCurrent],
        newAP: newActionPoints[newCurrent],
        oldActions: 0,
        newActions: 0
      }, 'Resource reset for new player');

      // Apply start-of-turn hooks for the new current player
      const newState: GameState = {
        ...prev,
        current: newCurrent,
        actionPoints: newActionPoints
      };

      // Log turn change
      log(`Spieler ${newCurrent} ist am Zug (2 AP verfügbar)`);
      logGameStateChange('turn change', `Player ${newCurrent} turn started`);

      logFunctionCall('applyStartOfTurnHooks', { player: newCurrent }, 'Applying start-of-turn effects');
      applyStartOfTurnHooks(newState, newCurrent, log);

      // Check if AI should take turn
      logConditionCheck('AI turn', newCurrent === 2 && (prev.aiEnabled?.[2] ?? false), 'AI turn check');
      if (newCurrent === 2 && (prev.aiEnabled?.[2] ?? false)) {
        logFunctionCall('runAITurn', { player: newCurrent }, 'Triggering AI turn');
        // Use setTimeout to avoid state update conflicts
        setTimeout(() => {
          logAIAction('AI turn triggered', 'Starting AI turn execution');
          gameAI.runAITurn();
        }, 100);
      }

      logDataFlow('nextTurn', 'finalState', {
        current: newState.current,
        ap: newState.actionPoints[newCurrent],
        aiEnabled: prev.aiEnabled?.[2] ?? false
      }, 'Turn change completed');

      return newState;
    });

    // Nach Zugwechsel ebenfalls spiegeln (z. B. Auto-Draw am EoT)
    afterQueueResolved();
  }, [logFunctionCall, logDataFlow, logConditionCheck, logGameStateChange, gameAI, log, logAIAction, afterQueueResolved]);

  // Automatischer Zugwechsel basierend auf AP
  const checkAndAdvanceTurn = useCallback((gameState: GameState) => {
    const currentPlayer = gameState.current;
    if (shouldAdvanceTurn(gameState, currentPlayer)) {
      // Nur wechseln wenn der andere Spieler nicht auch fertig ist
      const otherPlayer: Player = currentPlayer === 1 ? 2 : 1;
      if (!shouldAdvanceTurn(gameState, otherPlayer) || gameState.passed[otherPlayer]) {
        nextTurn();
      }
    }
  }, [shouldAdvanceTurn, nextTurn]);

  const scores = useCallback((state: GameState): [number, number] => {
    // Einheitliche Berechnung über Utils-Helfer
    const s1 = sumGovernmentInfluenceWithAuras(state, 1);
    const s2 = sumGovernmentInfluenceWithAuras(state, 2);
    return [s1, s2];
  }, []);

  const resolveRound = useCallback((state: GameState): GameState => {
    const [s1, s2] = scores(state);
    let winner: 1 | 2 = 1;
    let note = '';

    if (s1 > s2) winner = 1;
    else if (s2 > s1) winner = 2;
    else {
      // Gleichstand -> erster Pass gewinnt
      winner = state.passed[1] && !state.passed[2] ? 1 : 2;
      note = ' (Gleichstand – früherer Pass)';
    }

    log(`Runde ${state.round} endet: P1 ${s1} : P2 ${s2}. Gewinner: P${winner}${note}.`);

    // Rundensieg zählen
    const newRoundsWon = { ...state.roundsWon };
    newRoundsWon[winner] += 1;

    // Prüfe Best-of-3 Gewinner
    let gameWinner: 1 | 2 | null = null;
    if (newRoundsWon[1] >= 2) {
      gameWinner = 1;
      log(`🎉 SPIEL ENDE: Spieler 1 gewinnt das Spiel! (${newRoundsWon[1]}:${newRoundsWon[2]})`);
    } else if (newRoundsWon[2] >= 2) {
      gameWinner = 2;
      log(`🎉 SPIEL ENDE: Spieler 2 gewinnt das Spiel! (${newRoundsWon[2]}:${newRoundsWon[1]})`);
    }

    // clear board (no carryover)
    const newBoard = emptyBoard();
    const newTraps = { 1: [], 2: [] };

    // Verbesserte Karten-Nachzieh-Mechanik (ziehe bis Hand voll ist)
    const { newHands, newDecks } = drawCardsAtRoundEnd(state, log);

    const newRound = state.round + 1;
    const newPassed = { 1: false, 2: false };
    // alternate starter each round
    const newCurrent = (newRound % 2 === 1) ? 1 : 2;

    // Wenn Spiel zu Ende, stoppe
    if (gameWinner) {
      return {
        ...state,
        roundsWon: newRoundsWon,
        gameWinner,
      };
    }

    log(`Runde ${newRound} beginnt. P${newCurrent} startet.`);

    // 🔥 CLUSTER 3: Reset temporäre Initiative-Boni am Rundenende
    const newEffectFlags = {
      1: {
        ...state.effectFlags[1],
        // Reset Cluster 3 Flags
        scienceInitiativeBonus: false,
        militaryInitiativePenalty: false,
        healthInitiativeBonus: false,
        cultureInitiativeBonus: false,
        // Reset andere rundenbasierte Flags
        markZuckerbergUsed: false,
        opportunistActive: false,
        publicEffectDoubled: false,
        cannotPlayInitiatives: false,
        nextCardProtected: false,
        platformAfterInitiativeBonus: false,
        interventionEffectReduced: false,
      },
      2: {
        ...state.effectFlags[2],
        // Reset Cluster 3 Flags
        scienceInitiativeBonus: false,
        militaryInitiativePenalty: false,
        healthInitiativeBonus: false,
        cultureInitiativeBonus: false,
        // Reset andere rundenbasierte Flags
        markZuckerbergUsed: false,
        opportunistActive: false,
        publicEffectDoubled: false,
        cannotPlayInitiatives: false,
        nextCardProtected: false,
        platformAfterInitiativeBonus: false,
        interventionEffectReduced: false,
      }
    };

    return {
      ...state,
      round: newRound,
      current: newCurrent,
      passed: newPassed,
      board: newBoard,
      traps: newTraps,
      hands: newHands,
      decks: newDecks,
      roundsWon: newRoundsWon,
      effectFlags: newEffectFlags,
    };
  }, [log, scores]);

  // Einfache Interventionsauswertung für einige häufige Trigger
  const evaluateInterventions = (
    prev: GameState,
    actingPlayer: Player,
    event: any,
    tentativeBoard: GameState['board']
  ): [GameState['board'] | null, GameState['traps'] | null] => {
    const opponent: Player = actingPlayer === 1 ? 2 : 1;
    const oppTraps = [...(prev.traps[opponent] || [])];
    let board = tentativeBoard;
    let trapsChanged = false;

    for (let i = 0; i < oppTraps.length; i++) {
      const trap = oppTraps[i];
      if (trap.kind !== 'spec') continue;
      const spec = trap as SpecialCard;
      const details = getCardDetails(spec.name);
      const key = spec.key;

      // Trigger: Karte gespielt
      if (event.type === 'card_played' && (event.card as PoliticianCard)) {
        const played = event.card as PoliticianCard;
        const isMedia = ['Oprah Winfrey'].includes(played.name);
        const isNGO = ['Bill Gates', 'Jennifer Doudna', 'Noam Chomsky'].includes(played.name);
        const isPlatform = ['Mark Zuckerberg', 'Tim Cook', 'Jack Ma', 'Zhang Yiming'].includes(played.name);
        const isDiplomat = ['Joschka Fischer', 'Sergey Lavrov', 'Ursula von der Leyen', 'Jens Stoltenberg', 'Hans Dietrich Genscher', 'Colin Powell', 'Condoleezza Rice', 'Christine Lagarde'].includes(played.name);
        const isTier2Gov = (played.T === 2 && event.lane === 'aussen');
        const isTier1Gov = (played.T === 1 && event.lane === 'aussen');
        const isWeakGov = (played.influence <= 5 && event.lane === 'aussen');
        const isLowPowerGov = (played.influence <= 4 && event.lane === 'aussen');

        // Cancel Culture / Fake News-Kampagne
        if ((details?.name === 'Cancel Culture' || key === 'Cancel_Culture') && event.lane === 'innen') {
          tryApplyNegativeEffect(played, () => { played.deactivated = true; }, prev.round);
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Cancel Culture → ${played.name} deaktiviert.`);
          logIntervention('Cancel Culture', `Ausgelöst gegen ${played.name} in Öffentlichkeit`);
          continue;
        }
        if ((details?.name === 'Fake News-Kampagne' || key === 'Fake_News_Kampagne') && isMedia) {
          tryApplyNegativeEffect(played, () => { played.deactivated = true; }, prev.round);
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Fake News-Kampagne → ${played.name} deaktiviert.`);
          logIntervention('Fake News-Kampagne', `Ausgelöst gegen ${played.name} (Medien)`);
          continue;
        }

        // Whistleblower (Tier 2 Regierung)
        if ((details?.name === 'Whistleblower' || key === 'Whistleblower') && isTier2Gov) {
          tryApplyNegativeEffect(played, () => { adjustInfluence(played, -2, 'Whistleblower'); }, prev.round);
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Whistleblower → ${played.name} -2 Einfluss.`);
          continue;
        }

        // Berater-Affäre (Tier 1 Regierung)
        if ((details?.name === 'Berater-Affäre' || key === 'Berater_Affaere') && isTier1Gov) {
          tryApplyNegativeEffect(played, () => { adjustInfluence(played, -2, 'Berater-Affäre'); }, prev.round);
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Berater-Affäre → ${played.name} -2 Einfluss.`);
          continue;
        }

        // Soft Power-Kollaps / Deepfake-Skandal (Diplomat)
        if ((details?.name === 'Soft Power-Kollaps' || key === 'Soft_Power_Kollaps') && isDiplomat) {
          tryApplyNegativeEffect(played, () => { adjustInfluence(played, -3, 'Soft Power-Kollaps'); }, prev.round);
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Soft Power-Kollaps → ${played.name} -3 Einfluss.`);
          continue;
        }
        if ((details?.name === 'Deepfake-Skandal' || key === 'Deepfake_Skandal') && isDiplomat) {
          // Kein Einflusstransfer möglich - Flag setzen
          const newFlags = { ...prev.effectFlags?.[actingPlayer], influenceTransferBlocked: true };
          prev.effectFlags = { ...prev.effectFlags, [actingPlayer]: newFlags } as GameState['effectFlags'];
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Deepfake-Skandal → ${played.name} kann keinen Einfluss transferieren.`);
          continue;
        }

        // Lobby Leak / Boykott-Kampagne (NGO/Bewegung)
        if ((details?.name === 'Lobby Leak' || key === 'Lobby_Leak') && isNGO) {
          const hands = { ...prev.hands } as GameState['hands'];
          if (hands[actingPlayer].length > 0) {
            hands[actingPlayer] = hands[actingPlayer].slice(1);
            prev.hands = hands;
          }
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Lobby Leak → P${actingPlayer} wirft 1 Karte ab.`);
          continue;
        }
        if ((details?.name === 'Boykott-Kampagne' || key === 'Boykott_Kampagne') && (isNGO || ['Greta Thunberg', 'Malala Yousafzai', 'Ai Weiwei', 'Alexei Navalny'].includes(played.name))) {
          tryApplyNegativeEffect(played, () => { played.deactivated = true; }, prev.round);
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Boykott-Kampagne → ${played.name} deaktiviert.`);
          continue;
        }

        // Cyber-Attacke (Plattform)
        if ((details?.name === 'Cyber-Attacke' || key === 'Cyber_Attacke') && isPlatform) {
          const loc = findCardLocation(played as any, { ...prev, board } as GameState);
          if (loc) {
            const arr = [...board[loc.player][loc.lane]];
            const idx = arr.findIndex(c => c.uid === played.uid);
            if (idx >= 0) {
              arr.splice(idx, 1);
              board = {
                ...board,
                [loc.player]: {
                  ...board[loc.player],
                  [loc.lane]: arr
                }
              } as GameState['board'];
            }
          }
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Cyber-Attacke → ${played.name} zerstört.`);
          continue;
        }

        // Bestechungsskandal 2.0 (schwache Regierung M≤5)
        if ((details?.name === 'Bestechungsskandal 2.0' || key === 'Bestechungsskandal_2_0') && isWeakGov) {
          // Übernehme Karte bis Rundenende (vereinfacht: temporär deaktiviert)
          tryApplyNegativeEffect(played, () => { played.deactivated = true; }, prev.round);
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Bestechungsskandal 2.0 → ${played.name} übernommen.`);
          continue;
        }

        // Tunnelvision (M≤4 Regierung)
        if ((details?.name === 'Tunnelvision' || key === 'Tunnelvision') && isLowPowerGov) {
          // Karte zählt nicht zur Runde (vereinfacht: -100% Einfluss)
          tryApplyNegativeEffect(played, () => { played.influence = 0; }, prev.round);
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Tunnelvision → ${played.name} zählt nicht zur Runde.`);
          continue;
        }
      }

      // Trigger: Board-Zustand
      if (event.type === 'board_state_check') {
        const actingPlayerGovCount = tentativeBoard[actingPlayer].aussen.length;
        const actingPlayerPubCount = tentativeBoard[actingPlayer].innen.length;

        // Strategische Enthüllung (>2 Regierungskarten)
        if ((details?.name === 'Strategische Enthüllung' || key === 'Strategische_Enthuellung') && actingPlayerGovCount > 2) {
          // Eine Regierungskarte zurück auf Hand (vereinfacht: entferne erste)
          const govCards = [...tentativeBoard[actingPlayer].aussen];
          if (govCards.length > 0) {
            govCards.pop(); // Entferne letzte
            board = { ...board, [actingPlayer]: { ...board[actingPlayer], aussen: govCards } } as GameState['board'];
          }
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Strategische Enthüllung → Regierungskarte zurück.`);
          continue;
        }

        // Grassroots-Widerstand (>2 Öffentlichkeitskarten)
        if ((details?.name === 'Grassroots-Widerstand' || key === 'Grassroots_Widerstand') && actingPlayerPubCount > 2) {
          const pubCards = tentativeBoard[actingPlayer].innen.filter(c => c.kind === 'pol') as PoliticianCard[];
          if (pubCards.length > 0) {
            tryApplyNegativeEffect(pubCards[0], () => { pubCards[0].deactivated = true; }, prev.round);
          }
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Grassroots-Widerstand → Öffentlichkeitskarte deaktiviert.`);
          continue;
        }

        // Parlament geschlossen (≥2 Regierungskarten)
        if ((details?.name === 'Parlament geschlossen' || key === 'Parlament_geschlossen') && actingPlayerGovCount >= 2) {
          // Blockiere weitere Regierungskarten (Flag für diesen Zug)
          const newFlags = { ...prev.effectFlags?.[actingPlayer], cannotPlayMoreGovernment: true };
          prev.effectFlags = { ...prev.effectFlags, [actingPlayer]: newFlags } as GameState['effectFlags'];
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Parlament geschlossen → keine weiteren Regierungskarten.`);
          continue;
        }

        // Interne Fraktionskämpfe (große Initiative 3-4 HP)
        if ((details?.name === 'Interne Fraktionskämpfe' || key === 'Interne_Fraktionskaempfe') && event.type === 'card_played' && event.card?.kind === 'spec') {
          const specCard = event.card as SpecialCard;
          const isLargeInitiative = specCard.type === 'Sofort-Initiative' && (specCard.bp >= 3);
          if (isLargeInitiative) {
            // Initiative annullieren (vereinfacht: Karte zurück auf Hand)
            const hands = { ...prev.hands } as GameState['hands'];
            hands[actingPlayer].push(event.card);
            prev.hands = hands;
            oppTraps.splice(i, 1); i--; trapsChanged = true;
            log(`Intervention ausgelöst: Interne Fraktionskämpfe → ${event.card.name} wird annulliert.`);
            continue;
          }
        }

        // Massenproteste (2 Regierungskarten in der Runde)
        if ((details?.name === 'Massenproteste' || key === 'Massenproteste') && event.type === 'card_played' && event.lane === 'aussen') {
          // Vereinfacht: Beide Regierungskarten -1 Einfluss
          const govCards = board[actingPlayer].aussen.filter(c => c.kind === 'pol') as PoliticianCard[];
          if (govCards.length >= 2) {
            adjustInfluence(govCards[0], -1, 'Massenproteste');
            adjustInfluence(govCards[1], -1, 'Massenproteste');
            oppTraps.splice(i, 1); i--; trapsChanged = true;
            log(`Intervention ausgelöst: Massenproteste → ${govCards[0].name} und ${govCards[1].name} -1 Einfluss.`);
            continue;
          }
        }

        // "Unabhängige" Untersuchung (gegen Intervention)
        if ((details?.name === '"Unabhängige" Untersuchung' || key === 'Unabhaengige_Untersuchung') && event.type === 'card_played' && event.card?.kind === 'spec') {
          const specCard = event.card as SpecialCard;
          if (specCard.type === 'Intervention') {
            // Intervention annullieren (vereinfacht: Karte zurück auf Hand)
            const hands = { ...prev.hands } as GameState['hands'];
            hands[actingPlayer].push(event.card);
            prev.hands = hands;
            oppTraps.splice(i, 1); i--; trapsChanged = true;
            log(`Intervention ausgelöst: "Unabhängige" Untersuchung → ${event.card.name} wird annulliert.`);
            continue;
          }
        }

        // Maulwurf (kopiere schwächere Regierungskarte des Gegners)
        if ((details?.name === 'Maulwurf' || key === 'Maulwurf') && event.type === 'card_played' && event.lane === 'aussen') {
          const oppGovCards = board[opponent].aussen.filter(c => c.kind === 'pol') as PoliticianCard[];
          if (oppGovCards.length > 0) {
            // Finde schwächste Regierungskarte
            const weakestCard = oppGovCards.reduce((weakest, current) =>
              (current.influence < weakest.influence) ? current : weakest
            );
            // Kopie erstellen (vereinfacht: gleiche Karte auf eigene Hand)
            const hands = { ...prev.hands } as GameState['hands'];
            const copyCard = { ...weakestCard, uid: Date.now() + Math.random() };
            hands[opponent].push(copyCard);
            prev.hands = hands;
            oppTraps.splice(i, 1); i--; trapsChanged = true;
            log(`Intervention ausgelöst: Maulwurf → Kopie von ${weakestCard.name} auf Hand.`);
            continue;
          }
        }

        // Skandalspirale (Initiative + Öffentlichkeitskarte)
        if ((details?.name === 'Skandalspirale' || key === 'Skandalspirale') && event.type === 'card_played') {
          // Vereinfacht: Prüfe ob Initiative und Öffentlichkeitskarte in dieser Runde gespielt wurden
          const recentCards = board[actingPlayer].innen.concat(board[actingPlayer].aussen);
          const hasInitiative = recentCards.some(c => c.kind === 'spec' && (c as SpecialCard).type === 'Sofort-Initiative');
          const hasPublic = recentCards.some(c => c.kind === 'spec' && (c as SpecialCard).type === 'Öffentlichkeitskarte');
          if (hasInitiative && hasPublic) {
            // Eine der beiden Karten annullieren (vereinfacht: letzte Öffentlichkeitskarte)
            const pubCards = board[actingPlayer].innen.filter(c => c.kind === 'spec' && (c as SpecialCard).type === 'Öffentlichkeitskarte');
            if (pubCards.length > 0) {
              const lastPubCard = pubCards[pubCards.length - 1];
              const arr = [...board[actingPlayer].innen];
              const idx = arr.findIndex(c => c.uid === lastPubCard.uid);
              if (idx >= 0) {
                arr.splice(idx, 1);
                board = {
                  ...board,
                  [actingPlayer]: { ...board[actingPlayer], innen: arr }
                } as GameState['board'];
              }
            }
            oppTraps.splice(i, 1); i--; trapsChanged = true;
            log(`Intervention ausgelöst: Skandalspirale → Öffentlichkeitskarte annulliert.`);
            continue;
          }
        }

        // Satire-Show (bei mehr Einfluss als Gegner)
        if ((details?.name === 'Satire-Show' || key === 'Satire_Show')) {
          const playerInfluence = sumRow([...board[opponent].aussen]);
          const opponentInfluence = sumRow([...board[actingPlayer].aussen]);
          if (opponentInfluence > playerInfluence) {
            const oppGovCards = board[opponent].aussen.filter(c => c.kind === 'pol') as PoliticianCard[];
            if (oppGovCards.length > 0) {
              // Erste Regierungskarte -2 Einfluss
              adjustInfluence(oppGovCards[0], -2, 'Satire-Show');
              oppTraps.splice(i, 1); i--; trapsChanged = true;
              log(`Intervention ausgelöst: Satire-Show → ${oppGovCards[0].name} -2 Einfluss.`);
              continue;
            }
          }
        }
      }
    }

    if (trapsChanged) {
      const newTraps = { ...prev.traps, [opponent]: oppTraps } as GameState['traps'];
      return [board, newTraps];
    }
    return [null, null];
  };

  // Zentrale Effekt-Queue Verarbeitung
  const processEffectQueue = useCallback((state: GameState): GameState => {
    if (!state.effectQueue || state.effectQueue.items.length === 0) {
      return state;
    }

    const [newQueue, newState] = EffectQueueManager.processQueue(
      state.effectQueue,
      state,
      log
    );

    return {
      ...newState,
      effectQueue: newQueue
    };
  }, [log]);

  // Berechne Einfluss mit dauerhaften Auren-Effekten
  const sumRowWithAuras = (state: GameState, player: Player): number => {
    const govCards = state.board[player].aussen.filter(c => c.kind === 'pol') as PoliticianCard[];
    const opponent: Player = player === 1 ? 2 : 1;
    let total = 0;

    // 🔍 DEBUG: Log welche Regierungskarten gefunden wurden
    console.log(`🔍 sumRowWithAuras P${player}: Gefunden ${govCards.length} Regierungskarten:`,
      govCards.map(c => `${c.name}[${c.influence}I]`).join(', '));

    govCards.forEach(card => {
      let influence = card.influence;

      // Dauerhafte Auren anwenden
      const govSlot = state.permanentSlots[player].government;
      const pubSlot = state.permanentSlots[player].public;

      // Koalitionszwang: Tier 2 Regierungskarten +1 Einfluss
      if (govSlot?.kind === 'spec' && (govSlot as SpecialCard).name === 'Koalitionszwang') {
        if (card.T === 2) influence += 1;
      }

      // Napoleon Komplex: Tier 1 Regierungskarten +1 Einfluss
      if (govSlot?.kind === 'spec' && (govSlot as SpecialCard).name === 'Napoleon Komplex') {
        if (card.T === 1) influence += 1;
      }

      // Zivilgesellschaft: Bewegung-Karten +1 Einfluss
      if (pubSlot?.kind === 'spec' && (pubSlot as SpecialCard).name === 'Zivilgesellschaft') {
        const bewegungNames = ['Greta Thunberg', 'Malala Yousafzai', 'Ai Weiwei', 'Alexei Navalny'];
        const hasBewegung = state.board[player].innen.some(c => c.kind === 'spec' && (c as SpecialCard).type === 'Öffentlichkeitskarte' && bewegungNames.includes(c.name));
        if (hasBewegung) influence += 1;
      }

      // 🔥 JOSCHKA FISCHER NGO-BOOST: +1 Einfluss wenn NGO auf dem Board liegt
      if (card.name === 'Joschka Fischer' && (card as any).effect === 'ngo_boost') {
        const hasNgoCard = state.board[player].innen.some(c =>
          c.kind === 'spec' &&
          (c as SpecialCard).type === 'Öffentlichkeitskarte' &&
          (c as any).tag === 'NGO'
        );
        if (hasNgoCard) {
          influence += 1;
          // Log nur beim ersten Mal, um Spam zu vermeiden
          if (!(card as any)._ngoBoostLogged) {
            console.log(`🔥 JOSCHKA FISCHER KONTINUIERLICHER NGO-BOOST: +1 Einfluss`);
            (card as any)._ngoBoostLogged = true;
          }
        } else {
          (card as any)._ngoBoostLogged = false;
        }
      }

      // Milchglas Transparenz: +1 Einfluss wenn keine NGO/Bewegung liegt
      if (govSlot?.kind === 'spec' && (govSlot as SpecialCard).name === 'Milchglas Transparenz') {
        const ngoMovementNames = ['Jennifer Doudna', 'Noam Chomsky', 'Bill Gates', 'Greta Thunberg', 'Malala Yousafzai', 'Ai Weiwei', 'Alexei Navalny'];
        const hasNgoMovement = state.board[player].innen.some(c => c.kind === 'spec' && (c as SpecialCard).type === 'Öffentlichkeitskarte' && ngoMovementNames.includes(c.name));
        if (!hasNgoMovement) influence += 1;
      }

      // Alternative Fakten: Gegner-Interventionen -1 Wirkung
      const oppPubSlot = state.permanentSlots[opponent].public;
      if (oppPubSlot?.kind === 'spec' && (oppPubSlot as SpecialCard).name === 'Alternative Fakten') {
        // Reduziere Effekt von Interventionen (vereinfacht: -1 Einfluss weniger)
        // Wird in der Intervention-Auswertung berücksichtigt
      }

      total += influence;
    });

    // 🔍 DEBUG: Final influence calculation
    console.log(`🎯 sumRowWithAuras P${player}: Gesamt-Einfluss = ${total}`);
    return total;
  };

  // playCard is now handled by useGameActions hook

  // runAITurn is now handled by useGameAI hook - removed duplicate implementation

  const applyStartOfTurnHooksLegacy = useCallback((player: Player, state: GameState) => {
    logFunctionCall('applyStartOfTurnHooksLegacy', { player, round: state.round }, 'Starting legacy turn hooks');

    const pool = [...state.board[player].innen, ...state.board[player].aussen];
    pool.forEach(c => {
        if (c.kind === 'pol') {
        const polCard = c as PoliticianCard;
        if (polCard._pledgeDown && polCard._pledgeDown.round === state.round) {
          const oldInfluence = polCard.influence;
          adjustInfluence(polCard, polCard._pledgeDown.amount, 'Wahlversprechen');
          const newInfluence = polCard.influence;
          log(`Wahlversprechen Abzug auf ${polCard.name}: ${oldInfluence} → ${newInfluence}`);
          polCard._pledgeDown = null;
        }
        // reset once-per-round flags
        polCard._hypedRoundFlag = false;
      }
    });

    // Apply permanent initiative effects
    const govSlot = state.permanentSlots[player].government;
    const pubSlot = state.permanentSlots[player].public;

    if (govSlot && govSlot.kind === 'spec') {
      const govInitiative = govSlot as SpecialCard;
      logFunctionCall('applyPermanentInitiative', { slot: 'government', initiative: govInitiative.name }, 'Processing government permanent initiative');

      if (govInitiative.name === 'Alternative Fakten') {
        // Alle Oligarchen geben +1 Einfluss
        const oligarchCards = pool.filter(c =>
          c.kind === 'pol' &&
          ['Elon Musk', 'Bill Gates', 'George Soros', 'Warren Buffett', 'Mukesh Ambani', 'Jeff Bezos', 'Alisher Usmanov', 'Gautam Adani', 'Jack Ma', 'Zhang Yiming', 'Roman Abramovich'].includes(c.name)
        ) as PoliticianCard[];

        logDataFlow('board analysis', 'oligarch cards', {
          count: oligarchCards.length,
          cards: oligarchCards.map(c => ({ name: c.name, influence: c.kind === 'pol' ? (c as any).influence : 0 }))
        }, 'Finding oligarch cards for Alternative Fakten effect');

        let totalInfluenceGained = 0;
        oligarchCards.forEach(card => {
          const oldInfluence = card.influence;
          adjustInfluence(card, 1, 'Alternative Fakten');
          const newInfluence = card.influence;
          totalInfluenceGained += 1;
          logCardEffect('Alternative Fakten', `${card.name} erhält +1 Einfluss (${oldInfluence} → ${newInfluence})`);
        });

        if (oligarchCards.length > 0) {
          logCardEffect('Alternative Fakten', `${oligarchCards.length} Oligarchen gefunden - ${totalInfluenceGained} Punkte zum Gesamteinfluss hinzugefügt`);
        } else {
          logWarning('No oligarch cards found', 'Alternative Fakten effect has no targets');
        }
      }
    }

    if (pubSlot && pubSlot.kind === 'spec') {
      const pubInitiative = pubSlot as SpecialCard;
      logFunctionCall('applyPermanentInitiative', { slot: 'public', initiative: pubInitiative.name }, 'Processing public permanent initiative');

      if (pubInitiative.name === 'Algorithmischer Diskurs') {
        // Alle Medien-Karten geben +1 Einfluss
        const mediaCards = pool.filter(c =>
          c.kind === 'pol' &&
          ['Oprah Winfrey', 'Mark Zuckerberg', 'Tim Cook', 'Sam Altman'].includes(c.name)
        ) as PoliticianCard[];

        logDataFlow('board analysis', 'media cards', {
          count: mediaCards.length,
          cards: mediaCards.map(c => ({ name: c.name, influence: c.kind === 'pol' ? (c as any).influence : 0 }))
        }, 'Finding media cards for Algorithmischer Diskurs effect');

        let totalInfluenceGained = 0;
        mediaCards.forEach(card => {
          const oldInfluence = card.influence;
          adjustInfluence(card, 1, 'Algorithmischer Diskurs');
          const newInfluence = card.influence;
          totalInfluenceGained += 1;
          logCardEffect('Algorithmischer Diskurs', `${card.name} erhält +1 Einfluss (${oldInfluence} → ${newInfluence})`);
        });

        if (mediaCards.length > 0) {
          logCardEffect('Algorithmischer Diskurs', `${mediaCards.length} Medien-Karten gefunden - ${totalInfluenceGained} Punkte zum Gesamteinfluss hinzugefügt`);
        } else {
          logWarning('No media cards found', 'Algorithmischer Diskurs effect has no targets');
        }
      }
    }

    // Legacy flags reset is replaced by the new applyStartOfTurnHooks implementation

    logFunctionCall('applyStartOfTurnHooksLegacy', { player }, 'Legacy turn hooks completed');
  }, [logFunctionCall, logDataFlow, logCardEffect, logWarning]);

  // Helper: Leadership vorhanden?
  const hasLeadershipCard = (player: Player, state: GameState): boolean => {
    const gov = state.board[player].aussen;
    const names = ['Justin Trudeau'];
    return gov.some(c => c.kind === 'pol' && names.includes(c.name) && !(c as PoliticianCard).deactivated);
  };

  // Helper: Bewegung vorhanden? (Öffentlichkeitsreihe)
  const hasMovementCard = (player: Player, state: GameState): boolean => {
    const pub = state.board[player].innen;
    const names = ['Greta Thunberg', 'Malala Yousafzai', 'Ai Weiwei', 'Alexei Navalny'];
    return pub.some(c => c.kind === 'pol' && names.includes(c.name) && !(c as PoliticianCard).deactivated);
  };

  // Helper: Plattform vorhanden? (Öffentlichkeitsreihe)
  const hasPlatformCard = (player: Player, state: GameState): boolean => {
    const pub = state.board[player].innen;
    const names = ['Mark Zuckerberg', 'Tim Cook', 'Jack Ma', 'Zhang Yiming'];
    return pub.some(c => c.kind === 'pol' && names.includes(c.name) && !(c as PoliticianCard).deactivated);
  };

  // Helper: Diplomat vorhanden? (Regierungsreihe)
  const hasDiplomatCard = (player: Player, state: GameState): boolean => {
    const gov = state.board[player].aussen;
    const names = ['Joschka Fischer', 'Sergey Lavrov', 'Ursula von der Leyen', 'Jens Stoltenberg', 'Horst Köhler', 'Walter Scheel', 'Hans Dietrich Genscher', 'Colin Powell', 'Condoleezza Rice', 'Christine Lagarde'];
    return gov.some(c => c.kind === 'pol' && names.includes(c.name) && !(c as PoliticianCard).deactivated);
  };

  // Helper: Einfluss-Transfer durch Dauerhaft-Initiativen blockiert? (Koalitionszwang, Napoleon Komplex)
  const hasInfluenceTransferBlock = (player: Player, state: GameState): boolean => {
    const govSlot = state.permanentSlots[player].government;
    if (!govSlot || govSlot.kind !== 'spec') return false;
    const spec = govSlot as SpecialCard;
    return ['Koalitionszwang', 'Napoleon Komplex'].includes(spec.name);
  };

  // Helper: Kann Spieler mehrere Interventionen spielen? (Putin-Fähigkeit)
  const canPlayMultipleInterventions = (player: Player, state: GameState): boolean => {
    const govCards = state.board[player].aussen.filter(c => c.kind === 'pol') as PoliticianCard[];
    return govCards.some(c => c.name === 'Vladimir Putin' && !c.deactivated);
  };

  const selectHandCard = useCallback((index: number | null) => {
    setSelectedHandIndex(index);
  }, []);

  const passTurn = useCallback((player: Player) => {
    setGameState(prev => {
      if (prev.current !== player) return prev;

      const newState = { ...prev, passed: { ...prev.passed, [player]: true } };
      log(`Spieler ${player} passt.`);

      // If both players have passed, resolve the round
      if (newState.passed[1] && newState.passed[2]) {
        return resolveRound(newState);
      }

      return newState;
    });
  }, [log, resolveRound]);

  // Diplomat-Einfluss-Transfer Funktion
  const transferInfluence = useCallback((player: Player, fromCardUid: number, toCardUid: number, amount: number) => {
    setGameState(prev => {
      if (prev.current !== player) return prev;

      const flags = prev.effectFlags?.[player];
      if (!flags || flags.diplomatInfluenceTransferUsed || flags.influenceTransferBlocked) return prev;
      if (!hasDiplomatCard(player, prev)) return prev;

      // Finde beide Karten in der Regierungsreihe
      const govCards = prev.board[player].aussen;
      const fromCard = govCards.find(c => c.uid === fromCardUid && c.kind === 'pol') as PoliticianCard;
      const toCard = govCards.find(c => c.uid === toCardUid && c.kind === 'pol') as PoliticianCard;

      if (!fromCard || !toCard || fromCard.influence < amount) return prev;

      // Transfer durchführen
      adjustInfluence(fromCard, -amount, 'Diplomat-Transfer');
      adjustInfluence(toCard, amount, 'Diplomat-Transfer');

      // Flag setzen
      const newFlags = { ...flags, diplomatInfluenceTransferUsed: true };
      const newEffectFlags = { ...prev.effectFlags, [player]: newFlags } as GameState['effectFlags'];

      log(`P${player} transferiert ${amount} Einfluss von ${fromCard.name} zu ${toCard.name} (Diplomat).`);

      return {
        ...prev,
        effectFlags: newEffectFlags
      };
    });
  }, [log]);

  // Active Abilities Management
  const getActiveAbilities = useCallback((player: Player) => {
    return ActiveAbilitiesManager.getAvailableAbilities(player, gameState);
  }, []);

  const useActiveAbility = useCallback((abilityId: string, targetCardUid?: number) => {
    setGameState(prev => {
      const player = prev.current;
      const abilities = ActiveAbilitiesManager.getAvailableAbilities(player, prev);
      const ability = abilities.find(a => a.id === abilityId);

      if (!ability || !ActiveAbilitiesManager.canUseAbility(ability, player, prev)) {
        return prev;
      }

      // Finde Actor Card
      const allCards = [...prev.board[player].innen, ...prev.board[player].aussen].filter(c => c.kind === 'pol') as PoliticianCard[];
      const actorCard = allCards.find(c => ability.id.includes(c.uid.toString()));

      if (!actorCard) return prev;

      // Finde Target Card wenn nötig
      let targetCard: PoliticianCard | undefined;
      if (targetCardUid) {
        const allTargets = [...prev.board[1].innen, ...prev.board[1].aussen, ...prev.board[2].innen, ...prev.board[2].aussen].filter(c => c.kind === 'pol') as PoliticianCard[];
        targetCard = allTargets.find(c => c.uid === targetCardUid);
      }

      const select = {
        type: ability.type,
        actorCard,
        actorPlayer: player,
        targetCard
      } as any;

      const newState = ActiveAbilitiesManager.executeAbility(ability, select, prev);

      log(`${actorCard.name} nutzt ${ability.name}${targetCard ? ` auf ${targetCard.name}` : ''}.`);

      return newState;
    });
  }, [gameState, log]);

  // Reset aktive Fähigkeiten zu Rundenbeginn
  const resetActiveAbilities = useCallback((state: GameState): GameState => {
    const newState = { ...state };

    // Reset _activeUsed für alle Politikerkarten
    [1, 2].forEach(player => {
      const allCards = [...newState.board[player as Player].innen, ...newState.board[player as Player].aussen].filter(c => c.kind === 'pol') as PoliticianCard[];
      allCards.forEach(card => {
        card._activeUsed = false;
      });
    });

    return newState;
  }, []);

  // Putin Doppelte Interventionen
  const executePutinDoubleIntervention = useCallback((interventionCardIds: number[]) => {
    setGameState(prev => {
      const player = prev.current;
      const newState = ActiveAbilitiesManager.executePutinDoubleIntervention(prev, player, interventionCardIds, log);
      return newState;
    });
  }, [log]);

  // Check ob Putin Doppel-Intervention verfügbar ist
  const canUsePutinDoubleIntervention = useCallback((player: Player): boolean => {
    const board = gameState.board[player];
    const allCards = [...board.innen, ...board.aussen].filter(c => c.kind === 'pol') as PoliticianCard[];
    const putin = allCards.find(c => c.name === 'Vladimir Putin');

    if (!putin || putin.deactivated || putin._activeUsed) return false;

    const interventions = gameState.hands[player].filter(c => c.kind === 'spec');
    return interventions.length >= 2;
  }, [gameState]);

  // Manual turn advancement for testing
  const manualAdvanceTurn = useCallback(() => {
    console.log('🔧 DEBUG: Manual turn advancement triggered');
    log('🔧 DEBUG: Manual turn advancement triggered');
    nextTurn();
  }, [nextTurn, log]);

  return {
    gameState,
    selectedHandIndex,
    log,
    startNewGame,
    selectHandCard: setSelectedHandIndex,
    scores,
    manualAdvanceTurn, // Manual turn advancement for testing

    // Core game state functions
    dealStartingHands,
    resolveRound,
    nextTurn: gameActions.nextTurn,
    endTurn: gameActions.endTurn,
    checkAndAdvanceTurn,
    shouldAdvanceTurn,

    // Helper functions kept for compatibility
    hasLeadershipCard,
    hasMovementCard,
    hasPlatformCard,
    hasDiplomatCard,
    hasInfluenceTransferBlock,
    canPlayMultipleInterventions,
    sumRowWithAuras,
    applyStartOfTurnHooksLegacy,

    // Functions that were migrated to separate hooks
    passTurn: gameActions.passTurn,
    transferInfluence,
    getActiveAbilities,
    useActiveAbility,
    resetActiveAbilities,
    executePutinDoubleIntervention,
    canUsePutinDoubleIntervention,

    // Delegate primary functionality to separated hooks
    startMatchWithDecks: gameActions.startMatchWithDecks,
    startMatchVsAI: gameActions.startMatchVsAI,
    playCard: gameActions.playCard,
    activateInstantInitiative: gameActions.activateInstantInitiative,

    // AI functionality
    runAITurn: gameAI.runAITurn,
    aiEnabled: gameAI.aiEnabled,
    setAiEnabled: gameAI.setAiEnabled,
    aiPreset: gameAI.aiPreset,
    setAiPreset: gameAI.setAiPreset,

    // Effects functionality
    executeCardEffect,
    processEffectQueue,
    afterQueueResolved,
  };
}
