# Snapoki V2

A clean-room rebuild of Snapoki: five free browser puzzle games on one consistent platform.

## Included games

- Maze
- Number Path
- Color Connect
- Lights Out
- Loop Puzzle

Every game ships with Easy / Medium / Hard, Unlimited play, a deterministic Daily Challenge, Hint, Solution, Reset Puzzle, a shared result modal, cumulative per-game Rankings, and a compact player profile.

## Architecture principles

1. **Build-time shared templates.** Header and Footer are generated from one template into every page. They are not rebuilt after page load, so navigation does not shift when auth resolves.
2. **One platform contract.** All five game pages use the same left controls, right rail, Daily Challenge and result UI.
3. **Game engines stay isolated.** A game owns only its puzzle rules and board rendering. It does not own auth, rankings, profile, result persistence or site navigation.
4. **One auth source.** `/api/me` is the only session-state endpoint used by the UI.
5. **One result write endpoint.** Ranked finishes go to `POST /api/results`.
6. **Migrations only.** Production Functions never create or alter D1 tables at request time.
7. **No runtime patching.** There is no MutationObserver-based UI repair, legacy override layer or versioned patch chain.

## Brand

Primary palette:

- Background `#080B14`
- Surface `#12172A`
- Primary Violet `#7357FF`
- Accent Cyan `#28C9F5`
- Success Mint `#37D99A`
- Text `#F5F7FC`
- Muted `#9CA6BD`

Editable vector sources live in `public/brand/`.

Generate downloadable PNG assets at any time:

```bash
npm run brand
```

The generator uses only the Node.js standard library and produces logo marks, favicon PNGs, Apple Touch Icon and the social sharing card. SVG remains the source of truth.

## Local build

```bash
npm run brand
npm run build
npm test
```

The generated static site is written to `dist/`.

## Cloudflare D1

Database:

- Name: `snapoki-v2-db`
- ID: `1ff03f04-d7e6-4549-b750-89801c56c3c0`
- Binding: `DB`

Apply the migration once before testing account/ranking features:

```bash
npx wrangler d1 migrations apply snapoki-v2-db --remote
```

The migration creates only:

- `users`
- `sessions`
- `results`

## Cloudflare Pages

Recommended project configuration:

- Repository: `kevin4relocate/snapoki-v2`
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`

`wrangler.toml` already contains the D1 binding. Verify that the Pages project shows the `DB` binding after the first deployment.

## Google sign-in

Snapoki uses Google Identity Services only when the user opens the Login modal. The Google script is **not** loaded into the header during initial page rendering.

Add this Cloudflare Pages environment variable:

```text
GOOGLE_CLIENT_ID=<your Google OAuth Web Client ID>
```

The backend verifies the Google ID token audience before creating a Snapoki session. Sessions are stored in D1 using a SHA-256 hash of a random token; the raw token is sent only in a Secure, HttpOnly, SameSite=Lax cookie.

## API

```text
GET  /api/config
GET  /api/me
POST /api/auth/google
POST /api/logout
POST /api/results
GET  /api/rankings?game=maze
GET  /api/profile?game=maze
```

## Rankings

Each game has one cumulative leaderboard. Every eligible finish earns server-calculated Ranking Points. Difficulty, score, Daily mode and hints affect the points awarded. Viewing a full Solution makes the current run practice-only and it is not inserted into `results`.

## SEO

The build outputs:

- SEO homepage
- SEO content on all five game pages
- Canonicals
- Open Graph / Twitter metadata
- JSON-LD
- `sitemap.xml`
- `robots.txt`
- `manifest.webmanifest`
- About / Help / Privacy / Terms
- 404 page

## Tests

The CI suite verifies:

- deterministic and solvable game generation
- all five game engine contracts
- identical Header/Footer markup across Homepage + all game pages
- shared left/right game UI contract
- no MutationObserver platform patching
- no runtime D1 schema creation
- exact three-table migration
- SEO build essentials
- ranking point rules
