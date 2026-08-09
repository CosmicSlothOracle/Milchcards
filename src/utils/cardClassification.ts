// Robust card classification for live card instances (from gameData.ts).
// The trap/effect system needs to answer "what kind of card is this?" for
// cards built via makePolInstance/makeSpecInstance, whose `key` values do NOT
// match the ids of the newer src/data/cards.ts catalog. Classification is
// therefore based on kind/type plus the subcategory metadata in cardDetails.

import type { Card, SpecialCard, PoliticianCard } from '../types/game';
import { getCardDetails } from '../data/cardDetails';

export function isGovernmentCard(card: Card | null | undefined): boolean {
  return !!card && card.kind === 'pol';
}

export function isPublicCard(card: Card | null | undefined): boolean {
  if (!card || card.kind !== 'spec') return false;
  const t = String((card as SpecialCard).type || '').toLowerCase();
  return t === 'öffentlichkeitskarte' || t === 'oeffentlichkeitskarte' || t === 'public' || t === 'öffentlichkeit';
}

export function isInstantInitiativeCard(card: Card | null | undefined): boolean {
  if (!card || card.kind !== 'spec') return false;
  return /sofort/i.test(String((card as SpecialCard).type || ''));
}

export function isOngoingInitiativeCard(card: Card | null | undefined): boolean {
  if (!card || card.kind !== 'spec') return false;
  return /dauerhaft/i.test(String((card as SpecialCard).type || ''));
}

export function isInitiativeCard(card: Card | null | undefined): boolean {
  if (!card || card.kind !== 'spec') return false;
  return /initiative/i.test(String((card as SpecialCard).type || ''));
}

export function isInterventionCard(card: Card | null | undefined): boolean {
  if (!card || card.kind !== 'spec') return false;
  return /intervention/i.test(String((card as SpecialCard).type || ''));
}

/** A "big" initiative costs 3+ build points (used by Interne Fraktionskämpfe). */
export function isBigInitiativeCard(card: Card | null | undefined): boolean {
  if (!isInitiativeCard(card)) return false;
  return ((card as SpecialCard).bp || 0) >= 3;
}

export function getSubcategories(cardName: string): string[] {
  const details = getCardDetails(cardName);
  const subs = (details as any)?.subcategories;
  return Array.isArray(subs) ? subs : [];
}

function hasSubcat(card: Card, ...names: string[]): boolean {
  const subs = getSubcategories(card.name);
  return names.some(n => subs.includes(n));
}

/** Media-like public cards: Medien or Plattform subcategory (or legacy tags). */
export function isMediaLikeCard(card: Card | null | undefined): boolean {
  if (!card) return false;
  const tag = (card as any).tag;
  if (tag === 'Media' || tag === 'Medien' || tag === 'Plattform' || tag === 'Platform') return true;
  return hasSubcat(card, 'Medien', 'Plattform');
}

export function isPlatformCard(card: Card | null | undefined): boolean {
  if (!card) return false;
  const tag = (card as any).tag;
  if (tag === 'Plattform' || tag === 'Platform') return true;
  return hasSubcat(card, 'Plattform');
}

export function isOligarchCard(card: Card | null | undefined): boolean {
  if (!card) return false;
  if ((card as any).tag === 'Oligarch') return true;
  return hasSubcat(card, 'Oligarch');
}

export function isNgoCard(card: Card | null | undefined): boolean {
  if (!card) return false;
  if ((card as any).tag === 'NGO') return true;
  return hasSubcat(card, 'NGO/Think-Tank');
}

/** Movements / activists (Greta, Malala, Ai Weiwei, Navalny, ...). */
export function isMovementCard(card: Card | null | undefined): boolean {
  if (!card) return false;
  const tag = (card as any).tag;
  if (tag === 'Activist' || tag === 'Aktivist' || tag === 'Movement' || tag === 'Bewegung') return true;
  return hasSubcat(card, 'Aktivist', 'Opposition');
}

/** Diplomats are government cards identified by name (no tag data on Pols). */
const DIPLOMAT_NAMES = new Set([
  'Joschka Fischer', 'Sergey Lavrov', 'Ursula von der Leyen', 'Jens Stoltenberg',
  'Horst Köhler', 'Walter Scheel', 'Hans Dietrich Genscher', 'Colin Powell',
  'Condoleezza Rice', 'Christine Lagarde',
]);

export function isDiplomatCard(card: Card | null | undefined): boolean {
  if (!card || card.kind !== 'pol') return false;
  return DIPLOMAT_NAMES.has(card.name);
}

/** US government politicians (Edward Snowden's secondary effect). */
const US_GOV_NAMES = new Set([
  'Donald Trump', 'Kamala Harris', 'Dick Cheney', 'Karl Rove', 'John Ashcroft',
  'Tom Ridge', 'Henry Paulson', 'John Snow', 'Alberto Gonzales', 'Colin Powell',
  'Condoleezza Rice', 'Donald Rumsfeld', 'Robert Gates',
]);

export function isUsGovernmentCard(card: Card | null | undefined): boolean {
  if (!card || card.kind !== 'pol') return false;
  return US_GOV_NAMES.has(card.name);
}

/** AI-related initiatives (Sam Altman's trigger). */
const AI_INITIATIVE_NAMES = new Set([
  'AI Narrative Control', 'Algorithmischer Diskurs', 'Konzernfreundlicher Algorithmus',
]);

export function isAiRelatedInitiativeName(name: string | undefined): boolean {
  return !!name && AI_INITIATIVE_NAMES.has(name);
}

/** True when the card instance is active (on board, not deactivated). */
export function isActive(card: Card | null | undefined): boolean {
  return !!card && !(card as any).deactivated;
}

/** Find an active public-row card by name. */
export function findActivePublicCard(cards: Card[], name: string): Card | undefined {
  return cards.find(c => c.kind === 'spec' && c.name === name && !(c as any).deactivated);
}

/**
 * Consume one layer of protection from a card, if present.
 * Returns true when the card was protected (effect should be skipped).
 * Protection sources: Systemrelevant, Alisher Usmanov, Intelligence Liaison.
 */
export function consumeProtection(card: Card | null | undefined, shields?: Set<number>): boolean {
  if (!card) return false;
  const anyCard = card as any;
  if (anyCard.protectedOnce) {
    anyCard.protectedOnce = false;
    return true;
  }
  if (anyCard.protected) {
    anyCard.protected = false;
    return true;
  }
  if (shields && anyCard.uid != null && shields.has(anyCard.uid)) {
    shields.delete(anyCard.uid);
    return true;
  }
  return false;
}

/** Strongest active own government card (highest effective influence). */
export function strongestActiveGov(cards: Card[]): PoliticianCard | null {
  const alive = cards.filter(c => c.kind === 'pol' && !(c as any).deactivated) as PoliticianCard[];
  if (!alive.length) return null;
  return alive.slice().sort((a, b) => {
    const ai = a.influence + (a.tempBuffs || 0) - (a.tempDebuffs || 0);
    const bi = b.influence + (b.tempBuffs || 0) - (b.tempDebuffs || 0);
    if (bi !== ai) return bi - ai;
    return b.uid - a.uid;
  })[0];
}
