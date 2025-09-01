import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Card, PoliticianCard, SpecialCard } from '../types/game';
import { Specials } from '../data/gameData';
import { drawCardImage, sortHandCards } from '../utils/gameUtils';
import { getCardDetails, convertHPToUSD } from '../data/cardDetails';
import { withIcons } from '../ui/withIcons';
import { makeUid } from '../utils/id';
import { wouldBeNetZero, getNetApCost } from '../utils/ap';

interface HandCardModalProps {
  gameState: GameState;
  selectedHandIndex: number | null;
  isVisible: boolean;
  onClose: () => void;
  onPlayCard: (index: number, targetSlot?: string) => void;
}

export const HandCardModal: React.FC<HandCardModalProps> = ({
  gameState,
  selectedHandIndex,
  isVisible,
  onClose,
  onPlayCard
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [waitingForReplacement, setWaitingForReplacement] = useState<string | null>(null);

  // 🔧 DEV MODE: Unterstützung für beide Player
  const currentPlayer = gameState.current;
  const sortedHand = sortHandCards(gameState.hands[currentPlayer]);
  const currentCard = sortedHand[currentIndex];

  // Safety: Falls die Karte (aus Altbeständen) keine uid hat, vergib temporär eine (nur UI-seitig)
  if (currentCard && !(currentCard as any).uid) {
    (currentCard as any).uid = makeUid('card_ui');
  }

  // Update current index when selectedHandIndex changes
  useEffect(() => {
    if (selectedHandIndex !== null && isVisible) {
      const selectedCard = gameState.hands[currentPlayer][selectedHandIndex];
      const sortedIndex = sortedHand.findIndex((card: Card) => card.uid === selectedCard?.uid);
      if (sortedIndex !== -1) {
        setCurrentIndex(sortedIndex);
      }
    }
  }, [selectedHandIndex, isVisible, currentPlayer]); // Removed gameState.hands and sortedHand to prevent infinite loop



  // Get target slot for card - commented out as unused
  // const getTargetSlot = useCallback((card: Card) => {
  //   if (card.kind === 'pol') {
  //     const polCard = card as PoliticianCard;
  //     const isGovernment = ['Staatsoberhaupt', 'Regierungschef', 'Diplomat', 'Minister', 'Abgeordneter', 'Berater'].includes(polCard.tag);
  //     return isGovernment ? 'aussen' : 'innen';
  //   } else {
  //     const specCard = card as SpecialCard;
  //     if (specCard.type === 'Öffentlichkeitskarte') {
  //       return 'innen'; // Public cards go to public row
  //     }
  //     if (specCard.type === 'Dauerhaft-Initiative') {
  //       // Would need to determine government vs public based on card effect
  //       return 'permanent_government'; // or 'permanent_public'
  //     }
  //     if (specCard.type === 'Sofort-Initiative') {
  //       return 'instant';
  //     }
  //     if (specCard.type === 'Intervention') {
  //       return 'intervention';
  //     }
  //   }
  //   return null;
  // }, []);

  // Check if target slot is full
  const isSlotFull = useCallback((slot: string) => {
    switch (slot) {
      case 'aussen':
        return gameState.board[currentPlayer].aussen.length >= 5;
      case 'innen':
        return gameState.board[currentPlayer].innen.length >= 5;
      case 'permanent_government':
        return gameState.permanentSlots[currentPlayer].government !== null;
      case 'permanent_public':
        return gameState.permanentSlots[currentPlayer].public !== null;
      case 'instant':
        return gameState.board[currentPlayer].sofort.length > 0;
      case 'intervention':
        return gameState.traps[currentPlayer].length >= 6;
      default:
        return false;
    }
  }, [gameState, currentPlayer]);

  // Helper functions for safe index mapping
  const findOriginalIndexByUid = useCallback((hand: Card[], uid?: string): number => {
    if (!Array.isArray(hand) || !uid) return -1;
    return hand.findIndex(c => (c as any).uid === uid);
  }, []);

  const targetSlotFromCard = useCallback((c: Card): 'innen' | 'aussen' => {
    const any = c as any;
    // Heuristik wie in useGameActions: Diplomaten/Regierungschefs außen
    if (c.kind === 'pol' && ['Staatsoberhaupt','Regierungschef','Diplomat'].includes(any.tag)) return 'aussen';
    if (c.kind === 'pol') return 'aussen';
    if (c.kind === 'spec' && any.type === 'Öffentlichkeitskarte') return 'innen';
    return 'innen';
  }, []);

  // Handle automatic card placement
  const handleAutoPlay = useCallback(() => {
    const card = sortedHand[currentIndex];
    if (!card) {
      return;
    }

    const hand = gameState.hands[currentPlayer];
    let originalIndex = findOriginalIndexByUid(hand, (card as any).uid);
    if (originalIndex < 0) {
      // Fallbacks: Name-Match → erster Treffer → sichtbarer Index
      const byName = hand.findIndex(h => h.name === card.name);
      originalIndex = byName >= 0 ? byName : currentIndex;
      console.warn('[Modal] UID not found. Fallback index used:', originalIndex);
    }

    const targetSlot = targetSlotFromCard(card);



    if (isSlotFull(targetSlot)) {
      console.log('❌ DEBUG: Slot is full');
      setWaitingForReplacement(targetSlot);
      return;
    }

    console.log('🔧 DEBUG: Calling onPlayCard with:', originalIndex, targetSlot);
    onPlayCard(originalIndex, targetSlot);
    onClose();
  }, [sortedHand, currentIndex, gameState.hands, currentPlayer, findOriginalIndexByUid, targetSlotFromCard, isSlotFull, onPlayCard, onClose]);

  // Keyboard navigation
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          setCurrentIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowRight':
          event.preventDefault();
          setCurrentIndex(prev => Math.min(sortedHand.length - 1, prev + 1));
          break;
        case 'Escape':
          event.preventDefault();
          onClose();
          break;
        case 'Enter':
          event.preventDefault();
          handleAutoPlay();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, sortedHand.length, onClose, setCurrentIndex, handleAutoPlay]);

  // Handle replacement selection (TODO: Implement replacement logic)
  // const handleReplacementClick = useCallback((targetCard: Card) => {
  //   if (!waitingForReplacement || !currentCard) return;
  //   const originalIndex = gameState.hands[currentPlayer].findIndex(c => c.uid === currentCard.uid);
  //   onPlayCard(originalIndex, waitingForReplacement);
  //   setWaitingForReplacement(null);
  //   onClose();
  // }, [waitingForReplacement, currentCard, gameState.hands, onPlayCard, onClose]);

  if (!isVisible || !currentCard) {
    return null;
  }

  const cardDetails = getCardDetails(currentCard.name);
  // const hand = gameState.hands[currentPlayer]; // unused
  // const sel = selectedHandIndex != null ? hand[selectedHandIndex] : null; // unused
  const laneHint = (currentCard.kind === 'pol')
    ? ((currentCard as any).tag === 'Staatsoberhaupt' || (currentCard as any).tag === 'Regierungschef' || (currentCard as any).tag === 'Diplomat' ? 'aussen' : 'innen')
    : 'innen';

  // Modal/Play-Gate: "nur Zero-AP möglich" korrekt behandeln
  const { net } = getNetApCost(gameState, currentPlayer, currentCard, laneHint);
  const wouldZero = net <= 0;
  const actionsUsed = gameState.actionsUsed[currentPlayer];
  const canPlay = actionsUsed < 2 || wouldZero;
  const onlyZeroApPossible = actionsUsed >= 2 && wouldZero;



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
      justifyContent: 'center',
      zIndex: 1500,
    }}>
      <div style={{
        background: '#0d1621',
        border: '3px solid #ffffff',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        gap: '24px',
        width: 'calc(35vw)', // 50% smaller than deckbuilder
        height: 'calc(45vh)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Card Image */}
        <div style={{
          flex: '0 0 512px', // 50% of 1024px
          height: '512px',
          background: '#0b1118',
          border: '2px solid #ffffff',
          clipPath: 'polygon(50px 0, calc(100% - 50px) 0, 100% 50px, 100% 100%, 0 100%, 0 50px)',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Navigation Arrows */}
          <button
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
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
              cursor: currentIndex > 0 ? 'pointer' : 'not-allowed',
              color: '#eaf3ff',
              fontSize: '20px',
              fontWeight: 'bold',
              zIndex: 10,
              opacity: currentIndex > 0 ? 1 : 0.5,
            }}
          >
            ‹
          </button>

          <button
            onClick={() => setCurrentIndex(prev => Math.min(sortedHand.length - 1, prev + 1))}
            disabled={currentIndex === sortedHand.length - 1}
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
              cursor: currentIndex < sortedHand.length - 1 ? 'pointer' : 'not-allowed',
              color: '#eaf3ff',
              fontSize: '20px',
              fontWeight: 'bold',
              zIndex: 10,
              opacity: currentIndex < sortedHand.length - 1 ? 1 : 0.5,
            }}
          >
            ›
          </button>

          <canvas
            width={512}
            height={512}
            style={{
              display: 'block',
              width: '512px',
              height: '512px',
              clipPath: 'polygon(50px 0, calc(100% - 50px) 0, 100% 50px, 100% 100%, 0 100%, 0 50px)',
            }}
            ref={(canvas) => {
              if (canvas && currentCard) {
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  drawCardImage(ctx, currentCard, 0, 0, 512, 'modal');
                }
              }
            }}
          />
        </div>

        {/* Card Information */}
        <div style={{
          flex: '1',
          minWidth: '200px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          position: 'relative',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}>
            <div>
              <h2 style={{
                margin: '0 0 4px 0',
                fontSize: '20px',
                fontWeight: 700,
                color: '#eaf3ff',
                lineHeight: '1.2',
              }}>
                {currentCard.name}
              </h2>

              <div style={{
                fontSize: '12px',
                color: '#6b7280',
                fontWeight: 500,
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}>
                <span>Karte {currentIndex + 1} von {sortedHand.length}</span>
                <span style={{
                  background: currentPlayer === 1 ? '#4ade80' : '#ef4444',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                }}>
                  P{currentPlayer}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#8faecc',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
              }}
            >
              ×
            </button>
          </div>

          {/* Card Type and Cost */}
          <div style={{
            background: '#111827',
            border: '1px solid #ffffff',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '12px',
          }}>
            <div style={{ color: '#9ca3af', marginBottom: '4px' }}>Typ & Kosten</div>
            <div style={{ color: '#e5e7eb' }}>
              {currentCard.kind === 'pol'
                ? `Regierung/Öffentlichkeit • ${convertHPToUSD((currentCard as PoliticianCard).BP || 0)}`
                : `${(currentCard as SpecialCard).type} • ${convertHPToUSD((currentCard as SpecialCard).bp)}`
              }
            </div>
            {/* Show subcategories for public cards */}
            {cardDetails?.subcategories && cardDetails.subcategories.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ color: '#9ca3af', marginBottom: '4px' }}>Schlüsselwörter</div>
                <div style={{ color: '#e5e7eb', fontSize: '11px' }}>
                  {withIcons(cardDetails.subcategories.join(', '), 12)}
                </div>
              </div>
            )}
          </div>

          {/* AP Breakdown */}
          <div style={{
            background: '#111827',
            border: '1px solid #ffffff',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '12px',
          }}>
            <div style={{ color: '#9ca3af', marginBottom: '8px', fontWeight: '600' }}>AP-Kosten</div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#e5e7eb',
              marginBottom: '4px'
            }}>
              <span>Basis</span>
              <span>
                1 AP → <strong>−1</strong>
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              color: '#e5e7eb',
              marginBottom: '4px'
            }}>
              <span>Refunds</span>
              <span>
                <strong>+{1 - net}</strong>
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '8px',
              padding: '6px 8px',
              background: net === 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
              border: `1px solid ${net === 0 ? '#10b981' : '#f59e0b'}`,
              borderRadius: '4px',
              fontWeight: '600'
            }}>
              <span style={{ color: net === 0 ? '#10b981' : '#f59e0b' }}>Netto</span>
              <span style={{ color: net === 0 ? '#10b981' : '#f59e0b' }}>
                {net} AP {net === 0 ? '· verbraucht keine Aktion' : ''}
              </span>
            </div>
          </div>

          {/* Game Effect */}
          <div style={{
            background: '#111827',
            border: '1px solid #ffffff',
            borderRadius: '8px',
            padding: '12px',
            flex: 1,
          }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: 600,
              color: '#e5e7eb',
            }}>
              Spieleffekt
            </h3>
            <p style={{
              margin: 0,
              color: '#d1d5db',
              lineHeight: '1.4',
              fontSize: '12px',
            }}>
              {cardDetails?.gameEffect ? withIcons(cardDetails.gameEffect, 14) : (currentCard.kind === 'spec'
                ? (() => {
                    const specCard = currentCard as SpecialCard;
                    const baseSpecial = Specials.find(s => s.id === specCard.baseId);
                    return baseSpecial?.effect || 'Keine Beschreibung verfügbar';
                  })()
                : 'Politiker-Fähigkeiten basierend auf Tag')}
            </p>
          </div>

          {/* Auto-Play Button */}
          <button
            disabled={!canPlay}
            onClick={() => {
              console.log('🔧 DEBUG: Button clicked!');
              handleAutoPlay();
            }}
            style={{
              background: waitingForReplacement
                ? 'linear-gradient(45deg, #f59e0b, #f97316)'
                : canPlay
                ? 'linear-gradient(45deg, #10b981, #059669)'
                : 'linear-gradient(45deg, #6b7280, #4b5563)',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 16px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: canPlay ? 'pointer' : 'not-allowed',
              animation: canPlay ? 'pulse 2s infinite' : 'none',
              boxShadow: canPlay ? '0 4px 16px rgba(16, 185, 129, 0.4)' : 'none',
            }}
          >
            {waitingForReplacement
              ? 'Karte zum Tauschen wählen'
              : canPlay
              ? `Spielen (Netto ${net} AP)`
              : 'Nicht spielbar'}
          </button>

          {/* Guard-Hinweis für detaillierte Begründung */}
          {!canPlay && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              padding: '8px 12px',
              color: '#f87171',
              fontSize: '12px',
              textAlign: 'center',
            }}>
              ⚠️ {(() => {
                const currentAP = gameState.actionPoints[currentPlayer] ?? 0;
                if (currentAP < net) {
                  return `Zu wenig AP: benötigt ${net}, vorhanden ${currentAP}`;
                }
                if (actionsUsed >= 2 && net > 0) {
                  return 'Nur Netto-0-Züge erlaubt (Aktionslimit erreicht)';
                }
                return 'Karte kann nicht gespielt werden';
              })()}
            </div>
          )}

          {/* Info-Hinweis für 0-AP-Züge */}
          {onlyZeroApPossible && (
            <div style={{
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid #3b82f6',
              borderRadius: '6px',
              padding: '8px 12px',
              color: '#60a5fa',
              fontSize: '12px',
              textAlign: 'center',
            }}>
              0-AP-Zug verfügbar – spiele unbegrenzt viele Karten mit Netto 0 AP!
            </div>
          )}

          {waitingForReplacement && (
            <div style={{
              fontSize: '11px',
              color: '#f59e0b',
              textAlign: 'center',
              marginTop: '4px',
            }}>
              Slot ist voll - klicke auf eine Karte zum Ersetzen
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
};
