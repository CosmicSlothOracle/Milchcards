# Interventions (Traps)

> Canonical, code-aligned. AP=1 per play, AP start=2, no cap. Effects via FIFO queue; registry handlers only enqueue.

| id | name | type | tags | hpCost | effectKey | status |
|---|---|---|---|---:|---|---|
| trap.fake_news | Fake News Campaign | intervention | Trap,Media | 4 | trap.fake_news.deactivate_media | implemented |
| trap.whistleblower | Whistleblower | intervention | Trap,Hand | 4 | trap.whistleblower.return_to_hand_on_play | pending |
| trap.data_breach | Data Breach Exposure | intervention | Trap,Discard | 4 | trap.data_breach.opp_discard2 | pending |
| trap.legal_injunction | Legal Injunction | intervention | Trap,Cancel | 5 | trap.legal_injunction.cancel_initiative | pending |
| trap.media_blackout | Media Blackout | intervention | Trap,Deactivate | 5 | trap.media_blackout.deactivate_public | pending |
| trap.counterintel | Counterintelligence Sting | intervention | Trap,Reveal | 5 | trap.counterintel.reveal_hand | pending |
| trap.public_scandal | Public Scandal | intervention | Trap,Influence | 4 | trap.public_scandal.adjust_influence-2 | pending |
| trap.budget_freeze | Budget Freeze | intervention | Trap,AP | 5 | trap.budget_freeze.ap-2_on_play | pending |
| trap.sabotage | Sabotage Operation | intervention | Trap,Deactivate | 5 | trap.sabotage.deactivate_gov | pending |
## Triggers & effects

- **trap.fake_news.deactivate_media** → trigger: when opponent plays a `Media`/`Platform` card → `DEACTIVATE_CARD target`.

- Weitere Trap-Trigger sind als Platzhalter markiert; sie enqueuen die beschriebenen Events.
