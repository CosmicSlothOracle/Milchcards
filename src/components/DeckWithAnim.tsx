import React, { useRef, useState } from 'react';
import DrawFlip from './anim/DrawFlip';

type Rect = { x: number; y: number; width: number; height: number };

export const DeckWithAnim: React.FC = () => {
  const deckRef = useRef<HTMLDivElement | null>(null);
  const handRef = useRef<HTMLDivElement | null>(null);
  const [animParams, setAnimParams] = useState<{from?: Rect; to?: Rect; active: boolean}>({ active: false });

  const triggerDraw = () => {
    if (!deckRef.current || !handRef.current) return;
    const from = deckRef.current.getBoundingClientRect();
    const to = handRef.current.getBoundingClientRect();
    setAnimParams({ from: { x: from.left, y: from.top, width: from.width, height: from.height }, to: { x: to.left, y: to.top, width: to.width, height: to.height }, active: true });
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', gap: 16 }}>
        <div ref={deckRef} style={{ width: 60, height: 90, background: '#eee', border: '1px solid #ccc' }}>Deck</div>
        <div style={{ flex: 1 }} />
        <div ref={handRef} style={{ width: 60, height: 90, background: '#fafafa', border: '1px solid #ddd' }}>Hand</div>
      </div>
      <button onClick={triggerDraw} style={{ marginTop: 12 }}>Trigger Draw</button>

      {animParams.active && animParams.from && animParams.to && (
        <DrawFlip fromRect={animParams.from} toRect={animParams.to} onFinish={() => setAnimParams({ active: false })} />
      )}
    </div>
  );
};

export default DeckWithAnim;


