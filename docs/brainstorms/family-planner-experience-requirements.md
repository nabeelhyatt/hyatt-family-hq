---
date: 2026-07-02
topic: family-planner-experience
---

# Hyatt Family Planner — Weekly Call Heartbeat + Ambient Board

## Summary

Build the experience layer on top of the v1 rebrand-and-trim base: the weekly family call becomes the app's heartbeat (a standing slot everyone confirms or moves each week, with a shared agenda that archives into the Timeline), and the Home screen becomes an ambient per-person board — each person's next thing, flight cards, days-until-home, and an honest "not in class" availability signal — fed by passively captured data so the kids never maintain anything.

---

## Problem Frame

The Hyatt family is distributed: both sons (Kaden and Liam) are away at college most of the year, home for breaks and occasional weekends. The family's connective tissue is time together — big vacations, weekends home, and a weekly family call. Day to day, contact runs through siloed text threads (Megan↔Liam, Nabeel↔Kaden) with little cross-talk.

Megan is the family's calendar-keeper but tech-reluctant; her favorite family feature today is Find My, because she constantly wonders where the kids are, whether they're okay, and whether they've remembered the next thing — without wanting to bug them. The kids keep no real calendars; their lives exist in class schedules (Tufts, UChicago), booked flights, and their heads. Nobody journals, so the family has no shared record of its own life.

Concrete recurring pains:

- Megan has no way to see the kids' worlds (schedule, to-dos, travel) short of texting them.
- The kids regularly lose track of "big stuff": when's my flight, when am I home next, when's that deadline.
- Nabeel can't tell when a kid is actually reachable for a catch-up call.
- The weekly family call has a standing time that moves almost every week, and re-negotiating it is ad-hoc group-text overhead.
- Like any small network, the app faces a cold-start problem: nobody shares data until sharing pays off, and it can't pay off until data exists.

---

## Actors

