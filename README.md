# Snapoki V2

A browser puzzle platform with six current games and a registry-first architecture designed to add future games without duplicating the surrounding product stack.

## Current games

- Echo Step
- Maze
- Number Path
- Color Connect
- Lights Out
- Loop Puzzle

Every game reuses the same site shell, account system, difficulty rail, Regular Play / Daily Challenge lifecycle, board-status area, How to Play card, result modal, Rankings, profile and Daily progress UI. Game engines only own their mechanic, rendering, hint/practice behavior and compact completion proof.

## Core product rules

- **Guest play is free and unranked.** Guest finishes never write Ranking Points or account Daily counters.
- **Hints are limited guidance.** They may remain ranked but reduce the reward.
- **Full Solution / Guide is practice.** Once opened, that board stays practice-only. Hiding the guide or resetting the same board does not restore ranking eligibility; start a New Puzzle for a fresh verified attempt.
- **Difficulty is structural.** Harder boards change route pressure, clues, dead ends, bottlenecks, delayed consequences, deduction depth or minimum logical actions rather than relying only on larger grids.
- **Shared behavior stays shared.** New games must not create a second header, account flow, ranking UI, Daily shell, result modal, sitemap process or generic How to Play component.

## Architecture

Canonical registries:

- `src/js/games-config.js` — game ids, slugs, navigation metadata, difficulty, metrics, capabilities, SEO and baseline rules.
- `src/js/game-presentation.js` — optional presentation overrides such as special How to Play wording, `Guide` vs `Solution`, game-specific CSS, social hook and optional spotlight.
- `functions/_lib/scoring.js` → `RESULT_VERIFIERS` — one mechanic-specific ranked proof verifier per registered game.

Shared runtime:

- `src/js/site.js` — navigation and optional Google account UI.
- `src/js/game-page.js` — shared game lifecycle, timer, practice, Daily, Result, Rankings and Profile.
- `src/js/game-status.js` — shared board feedback/progress presentation.
- `src/js/games/*.js` — game-specific engines only.

Shared build/content:

- `scripts/build.mjs` — registry-driven site shell, game pages and homepage.
- `scripts/enrich-content.mjs` — About/Help/legal/reference content from the registry.
- `scripts/post-build-platform.mjs` — shared styles and narrow content polish; never patches runtime JavaScript.
- `scripts/launch-readiness.mjs` — registry-driven guides, guide artwork, structured data, internal links, sitemap and robots.
- `scripts/release-integrations.mjs` — analytics/social release metadata.
- `scripts/platform-audit.mjs` — final build gate for SEO, dead links, content depth, registry/verifier parity and private-admin isolation.

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for ownership details and [`docs/LAUNCH_AND_GAME_EXPANSION.md`](docs/LAUNCH_AND_GAME_EXPANSION.md) for the short Game #7+ checklist.

## Shared UI/CSS contracts

Reuse these before adding game-specific CSS:

- `src/styles/games.css`
- `src/styles/board-contract.css`
- `src/styles/how-to-card.css`
- `src/styles/board-status.css`
- `src/styles/platform-extra.css`
- `src/styles/polish-v3.css`
- `src/styles/ui-safety.css`

A new game does not need its own stylesheet by default. If unique mechanic visuals are required, register the stylesheet in `game-presentation.js`.

## Local validation

```bash
npm run build
npm test
```

`npm run build` ends with `scripts/platform-audit.mjs`. A build fails if public output has problems such as missing canonical/meta/H1, dead internal links, missing game/guide/verifier coverage, thin content, sitemap gaps, accidental noindex or exposure of the private Content Desk.

Generated public output is written to `dist/` and should not be hand-edited.

## Adding a game

Required:

1. Add the game to `src/js/games-config.js`.
2. Add `src/js/games/<slug>.js` exporting `createGame()`.
3. Add its proof verifier to `RESULT_VERIFIERS` in `functions/_lib/scoring.js`.
4. Add mechanic-specific generator/gameplay/verifier tests.
5. Run build and tests.

Optional:

- presentation override in `game-presentation.js`
- custom social-board renderer
- custom long-form strategy/guide artwork

Header, footer, homepage card/count, common game page, generic How to Play, Daily UI, result modal, Blog guide route, internal links and sitemap should flow automatically.

## Cloudflare D1

Database configuration lives in `wrangler.toml`. Migrations are the only supported production schema changes; runtime Functions do not create or alter tables.

Current migrations:

```text
0001_initial.sql              users, sessions, results
0002_ranked_attempts.sql      server-issued ranked attempts
0003_scalable_game_ids.sql    removes fixed game-id constraints
0004_admin_social_content.sql singleton private Content Desk storage
```

Apply pending migrations when needed:

```bash
npx wrangler d1 migrations apply snapoki-v2-db --remote
```

The D1 binding name is `DB`.

## Cloudflare Pages

Expected project configuration:

```text
Production branch: main
Build command: npm run build
Build output directory: dist
```

Production deployment is a separate manual decision from GitHub CI.

## Google sign-in

Set the Functions environment value:

```text
GOOGLE_CLIENT_ID=<Google OAuth Web Client ID>
```

Sessions use a random token in a Secure, HttpOnly, SameSite cookie; D1 stores only its SHA-256 hash.

## Core API

```text
GET  /api/config
GET  /api/me
POST /api/auth/google
POST /api/logout
POST /api/runs/start
POST /api/runs/reveal
POST /api/results
GET  /api/rankings?game=maze
GET  /api/profile?game=maze
```

A signed-in ranked puzzle receives a server-issued `run_id`, seed and server start time. The server regenerates the expected puzzle and validates the completion proof before calculating the authoritative ranked time, score and Ranking Points.

Current proof types include:

- Echo Step: accepted move sequence producing a same-turn YOU/Echo finish
- Maze: legal corridor movement trace
- Number Path: complete path satisfying exact-step checkpoints
- Color Connect: non-overlapping color routes covering the open board
- Lights Out: actual press sequence that clears the board
- Loop Puzzle: a single valid loop satisfying clues

Attempts expire, are single-use and cannot add points twice through duplicate `run_id` submissions.

## Daily Challenges

Daily boards are deterministic per game, difficulty and UTC date. Signed-in verified Easy / Medium / Hard Daily finishes are saved through results. Completing all three difficulties for one game on the same UTC date completes that game’s Daily set and can extend its streak.

## SEO and content

Every registered game automatically receives a public game route, dedicated guide, game↔guide links, structured data and sitemap coverage. Shared reference pages include:

- `/about/`
- `/help/`
- `/privacy/`
- `/terms/`
- `/how-to-play/`
- `/daily-challenges/`
- `/rankings-guide/`
- `/blog/`

The final platform audit checks internal links and prevents the private admin utility from entering public navigation or sitemap.

## Private Content Desk / Gemini

The private utility is `/snapdesk-74kq/` and is marked `noindex,nofollow,noarchive`. Public pages never link to it and robots.txt disallows it.

Required/optional Functions environment values:

```text
ADMIN_EMAIL=<exact allowed account email list>
GEMINI_API_KEY=<Google Gemini API key>
GEMINI_MODEL=gemini-3.6-flash   # optional override
```

The desk stores one daily content pack, supports regenerate/edit/copy/posted-state/delete actions, produces a 1080×1080 game image, and shows whether copy came from Gemini, a no-key template, or a Gemini-error template fallback. Gemini credentials never reach the browser.
