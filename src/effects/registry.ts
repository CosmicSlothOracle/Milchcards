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
  // Standard government card - no special effects, just influence
  'gov.standard': ({ enqueue, player, log }) => {
    // Standard government cards provide only influence - no special effects
    log('🟢 gov.standard');
  },

  // Joschka Fischer - NGO boost effect
  'gov.ngo_boost': ({ enqueue, player, log }) => {
    // Joschka Fischer provides NGO synergy - handled by aura system
    log('🟢 gov.ngo_boost');
  },
  // Bill Gates — draw 1; aura steals AP when opponent plays NGO/Think-Tank
  'public.bill_gates.next_initiative_ap1': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Bill Gates: +1 Karte. Aura: stiehlt 1 AP, wenn der Gegner NGO/Think-Tank spielt (1×/Zug).' });
    log('🟢 public.bill_gates.next_initiative_ap1');
  },

  // Beispiel-Karte für visuelle Effekte - Symbolpolitik mit gelblichem +1 AP Effekt
  'init.symbolic_politics.visual_demo': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'ADD_AP', player, amount: 1 }); // Dies triggert automatisch VISUAL_AP_GAIN
    enqueue({ type: 'LOG', msg: 'Symbolpolitik: Ziehe 1 Karte, erhalte +1 AP (mit visueller Animation).' });
    log('🟢 init.symbolic_politics.visual_demo');
  },

  // Erweiterte Demo-Karte mit verschiedenen visuellen Effekten
  'init.visual_effects_demo.comprehensive': ({ enqueue, player, log }) => {
    // 1. AP Gain mit automatischem visuellen Effekt (emit as two atomic +1 events)
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'ADD_AP', player, amount: 1 });

    // 2. Manueller AP Gain Effekt mit spezieller Farbe
    enqueue({
      type: 'VISUAL_AP_GAIN',
      player,
      amount: 1,
      color: '#ff6b6b', // Rot für zusätzlichen AP
      size: 28
    });

    // 3. Einfluss-Buff mit automatischem visuellen Effekt
    enqueue({ type: 'BUFF_STRONGEST_GOV', player, amount: 3 });

    // 4. Manueller Einfluss-Buff mit spezieller Farbe
    enqueue({
      type: 'VISUAL_INFLUENCE_BUFF',
      player,
      amount: 2,
      color: '#a855f7' // Lila für speziellen Buff
    });

    // 5. Karten-Spiel Effekt
    enqueue({
      type: 'VISUAL_CARD_PLAY',
      player,
      cardName: 'Visual Effects Demo',
      effectType: 'initiative'
    });

    enqueue({ type: 'LOG', msg: 'Visual Effects Demo: Zeigt alle verfügbaren visuellen Effekte.' });
    log('🟢 init.visual_effects_demo.comprehensive');
  },

  // Greta Thunberg — aura: steal 1 AP when opponent plays their first government this turn
  'public.greta_thunberg.first_gov_ap1': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Greta Thunberg: Aura – stiehlt 1 AP bei der ersten Regierung des Gegners (1×/Zug).' });
    log('🟢 public.greta_thunberg.first_gov_ap1');
  },

  // --- PUBLIC
  // Reactive steal-AP design (avoid infinite engines):
  // - While on board, steal 1 AP when the opponent plays a matching card / initiative
  // - Each public card steals at most once per owner turn cycle
  // - STEAL_AP does not mirror via Opportunist
  // Elon Musk — draw 1 on play; steal when opponent plays Oligarch or Einfluss≥7 gov
  'public.elon.draw_ap': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Elon Musk: +1 Karte. Aura: stiehlt 1 AP bei gegnerischem Oligarch oder Regierung mit Einfluss ≥7 (1×/Zug).' });
    log('🟢 public.elon.draw_ap');
  },

  'public.zuck.once_ap_on_activation': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Mark Zuckerberg: Aura aktiv – stiehlt 1 AP, wenn der Gegner eine Initiative aktiviert (1×/Zug).' });
    log('🟢 public.zuck.once_ap_on_activation');
  },

  'public.doudna.aura_science': ({ enqueue, player, log }) => {
    enqueue({ type: 'AURA_SCIENCE', player, active: true });
    enqueue({ type: 'LOG', msg: 'Jennifer Doudna: Science-Aura aktiv – Initiativen stärken die Regierung.' });
    log('🟢 public.doudna.aura_science');
  },

  'public.fauci.aura_health': ({ enqueue, player, log }) => {
    enqueue({ type: 'AURA_HEALTH', player, active: true });
    enqueue({ type: 'LOG', msg: 'Anthony Fauci: Health-Aura aktiv – Initiativen stärken die Regierung.' });
    log('🟢 public.fauci.aura_health');
  },

  'public.chomsky.aura_military_penalty': ({ enqueue, player, log }) => {
    enqueue({ type: 'AURA_MILITARY_PENALTY', player, active: true });
    enqueue({ type: 'LOG', msg: 'Noam Chomsky: Military-Penalty-Aura aktiv – gegnerische Initiativen schwächen deren Regierung.' });
    log('🟢 public.chomsky.aura_military_penalty');
  },

  'public.aiweiwei.on_activate_draw_ap': ({ enqueue, player, log }) => {
    enqueue({ type: 'ON_ACTIVATE_DRAW_AP', player });
    enqueue({ type: 'LOG', msg: 'Ai Weiwei: Aura aktiv – stiehlt 1 AP, wenn der Gegner eine Initiative aktiviert (1×/Zug).' });
    log('🟢 public.aiweiwei.on_activate_draw_ap');
  },

  // --- INITIATIVES — INSTANT
  // Shadow Lobbying – buff per Oligarch (computed in resolver)
  'init.shadow_lobbying.per_oligarch': ({ enqueue, player, log }) => {
    enqueue({ type: 'SHADOW_LOBBYING_BUFF', player });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    log('🟢 init.shadow_lobbying.per_oligarch');
  },

  // Digitaler Wahlkampf – draw 1 per own media/platform card (computed in resolver)
  'init.digital_campaign.per_media': ({ enqueue, player, log }) => {
    enqueue({ type: 'DIGITAL_CAMPAIGN_DRAW', player });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Digitaler Wahlkampf: ziehe 1 pro Medien/Plattform (max 2).' });
    log('🟢 init.digital_campaign.per_media');
  },

  // Whataboutism – reactivate one own deactivated card; gov gets -2 influence
  'init.whataboutism.reactivate_minus1': ({ enqueue, player, log }) => {
    enqueue({ type: 'WHATABOUTISM_REACTIVATE', player });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Whataboutism: reaktiviere eigene Karte (−2 Einfluss bei Regierung).' });
    log('🟢 init.whataboutism.reactivate_minus1');
  },

  'init.spin_doctor.buff_strongest_gov2': ({ enqueue, player, log }) => {
    // Base +1; dirty leaders (corr ≥3) get +2 — resolved dynamically in queue via amount 1 + rider
    enqueue({ type: 'BUFF_STRONGEST_GOV', player, amount: 1, reason: 'SPIN_DOCTOR' } as any);
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Spin Doctor: stärkste Regierung +1 (+2 wenn Korruption ≥3).' });
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
    // Emit as two atomic +1 events to keep ADD_AP semantics consistent
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    enqueue({ type: 'ADD_AP', player, amount: 1 });
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
    enqueue({ type: 'LOG', msg: 'Partei-Offensive: stärkste gegnerische Regierung −3 Einfluss.' });
    log('🟢 init.party_offensive.deactivate_gov');
  },

  'init.opposition_blockade.lock_initiatives': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOCK_OPPONENT_INITIATIVES_EOT', player });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Oppositionsblockade: Gegner kann keine Sofort-Initiativen spielen.' });
    log('🟢 init.opposition_blockade.lock_initiatives');
  },

  'init.delay_tactics.ap_or_draw': ({ enqueue, player, log }) => {
    enqueue({ type: 'ADD_AP', player, amount: 1 });
    // Purge delay: own purge targets −1 this round (buried in process)
    enqueue({ type: 'LOG', msg: 'Verzögerungsverfahren: +1 AP; Säuberungsziele −1 diese Runde.' } as any);
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    log('🟢 init.delay_tactics.ap_or_draw');
    // Flag set via side-channel on state — resolved when INITIATIVE_ACTIVATED runs;
    // set here through a dedicated intent carried as LOG + runtime flag in queue.
  },

  'init.think_tank.draw1_buff_gov2': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'SET_NEXT_GOV_PLUS2', player });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Think-tank: ziehe 1; nächste Regierungskarte +2 Einfluss und −1 Start-Korruption (geprüft).' });
    log('🟢 init.think_tank.draw1_buff_gov2');
  },

  'init.influencer_campaign.double_public': ({ enqueue, player, log }) => {
    enqueue({ type: 'SET_DOUBLE_PUBLIC_AURA', player });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Influencer-Kampagne: Öffentlichkeits-Effekt doppelt; stärkste Regierung +1 Korruption (Paid Reach).' });
    log('🟢 init.influencer_campaign.double_public');
  },

  'init.system_critical.shield1': ({ enqueue, player, log }) => {
    enqueue({ type: 'PROTECT_STRONGEST_GOV', player });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Systemrelevant: Schützt die stärkste Regierungskarte einmalig vor Deaktivierung und einer gescheiterten Säuberung.' });
    log('🟢 init.system_critical.shield1');
  },

  'init.symbolic_politics.draw1': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Symbolpolitik: ziehe 1; stärkste Regierung −1 Korruption (Optik).' });
    log('🟢 init.symbolic_politics.draw1');
  },

  // Redaktionskonferenz – Media/Platform → strongest +2; else draw 1
  'init.redaktionskonferenz.media_or_draw': ({ enqueue, player, log }) => {
    enqueue({ type: 'REDAKTIONSKONFERENZ', player });
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Redaktionskonferenz: Medien/Plattform → +2 stärkste Regierung, sonst ziehe 1.' });
    log('🟢 init.redaktionskonferenz.media_or_draw');
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
    // Legacy key → deactivate behavior
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.cyber_attack.deactivate_platform' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Cyber-Attacke (deaktiviert Plattform).' });
    log('🟢 trap.cyber_attack.destroy_platform (legacy → deactivate)');
  },


  // =============================
  // NEW CORRUPTION INITIATIVE
  // =============================

  'corruption.bribery_v2.steal_gov_w6': ({ enqueue, player, log }) => {
    // Begin corruption flow: open UI modal + mark pending selection
    enqueue({ type: 'CORRUPTION_STEAL_GOV_START', player } as any);
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Bestechungsskandal 2.0: Wähle eine gegnerische Regierungskarte; Erfolg bei W6 ≥ Einfluss.' });
    enqueue({ type: 'LOG', msg: '🔔 Corruption Modal: Ziel wählen, dann Würfeln.' });
    log('🟢 corruption.bribery_v2.steal_gov_w6');
  },

  'corruption.mole.steal_weakest_gov': ({ enqueue, player, log }) => {
    // Begin corruption flow: automatically select weakest opponent government card
    enqueue({ type: 'CORRUPTION_MOLE_STEAL_START', player } as any);
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Maulwurf: Automatische Auswahl der schwächsten gegnerischen Regierungskarte.' });
    // Provide UI hint message for modal (handled by frontend)
    enqueue({ type: 'LOG', msg: '🔔 Maulwurf: Automatische Zielauswahl, dann Würfeln.' });
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
    enqueue({ type: 'LOG', msg: 'Trap set: Cancel Culture (deaktiviert Oligarch/Medien).' });
    log('🟢 trap.cancel_culture.deactivate_public');
  },

  'trap.cyber_attack.deactivate_platform': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.cyber_attack.deactivate_platform' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Cyber-Attacke (deaktiviert Plattform).' });
    log('🟢 trap.cyber_attack.deactivate_platform');
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
    enqueue({ type: 'LOG', msg: 'Tunnelvision: Gegnerische Regierung braucht Freigabe — +1 AP oder +1 Korruption.' });
    enqueue({ type: 'LOG', msg: '🔔 Tunnelvision: deterministisch, kein Würfel.' });
    log('🟢 init.tunnel_vision.gov_probe_system');
  },

  'trap.satire_show.minus2_enemy_gov': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.satire_show.minus2_enemy_gov' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Satire Show (-2 enemy gov).' });
    log('🟢 trap.satire_show.minus2_enemy_gov');
  },

  'trap.strategic_disclosure.return_gov': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.strategic_disclosure.return_gov' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Strategic Disclosure (return gov when opponent would lead/tie; blowback +1 corruption).' });
    log('🟢 trap.strategic_disclosure.return_gov');
  },

  // === ONGOING INITIATIVES ===
  'init.napoleon_komplex.tier1_gov_plus1': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Napoleon Komplex: stärkste Tier-1 +1 Einfluss; kein Transfer; Hybris: Säuberungsziel +1.' });
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

  'init.skandalspirale.deterministic': ({ enqueue, player, log }) => {
    enqueue({ type: 'SKANDALSPIRALE_TRIGGER', player } as any);
    enqueue({ type: 'INITIATIVE_ACTIVATED', player });
    enqueue({ type: 'LOG', msg: 'Skandalspirale: einflussschwächere Seite — stärkste Regierung −2 Einfluss.' });
    log('🟢 init.skandalspirale.deterministic');
  },

  // === PUBLIC KARTEN - Registry Keys für Legacy Handler ===
  'public.oprah_winfrey.deactivate_hands': ({ enqueue, player, log }) => {
    const otherPlayer = player === 1 ? 2 : 1;
    enqueue({ type: 'DISCARD_RANDOM_FROM_HAND', player, amount: 1 });
    enqueue({ type: 'DISCARD_RANDOM_FROM_HAND', player: otherPlayer, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Oprah Winfrey: Beide Spieler verlieren 1 zufällige Handkarte.' });
    log('🟢 public.oprah_winfrey.deactivate_hands');
  },

  'public.george_soros.ap1': ({ enqueue, player, log }) => {
    enqueue({ type: 'SOROS_AP_CHECK', player });
    log('🟢 public.george_soros.ap1');
  },

  'public.jack_ma.draw1': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Jack Ma: +1 Karte' });
    log('🟢 public.jack_ma.draw1');
  },

  'public.zhang_yiming.draw1_ap1': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Zhang Yiming: +1 Karte. Aura: stiehlt 1 AP, wenn der Gegner Medien/Plattform spielt (1×/Zug).' });
    log('🟢 public.zhang_yiming.draw1_ap1');
  },

  'public.mukesh_ambani.ap1': ({ enqueue, player, log }) => {
    const otherPlayer = player === 1 ? 2 : 1;
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'SET_DRAW_PENALTY', player: otherPlayer });
    enqueue({ type: 'LOG', msg: 'Mukesh Ambani: +1 Karte; Gegner zieht 1 Karte weniger nach.' });
    log('🟢 public.mukesh_ambani.ap1');
  },

  'public.roman_abramovich.ap1': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Roman Abramovich: Aura – ziehe 1 Karte, wenn eine Regierungskarte mit Einfluss ≤5 gespielt wird.' });
    log('🟢 public.roman_abramovich.ap1');
  },

  'public.alisher_usmanov.draw1': ({ enqueue, player, log }) => {
    enqueue({ type: 'PROTECT_STRONGEST_GOV', player });
    enqueue({ type: 'LOG', msg: 'Alisher Usmanov: +1 Schutz für eine Regierungskarte.' });
    log('🟢 public.alisher_usmanov.draw1');
  },

  'public.warren_buffett.draw2_ap1': ({ enqueue, player, log }) => {
    // Balance: aura only (start-of-turn) — no on-play AP
    enqueue({ type: 'LOG', msg: 'Warren Buffett: Aura – +1 Einfluss auf stärkste Regierung, wenn du keine Regierungskarte spielst.' });
    log('🟢 public.warren_buffett.draw2_ap1 (aura only)');
  },

  'public.jeff_bezos.oligarch_removal': ({ enqueue, player, log }) => {
    enqueue({ type: 'REMOVE_OTHER_OLIGARCHS', player });
    enqueue({ type: 'LOG', msg: 'Jeff Bezos: Entfernt gegnerische Oligarchen vom Spielfeld' });
    log('🟢 public.jeff_bezos.oligarch_removal');
  },

  'public.tim_cook.ap1_or_platform': ({ enqueue, player, log }) => {
    enqueue({ type: 'TIM_COOK_AP', player } as any);
    log('🟢 public.tim_cook.ap1_or_platform');
  },

  // Legacy key → same Tim Cook behavior
  'public.tim_cook.ap2': ({ enqueue, player, log }) => {
    enqueue({ type: 'TIM_COOK_AP', player } as any);
    log('🟢 public.tim_cook.ap2 (legacy → ap1_or_platform)');
  },

  // === GOVERNMENT KARTEN - ENTFERNT (nur Einfluss, keine Effekte) ===

  // === PUBLIC KARTEN - Neue Effekte ===
  'public.sam_altman.ai_boost': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Sam Altman: Aura – stiehlt 1 AP, wenn der Gegner eine KI-Initiative aktiviert (1×/Zug).' });
    log('🟢 public.sam_altman.ai_boost');
  },

  'public.malala_yousafzai.education_aura': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Malala Yousafzai: Aura – wenn du eine NGO/Think-Tank spielst, ziehe 1 Karte.' });
    log('🟢 public.malala_yousafzai.education_aura');
  },

  'public.edward_sn0wden.whistleblower': ({ enqueue, player, log }) => {
    const otherPlayer = player === 1 ? 2 : 1;
    enqueue({ type: 'DISCARD_RANDOM_FROM_HAND', player: otherPlayer, amount: 1 });
    enqueue({ type: 'SNOWDEN_DEBUFF_US_GOV', player });
    enqueue({ type: 'LOG', msg: 'Edward Snowden: Gegner verwirft 1 Karte; US-Regierungskarte -1 Einfluss.' });
    log('🟢 public.edward_sn0wden.whistleblower');
  },

  'public.julian_assange.leak': ({ enqueue, player, log }) => {
    enqueue({ type: 'ASSANGE_DRAW', player });
    log('🟢 public.julian_assange.leak');
  },

  'public.yuval_noah_harari.academia': ({ enqueue, player, log }) => {
    enqueue({ type: 'HARARI_PLATFORM_AP', player });
    enqueue({ type: 'LOG', msg: 'Yuval Noah Harari: Aura – stiehlt 1 AP, wenn der Gegner eine Plattform spielt (1×/Zug).' });
    log('🟢 public.yuval_noah_harari.academia');
  },

  'public.alexei_navalny.opposition': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Alexei Navalny: Aura – gegnerische Säuberungswürfe −1; einmal pro Runde: enthülle korrupteste gegnerische Regierung (keine Säuberungs-Ermäßigungen).' });
    log('🟢 public.alexei_navalny.opposition (reworked)');
  },

  'public.gautam_adani.oligarch': ({ enqueue, player, log }) => {
    // Balance: no corruption probe bonus; counts as Oligarch for synergies only
    enqueue({ type: 'LOG', msg: 'Gautam Adani: Oligarch – zählt für Oligarchen-Synergien.' });
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
    enqueue({ type: 'ALGO_DISCOURSE_DEBUFF', player });
    enqueue({ type: 'LOG', msg: 'Algorithmischer Diskurs: −1 Einfluss pro gegnerischer Plattform/KI (max 3) +1 Korruption auf debuffte Regierung.' });
    log('🟢 init.algorithmischer_diskurs.media_aura');
  },

  'init.wirtschaftlicher_druck.gov_penalty': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Wirtschaftlicher Druck: Aura – Oligarchen-Karten geben +1 Einfluss auf stärkste Regierung.' });
    log('🟢 init.wirtschaftlicher_druck.gov_penalty');
  },

  'init.zivilgesellschaft.movement_aura': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Zivilgesellschaft: Aura – +1 Einfluss pro Bewegung auf stärkste Regierung (max +2); NGO → +1 AP/Zug; Scrutiny bei Korruption ≥3.' });
    log('🟢 init.zivilgesellschaft.movement_aura');
  },

  'init.milchglas_transparenz.no_ngo_bonus': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Milchglas Transparenz: Aura – +1 auf stärkste Regierung ohne NGO/Bewegung; Zuwachs und Abbau von Korruption −1; Säuberungsziel −1.' });
    log('🟢 init.milchglas_transparenz.no_ngo_bonus');
  },

  'init.alternative_fakten.intervention_dampen': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Alternative Fakten: Aura – gegnerische Interventionen −1; gegnerische Korruption −1; voller Spin → +1 Karte.' });
    log('🟢 init.alternative_fakten.intervention_dampen');
  },

  'init.konzernfreundlicher_algorithmus.platform_aura': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Konzernfreundlicher Algorithmus: Plattform → +1 Karte; Oligarch mit Plattform → +1 Einfluss und +1 Korruption.' });
    log('🟢 init.konzernfreundlicher_algorithmus.platform_aura');
  },

  'init.strassenmandat.movement_aura': ({ enqueue, player, log }) => {
    enqueue({ type: 'LOG', msg: 'Straßenmandat: Aura – Bewegung gespielt → stärkste Regierung +1 (max +2/Zug); mit NGO zusätzlich +1 AP (1×/Zug).' });
    log('🟢 init.strassenmandat.movement_aura');
  },

  'trap.aufsichtsmandat.counter_stack': ({ enqueue, player, log }) => {
    enqueue({ type: 'REGISTER_TRAP', player, key: 'trap.aufsichtsmandat.counter_stack' } as any);
    enqueue({ type: 'LOG', msg: 'Trap set: Aufsichtsmandat (bei ≥2 Temp-Buff auf gegnerischer stärkster Regierung: −1 Einfluss +1 Korruption).' });
    log('🟢 trap.aufsichtsmandat.counter_stack');
  },

  'init.propaganda_network.buff_aura': ({ enqueue, player, log }) => {
    enqueue({ type: 'BUFF_STRONGEST_GOV', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Propaganda Network: stärkste Regierung +1 Einfluss.' });
    log('🟢 init.propaganda_network.buff_aura');
  },

  'init.intelligence_liaison.shield_aura': ({ enqueue, player, log }) => {
    // Grant a player-wide shield placeholder (consumed on first damage/deactivate)
    enqueue({ type: 'GRANT_SHIELD', player, amount: 1 } as any);
    enqueue({ type: 'LOG', msg: 'Intelligence Liaison: Shield aura – grant 1 shield until end of turn.' });
    log('🟢 init.intelligence_liaison.shield_aura');
  },

  'init.permanent_lobby_office.ap_aura': ({ enqueue, player, log }) => {
    enqueue({ type: 'SET_NEXT_INITIATIVE_AP_BONUS', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Permanent Lobby Office: nächste Initiative gibt +1 AP.' });
    log('🟢 init.permanent_lobby_office.ap_aura');
  },

  'init.military_show.penalty_aura': ({ enqueue, player, log }) => {
    const opp = player === 1 ? 2 : 1;
    enqueue({ type: 'BUFF_STRONGEST_GOV', player: opp, amount: -1 });
    enqueue({ type: 'LOG', msg: 'Military Show: gegnerische stärkste Regierung -1 Einfluss.' });
    log('🟢 init.military_show.penalty_aura');
  },

  'init.censorship_apparatus.deactivate_aura': ({ enqueue, player, log }) => {
    const opp = player === 1 ? 2 : 1;
    enqueue({ type: 'DEACTIVATE_RANDOM_HAND', player: opp, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Censorship Apparatus: 1 zufällige gegnerische Handkarte deaktiviert.' });
    log('🟢 init.censorship_apparatus.deactivate_aura');
  },

  'init.thinktank_pipeline.draw_aura': ({ enqueue, player, log }) => {
    enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
    enqueue({ type: 'LOG', msg: 'Think Tank Pipeline: ziehe 1 Karte.' });
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
  'Digitaler Wahlkampf': 'init.digital_campaign.per_media',
  'Scandal Spiral': 'trap.scandal_spiral.cancel_one_of_two',
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
  'Redaktionskonferenz': 'init.redaktionskonferenz.media_or_draw',
  'Straßenmandat': 'init.strassenmandat.movement_aura',
  'Aufsichtsmandat': 'trap.aufsichtsmandat.counter_stack',
  'Napoleon Komplex': 'init.napoleon_komplex.tier1_gov_plus1',
  'Opportunist': 'init.opportunist.mirror_ap_effects',
  'Skandalspirale': 'init.skandalspirale.deterministic',
  'Whataboutism': 'init.whataboutism.reactivate_minus1',

  // INITIATIVES — ONGOING (Dauerhaft)
  'Algorithmischer Diskurs': 'init.algorithmischer_diskurs.media_aura',
  'Wirtschaftlicher Druck': 'init.wirtschaftlicher_druck.gov_penalty',
  'Zivilgesellschaft': 'init.zivilgesellschaft.movement_aura',
  'Milchglas Transparenz': 'init.milchglas_transparenz.no_ngo_bonus',
  'Alternative Fakten': 'init.alternative_fakten.intervention_dampen',
  'Konzernfreundlicher Algorithmus': 'init.konzernfreundlicher_algorithmus.platform_aura',

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
  'Cyber-Attacke': 'trap.cyber_attack.deactivate_platform',
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
  'Jeff Bezos': 'public.jeff_bezos.oligarch_removal',
  'Tim Cook': 'public.tim_cook.ap1_or_platform',
  'Sam Altman': 'public.sam_altman.ai_boost',
  'Malala Yousafzai': 'public.malala_yousafzai.education_aura',
  'Edward Snowden': 'public.edward_sn0wden.whistleblower',
  'Julian Assange': 'public.julian_assange.leak',
  'Yuval Noah Harari': 'public.yuval_noah_harari.academia',
  'Alexei Navalny': 'public.alexei_navalny.opposition',
  'Gautam Adani': 'public.gautam_adani.oligarch',
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
  logger.info(`🔥 TRIGGER CARD EFFECT: ${card.name} effectKey: ${String(effectKey)}`);
  if (effectKey) {
    const effectFn = EFFECTS[effectKey];
    logger.dbg(`triggerCardEffect: lookup effectKey=${effectKey} found=${Boolean(effectFn)}`);
    logger.dbg(`🔥 EFFECT FUNCTION FOUND: ${Boolean(effectFn)}`);
    if (effectFn) {
      logger.dbg(`🔥 CALLING EFFECT FUNCTION FOR: ${card.name}`);
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
