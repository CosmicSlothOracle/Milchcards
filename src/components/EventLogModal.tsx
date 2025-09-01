import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GameState } from '../types/game';

interface EventLogModalProps {
  gameState: GameState;
  isVisible: boolean;
  onToggle: () => void;
}

interface Position {
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

export const EventLogModal: React.FC<EventLogModalProps> = ({
  gameState,
  isVisible,
  onToggle
}) => {
  const [position, setPosition] = useState<Position>({ x: 400, y: 50 });
  const [size, setSize] = useState<Size>({ width: 350, height: 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState<{ pos: Position; size: Size }>({
    pos: { x: 0, y: 0 },
    size: { width: 0, height: 0 }
  });
  const [gameLog, setGameLog] = useState<string[]>([]);
  const [typewriterIndex, setTypewriterIndex] = useState(0);

  const modalRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // Update game log and scroll to bottom
  useEffect(() => {
    if (gameState.log.length > gameLog.length) {
      const newEntries = gameState.log.slice(gameLog.length);
      setGameLog(prev => {
        const updated = [...prev, ...newEntries];
        // Trigger typewriter animation for new entries
        setTimeout(() => setTypewriterIndex(updated.length), 100);
        return updated;
      });
    }
  }, [gameState.log, gameLog.length]);

  // Auto-scroll log to bottom when new entries are added
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameLog]);

  // Mouse handlers for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === modalRef.current || (e.target as HTMLElement).closest('.modal-header')) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragStart.x)),
        y: Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragStart.y))
      });
    } else if (isResizing) {
      const newWidth = Math.max(300, e.clientX - resizeStart.pos.x + resizeStart.size.width);
      const newHeight = Math.max(200, e.clientY - resizeStart.pos.y + resizeStart.size.height);
      setSize({ width: newWidth, height: newHeight });
    }
  }, [isDragging, isResizing, dragStart, resizeStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

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

  if (!isVisible) return null;

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 40,
          pointerEvents: 'none'
        }}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        onMouseDown={handleMouseDown}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: size.width,
          height: size.height,
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          zIndex: 50,
          cursor: isDragging ? 'grabbing' : 'grab',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            color: '#e5e7eb',
            fontSize: '14px',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📜 Ereignis-Log
            <div style={{
              color: '#9ca3af',
              fontSize: '12px',
              fontWeight: '400',
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '2px 6px',
              borderRadius: '4px'
            }}>
              {gameLog.length} Einträge
            </div>
          </div>

          <button
            onClick={onToggle}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '16px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Log Container */}
          <div
            ref={logRef}
            style={{
              flex: 1,
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '12px',
              color: '#f9fafb',
              overflowY: 'auto',
              scrollBehavior: 'smooth',
              lineHeight: '1.4'
            }}>
            {gameLog.length === 0 ? (
              <div style={{
                color: '#9ca3af',
                textAlign: 'center',
                marginTop: '20px',
                fontStyle: 'italic'
              }}>
                Noch keine Ereignisse...
              </div>
            ) : (
              gameLog.map((entry, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: '6px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                    opacity: index < typewriterIndex ? 1 : 0.7,
                    animation: index === typewriterIndex - 1 ? 'fadeIn 0.3s ease-in-out' : 'none',
                    borderLeft: '2px solid rgba(59, 130, 246, 0.3)'
                  }}
                >
                  <span style={{ color: '#9ca3af', fontSize: '10px', marginRight: '8px' }}>
                    #{index + 1}
                  </span>
                  {entry}
                </div>
              ))
            )}
          </div>

          {/* Quick Actions */}
          <div style={{
            marginTop: '12px',
            display: 'flex',
            gap: '8px',
            justifyContent: 'space-between'
          }}>
            <button
              onClick={() => {
                if (logRef.current) {
                  logRef.current.scrollTop = logRef.current.scrollHeight;
                }
              }}
              style={{
                background: 'rgba(59, 130, 246, 0.2)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '6px',
                padding: '6px 12px',
                color: '#93c5fd',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              ⬇️ Nach unten
            </button>
            <button
              onClick={() => {
                setGameLog([]);
                setTypewriterIndex(0);
              }}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                padding: '6px 12px',
                color: '#fca5a5',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🗑️ Leeren
            </button>
          </div>
        </div>

        {/* Resize handle */}
        <div
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '20px',
            height: '20px',
            cursor: 'se-resize',
            background: 'linear-gradient(-45deg, transparent 30%, rgba(255, 255, 255, 0.2) 30%, rgba(255, 255, 255, 0.2) 70%, transparent 70%)',
            borderRadius: '0 0 12px 0'
          }}
        />
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};
