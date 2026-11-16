# Snapoki Ambient Engine — Natural Swim (Phase 1)

## Purpose and architecture

Aquarium Loop is the first **non-racing** ambient experience, built next to
the existing Flag and Animal race themes. It does not change the shared
Endless Race Engine or its Top 5 scoreboard. Both engines share Snapoki's
page shell, no-account policy, static release pipeline, native Full Screen
capability and local browser preferences.

The Swim family is intentionally separate from the Race family:

```text
src/js/endless-race/
  engine.js               Race: fixed lanes, distances, Top 5, live pace and sound
  themes/{flag,animal}.js

src/js/ambient/
  swim.js                 Pure 2D movement: targets, gentle steering,
                          separation, boundaries, normalized positions
  engine.js               Ambient screensaver: RAF, scene, selection,
                          live pace, optional sound, fullscreen and Wake Lock
  themes/aquarium.js      16 species, default eight, local storage key

src/js/games/aquarium-loop.js          Small registry entry adapter
src/styles/aquarium-loop.css           Water, bubbles, swaying reeds, responsive UI
src/js/social-renderers/aquarium-loop.js  Native social preview
```

## Behavior

- Starts an eight-creature aquarium automatically; no music/audio autoplay.
- Change opens a searchable 16-item picker. Select four to twelve unique
  creatures, or choose Random 8. Invalid/old browser storage safely falls
  back to eight defaults.
- Drift, Flow and Playful **change swim speed without resetting positions**.
  Pause and Resume preserve the current movement. Restart creates new
  seeded paths using the selected animals. Change suspends animation and
  exposes the picker; no database or session history is stored.
- Movement updates with requestAnimationFrame only while the document is
  visible and the aquarium is running. No requestAnimationFrame continues
  while paused or after Stop / destroy.
- Physics operates in normalized [0,1] coordinates, clamps frame delta and
  enforces soft tank boundaries. Fish turn gradually toward a moving target
  and avoid nearby swimmers gently; there is no leader, score, finish line
  or species-specific speed advantage.
- A procedural filtered Web Audio ocean sound is opt-in, browser-local and
  requires no remote files. Independent mute and volume are available.
- Full Screen with optional Wake Lock; selection data persists in
  `snapoki:aquarium-loop:roster:v1`, separate from Flag and Animal.

## Display and roadmap

The scene uses CSS gradients, bubbles, reed silhouettes and emoji sea
creatures. It is a lightweight **2D illustration**, not photorealistic fish
behavior. Emoji art varies between browsers/platforms. Later upgrades
may replace the creature sprites with original SVG/PNG character sets,
while keeping the animation data and control modules unchanged.

Do not pretend the same swim movement can implement Orbit or Parade
directly. Those need separate motion modules; shared UI/audio/selection
can be extracted into stable Ambient components when a second distinct
motion type is ready.

## Validation / preview release

```sh
npm run check
npm run build
npm test
npm run test:browser
```

Unit tests verify deterministic positions, gentle rotation, bounds over
thousands of simulation steps, pace ordering, 4–12 selection and generated
routes. Chromium confirms auto-start, actual motion, no race scoreboard,
Pause/Resume, settings, Stop and species selection, and 390/320px layout.
The CI PR artifact includes a desktop and picker screenshot for the new
aquarium, alongside the existing two race themes. Keep the PR open for
visual review; CI success does not guarantee a Cloudflare preview deployment.
