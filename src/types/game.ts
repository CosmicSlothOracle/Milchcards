import type { UID } from './primitives';

export type Player = 1 | 2;

export type CardKind = 'pol' | 'spec';

export interface Card {
  id: number;
  key: string;
  name: string;
  kind: CardKind;
  baseId: number;
  uid: number;
  // optional card-specific fields
  deactivated?: boolean;  // runtime disabled status
  protectedOnce?: boolean;// runtime shield flag (consumed once)
}

export interface PoliticianCard extends Card {
  kind: 'pol';
  tag: string;
  T: number;
  BP: number;
  influence: number;
  effect?: string;
  protected: boolean;
  protectedUntil?: number | null;
  tempDebuffs: number;
  tempBuffs: number;
  _activeUsed: boolean;
  _pledgeDown?: { amount: number; round: number } | null;
  _hypedRoundFlag?: boolean;
}

export interface SpecialCard extends Card {
  kind: 'spec';
  type: string;
  impl: string;
  bp: number;
  tag?: string;
}

export interface BasePolitician {
  id: number;
  key: string;
  name: string;
  influence: number;
  tag?: string;
  T: number;
  BP?: number;
  effect?: string;
}

export interface BaseSpecial {
  id: number;
  key: string;
  name: string;
  type: string;
  speed?: string;
  bp: number;
  effect?: string;
  tier: number;
  impl: string;
  tag?: string;
  effectKey?: string;
}

// Row: government = aussen, public = innen, plus sofort lane for instant initiatives
export type BoardRow = {
  innen: Card[];   // PUBLIC
  aussen: Card[];  // GOVERNMENT
  sofort: Card[];  // INSTANT (Sofort-Initiativen, warten auf Aktivierung)
};

export type Board = {
  1: BoardRow;
  2: BoardRow;
};

export type PermanentSlots = {
  1: { government: Card | null; public: Card | null };
  2: { government: Card | null; public: Card | null };
};

export interface EffectFlags {
  // AP system — single source of truth
  initiativeDiscount: number;        // Discount for next initiative(s), consumes 1 per use
  initiativeRefund: number;          // Refund-pool for initiatives, consumes 1 per use
  govRefundAvailable: boolean;       // First government card per turn gets +1 AP refund (Greta/Movement)

  // Round-scoped Initiative "Cluster 3" auras (active while round lasts)
  initiativeInfluenceBonus: number;         // e.g., Jennifer (+1) + Fauci (+1)
  initiativeInfluencePenaltyForOpponent: number; // Noam gives opponent -1 (we store on owner, apply against enemy)
  initiativeOnPlayDraw1Ap1: boolean;        // Ai Weiwei

  // Legacy flags for compatibility
  nextGovPlus2?: boolean;
  diplomatInfluenceTransferUsed?: boolean;
  influenceTransferBlocked?: boolean;
  scienceInitiativeBonus?: boolean;
  healthInitiativeBonus?: boolean;
  cultureInitiativeBonus?: boolean;
  militaryInitiativePenalty?: boolean;
  nextInitiativeMinus1?: boolean;
  freeInitiativeAvailable?: boolean;
  platformRefundAvailable?: boolean;
  platformRefundUsed?: boolean;
  ngoInitiativeDiscount?: number;
  platformInitiativeDiscount?: number;
  nextGovernmentCardBonus?: number;
  publicEffectDoubled?: boolean;
  cannotPlayInitiatives?: boolean;
  nextCardProtected?: boolean;
  platformAfterInitiativeBonus?: boolean;
  interventionEffectReduced?: boolean;
  nextInitiativeRefund?: number;
  nextInitiativeDiscounted?: boolean;
  opportunistActive?: boolean;
  markZuckerbergUsed: boolean;
}

export function createDefaultEffectFlags(): EffectFlags {
  return {
    initiativeDiscount: 0,
    initiativeRefund: 0,
    govRefundAvailable: false,

    initiativeInfluenceBonus: 0,
    initiativeInfluencePenaltyForOpponent: 0,
    initiativeOnPlayDraw1Ap1: false,

    markZuckerbergUsed: false,
  };
}

