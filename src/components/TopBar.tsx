import React from 'react';

export const TopBar: React.FC<{ onSelect?: (v:string)=>void }> = ({ onSelect }) => {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select onChange={(e)=> onSelect && onSelect(e.target.value)} style={{ background: '#0f1a26', color: '#eaf3ff', borderRadius: 8, padding: '6px 8px', border: '1px solid #203043' }}>
        <option value="">Menu</option>
        <option value="game">Game</option>
        <option value="sprite">Sprite Demo</option>
        <option value="demo">Demo</option>
      </select>
    </div>
  );
};


