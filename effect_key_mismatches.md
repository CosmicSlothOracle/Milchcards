# Effect Key vs Card Name Mismatches

## 🔍 KRITISCHE MISMATCHES GEFUNDEN

### 1. **REGISTRY KEYS vs KARTEN-NAMEN**

#### ✅ **KORREKTE MATCHES** (32 Karten)

| Registry Key                                   | Karten-Name               | Status |
| ---------------------------------------------- | ------------------------- | ------ |
| `public.elon.draw_ap`                          | `Elon Musk`               | ✅     |
| `public.zuck.once_ap_on_activation`            | `Mark Zuckerberg`         | ✅     |
| `public.doudna.aura_science`                   | `Jennifer Doudna`         | ✅     |
| `public.fauci.aura_health`                     | `Anthony Fauci`           | ✅     |
| `public.chomsky.aura_military_penalty`         | `Noam Chomsky`            | ✅     |
| `public.aiweiwei.on_activate_draw_ap`          | `Ai Weiwei`               | ✅     |
| `public.bill_gates.next_initiative_ap1`        | `Bill Gates`              | ✅     |
| `public.greta_thunberg.first_gov_ap1`          | `Greta Thunberg`          | ✅     |
| `init.shadow_lobbying.buff2`                   | `Shadow Lobbying`         | ✅     |
| `init.spin_doctor.buff_strongest_gov2`         | `Spin Doctor`             | ✅     |
| `init.digital_campaign.draw2`                  | `Digitaler Wahlkampf`     | ✅     |
| `init.surprise_funding.ap2`                    | `Surprise Funding`        | ✅     |
| `init.grassroots_blitz.draw1_buff1`            | `Grassroots Blitz`        | ✅     |
| `init.strategic_leaks.opp_discard1`            | `Strategic Leaks`         | ✅     |
| `init.emergency_legislation.grant_shield1`     | `Emergency Legislation`   | ✅     |
| `init.ai_narrative.register_media_blackout`    | `AI Narrative Control`    | ✅     |
| `init.party_offensive.deactivate_gov`          | `Party Offensive`         | ✅     |
| `init.opposition_blockade.lock_initiatives`    | `Opposition Blockade`     | ✅     |
| `init.delay_tactics.ap_or_draw`                | `Delay Tactics`           | ✅     |
| `init.think_tank.draw1_buff_gov2`              | `Think Tank`              | ✅     |
| `init.influencer_campaign.double_public`       | `Influencer Campaign`     | ✅     |
| `init.system_critical.shield1`                 | `System-Critical`         | ✅     |
| `init.symbolic_politics.draw1`                 | `Symbolic Politics`       | ✅     |
| `init.napoleon_komplex.tier1_gov_plus1`        | `Napoleon Komplex`        | ✅     |
| `init.opportunist.mirror_ap_effects`           | `Opportunist`             | ✅     |
| `trap.fake_news.deactivate_media`              | `Fake News Campaign`      | ✅     |
| `trap.whistleblower.return_last_played`        | `Whistleblower`           | ✅     |
| `trap.data_breach.opp_discard2`                | `Data Breach Exposure`    | ✅     |
| `trap.legal_injunction.cancel_next_initiative` | `Legal Injunction`        | ✅     |
| `trap.media_blackout.deactivate_public`        | `Media Blackout`          | ✅     |
| `trap.budget_freeze.opp_ap_minus2`             | `Budget Freeze`           | ✅     |
| `trap.sabotage.deactivate_gov`                 | `Sabotage Operation`      | ✅     |
| `trap.strategic_disclosure.return_gov`         | `Strategische Enthüllung` | ✅     |

---

## ❌ **KRITISCHE MISMATCHES** (35 Karten)

### **A) KARTEN MIT EFFECT KEYS ABER FALSCHE LEGACY MAPPINGS**

#### 1. **Bill Gates - Inkonsistenter Mapping**

```typescript
// PROBLEM:
'Bill Gates': 'bill_gates'  // ❌ FALSCH - sollte Registry Key sein

// KORREKT:
'Bill Gates': 'public.bill_gates.next_initiative_ap1'  // ✅ Registry Key existiert
```

