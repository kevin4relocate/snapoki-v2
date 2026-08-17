# Snapoki Launch & Game Expansion Guide

This is the short operational checklist for adding Game #7 through Game #100+. Detailed ownership rules live in [`ARCHITECTURE.md`](../ARCHITECTURE.md), and Content Desk integration is locked by [`CONTENT_DESK_PLUGIN_CONTRACT.md`](../CONTENT_DESK_PLUGIN_CONTRACT.md).

## Principle

A new game extends the platform. It must not create a second header, footer, account flow, Daily shell, Rankings UI, result modal, sitemap process, generic How to Play layout or game-specific branch inside Content Desk core.

If adding a game requires editing many shared surfaces manually, the missing concept probably belongs in the shared runtime, Game Registry, Presentation Registry or the game plugin itself.

## Required work for a new game

1. Add one game definition to `src/js/games-config.js`.
2. Add one stable public engine entry at `src/js/games/<slug>.js` exporting both `createGame()` and the deterministic generator `generate<PascalCaseSlug>()`.
3. Add `src/js/social-renderers/<slug>.js` exporting `drawSocialBoard(ctx, puzzle, box)` for the unsolved social image.
4. Add the mechanic-specific result verifier to `RESULT_VERIFIERS` in `functions/_lib/scoring.js`.
5. Add deterministic generator, gameplay and verifier tests.
6. Run `npm run build` and `npm test`.

The build audits fail if a registered game has duplicate ids/slugs, is missing its route, stable engine/generator, social renderer, guide, verifier, shared UI contracts or sitemap coverage.

## Optional game-specific work

Use `src/js/game-presentation.js` only when the game needs one of these:

- special compact How to Play wording
- a control label other than `Solution`
- genuinely mechanic-specific CSS
- a custom social-image hook
- an optional homepage spotlight

Add `socialInsight` to the Game Registry entry when the generic description is not specific enough for reusable social strategy copy.

Use `scripts/launch-readiness.mjs` only for a richer editorial strategy section or custom guide artwork when the generic fallback is not strong enough.

A simple game should be able to launch without any game-specific stylesheet, but every production game provides its own small social renderer plugin so Content Desk never needs a central renderer switch.

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
- related-game/guide links where the shared generators provide them
- sitemap and structured data
- social-content template rotation
- Content Desk engine/renderer discovery

Do not manually patch these surfaces for one game.

## Content Desk: files not edited per game

A normal new game must not require changes to:

- `public/snapdesk-74kq/index.html`
- `src/js/admin-content.js`
- `src/js/social-game-board.js`
- `functions/api/snapdesk-74kq/content.js`
- `functions/_lib/social-content.js`

The loader discovers `games/<slug>.js` and `social-renderers/<slug>.js` automatically. `scripts/admin-plugin-audit.mjs` enforces this contract and rejects game-specific literals in Content Desk core.

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

Game pages are intentionally play-first. Long-form strategy and search content lives in each dedicated guide.

The build audit checks:

- title, description, canonical and one H1
- no duplicate canonical URLs
- no dead internal links/assets
- dedicated guide existence and guide-to-game link
- sufficient guide content
- no long editorial filler accidentally returning to game pages
- sitemap coverage
- no accidental noindex on launch game routes
- no public link to the private Content Desk
- Game Registry ↔ verifier parity

Do not manually maintain sitemap URL lists.

## Private Content Desk

`/snapdesk-74kq/` remains private/noindex and must never be added to public navigation or sitemap. Social copy selects directly from the Game Registry, and the board artwork loader discovers each game plugin by slug. New games therefore join the Content Desk without editing admin orchestration.

## Deployment discipline

GitHub validation is the release gate for iterative work. Production Cloudflare deployment remains a separate manual decision after the chosen main-branch head is reviewed. Never use a deployment as a substitute for a clean build/test/audit run.
