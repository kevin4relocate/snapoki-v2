# Content Desk Game Plugin Contract

## Goal

The Snapoki Content Desk must scale from the current game set to 100+ games without adding game-specific branches, imports or UI code to the admin system.

Adding a game must not require edits to:

- `public/snapdesk-74kq/index.html`
- `src/js/admin-content.js`
- `src/js/social-game-board.js`
- `functions/api/snapdesk-74kq/content.js`
- `functions/_lib/social-content.js`

If a new game appears to require an edit to one of those files, the missing behavior belongs in the game plugin, Game Registry or Presentation Registry instead.

## Discovery convention

For a registered game whose public slug is `<slug>`:

### Game engine

File:

`src/js/games/<slug>.js`

The module must keep the normal `createGame()` contract and export its deterministic puzzle generator using the slug converted to PascalCase:

- `maze` → `generateMaze()`
- `echo-step` → `generateEchoStep()`
- `number-path` → `generateNumberPath()`

The Content Desk derives this export name automatically. It does not maintain a generator map.

### Social renderer

File:

`src/js/social-renderers/<slug>.js`

Required export:

```js
export function drawSocialBoard(ctx, puzzle, box) {
  // Draw the unsolved puzzle state into the supplied canvas box.
}
```

Shared canvas primitives live in:

`src/js/social-renderers/shared.js`

Do not put a renderer switch statement back into `social-game-board.js`.

## Content copy

`functions/_lib/social-content.js` selects games directly from `GAMES` in `src/js/games-config.js`.

It must not contain a list or map of game ids. Generic copy uses the registered game description. A game may optionally add a `socialInsight` field to its Game Registry entry if a more specific reusable insight is useful.

Special image hooks belong in the Presentation Registry. Its generic fallback keeps a new game functional even before special wording is added.

## Runtime fallback

The Content Desk dynamically loads the engine and renderer by slug.

If a plugin cannot be loaded at runtime, the admin must remain usable and render a generic Snapoki fallback card rather than crash. CI still requires every registered production game to provide its renderer so missing artwork is caught before release.

## CI enforcement

`scripts/admin-plugin-audit.mjs` runs during `npm run build` before the final platform audit. It verifies that:

- Content Desk core files contain no registered game-id/slug literals.
- the generic dynamic loader convention is still present.
- every registered game has `src/js/games/<slug>.js`.
- every engine exposes the convention-based generator function.
- every registered game has `src/js/social-renderers/<slug>.js`.
- every renderer exports `drawSocialBoard()`.

`tests/admin-content.test.mjs` independently locks the same architectural behavior.

## New game checklist

For game #7 through game #100+, the Content Desk portion of the work is therefore only:

1. Register the game normally in `games-config.js`.
2. Implement `src/js/games/<slug>.js` and expose the deterministic generator convention.
3. Implement `src/js/social-renderers/<slug>.js`.
4. Add the normal ranked verifier and mechanic tests.
5. Optionally add `socialInsight` or a Presentation Registry social hook when special copy is worthwhile.

There is no admin page, admin API, admin client or social-loader edit in this checklist.
