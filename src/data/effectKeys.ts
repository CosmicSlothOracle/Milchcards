export const EK = {
  // generic statuses
  PROTECTED: 'protected',
  DEACTIVATED: 'deactivated',

  // Simplified AP system: No discounts or refunds

  // initiatives (instant)
  I_ADD_TARGET: 'i_add_target',               // Spin Doctor (+2 I / +1 Medien)
  DRAW_CARDS: 'draw_cards',                   // Digitaler Wahlkampf, Symbolpolitik
  AP_MOD: 'ap_mod',                           // Verzögerungsverfahren (+1 AP)
  REACTIVATE_MINUS1: 'reactivate_minus1',     // Whataboutism
  REDISTRIBUTE_I: 'redistribute_i',           // Opportunist
  DISABLE_UNTIL_ROUND_END: 'disable_until',   // Partei-Offensive
  BLOCK_INITIATIVES: 'block_initiatives',     // Oppositionsblockade
  DOUBLE_PUBLIC_ONCE: 'double_public_once',   // Shadow Lobbying / Influencer-Kampagne
  SHIELD_ONCE: 'shield_once',                 // Systemrelevant

  // initiatives (ongoing)
  ONGOING_KOALITIONSZWANG: 'ongoing_coalition',
  ONGOING_ALGO_DISKURS: 'ongoing_algo_public',
  ONGOING_WIRTSCHAFT_DRUCK: 'ongoing_econ_pressure',
  ONGOING_ZIVILGESELLSCHAFT: 'ongoing_civil_society',
  ONGOING_MILCHGLAS: 'ongoing_milchglas',
  ONGOING_ALTERNATIVE_FAKTEN: 'ongoing_alt_facts',
  ONGOING_NAPOLEON: 'ongoing_napoleon',
  ONGOING_KONZERN_ALGO: 'ongoing_corp_algo',

  // interventions
  IV_FAKE_NEWS: 'iv_fake_news',
  IV_WHISTLEBLOWER: 'iv_whistleblower',
  IV_STRATEGIC_REVEAL: 'iv_strategic_reveal',
  IV_INTERNAL_FIGHTS: 'iv_internal_fights',
  IV_BOYKOTT: 'iv_boycott',
  IV_DEEPFAKE: 'iv_deepfake',
  IV_CYBER: 'iv_cyber',
  IV_BRIBERY_2: 'iv_bribery2',
  IV_GRASSROOTS: 'iv_grassroots',
  IV_MASSENPROTESTE: 'iv_mass_protests',
  IV_BERATER_AFF: 'iv_beratera',
  IV_PARLAMENT_CLOSED: 'iv_parl_closed',
  IV_UNABHAENGIGE: 'iv_investigation',
  IV_SOFT_POWER_KOLLAPS: 'iv_soft_power',
  IV_CANCEL_CULTURE: 'iv_cancel_culture',
  IV_LOBBY_LEAK: 'iv_lobby_leak',
  IV_MAULWURF: 'iv_maulwurf',
  IV_SKANDALSP: 'iv_scandal_spiral',
  IV_TUNNELVISION: 'iv_tunnelvision',
  IV_SATIRE_SHOW: 'iv_satire_show',

  // Phase 1: Sofort-Initiativen
  DRAW_1: 'draw_1',             // Symbolpolitik
  AP_PLUS_1: 'ap_plus_1',       // Verzögerungsverfahren
  THINK_TANK: 'think_tank',     // Ziehe 1; nächster Gov +2 I
  SPIN_DOCTOR: 'spin_doctor',   // +2 I auf stärkste eigene Gov

  // 🔥 CLUSTER 3: Spezielle Initiative-Boni (Passive Effekte)
  SCIENCE_INITIATIVE_BONUS: 'science_initiative_bonus',     // Jennifer Doudna: +1 Einfluss bei Initiativen
  MILITARY_INITIATIVE_PENALTY: 'military_initiative_penalty', // Noam Chomsky: -1 Einfluss bei Initiativen
  HEALTH_INITIATIVE_BONUS: 'health_initiative_bonus',       // Anthony Fauci: +1 Einfluss bei Initiativen
  CULTURE_INITIATIVE_BONUS: 'culture_initiative_bonus',     // Ai Weiwei: +1 Karte +1 AP bei Initiativen
} as const;

export type EffectKey = typeof EK[keyof typeof EK];

export const EFFECT_KEYS: EffectKey[] = Object.values(EK);

export function assertNever(x: never): never {
  throw new Error(`Unreachable: ${String(x)}`);
}
