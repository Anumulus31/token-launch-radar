# Token Radar — BUILD LOG

Competition: **make.fun/bounty/token-radar-01** — "Build the best token launch radar".
Prize: $1,325 USDC escrowed (1st $1,000, 2nd–5th $50, 6th–10th $25). No entry fee.
Entries close **2026-12-14 17:00 WIB**; result due 2026-12-28.
Built 2026-11-19 by Muse (subagent) for @anumulus31. **Not pushed, not submitted, no bundle created.**

## How to run

```sh
cd entry
node main.ts --input ../token-radar-01-kit/input/snapshot.json   # MAKEFUN_OUTPUT_DIR or --output sets /output
```

Node 22, stdlib only, no network. Reads `/input/snapshot.json`, writes to `/output/`:
`board.json`, `data.js` (dashboard data beside the page), `dashboard/` (index.html + app.css + app.js),
`screenshots/` (copies of `entry/screenshots/`), `dossier.json` (built last, via `buildDossier`).
Runtime ~0.5 s per run (limit 120 s).

## Value model — radar-2 (lib/model.ts, my own)

Implied value follows from the snapshot's own figures only — TVL, 7-day growth, age with no token,
chain breadth — never from a hardcoded list of names.

```
multiple(category) = clamp( shrink( median live mcap/TVL in category, global median 0.1689, k=20 ), 0.05, 0.50 )
                     # per-category median winsorized at 2.0; categories with no live comps take the global median
implied_value_usd  = round( TVL × multiple
                            × (1 + clamp(change_7d, −50, +100)/100 × 0.5)   # growth multiplier
                            × (0.70 + 0.30 × min(age_days, 1460)/1460)      # maturity multiplier (unknown age = 365d)
                            × (1 + 0.02 × (min(chains, 5) − 1)) )          # breadth multiplier
```

Calibration is computed from the snapshot's own live market at build time (per-category median
mcap/TVL, live-comp counts, winsorization) and is printed in the dashboard's model panel, so the
judge can see exactly where every multiple comes from.

**Board coverage — launch candidates only.** The watchlist exclusion rules are extended to the
whole board: category Bridge / Canonical Bridge / Liquid Staking / Liquid Restaking / Restaked BTC /
CEX, whole-word wrapped / staked / staking in the name, an exchange-name prefix, a version marker.
The starter's weaker rule (CEX + versioned only) ranked WBTC, coinbase-bridge and
binance-staked-eth at the top — wrapped/staked products of tokens that already trade, not launches.
Excluded products are shown in a "Set aside" dashboard tab with the reason each was left out;
live-token protocols are shown apart with their market caps (top 24 by mcap).

**Farm plans** (7 steps per row, 3–12 allowed, each 20–600 chars): generated from the same rules in
`lib/model.ts` (board.json) and re-derived in `dashboard/app.js` (detail view) — the page
recomputes the implied value and re-derives the steps from the row's own figures, and the detail
view shows both next to each other. Steps are concrete: fresh wallet + seed offline, a deposit
amount sized to the protocol's TVL tier, the chain to use, a weekly check, a hold period, and
claiming only from the protocol's own published link. Each step states its cost and time.

## Board stats (snapshot as_of 2026-11-14; 758 protocols, 40 watchlist)

- **198 rows** — 40 watchlist + 158 early candidates below the $50M floor. All 40 watchlist slugs covered.
- Sum implied value **$3,721,985,964**; median $3.49M; min $571,926; max $611,411,719.
- 144 pre-token protocols set aside (128 by category, 20 by wrapped word, 14 by exchange prefix,
  11 by version marker — overlaps); 24 live-token protocols set aside with market caps.
- Farm steps: **1,386 total, exactly 7 per row**, all 20–600 chars, trimmed.
- No ties in implied value.

Top 10 by implied value:

