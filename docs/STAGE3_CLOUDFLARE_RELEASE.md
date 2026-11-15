# Stage 3 — Cloudflare Pages release and cache verification

This release process keeps production data untouched. GitHub CI proves the build and browser smoke tests pass; **only Cloudflare Pages deployment state and a live read-only probe can prove what is running on snapoki.com**.

## Release architecture

`npm run build` finishes by running `scripts/version-assets.mjs` **after** guide generation, CSS integration, content generation and the platform audit. It:

1. Calculates a deterministic content fingerprint of the generated JS/CSS tree.
2. Copies the entire relative module graph into `dist/assets/r/<releaseId>/js/` and `dist/assets/r/<releaseId>/styles/`.
3. Rewrites static HTML references to the new versioned paths, including the private Content Desk HTML. Relative `import()` calls keep dynamic game engines and social renderers on the same release.
4. Writes `dist/release.json` with the 20-character release ID, per-file SHA-256 digests, build time and, where available, `CF_PAGES_COMMIT_SHA` / `GITHUB_SHA`.

The older paths in `dist/assets/js/` and `dist/assets/styles/` remain as compatible revalidated aliases, NOT immutable assets; historical profile/leaderboard browser modules remain excluded by the build.

### Cache rules

- `/assets/r/*`: `public, max-age=31536000, immutable`; never overwrite content under the same fingerprint.
- `/assets/js/*` and `/assets/styles/*`: `max-age=0, must-revalidate` (legacy compatibility).
- `/release.json`: `no-store`; the release marker must reflect the active deployment.
- HTML pages: keep Cloudflare Pages' default revalidation. **Do not enable a custom-domain Cache Everything rule that caches HTML or API responses**, because that can serve an old page linked to an unavailable asset release.

Cloudflare Pages `_headers` applies to static responses only, not Pages Functions. API responses must set their own no-store headers.

## Cloudflare production setup

In the Cloudflare Pages project `snapoki-v2`, confirm:

- Source repository: `kevin4relocate/snapoki-v2`
- Production branch: `main`
- Build command: `npm run build`
- Output directory: `dist`
- Node.js: `22` or later
- `DB` binding and private admin environment variables remain configured as before; do not expose `ADMIN_EMAIL` or API keys in `release.json`.
- No zone-level Cache Rule, Page Rule or Worker caches HTML or `/api/*` independent of Pages.
- A Pages deployment exists for the latest expected `main` commit and its build succeeded.

The GitHub Actions workflow does **not** deploy. Production deployment must be performed by the existing Cloudflare Pages Git integration or a separately authorized release process.

## Local verification

```bash
npm install
npm run check
npm run build
npm test
npx playwright install chromium
npm run test:browser
```

After a Cloudflare production deployment:

```bash
npm run verify:production -- --url https://snapoki.com --expected-commit <40-character-main-sha>
```

If you need a content-only comparison (for example when Cloudflare omitted commit metadata):

```bash
node -p "JSON.parse(require('fs').readFileSync('dist/release.json')).releaseId"
npm run verify:production -- --url https://snapoki.com --expected-release <20-character-release-id>
```

The verifier performs **read-only GETs** for the release marker, public HTML, private noindex HTML, versioned JS/CSS bytes (compared with the manifest hashes), deprecated/unknown API response codes and the guest-only configuration. It does not access private D1 records or perform admin login.

## Rollback

1. If the new Pages deployment fails live verification, use Cloudflare Pages' existing rollback mechanism to restore the last known-good deployment.
2. Verify that its `release.json`, HTML and versioned assets all agree with one another, and check the guest-only API behavior again.
3. Do not revert or mutate D1 as part of a static release rollback.
4. Investigate browser cache or custom-domain Cache Rules only after comparing the actual HTML reference, release marker and asset response. A zone-level cache purge may be necessary for incorrect externally configured cache rules, but purging alone is not a permanent fix.

## Release checklist

- [ ] Pull request checks, build, all unit tests and Chromium smoke tests pass
- [ ] PR merged after review, commit SHA recorded
- [ ] Cloudflare Pages production deployment succeeded for that SHA
- [ ] `npm run verify:production` passed against `snapoki.com`
- [ ] Content Desk sign-in and save tested by the allowlisted admin in a browser
- [ ] Rollback deployment identified and production logs checked
