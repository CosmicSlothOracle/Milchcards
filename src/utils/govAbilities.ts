/**
 * Government active abilities — unlock at corruption ≥ 3 (Kompromittiert).
 * No AP cost (only playing cards costs AP). Once per round
 * (twice at Kleptokrat / with Musk at corr ≥4).
 * Most abilities self-corrupt (+1) as the price of power.
 */

import { GameState, Player, PoliticianCard } from '../types/game';
import { EffectEvent } from '../types/effects';
import {
  ABILITY_UNLOCK_CORRUPTION,
  activeGovs,
  applyCorruptionDelta,
  getCorruption,
  getMaxAbilityUses,
  mostCorruptGov,
  strongestOwnGov,
} from './corruption';
import { getGlobalRNG } from '../services/rng';
import { findActivePublicCard } from './cardClassification';

function other(p: Player): Player { return p === 1 ? 2 : 1; }

export interface GovAbilityDef {
  key: string;
  name: string;
  description: string;
  /** If true, ability needs a targetUid (enemy or own gov depending on key). */
  needsTarget?: 'enemy_gov' | 'own_gov' | 'any_gov';
}

const NAMED: Record<string, GovAbilityDef> = {
  'Vladimir Putin': {
    key: 'putin_vertical',
    name: 'Vertikale der Macht',
    description: 'Deaktiviere die schwächste gegnerische Regierung bis zu deinem nächsten Zug. Selbst +1 Korruption.',
  },
  'Xi Jinping': {
    key: 'xi_transfer',
    name: 'Anti-Korruptions-Kampagne',
    description: 'Transferiere 2 Korruption von Xi auf eine Ziel-Regierung (eigen oder gegnerisch).',
    needsTarget: 'any_gov',
  },
  'Donald Trump': {
    key: 'trump_alt_truth',
    name: 'Alternative Wahrheit',
    description: 'Ignoriere den gierigen-Pass-Modifikator; +1 Einfluss. Selbst +1 Korruption.',
  },
  'Recep Tayyip Erdoğan': {
    key: 'erdogan_decree',
    name: 'Dekret',
    description: 'Annulliere die Aura einer gegnerischen Dauerhaft-Initiative bis Rundenende. Selbst +1 Korruption.',
  },
  'Mohammed bin Salman': {
    key: 'mbs_ritz',
    name: 'Ritz-Carlton-Methode',
    description: 'Gegnerische Regierung mit Korruption ≥2 deaktivieren, außer der Gegner wirft 1 Karte ab. Selbst +1 Korruption.',
    needsTarget: 'enemy_gov',
  },
  'Benjamin Netanyahu': {
    key: 'bibi_coalition',
    name: 'Koalitionsdisziplin',
    description: 'Andere eigene Regierungen je −1 Korruption; Netanyahu +1 pro gewaschener Karte.',
  },
  'Ebrahim Raisi': {
    key: 'raisi_show_trial',
    name: 'Schauprozess',
    description: 'Sofortige Mini-Säuberung (W6, Ziel 3) auf eine gegnerische Regierung mit Korruption ≥2.',
    needsTarget: 'enemy_gov',
  },
  'Giorgia Meloni': {
    key: 'meloni_right_shift',
    name: 'Rechtsruck',
    description: '+2 Einfluss diese Runde; +1 Korruption wenn sie deine stärkste Regierung ist.',
  },
  'Emmanuel Macron': {
    key: 'macron_jupiter',
    name: 'Jupiter',
    description: 'Kopiere den Korruptions-Einflussbonus der korruptesten gegnerischen Regierung auf Macron.',
  },
  'Justin Trudeau': {
    key: 'trudeau_sunny',
    name: 'Sunny Ways',
    description: '−1 Korruption auf Trudeau; nächstes Audit einer eigenen Karte −1 Stufe.',
  },
  'Sergey Lavrov': {
    key: 'lavrov_njet',
    name: 'Njet',
    description: 'Annulliere den nächsten gegnerischen Korruptionszuwachs auf dein Board.',
  },
  'Dick Cheney': {
    key: 'cheney_shadow',
    name: 'Schattenregierung',
    description: 'Deine Interventionen fügen diese Runde +1 Korruption auf ihr Ziel hinzu.',
  },
  'Christine Lagarde': {
    key: 'lagarde_books',
    name: 'Kreative Buchführung',
    description: 'Verschiebe bis zu 2 Korruption von einer eigenen Regierung auf eine andere.',
    needsTarget: 'own_gov',
  },
};

