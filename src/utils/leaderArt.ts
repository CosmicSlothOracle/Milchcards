import { getCardImagePath, Pols, Specials } from '../data/gameData';
import type { LeaderSlot } from './leadership';

/** Resolve champion portrait from promoted card or catalog name. */
export function getLeaderImageSrc(leader: LeaderSlot | null | undefined): string | null {
  if (!leader) return null;
  const card = leader.card;
  if (card && card.baseId != null && card.baseId >= 0 && (card.kind === 'pol' || card.kind === 'spec')) {
    return getCardImagePath({ kind: card.kind, baseId: card.baseId }, 'ui');
  }
  const pol = Pols.find(p => p.name === leader.championName);
  if (pol) return getCardImagePath({ kind: 'pol', baseId: pol.id }, 'ui');
  const spec = Specials.find(s => s.name === leader.championName);
  if (spec) return getCardImagePath({ kind: 'spec', baseId: spec.id }, 'ui');
  return null;
}
