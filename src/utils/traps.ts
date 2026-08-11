import type { GameState, Player, Card } from '../types/game';
import type { EffectEvent } from '../types/effects';
import {
  isGovernmentCard,
  isPublicCard,
  isInitiativeCard,
  isBigInitiativeCard,
  isMediaLikeCard,
  isPlatformCard,
  isOligarchCard,
  isNgoCard,
  isMovementCard,
  isDiplomatCard,
} from './cardClassification';
import { isInstantInitiative } from './tags';

export function registerTrap(state: GameState, player: Player, key: string) {
  if (!state.traps) state.traps = { 1: [], 2: [] } as any;
  const list = (state.traps as any)[player] as Array<{ owner: Player; key: string }>;
  if (!Array.isArray(list)) (state.traps as any)[player] = [];
  (state.traps as any)[player].push({ owner: player, key });
}

export interface TrapCheckResult {
  /** true when the played card itself was cancelled/negated by a trap */
  cancelled: boolean;
}

export function applyTrapsOnCardPlayed(
  state: GameState,
  playedBy: Player,
  card: Card,
  enqueue: (e: EffectEvent) => void,
  log: (m: string) => void
): TrapCheckResult {
  const opp: Player = playedBy === 1 ? 2 : 1;
  const traps = (state.traps as any)?.[opp] as Array<{ owner: Player; key: string }> | undefined;
  if (!traps || traps.length === 0) return { cancelled: false };

  // Diagnostics: log existing traps for opponent when a card is played
  try {
    const keys = traps.map(t => t.key).join(', ');
    enqueue({ type: 'LOG', msg: `DEBUG: applyTrapsOnCardPlayed opp=${opp} traps=[${keys}] playedCard=${(card as any).name || (card as any).key || 'unknown'}` });
  } catch (e) {}

  // Robust runtime classification (live cards from gameData don't match CARD_BY_ID ids)
  const isInitiative = isInitiativeCard(card);
  const isPublic = isPublicCard(card);
  const isGovernment = isGovernmentCard(card);
  const isMediaLike = isMediaLikeCard(card);

  // Hard rule: Oppositionsblockade – lock Sofort-Initiativen only
  if (isInstantInitiative(card) && state.effectFlags[playedBy]?.initiativesLocked) {
    if ((card as any).uid != null) {
      enqueue({ type: 'CANCEL_CARD', player: playedBy, targetUid: (card as any).uid } as any);
    }
    enqueue({ type: 'LOG', msg: 'Blocked: Sofort-Initiativen gesperrt (Oppositionsblockade).' });
    return { cancelled: true }; // skip further trap processing
  }

  let playedCardCancelled = false;
  const consumed: Array<{ key: string }> = [];
  traps.forEach(t => {
    switch (t.key) {
      // bereits live benutzt
      // Fake News-Kampagne: media/platform deactivate + strongest gov +1 corruption (disinfo rot)
      case 'trap.fake_news.deactivate_media':
        if (isMediaLike && (card as any).uid != null) {
          enqueue({ type: 'DEACTIVATE_CARD', player: opp, targetUid: (card as any).uid });
          const strong = (state.board[playedBy].aussen || [])
            .filter(c => c.kind === 'pol' && !(c as any).deactivated)
            .slice()
            .sort((a: any, b: any) => (b.influence || 0) - (a.influence || 0))[0];
          if (strong) {
            enqueue({ type: 'CHANGE_CORRUPTION', targetUid: (strong as any).uid, amount: 1, source: 'Fake News-Kampagne', enemySourcePlayer: opp } as any);
          }
          log('Trap: Fake News – Medien/Plattform deaktiviert; stärkste Regierung +1 Korruption.');
          consumed.push(t);
        }
        break;

      // neu: Initiative canceln (sofort beim Ausspielen der Initiative)
      case 'trap.legal_injunction.cancel_next_initiative':
        if (isInitiative && (card as any).uid != null) {
          enqueue({ type: 'CANCEL_CARD', player: opp, targetUid: (card as any).uid });
          log('Trap: Legal Injunction – cancelled initiative.');
          playedCardCancelled = true;
          consumed.push(t);
        }
        break;

      // Interne Fraktionskämpfe: große Initiative (3+ BP) wird annulliert
      case 'trap.internal_faction_strife.cancel_big_initiative':
        if (isBigInitiativeCard(card) && (card as any).uid != null) {
          enqueue({ type: 'CANCEL_CARD', player: opp, targetUid: (card as any).uid });
          log('Trap: Interne Fraktionskämpfe – große Initiative annulliert.');
          playedCardCancelled = true;
          consumed.push(t);
        }
        break;

      // Boykott-Kampagne: NGO/Bewegung wird deaktiviert
      case 'trap.boycott.deactivate_ngo_movement':
        if ((isNgoCard(card) || isMovementCard(card)) && (card as any).uid != null) {
          enqueue({ type: 'DEACTIVATE_CARD', player: opp, targetUid: (card as any).uid });
          log('Trap: Boykott-Kampagne – NGO/Bewegung deaktiviert.');
          consumed.push(t);
        }
        break;

      // Deepfake-Skandal: lock diplomat transfer until that player's next turn start + taint the diplomat
      case 'trap.deepfake.lock_diplomat_transfer':
        if (isDiplomatCard(card)) {
          state.effectFlags[playedBy].influenceTransferBlocked = true;
          if ((card as any).uid != null) {
            enqueue({ type: 'CHANGE_CORRUPTION', targetUid: (card as any).uid, amount: 1, source: 'Deepfake-Skandal', enemySourcePlayer: opp } as any);
          }
          enqueue({ type: 'LOG', msg: 'Trap: Deepfake-Skandal – Einflusstransfer bis Zugbeginn blockiert; Diplomat +1 Korruption.' });
          log('Trap: Deepfake-Skandal – influence transfer blocked until next turn; +1 corruption.');
          consumed.push(t);
        }
        break;

      // Cyber-Attacke: Plattform-Karte wird deaktiviert (Balance: no destroy)
      case 'trap.cyber_attack.destroy_platform':
      case 'trap.cyber_attack.deactivate_platform':
        if (isPlatformCard(card) && (card as any).uid != null) {
          enqueue({ type: 'DEACTIVATE_CARD', player: opp, targetUid: (card as any).uid });
          log('Trap: Cyber-Attacke – Plattform deaktiviert.');
          consumed.push(t);
        }
        break;

      // Grassroots-Widerstand: bei >2 Öffentlichkeitskarten – die gespielte wird deaktiviert
      case 'trap.grassroots_resistance.deactivate_public':
        if (isPublic && (card as any).uid != null && (state.board[playedBy]?.innen?.length || 0) >= 3) {
          enqueue({ type: 'DEACTIVATE_CARD', player: opp, targetUid: (card as any).uid });
          log('Trap: Grassroots-Widerstand – Öffentlichkeitskarte deaktiviert.');
          consumed.push(t);
        }
        break;

      // Massenproteste: bei 2. Regierungskarte in der Runde – beide stärksten Regierungen -1
      case 'trap.mass_protests.debuff_two_govs':
        if (isGovernment && (state.board[playedBy]?.aussen?.length || 0) >= 2) {
          const govs = (state.board[playedBy].aussen || [])
            .filter(c => c.kind === 'pol' && !(c as any).deactivated)
            .slice()
            .sort((a: any, b: any) => (b.influence + (b.tempBuffs||0) - (b.tempDebuffs||0)) - (a.influence + (a.tempBuffs||0) - (a.tempDebuffs||0)))
            .slice(0, 2);
          const hasOligarch = (state.board[playedBy]?.innen || []).some(c => isOligarchCard(c) && !(c as any).deactivated);
          govs.forEach((g: any) => {
            enqueue({ type: 'DEBUFF_CARD', player: opp, targetUid: g.uid, amount: 1, fromIntervention: true } as any);
            if (hasOligarch) {
              enqueue({ type: 'CHANGE_CORRUPTION', targetUid: g.uid, amount: 1, source: 'Massenproteste (Oligarch-Fallout)', enemySourcePlayer: opp } as any);
            }
          });
          log('Trap: Massenproteste – zwei Regierungskarten -1 Einfluss.');
          consumed.push(t);
        }
        break;

      // Berater-Affäre: Tier-1-Regierungskarte -2 Einfluss +1 Korruption
      case 'trap.advisor_scandal.minus2_gov_tier1':
        if (isGovernment && ((card as any).T === 1 || (card as any).tier === 1) && (card as any).uid != null) {
          enqueue({ type: 'DEBUFF_CARD', player: opp, targetUid: (card as any).uid, amount: 2, fromIntervention: true } as any);
          enqueue({ type: 'CHANGE_CORRUPTION', targetUid: (card as any).uid, amount: 1, source: 'Berater-Affäre', enemySourcePlayer: opp } as any);
          log('Trap: Berater-Affäre – Tier-1-Regierung -2 Einfluss, +1 Korruption.');
          consumed.push(t);
        }
        break;

      // Parlament geschlossen: bei ≥2 Regierungskarten – keine weiteren Regierungskarten bis zum nächsten Zug des Spielers
      case 'trap.parliament_closed.stop_more_gov':
        if (isGovernment && (state.board[playedBy]?.aussen?.length || 0) >= 2) {
          state.effectFlags[playedBy].cannotPlayMoreGovernment = true;
          enqueue({ type: 'LOG', msg: `Trap: Parlament geschlossen – P${playedBy} kann bis zu seinem nächsten Zug keine weiteren Regierungskarten spielen.` });
          log('Trap: Parlament geschlossen – government plays locked until next turn.');
          consumed.push(t);
        }
        break;

      // "Unabhängige" Untersuchung: gegnerische Intervention wird annulliert
      // Alternate: if played card is NOT an intervention, cleanse own strongest gov −2 corruption
      case 'trap.independent_investigation.cancel_trap': {
        const typeStr = String((card as any).type || '').toLowerCase();
        if (typeStr.includes('intervention')) {
          // Remove the just-registered trap (registration + card object) of playedBy
          const list = ((state.traps as any)[playedBy] || []) as any[];
          const cardName = (card as any).name;
          const filtered = list.filter(entry => {
            if (!entry) return false;
            if (entry.name && entry.name === cardName) return false;
            if (entry.key && typeof entry.key === 'string' && (card as any).effectKey && entry.key === (card as any).effectKey) return false;
            return true;
          });
          if (filtered.length !== list.length) {
            (state.traps as any)[playedBy] = filtered;
            state.discard = state.discard || [];
            state.discard.push(card);
            enqueue({ type: 'LOG', msg: `Trap: "Unabhängige" Untersuchung – ${cardName} wurde annulliert.` });
            log('Trap: Independent Investigation – intervention cancelled.');
            playedCardCancelled = true;
            consumed.push(t);
          }
        } else if (isGovernment) {
          // Alternate cleanse mode: wash own strongest government
          const ownGovs = (state.board[opp].aussen || [])
            .filter(c => c.kind === 'pol' && !(c as any).deactivated)
            .slice()
            .sort((a: any, b: any) => (b.influence || 0) - (a.influence || 0));
          if (ownGovs[0]) {
            enqueue({ type: 'CHANGE_CORRUPTION', targetUid: (ownGovs[0] as any).uid, amount: -2, source: '"Unabhängige" Untersuchung (Säuberung)' } as any);
            log('Trap: "Unabhängige" Untersuchung – eigene Regierung −2 Korruption.');
            consumed.push(t);
          }
        }
        break;
      }

      // Soft Power-Kollaps: Diplomat -3 Einfluss
      case 'trap.soft_power_collapse.minus3_diplomat':
        if (isDiplomatCard(card) && (card as any).uid != null) {
          enqueue({ type: 'DEBUFF_CARD', player: opp, targetUid: (card as any).uid, amount: 3, fromIntervention: true } as any);
          log('Trap: Soft Power-Kollaps – Diplomat -3 Einfluss.');
          consumed.push(t);
        }
        break;

      // Cancel Culture: nur Oligarch/Medien-Öffentlichkeitskarten
      case 'trap.cancel_culture.deactivate_public':
        if (isPublic && (card as any).uid != null && (isOligarchCard(card) || isMediaLikeCard(card))) {
          enqueue({ type: 'DEACTIVATE_CARD', player: opp, targetUid: (card as any).uid });
          log('Trap: Cancel Culture – Oligarch/Medien-Karte deaktiviert.');
          consumed.push(t);
        }
        break;

      // Lobby Leak: NGO oder Oligarch → Gegner wirft 1 ab; stärkste Regierung +1 Korruption
      case 'trap.lobby_leak.force_discard_on_ngo':
        if (isNgoCard(card) || isOligarchCard(card)) {
          enqueue({ type: 'DISCARD_RANDOM_FROM_HAND', player: playedBy, amount: 1 });
          const strong = (state.board[playedBy].aussen || [])
            .filter(c => c.kind === 'pol' && !(c as any).deactivated)
            .slice()
            .sort((a: any, b: any) => (b.influence || 0) - (a.influence || 0))[0];
          if (strong) {
            enqueue({ type: 'CHANGE_CORRUPTION', targetUid: (strong as any).uid, amount: 1, source: 'Lobby Leak', enemySourcePlayer: opp } as any);
          }
          log('Trap: Lobby Leak – Gegner wirft 1 Karte ab; stärkste Regierung +1 Korruption.');
          consumed.push(t);
        }
        break;

      // Satire-Show: bei Regierungskarte, wenn Gegner mehr Einfluss hat – -2 Einfluss
      case 'trap.satire_show.minus2_enemy_gov':
        if (isGovernment && (card as any).uid != null) {
          try {
            const { sumGovernmentInfluenceWithAuras } = require('./gameUtils');
            const playedByTotal = sumGovernmentInfluenceWithAuras(state, playedBy);
            const ownerTotal = sumGovernmentInfluenceWithAuras(state, opp);
            if (playedByTotal >= ownerTotal) {
              enqueue({ type: 'DEBUFF_CARD', player: opp, targetUid: (card as any).uid, amount: 2, fromIntervention: true } as any);
              if (Number((card as any).corruption ?? 0) >= 3) {
                enqueue({ type: 'LOG', msg: `Satire-Show: ${ (card as any).name } öffentlich verspottet (Korruption ${ (card as any).corruption }).` });
              }
              log('Trap: Satire-Show – Regierungskarte -2 Einfluss.');
              consumed.push(t);
            }
          } catch (e) {
            enqueue({ type: 'DEBUFF_CARD', player: opp, targetUid: (card as any).uid, amount: 2, fromIntervention: true } as any);
            consumed.push(t);
          }
        }
        break;

      // Counterintelligence Sting: gegnerische Hand wird aufgedeckt
      case 'trap.counterintel.reveal_hand':
        enqueue({ type: 'REVEAL_OPPONENT_HAND', player: opp });
        log('Trap: Counterintelligence Sting – Hand aufgedeckt.');
        consumed.push(t);
        break;

      // Public Scandal: Regierungskarte -1 Einfluss
      case 'trap.public_scandal.influence_penalty':
        if (isGovernment && (card as any).uid != null) {
          enqueue({ type: 'DEBUFF_CARD', player: opp, targetUid: (card as any).uid, amount: 1, fromIntervention: true } as any);
          log('Trap: Public Scandal – Regierungskarte -1 Einfluss.');
          consumed.push(t);
        }
        break;

      // Scandal Spiral: when opponent already has a public card and plays another, cancel the new one
      case 'trap.scandal_spiral.cancel_one_of_two':
        if (isPublic && (card as any).uid != null && (state.board[playedBy]?.innen?.length || 0) >= 2) {
          enqueue({ type: 'CANCEL_CARD', player: opp, targetUid: (card as any).uid });
          log('Trap: Scandal Spiral – zweite Öffentlichkeitskarte annulliert.');
          playedCardCancelled = true;
          consumed.push(t);
        }
        break;

      // neu: Karte zurück auf Hand (egal welcher Typ)
      case 'trap.whistleblower.return_last_played':
        if ((card as any).uid != null) {
          enqueue({ type: 'RETURN_TO_HAND', player: playedBy, targetUid: (card as any).uid });
          log('Trap: Whistleblower – returned played card to hand.');
          consumed.push(t);
        }
        break;

      // neu: Gegner discards 2 bei nächstem Play
      case 'trap.data_breach.opp_discard2':
        enqueue({ type: 'DISCARD_RANDOM_FROM_HAND', player: playedBy === 1 ? 2 : 1, amount: 2 });
        log('Trap: Data Breach – opponent discards 2.');
        consumed.push(t);
        break;

      // neu: Public deaktivieren
      case 'trap.media_blackout.deactivate_public':
        if (isPublic && (card as any).uid != null) {
          enqueue({ type: 'DEACTIVATE_CARD', player: opp, targetUid: (card as any).uid });
          log('Trap: Media Blackout – deactivated public card.');
          consumed.push(t);
        }
        break;

      // neu: AP -2 für Gegner beim nächsten Play
      case 'trap.budget_freeze.opp_ap_minus2':
        // Emit as two atomic -1 events instead of a single -2 for consistency
        enqueue({ type: 'ADD_AP', player: playedBy, amount: -1 });
        enqueue({ type: 'ADD_AP', player: playedBy, amount: -1 });
        log('Trap: Budget Freeze – opponent AP -2.');
        consumed.push(t);
        break;

      // neu: Government deaktivieren
      case 'trap.sabotage.deactivate_gov':
        if (isGovernment && (card as any).uid != null) {
          enqueue({ type: 'DEACTIVATE_CARD', player: opp, targetUid: (card as any).uid });
          log('Trap: Sabotage – deactivated government card.');
          consumed.push(t);
        }
        break;

      // Strategic Disclosure: when opponent would lead/tie after playing a gov, bounce it to hand
      case 'trap.strategic_disclosure.return_gov':
        if (isGovernment && (card as any).uid != null) {
          try {
            const { sumGovernmentInfluenceWithAuras } = require('./gameUtils');
            const oppBefore = sumGovernmentInfluenceWithAuras(state, playedBy);
            const cardInfluence = (card as any).influence || 0;
            // Card is usually already on board when traps fire — don't double-count
            const onBoard = (state.board[playedBy].aussen || []).some((c: any) => c && c.uid === (card as any).uid);
            const oppProjected = onBoard ? oppBefore : oppBefore + cardInfluence;

            const you = playedBy === 1 ? 2 : 1;
            const youTotal = sumGovernmentInfluenceWithAuras(state, you);

            if (oppProjected >= youTotal) {
              enqueue({ type: 'RETURN_TO_HAND', player: playedBy, targetUid: (card as any).uid });
              // Ambivalence: leak cuts both ways — your strongest gov +1 corruption (you burned a source)
              const yourStrong = (state.board[you].aussen || [])
                .filter(c => c.kind === 'pol' && !(c as any).deactivated)
                .slice()
                .sort((a: any, b: any) => (b.influence || 0) - (a.influence || 0))[0];
              if (yourStrong) {
                enqueue({ type: 'CHANGE_CORRUPTION', targetUid: (yourStrong as any).uid, amount: 1, source: 'Strategische Enthüllung (Blowback)', fromInitiative: false } as any);
              }
              log('Trap: Strategic Disclosure – Regierungskarte zurück auf Hand; Enthüller +1 Korruption.');
              consumed.push(t);
            } else {
              enqueue({ type: 'LOG', msg: 'Strategic Disclosure present but projected influence check not met.' });
            }
          } catch (e) {
            try { log(`DEBUG: Strategic Disclosure error: ${String(e)}`); } catch (err) {}
          }
        }
        break;

      case 'trap.whistleblower.debuff_next_gov_minus2':
        // Robust trigger: treat any played politician (pol) as government trigger
        const playedIsPol = (card as any)?.kind === 'pol' || isGovernment;
        if (!playedIsPol) {
          // not a government/pol card — skip
          enqueue({ type: 'LOG', msg: `DEBUG: Whistleblower present but played card is not government/pol (${(card as any).name || (card as any).key})` });
          break;
        }
        if ((card as any).uid == null) {
          enqueue({ type: 'LOG', msg: `DEBUG: Whistleblower cannot apply - target missing uid for ${(card as any).name || (card as any).key}` });
          break;
        }

        // Count Movements/Activists on both boards — whistle grows with civic heat
        let activistCount = 0;
        for (const p of [1, 2] as const) {
          const innen = state.board[p]?.innen || [];
          const aussen = state.board[p]?.aussen || [];
          for (const c of [...innen, ...aussen]) {
            if (!c || (c as any).deactivated) continue;
            if (isMovementCard(c)) activistCount++;
          }
        }

        // Base debuff -2 plus -1 per Activist (both boards), capped at -6 total
        const totalDebuffMagnitude = Math.min(6, 2 + activistCount);
        const amount = -totalDebuffMagnitude;

        enqueue({ type: 'DEBUFF_CARD', player: opp, targetUid: (card as any).uid, amount, fromIntervention: true } as any);
        enqueue({ type: 'CHANGE_CORRUPTION', targetUid: (card as any).uid, amount: 1, source: 'Whistleblower', enemySourcePlayer: opp } as any);
        if ((state.effectFlags[opp] as any)?.cheneyInterventionCorruption) {
          enqueue({ type: 'CHANGE_CORRUPTION', targetUid: (card as any).uid, amount: 1, source: 'Schattenregierung (Cheney)', enemySourcePlayer: opp } as any);
        }
        const debuffMsg = `Trap: Whistleblower – government card gets ${amount} Influence (base -2 + activists ${activistCount}, capped at -6) +1 Korruption.`;
        enqueue({ type: 'LOG', msg: debuffMsg });
        log(debuffMsg);
        log(`🟢 trap.whistleblower triggered: applied ${amount} to uid ${(card as any).uid} (activists=${activistCount})`);
        consumed.push(t);
        break;

      default:
        break;
    }
  });

  if (consumed.length) {
    // Build consumption indexes for robust removal
    const consumedKeys = new Set(consumed.map(c => (c as any).key).filter(Boolean));
    // Also include base card keys (namespace + card) to catch visual trap card objects
    // Example: 'trap.whistleblower.return_last_played' -> add 'trap.whistleblower'
    for (const k of Array.from(consumedKeys)) {
      if (typeof k === 'string') {
        const parts = k.split('.');
        if (parts.length >= 3) {
          const baseKey = parts.slice(0, 2).join('.');
          consumedKeys.add(baseKey);
        }
      }
    }
    const consumedUids = new Set(consumed.map(c => (c as any).uid).filter(Boolean));
    const consumedNames = new Set(consumed.map(c => (c as any).name).filter(Boolean));
    const consumedRefs = new Set(consumed);

    // Debug logging for trap removal
    enqueue({ type: 'LOG', msg: `DEBUG: Trap removal - consumedKeys=[${Array.from(consumedKeys).join(', ')}] consumedNames=[${Array.from(consumedNames).join(', ')}]` });

    // Remove consumed trap registrations and any visual trap card objects from both players' trap lists
    for (const p of [1, 2] as const) {
      const list = (state.traps as any)[p] || [];
      (state.traps as any)[p] = list.filter((entry: any) => {
        if (!entry) return false;
        // Direct reference match
        if (consumedRefs.has(entry)) return false;
        // registration object with key
        if (entry.key && consumedKeys.has(entry.key)) return false;
        // match by uid
        if ((entry as any).uid && consumedUids.has((entry as any).uid)) return false;
        // match by name
        if ((entry as any).name && consumedNames.has((entry as any).name)) return false;

        // If entry looks like a card object (visual trap card) try permissive matches
        if (entry && entry.kind === 'spec') {
          const typeStr = String((entry as any).type || '').toLowerCase();
          const entryName = String((entry as any).name || '').toLowerCase();
          const entryKey = String((entry as any).key || '').toLowerCase();
          const entryEffect = String((entry as any).effectKey || '').toLowerCase();

          // Remove if its declared type includes 'trap'
          if (typeStr.includes('trap')) return false;

          // Remove if its name matches a consumed name or explicitly 'whistleblower'
          if (consumedNames.has(entry.name) || entryName === 'whistleblower') return false;

          // Remove if its key/effectKey matches or starts with any consumed key (permissive)
          for (const ck of Array.from(consumedKeys)) {
            if (!ck) continue;
            const ckStr = String(ck).toLowerCase();
            if (entryKey && (entryKey === ckStr || entryKey.startsWith(ckStr))) return false;
            if (entryEffect && (entryEffect === ckStr || entryEffect.startsWith(ckStr))) return false;
          }
        }

        return true;
      });
    }

    // Explicit removal: if a consumed trap key was for whistleblower (or other
    // traps), also remove any visual trap card objects that are stored in
    // state.traps as `spec` objects whose name/key matches permissively.
    try {
      const consumedKeyArray = Array.from(consumedKeys).map(k => String(k).toLowerCase());
      const consumedNameArray = Array.from(consumedNames).map(n => String(n).toLowerCase());
      for (const p of [1,2] as const) {
        const arr = (state.traps as any)[p] || [];
        const newArr: any[] = [];
        for (const entry of arr) {
          if (!entry) continue;
          if ((entry as any).kind === 'spec') {
            const entryName = String((entry as any).name || '').toLowerCase();
            const entryKey = String((entry as any).key || '').toLowerCase();
            const entryEffect = String((entry as any).effectKey || '').toLowerCase();

            let shouldRemove = false;
            // direct name match
            if (consumedNameArray.includes(entryName) || entryName === 'whistleblower') shouldRemove = true;
            // match by consumed key parts (e.g. 'trap.whistleblower')
            for (const ck of consumedKeyArray) {
              if (!ck) continue;
              const parts = ck.split('.');
              const right = parts.slice(1).join('.');
              if (entryKey && (entryKey === ck || entryKey.startsWith(ck) || entryKey.includes(right))) { shouldRemove = true; break; }
              if (entryEffect && (entryEffect === ck || entryEffect.startsWith(ck) || entryEffect.includes(right))) { shouldRemove = true; break; }
              if (right && entryName.includes(right)) { shouldRemove = true; break; }
            }

            if (shouldRemove) {
              const rmMsg = `EXPLICIT-REMOVE: removing visual trap object from state.traps P${p} name="${entry.name}" key="${entry.key}"`;
              enqueue({ type: 'LOG', msg: rmMsg });
              try { log(rmMsg); } catch (e) {}
              // move to discard for visual cleanup
              state.discard = state.discard || [];
              state.discard.push(entry);
              continue; // skip pushing to newArr (i.e., remove)
            }
          }
          newArr.push(entry);
        }
        (state.traps as any)[p] = newArr;
      }
    } catch (e) {}

    // Ensure the visual trap card is removed from any board lanes if it was added there
    try {
      const removeIfTrapOnBoard = (arr: any[]) => {
        return arr.filter(c => {
          if (!c) return true;
          const key = (c as any).key;
          const name = (c as any).name;
          const typeStr = String((c as any).type || '').toLowerCase();
          const effectKey = (c as any).effectKey;

          // Check if this is a trap card
          const isTrapByType = typeStr.includes('trap');
          const isTrapByKey = key && (key.startsWith('trap.') || consumedKeys.has(key));
          const isTrapByEffectKey = effectKey && (effectKey.startsWith('trap.') || consumedKeys.has(effectKey));
          const isTrapByName = name && (consumedNames.has(name) || name === 'Whistleblower');

          if (isTrapByType || isTrapByKey || isTrapByEffectKey || isTrapByName) {
            enqueue({ type: 'LOG', msg: `DEBUG: Removing trap card from board - name="${name}" key="${key}" effectKey="${effectKey}" type="${typeStr}"` });
            return false;
          }
          return true;
        });
      };

      // Remove from all board lanes (both players) to be safe
      for (const p of [1, 2] as const) {
        if (state.board?.[p]) {
          const beforeInnen = state.board[p].innen.length;
          const beforeAussen = state.board[p].aussen.length;
          const beforeSofort = state.board[p].sofort.length;

          state.board[p].innen = removeIfTrapOnBoard(state.board[p].innen || []);
          state.board[p].aussen = removeIfTrapOnBoard(state.board[p].aussen || []);
          state.board[p].sofort = removeIfTrapOnBoard(state.board[p].sofort || []);

          const afterInnen = state.board[p].innen.length;
          const afterAussen = state.board[p].aussen.length;
          const afterSofort = state.board[p].sofort.length;

          if (beforeInnen !== afterInnen || beforeAussen !== afterAussen || beforeSofort !== afterSofort) {
            enqueue({ type: 'LOG', msg: `DEBUG: Board cleanup P${p} - innen:${beforeInnen}→${afterInnen}, aussen:${beforeAussen}→${afterAussen}, sofort:${beforeSofort}→${afterSofort}` });
          }
        }
      }
      // Additionally, remove any consumed trap card objects from all board lanes and move them to discard
      try {
        for (const c of consumed) {
          const cUid = (c as any).uid;
          const cKey = (c as any).key || (c as any).name;
          for (const p of [1, 2] as const) {
            for (const lane of ['innen', 'aussen', 'sofort'] as const) {
              const arr = state.board[p][lane] as any[];
              const idx = arr.findIndex(card => (card && ((card.uid && cUid && card.uid === cUid) || (card.key && cKey && card.key === cKey) || (card.name && cKey && card.name === cKey))));
              if (idx !== -1) {
                const [removed] = arr.splice(idx, 1);
                state.discard = state.discard || [];
                state.discard.push(removed);
                enqueue({ type: 'LOG', msg: `Trap consumed: removed ${(removed && removed.name) || cKey} from board and moved to discard.` });
              }
            }
          }
        }
      } catch (e) {}
    } catch (e) {}
  }

  // Forced removal fallback: if a consumed trap wasn't removed by the above
  // logic, attempt a more permissive board scan to remove any visual objects
  // that look like trap cards. This covers cases where visual card objects use
  // a simplified key or have no effectKey attached.
  // Only run when a trap actually fired this call.
  if (consumed.length) try {
    // Build permissive fallback lists directly from `consumed` (available in
    // this scope) to avoid relying on the inner-scope `consumedKeys`/`consumedNames`.
    const fallbackKeysSet = new Set(consumed.map(c => (c as any).key).filter(Boolean).map(String));
    const fallbackNamesSet = new Set(consumed.map(c => (c as any).name).filter(Boolean).map(String));
    const fallbackKeys = Array.from(fallbackKeysSet) as string[];
    const fallbackNames = Array.from(fallbackNamesSet) as string[];

    // add generic base for whistleblower
    if (!fallbackKeys.some(k => k.startsWith('trap.whistleblower'))) fallbackKeys.push('trap.whistleblower');

    const removePermissive = (arr: any[]) => {
      let removedAny = false;
      for (let i = arr.length - 1; i >= 0; i--) {
        const c = arr[i];
        if (!c) continue;
        const key = c.key;
        const effectKey = c.effectKey;
        const name = c.name;
        const typeStr = String((c as any).type || '').toLowerCase();

        const matchesKey = key && fallbackKeys.some(fk => key === fk || key.startsWith(fk));
        const matchesEffect = effectKey && fallbackKeys.some(fk => effectKey === fk || effectKey.startsWith(fk));
        const matchesName = name && fallbackNames.includes(name);
        const looksLikeTrap = typeStr.includes('trap') || (key && String(key).startsWith('trap.'));

        if (matchesKey || matchesEffect || matchesName || looksLikeTrap || name === 'Whistleblower') {
          const [removed] = arr.splice(i, 1);
          state.discard = state.discard || [];
          state.discard.push(removed);
          removedAny = true;
          enqueue({ type: 'LOG', msg: `FORCED-REMOVE: removed ${(removed && removed.name) || key || name} from board (permissive match)` });
        }
      }
      return removedAny;
    };

    for (const p of [1, 2] as const) {
      if (!state.board?.[p]) continue;
      const lanes = ['innen', 'aussen', 'sofort'] as const;
      for (const lane of lanes) {
        try {
          const removed = removePermissive(state.board[p][lane]);
          if (removed) enqueue({ type: 'LOG', msg: `FORCED-REMOVE: cleaned up P${p}.${lane}` });
        } catch (e) {}
      }
    }
  } catch (e) {}

  return { cancelled: playedCardCancelled };
}