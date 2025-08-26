import type { GameState, Player, Card } from '../types/game';
import type { EffectEvent } from '../types/effects';
import { CARD_BY_ID } from '../data/cards';

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
  const opp: Player = playedBy === 1 ? 2 : 1;
  const traps = (state.traps as any)?.[opp] as Array<{ owner: Player; key: string }> | undefined;
  if (!traps || traps.length === 0) return;

  // Get card definition to access type and tags
  const cardDef = CARD_BY_ID[card.key];
  const isInitiative = cardDef?.type === 'initiative';
  const isPublic = cardDef?.type === 'public';
  const isGovernment = cardDef?.type === 'government';
  const isMediaLike = cardDef?.tags?.includes('Media') || cardDef?.tags?.includes('Platform');

  traps.forEach(t => {
    switch (t.key) {
      // bereits live benutzt
      case 'trap.fake_news.deactivate_media':
        if (isMediaLike && (card as any).uid != null) {
          enqueue({ type: 'DEACTIVATE_CARD', player: opp, targetUid: (card as any).uid });
          log('Trap: Fake News – deactivated media/platform card.');
        }
        break;

      // neu: Initiative canceln (sofort beim Ausspielen der Initiative)
      case 'trap.legal_injunction.cancel_next_initiative':
        if (isInitiative && (card as any).uid != null) {
          enqueue({ type: 'CANCEL_CARD', player: opp, targetUid: (card as any).uid });
          log('Trap: Legal Injunction – cancelled initiative.');
        }
        break;

      // neu: Karte zurück auf Hand (egal welcher Typ)
      case 'trap.whistleblower.return_last_played':
        if ((card as any).uid != null) {
          enqueue({ type: 'RETURN_TO_HAND', player: playedBy, targetUid: (card as any).uid });
          log('Trap: Whistleblower – returned played card to hand.');
        }
        break;

      // neu: Gegner discards 2 bei nächstem Play
      case 'trap.data_breach.opp_discard2':
        enqueue({ type: 'DISCARD_RANDOM_FROM_HAND', player: playedBy === 1 ? 2 : 1, amount: 2 });
        log('Trap: Data Breach – opponent discards 2.');
        break;

      // neu: Public deaktivieren
      case 'trap.media_blackout.deactivate_public':
        if (isPublic && (card as any).uid != null) {
          enqueue({ type: 'DEACTIVATE_CARD', player: opp, targetUid: (card as any).uid });
          log('Trap: Media Blackout – deactivated public card.');
        }
        break;

      // neu: AP -2 für Gegner beim nächsten Play
      case 'trap.budget_freeze.opp_ap_minus2':
        enqueue({ type: 'ADD_AP', player: playedBy, amount: -2 });
        log('Trap: Budget Freeze – opponent AP -2.');
        break;

      // neu: Government deaktivieren
      case 'trap.sabotage.deactivate_gov':
        if (isGovernment && (card as any).uid != null) {
          enqueue({ type: 'DEACTIVATE_CARD', player: opp, targetUid: (card as any).uid });
          log('Trap: Sabotage – deactivated government card.');
        }
        break;

      default:
        break;
    }
  });

  // OPTIONAL: one-shot Traps löschen – wenn gewünscht:
  // (state.traps as any)[opp] = (state.traps as any)[opp].filter(t => t.key !== '...');
  // (Kannst du später feingranular per Key entscheiden.)
}