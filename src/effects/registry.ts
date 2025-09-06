import { GameState, Player, Card } from '../types/game';
import { EffectEvent } from '../types/effects';
import { logger } from '../debug/logger';

// Clean handler interface
export type EffectHandler = (params: {
  enqueue: (event: EffectEvent) => void;
  player: Player;
  log: (msg: string) => void;
}) => void;

// Main effects registry with clean structure
export const EFFECTS: Record<string, EffectHandler> = {
  // Bill Gates — +1 AP
  'public.bill_gates.next_initiative_ap1': ({ enqueue, player, log }) => {
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Bill Gates: +1 AP.' });
    log('🟢 public.bill_gates.next_initiative_ap1');
  },

  // Greta Thunberg — +1 AP
  'public.greta_thunberg.first_gov_ap1': ({ enqueue, player, log }) => {
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Greta Thunberg: +1 AP.' });
    log('🟢 public.greta_thunberg.first_gov_ap1');
  },

  // --- PUBLIC
  'public.elon.draw_ap': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Elon Musk: draw 1 card, +1 AP.' });
    log('🟢 public.elon.draw_ap');
  },

  // Oprah Winfrey — Media buff: +1 influence to strongest gov per Media card on board (max +3)
  'public.oprah_winfrey.media_buff': ({ enqueue, player, log }) => {
    const ownBoard = [
      ...(require('../types/game') as any).GameState ? [] : [] // placeholder to keep types stable
    ];
    // Count media cards on own board (public + government)
    // Prefer tag 'Media' if present, fallback to name match
    const mediaNames = ['Oprah Winfrey'];
    // We cannot access state here (handlers are stateless), so handler will enqueue a LOG and a special intent
    // We'll enqueue a LOG and an intent event that will be resolved by the queue resolver via a consumer that has access to board state.
    // For simplicity, compute buff amount based on board check performed by resolver using an intent event.
    enqueue({ type: 'LOG', msg: 'Oprah Winfrey: applying media buff (will compute +1 per media, max 3).' });
    enqueue({ type: 'LOG', msg: 'Oprah Winfrey: (handler enqueued BUFF intent - resolved in resolver).' });
    // Enqueue a generic intent represented as BUFF_STRONGEST_GOV with amount=0 and a marker; resolver will recompute actual amount
    enqueue({ type: 'BUFF_STRONGEST_GOV', player, amount: 0, reason: 'OPRAH_MEDIA_BUFF_INTENT' } as any);
    log('🟢 public.oprah_winfrey.media_buff');
  },

  'public.zuck.once_ap_on_activation': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Mark Zuckerberg: +1 AP on next initiative activation.' });
    log('🟢 public.zuck.once_ap_on_activation');
  },

  'public.doudna.aura_science': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Jennifer Doudna: Science aura activated.' });
    log('🟢 public.doudna.aura_science');
  },

  'public.fauci.aura_health': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Anthony Fauci: Health aura activated.' });
    log('🟢 public.fauci.aura_health');
  },

  'public.chomsky.aura_military_penalty': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Noam Chomsky: Military penalty aura activated.' });
    log('🟢 public.chomsky.aura_military_penalty');
  },

  'public.aiweiwei.on_activate_draw_ap': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Ai Weiwei: +1 card +1 AP on initiative activation.' });
    log('🟢 public.aiweiwei.on_activate_draw_ap');
  },

  // --- INITIATIVES — INSTANT
  // Shadow Lobbying – buff per Oligarch (computed in resolver)
  'init.shadow_lobbying.per_oligarch': ({ enqueue, player, log }) => {
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Shadow Lobbying: will buff based on Oligarch tags.' });
    log('🟢 init.shadow_lobbying.per_oligarch');
  },

  'init.spin_doctor.buff_strongest_gov2': ({ enqueue, player, log }) => {
    enqueue({ type: 'BUFF_STRONGEST_GOV', player, amount: 2 });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Spin Doctor: strongest Government +2.' });
    log('🟢 init.spin_doctor.buff_strongest_gov2');
  },

  'init.digital_campaign.draw2': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 2 });
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Digital Campaign: draw 2, +1 AP.' });
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
    enqueue({ type: 'LOG', msg: 'Trap set: Whistleblower (return last played card to hand).' });
    log('🟢 trap.whistleblower.return_last_played');
  },

  'trap.whistleblower.debuff_next_gov_minus2': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.whistleblower.debuff_next_gov_minus2' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Whistleblower (-2 influence on next enemy government card).' });
    log('🟢 trap.whistleblower.debuff_next_gov_minus2');
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

  // ================================
  // A) INITIATIVES – Instant (neu)
  // ================================

  'init.party_offensive.deactivate_gov': ({ enqueue, player, log }) => {
    enqueue({ type: 'DEACTIVATE_STRONGEST_ENEMY_GOV', player });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    log('🟢 init.party_offensive.deactivate_gov');
  },

  'init.opposition_blockade.lock_initiatives': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOCK_OPPONENT_INITIATIVES_EOT', player });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    log('🟢 init.opposition_blockade.lock_initiatives');
  },

  'init.delay_tactics.ap_or_draw': ({ enqueue, player, log }) => {
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Delay Tactics: +1 AP (placeholder for AP/Draw choice).' });
    log('🟢 init.delay_tactics.ap_or_draw');
  },

  'init.think_tank.draw1_buff_gov2': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'BUFF_STRONGEST_GOV', player, amount: 2 });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Think Tank: draw 1; strongest Government +2.' });
    log('🟢 init.think_tank.draw1_buff_gov2');
  },

  'init.influencer_campaign.double_public': ({ enqueue, player, log }) => {
    enqueue({ type: 'SET_DOUBLE_PUBLIC_AURA', player });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    log('🟢 init.influencer_campaign.double_public');
  },

  'init.system_critical.shield1': ({ enqueue, player, log }) => {
    enqueue({ type: 'GRANT_SHIELD', player, amount: 1 } as EffectEvent);
    enqueue({ type: 'INITIATIVE_ACTIVATED', player } as EffectEvent);
    enqueue({ type: 'LOG', msg: 'System-Critical: grant 1 shield (applied to Public per resolver rule).' });
    log('🟢 init.system_critical.shield1');
  },

  'init.symbolic_politics.draw1': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Symbolic Politics: draw 1.' });
    log('🟢 init.symbolic_politics.draw1');
  },

  // =================================
  // B) INTERVENTIONS – neue Traps
  // =================================

  'trap.internal_faction_strife.cancel_big_initiative': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.internal_faction_strife.cancel_big_initiative' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Internal Faction Strife (cancel big initiative).' });
    log('🟢 trap.internal_faction_strife.cancel_big_initiative');
  },

  'trap.boycott.deactivate_ngo_movement': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.boycott.deactivate_ngo_movement' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Boycott Campaign (deactivate NGO/Movement).' });
    log('🟢 trap.boycott.deactivate_ngo_movement');
  },

  'trap.deepfake.lock_diplomat_transfer': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.deepfake.lock_diplomat_transfer' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Deepfake Scandal (lock diplomat transfer).' });
    log('🟢 trap.deepfake.lock_diplomat_transfer');
  },

  'trap.cyber_attack.destroy_platform': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.cyber_attack.destroy_platform' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Cyber Attack (destroy platform).' });
    log('🟢 trap.cyber_attack.destroy_platform');
  },


  // =============================
  // NEW CORRUPTION INITIATIVE
  // =============================

  'corruption.bribery_v2.steal_gov_w6': ({ enqueue, player, log }) => {
    console.log('🔥 CORRUPTION HANDLER TRIGGERED - Player:', player);
    // Begin corruption flow: open UI modal + mark pending selection
    enqueue({ type: 'CORRUPTION_STEAL_GOV_START', player } as any);
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Bribery Scandal 2.0: Wähle eine gegnerische Regierungskarte und würfle einen W6.' });
    // Provide UI hint message for modal (handled by frontend)
    enqueue({ type: 'LOG', msg: '🔔 Corruption Modal: select target then press Würfeln.' });
    console.log('🔥 CORRUPTION EVENTS ENQUEUED');
    log('🟢 corruption.bribery_v2.steal_gov_w6');
  },

  'corruption.mole.steal_weakest_gov': ({ enqueue, player, log }) => {
    console.log('🔥 MAULWURF CORRUPTION HANDLER TRIGGERED - Player:', player);
    // Begin corruption flow: automatically select weakest opponent government card
    enqueue({ type: 'CORRUPTION_MOLE_STEAL_START', player } as any);
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Maulwurf: Automatische Auswahl der schwächsten gegnerischen Regierungskarte.' });
    // Provide UI hint message for modal (handled by frontend)
    enqueue({ type: 'LOG', msg: '🔔 Maulwurf: Automatische Zielauswahl, dann Würfeln.' });
    console.log('🔥 MAULWURF CORRUPTION EVENTS ENQUEUED');
    log('🟢 corruption.mole.steal_weakest_gov');
  },

  'trap.grassroots_resistance.deactivate_public': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.grassroots_resistance.deactivate_public' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Grassroots Resistance (deactivate public).' });
    log('🟢 trap.grassroots_resistance.deactivate_public');
  },

  'trap.mass_protests.debuff_two_govs': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.mass_protests.debuff_two_govs' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Mass Protests (debuff two govs).' });
    log('🟢 trap.mass_protests.debuff_two_govs');
  },

  'trap.advisor_scandal.minus2_gov_tier1': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.advisor_scandal.minus2_gov_tier1' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Advisor Scandal (-2 on tier-1 gov).' });
    log('🟢 trap.advisor_scandal.minus2_gov_tier1');
  },

  'trap.parliament_closed.stop_more_gov': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.parliament_closed.stop_more_gov' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Parliament Closed (stop more gov).' });
    log('🟢 trap.parliament_closed.stop_more_gov');
  },

  'trap.independent_investigation.cancel_trap': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.independent_investigation.cancel_trap' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: "Independent" Investigation (cancel trap).' });
    log('🟢 trap.independent_investigation.cancel_trap');
  },

  'trap.soft_power_collapse.minus3_diplomat': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.soft_power_collapse.minus3_diplomat' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Soft-Power Collapse (-3 diplomat).' });
    log('🟢 trap.soft_power_collapse.minus3_diplomat');
  },

  'trap.cancel_culture.deactivate_public': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.cancel_culture.deactivate_public' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Cancel Culture (deactivate public).' });
    log('🟢 trap.cancel_culture.deactivate_public');
  },

  'trap.lobby_leak.force_discard_on_ngo': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.lobby_leak.force_discard_on_ngo' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Lobby Leak (force discard on NGO).' });
    log('🟢 trap.lobby_leak.force_discard_on_ngo');
  },


  'trap.scandal_spiral.cancel_one_of_two': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.scandal_spiral.cancel_one_of_two' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Scandal Spiral (cancel one of two).' });
    log('🟢 trap.scandal_spiral.cancel_one_of_two');
  },

  'init.tunnel_vision.gov_probe_system': ({ enqueue, player, log }) => {
    console.log('🔥 TUNNELVISION INITIATIVE HANDLER TRIGGERED - Player:', player);
    enqueue({ type: 'LOG', msg: 'Tunnelvision: Dauerhafte Initiative aktiviert - Regierungskarten benötigen Probe.' });
    enqueue({ type: 'LOG', msg: '🔔 Tunnelvision: W6 ≥4 (≥5 bei Einfluss 9+) - bei Misserfolg Karte bleibt in Hand.' });
    console.log('🔥 TUNNELVISION INITIATIVE EVENTS ENQUEUED');
    log('🟢 init.tunnel_vision.gov_probe_system');
  },

  'trap.satire_show.minus2_enemy_gov': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.satire_show.minus2_enemy_gov' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Satire Show (-2 enemy gov).' });
    log('🟢 trap.satire_show.minus2_enemy_gov');
  },

  'trap.strategic_disclosure.return_gov': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.strategic_disclosure.return_gov' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Strategic Disclosure (return gov on trigger).' });
    log('🟢 trap.strategic_disclosure.return_gov');
  },

  // === ONGOING INITIATIVES ===
  'init.napoleon_komplex.tier1_gov_plus1': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Napoleon Komplex: Tier-1 Government aura activated.' });
    log('🟢 init.napoleon_komplex.tier1_gov_plus1');
  },

  // === INITIATIVES (fehlende) ===
  'init.opportunist.mirror_ap_effects': ({ enqueue, player, log }) => {
    // Opportunist: Spiegelung von AP-Effekten UND Buff-Effekten (konsistente Semantik)
    enqueue({ type: 'SET_OPPORTUNIST_ACTIVE', player, active: true });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Opportunist: AP-Effekte UND Buff-Effekte werden gespiegelt (bis Zug-Ende).' });
    log('🟢 init.opportunist.mirror_ap_effects (AP + Buff-Spiegelung)');
  },

  'init.skandalspirale.w6_check': ({ enqueue, player, log }) => {
    enqueue({ type: 'SKANDALSPIRALE_TRIGGER', player } as any);
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Skandalspirale: W6-Probe wird durchgeführt.' });
    log('🟢 init.skandalspirale.w6_check');
  },

  // === PUBLIC KARTEN - Registry Keys für Legacy Handler ===
  'public.oprah_winfrey.deactivate_hands': ({ enqueue, player, log }) => {
    const otherPlayer = player === 1 ? 2 : 1;
    enqueue({ type: 'DEACTIVATE_RANDOM_HAND', player, amount: 1 });
    enqueue({ type: 'DEACTIVATE_RANDOM_HAND', player: otherPlayer, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Oprah Winfrey: jeweils 1 zufällige Handkarte beider Spieler deaktiviert' });
    log('🟢 public.oprah_winfrey.deactivate_hands');
  },

  'public.george_soros.ap1': ({ enqueue, player, log }) => {
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'George Soros: +1 AP' });
    log('🟢 public.george_soros.ap1');
  },

  'public.jack_ma.draw1': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Jack Ma: +1 Karte' });
    log('🟢 public.jack_ma.draw1');
  },

  'public.zhang_yiming.draw1_ap1': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Zhang Yiming: +1 Karte, +1 AP' });
    log('🟢 public.zhang_yiming.draw1_ap1');
  },

  'public.mukesh_ambani.ap1': ({ enqueue, player, log }) => {
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Mukesh Ambani: +1 AP' });
    log('🟢 public.mukesh_ambani.ap1');
  },

  'public.roman_abramovich.ap1': ({ enqueue, player, log }) => {
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Roman Abramovich: +1 AP' });
    log('🟢 public.roman_abramovich.ap1');
  },

  'public.alisher_usmanov.draw1': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Alisher Usmanov: +1 Karte' });
    log('🟢 public.alisher_usmanov.draw1');
  },

  'public.warren_buffett.draw2_ap1': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 2 });
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Warren Buffett: +2 Karten, +1 AP' });
    log('🟢 public.warren_buffett.draw2_ap1');
  },

  'public.jeff_bezos.ap2': ({ enqueue, player, log }) => {
    enqueue({ type: 'ADD_AP', player, amount: 2 });
    enqueue({ type: 'LOG', msg: 'Jeff Bezos: +2 AP' });
    log('🟢 public.jeff_bezos.ap2');
  },

  'public.larry_page.draw1_ap1': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Larry Page: +1 Karte, +1 AP' });
    log('🟢 public.larry_page.draw1_ap1');
  },

  'public.sergey_brin.draw1_ap1': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Sergey Brin: +1 Karte, +1 AP' });
    log('🟢 public.sergey_brin.draw1_ap1');
  },

  'public.tim_cook.ap2': ({ enqueue, player, log }) => {
    enqueue({ type: 'ADD_AP', player, amount: 2 });
    enqueue({ type: 'LOG', msg: 'Tim Cook: +2 AP' });
    log('🟢 public.tim_cook.ap2');
  },

  // === GOVERNMENT KARTEN - ENTFERNT (nur Einfluss, keine Effekte) ===

  // === PUBLIC KARTEN - Neue Effekte ===
  'public.sam_altman.ai_boost': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Sam Altman: +1 Karte, +1 AP (AI Boost)' });
    log('🟢 public.sam_altman.ai_boost');
  },

  'public.malala_yousafzai.education_aura': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Malala Yousafzai: +1 Karte (Education Aura)' });
    log('🟢 public.malala_yousafzai.education_aura');
  },

  'public.edward_sn0wden.whistleblower': ({ enqueue, player, log }) => {
    const otherPlayer = player === 1 ? 2 : 1;
    enqueue({ type: 'DISCARD_RANDOM_FROM_HAND', player: otherPlayer, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Edward Snowden: Gegner verwirft 1 Karte (Whistleblower)' });
    log('🟢 public.edward_sn0wden.whistleblower');
  },

  'public.julian_assange.leak': ({ enqueue, player, log }) => {
    const otherPlayer = player === 1 ? 2 : 1;
    enqueue({ type: 'DISCARD_RANDOM_FROM_HAND', player: otherPlayer, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Julian Assange: Gegner verwirft 1 Karte (Leak)' });
    log('🟢 public.julian_assange.leak');
  },

  'public.yuval_noah_harari.academia': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Yuval Noah Harari: +1 Karte (Academia)' });
    log('🟢 public.yuval_noah_harari.academia');
  },

  'public.alexei_navalny.opposition': ({ enqueue, player, log }) => {
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Alexei Navalny: +1 AP (Opposition)' });
    log('🟢 public.alexei_navalny.opposition');
  },

  'public.gautam_adani.oligarch': ({ enqueue, player, log }) => {
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Gautam Adani: +1 AP (Oligarch)' });
    log('🟢 public.gautam_adani.oligarch');
  },

  // === GOVERNMENT KARTEN - ENTFERNT (nur Einfluss, keine Effekte) ===

  // === ONGOING INITIATIVES - Aura Effekte ===
  'gov.koalitionszwang.coalition_bonus': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Koalitionszwang: Coalition bonus calculation triggered.' });
    enqueue({ type: 'KOALITIONSZWANG_CALCULATE_BONUS', player });
    log('🟢 gov.koalitionszwang.coalition_bonus');
  },

  'init.algorithmischer_diskurs.media_aura': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Algorithmischer Diskurs: Media aura activated.' });
    log('🟢 init.algorithmischer_diskurs.media_aura');
  },

  'init.wirtschaftlicher_druck.gov_penalty': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Wirtschaftlicher Druck: Government penalty aura activated.' });
    log('🟢 init.wirtschaftlicher_druck.gov_penalty');
  },

  'init.propaganda_network.buff_aura': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Propaganda Network: Buff aura activated.' });
    log('🟢 init.propaganda_network.buff_aura');
  },

  'init.intelligence_liaison.shield_aura': ({ enqueue, player, log }) => {
    // Grant a player-wide shield placeholder (consumed on first damage/deactivate)
    enqueue({ type: 'GRANT_SHIELD', player, amount: 1 } as any);
    enqueue({ type: 'LOG', msg: 'Intelligence Liaison: Shield aura – grant 1 shield until end of turn.' });
    log('🟢 init.intelligence_liaison.shield_aura');
  },

  'init.permanent_lobby_office.ap_aura': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Permanent Lobby Office: AP aura activated.' });
    log('🟢 init.permanent_lobby_office.ap_aura');
  },

  'init.military_show.penalty_aura': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Military Show: Penalty aura activated.' });
    log('🟢 init.military_show.penalty_aura');
  },

  'init.censorship_apparatus.deactivate_aura': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Censorship Apparatus: Deactivate aura activated.' });
    log('🟢 init.censorship_apparatus.deactivate_aura');
  },

  'init.thinktank_pipeline.draw_aura': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Think Tank Pipeline: Draw aura activated.' });
    log('🟢 init.thinktank_pipeline.draw_aura');
  },

  // === TRAPS - Neue Effekte ===
  'trap.counterintel.reveal_hand': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.counterintel.reveal_hand' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Counterintelligence Sting (reveal hand).' });
    log('🟢 trap.counterintel.reveal_hand');
  },

  'trap.public_scandal.influence_penalty': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.public_scandal.influence_penalty' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Public Scandal (influence penalty).' });
    log('🟢 trap.public_scandal.influence_penalty');
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
  'Spin Doctor': 'init.spin_doctor.buff_strongest_gov2',
  'Digitaler Wahlkampf': 'init.digital_campaign.draw2',
  'Surprise Funding': 'init.surprise_funding.ap2',
  'Grassroots Blitz': 'init.grassroots_blitz.draw1_buff1',
  'Strategic Leaks': 'init.strategic_leaks.opp_discard1',
  'Emergency Legislation': 'init.emergency_legislation.grant_shield1',
  'AI Narrative Control': 'init.ai_narrative.register_media_blackout',
  // --- INITIATIVES — NEW MAPPINGS PROVIDED BY USER
  'Partei-Offensive': 'init.party_offensive.deactivate_gov',
  'Oppositionsblockade': 'init.opposition_blockade.lock_initiatives',
  'Verzögerungsverfahren': 'init.delay_tactics.ap_or_draw',
  'Think-tank': 'init.think_tank.draw1_buff_gov2',
  'Influencer-Kampagne': 'init.influencer_campaign.double_public',
  'Systemrelevant': 'init.system_critical.shield1',
  'Symbolpolitik': 'init.symbolic_politics.draw1',
  'Napoleon Komplex': 'init.napoleon_komplex.tier1_gov_plus1',
  'Opportunist': 'init.opportunist.mirror_ap_effects',
  'Skandalspirale': 'init.skandalspirale.w6_check',

  // Strategic Disclosure is a trap but legacy name mapping kept for compatibility
  'Strategische Enthüllung': 'trap.strategic_disclosure.return_gov',

  // INTERVENTIONS
  'Fake News Campaign': 'trap.fake_news.deactivate_media',
  'Fake News-Kampagne': 'trap.fake_news.deactivate_media',
  'Whistleblower': 'trap.whistleblower.debuff_next_gov_minus2',
  'Data Breach Exposure': 'trap.data_breach.opp_discard2',
  'Legal Injunction': 'trap.legal_injunction.cancel_next_initiative',
  'Media Blackout': 'trap.media_blackout.deactivate_public',
  'Budget Freeze': 'trap.budget_freeze.opp_ap_minus2',
  'Sabotage Operation': 'trap.sabotage.deactivate_gov',
  // --- TRAPS — NEW MAPPINGS PROVIDED BY USER
  'Interne Fraktionskämpfe': 'trap.internal_faction_strife.cancel_big_initiative',
  'Boykott-Kampagne': 'trap.boycott.deactivate_ngo_movement',
  'Deepfake-Skandal': 'trap.deepfake.lock_diplomat_transfer',
  'Cyber-Attacke': 'trap.cyber_attack.destroy_platform',
  'Bestechungsskandal 2.0': 'corruption.bribery_v2.steal_gov_w6',
  'Grassroots-Widerstand': 'trap.grassroots_resistance.deactivate_public',
  'Massenproteste': 'trap.mass_protests.debuff_two_govs',
  'Berater-Affäre': 'trap.advisor_scandal.minus2_gov_tier1',
  'Parlament geschlossen': 'trap.parliament_closed.stop_more_gov',
  '"Unabhängige" Untersuchung': 'trap.independent_investigation.cancel_trap',
  'Soft Power-Kollaps': 'trap.soft_power_collapse.minus3_diplomat',
  'Cancel Culture': 'trap.cancel_culture.deactivate_public',
  'Lobby Leak': 'trap.lobby_leak.force_discard_on_ngo',
  'Maulwurf': 'corruption.mole.steal_weakest_gov',
  'Tunnelvision': 'init.tunnel_vision.gov_probe_system',
  'Satire-Show': 'trap.satire_show.minus2_enemy_gov',

  // Legacy fallbacks for old cards without new effectKeys
  'Bill Gates': 'public.bill_gates.next_initiative_ap1',
  'Greta Thunberg': 'public.greta_thunberg.first_gov_ap1',
  'Jack Ma': 'public.jack_ma.draw1',
  'Zhang Yiming': 'public.zhang_yiming.draw1_ap1',
  'Mukesh Ambani': 'public.mukesh_ambani.ap1',
  'Roman Abramovich': 'public.roman_abramovich.ap1',
  'Alisher Usmanov': 'public.alisher_usmanov.draw1',
  'Oprah Winfrey': 'public.oprah_winfrey.deactivate_hands',
  'George Soros': 'public.george_soros.ap1',
  'Warren Buffett': 'public.warren_buffett.draw2_ap1',
  'Jeff Bezos': 'public.jeff_bezos.ap2',
  'Larry Page': 'public.larry_page.draw1_ap1',
  'Sergey Brin': 'public.sergey_brin.draw1_ap1',
  'Tim Cook': 'public.tim_cook.ap2',
  'Koalitionszwang': 'gov.koalitionszwang.coalition_bonus',
  // Government cards removed - no effects, only influence
};

