import React, { useState, useCallback, useEffect } from 'react';

export interface SimpleDiceProps {
  size?: number;
  onRoll?: (face: number) => void;
  className?: string;
}

/**
 * SimpleDice - A highly polished 2D CSS-based premium dice component.
 * Integrates beautifully with the dark-futuristic Milchcards aesthetic.
 */
const SimpleDice: React.FC<SimpleDiceProps> = ({
  size = 110,
  onRoll,
  className
}) => {
  const [currentFace, setCurrentFace] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [rotation, setRotation] = useState(0);

  const roll = useCallback(() => {
    if (isRolling) return;

    setIsRolling(true);

    // Animate through random faces and spin rotation
    let rollCount = 0;
    const maxRolls = 10;
    const rollInterval = setInterval(() => {
      setCurrentFace(1 + Math.floor(Math.random() * 6));
      setRotation(prev => prev + 45);
      rollCount++;

      if (rollCount >= maxRolls) {
        clearInterval(rollInterval);
        const finalFace = 1 + Math.floor(Math.random() * 6);
        setCurrentFace(finalFace);
        setIsRolling(false);
        setRotation(prev => prev + 180);
        onRoll?.(finalFace);
      }
    }, 90);
  }, [isRolling, onRoll]);

  // Listen for programmatic roll requests (e.g. from the game engine / corruption resolved)
  useEffect(() => {
    const handleRequestRoll = () => {
      roll();
    };
    window.addEventListener('pc:ui_request_dice_roll', handleRequestRoll);
    return () => {
      window.removeEventListener('pc:ui_request_dice_roll', handleRequestRoll);
    };
  }, [roll]);

  const getDiceDots = (face: number) => {
    const positions = {
      1: [[0, 0]],
      2: [[-1, -1], [1, 1]],
      3: [[-1, -1], [0, 0], [1, 1]],
      4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
      5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
      6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]]
    };

    const facePositions = positions[face as keyof typeof positions] || positions[1];

    return facePositions.map(([x, y], index) => (
      <div
        key={index}
        style={{
          position: 'absolute',
          width: '10px',
          height: '10px',
          backgroundColor: '#3b82f6',
          borderRadius: '50%',
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${x * 22}px), calc(-50% + ${y * 22}px))`,
          boxShadow: '0 0 8px #3b82f6, 0 0 16px rgba(59, 130, 246, 0.4)',
          transition: 'all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
      />
    ));
  };

  return (
    <div
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        border: '2px solid rgba(148, 163, 184, 0.2)',
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isRolling ? 'wait' : 'pointer',
        position: 'relative',
        boxShadow: '0 8px 24px rgba(0,0,0,0.6), inset 0 0 12px rgba(255,255,255,0.05)',
        transform: `scale(${isRolling ? 1.05 : 1}) rotate(${rotation}deg)`,
        transition: 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)',
        userSelect: 'none',
      }}
      onClick={roll}
      className={className}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {getDiceDots(currentFace)}
      </div>

      {/* Glass reflection overlay */}
      <div style={{
        position: 'absolute',
        top: '2px',
        left: '2px',
        right: '2px',
        height: '40%',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%)',
        borderRadius: '14px 14px 0 0',
        pointerEvents: 'none'
      }} />

      {/* Text label underneath */}
      {isRolling && (
        <div
          style={{
            position: 'absolute',
            top: '-28px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '11px',
            color: '#3b82f6',
            textShadow: '0 0 8px rgba(59, 130, 246, 0.4)',
            fontWeight: 800,
            whiteSpace: 'nowrap',
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}
        >
          🎲 WÜRFELT...
        </div>
      )}
    </div>
  );
};

export default SimpleDice;
