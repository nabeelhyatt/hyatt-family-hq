-- Seed the Hyatt family roster.
--
-- Context (docs/plans/2026-07-03-001-feat-hyatt-family-planner-plan.md, U3):
-- 00155 removed the mason.io allowlist rows (guarded to NULL user_id only, so
-- an already-signed-in row is never silently deleted). This migration is
-- idempotent and fix-forward: it inserts the four Hyatt members if their
-- email has no existing row, and never edits a shipped migration.
--
-- MANUAL PRE-MERGE CHECK (same caveat as 00155 — authored without prod query
-- access): if any of these four emails already has a signed-in row under a
-- DIFFERENT address (e.g. a prior manual insert under a personal alias),
-- UPDATE that row's email instead of letting this migration insert a fresh
-- row — inserting fresh would create a second, empty row for the same human
-- while their existing data (calendar, todos) stays attached to the old row.
--
--   SELECT email, user_id, role FROM family_members ORDER BY email;
--
-- Roles: Nabeel is the owner (matches AUTHORIZED_EMAIL, re-pointed to
-- nabeelo@gmail.com as a manual Vercel env change — see the plan's
-- Operational Notes). Megan is a parent. Kaden and Liam are kids, with
-- mother/father links set so the relationship model (00075) resolves.

INSERT INTO family_members (email, name, role) VALUES
  ('nabeelo@gmail.com', 'Nabeel', 'owner'),
  ('mhyatt@gmail.com', 'Megan', 'parent'),
  ('kadenhyatt@gmail.com', 'Kaden', 'kid'),
  ('thisliamhyatt@gmail.com', 'Liam', 'kid')
ON CONFLICT (email) DO NOTHING;

UPDATE family_members
  SET mother_email = 'mhyatt@gmail.com', father_email = 'nabeelo@gmail.com'
  WHERE email IN ('kadenhyatt@gmail.com', 'thisliamhyatt@gmail.com');