const GENERIC_BY_TAG: Record<string, GovAbilityDef> = {
  Diplomat: {
    key: 'generic_quiet_channels',
    name: 'Stille Kanäle',
    description: '−1 Korruption auf sich selbst, +1 Einfluss diese Runde.',
  },
  Verwaltung: {
    key: 'generic_shred',
    name: 'Aktenvernichtung',
    description: 'Entferne das Korruptions-Buff-Flag von allen eigenen Karten (kein +1 Säuberungsmod).',
  },
  Militär: {
    key: 'generic_loyalty',
    name: 'Loyalitätsschwur',
    description: 'Kann bis zum nächsten Zug nicht Ziel gegnerischer Korruptionsänderungen sein.',
  },
  Sicherheit: {
    key: 'generic_loyalty',
    name: 'Loyalitätsschwur',
    description: 'Kann bis zum nächsten Zug nicht Ziel gegnerischer Korruptionsänderungen sein.',
  },
  Reform: {
    key: 'generic_confession',
    name: 'Selbstanzeige',
    description: 'Setze dich auf Korruption 1; stärkste gegnerische Regierung +1 Korruption.',
  },
};

export function getGovAbility(card: PoliticianCard): GovAbilityDef | null {
  if (NAMED[card.name]) return NAMED[card.name];
  const tag = String(card.tag || '');
  for (const key of Object.keys(GENERIC_BY_TAG)) {
    if (tag.includes(key)) return GENERIC_BY_TAG[key];
  }
  // Default tier-1 fallback
  if ((card.T || 1) <= 1) {
    return {
      key: 'generic_quiet_channels',
      name: 'Stille Kanäle',
      description: '−1 Korruption auf sich selbst, +1 Einfluss diese Runde.',
    };
  }
  return null;
}

export function canActivateGovAbility(
  state: GameState,
  player: Player,
  card: PoliticianCard
): { ok: boolean; reason?: string } {
  if (state.current !== player) return { ok: false, reason: 'Nicht dein Zug.' };
  if (card.deactivated) return { ok: false, reason: 'Karte deaktiviert.' };
  if (getCorruption(card) < ABILITY_UNLOCK_CORRUPTION) {
    return { ok: false, reason: `Benötigt Korruption ≥${ABILITY_UNLOCK_CORRUPTION}.` };
  }
  const used = Number(card.corruptionAbilityUsed || 0);
  const max = getMaxAbilityUses(state, player, card);
  if (used >= max) return { ok: false, reason: 'Keine Aktivierungen mehr diese Runde.' };
  if (!getGovAbility(card)) return { ok: false, reason: 'Keine Fähigkeit.' };
  return { ok: true };
}

/**
 * Activate a government ability. Mutates state, returns true on success.
 * Optional targetUid for abilities that need a target.
 */
