import React, { useState, useCallback } from 'react';
import { GameState } from '../types/game';
import { Icon } from '../ui/Icon';
import { withIcons } from '../ui/withIcons';

interface GameLogModalProps {
  gameState: GameState;
  isVisible: boolean;
  onToggle: () => void;
}

export const GameLogModal: React.FC<GameLogModalProps> = ({
  gameState,
  isVisible,
  onToggle
}) => {
  const [copied, setCopied] = useState(false);

  const copyLogToClipboard = useCallback(async () => {
    try {
      const logText = gameState.log.join('\n');
      await navigator.clipboard.writeText(logText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy log:', err);
    }
  }, [gameState.log]);

  const clearLog = useCallback(() => {
    // This would need to be implemented in the game state
    console.log('Clear log functionality would be implemented here');
  }, []);

  if (!isVisible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '80vw',
      height: '80vh',
      background: 'rgba(13, 22, 33, 0.5)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '12px',
      backdropFilter: 'blur(10px)',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '12px 12px 0 0',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{
            color: '#e5e7eb',
            fontSize: '18px',
            fontWeight: '600',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
          }}>
            <Icon name="game_log" size={20} />
            Game Log
          </div>
          <div style={{
            color: '#9ca3af',
            fontSize: '14px',
          }}>
            {gameState.log.length} entries
          </div>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
        }}>
          {/* Copy Button */}
          <button
            onClick={copyLogToClipboard}
            style={{
              background: copied
                ? 'linear-gradient(45deg, #22c55e, #16a34a)'
                : 'linear-gradient(45deg, #3b82f6, #2563eb)',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              color: 'white',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
                         {copied ? (
               <>
                 <Icon name="copy_log" size={14} />
                 Copied!
               </>
             ) : (
               <>
                 <Icon name="copy_log" size={14} />
                 Copy
               </>
             )}
          </button>

          {/* Clear Button */}
          <button
            onClick={clearLog}
            style={{
              background: 'linear-gradient(45deg, #ef4444, #dc2626)',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              color: 'white',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Icon name="clear_log" size={14} />
            Clear
          </button>

          {/* Close Button */}
          <button
            onClick={onToggle}
            style={{
              background: 'none',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              padding: '8px 12px',
              color: '#9ca3af',
              fontSize: '16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = '#9ca3af';
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Log Content */}
      <div style={{
        flex: 1,
        padding: '16px',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        {gameState.log.length === 0 ? (
          <div style={{
            color: '#9ca3af',
            fontSize: '14px',
            textAlign: 'center',
            padding: '40px',
            fontStyle: 'italic',
          }}>
            Noch keine Log-Einträge vorhanden...
          </div>
        ) : (
          gameState.log.map((entry, index) => {
            // Parse log entry to determine type and styling
            const isPlayerAction = entry.includes('P1') || entry.includes('P2');
            const isAIAction = entry.includes('🤖');
            const isSystemMessage = entry.includes('Runde') || entry.includes('Spieler');
            const isCardEffect = entry.includes('Effekt') || entry.includes('erhält') || entry.includes('zieht');
            const isIntervention = entry.includes('Intervention') || entry.includes('ausgelöst');

            let entryStyle: React.CSSProperties = {
              padding: '8px 12px',
              borderRadius: '6px',
              fontSize: '13px',
              fontFamily: 'monospace',
              borderLeft: '3px solid transparent',
              background: 'rgba(255, 255, 255, 0.02)',
              color: '#e5e7eb',
            };

            // Style based on log entry type
            if (isPlayerAction) {
              entryStyle = {
                ...entryStyle,
                borderLeftColor: '#3b82f6',
                background: 'rgba(59, 130, 246, 0.1)',
                color: '#93c5fd',
              };
            } else if (isAIAction) {
              entryStyle = {
                ...entryStyle,
                borderLeftColor: '#f59e0b',
                background: 'rgba(245, 158, 11, 0.1)',
                color: '#fcd34d',
              };
            } else if (isSystemMessage) {
              entryStyle = {
                ...entryStyle,
                borderLeftColor: '#10b981',
                background: 'rgba(16, 185, 129, 0.1)',
                color: '#6ee7b7',
              };
            } else if (isCardEffect) {
              entryStyle = {
                ...entryStyle,
                borderLeftColor: '#8b5cf6',
                background: 'rgba(139, 92, 246, 0.1)',
                color: '#c4b5fd',
              };
            } else if (isIntervention) {
              entryStyle = {
                ...entryStyle,
                borderLeftColor: '#ef4444',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#fca5a5',
              };
            }

            return (
              <div key={index} style={entryStyle}>
                {withIcons(entry)}
              </div>
            );
          })
        )}
      </div>

      {/* Footer with Game State Info */}
      <div style={{
        padding: '12px 20px',
        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '0 0 12px 12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '12px',
        color: '#9ca3af',
      }}>
                  <div>
            Round {gameState.round} | Player {gameState.current} |
            AP: {gameState.actionPoints[gameState.current]}
          </div>
        <div>
          P1: {gameState.roundsWon[1]} | P2: {gameState.roundsWon[2]}
        </div>
      </div>
    </div>
  );
};

