import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getCalendarEvents } from "@/lib/calendar/queries";
import { isHiddenEvent, memberColor } from "@/lib/calendar/calendar-utils";
import { localDate } from "@/lib/date-utils";
import type { CalendarEvent } from "@/lib/calendar/types";
import type { HomePersonStatus, KidAgenda } from "@/lib/home/types";
import type { MemberRole } from "@/lib/types";

/**
 * Trimmed when the reading module was removed. The original also computed
 * each person's reading status (weekly page goal, in-progress books, active
 * quizzes) alongside their events — dropped along with the reading_* tables
 * it queried. This is the seam the ambient board (class schedules, flights,
 * days-until-home) extends.
 */

const DAY_MS = 86_400_000;

type MemberRow = {
  email: string;
  name: string | null;
  role: MemberRole;
  user_id: string | null;
  color: string | null;
};

function eventDateKey(event: CalendarEvent, tz: string): string {
  return localDate(new Date(event.start_time), event.all_day ? "UTC" : tz);
}

function eventStillUpcoming(event: CalendarEvent, nowMs: number): boolean {
  if (event.all_day) return true;
  const endMs = new Date(event.end_time ?? event.start_time).getTime();
  return endMs >= nowMs;
}

function sortEvents(a: CalendarEvent, b: CalendarEvent): number {
  if (a.all_day !== b.all_day) return a.all_day ? -1 : 1;
  return a.start_time.localeCompare(b.start_time);
}

/** Kids plus the other parent, for the parent Home sidebar. */
export async function getHomePersonStatuses(
  tz: string,
  viewerEmail: string | null
): Promise<HomePersonStatus[]> {
  const admin = createAdminClient();
  const now = Date.now();
  const today = localDate(new Date(now), tz);

  const [{ data: memberRows }, events] = await Promise.all([
    admin
      .from("family_members")
      .select("email, name, role, user_id, color")
      .order("role", { ascending: true })
      .order("name", { ascending: true }),
    getCalendarEvents({
      rangeStart: new Date(now - DAY_MS),
      rangeEnd: new Date(now + 2 * DAY_MS),
    }),
  ]);

  const members = (memberRows ?? []) as MemberRow[];
  const kids = members.filter((m) => m.role === "kid");
  const otherParent = members.find(
    (m) => m.email !== viewerEmail && (m.role === "owner" || m.role === "parent")
  );
  const targets = otherParent ? [...kids, otherParent] : kids;

  const eventsByEmail = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    if (!event.member_email) continue;
    if (isHiddenEvent(event)) continue;
    if (eventDateKey(event, tz) !== today) continue;
    if (!eventStillUpcoming(event, now)) continue;
    const list = eventsByEmail.get(event.member_email) ?? [];
    list.push(event);
    eventsByEmail.set(event.member_email, list);
  }

  return targets.map((member) => ({
    email: member.email,
    name: member.name ?? member.email,
    role: member.role,
    color: member.color ?? memberColor(member.email),
    events: (eventsByEmail.get(member.email) ?? []).sort(sortEvents),
  }));
}

/**
 * A kid's own calendar for today and tomorrow, for the kid Home sidebar. Today
 * keeps only events that haven't ended yet (matching the "no more events today"
 * agenda elsewhere); tomorrow shows the full day.
 */
export async function getKidAgenda(
  tz: string,
  viewerEmail: string | null
): Promise<KidAgenda> {
  if (!viewerEmail) return { today: [], tomorrow: [] };

  const now = Date.now();
  const todayKey = localDate(new Date(now), tz);
  const tomorrowKey = localDate(new Date(now + DAY_MS), tz);

  const events = await getCalendarEvents({
    rangeStart: new Date(now - DAY_MS),
    rangeEnd: new Date(now + 2 * DAY_MS),
  });

  const today: CalendarEvent[] = [];
  const tomorrow: CalendarEvent[] = [];
  for (const event of events) {
    if (event.member_email !== viewerEmail) continue;
    if (isHiddenEvent(event)) continue;
    const key = eventDateKey(event, tz);
    if (key === todayKey) {
      if (!eventStillUpcoming(event, now)) continue;
      today.push(event);
    } else if (key === tomorrowKey) {
      tomorrow.push(event);
    }
  }

  return { today: today.sort(sortEvents), tomorrow: tomorrow.sort(sortEvents) };
}
