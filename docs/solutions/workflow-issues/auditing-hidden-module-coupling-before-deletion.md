---
title: Auditing hidden module coupling before deleting a feature module
date: 2026-07-04
category: workflow-issues
module: app-wide (fork adaptation)
problem_type: workflow_issue
component: development_workflow
severity: high
applies_when:
  - "Deleting or forking-away a feature module from a shared codebase (route group + its components/lib)"
  - "A plan describes module removal by naming route groups/directories, without an explicit cross-module import audit"
tags: [module-removal, refactoring, code-audit, next-js, fork-adaptation]
---

# Auditing hidden module coupling before deleting a feature module

## Context

Adapting a forked family-planner app (Mason Family HQ → Hyatt Family HQ) required removing seven modules (journal, reader, baseball, bucks, assignments, workouts, practice) while keeping four (calendar, todos, timeline, home). The upstream plan enumerated this as "delete these route groups and their component/lib directories" — a directory-boundary view of the work.

In reality, one of the seven modules (journal) was woven into every surviving module: the global header computed a journal posting-streak badge and read journal notifications directly; the Home dashboard rendered two journal-status widgets; Todos had a "write in your journal" nudge feature with its own table, component, and server action; Timeline resolved linked-journal-post covers and rendered a "reflect on this event" button; and an entire separate `/family` app turned out to be 100% journal content (a "shared journal feed") with nothing else in it. None of this was visible from the module's own directory — it only showed up by searching for cross-module imports.

## Guidance

Before deleting a module, run a repo-wide grep for every plausible import-path shape the module could be referenced by, then explicitly exclude the doomed module's own directories (and any other modules already slated for deletion) from the result. What's left is the real list of surviving files that need surgery — not just "this route group is being deleted."

```bash
grep -rlE "from \"@/(lib|components)/<module>|from \"@/app/\(<module>\)" src \
  --include="*.ts" --include="*.tsx" \
  | grep -v "^src/app/(<module>)/" \
  | grep -v "^src/lib/<module>/" \
  | grep -v "^src/components/<module>/" \
  | grep -v "^src/app/(<other-doomed-module>)/" \
  | sort
```

Run this for the module being removed, not just once for the whole trim — do it per-module if several are being deleted, since a surviving file may import from more than one doomed module. Then, for each surviving file it surfaces, read the exact import to decide whether the imported thing is:

1. **Generic and reusable** — relocate it out of the doomed module's directory before deleting the directory (e.g., a shared avatar component, a date utility, a provisioning function).
2. **A real feature that only makes sense with the doomed module** — remove the feature from the surviving file too (e.g., a "reflect on this" button that starts a journal entry has no reason to exist once journal is gone).

After the surgery, re-run the same grep (now with the module's own directories fully excluded) to confirm zero hits, then run a full `tsc --noEmit` — this catches anything the grep's regex shape missed (e.g., type-only imports, or imports of a type/function whose name doesn't obviously signal the module it came from).

## Why This Matters

Trusting the plan's directory-level module list and deleting on that basis alone will produce a codebase that fails to compile in ways that are individually easy to fix but collectively expensive to discover one build-error at a time. Worse, some couplings degrade silently rather than failing to compile — e.g., a stale UI copy string ("shows next to their posts in the family feed") or a dead redirect target that still resolves to a 200 but sends users somewhere wrong. A single upfront audit finds the *complete* list in one pass instead of a slow drip of "oh, this also broke" discoveries during later units of work.

## When to Apply

- Any time a plan says "delete module X" and X is more than a few files old or has been in the codebase long enough to have accreted cross-references.
- Especially when X is a "content" module (journal-like: has its own data model, but other modules display or link to that data) rather than a purely leaf/utility module.
- Before writing the deletion commit, not after — the audit is cheap; discovering breakage after deletion is not.

## Examples

Concrete couplings found by this audit for the journal module in this fork, none of which were mentioned in the original module-removal plan:

- `src/components/layout/global-header.tsx` / `global-header-client.tsx` — computed a per-user journal posting-streak (`getJournalStreakStats`) and read journal notifications (`getJournalNotifications`) inline in the shared header every app uses.
- `src/app/(home)/home/page.tsx` + `src/lib/home/journal.ts` + `src/components/home/journal-status-widget.tsx` — two journal-status widgets on the shared Home dashboard.
- `src/lib/todos/journal-nudge.ts` + `src/components/todos/journal-nudge-row.tsx` + `dismissJournalNudge()` in Todos' own actions file — a "Write in your journal" row synthesized into the Todos Today view.
- `src/lib/timeline/queries.ts` — `fetchLinkedPosts`/`linkedJournalIds` unioned journal-post photos into a timeline entry's cover-photo candidates, and tracked a `linkedCount`/`linkedPosts` field on every timeline entry.
- `src/components/timeline/reflect-on-event-button.tsx` — a button on every timeline card that started a new journal entry pre-bound to that event.
- `src/app/(family)/` — an entire route group ("Family" in the app switcher, described as "Shared journal feed") whose only content was a journal-entries feed component; nothing else lived there.

## Related

- None yet — first learning captured for this repo.
