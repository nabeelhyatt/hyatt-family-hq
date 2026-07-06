import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_COLOR, CATEGORY_LABEL } from "@/lib/timeline/config";
import { formatTimelineRange, isUpcoming } from "@/lib/timeline/format";
import { loadTimelineEntryById } from "@/lib/timeline/queries";
import { getUserTimezone, localDate } from "@/lib/date-utils";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Timeline Event",
};

/**
 * Trimmed when the journal module was removed. The original's "Written
 * about" section showed linked journal entries reflecting on this event
 * (with a "Reflect on this" button to start one) — dropped along with the
 * journal tables and route it depended on. This is now a plain event detail
 * view.
 */
export default async function TimelineEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = await loadTimelineEntryById(id);
  if (!entry) notFound();

  const tz = await getUserTimezone();
  const today = localDate(new Date(), tz);
  const upcoming = isUpcoming(entry, today);
  const color = CATEGORY_COLOR[entry.category];

  return (
    <div className="mx-auto w-full max-w-2xl px-6 pb-24 pt-10">
      <Link
        href="/timeline"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Timeline
      </Link>

      <header className="mt-6">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">
            {formatTimelineRange(entry)}
          </span>
          {upcoming && (
            <span className="rounded-full bg-muted px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Upcoming
            </span>
          )}
        </div>
        <h1 className="mt-1 font-serif text-3xl tracking-tight text-foreground">
          {entry.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
              color.chip
            )}
          >
            {CATEGORY_LABEL[entry.category]}
          </span>
          {entry.location && (
            <span className="inline-flex items-center gap-0.5">
              <MapPin className="h-3.5 w-3.5" />
              {entry.location}
            </span>
          )}
        </div>
        {(entry.subjects.length > 0 || entry.mentions.length > 0) && (
          <p className="mt-3 text-sm text-muted-foreground">
            {entry.subjects.map((s, i) => (
              <span key={s.id}>
                {i > 0 && ", "}
                <span className="font-medium text-foreground">{s.name}</span>
              </span>
            ))}
            {entry.mentions.length > 0 && (
              <>
                {entry.subjects.length > 0 && " · with "}
                {entry.mentions.map((m, i) => (
                  <span key={m.id}>
                    {i > 0 && ", "}
                    {m.name}
                  </span>
                ))}
              </>
            )}
          </p>
        )}
      </header>

      <p className="mt-5 text-lg leading-relaxed text-foreground">
        {entry.description}
      </p>
    </div>
  );
}
