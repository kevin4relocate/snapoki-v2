# Color Connect V8 — Holdout H1

Independent holdout run using seed family `color-v8-holdout-h1`, separate from Calibration Batch 1.

## Dataset

- Medium: 100 requested, 100 solver-valid selected boards.
- Hard: 200 requested, 189 solver-valid selected boards.
- Hard topology rejects: 11 (5.5%).
- Solver rejects after topology: 0.
- Candidate-model uniqueness among selected boards: 100% for both Medium and Hard.
- No production difficulty threshold was used to collect or select the samples.

## Distribution stability

| Metric | Batch 1 Medium | Holdout Medium | Batch 1 Hard | Holdout Hard |
|---|---:|---:|---:|---:|
| Mean | 60.4 | 59.7 | 81.6 | 80.8 |
| P25 | 48.4 | 49.7 | 77.9 | 72.7 |
| P50 | 59.6 | 57.8 | 84.6 | 84.5 |
| P75 | 71.9 | 70.2 | 89.7 | 89.8 |
| P90 | 77.1 | 75.4 | 92.7 | 92.7 |
| P95 | 78.1 | 77.1 | 93.5 | 95.5 |
| Max | 80.8 | 80.8 | 98.2 | 99.2 |

The center and upper tail are highly stable. Hard P50 changed by only -0.1, Hard P75 by +0.1, and Hard P90 did not move.

## Reference cutoff stability

These are still evaluation cutoffs, not a locked production threshold.

| Cutoff | Batch 1 Medium | Holdout Medium | Batch 1 Hard | Holdout Hard |
|---|---:|---:|---:|---:|
| 70 | 31.7% | 26.0% | 82.7% | 76.2% |
| 75 | 18.3% | 12.0% | 78.6% | 72.0% |
| 80 | 1.7% | 1.0% | 68.4% | 63.0% |
| 85 | 0% | 0% | 48.0% | 49.2% |
| 90 | 0% | 0% | 18.4% | 20.1% |

The strongest finding is the stability around **85**: no Medium sample reached 85 in either dataset, while about half of Hard samples did (48.0% in Batch 1 and 49.2% in Holdout H1).

## Holdout Hard solver behavior

- Backtracks: P50 31, P75 41, P90 52.2, mean 33.2.
- Greedy traps: P50 9, P75 10, mean 9.2.
- Dead ends: P50 26, P75 34, P90 42, mean 28.0.
- Decisions: P50 14, P75 17, P90 19, mean 14.3.
- Tempting routes: P50 2, P75 2, P90 3, mean 1.8.
- Shortcut victim pairs: P50 2, P75 3, P90 3, mean 2.1.

## Human review seed set

These are deterministic Hard seeds selected near the middle of each score band.

### 75–80

- `color-v8-holdout-h1:hard:0097` — 77.5 — 9 greedy traps, 23 backtracks, 19 dead ends, 13 decisions, 2 tempting routes, 3 shortcut victims.
- `color-v8-holdout-h1:hard:0159` — 77.3 — 9 greedy traps, 24 backtracks, 21 dead ends, 12 decisions, 2 tempting routes, 2 shortcut victims.
- `color-v8-holdout-h1:hard:0070` — 77.3 — 9 greedy traps, 21 backtracks, 21 dead ends, 9 decisions, 4 tempting routes, 6 shortcut victims.

### 80–85

- `color-v8-holdout-h1:hard:0015` — 82.4 — 9 greedy traps, 29 backtracks, 21 dead ends, 17 decisions, 1 tempting route, 1 shortcut victim.
- `color-v8-holdout-h1:hard:0050` — 82.4 — 8 greedy traps, 29 backtracks, 26 dead ends, 11 decisions, 3 tempting routes, 3 shortcut victims.
- `color-v8-holdout-h1:hard:0127` — 82.7 — 9 greedy traps, 29 backtracks, 24 dead ends, 15 decisions, 1 tempting route, 1 shortcut victim.

### 85–90

- `color-v8-holdout-h1:hard:0087` — 87.5 — 10 greedy traps, 32 backtracks, 29 dead ends, 13 decisions, 1 tempting route, 2 shortcut victims.
- `color-v8-holdout-h1:hard:0101` — 87.5 — 8 greedy traps, 49 backtracks, 39 dead ends, 19 decisions, 2 tempting routes, 3 shortcut victims.
- `color-v8-holdout-h1:hard:0190` — 87.6 — 9 greedy traps, 30 backtracks, 27 dead ends, 12 decisions, 3 tempting routes, 3 shortcut victims.

### 90+

- `color-v8-holdout-h1:hard:0161` — 93.0 — 10 greedy traps, 28 backtracks, 26 dead ends, 12 decisions, 4 tempting routes, 6 shortcut victims.
- `color-v8-holdout-h1:hard:0008` — 92.7 — 10 greedy traps, 48 backtracks, 39 dead ends, 19 decisions, 2 tempting routes, 2 shortcut victims.
- `color-v8-holdout-h1:hard:0194` — 92.7 — 10 greedy traps, 48 backtracks, 38 dead ends, 20 decisions, 2 tempting routes, 2 shortcut victims.

## Current conclusion

The score model generalizes well to an independent seed family. The most defensible **provisional Hard threshold is 85** because it has shown zero Medium leakage across 160 Medium samples while retaining roughly half of Hard candidates in two independent runs.

Do not lock the production threshold solely from solver statistics yet. Use the review seeds above to validate the subjective difference between the 80–85 and 85–90 bands. If that boundary is visible in play, `85` is the leading final threshold. If the difference is weak, inspect the score composition and adjust weights before changing production acceptance.
