import { GameState, Player, Card } from '../types/game';
import { EffectEvent } from '../types/effects';

// Clean handler interface
export type EffectHandler = (params: {
  enqueue: (event: EffectEvent) => void;
  player: Player;
  log: (msg: string) => void;
}) => void;

// Main effects registry with clean structure
export const EFFECTS: Record<string, EffectHandler> = {
  // --- PUBLIC
  'public.elon.draw_ap': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Elon Musk: +1 card, +1 AP.' });
    log('🟢 elon.draw_ap');
  },

  'public.zuck.once_ap_on_activation': ({ log }) => {
    // eigentlicher Effekt via SoT-Flag + INITIATIVE_ACTIVATED im Queue-Resolver
    log('🟢 zuck.once_ap_on_activation (SoT flag applied)');
  },

  'public.doudna.aura_science': ({ log }) => {
    // via SoT Hook: auraScience += 1
    log('🟢 doudna.aura_science (SoT aura)');
  },

  'public.fauci.aura_health': ({ log }) => {
    // via SoT Hook: auraHealth += 1
    log('🟢 fauci.aura_health (SoT aura)');
  },

  'public.chomsky.aura_military_penalty': ({ log }) => {
    // via SoT Hook: auraMilitaryPenalty += 1
    log('🟢 chomsky.aura_military_penalty (SoT aura)');
  },

  'public.aiweiwei.on_activate_draw_ap': ({ log }) => {
    // via SoT Hook + INITIATIVE_ACTIVATED in Queue
    log('🟢 aiweiwei.on_activate_draw_ap (SoT hook)');
  },

  // --- INITIATIVES — INSTANT
  'init.shadow_lobbying.buff2': ({ enqueue, player, log }) => {
    enqueue({ type: 'BUFF_STRONGEST_GOV', player, amount: 2 });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Shadow Lobbying: strongest Government +2.' });
    log('🟢 init.shadow_lobbying.buff2');
  },

  'init.spin_doctor.buff_strongest_gov2': ({ enqueue, player, log }) => {
    enqueue({ type: 'BUFF_STRONGEST_GOV', player, amount: 2 });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Spin Doctor: strongest Government +2.' });
    log('🟢 init.spin_doctor.buff_strongest_gov2');
  },

  'init.digital_campaign.draw2': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 2 });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Digitaler Wahlkampf: draw 2.' });
    log('🟢 init.digital_campaign.draw2');
  },

  'init.surprise_funding.ap2': ({ enqueue, player, log }) => {
    enqueue({ type: 'ADD_AP', player, amount: 2 });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Surprise Funding: +2 AP now.' });
    log('🟢 init.surprise_funding.ap2');
  },

  // --- INITIATIVES — INSTANT (neue/ergänzte Keys)
  'init.grassroots_blitz.draw1_buff1': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'BUFF_STRONGEST_GOV', player, amount: 1 });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Grassroots Blitz: draw 1, strongest Gov +1.' });
    log('🟢 init.grassroots_blitz.draw1_buff1');
  },

  'init.strategic_leaks.opp_discard1': ({ enqueue, player, log }) => {
    const opp = player === 1 ? 2 : 1;
    enqueue({ type: 'DISCARD_RANDOM_FROM_HAND', player: opp, amount: 1 });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Strategic Leaks: opponent discards 1 at random.' });
    log('🟢 init.strategic_leaks.opp_discard1');
  },

  'init.emergency_legislation.grant_shield1': ({ enqueue, player, log }) => {
    enqueue({ type: 'GRANT_SHIELD', player, amount: 1 });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Emergency Legislation: grant 1 shield.' });
    log('🟢 init.emergency_legislation.grant_shield1');
  },

  'init.ai_narrative.register_media_blackout': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.media_blackout.deactivate_public' } as any);
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'AI Narrative: registered Media Blackout trap (public deactivate).' });
    log('🟢 init.ai_narrative.register_media_blackout');
  },

  // --- INTERVENTIONS (TRAPS)
  'trap.fake_news.deactivate_media': ({ enqueue, player, log }) => {
    // eigentlicher Trigger in applyTrapsOnCardPlayed – hier nur Registrierung
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.fake_news.deactivate_media' });
    enqueue({ type: 'LOG', msg: 'Trap set: Fake News (deactivate Media/Platform).' });
    log('🟢 trap.fake_news.deactivate_media');
  },

  'trap.whistleblower.return_last_played': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.whistleblower.return_last_played' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Whistleblower (return last played).' });
    log('🟢 trap.whistleblower.return_last_played');
  },

  'trap.data_breach.opp_discard2': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.data_breach.opp_discard2' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Data Breach (opponent discard 2).' });
    log('🟢 trap.data_breach.opp_discard2');
  },

  'trap.legal_injunction.cancel_next_initiative': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.legal_injunction.cancel_next_initiative' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Legal Injunction (cancel next opponent initiative).' });
    log('🟢 trap.legal_injunction.cancel_next_initiative');
  },

  'trap.media_blackout.deactivate_public': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.media_blackout.deactivate_public' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Media Blackout (deactivate public).' });
    log('🟢 trap.media_blackout.deactivate_public');
  },

  'trap.budget_freeze.opp_ap_minus2': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.budget_freeze.opp_ap_minus2' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Budget Freeze (-2 AP on next opponent play).' });
    log('🟢 trap.budget_freeze.opp_ap_minus2');
  },

  'trap.sabotage.deactivate_gov': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.sabotage.deactivate_gov' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Sabotage (deactivate next enemy Government).' });
    log('🟢 trap.sabotage.deactivate_gov');
  },
};

