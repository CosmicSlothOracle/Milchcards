import React, { useRef, useState } from 'react';
import DiscardBurn from './anim/DiscardBurn';

type Rect = { x: number; y: number; width: number; height: number };

export const DiscardWithAnim: React.FC = () => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const discardRef = useRef<HTMLDivElement | null>(null);
  const [animParams, setAnimParams] = useState<{start?: Rect; active: boolean}>({ active: false });

  const triggerDiscard = () => {
    if (!cardRef.current || !discardRef.current) return;
    const start = cardRef.current.getBoundingClientRect();
    setAnimParams({ start: { x: start.left, y: start.top, width: start.width, height: start.height }, active: true });
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', gap: 16 }}>
        <div ref={cardRef} style={{ width: 60, height: 90, background: '#fff', border: '1px solid #ccc' }}>Card</div>
        <div style={{ flex: 1 }} />
        <div ref={discardRef} style={{ width: 60, height: 90, background: '#111', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Discard</div>
      </div>
      <button onClick={triggerDiscard} style={{ marginTop: 12 }}>Trigger Discard</button>

      {animParams.active && animParams.start && (
        <DiscardBurn startRect={animParams.start} onFinish={() => setAnimParams({ active: false })} />
      )}
    </div>
  );
};

export default DiscardWithAnim;


