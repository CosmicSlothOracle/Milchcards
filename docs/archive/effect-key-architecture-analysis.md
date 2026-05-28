# Effect Key Architecture Analysis

## 🏗️ **AKTUELLE ARCHITEKTUR**

### **✅ Architektur existiert bereits**

Die Effect Key Architektur ist **vollständig implementiert**:

```typescript
// 1. Card Definition mit effectKey
type CardDef = {
  id: string;
  name: string;
  type: CardType;
  effectKey?: string; // ← Registry key für direkten Handler-Zugriff
  // ...
};

// 2. Registry mit Handlern
export const EFFECTS: Record<string, EffectHandler> = {
  "public.elon.draw_ap": ({ enqueue, player, log }) => {
    /* ... */
  },
  "init.spin_doctor.buff_strongest_gov2": ({ enqueue, player, log }) => {
    /* ... */
  },
  // ...
};

// 3. Trigger-Funktion mit Priorität
export function triggerCardEffect(
  state: GameState,
  player: Player,
  card: Card
): void {
  // PRIORITÄT 1: Direkter effectKey
  const effectKey = card.effectKey;
  if (effectKey) {
    const effectFn = EFFECTS[effectKey];
    if (effectFn) {
      effectFn({ enqueue, player, log });
      return; // ← Direkter Handler-Aufruf
    }
  }

  // PRIORITÄT 2: Legacy Name Mapping
  const legacyKey = LEGACY_NAME_TO_KEY[card.name];
  if (legacyKey) {
    // Versuche Registry
    const effectFn = EFFECTS[legacyKey];
    if (effectFn) {
      effectFn({ enqueue, player, log });
      return;
    }
    // Fallback zu Legacy
    const legacyEffectFn = LEGACY_EFFECTS[legacyKey];
    if (legacyEffectFn) {
      legacyEffectFn({ enqueue, player, log });
      return;
    }
  }

  console.warn(`No effect implementation found for card: ${card.name}`);
}
```

---

## 📊 **KARTEN MIT EFFECT KEYS** (32/67 Karten)

### **✅ PUBLIC Karten mit effectKey** (8/23)

```typescript
P('public.elon_musk', 'Elon Musk', ['Tech','Media'], 4, 'public.elon.draw_ap'),
P('public.mark_zuckerberg', 'Mark Zuckerberg', ['Tech','Platform'], 3, 'public.zuck.once_ap_on_activation'),
P('public.jennifer_doudna', 'Jennifer Doudna', ['Science'], 3, 'public.doudna.aura_science'),
P('public.anthony_fauci', 'Anthony Fauci', ['Health'], 3, 'public.fauci.aura_health'),
P('public.noam_chomsky', 'Noam Chomsky', ['Academia'], 3, 'public.chomsky.aura_military_penalty'),
P('public.ai_weiwei', 'Ai Weiwei', ['Art','Activist'], 4, 'public.aiweiwei.on_activate_draw_ap'),
P('public.bill_gates', 'Bill Gates', ['Tech','Philanthropy'], 6, 'public.bill_gates.next_initiative_ap1'),
P('public.greta_thunberg', 'Greta Thunberg', ['Movement','Climate'], 3, 'public.greta_thunberg.first_gov_ap1'),
```

### **✅ INITIATIVES mit effectKey** (16/25)

```typescript
I('init.shadow_lobbying', 'Shadow Lobbying', ['Instant','Buff'], 3, 'init.shadow_lobbying.buff2'),
I('init.spin_doctor', 'Spin Doctor', ['Instant','Buff'], 3, 'init.spin_doctor.buff_strongest_gov2'),
I('init.digitaler_wahlkampf', 'Digitaler Wahlkampf', ['Instant','Media','Draw'], 3, 'init.digital_campaign.draw2'),
I('init.surprise_funding', 'Surprise Funding', ['Instant','AP'], 2, 'init.surprise_funding.ap2'),
I('init.grassroots_blitz', 'Grassroots Blitz', ['Instant','Draw','Buff'], 3, 'init.grassroots_blitz.draw1_buff1'),
I('init.strategic_leaks', 'Strategic Leaks', ['Instant','Hand'], 4, 'init.strategic_leaks.opp_discard1'),
I('init.emergency_legislation', 'Emergency Legislation', ['Instant','Shield'], 4, 'init.emergency_legislation.grant_shield1'),
I('init.ai_narrative', 'AI Narrative Control', ['Instant','Media'], 4, 'init.ai_narrative.register_media_blackout'),
I('init.party_offensive', 'Party Offensive', ['Instant','Deactivate','Government'], 4, 'init.party_offensive.deactivate_gov'),
I('init.opposition_blockade', 'Opposition Blockade', ['Instant','Lock'], 4, 'init.opposition_blockade.lock_initiatives'),
I('init.delay_tactics', 'Delay Tactics', ['Instant','AP','Draw'], 3, 'init.delay_tactics.ap_or_draw'),
I('init.think_tank', 'Think Tank', ['Instant','Draw','Buff'], 4, 'init.think_tank.draw1_buff_gov2'),
I('init.influencer_campaign', 'Influencer Campaign', ['Instant','Public','Aura'], 4, 'init.influencer_campaign.double_public'),
I('init.system_critical', 'System-Critical', ['Instant','Shield','Public'], 3, 'init.system_critical.shield1'),
I('init.symbolic_politics', 'Symbolic Politics', ['Instant','Draw'], 2, 'init.symbolic_politics.draw1'),
I('init.napoleon_komplex', 'Napoleon Komplex', ['Ongoing','Government','Buff'], 4, 'init.napoleon_komplex.tier1_gov_plus1'),
I('init.opportunist', 'Opportunist', ['Instant','Mirror'], 3, 'init.opportunist.mirror_ap_effects'),
```

