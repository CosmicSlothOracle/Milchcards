# Politicard – Complete Ruleset (current baseline)

## Gameziel und Grundprinzip

**Goal:**
Win rounds by having more influence in your government row at round end. Win the game by winning 2 rounds (best‑of‑3).

**Basics:**

- Play Government cards for influence
- Play Public cards for support
- Play Initiatives for immediate or ongoing effects
- Set Interventions (traps) that trigger on conditions

---

## Gameablauf - Schritt fuer Schritt

### 1) Setup

- 25-card deck per player (108 HP budget)
- Draw 5 cards to start
- Hand limit: 8 cards (engine constant HAND_LIMIT)

### 2) Round structure

Turns alternate until both players consecutively pass. Then influence is compared and the round ends; clear the board and begin a new round.

### 3) Your turn

- Start-of-turn AP reset: you always start with 2 AP.
- Every card play costs 1 AP by default.
- There is no per-turn action cap; you may play as long as you have AP and legal targets/slots.

Legal actions (each costs 1 AP unless otherwise stated):

- Play a Government card to the government row (max 5)
- Play a Public card to the public row (max 5)
- Play an Instant initiative
- Place an Ongoing initiative into the appropriate special slot (government/public)
- Set an Intervention (trap) face down
- Pass (0 AP)

### 4) Resolution order and queue

All effects go through a centralized event queue. Order:

1. Interventions (traps)
2. Instant initiatives
3. Passive/ongoing effects
4. Active abilities

Reference: `src/utils/queue.ts`.

---

## Card types in detail

### Government cards

- Politicians and heads of state; go to the government row (max 5); contribute influence as printed + buffs/debuffs.

### Public cards

- Media/business/civil society figures; go to the public row (max 5); provide support effects. Implemented examples: Mark Zuckerberg (+1 AP once per round after initiative), Ai Weiwei (+1 card and +1 AP when you activate an instant initiative), Jennifer Doudna/Anthony Fauci (+1 initiative influence bonus), Noam Chomsky (−1 initiative influence for the opponent).

### Initiatives (Instant)

- One-shot political actions; played for 1 AP and placed in the instant slot (board[player].sofort[0]). They remain there until activated by the player (click or press 'A'), then resolved via the queue and discarded. Examples include deactivation and targeted adjustments.

### Initiatives (Ongoing)

- Ongoing effects placed into government/public special slots; implemented examples: “Koalitionszwang” (Tier 2 +1 government influence), “Napoleon Komplex” (Tier 1 +1), “Zivilgesellschaft” (+1 if you have a Movement public card), “Milchglas Transparenz” (+1 if no NGO/Movement on your public row).

### Interventions

- Face-down traps that automatically trigger on conditions; deactivation and other effects are resolved through the queue.

---

## Keywords

### Leadership

- Concept tag; no passive AP discount in current baseline. Concrete active abilities may exist per card in future updates.

### Diplomat

- Concept tag; influence transfer is a rules concept. Concrete implementations should use the central queue and active ability system.

### **Oligarch**

- **Effect:** Beim Ausspielen ziehst du 1 Karte
- **Example:** Elon Musk → du ziehst 1 Karte

### **Plattform**

- **Effect:** Einmal pro Round bekommst du nach einer Initiative 1 Action Points (AP) zurueck
- **Example:** Mark Zuckerberg → nach Initiative 1 AP zurueck

### **Bewegung**

- **Effect:** Deine erste Government Cards pro Round kostet 0 Action Points (einmal pro Round)
- **Example:** Greta Thunberg → erste Government Cards kostenlos

### **NGO/Think-Tank**

- **Effect:** Deine naechste Initiative in diesem Zug kostet 1 Action Points (AP) weniger
- **Example:** Bill Gates → naechste Initiative ist billiger

---

## Game states

### Shield – Schutz

- Prevent the next negative effect once; then consume the shield.

### Deactivated – Deaktiviert

