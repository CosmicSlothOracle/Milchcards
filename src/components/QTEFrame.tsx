import React, { useEffect, useRef } from 'react';
import { createGame as createQTEGame } from '../qte/gameLoop';

export interface QTEFrameProps {
  onBack?: () => void;
}

// Simple wrapper that shows the standalone QTE HTML inside an iframe.
// The QTE assets must live under the public/qte directory so that the
// iframe can request them without additional build configuration.
// TODO: if you relocate assets elsewhere, adjust the src accordingly.
const QTEFrame: React.FC<QTEFrameProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const { p1, p2 } = createQTEGame(canvasRef.current);
    // Expose for debug
    (window as any).__qte = { p1, p2 };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#0b0f14',
      }}
    >
      <div style={{ padding: '8px', display: 'flex', gap: '8px' }}>
        <button
          onClick={onBack}
          style={{
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ← Back
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <canvas
          ref={canvasRef}
          width={960}
          height={540}
          style={{ border: '2px solid #444', borderRadius: '8px', background: '#111' }}
        />
      </div>
    </div>
  );
};

export default QTEFrame;
