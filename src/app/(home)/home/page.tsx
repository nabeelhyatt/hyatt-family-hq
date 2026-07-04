import { GreetingHeader } from "@/components/home/greeting-header";
import { PersonStatusWidget } from "@/components/home/person-status-widget";
import { KidCalendarWidget } from "@/components/home/kid-calendar-widget";
import { TodosWidget } from "@/components/home/todos-widget";
import { getHomeTodos } from "@/lib/home/todos";
import { getUserTimezone, localDate } from "@/lib/date-utils";
import { getCurrentMember, firstName } from "@/lib/home/members";
import { getHomePersonStatuses, getKidAgenda } from "@/lib/home/person-status";
import type { KidAgenda } from "@/lib/home/types";

export const dynamic = "force-dynamic";

/**
 * Trimmed when the journal, reader, practice, and workouts modules were
 * removed. The original also fetched and rendered a personal + family
 * journal status pair, the Reader widget (with its active-quiz flag), the
 * owner-only practice trend widget, and a workout widget — all dropped along
 * with the tables and route groups they read from. Todos and the per-person
 * status sidebar (the seam for the ambient board) survive.
 */
export default async function HomePage() {
  const tz = await getUserTimezone();
  const today = localDate(new Date(), tz);
  const dateLabel = new Date(`${today}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const member = await getCurrentMember();
  const isKid = member.role === "kid";

  const [personStatuses, todos, kidAgenda] = await Promise.all([
    // Kids don't get the family-member sidebar, so skip that fetch for them.
    isKid
      ? Promise.resolve([])
      : getHomePersonStatuses(tz, member.email).catch(() => []),
    getHomeTodos().catch(() => null),
    isKid
      ? getKidAgenda(tz, member.email).catch(
          (): KidAgenda => ({ today: [], tomorrow: [] })
        )
      : Promise.resolve<KidAgenda | null>(null),
  ]);

  // Kids get a focused Home: no status widgets for other family members in the
  // sidebar. Only parents/owner see the family-at-a-glance column.
  const sidebarPeople = isKid
    ? []
    : personStatuses.filter((p) => p.email !== member.email);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 pb-24 pt-12">
      <GreetingHeader name={firstName(member.name)} dateLabel={dateLabel} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-4 lg:col-span-2">
          {todos && <TodosWidget data={todos} />}
        </div>

        {/* Sidebar column */}
        <div className="space-y-4">
          {isKid && kidAgenda && (
            <KidCalendarWidget agenda={kidAgenda} tz={tz} />
          )}
          {sidebarPeople.map((person) => (
            <PersonStatusWidget key={person.email} person={person} tz={tz} />
          ))}
        </div>
      </div>
    </div>
  );
}
