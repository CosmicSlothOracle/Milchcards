import type { Player } from './game';

export type EffectEvent =
  | { type: 'LOG'; msg: string }
  | { type: 'ADD_AP'; player: Player; amount: number }
  | { type: 'DRAW_CARDS'; player: Player; amount: number }
  | { type: 'DISCARD_RANDOM_FROM_HAND'; player: Player; amount: number }
  | { type: 'DEACTIVATE_RANDOM_HAND'; player: Player; amount: number }
  | { type: 'ADJUST_INFLUENCE'; player: Player; amount: number; targetUid?: number; reason?: string }
  | { type: 'GRANT_SHIELD'; player: Player; targetUid?: number; amount: number }
  | { type: 'DEACTIVATE_CARD'; player: Player; targetUid: number }
  | { type: 'REACTIVATE_CARD'; player: Player; targetUid: number }
  | { type: 'RETURN_TO_HAND'; player: Player; targetUid: number }
  | { type: 'CANCEL_CARD'; player: Player; targetUid: number }
  | { type: 'BUFF_STRONGEST_GOV'; player: Player; amount: number }
  | { type: 'INITIATIVE_ACTIVATED'; player: Player }
  | { type: 'REGISTER_TRAP'; player: Player; key: string };

// Optional: tolerant fallback in der Migrationsphase
// | { type: string; [k: string]: any };

export type EffectQueue = EffectEvent[];

