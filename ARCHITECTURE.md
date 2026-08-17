# Snapoki V2 Architecture

## Design goal

Snapoki is a puzzle platform, not a collection of unrelated pages. A new game should plug into the platform with the smallest possible game-specific surface. Navigation, page layout, How to Play, board sizing, status presentation, Daily Challenge UI, result modal, Rankings, profile, guides, sitemap, SEO checks and Content Desk orchestration are shared.

The rule is simple:

- **Shared behavior belongs in the platform.**
- **Game rules, rendering, social-board rendering and proof belong in the game plugin.**
- **Game-specific presentation is optional and declarative.**
- **Build output is audited before it can pass CI.**

## Canonical registries

### Game Registry

`src/js/games-config.js` is the canonical registry for:

- game id/key
- slug and public name
- featured navigation state
- category and tagline
- description and hero pills
- difficulty labels
- metrics
- baseline rule copy
- SEO title/description
- capabilities
- ranking proof/scoring labels
- optional reusable social insight

Server game validation imports the same registry through `functions/_lib/games.js`. Do not create a second hard-coded list of game ids or difficulties.

### Presentation Registry

`src/js/game-presentation.js` contains **optional presentation overrides**. It owns things that are useful to the shared shell but are not core puzzle rules:

- special game stylesheets
- Solution/Guide control label
- compact How to Play goal/rows/tools
- social-image hook
- optional homepage spotlight

`getGamePresentation(game)` has a generic fallback. A simple new game can therefore render without adding a presentation entry at all. Add an override only when the game genuinely needs different wording, a special control label or game-specific CSS.

### Result Verifier Registry

`functions/_lib/scoring.js` exports `RESULT_VERIFIERS`. Ranked proof is intentionally game-specific because each mechanic has a different valid completion proof. The platform audit requires one verifier for every registered game and rejects orphan verifiers.

## Static site generation

`scripts/build.mjs` owns the canonical shared site shell. It generates directly from the registries rather than generating an old form and patching it later.

It owns:

- header and mobile navigation
- More Games overflow
- footer and social links
- homepage game count/cards
- optional homepage spotlight
- game page shell
- Difficulty / Regular Play / Daily Challenge controls
- shared How to Play card
- shared board status container
- base sitemap/robots/manifest

Game pages automatically load shared styles. Optional game-specific styles come from the Presentation Registry. `board-contract.css` is loaded after game-specific styles so geometry stays consistent.

Other build responsibilities are separated by purpose:

- `scripts/enrich-content.mjs` — About, Help, Privacy, Terms, platform How to Play, Daily and Rankings reference content.
- `scripts/post-build-platform.mjs` — shared style wiring and narrowly scoped legacy content polish only; it must not patch runtime JavaScript.
- `scripts/launch-readiness.mjs` — registry-driven Blog/Guides, guide artwork, structured data, related links, final sitemap and robots rules.
- `scripts/release-integrations.mjs` — analytics disclosure, canonical social identity and release-level metadata.
- `scripts/admin-plugin-audit.mjs` — verifies that Content Desk core remains game-agnostic and every registered game satisfies the social plugin convention.
- `scripts/platform-audit.mjs` — final site/build gate.

Obsolete game-specific/output-patch passes have been removed. Do not reintroduce a build script just to make one game public, patch built JavaScript or repair a stylesheet after generation.

## Shared game runtime

`src/js/game-page.js` owns the common lifecycle:

- Difficulty and Regular/Daily mode
- New Puzzle / Reset / Hint / Solution-or-Guide / Undo
- account-aware run lifecycle
- timer and score refresh
- server-issued ranked attempts
- terminal game lock handling
- practice lifecycle
- result modal
- account-backed Daily progress/countdown
- verified result submission
- Rankings
- profile/mastery

`src/js/game-status.js` owns shared board feedback presentation. It can suppress duplicate static instructions and turn structured runtime status into a common HUD without embedding game-specific DOM patches inside the build pipeline.

## Shared CSS contracts

Game engines should use existing platform styles whenever possible.

Important shared layers:

- `games.css` — common game layout, rails, toolbar, metrics, result UI and common board visual primitives.
- `board-contract.css` — board geometry/centering contract. Square puzzle surfaces use 560px; Maze keeps its 580px canvas stage.
- `how-to-card.css` — scan-first How to Play component.
- `board-status.css` — dynamic board feedback/progress HUD.
- `platform-extra.css`, `polish-v3.css`, `ui-safety.css` — shared platform polish and safety constraints.

A new game should **not** create a CSS file by default. Create game-specific CSS only if the mechanic needs visuals that cannot reasonably live in the shared primitives. Register that stylesheet through `game-presentation.js`; do not hard-code it into the page generator.

## Game engine contract

Every game has one public entry module:

`src/js/games/<slug>.js`

It must export `createGame()` and a deterministic generator named from the public slug in PascalCase:

```text
maze        → generateMaze()
echo-step   → generateEchoStep()
number-path → generateNumberPath()
```

The generator convention is used by tests, server proof regeneration where appropriate, and the Content Desk social plugin loader. Do not add a generator map to the admin system.

A controller returned by `createGame()` may expose:

```text
reset()
hint()
solution()
hideSolution()
undo()                 optional
solutionStep()         optional
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
onPracticeComplete(message)
```

Game engines own:

- deterministic generation
- puzzle rules
- board rendering
- pointer/keyboard interaction specific to that mechanic
- hint/solution behavior
- compact completion proof

Game engines do **not** own:

- account UI
- Google sign-in
- navigation/footer
- Daily shell
- Rankings/profile queries
- result modal
- sitemap/SEO shell
- global board geometry
- Content Desk UI/API orchestration

A game may dispatch `snapoki:game-lock` when it reaches a terminal state that should freeze shared timer/score and disable nonessential controls.

## Social-board plugin contract

The Content Desk must scale to 100+ games without adding imports or `if/else` branches for individual games.

For a game with slug `<slug>`:

- engine: `src/js/games/<slug>.js`
- social renderer: `src/js/social-renderers/<slug>.js`
- required renderer export: `drawSocialBoard(ctx, puzzle, box)`

`src/js/social-game-board.js` dynamically imports both modules by slug and derives the generator export name automatically. It contains no list of game ids. Shared canvas helpers live in `src/js/social-renderers/shared.js`.

If a runtime plugin load fails, the admin renders a generic fallback card instead of crashing. Production CI is stricter: `scripts/admin-plugin-audit.mjs` requires every registered game to have a valid engine generator and social renderer before build success.

The complete contract is documented in `CONTENT_DESK_PLUGIN_CONTRACT.md`.

## Ranked lifecycle

Guest play is local and unranked.

For a signed-in account:

```text
POST /api/runs/start
        ↓
server creates account-bound run_id + seed + started_at
        ↓
client generates the deterministic puzzle from that seed
        ↓
player finishes without using the full Solution/Guide
        ↓
POST /api/results with compact completion proof
        ↓
RESULT_VERIFIERS[game] regenerates and verifies the puzzle
        ↓
server computes elapsed time, score and Ranking Points
        ↓
result inserted; attempt consumed
```

The browser is not authoritative for ranked score or ranked elapsed time. `run_id` is unique and attempts are single-use. A full Solution/Guide makes the current attempt practice-only.

## Data model

`users` — Google-backed account identity.

`sessions` — hashed session tokens with expiration.

`ranked_attempts` — short-lived account-bound attempts containing game, difficulty, mode, seed and server start/expiry timestamps.

`results` — immutable verified ranked finishes. `run_id` is unique, making result submission idempotent.

`admin_social_content` — singleton Content Desk row for the current daily social pack.

The database stores `game` as text rather than a fixed game enum. Valid ids are enforced by the shared Game Registry and verifier contract, allowing the platform to grow without a schema migration for every new game.

## SEO and content contract

Every public game receives automatically:

- title and meta description
- canonical URL
- Open Graph / X metadata
- one H1
- play-first game page shell
- dedicated How to Play guide with the long-form editorial/SEO depth
- guide-to-game internal links
- related-game links where appropriate
- Breadcrumb / WebApplication structured data
- sitemap entry

Game pages intentionally do not carry long editorial filler below the gameplay/Daily experience. The dedicated guide owns strategy, rules, common mistakes and long-form search content.

