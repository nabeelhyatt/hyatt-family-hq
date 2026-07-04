---
title: "feat: Hyatt Family Planner — base trim + weekly call heartbeat + ambient board"
type: feat
status: active
date: 2026-07-03
origin: docs/brainstorms/family-planner-experience-requirements.md
deepened: 2026-07-03
---

# feat: Hyatt Family Planner — base trim + weekly call heartbeat + ambient board

## Summary

Land the fork adaptation in three phases: (A) relocate member management out of the journal module, delete the seven Mason-specific modules, and rebrand/seed the Hyatt roster; (B) build the weekly family call as a real Google Calendar event — native invite RSVP is the one-tap confirm, read back from the synced `google_attendees` snapshot — with a thin per-week state record, agenda quick-add, and close-out into the Timeline; (C) extend the existing per-person Home sidebar into the ambient board, fed by class-schedule imports (as calendar events) and parent-routed flight parsing (via the in-repo Anthropic client).

---

## Problem Frame

The Hyatt family forked Andrew Mason's family HQ but has a different life stage: two college kids away most of the year, a tech-reluctant primary viewer (Megan), and one existing weekly ritual (the family call) that needs re-negotiating most weeks. Full product framing, actors (A1–A4), flows (F1–F5), and acceptance examples (AE1–AE6) live in the origin doc (see Sources & References). Plan-specific framing: the v1 base (rebrand + trim) has not been built yet, so this plan sequences it as Phase A ahead of the experience layer.

---

## Requirements

Traced to origin `docs/brainstorms/family-planner-experience-requirements.md`:

