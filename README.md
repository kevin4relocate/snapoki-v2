# Snapoki V2

Snapoki is a browser puzzle platform with seven current games and a registry-first architecture designed to scale toward a much larger game library without duplicating the surrounding product stack.

## Current games

- Echo Step
- Maze
- Number Path
- Color Connect
- Lights Out
- Loop Puzzle
- Bridges

Every game reuses the same site shell, account system, difficulty rail, Regular Play / Daily Challenge lifecycle, board-status area, How to Play card, result modal, Rankings, profile and Daily progress UI. A game plugin owns only its mechanic, deterministic generation, rendering, hint/practice behavior, social-board renderer and compact completion proof.

## Core product rules

- **Guest play is free and local.** Guest finishes never write account data.
- **Regular Play owns Rankings.** Each account has one personal-best ranking record per game. Repeating a game does not farm cumulative Ranking Points.
- **Overall / Easy / Medium / Hard use the same row.** Easy ×1, Medium ×3 and Hard ×5 remain performance multipliers; the strongest Regular Play PB becomes Overall.
- **Progression grows with verified completions.** Completion counters and XP are updated in the same bounded user/game row. Level is derived from XP.
- **Daily Challenge is streak-only.** Daily does not affect the leaderboard. Only today's Easy/Medium/Hard completion mask, current streak and longest streak are retained.
- **Hints are limited guidance.** Regular Play hints reduce the performance score; a full Solution / Guide makes the current board practice-only.
- **Shared behavior stays shared.** New games must not create a second header, account flow, ranking UI, Daily shell, result modal, sitemap process, generic How to Play component or Content Desk branch.

## Architecture

Canonical registries:

- `src/js/games-config.js` — game ids, slugs, navigation metadata, difficulty, metrics, capabilities, SEO and baseline rules.
- `src/js/game-presentation.js` — optional presentation overrides and game-specific CSS registration.
- `functions/_lib/scoring.js` → `RESULT_VERIFIERS` — one mechanic-specific proof verifier per registered game.

Shared runtime:

- `src/js/site.js` — navigation and optional Google account UI.
- `src/js/game-page.js` — shared game lifecycle, verification, PB Rankings, progression, Daily streaks and Profile.
- `src/js/game-status.js` — shared board feedback/progress.
- `src/js/games/<slug>.js` — stable public game entries. Each exports `createGame()` plus `generate<PascalCaseSlug>()`.

Server state helpers:

- `functions/_lib/progression.js` — Daily bitmask, PB comparison, XP/Level and ranking-board field contracts.
- `functions/_lib/player-stats.js` — bounded profile payloads and indexed leaderboard reads.
- `functions/api/results.js` — verifies a completion and updates the bounded user/game state; it no longer appends immutable gameplay history.

Content Desk remains plugin-driven through `src/js/social-game-board.js`, `src/js/social-renderers/<slug>.js`, `functions/_lib/social-content.js` and `CONTENT_DESK_PLUGIN_CONTRACT.md`.

## D1 Free-Tier Scalability V1

The durable gameplay model is intentionally bounded:

```text
users
└── 1 row / account

user_game_stats
└── 1 row / user / game
    ├── Overall ranking PB
    ├── Easy / Medium / Hard PB
    ├── verified completion counters
    ├── XP (Level derived at read time)
    └── today's Daily mask + streak

ranked_attempts
└── 1 temporary slot / user / game / difficulty / mode

sessions
└── temporary account sessions

results
└── legacy read-only archive after migration 0005
```

A player can complete the same game ten times or one million times without creating new durable gameplay rows. `user_game_stats` updates in place. `ranked_attempts` is also bounded by a unique slot, so starting puzzles does not create unbounded attempt history.

The legacy `results` table is deliberately retained by migration `0005_free_tier_scalability.sql` for rollback/audit. Runtime APIs stop reading and writing it. Once the new model has been observed safely in production, a later migration may remove that archive.

### Ranking

Regular Play calculates a verified performance score using the existing difficulty multiplier contract. A PB is replaced only when the new performance is better by:

1. ranking score
2. raw verified game score
3. lower verified time

Leaderboard boards:

```text
Overall | Easy | Medium | Hard
```

Overall uses the strongest PB across difficulties. Daily Challenge never changes any ranking PB.

### Daily streak

Daily state is a 3-bit mask:

```text
Easy   = 1
Medium = 2
Hard   = 4
3/3    = 7
```

The row stores only today's mask, today’s practice-blocked mask, current streak, longest streak and last completed UTC date. Historical Daily rows are not appended.

## Cloudflare D1 migrations

Database configuration lives in `wrangler.toml`. Runtime Functions never create or alter tables.

```text
0001_initial.sql
0002_ranked_attempts.sql
0003_scalable_game_ids.sql
0004_admin_social_content.sql
0005_free_tier_scalability.sql
```

Apply pending migrations when deployment is approved:

```bash
npx wrangler d1 migrations apply snapoki-v2-db --remote
```

**Do not apply migration 0005 to production merely to review the GitHub preview code.** The production migration is a separate release decision.

## Local validation

```bash
npm run check
npm run build
npm test
```

`npm run check` syntax-checks runtime, Functions, scripts and tests, then runs the Content Desk plugin audit. `npm run build` performs the generated-site pipeline and final platform audit. Generated public output is written to `dist/` and should not be hand-edited.

## Adding a game

Required:

1. Add the game to `src/js/games-config.js`.
2. Add `src/js/games/<slug>.js` exporting `createGame()` and `generate<PascalCaseSlug>()`.
3. Add `src/js/social-renderers/<slug>.js` exporting `drawSocialBoard()`.
4. Add its proof verifier to `RESULT_VERIFIERS` in `functions/_lib/scoring.js`.
5. Add mechanic-specific generator/gameplay/verifier tests.
6. Run check, build and tests.

A normal new game must not require editing the header, footer, account flow, generic Ranking/Profile/Daily UI, Content Desk core, sitemap process or other game plugins.

## Core API

```text
GET  /api/config
GET  /api/me
POST /api/auth/google
POST /api/logout
POST /api/runs/start
POST /api/runs/reveal
POST /api/results
GET  /api/rankings?game=maze&board=overall
GET  /api/profile?game=maze
```

A signed-in verified puzzle receives a server-issued `run_id`, seed and server start time. The server regenerates the expected puzzle and validates the completion proof before calculating authoritative time/score. Regular Play may update PB Ranking state; Daily may update only Daily/progression state.

## Cloudflare Pages

Expected project configuration:

```text
Production branch: main
Build command: npm run build
Build output directory: dist
```

Production deployment remains a separate manual decision from GitHub validation.

## Google sign-in

Set:

```text
GOOGLE_CLIENT_ID=<Google OAuth Web Client ID>
```

Sessions use a random token in a Secure, HttpOnly, SameSite cookie; D1 stores only its SHA-256 hash.
