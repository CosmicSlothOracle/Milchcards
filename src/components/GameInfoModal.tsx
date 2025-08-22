import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GameState } from '../types/game';

interface GameInfoModalProps {
  gameState: GameState;
  isVisible: boolean;
  onToggle: () => void;
  onPassTurn: (player: 1 | 2) => void;
  onToggleLog: () => void;
  onCardClick: (data: any) => void;
  devMode?: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

export const GameInfoModal: React.FC<GameInfoModalProps> = ({
  gameState,
  isVisible,
  onToggle,
  onPassTurn,
  onToggleLog,
  onCardClick,
  devMode = false
}) => {
  const [position, setPosition] = useState<Position>({ x: 50, y: 50 });
  const [size, setSize] = useState<Size>({ width: 320, height: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState<{ pos: Position; size: Size }>({
    pos: { x: 0, y: 0 },
    size: { width: 0, height: 0 }
  });
  const [currentInfluence, setCurrentInfluence] = useState({ player: 0, opponent: 0 });
  const [influenceAnimation, setInfluenceAnimation] = useState<{
    player: 'none' | 'success' | 'loss' | 'losing' | 'winning';
    opponent: 'none' | 'success' | 'loss' | 'losing' | 'winning';
  }>({ player: 'none', opponent: 'none' });
  const [showPassConfirmation, setShowPassConfirmation] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);







  // Reset pass confirmation after 3 seconds
  useEffect(() => {
    if (showPassConfirmation) {
      const timer = setTimeout(() => {
        setShowPassConfirmation(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showPassConfirmation]);

  // Calculate current influence
  const calculateInfluence = useCallback(() => {
    // Regelwerk: Alle Karten auf dem Board zählen für Einfluss
    const calculatePlayerInfluence = (player: 1 | 2): number => {
      let totalInfluence = 0;

      // Count influence from cards on board (innen + aussen)
      const playerBoard = gameState.board[player];
      [...playerBoard.innen, ...playerBoard.aussen].forEach(card => {
        if (card.kind === 'pol') {
          totalInfluence += (card as any).influence || 0;
        }
      });

      // Count influence from permanent slots
      const permanentSlots = gameState.permanentSlots[player];
      if (permanentSlots.government && permanentSlots.government.kind === 'pol') {
        totalInfluence += (permanentSlots.government as any).influence || 0;
      }
      if (permanentSlots.public && permanentSlots.public.kind === 'pol') {
        totalInfluence += (permanentSlots.public as any).influence || 0;
      }

      return totalInfluence;
    };

    const playerInfluence = calculatePlayerInfluence(1);
    const opponentInfluence = calculatePlayerInfluence(2);

    return { player: playerInfluence, opponent: opponentInfluence };
  }, [gameState]);

  // Update influence and trigger animations
  useEffect(() => {
    const newInfluence = calculateInfluence();
    const prevPlayer = currentInfluence.player;
    const prevOpponent = currentInfluence.opponent;

    // Determine animation types
    let playerAnim: typeof influenceAnimation.player = 'none';
    let opponentAnim: typeof influenceAnimation.opponent = 'none';

    if (newInfluence.player > prevPlayer) {
      playerAnim = 'success';
    } else if (newInfluence.player < prevPlayer) {
      playerAnim = 'loss';
    }

    if (newInfluence.opponent > prevOpponent) {
      opponentAnim = 'success';
    } else if (newInfluence.opponent < prevOpponent) {
      opponentAnim = 'loss';
    }

    // Check winning/losing status
    if (newInfluence.player > newInfluence.opponent) {
      playerAnim = playerAnim === 'none' ? 'winning' : playerAnim;
      opponentAnim = opponentAnim === 'none' ? 'losing' : opponentAnim;
    } else if (newInfluence.opponent > newInfluence.player) {
      playerAnim = playerAnim === 'none' ? 'losing' : playerAnim;
      opponentAnim = opponentAnim === 'none' ? 'winning' : opponentAnim;
    }

    // Only update influence state when it actually changes to prevent loops
    if (newInfluence.player !== prevPlayer || newInfluence.opponent !== prevOpponent) {
      setCurrentInfluence(newInfluence);
    }

    // Avoid unnecessary animation state churn
    setInfluenceAnimation(prev => {
      const next = { player: playerAnim, opponent: opponentAnim } as typeof prev;
      if (prev.player === next.player && prev.opponent === next.opponent) return prev;
      return next;
    });

    // Reset animations after delay
    const timer = setTimeout(() => {
      setInfluenceAnimation(prev => (prev.player === 'none' && prev.opponent === 'none' ? prev : { player: 'none', opponent: 'none' }));
    }, 1000);

    return () => clearTimeout(timer);
  }, [gameState, calculateInfluence]);

  // Check if a player has matchball (needs only 1 more round to win or leading by 3+ influence)
  const getMatchballStatus = () => {
    // Check rounds won first
    const player1Wins = gameState.roundsWon[1];
    const player2Wins = gameState.roundsWon[2];

    if (player1Wins === 1 && player2Wins < 1) {
      return { player: 1, hasMatchball: true };
    } else if (player2Wins === 1 && player1Wins < 1) {
      return { player: 2, hasMatchball: true };
    }

    // Check current influence lead (3+ points = matchball)
    const p1Influence = currentInfluence.player;
    const p2Influence = currentInfluence.opponent;
    const leadDifference = Math.abs(p1Influence - p2Influence);

    if (leadDifference >= 3) {
      return {
        hasMatchball: true,
        player: p1Influence > p2Influence ? 1 : 2
      };
    }

    return { player: null, hasMatchball: false };
  };

  // Mouse handlers for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('resize-handle')) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    } else if (isResizing) {
      const newWidth = Math.max(250, e.clientX - resizeStart.pos.x + resizeStart.size.width);
      const newHeight = Math.max(300, e.clientY - resizeStart.pos.y + resizeStart.size.height);
      setSize({ width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, dragStart, resizeStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  // Resize handle
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      pos: { x: e.clientX, y: e.clientY },
      size: { ...size }
    });
  }, [size]);

  useEffect(() => {
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Get game phase text
  const getGamePhase = () => {
    if (gameState.passed[1] && gameState.passed[2]) {
      return 'Rundenauswertung';
    }
    return `Runde ${gameState.round}`;
  };

  // Get player turn text with detailed status
  const getPlayerTurn = () => {
    if (gameState.passed[1] && gameState.passed[2]) {
      return 'Runde beendet - Auswertung läuft';
    }

    const currentPlayer = gameState.current;
    const remainingAP = gameState.actionPoints[currentPlayer];
    const actionsUsed = gameState.actionsUsed[currentPlayer];

    if (currentPlayer === 1) {
      if (remainingAP <= 0 || actionsUsed >= 2) {
        return 'Dein Zug beendet - Klicke weiter';
      }
      return `Dein Zug - ${remainingAP} AP übrig (${actionsUsed}/2 Aktionen)`;
    } else {
      if (remainingAP <= 0 || actionsUsed >= 2) {
        return 'Gegner beendet Zug';
      }
      return `Gegner am Zug - ${remainingAP} AP übrig`;
    }
  };

  // Influence animation styles
  const getInfluenceStyle = (type: typeof influenceAnimation.player) => {
    const baseStyle = {
      fontSize: '32px',
      fontWeight: 'bold',
      textAlign: 'center' as const,
      transition: 'all 0.3s ease',
      textShadow: '0 0 8px rgba(0,0,0,0.5)'
    };

    switch (type) {
      case 'success':
        return { ...baseStyle, color: '#4ade80', transform: 'scale(1.2)', textShadow: '0 0 12px #4ade80' };
      case 'loss':
        return { ...baseStyle, color: '#ef4444', transform: 'scale(0.9)', textShadow: '0 0 12px #ef4444' };
      case 'winning':
        return { ...baseStyle, color: '#fbbf24', textShadow: '0 0 8px #fbbf24' };
      case 'losing':
        return { ...baseStyle, color: '#374151', textShadow: '0 0 8px #374151' };
      default:
        return { ...baseStyle, color: '#e5e7eb' };
    }
  };

  if (!isVisible) return null;

  return (
    <div
      ref={modalRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        background: 'rgba(13, 22, 33, 0.05)',
        border: '1px solid rgba(255, 255, 255, 1)',
        borderRadius: '12px',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header - AP Counter and Pass Button */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: '600' }}>
            AP
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {[0, 1].map((index) => {
              const currentPlayer = gameState.current;
              const remainingAP = gameState.actionPoints[currentPlayer];
              const isUsed = index >= remainingAP;
              return (
                <div
                  key={index}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: isUsed
                      ? 'rgba(239, 68, 68, 0.8)'
                      : 'rgba(34, 197, 94, 0.9)',
                    boxShadow: isUsed
                      ? '0 0 8px rgba(239, 68, 68, 0.6)'
                      : '0 0 12px rgba(34, 197, 94, 0.8)',
                    border: isUsed
                      ? '1px solid rgba(239, 68, 68, 1)'
                      : '1px solid rgba(34, 197, 94, 1)',
                    transition: 'all 0.3s ease'
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Action Buttons - Show for current player (P1 always, P2 only in dev mode) */}
        {((gameState.current === 1 && !gameState.passed[1]) || (devMode && gameState.current === 2 && !gameState.passed[2])) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

            {/* End Turn Button - Blue */}
            <button
              onClick={() => {
                console.log(`🔧 DEBUG: End turn clicked for player ${gameState.current}`);
                onCardClick({ type: 'button_end_turn', player: gameState.current });
              }}
              style={{
                background: 'linear-gradient(45deg, #3b82f6, #2563eb)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                color: 'white',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(59, 130, 246, 0.4)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Beendet nur deinen Zug – die Runde läuft weiter."
            >
              Zug beenden
            </button>

            {/* Pass Button - Red */}
            {showPassConfirmation ? (
              <button
                onClick={() => {
                  console.log(`🔧 DEBUG: Pass confirmation clicked for player ${gameState.current}`);
                  onCardClick({ type: 'button_pass_turn', player: gameState.current });
                  setShowPassConfirmation(false);
                }}
                style={{
                  background: 'linear-gradient(45deg, #dc2626, #b91c1c)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.4)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Wirklich passen
              </button>
            ) : (
              <button
                onClick={() => setShowPassConfirmation(true)}
                style={{
                  background: 'linear-gradient(45deg, #ef4444, #dc2626)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                Passen
              </button>
            )}


          </div>
        )}

        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px'
          }}
        >
          ×
        </button>

        {/* Log Button */}
        <button
          onClick={onToggleLog}
          style={{
            background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 12px',
            color: 'white',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
            transition: 'all 0.2s ease',
            marginRight: '8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          📋 Log
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '16px', height: 'calc(100% - 60px)', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Game End Victory Screen */}
        {gameState.gameWinner && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.95), rgba(34, 197, 94, 0.95))',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            borderRadius: '12px',
            backdropFilter: 'blur(8px)',
            animation: 'victoryPulse 2s infinite'
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
              animation: 'bounce 1s infinite'
            }}>
              🏆
            </div>
            <div style={{
              color: 'white',
              fontSize: '24px',
              fontWeight: '800',
              textAlign: 'center',
              marginBottom: '8px',
              textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
            }}>
              {gameState.gameWinner === 1 ? 'DU GEWINNST!' : 'GEGNER GEWINNT!'}
            </div>
            <div style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '18px',
              fontWeight: '600',
              textAlign: 'center',
              marginBottom: '12px',
              textShadow: '0 1px 4px rgba(0, 0, 0, 0.3)'
            }}>
              Spieler {gameState.gameWinner} ist der Sieger!
            </div>
            <div style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '16px',
              fontWeight: '500',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '8px 16px',
              borderRadius: '8px',
              backdropFilter: 'blur(4px)'
            }}>
              Rundenstand: {gameState.roundsWon[1]} - {gameState.roundsWon[2]}
            </div>
          </div>
        )}
        {/* Game Phase with Matchball */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>
            Spielphase
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}>
            <div style={{ color: '#e5e7eb', fontSize: '16px', fontWeight: '600' }}>
              {getGamePhase()}
            </div>
            {(() => {
              const matchball = getMatchballStatus();
              if (matchball.hasMatchball) {
                const isPlayer = matchball.player === 1;
                return (
                  <div
                    style={{
                      color: isPlayer ? '#00ff88' : '#ff6b6b',
                      fontSize: '14px',
                      fontWeight: '700',
                      textShadow: `0 0 8px ${isPlayer ? '#00ff88' : '#ff6b6b'}`,
                      animation: 'matchballPulse 2s ease-in-out infinite',
                      padding: '4px 8px',
                      border: `1px solid ${isPlayer ? '#00ff88' : '#ff6b6b'}`,
                      borderRadius: '12px',
                      backgroundColor: `${isPlayer ? '#00ff8820' : '#ff6b6b20'}`,
                    }}
                  >
                    {isPlayer ? '🎯 MATCHBALL' : '⚠️ MATCHBALL'}
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>

        {/* Player Turn */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>
            Status
          </div>
          <div style={{ color: '#fbbf24', fontSize: '14px', fontWeight: '500' }}>
            {getPlayerTurn()}
          </div>
        </div>

        {/* Action Points */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>
              Deine AP
            </div>
            <div style={{
              color: gameState.actionPoints[1] > 0 ? '#00ff88' : '#ef4444',
              fontSize: '18px',
              fontWeight: '700',
              textShadow: '0 0 4px currentColor'
            }}>
              {gameState.actionPoints[1]}/2
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>
              Gegner AP
            </div>
            <div style={{
              color: gameState.actionPoints[2] > 0 ? '#00ff88' : '#ef4444',
              fontSize: '18px',
              fontWeight: '700',
              textShadow: '0 0 4px currentColor'
            }}>
              {gameState.actionPoints[2]}/2
            </div>
          </div>
        </div>

        {/* Influence Points */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>
              Dein Einfluss
            </div>
            <div style={getInfluenceStyle(influenceAnimation.player)}>
              {currentInfluence.player}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>
              Gegner Einfluss
            </div>
            <div style={getInfluenceStyle(influenceAnimation.opponent)}>
              {currentInfluence.opponent}
            </div>
          </div>
        </div>

        {/* Round Wins Counter */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '8px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>
              Deine Runden
            </div>
            <div style={{
              color: gameState.roundsWon[1] >= 2 ? '#00ff88' : '#fbbf24',
              fontSize: '18px',
              fontWeight: '700',
              textShadow: '0 0 4px currentColor'
            }}>
              {gameState.roundsWon[1]}/3
              {gameState.roundsWon[1] >= 2 && (
                <span style={{
                  marginLeft: '8px',
                  fontSize: '14px',
                  animation: 'matchballPulse 1.5s infinite'
                }}>
                  🏆
                </span>
              )}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#9ca3af', fontSize: '11px', marginBottom: '4px' }}>
              Gegner Runden
            </div>
            <div style={{
              color: gameState.roundsWon[2] >= 2 ? '#00ff88' : '#fbbf24',
              fontSize: '18px',
              fontWeight: '700',
              textShadow: '0 0 4px currentColor'
            }}>
              {gameState.roundsWon[2]}/3
              {gameState.roundsWon[2] >= 2 && (
                <span style={{
                  marginLeft: '8px',
                  fontSize: '14px',
                  animation: 'matchballPulse 1.5s infinite'
                }}>
                  🏆
                </span>
              )}
            </div>
          </div>
        </div>


      </div>

      {/* Resize Handle */}
      <div
        className="resize-handle"
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '16px',
          height: '16px',
          background: 'rgba(255, 255, 255, 0.6)',
          cursor: 'nw-resize',
          borderRadius: '0 0 12px 0',
          clipPath: 'polygon(100% 0, 0 100%, 100% 100%)'
        }}
        onMouseDown={handleResizeStart}
      />

      <style>{`
        @keyframes matchballPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
        }
        @keyframes victoryPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.6);
          }
          50% {
            transform: scale(1.02);
            box-shadow: 0 0 40px rgba(0, 255, 136, 0.8);
          }
        }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-10px);
          }
          60% {
            transform: translateY(-5px);
          }
        }
      `}</style>
    </div>
  );
};
