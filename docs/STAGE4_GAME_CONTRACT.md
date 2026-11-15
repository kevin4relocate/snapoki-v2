# Stage 4 — Extensible game and editorial plugin contract

Snapoki has **one** game registry, game shell, Content Desk and guide pipeline. A game declares its experience type, capabilities and optional editorial overrides instead of editing built HTML.

## Registering a game

Add a configuration using `withContract({...})` in `src/js/games-config.js` and set `experienceType` to:

| Type | Purpose | Default Daily | Default ranked |
| --- | --- | --- | --- |
| `puzzle` | Find a solution to a generated board | enabled | legacy metadata enabled |
| `board` | Turn-based match with moves and win/loss conditions | disabled | disabled |
| `simulation` | Interactive or observational experience | disabled | disabled |

`experienceType` is **not** the menu `category` and is not inferred from `capabilities.daily`. Always specify it for board and simulation games. Public gameplay remains guest-only, even if legacy puzzle `ranking` metadata is present; no public player result endpoint is re-enabled.

A new game must supply `key`, `slug`, `name`, `category`, `description`, `levels`, `howTo`, `metrics`, `seoTitle`, `seoDescription` and the existing presentation/engine/social plugin contracts. The plugin audit checks identifiers, allowed types, mandatory gameplay instructions, available controls and any explicit guide overrides.

## Optional guide configuration

The guide generator calls `getGameGuide(game)` from `src/js/game-guide.js`. It uses the experience type for fallback text, then known game-specific guide data, then optional `game.guide` overrides.

```js
withContract({
  key: 'animal-chess',
  slug: 'animal-chess',
  experienceType: 'board',
  category: 'Board',
  // ...existing fields, engine and social renderer...
  capabilities: {
    hint:false, solution:false, solutionSteps:false, daily:false, ranking:false
  },
  ranking:{enabled:false,proofType:'none',scoreModel:'none'},
  guide:{
    focus:'Explain the actual objective, board and special terrain.',
    tips:[
      'Explain one concrete early-game tactic.',
      'Explain one important match-planning decision.',
      'Explain what to watch during the next turn.'
    ],
    mistakes:[
      'Explain a real illegal or strategically costly move.',
      'Explain a rule beginners frequently misunderstand.',
      'Explain a common tactical mistake.'
    ],
    controls:{
      heading:'Controls',
      body:'Explain local play, computer modes, piece selection and reset/undo.'
    },
    format:{
      heading:'Match format',
      body:'Explain who moves first, the win conditions and how a match ends.'
    },
    difficultyCopy:'Explain opponent difficulty instead of puzzle board size.',
    ctaCopy:'Invite the player to start a local or CPU match.'
  }
})
```

For `guide.tips` and `guide.mistakes`, use at least two nonempty strings; `guide.controls` and `guide.format` each require a `heading` and `body`. The guide generator HTML-escapes all editable copy. A board game **must not** inherit World Loop's endless-race instructions merely because its Daily feature is disabled.

### Presentation and runtime

- `src/js/game-presentation.js` provides generic puzzle, board and simulation goal/tool fallback labels. A game may override them with keyed `PRESENTATION` data, including custom styles and social hooks.
- `src/js/games/<slug>.js` exports `createGame()` and a deterministic `generate<PascalCaseSlug>()`.
- `src/js/social-renderers/<slug>.js` exports `drawSocialBoard()`.
- `functions/_lib/scoring.js` retains one result verifier entry per registered game, with `return null` for unranked experiences, for current compatibility.
- `scripts/launch-readiness.mjs` renders guide copy by calling `getGameGuide(game)`, and the normal build handles generated pages and immutable JS/CSS URLs.
- Never insert a per-game HTML string replacement script after the guide generator. Such scripts depend on fragile exact HTML and can regress during unrelated copy changes.

## Animal Chess PR #22

The existing PR #22 predates this contract. During **Stage 6**, update that PR/branch to set `experienceType:'board'`, provide accurate `guide` copy or a dedicated guide-data entry, remove the `scripts/animal-chess-guide-fix.mjs` build step, and resolve differences with the Stage 3 immutable asset pipeline. Do **not** merge it merely because the generic guide fallback is available: its game logic and controls still require their own tests.

## Validation

```bash
npm run check
npm run build
npm test
npm run test:browser
```

The new `experience-types.test.mjs` exercises an unregistered board-game fixture and a simulation fixture to ensure that a future game cannot silently inherit World Loop's controls or puzzle-specific Daily guidance. The normal browser smoke suite covers all currently registered games.

After merging, validate the Cloudflare production deployment separately using `npm run verify:production`. Stages 2 and 3 do not imply that remote D1 or Cloudflare production has been inspected.