export interface GameState {
  round: number;
  current: Player;
  passed: { 1: boolean; 2: boolean };
  actionPoints: { 1: number; 2: number };
  actionsUsed: { 1: number; 2: number };
  decks: { 1: Card[]; 2: Card[] };
  hands: { 1: Card[]; 2: Card[] };
  traps: { 1: Card[]; 2: Card[] };
  board: Board;
  permanentSlots: PermanentSlots;
  discard: Card[];
  log: string[];
  activeRefresh: { 1: number; 2: number };
  roundsWon: { 1: number; 2: number };
  aiEnabled?: { 1: boolean; 2: boolean };
  gameWinner?: 1 | 2 | null;
  blocked?: { initiatives?: boolean };
  shields?: Set<UID>;
  _queue?: EffectEvent[];
  _effectQueue?: EffectEvent[];
  effectFlags: {
    1: EffectFlags;
    2: EffectFlags;
  };
  effectQueue?: EffectQueue;
  activeAbilities?: {
    1: ActiveAbility[];
    2: ActiveAbility[];
  };
  pendingAbilitySelect?: AbilitySelect;
  isEndingTurn?: boolean;
}

export interface BuilderState {
  open: boolean;
  deck: BuilderEntry[];
}

export interface BuilderEntry {
  kind: 'pol' | 'spec';
  baseId: number;
  count: number;
}

export type BoardSide = {
  innen: Card[];
  aussen: Card[];
  sofort: Card[];
};

export interface UIZone {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ClickZone {
  x: number;
  y: number;
  w: number;
  h: number;
  data: any;
}

export interface FXState {
  p1Activation: ActivationFX | null;
  p2Activation: ActivationFX | null;
}

export interface ActivationFX {
  card: Card;
  until: number;
}

export interface SelectedState {
  handIndex: number | null;
}

export interface AbilitySelect {
  type: 'hardliner' | 'putin_double_intervention' | 'oligarch_influence' | 'diplomat_transfer';
  actorCard: PoliticianCard;
  actorPlayer: 1 | 2;
  lane?: 'innen' | 'aussen';
  targetCard?: PoliticianCard;
  amount?: number;
  advanceAfterResolve?: boolean;
  consumeRefresh?: boolean;
}

export interface ActiveAbility {
  id: string;
  name: string;
  description: string;
  cardName: string;
  cooldown: number;
  usedThisRound: boolean;
  type: AbilitySelect['type'];
  cost?: number;
  requirements?: string[];
}

export interface EffectQueueItem {
  id: string;
  type: 'intervention' | 'sofort' | 'passiv' | 'aktiv';
  priority: number;
  source: Card;
  target?: Card;
  effect: () => void;
  description: string;
  player: Player;
  round: number;
}

export interface EffectQueue {
  items: EffectQueueItem[];
  processing: boolean;
  nextId: number;
}

export type Lane = 'innen' | 'aussen';

// Effect Event model (used by utils/queue.ts)
export type EffectEvent =
  | { type: 'LOG'; msg: string }
  | { type: 'ADD_AP'; player: Player; amount: number }                           // clamps [0..4]
  | { type: 'DRAW_CARDS'; player: Player; amount: number }
  | { type: 'DISCARD_RANDOM_FROM_HAND'; player: Player; amount: number }
  | { type: 'ADJUST_INFLUENCE'; player: Player; amount: number; reason?: string } // alias → BUFF_STRONGEST_GOV
  | { type: 'BUFF_STRONGEST_GOV'; player: Player; amount: number }               // +/- tempBuffs
  | { type: 'SET_DISCOUNT'; player: Player; amount: number }                     // initiativeDiscount += clamp
  | { type: 'REFUND_NEXT_INITIATIVE'; player: Player; amount: number }           // initiativeRefund += clamp
  | { type: 'GRANT_SHIELD'; targetUid: number }                                  // shields.add(uid)
  | { type: 'DEACTIVATE_CARD'; targetUid: number }                                // card.deactivated = true
  | { type: 'DEACTIVATE_RANDOM_HAND'; player: Player; amount: number }           // random hand cards → discard
  | { type: 'INITIATIVE_ACTIVATED'; player: Player }                             // löst Cluster-3 + Plattform aus
  | { type: 'ADJUST_STRONGEST_GOV'; player: Player; amount: number };

export function createEmptyBoardRow(): BoardRow {
  return { innen: [], aussen: [], sofort: [] };
}