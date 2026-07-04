"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Relocated + trimmed from src/components/journal/settings-nav.tsx when the
 * journal, reading, and workouts modules were removed — their tabs (User,
 * Interviewer, Questions, WHOOP) are gone with them. Calendars and Family are
 * the only settings tabs left.
 */
const TABS = [
  {
    label: "Calendars",
    href: "/settings/calendars",
    description:
      "Manage everyone's calendars — subscribe to ICS feeds, connect TeamSnap teams, and share phone subscribe links.",
    manageOnly: true,
  },
  {
    label: "Family",
    href: "/settings/family",
    description: "",
    ownerOnly: true,
  },
] as const;

export function SettingsNav({
  isOwner = false,
  canManage = false,
}: {
  isOwner?: boolean;
  canManage?: boolean;
}) {
  const pathname = usePathname();
  const tabs = TABS.filter((t) => {
    if ("ownerOnly" in t && t.ownerOnly) return isOwner;
    if ("manageOnly" in t && t.manageOnly) return canManage;
    return true;
  });
  // Both remaining tabs are gated (owner / manage-only) — a kid has neither,
  // so the list can be empty. Render nothing rather than crash; the pages
  // themselves redirect a kid away from /settings before this ever shows.
  if (tabs.length === 0) return null;
  const active = tabs.find((t) => pathname.startsWith(t.href)) ?? tabs[0];

  return (
    <>
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              "relative px-3 py-2 font-serif text-sm transition-colors " +
              (tab.href === active.href
                ? "text-foreground after:absolute after:inset-x-0 after:bottom-[-1px] after:h-[2px] after:bg-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {active.description && (
        <p className="mt-3 font-serif text-xs italic text-muted-foreground">
          {active.description}
        </p>
      )}
    </>
  );
}
