/** Actions a guest (player 2) sends to the host, who runs the engine. */
export type PvpAction =
  | { t: 'play_card'; index: number; lane?: 'innen' | 'aussen' }
  | { t: 'pass' }
  | { t: 'end_turn' }
  | { t: 'activate_instant' }
  | { t: 'event'; name: string; detail?: any };

/** Window events the guest is allowed to forward to the host engine. */
export const RELAYED_ENGINE_EVENTS = [
  'pc:corruption_pick_target',
  'pc:corruption_request_roll',
  'pc:corruption_cancel',
  'pc:maulwurf_request_roll',
  'pc:maulwurf_cancel',
  'pc:tunnelvision_request_roll',
  'pc:purge_request_roll',
] as const;

/** Visual/feedback events the host mirrors to the guest. */
export const RELAYED_FX_EVENTS = [
  'pc:corruption_roll_started',
  'pc:engine_dice_result',
  'pc:corruption_resolved',
  'pc:purge_probe_focus',
  'pc:purge_await_roll',
  'pc:purge_sequence_start',
  'pc:purge_sequence_done',
] as const;

export type PvpPhase = 'lobby' | 'started' | 'closed';
