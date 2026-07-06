// Shared types for the Home dashboard. Kept free of server imports so client
// widgets can import them alongside the server code that produces them.
//
// Trimmed when the journal and reading modules were removed: HomeJournalAudience
// and the reading-status types (HomeReadingQuizState, HomeReadingBookStatus,
// HomePersonReadingStatus) are gone along with the widgets and queries that
// used them.

import type { CalendarEvent } from "@/lib/calendar/types";
import type { MemberRole } from "@/lib/types";

/** One family member's events for today, for the "others' day" widget. */
export type MemberDay = {
  email: string;
  name: string;
  color: string;
  events: CalendarEvent[];
};

/** An upcoming family birthday, with a friendly countdown. */
export type UpcomingBirthday = {
  name: string;
  /** The birthday's month/day this year-or-next, YYYY-MM-DD. */
  date: string;
  /** Whole days until the birthday (0 = today). */
  daysUntil: number;
  /** Age they'll turn, when we know their birth year. */
  turningAge: number | null;
};

/** A kid's own upcoming events, split across today and tomorrow, for the
 * kid Home sidebar calendar card. */
export type KidAgenda = {
  today: CalendarEvent[];
  tomorrow: CalendarEvent[];
};

/** One fixed sidebar card on the parent Home page. */
export type HomePersonStatus = {
  email: string;
  name: string;
  role: MemberRole;
  color: string;
  events: CalendarEvent[];
};
