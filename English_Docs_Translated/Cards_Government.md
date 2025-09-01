# Government Cards

> Canonical, code-aligned. AP=1 per play, AP start=2, no cap. Effects via FIFO queue; registry handlers only enqueue.

| id              | name                 | type       | tags             | hpCost | effectKey | status      |
| --------------- | -------------------- | ---------- | ---------------- | -----: | --------- | ----------- |
| gov.putin       | Vladimir Putin       | government | Politician,Tier2 |     17 |           | implemented |
| gov.vonderleyen | Ursula von der Leyen | government | Politician,EU    |     12 |           | implemented |
| gov.biden       | Joe Biden            | government | Politician,US    |     14 |           | implemented |
| gov.xi          | Xi Jinping           | government | Politician,CN    |     16 |           | implemented |
| gov.scholz      | Olaf Scholz          | government | Politician,DE    |     12 |           | implemented |

## Notes

- Government cards usually have no `effectKey`; they hold influence and receive buffs/deactivations.
