import { CalendarDays, UserRound } from "lucide-react";
import { WidgetCard } from "./widget-card";
import { formatTimeRange } from "@/lib/calendar/calendar-utils";
import type { HomePersonStatus } from "@/lib/home/types";

/**
 * Trimmed when the reading module was removed. The original also rendered
 * each person's in-progress book, weekly page goal, and any active reading
 * quiz above the day's events — dropped along with the reading data it read.
 */

function roleLabel(role: HomePersonStatus["role"]): string {
  if (role === "kid") return "Kid";
  return "Parent";
}

export function PersonStatusWidget({
  person,
  tz,
}: {
  person: HomePersonStatus;
  tz: string;
}) {
  return (
    <WidgetCard
      title={person.name}
      icon={UserRound}
      href="/calendar"
      hrefLabel={`Open ${person.name}'s calendar`}
      action={
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: person.color }}
          />
          {roleLabel(person.role)}
        </span>
      }
    >
      <section>
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase text-muted-foreground">
          <CalendarDays className="size-3.5" />
          Today
        </div>
        {person.events.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
            No more events today.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {person.events.map((event) => (
              <li key={event.id} className="text-sm leading-snug">
                <span className="text-muted-foreground">
                  {formatTimeRange(
                    event.start_time,
                    event.end_time,
                    event.all_day,
                    tz
                  )}
                </span>{" "}
                <span className="text-foreground">{event.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </WidgetCard>
  );
}
