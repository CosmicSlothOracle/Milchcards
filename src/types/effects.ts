import type { GameState, Player, Card } from './game';

export type EffectEvent =
  | { type: 'LOG'; msg: string }
  | { type: 'ADD_AP'; player: Player; amount: number }                           // clamps [0..4]
  | { type: 'DRAW_CARDS'; player: Player; amount: number }
  | { type: 'DISCARD_RANDOM_FROM_HAND'; player: Player; amount: number }
  | { type: 'ADJUST_INFLUENCE'; player: Player; amount: number; reason?: string } // alias → BUFF_STRONGEST_GOV
  | { type: 'BUFF_STRONGEST_GOV'; player: Player; amount: number }               // +/- tempBuffs
  | { type: 'GRANT_SHIELD'; targetUid: number }                                  // shields.add(uid)
  | { type: 'DEACTIVATE_CARD'; targetUid: number }                               // card.deactivated = true
  | { type: 'DEACTIVATE_RANDOM_HAND'; player: Player; amount: number }           // random hand cards → discard
  | { type: 'INITIATIVE_ACTIVATED'; player: Player }                             // löst Cluster-3 + Plattform aus
  | { type: 'TRAP_TRIGGERED'; player: Player; trapId: number; targetId: number } // Falle ausgelöst

export type EffectQueue = EffectEvent[];