| Rank | Protocol | Implied value | TVL | Category |
| ---: | --- | ---: | ---: | --- |
| 1 | Steakhouse Financial | $611,411,719 | $2,753,981,495 | Risk Curators |
| 2 | Sentora Curator | $593,561,470 | $2,757,585,593 | Risk Curators |
| 3 | Gauntlet | $364,141,989 | $1,577,685,462 | Risk Curators |
| 4 | Veda | $198,246,786 | $1,563,415,482 | Onchain Capital Allocator |
| 5 | USDD | $150,955,026 | $1,055,793,606 | CDP |
| 6 | Nonce Capital | $90,554,501 | $513,783,671 | Risk Curators |
| 7 | Polymarket International | $81,558,034 | $320,193,439 | Prediction Market |
| 8 | Upshift | $70,094,073 | $499,083,733 | Onchain Capital Allocator |
| 9 | RockawayX | $59,735,863 | $292,506,628 | Risk Curators |
| 10 | Bittensor dTAO | $59,646,679 | $376,026,255 | Dexs |

Ranks 11–20: OnRe $49.9M, Hyperithm $48.7M, BitFi Basis $47.3M, K3 Capital $44.6M,
Hive Protocol $43.0M, OpenTrade $42.5M, Plume Vaults $38.8M, CIAN Yield Layer $38.2M,
Symbiotic $35.6M, Defi Saver Asset Management $34.6M.
Board categories (top): Risk Curators 34, Dexs 21, Onchain Capital Allocator 18, RWA 16,
Lending 16, Yield 15, Derivatives 13.

## Files (all authored in this session except the house library + LICENSE)

| File | Bytes | Note |
| --- | ---: | --- |
| `main.ts` | 4,808 | own code; same output shape as the starter |
| `lib/model.ts` | 28,413 | own model + farm-step generator + snapshot parsing |
| `dashboard/index.html` | 448 | own |
| `dashboard/app.css` | 9,157 | own; dark console theme |
| `dashboard/app.js` | 27,951 | own rendering: search/category/chain filters, tabs, sortable columns, detail dialog, hash routing |
| `vendor/makefun-board.ts` | 19,788 | house library, copied verbatim (buildDossier) |
| `LICENSE` | 1,104 | MIT, copied from starter |
| `screenshots/1-board.png` | 172,433 | 1440×900 — the board |
| `screenshots/2-detail.png` | 197,470 | 1440×1000 — Steakhouse Financial detail (rank 1) |
| `screenshots/3-filtered.png` | 158,583 | 1440×900 — category filter RWA (16 rows) |

Dashboard source total **37,556 bytes** (cap 64 KB for the dossier text). Dashboard: 3 files, ≤400 files /
4 MiB cap. No `http://` or `https://` anywhere in dashboard files (grep-verified).

## Validation — all passed (2026-11-19, final run pair /tmp/radar-runA + /tmp/radar-runB)

1. **Determinism:** `main.ts` run twice into two output dirs; `diff -r` — **byte-identical** (board.json,
   data.js, dashboard, screenshots, dossier.json).
2. **board.json rules:** 198 rows; ranks 1..198 exactly once each; implied values non-increasing
   with rank; all 198 implied values distinct; all 40 watchlist slugs covered; 158 rows outside the
   watchlist (≥60 required); farm steps 3–12 per row (7 each), every step 20–600 chars, trimmed.
3. **dossier.json:** fresh `buildDossier('/tmp/radar-runA', {text_max_bytes: 65536, screenshots:
   {max: 4, max_bytes: 524288}, dashboard: {max_files: 400, max_bytes: 4194304}})` — the exact
   options main.ts uses — is **byte-identical** to the on-disk dossier.json (743,927 bytes,
   schema `makefun/dossier/v1`, cover 0, 3 images, text 37,820 bytes < 65,536 cap).
   (Note: buildDossier returns a Uint8Array, not a string — compare as bytes, not `===` to a string.
   Also note the first verification attempt used only `{text_max_bytes}` and mismatched, because the
   caps are part of what the dossier records.)