- Card remains in play, active effects are off until round end.

---

## Deckbuilding – building a good deck

### **Grundregeln**

- **Deck size:** 25 cards
- **Budget:** 108 HP total
- **Hand limit:** 8 cards

### Cost tiers

- Small: 1 HP; Medium: 2 HP; Large: 3–4 HP

### Deckbuilding strategies

#### Tempo

- Goal: maximize actions via initiative chains and AP regeneration.
- Cards: Tech public cards (e.g., Mark Zuckerberg), instant initiatives, Ai Weiwei.

#### Control

- Goal: disrupt opponent via interventions and deactivation.

#### Influence

- Goal: steady influence growth via ongoing initiatives (e.g., Koalitionszwang, Napoleon Komplex, Zivilgesellschaft, Milchglas Transparenz).

---

## Example turns (aligned with current engine)

### Example 1: Tech tempo

Player A – Turn 1 (2 AP):

1. Play Mark Zuckerberg (1 AP)
2. Play an instant initiative (1 AP) → initiative resolves; once per round, Mark gives +1 AP → A can continue if AP > 0

Player B – Turn 1 (2 AP):

1. Set a trap (1 AP)
2. Play a public or government card (1 AP)

### Example 2: Trap interaction

Player B sets traps; when A meets their conditions, they trigger first in the queue and resolve before A’s initiative effects.

### Example 3: Ongoing auras

Player A places “Koalitionszwang” (government slot). Tier 2 government cards now get +1 influence while it remains. “Napoleon Komplex” similarly affects Tier 1. “Zivilgesellschaft” adds +1 if a Movement public card is present. “Milchglas Transparenz” adds +1 if there is no NGO/Movement on A’s public row.

---

## Calculations

### Influence

Formula: influence = base + buffs − debuffs (temporary buffs/debuffs are tracked per card each round).

**Example 1:**

- Vladimir Putin (Power 10)
- "Spin Doctoring" (+2)
- "Koalitionszwang" (+1 fuer Tier 2)
- **Gesamt:** 10 + 2 + 1 = 13 Influence

**Example 2:**

- Justin Trudeau (Power 8)
- "Massenproteste" (-1)
- **Gesamt:** 8 - 1 = 7 Influence

### Action Points (AP)

Example:

- Start with 2 AP
- Play an instant initiative (−1 AP)
- Mark Zuckerberg triggers once per round after an initiative (+1 AP)
- Ai Weiwei active on your public row (+1 card and +1 AP when you activate an instant initiative)

---

## Synergien verstehen

### **Leadership + Plattform**

**Karten:** Justin Trudeau + Mark Zuckerberg
**Effect:**

1. Erste Initiative kostenlos
2. Zweite Initiative fuer 1 AP
3. 1 AP zurueck von Plattform
4. **Ergebnis:** 3 Aktionen aus 2 AP

### **Bewegung + Government Cards**

**Karten:** Greta Thunberg + jede Government Cards
**Effect:** Erste Government Cards kostenlos
**Ergebnis:** Schneller Aufbau von Influence

### **Oligarchen + Wirtschaftlicher Druck**

**Karten:** Elon Musk + "Wirtschaftlicher Druck"
**Effect:** Jedes Mal wenn du einen Oligarchen spielst, bekommt eine Government Cards +1 Influence
**Ergebnis:** Dauerhaft steigender Influence

---

## FAQ

### What happens on a tie?

If influence ties at round end, the player who passed first wins the round.

### Can I make more than 2 plays per turn?

Yes. There is no hard cap; plays are limited only by your AP and legal targets.

### What if my deck is empty?

You stop drawing but can keep playing.

### Can I discard from hand?

Only when an effect allows it.

### What happens to deactivated cards at round end?

Deactivation ends; cards are handled per the normal cleanup rules.

### Can I replace an ongoing initiative?

Yes. Playing a new ongoing initiative in a slot replaces the existing one.
