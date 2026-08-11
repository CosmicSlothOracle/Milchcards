import { useState, useCallback } from 'react';
import { GameState, Card, PoliticianCard, SpecialCard, Player, BuilderEntry, createDefaultEffectFlags } from '../types/game';
import { Pols, Specials } from '../data/gameData';
import {
  sumRow,
  shuffle,
  makePolInstance,
  makeSpecInstance,
  buildDeckFromEntries,
  drawCardsAtRoundEnd,
  tryApplyNegativeEffect,
  adjustInfluence,
  findCardLocation,
  sumGovernmentInfluenceWithAuras,
  EffectQueueManager,
  currentBuilderBudget,
  currentBuilderCount
} from '../utils/gameUtils';
import { getCardDetails } from '../data/cardDetails';
import { useGameActions } from './useGameActions';
import { useGameAI } from './useGameAI';
import { useGameEffects } from './useGameEffects';
import { applyStartOfTurnHooks } from '../utils/startOfTurnHooks';
import { emptyBoard, emptyBoardSide, ensureSofortBoard } from '../state/board';
import { formatLogEntry, isLogBufferActive, pushToLogBuffer } from '../utils/logBuffer';

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
    const logEntry = formatLogEntry(msg);
    console.log(logEntry);

    if (isLogBufferActive()) {
      pushToLogBuffer(logEntry);
      return;
    }

    setGameState(prev => ({
      ...prev,
      log: [...prev.log, logEntry]
    }));
  }, []);

  // Enhanced logging functions for different types of events
  const logUIInteraction = useCallback((action: string, details: string) => {
    log(`🎯 UI: ${ action } - ${ details }`);
  }, [log]);

  const logGameStateChange = useCallback((change: string, details: string) => {
    log(`🔄 STATE: ${ change } - ${ details }`);
  }, [log]);

  const logAIAction = useCallback((action: string, details: string) => {
    log(`🤖 KI: ${ action } - ${ details }`);
  }, [log]);

  const logCardEffect = useCallback((cardName: string, effect: string) => {
    log(`✨ EFFEKT: ${ cardName } - ${ effect }`);
  }, [log]);

  const logIntervention = useCallback((interventionName: string, trigger: string) => {
    log(`💥 INTERVENTION: ${ interventionName } ausgelöst durch ${ trigger }`);
  }, [log]);

  // New detailed logging functions for debugging
  const logFunctionCall = useCallback((functionName: string, params: any, context: string) => {
    const paramStr = typeof params === 'object' ? JSON.stringify(params, null, 2) : String(params);
    log(`🔧 CALL: ${ functionName }(${ paramStr }) - ${ context }`);
  }, [log]);

  const logDataFlow = useCallback((from: string, to: string, data: any, action: string) => {
    const dataStr = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
    log(`📊 FLOW: ${ from } → ${ to } | ${ action } | Data: ${ dataStr }`);
  }, [log]);

  const logConditionCheck = useCallback((condition: string, result: boolean, context: string) => {
    log(`🔍 CHECK: ${ condition } = ${ result } - ${ context }`);
  }, [log]);

  const logError = useCallback((error: string, context: string) => {
    log(`❌ ERROR: ${ error } - ${ context }`);
  }, [log]);

  const logWarning = useCallback((warning: string, context: string) => {
    log(`⚠️ WARN: ${ warning } - ${ context }`);
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
  const gameAI = useGameAI(
    gameState,
    setGameState,
    log,
    gameActions.playCard,
    gameActions.passTurn
  );
  const gameEffects = useGameEffects(gameState, setGameState, log, {
    logFunctionCall,
    logCardEffect,
    logDataFlow,
    logWarning,
  });

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
      const forcedSpecials = [
        'Bestechungsskandal 2.0',
        'Maulwurf',
        'Greta Thunberg',
        'Mark Zuckerberg',
        'Symbolpolitik',
      ];
      const forcedSpecCards = forcedSpecials
        .map(name => specPool.find(s => s.name === name))
        .filter((s): s is (typeof Specials)[number] => Boolean(s));
      forcedSpecCards.forEach(s => deck.push(makeSpecInstance(s)));

      const remainingSpecs = specPool
        .filter(s => !forcedSpecCards.some(forced => forced.id === s.id))
        .slice()
        .sort((a, b) => implFirst.indexOf(a.impl) - implFirst.indexOf(b.impl));

      const desiredSpecCount = 16;
      const remainingNeeded = Math.max(0, desiredSpecCount - forcedSpecCards.length);
      remainingSpecs.slice(0, remainingNeeded).forEach(s => deck.push(makeSpecInstance(s)));
      return shuffle(deck).slice(0, 30);
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
    // console.log('🔧 DEBUG: startMatchWithDecks called - activating AI for player 2');
    // Automatically enable AI for player 2 when starting with decks
    // console.log('🔧 DEBUG: About to call gameAI.setAiEnabled(true)');
    gameAI.setAiEnabled(true);
    // console.log('🔧 DEBUG: About to call gameAI.setAiPreset(AUTORITAERER_REALIST)');
    gameAI.setAiPreset('AUTORITAERER_REALIST');
    // console.log('🔧 DEBUG: AI setup completed');

    console.log('[DIAG] startMatchWithDecks - p1DeckEntries', p1DeckEntries.length, 'p2DeckEntries', p2DeckEntries.length);
    console.log('[DIAG] startMatchWithDecks - sample entries:', p1DeckEntries.slice(0, 2), p2DeckEntries.slice(0, 2));

    const budgetLimit = 69;
    const p1Count = currentBuilderCount(p1DeckEntries);
    const p2Count = currentBuilderCount(p2DeckEntries);
    const p1Budget = currentBuilderBudget(p1DeckEntries);
    const p2Budget = currentBuilderBudget(p2DeckEntries);

    if (p1Count !== 25 || p2Count !== 25 || p1Budget > budgetLimit || p2Budget > budgetLimit) {
      log(`Deck-Validierung fehlgeschlagen. Deckgröße muss 25 sein, Budget ≤ ${ budgetLimit }. P1: ${ p1Count } Karten / ${ p1Budget } BP, P2: ${ p2Count } Karten / ${ p2Budget } BP.`);
      return;
    }

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
      log: [`Match gestartet. P1 und P2 erhalten je ${ h1.length }/${ h2.length } Startkarten.`],
      activeRefresh: { 1: 0, 2: 0 },
    });
    console.log('[DIAG] setGameState called in startMatchWithDecks');
  }, [gameAI, log]);

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

      // Apply start-of-turn hooks for the new current player
      const newState: GameState = {
        ...prev,
        current: newCurrent
      };

      // Log turn change
      log(`Spieler ${ newCurrent } ist am Zug (2 AP verfügbar)`);
      logGameStateChange('turn change', `Player ${ newCurrent } turn started`);

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
    // Safety: same W6 purge as useGameActions.resolveRound (legacy path)
    try {
      const { runPurgeSequence } = require('../utils/corruption');
      runPurgeSequence(state, log);
    } catch (e) {
      log(`⚠️ Säuberung (legacy) fehlgeschlagen: ${String(e)}`);
    }

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

    log(`Runde ${ state.round } endet (nach Säuberung): P1 ${ s1 } : P2 ${ s2 }. Gewinner: P${ winner }${ note }.`);

    // Rundensieg zählen
    const newRoundsWon = { ...state.roundsWon };
    newRoundsWon[winner] += 1;

    // Prüfe Best-of-3 Gewinner
    let gameWinner: 1 | 2 | null = null;
    if (newRoundsWon[1] >= 2) {
      gameWinner = 1;
      log(`🎉 SPIEL ENDE: Spieler 1 gewinnt das Spiel! (${ newRoundsWon[1] }:${ newRoundsWon[2] })`);
    } else if (newRoundsWon[2] >= 2) {
      gameWinner = 2;
      log(`🎉 SPIEL ENDE: Spieler 2 gewinnt das Spiel! (${ newRoundsWon[2] }:${ newRoundsWon[1] })`);
    }

    // clear board (no carryover)
    const newBoard = emptyBoard();
    const newTraps = { 1: [], 2: [] };

    // Verbesserte Karten-Nachzieh-Mechanik (ziehe bis Hand voll ist)
    const { newHands, newDecks, gameEnded, winner: deckWinner } = drawCardsAtRoundEnd(state, log);

    // 🔥 PERSISTENT DECK LOGIC: Prüfe ob Spiel durch leere Decks beendet wurde
    if (gameEnded && deckWinner) {
      log(`🎉 SPIEL ENDE: Spieler ${ deckWinner } gewinnt das Spiel durch leere Decks!`);
      return {
        ...state,
        gameWinner: deckWinner,
        roundsWon: { ...state.roundsWon, [deckWinner]: (state.roundsWon[deckWinner] || 0) + 1 }
      };
    }

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

    log(`Runde ${ newRound } beginnt. P${ newCurrent } startet.`);

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
      const interventionReduction = ((): number => {
        const altFakten = prev.permanentSlots[actingPlayer].public;
        if (altFakten?.kind === 'spec' && (altFakten as SpecialCard).name === 'Alternative Fakten') {
          return 1;
        }
        return 0;
      })();

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

        // Cancel Culture: only Oligarch / Media-like publics
        if ((details?.name === 'Cancel Culture' || key === 'Cancel_Culture') && event.lane === 'innen') {
          const subs = (details?.subcategories || []) as string[];
          const isOligarchOrMedia =
            isMedia ||
            isPlatform ||
            (played as any).tag === 'Oligarch' ||
            (played as any).tag === 'Medien' ||
            (played as any).tag === 'Media' ||
            subs.includes('Oligarch') ||
            subs.includes('Medien') ||
            subs.includes('Plattform');
          if (isOligarchOrMedia) {
            tryApplyNegativeEffect(played, () => { played.deactivated = true; }, prev.round);
            oppTraps.splice(i, 1); i--; trapsChanged = true;
            log(`Intervention ausgelöst: Cancel Culture → ${ played.name } deaktiviert.`);
            logIntervention('Cancel Culture', `Ausgelöst gegen ${ played.name } (Oligarch/Medien)`);
          }
          continue;
        }
        if ((details?.name === 'Fake News-Kampagne' || key === 'Fake_News_Kampagne') && isMedia) {
          tryApplyNegativeEffect(played, () => { played.deactivated = true; }, prev.round);
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Fake News-Kampagne → ${ played.name } deaktiviert.`);
          logIntervention('Fake News-Kampagne', `Ausgelöst gegen ${ played.name } (Medien)`);
          continue;
        }

        // Whistleblower (Tier 2 Regierung)
        if ((details?.name === 'Whistleblower' || key === 'Whistleblower') && isTier2Gov) {
          const amount = Math.min(0, -2 + interventionReduction);
          tryApplyNegativeEffect(played, () => { adjustInfluence(played, amount, 'Whistleblower'); }, prev.round);
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Whistleblower → ${ played.name } ${ amount } Einfluss.`);
          continue;
        }

        // Berater-Affäre (Tier 1 Regierung)
        if ((details?.name === 'Berater-Affäre' || key === 'Berater_Affaere') && isTier1Gov) {
          const amount = Math.min(0, -2 + interventionReduction);
          tryApplyNegativeEffect(played, () => { adjustInfluence(played, amount, 'Berater-Affäre'); }, prev.round);
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Berater-Affäre → ${ played.name } ${ amount } Einfluss.`);
          continue;
        }

        // Soft Power-Kollaps / Deepfake-Skandal (Diplomat)
        if ((details?.name === 'Soft Power-Kollaps' || key === 'Soft_Power_Kollaps') && isDiplomat) {
          const amount = Math.min(0, -3 + interventionReduction);
          tryApplyNegativeEffect(played, () => { adjustInfluence(played, amount, 'Soft Power-Kollaps'); }, prev.round);
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Soft Power-Kollaps → ${ played.name } ${ amount } Einfluss.`);
          continue;
        }
        if ((details?.name === 'Deepfake-Skandal' || key === 'Deepfake_Skandal') && isDiplomat) {
          // Kein Einflusstransfer möglich - Flag setzen
          const newFlags = { ...prev.effectFlags?.[actingPlayer], influenceTransferBlocked: true };
          prev.effectFlags = { ...prev.effectFlags, [actingPlayer]: newFlags } as GameState['effectFlags'];
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Deepfake-Skandal → ${ played.name } kann keinen Einfluss transferieren.`);
          continue;
        }

        // Lobby Leak / Boykott-Kampagne (NGO/Bewegung)
        if ((details?.name === 'Lobby Leak' || key === 'Lobby_Leak') && isNGO) {
          const hands = { ...prev.hands } as GameState['hands'];
          if (hands[actingPlayer].length > 0) {
            const discardIndex = Math.floor(Math.random() * hands[actingPlayer].length);
            const [discarded] = hands[actingPlayer].splice(discardIndex, 1);
            prev.hands = hands;
            prev.discard = [...prev.discard, discarded];
          }
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Lobby Leak → P${ actingPlayer } wirft 1 Karte ab.`);
          continue;
        }

        // Interne Fraktionskämpfe (große Initiative 3-4 HP)
        if ((details?.name === 'Interne Fraktionskämpfe' || key === 'Interne_Fraktionskaempfe') && event.card?.kind === 'spec') {
          const specCard = event.card as SpecialCard;
          const isLargeInitiative = specCard.type === 'Sofort-Initiative' && specCard.bp >= 3;
          if (isLargeInitiative) {
            const hands = { ...prev.hands } as GameState['hands'];
            hands[actingPlayer].push(event.card);
            prev.hands = hands;
            oppTraps.splice(i, 1); i--; trapsChanged = true;
            log(`Intervention ausgelöst: Interne Fraktionskämpfe → ${ event.card.name } wird annulliert.`);
            continue;
          }
        }
        if ((details?.name === 'Boykott-Kampagne' || key === 'Boykott_Kampagne') && (isNGO || ['Greta Thunberg', 'Malala Yousafzai', 'Ai Weiwei', 'Alexei Navalny'].includes(played.name))) {
          tryApplyNegativeEffect(played, () => { played.deactivated = true; }, prev.round);
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Boykott-Kampagne → ${ played.name } deaktiviert.`);
          continue;
        }

        // Cyber-Attacke (Plattform): deactivate instead of destroy
        if ((details?.name === 'Cyber-Attacke' || key === 'Cyber_Attacke') && isPlatform) {
          tryApplyNegativeEffect(played, () => { (played as any).deactivated = true; }, prev.round);
          oppTraps.splice(i, 1); i--; trapsChanged = true;
          log(`Intervention ausgelöst: Cyber-Attacke → ${ played.name } deaktiviert.`);
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

        // Massenproteste (2 Regierungskarten in der Runde)
        if ((details?.name === 'Massenproteste' || key === 'Massenproteste') && event.type === 'card_played' && event.lane === 'aussen') {
          // Vereinfacht: Beide Regierungskarten -1 Einfluss
          const govCards = board[actingPlayer].aussen.filter(c => c.kind === 'pol') as PoliticianCard[];
          if (govCards.length >= 2) {
            const amount = Math.min(0, -1 + interventionReduction);
            adjustInfluence(govCards[0], amount, 'Massenproteste');
            adjustInfluence(govCards[1], amount, 'Massenproteste');
            oppTraps.splice(i, 1); i--; trapsChanged = true;
            log(`Intervention ausgelöst: Massenproteste → ${ govCards[0].name } und ${ govCards[1].name } ${ amount } Einfluss.`);
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
            log(`Intervention ausgelöst: "Unabhängige" Untersuchung → ${ event.card.name } wird annulliert.`);
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
            log(`Intervention ausgelöst: Maulwurf → Kopie von ${ weakestCard.name } auf Hand.`);
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
              const updatedLane = board[actingPlayer].innen.filter(c => c.uid !== lastPubCard.uid);
              board = {
                ...board,
                [actingPlayer]: { ...board[actingPlayer], innen: updatedLane }
              } as GameState['board'];
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
              const amount = Math.min(0, -2 + interventionReduction);
              adjustInfluence(oppGovCards[0], amount, 'Satire-Show');
              oppTraps.splice(i, 1); i--; trapsChanged = true;
              log(`Intervention ausgelöst: Satire-Show → ${ oppGovCards[0].name } ${ amount } Einfluss.`);
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

  // Berechne Einfluss mit dauerhaften Auren-Effekten (single source of truth)
  const sumRowWithAuras = (state: GameState, player: Player): number => {
    return sumGovernmentInfluenceWithAuras(state, player);
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
          log(`Wahlversprechen Abzug auf ${ polCard.name }: ${ oldInfluence } → ${ newInfluence }`);
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
        // Aura only (intervention/corruption dampen) — no oligarch influence buff
        logCardEffect('Alternative Fakten', 'Aura aktiv: Interventionen −1, gegnerische Korruption −1');
      }
    }

    if (pubSlot && pubSlot.kind === 'spec') {
      const pubInitiative = pubSlot as SpecialCard;
      logFunctionCall('applyPermanentInitiative', { slot: 'public', initiative: pubInitiative.name }, 'Processing public permanent initiative');

      if (pubInitiative.name === 'Algorithmischer Diskurs') {
        // On-play only (ALGO_DISCOURSE_DEBUFF) — no per-turn media influence buff
        logCardEffect('Algorithmischer Diskurs', 'Aura-Platzhalter: Effekt greift beim Ausspielen');
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
    return ['Napoleon Komplex'].includes(spec.name);
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
      log(`Spieler ${ player } passt.`);

      // If both players have passed, resolve the round
      if (newState.passed[1] && newState.passed[2]) {
        return resolveRound(newState);
      }

      return newState;
    });
  }, [log, resolveRound]);

  // Manual turn advancement for testing
  const manualAdvanceTurn = useCallback(() => {
    // console.log('🔧 DEBUG: Manual turn advancement triggered');
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
    transferInfluence: gameEffects.transferInfluence,
    getActiveAbilities: gameEffects.getActiveAbilities,
    useActiveAbility: gameEffects.useActiveAbility,
    resetActiveAbilities: gameEffects.resetActiveAbilities,
    executePutinDoubleIntervention: gameEffects.executePutinDoubleIntervention,
    canUsePutinDoubleIntervention: gameEffects.canUsePutinDoubleIntervention,

    // Delegate primary functionality to separated hooks
    startMatchWithDecks: gameActions.startMatchWithDecks,
    startMatchVsAI: gameActions.startMatchVsAI,
    playCard: gameActions.playCard,
    activateInstantInitiative: gameActions.activateInstantInitiative,
    activateGovernmentAbility: gameActions.activateGovernmentAbility,
    activateLeader: gameActions.activateLeader,

    // AI functionality
    runAITurn: gameAI.runAITurn,
    aiEnabled: gameAI.aiEnabled,
    setAiEnabled: gameAI.setAiEnabled,
    aiPreset: gameAI.aiPreset,
    setAiPreset: gameAI.setAiPreset,

    // Effects functionality
    executeCardEffect: gameEffects.executeCardEffect,
    processEffectQueue: gameEffects.processEffectQueue,
    afterQueueResolved,

    // PvP: guests replace their local state with the host's authoritative state
    applyRemoteGameState: setGameState,
  };
}
