import { GameState, Player, Card, EffectEvent } from '../types/game';

// Legacy name to effect key mapping for backward compatibility
export const LEGACY_NAME_TO_KEY: Record<string, string> = {
  'Elon Musk': 'elon_musk',
  'Bill Gates': 'bill_gates',
  'Mark Zuckerberg': 'mark_zuckerberg',
  'Jack Ma': 'jack_ma',
  'Zhang Yiming': 'zhang_yiming',
  'Mukesh Ambani': 'mukesh_ambani',
  'Roman Abramovich': 'roman_abramovich',
  'Alisher Usmanov': 'alisher_usmanov',
  'Oprah Winfrey': 'oprah_winfrey',
  'George Soros': 'george_soros',
  'Warren Buffett': 'warren_buffett',
  'Jeff Bezos': 'jeff_bezos',
  'Larry Page': 'larry_page',
  'Sergey Brin': 'sergey_brin',
  'Tim Cook': 'tim_cook',
  'Vladimir Putin': 'vladimir_putin'
};

// Effect registry - maps effect keys to their implementations
export const EFFECT_REGISTRY: Record<string, (state: GameState, player: Player, card: Card) => void> = {
  // Public figures
  elon_musk: (state, player, card) => {
    if (!state._effectQueue) state._effectQueue = [];
    state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
    state._effectQueue.push({ type: 'ADD_AP', player, amount: 1 }); // Simplified: direct AP instead of discount
    state._effectQueue.push({ type: 'LOG', msg: 'Elon Musk: +1 Karte, +1 AP' });
  },

  bill_gates: (state, player, card) => {
    if (!state._effectQueue) state._effectQueue = [];
    state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
    state._effectQueue.push({ type: 'ADD_AP', player, amount: 1 });
    state._effectQueue.push({ type: 'LOG', msg: 'Bill Gates: +1 Karte, +1 AP' });
  },

  mark_zuckerberg: (state, player, card) => {
    if (!state._effectQueue) state._effectQueue = [];
    state._effectQueue.push({ type: 'ADD_AP', player, amount: 1 }); // Simplified: direct AP instead of refund
    state._effectQueue.push({ type: 'LOG', msg: 'Mark Zuckerberg: +1 AP' });
  },

  jack_ma: (state, player, card) => {
    if (!state._effectQueue) state._effectQueue = [];
    state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
    state._effectQueue.push({ type: 'LOG', msg: 'Jack Ma: +1 Karte' });
  },

  zhang_yiming: (state, player, card) => {
    if (!state._effectQueue) state._effectQueue = [];
    state._effectQueue.push({ type: 'ADD_AP', player, amount: 1 });
    state._effectQueue.push({ type: 'LOG', msg: 'Zhang Yiming: +1 AP' });
  },

  mukesh_ambani: (state, player, card) => {
    if (!state._effectQueue) state._effectQueue = [];
    state._effectQueue.push({ type: 'ADD_AP', player, amount: 1 });
    state._effectQueue.push({ type: 'LOG', msg: 'Mukesh Ambani: +1 AP' });
  },

  roman_abramovich: (state, player, card) => {
    if (!state._effectQueue) state._effectQueue = [];
    state._effectQueue.push({ type: 'ADD_AP', player, amount: 1 });
    state._effectQueue.push({ type: 'LOG', msg: 'Roman Abramovich: +1 AP' });
  },

  alisher_usmanov: (state, player, card) => {
    if (!state._effectQueue) state._effectQueue = [];
    state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
    state._effectQueue.push({ type: 'LOG', msg: 'Alisher Usmanov: +1 Karte' });
  },

  oprah_winfrey: (state, player, card) => {
    if (!state._effectQueue) state._effectQueue = [];
    const otherPlayer = player === 1 ? 2 : 1;
    state._effectQueue.push({ type: 'DEACTIVATE_RANDOM_HAND', player, amount: 1 });
    state._effectQueue.push({ type: 'DEACTIVATE_RANDOM_HAND', player: otherPlayer, amount: 1 });
    state._effectQueue.push({ type: 'LOG', msg: 'Oprah Winfrey: jeweils 1 zufällige Handkarte beider Spieler deaktiviert' });
  },

  george_soros: (state, player, card) => {
    if (!state._effectQueue) state._effectQueue = [];
    state._effectQueue.push({ type: 'ADD_AP', player, amount: 1 });
    state._effectQueue.push({ type: 'LOG', msg: 'George Soros: +1 AP' });
  },

  // New cards
  warren_buffett: (state, player, card) => {
    if (!state._effectQueue) state._effectQueue = [];
    state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 2 });
    state._effectQueue.push({ type: 'ADD_AP', player, amount: 1 });
    state._effectQueue.push({ type: 'LOG', msg: 'Warren Buffett: +2 Karten, +1 AP' });
  },

  jeff_bezos: (state, player, card) => {
    if (!state._effectQueue) state._effectQueue = [];
    state._effectQueue.push({ type: 'ADD_AP', player, amount: 2 });
    state._effectQueue.push({ type: 'LOG', msg: 'Jeff Bezos: +2 AP' });
  },

  larry_page: (state, player, card) => {
    if (!state._effectQueue) state._effectQueue = [];
    state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
    state._effectQueue.push({ type: 'ADD_AP', player, amount: 1 });
    state._effectQueue.push({ type: 'LOG', msg: 'Larry Page: +1 Karte, +1 AP' });
  },

  sergey_brin: (state, player, card) => {
    if (!state._effectQueue) state._effectQueue = [];
    state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
    state._effectQueue.push({ type: 'ADD_AP', player, amount: 1 });
    state._effectQueue.push({ type: 'LOG', msg: 'Sergey Brin: +1 Karte, +1 AP' });
  },

  tim_cook: (state, player, card) => {
    if (!state._effectQueue) state._effectQueue = [];
    state._effectQueue.push({ type: 'ADD_AP', player, amount: 2 });
    state._effectQueue.push({ type: 'LOG', msg: 'Tim Cook: +2 AP' });
  },

  // Government cards
  vladimir_putin: (state, player, card) => {
    if (!state._effectQueue) state._effectQueue = [];
    state._effectQueue.push({ type: 'BUFF_STRONGEST_GOV', player, amount: 1 });
    state._effectQueue.push({ type: 'LOG', msg: 'Vladimir Putin: +1 I auf stärkste Regierung' });
  }
};

// Main function to trigger card effects via registry
export function triggerCardEffect(state: GameState, player: Player, card: Card): void {
  // Try to get effect key from legacy name mapping
  const effectKey = LEGACY_NAME_TO_KEY[card.name];

  if (!effectKey) {
    console.warn(`No effect key found for card: ${card.name}`);
    return;
  }

  const effectFn = EFFECT_REGISTRY[effectKey];
  if (!effectFn) {
    console.warn(`No effect implementation found for key: ${effectKey}`);
    return;
  }

  effectFn(state, player, card);
}
