---
title: New migration referenced a table name a later migration had already renamed
date: 2026-07-04
category: database-issues
module: supabase migrations
problem_type: database_issue
component: database
symptoms:
  - "`ERROR: relation \"todo_task_images\" does not exist (SQLSTATE 42P01)` while applying a newly written migration during `supabase db reset`"
  - "The referenced table name matches a real `CREATE TABLE` in an earlier migration file, so a quick grep for the CREATE statement finds it and looks correct"
root_cause: missing_workflow_step
resolution_type: migration
severity: medium
tags: [supabase, migrations, postgres, table-rename, code-review]
---

# New migration referenced a table name a later migration had already renamed

## Problem

A new cleanup migration (deleting rows tied to accounts being removed) referenced `todo_task_images` — the exact table name from its `CREATE TABLE` migration — but a later migration (`00132_todo_attachments.sql`) had renamed it to `todo_task_attachments` (`ALTER TABLE todo_task_images RENAME TO todo_task_attachments;`, plus a matching index rename) as part of generalizing task images into general attachments. The new migration failed to apply.

## Symptoms

- `supabase db reset` (or `db-heal-local.sh`, which applies missing migrations one at a time) stops with `relation "todo_task_images" does not exist (SQLSTATE 42P01)` at the exact `DELETE FROM todo_task_images ...` statement.
- The table name was verified correct by grepping the CREATE TABLE statement in an early migration (`00130_todo_images.sql`) and by an earlier repo-research pass that listed `todo_task_images` as the table name — both of those checks were individually accurate but incomplete, since neither checked for a later rename.

## What Didn't Work

- Trusting a single `grep "CREATE TABLE todo_task_images"` hit as proof the name is current. It proves the table existed under that name at creation time, not that it still does — Postgres migrations are append-only, so a rename lives in a separate, later file with no textual link back to the original CREATE statement.
- Trusting an earlier research pass's table-name inventory without an independent rename check at the moment of writing new SQL against that table. Research done minutes or units earlier can be stale the moment a schema-touching migration is added afterward (in this repo's own migration history, in fact — the rename happened at `00132`, well before the current work).

## Solution

Before writing a migration that touches an existing table (in `DELETE`/`UPDATE`/`ALTER`/`REFERENCES` position), grep the entire migrations directory for renames of that table, not just its creation:

```bash
grep -rln "RENAME TO" supabase/migrations/*.sql | xargs grep -H "RENAME TO"
```

This repo had exactly one hit relevant to the migration being written (`todo_task_images` → `todo_task_attachments` in `00132`); the fix was a one-line substitution of the table name (the column name, `uploaded_by_email`, was unchanged by the rename, so no other edits were needed) plus a matching fix to the migration's own explanatory comment, which had also cited the old name.

## Why This Works

Postgres migrations in this repo (and generally) are append-only history — a table's *current* name is whatever the last `RENAME TO` left it as, and that fact is only discoverable by scanning forward through every later migration file, not by reading the original `CREATE TABLE`. Grepping for `RENAME TO` across the whole directory surfaces every such rename in the codebase in one pass, regardless of which specific table a new migration is about to touch.

## Prevention

- Add "grep for `RENAME TO` across `supabase/migrations/` for every table this migration touches" as a standard step before writing (or reviewing) any migration that references an existing table by name, alongside checking for constraint/column changes.
- Don't rely solely on an earlier research/planning pass's schema inventory when writing schema-touching SQL — re-verify table/column names directly against the migrations directory at write time, since the inventory may predate a rename (or may simply have missed one, as happened here even after an explicit repo-research pass).
- When practical, verify the migration by actually running it against a local reset (`supabase db reset`) before considering the unit done — this is what caught the error immediately, rather than deferring discovery to a prod deploy.

## Related Issues

- None yet — first learning captured for this repo.