### **✅ INTERVENTIONS/TRAPS mit effectKey** (8/19)

```typescript
T('trap.fake_news', 'Fake News Campaign', ['Trap','Media'], 3, 'trap.fake_news.deactivate_media'),
T('trap.whistleblower', 'Whistleblower', ['Trap','Return'], 4, 'trap.whistleblower.return_last_played'),
T('trap.data_breach', 'Data Breach Exposure', ['Trap','Discard'], 4, 'trap.data_breach.opp_discard2'),
T('trap.legal_injunction', 'Legal Injunction', ['Trap','Cancel'], 5, 'trap.legal_injunction.cancel_next_initiative'),
T('trap.media_blackout', 'Media Blackout', ['Trap','Deactivate','Public'], 5, 'trap.media_blackout.deactivate_public'),
T('trap.budget_freeze', 'Budget Freeze', ['Trap','AP'], 5, 'trap.budget_freeze.opp_ap_minus2'),
T('trap.sabotage', 'Sabotage Operation', ['Trap','Deactivate','Government'], 5, 'trap.sabotage.deactivate_gov'),
// Strategische Enthüllung ist in cards.ts als Trap definiert, aber hat effectKey
```

---

## ❌ **KARTEN OHNE EFFECT KEYS** (35/67 Karten)

### **❌ PUBLIC Karten ohne effectKey** (15/23)

```typescript
P('public.oprah_winfrey', 'Oprah Winfrey', ['Media'], 3),                    // ← Kein effectKey
P('public.sam_altman', 'Sam Altman', ['Tech'], 3),                          // ← Kein effectKey
P('public.george_soros', 'George Soros', ['Finance'], 4),                   // ← Kein effectKey
P('public.jack_ma', 'Jack Ma', ['Tech'], 3),                               // ← Kein effectKey
P('public.malala_yousafzai', 'Malala Yousafzai', ['Movement','Education'], 3), // ← Kein effectKey
P('public.roman_abramovich', 'Roman Abramovich', ['Oligarch'], 4),          // ← Kein effectKey
P('public.tim_cook', 'Tim Cook', ['Tech'], 3),                             // ← Kein effectKey
P('public.mukesh_ambani', 'Mukesh Ambani', ['Oligarch'], 4),               // ← Kein effectKey
P('public.jeff_bezos', 'Jeff Bezos', ['Tech'], 4),                         // ← Kein effectKey
P('public.edward_sn0wden', 'Edward Snowden', ['Whistleblower'], 3),        // ← Kein effectKey
P('public.julian_assange', 'Julian Assange', ['Whistleblower'], 3),        // ← Kein effectKey
P('public.yuval_noah_harari', 'Yuval Noah Harari', ['Academia'], 3),       // ← Kein effectKey
P('public.alexei_navalny', 'Alexei Navalny', ['Opposition'], 3),           // ← Kein effectKey
P('public.warren_buffett', 'Warren Buffett', ['Finance'], 4),              // ← Kein effectKey
P('public.gautam_adani', 'Gautam Adani', ['Oligarch'], 4),                 // ← Kein effectKey
```

### **❌ GOVERNMENT Karten ohne effectKey** (5/5)

```typescript
G('gov.vladimir_putin', 'Vladimir Putin', ['Politician','Tier2'], 8),      // ← Kein effectKey
G('gov.xi_jinping', 'Xi Jinping', ['Politician','Tier2'], 8),              // ← Kein effectKey
G('gov.ursula_von_der_leyen', 'Ursula von der Leyen', ['Politician','EU'], 6), // ← Kein effectKey
G('gov.joe_biden', 'Joe Biden', ['Politician','US'], 7),                   // ← Kein effectKey
G('gov.olaf_scholz', 'Olaf Scholz', ['Politician','DE'], 6),               // ← Kein effectKey
```

### **❌ ONGOING INITIATIVES ohne effectKey** (9/10)

