# Snapoki V2 Architecture

## Runtime ownership

### Game Registry
`src/js/games-config.js` is the canonical registry for game ids, slugs, featured navigation, categories, difficulty labels and SEO/game copy. Server validation imports the same registry through `functions/_lib/games.js` so adding a game does not require maintaining a second hard-coded game-id list.

### Static site shell
`scripts/build.mjs` owns the common page structure. Header and Footer are emitted at build time from one template. `scripts/enrich-content.mjs` adds useful guide/policy pages and the expanded shared footer. `scripts/post-build-platform.mjs` performs final shared asset wiring.

### Site runtime
`src/js/site.js` owns only:
- desktop Games dropdown and automatic search when the overflow list grows
- mobile navigation drawer
- fixed-width account slot
- Login modal
- lazy Google Identity Services loading
- shared auth readiness state
- logout

### Game platform
`src/js/game-page.js` owns:
- Difficulty and Regular/Daily mode
- New Puzzle / Reset / Hint / Solution / Undo
- account-aware run lifecycle and timer
- server-issued ranked attempts
- shared Result modal
- account-backed Daily Challenge progress/countdown
- verified result submission
- Rankings
- Your profile
- Daily level scrolling back to the board

### Game engines
`src/js/games/*.js` own game generation, rules, interaction, rendering and compact completion proof. They do not own accounts, D1, ranking queries, navigation or page templates.

## Game engine contract

A controller returned by `createGame()` may expose:

```text
reset()
hint()
solution()
hideSolution()
undo()          optional
previewScore()
getResult()
destroy()
supportsUndo
```

It receives shared callbacks:

```text
onMetrics(values)
onStatus(message)
onComplete()
```

`getResult()` returns display score plus game-specific proof metadata. Proof examples are a Maze movement trace, Number Path route, Color Connect routes, Lights Out press sequence and Loop Puzzle edges.

## Ranked lifecycle

Guest play is always local and unranked.

For a signed-in account:

```text
POST /api/runs/start
        ↓
server creates account-bound run_id + seed + started_at
        ↓
client generates the deterministic puzzle from that seed
        ↓
player finishes without using full Solution
        ↓
POST /api/results with compact completion proof
        ↓
server verifies account + attempt + seed + game proof
        ↓
server computes elapsed time, score and Ranking Points
        ↓
result inserted; attempt consumed
```

The browser is not authoritative for ranked score or ranked elapsed time. `run_id` is unique and attempts are single-use. A full Solution makes the client attempt practice-only and no ranked result is submitted.

## Data model

`users` — Google-backed account identity.

`sessions` — hashed session tokens with expiration.

`ranked_attempts` — short-lived server-issued account attempts containing game, difficulty, mode, seed and server start/expiry timestamps.

`results` — immutable verified ranked finishes. `run_id` is unique, making result submission idempotent.

Ranking is a query over `SUM(results.ranking_points)` grouped by `user_id` and `game`.

The database stores `game` as text rather than a fixed five-game enum. Valid ids are enforced by the shared Game Registry, allowing the platform to grow without rebuilding tables for every new game.

## Scaling to many games

The first four `featured:true` games appear directly in the desktop header. Other games live under `Games`. The dropdown receives a search field automatically once the overflow list is large enough. Mobile navigation reads the complete registry.

To add a game, the intended path is:
1. Add its registry entry.
2. Add one engine module under `src/js/games/`.
3. Add its proof verifier/scoring policy.
4. Add engine/server tests.

Shared auth, Header/Footer, game page shell, Daily UI, result modal, profile and Rankings should not be duplicated.

## Security boundaries

- Sessions use Secure, HttpOnly, SameSite cookies and hashed tokens in D1.
- Ranked attempt/result POSTs require a signed-in session and reject cross-origin writes when an Origin is supplied.
- Ranked attempts are account-bound, expire, are rate-limited and are consumed once.
- Server timing starts with the issued attempt.
- Server regenerates the puzzle from the issued seed and validates game-specific proof.
- Duplicate `run_id` submissions cannot add points twice.

This substantially raises the cost of casual DevTools/API score forging. It does not claim to make browser automation impossible.

## Non-goals

Snapoki V2 intentionally avoids:
- SPA routing
- a UI framework runtime
- runtime schema migrations
- separate result tables per game
- separate auth state per game
- guest Rankings
- Global/Daily leaderboard tabs
- XP/Level/Beginner progression
- DOM MutationObserver repair loops
- CSS injection from JavaScript
