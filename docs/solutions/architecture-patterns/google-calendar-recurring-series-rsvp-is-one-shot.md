---
title: A Google Calendar recurring-series invite only sends one real RSVP, ever
date: 2026-07-04
category: architecture-patterns
module: calendar (google integration)
problem_type: architecture_pattern
component: tooling
applies_when:
  - "Designing a feature that needs a fresh, meaningful RSVP/confirmation from guests on a recurring cadence (e.g. a weekly family call, a weekly check-in)"
  - "The chosen mechanism is a Google Calendar event with `recurrence` set and guests invited"
tags: [google-calendar, rsvp, recurring-events, api-design, oauth-integration]
---

# A Google Calendar recurring-series invite only sends one real RSVP, ever

## Context

A planned feature needed a real, per-week confirmation from four family members for a standing weekly call — the explicit goal was for the app to beat a group-text negotiation by using a Google Calendar invite as the one-tap confirm/decline mechanism, with the app's "is this week confirmed?" state driven by each guest's RSVP.

The first design created the call as a single **recurring** Google Calendar event (one series, `recurrence` set, four guests) on the theory that Google's native per-guest accept/decline UI would give a fresh RSVP signal every week for free, with zero new notification infrastructure needed.

This was caught and reversed during an adversarial design review, before implementation — not discovered by building it and finding it broken in production.

## Guidance

Google Calendar sends the invite email for a recurring series **once**, at series creation. A guest's initial response (accept/decline) to that single invite is recorded as their response for the *series* and applies to every future instance — there is no repeat invite email, and no repeat prompt, for instance #2, #3, etc. Practically: a guest who accepts week 1 has an app-visible "accepted" status for every subsequent week whether or not they ever look at the calendar again, and a guest who never responds stays in the same unresponded state indefinitely across the whole series.

If a feature's value proposition depends on a *fresh* signal each cycle (not just "did they ever say yes to this recurring thing"), a single recurring series cannot deliver it. The correct shape is to create a **new, standalone (non-recurring) event for each cycle**, with its own guest list and its own `sendUpdates: "all"` invite — the "recurrence" pattern (same people, same standing time slot) lives in the app's own state (e.g. a settings row describing the cadence), not as a Google Calendar `recurrence` rule. Each standalone event then gets its own real invite email and its own fresh, meaningful RSVP.

## Why This Matters

Building the recurring-series version and shipping it would have produced a feature that looks correct in week 1 (every guest gets a real invite, responds, and the app shows a real confirmed/declined state) and then silently becomes fake from week 2 onward — the app would keep showing "confirmed" based on stale week-1 responses with nobody having been prompted about the current week at all. This is the exact failure mode the feature exists to prevent (a call that quietly falls through the cracks), reintroduced by the calendar-integration choice itself. It's also the kind of bug that's easy to miss in testing, since week 1 works perfectly and the divergence only appears a cycle later.

## When to Apply

- Any feature using a third-party calendar's native RSVP/guest-response mechanism as a *recurring* confirmation signal, not just a one-time invite.
- More generally: when adopting any third-party API's "recurring X" primitive to stand in for "the same kind of X happens on a cadence," verify explicitly whether *per-occurrence* state (attendance, responses, edits) is tracked per-instance or per-series before designing around it. Many calendar/scheduling APIs collapse guest-response state to the series level even when other fields (time, location) are correctly per-instance.

## Examples

**Rejected design:** one `calendar_events` row with `recurrence: WEEKLY`, four guests added once at creation. App reads `event_attendees`/guest response state per week and treats it as "this week's confirm status."

**Chosen design:** a lightweight "call settings" record holds the standing cadence (day/time, guest list) as app state. A weekly job creates a **new standalone event** for that week (no `recurrence` field), invites the same guests fresh (`sendUpdates: "all"`), and the app's per-week status is driven entirely by that week's own event's guest responses — nothing carries over from the prior week's event.

## Related

- None yet — first learning captured for this repo.
