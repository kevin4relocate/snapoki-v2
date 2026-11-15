# Stage 6 — Animal Chess (Dou Shou Qi) release checklist

## Implementation

Animal Chess adds the standard 7 × 9 Dou Shou Qi board to Snapoki. Red moves first; each side has Rat, Cat, Dog, Wolf, Leopard, Tiger, Lion and Elephant. Only Rats enter rivers; Lions and Tigers jump over a river without a Rat blocking the water. Special Rat-versus-Elephant capture and enemy trap rank reduction are handled by the shared legal-move engine.

Play locally with two people or against Blue CPU at Easy, Smart and Expert levels. Keyboard arrows move focus, Enter selects or moves; the game offers Undo, New, an optional sound toggle, captured-piece displays and match status. The 120-move no-capture draw rule prevents unending matches. No public login, Daily Challenge or rankings are required.

## Rebase from obsolete PR #22

The historical PR `preview/animal-chess` was based on main before Stages 1–5 and cannot merge cleanly. The integration branch `feature/stage6-animal-chess-integrated-20261115` starts from current `main`, selectively ports its game engine, social renderer, CSS and rules tests, and adapts them to the shared runtime.

- `experienceType:'board'` and explicit `guide` live in `src/js/games-config.js`.
- `src/js/game-guide.js` generates precise Board Game copy and match controls. The obsolete `scripts/animal-chess-guide-fix.mjs` is **not** added or run.
- `src/js/game-presentation.js` loads `animal-chess.css` through the HTML page shell and Stage 3 versioned asset manifest. There is no runtime insertion of an unversioned `/assets/styles/animal-chess.css` link.
- The game route, guide, social renderer and page are still audited by the generic plugin/platform CI tests.
- The Board Games navigation moves Animal Chess out of the general More Games dropdown; the mobile menu includes it too.

## Quality gates

```bash
npm run check
npm run build
npm test
npm run test:browser
```

Automated tests cover starting pieces, rules, capture exceptions, river jumps and blockers, traps, legal moves, draw conditions, CPU move legality and deterministic response, as well as the 7×9 board and keyboard/gameplay on Chromium. Stage 5 mobile smoke checks also run on 390px and 320px widths.

**Before public release**, check on a real phone (especially browser audio and narrow portrait mode), verify all CPU levels and Undo on a longer match, then confirm Cloudflare Pages deployed the new `main` SHA by running `npm run verify:production -- --expected-commit <sha>`. This command reads production but does not inspect D1.

No remote D1 modification or cloud deployment is performed by the GitHub CI/merge itself. Public player APIs remain retired. The former PR #22 may be closed as superseded only after the replacement integration PR has merged successfully.
