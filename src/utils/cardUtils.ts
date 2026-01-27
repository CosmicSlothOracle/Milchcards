import { Card, PoliticianCard, SpecialCard, BasePolitician, BaseSpecial, GameState, Lane, Player } from '../types/game';
import { getCardDetails } from '../data/cardDetails';

// Card instance creation
let NEXT_UID = 1;

export function makePolInstance(base: BasePolitician): PoliticianCard {
  return {
    id: base.id,
    key: base.key,
    name: base.name,
    kind: 'pol',
    baseId: base.id,
    tag: base.tag,
    T: base.T,
    BP: base.BP ?? 0,
    influence: base.influence, // 🔥 VEREINFACHT: Direkt von base.influence, kein M mehr!
    ...(base.effect && { effect: base.effect }), // 🔥 EFFEKT ÜBERTRAGUNG FÜR JOSCHKA FISCHER NGO-BOOST!
    protected: false,
    protectedUntil: null,
    deactivated: false,
    tempDebuffs: 0,
    tempBuffs: 0,
    uid: NEXT_UID++,
    _activeUsed: false,
  } as PoliticianCard;
}

export function makeSpecInstance(base: BaseSpecial): SpecialCard {
  const card = {
    id: base.id,
    key: base.key,
    name: base.name,
    kind: 'spec',
    baseId: base.id,
    // Normalize type strings so downstream logic (German/English mixes) recognizes Public cards
    type: ((): string => {
      if (!base.type) return '';
      const t = String(base.type).toLowerCase();
      // Common mappings
      if (t === 'public' || t === 'öffentlichkeitskarte' || t === 'oeffentlichkeitskarte' || t === 'öffentlichkeit') return 'Öffentlichkeitskarte';
      if (/sofort/i.test(base.type) || /initiative/i.test(base.type) || /sofort-?initiative/i.test(base.type)) return base.type; // keep initiative labels as-is
      return base.type;
    })(),
    impl: base.impl,
    bp: base.bp,
    tier: base.tier,
    ...(base.effectKey && { effectKey: base.effectKey }),
    ...(base.tag && { tag: base.tag }), // 🔥 TAG ÜBERTRAGUNG FÜR NGO/PLATTFORM DETECTION!
    uid: NEXT_UID++,
    deactivated: false,
  } as SpecialCard;

  // Debug logging for Bestechungsskandal
  if (base.name === 'Bestechungsskandal 2.0') {
    console.log('🔥 CREATING BESTECHUNGSSKANDAL CARD:', card);
    console.log('🔥 Base effectKey:', base.effectKey);
    console.log('🔥 Card effectKey:', (card as any).effectKey);
  }

  return card;
}

// Card placement logic
export function isOfficeTag(tag: string): boolean {
  return tag === 'Staatsoberhaupt' || tag === 'Regierungschef' || tag === 'Diplomat';
}

export function getAllowedLaneForCard(card: Card): Lane | null {
  if (card.kind === 'pol') {
    return isOfficeTag((card as PoliticianCard).tag) ? 'aussen' : 'innen';
  } else if (card.kind === 'spec') {
    const specCard = card as SpecialCard;
    if (specCard.type === 'Öffentlichkeitskarte') {
      return 'innen'; // Public cards go to public row
    }
    // Other special cards (initiatives, interventions) don't have lane restrictions
    return null;
  }
  return null;
}

export function isLaneAllowedForCard(card: Card, lane: Lane): boolean {
  if (!card || card.kind !== 'pol') return true;
  return getAllowedLaneForCard(card) === lane;
}

export function laneDisplayName(lane: Lane): string {
  return lane === 'aussen' ? 'Regierungsreihe' : 'Öffentlichkeitsreihe';
}

// Card state manipulation
export function adjustInfluence(card: PoliticianCard, amount: number, source: string): void {
  const oldInfluence = card.influence;
  card.influence = Math.max(0, card.influence + amount);

  console.log(`[${source}] ${card.name}: ${oldInfluence} → ${card.influence} Einfluss`);
}

