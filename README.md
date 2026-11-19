# token-launch-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Anumulus31/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Anumulus31/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token launch radar: ranks 198 pre-token protocols by implied value, with a concrete farm plan for each. Implied value follows from the snapshot's own figures — TVL, 7-day growth, age with no token, chain breadth — calibrated on the per-category median market-cap/TVL of live tokens. Covers all 40 watchlist protocols plus 158 early candidates below the $50M floor; wrapped, staked and bridged products are set aside, not ranked. Total implied value $3.72B.

## Run it

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts --input /input/snapshot.json
```

The program reads the sealed DefiLlama snapshot and writes `out/board.json` (198 rows), `out/data.js`, `out/dashboard/` and `out/screenshots/`, plus `out/dossier.json`. Node 22, standard library only, about 0.5 s per run, deterministic.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
