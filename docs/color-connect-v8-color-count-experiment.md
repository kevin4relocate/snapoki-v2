# Color Connect V8 — Hard Color Count Experiment

Date: 2026-08-16

Goal: compare 10, 11 and 12 color pairs on the same 12×12 Hard board while keeping the solver, weighted difficulty model and blocker count constant.

## Method

- Board: 12×12
- Blocked cells: 36
- Colors tested: 10 / 11 / 12
- Same 20 deterministic seed IDs per variant
- Neutral topology prefilter for all three variants so the existing 10-color-specific cheap gate would not bias the comparison
- Solver node limit: 8000 for all variants
- Candidate max: 40, shortlist: 6 for all variants
- Validity still required: solver-valid and unique candidate-model solution for Hard
- Weighted Difficulty Score unchanged

## Results

| Metric | 10 colors | 11 colors | 12 colors |
|---|---:|---:|---:|
| Valid samples | 20/20 | 20/20 | 20/20 |
| Difficulty mean | 86.0 | **91.4** | 90.5 |
| Difficulty P50 | 89.8 | **91.9** | 91.1 |
| Difficulty P75 | 92.1 | **93.1** | 92.9 |
| Difficulty P90 | 93.7 | **95.6** | 95.5 |
| Difficulty max | 95.5 | **98.4** | 96.3 |
| Avg backtracks | 44.0 | 46.2 | **58.7** |
| Avg dead ends | 36.2 | 34.7 | **42.8** |
| Avg decisions | 17.5 | 21.1 | **25.2** |
| Avg greedy traps | 9.6 | 9.9 | **10.0** |
| Avg tempting routes | 1.8 | **2.4** | 2.3 |
| Avg shortcut victims | 2.0 | **2.7** | 2.6 |
| Avg route length | 10.8 | 9.8 | 9.0 |
| Avg shortest route | 6.6 | 6.3 | 6.3 |
| Avg longest route | 17.8 | 15.2 | 14.6 |
| Mean generation ms | 284.9 | 371.5 | **277.2** |
| P90 generation ms | 370.7 | 522.9 | **314.6** |

## Interpretation

Adding colors does increase solver-observed difficulty.

### 11 colors

11 colors produced the highest overall weighted difficulty distribution. It increased decisions, greedy traps, tempting routes and shortcut-victim interactions while keeping route length reasonably healthy. This looks like the best balance between logical difficulty and readability.

### 12 colors

12 colors forced the most backtracking, dead ends and decisions. It is the strongest raw search-pressure configuration, but average route length dropped to 9 cells. That increases the risk that the board becomes visually busy while individual routes become too short. The weighted score was slightly below 11 colors despite the higher raw search effort.

## Recommendation

Use **11 colors as the leading candidate for production Hard**.

Before changing production permanently:

1. Calibrate a production-quality 11-color topology gate rather than reusing the old 10-color gate.
2. Run a larger 11-color holdout batch.
3. Visually review several 11-color boards for color distinguishability and route readability.
4. Keep 12 colors as a possible Expert/variant configuration rather than the default Hard level.

The experiment itself did not modify the production Color Connect configuration.