**Weekly call — the heartbeat**
- R1. Weekly call as a first-class object: standing slot (default Sunday 11:00am ET), confirmed or moved each week.
- R2. Scheduling must beat the group text: conflict-aware proposals; confirm/move is one tap from a notification (Google Calendar invite RSVP, per user's channel decision).
- R3. Shared weekly agenda, open to all members, add friction at text-message level.
- R4. Call close-out archives the agenda as a dated Timeline entry.
- R5. Skipped weeks degrade gracefully — no streaks, nags, or guilt mechanics.

**Ambient board — Home**
- R6. Per-person tiles: next thing, flight cards, days-until-home, availability.
- R7. Symmetric visibility — parents' tiles as rich as kids'.
- R8. Availability claims only "not in class until X", never "free now".
- R9. Staleness is first-class: aged data shows its age or degrades to always-true facts.
- R10. Megan's first open is fully seeded and correct; zero setup asked of her.

**Data capture — asymmetric effort**
- R11. Zero recurring kid effort; once-a-semester schedule supply is the ceiling.
- R12. Class-schedule import for Tufts (Liam) and UChicago (Kaden), once per semester.
- R13. Flight capture flows from the parents' side (paste-to-parse); kid forwarding is not load-bearing.
- R14. Location presence is optional and swappable; board delivers core value without it. (This plan ships without location.)

**Plan-derived (base prerequisite, from origin Dependencies)**
- R15. Base trim: remove Journal, Reader, Baseball, Practice, Assignments, Bucks, Workouts; keep Calendar, Todos, Timeline, Home. Code-only removal; shipped migrations stay.
- R16. Rebrand Mason → Hyatt and seed the Hyatt roster (Nabeel/owner `nabeelo@gmail.com`, Megan/parent `mhyatt@gmail.com`, Kaden/kid `kadenhyatt@gmail.com`, Liam/kid `thisliamhyatt@gmail.com`) via a new fix-forward migration — never edits to shipped migrations.

**Origin actors:** A1 Nabeel (owner/admin), A2 Megan (primary viewer), A3 Kaden (UChicago), A4 Liam (Tufts)
**Origin flows:** F1 weekly call scheduling, F2 agenda accumulation/close-out, F3 Megan's glance, F4 flight capture, F5 semester schedule import
**Origin acceptance examples:** AE1 (R1, R2), AE2 (R4), AE3 (R5), AE4 (R8), AE5 (R9), AE6 (R10)

---

## Scope Boundaries

### Deferred for later

*(carried from origin)*

- The asks channel ("I need a ride" / availability pings) — v1 stand-in is an agenda item.
- Gatherings/photos/trip-planning layer and Wanderlog integration.
- Location presence until a viable source exists (Find My has no public API).
- Kid-facing to-do visibility for Megan.

### Outside this product's identity

*(carried from origin)*

- Journaling, AI interview prompts, reading quizzes, or daily-accountability mechanics.
- Gamification: streaks, points, currencies, guilt mechanics.
- Real-time surveillance (minute-by-minute tracking, geofences) — ambient presence only, symmetric.
- Replacing Google Calendar as the daily driver or texting as the conversation medium.

### Deferred to Follow-Up Work

- SMS nudges via Twilio (incl. A2P 10DLC registration) — only if the family ignores calendar invites. Design the confirm surface channel-agnostic so SMS can layer on later.
- `DROP TABLE` cleanup migration for removed modules' tables — after the fork is stable in prod.
- Gmail auto-ingestion of flight confirmations — v1 is paste-to-parse.
- Removing dormant TeamSnap/Google-DWD/drive-time code — left unconfigured, not deleted, in this plan.
- Regenerating `public/app-icons/` + `public/app-splash/` with a Hyatt visual identity beyond name swaps (icons regenerate with existing art in Phase A).

---

## Context & Research

### Relevant Code and Patterns

- Roster/auth: `family_members` table (migrations `00051`, `00090`, `00104` ON UPDATE CASCADE convention), provisioning in `src/lib/journal/provisioning.ts`, role helpers `src/lib/members/auth.ts`, owner-gated roster CRUD in `src/app/(journal)/settings/family/actions.ts` (currently inside the journal module — must move), dev roster `supabase/seeds/00_dev_family.sql`, dev login switcher.
- App registry is triplicated: `src/lib/pwa/apps.ts` (`PWA_APPS`), `src/components/layout/app-switcher.tsx` (`APPS`), `scripts/generate-icons.mjs`.
- Calendar: `calendar_events`/`calendar_sources` (`00098`), `event_attendees(event_id, member_email, going)` (`00111`) — existing RSVP scaffolding; recurrence picker↔RRULE in `src/lib/calendar/recurrence.ts`; shared auth-free mutation core `src/lib/calendar/mutations.ts` used by both UI server actions and the agent API; Google sync `src/lib/calendar/google-sync.ts` + `google_connections`; ICS subscriptions `src/lib/calendar/ics-sync.ts` (`ical-expander`); cron entry `src/app/api/cron/calendar-sync/route.ts` (pg_cron + `CRON_SECRET`).
- Home: `src/app/(home)/home/page.tsx` composes widgets from `src/lib/home/*` fetchers; `getHomePersonStatuses()` in `src/lib/home/person-status.ts` + `HomePersonStatus` in `src/lib/home/types.ts` + `PersonStatusWidget` — the seam for the ambient board; `home_ai_cache` (`00099`) once-daily generation pattern.
- Timeline: `timeline_entries` (`00094`, category CHECK list, date ranges + precision), UI write path `src/lib/timeline/actions.ts` (family-member gate → admin-client insert).
- Todos: `GlobalQuickAdd` mounted in root layout (`src/components/todos/global-quick-add.tsx`) — clonable quick-add pattern; token-authenticated ingest `src/app/api/todo/ingest/route.ts`.
- LLM: Anthropic client singleton pattern `src/lib/journal/anthropic.ts` (note: lives in the journal lib being deleted — relocate the pattern, e.g. to `src/lib/ai/`); PDF handling exists (`pdfjs-dist` + `@napi-rs/canvas`, `next.config.ts` externals).
- Verification convention: no test framework; standalone `tsx` scripts `scripts/verify-*.mts`.
- Deploy: Vercel auto-deploy on push; migrations via `.github/workflows/migrate.yml` (`supabase db push` on `main`).

### Institutional Learnings

- None — `docs/solutions/` does not exist yet. Capture learnings from this work with `/ce-compound` afterward (module-removal mechanics, roster reseed, Google-invite RSVP loop).

### External References

- Tufts historically offers class-schedule ICS export/subscription (WebCenter-era; `myfletcher.tufts.edu/ics_helper` pattern); UChicago `my.uchicago.edu` has no confirmed personal-schedule export — only term-date iCal. Coursicle is manual entry, not SIS sync. Credential-based scraping is fragile and ToS-hostile → import accepts an artifact the kid can produce (ICS URL, screenshot, pasted text).
- iOS PWA web push requires iOS 16.4+, home-screen install, and gesture-triggered permission — unfit for the tech-reluctant primary user; SMS (Twilio) has the best reach but requires A2P 10DLC registration with days-to-weeks lead time. Chosen channel: Google Calendar invites (zero new infra, native one-tap RSVP), SMS deferred.

---

## Key Technical Decisions

- **The call is a real recurring Google Calendar event, not an app-internal object**: created from the owner's Google connection with all four members as guests. Gmail/GCal render native Yes/No RSVP (= R2's one-tap from a notification, with zero new notification infrastructure). Verified against the sync code: guest `responseStatus` (accepted/declined/needsAction) already flows back on every 15-minute sync into the event row's `google_attendees` snapshot — without guests ever opening the app — so the call widget reads RSVP state from `google_attendees`, **not** `event_attendees.going` (which is in-app-write-only, and whose `going=false` path would delete a declined guest from the invite via `reconcileEventGuests`). A thin `call_weeks` state record layers the per-week lifecycle (proposed → confirmed/moved → done/skipped) over the event. The event-creation path needs extending (attendees + recurrence + invite emails); the API-client pieces (`insertGoogleEvent` with `sendUpdates`, the currently-unused `listGoogleEventInstances`) already exist for exactly this.
- **Class schedules become calendar events, not a new schedule domain**: ICS subscription (`calendar_sources`) where a feed exists; otherwise LLM-parse → generated recurring events with `external_id` idempotency. "Not in class until X" then derives from ordinary calendar queries — honors calendar-as-spine and reuses sync/display for free. A small import-metadata record carries semester bounds for staleness (R9).
- **Flights are calendar events plus a typed `travel_segments` record** (carrier, flight number, times, home/away direction) so tiles and days-until-home have structure to read; parsing reuses the repo's Anthropic client pattern with a review-before-save step.
- **Module removal is code-only**: delete route groups, components, lib dirs, registry entries, home widgets, middleware exemptions, scripts; keep all shipped migrations (append-only convention). Tables sit dormant; a drop migration is deferred follow-up.
- **Roster ships as a fix-forward migration + existing runtime settings UI**: idempotent insert of the Hyatt four, removal of never-signed-in `@mason.io` rows; `AUTHORIZED_EMAIL` env re-pointed to `nabeelo@gmail.com`. Shipped Mason migrations are never edited; note the Mason biography seeds (`00094`/`00097`) were account-independent and DID land in Hyatt prod — U3's migration deletes them by fixed seed UUIDs.
- **Workspace-specific Mason infra (Google domain-wide delegation, drive-time materialization, TeamSnap) stays dormant, not deleted** — unconfigured env leaves it inert; deleting it is riskier than ignoring it during the big trim.
- **No test framework introduced**: verification follows the repo's `scripts/verify-*.mts` (tsx) convention plus explicit manual gates — including a named "Megan's first open" gate (R10/AE6) before her onboarding.

---

## Open Questions

### Resolved During Planning

- Notification channel for confirm/move: Google Calendar invites first; SMS deferred (user decision).
- Kid schedule import mechanism: artifact-based (ICS URL / screenshot / pasted text), never credentialed scraping.
- Where "not in class" lives: derived from calendar events, no separate schedule store.
- Module removal depth: code-only; keep tables and migrations.

