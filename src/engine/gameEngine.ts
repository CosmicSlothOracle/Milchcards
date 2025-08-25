import { GameState, Player, Card } from '../types/game';
import { triggerCardEffects } from '../effects/cards';
import { resolveQueue } from '../utils/queue';

// Pure game engine - no React dependencies
export class GameEngine {
  private state: GameState;

  constructor(initialState: GameState) {
    this.state = { ...initialState };
  }

  getState(): GameState {
    return { ...this.state };
  }

  // Core action: Play a card
  playCard(player: Player, card: Card, targetLane?: 'innen' | 'aussen' | 'sofort'): boolean {
    // Validate AP cost
    if (this.state.actionPoints[player] < 1) {
      console.warn(`Player ${player} has insufficient AP: ${this.state.actionPoints[player]}`);
      return false;
    }

    // Validate card is in hand
    const handIndex = this.state.hands[player].findIndex(c => c.uid === card.uid);
    if (handIndex === -1) {
      console.warn(`Card ${card.name} not found in player ${player}'s hand`);
      return false;
    }

    // Remove card from hand
    const [playedCard] = this.state.hands[player].splice(handIndex, 1);

    // Determine target lane if not specified
    const lane = targetLane || this.determineCardLane(playedCard);

    // Add card to board
    this.state.board[player][lane].push(playedCard);

    // Consume AP
    this.state.actionPoints[player] = Math.max(0, this.state.actionPoints[player] - 1);

    // Trigger card effects
    triggerCardEffects(this.state, player, playedCard);

    // Resolve effect queue
    if (this.state._effectQueue && this.state._effectQueue.length > 0) {
      const events = [...this.state._effectQueue];
      this.state._effectQueue = [];
      resolveQueue(this.state, events);
    }

    console.log(`Card played: ${playedCard.name} by player ${player} in ${lane}`);
    return true;
  }

  // Determine which lane a card should go to based on its type
  private determineCardLane(card: Card): 'innen' | 'aussen' | 'sofort' {
    switch (card.kind) {
      case 'spec':
        // Check if it's a Sofort-Initiative
        const specialCard = card as any;
        if (specialCard.type && specialCard.type.toLowerCase().includes('sofort-initiative')) {
          return 'sofort';
        }
        return 'innen';
      case 'pol':
        return 'aussen';
      default:
        console.warn(`Unknown card kind: ${card.kind}, defaulting to 'innen'`);
        return 'innen';
    }
  }

  // Start turn - give player 2 AP
  startTurn(player: Player): void {
    this.state.actionPoints[player] = 2;
    console.log(`Turn started for player ${player}, AP set to 2`);
  }

  // Draw cards
  drawCards(player: Player, amount: number): void {
    for (let i = 0; i < amount; i++) {
      const topCard = this.state.decks[player].shift();
      if (topCard) {
        this.state.hands[player].push(topCard);
      } else {
        console.warn(`No cards left in deck for player ${player}`);
        break;
      }
    }
  }

  // Get current AP for player
  getActionPoints(player: Player): number {
    return this.state.actionPoints[player] || 0;
  }

  // Check if player can play a card
  canPlayCard(player: Player): boolean {
    return this.getActionPoints(player) >= 1;
  }

  // Get player's hand
  getHand(player: Player): Card[] {
    return [...this.state.hands[player]];
  }

  // Get player's board state
  getBoard(player: Player) {
    return {
      innen: [...this.state.board[player].innen],
      aussen: [...this.state.board[player].aussen],
      sofort: [...this.state.board[player].sofort]
    };
  }
}
