---
title: "`git rm` with multiple file arguments silently skips remaining files if the first has local modifications"
date: 2026-07-04
category: tooling-decisions
module: git workflow
problem_type: tooling_decision
component: tooling
applies_when:
  - "Running `git rm file1 file2 ...` (multiple paths in one invocation) as part of a bulk cleanup or deletion pass"
  - "Any file in the list was touched by an earlier broad edit (a sed pass, a find/replace, an automated rewrite) before the git rm runs"
tags: [git, git-rm, cli-gotcha, bulk-deletion]
---

# `git rm` with multiple file arguments silently skips remaining files if the first has local modifications

## Context

While bulk-deleting files as part of removing a feature module, `git rm fileA.tsx fileB.tsx` was run to delete two superseded files in one command. `fileA.tsx` had been touched moments earlier by a broad `sed` pass (updating an import path across many files, including this now-dead one before it was known to be dead). The command printed `error: the following file has local modifications: fileA.tsx (use --cached to keep the file, or -f to force removal)` — and appeared otherwise successful.

`fileB.tsx` — listed in the same command, with no local modifications of its own — was **not removed**. It silently remained on disk and in the git index, discovered only later via `git status` or, worse, via a stale-import compile error pointing at it.

This happened twice in the same session with two different file pairs, because the failure mode isn't obviously "the whole command aborted" from the printed output — it reads like a per-file warning, not a whole-command short-circuit.

## Guidance

`git rm` validates and processes its full argument list, but a "file has local modifications" error on *any* one of them stops the whole invocation — files listed after the offending one are never reached, even though nothing was printed about them. Don't infer "the rest succeeded" from the absence of an error message about them.

After any multi-file `git rm` (especially during a bulk cleanup pass where files may have been edited earlier in the same session), verify the actual result rather than trusting the command's exit silence:

```bash
git rm file1.tsx file2.tsx file3.tsx
git status --short file1.tsx file2.tsx file3.tsx   # confirm all three show as `D `
```

If one is reported as modified rather than deleted, re-run `git rm -f <that-file>` (force, since the intent is deletion and the "modification" is moot — the file is being removed anyway) and re-verify.

## Why This Matters

A silently-retained dead file isn't just clutter — if it still imports from something else being deleted in the same pass, it becomes a real compile error later, disconnected from the `git rm` command that was supposed to remove it. Debugging that error leads back to "why does this file still exist" rather than to the actual `git rm` command that silently failed on it, costing more time than the original bulk-delete was meant to save.

## When to Apply

- Any multi-file `git rm` call, but especially ones assembled programmatically or copy-pasted as part of a larger deletion pass, where it's easy not to individually eyeball every path in the list against the command's output.
- Immediately after any bulk rewrite (sed, codemod, find/replace) that touched files later slated for deletion in the same session — those are exactly the files most likely to trip this.

## Examples

Failure mode observed in this session:

```
$ git rm src/lib/todos/journal-nudge.ts src/components/todos/journal-nudge-row.tsx
error: the following file has local modifications:
    src/lib/todos/journal-nudge.ts
(use --cached to keep the file, or -f to force removal)
```

`journal-nudge-row.tsx` was never touched — it sat on disk, undeleted, until a later `tsc --noEmit` pass surfaced a broken import inside it (pointing at an action that had already been removed from its own caller). The fix each time was the same:

```
$ git rm -f src/lib/todos/journal-nudge.ts
$ git rm src/components/todos/journal-nudge-row.tsx   # now succeeds on its own
```

## Related

- None yet — first learning captured for this repo.
