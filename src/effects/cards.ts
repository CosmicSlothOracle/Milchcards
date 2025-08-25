import { GameState, Player, Card, EffectEvent } from '../types/game';
import { resolveQueue } from '../utils/queue';
import { getStrongestGovernmentUid } from '../utils/targets';
import { triggerCardEffect, LEGACY_NAME_TO_KEY } from './registry';

function other(p: Player): Player { return p === 1 ? 2 : 1; }

export function triggerCardEffects(state: GameState, player: Player, card: Card) {
  // Try registry first (new system)
  if (card.effectKey || LEGACY_NAME_TO_KEY[card.name]) {
    triggerCardEffect(state, player, card);
    return;
  }

  // Fallback to legacy switch statement for unmapped cards
  // Ensure queue exists
  if (!state._effectQueue) state._effectQueue = [];

  switch (card.name) {
    // --- Public (Oligarch/Plattform/NGO/Bewegung etc.) ---
    case 'Elon Musk': {
      state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
      state._effectQueue.push({ type: 'SET_DISCOUNT', player, amount: 1 }); // erste Initiative -1 AP
      state._effectQueue.push({ type: 'LOG', msg: 'Elon Musk: +1 Karte, nächste Initiative -1 AP' });
      break;
    }
    case 'Bill Gates': {
      state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
      state._effectQueue.push({ type: 'SET_DISCOUNT', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Bill Gates: +1 Karte, nächste Initiative -1 AP' });
      break;
    }
    case 'Mark Zuckerberg': {
      state._effectQueue.push({ type: 'REFUND_NEXT_INITIATIVE', player, amount: 1 }); // Sofort einmaliger Refund-Pool +1
      state._effectQueue.push({ type: 'LOG', msg: 'Mark Zuckerberg: Refund-Pool +1 für die nächste Initiative' });
      break;
    }
    case 'Jack Ma': {
      state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Jack Ma: +1 Karte' });
      break;
    }
    case 'Zhang Yiming': {
      state._effectQueue.push({ type: 'SET_DISCOUNT', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Zhang Yiming: nächste Initiative -1 AP' });
      break;
    }
    case 'Mukesh Ambani': {
      state._effectQueue.push({ type: 'ADD_AP', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Mukesh Ambani: +1 AP' });
      break;
    }
    case 'Roman Abramovich': {
      state._effectQueue.push({ type: 'ADD_AP', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Roman Abramovich: +1 AP' });
      break;
    }
    case 'Alisher Usmanov': {
      state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Alisher Usmanov: +1 Karte' });
      break;
    }
    case 'Oprah Winfrey': {
      // je 1 zufällige Handkarte bei beiden deaktivieren (als abgeworfen interpretieren)
      state._effectQueue.push({ type: 'DEACTIVATE_RANDOM_HAND', player, amount: 1 });
      state._effectQueue.push({ type: 'DEACTIVATE_RANDOM_HAND', player: other(player), amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Oprah Winfrey: jeweils 1 zufällige Handkarte beider Spieler deaktiviert' });
      break;
    }
    case 'George Soros': {
      state._effectQueue.push({ type: 'SET_DISCOUNT', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'George Soros: nächste Initiative -1 AP' });
      break;
    }

    // --- Neue Karten gemäß Guidelines §9 ---
    case 'Warren Buffett': {
      state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 2 });
      state._effectQueue.push({ type: 'SET_DISCOUNT', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Warren Buffett: +2 Karten, nächste Initiative -1 AP' });
      break;
    }
    case 'Jeff Bezos': {
      state._effectQueue.push({ type: 'ADD_AP', player, amount: 2 });
      state._effectQueue.push({ type: 'LOG', msg: 'Jeff Bezos: +2 AP' });
      break;
    }
    case 'Larry Page': {
      state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
      state._effectQueue.push({ type: 'REFUND_NEXT_INITIATIVE', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Larry Page: +1 Karte, Refund-Pool +1' });
      break;
    }
    case 'Sergey Brin': {
      state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
      state._effectQueue.push({ type: 'REFUND_NEXT_INITIATIVE', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Sergey Brin: +1 Karte, Refund-Pool +1' });
      break;
    }
    case 'Tim Cook': {
      state._effectQueue.push({ type: 'SET_DISCOUNT', player, amount: 2 });
      state._effectQueue.push({ type: 'LOG', msg: 'Tim Cook: nächste Initiative -2 AP' });
      break;
    }

    // --- Government (Leadership/Diplomat etc. vereinfachte Sofort-Effekte bei Play) ---
    case 'Vladimir Putin': {
      state._effectQueue.push({ type: 'BUFF_STRONGEST_GOV', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Vladimir Putin: stärkste Regierung +1 Einfluss' });
      break;
    }
    case 'Xi Jinping': {
      state._effectQueue.push({ type: 'BUFF_STRONGEST_GOV', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Xi Jinping: stärkste Regierung +1 Einfluss' });
      break;
    }
    case 'Recep Tayyip Erdoğan':
    case 'Recep Tayyip Erdogan':
    case 'Erdogan': {
      state._effectQueue.push({ type: 'DISCARD_RANDOM_FROM_HAND', player: other(player), amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Erdoğan: Gegner wirft 1 zufällige Handkarte ab' });
      break;
    }
    case 'Joschka Fischer': {
      state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Joschka Fischer: +1 Karte' });
      break;
    }
    case 'Ursula von der Leyen': {
      const uid = getStrongestGovernmentUid(state, player);
      if (uid != null) {
        state._effectQueue.push({ type: 'GRANT_SHIELD', targetUid: uid });
      }
      state._effectQueue.push({ type: 'LOG', msg: 'Ursula von der Leyen: 🛡️ Schutz auf stärkste Regierung' });
      break;
    }
    case 'Emmanuel Macron': {
      state._effectQueue.push({ type: 'ADD_AP', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Emmanuel Macron: +1 AP' });
      break;
    }
    case 'Olaf Scholz': {
      state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Olaf Scholz: +1 Karte' });
      break;
    }
    case 'Luiz Inácio Lula da Silva':
    case 'Luiz Inacio Lula da Silva': {
      state._effectQueue.push({ type: 'BUFF_STRONGEST_GOV', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Luiz Inácio Lula da Silva: stärkste Regierung +1 Einfluss' });
      break;
    }
    case 'Volodymyr Zelenskyy': {
      const uid = getStrongestGovernmentUid(state, player);
      if (uid != null) {
        state._effectQueue.push({ type: 'GRANT_SHIELD', targetUid: uid });
      }
      state._effectQueue.push({ type: 'LOG', msg: 'Volodymyr Zelenskyy: 🛡️ Schutz auf stärkste Regierung' });
      break;
    }
    case 'Sergey Lavrov': {
      const opp: Player = player === 1 ? 2 : 1;
      state._effectQueue.push({ type: 'DISCARD_RANDOM_FROM_HAND', player: opp, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Sergey Lavrov: Gegner wirft 1 zufällige Handkarte ab' });
      break;
    }

    // --- Neue Government-Karten ---
    case 'Angela Merkel': {
      state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 2 });
      state._effectQueue.push({ type: 'LOG', msg: 'Angela Merkel: +2 Karten' });
      break;
    }
    case 'Joe Biden': {
      state._effectQueue.push({ type: 'ADD_AP', player, amount: 1 });
      state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Joe Biden: +1 AP, +1 Karte' });
      break;
    }
    case 'Justin Trudeau': {
      state._effectQueue.push({ type: 'BUFF_STRONGEST_GOV', player, amount: 2 });
      state._effectQueue.push({ type: 'LOG', msg: 'Justin Trudeau: stärkste Regierung +2 Einfluss' });
      break;
    }
    case 'Shinzo Abe': {
      state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
      state._effectQueue.push({ type: 'SET_DISCOUNT', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Shinzo Abe: +1 Karte, nächste Initiative -1 AP' });
      break;
    }
    case 'Narendra Modi': {
      state._effectQueue.push({ type: 'ADD_AP', player, amount: 1 });
      state._effectQueue.push({ type: 'BUFF_STRONGEST_GOV', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Narendra Modi: +1 AP, stärkste Regierung +1 Einfluss' });
      break;
    }

    // --- Nächste 10 Karten gemäß Guidelines §9 ---
    case 'Sam Altman': {
      state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
      state._effectQueue.push({ type: 'SET_DISCOUNT', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Sam Altman: +1 Karte, nächste Initiative -1 AP' });
      break;
    }
    case 'Greta Thunberg': {
      state._effectQueue.push({ type: 'DISCARD_RANDOM_FROM_HAND', player: other(player), amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Greta Thunberg: Gegner wirft 1 zufällige Handkarte ab' });
      break;
    }
    case 'Jennifer Doudna': {
      state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
      state._effectQueue.push({ type: 'REFUND_NEXT_INITIATIVE', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Jennifer Doudna: +1 Karte, Refund-Pool +1' });
      break;
    }
    case 'Malala Yousafzai': {
      state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Malala Yousafzai: +1 Karte' });
      break;
    }
    case 'Noam Chomsky': {
      state._effectQueue.push({ type: 'SET_DISCOUNT', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Noam Chomsky: nächste Initiative -1 AP' });
      break;
    }
    case 'Ai Weiwei': {
      state._effectQueue.push({ type: 'DISCARD_RANDOM_FROM_HAND', player: other(player), amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Ai Weiwei: Gegner wirft 1 zufällige Handkarte ab' });
      break;
    }
    case 'Alexei Navalny': {
      state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
      state._effectQueue.push({ type: 'BUFF_STRONGEST_GOV', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Alexei Navalny: +1 Karte, stärkste Regierung +1 Einfluss' });
      break;
    }
    case 'Anthony Fauci': {
      state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
      state._effectQueue.push({ type: 'SET_DISCOUNT', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Anthony Fauci: +1 Karte, nächste Initiative -1 AP' });
      break;
    }
    case 'Gautam Adani': {
      state._effectQueue.push({ type: 'ADD_AP', player, amount: 1 });
      state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Gautam Adani: +1 AP, +1 Karte' });
      break;
    }
    case 'Edward Snowden': {
      state._effectQueue.push({ type: 'DISCARD_RANDOM_FROM_HAND', player: other(player), amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Edward Snowden: Gegner wirft 1 zufällige Handkarte ab' });
      break;
    }

    // --- Sofort-Initiativen (Beispiele, wenn du sie direkt aktivierst) ---
    case 'Digitaler Wahlkampf': {
      state._effectQueue.push({ type: 'DRAW_CARDS', player, amount: 2 });
      state._effectQueue.push({ type: 'SET_DISCOUNT', player, amount: 1 }); // nächste Initiative -1 AP
      state._effectQueue.push({ type: 'LOG', msg: 'Digitaler Wahlkampf: +2 Karten, nächste Initiative -1 AP' });
      break;
    }
    case 'Verzögerungsverfahren':
    case 'Verzoegerungsverfahren': {
      state._effectQueue.push({ type: 'ADD_AP', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Verzögerungsverfahren: +1 AP' });
      break;
    }
    case 'Spin Doctor': {
      state._effectQueue.push({ type: 'BUFF_STRONGEST_GOV', player, amount: 1 });
      state._effectQueue.push({ type: 'LOG', msg: 'Spin Doctor: stärkste Regierung +1 Einfluss' });
      break;
    }

    default:
      // Kein Effekt – bewusst still
      break;
  }
}