### Deferred to Implementation

- Whether Tufts still exposes a per-student ICS subscription URL (kid retrieves once; the parse path covers it either way) — behind SSO, unknowable until a kid tries.
- Exact conflict-window heuristic for call proposals (how many candidate slots, how far to search) — tune against real schedule data.
- Whether the weekly call cron merges into the existing `calendar-sync` cron route or gets its own route — decide when touching the cron plumbing.
- Timeline category for call records: new `family_call` CHECK value vs reusing `children_family` — decide at migration time; new value preferred if the CHECK edit is clean.
- Which Google calendar owns the call event (owner's primary vs a dedicated family calendar) — depends on what the owner's `google_connections` grant allows; affects who can edit from GCal directly.
- Exact staleness copy and thresholds on tiles (when "schedule from fall" starts showing) — tune with real semester dates.

---

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```mermaid
flowchart LR
  subgraph feeds [Data feeds - asymmetric effort]
    ICS[Class ICS subscription or parsed schedule] --> CE[calendar_events per member]
    FLT[Parent pastes flight confirmation -> LLM parse -> review] --> TS[travel_segments + calendar_events]
    GCal[Members' Google calendars via existing sync] --> CE
  end

  subgraph call [Weekly call heartbeat]
    CRON[Weekly cron] --> PROP[Propose slot - conflict-aware vs CE]
    PROP --> EVT[Recurring GCal event, 4 guests]
    EVT -- native invite RSVP --> GA[google_attendees snapshot]
    EVT --> CW[call_weeks state: proposed/confirmed/moved/done]
    AGENDA[call_agenda_items - quick-add all week] --> DONE[Mark done]
    CW --> DONE
    DONE --> TL[timeline_entries archive]
  end

  CE --> BOARD[Ambient board tiles on Home]
  TS --> BOARD
  GA --> BOARD
  CW --> BOARD
```

Unit dependencies: U1 → U2 → U3 (Phase A, strictly ordered); U4 → U5 → U6 (Phase B, needs Phase A only for the trimmed Home surface); U8 and U9 are independent of each other; U7 consumes U5/U8/U9 outputs but can land with graceful blanks before them.

---

## Implementation Units

### U1. Relocate member management out of the journal module

**Goal:** Family roster CRUD, member photos, and shared member lookups survive the journal module's deletion; the header bell loses its journal half.

**Requirements:** R15 (prerequisite for the trim)

**Dependencies:** None

**Files:**
- Create: `src/app/(family)/settings/family/` (move of `src/app/(journal)/settings/family/` pages + actions)
- Modify: `src/components/layout/global-header.tsx` (bell merges journal + todos today — drop journal), `src/lib/timeline/queries.ts` (imports from journal actions), all callers of `listFamilyMembers`/member photo helpers that survive the trim (calendar, home, todos)
- Test: `scripts/verify-roster-crud.mts`

**Approach:**
- Move, don't rewrite: the settings pages and server actions relocate under the `(family)` route group (which survives); imports update mechanically.
- Sweep for journal imports from surviving modules (timeline queries are a known case per research) and re-home the shared helpers they use.

**Patterns to follow:**
- Existing route-group layout conventions (`src/app/(family)/layout.tsx`, `appMetadata(key)`).

**Test scenarios:**
- Happy path: owner opens relocated family settings → sees all four members, can edit a member's color/name; change persists and renders on Home.
- Integration: header bell renders with only todo notifications; no journal imports remain anywhere under `src/app` outside `(journal)` (grep-clean gate).
- Error path: non-owner hitting roster mutation actions is rejected (existing `requireOwner`/`requireAdult` behavior preserved through the move).

**Verification:**
- App builds and signs in with `(journal)` still present but nothing outside it importing from it; family settings fully functional at the new path.

---

### U2. Remove the seven Mason modules

**Goal:** Journal, Reader, Baseball, Practice, Assignments, Bucks, and Workouts are gone from code, nav, PWA manifests, Home, middleware, and scripts — Calendar, Todos, Timeline, Home, Family remain.

**Requirements:** R15; origin Scope Boundaries ("Outside this product's identity" — no journaling/gamification surfaces left to drift back in)

**Dependencies:** U1

**Files:**
- Delete: `src/app/(journal)/`, `src/app/(reading)/`, `src/app/(baseball)/`, `src/app/(bucks)/`, `src/app/(assignments)/`, `src/app/(workouts)/`, `src/app/practice/`, matching `src/components/{journal,reading,baseball,bucks,assignments,workouts,practice-table,lessons,timer}/` and `src/lib/{journal,reading,baseball,bucks,assignments,workouts,practice,whoop}/` dirs, `src/app/api/reading/`, `src/app/api/teamsnap/` (optional — may stay dormant), removed modules' `scripts/` (baseball capture/generate, `verify-workout-math.mts`, `verify-bucks-e2e.mts`, etc.), `services/practice-alignment/`
- Modify: `src/lib/pwa/apps.ts` (`PWA_APPS`), `src/components/layout/app-switcher.tsx` (`APPS`), `scripts/generate-icons.mjs`, `src/app/(home)/home/page.tsx` + `src/lib/home/` fetchers (drop journal/reading/workout/practice widgets), `src/middleware.ts` + `src/lib/supabase/middleware.ts` (drop `/api/reading/ingest` + practice exemptions/gates), `package.json` (name + `baseball:*`/`seed:media` scripts), root `src/app/layout.tsx` (GlobalQuickAdd survives; journal-specific mounts go)
- Preserve: relocate the Anthropic client pattern from `src/lib/journal/anthropic.ts` to `src/lib/ai/anthropic.ts` before deleting `src/lib/journal/`
- Test: `scripts/verify-trim.mts` (grep/build assertions)

**Approach:**
- Keep all `supabase/migrations/` untouched; tables sit dormant.
- Keep the agent API (`src/app/api/agent/*` calendar + todos) and `/family-status` — Norbert surface is unchanged.
- Leave Google DWD / drive-time materialization code in `src/lib/calendar/` dormant (unconfigured env), delete nothing calendar-adjacent.

**Test scenarios:**
- Happy path: `next build` succeeds; app switcher shows exactly Home, Family, Calendar, Todos, Timeline; per-app PWA manifests serve only those.
- Integration: signing in as each dev member lands on a working Home with no dead widgets; `/journal`, `/reader`, `/baseball`, `/bucks`, `/assignments`, `/workouts`, `/practice` all 404.
- Edge case: middleware no longer exempts deleted ingest routes (requests 404/redirect rather than 500).
- Error path: no surviving import references deleted dirs (build-time gate; verify script greps for `@/lib/journal`, `@/lib/reading`, etc.).

**Verification:**
- Clean build + clean grep; dev login as all four roles renders Home, Calendar, Todos, Timeline without errors.

---

### U3. Rebrand and seed the Hyatt roster

**Goal:** The app is "Hyatt Family HQ" everywhere user-visible, prod allowlists exactly the Hyatt four, and local dev seeds a Hyatt family.

**Requirements:** R16, R10 (roster correctness is a precondition of Megan's first open)

**Dependencies:** U2

**Files:**
- Create: `supabase/migrations/001XX_hyatt_roster.sql` (next sequence number at implementation time)
- Modify: `src/app/layout.tsx` (metadata/title), `src/app/login/page.tsx`, `src/lib/pwa/apps.ts` (app names), `public/sw.js` header, `package.json` name, `supabase/seeds/00_dev_family.sql` and downstream seed files that reference Mason members (or gut the demo-content seeds that belong to deleted modules)
- Test: `scripts/verify-roster-crud.mts` (extend), manual prod check

**Approach:**
- **Pre-flight prod inspection (read-only MCP) before writing the migration:** SELECT `family_members`, `auth.users`, and reference counts for mason emails in `todos`/`todo_projects`/`todo_images`/`bucks_*` — those are the only inbound FKs with NO ACTION on delete (created after the 00104 cascade sweep), and a single referencing row would abort the DELETE and wedge the migrate pipeline. Write the migration against observed state.
- Migration is idempotent and fix-forward: insert Nabeel (owner, `nabeelo@gmail.com`), Megan (parent, `mhyatt@gmail.com`), Kaden (kid, `kadenhyatt@gmail.com`), Liam (kid, `thisliamhyatt@gmail.com`) with names/colors and the kids' `mother_email`/`father_email` links. **If inspection finds an already-signed-in row for a Hyatt person under a different email, UPDATE that row's email to the canonical address (00104 cascades everywhere) instead of inserting** — `ON CONFLICT DO NOTHING` alone would create a split identity (two rows for one human, data attached to the old one). Never edit shipped migrations.
- **Hard-delete the `@mason.io` rows (NULL `user_id` only) as a security requirement, not tidiness:** `family_members` IS the sign-in allowlist, and mason.io is a real domain — leaving the rows means the Mason family can OAuth into Hyatt Family HQ indefinitely.
- **The Mason biography is in Hyatt prod — the seeds were NOT email-guarded.** `00094`/`00097` are account-independent and inserted 79 timeline entries + 16 people rows unconditionally. This migration deletes them by their fixed seed UUID prefixes (`b0000094-`, `b0000097-`); junction rows cascade, journal links SET NULL — verified clean.
- **Delete the seeded calendar source `c0000098-0000-4001-8001-000000000001` by fixed id** (it carries Andrew's private ICS URL and has plausibly been syncing his personal calendar into Hyatt prod since the fork); verify no mason-member `calendar_events` survive.
- Re-point `AUTHORIZED_EMAIL` env (Vercel dashboard — manual step, documented in Operational Notes).

**Test scenarios:**
- Happy path: local `supabase db reset` seeds the Hyatt four; dev-login works as each; names/colors render on Home and Calendar.
- Edge case: running the roster migration twice is a no-op (idempotency).
- Error path: sign-in with a non-allowlisted Google account is bounced to `/login?error=unauthorized` (provisioning check still intact post-rebrand).
- Error path: locally create a todo assigned to a mason member, run the migration → the decided behavior fires (reference cleaned or member retained), never a raw FK violation.
- Integration: prod migration deploy leaves any already-signed-in Hyatt row intact (no user_id clobbering, no parallel row for the same human).
- Integration: post-migration, `timeline_entries` and `people` contain zero rows with the `b0000094-`/`b0000097-` seed prefixes (Timeline renders empty), and no mason calendar source or events remain.

**Verification:**
- Prod: all four emails allowlisted; app title/manifest say Hyatt Family HQ; no Mason-named surface remains user-visible.

---

### U4. Call schema: settings, weeks, agenda

**Goal:** The database can represent the standing slot, each week's lifecycle state, and agenda items — with the Timeline category for call archives.

**Requirements:** R1, R3, R4, R5

**Dependencies:** U3 (roster in place; RLS references members)

**Files:**
- Create: `supabase/migrations/001XX_family_call.sql`, `src/lib/call/types.ts`, `src/lib/call/queries.ts`
- Test: `scripts/verify-call-week.mts` (seeded-week state math)

**Approach:**
- `family_call_settings` (single row, enforced by a constant-PK CHECK per the `journal_settings` precedent in 00052 — not by convention); `call_weeks` (one row per week, `UNIQUE(week_anchor)` as the cron-idempotency guard, status text CHECK `proposed/confirmed/moved/done/skipped`, link to the week's `calendar_events` instance with `ON DELETE SET NULL` — the week record must survive its event, timestamps); `call_agenda_items` (week link, `member_email` author, text, discussed flag, created order).
- Every new `member_email` FK declares **both** ON UPDATE CASCADE **and an explicit ON DELETE action** — the todos/bucks tables' silent NO ACTION default is the trap U3's pre-flight had to work around; don't mint more of them.
- RLS follows repo idiom: family-shared read; members insert/edit their own agenda items using the user_id-join idiom (join `family_members` on `user_id`, compare `member_email` — per the "Own connection" pattern in 00098), never bare `auth.email()` comparisons (breaks on email renames); adults manage weeks/settings; service-role for cron writes. Note `timeline_entries` has no write policies at all — U6's archive must go through the admin-client path in `src/lib/timeline/actions.ts`.
- Same migration extends the `timeline_entries` category CHECK with the call-archive category: DROP CONSTRAINT + re-ADD with the **full enumeration of all 11 existing categories plus the new one** (precedent: 00074/00080) — the re-ADD validates every existing row and aborts on any omission.

**Patterns to follow:**
- Migration conventions: text + CHECK (not enums), heavy header comment, `update_updated_at_column()` triggers, `member_email` FKs with `ON UPDATE CASCADE` (00104 convention).
- RLS idiom from `00151_mason_bucks.sql`-era migrations (family read / role-gated manage / admin-client writes).

**Test scenarios:**
- Happy path: seeded settings row + a proposed week + three agenda items from two members round-trip through `src/lib/call/queries.ts`.
- Edge case: two agenda items created in the same second keep stable order; week anchor logic is DST-safe around ET transitions.
- Edge case: inserting a second `call_weeks` row for the same anchor fails (UNIQUE); inserting a second settings row fails (constant-PK CHECK).
- Error path: kid updating another member's agenda item is rejected by RLS; non-adult cannot mutate `call_weeks`.
- Error path: the category CHECK re-ADD applies cleanly against a DB containing rows in all current timeline categories (full-enumeration guard).

**Verification:**
- Migration applies cleanly on `supabase db reset`; verify script passes against the local DB.

---

### U5. Call lifecycle: propose → invite → confirm/move → done

**Goal:** Each week the app proposes the call (defaulting to the standing slot, steering around known conflicts), creates/updates the real Google Calendar event with all four as guests, tracks RSVP state, and lets any adult move it and anyone mark it done.

**Requirements:** R1, R2, R5; F1; AE1, AE3

**Dependencies:** U4

**Files:**
- Create: `src/lib/call/lifecycle.ts` (propose/confirm/move/done core), `src/app/api/cron/call-week/route.ts` (or extend `src/app/api/cron/calendar-sync/route.ts` — implementation decision), `src/components/home/call-widget.tsx`, `src/app/(home)/call/actions.ts`
- Modify: `src/lib/calendar/mutations.ts` + `src/lib/calendar/google.ts` (extend the creation path to accept attendees + recurrence and pass `sendUpdates: "all"` — verified gap: `ManualEventInput`/`eventToGoogleBody` support neither today; `insertGoogleEvent` and the currently-unused `listGoogleEventInstances` were built for this), `src/app/(home)/home/page.tsx` (mount call widget)
- Test: `scripts/verify-call-proposal.mts`

**Approach:**
- Proposal job runs early in the week (cron): ensure this week's `call_weeks` row exists (guarded by U4's `UNIQUE(week_anchor)`), create/locate this week's instance of the recurring event from the owner's Google connection with the four members as guests, status `proposed`. Note `sendUpdates: "all"` has in-repo precedent (`materialize.ts` passes `notify ? "all" : "none"` on time-change patches); the house default elsewhere is `"none"`, so keep the choice deliberate and documented at the call site.
- Recurring instances land one `calendar_events` row each (sync uses single-event expansion); the week row links via `google_recurring_event_id` + the week's time window, not `rrule` (display-only). Sync window is −1/+12 months and older instances get flagged canceled — per-week history lives in `call_weeks`, never in old event rows.
- Confirm = native Google invite RSVP, read from the instance row's `google_attendees` snapshot (refreshed every sync — verified this captures external guests' `responseStatus`), or an in-app confirm on the widget. Do **not** map RSVP into `event_attendees.going`: its `going=false` path causes `reconcileEventGuests` to delete the guest from the invite entirely. Week flips to `confirmed` when all four have accepted (or all non-declined — tune with use).
- Move = adults edit the event time (existing single-instance edit path); guests get Google's update email; week status `moved`, RSVPs re-gather.
- Done = anyone taps done on the widget after the call; skipped weeks roll forward silently (R5 — no nag state anywhere).

**Technical design:** *(directional)* the widget reads one composed view: this week's `call_weeks` row + linked event instance + per-member RSVP derived from `google_attendees` + agenda items. All mutations route through `src/lib/call/lifecycle.ts` so the cron, server actions, and (later) the agent API share one write path — mirroring the calendar `mutations.ts` pattern.

**Patterns to follow:**
- `src/lib/calendar/mutations.ts` (auth-free core + thin authed server actions), cron route bearer pattern (`CRON_SECRET`), `event_attendees` reconciliation in the Google importer.

**Test scenarios:**
- Covers AE1. Happy path: standing slot Sunday 11am; Kaden has an imported class event 10–12 Sunday → proposal lands at the nearest clear slot; all four appear as guests; when every member's `google_attendees` entry reads accepted, the week flips to `confirmed`.
- Happy path: adult moves the event to Saturday 5pm → week status `moved`, prior RSVPs reset per attendee semantics, board shows the new time.
- Covers AE3. Edge case: nobody confirms and the slot passes → week rolls to `skipped` with no notification, banner, or streak anywhere; next week proposes normally.
- Edge case: cron runs twice in a week → exactly one `call_weeks` row (UNIQUE(week_anchor)) and one event instance.
- Error path: owner's Google connection expired → proposal falls back to an app-local event (no invites), widget shows it, and the failure is logged — the week is never silently missing.
- Integration: guest declines in Gmail (never opening the app) → next sync's `google_attendees` snapshot shows declined → widget reflects it without app interaction, and the guest is NOT removed from the invite.
- Integration: in-app confirm by a member and a Gmail RSVP by another both surface in the same widget state.

**Verification:**
- A full week cycle (propose → RSVP from a guest Gmail → move → done) works against real Google Calendar in a dev environment; verify script covers proposal/idempotency math locally.

---

### U6. Agenda quick-add and close-out to Timeline

**Goal:** Anyone can toss an item onto this week's agenda in seconds from anywhere in the app; marking the call done archives the agenda as a dated Timeline entry and starts next week clean.

**Requirements:** R3, R4; F2; AE2

**Dependencies:** U4, U5 (done transition triggers archive)

**Files:**
- Create: `src/components/call/agenda-quick-add.tsx`, `src/components/call/agenda-list.tsx`
- Modify: `src/app/layout.tsx` (global mount alongside `GlobalQuickAdd`), `src/components/home/call-widget.tsx` (agenda display), `src/lib/call/lifecycle.ts` (done → archive), `src/lib/timeline/actions.ts` (reuse entry-creation path)
- Test: `scripts/verify-agenda-archive.mts`

**Approach:**
- Clone the `GlobalQuickAdd` interaction pattern (globally mounted, keyboard/tap invoked) but write to `call_agenda_items` for the current week; attribute to the signed-in member.
- Close-out composes one Timeline entry (date = call date, category = the U4 call category, body = agenda items with authors, discussed/undiscussed noted); undiscussed items optionally roll to next week's agenda (implementation choice — default roll forward, it's the family-friendly behavior).

**Patterns to follow:**
- `src/components/todos/global-quick-add.tsx` / `quick-add.tsx`; `src/lib/timeline/actions.ts` admin-client insert with `requireFamilyMember()`.

**Test scenarios:**
- Covers AE2. Happy path: three items from two members exist; marking done creates one dated Timeline entry containing them; next week's agenda starts empty (rolled items excepted).
- Happy path: kid adds an agenda item from their phone in under two interactions from Home (friction gate — manual check).
- Edge case: marking done with an empty agenda creates either no Timeline entry or a minimal "we talked" record — pick one and test it (implementation decision; default: no entry, nothing to archive).
- Error path: agenda add while no week row exists yet (pre-cron early Monday) lazily creates the week row rather than erroring.
- Integration: archived entry renders in the Timeline UI under the new category with correct date and attribution.

**Verification:**
- End-to-end week: items accumulate → call done → Timeline shows the record → fresh agenda; all four members can add items.

---

### U7. Ambient board: per-person tiles on Home

**Goal:** Home's per-person sidebar becomes the ambient board: each of the four gets a tile with their next thing, "no class until X", next flight, and days-until-home — symmetric, honest, and staleness-aware.

**Requirements:** R6, R7, R8, R9, R10; F3; AE4, AE5, AE6

**Dependencies:** U3 (roster); consumes U5 (call status), U8 (class events), U9 (flights) — degrades gracefully to blanks before they land

**Files:**
- Modify: `src/lib/home/person-status.ts`, `src/lib/home/types.ts` (extend `HomePersonStatus`), `src/components/home/person-status-widget.tsx`, `src/app/(home)/home/page.tsx` (kids' focused layout gains the family board too — visibility is symmetric)
- Test: `scripts/verify-board-status.mts`

**Approach:**
- Extend the existing `getHomePersonStatuses()` fetch: widen the calendar window; derive "no class until X" from today's remaining class-source events only (never claim "free"); surface next `travel_segments` flight; days-until-home = next homeward segment or next manual "home visit" event.
- Staleness (R9): schedule-derived claims carry the import's semester bounds — outside bounds, the tile drops availability claims and shows the always-true facts (countdowns), plus an owner-visible "schedule needs updating" hint (never a kid-facing nag).
- Parents' tiles get the same treatment from their Google-synced calendars (R7).

**Patterns to follow:**
- `src/lib/home/person-status.ts` composition + `Promise.all` fetcher wiring in `home/page.tsx`; `home_ai_cache` pattern only if a derived status line wants once-daily generation (optional, not required for v1).

**Test scenarios:**
- Covers AE4. Happy path: Liam has no class before 2pm, now is 11am → tile reads "no class until 2pm", never "available"/"free".
- Covers AE5. Edge case: semester bounds passed with no new import → tile shows countdown facts only + owner-side staleness hint; no class-based claim renders.
- Happy path: Kaden's tile shows next flight (from U9) and "home in N days"; Nabeel's tile shows his next calendar event with the same fidelity (R7 parity check).
- Edge case: member with zero data (fresh board) renders a designed empty tile, not an error or a wrong claim.
- Covers AE6. Integration (manual gate): with prod fully seeded, Megan's first open shows four correct tiles with nothing to configure — this gate blocks her onboarding, not the deploy.
- Error path: a data fetch failing (e.g., travel query) degrades that tile section to blank rather than failing the whole board.

**Verification:**
- Board renders correct tiles for all four members against seeded local data; the Megan-first-open checklist is written down and passes in prod before she's onboarded.

---

### U8. Class-schedule import (once a semester)

**Goal:** An owner/adult can load each kid's semester schedule in one sitting — via ICS subscription URL when available, else paste/upload → LLM parse → review → generate — producing per-kid class events plus semester bounds for staleness.

**Requirements:** R11, R12; F5

**Dependencies:** U3; U2 (Anthropic client relocated to `src/lib/ai/`)

**Files:**
- Create: `supabase/migrations/001XX_schedule_imports.sql` (import metadata: kid, semester label, start/end dates, source kind), `src/lib/schedule-import/parse.ts`, `src/lib/schedule-import/generate.ts`, `src/app/(family)/settings/schedule/page.tsx` + `actions.ts`
- Modify: `src/lib/calendar/ics-sync.ts` consumers only if per-member ICS sources need a scoping tweak (likely none — `calendar_sources` already scopes by `member_email`)
- Test: `scripts/verify-schedule-parse.mts` (fixture ICS + fixture pasted-text/screenshot transcriptions)

**Approach:**
- Path A (preferred, Tufts likely): kid sends an ICS subscription URL once → stored as a `calendar_sources` ICS row on their `member_email` → existing 15-min sync owns freshness.
- Path B (fallback, UChicago likely): adult pastes schedule text or uploads a screenshot/PDF → Anthropic parse to structured meetings (course, days-of-week, start/end times, semester span) → review screen → generate `calendar_events`.
- **Generated events attach to a per-import `calendar_sources` row** (reuse an existing `calendar_source_type` value — it's a true Postgres enum, and ALTER TYPE ADD VALUE has in-transaction restrictions) so the `uq_calendar_events_source_external` constraint (00101) enforces dedup at the DB level; events with NULL `calendar_source_id` get no dedup at all (NULLs are distinct) and can't upsert.
- **Re-import is delete-by-import-scope then insert, never upsert-only** — upsert alone leaves a dropped course's events lingering as false "in class" claims (violates R8/R9's honesty bar). Note `calendar_source_id` is ON DELETE SET NULL, so deleting the source does not delete its events; the replacement delete must target events explicitly.
- Both paths write a `schedule_imports` metadata row with semester bounds — U7's staleness anchor.

**Patterns to follow:**
- `src/lib/calendar/ics-sync.ts` (`ical-expander`) for path A; Anthropic client pattern for path B; reading-app upload/convert flow for file handling (pre-deletion reference: review its shape before U2 removes it).

**Test scenarios:**
- Happy path (A): fixture ICS URL for a 4-course schedule → events land on the kid's calendar scope; "no class until X" derives correctly for a known weekday.
- Happy path (B): fixture pasted text (UChicago-style schedule) → parse produces the right meetings; review screen shows them; accept generates recurring events within semester bounds only.
- Edge case: re-importing the same semester replaces prior generated events without duplicates; importing a new semester leaves the old one's history intact.
- Edge case: re-import a schedule with one course removed → that course's events are gone (delete-by-scope, not upsert residue).
- Error path: garbage paste → parse returns a clear "couldn't read this" with nothing written; partial parse requires review-screen confirmation, never silent insertion.
- Edge case: courses with irregular meeting patterns (biweekly labs) either import correctly or surface as "needs manual entry" — never silently wrong (R9's honesty bar applies at ingest).

**Verification:**
- Both paths produce class events that U7 reads correctly; verify script covers parse fixtures and idempotency.

---

### U9. Flight capture: paste-to-parse travel segments

**Goal:** A parent pastes a flight confirmation (text or PDF) → reviewed parse → typed travel segments + calendar events on the kid's scope → flight cards and days-until-home light up.

**Requirements:** R13, R6 (flight cards / countdown); F4

**Dependencies:** U3; U2 (Anthropic client at `src/lib/ai/`)

**Files:**
- Create: `supabase/migrations/001XX_travel_segments.sql` (member, carrier, flight number, depart/arrive airports + times, direction home/away, raw jsonb, link to calendar event), `src/lib/travel/parse.ts`, `src/lib/travel/queries.ts`, `src/components/travel/flight-quick-add.tsx`, `src/app/(family)/travel/actions.ts`
- Test: `scripts/verify-flight-parse.mts` (fixture confirmation emails: single-leg, round-trip, multi-leg with connection)

**Approach:**
- Quick action reachable from Home (adults; kids may also self-serve — symmetric, R7): paste text or upload PDF → Anthropic parse to segments → review screen (edit times/direction) → save writes `travel_segments` + linked `calendar_events` (so flights appear in the normal calendar too).
- "Direction" (homeward vs schoolward vs other) is set at review time with a parsed guess — it drives days-until-home; manual "home visit" calendar events remain the no-flight fallback (per origin R14's degrade philosophy).
- Dedup is a DB unique index on `(member_email, carrier, flight_number, departure_date)` — member-scoped, because two family members on the same flight is the normal case, and app-side read-then-insert races on review-screen double-submit.
- Segment deletion routes through `deleteCalendarEvent` in the calendar mutation core (it tears down Google-materialized copies and duty assignments; a raw row delete can leave a live copy of the flight on a Google calendar). The segment→event FK is ON DELETE SET NULL in the other direction: parents can delete any event from the Calendar UI, and tiles must tolerate a segment with no event.
- Raw jsonb keeps the parse source for debugging (mirrors `school_assignments.raw` precedent).

**Patterns to follow:**
- Anthropic client pattern; PDF text extraction via existing `pdfjs-dist` setup; typed-columns-plus-raw-jsonb precedent.

**Test scenarios:**
- Happy path: fixture United confirmation (ORD→BOS one-way) → parse yields one segment with correct times; review → save → flight card on Kaden's tile and event on his calendar.
- Happy path: round-trip fixture → two segments; the homeward one drives "home in N days".
- Edge case: connecting itinerary (two legs, one direction) groups as one journey on the tile, two calendar events.
- Error path: pasted text with no flight content → clear failure, nothing written; ambiguous parse fields flagged on the review screen rather than guessed silently.
- Edge case: re-pasting the same confirmation doesn't duplicate segments (unique index on member+carrier+flight+date); two members on the same flight both keep their segments.
- Integration: deleting a segment removes its linked calendar event via the mutation core (including any Google-materialized copy — no orphaned events).
- Integration: deleting the flight's calendar event from the Calendar UI leaves a coherent (or removed) flight card — never a crash or a stale claim.

**Verification:**
- Fixtures parse correctly via verify script; a real family flight round-trips from paste to tile to calendar in dev.

---

## System-Wide Impact

- **Interaction graph:** middleware exemption list shrinks (U2) — auth surface must be re-verified; the root layout loses journal mounts and gains the agenda quick-add; the header bell drops a notification source; pg_cron gains (or extends to) the weekly call job.
- **Error propagation:** Google API failures (invite creation, RSVP sync) must degrade to app-local state with logging, never a missing week (U5); LLM parse failures always stop at review, never silently write (U8, U9); board tile fetch failures blank the tile, not the page (U7).
- **State lifecycle risks:** roster migration touching prod `family_members` while a user may have signed in (U3 — idempotent, never clobber `user_id`); call-week idempotency under double cron fire (U5); schedule re-import replacement (U8); flight dedupe (U9).
- **API surface parity:** the Norbert agent API (`/api/agent/*` calendar + todos) and `/family-status` are explicitly unchanged; call/agenda mutations route through a shared core so an agent surface can be added later without a second write path.
- **Integration coverage:** invite → Gmail RSVP → sync → widget is the one flow mocks can't prove — it gets a real-Google dev verification gate (U5); Megan's first-open gate (U7) is a named manual integration check.
- **Unchanged invariants:** shipped migrations are never edited; append-only migration history; RLS idioms (family-shared read, role-gated manage, service-role background writes); port-3000 and read-only MCP conventions for agents.

---

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Google invite emails don't behave as expected on the repo's first `sendUpdates: "all"` create (guest RSVP sync-back itself is now code-verified via `google_attendees`) | Low-Med | Med — invites arrive late or not at all | Real-Google dev verification remains U5's first task; in-app confirm on the widget is the always-working fallback; SMS is the deferred escalation |
| Mason-family PII persists in Hyatt prod (79 seeded timeline entries + 16 people, and Andrew's private ICS calendar source, seeded unconditionally by 00094/00097/00098) | Certain | Med-High — privacy + Megan first-open pollution | U3 migration deletes by fixed seed UUIDs and the fixed source id; verified by prod SELECT after deploy |
| Kids ignore calendar invites entirely | Med | Med — heartbeat weakens | The invite lands in Gmail/GCal they already use; widget + parents relaying covers misses; SMS follow-up is scoped as follow-up work, not a redesign |
| Tufts/UChicago provide no usable schedule artifact | Low-Med | Med — availability tiles thin | Path B (paste/screenshot parse) works from anything a kid can screenshot; worst case is manual entry through the same review screen |
| The big trim (U2) breaks a hidden coupling | Med | Med — build/runtime errors | U1 relocates the known couplings first; U2 carries grep+build gates; module deletion is one reviewable commit-sized unit |
| Roster migration misfires against prod state (someone signed in under a different email → split identity; mason references in NO-ACTION FK tables → migration aborts and wedges the deploy pipeline) | Unknown until the pre-flight prod SELECT runs (then eliminated) | High — lockout, duplicate identity, or blocked deploys | U3's pre-flight read-only prod inspection; UPDATE-not-insert for existing rows; never touch non-null `user_id`; guarded deletes against the enumerated NO-ACTION FKs (todos/bucks); runtime settings UI as recovery; `AUTHORIZED_EMAIL` documented as a manual env step |
| Stale board erodes Megan's trust before habits form | Med | High — product thesis fails | R9 designed in at U7/U8 (semester bounds, degrade-to-true-facts); Megan onboarding gated on the AE6 checklist, not on deploy |
| LLM parse hallucinates flight/class details | Med | Med — wrong board data | Mandatory review-before-save in both parse paths; raw source retained; honesty bar (never silently wrong) tested per unit |

---

## Phased Delivery

### Phase A — Base (U1 → U2 → U3)
The fork becomes the Hyatt app: trimmed, rebranded, roster seeded. Independently shippable and worth shipping alone — it unblocks daily use of Calendar/Todos/Timeline by the family.

### Phase B — Heartbeat (U4 → U5 → U6)
The weekly call lifecycle end-to-end. Ships as soon as one real week cycles cleanly in dev. This is the engagement mechanic; it should land before the semester starts.

### Phase C — Board + feeds (U8 ∥ U9 → U7 polish)
Importers land in either order; the board consumes whatever exists and blanks the rest. Megan's onboarding happens at the end of Phase C, gated on AE6.

---

## Documentation / Operational Notes

- Manual env steps (Vercel dashboard, documented at U3): `AUTHORIZED_EMAIL=nabeelo@gmail.com`; confirm `ANTHROPIC_API_KEY` present for U8/U9; leave Mason-era DWD/TeamSnap/Whoop env unset (dormant).
- Owner must have Google connected (calendar scope) before U5's cron first runs — the call event is created from his connection.
- Write the "Megan first-open" checklist (AE6) into the PR that completes Phase C; her onboarding is a deliberate act after the checklist passes, not a side effect of deploy.
- Flag to Andrew: his private Google Calendar ICS address is committed in the shared migration history (00098) and has been syncing into the Hyatt prod DB — he should reset the private address on his end.
- After landing, run `/ce-compound` to seed `docs/solutions/` (module-removal mechanics, Google-invite RSVP loop, LLM parse-review pattern).
- Update `CLAUDE.md` app description if module list changes what agents should know.

---

## Sources & References

- **Origin document:** [docs/brainstorms/family-planner-experience-requirements.md](../brainstorms/family-planner-experience-requirements.md)
- Related code: `src/lib/calendar/mutations.ts`, `src/lib/home/person-status.ts`, `src/components/todos/global-quick-add.tsx`, `src/lib/timeline/actions.ts`, `supabase/migrations/00098_calendar.sql`, `supabase/migrations/00111` (event attendees)
- External: Tufts ICS helper pattern (`myfletcher.tufts.edu/ics_helper`), UChicago registrar calendars (term dates only), MagicBell iOS PWA limitations guide, Twilio A2P 10DLC quickstart
