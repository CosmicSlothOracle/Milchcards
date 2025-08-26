# Public Cards

> Canonical, code-aligned. AP=1 per play, AP start=2, no cap. Effects via FIFO queue; registry handlers only enqueue.

| id | name | type | tags | hpCost | effectKey | status |
|---|---|---|---|---:|---|---|
| public.elon | Elon Musk | public | Tech,Media | 6 | public.elon.draw_ap | implemented |
| public.zuck | Mark Zuckerberg | public | Tech,Platform | 7 | public.zuck.once_ap_on_activation | implemented |
| public.doudna | Jennifer Doudna | public | Science | 5 | public.doudna.aura_science | implemented |
| public.fauci | Anthony Fauci | public | Health | 5 | public.fauci.aura_health | implemented |
| public.chomsky | Noam Chomsky | public | Academia | 5 | public.chomsky.aura_military_penalty | implemented |
| public.aiweiwei | Ai Weiwei | public | Art,Activist | 6 | public.aiweiwei.on_activate_draw_ap | implemented |
| public.gretha | Greta Thunberg | public | Movement,Climate | 5 | public.gretha.aura_climate | pending |
| public.malala | Malala Yousafzai | public | Movement,Education | 5 | public.malala.aura_education | pending |
## Effect notes (concise)

- **public.elon.draw_ap** → onPlay: `DRAW_CARDS +1`, `ADD_AP +1`.
- **public.zuck.once_ap_on_activation** → SoT: `zuckOnceAp=true`; on `INITIATIVE_ACTIVATED`: `ADD_AP +1` once/turn.
- **public.doudna.aura_science** → SoT: `auraScience += 1` (used by initiative auras where relevant).
- **public.fauci.aura_health** → SoT: `auraHealth += 1`.
- **public.chomsky.aura_military_penalty** → SoT: `auraMilitaryPenalty += 1` (applies as penalty where effects reference it).
- **public.aiweiwei.on_activate_draw_ap** → SoT: `aiWeiweiOnActivate=true`; on `INITIATIVE_ACTIVATED`: `DRAW_CARDS +1`, `ADD_AP +1`.
- **public.gretha.aura_climate** → placeholder (keine Engine-Nutzung aktuell).
- **public.malala.aura_education** → placeholder.
