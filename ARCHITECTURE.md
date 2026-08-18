# Snapoki V2 Architecture

## Design goal

Snapoki is one puzzle platform, not a collection of unrelated pages. New games plug into shared navigation, account state, page layout, Daily Challenge, Rankings, Profile, SEO, guides and Content Desk infrastructure.

Core rules:

- shared behavior belongs in the platform
- mechanic rules/rendering/proof belong in the game plugin
- account gameplay state must stay bounded as users replay indefinitely
- build output is audited before CI can pass

## Canonical registries

### Game Registry

`src/js/games-config.js` is the canonical registry for game id, slug, public name, navigation state, category, difficulty, metrics, capabilities, SEO and baseline rules.

Server validation imports the same registry through `functions/_lib/games.js`. Do not create a second hard-coded game list.

### Presentation Registry

`src/js/game-presentation.js` contains optional presentation overrides such as custom How to Play wording, Solution/Guide label, special styles and social hooks.

### Result Verifier Registry

`functions/_lib/scoring.js` exports `RESULT_VERIFIERS`. Each registered game must have one deterministic proof verifier. The browser never decides whether a ranked completion is valid.

## Shared game runtime

`src/js/game-page.js` owns:

- Difficulty and Regular/Daily mode
- New Puzzle / Reset / Hint / Solution
- account-aware server-issued attempts
- timer and score refresh
- practice lifecycle
- result modal
- Daily progress/countdown
- PB Rankings
- Profile/progression

Snapoki does not expose a platform-wide Undo. Correction stays mechanic-native.

## Ranked and Daily semantics

### Regular Play

Regular Play is the only mode that affects leaderboards.

A verified completion produces a candidate performance score:

```text
verified game score
→ hint penalty
→ Easy ×1 / Medium ×3 / Hard ×5
→ candidate ranking score
```

Each account has one durable row per game. A PB is replaced only if the candidate is better by:

1. ranking score
2. raw verified score
3. lower verified time

The user can play indefinitely; repeat completions do not append gameplay history and do not accumulate ranking score.

Leaderboard views:

```text
Overall | Easy | Medium | Hard
```

All four views come from the same `user_game_stats` row.

### Progression

Verified completions increment bounded counters and XP in the same user/game row. Level is derived from XP and is not a leaderboard input.

This keeps:

```text
Leaderboard = best skill/performance
Progression = continued verified play
```

### Daily Challenge

Daily Challenge does not affect Rankings.

For each user/game the database stores only:

- current UTC Daily date
- 3-bit completion mask
- 3-bit practice-blocked mask
- current streak
- longest streak
- last completed UTC date

No historical Daily row is appended for every day.

Bit contract:

```text
Easy   = 1
Medium = 2
Hard   = 4
Complete day = 7
```

When a new UTC date is encountered, the old Daily masks are treated as zero and replaced in place. Streak fields remain durable.

## D1 data model

### `users`

One row per Google-backed account.

### `sessions`

Hashed account sessions with expiration.

### `user_game_stats`

Primary key:

```text
PRIMARY KEY (user_id, game)
```

Contains:

- Overall PB ranking score/raw score/time/difficulty/achieved timestamp
- Easy PB ranking score/raw score/time/timestamp
- Medium PB ranking score/raw score/time/timestamp
- Hard PB ranking score/raw score/time/timestamp
- verified completion count
- clear count per difficulty
- XP
- current Daily masks
- current/longest Daily streak

This is the authoritative source for Rankings, Profile and Daily progress.

Database growth is therefore approximately proportional to:

```text
accounts × games actually played
```

not:

```text
accounts × lifetime number of puzzle completions
```

### `ranked_attempts`

Attempts remain server-issued and account-bound, but storage is also bounded.

Migration 0005 enforces:

```text
UNIQUE(user_id, game, difficulty, mode)
```

So each account has at most one current attempt slot per game/difficulty/mode. Starting a fresh puzzle replaces that slot instead of appending an unlimited attempt history.

The slot stores:

- run id
- seed
- server start/expiry
- consumed state
- Solution-revealed state
- compact final completion fields for retry/idempotency

### `results`

`results` becomes a legacy read-only archive after migration 0005.

Migration 0005 backfills `user_game_stats` from existing verified results, including Regular Play PBs and Daily streak state. New runtime APIs do not read or insert `results`.

The archive is intentionally not dropped in the same migration. This gives a rollback/audit window. A later production migration can remove it after the new model has been observed safely.

### `admin_social_content`

Singleton private Content Desk state; unrelated to gameplay scaling.