// Legacy compatibility layer for backward compatibility
export const LEGACY_NAME_TO_KEY: Record<string, string> = {
  // PUBLIC
  'Elon Musk': 'public.elon.draw_ap',
  'Mark Zuckerberg': 'public.zuck.once_ap_on_activation',
  'Jennifer Doudna': 'public.doudna.aura_science',
  'Anthony Fauci': 'public.fauci.aura_health',
  'Noam Chomsky': 'public.chomsky.aura_military_penalty',
  'Ai Weiwei': 'public.aiweiwei.on_activate_draw_ap',

  // INITIATIVES — INSTANT
  'Shadow Lobbying': 'init.shadow_lobbying.buff2',
  'Spin Doctor': 'init.spin_doctor.buff_strongest_gov2',
  'Digitaler Wahlkampf': 'init.digital_campaign.draw2',
  'Surprise Funding': 'init.surprise_funding.ap2',
  'Grassroots Blitz': 'init.grassroots_blitz.draw1_buff1',
  'Strategic Leaks': 'init.strategic_leaks.opp_discard1',
  'Emergency Legislation': 'init.emergency_legislation.grant_shield1',
  'AI Narrative Control': 'init.ai_narrative.register_media_blackout',

  // INTERVENTIONS
  'Fake News Campaign': 'trap.fake_news.deactivate_media',
  'Whistleblower': 'trap.whistleblower.return_last_played',
  'Data Breach Exposure': 'trap.data_breach.opp_discard2',
  'Legal Injunction': 'trap.legal_injunction.cancel_next_initiative',
  'Media Blackout': 'trap.media_blackout.deactivate_public',
  'Budget Freeze': 'trap.budget_freeze.opp_ap_minus2',
  'Sabotage Operation': 'trap.sabotage.deactivate_gov',

  // Legacy fallbacks for old cards without new effectKeys
  'Bill Gates': 'bill_gates',
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

// Legacy effect handlers for backward compatibility
const LEGACY_EFFECTS: Record<string, EffectHandler> = {
  // Legacy fallbacks for old cards without new effectKeys
  bill_gates: ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Bill Gates: +1 Karte, +1 AP' });
    log('🟢 legacy.bill_gates');
  },

  jack_ma: ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Jack Ma: +1 Karte' });
    log('🟢 legacy.jack_ma');
  },

  zhang_yiming: ({ enqueue, player, log }) => {
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Zhang Yiming: +1 AP' });
    log('🟢 legacy.zhang_yiming');
  },

  mukesh_ambani: ({ enqueue, player, log }) => {
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Mukesh Ambani: +1 AP' });
    log('🟢 legacy.mukesh_ambani');
  },

  roman_abramovich: ({ enqueue, player, log }) => {
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Roman Abramovich: +1 AP' });
    log('🟢 legacy.roman_abramovich');
  },

  alisher_usmanov: ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Alisher Usmanov: +1 Karte' });
    log('🟢 legacy.alisher_usmanov');
  },

  oprah_winfrey: ({ enqueue, player, log }) => {
    const otherPlayer = player === 1 ? 2 : 1;
    enqueue({ type: 'DEACTIVATE_RANDOM_HAND', player, amount: 1 });
    enqueue({ type: 'DEACTIVATE_RANDOM_HAND', player: otherPlayer, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Oprah Winfrey: jeweils 1 zufällige Handkarte beider Spieler deaktiviert' });
    log('🟢 legacy.oprah_winfrey');
  },

  george_soros: ({ enqueue, player, log }) => {
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'George Soros: +1 AP' });
    log('🟢 legacy.george_soros');
  },

  warren_buffett: ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 2 });
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Warren Buffett: +2 Karten, +1 AP' });
    log('🟢 legacy.warren_buffett');
  },

  jeff_bezos: ({ enqueue, player, log }) => {
    enqueue({ type: 'ADD_AP', player, amount: 2 });
    enqueue({ type: 'LOG', msg: 'Jeff Bezos: +2 AP' });
    log('🟢 legacy.jeff_bezos');
  },

  larry_page: ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Larry Page: +1 Karte, +1 AP' });
    log('🟢 legacy.larry_page');
  },

  sergey_brin: ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Sergey Brin: +1 Karte, +1 AP' });
    log('🟢 legacy.sergey_brin');
  },

  tim_cook: ({ enqueue, player, log }) => {
    enqueue({ type: 'ADD_AP', player, amount: 2 });
    enqueue({ type: 'LOG', msg: 'Tim Cook: +2 AP' });
    log('🟢 legacy.tim_cook');
  },

  vladimir_putin: ({ enqueue, player, log }) => {
    enqueue({ type: 'BUFF_STRONGEST_GOV', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Vladimir Putin: +1 I auf stärkste Regierung' });
    log('🟢 legacy.vladimir_putin');
  }
};

// Main function to trigger card effects via registry
export function triggerCardEffect(state: GameState, player: Player, card: Card): void {
  if (!state._effectQueue) state._effectQueue = [];

  const enqueue = (event: EffectEvent) => {
    state._effectQueue!.push(event);
  };

  const log = (msg: string) => {
    console.log(`[Effect] ${msg}`);
  };

  // First try to get effect key from card definition
  const effectKey = card.effectKey;

  if (effectKey) {
    const effectFn = EFFECTS[effectKey];
    if (effectFn) {
      effectFn({ enqueue, player, log });
      return;
    }
  }

  // Fallback to legacy name mapping for backward compatibility
  const legacyKey = LEGACY_NAME_TO_KEY[card.name];
  if (legacyKey) {
    // First try new effects registry
    const effectFn = EFFECTS[legacyKey];
    if (effectFn) {
      effectFn({ enqueue, player, log });
      return;
    }

    // Then try legacy effects registry
    const legacyEffectFn = LEGACY_EFFECTS[legacyKey];
    if (legacyEffectFn) {
      legacyEffectFn({ enqueue, player, log });
      return;
    }
  }

  console.warn(`No effect implementation found for card: ${card.name} (effectKey: ${effectKey})`);
}

// Export legacy registry for backward compatibility
export const EFFECT_REGISTRY = { ...EFFECTS, ...LEGACY_EFFECTS };