`scripts/platform-audit.mjs` checks the generated site for:

- missing title/meta/canonical/H1
- duplicate canonicals
- dead internal links and assets
- missing game engine/page/guide
- missing shared UI contracts
- editorial filler accidentally returning to game pages
- thin guide content
- sitemap gaps
- accidental public links to the private Content Desk
- accidental noindex on launch game routes
- registry/verifier mismatch
- obsolete build-patch scripts returning to the pipeline

A build that violates the platform contract must fail CI rather than relying on a manual launch checklist.

## Private Content Desk / Gemini

The private utility lives at `/snapdesk-74kq/` and is marked `noindex,nofollow,noarchive`. Public pages must never link to it and robots.txt disallows the route.

The API lives at `functions/api/snapdesk-74kq/content.js` and requires exact `ADMIN_EMAIL` authorization. Gemini credentials remain server-side. The Content Desk stores only one current row and can regenerate, edit, copy, mark posted and delete the pack.

Generation uses structured JSON. The UI explicitly tells the admin whether the pack came from Gemini, a template because no key is configured, or a template fallback because the Gemini request failed. Manual social edits are validated again on the server, including the X character limit and required game URL.

The Content Desk core is deliberately game-agnostic:

- `functions/_lib/social-content.js` selects from `GAMES` and uses registry metadata/fallbacks rather than maintaining a game map.
- `src/js/social-game-board.js` discovers engine and renderer plugins by slug.
- `src/js/admin-content.js` only orchestrates the generic payload and canvas.
- no admin file should gain a literal list of game ids when games are added.

## Adding a new game

### Required

1. Add one entry to `src/js/games-config.js`.
2. Add `src/js/games/<slug>.js` exporting `createGame()` and the convention-based deterministic generator `generate<PascalCaseSlug>()`.
3. Add `src/js/social-renderers/<slug>.js` exporting `drawSocialBoard()` for the unsolved social image.
4. Add the game-specific ranked proof verifier to `RESULT_VERIFIERS` in `functions/_lib/scoring.js`.
5. Add generator/interaction/verifier tests for the mechanic.

### Optional

6. Add a `game-presentation.js` override only for special How to Play copy, a different Solution/Guide label, special styles, social hook or homepage spotlight.
7. Add `socialInsight` to the Game Registry entry when generic description copy is not specific enough for reusable social strategy text.
8. Add a custom long-form guide strategy block if the generic guide fallback is not deep enough.

### Do not edit manually

A normal new game should not require manual changes to:

- header
- mobile menu
- More Games
- footer
- homepage game count/card
- generic How to Play shell
- board status container
- Daily UI
- result modal
- Rankings/profile UI
- Blog guide card
- sitemap
- robots.txt
- About/Help/platform How to Play game lists
- `public/snapdesk-74kq/index.html`
- `src/js/admin-content.js`
- `src/js/social-game-board.js`
- `functions/api/snapdesk-74kq/content.js`
- `functions/_lib/social-content.js`

If adding a game requires editing those surfaces, first ask whether the missing behavior belongs in the shared platform, Game Registry, Presentation Registry or the game plugin itself.

## Security boundaries

- Sessions use Secure, HttpOnly, SameSite cookies and hashed tokens in D1.
- Ranked attempt/result POSTs require a signed-in session and reject cross-origin writes when Origin is supplied.
- Ranked attempts are account-bound, expire, are rate-limited and are consumed once.
- Server timing starts with the issued attempt.
- Server regenerates the puzzle from the issued seed and validates game-specific proof.
- Duplicate `run_id` submissions cannot add points twice.
- Gemini API keys and admin authorization remain server-side.

This raises the cost of casual DevTools/API score forging without claiming browser automation is impossible.

## Non-goals

Snapoki intentionally avoids:

- SPA routing
- a UI framework runtime
- runtime schema migrations
- a separate page template per game
- a separate auth state per game
- separate result tables per game
- guest Rankings
- XP/Level progression
- MutationObserver repair loops
- game-specific post-build patch scripts
- JavaScript that injects repair CSS into generated pages
- game-specific branches inside Content Desk core
