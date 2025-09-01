export type CardType = 'public' | 'government' | 'initiative' | 'intervention';

export type CardDef = {
  id: string;
  name: string;
  type: CardType;
  tags?: string[];
  hpCost: number;              // Deckbuilding HP (balanced values)
  effectKey?: string;          // Registry key; nur für Karten mit aktivem Effekt notwendig
  // Additional fields for compatibility with existing Card interface
  key?: string;                // Legacy key field
  kind?: 'pol' | 'spec';       // Legacy kind field
  baseId?: number;             // Legacy baseId field
};

// kleine Helper
const P = (id: string, name: string, tags: string[] = [], hp = 2, effectKey?: string): CardDef =>
  ({ id, name, type: 'public', tags, hpCost: hp, effectKey });

const G = (id: string, name: string, tags: string[] = [], hp = 2, effectKey?: string): CardDef =>
  ({ id, name, type: 'government', tags, hpCost: hp, effectKey });

const I = (id: string, name: string, tags: string[] = [], hp = 2, effectKey?: string): CardDef =>
  ({ id, name, type: 'initiative', tags, hpCost: hp, effectKey });

const T = (id: string, name: string, tags: string[] = [], hp = 2, effectKey?: string): CardDef =>
  ({ id, name, type: 'intervention', tags, hpCost: hp, effectKey });

