# Snapoki V2 Architecture

## Runtime ownership

### Static site shell
`scripts/build.mjs` owns page structure. Header and Footer are emitted at build time from one template.

### Site runtime
`src/js/site.js` owns only:
- desktop Games dropdown
- mobile navigation drawer
- fixed-width account slot
- Login modal
- lazy Google Identity Services loading
- logout

### Game platform
`src/js/game-page.js` owns:
- Difficulty and mode
- New Puzzle / Reset / Hint / Solution / Undo
- run lifecycle and timer
- shared Result modal
- Daily Challenge progress/countdown
- result submission
- Rankings
- Your profile

### Game engines
`src/js/games/*.js` own only game rules and board rendering. Each exports `createGame()` and pure generator/solver helpers where appropriate.

## Game engine contract

A controller returned by `createGame()` may expose:

```text
reset()
hint()
solution()
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

## Data model

`users` — Google-backed account identity.

`sessions` — hashed session tokens with expiration.

`results` — immutable ranked finishes. `run_id` is unique, making result submission idempotent.

Ranking is a query over `SUM(results.ranking_points)` grouped by user and game.

## Non-goals

Snapoki V2 intentionally avoids:
- SPA routing
- a UI framework runtime
- runtime schema migrations
- separate result tables per game
- separate auth state per game
- Global/Daily leaderboard tabs
- XP/Level/Beginner progression
- DOM MutationObserver repair loops
- CSS injection from JavaScript