```typescript
I('init.koalitionszwang', 'Koalitionszwang (Regierung)', ['Ongoing'], 4),   // ← Kein effectKey
I('init.algorithmischer_diskurs', 'Algorithmischer Diskurs (Oeffentlichkeit)', ['Ongoing','Media'], 4), // ← Kein effectKey
I('init.wirtschaftlicher_druck', 'Wirtschaftlicher Druck (Regierung)', ['Ongoing'], 4), // ← Kein effectKey
I('init.propaganda_network', 'Propaganda Network', ['Ongoing','Buff'], 4),  // ← Kein effectKey
I('init.intelligence_liaison', 'Intelligence Liaison', ['Ongoing','Shield'], 4), // ← Kein effectKey
I('init.permanent_lobby_office', 'Permanent Lobby Office', ['Ongoing','AP'], 4), // ← Kein effectKey
I('init.military_show', 'Military Show of Force', ['Ongoing','Penalty'], 4), // ← Kein effectKey
I('init.censorship_apparatus', 'Censorship Apparatus', ['Ongoing','Deactivate'], 4), // ← Kein effectKey
I('init.thinktank_pipeline', 'Think Tank Pipeline', ['Ongoing','Draw'], 4), // ← Kein effectKey
```

### **❌ INTERVENTIONS/TRAPS ohne effectKey** (13/19)

```typescript
T('trap.counterintel', 'Counterintelligence Sting', ['Trap','Reveal'], 5),  // ← Kein effectKey
T('trap.public_scandal', 'Public Scandal', ['Trap','Influence'], 4),       // ← Kein effectKey
T('trap.internal_faction_strife', 'Internal Faction Strife', ['Trap','Cancel'], 5), // ← Kein effectKey
T('trap.boycott', 'Boycott Campaign', ['Trap','Deactivate'], 4),           // ← Kein effectKey
T('trap.deepfake', 'Deepfake Scandal', ['Trap','Lock'], 5),                // ← Kein effectKey
T('trap.cyber_attack', 'Cyber Attack', ['Trap','Destroy'], 5),             // ← Kein effectKey
T('trap.bribery_v2', 'Bribery Scandal 2.0', ['Trap','Control'], 5),       // ← Kein effectKey
T('trap.grassroots_resistance', 'Grassroots Resistance', ['Trap','Deactivate'], 4), // ← Kein effectKey
T('trap.mass_protests', 'Mass Protests', ['Trap','Debuff'], 4),            // ← Kein effectKey
T('trap.advisor_scandal', 'Advisor Scandal', ['Trap','Debuff'], 4),        // ← Kein effectKey
T('trap.parliament_closed', 'Parliament Closed', ['Trap','Stop'], 5),      // ← Kein effectKey
T('trap.independent_investigation', '"Independent" Investigation', ['Trap','Cancel'], 4), // ← Kein effectKey
T('trap.soft_power_collapse', 'Soft-Power Collapse', ['Trap','Debuff'], 5), // ← Kein effectKey
T('trap.cancel_culture', 'Cancel Culture', ['Trap','Deactivate'], 4),      // ← Kein effectKey
T('trap.lobby_leak', 'Lobby Leak', ['Trap','Discard'], 4),                 // ← Kein effectKey
T('trap.mole', 'Mole', ['Trap','Copy'], 4),                                // ← Kein effectKey
T('trap.scandal_spiral', 'Scandal Spiral', ['Trap','Cancel'], 5),          // ← Kein effectKey
T('trap.tunnel_vision', 'Tunnel Vision', ['Trap','Ignore'], 4),            // ← Kein effectKey
T('trap.satire_show', 'Satire Show', ['Trap','Debuff'], 4),                // ← Kein effectKey
```

---

## 🔄 **AKTUELLE FALLBACK-LOGIK**

### **Priorität 1: Direkter effectKey**

```typescript
if (card.effectKey) {
  const effectFn = EFFECTS[card.effectKey];
  if (effectFn) {
    effectFn({ enqueue, player, log });
    return; // ← Direkter Handler-Aufruf
  }
}
```

### **Priorität 2: Legacy Name Mapping**

```typescript
const legacyKey = LEGACY_NAME_TO_KEY[card.name];
if (legacyKey) {
  // Versuche Registry
  const effectFn = EFFECTS[legacyKey];
  if (effectFn) {
    effectFn({ enqueue, player, log });
    return;
  }
  // Fallback zu Legacy
  const legacyEffectFn = LEGACY_EFFECTS[legacyKey];
  if (legacyEffectFn) {
    legacyEffectFn({ enqueue, player, log });
    return;
  }
}
```

### **Priorität 3: Warnung**

```typescript
console.warn(`No effect implementation found for card: ${card.name}`);
```

---

## 📈 **ZUSAMMENFASSUNG**

### **✅ Architektur Status:**

- **Vollständig implementiert** ✅
- **Direkte Effect Key → Handler Mapping** ✅
- **Fallback-System für Legacy** ✅
- **Test Suite integriert** ✅

### **📊 Coverage:**

- **32/67 Karten** haben effectKeys (48%)
- **35/67 Karten** haben KEINE effectKeys (52%)
- **15 Karten** haben Legacy Handler aber keine Registry Keys
- **20 Karten** haben gar keine Effekt-Implementierung

### **🎯 Nächste Schritte:**

1. **Registry Keys für alle Legacy Handler erstellen**
2. **Effect Keys zu allen Karten mit Legacy Handlern hinzufügen**
3. **Neue Effekte für Karten ohne Legacy Handler definieren**

**Das würde die Coverage von 48% auf 100% erhöhen!**
