# Snapoki Launch & Game Expansion Guide

This is the short operational checklist for adding Game #7 and beyond. The detailed ownership rules live in [`ARCHITECTURE.md`](../ARCHITECTURE.md).

## Principle

A new game extends the platform. It must not create a second header, footer, account flow, Daily shell, Rankings UI, result modal, sitemap process or generic How to Play layout.

If a new game requires editing many shared surfaces manually, first check whether the missing concept belongs in the shared runtime or `game-presentation.js`.

## Required work for a new game

1. Add one game definition to `src/js/games-config.js`.
2. Add one public engine entry at `src/js/games/<slug>.js` exporting `createGame()`.
3. Add the mechanic-specific result verifier to `RESULT_VERIFIERS` in `functions/_lib/scoring.js`.
4. Add deterministic generator, gameplay and verifier tests.
5. Run `npm run build` and `npm test`.

The final platform audit will fail if the game is missing its route, engine, guide, verifier, shared UI contracts, sitemap coverage or enough public content.

## Optional game-specific work

Use `src/js/game-presentation.js` only when the game needs one of these:

- special compact How to Play wording
- a control label other than `Solution`
- genuinely mechanic-specific CSS
- a custom social-image hook
- an optional homepage spotlight

Use `scripts/launch-readiness.mjs` only for a richer editorial strategy section or custom guide artwork when the generic fallback is not strong enough.

Use `src/js/social-game-board.js` only when a custom social-board renderer materially represents the mechanic better than the generic fallback.

A simple game should be able to launch without any game-specific stylesheet.

## Shared surfaces that should update automatically

Registering the game should flow into:

- desktop/mobile navigation and More Games
- footer game links
- homepage game count and game card
- game page shell
- Difficulty / Regular Play / Daily controls
- shared board-status container
- shared How to Play component
- result modal
- Rankings/profile rail
- About and Help game lists
- platform How to Play
- Blog guide index
- dedicated How to Play guide fallback
- internal game/guide links
- sitemap and structured data
- social-content template rotation

Do not manually patch these surfaces for one game.

## Shared CSS first

Before creating CSS, check the shared layers:

- `games.css`
- `board-contract.css`
- `how-to-card.css`
- `board-status.css`
- `platform-extra.css`
- `polish-v3.css`
- `ui-safety.css`

Create game-specific CSS only for visuals unique to the mechanic, then list that file under the game’s presentation override. Never add a post-build script just to inject one game stylesheet.

## Ranking and practice invariants

Do not weaken these contracts for a new game:

- Easy ×1 / Medium ×3 / Hard ×5
- account-bound server-issued ranked attempts
- server-side deterministic proof verification
- server-calculated ranked time and score
- full Solution/Guide makes the current attempt practice-only
- Hint may remain ranked with a penalty
- Daily reward is once per account/game/date/difficulty
- client code does not decide final Ranking Points

The proof format may be game-specific; the surrounding ranked lifecycle is shared.

## SEO/content launch check

The build audit checks:

- title, description, canonical and one H1
- no duplicate canonical URLs
- no dead internal links/assets
- game ↔ guide links
- sufficient game-page and guide content
- sitemap coverage
- no accidental noindex on launch game routes
- no public link to the private Content Desk
- Game Registry ↔ verifier parity

Do not manually maintain sitemap URL lists.

## Private Content Desk

`/snapdesk-74kq/` remains private/noindex and must never be added to public navigation or sitemap. Social content uses the Game Registry and Presentation Registry, so a new game receives baseline template copy and a social hook automatically. Add a custom social renderer only when needed.

## Deployment discipline

GitHub CI is the validation gate for iterative work. Production Cloudflare deployment remains a separate manual decision after the chosen launch head is reviewed. Never use a deployment as a substitute for a clean build/test/audit run.