export function activateGovAbility(
  state: GameState,
  player: Player,
  uid: number,
  targetUid?: number
): { ok: boolean; reason?: string } {
  const card = (state.board[player]?.aussen || []).find(c => c.uid === uid && c.kind === 'pol') as PoliticianCard | undefined;
  if (!card) return { ok: false, reason: 'Karte nicht auf dem Board.' };

  const gate = canActivateGovAbility(state, player, card);
  if (!gate.ok) return gate;

  const ability = getGovAbility(card)!;
  const log = (m: string) => state.log.push(m);
  const enqueue = (e: EffectEvent) => {
    (state._effectQueue ??= []).push(e);
  };
  const opp = other(player);

  // Mark use (no AP — only playing cards costs AP)
  card.corruptionAbilityUsed = Number(card.corruptionAbilityUsed || 0) + 1;
  log(`⚡ ${card.name} aktiviert „${ability.name}".`);

  switch (ability.key) {
    case 'putin_vertical': {
      const enemy = activeGovs(state, opp).slice().sort((a, b) => {
        const ai = a.influence + (a.tempBuffs || 0) - (a.tempDebuffs || 0);
        const bi = b.influence + (b.tempBuffs || 0) - (b.tempDebuffs || 0);
        return ai - bi;
      })[0];
      if (enemy) {
        (enemy as any).deactivated = true;
        log(`🟥 Vertikale der Macht: ${enemy.name} deaktiviert.`);
      } else {
        log('Vertikale der Macht: keine gegnerische Regierung gefunden.');
      }
      applyCorruptionDelta(state, card, player, 1, { source: ability.name, log, enqueue });
      break;
    }
    case 'xi_transfer': {
      if (targetUid == null) return { ok: false, reason: 'Ziel erforderlich.' };
      let target: PoliticianCard | undefined;
      let targetOwner: Player = player;
      for (const p of [1, 2] as const) {
        const hit = (state.board[p].aussen || []).find(c => c.uid === targetUid && c.kind === 'pol') as PoliticianCard | undefined;
        if (hit) { target = hit; targetOwner = p; break; }
      }
      if (!target || target.uid === card.uid) return { ok: false, reason: 'Ungültiges Ziel.' };
      const move = Math.min(2, getCorruption(card) - Number(card.corruptionStart ?? 0));
      if (move <= 0) {
        log('Anti-Korruptions-Kampagne: Xi hat keine übertragbare Korruption.');
        break;
      }
      applyCorruptionDelta(state, card, player, -move, { source: ability.name, log, enqueue });
      applyCorruptionDelta(state, target, targetOwner, move, {
        source: ability.name,
        enemySourcePlayer: player !== targetOwner ? player : undefined,
        log,
        enqueue,
      });
      break;
    }
    case 'trump_alt_truth': {
      card._ignoreGreedyPass = true;
      card.tempBuffs = (card.tempBuffs || 0) + 1;
      log('Alternative Wahrheit: gieriger Pass ignoriert, +1 Einfluss.');
      applyCorruptionDelta(state, card, player, 1, { source: ability.name, log, enqueue });
      break;
    }
    case 'erdogan_decree': {
      const slot = state.permanentSlots?.[opp];
      const aura = slot?.initiativePermanent || slot?.public || slot?.government;
      if (aura && String((aura as any).type || '').includes('Dauerhaft')) {
        (aura as any).deactivated = true;
        log(`📜 Dekret: ${aura.name} Aura annulliert bis Rundenende.`);
      } else if (aura) {
        (aura as any).deactivated = true;
        log(`📜 Dekret: ${aura.name} deaktiviert.`);
      } else {
        log('Dekret: keine gegnerische Dauerhaft-Initiative gefunden.');
      }
      applyCorruptionDelta(state, card, player, 1, { source: ability.name, log, enqueue });
      break;
    }
    case 'mbs_ritz': {
      if (targetUid == null) return { ok: false, reason: 'Ziel erforderlich.' };
      const target = (state.board[opp].aussen || []).find(c => c.uid === targetUid && c.kind === 'pol') as PoliticianCard | undefined;
      if (!target || getCorruption(target) < 2) return { ok: false, reason: 'Ziel braucht Korruption ≥2.' };
      if ((state.hands[opp] || []).length > 0) {
        const hand = state.hands[opp];
        const idx = getGlobalRNG().randomInt(hand.length);
        const [discarded] = hand.splice(idx, 1);
        state.discard.push(discarded);
        log(`🏨 Ritz-Carlton: P${opp} wirft ${discarded.name} ab — ${target.name} bleibt aktiv.`);
      } else {
        (target as any).deactivated = true;
        log(`🏨 Ritz-Carlton: ${target.name} deaktiviert (keine Handkarte zum Opfern).`);
      }
      applyCorruptionDelta(state, card, player, 1, { source: ability.name, log, enqueue });
      break;
    }
    case 'bibi_coalition': {
      let cleansed = 0;
      for (const g of activeGovs(state, player)) {
        if (g.uid === card.uid) continue;
        const before = getCorruption(g);
        applyCorruptionDelta(state, g, player, -1, { source: ability.name, log, enqueue });
        if (getCorruption(g) < before) cleansed++;
      }
      if (cleansed > 0) {
        applyCorruptionDelta(state, card, player, cleansed, { source: ability.name, log, enqueue });
      }
      log(`🤝 Koalitionsdisziplin: ${cleansed} Regierungen gewaschen.`);
      break;
    }
    case 'raisi_show_trial': {
      if (targetUid == null) return { ok: false, reason: 'Ziel erforderlich.' };
      const target = (state.board[opp].aussen || []).find(c => c.uid === targetUid && c.kind === 'pol') as PoliticianCard | undefined;
      if (!target || getCorruption(target) < 2) return { ok: false, reason: 'Ziel braucht Korruption ≥2.' };
      const roll = 1 + getGlobalRNG().randomInt(6);
      const targetNum = 3;
      log(`⚖️ Schauprozess: ${target.name} — Wurf ${roll} vs Ziel ${targetNum}.`);
      if (typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('pc:engine_dice_result', { detail: { roll, player, targetUid } }));
        } catch { /* UI */ }
      }
      if (roll < targetNum) {
        const idx = state.board[opp].aussen.findIndex(c => c.uid === target.uid);
        if (idx !== -1) {
          state.board[opp].aussen.splice(idx, 1);
          state.discard.push(target);
          log(`⚖️ Schauprozess: ${target.name} entfernt.`);
        }
      } else {
        log(`⚖️ Schauprozess: ${target.name} übersteht die Probe.`);
      }
      break;
    }
    case 'meloni_right_shift': {
      card.tempBuffs = (card.tempBuffs || 0) + 2;
      const strongest = strongestOwnGov(state, player);
      if (strongest && strongest.uid === card.uid) {
        applyCorruptionDelta(state, card, player, 1, { source: ability.name, log, enqueue });
      }
      log('Rechtsruck: +2 Einfluss.');
      break;
    }
    case 'macron_jupiter': {
      const enemyDirty = mostCorruptGov(state, opp);
      const bonus = enemyDirty
        ? (getCorruption(enemyDirty) >= 6 ? 4 : getCorruption(enemyDirty) >= 4 ? 3 : getCorruption(enemyDirty) === 3 ? 2 : getCorruption(enemyDirty) === 2 ? 1 : 0)
        : 0;
      if (bonus > 0) {
        card.tempBuffs = (card.tempBuffs || 0) + bonus;
        log(`🪐 Jupiter: kopiert +${bonus} Einfluss von ${enemyDirty!.name}.`);
      } else {
        log('Jupiter: keine korrupte gegnerische Regierung zum Kopieren.');
      }
      break;
    }
    case 'trudeau_sunny': {
      applyCorruptionDelta(state, card, player, -1, { source: ability.name, log, enqueue });
      (state.effectFlags[player] as any).purgeRollBonus = ((state.effectFlags[player] as any).purgeRollBonus || 0) + 1;
      log('Sunny Ways: nächster eigener Säuberungswurf +1.');
      break;
    }
    case 'lavrov_njet': {
      (state.effectFlags[player] as any).lavrovNjetAvailable = true;
      log('🚫 Njet: nächster gegnerischer Korruptionszuwachs wird annulliert.');
      break;
    }
    case 'cheney_shadow': {
      (state.effectFlags[player] as any).cheneyInterventionCorruption = true;
      log('🕶️ Schattenregierung: eigene Interventionen +1 Korruption auf Ziele.');
      break;
    }
    case 'lagarde_books': {
      // targetUid = source to drain FROM; Lagarde absorbs (consolidate onto self)
      if (targetUid == null) return { ok: false, reason: 'Quell-Regierung erforderlich.' };
      const source = (state.board[player].aussen || []).find(c => c.uid === targetUid && c.kind === 'pol') as PoliticianCard | undefined;
      if (!source || source.uid === card.uid) return { ok: false, reason: 'Ungültige Quelle.' };
      const movable = Math.min(2, Math.max(0, getCorruption(source) - Number(source.corruptionStart ?? 0)));
      if (movable <= 0) {
        log('Kreative Buchführung: nichts zu verschieben.');
        break;
      }
      applyCorruptionDelta(state, source, player, -movable, { source: ability.name, log, enqueue });
      applyCorruptionDelta(state, card, player, movable, { source: ability.name, log, enqueue });
      break;
    }
    case 'generic_quiet_channels': {
      applyCorruptionDelta(state, card, player, -1, { source: ability.name, log, enqueue });
      card.tempBuffs = (card.tempBuffs || 0) + 1;
      break;
    }
    case 'generic_shred': {
      for (const g of activeGovs(state, player)) {
        g._corruptionTainted = false;
      }
      log('Aktenvernichtung: Korruptions-Buff-Flags entfernt.');
      break;
    }
    case 'generic_loyalty': {
      (card as any)._corruptionShielded = true;
      (state.effectFlags[player] as any).lavrovNjetAvailable = true;
      log('Loyalitätsschwur: nächster gegnerischer Korruptionszuwachs auf dich wird blockiert.');
      break;
    }
    case 'generic_confession': {
      if (getCorruption(card) !== 1) {
        card.corruption = 1;
        log(`Selbstanzeige: ${card.name} Korruption → 1.`);
      }
      const enemyStrong = strongestOwnGov(state, opp);
      if (enemyStrong) {
        applyCorruptionDelta(state, enemyStrong, opp, 1, {
          source: ability.name,
          enemySourcePlayer: player,
          log,
          enqueue,
        });
      }
      break;
    }
    default:
      return { ok: false, reason: 'Unbekannte Fähigkeit.' };
  }

  // Musk: already handled via getMaxAbilityUses double-activation
  void findActivePublicCard;

  return { ok: true };
}
