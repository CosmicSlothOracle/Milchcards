import { PublicTag, GovernmentTag, CARD_TAGS } from '../constants/tags';

export interface CardTags {
  public?: PublicTag[];
  government?: GovernmentTag[];
}

/**
 * Central tag registry - single source of truth for card tags
 * Performance-optimized: O(1) lookup by card name
 */
export const CARD_TAG_REGISTRY: Record<string, CardTags> = {
  // Public cards - Oligarch/Platform/NGO/Movement/Intelligence/Media
  'Elon Musk': {
    public: [CARD_TAGS.PUBLIC.OLIGARCH, CARD_TAGS.PUBLIC.PLATFORM]
  },
  'Bill Gates': {
    public: [CARD_TAGS.PUBLIC.OLIGARCH, CARD_TAGS.PUBLIC.NGO]
  },
  'George Soros': {
    public: [CARD_TAGS.PUBLIC.OLIGARCH, CARD_TAGS.PUBLIC.NGO]
  },
  'Mark Zuckerberg': {
    public: [CARD_TAGS.PUBLIC.PLATFORM]
  },
  'Greta Thunberg': {
    public: [CARD_TAGS.PUBLIC.MOVEMENT]
  },
  'Malala Yousafzai': {
    public: [CARD_TAGS.PUBLIC.MOVEMENT]
  },
  'Ai Weiwei': {
    public: [CARD_TAGS.PUBLIC.MOVEMENT]
  },
  'Alexei Navalny': {
    public: [CARD_TAGS.PUBLIC.MOVEMENT]
  },
  'Edward Snowden': {
    public: [CARD_TAGS.PUBLIC.INTELLIGENCE]
  },
  'Julian Assange': {
    public: [CARD_TAGS.PUBLIC.INTELLIGENCE]
  },
  'Oprah Winfrey': {
    public: [CARD_TAGS.PUBLIC.MEDIA]
  },

  // Government cards - ENTFERNT (nur Einfluss, keine Tags)
};

// Efficient lookup functions
export function getCardTags(cardName?: string): CardTags {
  if (!cardName) return {};
  return CARD_TAG_REGISTRY[cardName] ?? {};
}

export function getPublicTags(cardName?: string): PublicTag[] {
  return getCardTags(cardName).public ?? [];
}

export function getGovernmentTags(cardName?: string): GovernmentTag[] {
  return getCardTags(cardName).government ?? [];
}

// Specific tag checks (for performance-critical code)
export function hasPublicTag(cardName: string, tag: PublicTag): boolean {
  return getPublicTags(cardName).includes(tag);
}

export function hasGovernmentTag(cardName: string, tag: GovernmentTag): boolean {
  return getGovernmentTags(cardName).includes(tag);
}
