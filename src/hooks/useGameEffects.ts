import { useCallback } from 'react';
import { GameState, Card, Player, PoliticianCard, SpecialCard } from '../types/game';
import { ActiveAbilitiesManager, EffectQueueManager, adjustInfluence, drawCards, sumRow } from '../utils/gameUtils';
import { getCardDetails } from '../data/cardDetails';

export function useGameEffects(
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  log: (msg: string) => void
) {

  const executeCardEffect = useCallback((
    card: Card,
    player: Player,
    state: GameState,
    logFunc: (msg: string) => void
  ): GameState => {
    let newState = { ...state };

    if (card.kind === 'spec') {
      const specCard = card as SpecialCard;

      const specialHandlers: Record<string, () => void> = {
        'Shadow Lobbying': () => {
          const boardCards = [
            ...newState.board[player].innen,
            ...newState.board[player].aussen,
          ];
          const oligarchCount = boardCards.filter(c => {
            const details = getCardDetails(c.name);
            return details?.subcategories?.includes('Oligarch');
          }).length;

          const buffAmount = Math.min(oligarchCount, 3);
          const govCards = newState.board[player].aussen.filter(c => c.kind === 'pol') as PoliticianCard[];

          if (buffAmount > 0 && govCards.length) {
            const target = govCards[0];
            adjustInfluence(target, buffAmount, 'Shadow Lobbying');
            logFunc(`Shadow Lobbying: ${target.name} erhält +${buffAmount} Einfluss.`);
          } else {
            logFunc('Shadow Lobbying: Kein Effekt.');
          }
        },
        'Spin Doctor': () => {
          const govCards = newState.board[player].aussen.filter(c => c.kind === 'pol') as PoliticianCard[];
          if (govCards.length > 0) {
            const targetCard = govCards[0];
            adjustInfluence(targetCard, 2, 'Spin Doctor');
            logFunc(`Spin Doctor: ${targetCard.name} erhält +2 Einfluss.`);
          } else {
            logFunc('Spin Doctor: Keine Regierungskarte als Ziel.');
          }
        },
        'Digitaler Wahlkampf': () => {
          const { newHands, newDecks } = drawCards(player, 2, newState, logFunc);
          newState = { ...newState, hands: newHands, decks: newDecks };
          logFunc('Digitaler Wahlkampf: Ziehe 2 Karten.');
        },
        'Partei-Offensive': () => {
          const opponent: Player = player === 1 ? 2 : 1;
          const oppGovCards = newState.board[opponent].aussen.filter(c => c.kind === 'pol' && !(c as PoliticianCard).deactivated) as PoliticianCard[];
          if (oppGovCards.length > 0) {
            const targetCard = oppGovCards[0];
            targetCard.deactivated = true;
            logFunc(`Partei-Offensive: ${targetCard.name} wird deaktiviert.`);
          } else {
            logFunc('Partei-Offensive: Kein Ziel.');
          }
        },
        'Oppositionsblockade': () => {
          const opponent: Player = player === 1 ? 2 : 1;
          const oppHand = newState.hands[opponent];
          if (oppHand.length > 0) {
            const discardedCard = oppHand[Math.floor(Math.random() * oppHand.length)];
            const newOppHand = oppHand.filter(c => c.uid !== discardedCard.uid);
            newState.hands = { ...newState.hands, [opponent]: newOppHand };
            newState.discard = [...newState.discard, discardedCard];
            logFunc(`Oppositionsblockade: Gegner verliert ${discardedCard.name}.`);
          } else {
            logFunc('Oppositionsblockade: Gegnerhand ist leer.');
          }
        },
        'Opportunist': () => {
          const opponent: Player = player === 1 ? 2 : 1;
          const oppBoard = newState.board[opponent];
          const totalOppInfluence = sumRow([...oppBoard.innen, ...oppBoard.aussen]);
          if (totalOppInfluence > 10) {
            const { newHands, newDecks } = drawCards(player, 1, newState, logFunc);
            newState = { ...newState, hands: newHands, decks: newDecks };
            logFunc(`Opportunist: Gegner hat ${totalOppInfluence} Einfluss - ziehe 1 Karte.`);
          } else {
            logFunc(`Opportunist: Gegner hat ${totalOppInfluence} Einfluss - kein Effekt.`);
          }
        },
        'Think-tank': () => {
          const { newHands, newDecks } = drawCards(player, 1, newState, logFunc);
          newState = { ...newState, hands: newHands, decks: newDecks };
          logFunc('Think-tank: Ziehe 1 Karte.');
        },
        'Influencer-Kampagne': () => {
          const publicCards = newState.board[player].innen.filter(c => c.kind === 'pol') as PoliticianCard[];
          publicCards.forEach(card => adjustInfluence(card, 1, 'Influencer-Kampagne'));
          logFunc(publicCards.length > 0
            ? `Influencer-Kampagne: ${publicCards.length} Öffentlichkeitskarten erhalten +1 Einfluss.`
            : 'Influencer-Kampagne: Keine Öffentlichkeitskarten.');
        },
        'Systemrelevant': () => {
          const opponent: Player = player === 1 ? 2 : 1;
          const oppGovCards = newState.board[opponent].aussen.filter(c => c.kind === 'pol') as PoliticianCard[];
          if (oppGovCards.length > 0) {
            const targetCard = oppGovCards[0];
            adjustInfluence(targetCard, -2, 'Systemrelevant');
            logFunc(`Systemrelevant: ${targetCard.name} verliert 2 Einfluss.`);
          } else {
            logFunc('Systemrelevant: Kein Ziel.');
          }
        },
        'Symbolpolitik': () => {
          const { newHands, newDecks } = drawCards(player, 1, newState, logFunc);
          newState = { ...newState, hands: newHands, decks: newDecks };
          newState.actionPoints = {
            ...newState.actionPoints,
            [player]: newState.actionPoints[player] + 1
          };
          logFunc('Symbolpolitik: Ziehe 1 Karte und erhalte +1 AP.');
        },
        'Alexei Navalny': () => {
          const { newHands, newDecks } = drawCards(player, 1, newState, logFunc);
          newState = { ...newState, hands: newHands, decks: newDecks };
          logFunc('Alexei Navalny: Ziehe 1 Karte.');
        },
        'Mukesh Ambani': () => {
          const { newHands, newDecks } = drawCards(player, 1, newState, logFunc);
          newState = { ...newState, hands: newHands, decks: newDecks };
          logFunc('Mukesh Ambani: Ziehe 1 Karte.');
        },
      };

      const oligarchNames = ['Elon Musk', 'Bill Gates', 'George Soros', 'Warren Buffett', 'Mukesh Ambani', 'Jeff Bezos', 'Alisher Usmanov', 'Gautam Adani', 'Jack Ma', 'Zhang Yiming', 'Roman Abramovich'];
      if (oligarchNames.includes(specCard.name)) {
        const { newHands, newDecks } = drawCards(player, 1, newState, logFunc);
        newState = { ...newState, hands: newHands, decks: newDecks };
        logFunc(`${specCard.name}: Ziehe 1 Karte (Oligarch-Effekt).`);
      } else {
        const handler = specialHandlers[specCard.name];
        if (handler) {
          handler();
        }
      }
    }

    if (card.kind === 'spec' && (card as SpecialCard).type === 'Dauerhaft-Initiative') {
      const specCard = card as SpecialCard;
      if (specCard.name === 'Algorithmischer Diskurs') {
        logFunc('Algorithmischer Diskurs aktiv: Medien-Auren werden beim Rundenstart angewendet.');
      } else if (specCard.name === 'Alternative Fakten') {
        logFunc('Alternative Fakten aktiv: Gegner-Interventionen sind geschwächt.');
      }
    }

    if (card.kind === 'pol') {
      const polCard = card as PoliticianCard;
      logFunc(`${polCard.name} platziert (Basis: ${polCard.influence} Einfluss).`);
    }

    return newState;
  }, []);

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

  const getActiveAbilities = useCallback((player: Player) => {
    return ActiveAbilitiesManager.getAvailableAbilities(player, gameState);
  }, [gameState]);

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
  }, [log]);

  const hasDiplomatCard = (player: Player, state: GameState): boolean => {
    const gov = state.board[player].aussen;
    const names = ['Joschka Fischer', 'Sergey Lavrov', 'Ursula von der Leyen', 'Jens Stoltenberg', 'Horst Köhler', 'Walter Scheel', 'Hans Dietrich Genscher', 'Colin Powell', 'Condoleezza Rice', 'Christine Lagarde'];
    return gov.some(c => c.kind === 'pol' && names.includes(c.name) && !(c as PoliticianCard).deactivated);
  };

  const transferInfluence = useCallback((player: Player, fromCardUid: number, toCardUid: number, amount: number) => {
    setGameState(prev => {
      if (prev.current !== player) return prev;

      const flags = prev.effectFlags?.[player];
      if (!flags || flags.diplomatInfluenceTransferUsed || flags.influenceTransferBlocked) return prev;
      if (!hasDiplomatCard(player, prev)) return prev;

      const govCards = prev.board[player].aussen;
      const fromCard = govCards.find(c => c.uid === fromCardUid && c.kind === 'pol') as PoliticianCard;
      const toCard = govCards.find(c => c.uid === toCardUid && c.kind === 'pol') as PoliticianCard;

      if (!fromCard || !toCard || fromCard.influence < amount) return prev;

      adjustInfluence(fromCard, -amount, 'Diplomat-Transfer');
      adjustInfluence(toCard, amount, 'Diplomat-Transfer');

      const newFlags = { ...flags, diplomatInfluenceTransferUsed: true };
      const newEffectFlags = { ...prev.effectFlags, [player]: newFlags } as GameState['effectFlags'];

      log(`P${player} transferiert ${amount} Einfluss von ${fromCard.name} zu ${toCard.name} (Diplomat).`);

      return {
        ...prev,
        effectFlags: newEffectFlags
      };
    });
  }, [log]);

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
  }, [log]);

  const canUsePutinDoubleIntervention = useCallback((player: Player): boolean => {
    const board = gameState.board[player];
    const allCards = [...board.innen, ...board.aussen].filter(c => c.kind === 'pol') as PoliticianCard[];
    const putin = allCards.find(c => c.name === 'Vladimir Putin');

    if (!putin || putin.deactivated || putin._activeUsed) return false;

    const interventions = gameState.hands[player].filter(c => c.kind === 'spec');
    return interventions.length >= 2;
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
