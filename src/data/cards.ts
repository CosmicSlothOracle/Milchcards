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

const G = (id: string, name: string, tags: string[] = [], hp = 2): CardDef =>
  ({ id, name, type: 'government', tags, hpCost: hp });

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

  // ----- weitere PUBLIC (ohne direkten EffektKey; später ergänzen) -----
  P('public.bill_gates', 'Bill Gates', ['Tech','Philanthropy'], 4),
  P('public.oprah_winfrey', 'Oprah Winfrey', ['Media'], 3),
  P('public.sam_altman', 'Sam Altman', ['Tech'], 3),
  P('public.george_soros', 'George Soros', ['Finance'], 4),
  P('public.greta_thunberg', 'Greta Thunberg', ['Movement','Climate'], 3),
  P('public.jack_ma', 'Jack Ma', ['Tech'], 3),
  P('public.malala_yousafzai', 'Malala Yousafzai', ['Movement','Education'], 3),
  P('public.roman_abramovich', 'Roman Abramovich', ['Oligarch'], 4),
  P('public.tim_cook', 'Tim Cook', ['Tech'], 3),
  P('public.mukesh_ambani', 'Mukesh Ambani', ['Oligarch'], 4),
  P('public.jeff_bezos', 'Jeff Bezos', ['Tech'], 4),
  P('public.edward_sn0wden', 'Edward Snowden', ['Whistleblower'], 3),
  P('public.julian_assange', 'Julian Assange', ['Whistleblower'], 3),
  P('public.yuval_noah_harari', 'Yuval Noah Harari', ['Academia'], 3),
  P('public.alexei_navalny', 'Alexei Navalny', ['Opposition'], 3),
  P('public.warren_buffett', 'Warren Buffett', ['Finance'], 4),
  P('public.gautam_adani', 'Gautam Adani', ['Oligarch'], 4),

  // ----- GOVERNMENT (reine Träger, Effekte durch Initiatives/Interventions) -----
  G('gov.vladimir_putin', 'Vladimir Putin', ['Politician','Tier2'], 8),
  G('gov.xi_jinping', 'Xi Jinping', ['Politician','Tier2'], 8),
  G('gov.ursula_von_der_leyen', 'Ursula von der Leyen', ['Politician','EU'], 6),
  G('gov.joe_biden', 'Joe Biden', ['Politician','US'], 7),
  G('gov.olaf_scholz', 'Olaf Scholz', ['Politician','DE'], 6),

  // ----- INITIATIVES — INSTANT (mit implementierten Effekten) -----
  I('init.shadow_lobbying', 'Shadow Lobbying', ['Instant','Buff'], 3, 'init.shadow_lobbying.buff2'),
  I('init.spin_doctor', 'Spin Doctor', ['Instant','Buff'], 3, 'init.spin_doctor.buff_strongest_gov2'),
  I('init.digitaler_wahlkampf', 'Digitaler Wahlkampf', ['Instant','Media','Draw'], 3, 'init.digital_campaign.draw2'),
  I('init.surprise_funding', 'Surprise Funding', ['Instant','AP'], 2, 'init.surprise_funding.ap2'),

  // ----- INITIATIVES — INSTANT (neue/ergänzte Keys) -----
  I('init.grassroots_blitz', 'Grassroots Blitz', ['Instant','Draw','Buff'], 3, 'init.grassroots_blitz.draw1_buff1'),
  I('init.strategic_leaks', 'Strategic Leaks', ['Instant','Hand'], 4, 'init.strategic_leaks.opp_discard1'),
  I('init.emergency_legislation', 'Emergency Legislation', ['Instant','Shield'], 4, 'init.emergency_legislation.grant_shield1'),
  I('init.ai_narrative', 'AI Narrative Control', ['Instant','Media'], 4, 'init.ai_narrative.register_media_blackout'),

  // ----- weitere INITIATIVES (Keys pending, später ergänzen) -----
  I('init.partei_offensive', 'Partei-Offensive', ['Instant'], 3),
  I('init.oppositionsblockade', 'Oppositionsblockade', ['Instant'], 3),
  I('init.verzoegerungsverfahren', 'Verzoegerungsverfahren', ['Instant'], 2),
  I('init.opportunist', 'Opportunist', ['Instant'], 2),
  I('init.think_tank', 'Think-tank', ['Instant'], 3),
  I('init.whataboutism', 'Whataboutism', ['Instant'], 2),
  I('init.influencer_kampagne', 'Influencer-Kampagne', ['Instant','Media'], 3),
  I('init.systemrelevant', 'Systemrelevant', ['Instant'], 3),
  I('init.symbolpolitik', 'Symbolpolitik', ['Instant'], 2),

  // ----- INITIATIVES — ONGOING (ohne direkte Keys; über SoT/Auren/Rules später) -----
  I('init.koalitionszwang', 'Koalitionszwang (Regierung)', ['Ongoing'], 4),
  I('init.algorithmischer_diskurs', 'Algorithmischer Diskurs (Oeffentlichkeit)', ['Ongoing','Media'], 4),
  I('init.wirtschaftlicher_druck', 'Wirtschaftlicher Druck (Regierung)', ['Ongoing'], 4),
  I('init.propaganda_network', 'Propaganda Network', ['Ongoing','Buff'], 4),
  I('init.intelligence_liaison', 'Intelligence Liaison', ['Ongoing','Shield'], 4),
  I('init.permanent_lobby_office', 'Permanent Lobby Office', ['Ongoing','AP'], 4),
  I('init.military_show', 'Military Show of Force', ['Ongoing','Penalty'], 4),
  I('init.censorship_apparatus', 'Censorship Apparatus', ['Ongoing','Deactivate'], 4),
  I('init.thinktank_pipeline', 'Think Tank Pipeline', ['Ongoing','Draw'], 4),

  // ----- INTERVENTIONS (TRAPS) -----
  T('trap.fake_news', 'Fake News Campaign', ['Trap','Media'], 3, 'trap.fake_news.deactivate_media'),
  T('trap.whistleblower', 'Whistleblower', ['Trap','Return'], 4, 'trap.whistleblower.return_last_played'),
  T('trap.data_breach', 'Data Breach Exposure', ['Trap','Discard'], 4, 'trap.data_breach.opp_discard2'),
  T('trap.legal_injunction', 'Legal Injunction', ['Trap','Cancel'], 5, 'trap.legal_injunction.cancel_next_initiative'),
  T('trap.media_blackout', 'Media Blackout', ['Trap','Deactivate','Public'], 5, 'trap.media_blackout.deactivate_public'),
  T('trap.counterintel', 'Counterintelligence Sting', ['Trap','Reveal'], 5),
  T('trap.public_scandal', 'Public Scandal', ['Trap','Influence'], 4),
  T('trap.budget_freeze', 'Budget Freeze', ['Trap','AP'], 5, 'trap.budget_freeze.opp_ap_minus2'),
  T('trap.sabotage', 'Sabotage Operation', ['Trap','Deactivate','Government'], 5, 'trap.sabotage.deactivate_gov'),
];

export const CARD_BY_ID: Record<string, CardDef> =
  Object.fromEntries(CARDS.map(c => [c.id, c]));