4. **Page vs board agreement** (`check-page.mjs` in the workspace root — runs app.js + data.js in a
   Node DOM stub, clicks rows, compares dialog steps to board.json): **OK for 5 diverse rows** —
   steakhouse-financial (rank 1, Risk Curators), figure-markets-prime (rank 26, Lending),
   bittensor-dtao (rank 10, Dexs), onre (rank 11, RWA), defi-saver-asset-management (rank 20,
   null `listed_at` age). All 7 steps match board.json exactly; recomputed implied value agrees.
   (The page HTML-escapes apostrophes as `&#39;` — the harness decodes entities before comparing.)
5. **Screenshots:** all 3 PNGs within caps — long side ≤1440, short side ≥800, each ≤512 KiB
   (172 / 197 / 159 KB). All three **viewed**: board renders clean (header, stats 40/40 · 198 ·
   158 · $3.72B, filters, ranked table with watchlist badges + value bars); detail dialog opens
   from `#p=steakhouse-financial` with the full model breakdown, recomputed $611.4M, and the farm
   plan with costs/times; filtered view `#category=RWA` shows 16 RWA rows. One fix made after the
   first screenshots: the search placeholder was truncated at 260px, shortened to
   "Search name, category or chain"; all three shots were re-captured after the fix.
6. **Kit grade-local:** `node cli/makefun.mjs grade-local --kit . --bot entry --driver process`
   refuses this competition: *"token-radar-01 is a program/v1 competition: its scorer and
   reference data are not published in the kit, so the house grades it from its competition
   directory"*. No local grade is possible; the server grades every entry.
7. **Kit `check`:** the pre-submit check needs a GitHub repo + transcript bundle
   (`--repo <repo> --transcripts transcripts.tar.gz`) — not run, because pushing / bundling /
   submitting are explicitly out of scope for this build task; run it at submit time.

## Screenshots — environment notes

- `/opt/meta-chromium/chrome` refuses to start here ("Hatch WebGL domain policy is required for
  browser startup"). No system chromium/firefox; no Playwright cache; no PIL/ImageMagick initially.
- `npx playwright install chromium` **failed twice**: the Playwright CDN download fails
  (`Download failure, code=1`; direct curl to the azureedge URL returns 400 GatewayExceptionResponse).
- Working path: **Chrome for Testing 159.0.8154.6** from
  `https://storage.googleapis.com/chrome-for-testing-public/159.0.8154.6/linux64/chrome-linux64.zip`
  (209 MB, downloaded fine at ~2.6 MB/s), installed at `~/.cache/chrome-ct/chrome-linux64/chrome`.
  Headless `--screenshot` works with `--headless=new --disable-gpu --no-sandbox
  --disable-dev-shm-usage --hide-scrollbars --virtual-time-budget=3000`.
- **`/tmp` is a 512 MB tmpfs and filled up** during the first unzip (200 MB zip + 175 MB partial
  extract + 135 MB Playwright remnant = 100%). Browsers must be extracted under home, not /tmp.
  The zip and partial extracts were cleaned; /tmp is back to ~40%.

## What remains before submit (not done here, per instructions)

1. Create the public GitHub repo (Anumulus31) and push `entry/` via the connector's push-files
   (approval card, ~30 min expiry — same pattern as the GTA entry).
2. Add the README with the competition's three make.fun badges + bounty link, and set the repo
   About (website = bounty page, topics `makefun, ai-agents, bounties, forecasting`-style per
   requirements `how_to_submit`).
3. Bundle transcripts with the kit CLI (`node cli/makefun.mjs bundle ...`), run
   `node cli/makefun.mjs check --kit . --repo <repo> --transcripts transcripts.tar.gz`, fix any
   gate failure, then `submit`.
4. Transcript-gate note: main.ts + dashboard files were written in this session via write/edit
   tools (multiple assistant messages), so the gate's authored-code checks should see them.
   Vendor file is the house library, used as the starter does.
