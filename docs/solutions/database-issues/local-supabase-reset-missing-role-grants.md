---
title: Fresh local Supabase reset leaves authenticated/anon roles with no table grants
date: 2026-07-04
category: database-issues
module: local dev environment (supabase)
problem_type: database_issue
component: database
symptoms:
  - "Every RLS-protected query fails with `permission denied for table X` (Postgres error 42501), even for tables the signed-in user's RLS policy should allow"
  - "Error hint literally says `Grant the required privileges to the current role with: GRANT SELECT ON public.<table> TO authenticated;`"
  - "Pages render 200 but with empty or error-caught data everywhere (calendar events missing, timeline entries missing) despite unchanged, correct-looking RLS policies and app code"
root_cause: missing_permission
resolution_type: environment_setup
severity: high
tags: [supabase, local-development, rls, postgres-grants, db-reset]
---

# Fresh local Supabase reset leaves authenticated/anon roles with no table grants

## Problem

After running `npx supabase start` followed by `supabase db reset` against a from-scratch local Postgres (via the `supabase` CLI, v2.109.0 in this case, invoked ad hoc via `npx` because the Homebrew-installed CLI version couldn't parse this repo's `supabase/config.toml`), every page that queries an RLS-protected table failed silently or with a 500, even for a correctly signed-in, allowlisted user.

## Symptoms

- `permission denied for table calendar_events` and `permission denied for table timeline_entries` (Postgres code `42501`) logged server-side while the page itself still returned 200 with a `.catch(() => [])`-style empty fallback.
- Settings pages that queried `family_members` directly (no catch-and-swallow) surfaced as a hard crash or an incorrect redirect (the query returned no row, so role-based checks like `getIsOwner()` silently evaluated to false for the actual owner).
- The Postgres error's own hint named the fix: `GRANT SELECT ON public.timeline_entries TO authenticated;` — but that phrasing (a single missing table) undersold the scope of the problem.

## What Didn't Work

- Assuming the bug was in application code (auth session handling, RLS policy logic) — none of the app's RLS policies or auth/session code had been touched, and the same policies work correctly in the project's normal local dev workflow. Chasing the app-code angle first would have wasted time.
- Assuming a stale/mismatched anon key or JWT secret — the anon/service-role keys printed by `supabase start` were used consistently and did work for `requireUserId()`-level session resolution (pages weren't bounced to `/login`); the failure was specifically at the table-grant level, one layer below RLS policy evaluation.

## Solution

Checked the actual Postgres grants directly against the container:

```sql
SELECT grantee, table_name, privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('family_members','calendar_events','timeline_entries')
  AND grantee IN ('authenticated','anon')
ORDER BY table_name, grantee;
```

This returned only `TRIGGER`, `REFERENCES`, and `TRUNCATE` for both `authenticated` and `anon` on every table checked — no `SELECT`, `INSERT`, `UPDATE`, or `DELETE` at all. RLS policies were irrelevant; Postgres denies access at the grant level before RLS is ever evaluated.

Fix, run once against the local container (via `docker exec <container> psql -U postgres -d postgres -c "..."`, not via a project migration — this is a local-environment provisioning gap, not something to encode into the app's own migration history):

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
  TO authenticated, anon, service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public
  TO authenticated, anon, service_role;
```

After this, every previously-500ing or empty-rendering page (Home, Calendar, Timeline, Settings) returned correct data for the correct role immediately.

## Why This Works

Supabase's normal local-dev bootstrap (whatever base init script the `supabase/postgres` Docker image and CLI ship) is expected to set default privileges so that new tables created by the project's own migrations automatically pick up `SELECT`/`INSERT`/`UPDATE`/`DELETE` for `anon`/`authenticated`/`service_role`, with RLS then narrowing what each request can actually see. In this instance that baseline step didn't happen — plausibly because the CLI was invoked via `npx` at a different version (2.109.0) than what the project's own tooling assumes, against a fully fresh Postgres volume, running many first-time migrations back to back. The explicit `GRANT ... ON ALL TABLES` statement restores the same end state a working baseline would have produced, without touching RLS policies (which were already correct) or the app.

## Prevention

- When a fresh local `supabase db reset` produces pages that render but with suspiciously empty/missing data (not a crash, not a redirect to login — just absent rows), check `information_schema.role_table_grants` for `authenticated`/`anon` **before** assuming an app-level RLS or session bug. This is a fast, cheap check (one SQL query) that should come before touching any RLS policy or auth code.
- If this recurs across resets, consider adding a project-owned bootstrap script (run once after `supabase start`, not a numbered migration) that asserts/repairs the base grants, so it's a documented one-command fix rather than a rediscovery each time.
- Worth confirming whether this is specific to invoking the CLI via `npx supabase` (as opposed to whatever CLI version/install path the project's own `predev`/`db:heal` scripts assume) — if so, document the expected CLI version and installation method for this repo to avoid re-triggering the gap.

## Related Issues

- None yet — first learning captured for this repo.
