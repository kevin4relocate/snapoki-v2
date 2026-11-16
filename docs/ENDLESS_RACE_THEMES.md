# Endless Race themes — shared engine (preview)

## Architecture

The race experience is a configurable screensaver, not a set of copied games:

```text
src/js/endless-race/
  engine.js              Common physics, deterministic roster, camera, Top 5, picker,
                         Pause/Resume/Restart/Stop, Web Audio and Wake Lock
  themes/
    flag.js               196 countries, flags, original selected roster and facing inventory
    animal.js             24 animals, animal icons, new selected roster and facing inventory
src/js/games/
  world-loop.js           Flag entry adapter (retains /world-loop/ and public exports)
  animal-loop.js          Animal entry adapter (/animal-loop/)
src/styles/
  world-loop.css          Shared race visuals and responsive controls
  animal-loop.css         Calm green Animal accents, names and no miniature flags
src/js/social-renderers/
  world-loop.js           Shared race social artwork
  animal-loop.js          Same drawing pipeline on Animal's own generated roster
```

The same `createEndlessRace({host,theme,...})` instance handles both screens.
Theme objects define the display name, selection list, labels, default roster,
storage key, mascot/facing inventory, optional audio source and whether the
miniature secondary flag badge appears. The engine does not assign an advantage
to individual animal species or countries; only a reproducible RNG controls
starting speed traits and temporary bursts.

**Flag** keeps all 196 country choices, the original URL `/world-loop/`, and
`snapoki:world-loop:roster:v1` browser storage. **Animal** uses 24 animal
characters at `/animal-loop/`, does not display country flags, and stores
its own preferences at `snapoki:animal-loop:roster:v1`. Switching theme pages
does not alter the saved roster of the other theme.

Shared features: auto-start an eight-racer session with optional Sound **off**
by default, 4–12 racers, Cruise / Dynamic / Sprint live changes, dynamic Top 5
and `+N more`, a fixed-size leader/scoreboard, search/Add/Remove/Random,
Pause/Restart/Stop, Full Screen, Wake Lock, audio crossfade and volume controls,
and foreground-only animation while visible. Both simulations are guest-only
and do not create D1 records or public leaderboards.

## Adding a new theme

1. Add a theme data module with `id`, `mode`, `name`, `singular`,
   `plural`, `searchLabel`, `storageKey`, `defaultCodes`, `items`,
   `picker`, `showMiniBadge`, `mascots` and `faceRight`.
   Each item needs a unique `code`, `name` and `flag` or `emoji`.
2. Create the small `src/js/games/<slug>.js` adapter that calls
   `createEndlessRace({...options,theme})` and exports
   `generate<PascalCaseSlug>(difficulty,seed)`.
3. Add its `withContract` registry entry as
   `experienceType:'simulation'`, with `capabilities.daily=false` and
   `ranking.enabled=false`, own SEO, four or more how-to steps, and a
   game-specific guide.
4. Configure presentation and theme-only CSS, and add a social renderer.
   Reuse `world-loop.css` rather than copying the engine or the generic UI.
5. Run `npm run check && npm run build && npm test && npm run test:browser`.
   Confirm the new page at desktop, 390px and 320px, and ensure no horizontal
   overflow or hidden buttons.

## Preview and merge

PR #36 intentionally remains open for a visual review of Flag and Animal.
Preview Pages deployments, if enabled in the existing Cloudflare Git integration,
should expose `/world-loop/` and `/animal-loop/` on the **same deployment URL**.
GitHub Actions verify the build; they do not deploy or establish a live preview.
Never assume `snapoki.com` changed until Cloudflare production deploys main.

Do not merge a new theme or shared-engine change until all existing nine games,
both simulation routes, CI and user review pass. No remote D1 changes are needed.
