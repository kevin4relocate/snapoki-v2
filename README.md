# Snapoki V2

A clean-room browser puzzle platform with five launch games and a shared architecture designed to scale to many more.

## Launch games

- Maze
- Number Path
- Color Connect
- Lights Out
- Loop Puzzle

Every game uses the same Header/Footer, left controls, board toolbar, right rail, Daily Challenge, result modal and account system. Each game has Easy / Medium / Hard, Regular Play, Daily Challenge, Hint, Solution / Hide Solution and Reset Puzzle.

## Core product rules

- **Guest play is free and unranked.** Guests never write Ranking Points or Daily account counters.
- **Hints are limited guidance.** They can remain ranked but reduce the available reward.
- **Full Solution is practice.** Once Solution is viewed, that attempt is unranked even if the guide is hidden. Reset Puzzle can start the same board again with a fresh verified attempt.
- **Difficulty is structural.** Harder boards change route pressure, clues, dead ends, bottlenecks, deduction depth or minimum logical moves rather than relying only on larger grids.

## Architecture

The canonical game registry is `src/js/games-config.js`. It drives game routes, navigation, copy and server game-id validation.

Shared ownership:

- `scripts/build.mjs` — static Header/Footer and page shell
- `scripts/enrich-content.mjs` — rich About/Help/Privacy/Terms + guide pages and expanded footer
- `src/js/site.js` — navigation and optional Google account UI
- `src/js/game-page.js` — shared game lifecycle, Daily, Result, Rankings/Profile
- `src/js/games/*.js` — game-specific engines only
- `functions/api/runs/start.js` — account-bound ranked attempt issuance
- `functions/api/results.js` — proof verification and ranked result persistence
- `functions/_lib/scoring.js` — server-side puzzle regeneration, proof checks and score calculation

See `ARCHITECTURE.md` for the full ownership and anti-cheat model.

## Brand

Primary palette:

- Background `#080B14`
- Surface `#12172A`
- Primary Violet `#7357FF`
- Accent Cyan `#28C9F5`
- Success Mint `#37D99A`
- Text `#F5F7FC`
- Muted `#9CA6BD`

Editable SVG sources live in `public/brand/`.

Generate PNG/favicons/social assets:

```bash
npm run brand
```

## Local build

```bash
npm run build
npm test
```

The generated site is written to `dist/`.

## Cloudflare D1

Database configuration is already present in `wrangler.toml`.

Migrations are the only supported way to change production schema. Runtime Functions never create or alter tables.

Current migrations:

```text
0001_initial.sql          users, sessions, results
0002_ranked_attempts.sql  server-issued ranked attempts
0003_scalable_game_ids.sql removes the fixed five-game constraint from results
```

Apply pending migrations with Wrangler when using CLI:

```bash
npx wrangler d1 migrations apply snapoki-v2-db --remote
```

They can also be applied through the Cloudflare D1 dashboard SQL Console when CLI is not desired.

## Cloudflare Pages

Recommended project configuration:

```text
Production branch: main
Build command: npm run build
Build output directory: dist
```

The D1 binding name must be `DB`.

## Google sign-in

Snapoki loads Google Identity Services only after the Login modal is opened. Add:

```text
GOOGLE_CLIENT_ID=<Google OAuth Web Client ID>
```

as a Cloudflare Pages Secret/variable available to Functions.

Sessions use a random token in a Secure, HttpOnly, SameSite cookie; D1 stores only its SHA-256 hash.

## API

```text
GET  /api/config
GET  /api/me
POST /api/auth/google
POST /api/logout
POST /api/runs/start
POST /api/results
GET  /api/rankings?game=maze
GET  /api/profile?game=maze
```

## Account-only Rankings and anti-cheat

A signed-in player receives a server-issued `run_id`, puzzle seed and server start time. A ranked finish must match the same account/game/difficulty/mode/seed and provide game-specific completion proof.

The server regenerates the puzzle and verifies:

- Maze: legal movement trace through corridors
- Number Path: full valid route with clues in order
- Color Connect: non-overlapping completed color routes covering the open board
- Lights Out: actual press sequence that solves the generated board
- Loop Puzzle: an actual single loop satisfying the generated clues

The server calculates ranked elapsed time, score and Ranking Points. Client-supplied score is not authoritative. Attempts expire, are single-use, rate-limited and cannot add points twice through duplicate `run_id` submissions.

## Daily Challenges

Daily boards are deterministic per game, difficulty and UTC date. For signed-in accounts, Easy / Medium / Hard verified Daily finishes are saved from `results`. Completing all three levels for a game on a UTC date counts that date toward its Daily Streak.

## SEO and content

The build outputs the homepage, all game routes, sitemap, robots, manifest and richer informational pages:

- `/about/`
- `/help/`
- `/privacy/`
- `/terms/`
- `/how-to-play/`
- `/daily-challenges/`
- `/rankings-guide/`

The footer is shared across every generated page and links to Games, Guides and Snapoki information.

## Scaling

The first four featured games are kept directly in the desktop header. Overflow games live in the `Games` menu; once that list becomes large, the menu automatically adds search and remains scrollable. Mobile navigation is registry-driven.

Adding future games should reuse all platform services rather than creating game-specific auth, result, ranking, profile or Daily systems.