- A1. Nabeel (nabeelo@gmail.com) — owner/admin. Seeds and maintains data (importers, flights, roster), wants "when can I call?" visibility.
- A2. Megan (mhyatt@gmail.com) — primary daily viewer. Tech-reluctant; opens the board the way she opens Find My today. Zero setup or maintenance can be asked of her.
- A3. Kaden (kadenhyatt@gmail.com) — college kid at UChicago. Near-zero recurring effort; gets selfish utility (his flights, his week, when he's home next).
- A4. Liam (thisliamhyatt@gmail.com) — college kid at Tufts. Same profile as A3.

---

## Key Flows

- F1. Weekly call scheduling
  - **Trigger:** The week's call slot approaches (standing default time exists, e.g., Sunday 11am).
  - **Actors:** A1–A4
  - **Steps:** The app proposes this week's time (defaulting to the standing slot, adjusted around known class schedules and calendar conflicts) → each member confirms or requests a move with one tap from a notification, without navigating the app → a moved slot re-proposes to everyone → confirmed time appears on everyone's board.
  - **Outcome:** The call is scheduled with less friction than the group text would have taken; everyone touched the app this week for a real reason.
  - **Covered by:** R1, R2, R5

- F2. Agenda accumulation and close-out
  - **Trigger:** Any member thinks of something for the family call ("remind me to tell Dad…", "need to sort spring-break flights").
  - **Actors:** A1–A4
  - **Steps:** Member quick-adds an item to the week's agenda (friction at text-message level) → agenda is visible to all members all week → after the call, the agenda is closed out → closed agenda archives as a dated Timeline entry.
  - **Outcome:** The call has substance; the Timeline accretes a family record nobody had to journal.
  - **Covered by:** R3, R4

- F3. Megan's glance
  - **Trigger:** Megan wonders how the kids are doing (multiple times per week today, via Find My and texts).
  - **Actors:** A2 (viewer); A1, A3, A4 (subjects, alongside A2's own tile)
  - **Steps:** Megan opens the app from her home-screen icon → the board shows each person's now/next: next event, "not in class until X", flight cards, days until next home visit → any data that can't be verified fresh shows its age or degrades to always-true facts.
  - **Outcome:** Comfort without bugging anyone; the board never teaches her to distrust it.
  - **Covered by:** R6, R7, R8, R9, R10

- F4. Flight capture
  - **Trigger:** A flight is booked for or by a kid (parents book or receive confirmations for most family travel).
  - **Actors:** A1 (or A2) routes the confirmation; A3/A4 benefit.
  - **Steps:** Parent routes the booking confirmation into the app (mechanism decided at planning) → a flight card appears on the kid's tile and the family calendar → days-until-home countdown updates.
  - **Outcome:** "Where's my flight / when am I leaving?" is self-serve for the kid and ambient for everyone else.
  - **Covered by:** R11, R13

- F5. Semester schedule import
  - **Trigger:** A new semester's class schedule is available (twice a year per kid).
  - **Actors:** A1 drives; A3/A4 supply the schedule artifact once.
  - **Steps:** Class schedule for each kid is imported (Tufts and UChicago formats) → feeds each kid's tile ("not in class until X") and the call-time proposal logic.
  - **Outcome:** The board and scheduling logic stay honest for the semester with a single, parent-drivable action.
  - **Covered by:** R11, R12

---

## Requirements

**Weekly call — the heartbeat**

- R1. The weekly family call is a first-class object: a standing slot (default: Sunday 11:00am ET) that each week gets explicitly confirmed or moved by the family.
- R2. The scheduling flow must be strictly better than the group text at this job: the app proposes times using known schedules/conflicts, and confirming or requesting a move is one tap from a notification — no app navigation required. If this bar can't be met for a member, the group text remains the fallback and the app records the outcome rather than fighting it.
- R3. A shared weekly agenda is open all week to all members; adding an item is at text-message friction (quick-add from the board or a share/notification surface).
- R4. When a call is marked done, its agenda closes out and archives as a dated Timeline entry — the family record accretes as a side effect of the ritual.
- R5. If a week's call is skipped or never confirmed, the app degrades gracefully: the slot rolls forward with no streaks, guilt banners, or nag escalation. Healthy weekly use comes from utility, not pressure.

**Ambient board — the Home screen**

- R6. The Home screen is a per-person board: each family member gets a tile showing their next thing (next event, next flight, days until next home visit) and current-semester availability.
- R7. Visibility is symmetric: parents' tiles are as rich as the kids' (travel, week, location if present). The board is mutual visibility, not parental monitoring.
- R8. The availability signal makes only the honest weak claim — "not in class until X", derived from the imported schedule — never "free now". It must not claim knowledge it doesn't have.
- R9. Staleness is a first-class failure mode: data that can't be verified fresh either shows its age (e.g., "schedule from fall semester") or degrades to always-true facts (e.g., days until Thanksgiving break). The board must never present stale data as current; a wrong board loses Megan permanently.
- R10. Megan's first open is a named requirement: before she is onboarded, the board must be fully seeded and correct (roster, calendars, schedules, at least one flight or countdown). She is asked for zero setup — the icon appears on her phone, the board is already right.

**Data capture — asymmetric effort**

- R11. Zero recurring effort is asked of the kids. Their total contribution: supply a class schedule once per semester (parent-drivable), set location sharing once (if location ships), and nothing else. Any feature depending on kid-initiated recurring action (e.g., habitual email forwarding) is assumed dead on arrival and must not be load-bearing.
- R12. Class-schedule import exists for both schools (Tufts and UChicago), run once per semester, feeding tiles and call-time proposals.
- R13. Flight/travel capture flows from the parents' side (they book or receive most confirmations); the ingestion mechanism is a planning decision, but the product bet is parent-routed, not kid-forwarded.
- R14. Location presence is desirable but optional and swappable: the board must deliver its core value with no location source at all (Find My has no public API; alternatives are a planning question).

---

## Acceptance Examples

- AE1. **Covers R1, R2.** Given the standing Sunday 11am slot and an imported schedule showing Kaden has a review session Sunday morning, when the weekly proposal goes out, the app proposes an alternative from windows where no member has a known conflict, and each member confirms with a single tap from the notification.
- AE2. **Covers R4.** Given a week's agenda holding three items from two different members, when the call is marked done, a dated Timeline entry is created containing those items, and next week's agenda starts empty.
- AE3. **Covers R5.** Given a week where nobody confirms the call, when the slot passes, the app simply shows next week's proposal — no streak reset, no "you missed your call!" messaging anywhere.
- AE4. **Covers R8.** Given Liam has no class before 2pm and it is 11am, his tile reads "no class until 2pm" — not "available" or "free now" — because the schedule doesn't know he's asleep.
- AE5. **Covers R9.** Given a new semester has started and no new schedule has been imported, the kid's tile stops claiming class-based availability and shows the always-true facts it still has (e.g., "home in 24 days") plus an indication the schedule needs updating — visible to A1, not nagging A3/A4.
- AE6. **Covers R10.** Given Megan opens the app for the first time, every tile shows real, current data with nothing to configure; if that state can't be reached, her onboarding is delayed rather than her seeing an empty or wrong board.

---

## Success Criteria

- Megan opens the board unprompted within the first month — she checks it the way she checks Find My today.
- The weekly call is proposed, confirmed, and held through the app for 3+ consecutive weeks.
- At least one kid self-serves his own flight/travel info from the app instead of texting a parent.
- The agenda receives items from at least two different family members in a typical week — evidence the texting silos are crossing.
- The Timeline accumulates call records without anyone being asked to "journal."
- Handoff quality: ce-plan can proceed without inventing product behavior — every open item below is tagged as a user decision or a planning/research question.

---

## Scope Boundaries

### Deferred for later

- The asks channel (Approach C): structured "I need a ride" / "call me" / availability-ping verbs. V1's stand-in is an agenda item; asks become natural verbs once the board and call have gravity.
- Gatherings/photos/trip-planning layer and Wanderlog integration (prior brainstorm's deferral stands).
- Location presence if no acceptable source exists at planning time (R14 makes it non-load-bearing).
- Kid-facing to-do visibility for Megan (she mentioned it; needs the kids to actually use Todos first — revisit once base usage exists).

### Outside this product's identity

- Journaling, AI interview prompts, reading quizzes, or any daily-accountability mechanics from the Mason fork — this family doesn't journal, and the record must be exhaust, not input.
- Gamification for engagement: streaks, points, currencies (Mason Bucks), guilt mechanics. Weekly use must come from real utility.
- Real-time surveillance: minute-by-minute tracking, geofence alerts, "why is he there?" tooling. Ambient presence only, with symmetric visibility.
- Replacing anyone's daily calendar (Google Calendar stays the daily driver) or replacing texting as the family's conversation medium.

---

## Key Decisions

- The weekly call is the engagement mechanic, not a feature: it's the family's one existing recurring ritual with a built-in coordination need, so the app attaches to it rather than inventing a new habit. Chosen over ambient-board-only (glancing creates no contribution) and asks-channel-first (cold-start against texting is unwinnable).
- Ambient board as Home screen: serves the strongest observed behavior in the family (Megan's Find My habit) and delivers the kids' recall value from the same surface.
- Asymmetric effort as the cold-start answer: parents plus software seed everything; kids' value is selfish and immediate; their contribution is near-passive. Directly addresses the social-network chicken-and-egg Nabeel named.
- Honest signals over impressive ones: "not in class" instead of "free now"; visible staleness instead of confident wrongness. The board's currency is Megan's trust.
- Symmetric visibility as a design commitment (R7), not a framing sentence — parity is what keeps the kids from experiencing this as monitoring, and parents' lives are content too ("Dad's in SF again").
- Timeline-as-exhaust: the family record falls out of the call ritual; it justifies zero standalone effort or UI investment in v1.
- No engagement pressure (R5): a skipped week is normal family life, not churn to be fought.

---

## Dependencies / Assumptions

- The weekly family call ritual continues once both kids are at college (it's the load-bearing habit).
- Parents book or receive confirmations for most family travel (flight capture depends on this).
- Tufts and UChicago class schedules are exportable/scrapable in some usable form once a semester — unverified; research at planning.
- Find My has no public API (known constraint); any location presence needs an alternative source or manual/deferred handling.
- The v1 rebrand-and-trim base (roster swap, module cuts, Calendar/Todos/Timeline/Home retained) ships first; this layer builds on it. Andrew's existing calendar, RSVP, and Timeline scaffolding is reusable.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R2][Technical] Notification/delivery channel for proposals and one-tap confirms — PWA push vs SMS vs email. Note: Megan's channel choice matters most; SMS may beat push for a tech-reluctant user who won't grant notification permissions.
- [Affects R12][Needs research] What form Tufts (Liam) and UChicago (Kaden) schedules can actually be exported in (ICS, portal scrape, screenshot-to-parse) and whether one importer can serve both.
- [Affects R13][Needs research] Flight ingestion mechanism on the parents' side: Gmail integration, a forward-to address, or manual quick-add with smart parsing.
- [Affects R14][Needs research] Viable location sources if location ships: iOS Shortcuts automation, a companion share, or defer entirely.
- [Affects R1, R2][Technical] Whether the call slot builds on the fork's existing calendar events + RSVP scaffolding or is its own lightweight object that writes into the calendar.