## Indexed ranking reads

`user_game_stats` has one ranking index per supported board:

- Overall
- Easy
- Medium
- Hard

Top rankings are direct ordered reads from bounded PB rows. APIs no longer perform:

```text
results
→ GROUP BY user
→ SUM ranking_points
→ sort lifetime history
```

Rank/Profile reads never reconstruct account state from raw gameplay history.

## Verified completion lifecycle

For a signed-in player:

```text
POST /api/runs/start
        ↓
server creates/replaces bounded attempt slot
        ↓
client builds deterministic puzzle from server seed
        ↓
player finishes without full Solution
        ↓
POST /api/results with compact mechanic proof
        ↓
server regenerates + verifies proof
        ↓
server computes authoritative time + score
        ↓
Regular: conditionally update PB + progression
Daily: update Daily mask/streak + progression
        ↓
attempt slot marked consumed/completed
```

`/api/results` remains the route name for compatibility, but it is now a verified completion endpoint, not an append-only results-history writer.

## Solution / practice lifecycle

Viewing Solution:

- immediately makes the current attempt practice-only
- sets `solution_revealed` on the bounded attempt slot
- for Daily, sets the current day/difficulty bit in `daily_blocked_mask`
- never creates a legacy `results` row

A Daily level whose Solution was viewed remains practice-only for that UTC date.

## Free-tier design principles

The storage design intentionally avoids data that grows with repeat play.

Writes that remain meaningful:

- one user row when an account is first created
- session maintenance
- one bounded attempt-slot replacement when verified play starts
- one bounded `user_game_stats` update when a verified completion is accepted

Reads are indexed and target current aggregate state.

When traffic eventually justifies Workers Paid, the application remains on D1. Upgrading plan does not require a schema redesign.

## Static site generation

`scripts/build.mjs` owns the canonical shell.

`scripts/post-build-platform.mjs` wires shared CSS and performs copy-only normalization. It must not patch built JavaScript.

`scripts/check.mjs`, `scripts/admin-plugin-audit.mjs` and `scripts/platform-audit.mjs` remain release gates.

## Shared CSS

Core layers:

- `games.css`
- `board-contract.css`
- `how-to-card.css`
- `board-status.css`
- `platform-extra.css`
- `polish-v3.css`
- `ui-safety.css`
- `progression-v1.css`

`progression-v1.css` owns the shared PB leaderboard tabs and bounded progression presentation.

## Game engine contract

Every public game entry:

```text
src/js/games/<slug>.js
```

exports:

```text
createGame()
generate<PascalCaseSlug>()
```

A controller may expose:

```text
reset()
hint()
solution()
hideSolution()
solutionStep()
previewScore()
getResult()
destroy()
```

Mechanic-native correction remains inside each game.

## Content Desk plugin contract

The Content Desk remains game-agnostic:

- `src/js/social-game-board.js` dynamically discovers game/social plugins
- `src/js/social-renderers/<slug>.js` owns unsolved-board social rendering
- `functions/_lib/social-content.js` uses registry metadata
- `CONTENT_DESK_PLUGIN_CONTRACT.md` defines the extension contract

Adding a normal game must not add a switch statement to Content Desk core.

## Security boundaries

- sessions use Secure, HttpOnly, SameSite cookies and hashed D1 tokens
- attempt/result writes require an authenticated session
- cross-site writes are rejected
- attempts are account-bound and expire
- server timing begins at attempt issue
- server regenerates the puzzle and validates mechanic-specific proof
- consumed attempt slots prevent the normal duplicate-submission path
- full Solution cannot become ranked by hiding/resetting the same board
- suspicious impossible-speed completions can be excluded from progression/ranking

Browser automation cannot be made impossible, but the server remains authoritative for leaderboard eligibility.

## Migration contract

Runtime code never creates or changes schema.

Current migrations:

```text
0001_initial.sql
0002_ranked_attempts.sql
0003_scalable_game_ids.sql
0004_admin_social_content.sql
0005_free_tier_scalability.sql
```

Migration 0005 is a release boundary. It must be applied to the target D1 database before deploying runtime code that expects `user_game_stats` and the new ranked-attempt columns.

Production migration/deployment is separate from preview code review.

## Non-goals

Snapoki intentionally avoids:

- append-only per-completion gameplay history
- cumulative farmable leaderboard score
- Daily leaderboard points
- one Daily row per date
- SPA routing
- runtime schema migrations
- separate account state per game page
- separate result tables per game
- guest Rankings
- generic Undo
- game-specific post-build JavaScript repair
- Content Desk branches per game
