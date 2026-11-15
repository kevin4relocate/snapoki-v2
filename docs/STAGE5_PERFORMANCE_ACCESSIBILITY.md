# Stage 5 — Animation performance, responsive layout, accessibility

Scope: optimize the existing 8-game guest-only site without changing game rules, D1 storage, production Cloudflare settings or the unmerged Animal Chess PR.

## World Loop lifecycle

The endless race renders via one requestAnimationFrame loop **only** while a session is active and the document is visible. The lifecycle is:

- Setup/Stop: no animation frame is queued.
- Start/Resume: queue a single animation frame, then request Wake Lock if available.
- Pause: cancel the queued frame and suspend any currently playing race audio.
- Hidden tab: cancel frames, release Wake Lock and suspend race audio. Keep distances and the chosen roster.
- Visible tab: resume the same session only if the race was running; set a new frame baseline so background time is not incorrectly added to the race.
- Destroy: cancel the frame, release Wake Lock, close audio and remove listeners.

**Important behavior:** The simulation no longer accumulates distance while its tab is hidden. This is deliberate foreground-only behavior, saving CPU and battery and avoiding large time jumps. The user's explicit Pause state persists across tab changes.

Web Audio scheduling looks ahead 25 seconds rather than 15 minutes. Sound still requires explicit user activation, crossfades remain 10 seconds, and race Pause/Stop preserve their existing audio semantics.

## Shared game timer and Daily

The game timer displays real elapsed wall time but avoids updating the DOM every 250ms in a hidden tab. The Daily UTC countdown interval also sleeps when hidden and resumes with a fresh UTC date check when the document becomes visible. Daily boards still rotate at midnight; a tab hidden across midnight reloads its Daily board on return.

## Mobile and keyboard accessibility

- Strong `:focus-visible` outlines work on buttons, links, inputs and other focusable controls.
- Key controls target at least 44 CSS pixels on narrow screens, including the World Loop country picker and race controls.
- World Loop toolbar wraps rather than forcing page-wide horizontal scrolling; selected country labels remain readable.
- Country picker exposes `aria-controls`, `aria-expanded`, `aria-pressed` and accessible removal labels; Escape returns focus to Add Country.
- Smooth board scrolling respects `prefers-reduced-motion`; cosmetic animations are disabled for that preference, without disabling gameplay itself.

## CI quality gates

```bash
npm run check
npm run build
npm test
npm run test:browser
```

Chromium smoke tests now open all eight games at desktop size and at 390px and 320px widths. They reject page-wide horizontal overflow, check mobile menu keyboard Enter/Escape/focus behavior, and check World Loop Start/Pause/Resume/Stop against RAF scheduling and elapsed-time stability.

This is a functional/browser regression suite, **not** a real-device Core Web Vitals or WCAG certification. Remaining manual checks for production: iOS Safari and Android Chrome touch gestures, responsive text at 200% zoom, VoiceOver/TalkBack, CPU/battery use on a low-end device, audio crossfades with a real uploaded MP3, and an authenticated admin Content Desk flow.

Production deploy and D1 inventory are independent of GitHub CI; see the Stage 2 and Stage 3 runbooks.
