# Initiatives — Instant

> Canonical, code-aligned. AP=1 per play, AP start=2, no cap. Effects via FIFO queue; registry handlers only enqueue.

| id | name | type | tags | hpCost | effectKey | status |
|---|---|---|---|---:|---|---|
| init.shadow_lobbying | Shadow Lobbying | initiative | Instant,Influence | 4 | init.shadow_lobbying.buff2 | implemented |
| init.digital_campaign | Digitaler Wahlkampf | initiative | Instant,Media | 4 | init.digital_campaign.draw2 | implemented |
| init.spin_doctor | Spin Doctor | initiative | Instant,Buff | 4 | init.spin_doctor.buff_strongest_gov2 | implemented |
| init.surprise_funding | Surprise Funding | initiative | Instant,AP | 3 | init.surprise_funding.ap2 | implemented |
| init.clandestine_alliance | Clandestine Alliance | initiative | Instant,Buff | 4 | init.clandestine_alliance.buff_all_gov1 | pending |
| init.cyber_psyops | Cyber PsyOps | initiative | Instant,Deactivate | 5 | init.cyber_psyops.deactivate_random_opponent | pending |
| init.grassroots_blitz | Grassroots Blitz | initiative | Instant,Draw | 3 | init.grassroots_blitz.draw1_buff1 | pending |
| init.strategic_leaks | Strategic Leaks | initiative | Instant,Hand | 4 | init.strategic_leaks.opp_discard1 | pending |
| init.emergency_legislation | Emergency Legislation | initiative | Instant,Shield | 4 | init.emergency_legislation.grant_shield1 | pending |
| init.ai_narrative | AI Narrative Control | initiative | Instant,Media | 4 | init.ai_narrative.deactivate_public1 | pending |
## Effect notes

- **init.shadow_lobbying.buff2** → onPlay: `BUFF_STRONGEST_GOV +2`, enqueue `INITIATIVE_ACTIVATED`.
- **init.digital_campaign.draw2** → onPlay: `DRAW_CARDS +2`, enqueue `INITIATIVE_ACTIVATED`.
- **init.spin_doctor.buff_strongest_gov2** → onPlay: `BUFF_STRONGEST_GOV +2`, enqueue `INITIATIVE_ACTIVATED`.
- **init.surprise_funding.ap2** → onPlay: `ADD_AP +2`, enqueue `INITIATIVE_ACTIVATED`.
- **…pending** → Platzhalter-Events gemäß Tags (Deactivate/Shield/Hand/Draw).
