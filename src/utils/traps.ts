import type { GameState, Player, Card } from '../types/game';
import type { EffectEvent } from '../types/effects';
import { CARD_BY_ID } from '../data/cards';

export function registerTrap(state: GameState, player: Player, key: string) {
  if (!state.traps) state.traps = { 1: [], 2: [] } as any;
  const list = (state.traps as any)[player] as Array<{ owner: Player; key: string }>;
  if (!Array.isArray(list)) (state.traps as any)[player] = [];
  (state.traps as any)[player].push({ owner: player, key });
}

export function applyTrapsOnCardPlayed(
  state: GameState,
  playedBy: Player,
  card: Card,
  enqueue: (e: EffectEvent) => void,
  log: (m: string) => void
) {
  const opp: Player = playedBy === 1 ? 2 : 1;
  const traps = (state.traps as any)?.[opp] as Array<{ owner: Player; key: string }> | undefined;
  if (!traps || traps.length === 0) return;

  // Diagnostics: log existing traps for opponent when a card is played
  try {
    const keys = traps.map(t => t.key).join(', ');
    enqueue({ type: 'LOG', msg: `DEBUG: applyTrapsOnCardPlayed opp=${opp} traps=[${keys}] playedCard=${(card as any).name || (card as any).key || 'unknown'}` });
  } catch (e) {}

  // Hard rule: Opposition Blockade – if current player is locked, cancel initiative card immediately
  if ((card as any)?.type === 'initiative' && state.effectFlags[playedBy]?.initiativesLocked) {
    if ((card as any).uid != null) {
      enqueue({ type: 'CANCEL_CARD', player: playedBy, targetUid: (card as any).uid } as any);
    }
    enqueue({ type: 'LOG', msg: 'Blocked: initiatives are locked (Opposition Blockade).' });
    return; // skip further trap processing
  }

  // Get card definition to access type and tags
  const cardDef = CARD_BY_ID[card.key];
  const isInitiative = cardDef?.type === 'initiative';
  const isPublic = cardDef?.type === 'public';
  const isGovernment = cardDef?.type === 'government';
  const isMediaLike = cardDef?.tags?.includes('Media') ||
                     cardDef?.tags?.includes('Platform') ||
                     (card as any)?.tag === 'Media'; // Fallback für Legacy-Karten

  const consumed: Array<{ key: string }> = [];
  traps.forEach(t => {
    switch (t.key) {
      // bereits live benutzt
      case 'trap.fake_news.deactivate_media':
        if (isMediaLike && (card as any).uid != null) {
          enqueue({ type: 'DEACTIVATE_CARD', player: opp, targetUid: (card as any).uid });
          log('Trap: Fake News – deactivated media/platform card.');
          consumed.push(t);
        }
        break;

      // neu: Initiative canceln (sofort beim Ausspielen der Initiative)
      case 'trap.legal_injunction.cancel_next_initiative':
        if (isInitiative && (card as any).uid != null) {
          enqueue({ type: 'CANCEL_CARD', player: opp, targetUid: (card as any).uid });
          log('Trap: Legal Injunction – cancelled initiative.');
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
        enqueue({ type: 'ADD_AP', player: playedBy, amount: -2 });
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

      // Strategic Disclosure: Deactivate government card if opponent's total influence
      // would be >= your total influence after the card is played
      case 'trap.strategic_disclosure.return_gov':
        if (isGovernment && (card as any).uid != null) {
          try {
            // compute opponent (playedBy) total influence if this card remains active
            const { sumGovernmentInfluenceWithAuras } = require('./gameUtils');
            const oppBefore = sumGovernmentInfluenceWithAuras(state, playedBy);
            // If the card is not yet part of board in this context, include its influence
            const cardInfluence = (card as any).influence || 0;
            const oppProjected = oppBefore + cardInfluence;

            const you = playedBy === 1 ? 2 : 1;
            const youTotal = sumGovernmentInfluenceWithAuras(state, you);

            if (oppProjected >= youTotal) {
              enqueue({ type: 'DEACTIVATE_CARD', player: you, targetUid: (card as any).uid });
              log('Trap: Strategic Disclosure – deactivated government card (projected score check).');
              consumed.push(t);
            } else {
              enqueue({ type: 'LOG', msg: 'Strategic Disclosure present but projected influence check not met.' });
            }
          } catch (e) {
            // Fallback: if something goes wrong, do not block play; log debug
            try { log(`DEBUG: Strategic Disclosure error: ${String(e)}`); } catch (e) {}
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

        // Compute number of Activist cards on both players' boards (innen + aussen)
        const cd = require('../data/cardDetails') as any;
        let activistCount = 0;
        for (const p of [1, 2] as const) {
          const innen = state.board[p]?.innen || [];
          const aussen = state.board[p]?.aussen || [];
          const all = [...innen, ...aussen];
          for (const c of all) {
            if (!c) continue;
            const subcats = cd.getCardDetails?.((c as any).name)?.subcategories as string[] | undefined;
            const legacyTag = (c as any).tag === 'Activist' || (c as any).tag === 'Aktivist' || (c as any).tag === 'Activists' || (c as any).tag === 'Movement';
            const hasActivistSubcat = Array.isArray(subcats) && (subcats.includes('Activist') || subcats.includes('Aktivist'));
            if (hasActivistSubcat || legacyTag) {
              // ignore deactivated public/pol cards
              if (!(c as any).deactivated) activistCount++;
            }
          }
        }

        // Base debuff -2 plus -1 per Activist (both boards), capped at -6 total
        const totalDebuffMagnitude = Math.min(6, 2 + activistCount);
        const amount = -totalDebuffMagnitude;

        enqueue({ type: 'DEBUFF_CARD', player: opp, targetUid: (card as any).uid, amount } as any);
        const debuffMsg = `Trap: Whistleblower – government card gets ${amount} Influence (base -2 + activists ${activistCount}, capped at -6).`;
        enqueue({ type: 'LOG', msg: debuffMsg });
        // Immediate console log for better chronological trace before warnings
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
  try {
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
}