export const CARDS: CardDef[] = [
  // ----- PUBLIC (mit implementierten Effekten) -----
  P('public.elon_musk', 'Elon Musk', ['Tech','Media'], 4, 'public.elon.draw_ap'),
  P('public.mark_zuckerberg', 'Mark Zuckerberg', ['Tech','Platform'], 3, 'public.zuck.once_ap_on_activation'),
  P('public.jennifer_doudna', 'Jennifer Doudna', ['Science'], 3, 'public.doudna.aura_science'),
  P('public.anthony_fauci', 'Anthony Fauci', ['Health'], 3, 'public.fauci.aura_health'),
  P('public.noam_chomsky', 'Noam Chomsky', ['Academia'], 3, 'public.chomsky.aura_military_penalty'),
  P('public.ai_weiwei', 'Ai Weiwei', ['Art','Activist'], 4, 'public.aiweiwei.on_activate_draw_ap'),

  // ----- weitere PUBLIC (mit Effect Keys) -----
  P('public.bill_gates', 'Bill Gates', ['Tech','Philanthropy'], 6, 'public.bill_gates.next_initiative_ap1'),
  P('public.oprah_winfrey', 'Oprah Winfrey', ['Media'], 3, 'public.oprah_winfrey.deactivate_hands'),
  P('public.sam_altman', 'Sam Altman', ['Tech'], 3, 'public.sam_altman.ai_boost'),
  P('public.george_soros', 'George Soros', ['Finance'], 4, 'public.george_soros.ap1'),
  P('public.greta_thunberg', 'Greta Thunberg', ['Movement','Climate'], 3, 'public.greta_thunberg.first_gov_ap1'),
  P('public.jack_ma', 'Jack Ma', ['Tech'], 3, 'public.jack_ma.draw1'),
  P('public.malala_yousafzai', 'Malala Yousafzai', ['Movement','Education'], 3, 'public.malala_yousafzai.education_aura'),
  P('public.roman_abramovich', 'Roman Abramovich', ['Oligarch'], 4, 'public.roman_abramovich.ap1'),
  P('public.tim_cook', 'Tim Cook', ['Tech'], 3, 'public.tim_cook.ap2'),
  P('public.mukesh_ambani', 'Mukesh Ambani', ['Oligarch'], 4, 'public.mukesh_ambani.ap1'),
  P('public.jeff_bezos', 'Jeff Bezos', ['Tech'], 4, 'public.jeff_bezos.ap2'),
  P('public.edward_sn0wden', 'Edward Snowden', ['Whistleblower'], 3, 'public.edward_sn0wden.whistleblower'),
  P('public.julian_assange', 'Julian Assange', ['Whistleblower'], 3, 'public.julian_assange.leak'),
  P('public.yuval_noah_harari', 'Yuval Noah Harari', ['Academia'], 3, 'public.yuval_noah_harari.academia'),
  P('public.alexei_navalny', 'Alexei Navalny', ['Opposition'], 3, 'public.alexei_navalny.opposition'),
  P('public.warren_buffett', 'Warren Buffett', ['Finance'], 4, 'public.warren_buffett.draw2_ap1'),
  P('public.gautam_adani', 'Gautam Adani', ['Oligarch'], 4, 'public.gautam_adani.oligarch'),
  // Legacy PUBLIC Karten (existieren in Legacy Handlern)
  P('public.zhang_yiming', 'Zhang Yiming', ['Tech'], 3, 'public.zhang_yiming.draw1_ap1'),
  P('public.alisher_usmanov', 'Alisher Usmanov', ['Oligarch'], 4, 'public.alisher_usmanov.draw1'),
  P('public.larry_page', 'Larry Page', ['Tech'], 3, 'public.larry_page.draw1_ap1'),
  P('public.sergey_brin', 'Sergey Brin', ['Tech'], 3, 'public.sergey_brin.draw1_ap1'),

  // ----- GOVERNMENT (nur Einfluss, keine Effekte) -----
  G('gov.vladimir_putin', 'Vladimir Putin', [], 8),
  G('gov.xi_jinping', 'Xi Jinping', [], 8),
  G('gov.ursula_von_der_leyen', 'Ursula von der Leyen', [], 6),
  G('gov.joe_biden', 'Joe Biden', [], 7),
  G('gov.olaf_scholz', 'Olaf Scholz', [], 6),

  // ----- INITIATIVES — INSTANT (mit implementierten Effekten) -----
  I('init.spin_doctor', 'Spin Doctor', ['Instant','Buff'], 3, 'init.spin_doctor.buff_strongest_gov2'),
  I('init.digitaler_wahlkampf', 'Digitaler Wahlkampf', ['Instant','Media','Draw'], 3, 'init.digital_campaign.per_media'),
  I('init.surprise_funding', 'Surprise Funding', ['Instant','AP'], 2, 'init.surprise_funding.ap2'),

  // ----- INITIATIVES — INSTANT (neue/ergänzte Keys) -----
  I('init.grassroots_blitz', 'Grassroots Blitz', ['Instant','Draw','Buff'], 3, 'init.grassroots_blitz.draw1_buff1'),
  I('init.strategic_leaks', 'Strategic Leaks', ['Instant','Hand'], 4, 'init.strategic_leaks.opp_discard1'),
  I('init.emergency_legislation', 'Emergency Legislation', ['Instant','Shield'], 4, 'init.emergency_legislation.grant_shield1'),
  I('init.ai_narrative', 'AI Narrative Control', ['Instant','Media'], 4, 'init.ai_narrative.register_media_blackout'),
  // ----- INITIATIVES — INSTANT (neu) -----
  I('init.party_offensive', 'Party Offensive', ['Instant','Deactivate','Government'], 4, 'init.party_offensive.deactivate_gov'),
  I('init.opposition_blockade', 'Opposition Blockade', ['Instant','Lock'], 4, 'init.opposition_blockade.lock_initiatives'),
  I('init.delay_tactics', 'Delay Tactics', ['Instant','AP','Draw'], 3, 'init.delay_tactics.ap_or_draw'),
  I('init.think_tank', 'Think Tank', ['Instant','Draw','Buff'], 4, 'init.think_tank.draw1_buff_gov2'),
  I('init.influencer_campaign', 'Influencer Campaign', ['Instant','Public','Aura'], 4, 'init.influencer_campaign.double_public'),
  I('init.system_critical', 'System-Critical', ['Instant','Shield','Public'], 3, 'init.system_critical.shield1'),
  I('init.symbolic_politics', 'Symbolic Politics', ['Instant','Draw'], 2, 'init.symbolic_politics.draw1'),

  // ----- INITIATIVES — ONGOING (mit effectKeys für SoT/Auren) -----
  I('init.koalitionszwang', 'Koalitionszwang (Regierung)', ['Ongoing'], 4, 'init.koalitionszwang.gov_aura'),
  I('init.algorithmischer_diskurs', 'Algorithmischer Diskurs (Oeffentlichkeit)', ['Ongoing','Media'], 4, 'init.algorithmischer_diskurs.media_aura'),
  I('init.wirtschaftlicher_druck', 'Wirtschaftlicher Druck (Regierung)', ['Ongoing'], 4, 'init.wirtschaftlicher_druck.gov_penalty'),
  I('init.napoleon_komplex', 'Napoleon Komplex', ['Ongoing','Government','Buff'], 4, 'init.napoleon_komplex.tier1_gov_plus1'),
  I('init.propaganda_network', 'Propaganda Network', ['Ongoing','Buff'], 4, 'init.propaganda_network.buff_aura'),
  I('init.intelligence_liaison', 'Intelligence Liaison', ['Ongoing','Shield'], 4, 'init.intelligence_liaison.shield_aura'),
  I('init.permanent_lobby_office', 'Permanent Lobby Office', ['Ongoing','AP'], 4, 'init.permanent_lobby_office.ap_aura'),
  I('init.military_show', 'Military Show of Force', ['Ongoing','Penalty'], 4, 'init.military_show.penalty_aura'),
  I('init.censorship_apparatus', 'Censorship Apparatus', ['Ongoing','Deactivate'], 4, 'init.censorship_apparatus.deactivate_aura'),
  I('init.thinktank_pipeline', 'Think Tank Pipeline', ['Ongoing','Draw'], 4, 'init.thinktank_pipeline.draw_aura'),

  // ----- INITIATIVES — INSTANT (fehlende Implementierungen) -----
  I('init.opportunist', 'Opportunist', ['Instant','Mirror'], 3, 'init.opportunist.mirror_ap_effects'),

  // ----- INTERVENTIONS (TRAPS) -----
  T('trap.fake_news', 'Fake News Campaign', ['Trap','Media'], 3, 'trap.fake_news.deactivate_media'),
  T('trap.whistleblower', 'Whistleblower', ['Trap','Return'], 4, 'trap.whistleblower.return_last_played'),
  T('trap.data_breach', 'Data Breach Exposure', ['Trap','Discard'], 4, 'trap.data_breach.opp_discard2'),
  T('trap.legal_injunction', 'Legal Injunction', ['Trap','Cancel'], 5, 'trap.legal_injunction.cancel_next_initiative'),
  T('trap.media_blackout', 'Media Blackout', ['Trap','Deactivate','Public'], 5, 'trap.media_blackout.deactivate_public'),
  T('trap.counterintel', 'Counterintelligence Sting', ['Trap','Reveal'], 5, 'trap.counterintel.reveal_hand'),
  T('trap.public_scandal', 'Public Scandal', ['Trap','Influence'], 4, 'trap.public_scandal.influence_penalty'),
  T('trap.budget_freeze', 'Budget Freeze', ['Trap','AP'], 5, 'trap.budget_freeze.opp_ap_minus2'),
  T('trap.sabotage', 'Sabotage Operation', ['Trap','Deactivate','Government'], 5, 'trap.sabotage.deactivate_gov'),
  // ----- INTERVENTIONS (new traps) -----
  T('trap.internal_faction_strife', 'Internal Faction Strife', ['Trap','Cancel'], 5, 'trap.internal_faction_strife.cancel_big_initiative'),
  T('trap.boycott', 'Boycott Campaign', ['Trap','Deactivate'], 4, 'trap.boycott.deactivate_ngo_movement'),
  T('trap.deepfake', 'Deepfake Scandal', ['Trap','Lock'], 5, 'trap.deepfake.lock_diplomat_transfer'),
  T('trap.cyber_attack', 'Cyber Attack', ['Trap','Destroy'], 5, 'trap.cyber_attack.destroy_platform'),
  I('corruption.bribery_v2', 'Bribery Scandal 2.0', ['Corruption','Dice','Control'], 5, 'corruption.bribery_v2.steal_gov_w6'),
  T('trap.grassroots_resistance', 'Grassroots Resistance', ['Trap','Deactivate'], 4, 'trap.grassroots_resistance.deactivate_public'),
  T('trap.mass_protests', 'Mass Protests', ['Trap','Debuff'], 4, 'trap.mass_protests.debuff_two_govs'),
  T('trap.advisor_scandal', 'Advisor Scandal', ['Trap','Debuff'], 4, 'trap.advisor_scandal.minus2_gov_tier1'),
  T('trap.parliament_closed', 'Parliament Closed', ['Trap','Stop'], 5, 'trap.parliament_closed.stop_more_gov'),
  T('trap.independent_investigation', '"Independent" Investigation', ['Trap','Cancel'], 4, 'trap.independent_investigation.cancel_trap'),
  T('trap.soft_power_collapse', 'Soft-Power Collapse', ['Trap','Debuff'], 5, 'trap.soft_power_collapse.minus3_diplomat'),
  T('trap.cancel_culture', 'Cancel Culture', ['Trap','Deactivate'], 4, 'trap.cancel_culture.deactivate_public'),
  T('trap.lobby_leak', 'Lobby Leak', ['Trap','Discard'], 4, 'trap.lobby_leak.force_discard_on_ngo'),
  T('trap.mole', 'Mole', ['Trap','Copy'], 4, 'trap.mole.copy_weaker_gov'),
  T('trap.scandal_spiral', 'Scandal Spiral', ['Trap','Cancel'], 5, 'trap.scandal_spiral.cancel_one_of_two'),
  T('trap.tunnel_vision', 'Tunnel Vision', ['Trap','Ignore'], 4, 'trap.tunnel_vision.ignore_weak_gov'),
  T('trap.satire_show', 'Satire Show', ['Trap','Debuff'], 4, 'trap.satire_show.minus2_enemy_gov'),
];

export const CARD_BY_ID: Record<string, CardDef> =
  Object.fromEntries(CARDS.map(c => [c.id, c]));

export function isInstant(card:any){
  if (!card) return false;
  if (card.tags?.includes('Instant')) return true;
  // Fallback: bekannte Keys-Präfixe
  const k = (card as any).effectKey as string | undefined;
  return !!(k && (k.startsWith('init.') || k.startsWith('trap.'))) && (card.type === 'initiative');
}