// Legacy effect handlers removed - all handlers now use Registry Keys

// Main function to trigger card effects via registry
export function triggerCardEffect(state: GameState, player: Player, card: Card): void {
  if (!(state as any)._effectQueue) (state as any)._effectQueue = [];

  const enqueue = (event: EffectEvent) => {
    (state as any)._effectQueue!.push(event);
    logger.dbg(`ENQ ${event.type}`, event);
  };

  const log = (msg: string) => {
    logger.info(msg);
  };

  // First try to get effect key from card definition
  const effectKey = card.effectKey;

  // Diagnostic logging for effect resolution
  logger.dbg(`triggerCardEffect: card=${card.name} effectKey=${String(effectKey)}`);
  console.log('🔥 TRIGGER CARD EFFECT:', card.name, 'effectKey:', effectKey);
  if (effectKey) {
    const effectFn = EFFECTS[effectKey];
    logger.dbg(`triggerCardEffect: lookup effectKey=${effectKey} found=${Boolean(effectFn)}`);
    console.log('🔥 EFFECT FUNCTION FOUND:', Boolean(effectFn));
    if (effectFn) {
      console.log('🔥 CALLING EFFECT FUNCTION FOR:', card.name);
      effectFn({ enqueue, player, log });
      return;
    }
  }

  // Fallback to legacy name mapping for backward compatibility
  const legacyKey = LEGACY_NAME_TO_KEY[card.name];
  logger.dbg(`triggerCardEffect: legacyKey=${String(legacyKey)}`);
  if (legacyKey) {
    // Try effects registry
    const effectFn = EFFECTS[legacyKey];
    logger.dbg(`triggerCardEffect: lookup legacyKey=${legacyKey} found=${Boolean(effectFn)}`);
    if (effectFn) {
      effectFn({ enqueue, player, log });
      return;
    }
  }

  logger.warn(`No effect implementation found for card: ${card.name} (effectKey: ${effectKey})`);
}

// Export effects registry
export const EFFECT_REGISTRY = { ...EFFECTS };
