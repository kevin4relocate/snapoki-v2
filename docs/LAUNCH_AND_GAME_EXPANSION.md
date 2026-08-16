# Snapoki Launch & Game Expansion Guide

This document defines the production structure to preserve after launch. The goal is simple: adding Game #6, #7, #8 and beyond should extend the shared platform instead of creating a new one-off page stack for every game.

## Source of truth

`src/js/games-config.js` is the public game registry. A new game should be represented there with its key, slug, display name, category, tagline, description, difficulty labels, How to Play rules, capabilities and ranking contract.

The shared build already reads this registry for the site header, footer game links, homepage game cards and game routes. Server-side validation uses the shared game registry as well.

## Shared page shell

Do not create a custom header/footer/account system for a new game. Game pages use the existing shared shell and lifecycle:

- header and responsive navigation
- account/login state
- Easy / Medium / Hard selector
- Regular Play / Daily Challenge
- shared Hint / Solution / Reset behavior
- result modal
- Rankings neighborhood
- profile and Difficulty Mastery
- Daily progress and streak UI
- footer and guide links

Game-specific code should stay inside its engine plus the minimum renderer/controller hooks required by the shared lifecycle.

## Launch SEO pipeline

The production build ends with `scripts/launch-readiness.mjs`. It runs after the normal build and UI polish and intentionally reads `GAMES` from the shared registry.

It currently handles:

- technical SEO metadata normalization
- `robots.txt`
- sitemap generation from the actual built canonical pages
- Open Graph / Twitter metadata support
- Organization, Breadcrumb, WebApplication and HowTo structured data
- `/blog/` guide index
- one generated How-to guide for every registered game
- one non-solution SVG board preview for every registered game
- compact guide/internal-link section on every game page
- custom 404 page
- contact cleanup so email is not displayed in the global footer

Because the guide and sitemap are registry-driven, registering a future game automatically gives it baseline discovery coverage. Add a game-specific strategy entry to the `GUIDE` map in `launch-readiness.mjs` when you want richer editorial copy; if omitted, the generator has a safe fallback based on the game config.

## Brand assets

`scripts/generate-brand.mjs` is the only place that should generate the core Snapoki mark assets. It writes:

- SVG logo mark
- SVG wordmark
- SVG favicon
- PNG logo sizes
- 32×32 favicon
- Apple touch icon
- social sharing card
- web app manifest

Do not hand-edit generated copies in `dist/`; `dist/` is rebuilt.

## Adding Game #6

Use this sequence:

1. Add the game definition to `src/js/games-config.js`.
2. Add the game engine under `src/js/games/` and register its loader in the shared game loader.
3. Add server proof regeneration/verification before enabling ranked results.
4. Add deterministic generator tests for Easy, Medium and Hard.
5. Add lifecycle/interaction regressions specific to the game.
6. Add a strategy override in the launch guide map if the generic guide is not editorially strong enough.
7. Run `npm run build` and `npm test`.
8. Confirm the generated game route, guide route, SVG guide preview and sitemap entry exist.
9. Only then retry the disabled Cloudflare Pages deployment.

Do not manually edit sitemap URLs, duplicate footer links, create a separate page header, or write another account/ranking implementation.

## Ranking and practice invariants

These platform contracts are shared and should not be weakened for a new game:

- Easy ×1 / Medium ×3 / Hard ×5
- server-issued ranked attempts
- server-side proof regeneration and score calculation
- Solution makes the current attempt practice-only
- Hint may remain ranked with a score penalty
- Daily reward is once per account/game/date/difficulty
- Regular fresh-puzzle rotation remains account-aware
- client code never decides its own final Ranking Points

## Contact placement

`contact@snapoki.com` is intentionally not displayed in the global footer. Visible contact information belongs on pages where a user reasonably needs it, currently Help, Privacy and Terms.

## Deployment discipline

Cloudflare production deployment is intentionally disabled on normal `main` pushes. Use GitHub CI for iterative work. Retry the Cloudflare Pages deployment only after the chosen launch head has a clean build and test run.
