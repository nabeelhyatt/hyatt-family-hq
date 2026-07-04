-- Privacy cleanup: remove the Mason family's data from the Hyatt fork's
-- database before any Hyatt-specific data lands.
--
-- Context (docs/plans/2026-07-03-001-feat-hyatt-family-planner-plan.md, U0):
-- this database is a fork of Andrew Mason's family app. Three of the fork's
-- seed migrations were written as account-independent (deliberately, so they'd
-- run identically in Andrew's own dev and prod) and therefore ALSO ran
-- unconditionally against this Hyatt database on first deploy:
--
--   * 00094/00097 unconditionally inserted Andrew's and Jenny's full life
--     history (79 timeline_entries rows + 16 people rows) with no guard.
--   * 00098 unconditionally inserted a `calendar_sources` row carrying
--     Andrew's real private Google Calendar ICS address, which the 15-minute
--     sync cron has plausibly been reading into this database since the fork.
--   * The `family_members` allowlist itself still carries the four @mason.io
--     rows (00051, 00075) — as long as they exist, accounts on Andrew's real
--     domain can sign in to this app.
--
-- This migration removes all of it, ahead of U1 (which begins a large,
-- multi-step code refactor) rather than after it — the exposure above is
-- live today and does not need two refactor units to finish before it's
-- closed.
--
-- Ordering note: several tables added after the 00104 ON UPDATE CASCADE sweep
-- (todos, todo_task_attachments, bucks_*) declared ON UPDATE CASCADE but no
-- explicit ON DELETE action, which defaults to NO ACTION/RESTRICT. If any of
-- those tables hold a row referencing a mason.io email, deleting the
-- family_members row without cleaning those up first aborts this migration.
-- This is expected to be a no-op in practice (nobody signs in as
-- andrew@mason.io on this fork's hosted instance), but the cleanup below is
-- unconditional so the migration is correct either way.
--
-- MANUAL PRE-MERGE CHECK: this migration was authored without prod query
-- access (the Supabase MCP was read-only-restricted in the authoring
-- session). Before merging to main, run the following against prod and
-- confirm the guard below matches reality:
--
--   SELECT email, user_id FROM family_members ORDER BY email;
--   SELECT id, email FROM auth.users ORDER BY created_at;
--
-- If any of nabeelo@gmail.com / mhyatt@gmail.com / kadenhyatt@gmail.com /
-- thisliamhyatt@gmail.com already has a signed-in row under a DIFFERENT
-- email (e.g. a prior manual insert), do not merge this migration as-is —
-- that row's email must be UPDATEd to the canonical address instead of
-- inserted fresh (00104's ON UPDATE CASCADE carries every child row along).
-- Inserting a fresh row for someone who already has a signed-in identity
-- creates a split identity: two rows for one human, with all their existing
-- data attached to the old row and nothing attached to the new one.

-- ---------------------------------------------------------------------------
-- 1. Clean up NO-ACTION-FK references to mason emails first, so the
--    family_members delete below never aborts on a live reference. Scoped
--    explicitly to the four mason.io emails so this is a no-op against any
--    other data.
-- ---------------------------------------------------------------------------

DELETE FROM bucks_redemptions
  WHERE redeemed_by_email LIKE '%@mason.io' OR fulfilled_by_email LIKE '%@mason.io';
DELETE FROM bucks_task_claims
  WHERE resolved_by_email LIKE '%@mason.io';
DELETE FROM bucks_earning_tasks
  WHERE created_by_email LIKE '%@mason.io';
DELETE FROM bucks_prizes
  WHERE created_by_email LIKE '%@mason.io';
DELETE FROM bucks_ledger
  WHERE created_by_email LIKE '%@mason.io';

DELETE FROM todo_task_attachments
  WHERE uploaded_by_email LIKE '%@mason.io';
DELETE FROM todo_tasks
  WHERE assignee_email LIKE '%@mason.io'
     OR creator_email LIKE '%@mason.io'
     OR completed_by_email LIKE '%@mason.io';
DELETE FROM todo_projects
  WHERE completed_by_email LIKE '%@mason.io';

-- ---------------------------------------------------------------------------
-- 2. Delete the seeded personal calendar source by its fixed id (00098), so
--    the sync cron stops reading Andrew's private ICS feed. calendar_events
--    for the mason members are cleaned up by the family_members cascade in
--    step 4 (calendar_events.member_email is ON DELETE CASCADE), but the
--    source row itself has no FK forcing its removal, so it's deleted here
--    explicitly.
-- ---------------------------------------------------------------------------

DELETE FROM calendar_sources
  WHERE id = 'c0000098-0000-4001-8001-000000000001';

-- ---------------------------------------------------------------------------
-- 3. Delete the unconditionally-seeded Mason/Jenny biography (00094, 00097)
--    by fixed seed-UUID prefix. timeline_entry_people rows cascade off both
--    parents (ON DELETE CASCADE); journal_entries.timeline_entry_id is
--    ON DELETE SET NULL, so any journal entry that referenced one of these
--    (extremely unlikely on this fork, since the journal was never used
--    against mason.io accounts here) survives with the link cleared rather
--    than being deleted itself.
-- ---------------------------------------------------------------------------

DELETE FROM timeline_entries
  WHERE id::text LIKE 'b0000094-0000-%' OR id::text LIKE 'b0000097-0000-%';
DELETE FROM people
  WHERE id::text LIKE 'b0000094-0001-%';

-- ---------------------------------------------------------------------------
-- 4. Hard-delete the mason.io allowlist rows. This is a security requirement,
--    not tidiness: family_members IS the sign-in allowlist (ensureProvisioned
--    checks it before a stable user_id exists), and mason.io is a real domain
--    with real Google accounts — leaving these rows lets the Mason family
--    OAuth into this app indefinitely.
--
--    Scoped to `user_id IS NULL` as a safety guard: a non-NULL user_id means
--    someone has actually signed in under that email in THIS database, which
--    would mean the account is in active use here and should not be silently
--    deleted by an automated migration. (Per the manual pre-merge check
--    above, no mason.io row should show a non-NULL user_id on this fork; if
--    one does, stop and investigate before merging rather than adjusting
--    this guard.)
-- ---------------------------------------------------------------------------

DELETE FROM family_members
  WHERE email LIKE '%@mason.io' AND user_id IS NULL;