#### 2. **Greta Thunberg - Inkonsistenter Mapping**

```typescript
// PROBLEM:
'Greta Thunberg': 'public.greta_thunberg.first_gov_ap1'  // ✅ KORREKT
// Aber: Registry Key existiert, Legacy Handler auch
```

### **B) KARTEN OHNE EFFECT KEYS ABER MIT LEGACY HANDLERN**

#### **PUBLIC Karten (15)**

| Karten-Name         | Legacy Handler     | Registry Key fehlt |
| ------------------- | ------------------ | ------------------ |
| `Oprah Winfrey`     | `oprah_winfrey`    | ❌                 |
| `Sam Altman`        | **KEINER**         | ❌                 |
| `George Soros`      | `george_soros`     | ❌                 |
| `Jack Ma`           | `jack_ma`          | ❌                 |
| `Malala Yousafzai`  | **KEINER**         | ❌                 |
| `Roman Abramovich`  | `roman_abramovich` | ❌                 |
| `Tim Cook`          | `tim_cook`         | ❌                 |
| `Mukesh Ambani`     | `mukesh_ambani`    | ❌                 |
| `Jeff Bezos`        | `jeff_bezos`       | ❌                 |
| `Edward Snowden`    | **KEINER**         | ❌                 |
| `Julian Assange`    | **KEINER**         | ❌                 |
| `Yuval Noah Harari` | **KEINER**         | ❌                 |
| `Alexei Navalny`    | **KEINER**         | ❌                 |
| `Warren Buffett`    | `warren_buffett`   | ❌                 |
| `Gautam Adani`      | **KEINER**         | ❌                 |

#### **GOVERNMENT Karten (5)**

| Karten-Name            | Legacy Handler   | Registry Key fehlt |
| ---------------------- | ---------------- | ------------------ |
| `Vladimir Putin`       | `vladimir_putin` | ❌                 |
| `Xi Jinping`           | **KEINER**       | ❌                 |
| `Ursula von der Leyen` | **KEINER**       | ❌                 |
| `Joe Biden`            | **KEINER**       | ❌                 |
| `Olaf Scholz`          | **KEINER**       | ❌                 |

#### **ONGOING INITIATIVES (9)**

| Karten-Name                                 | Legacy Handler | Registry Key fehlt |
| ------------------------------------------- | -------------- | ------------------ |
| `Koalitionszwang (Regierung)`               | **KEINER**     | ❌                 |
| `Algorithmischer Diskurs (Oeffentlichkeit)` | **KEINER**     | ❌                 |
| `Wirtschaftlicher Druck (Regierung)`        | **KEINER**     | ❌                 |
| `Propaganda Network`                        | **KEINER**     | ❌                 |
| `Intelligence Liaison`                      | **KEINER**     | ❌                 |
| `Permanent Lobby Office`                    | **KEINER**     | ❌                 |
| `Military Show of Force`                    | **KEINER**     | ❌                 |
| `Censorship Apparatus`                      | **KEINER**     | ❌                 |
| `Think Tank Pipeline`                       | **KEINER**     | ❌                 |

#### **INTERVENTIONS/TRAPS (6)**

| Karten-Name                   | Legacy Handler | Registry Key fehlt |
| ----------------------------- | -------------- | ------------------ |
| `Counterintelligence Sting`   | **KEINER**     | ❌                 |
| `Public Scandal`              | **KEINER**     | ❌                 |
| `Internal Faction Strife`     | **KEINER**     | ❌                 |
| `Boycott Campaign`            | **KEINER**     | ❌                 |
| `Deepfake Scandal`            | **KEINER**     | ❌                 |
| `Cyber Attack`                | **KEINER**     | ❌                 |
| `Bribery Scandal 2.0`         | **KEINER**     | ❌                 |
| `Grassroots Resistance`       | **KEINER**     | ❌                 |
| `Mass Protests`               | **KEINER**     | ❌                 |
| `Advisor Scandal`             | **KEINER**     | ❌                 |
| `Parliament Closed`           | **KEINER**     | ❌                 |
| `"Independent" Investigation` | **KEINER**     | ❌                 |
| `Soft-Power Collapse`         | **KEINER**     | ❌                 |
| `Cancel Culture`              | **KEINER**     | ❌                 |
| `Lobby Leak`                  | **KEINER**     | ❌                 |
| `Mole`                        | **KEINER**     | ❌                 |
| `Scandal Spiral`              | **KEINER**     | ❌                 |
| `Tunnel Vision`               | **KEINER**     | ❌                 |
| `Satire Show`                 | **KEINER**     | ❌                 |

