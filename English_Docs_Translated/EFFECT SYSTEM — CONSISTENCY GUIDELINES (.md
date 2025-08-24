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

AP-Kalkulation:

Nur getNetApCost(state, player, card) berechnet Kosten/Refunds.

Nur in useGameActions.playCard werden Discount/Refund konsumiert (siehe §6).

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
| { type: 'ADJUST_INFLUENCE'; player: Player; amount: number; reason?: string }
| { type: 'SET_DISCOUNT'; player: Player; amount: number } // +amount auf Discount-Pool
| { type: 'REFUND_NEXT_INITIATIVE'; player: Player; amount: number } // +amount auf Refund-Pool
| { type: 'GRANT_SHIELD'; targetUid: UID } // one-time shield
| { type: 'DEACTIVATE_CARD'; targetUid: UID }
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

Auto-Turnwechsel (falls Aktionenlimit erreicht und keine 0-AP Züge möglich).

Sofort-Initiativen:

Spiel legt Karte in board[player].sofort[0].

Aktivierung via activateInstantInitiative → Schritte 6–7–8 analog (und danach in den Ablagestapel).

4. Start-of-Turn

Implementierung in utils/startOfTurnHooks.ts:

Reset turn-scoped:

effectFlags[player].markZuckerbergUsed = false

govRefundAvailable wird gemäß vorhandener Movement/Greta-Logik gesetzt.

Clamp/Caps:

initiativeDiscount = clamp(initiativeDiscount, 0, 2)

initiativeRefund = clamp(initiativeRefund, 0, 2)

Auren recompute: recomputeAuraFlags(state) nach Flags-Reset.

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

Falls Initiative (inkl. Sofort):

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

ADD_AP → clamp [0..4].

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

Karten tragen tag (z. B. NGO, Plattform, Medien, Intelligenz, Wirtschaft, Infrastruktur).

Für Kategorien-Boni nutze zentrale Struktur:

initiativeEffectModifierByTag: Record<string, number>

Setzen per Event (z. B. Buffet/Adani) und Konsum zentral bei Initiative-Resolve.

13. Traps

Registrierung: registerTrap(state, player, card, log).

Auslösung: checkTrapsOnOpponentPlay unmittelbar nach Board-Platzierung des Gegners.

Effekte: legen ausschließlich Events in die Queue. Auflösung wieder über Resolver.

14. Permanente / Sofort-Initiativen

Permanente: werden in permanentSlots[player].government|public platziert; Effekte via Events, anhaltende Auren via Recompute.

Sofort: auf board[player].sofort[0], Aktivierung über UI/Aktion → INITIATIVE_ACTIVATED + zugehörige Events, danach in Ablage.

15. Balancing-Limits

AP-Cap: 4.

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

20. Beispiele (kurz)

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
if (t) q.push({ type:'ADJUST_INFLUENCE', player, amount: +1, reason:'Spin Doctor' });
q.push({ type:'LOG', msg:'Spin Doctor: stärkste Regierung +1 I' });
break;

Dieses Dokument ist bindend.
Alle Karten, die nicht diesem Ablauf folgen, sind fehlerhaft und werden im Review abgelehnt.
