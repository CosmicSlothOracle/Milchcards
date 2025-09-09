import React, { useState, useCallback } from 'react';

export interface SimpleDiceProps {
  size?: number;
  onRoll?: (face: number) => void;
  className?: string;
}

/**
 * SimpleDice - A fallback 2D CSS-based dice component
 * Used when WebGL/Three.js is not available or fails
 */
const SimpleDice: React.FC<SimpleDiceProps> = ({
  size = 120,
  onRoll,
  className
}) => {
  const [currentFace, setCurrentFace] = useState(1);
  const [isRolling, setIsRolling] = useState(false);

  const roll = useCallback(() => {
    if (isRolling) return;

    setIsRolling(true);

    // Animate through random faces
    let rollCount = 0;
    const maxRolls = 8;
    const rollInterval = setInterval(() => {
      setCurrentFace(1 + Math.floor(Math.random() * 6));
      rollCount++;

      if (rollCount >= maxRolls) {
        clearInterval(rollInterval);
        const finalFace = 1 + Math.floor(Math.random() * 6);
        setCurrentFace(finalFace);
        setIsRolling(false);
        onRoll?.(finalFace);
      }
    }, 100);
  }, [isRolling, onRoll]);

  const getDiceDots = (face: number) => {
    const dots = [];
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
          width: '12px',
          height: '12px',
          backgroundColor: '#333',
          borderRadius: '50%',
          left: '50%',
          top: '50%',
          transform: `translate(calc(-50% + ${x * 20}px), calc(-50% + ${y * 20}px))`,
          transition: 'all 0.1s ease'
        }}
      />
    ));
  };

  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundColor: '#fff',
        border: '3px solid #333',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isRolling ? 'wait' : 'pointer',
        position: 'fixed',
        right: '20px',
        bottom: '20px',
        zIndex: 1200,
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        transform: isRolling ? 'scale(1.1)' : 'scale(1)',
        transition: 'transform 0.2s ease',
        userSelect: 'none'
      }}
      onClick={roll}
      className={className}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {getDiceDots(currentFace)}
      </div>

      {/* Rolling indicator */}
      {isRolling && (
        <div
          style={{
            position: 'absolute',
            top: '-30px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '12px',
            color: '#666',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}
        >
          Rolling...
        </div>
      )}
    </div>
  );
};

export default SimpleDice;
