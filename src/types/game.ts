import type { UID } from './primitives';
import type { EffectEvent } from './effects';

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
  // New effectKey field for registry
  effectKey?: string;     // Registry key for card effects
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
  // === Corruption system ===
  corruption?: number;         // current corruption (0..6)
  corruptionStart?: number;    // lore floor — corruption never drops below this (except clean-sweep entry bonus)
  corruptionAbilityUsed?: number; // active-ability uses this round (board life = one round)
  purgeMarked?: boolean;       // Snowden mark: purge target +1 this round
  _corruptionTainted?: boolean;   // buffed by a corruption-tagged effect this round (purge target +1)
  _corruptionBuffTaxed?: boolean; // win-more tax (+3 buffs in a round → +1 corruption) applied once
  _ignoreGreedyPass?: boolean;    // Trump "Alternative Wahrheit": ignore greedy-pass purge modifier
  _corruptionShielded?: boolean;  // set by Lavrov "Njet": next enemy corruption gain on this board is cancelled
}

export interface SpecialCard extends Card {
  kind: 'spec';
  type: string;
  impl: string;
  bp: number;
  tag?: string;
  tier?: number;
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
  effectKey?: string;
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
  1: { government: Card | null; public: Card | null; initiativePermanent: Card | null };
  2: { government: Card | null; public: Card | null; initiativePermanent: Card | null };
};

export interface EffectFlags {
  // Trap system flags
  trapTriggered?: boolean;           // Set when a trap was triggered this turn
  trapProtection?: boolean;          // Trap protection active for next card

  // Mark Zuckerberg special flag
  markZuckerbergUsed: boolean;       // Tracks if Mark Zuckerberg's once-per-turn effect was used

  // New initiative activation flags
  zuckOnceAp?: boolean;              // Mark Zuckerberg once-per-turn AP bonus
  zuckSpent?: boolean;               // Tracks if Mark Zuckerberg AP was spent this turn
  aiWeiweiOnActivate?: boolean;      // Ai Weiwei activation bonus flag
  elonOnceAp?: boolean;              // Elon Musk once-per-turn AP bonus on initiative activation
  elonOnActivate?: boolean;          // Elon Musk draw + AP on initiative activation

  // Aura flags for initiative bonuses
  auraScience?: number;              // Jennifer Doudna science bonus
  auraHealth?: number;               // Anthony Fauci health bonus
  auraMilitaryPenalty?: number;      // Noam Chomsky military penalty

  // Legacy aura flags (for backward compatibility)
  scienceInitiativeBonus?: boolean;  // Jennifer Doudna: +1 influence on instant initiatives
  healthInitiativeBonus?: boolean;   // Anthony Fauci: +1 influence on instant initiatives
  cultureInitiativeBonus?: boolean;  // Ai Weiwei: +1 card +1 AP on instant initiatives
  militaryInitiativePenalty?: boolean; // Noam Chomsky: -1 influence on opponent instant initiatives

  // NEW advanced initiative-related flags
  initiativesLocked?: boolean;     // Opponent cannot play initiatives until end of turn
  doublePublicAura?: boolean;      // Next Public aura effect is doubled

  // AP bonus system for initiatives
  apBonusInitiativeNext?: number;     // +AP for NEXT initiative this turn (consumed on trigger)
  apBonusInitiativeOnce?: number;     // +AP ONCE per turn on first initiative (consumed on trigger)

  // Opportunist system
  opportunistActive?: boolean;       // Opportunist mirror effect active

  // Per-turn effect tracking (reset in startOfTurn unless noted)
  gretaFirstGovApUsed?: boolean;     // legacy (Greta now steals on opponent first gov)
  elonInitiativeApUsed?: boolean;    // legacy (Elon now steals on opponent heavy gov/oligarch)
  aiWeiweiInitiativeUsed?: boolean;  // legacy (Ai Weiwei now steals on opponent initiative)
  zivilgesellschaftApUsed?: boolean; // Zivilgesellschaft: NGO grants +1 AP on next initiative (once per turn)
  publicApStealUsed?: Record<string, boolean>; // reactive public steal-AP once per owner turn cycle
  govPlayedThisTurn?: boolean;       // actor played a government card this turn
  cannotPlayMoreGovernment?: boolean; // Parlament geschlossen: no further government until next turn
  drawPenaltyNextDraw?: boolean;     // Mukesh Ambani: player draws one card less at next end-of-turn draw

  // Legacy AP system flags (for backward compatibility)
  nextGovPlus2?: boolean;             // Next government card gets +2 influence
  diplomatInfluenceTransferUsed?: boolean; // Diplomat influence transfer used this turn
  influenceTransferBlocked?: boolean; // Influence transfer is blocked
  // REMOVED: Alle AP-Discount/Free-Flags - alle Karten kosten immer 1 AP

  // === Corruption system flags ===
  hushMoneySpent?: number;            // AP sacrificed at pass time (purge target −1 each, max 2)
  passHandSize?: number;              // hand size at pass time (greedy pass +1 / forced pass −1)
  purgeTargetDelta?: number;          // Verzögerungsverfahren: all own purge targets −1 this round
  purgeRollBonus?: number;            // Trudeau "Sunny Ways" etc.: bonus on own purge rolls this round
  lavrovNjetAvailable?: boolean;      // Lavrov: cancel next enemy corruption gain on own board
  cheneyInterventionCorruption?: boolean; // Cheney: own interventions add +1 corruption on trigger this round
  corruptionReductionBlocked?: boolean;   // Oppositionsblockade: cannot reduce corruption until next turn
  nextGovCorruptionMinus1?: boolean;  // Think-tank vetting: next own gov enters with −1 corruption
  harariCorruptionDrawUsed?: boolean; // Harari draw on gov reaching corruption 5+ (1×/Runde)
  sorosCleanseUsed?: boolean;         // Soros foundation cleanse (1×/Zug)
  oligarchCorruptionRound?: number;   // round in which the oligarch-pair corruption gain already fired
}

export function createDefaultEffectFlags(): EffectFlags {
  return {
    // Trap system
    trapTriggered: false,
    trapProtection: false,

    // Special flags
    markZuckerbergUsed: false,
    opportunistActive: false,

    // New initiative activation flags
    zuckOnceAp: false,
    zuckSpent: false,
    aiWeiweiOnActivate: false,
    elonOnceAp: false,
    elonOnActivate: false,

    // Aura flags for initiative bonuses
    auraScience: 0,
    auraHealth: 0,
    auraMilitaryPenalty: 0,
    initiativesLocked: false,
    doublePublicAura: false,
    apBonusInitiativeNext: 0,
    apBonusInitiativeOnce: 0,
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
  _effectQueue?: EffectEvent[];
  _playedGovernmentThisTurn?: { 1: boolean; 2: boolean };
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
  /** Interactive W6 purge audit between double-pass and scoring */
  pendingPurge?: PendingPurge;
  isEndingTurn?: boolean;
}

export interface PurgeProbeEntry {
  player: Player;
  uid: number;
}

export interface PendingPurge {
  queue: PurgeProbeEntry[];
  index: number;
  awaitingRoll: boolean;
  removed: { player: Player; card: PoliticianCard; roll: number | null; target: number }[];
  survived: { player: Player; card: PoliticianCard; roll: number | null; target: number }[];
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
  type: 'hardliner' | 'putin_double_intervention' | 'oligarch_influence' | 'diplomat_transfer' | 'corruption_steal';
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
// EffectEvent moved to types/effects.ts


export function createEmptyBoardRow(): BoardRow {
  return { innen: [], aussen: [], sofort: [] };
}
