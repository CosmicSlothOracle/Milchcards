import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { BuilderEntry, BasePolitician, BaseSpecial } from '../types/game';
import { Pols, Specials } from '../data/gameData';
import { currentBuilderBudget, currentBuilderCount, drawCardImage } from '../utils/gameUtils';
import { getCardDetails, formatWealth, formatSources } from '../data/cardDetails';
import { Icon } from '../ui/Icon';
import { withIcons } from '../ui/withIcons';
import { useAudio } from '../context/AudioContext';

interface DeckBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDeck: (deck: BuilderEntry[]) => void;
  onStartMatch: (p1Deck: BuilderEntry[], p2Deck: BuilderEntry[]) => void;
  onStartVsAI?: (p1Deck: BuilderEntry[]) => void;
  images?: never;
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({
  isOpen,
  onClose,
  onApplyDeck,
  onStartMatch,
  onStartVsAI
}) => {
  const [deck, setDeck] = useState<BuilderEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { playMusic, currentTrack } = useAudio();


  const [selectedCard, setSelectedCard] = useState<{ kind: 'pol' | 'spec'; base: BasePolitician | BaseSpecial } | null>(null);
  const [showSources, setShowSources] = useState(false);

  // List of disabled cards that are grayed out and not selectable
  const disabledCards = new Set([
    'Malala Yousafzai',
    'Jack Ma',
    'Roman Abramovich',
    'Tim Cook',
    'Mukesh Ambani',
    'Alisher Usmanov',
    'Yuval Noah Harari',
    'Digitaler Wahlkampf',
    'Partei-Offensive',
    'Whataboutism',
    'Influencer-Kampagne',
    'Systemrelevant',
    'Algorithmischer Diskurs',
    'Zivilgesellschaft',
    'Milchglas Transparenz',
    'Alternative Fakten',
    'Konzernfreundlicher Algorithmus',
    'Fake News-Kampagne',
    'Boykott-Kampagne',
    'Deepfake-Skandal',
    'Cyber-Attacke',
    'Grassroots-Widerstand',
    '"Unabhängige" Untersuchung',
    'Soft Power-Kollaps',
    'Cancel Culture'
  ]);

  // Optimized preset decks (8 balanced combinations, 50+ BP each)
  const PRESETS: { name: string; cards: string[] }[] = [
    {
      name: 'Tech Oligarchs',
      cards: [
        'Vladimir Putin', 'Xi Jinping', 'Donald Trump', 'Mohammed bin Salman', 'Recep Tayyip Erdoğan',
        'Elon Musk', 'Bill Gates', 'Mark Zuckerberg', 'Tim Cook', 'Sam Altman'
      ]
    },
    {
      name: 'Diplomatic Power',
      cards: [
        'Jens Stoltenberg', 'Olaf Scholz', 'Rishi Sunak', 'Kamala Harris', 'Helmut Schmidt',
        'Greta Thunberg', 'Warren Buffett', 'George Soros', 'Spin Doctor', 'Think-tank'
      ]
    },
    {
      name: 'Activist Movement',
      cards: [
        'Benjamin Netanyahu', 'Volodymyr Zelenskyy', 'Ursula von der Leyen', 'Narendra Modi', 'Luiz Inácio Lula da Silva',
        'Greta Thunberg', 'Malala Yousafzai', 'Ai Weiwei', 'Alexei Navalny', 'Jennifer Doudna'
      ]
    },
    {
      name: 'Initiative Rush (Optimized)',
      cards: [
        'Benjamin Netanyahu', 'Volodymyr Zelenskyy', 'Ursula von der Leyen', 'Hans Eichel', 'Rainer Offergeld',
        'Verzoegerungsverfahren', 'Symbolpolitik', 'Shadow Lobbying', 'Opportunist', 'Think-tank',
        'Greta Thunberg', 'George Soros', 'Malala Yousafzai', 'Ai Weiwei'
      ]
    },
    {
      name: 'Media Control',
      cards: [
        'Vladimir Putin', 'Xi Jinping', 'Donald Trump', 'Mohammed bin Salman', 'Recep Tayyip Erdoğan',
        'Oprah Winfrey', 'Mark Zuckerberg', 'Tim Cook', 'Influencer-Kampagne', 'Whataboutism'
      ]
    },
    {
      name: 'Economic Influence',
      cards: [
        'Jens Stoltenberg', 'Olaf Scholz', 'Rishi Sunak', 'Kamala Harris', 'Helmut Schmidt',
        'Warren Buffett', 'George Soros', 'Jeff Bezos', 'Mukesh Ambani', 'Roman Abramovich'
      ]
    },
    {
      name: 'Balanced Power',
      cards: [
        'Vladimir Putin', 'Xi Jinping', 'Donald Trump', 'Benjamin Netanyahu', 'Volodymyr Zelenskyy',
        'Elon Musk', 'Bill Gates', 'Mark Zuckerberg', 'Spin Doctor', 'Think-tank'
      ]
    },
    {
      name: 'Initiative Focus',
      cards: [
        'Jens Stoltenberg', 'Olaf Scholz', 'Rishi Sunak', 'Kamala Harris', 'Helmut Schmidt',
        'Spin Doctor', 'Think-tank', 'Symbolpolitik', 'Shadow Lobbying', 'Opportunist',
        'Influencer-Kampagne', 'Whataboutism', 'Greta Thunberg', 'George Soros'
      ]
    }
  ];

  const [presetIndex, setPresetIndex] = useState(0);

  // Ensure music continues playing when deckbuilder opens
  useEffect(() => {
    if (isOpen && !currentTrack) {
      // If no music is playing, start the theme music
      playMusic('/assets/music/theme.mp3', true);
    }
  }, [isOpen, currentTrack, playMusic]);

  const getEntryCost = useCallback((entry: BuilderEntry): number => {
    if (entry.kind === 'pol') {
      const pol = Pols.find(p => p.id === entry.baseId);
      if (!pol) return 0;
      const details = getCardDetails(pol.name);
      return details?.deckCost ?? pol.BP ?? 0;
    }
    const spec = Specials.find(s => s.id === entry.baseId);
    if (!spec) return 0;
    const details = getCardDetails(spec.name);
    return details?.deckCost ?? spec.bp ?? 0;
  }, []);

  const normalizePresetDeck = useCallback((entries: BuilderEntry[]) => {
    const MAX_CARDS = 10;
    const MIN_CARDS = 5;
    const MIN_GOV = 5;
    const MIN_BUDGET = 50;
    const MAX_BUDGET = 69;

    const availablePols = Pols.filter(p => !disabledCards.has(p.name));
    const availableSpecs = Specials.filter(s => !disabledCards.has(s.name));

    const deck: BuilderEntry[] = entries
      .filter(entry => entry.count > 0)
      .map(entry => ({ ...entry, count: 1 }));

    const isInDeck = (kind: 'pol' | 'spec', baseId: number) =>
      deck.some(entry => entry.kind === kind && entry.baseId === baseId);

    const deckCount = () => currentBuilderCount(deck);
    const govCount = () => deck.reduce((sum, entry) => sum + (entry.kind === 'pol' ? entry.count : 0), 0);
    const budget = () => currentBuilderBudget(deck);

    const addEntry = (entry: BuilderEntry) => {
      if (!isInDeck(entry.kind, entry.baseId)) {
        deck.push({ ...entry, count: 1 });
        return true;
      }
      return false;
    };

    const removeEntry = (predicate: (entry: BuilderEntry) => boolean) => {
      let bestIndex = -1;
      let bestCost = -1;
      deck.forEach((entry, idx) => {
        if (!predicate(entry)) return;
        const cost = getEntryCost(entry);
        if (cost > bestCost) {
          bestCost = cost;
          bestIndex = idx;
        }
      });
      if (bestIndex >= 0) {
        deck.splice(bestIndex, 1);
        return true;
      }
      return false;
    };

    const cheapestGov = [...availablePols]
      .sort((a, b) => (getCardDetails(a.name)?.deckCost ?? a.BP ?? 0) - (getCardDetails(b.name)?.deckCost ?? b.BP ?? 0));
    const expensiveCandidates = [
      ...availablePols.map(p => ({ kind: 'pol' as const, baseId: p.id, cost: getCardDetails(p.name)?.deckCost ?? p.BP ?? 0 })),
      ...availableSpecs.map(s => ({ kind: 'spec' as const, baseId: s.id, cost: getCardDetails(s.name)?.deckCost ?? s.bp ?? 0 })),
    ].sort((a, b) => b.cost - a.cost);

    let safety = 0;
    while (deckCount() > MAX_CARDS && safety < 40) {
      const canRemoveGov = govCount() > MIN_GOV;
      removeEntry(entry => entry.kind !== 'pol' || canRemoveGov);
      safety += 1;
    }

    while (govCount() < MIN_GOV && safety < 80) {
      if (deckCount() < MAX_CARDS) {
        const nextGov = cheapestGov.find(pol => !isInDeck('pol', pol.id));
        if (!nextGov) break;
        addEntry({ kind: 'pol', baseId: nextGov.id, count: 1 });
      } else {
        const removed = removeEntry(entry => entry.kind !== 'pol');
        if (!removed) break;
      }
      safety += 1;
    }

    while (deckCount() < MIN_CARDS && safety < 120) {
      const nextGov = cheapestGov.find(pol => !isInDeck('pol', pol.id));
      if (nextGov) {
        addEntry({ kind: 'pol', baseId: nextGov.id, count: 1 });
      } else if (availableSpecs.length > 0) {
        const nextSpec = availableSpecs.find(spec => !isInDeck('spec', spec.id));
        if (nextSpec) addEntry({ kind: 'spec', baseId: nextSpec.id, count: 1 });
      }
      safety += 1;
    }

    while (budget() < MIN_BUDGET && safety < 200) {
      if (deckCount() < MAX_CARDS) {
        const candidate = expensiveCandidates.find(c => !isInDeck(c.kind, c.baseId) && budget() + c.cost <= MAX_BUDGET);
        if (!candidate) break;
        addEntry({ kind: candidate.kind, baseId: candidate.baseId, count: 1 });
      } else {
        let swapped = false;
        const cheapestIndex = deck.reduce((best, entry, idx) => {
          const cost = getEntryCost(entry);
          if (best === -1 || cost < getEntryCost(deck[best])) return idx;
          return best;
        }, -1);
        if (cheapestIndex >= 0) {
          const cheapest = deck[cheapestIndex];
          const cheapestCost = getEntryCost(cheapest);
          const replacement = expensiveCandidates.find(candidate => {
            if (isInDeck(candidate.kind, candidate.baseId)) return false;
            const newBudget = budget() - cheapestCost + candidate.cost;
            if (newBudget > MAX_BUDGET) return false;
            if (cheapest.kind === 'pol' && candidate.kind !== 'pol' && govCount() <= MIN_GOV) return false;
            return newBudget > budget();
          });
          if (replacement) {
            deck.splice(cheapestIndex, 1, { kind: replacement.kind, baseId: replacement.baseId, count: 1 });
            swapped = true;
          }
        }
        if (!swapped) break;
      }
      safety += 1;
    }

    while (budget() > MAX_BUDGET && safety < 240) {
      if (deckCount() > MIN_CARDS) {
        const canRemoveGov = govCount() > MIN_GOV;
        const removed = removeEntry(entry => entry.kind !== 'pol' || canRemoveGov);
        if (!removed) break;
      } else {
        const expensiveIndex = deck.reduce((best, entry, idx) => {
          const cost = getEntryCost(entry);
          if (best === -1 || cost > getEntryCost(deck[best])) return idx;
          return best;
        }, -1);
        if (expensiveIndex >= 0) {
          const expensive = deck[expensiveIndex];
          const expensiveCost = getEntryCost(expensive);
          const cheaperReplacement = expensiveCandidates
            .slice()
            .reverse()
            .find(candidate => {
              if (isInDeck(candidate.kind, candidate.baseId)) return false;
              if (expensive.kind === 'pol' && candidate.kind !== 'pol' && govCount() <= MIN_GOV) return false;
              return budget() - expensiveCost + candidate.cost <= MAX_BUDGET;
            });
          if (cheaperReplacement) {
            deck.splice(expensiveIndex, 1, { kind: cheaperReplacement.kind, baseId: cheaperReplacement.baseId, count: 1 });
          } else {
            break;
          }
        } else {
          break;
        }
      }
      safety += 1;
    }

    return deck;
  }, [getEntryCost, disabledCards]);

  const applyPreset = useCallback((idx: number) => {
    const preset = PRESETS[idx];
    if (!preset) return;
    const newDeck: BuilderEntry[] = [];
    preset.cards.forEach(name => {
      if (disabledCards.has(name)) return;
      const pol = Pols.find((p: BasePolitician) => p.name === name);
      if (pol) {
        newDeck.push({ kind: 'pol', baseId: pol.id, count: 1 });
        return;
      }
      const spec = Specials.find((s: BaseSpecial) => s.name === name);
      if (spec) {
        newDeck.push({ kind: 'spec', baseId: spec.id, count: 1 });
        return;
      }
      // name not found -> ignore
    });
    setDeck(normalizePresetDeck(newDeck));
  }, [disabledCards, normalizePresetDeck]);

  const budget = currentBuilderBudget(deck);
  const count = currentBuilderCount(deck);

  // Count government cards in deck
  const governmentCount = deck.reduce((sum, entry) => {
    if (entry.kind === 'pol') {
      return sum + entry.count;
    }
    return sum;
  }, 0);

  // Deck validation: minimum 5 government cards, maximum 10 total cards, budget 50-69 BP
  const isDeckValid = count >= 5 && governmentCount >= 5 && count <= 10 && budget >= 50 && budget <= 69;

  // Helper function to get category color for a card
  const getCategoryColor = (kind: 'pol' | 'spec', base: BasePolitician | BaseSpecial) => {
    if (kind === 'pol') {
      return { main: '#add8e6', complementary: '#e6f3ff' }; // Government: Light Blue
    }

    const spec = base as BaseSpecial;
    if (spec.type === 'Öffentlichkeitskarte') {
      return { main: '#f5f5dc', complementary: '#fefcf0' }; // Public: Beige
    }
    if (spec.type === 'Sofort-Initiative') {
      return { main: '#40e0d0', complementary: '#e6fffe' }; // Initiatives (Instant): Turquoise
    }
    if (spec.type === 'Dauerhaft-Initiative') {
      return { main: '#40e0d0', complementary: '#e6fffe' }; // Initiatives (Permanent): Turquoise
    }
    if (spec.type === 'Intervention') {
      return { main: '#c8a0ff', complementary: '#f3e6ff' }; // Interventions: Light Purple
    }
    if ((spec as any).tag === 'Corruption') {
      return { main: '#ffb86b', complementary: '#fff4e6' }; // Corruption: Orange
    }

    return { main: '#26394c', complementary: '#1a2a3a' }; // Default
  };

  // Helper: classify a card into an effect category for sorting / grouping.
  // Priority: 0 = Influence (buffs), 1 = AP gain, 2 = Card draw, 3 = Other
  const getEffectRank = (base: BasePolitician | BaseSpecial): number => {
      // Government cards keep default rank to avoid mixing with specials
      if ((base as any).type === undefined) return 0;

      const s = base as BaseSpecial;
      const rawTags = (s as any).tags as string[] | undefined;
      const tags = (rawTags || []).map((t: string) => t.toLowerCase());
      const key = (s as any).effectKey as string | undefined;

      const has = (needle: string) => tags.includes(needle) || (key ? key.toLowerCase().includes(needle) : false);

      if (has('buff') || has('influence')) return 0;     // +Influence
      if (has('ap')) return 1;                            // +AP
      if (has('draw')) return 2;                          // +Card draw
      return 3;                                           // other / mixed effects
  };

  const getEffectLabel = (rank: number): string => {
    switch (rank) {
      case 0: return '+ Influence';
      case 1: return '+ AP';
      case 2: return '+ Cards';
      default: return 'Other';
    }
  };

  // Helper function to separate active and disabled cards
  const separateActiveAndDisabled = (cards: Array<{ kind: 'pol' | 'spec'; base: BasePolitician | BaseSpecial }>) => {
    const active = cards.filter(({ base }) => !disabledCards.has(base.name));
    const disabled = cards.filter(({ base }) => disabledCards.has(base.name));
    return { active, disabled };
  };

  // Component to render cards with visual separation
  const CardList = ({ cards }: { cards: Array<{ kind: 'pol' | 'spec'; base: BasePolitician | BaseSpecial }> }) => {
    const { active, disabled } = separateActiveAndDisabled(cards);

    return (
      <>
        {/* Active cards */}
        {active.map(({ kind, base }) => (
          <CardTile key={`active-${kind}-${base.id}`} kind={kind} base={base} onClick={() => handleCardClick(kind, base)} />
        ))}

        {/* Visual separator if there are both active and disabled cards */}
        {active.length > 0 && disabled.length > 0 && (
          <div style={{
            gridColumn: '1 / -1',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #374151, transparent)',
            margin: '8px 0',
            borderRadius: '1px',
          }} />
        )}

        {/* Disabled cards */}
        {disabled.map(({ kind, base }) => (
          <CardTile key={`disabled-${kind}-${base.id}`} kind={kind} base={base} onClick={() => handleCardClick(kind, base)} />
        ))}
      </>
    );
  };

  const categorizedCards = useMemo(() => {
    const categories = {
      government: [] as Array<{ kind: 'pol' | 'spec'; base: BasePolitician | BaseSpecial }>,
      public: [] as Array<{ kind: 'pol' | 'spec'; base: BasePolitician | BaseSpecial }>,
      initiatives_sofort: [] as Array<{ kind: 'pol' | 'spec'; base: BasePolitician | BaseSpecial }>,
      initiatives_dauerhaft: [] as Array<{ kind: 'pol' | 'spec'; base: BasePolitician | BaseSpecial }>,
      interventions: [] as Array<{ kind: 'pol' | 'spec'; base: BasePolitician | BaseSpecial }>,
      corruptions: [] as Array<{ kind: 'pol' | 'spec'; base: BasePolitician | BaseSpecial }>
    };

    // Government cards
    Pols.forEach((p: BasePolitician) => categories.government.push({ kind: 'pol', base: p }));

    // Public cards
    Specials.filter((s: BaseSpecial) => s.type === 'Öffentlichkeitskarte')
      .forEach((s: BaseSpecial) => categories.public.push({ kind: 'spec', base: s }));

    // Initiatives: separate into Sofort (instant) and Dauerhaft (ongoing)
    Specials.filter((s: BaseSpecial) => s.type === 'Sofort-Initiative')
      .forEach((s: BaseSpecial) => categories.initiatives_sofort.push({ kind: 'spec', base: s }));
    Specials.filter((s: BaseSpecial) => s.type === 'Dauerhaft-Initiative')
      .forEach((s: BaseSpecial) => categories.initiatives_dauerhaft.push({ kind: 'spec', base: s }));

    // Interventions
    Specials.filter((s: BaseSpecial) => s.type === 'Intervention')
      .forEach((s: BaseSpecial) => categories.interventions.push({ kind: 'spec', base: s }));

    // Corruption cards (identified by tag)
    Specials.filter((s: BaseSpecial) => (s as any).tag === 'Corruption')
      .forEach((s: BaseSpecial) => categories.corruptions.push({ kind: 'spec', base: s }));

    // Sort by effect rank (Influence, AP, Draw, Other)
    const sortByEffect = (arr: Array<{ kind: 'pol' | 'spec'; base: BasePolitician | BaseSpecial }>) =>
      arr.sort((a, b) => getEffectRank(a.base) - getEffectRank(b.base));

    sortByEffect(categories.government);
    sortByEffect(categories.public);
    sortByEffect(categories.initiatives_sofort);
    sortByEffect(categories.initiatives_dauerhaft);
    sortByEffect(categories.interventions);
    sortByEffect(categories.corruptions);

    // Filter by search term
    const matches = (kind: 'pol' | 'spec', base: BasePolitician | BaseSpecial) => {
      if (!searchQuery) return true;
      const hay = `${base.name} ${kind === 'pol' ? (base as BasePolitician).tag : (base as BaseSpecial).type}`.toLowerCase();
      return hay.includes(searchQuery.toLowerCase());
    };

    // Combine all filtered cards for navigation
    const allFilteredCards = [
      ...categories.government.filter(({ kind, base }) => matches(kind, base)),
      ...categories.public.filter(({ kind, base }) => matches(kind, base)),
      ...categories.initiatives_sofort.filter(({ kind, base }) => matches(kind, base)),
      ...categories.initiatives_dauerhaft.filter(({ kind, base }) => matches(kind, base)),
      ...categories.interventions.filter(({ kind, base }) => matches(kind, base)),
      ...categories.corruptions.filter(({ kind, base }) => matches(kind, base))
    ];

    return {
      categories: {
        government: categories.government.filter(({ kind, base }) => matches(kind, base)),
        public: categories.public.filter(({ kind, base }) => matches(kind, base)),
        initiatives_sofort: categories.initiatives_sofort.filter(({ kind, base }) => matches(kind, base)),
        initiatives_dauerhaft: categories.initiatives_dauerhaft.filter(({ kind, base }) => matches(kind, base)),
        interventions: categories.interventions.filter(({ kind, base }) => matches(kind, base)),
        corruptions: categories.corruptions.filter(({ kind, base }) => matches(kind, base))
      },
      allFilteredCards
    };
  }, [searchQuery, disabledCards]);



  const builderCanAdd = useCallback((base: BasePolitician | BaseSpecial, kind: 'pol' | 'spec'): boolean => {
    // Check if card is disabled
    if (disabledCards.has(base.name)) return false;

    // Check deck size limit (10 cards maximum)
    if (count >= 10) return false;

    const tier = kind === 'spec' ? (base as BaseSpecial).tier : (base as BasePolitician).T;
    const limit = tier >= 3 ? 1 : 2;
    const entry = deck.find(e => e.kind === kind && e.baseId === base.id);
    const already = entry ? entry.count : 0;
    const cost = kind === 'pol' ? ((base as BasePolitician).BP ?? 0) : (base as BaseSpecial).bp;

    return already < limit && (budget + cost) <= 69;
  }, [deck, budget, count, disabledCards]);

  const builderAdd = useCallback((base: BasePolitician | BaseSpecial, kind: 'pol' | 'spec') => {
    if (!builderCanAdd(base, kind)) return;

    setDeck(prev => {
      const newDeck = [...prev];
      let entry = newDeck.find(e => e.kind === kind && e.baseId === base.id);
      if (!entry) {
        entry = { kind, baseId: base.id, count: 0 };
        newDeck.push(entry);
      }
      entry.count += 1;
      return newDeck;
    });
  }, [builderCanAdd]);

  const builderRemove = useCallback((base: BasePolitician | BaseSpecial, kind: 'pol' | 'spec') => {
    setDeck(prev => {
      const newDeck = [...prev];
      let entry = newDeck.find(e => e.kind === kind && e.baseId === base.id);
      if (!entry) return prev;

      entry.count -= 1;
      if (entry.count <= 0) {
        return newDeck.filter(e => e !== entry);
      }
      return newDeck;
    });
  }, []);




  const handleApplyDeck = useCallback(() => {
    const isDeckValid = count >= 5 && governmentCount >= 5 && count <= 10 && budget >= 50 && budget <= 69;
    if (isDeckValid) {
      onApplyDeck(deck);
      onClose();
    }
  }, [deck, count, governmentCount, budget, onApplyDeck, onClose]);

  const handleCardClick = useCallback((kind: 'pol' | 'spec', base: BasePolitician | BaseSpecial) => {
    setSelectedCard({ kind, base });
  }, []);

  const handleCloseCardDetail = useCallback(() => {
    setSelectedCard(null);
    setShowSources(false);
  }, []);

  const handlePreviousCard = useCallback(() => {
    if (!selectedCard || !categorizedCards.allFilteredCards.length) return;

    const currentIndex = categorizedCards.allFilteredCards.findIndex(
      card => card.kind === selectedCard.kind && card.base.id === selectedCard.base.id
    );

    if (currentIndex > 0) {
      const prevCard = categorizedCards.allFilteredCards[currentIndex - 1];
      setSelectedCard({ kind: prevCard.kind, base: prevCard.base });
    }
  }, [selectedCard, categorizedCards.allFilteredCards]);

  const handleNextCard = useCallback(() => {
    if (!selectedCard || !categorizedCards.allFilteredCards.length) return;

    const currentIndex = categorizedCards.allFilteredCards.findIndex(
      card => card.kind === selectedCard.kind && card.base.id === selectedCard.base.id
    );

    if (currentIndex < categorizedCards.allFilteredCards.length - 1) {
      const nextCard = categorizedCards.allFilteredCards[currentIndex + 1];
      setSelectedCard({ kind: nextCard.kind, base: nextCard.base });
    }
  }, [selectedCard, categorizedCards.allFilteredCards]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedCard) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          handlePreviousCard();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleNextCard();
          break;
        case 'Escape':
          event.preventDefault();
          handleCloseCardDetail();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCard, handlePreviousCard, handleNextCard, handleCloseCardDetail]);

  const handleStartMatch = useCallback(() => {
    const p1Deck: BuilderEntry[] = deck.length ? deck : [];
    // 🧪 TEST DECK: P2 bekommt das gleiche Deck wie P1 für isoliertes Testing
    const p2Deck: BuilderEntry[] = deck.length ? [...deck] : []; // Same deck as P1

    console.log('🔧 DEBUG: Starting match with decks:', { p1Cards: p1Deck.length, p2Cards: p2Deck.length });
    onStartMatch(p1Deck, p2Deck);
    onClose();
  }, [deck, onStartMatch, onClose]);

  const handleStartVsAI = useCallback(() => {
    const isDeckValid = count >= 5 && governmentCount >= 5 && count <= 10 && budget >= 50 && budget <= 69;
    if (!isDeckValid || !onStartVsAI) return;

    const p1Deck: BuilderEntry[] = deck.length ? deck : [];
    console.log('🔧 DEBUG: Starting vs AI with deck:', { p1Cards: p1Deck.length });
    onStartVsAI(p1Deck);
    onClose();
  }, [deck, count, governmentCount, budget, onStartVsAI, onClose]);

  // Card Tile Component
  const CardTile = React.memo(({ kind, base, onClick }: {
    kind: 'pol' | 'spec';
    base: BasePolitician | BaseSpecial;
    onClick: () => void;
  }) => {
    const isDisabled = disabledCards.has(base.name);
    const canAdd = builderCanAdd(base, kind);
    const categoryColors = getCategoryColor(kind, base);

    // Double-click detection with timer
    const [clickCount, setClickCount] = useState(0);
    const [clickTimer, setClickTimer] = useState<NodeJS.Timeout | null>(null);

    const handleClick = useCallback((e: React.MouseEvent) => {
      if (isDisabled) return;

      e.stopPropagation();

      if (clickCount === 0) {
        // First click - start timer
        setClickCount(1);
        const timer = setTimeout(() => {
          // Single click after timeout
          onClick();
          setClickCount(0);
        }, 300); // 300ms timeout for double-click detection
        setClickTimer(timer);
      } else {
        // Second click within timeout - double click detected
        if (clickTimer) {
          clearTimeout(clickTimer);
          setClickTimer(null);
        }
        setClickCount(0);

        // Add to deck immediately
        if (canAdd) {
          builderAdd(base, kind);
        }
      }
    }, [isDisabled, onClick, canAdd, base, kind, clickCount, clickTimer]);

    // Cleanup timer on unmount
    useEffect(() => {
      return () => {
        if (clickTimer) {
          clearTimeout(clickTimer);
        }
      };
    }, [clickTimer]);

    return (
    <div
      onClick={handleClick}
      style={{
        background: isDisabled ? '#0a0f15' : categoryColors.complementary + '4D', // 30% opacity
        border: `2px solid ${isDisabled ? '#1a1f2a' : categoryColors.main}`, // 100% opacity outline
        outline: '1px solid #000000', // Thin black outline
        borderRadius: '8px',
        padding: '6px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        width: '124px',
        height: '190px',
        opacity: isDisabled ? 0.4 : 1,
      }}
      onMouseEnter={isDisabled ? undefined : (e) => {
        e.currentTarget.style.background = categoryColors.complementary + '66'; // 40% opacity on hover
        e.currentTarget.style.borderColor = categoryColors.main;
      }}
      onMouseLeave={isDisabled ? undefined : (e) => {
        e.currentTarget.style.background = categoryColors.complementary + '4D'; // Back to 30% opacity
        e.currentTarget.style.borderColor = categoryColors.main;
      }}
    >
      <canvas
        width={120}
        height={120}
        style={{
          display: 'block',
          width: '120px',
          height: '120px',
          borderRadius: '6px',
          background: isDisabled ? '#080b0f' : '#0b1118',
          border: `1px solid ${isDisabled ? '#151a20' : '#1e2c3b'}`,
          opacity: isDisabled ? 0.6 : 1,
        }}
        ref={(canvas) => {
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const mockCard = {
                kind,
                baseId: base.id,
                name: base.name,
                uid: base.id,
                id: base.id,
                key: base.key,
              } as any;
              drawCardImage(ctx, mockCard, 0, 0, 120, 'ui');
            }
          }
        }}
      />
      <h4 style={{
        margin: 0,
        fontSize: '10px',
        fontWeight: 600,
        color: isDisabled ? '#6b7280' : '#000000',
        textAlign: 'center',
        lineHeight: '1.2',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        height: '24px',
      }}>
        {base.name}
      </h4>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 'auto',
        padding: '4px 0',
      }}>
        <span style={{
          fontSize: '9px',
          color: isDisabled ? '#6b7280' : '#000000',
          fontWeight: 500,
          textAlign: 'center',
        }}>
          {kind === 'pol'
            ? `${(base as BasePolitician).BP || 0} BP`
            : `${(base as BaseSpecial).bp} BP`
          }
        </span>
      </div>
    </div>
    );
  });

  if (!isOpen) return null;

  const BP_LIMIT = 69; // Budget limit
  const BP_MIN = 50; // Minimum budget
  const overBudget = budget > BP_LIMIT;
  const underBudget = budget < BP_MIN;
  const overCount = count > 10;
  const underMinGovernment = governmentCount < 5;
  const underMinCards = count < 5;
  const isValid = !overBudget && !underBudget && !overCount && !underMinGovernment && !underMinCards;

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      background: 'rgba(4,8,12,.8)',
      backdropFilter: 'blur(2px)',
      zIndex: 40,
    }}>
      <div style={{
        position: 'absolute',
        inset: '12px',
        background: '#0d1621',
        border: '1px solid #1f3042',
        borderRadius: '12px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '.4px' }}>
              Deckbuilder
            </div>
            <span style={{
              padding: '4px 8px',
              borderRadius: '8px',
              background: '#0f1a26',
              border: '1px solid #203043',
              fontSize: '12px',
            }}>
              Budget (BP): {budget} / 69 (Min: 50)
            </span>
            <span style={{
              padding: '4px 8px',
              borderRadius: '8px',
              background: '#0f1a26',
              border: '1px solid #203043',
              fontSize: '12px',
            }}>
              Deck: {count}/10
            </span>
          </div>

          {/* Start vs AI Button */}
          {onStartVsAI && (
            <button
              onClick={handleStartVsAI}
              style={{
                background: isValid ? '#10b981' : '#6b7280',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: isValid ? 'pointer' : 'not-allowed',
                opacity: isValid ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              disabled={!isValid}
              title={!isValid ? `Deck muss gültig sein: 5-10 Karten, ≥5 Government, 50-69 BP (aktuell: ${budget} BP)` : 'Starte Spiel gegen KI'}
            >
              🤖 Start vs KI
            </button>
          )}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: '0 0 220px',
          }}>
            <Icon name="search" size={14} />
            <input
              type="text"
              placeholder="Suche (Name, Tag)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                outline: 'none',
                padding: '4px 8px',
                borderRadius: '8px',
                background: '#0f1a26',
                border: '1px solid #203043',
                fontSize: '12px',
                color: '#e8f0f8',
              }}
            />
          </div>
          <div style={{ flex: 1 }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <select value={presetIndex} onChange={(e) => setPresetIndex(Number(e.target.value))} style={{ background: '#0f1a26', color: '#eaf3ff', borderRadius: 8, padding: '6px 8px', border: '1px solid #203043' }}>
              {PRESETS.map((p, i) => <option key={p.name} value={i}>{p.name}</option>)}
            </select>
            <button onClick={() => applyPreset(presetIndex)} style={{ background: '#0f2a1f', color: '#eaf3ff', borderRadius: 8, padding: '6px 8px', border: '1px solid #27425b' }}>Apply Preset</button>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#162436',
              color: '#eaf3ff',
              border: '1px solid #27425b',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            Schließen
          </button>
        </div>

        {/* Body */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 360px',
          gap: '12px',
          minHeight: 0,
          flex: 1,
        }}>
          {/* Categorized Card Columns */}
          <div style={{
            overflow: 'auto',
            border: '1px solid #1f2c3a',
            borderRadius: '10px',
            padding: '8px',
            background: '#0a121b',
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: '12px',
          }}>
            {/* Government Column */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{
                background: 'rgba(173, 216, 230, 0.2)',
                border: '1px solid #4a90e2',
                borderRadius: '8px',
                padding: '8px',
                textAlign: 'center',
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#add8e6',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <Icon name="government_row" size={16} />
                  Government
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '11px',
                  color: '#8bb5d9',
                  lineHeight: '1.3',
                }}>
                  {withIcons('Provide Influence points. At the end of each round, the player with the highest total Influence wins the round. Win two rounds to win the game.')}
                </p>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                flex: 1,
                justifyContent: 'start',
                alignContent: 'start',
                background: 'rgba(173, 216, 230, 0.8)', // Government color with 80% opacity
                borderRadius: '8px',
                padding: '8px',
                gridAutoRows: 'minmax(190px, auto)', // Adjust for new height
                outline: '1px solid #000000', // Thin black outline
              }}>
                <CardList cards={categorizedCards.categories.government} />
              </div>
            </div>

            {/* Public Column */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{
                background: 'rgba(245, 245, 220, 0.2)',
                border: '1px solid #d2b48c',
                borderRadius: '8px',
                padding: '8px',
                textAlign: 'center',
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#f5f5dc',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <Icon name="public_row" size={16} />
                  Public
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '11px',
                  color: '#d2b48c',
                  lineHeight: '1.3',
                }}>
                  {withIcons('Permanent support cards that modify values, action points, or Influence over time.')}
                </p>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                flex: 1,
                justifyContent: 'start',
                alignContent: 'start',
                background: 'rgba(245, 245, 220, 0.8)', // Public color with 80% opacity
                borderRadius: '8px',
                padding: '8px',
                gridAutoRows: 'minmax(190px, auto)', // Adjust for new height
                outline: '1px solid #000000', // Thin black outline
              }}>
                <CardList cards={categorizedCards.categories.public} />
              </div>
            </div>

            {/* Initiatives Column */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{
                background: 'rgba(64, 224, 208, 0.2)',
                border: '1px solid #40e0d0',
                borderRadius: '8px',
                padding: '8px',
                textAlign: 'center',
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#40e0d0',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <Icon name="initiative" size={16} />
                  Initiatives (Instant)
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '11px',
                  color: '#40e0d0',
                  lineHeight: '1.3',
                }}>
                  {withIcons('One-time effects for immediate advantages (e.g., Influence, points, actions).')}
                </p>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                flex: 1,
                justifyContent: 'start',
                alignContent: 'start',
                background: 'rgba(64, 224, 208, 0.8)', // Initiatives (Instant) color with 80% opacity
                borderRadius: '8px',
                padding: '8px',
                gridAutoRows: 'minmax(190px, auto)', // Adjust for new height
                outline: '1px solid #000000', // Thin black outline
              }}>
                <CardList cards={categorizedCards.categories.initiatives_sofort} />
              </div>
            </div>

            {/* Initiatives (Permanent) Column */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{
                background: 'rgba(64, 224, 208, 0.2)',
                border: '1px solid #40e0d0',
                borderRadius: '8px',
                padding: '8px',
                textAlign: 'center',
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#40e0d0',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <Icon name="initiative" size={16} />
                  Initiatives (Permanent)
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '11px',
                  color: '#40e0d0',
                  lineHeight: '1.3',
                }}>
                  {withIcons('Stay on the field and apply continuous effects.')}
                </p>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                flex: 1,
                justifyContent: 'start',
                alignContent: 'start',
                background: 'rgba(64, 224, 208, 0.8)', // Initiatives (Permanent) color with 80% opacity
                borderRadius: '8px',
                padding: '8px',
                gridAutoRows: 'minmax(190px, auto)', // Adjust for new height
                outline: '1px solid #000000', // Thin black outline
              }}>
                <CardList cards={categorizedCards.categories.initiatives_dauerhaft} />
              </div>
            </div>

            {/* Interventions Column */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{
                background: 'rgba(200, 160, 255, 0.2)',
                border: '1px solid #c8a0ff',
                borderRadius: '8px',
                padding: '8px',
                textAlign: 'center',
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#c8a0ff',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <Icon name="intervention_trap" size={16} />
                  Interventions
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '11px',
                  color: '#c8a0ff',
                  lineHeight: '1.3',
                }}>
                  {withIcons('Trap cards that trigger automatically under certain conditions.')}
                </p>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                flex: 1,
                justifyContent: 'start',
                alignContent: 'start',
                background: 'rgba(200, 160, 255, 0.8)', // Interventions color with 80% opacity
                borderRadius: '8px',
                padding: '8px',
                gridAutoRows: 'minmax(190px, auto)', // Adjust for new height
                outline: '1px solid #000000', // Thin black outline
              }}>
                <CardList cards={categorizedCards.categories.interventions} />
              </div>
            </div>

            {/* Corruption Column */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              <div style={{
                background: 'rgba(255, 200, 120, 0.06)',
                border: '1px solid #ffb86b',
                borderRadius: '8px',
                padding: '8px',
                textAlign: 'center',
              }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#ffb86b',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <Icon name="intervention_trap" size={16} />
                  Corruption
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '11px',
                  color: '#ffb86b',
                  lineHeight: '1.3',
                }}>
                  {withIcons('Special cards with a D6 roll; can seize, corrupt, or remove Government cards.')}
                </p>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                flex: 1,
                justifyContent: 'start',
                alignContent: 'start',
                background: 'rgba(255, 184, 107, 0.8)', // Corruption color with 80% opacity
                borderRadius: '8px',
                padding: '8px',
                gridAutoRows: 'minmax(190px, auto)', // Adjust for new height
                outline: '1px solid #000000', // Thin black outline
              }}>
                <CardList cards={categorizedCards.categories.corruptions} />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div style={{
            overflow: 'auto',
            border: '1px solid #1f2c3a',
            borderRadius: '10px',
            padding: '8px',
            background: '#0a121b',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            {/* Stats */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              fontSize: '12px',
              color: '#cfe0f2',
            }}>
              <div style={{
                padding: '4px 8px',
                borderRadius: '8px',
                background: '#0f1a26',
                border: '1px solid #203043',
                fontSize: '12px',
                color: isValid ? '#4ade80' : '#ef4444',
              }}>
                {isValid ? 'Deck OK' : `Deck invalid${overBudget ? ' · Budget too high' : ''}${underBudget ? ' · Budget too low' : ''}${overCount ? ' · Too many cards' : ''}${underMinGovernment ? ' · Need 5+ Government' : ''}${underMinCards ? ' · Need 5+ cards' : ''}`}
              </div>

              {/* Deck Statistics */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                fontSize: '11px',
              }}>
                <div style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: governmentCount >= 5 ? '#1f2937' : '#7f1d1d',
                  color: governmentCount >= 5 ? '#d1d5db' : '#fca5a5',
                  border: `1px solid ${governmentCount >= 5 ? '#374151' : '#dc2626'}`,
                }}>
                  Gov: {governmentCount}/5+
                </div>
                <div style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: count <= 10 ? '#1f2937' : '#7f1d1d',
                  color: count <= 10 ? '#d1d5db' : '#fca5a5',
                  border: `1px solid ${count <= 10 ? '#374151' : '#dc2626'}`,
                }}>
                  Cards: {count}/10
                </div>
                <div style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: (budget >= 50 && budget <= 69) ? '#1f2937' : '#7f1d1d',
                  color: (budget >= 50 && budget <= 69) ? '#d1d5db' : '#fca5a5',
                  border: `1px solid ${(budget >= 50 && budget <= 69) ? '#374151' : '#dc2626'}`,
                }}>
                  Budget: {budget}/69
                </div>
              </div>
            </div>

            {/* Deck List */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              {deck.map(entry => {
                const base = entry.kind === 'pol'
                  ? Pols.find((p: BasePolitician) => p.id === entry.baseId)
                  : Specials.find((s: BaseSpecial) => s.id === entry.baseId);
                if (!base) return null;

                return (
                  <div key={`${entry.kind}-${entry.baseId}`} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 8px',
                    borderBottom: '1px solid #182433',
                    fontSize: '12px',
                  }}>
                    <div style={{ flex: 1 }}>{entry.count}× {base.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div>{entry.kind === 'pol' ? ((base as BasePolitician).BP || 0) + ' BP' : ((base as BaseSpecial).bp) + ' BP'}</div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            builderRemove(base, entry.kind);
                          }}
                          style={{
                            background: '#dc2626',
                            border: 'none',
                            borderRadius: '4px',
                            color: 'white',
                            width: '20px',
                            height: '20px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Remove one"
                        >
                          −
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            builderAdd(base, entry.kind);
                          }}
                          disabled={!builderCanAdd(base, entry.kind)}
                          style={{
                            background: builderCanAdd(base, entry.kind) ? '#059669' : '#6b7280',
                            border: 'none',
                            borderRadius: '4px',
                            color: 'white',
                            width: '20px',
                            height: '20px',
                            fontSize: '12px',
                            cursor: builderCanAdd(base, entry.kind) ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Add one"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
            }}>
              <button
                onClick={handleApplyDeck}
                disabled={!isValid}
                style={{
                  background: '#162436',
                  color: '#eaf3ff',
                  border: '1px solid #27425b',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  opacity: isValid ? 1 : 0.6,
                }}
              >
                Use as P1 Deck
              </button>
              <button
                onClick={handleStartMatch}
                disabled={!isValid}
                style={{
                  background: '#162436',
                  color: '#eaf3ff',
                  border: '1px solid #27425b',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  cursor: isValid ? 'pointer' : 'not-allowed',
                  opacity: isValid ? 1 : 0.6,
                }}
              >
                Start Match
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card Detail Modal */}
      {selectedCard && (() => {
        const cardDetails = getCardDetails(selectedCard.base.name);
        return (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingLeft: '20px',
          zIndex: 50,
        }}>
          <div style={{
            background: '#0d1621',
            border: '3px solid #ffffff',
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
              gap: '24px',
              width: 'calc(70vw)',
              height: 'calc(90vh)',
            overflow: 'hidden',
              position: 'relative',
          }}>
              {/* Card Image - Full 1024x1024 size with custom corners */}
            <div style={{
              flex: '0 0 1024px',
              height: '1024px',
              background: '#0b1118',
              border: '2px solid #ffffff',
              borderRadius: '12px',
              overflow: 'hidden',
              position: 'relative',
            }}>
              {/* Navigation Arrows */}
              <button
                onClick={handlePreviousCard}
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(13, 22, 33, 0.9)',
                  border: '2px solid #1f3042',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#eaf3ff',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  zIndex: 10,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(22, 36, 54, 0.95)';
                  e.currentTarget.style.borderColor = '#27425b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(13, 22, 33, 0.9)';
                  e.currentTarget.style.borderColor = '#1f3042';
                }}
              >
                ‹
              </button>

              <button
                onClick={handleNextCard}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(13, 22, 33, 0.9)',
                  border: '2px solid #1f3042',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#eaf3ff',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  zIndex: 10,
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(22, 36, 54, 0.95)';
                  e.currentTarget.style.borderColor = '#27425b';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(13, 22, 33, 0.9)';
                  e.currentTarget.style.borderColor = '#1f3042';
                }}
              >
                ›
              </button>

              <canvas
                width={1024}
                height={1024}
                style={{
                  display: 'block',
                    width: '1024px',
                    height: '1024px',
                }}
                ref={(canvas) => {
                  if (canvas) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      // Create a mock card object for drawing
                      const mockCard = {
                        kind: selectedCard.kind,
                        baseId: selectedCard.base.id,
                        name: selectedCard.base.name,
                        uid: selectedCard.base.id,
                        id: selectedCard.base.id,
                        key: selectedCard.base.key,
                      } as any;
                      drawCardImage(ctx, mockCard, 0, 0, 1024, 'modal');
                    }
                  }
                }}
              />
            </div>

              {/* Card Information Panel */}
            <div style={{
              flex: '1',
                minWidth: '400px',
              display: 'flex',
              flexDirection: 'column',
                gap: '20px',
                position: 'relative',
            }}>
                {/* Header with Cost in Top Right */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}>
                  <div style={{ flex: 1 }}>
                  <h2 style={{
                      margin: '0 0 8px 0',
                      fontSize: '28px',
                    fontWeight: 700,
                    color: '#eaf3ff',
                      lineHeight: '1.2',
                  }}>
                    {selectedCard.base.name}
                  </h2>

                    {/* Category */}
                  <div style={{
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#dbe9f8',
                      marginBottom: '4px',
                    }}>
                      {cardDetails?.category || (selectedCard.kind === 'pol' ? 'Government' : 'Public')}
                    </div>

                    {/* Subcategories */}
                    {cardDetails?.subcategories && cardDetails.subcategories.length > 0 && (
                      <div style={{
                        fontSize: '14px',
                        color: '#a9c1da',
                        marginBottom: '4px',
                      }}>
                        {withIcons(cardDetails.subcategories.join(', '), 14)}
                      </div>
                    )}

                    {/* Position (without label) */}
                    {cardDetails?.highestPosition && (
                      <div style={{
                        fontSize: '14px',
                    color: '#8faecc',
                        marginBottom: '8px',
                      }}>
                        {cardDetails.highestPosition}
                      </div>
                    )}

                    {/* For specials: show type, tier, speed, slot */}
                    {selectedCard.kind === 'spec' && (
                      <div style={{
                        fontSize: '14px',
                        color: '#8faecc',
                        marginBottom: '4px',
                      }}>
                        {cardDetails?.cardType || (selectedCard.kind === 'spec' ? (selectedCard.base as any).type : '')}
                        {cardDetails?.tier && ` • ${cardDetails.tier}`}
                        {cardDetails?.speed && ` • ${cardDetails.speed}`}
                        {cardDetails?.slot && ` • Slot: ${cardDetails.slot}`}
                      </div>
                    )}

                    {/* For government: show base stats */}
                    {selectedCard.kind === 'pol' && (
                      <div style={{
                        display: 'flex',
                        gap: '10px',
                        flexWrap: 'wrap',
                        marginTop: '4px',
                        marginBottom: '4px',
                        color: '#a9c1da',
                        fontSize: '14px',
                      }}>
                        <span>Influence: {(selectedCard.base as any).influence}</span>
                        <span>Tier: {(selectedCard.base as any).T}</span>
                        <span>Keyword: {(selectedCard.base as any).tag}</span>
                      </div>
                    )}

                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280',
                    fontWeight: 500,
                  }}>
                    Card {categorizedCards.allFilteredCards.findIndex(
                      card => card.kind === selectedCard.kind && card.base.id === selectedCard.base.id
                    ) + 1} of {categorizedCards.allFilteredCards.length}
                  </div>
                </div>

                  {/* Cost in Top Right Corner */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '8px',
                  }}>
                    <div style={{
                      background: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '14px',
                      color: '#e5e7eb',
                    }}>
                      Cost: { (cardDetails?.deckCost ?? (selectedCard.kind === 'pol' ? (selectedCard.base as BasePolitician).BP || 0 : (selectedCard.base as BaseSpecial).bp)) + ' BP' }
                    </div>

                <button
                  onClick={handleCloseCardDetail}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8faecc',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#1a2a3a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                  }}
                >
                  ×
                </button>
                  </div>
              </div>

                {/* Game Effect */}
              <div style={{
                  background: '#111827',
                  border: '1px solid #ffffff',
                  borderRadius: '12px',
                  padding: '20px',
              }}>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  fontWeight: 600,
                    color: '#e5e7eb',
                }}>
                    Game Effect
                </h3>

                  <p style={{
                    margin: 0,
                    color: '#d1d5db',
                    lineHeight: '1.5',
                    fontSize: '15px',
                  }}>
                    {cardDetails?.gameEffect ? withIcons(cardDetails.gameEffect, 14)
                      : (selectedCard.kind === 'spec'
                      ? (selectedCard.base as BaseSpecial).effect
                      : 'Passive Politician abilities based on Tag')}
                  </p>
              </div>

                {/* Synergy for Public */}
                {cardDetails?.synergy && (
                  <div style={{
                    background: '#111827',
                    border: '1px solid #ffffff',
                    borderRadius: '12px',
                    padding: '20px',
                  }}>
                    <h3 style={{
                      margin: '0 0 12px 0',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#e5e7eb',
                    }}>
                      Synergy
                    </h3>
                    <p style={{
                      margin: 0,
                      color: '#d1d5db',
                      lineHeight: '1.5',
                      fontSize: '15px',
                    }}>
                      {cardDetails.synergy}
                    </p>
                  </div>
                )}

                {/* Trigger Information for Interventions */}
                {cardDetails?.trigger && (
              <div style={{
                    background: '#111827',
                    border: '1px solid #ffffff',
                    borderRadius: '12px',
                    padding: '20px',
              }}>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '16px',
                  fontWeight: 600,
                      color: '#e5e7eb',
                }}>
                      Trigger
                </h3>
                <p style={{
                  margin: 0,
                      color: '#d1d5db',
                  lineHeight: '1.5',
                      fontSize: '15px',
                }}>
                      {cardDetails.trigger}
                </p>
              </div>
                )}

                {/* Usage and Example for Initiatives/Interventions */}
                {(cardDetails?.usage || cardDetails?.example) && (
                  <div style={{
                    background: '#111827',
                    border: '1px solid #ffffff',
                    borderRadius: '12px',
                    padding: '20px',
                  }}>
                    {cardDetails.usage && (
                      <div style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>When to play?</div>
                        <div style={{ color: '#d1d5db', fontSize: '15px', lineHeight: '1.5' }}>{cardDetails.usage}</div>
                      </div>
                    )}
                    {cardDetails.example && (
                      <div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Example</div>
                        <div style={{ color: '#d1d5db', fontSize: '15px', lineHeight: '1.5' }}>{cardDetails.example}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Personal Information */}
                {cardDetails && (cardDetails.nationality || cardDetails.birthDate || cardDetails.estimatedWealth || cardDetails.controversialQuote) && (
                  <div style={{
                    background: '#111827',
                    border: '1px solid #ffffff',
                    borderRadius: '12px',
                    padding: '20px',
                  }}>
                    <h3 style={{
                      margin: '0 0 16px 0',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#e5e7eb',
                    }}>
                      Personal Information
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {cardDetails.nationality && (
                        <div>
                          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Nationality</div>
                          <div style={{ color: '#e5e7eb', fontWeight: 500 }}>{cardDetails.nationality}</div>
                        </div>
                      )}

                      {cardDetails.birthDate && (
                        <div>
                          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Birth Date</div>
                          <div style={{ color: '#e5e7eb', fontWeight: 500 }}>{cardDetails.birthDate}</div>
                        </div>
                      )}
                    </div>

                    {cardDetails.estimatedWealth && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Estimated Wealth</div>
                        <div style={{ color: '#e5e7eb', fontWeight: 500 }}>{formatWealth(cardDetails.estimatedWealth)}</div>
                      </div>
                    )}

                    {cardDetails.controversialQuote && (
                      <div style={{
                        marginTop: '16px',
                        background: '#1f2937',
                        border: '1px solid #ffffff',
                        borderRadius: '8px',
                        padding: '12px',
                      }}>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>Quote</div>
                        <div style={{
                          color: '#d1d5db',
                          fontStyle: 'italic',
                          lineHeight: '1.4',
                          fontSize: '14px',
                        }}>
                          {cardDetails.controversialQuote}
                        </div>
                      </div>
                    )}

                    {/* Sources integrated into modal */}
                    {cardDetails?.sources && cardDetails.sources.length > 0 && (
                      <div style={{ marginTop: '16px' }}>
                        <button
                          onClick={() => setShowSources(!showSources)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#9ca3af',
                            fontSize: '12px',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            padding: 0,
                          }}
                        >
                          Show Sources
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Button */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: 'auto',
              }}>
                <button
                  onClick={() => {
                    builderAdd(selectedCard.base, selectedCard.kind);
                    handleCloseCardDetail();
                  }}
                  disabled={!builderCanAdd(selectedCard.base, selectedCard.kind)}
                  style={{
                    flex: 1,
                      background: builderCanAdd(selectedCard.base, selectedCard.kind)
                        ? '#374151'
                        : '#1f2937',
                      color: '#e5e7eb',
                      border: '1px solid #4b5563',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                      cursor: builderCanAdd(selectedCard.base, selectedCard.kind) ? 'pointer' : 'not-allowed',
                      opacity: builderCanAdd(selectedCard.base, selectedCard.kind) ? 1 : 0.6,
                  }}
                >
                  Add to Deck
                </button>
              </div>
            </div>
            </div>

            {/* Mini Modal for Sources */}
            {showSources && cardDetails?.sources && (
              <div style={{
                position: 'fixed',
                top: 'calc(50% + 5px)',
                left: 'calc(50% + 5px)',
                transform: 'translate(-50%, -50%)',
                background: '#0d1621',
                border: '2px solid #ffffff',
                borderRadius: '12px',
                padding: '20px',
                minWidth: '400px',
                maxWidth: '600px',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)',
                zIndex: 60,
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}>
                  <h4 style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#e5e7eb',
                  }}>
                    Sources & Calculation Basis
                  </h4>
                  <button
                    onClick={() => setShowSources(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#9ca3af',
                      fontSize: '20px',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    ×
                  </button>
                </div>

                {cardDetails.calculation && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>Calculation:</div>
                    <div style={{
                      color: '#d1d5db',
                      fontSize: '13px',
                      lineHeight: '1.4',
                      background: '#1f2937',
                      padding: '10px',
                      borderRadius: '6px',
                    }}>
                      {cardDetails.calculation}
          </div>
        </div>
      )}

                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>Sources:</div>
                <div style={{
                  color: '#d1d5db',
                  fontSize: '13px',
                  lineHeight: '1.4',
                }}>
                  {formatSources(cardDetails.sources)}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};
