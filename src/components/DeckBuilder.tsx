import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { BuilderEntry, BasePolitician, BaseSpecial } from '../types/game';
import { Pols, Specials, PRESET_DECKS } from '../data/gameData';
import { currentBuilderBudget, currentBuilderCount, drawCardImage } from '../utils/gameUtils';
import { getCardDetails, formatWealth, formatSources, convertHPToUSD } from '../data/cardDetails';

interface DeckBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDeck: (deck: BuilderEntry[]) => void;
  onStartMatch: (p1Deck: BuilderEntry[], p2Deck: BuilderEntry[]) => void;
  images?: never;
}

export const DeckBuilder: React.FC<DeckBuilderProps> = ({
  isOpen,
  onClose,
  onApplyDeck,
  onStartMatch
}) => {
  const [deck, setDeck] = useState<BuilderEntry[]>([]);
  const [selectedDeckName, setSelectedDeckName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');


  const [selectedCard, setSelectedCard] = useState<{ kind: 'pol' | 'spec'; base: BasePolitician | BaseSpecial } | null>(null);
  const [showSources, setShowSources] = useState(false);

  const budget = currentBuilderBudget(deck);
  const count = currentBuilderCount(deck);

  const categorizedCards = useMemo(() => {
    const categories = {
      government: [] as Array<{ kind: 'pol' | 'spec'; base: BasePolitician | BaseSpecial }>,
      public: [] as Array<{ kind: 'pol' | 'spec'; base: BasePolitician | BaseSpecial }>,
      initiatives: [] as Array<{ kind: 'pol' | 'spec'; base: BasePolitician | BaseSpecial }>,
      interventions: [] as Array<{ kind: 'pol' | 'spec'; base: BasePolitician | BaseSpecial }>
    };

    // Regierungskarten
    Pols.forEach((p: BasePolitician) => categories.government.push({ kind: 'pol', base: p }));

    // Öffentlichkeitskarten
    Specials.filter((s: BaseSpecial) => s.type === 'Öffentlichkeitskarte')
      .forEach((s: BaseSpecial) => categories.public.push({ kind: 'spec', base: s }));

    // Initiativen (Sofort und Dauerhaft)
    Specials.filter((s: BaseSpecial) => s.type === 'Sofort-Initiative' || s.type === 'Dauerhaft-Initiative')
      .forEach((s: BaseSpecial) => categories.initiatives.push({ kind: 'spec', base: s }));

    // Interventionen
    Specials.filter((s: BaseSpecial) => s.type === 'Intervention')
      .forEach((s: BaseSpecial) => categories.interventions.push({ kind: 'spec', base: s }));

    // Filtere nach Suchbegriff
    const matches = (kind: 'pol' | 'spec', base: BasePolitician | BaseSpecial) => {
      if (!searchQuery) return true;
      const hay = `${base.name} ${kind === 'pol' ? (base as BasePolitician).tag : (base as BaseSpecial).type}`.toLowerCase();
      return hay.includes(searchQuery.toLowerCase());
    };

    // Kombiniere alle gefilterten Karten für die Navigation
    const allFilteredCards = [
      ...categories.government.filter(({ kind, base }) => matches(kind, base)),
      ...categories.public.filter(({ kind, base }) => matches(kind, base)),
      ...categories.initiatives.filter(({ kind, base }) => matches(kind, base)),
      ...categories.interventions.filter(({ kind, base }) => matches(kind, base))
    ];

    return {
      categories: {
        government: categories.government.filter(({ kind, base }) => matches(kind, base)),
        public: categories.public.filter(({ kind, base }) => matches(kind, base)),
        initiatives: categories.initiatives.filter(({ kind, base }) => matches(kind, base)),
        interventions: categories.interventions.filter(({ kind, base }) => matches(kind, base))
      },
      allFilteredCards
    };
  }, [searchQuery]);



  const builderCanAdd = useCallback((base: BasePolitician | BaseSpecial, kind: 'pol' | 'spec'): boolean => {
    const tier = kind === 'spec' ? (base as BaseSpecial).tier : (base as BasePolitician).T;
    const limit = tier >= 3 ? 1 : 2;
    const entry = deck.find(e => e.kind === kind && e.baseId === base.id);
    const already = entry ? entry.count : 0;
    const cost = kind === 'pol' ? ((base as BasePolitician).BP ?? 0) : (base as BaseSpecial).bp;

    return already < limit && count < 25 && (budget + cost) <= 300;
  }, [deck, budget, count]);

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
    // Clear preset name when manually modifying deck
    setSelectedDeckName('');
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
    // Clear preset name when manually modifying deck
    setSelectedDeckName('');
  }, []);

  const loadPresetDeck = useCallback((which: keyof typeof PRESET_DECKS) => {
    const preset = PRESET_DECKS[which] as BuilderEntry[];
    if (preset && preset.length > 0) {
      setDeck([...preset]);
      // Set deck name for display
      const deckNames = {
        'INITIATIVE_TEST_DECK': '⚡ Initiative Test Deck (10 Karten)',
        'TEST_DECK_WITH_DRAW_EFFECTS': '🧪 Test Deck - Draw Effects (11 Karten)',
        'TEST_DECK_5_CARDS': '🧪 Test Deck (5 Karten)',
        'NEOLIBERAL_TECHNOKRAT': '🏛️ Neoliberaler Technokrat',
        'AUTORITAERER_REALIST': '🦅 Autoritärer Realist',
        'PROGRESSIVER_AKTIVISMUS': '🌱 Progressiver Aktivismus',
        'POPULISTISCHER_OPPORTUNIST': '🎭 Populistischer Opportunist'
      };
      setSelectedDeckName(deckNames[which] || '');
    }
  }, []);



  const handleApplyDeck = useCallback(() => {
    if (count === 25 && budget <= 300) {
      onApplyDeck(deck);
      onClose();
    }
  }, [deck, count, budget, onApplyDeck, onClose]);

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

  // Card Tile Component
  const CardTile = React.memo(({ kind, base, onClick }: {
    kind: 'pol' | 'spec';
    base: BasePolitician | BaseSpecial;
    onClick: () => void;
  }) => (
    <div
      onClick={onClick}
      style={{
        background: '#0f1822',
        border: '1px solid #26394c',
        borderRadius: '8px',
        padding: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        width: '132px',
        height: '180px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#1a2a3a';
        e.currentTarget.style.borderColor = '#3a4c5d';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#0f1822';
        e.currentTarget.style.borderColor = '#26394c';
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
          background: '#0b1118',
          border: '1px solid #1e2c3b',
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
        color: '#dbe9f8',
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
        gap: '6px',
        marginTop: 'auto',
      }}>
        <span style={{
          fontSize: '9px',
          color: '#a9c1da',
          fontWeight: 500,
        }}>
          {kind === 'pol'
            ? `${convertHPToUSD((base as BasePolitician).BP || 0)}`
            : `${convertHPToUSD((base as BaseSpecial).bp)}`
          }
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            builderAdd(base, kind);
          }}
          disabled={!builderCanAdd(base, kind)}
          style={{
            background: '#90EE90',
            color: '#2d572d',
            border: 'none',
            borderRadius: '4px',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: 'bold',
            cursor: 'pointer',
            opacity: builderCanAdd(base, kind) ? 1 : 0.5,
            minWidth: '24px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          +
        </button>
      </div>
    </div>
  ));

  if (!isOpen) return null;

  const HP_LIMIT = 108; // Regelwerk: 108 HP Budget für 25 Karten
  const overBudget = budget > HP_LIMIT;
  const overCount = count > 25;
  const isValid = !overBudget && !overCount;

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
        }}>
          <div style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '.4px' }}>
            Deckbuilder{selectedDeckName ? ` - ${selectedDeckName}` : ''}
          </div>
          <span style={{
            padding: '4px 8px',
            borderRadius: '8px',
            background: '#0f1a26',
            border: '1px solid #203043',
            fontSize: '12px',
          }}>
            Budget: {convertHPToUSD(budget)} / {convertHPToUSD(HP_LIMIT)}
          </span>
          <span style={{
            padding: '4px 8px',
            borderRadius: '8px',
            background: '#0f1a26',
            border: '1px solid #203043',
            fontSize: '12px',
          }}>
            Karten: {count} / 25
          </span>
          <input
            type="text"
            placeholder="Suche (Name, Tag)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: '0 0 220px',
              outline: 'none',
              padding: '4px 8px',
              borderRadius: '8px',
              background: '#0f1a26',
              border: '1px solid #203043',
              fontSize: '12px',
              color: '#e8f0f8',
            }}
          />
          <div style={{ flex: 1 }}></div>
          <button
            onClick={() => loadPresetDeck('INITIATIVE_TEST_DECK')}
            style={{
              background: '#4338ca',
              color: '#ffffff',
              border: '1px solid #6366f1',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '11px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontWeight: 'bold',
            }}
          >
            ⚡ Initiative Test (10 Karten)
          </button>
          <button
            onClick={() => loadPresetDeck('TEST_DECK_WITH_DRAW_EFFECTS')}
            style={{
              background: '#ff6b35',
              color: '#ffffff',
              border: '1px solid #ff8c61',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '11px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontWeight: 'bold',
            }}
          >
            🧪 Draw Effects (11 Karten)
          </button>
          <button
            onClick={() => loadPresetDeck('TEST_DECK_5_CARDS')}
            style={{
              background: '#df6530',
              color: '#ffffff',
              border: '1px solid #e5844c',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '11px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontWeight: 'bold',
            }}
          >
            🧪 Test (5 Karten)
          </button>
          <button
            onClick={() => loadPresetDeck('NEOLIBERAL_TECHNOKRAT')}
            style={{
              background: '#162436',
              color: '#eaf3ff',
              border: '1px solid #27425b',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '11px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            🏛️ Neoliberaler Technokrat
          </button>
          <button
            onClick={() => loadPresetDeck('AUTORITAERER_REALIST')}
            style={{
              background: '#162436',
              color: '#eaf3ff',
              border: '1px solid #27425b',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '11px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            🦅 Autoritärer Realist
          </button>
          <button
            onClick={() => loadPresetDeck('PROGRESSIVER_AKTIVISMUS')}
            style={{
              background: '#162436',
              color: '#eaf3ff',
              border: '1px solid #27425b',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '11px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            🌱 Progressiver Aktivismus
          </button>
          <button
            onClick={() => loadPresetDeck('POPULISTISCHER_OPPORTUNIST')}
            style={{
              background: '#162436',
              color: '#eaf3ff',
              border: '1px solid #27425b',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '11px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            🎭 Populistischer Opportunist
          </button>
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
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '12px',
          }}>
            {/* Regierung Column */}
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
                }}>
                  Regierung
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '11px',
                  color: '#8bb5d9',
                  lineHeight: '1.3',
                }}>
                  Politiker und Staatschefs, die Einfluss geben. Maximal 5 in der Regierungsreihe.
                </p>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))',
                gap: '8px',
                flex: 1,
                justifyContent: 'start',
                alignContent: 'start',
              }}>
                {categorizedCards.categories.government.map(({ kind, base }) => (
                  <CardTile key={`${kind}-${base.id}`} kind={kind} base={base} onClick={() => handleCardClick(kind, base)} />
                ))}
              </div>
            </div>

            {/* Öffentlichkeit Column */}
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
                }}>
                  Öffentlichkeit
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '11px',
                  color: '#d2b48c',
                  lineHeight: '1.3',
                }}>
                  Personen aus Medien, Wirtschaft und Wissenschaft, die deine Aktionen unterstützen.
                </p>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))',
                gap: '8px',
                flex: 1,
                justifyContent: 'start',
                alignContent: 'start',
              }}>
                {categorizedCards.categories.public.map(({ kind, base }) => (
                  <CardTile key={`${kind}-${base.id}`} kind={kind} base={base} onClick={() => handleCardClick(kind, base)} />
                ))}
              </div>
            </div>

            {/* Initiativen Column */}
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
                }}>
                  Initiativen
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '11px',
                  color: '#40e0d0',
                  lineHeight: '1.3',
                }}>
                  Einmalige (Sofort) und dauerhafte politische Aktionen für spezielle Effekte.
                </p>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))',
                gap: '8px',
                flex: 1,
                justifyContent: 'start',
                alignContent: 'start',
              }}>
                {categorizedCards.categories.initiatives.map(({ kind, base }) => (
                  <CardTile key={`${kind}-${base.id}`} kind={kind} base={base} onClick={() => handleCardClick(kind, base)} />
                ))}
              </div>
            </div>

            {/* Interventionen Column */}
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
                }}>
                  Interventionen
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '11px',
                  color: '#c8a0ff',
                  lineHeight: '1.3',
                }}>
                  Verdeckte Fallenkarten, die automatisch auslösen und gegnerische Strategien stören.
                </p>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))',
                gap: '8px',
                flex: 1,
                justifyContent: 'start',
                alignContent: 'start',
              }}>
                {categorizedCards.categories.interventions.map(({ kind, base }) => (
                  <CardTile key={`${kind}-${base.id}`} kind={kind} base={base} onClick={() => handleCardClick(kind, base)} />
                ))}
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
              flexWrap: 'wrap',
              gap: '6px',
              alignItems: 'center',
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
                {isValid ? 'Deck OK' : `Deck ungültig${overBudget ? ' · Budget' : ''}${overCount ? ' · Karten' : ''}`}
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
                      <div>{convertHPToUSD(entry.kind === 'pol' ? (base as BasePolitician).BP || 0 : (base as BaseSpecial).bp)}</div>
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
                Als P1-Deck verwenden
              </button>
              <button
                onClick={handleStartMatch}
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
                Match starten
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
                      {cardDetails?.category || (selectedCard.kind === 'pol' ? 'Regierung' : 'Öffentlichkeit')}
                    </div>

                    {/* Subcategories */}
                    {cardDetails?.subcategories && cardDetails.subcategories.length > 0 && (
                      <div style={{
                        fontSize: '14px',
                        color: '#a9c1da',
                        marginBottom: '4px',
                      }}>
                        {cardDetails.subcategories.join(', ')}
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
                        <span>Einfluss: {(selectedCard.base as any).influence}</span>
                        <span>Tier: {(selectedCard.base as any).T}</span>
                        <span>Schlüsselwort: {(selectedCard.base as any).tag}</span>
                      </div>
                    )}

                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280',
                    fontWeight: 500,
                  }}>
                    Karte {categorizedCards.allFilteredCards.findIndex(
                      card => card.kind === selectedCard.kind && card.base.id === selectedCard.base.id
                    ) + 1} von {categorizedCards.allFilteredCards.length}
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
                      Kosten: {convertHPToUSD(cardDetails?.deckCost || (selectedCard.kind === 'pol' ? (selectedCard.base as BasePolitician).BP || 0 : (selectedCard.base as BaseSpecial).bp))}
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
                    Spieleffekt
                </h3>

                  <p style={{
                    margin: 0,
                    color: '#d1d5db',
                    lineHeight: '1.5',
                    fontSize: '15px',
                  }}>
                    {cardDetails?.gameEffect || (selectedCard.kind === 'spec'
                      ? (selectedCard.base as BaseSpecial).effect
                      : 'Passive Politiker-Fähigkeiten basierend auf Tag')}
                  </p>
              </div>

                {/* Synergy for Öffentlichkeit */}
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
                      Synergie
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
                      Auslöser
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
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Wann spielen?</div>
                        <div style={{ color: '#d1d5db', fontSize: '15px', lineHeight: '1.5' }}>{cardDetails.usage}</div>
                      </div>
                    )}
                    {cardDetails.example && (
                      <div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Beispiel</div>
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
                      Persönliche Informationen
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      {cardDetails.nationality && (
                        <div>
                          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Staatsangehörigkeit</div>
                          <div style={{ color: '#e5e7eb', fontWeight: 500 }}>{cardDetails.nationality}</div>
                        </div>
                      )}

                      {cardDetails.birthDate && (
                        <div>
                          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Geburtsdatum</div>
                          <div style={{ color: '#e5e7eb', fontWeight: 500 }}>{cardDetails.birthDate}</div>
                        </div>
                      )}
                    </div>

                    {cardDetails.estimatedWealth && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Geschätztes Vermögen</div>
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
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>Zitat</div>
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
                          Quellen anzeigen
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
                  Zum Deck hinzufügen
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
                    Quellen & Berechnungsgrundlage
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
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>Rechenweg:</div>
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

                <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px' }}>Quellen:</div>
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
