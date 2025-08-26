import type { GameState, Player, Card } from '../types/game';
import type { EffectEvent } from '../types/effects';

export function registerTrap(state: GameState, player: Player, key: string) {
  if (!state.traps) state.traps = { 1: [], 2: [] } as any;
  const list = (state.traps as any)[player] as Array<{ owner: Player; key: string }>;
  if (!Array.isArray(list)) (state.traps as any)[player] = [];
  (state.traps as any)[player].push({ owner: player, key });
}

export function applyTrapsOnCardPlayed(
  state: GameState,
  playedBy: Player,
  card: Card,
  enqueue: (e: EffectEvent) => void,
  log: (m: string) => void
) {
  // Beispielhafte Trigger: Medien/Plattform deaktivieren
  const opp: Player = playedBy === 1 ? 2 : 1;
  const traps = (state.traps as any)?.[opp] as Array<{ owner: Player; key: string }> | undefined;
  if (!traps || traps.length === 0) return;

  const isMedia = (card as any).tags?.includes('Media') || (card as any).tags?.includes('Platform') ||
                  (card as any).type?.toLowerCase().includes('media') || (card as any).type?.toLowerCase().includes('platform');

  traps.forEach(t => {
    switch (t.key) {
      case 'trap.fake_news.deactivate_media':
        if (isMedia && (card as any).uid != null) {
          enqueue({ type: 'DEACTIVATE_CARD', player: opp, targetUid: (card as any).uid });
          log('Trap: Fake News – deactivated media/platform card.');
        }
        break;
      // weitere Trap-Keys hier
      default:
        break;
    }
  });

  // Optional: einmalige Fallen entfernen (wenn so gewünscht)
  // (state.traps as any)[opp] = (state.traps as any)[opp].filter(t => t.key !== 'trap.fake_news.deactivate_media');
}