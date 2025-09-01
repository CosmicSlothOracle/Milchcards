import { GameState, Player, Card } from '../types/game';
import { EffectEvent } from '../types/effects';
import { resolveQueue } from '../utils/queue';
import { getStrongestGovernmentUid } from '../utils/targets';
import { triggerCardEffect } from './registry';

// Legacy German ↔ effectKey mapping (fallback until all cards get effectKey directly)
export const LEGACY_NAME_TO_KEY: Record<string, string> = {
  'Bill Gates': 'public.bill_gates.next_initiative_ap1',
  // --- Instant Initiatives ---
  'Partei-Offensive':        'init.party_offensive.deactivate_gov',
  'Oppositionsblockade':     'init.opposition_blockade.lock_initiatives',
  'Verzögerungsverfahren':   'init.delay_tactics.ap_or_draw',
  'Think-tank':              'init.think_tank.draw1_buff_gov2',
  'Influencer-Kampagne':     'init.influencer_campaign.double_public',
  'Systemrelevant':          'init.system_critical.shield1',
  'Symbolpolitik':           'init.symbolic_politics.draw1',
  'Opportunist':             'init.opportunist.mirror_ap_effects',
  // vorhanden
  'Digitaler Wahlkampf':     'init.digital_campaign.draw2',

  // --- Traps ---
  'Interne Fraktionskämpfe': 'trap.internal_faction_strife.cancel_big_initiative',
  'Boykott-Kampagne':        'trap.boycott.deactivate_ngo_movement',
  'Deepfake-Skandal':        'trap.deepfake.lock_diplomat_transfer',
  'Cyber-Attacke':           'trap.cyber_attack.destroy_platform',
  'Bestechungsskandal 2.0':  'trap.bribery_v2.mind_control_weak_gov',
  'Grassroots-Widerstand':   'trap.grassroots_resistance.deactivate_public',
  'Massenproteste':          'trap.mass_protests.debuff_two_govs',
  'Berater-Affäre':          'trap.advisor_scandal.minus2_gov_tier1',
  'Parlament geschlossen':   'trap.parliament_closed.stop_more_gov',
  '"Unabhängige" Untersuchung': 'trap.independent_investigation.cancel_trap',
  'Soft Power-Kollaps':      'trap.soft_power_collapse.minus3_diplomat',
  'Cancel Culture':          'trap.cancel_culture.deactivate_public',
  'Lobby Leak':              'trap.lobby_leak.force_discard_on_ngo',
  'Maulwurf':                'trap.mole.copy_weaker_gov',
  'Tunnelvision':            'trap.tunnel_vision.ignore_weak_gov',
  'Satire-Show':             'trap.satire_show.minus2_enemy_gov',
  'Strategische Enthüllung': 'trap.strategic_disclosure.return_gov',
  // vorhanden
  'Fake News-Kampagne':      'trap.fake_news.deactivate_media',
};

function other(p: Player): Player { return p === 1 ? 2 : 1; }

export function triggerCardEffects(state: GameState, player: Player, card: Card) {
  // Use registry system exclusively
  triggerCardEffect(state, player, card);
}
