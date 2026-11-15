# Stage 2 — Guest-only security and D1 legacy inventory

This document is a **read-only operating runbook**, not a database migration.

## Current product boundaries

- Public games are guest-only. They do not submit results to D1 or require a player session.
- Player APIs `/api/profile`, `/api/rankings`, `/api/global-rankings`, `/api/results`, `/api/runs/start`, and `/api/runs/reveal` return HTTP 410 at the Cloudflare Pages middleware boundary.
- Unknown `/api/*` routes return HTTP 404 by default. New routes require an explicit allowlist update and security tests.
- Active API routes: `/api/auth/google`, `/api/logout`, `/api/me` (admin-only), `/api/config` (accounts disabled), `/api/snapdesk-74kq/auth-config`, and `/api/snapdesk-74kq/content`.
- Only private Content Desk may create/administer sessions; the public site does not offer player login.
- Deprecated client profile/leaderboard JS and CSS are excluded from release artifacts, but the source and migrations remain for forensic testing and a safe rollback.

## Before touching a production D1 database

1. Confirm the Cloudflare Pages production deployment is running the reviewed `main` SHA, not a stale deployment.
2. Confirm `/api/profile` and `/api/global-rankings` return HTTP 410, and an unknown `/api/*` route returns 404.
3. Confirm the private Content Desk Google sign-in, content preview, save, regenerate, and logout still work with an allowlisted administrator.
4. Export a timestamped **remote D1 backup** via Cloudflare tooling/dashboard, protect it from public access, record where it is stored and validate that it is readable.
5. Review retention obligations and any prior real-player data. **Do not delete production data solely because the guest-only UI no longer uses it.**

## D1 inventory (read-only)

The database binding in `wrangler.toml` is `DB`; its configured database name is `snapoki-v2-db`. Use authenticated Cloudflare tooling with `--remote` only when access has been granted.

Inspect the schema before querying a table that may not exist in older environments:

```sql
SELECT name, type
FROM sqlite_master
WHERE type IN ('table','view','trigger')
  AND name NOT LIKE 'sqlite_%'
ORDER BY type, name;
```

After confirming their existence, gather **counts only** (avoid emails, Google subjects, session IDs, tokens, or individual player rows in tickets or logs):

```sql
SELECT COUNT(*) AS total_users FROM users;
SELECT COUNT(*) AS demo_users FROM users WHERE google_sub LIKE 'demo:%';
SELECT COUNT(*) AS sessions_total FROM sessions;
SELECT COUNT(*) AS legacy_results FROM results;
SELECT COUNT(*) AS legacy_ranked_attempts FROM ranked_attempts;
SELECT COUNT(*) AS game_stats_rows FROM user_game_stats;
SELECT COUNT(*) AS content_desk_rows FROM admin_social_content;
```

Also review the applied D1 migration history (typically `d1_migrations`) if that table is present. Do not re-run `0005`, `0006`, or `0007` to perform an inventory. In particular, `0007_demo_leaderboard_seed.sql` inserts fictional leaderboard users.

## Retention decision and safe cleanup

- `users` and `sessions`: **keep**; private Google admin login requires them.
- `admin_social_content`: **keep**; Content Desk requires it.
- `results`, `ranked_attempts`, `user_game_stats`: historical player state; do not drop until real-vs-demo inventory, legal retention assessment, backups, and a separate approved migration.
- Aggregated leaderboard columns and triggers on `users`: do not alter casually; migrations may assume these objects exist.
- Demo rows with `google_sub LIKE 'demo:%'`: inventory first; only remove after proving they are disposable, taking backup, and validating foreign-key dependencies.

Never apply speculative `DROP TABLE`, `DELETE FROM users`, `DELETE FROM sessions`, or destructive `ALTER TABLE` statements during this stage. Any future D1 cleanup should be a separately reviewed PR with a rehearsal against a restored backup and an explicit rollback plan.

## Release verification checklist

- [ ] `npm run check`
- [ ] `npm run build`
- [ ] `npm test`
- [ ] `npm run test:browser`
- [ ] Preview API test: retired = 410, unknown = 404, private admin authenticated
- [ ] Production deployment SHA and API responses verified
- [ ] D1 remote inventory and backup performed by authorized operator
- [ ] Data retention decision documented before destructive cleanup

**Scope statement:** Passing GitHub CI does not confirm a Cloudflare production deployment or the state of its remote D1 database.
