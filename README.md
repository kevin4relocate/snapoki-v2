# Snapoki V2

Snapoki is a guest-first browser game platform with a registry-driven architecture. Public play requires no account or sign-in.

## Current games

1. Echo Step
2. Maze
3. Number Path
4. Color Connect
5. Lights Out
6. Loop Puzzle
7. Bridges
8. Animal Chess — a 7×9 local or CPU strategy board game (Dou Shou Qi).
9. World Loop — an endless lane-race screensaver with 196 selectable countries (including Taiwan), no finish line, continuously increasing distance and a scrolling camera.
10. Animal Loop — a relaxing, no-flag endless race screensaver with 24 animal characters, 4–12 selectable racers and the same live pace/sound controls.
11. Aquarium Loop — a non-racing underwater screensaver with 16 sea creatures, natural 2D swimming, optional original ocean sound, and gentle ambient controls.

The first seven games are puzzles; Animal Chess is a board game, while World Loop (Flag theme), Animal Loop and Aquarium Loop are simulations. These simulations opt out of puzzle-only Daily completion and public rankings.

## Public product rules

- **Guest-only public play.** No public registration, Login, Profile or Leaderboard.
- **Local gameplay.** Regular Play does not require server account state.
- **Browser-local Daily progress.** Daily completion and streaks are stored in localStorage for games that support Daily.
- **Capability-driven games.** A game may opt out of Hint, Solution, Daily or ranking-related behavior without creating a second site shell.
- **Shared behavior stays shared.** Header, navigation, game routes, SEO, guides, Content Desk discovery and audits remain registry-driven.
- **Private admin stays private.** Content Desk uses its own allowlisted Google admin authentication and is not exposed as player sign-in.

## Architecture

Canonical registries:

- `src/js/games-config.js` — game ids, slugs, explicit `experienceType` (`puzzle`, `board`, `simulation`), capabilities, SEO and control labels.
- `src/js/game-guide.js` — type-aware editorial guide copy and optional per-game `guide` overrides, without post-build HTML patches.
- `src/js/game-presentation.js` — presentation overrides and game-specific stylesheet registration.
- `functions/_lib/scoring.js` → `RESULT_VERIFIERS` — one verifier entry per registered game. Non-scoring simulations may expose a verifier that always rejects submissions so registry parity remains explicit.

Shared runtime:

- `src/js/site.js` — public navigation only.
- `src/js/game-page.js` — shared game lifecycle and capability handling.
- `src/js/game-status.js` — shared board feedback/progress.
- `src/js/endless-race/engine.js` — one shared Flag/Animal simulation, Top 5, picker, pace, optional soundtrack and Full Screen runtime.
- `src/js/endless-race/themes/` — data-only theme definitions; see [Endless Race Themes](docs/ENDLESS_RACE_THEMES.md).
- `src/js/ambient/swim.js` — pure, seeded 2D swimming motion (target steering, gentle avoidance, bounded positions).
- `src/js/ambient/engine.js` — Aquarium session/picker/audio/fullscreen controller; see [Ambient Swim Engine](docs/AMBIENT_SWIM_ENGINE.md).
- `src/js/games/<slug>.js` — stable game entry exporting `createGame()` plus `generate<PascalCaseSlug>()`.
- `src/styles/<slug>.css` — optional game-specific presentation.
- `src/js/social-renderers/<slug>.js` — Content Desk/social preview renderer.

Generated public output is written to `dist/`.

For performance, responsive layout and keyboard-accessibility regression checks, see [Stage 5 Performance & Accessibility](docs/STAGE5_PERFORMANCE_ACCESSIBILITY.md).

## World Loop

If `/world-loop/` returns 404 on production despite GitHub CI passing, follow [World Loop production 404 diagnosis](docs/WORLD_LOOP_PRODUCTION_404.md) to verify Cloudflare Pages deployment, domain routing and the live release commit. A successful GitHub build alone does not update the public site.

World Loop is a full-width ambient screensaver, separate from the puzzle controls. Opening its page automatically starts the saved/default country roster with sound off. Cruise, Dynamic and Sprint are in the race toolbar and switch live without clearing the session timer, racer distances or music. Play/Pause Sound, Mute and Volume also work independently during a race. Stop opens country selection, while Restart resets the current race intentionally.

World Loop is deliberately different from the puzzle catalog:

- search 196 country choices, including Taiwan, then choose 4–12 racers;
- each country gets one clear horizontal lane;
- there is no finish line, no winner screen and no round system;
- each racer accumulates an unbounded distance value continuously;
- the road scrolls and the camera follows the leading pack, so racers can keep moving forever without running off the screen;
- Current Order, Leader Distance and the P1→P2 gap update live;
- neutral seeded session traits, comeback pressure and brief bursts allow lead changes without permanent country advantages;
- Cruise, Dynamic and Sprint change pace without changing the core endless format;
- Full Screen turns the game into a clean screensaver-style view;
- supported browsers request Screen Wake Lock after Start / Full Screen to help keep a display awake;
- runtime state is bounded to current counters and racers rather than storing an ever-growing history;
- Pause preserves the same session; Restart returns all distance to zero with the same countries, while Stop returns to country selection;
- no account, D1 gameplay state, Daily completion or public leaderboard dependency.

## Content Desk plugin contract

Every registered game must provide:

1. `src/js/games/<slug>.js` with `createGame()`.
2. A deterministic `generate<PascalCaseSlug>()` export.
3. `src/js/social-renderers/<slug>.js` with `drawSocialBoard()`.
4. A matching key in `RESULT_VERIFIERS`.
5. Mechanic-specific tests.

The Content Desk audit fails the build when these contracts drift, including invalid experience types or missing guide metadata. New board games should declare `experienceType:'board'` and configure their match guide instead of inheriting World Loop copy. See [Stage 4 Game Plugin Contract](docs/STAGE4_GAME_CONTRACT.md).

## Local validation

```bash
npm run check
npm run build
npm test
```

The build pipeline syntax-checks runtime code, validates Content Desk plugin contracts, generates the site and guides, audits public routes/SEO/internal links, then creates content-addressed JS/CSS asset URLs and a `dist/release.json` build manifest. GitHub CI also runs Chromium smoke tests for every registered game. See [Stage 3 release and rollback guide](docs/STAGE3_CLOUDFLARE_RELEASE.md).

## Cloudflare Pages

Expected project configuration:

```text
Production branch: main
Build command: npm run build
Build output directory: dist
```

Production deployment remains a separate release decision from GitHub validation. After deployment, verify the live site and its immutable assets with `npm run verify:production -- --url https://snapoki.com --expected-commit <main-SHA>`; this read-only check does not access D1.

## Cloudflare D1

Legacy player/ranking tables may still exist for compatibility, but the public guest-only product does not depend on them. Do not apply old account/ranking migrations merely to review World Loop.

Private Content Desk authentication still relies on the minimal admin session path, so user/session storage must not be removed casually.

## Private admin authentication

Content Desk admin sign-in requires Cloudflare environment configuration:

```text
ADMIN_EMAIL=<allowlisted admin email>
GOOGLE_CLIENT_ID=<Google OAuth Web Client ID>
```

The public site does not receive or render player Google sign-in.
