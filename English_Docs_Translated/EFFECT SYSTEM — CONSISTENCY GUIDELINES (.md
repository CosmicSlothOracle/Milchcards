EFFECT SYSTEM — CONSISTENCY GUIDELINES (v1)

Scope: Alle Karten-Effekte (Politik/Öffentlichkeit/Initiativen/Traps/Auren) laufen strikt über ein Event-System mit einer Queue. Diese Datei ist verbindlich. Abweichungen sind nicht erlaubt.

0. Ziele

Einheitlich: Eine Queue, ein Datenmodell, ein Ablauf.

Schlank: Keine Direkt-Mutationen außerhalb des Resolvers.

Vorhersagbar: Feste Konsumtionspunkte für Discounts/Refunds.

Testbar: Jeder Effekt ist reiner Input→Events; Resolver ist zentral testbar.

1. Single Source of Truth

Nur eine Queue: EffectEvent[] in utils/queue.ts.

Entferne oder adaptiere alte Engine-Queues.

Alle Effekte werden als Events enqueued und nur dort aufgelöst.

AP-Baseline:

Jede gespielte Karte kostet 1 AP (Baseline). AP-Effekte fügen AP via ADD_AP-Events hinzu; es gibt keine Obergrenze. Historische Discounts/Refunds werden nur noch über Events abgebildet (siehe §6, Legacy/Planned).

Influence:

Alle Einflussänderungen laufen über EffectEvent: ADJUST_INFLUENCE.

Direkte Mutationen von card.influence sind verboten (Ausnahme: Auren-Recompute Routine).

2. Event-Modell

Typen (verbindlich; erweitern wenn nötig):

export type EffectEvent =
| { type: 'LOG'; msg: string }
| { type: 'ADD_AP'; player: Player; amount: number }
| { type: 'DRAW_CARDS'; player: Player; amount: number }
| { type: 'DISCARD_RANDOM_FROM_HAND'; player: Player; amount: number }
| { type: 'DEACTIVATE_RANDOM_HAND'; player: Player; amount: number }
| { type: 'SET_DISCOUNT'; player: Player; amount: number } // +amount auf Discount-Pool
| { type: 'REFUND_NEXT_INITIATIVE'; player: Player; amount: number } // +amount auf Refund-Pool
| { type: 'GRANT_SHIELD'; targetUid: UID } // one-time shield
| { type: 'DEACTIVATE_CARD'; targetUid: UID }
| { type: 'BUFF_STRONGEST_GOV'; player: Player; amount: number } // Alias: ADJUST_INFLUENCE
| { type: 'INITIATIVE_ACTIVATED'; player: Player };

Regeln:

Neuer Effekt? Zuerst EffectEvent erweitern, dann im Resolver implementieren.

Keine State-Mutation in effects/cards.ts. Dort nur: q.push(event) + LOG.

3. Effect-Lifecycle (Play-Flow)

Reihenfolge für useGameActions.playCard:

Prüfen: canPlayCard.

Kostenverbuchung: AP abziehen; Refund direkt gutschreiben (Netto-Kosten wird geloggt).

Board-Platzierung: Karte auf Lane/Slot legen.

Traps prüfen: checkTrapsOnOpponentPlay.

Auren (lokal) anwenden: recomputeAuraFlags oder lokaler Helper (keine Direkt-Mutation; siehe §8).

Effekte erzeugen: triggerCardEffects(state, player, card) → enqueued Events.

Queue auflösen: resolveQueue(state, events).

Konsum AP-Mechaniken: Nur hier (siehe §6).

Post-Play Hooks: runden-/zugbezogene Flags setzen, Mark-Zuckerberg once-per-round etc.

Instant-Initiativen:

Spiel legt Karte in board[player].sofort[0].

Aktivierung via activateInstantInitiative (UI-Klick oder Taste 'A') → Schritte 6–7–8 analog (und danach in den Ablagestapel).

4. Start-of-Turn

Implementierung in utils/startOfTurnHooks.ts:

Reset turn-scoped:

- effectFlags[player].markZuckerbergUsed = false
- effectFlags[player].initiativeDiscount = 0
- effectFlags[player].initiativeRefund = 0
- effectFlags[player].govRefundAvailable = false

Cluster-3 Auren (temporäre Auren für Instant-Initiativen):

- initiativeInfluenceBonus: +1 pro Jennifer Doudna/Anthony Fauci (0..2)
- initiativeInfluencePenaltyForOpponent: +1 wenn Noam Chomsky liegt
- initiativeOnPlayDraw1Ap1: true wenn Ai Weiwei liegt

Bewegung-Refund:

- govRefundAvailable = true wenn Greta Thunberg/Malala Yousafzai liegt

Clamp/Caps:

- initiativeDiscount = clamp(initiativeDiscount, 0, 2)
- initiativeRefund = clamp(initiativeRefund, 0, 2)

5. Flags (EffectFlags)

Verbindliche Felder:

initiativeDiscount: number // Pool (verbraucht 1 je Initiative)

initiativeRefund: number // Pool (verbraucht 1 je Initiative)

govRefundAvailable: boolean // 1× pro Zug

Runden-Auren (Cluster):

initiativeInfluenceBonus: number

initiativeInfluencePenaltyForOpponent: number

initiativeOnPlayDraw1Ap1: boolean

markZuckerbergUsed: boolean

Altes/Legacy:

Entferne nach Migration alle ungenutzten Legacy-Flags. Bis dahin nicht neu verwenden.

6. Discounts & Refunds (Konsum-Punkt)

Strikt in useGameActions.playCard NACH Queue-Resolve:

Falls Initiative (inkl. Instant):

Wenn initiativeRefund > 0 ⇒ initiativeRefund -= 1.

Wenn initiativeDiscount > 0 ⇒ initiativeDiscount -= 1.

Falls Government und govRefundAvailable ⇒ govRefundAvailable = false.

Erzeugung (nur Events):

Rabatt: SET_DISCOUNT { amount } → Resolver: flags.initiativeDiscount += amount.

Refund: REFUND_NEXT_INITIATIVE { amount } → Resolver: flags.initiativeRefund += amount.

Caps gelten sofort (clamp auf 0..2).

7. Shields (Schutz)

Verwaltung über state.shields: Set<UID>.

Setzen: GRANT_SHIELD { targetUid } (Resolver fügt in Set ein).

Verbrauch: Beim ersten negativen Effekt auf die Karte (DEACTIVATE_CARD, negativer ADJUST_INFLUENCE, Zerstörung) konsumiert der Resolver den Shield und unterbindet den negativen Effekt (loggen).

Keine Direkt-Flags an Kartenobjekten.

8. Influence & Auren

Temporär: nur per ADJUST_INFLUENCE Event.

Dauerhaft/Basis: nicht direkt mutieren; benutze baseInfluence + Recompute:

recomputeAuraFlags(state) setzt pro Karte card.influence = card.baseInfluence + auraBonus.

Opportunist/Mirror: hooke im Resolver auf ADJUST_INFLUENCE und spiegele gemäß Regelwerk.

9. Card→Events Mapping

Datei: src/effects/cards.ts
Pattern pro Karte:

export function triggerCardEffects(state: GameState, player: Player, card: Card) {
const q: EffectEvent[] = [];
switch (card.name) {
case 'Elon Musk':
q.push({ type:'DRAW_CARDS', player, amount:1 });
q.push({ type:'SET_DISCOUNT', player, amount:1 });
q.push({ type:'LOG', msg:'Elon Musk: +1 Karte, nächste Initiative -1 AP' });
break;

    case 'Ursula von der Leyen': {
      const strongest = getStrongestGovernmentCard(state, player); // util
      if (strongest) q.push({ type:'GRANT_SHIELD', targetUid: strongest.uid });
      q.push({ type:'LOG', msg:'Ursula: 🛡️ Schutz stärkste Regierung' });
      break;
    }

    // … weitere Karten …

    default: break;

}
if (q.length) resolveQueue(state, q);
}

Hard Rules:

Keine State-Mutation in diesem Switch.

Kein Zugriff auf AP/Flags hier. Nur Events & LOG.

10. Resolver (utils/queue.ts)

MUSS implementieren:

LOG → in state.log.

ADD_AP → ohne Obergrenze: after = Math.max(0, before + amount).

DRAW_CARDS → Deck→Hand, solange verfügbar.

DISCARD_RANDOM_FROM_HAND → Handverlust (deterministische RNG optional über Seed).

ADJUST_INFLUENCE → pro Spielerwirkung, Opportunist-Hook prüfen.

SET_DISCOUNT / REFUND_NEXT_INITIATIVE → Flags erhöhen + clamp.

GRANT_SHIELD / DEACTIVATE_CARD → Shield-Semantik gemäß §7.

INITIATIVE_ACTIVATED → für Auren/Once-Per-Round Hooks.

Logging-Format (einheitlich):

[EFFECT] <CardName|System>: <kurzer Text>; ΔAP=±x, ΔI=±y, Target=<name/uid>

11. Utilities (utils/effectUtils.ts)

Bereitstellen:

getStrongestGovernmentCard(state, player): PoliticianCard|undefined

countPublicByTag(state, player, tag: string): number

isInitiative(card: Card): boolean

isInstantInitiative(card: Card): boolean

Pflichtverwendung in cards.ts.

12. Tags & Metadaten

Karten tragen tag (z. B. NGO, Tech [vormals Plattform], Medien, Opinion Leader [vormals Intelligenz], Wirtschaft, Infrastruktur).

Für Kategorien-Boni nutze zentrale Struktur:

initiativeEffectModifierByTag: Record<string, number>

Setzen per Event (z. B. Buffet/Adani) und Konsum zentral bei Initiative-Resolve.

13. Traps

Registrierung: registerTrap(state, player, card, log).

Auslösung: checkTrapsOnOpponentPlay unmittelbar nach Board-Platzierung des Gegners.

Effekte: legen ausschließlich Events in die Queue. Auflösung wieder über Resolver.

14. Permanente / Instant-Initiativen

Permanente: werden in permanentSlots[player].government|public platziert; Effekte via Events, anhaltende Auren via Recompute.

Instant: auf board[player].sofort[0], Aktivierung über UI-Klick oder Taste 'A' → INITIATIVE_ACTIVATED + zugehörige Events, danach in Ablage.

15. Balancing-Limits

AP: keine Obergrenze (Start pro Zug: 2 AP).

Discount-Pool: max 2.

Refund-Pool: max 2.

Pro Zug: govRefundAvailable max 1 Verbrauch.

Shields: 1 Verbrauch pro Karte pro Shield.

16. Tests

Unit (queue.resolve.test.ts): ein Test pro Eventtyp.

Integration (effects/cards.test.ts): jede Karte → enqueued Events korrekt.

Browser Harness (/tests/TestRunner.tsx): Szenarien laufen gegen echte Hooks; Snapshots pro Schritt (AP, I, Boards, Hands, Flags, Logs).

Testregeln:

Für random Effekte Logs + Größenänderungen prüfen (deterministische RNG optional).

Mindestens 2 Szenarien pro Effekt, wenn Kontextabhängigkeiten existieren (z. B. Media vorhanden/nicht vorhanden).

17. Code-Schablonen

Neue Karte anlegen:

Falls neuer Effekt: EffectEvent erweitern + Resolver-Case implementieren.

Mapping in effects/cards.ts hinzufügen (Events + Log).

Utility verwenden (z. B. stärkste Regierung).

Tests: Unit (Event), Integration (Karte), Browser-Case.

Neuer Discount/Refund-Effekt:

Nur SET_DISCOUNT / REFUND_NEXT_INITIATIVE enqueuen.

Keine direkte Flag-Mutation außerhalb des Resolvers.

18. PR-Checklist (verbindlich)

Keine Direkt-Mutationen in effects/cards.ts.

Alle Einflussänderungen → ADJUST_INFLUENCE.

Discounts/Refunds erzeugt per Event, konsumiert in useGameActions.

Start-of-Turn Hooks setzen/clampen Flags.

Logs im Standardformat.

Unit + Integration Tests grün.

Browser-Harness zeigt erwartete Snapshots.

Keine Legacy-Flags neu verwendet.

19. Migrationshinweise

Entferne Alt-Queue (engine/resolve.ts) oder mappe vollständig → EffectEvent.

Legacy-Flags deprecaten und in EffectFlags entfernen, sobald ungenutzt.

Einmalige Direkt-Mutationen (historisch) in Events überführen.

20. Implementation Status

Current Implementation:

- ✅ Event queue system with resolveQueue
- ✅ AP baseline: 1 AP per card play, unlimited AP cap
- ✅ Initiative activation: 0 AP cost
- ✅ Cluster-3 auras (Doudna/Fauci/Chomsky/Ai Weiwei)
- ✅ Platform bonus (Mark Zuckerberg once-per-round)
- ✅ Movement refund (Greta/Malala)
- ✅ Putin double intervention ability
- ✅ Leadership/Diplomat tags (no effects yet)

Planned Features:

- 🔄 Leadership keyword: First initiative per round costs 0 AP
- 🔄 Diplomat keyword: Influence transfer between government cards
- 🔄 Government card abilities (Erdoğan AP penalty, Xi NGO disable, etc.)
- 🔄 Discount/Refund system for initiatives (currently disabled)

21. Beispiele (kurz)

Zhang Yiming (Medien-Rabatt):

case 'Zhang Yiming':
q.push({ type:'SET_DISCOUNT', player, amount:1 });
if (countPublicByTag(state, player, 'Medien') > 0) {
q.push({ type:'SET_DISCOUNT', player, amount:1 }); // zusätzlicher Stack, clamped im Resolver
}
q.push({ type:'LOG', msg:'Zhang Yiming: nächste(n) Initiative(n) -1 AP' });
break;

Spin Doctor (stärkste Regierung +1):

case 'Spin Doctor':
const t = getStrongestGovernmentCard(state, player);
if (t) q.push({ type:'BUFF_STRONGEST_GOV', player, amount: +1 });
q.push({ type:'LOG', msg:'Spin Doctor: stärkste Regierung +1 I' });
break;

Dieses Dokument ist bindend.
Alle Karten, die nicht diesem Ablauf folgen, sind fehlerhaft und werden im Review abgelehnt.
