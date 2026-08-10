import React from 'react';
import { Card, PoliticianCard } from '../types/game';
import { Specials, Pols } from '../data/gameData';
import { getCardDetails } from '../data/cardDetails';
import { withIcons } from '../ui/withIcons';

interface HoverData {
  card?: Card;
  x: number;
  y: number;
}

interface CardHoverInfoPanelProps {
  hovered: HoverData | null;
}

// Bigger hover info panel replacing old tooltip.
export const CardHoverInfoPanel: React.FC<CardHoverInfoPanelProps> = ({ hovered }) => {
  if (!hovered || !hovered.card) return null;

  const { card, x, y } = hovered;

  // Decide content based on card kind
  if (card.kind === 'pol') {
    const polCard = card as PoliticianCard;
    const base = Pols.find(p => p.name === polCard.name || p.key === polCard.key);
    const baseInf = base ? base.influence : polCard.influence;
    const delta = polCard.influence - baseInf;
    return (
      <div style={panelStyle(x, y)}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{polCard.name}</div>
        <div>Einfluss: {polCard.influence}{delta !== 0 ? ` (${baseInf} ${delta > 0 ? '+' : ''}${delta})` : ''}</div>
        <div>Tier: {polCard.T}</div>
        <div>BP: {polCard.BP}</div>
        <div style={{ color: Number(polCard.corruption ?? 0) >= 3 ? '#fb923c' : '#facc15', marginTop: 4 }}>
          Korruption: {polCard.corruption ?? polCard.corruptionStart ?? '—'}
          {Number(polCard.corruption ?? 0) >= 3 ? ' · Fähigkeit bereit (klicken)' : ''}
        </div>
      </div>
    );
  } else {
    const base = Specials.find((s: any) => s.id === (card as any).baseId);
    const details = getCardDetails(base?.name || card.name);
    return (
      <div style={panelStyle(x, y)}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{base?.name || card.name}</div>
        <div style={{ color: 'var(--content-secondary)', fontSize: 13, maxWidth: 300 }}>
          {details?.gameEffect ? withIcons(details.gameEffect, 14) : 'Kein Effekttext vorhanden'}
        </div>
      </div>
    );
  }
};

const panelStyle = (x: number, y: number): React.CSSProperties => ({
  position: 'fixed',
  left: x + 16,
  top: y + 16,
  pointerEvents: 'none',
  background: 'var(--surface-default)',
  border: '1px solid var(--border-default)',
  color: 'var(--content-primary)',
  padding: '12px 14px',
  borderRadius: 'var(--radius-md)',
  maxWidth: '460px',
  fontSize: '14px',
  fontFamily: 'var(--font-ui)',
  zIndex: 50,
  boxShadow: 'var(--shadow-lg)',
});
