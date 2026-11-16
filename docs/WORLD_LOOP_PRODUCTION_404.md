# World Loop 404: production diagnosis and release

World Loop **is included in the repository** as `src/js/games/world-loop.js`. The static builder creates `dist/world-loop/index.html`, the dedicated guide at `dist/blog/how-to-play-world-loop/index.html`, social renderer, immutable release JS/CSS and `dist/audio/world-loop/endless-circuit.mp3`. `public/_routes.json` sends only `/api/*` to Pages Functions, so the World Loop path is a static Pages route.

A green GitHub Actions build proves that the release files exist in the CI workspace. **It does not prove that Cloudflare has published that commit to snapoki.com.** If the homepage still advertises 7 puzzle games, but GitHub main advertises 9 games, the live site is older than main, or the custom domain points to a different Pages deployment/project.

## 1. Confirm actual Cloudflare project and deployment

In Cloudflare dashboard → **Workers & Pages**, find the existing Pages project serving `snapoki.com` (the repository uses the Wrangler name `snapoki-v2`, but do not assume the Pages project is still named that). Check **Custom domains** to ensure the hostname belongs to that Pages project, then **Deployments** to record:

- Production branch must be `main`.
- Connected repository should be `kevin4relocate/snapoki-v2`.
- Latest production deployment should reference the current GitHub `main` commit.
- Build command: `npm run build`; build output directory: `dist`; project root: repository root. Use Node.js 22.
- Check the **Cloudflare build logs**, not only GitHub Actions. GitHub's test workflow does not deploy.
- If automatic production builds are disabled in Pages **Settings → Builds → Branch control**, enable them or explicitly trigger a redeploy via the existing Cloudflare project. Do not create a new Pages project when the domain already points to an existing one.

When a deployment has succeeded, visit its unique `*.pages.dev` deployment URL. Test `/world-loop/` there **before** concluding that the custom domain is working.

## 2. Distinguish stale deployment from domain cache

- If `https://<existing-project>.pages.dev/world-loop/` succeeds but `https://snapoki.com/world-loop/` returns 404 or an old page, check the custom domain / zone's Cache Rules, legacy Page Rules, Redirect Rules and Workers. Cloudflare Pages has its own cache; a custom-domain `Cache Everything` rule may serve stale HTML or stale 404s.
- If **both** the Pages deployment URL and custom domain return 404, inspect the production deployment's source commit, build command, output directory and build log. A `main` push is not enough if the Git integration is disconnected or auto builds are off.
- If `/release.json` is missing, it is not the Stage 3+ output, or the domain is serving a different project. Do not fix this by adding an SPA fallback redirect: it would mask the missing static page.

## 3. Verify deployed World Loop route and assets

After the authorized Cloudflare deployment, run against the expected main commit:

```sh
npm run verify:production -- --url https://snapoki.com --expected-commit <current-main-40-character-sha>
```

This read-only verifier checks the production `release.json`, commit, all major routes, `/world-loop/`, the fingerprinted World Loop JS/CSS/social files, the audio file, the retired public player APIs and the guest-only config.

Alternatively use GitHub → **Actions → Verify Cloudflare production routes → Run workflow** (select `main`, site URL `https://snapoki.com`). This workflow does not deploy or require Cloudflare secrets. It fails if production is still stale, making the discrepancy visible.

## 4. CI and gameplay regression coverage

```sh
npm run check
npm run build
npm test
npm run test:browser
```

The build must produce `dist/world-loop/index.html`. Unit tests validate registry, sitemap, asset manifest, guide, included MP3 and recovery from corrupted saved country selections. Real-browser smoke tests load both the canonical route and the physical index, verify the country picker is usable after a malformed localStorage value, and test Start, Pause, Resume, Stop and mobile widths.

Do not delete or alter D1 when resolving this issue; World Loop is a guest-only static experience. No new database migration is needed.

**Remaining external action:** Cloudflare deployment status and the actual HTTP response at `snapoki.com` cannot be changed by merging GitHub code alone without an authorized Pages deployment path.
