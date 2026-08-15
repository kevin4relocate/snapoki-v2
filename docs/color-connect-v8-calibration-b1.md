# Color Connect V8 — Calibration Batch 1

Generated from `scripts/calibrate-color-v8.mjs` using score model v1.

## Dataset

- Medium: 60 requested, 60 valid selected boards.
- Hard: 100 requested, 98 valid selected boards; 2 seeds had no candidate pass the cheap topology filter.
- Solver-valid means at least one full-cover candidate-model solution and no solver abort.
- No production Hard difficulty threshold was used to collect this dataset.

## Weighted score model (0–100)

- Backtracks: max 25 points, capped at 30.
- Greedy traps: max 30 points, capped at 10.
- Dead ends: max 12 points, capped at 30.
- Decisions: max 15 points, capped at 16.
- Tempting routes: max 8 points, capped at 4.
- Shortcut victim pairs: max 5 points, capped at 6.
- Synergy: max 5 points.

## Distribution

| Difficulty | Min | P10 | P25 | P50 | P75 | P90 | P95 | Max | Mean |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Medium | 39.7 | 45.2 | 48.4 | 59.6 | 71.9 | 77.1 | 78.1 | 80.8 | 60.4 |
| Hard | 48.2 | 64.0 | 77.9 | 84.6 | 89.7 | 92.7 | 93.5 | 98.2 | 81.6 |

### Score bands

Medium:
- <50: 20
- 50–59: 10
- 60–69: 11
- 70–79: 18
- 80–89: 1
- 90+: 0

Hard:
- <50: 2
- 50–59: 3
- 60–69: 12
- 70–79: 14
- 80–89: 49
- 90+: 18

### Reference cutoff pass rates (not production thresholds)

| Cutoff | Medium | Hard |
|---|---:|---:|
| 70 | 31.7% | 82.7% |
| 75 | 18.3% | 78.6% |
| 80 | 1.7% | 68.4% |
| 85 | 0% | 48.0% |
| 90 | 0% | 18.4% |

## Hard solver behavior

- Backtracks: P50 33, P75 44, P90 56.9, mean 35.1.
- Greedy traps: P50 9, P75 10, mean 9.0.
- Dead ends: P50 27.5, P75 36.8, mean 29.3.
- Decisions: P50 15, P75 17, mean 14.8.
- Tempting routes: P50 2, P75 3, mean 1.9.
- Shortcut victim pairs: P50 2, P75 3, mean 2.2.
- Candidate-model uniqueness: 100% of selected Hard samples.

## Initial interpretation

The first batch shows useful separation between Medium and Hard. A score near 80 is already above almost the entire Medium distribution, while 85 selects roughly the upper half of Hard samples and 90 selects roughly the top fifth. This is evidence for a high-precision Hard threshold in the 85–90 review band, but no production threshold should be locked from Batch 1 alone.

Next calibration step: run a separate holdout seed family, inspect boards around score bands 75–80, 80–85, 85–90 and 90+, then choose the final Hard threshold based on both distribution stability and human play review.