export function findCardLocation(card: Card, state: GameState): { player: Player; lane: Lane } | null {
  for (const player of [1, 2] as Player[]) {
    for (const lane of ['innen', 'aussen'] as Lane[]) {
      if (state.board[player][lane].some(c => c.uid === card.uid)) {
        return { player, lane };
      }
    }
  }
  return null;
}

// Action point calculation
export function getCardActionPointCost(card: Card, state: GameState, player: Player): number {
  const details = getCardDetails(card.name);
  if (details?.apCost) return details.apCost;

  if (card.kind === 'pol') {
    const tier = (card as PoliticianCard).T;
    return tier >= 3 ? 2 : 1;
  }

  if (card.kind === 'spec') {
    const spec = card as SpecialCard;
    const tier = spec.tier ?? (details?.tier ? parseInt(details.tier.replace(/\D/g, ''), 10) : 0);
    if (tier >= 3 && (spec.type.includes('Initiative') || spec.type.includes('Intervention'))) {
      return 2;
    }
  }

  return 1;
}

// Card sorting and filtering
export function sortHandCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    // Politicians first, then specials
    if (a.kind !== b.kind) {
      return a.kind === 'pol' ? -1 : 1;
    }

    // Within same kind, sort by name
    return a.name.localeCompare(b.name);
  });
}

// Card validation
export function isValidCardPlacement(
  card: Card,
  player: Player,
  lane: Lane,
  state: GameState
): boolean {
  // Check lane capacity
  if (state.board[player][lane].length >= 5) return false;

  // Check lane restrictions
  if (!isLaneAllowedForCard(card, lane)) return false;

  // Check for duplicate placement
  const alreadyOnBoard = [...state.board[player].innen, ...state.board[player].aussen]
    .some(c => c.uid === card.uid);
  if (alreadyOnBoard) return false;

  return true;
}

// Card type checking utilities
export function isPoliticianCard(card: Card): card is PoliticianCard {
  return card.kind === 'pol';
}

export function isSpecialCard(card: Card): card is SpecialCard {
  return card.kind === 'spec';
}

export function isPublicCard(card: Card): boolean {
  return card.kind === 'spec' && (card as SpecialCard).type === 'Öffentlichkeitskarte';
}

export function isGovernmentCard(card: Card): boolean {
  return card.kind === 'pol';
}

export function isInitiativeCard(card: Card): boolean {
  if (card.kind !== 'spec') return false;
  const spec = card as SpecialCard;
  return spec.type === 'Sofort-Initiative' || spec.type === 'Dauerhaft-Initiative';
}

export function isInterventionCard(card: Card): boolean {
  return card.kind === 'spec' && (card as SpecialCard).type === 'Intervention';
}

// Card power calculation
export function getCardPower(card: Card): number {
  if (card.kind === 'pol') {
    return (card as PoliticianCard).influence; // 🔥 VEREINFACHT: M → influence
  } else if (card.kind === 'spec') {
    return (card as SpecialCard).bp;
  }
  return 0;
}

export function getCardInfluence(card: Card): number {
  if (card.kind === 'pol') {
    return (card as PoliticianCard).influence;
  }
  return 0;
}

// Card effect utilities
export function canCardActivateAbility(card: PoliticianCard): boolean {
  return !card.deactivated && !card._activeUsed && !card.protected;
}

export function hasCardTag(card: Card, tag: string): boolean {
  return card.kind === 'pol' && (card as PoliticianCard).tag === tag;
}

export function isCardProtected(card: PoliticianCard, currentRound: number): boolean {
  if (!card.protected) return false;
  if (card.protectedUntil === null) return true;
  return (card.protectedUntil ?? 0) >= currentRound;
}

// Deck composition analysis
export function analyzeDeckComposition(cards: Card[]): {
  politicians: number;
  publicCards: number;
  initiatives: number;
  interventions: number;
  totalPower: number;
} {
  const politicians = cards.filter(c => c.kind === 'pol').length;
  const publicCards = cards.filter(c => isPublicCard(c)).length;
  const initiatives = cards.filter(c => isInitiativeCard(c)).length;
  const interventions = cards.filter(c => isInterventionCard(c)).length;
  const totalPower = cards.reduce((sum, card) => sum + getCardPower(card), 0);

  return {
    politicians,
    publicCards,
    initiatives,
    interventions,
    totalPower
  };
}
