# `public` schema tables missing `GRANT` privileges — no migration ever declared them

- **Severity:** High (disaster-recovery gap) — does not currently affect the running production app, but would block it entirely on any fresh project setup
- **Component:** Supabase/Postgres schema — `supabase/migrations/` history (exTransact repo)
- **Found via:** provisioning a fresh, dedicated Supabase test project for `transact_automation` to run against
- **Found:** 2026-09-12
- **Status:** Found and fixed on the isolated test project only. **Not applied to production** — deliberate decision, see below. Not yet committed to the exTransact repo.

## Description

Every table in the `public` schema was missing `GRANT ... TO anon, authenticated, service_role`. No migration in exTransact's migration history ever declares these grants, so any Supabase project built purely by replaying the existing migrations (e.g. a fresh project, or a from-scratch disaster recovery) ends up with every PostgREST query failing.

## Steps to reproduce

1. Create a brand-new Supabase project.
2. Run `supabase db push` to replay every existing migration in `exTransact/supabase/migrations/`.
3. Attempt any authenticated query against `public` tables (`users`, `organisations`, `drivers`, `loads`, `addl_costs`, etc.) via the app or PostgREST directly.

## Expected result

Standard CRUD queries succeed for the appropriate roles, same as on the current production project.

## Actual result

Every query returns `permission denied for table <table>` — confirmed on `users`, `organisations`, `drivers`, `loads`, `addl_costs`.

## Root cause

The real/production Supabase project has the correct grants, but they were never captured as a migration — most likely applied once, manually, via the Supabase SQL editor, outside the tracked migration history. Anything built by replaying migrations alone (a new project, or recovering an existing one from scratch) does not get them.

## Fix applied (test project only)

Added `exTransact/supabase/migrations/20260912000000_grant_public_schema_privileges.sql`, containing the standard Supabase `GRANT` + `ALTER DEFAULT PRIVILEGES` boilerplate for `anon`/`authenticated`/`service_role`. Pushed via `supabase db push` to the dedicated test project (`anblsjhzermpeghmywwz`) and confirmed the permission-denied errors are resolved there.

## Current status on production

**Not applied.** Production is not currently broken by this — it already has the correct grants some other way. The cost of leaving this alone is that the gap stays unrecorded: if the production Supabase project is ever deleted/recreated from scratch, whoever does that will hit the same `permission denied` wall and have to rediscover this fix from zero, since it exists only as a migration file on the test project (and even that migration file is not yet committed to the exTransact repo).

**User decision (2026-09-14):** leave exTransact's repo and production Supabase project fully untouched for now — do not push this migration to production and do not commit the migration file (or the other test-setup changes) to the exTransact repo unless explicitly asked again.

## Suggested fix (when authorized)

1. Commit `20260912000000_grant_public_schema_privileges.sql` to the exTransact repo via PR, for app-team review.
2. Apply the same migration to the production Supabase project through the team's normal deploy process — it is additive-only (`GRANT`, no `REVOKE`/`DROP`), so risk of breaking existing behavior is low, but should still go through review rather than being pushed ad hoc.
