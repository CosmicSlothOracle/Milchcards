import type { Player } from './game';

export type EffectEvent =
  | { type: 'LOG'; msg: string }
  | { type: 'ADD_AP'; player: Player; amount: number }
  | { type: 'DRAW_CARDS'; player: Player; amount: number }
  | { type: 'DISCARD_RANDOM_FROM_HAND'; player: Player; amount: number }
  | { type: 'DISCARD_RANDOM_HAND'; player: Player; amount: number }
  | { type: 'DEACTIVATE_RANDOM_HAND'; player: Player; amount: number }
  | { type: 'ADJUST_INFLUENCE'; player: Player; amount: number; targetUid?: number; reason?: string }
  | { type: 'GRANT_SHIELD'; player: Player; targetUid?: number; amount: number }
  | { type: 'DEACTIVATE_CARD'; player: Player; targetUid: number }
  | { type: 'REACTIVATE_CARD'; player: Player; targetUid: number }
  | { type: 'RETURN_TO_HAND'; player: Player; targetUid: number }
  | { type: 'CANCEL_CARD'; player: Player; targetUid: number }
  | { type: 'BUFF_STRONGEST_GOV'; player: Player; amount: number }
  | { type: 'INITIATIVE_ACTIVATED'; player: Player }
  | { type: 'DEBUFF_CARD'; player: Player; targetUid: number; amount: number }

  | { type: 'REGISTER_TRAP'; player: Player; key: string }
  | { type: 'UI_TRIGGER_HIT_ANIM'; player: Player; lane: string; index: number }
  // New generic intent events for advanced card effects
  | { type: 'DEACTIVATE_STRONGEST_ENEMY_GOV'; player: Player }
  | { type: 'LOCK_OPPONENT_INITIATIVES_EOT'; player: Player }
  | { type: 'SET_DOUBLE_PUBLIC_AURA'; player: Player }
  | { type: 'SET_OPPORTUNIST_ACTIVE'; player: Player; active: boolean }
  // New event types for card effects
  | { type: 'AURA_SCIENCE'; player: Player; active: boolean }
  | { type: 'AURA_HEALTH'; player: Player; active: boolean }
  | { type: 'AURA_MILITARY_PENALTY'; player: Player; active: boolean }
  // ONCE_AP_ON_ACTIVATION removed - use standard ADD_AP events instead
  | { type: 'ON_ACTIVATE_DRAW_AP'; player: Player }
  | { type: 'TRAP_FAKE_NEWS'; player: Player; targetUid: number }
  | { type: 'TRAP_WHISTLEBLOWER'; player: Player; targetUid: number }
  | { type: 'TRAP_DATA_BREACH'; player: Player; targetUid: number }
  | { type: 'TRAP_LEGAL_INJUNCTION'; player: Player; targetUid: number }
  | { type: 'TRAP_MEDIA_BLACKOUT'; player: Player; targetUid: number }
  | { type: 'TRAP_COUNTERINTEL'; player: Player; targetUid: number }
  | { type: 'TRAP_PUBLIC_SCANDAL'; player: Player; targetUid: number }
  | { type: 'TRAP_BUDGET_FREEZE'; player: Player; targetUid: number }
  | { type: 'TRAP_SABOTAGE'; player: Player; targetUid: number }
  // Corruption dice-steal mechanic
  | { type: 'CORRUPTION_STEAL_GOV_START'; player: Player }
  | { type: 'CORRUPTION_STEAL_GOV_RESOLVE'; player: Player; targetUid: number; roll: number; influence: number }
  | { type: 'SKANDALSPIRALE_TRIGGER'; player: Player };

// Optional: tolerant fallback in der Migrationsphase
// | { type: string; [k: string]: any };

export type EffectQueue = EffectEvent[];

