import { useCallback } from 'react';
import { Card, GameState, Player, PoliticianCard, SpecialCard } from '../types/game';
import { ActiveAbilitiesManager, EffectQueueManager, adjustInfluence, drawCards, hasDiplomatCard, sumRow } from '../utils/gameUtils';
import { getCardDetails } from '../data/cardDetails';

type GameEffectLoggers = {
  logFunctionCall?: (functionName: string, params: any, context: string) => void;
  logCardEffect?: (cardName: string, message: string) => void;
  logDataFlow?: (from: string, to: string, data: any, action: string) => void;
  logWarning?: (warning: string, context: string) => void;
};

export function useGameEffects(
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  log: (msg: string) => void,
  loggers: GameEffectLoggers = {},
) {
  const {
    logFunctionCall = () => {},
    logCardEffect = () => {},
    logDataFlow = () => {},
    logWarning = () => {},
  } = loggers;

  const executeCardEffect = useCallback((
    card: Card,
    player: Player,
    state: GameState
  ): GameState => {
    let newState = { ...state };

    logFunctionCall('executeCardEffect', { card: card.name, player, type: card.kind }, 'Starting card effect execution');

    if (card.kind === 'spec') {
      const specCard = card as SpecialCard;

      const handlers: Record<string, (spec: SpecialCard) => void> = {
        'Shadow Lobbying': (spec) => {
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
              logCardEffect(spec.name, `${target.name} erhält +${buffAmount} Einfluss ( ${oldInfl} → ${target.influence} )`);
            } else {
              logWarning('No government cards', 'Shadow Lobbying buff had no target');
            }
          } else {
            logCardEffect(spec.name, 'Keine Oligarchen – kein Einfluss-Buff');
          }
        },
        'Spin Doctor': (spec) => {
          const govCards = newState.board[player].aussen.filter(c => c.kind === 'pol') as PoliticianCard[];
          logDataFlow('board analysis', 'govCards', { count: govCards.length, cards: govCards.map(c => c.name) }, 'Finding government cards');

          if (govCards.length > 0) {
            const targetCard = govCards[0];
            const oldInfluence = targetCard.influence;
            adjustInfluence(targetCard, 2, 'Spin Doctor');
            const newInfluence = targetCard.influence;

            logCardEffect(spec.name, `${targetCard.name} erhält +2 Einfluss (${oldInfluence} → ${newInfluence})`);
            logDataFlow('influence adjustment', 'targetCard', { card: targetCard.name, old: oldInfluence, new: newInfluence, change: 2 }, 'Spin Doctor effect applied');
          } else {
            logWarning('No government cards found', 'Spin Doctor effect has no target');
          }
        },
        'Digitaler Wahlkampf': (spec) => {
          logCardEffect(spec.name, 'Ziehe 2 Karten, nächste Initiative -1 AP');
          const { newHands, newDecks } = drawCards(player, 2, newState, log);
          newState = { ...newState, hands: newHands, decks: newDecks };
          logDataFlow('effectFlags', 'newState', { player }, 'Platform effect applied');
        },
        'Partei-Offensive': (spec) => {
          const opponent: Player = player === 1 ? 2 : 1;
          const oppGovCards = newState.board[opponent].aussen.filter(c => c.kind === 'pol' && !(c as PoliticianCard).deactivated) as PoliticianCard[];
          logDataFlow('opponent analysis', 'oppGovCards', { opponent, count: oppGovCards.length, cards: oppGovCards.map(c => c.name) }, 'Finding active opponent government cards');

          if (oppGovCards.length > 0) {
            const targetCard = oppGovCards[0];
            targetCard.deactivated = true;
            logCardEffect(spec.name, `${targetCard.name} wird deaktiviert (bis Rundenende)`);
            logDataFlow('card deactivation', 'targetCard', { card: targetCard.name, deactivated: true }, 'Partei-Offensive effect applied');
          } else {
            logWarning('No active opponent government cards found', 'Partei-Offensive effect has no target');
          }
        },
        'Oppositionsblockade': (spec) => {
          const opponent: Player = player === 1 ? 2 : 1;
          const oppHand = newState.hands[opponent];
          logDataFlow('opponent hand', 'analysis', { opponent, handSize: oppHand.length, cards: oppHand.map(c => c.name) }, 'Analyzing opponent hand');

          if (oppHand.length > 0) {
            const discardedCard = oppHand[Math.floor(Math.random() * oppHand.length)];
            const newOppHand = oppHand.filter(c => c !== discardedCard);
            newState.hands = { ...newState.hands, [opponent]: newOppHand };

            logCardEffect(spec.name, `Gegner verliert ${discardedCard.name} aus der Hand`);
            logDataFlow('card discard', 'opponent hand', { card: discardedCard.name, newHandSize: newOppHand.length }, 'Oppositionsblockade effect applied');
          } else {
            logWarning('Opponent hand is empty', 'Oppositionsblockade effect has no target');
          }
        },
        'Opportunist': (spec) => {
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
            const { newHands, newDecks } = drawCards(player, 1, newState, log);
            newState = { ...newState, hands: newHands, decks: newDecks };
            logCardEffect(spec.name, `Gegner hat ${totalOppInfluence} Einfluss (>10) - ziehe 1 Karte`);
          } else {
            logCardEffect(spec.name, `Gegner hat ${totalOppInfluence} Einfluss (≤10) - kein Effekt`);
          }
        },
        'Think-tank': (spec) => {
          const { newHands, newDecks } = drawCards(player, 1, newState, log);
          newState = { ...newState, hands: newHands, decks: newDecks };
          logCardEffect(spec.name, 'Ziehe 1 Karte');
        },
        'Influencer-Kampagne': (spec) => {
          const publicCards = newState.board[player].innen.filter(c => c.kind === 'pol') as PoliticianCard[];
          logDataFlow('public cards analysis', 'influence boost', { count: publicCards.length, cards: publicCards.map(c => c.name) }, 'Finding public cards for influence boost');

          publicCards.forEach(card => {
            const oldInfluence = card.influence;
            adjustInfluence(card, 1, 'Influencer-Kampagne');
            const newInfluence = card.influence;
            logCardEffect(spec.name, `${card.name} erhält +1 Einfluss (${oldInfluence} → ${newInfluence})`);
          });

          if (publicCards.length === 0) {
            logWarning('No public cards found', 'Influencer-Kampagne effect has no targets');
          }
        },
        'Systemrelevant': (spec) => {
          const opponent: Player = player === 1 ? 2 : 1;
          const oppGovCards = newState.board[opponent].aussen.filter(c => c.kind === 'pol') as PoliticianCard[];
          logDataFlow('opponent government analysis', 'systemrelevant effect', { count: oppGovCards.length, cards: oppGovCards.map(c => c.name) }, 'Finding opponent government cards');

          if (oppGovCards.length > 0) {
            const targetCard = oppGovCards[0];
            const oldInfluence = targetCard.influence;
            adjustInfluence(targetCard, -2, 'Systemrelevant');
            const newInfluence = targetCard.influence;

            logCardEffect(spec.name, `${targetCard.name} verliert 2 Einfluss (${oldInfluence} → ${newInfluence})`);
            logDataFlow('influence reduction', 'targetCard', { card: targetCard.name, old: oldInfluence, new: newInfluence, change: -2 }, 'Systemrelevant effect applied');
          } else {
            logWarning('No opponent government cards found', 'Systemrelevant effect has no target');
          }
        },
        'Symbolpolitik': (spec) => {
          const { newHands, newDecks } = drawCards(player, 1, newState, log);
          newState = { ...newState, hands: newHands, decks: newDecks };

          newState.actionPoints = {
            ...newState.actionPoints,
            [player]: Math.min(2, newState.actionPoints[player] + 1)
          };

          const oldAP = state.actionPoints[player];
          const newAP = newState.actionPoints[player];
          logCardEffect(spec.name, `Ziehe 1 Karte, erhalte +1 AP (${oldAP} → ${newAP})`);
          logDataFlow('AP gain', 'player', { player, old: oldAP, new: newAP, change: 1 }, 'Symbolpolitik effect applied');
        },
        'Alexei Navalny': (spec) => {
          logCardEffect(spec.name, 'Ziehe 1 Karte');
          const { newHands, newDecks } = drawCards(player, 1, newState, log);
          newState = { ...newState, hands: newHands, decks: newDecks };
        },
        'Mukesh Ambani': (spec) => {
          logCardEffect(spec.name, 'Ziehe 1 Karte');
          const { newHands, newDecks } = drawCards(player, 1, newState, log);
          newState = { ...newState, hands: newHands, decks: newDecks };
        },
      };

      if (handlers[specCard.name]) {
        handlers[specCard.name](specCard);
      } else if (['Elon Musk', 'Bill Gates', 'George Soros', 'Warren Buffett', 'Mukesh Ambani', 'Jeff Bezos', 'Alisher Usmanov', 'Gautam Adani', 'Jack Ma', 'Zhang Yiming', 'Roman Abramovich'].includes(specCard.name)) {
        logCardEffect(specCard.name, 'Ziehe 1 Karte (Oligarch-Effekt)');
        const { newHands, newDecks } = drawCards(player, 1, newState, log);
        newState = { ...newState, hands: newHands, decks: newDecks };
      }
    }

    if (card.kind === 'spec' && (card as SpecialCard).type === 'Dauerhaft-Initiative') {
      const specCard = card as SpecialCard;
      if (specCard.name === 'Algorithmischer Diskurs') {
        logCardEffect(specCard.name, 'Dauerhafte Initiative: Alle Medien-Karten geben +1 Einfluss');
      } else if (specCard.name === 'Alternative Fakten') {
        logCardEffect(specCard.name, 'Dauerhafte Initiative: Alle Oligarchen geben +1 Einfluss');
      }
    } else if (card.kind === 'pol') {
      const polCard = card as PoliticianCard;
      logCardEffect(polCard.name, `Politiker platziert - Basis-Einfluss: ${polCard.influence}`);
    }

    logDataFlow('executeCardEffect', 'newState', { card: card.name, effectsApplied: true }, 'Card effect execution completed');

    return newState;
  }, [logCardEffect, logDataFlow, logFunctionCall, logWarning]);

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

  const getActiveAbilities = useCallback((player: Player) => (
    ActiveAbilitiesManager.getAvailableAbilities(player, gameState)
  ), [gameState]);

  const useActiveAbility = useCallback((abilityId: string, targetCardUid?: number) => {
    setGameState(prev => {
      const player = prev.current;
      const abilities = ActiveAbilitiesManager.getAvailableAbilities(player, prev);
      const ability = abilities.find(a => a.id === abilityId);

      if (!ability || !ActiveAbilitiesManager.canUseAbility(ability, player, prev)) {
        return prev;
      }

      const allCards = [...prev.board[player].innen, ...prev.board[player].aussen].filter(c => c.kind === 'pol') as PoliticianCard[];
      const actorCard = allCards.find(c => ability.id.includes(c.uid.toString()));

      if (!actorCard) return prev;

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
  }, [gameState, log, setGameState]);

  const transferInfluence = useCallback((player: Player, fromCardUid: number, toCardUid: number, amount: number) => {
    setGameState(prev => {
      if (prev.current !== player) return prev;

      const flags = prev.effectFlags?.[player];
      if (!flags || flags.diplomatInfluenceTransferUsed || flags.influenceTransferBlocked) return prev;
      if (!hasDiplomatCard(player, prev)) return prev;

      const governmentCards = prev.board[player].aussen;
      const fromCard = governmentCards.find(c => c.uid === fromCardUid && c.kind === 'pol') as PoliticianCard;
      const toCard = governmentCards.find(c => c.uid === toCardUid && c.kind === 'pol') as PoliticianCard;

      if (!fromCard || !toCard || fromCard.influence < amount) return prev;

      adjustInfluence(fromCard, -amount, 'Diplomat-Transfer');
      adjustInfluence(toCard, amount, 'Diplomat-Transfer');

      const newFlags = { ...flags, diplomatInfluenceTransferUsed: true };
      const newEffectFlags = { ...prev.effectFlags, [player]: newFlags } as GameState['effectFlags'];

      const diplomat = governmentCards.find(c => c.kind === 'pol' && (c as PoliticianCard).tag === 'Diplomat') as PoliticianCard | undefined;
      if (diplomat) diplomat._activeUsed = true;

      log(`P${player} transferiert ${amount} Einfluss von ${fromCard.name} zu ${toCard.name} (Diplomat).`);

      return {
        ...prev,
        effectFlags: newEffectFlags
      };
    });
  }, [log, setGameState]);

  const resetActiveAbilities = useCallback((state: GameState): GameState => {
    const newState = { ...state };
    [1, 2].forEach(player => {
      const allCards = [...newState.board[player as Player].innen, ...newState.board[player as Player].aussen].filter(c => c.kind === 'pol') as PoliticianCard[];
      allCards.forEach(card => {
        card._activeUsed = false;
      });
    });

    return newState;
  }, []);

  const executePutinDoubleIntervention = useCallback((interventionCardIds: number[]) => {
    setGameState(prev => {
      const player = prev.current;
      const newState = ActiveAbilitiesManager.executePutinDoubleIntervention(prev, player, interventionCardIds, log);
      return newState;
    });
  }, [log, setGameState]);

  const canUsePutinDoubleIntervention = useCallback((player: Player): boolean => {
    const board = gameState.board[player];
    const allCards = [...board.innen, ...board.aussen].filter(c => c.kind === 'pol') as PoliticianCard[];
    const putin = allCards.find(c => c.name === 'Vladimir Putin');

    if (!putin || putin.deactivated || putin._activeUsed) return false;

    const interventions = gameState.hands[player].filter(c => c.kind === 'spec');
    return interventions.length >= 2 && gameState.actionPoints[player] >= 2;
  }, [gameState]);

  return {
    executeCardEffect,
    processEffectQueue,
    getActiveAbilities,
    useActiveAbility,
    transferInfluence,
    resetActiveAbilities,
    executePutinDoubleIntervention,
    canUsePutinDoubleIntervention,
  };
}