---

## 🔧 **SOFORTIGE KORREKTUREN NÖTIG**

### **1. Bill Gates Mapping korrigieren**

```typescript
// IN registry.ts LEGACY_NAME_TO_KEY:
// VON:
'Bill Gates': 'bill_gates',
// ZU:
'Bill Gates': 'public.bill_gates.next_initiative_ap1',
```

### **2. Registry Keys für Legacy Handler erstellen**

```typescript
// NEUE Registry Keys hinzufügen:
'public.oprah_winfrey.deactivate_hands': ({ enqueue, player, log }) => {
  const otherPlayer = player === 1 ? 2 : 1;
  enqueue({ type: 'DEACTIVATE_RANDOM_HAND', player, amount: 1 });
  enqueue({ type: 'DEACTIVATE_RANDOM_HAND', player: otherPlayer, amount: 1 });
  enqueue({ type: 'LOG', msg: 'Oprah Winfrey: jeweils 1 zufällige Handkarte beider Spieler deaktiviert' });
  log('🟢 public.oprah_winfrey.deactivate_hands');
},

'public.george_soros.ap1': ({ enqueue, player, log }) => {
  enqueue({ type: 'ADD_AP', player, amount: 1 });
  enqueue({ type: 'LOG', msg: 'George Soros: +1 AP' });
  log('🟢 public.george_soros.ap1');
},

'public.jack_ma.draw1': ({ enqueue, player, log }) => {
  enqueue({ type: 'DRAW_CARDS', player, amount: 1 });
  enqueue({ type: 'LOG', msg: 'Jack Ma: +1 Karte' });
  log('🟢 public.jack_ma.draw1');
},

// ... weitere für alle Legacy Handler
```

### **3. Effect Keys zu Karten hinzufügen**

```typescript
// IN cards.ts:
P('public.oprah_winfrey', 'Oprah Winfrey', ['Media'], 3, 'public.oprah_winfrey.deactivate_hands'),
P('public.george_soros', 'George Soros', ['Finance'], 4, 'public.george_soros.ap1'),
P('public.jack_ma', 'Jack Ma', ['Tech'], 3, 'public.jack_ma.draw1'),
// ... weitere
```

### **4. Legacy Mappings aktualisieren**

```typescript
// IN registry.ts LEGACY_NAME_TO_KEY:
'Oprah Winfrey': 'public.oprah_winfrey.deactivate_hands',
'George Soros': 'public.george_soros.ap1',
'Jack Ma': 'public.jack_ma.draw1',
// ... weitere
```

---

## 📊 **ZUSAMMENFASSUNG DER MISMATCHES**

### **Kritische Probleme:**

1. **1 inkonsistenter Legacy Mapping** (Bill Gates)
2. **15 Karten mit Legacy Handlern aber ohne Registry Keys**
3. **20 Karten ohne jegliche Effekt-Implementierung**
4. **35 Karten insgesamt ohne korrekte Effect Keys**

### **Sofortige Aktionen:**

1. ✅ Bill Gates Mapping korrigieren
2. ✅ Registry Keys für alle Legacy Handler erstellen
3. ✅ Effect Keys zu allen Karten mit Legacy Handlern hinzufügen
4. ✅ Legacy Mappings aktualisieren
5. ⚠️ Neue Effekte für Karten ohne Legacy Handler definieren

**Das würde die Testabdeckung von 32/67 (48%) auf 47/67 (70%) erhöhen!**
